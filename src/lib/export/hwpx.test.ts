import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { assignSeats } from "../assign";
import { generateSampleStudents, sampleExam, sampleRooms } from "../sample";
import { buildHwpx } from "./hwpx";

describe("buildHwpx", () => {
  it("유효한 hwpx 패키지를 생성한다", async () => {
    const students = generateSampleStudents([{ grade: 1, classes: 2, perClass: 8 }], 3);
    const rooms = sampleRooms().slice(0, 1);
    const assignment = assignSeats(students, rooms, {
      strategy: "interleave",
      fillOrder: "column-zigzag",
      avoidSameClassAdjacent: true,
      seed: 1,
      pinned: {},
    });
    const tpl = readFileSync("src/assets/template.hwpx").buffer as ArrayBuffer;
    const bytes = await buildHwpx(
      {
        exam: sampleExam(),
        students,
        rooms,
        assignment,
        maskNames: false,
      },
      tpl,
    );
    expect(bytes.length).toBeGreaterThan(10000);
    writeFileSync("/tmp/out_test.hwpx", Buffer.from(bytes));
    // zip 시그니처
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    // mimetype는 무압축 첫 엔트리
    const head = Buffer.from(bytes.slice(0, 60)).toString("latin1");
    expect(head).toContain("mimetype");
  });
});
