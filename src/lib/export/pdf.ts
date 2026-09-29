import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import { layoutsWithAssignments } from "../assign";
import { studentTimetable } from "../timetable";
import { maskName } from "../format";
import { Assignment, ExamConfig, RoomConfig, Student, studentLabel } from "../types";
import fontRegularUrl from "../../assets/fonts/Pretendard-Regular.ttf?url";
import fontBoldUrl from "../../assets/fonts/Pretendard-Bold.ttf?url";

export interface PdfCtx {
  exam: ExamConfig;
  students: Student[];
  rooms: RoomConfig[];
  assignment: Assignment;
  maskNames: boolean;
}

interface Fonts {
  reg: PDFFont;
  bold: PDFFont;
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  const [regBytes, boldBytes] = await Promise.all([
    fetch(fontRegularUrl).then((r) => r.arrayBuffer()),
    fetch(fontBoldUrl).then((r) => r.arrayBuffer()),
  ]);
  const reg = await doc.embedFont(regBytes, { subset: true });
  const bold = await doc.embedFont(boldBytes, { subset: true });
  return { reg, bold };
}

const INK = rgb(0.12, 0.14, 0.18);
const GRAY = rgb(0.45, 0.48, 0.55);
const LINE = rgb(0.78, 0.8, 0.85);
const ACCENT = rgb(0.11, 0.36, 0.72);
const SOFT = rgb(0.94, 0.95, 0.98);

function centerText(page: PDFPage, font: PDFFont, text: string, cx: number, y: number, size: number, color = INK) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx - w / 2, y, size, font, color });
}

function fitSize(font: PDFFont, text: string, width: number, size: number): number {
  while (size > 5 && font.widthOfTextAtSize(text, size) > width) size -= 0.5;
  return size;
}

function fitText(font: PDFFont, text: string, width: number, size: number): { text: string; size: number } {
  const s = fitSize(font, text, width, size);
  if (font.widthOfTextAtSize(text, s) <= width) return { text, size: s };
  let t = text;
  while (t.length > 1 && font.widthOfTextAtSize(t + "…", s) > width) t = t.slice(0, -1);
  return { text: t + "…", size: s };
}

function header(page: PDFPage, fonts: Fonts, title: string, sub: string, w: number, h: number) {
  page.drawRectangle({ x: 0, y: h - 56, width: w, height: 56, color: ACCENT });
  page.drawText(title, { x: 32, y: h - 36, size: 16, font: fonts.bold, color: rgb(1, 1, 1) });
  const sw = fonts.reg.widthOfTextAtSize(sub, 9);
  page.drawText(sub, { x: w - 32 - sw, y: h - 34, size: 9, font: fonts.reg, color: rgb(0.9, 0.93, 1) });
}

function footer(page: PDFPage, fonts: Fonts, w: number, pageNo: number, total: number) {
  centerText(page, fonts.reg, `착석(CHAKSEOK) 자동 생성 — ${pageNo} / ${total}쪽`, w / 2, 16, 8, GRAY);
}

/** 고사실별 좌석배치도 — 교탁 기준 뷰 (감독용, 1고사실=1페이지) */
export async function buildSeatMapPdf(ctx: PdfCtx): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts = await loadFonts(doc);
  const byId = new Map(ctx.students.map((s) => [s.id, s]));
  const nameOf = (s: Student) => (ctx.maskNames ? maskName(s.name) : s.name);
  const layouts = layoutsWithAssignments(ctx.rooms, ctx.assignment);
  const total = layouts.length;

  layouts.forEach((layout, idx) => {
    const landscape = layout.room.cols >= layout.room.rows;
    const page = doc.addPage(landscape ? [842, 595] : [595, 842]);
    const { width: w, height: h } = page.getSize();
    header(page, fonts, `${layout.room.name} 좌석배치도`, `${ctx.exam.title} · ${ctx.exam.date}`, w, h);

    // 교탁 표시
    const marginX = 40;
    const topY = h - 90;
    const deskW = Math.min(160, w / 4);
    page.drawRectangle({
      x: w / 2 - deskW / 2,
      y: topY - 8,
      width: deskW,
      height: 22,
      color: SOFT,
      borderColor: LINE,
      borderWidth: 1,
    });
    centerText(page, fonts.bold, "교 탁", w / 2, topY - 1, 11, GRAY);
    if (layout.room.proctor) {
      page.drawText(`감독: ${layout.room.proctor}`, { x: marginX, y: topY, size: 9, font: fonts.reg, color: GRAY });
    }

    // 좌석 그리드
    const gridTop = topY - 44;
    const availW = w - marginX * 2;
    const availH = gridTop - 40;
    const cellW = availW / layout.room.cols;
    const cellH = availH / layout.room.rows;

    for (const cellRow of layout.cells) {
      for (const cell of cellRow) {
        const x = marginX + cell.col * cellW;
        const y = gridTop - (cell.row + 1) * cellH;
        if (cell.disabled) {
          page.drawRectangle({ x: x + 2, y: y + 2, width: cellW - 4, height: cellH - 4, color: SOFT, borderColor: LINE, borderWidth: 0.8 });
          centerText(page, fonts.reg, "미사용", x + cellW / 2, y + cellH / 2 - 3, 8, GRAY);
          continue;
        }
        page.drawRectangle({
          x: x + 2,
          y: y + 2,
          width: cellW - 4,
          height: cellH - 4,
          borderColor: cell.studentId ? INK : LINE,
          borderWidth: cell.studentId ? 1.2 : 0.8,
        });
        if (cell.studentId) {
          const s = byId.get(cell.studentId)!;
          const nm = fitText(fonts.bold, nameOf(s), cellW - 8, Math.min(12, cellH * 0.32));
          centerText(page, fonts.bold, nm.text, x + cellW / 2, y + cellH * 0.58, nm.size);
          const tag = studentLabel(s);
          centerText(page, fonts.reg, tag, x + cellW / 2, y + cellH * 0.24, Math.min(8, cellH * 0.22), GRAY);
        }
      }
    }
    // 행/열 라벨
    for (let r = 0; r < layout.room.rows; r++) {
      page.drawText(`${r + 1}행`, { x: marginX - 24, y: gridTop - r * cellH - cellH / 2 - 3, size: 8, font: fonts.reg, color: GRAY });
    }
    for (let c = 0; c < layout.room.cols; c++) {
      page.drawText(`${c + 1}열`, { x: marginX + c * cellW + cellW / 2 - 6, y: gridTop + 8, size: 8, font: fonts.reg, color: GRAY });
    }
    footer(page, fonts, w, idx + 1, total);
  });

  return doc.save();
}

/** 학생별 시간표 카드 — A4 세로 n-up */
export async function buildTimetablePdf(ctx: PdfCtx): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts = await loadFonts(doc);
  const byId = new Map(ctx.students.map((s) => [s.id, s]));
  const nameOf = (s: Student) => (ctx.maskNames ? maskName(s.name) : s.name);
  const placed = ctx.assignment.placements
    .map((p) => byId.get(p.studentId)!)
    .filter(Boolean);

  const COLS = 3;
  const ROWS = 4;
  const PER = COLS * ROWS;
  const total = Math.max(1, Math.ceil(placed.length / PER));

  for (let pageIdx = 0; pageIdx < total; pageIdx++) {
    const page = doc.addPage([595, 842]);
    const { width: w, height: h } = page.getSize();
    header(page, fonts, "학생별 시험 시간표", `${ctx.exam.title} · ${ctx.exam.date}`, w, h);
    const margin = 28;
    const cw = (w - margin * 2) / COLS;
    const ch = (h - 100) / ROWS;

    for (let i = 0; i < PER; i++) {
      const s = placed[pageIdx * PER + i];
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = margin + col * cw;
      const y = h - 70 - (row + 1) * ch;
      // 절취선용 점선 테두리
      page.drawRectangle({ x, y, width: cw, height: ch, borderColor: LINE, borderWidth: 0.5, borderDashArray: [3, 3] });
      if (!s) continue;
      const tt = studentTimetable(s, ctx.exam, ctx.assignment, ctx.rooms);
      const cx = x + cw / 2;
      centerText(page, fonts.bold, fitText(fonts.bold, nameOf(s), cw - 16, 13).text, cx, y + ch - 26, fitSize(fonts.bold, nameOf(s), cw - 16, 13));
      centerText(page, fonts.reg, `${s.grade}학년 ${s.classNo}반 ${s.number}번`, cx, y + ch - 42, 9, GRAY);
      const seat = tt[0];
      centerText(page, fonts.bold, `${seat.roomName} · ${seat.seatLabel}`, cx, y + ch - 58, 10, ACCENT);
      let ty = y + ch - 78;
      for (const r of tt) {
        page.drawText(`${r.periodLabel}`, { x: x + 10, y: ty, size: 8, font: fonts.bold, color: INK });
        const sub = fitText(fonts.reg, `${r.subject}  ${r.time}`, cw - 52, 8);
        page.drawText(sub.text, { x: x + 46, y: ty, size: sub.size, font: fonts.reg, color: INK });
        ty -= 13;
      }
    }
    footer(page, fonts, w, pageIdx + 1, total);
  }
  return doc.save();
}

/** 고사실별 출석부 (서명란 포함) */
export async function buildAttendancePdf(ctx: PdfCtx): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fonts = await loadFonts(doc);
  const byId = new Map(ctx.students.map((s) => [s.id, s]));
  const nameOf = (s: Student) => (ctx.maskNames ? maskName(s.name) : s.name);
  const PER_PAGE = 26;

  const allRows = ctx.rooms.flatMap((room) =>
    ctx.assignment.placements
      .filter((p) => p.roomId === room.id)
      .map((p) => ({ room, p })),
  );
  // 고사실별로 페이지 분할
  const chunks: { room: RoomConfig; rows: typeof allRows }[] = [];
  for (const room of ctx.rooms) {
    const rows = allRows.filter((r) => r.room.id === room.id);
    for (let i = 0; i < Math.max(1, Math.ceil(rows.length / PER_PAGE)); i++) {
      chunks.push({ room, rows: rows.slice(i * PER_PAGE, (i + 1) * PER_PAGE) });
    }
  }
  const total = chunks.length;

  chunks.forEach((chunk, idx) => {
    const page = doc.addPage([595, 842]);
    const { width: w, height: h } = page.getSize();
    header(page, fonts, `${chunk.room.name} 출석부`, `${ctx.exam.title} · ${ctx.exam.date}`, w, h);
    const cols = [
      { key: "좌석", w: 46 },
      { key: "학년-반-번호", w: 92 },
      { key: "성명", w: 110 },
      { key: "확인", w: 110 },
      { key: "비고", w: 170 },
    ];
    const margin = 28;
    let y = h - 88;
    // 헤더 행
    let x = margin;
    page.drawRectangle({ x: margin, y: y - 6, width: w - margin * 2, height: 20, color: SOFT });
    for (const c of cols) {
      page.drawText(c.key, { x: x + 6, y, size: 9, font: fonts.bold, color: INK });
      x += c.w;
    }
    y -= 22;
    for (const { p } of chunk.rows) {
      const s = byId.get(p.studentId)!;
      let x = margin;
      const cells = [
        `${p.seatNo}번`,
        studentLabel(s),
        nameOf(s),
        "",
        "",
      ];
      page.drawLine({ start: { x: margin, y: y - 6 }, end: { x: w - margin, y: y - 6 }, thickness: 0.5, color: LINE });
      cells.forEach((text, i) => {
        const t = fitText(i === 2 ? fonts.bold : fonts.reg, text, cols[i].w - 10, 10);
        page.drawText(t.text, { x: x + 6, y, size: t.size, font: i === 2 ? fonts.bold : fonts.reg, color: INK });
        x += cols[i].w;
      });
      y -= 22;
    }
    footer(page, fonts, w, idx + 1, total);
  });
  return doc.save();
}
