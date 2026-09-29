import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { layoutsWithAssignments } from "../assign";
import { studentTimetable } from "../timetable";
import { maskName } from "../format";
import { Assignment, ExamConfig, RoomConfig, Student, studentLabel } from "../types";

export interface DocxCtx {
  exam: ExamConfig;
  students: Student[];
  rooms: RoomConfig[];
  assignment: Assignment;
  maskNames: boolean;
}

const FONT = "Pretendard";

function cell(text: string, opts: { bold?: boolean; shade?: string; width?: number } = {}): TableCell {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "C9CDD6" };
  return new TableCell({
    borders: { top: border, bottom: border, left: border, right: border },
    shading: opts.shade ? { fill: opts.shade } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text, bold: opts.bold, font: FONT, size: 20 }),
        ],
      }),
    ],
  });
}

function titleParagraph(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 36 })],
  });
}

function subParagraph(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: [new TextRun({ text, font: FONT, color: "6B7280", size: 20 })],
  });
}

/** 고사실별 좌석배치도 + 출석부를 하나의 docx로 생성 */
export async function buildDocx(ctx: DocxCtx): Promise<Blob> {
  const byId = new Map(ctx.students.map((s) => [s.id, s]));
  const nameOf = (s: Student) => (ctx.maskNames ? maskName(s.name) : s.name);
  const layouts = layoutsWithAssignments(ctx.rooms, ctx.assignment);

  const children: (Paragraph | Table)[] = [
    titleParagraph(`${ctx.exam.title} 고사실 좌석배치도`),
    subParagraph(`${ctx.exam.date} · 착석(CHAKSEOK) 자동 생성`),
  ];

  for (const layout of layouts) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: `${layout.room.name}`, font: FONT, bold: true, size: 28 })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 80 },
        children: [new TextRun({ text: "◀ 교탁 / 칠판 ▶", font: FONT, color: "6B7280", size: 18 })],
      }),
    );
    const rows = layout.cells.map(
      (cellRow) =>
        new TableRow({
          children: cellRow.map((c) => {
            if (c.disabled) return cell("미사용", { shade: "F1F2F4" });
            if (!c.studentId) return cell("");
            const s = byId.get(c.studentId)!;
            return cell(`${nameOf(s)}\n${studentLabel(s)}`, { bold: true });
          }),
        }),
    );
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));

    // 출석부
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 240, after: 120 },
        children: [new TextRun({ text: `${layout.room.name} 출석부`, font: FONT, bold: true, size: 24 })],
      }),
    );
    const attRows = ctx.assignment.placements
      .filter((p) => p.roomId === layout.room.id)
      .map((p) => ({ p, s: byId.get(p.studentId)! }));
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: ["좌석", "학년-반-번호", "성명", "확인", "비고"].map((t) =>
              cell(t, { bold: true, shade: "EEF0F4" }),
            ),
          }),
          ...attRows.map(
            ({ p, s }) =>
              new TableRow({
                children: [
                  cell(`${p.seatNo}번`),
                  cell(studentLabel(s)),
                  cell(nameOf(s), { bold: true }),
                  cell(""),
                  cell(""),
                ],
              }),
          ),
        ],
      }),
    );
  }

  // 학생별 시간표 요약
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 320, after: 120 },
      children: [new TextRun({ text: "학생별 시험 시간표", font: FONT, bold: true, size: 28 })],
    }),
  );
  for (const s of ctx.students.filter((x) => !x.absent)) {
    const tt = studentTimetable(s, ctx.exam, ctx.assignment, ctx.rooms);
    const placed = tt[0]?.roomName !== "-";
    if (!placed) continue;
    children.push(
      new Paragraph({
        spacing: { before: 160, after: 60 },
        children: [
          new TextRun({
            text: `${nameOf(s)} (${studentLabel(s)}) — ${tt[0].roomName} ${tt[0].seatLabel}`,
            font: FONT,
            bold: true,
            size: 22,
          }),
        ],
      }),
      new Table({
        width: { size: 70, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: ["교시", "시간", "과목"].map((t) => cell(t, { bold: true, shade: "EEF0F4" })) }),
          ...tt.map((r) => new TableRow({ children: [cell(r.periodLabel), cell(r.time), cell(r.subject)] })),
        ],
      }),
    );
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
