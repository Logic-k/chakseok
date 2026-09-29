import JSZip from "jszip";
import { layoutsWithAssignments } from "../assign";
import { studentTimetable } from "../timetable";
import { maskName } from "../format";
import { Assignment, ExamConfig, RoomConfig, Student, studentLabel } from "../types";
import templateUrl from "../../assets/template.hwpx?url";

/**
 * 한글(.hwpx) 문서 생성.
 * src/assets/template.hwpx(파이썬 python-hwpx로 생성한 유효 패키지)를 재사용하고
 * 본문 Contents/section0.xml만 교체한다. 템플릿의 charPr/paraPr id:
 *   charPr 7=제목(14pt,B) 8=중제목(12pt,B) 9=굵게(10pt,B) 0=본문(10pt)
 *          10=작은회색(8pt) 11=강조(10pt,B,#1C5CB8)
 *   paraPr 0=양쪽정렬 20=왼쪽 21=가운데
 */
const CH = { TITLE: 7, H2: 8, BOLD: 9, BODY: 0, SMALL: 10, ACCENT: 11 } as const;
const PA = { JUSTIFY: 0, LEFT: 20, CENTER: 21 } as const;
const TABLE_BORDER_FILL = 3;
const PAGE_INNER_WIDTH = 42520; // 210mm - 좌우여백 (hwpunit)

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

let paraSeq = 100;
function para(text: string, opts: { paraPr?: number; charPr?: number } = {}): string {
  const pp = opts.paraPr ?? PA.JUSTIFY;
  const cp = opts.charPr ?? CH.BODY;
  return `<hp:p id="${paraSeq++}" paraPrIDRef="${pp}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${cp}"><hp:t>${esc(text)}</hp:t></hp:run></hp:p>`;
}

/** 표 한 셀 (여러 단락 지원) */
function tc(
  texts: { text: string; charPr?: number }[],
  colAddr: number,
  rowAddr: number,
  w: number,
  h: number,
  paraPr: number = PA.CENTER,
): string {
  const paras = texts
    .map(
      (t) =>
        `<hp:p paraPrIDRef="${paraPr}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0" id="${paraSeq++}"><hp:run charPrIDRef="${t.charPr ?? CH.BODY}"><hp:t>${esc(t.text)}</hp:t></hp:run></hp:p>`,
    )
    .join("");
  return `<hp:tc name="" header="0" hasMargin="0" protect="0" editable="0" dirty="0" borderFillIDRef="${TABLE_BORDER_FILL}"><hp:subList id="" textDirection="HORIZONTAL" lineWrap="BREAK" vertAlign="CENTER" linkListIDRef="0" linkListNextIDRef="0" textWidth="0" textHeight="0" hasTextRef="0" hasNumRef="0">${paras}</hp:subList><hp:cellAddr colAddr="${colAddr}" rowAddr="${rowAddr}"/><hp:cellSpan colSpan="1" rowSpan="1"/><hp:cellSz width="${w}" height="${h}"/><hp:cellMargin left="510" right="510" top="141" bottom="141"/></hp:tc>`;
}

type CellValue = { text: string; charPr?: number } | { text: string; charPr?: number }[];

/** 표 — 각 셀은 {text} 또는 단락 배열 */
function table(
  rows: CellValue[][],
  opts: { rowHeight?: number; colWidths?: number[] } = {},
): string {
  const cols = rows[0]?.length ?? 1;
  const widths = opts.colWidths ?? Array(cols).fill(Math.floor(PAGE_INNER_WIDTH / cols));
  const rowH = opts.rowHeight ?? 2200;
  const trs = rows
    .map(
      (row, r) =>
        `<hp:tr>${row
          .map((cellVal, c) =>
            tc(
              Array.isArray(cellVal) ? cellVal : [cellVal],
              c,
              r,
              widths[c],
              rowH,
            ),
          )
          .join("")}</hp:tr>`,
    )
    .join("");
  return `<hp:p id="${paraSeq++}" paraPrIDRef="${PA.LEFT}" styleIDRef="0" pageBreak="0" columnBreak="0" merged="0"><hp:run charPrIDRef="${CH.BODY}"><hp:tbl id="${paraSeq++}" zOrder="0" numberingType="TABLE" textWrap="TOP_AND_BOTTOM" textFlow="BOTH_SIDES" lock="0" dropcapstyle="None" pageBreak="CELL" repeatHeader="0" rowCnt="${rows.length}" colCnt="${cols}" cellSpacing="0" borderFillIDRef="${TABLE_BORDER_FILL}" noAdjust="0"><hp:sz width="${PAGE_INNER_WIDTH}" widthRelTo="ABSOLUTE" height="${rowH * rows.length}" heightRelTo="ABSOLUTE" protect="0"/><hp:pos treatAsChar="1" affectLSpacing="0" flowWithText="1" allowOverlap="0" holdAnchorAndSO="0" vertRelTo="PARA" horzRelTo="COLUMN" vertAlign="TOP" horzAlign="LEFT" vertOffset="0" horzOffset="0"/><hp:outMargin left="0" right="0" top="0" bottom="0"/><hp:inMargin left="510" right="510" top="141" bottom="141"/>${trs}</hp:tbl></hp:run></hp:p>`;
}

export interface HwpxCtx {
  exam: ExamConfig;
  students: Student[];
  rooms: RoomConfig[];
  assignment: Assignment;
  maskNames: boolean;
}

function buildBody(ctx: HwpxCtx): string {
  const byId = new Map(ctx.students.map((s) => [s.id, s]));
  const nameOf = (s: Student) => (ctx.maskNames ? maskName(s.name) : s.name);
  const layouts = layoutsWithAssignments(ctx.rooms, ctx.assignment);
  const parts: string[] = [];

  parts.push(para(`${ctx.exam.title} 고사실 좌석배치·시간표`, { paraPr: PA.CENTER, charPr: CH.TITLE }));
  parts.push(para(`${ctx.exam.date} · 착석(CHAKSEOK) 자동 생성`, { paraPr: PA.CENTER, charPr: CH.SMALL }));

  for (const layout of layouts) {
    const { room } = layout;
    parts.push(para(`■ ${room.name} 좌석배치도${room.proctor ? ` (감독: ${room.proctor})` : ""}`, { charPr: CH.H2 }));
    parts.push(para("◀ 교탁 / 칠판 ▶", { paraPr: PA.CENTER, charPr: CH.SMALL }));
    const cellW = Math.floor(PAGE_INNER_WIDTH / room.cols);
    const seatRows = layout.cells.map((cellRow) =>
      cellRow.map((c) => {
        if (c.disabled) return [{ text: "미사용", charPr: CH.SMALL }];
        if (!c.studentId) return [{ text: "", charPr: CH.BODY }];
        const s = byId.get(c.studentId)!;
        return [
          { text: nameOf(s), charPr: CH.BOLD },
          { text: studentLabel(s), charPr: CH.SMALL },
        ];
      }),
    );
    parts.push(
      table(seatRows, {
        rowHeight: Math.floor(42000 / Math.max(room.rows, 1)),
        colWidths: Array(room.cols).fill(cellW),
      }),
    );

    // 출석부
    parts.push(para(`■ ${room.name} 출석부`, { charPr: CH.H2 }));
    const att = ctx.assignment.placements.filter((p) => p.roomId === room.id);
    const attRows = [
      ["좌석", "학년-반-번호", "성명", "확인", "비고"].map((t) => ({ text: t, charPr: CH.BOLD })),
      ...att.map((p) => {
        const s = byId.get(p.studentId)!;
        return [
          { text: `${p.seatNo}번`, charPr: CH.BODY },
          { text: studentLabel(s), charPr: CH.BODY },
          { text: nameOf(s), charPr: CH.BOLD },
          { text: "", charPr: CH.BODY },
          { text: "", charPr: CH.BODY },
        ];
      }),
    ];
    parts.push(table(attRows, { rowHeight: 1600 }));
  }

  // 학생별 시간표
  parts.push(para("■ 학생별 시험 시간표", { charPr: CH.H2 }));
  for (const s of ctx.students.filter((x) => !x.absent)) {
    const tt = studentTimetable(s, ctx.exam, ctx.assignment, ctx.rooms);
    if (tt[0]?.roomName === "-") continue;
    parts.push(
      para(`${nameOf(s)} (${studentLabel(s)}) — ${tt[0].roomName} ${tt[0].seatLabel}`, {
        charPr: CH.ACCENT,
      }),
    );
    const rows = [
      ["교시", "시간", "과목"].map((t) => ({ text: t, charPr: CH.BOLD })),
      ...tt.map((r) => [
        { text: r.periodLabel, charPr: CH.BODY },
        { text: r.time, charPr: CH.BODY },
        { text: r.subject, charPr: CH.BODY },
      ]),
    ];
    parts.push(table(rows, { rowHeight: 1500, colWidths: [10630, 15945, 15945] }));
  }

  return parts.join("");
}

export async function buildHwpx(ctx: HwpxCtx, templateBytes?: ArrayBuffer): Promise<Uint8Array> {
  const buf: ArrayBuffer =
    templateBytes ?? (await fetch(templateUrl).then((r) => r.arrayBuffer()));
  const src = await JSZip.loadAsync(buf);
  const origSection = await src.file("Contents/section0.xml")!.async("string");

  // 첫 문단(secPr 페이지 설정 포함)을 그대로 재사용
  const firstParaEnd = origSection.indexOf("</hp:p>") + "</hp:p>".length;
  const firstPara = origSection.slice(origSection.indexOf("<hp:p "), firstParaEnd);

  paraSeq = 100;
  const body = buildBody(ctx);
  const sectionXml =
    `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n` +
    `<hs:sec xmlns:ha="http://www.hancom.co.kr/hwpml/2011/app" xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hp10="http://www.hancom.co.kr/hwpml/2016/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section" xmlns:hc="http://www.hancom.co.kr/hwpml/2011/core" xmlns:hh="http://www.hancom.co.kr/hwpml/2011/head" xmlns:hhs="http://www.hancom.co.kr/hwpml/2011/history" xmlns:hm="http://www.hancom.co.kr/hwpml/2011/master-page" xmlns:hpf="http://www.hancom.co.kr/schema/2011/hpf" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf/" xmlns:ooxmlchart="http://www.hancom.co.kr/hwpml/2016/ooxmlchart" xmlns:hwpunitchar="http://www.hancom.co.kr/hwpml/2016/HwpUnitChar" xmlns:epub="http://www.idpf.org/2007/ops" xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0">` +
    firstPara +
    body +
    `</hs:sec>`;

  const preview =
    `${ctx.exam.title}\n${ctx.exam.date}\n` +
    ctx.rooms.map((r) => `${r.name} 좌석배치도·출석부`).join("\n") +
    `\n학생별 시험 시간표\n— 착석(CHAKSEOK) 자동 생성`;

  // ODF 규약: mimetype는 첫 엔트리 + 무압축(STORE)이어야 하므로 새 아카이브를 재구성
  const out = new JSZip();
  const mime = await src.file("mimetype")!.async("string");
  out.file("mimetype", mime, { compression: "STORE" });
  for (const [path, entry] of Object.entries(src.files)) {
    if (entry.dir || path === "mimetype") continue;
    const data = await entry.async("uint8array");
    if (path === "Contents/section0.xml") {
      out.file(path, sectionXml, { compression: "DEFLATE" });
    } else if (path === "Preview/PrvText.txt") {
      out.file(path, preview, { compression: "DEFLATE" });
    } else {
      out.file(path, data, { compression: "DEFLATE" });
    }
  }
  return out.generateAsync({ type: "uint8array" });
}
