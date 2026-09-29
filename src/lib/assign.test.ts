import { describe, expect, it } from "vitest";
import { adjacencyStats, assignSeats, orderStudents, orderedSeats } from "./assign";
import { generateSampleStudents, sampleRooms } from "./sample";
import { AssignOptions } from "./types";

const baseOpts: AssignOptions = {
  strategy: "sequential",
  fillOrder: "column-zigzag",
  avoidSameClassAdjacent: false,
  seed: 7,
  pinned: {},
};

const students = generateSampleStudents(
  [
    { grade: 1, classes: 2, perClass: 10 },
    { grade: 2, classes: 2, perClass: 10 },
  ],
  1,
);

describe("assignSeats", () => {
  it("전원 배치 + 좌석 충돌 없음", () => {
    const rooms = sampleRooms();
    const a = assignSeats(students, rooms, baseOpts);
    expect(a.unassigned.length).toBe(0);
    const keys = a.placements.map((p) => `${p.roomId}:${p.row}:${p.col}`);
    expect(new Set(keys).size).toBe(keys.length);
    // disabled 좌석에는 배정되지 않음
    expect(keys).not.toContain("r3:0:0");
  });

  it("좌석 부족 시 미배정 보고", () => {
    const rooms = [{ id: "r1", name: "소실", rows: 2, cols: 2, disabledSeats: [] }];
    const a = assignSeats(students, rooms, baseOpts);
    expect(a.unassigned.length).toBe(students.length - 4);
    expect(a.warnings.some((w) => w.includes("좌석 부족"))).toBe(true);
  });

  it("고정 좌석 지정 반영", () => {
    const rooms = sampleRooms();
    const pinned = { [students[0].id]: "r1:0:0" };
    const a = assignSeats(students, rooms, { ...baseOpts, pinned });
    const p = a.placements.find((x) => x.studentId === students[0].id);
    expect(p?.roomId).toBe("r1");
    expect([p?.row, p?.col]).toEqual([0, 0]);
  });

  it("같은 seed → 같은 결과 (재현성)", () => {
    const rooms = sampleRooms();
    const opts = { ...baseOpts, strategy: "random" as const };
    const a = assignSeats(students, rooms, opts);
    const b = assignSeats(students, rooms, opts);
    expect(a.placements).toEqual(b.placements);
  });

  it("interleave + 회피 옵션은 인접 동반석을 줄임", () => {
    const rooms = sampleRooms();
    const naive = assignSeats(students, rooms, baseOpts);
    const smart = assignSeats(students, rooms, {
      ...baseOpts,
      strategy: "interleave",
      avoidSameClassAdjacent: true,
    });
    const s1 = adjacencyStats(rooms, naive, students);
    const s2 = adjacencyStats(rooms, smart, students);
    expect(s2.sameClassPairs).toBeLessThanOrEqual(s1.sameClassPairs);
  });
});

describe("orderedSeats", () => {
  const room = { id: "r", name: "r", rows: 3, cols: 3, disabledSeats: ["1,1"] };
  it("column-zigzag 순서", () => {
    const s = orderedSeats(room, "column-zigzag");
    expect(s.length).toBe(8);
    expect(s[0]).toEqual({ row: 0, col: 0 });
    expect(s[3]).toEqual({ row: 2, col: 1 }); // 두번째 열은 역순
    expect(s).not.toContainEqual({ row: 1, col: 1 });
  });
  it("row 순서", () => {
    const s = orderedSeats(room, "row");
    expect(s[0]).toEqual({ row: 0, col: 0 });
    expect(s[2]).toEqual({ row: 0, col: 2 });
  });
});

describe("orderStudents", () => {
  it("interleave는 같은 반 연속 배치를 줄임", () => {
    const seq = orderStudents(students, baseOpts);
    const inter = orderStudents(students, { ...baseOpts, strategy: "interleave" });
    const streak = (arr: typeof seq) => {
      let max = 0;
      let cur = 1;
      for (let i = 1; i < arr.length; i++) {
        if (arr[i].groupKey === arr[i - 1].groupKey) {
          cur++;
          max = Math.max(max, cur);
        } else cur = 1;
      }
      return max;
    };
    expect(streak(inter)).toBeLessThan(streak(seq));
  });
});
