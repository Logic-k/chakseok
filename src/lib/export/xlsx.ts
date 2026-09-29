import * as XLSX from "xlsx";
import {
  Assignment,
  ExamConfig,
  RoomConfig,
  Student,
  studentLabel,
} from "../types";
import { layoutsWithAssignments } from "../assign";
import { studentTimetable } from "../timetable";
import { maskName } from "../format";

export interface ExportCtx {
  exam: ExamConfig;
  students: Student[];
  rooms: RoomConfig[];
  assignment: Assignment;
  maskNames: boolean;
}

function nameOf(ctx: ExportCtx, s: Student): string {
  return ctx.maskNames ? maskName(s.name) : s.name;
}

/** 종합 배정 데이터 시트 */
function summarySheet(ctx: ExportCtx): XLSX.WorkSheet {
  const byId = new Map(ctx.students.map((s) => [s.id, s]));
  const roomName = new Map(ctx.rooms.map((r) => [r.id, r.name]));
  const rows = ctx.assignment.placements.map((p) => {
    const s = byId.get(p.studentId)!;
    const subjects = ctx.exam.periods
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((per) =>
        per.kind === "common" ? (per.subject ?? "") : (s.electives[per.electiveKey ?? ""] ?? ""),
      );
    return {
      고사실: roomName.get(p.roomId) ?? p.roomId,
      좌석: `${p.row + 1}행${p.col + 1}열`,
      좌석번호: p.seatNo,
      학년: s.grade,
      반: s.classNo,
      번호: s.number,
      성명: nameOf(ctx, s),
      ...Object.fromEntries(
        ctx.exam.periods
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((per, i) => [`${per.label} 과목`, subjects[i]]),
      ),
    };
  });
  return XLSX.utils.json_to_sheet(rows);
}

/** 고사실별 좌석배치도 — 그리드 형태 시트 */
function seatMapSheet(ctx: ExportCtx, roomId: string): XLSX.WorkSheet {
  const layout = layoutsWithAssignments(ctx.rooms, ctx.assignment).find(
    (l) => l.room.id === roomId,
  )!;
  const byId = new Map(ctx.students.map((s) => [s.id, s]));
  const aoa: string[][] = [[`${layout.room.name} 좌석배치도 — ${ctx.exam.title} (${ctx.exam.date})`], ["◀ 교탁/칠판 ▶"]];
  for (const cellRow of layout.cells) {
    aoa.push(
      cellRow.map((c) => {
        if (c.disabled) return "□";
        if (!c.studentId) return "";
        const s = byId.get(c.studentId)!;
        return `${nameOf(ctx, s)} (${studentLabel(s)})`;
      }),
    );
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = Array(layout.room.cols).fill({ wch: 18 });
  return ws;
}

/** 고사실별 출석부 시트 */
function attendanceSheet(ctx: ExportCtx, roomId: string): XLSX.WorkSheet {
  const byId = new Map(ctx.students.map((s) => [s.id, s]));
  const rows = ctx.assignment.placements
    .filter((p) => p.roomId === roomId)
    .map((p) => {
      const s = byId.get(p.studentId)!;
      return {
        좌석번호: p.seatNo,
        위치: `${p.row + 1}행${p.col + 1}열`,
        학년: s.grade,
        반: s.classNo,
        번호: s.number,
        성명: nameOf(ctx, s),
        확인: "",
        비고: "",
      };
    });
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 8 }, { wch: 10 }, { wch: 6 }, { wch: 6 }, { wch: 6 }, { wch: 14 }, { wch: 10 }, { wch: 14 }];
  return ws;
}

/** 학생별 시간표 시트 */
function timetableSheet(ctx: ExportCtx): XLSX.WorkSheet {
  const rows: Record<string, unknown>[] = [];
  for (const s of ctx.students.filter((x) => !x.absent)) {
    const tt = studentTimetable(s, ctx.exam, ctx.assignment, ctx.rooms);
    for (const r of tt) {
      rows.push({
        학년: s.grade,
        반: s.classNo,
        번호: s.number,
        성명: nameOf(ctx, s),
        교시: r.periodLabel,
        시간: r.time,
        과목: r.subject,
        고사실: r.roomName,
        좌석: r.seatLabel,
      });
    }
  }
  return XLSX.utils.json_to_sheet(rows);
}

function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, "").slice(0, 31) || "시트";
}

/** 전체 결과 워크북 생성 */
export function buildResultWorkbook(ctx: ExportCtx): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summarySheet(ctx), "종합배정");
  for (const room of ctx.rooms) {
    XLSX.utils.book_append_sheet(wb, seatMapSheet(ctx, room.id), safeSheetName(`배치-${room.name}`));
    XLSX.utils.book_append_sheet(wb, attendanceSheet(ctx, room.id), safeSheetName(`출석-${room.name}`));
  }
  XLSX.utils.book_append_sheet(wb, timetableSheet(ctx), "학생별시간표");
  return wb;
}

export function workbookToBytes(wb: XLSX.WorkBook): Uint8Array {
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}
