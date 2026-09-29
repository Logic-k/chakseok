import { describe, expect, it, vi, beforeAll } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { generateSampleStudents, sampleExam, sampleRooms } from "../sample";
import { assignSeats } from "../assign";
import { defaultOptions } from "../../store";
import { buildSeatMapPdf, buildTimetablePdf, buildAttendancePdf } from "./pdf";
import { buildDocx } from "./docx";
import { buildResultWorkbook, workbookToBytes } from "./xlsx";
import * as XLSX from "xlsx";

const ROOT = path.resolve(__dirname, "../..");

beforeAll(() => {
  // vitest(node) 환경에서는 fetch가 없으므로 로컬 에셋을 파일로 서빙
  vi.stubGlobal("fetch", async (url: string) => {
    const buf = await readFile(path.join(ROOT, "..", decodeURIComponent(url)));
    return { arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) } as Response;
  });
});

function ctx() {
  const students = generateSampleStudents([{ grade: 1, classes: 3, perClass: 25 }], 7);
  const exam = sampleExam();
  const rooms = sampleRooms();
  const assignment = assignSeats(students, rooms, { ...defaultOptions, seed: 42 });
  return { exam, students, rooms, assignment, maskNames: false };
}

describe("PDF 출력", () => {
  it("좌석배치도 PDF가 한글 폰트와 함께 생성된다", async () => {
    const bytes = await buildSeatMapPdf(ctx());
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(10_000);
  });
  it("학생별 시간표/출석부 PDF 생성", async () => {
    expect((await buildTimetablePdf(ctx())).length).toBeGreaterThan(10_000);
    expect((await buildAttendancePdf(ctx())).length).toBeGreaterThan(10_000);
  });
});

describe("DOCX·XLSX 출력", () => {
  it("DOCX는 ZIP 패키지다", async () => {
    const blob = await buildDocx(ctx());
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(bytes[0]).toBe(0x50); // 'P'
    expect(bytes[1]).toBe(0x4b); // 'K'
  });
  it("XLSX 통합본 시트 구성", async () => {
    const wb = buildResultWorkbook(ctx());
    expect(wb.SheetNames).toContain("종합배정");
    expect(wb.SheetNames).toContain("학생별시간표");
    expect(wb.SheetNames.some((n) => n.startsWith("배치-"))).toBe(true);
    const bytes = workbookToBytes(wb);
    const rt = XLSX.read(bytes);
    expect(rt.SheetNames.length).toBe(wb.SheetNames.length);
  });
});
