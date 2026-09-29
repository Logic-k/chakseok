import {
  AssignOptions,
  Assignment,
  FillOrder,
  Placement,
  RoomConfig,
  RoomLayout,
  SeatCell,
  Student,
  seatKey,
  studentLabel,
} from "./types";

/** 결정적 난수 (재현 가능한 배치 — 같은 seed면 같은 결과) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildLayout(room: RoomConfig): RoomLayout {
  const cells: SeatCell[][] = [];
  for (let r = 0; r < room.rows; r++) {
    const row: SeatCell[] = [];
    for (let c = 0; c < room.cols; c++) {
      row.push({ row: r, col: c, disabled: room.disabledSeats.includes(seatKey(r, c)), studentId: null });
    }
    cells.push(row);
  }
  return { room, cells };
}

/** 배정 순서대로 사용 가능 좌석을 나열 */
export function orderedSeats(room: RoomConfig, order: FillOrder): { row: number; col: number }[] {
  const seats: { row: number; col: number }[] = [];
  const usable = (r: number, c: number) => !room.disabledSeats.includes(seatKey(r, c));
  if (order === "row" || order === "row-zigzag") {
    for (let r = 0; r < room.rows; r++) {
      const cols = [...Array(room.cols).keys()];
      if (order === "row-zigzag" && r % 2 === 1) cols.reverse();
      for (const c of cols) if (usable(r, c)) seats.push({ row: r, col: c });
    }
  } else {
    for (let c = 0; c < room.cols; c++) {
      const rows = [...Array(room.rows).keys()];
      if (order === "column-zigzag" && c % 2 === 1) rows.reverse();
      for (const r of rows) if (usable(r, c)) seats.push({ row: r, col: c });
    }
  }
  return seats;
}

interface QueueItem {
  student: Student;
  groupKey: string;
}

function classKey(s: Student): string {
  return `${s.grade}-${s.classNo}`;
}

function electiveKey(s: Student): string {
  const vals = Object.values(s.electives).filter(Boolean);
  return vals.length ? vals.sort().join("/") : "(공통)";
}

/** 전략에 따라 학생 배정 순서를 생성 */
export function orderStudents(students: Student[], opts: AssignOptions): QueueItem[] {
  const pool = students.filter((s) => !s.absent);
  const byKey = (a: Student, b: Student) =>
    a.grade - b.grade || a.classNo - b.classNo || a.number - b.number;
  const items: QueueItem[] = pool.map((s) => ({ student: s, groupKey: classKey(s) }));

  switch (opts.strategy) {
    case "sequential":
      items.sort((a, b) => byKey(a.student, b.student));
      break;
    case "random": {
      const rnd = mulberry32(opts.seed);
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
      break;
    }
    case "interleave": {
      // 반별 라운드로빈: 인원 많은 반부터 차례로 한 명씩 뽑아 인접 같은 반 최소화
      const groups = new Map<string, Student[]>();
      for (const s of pool) {
        const k = classKey(s);
        groups.set(k, [...(groups.get(k) ?? []), s]);
      }
      const queues = [...groups.values()]
        .map((arr) => arr.sort(byKey))
        .sort((a, b) => b.length - a.length);
      items.length = 0;
      while (queues.some((q) => q.length)) {
        queues.sort((a, b) => b.length - a.length);
        for (const q of queues) {
          const s = q.shift();
          if (s) items.push({ student: s, groupKey: classKey(s) });
        }
      }
      break;
    }
    case "subject-spread": {
      // 동일 과목 조합 학생이 나란히 앉지 않도록 과목 그룹 라운드로빈
      const groups = new Map<string, Student[]>();
      for (const s of pool) {
        const k = electiveKey(s);
        groups.set(k, [...(groups.get(k) ?? []), s]);
      }
      const queues = [...groups.values()]
        .map((arr) => arr.sort(byKey))
        .sort((a, b) => b.length - a.length);
      items.length = 0;
      while (queues.some((q) => q.length)) {
        queues.sort((a, b) => b.length - a.length);
        for (const q of queues) {
          const s = q.shift();
          if (s) items.push({ student: s, groupKey: `${classKey(s)}|${electiveKey(s)}` });
        }
      }
      break;
    }
  }
  return items;
}

const DIRS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], [0, 1],
  [1, -1], [1, 0], [1, 1],
];

function sameGroupPenalty(
  layout: RoomLayout,
  row: number,
  col: number,
  keyOf: (id: string) => string,
  newKey: string,
): number {
  let penalty = 0;
  for (const [dr, dc] of DIRS) {
    const r = row + dr;
    const c = col + dc;
    if (r < 0 || c < 0 || r >= layout.cells.length || c >= layout.cells[0].length) continue;
    const occupant = layout.cells[r][c].studentId;
    if (occupant && keyOf(occupant) === newKey) penalty += dc === 0 || dr === 0 ? 2 : 1;
  }
  return penalty;
}

/**
 * 좌석 배치 실행.
 * 1) 고정(pinned) 배정 → 2) 전략별 학생 큐 → 3) 인접-같은그룹 회피 배치 → 4) 좌석 부족 시 미배정 보고
 */
export function assignSeats(
  students: Student[],
  rooms: RoomConfig[],
  opts: AssignOptions,
): Assignment {
  const warnings: string[] = [];
  const layouts = rooms.map(buildLayout);
  const placements: Placement[] = [];
  const pinnedIds = new Set(Object.keys(opts.pinned));
  const studentById = new Map(students.map((s) => [s.id, s]));

  const keyOf = (id: string) => {
    const s = studentById.get(id);
    if (!s) return "";
    return opts.strategy === "subject-spread"
      ? `${classKey(s)}|${electiveKey(s)}`
      : classKey(s);
  };

  // 1) 고정 좌석 먼저 채움
  let seatNoCounter = 0;
  for (const [studentId, pin] of Object.entries(opts.pinned)) {
    const [roomId, rs, cs] = pin.split(":");
    const layout = layouts.find((l) => l.room.id === roomId);
    const r = Number(rs);
    const c = Number(cs);
    const s = studentById.get(studentId);
    if (!layout || !s) {
      warnings.push(`고정 배정 무시: ${s ? studentLabel(s) : studentId} — 알 수 없는 고사실`);
      continue;
    }
    const cell = layout.cells[r]?.[c];
    if (!cell || cell.disabled) {
      warnings.push(`고정 배정 무시: ${studentLabel(s)} — 사용 불가 좌석`);
      continue;
    }
    if (cell.studentId) {
      warnings.push(`고정 배정 충돌: ${studentLabel(s)} — 이미 배정된 좌석`);
      continue;
    }
    cell.studentId = studentId;
    placements.push({ studentId, roomId, row: r, col: c, seatNo: ++seatNoCounter });
  }

  // 2) 학생 큐
  const queue = orderStudents(students.filter((s) => !pinnedIds.has(s.id)), opts);
  const unassigned: Student[] = [];

  // 3) 고사실 순회하며 배치
  const q = [...queue];
  for (const layout of layouts) {
    const seats = orderedSeats(layout.room, opts.fillOrder).filter(
      ({ row, col }) => !layout.cells[row][col].studentId,
    );
    for (const seat of seats) {
      if (!q.length) break;
      // 인접 같은 그룹 회피: 큐 앞쪽 후보 중 penalty 최소인 학생 선택
      let pick = 0;
      if (opts.avoidSameClassAdjacent) {
        let best = Infinity;
        const windowSize = Math.min(q.length, 8);
        for (let i = 0; i < windowSize; i++) {
          const p = sameGroupPenalty(layout, seat.row, seat.col, keyOf, q[i].groupKey);
          if (p < best) {
            best = p;
            pick = i;
            if (p === 0) break;
          }
        }
      }
      const item = q.splice(pick, 1)[0];
      layout.cells[seat.row][seat.col].studentId = item.student.id;
      placements.push({
        studentId: item.student.id,
        roomId: layout.room.id,
        row: seat.row,
        col: seat.col,
        seatNo: ++seatNoCounter,
      });
    }
    if (!q.length) break;
  }

  // 4) 남은 학생 = 미배정
  for (const item of q) unassigned.push(item.student);
  if (unassigned.length) {
    warnings.push(
      `좌석 부족: ${unassigned.length}명 미배정 (${unassigned
        .slice(0, 5)
        .map(studentLabel)
        .join(", ")}${unassigned.length > 5 ? " 외" : ""})`,
    );
  }

  placements.sort((a, b) => a.seatNo - b.seatNo);
  return { placements, unassigned, warnings };
}

/** 배정 결과를 레이아웃 맵으로 변환 (UI/출력 공용) */
export function layoutsWithAssignments(
  rooms: RoomConfig[],
  assignment: Assignment | null,
): RoomLayout[] {
  const layouts = rooms.map(buildLayout);
  if (!assignment) return layouts;
  for (const p of assignment.placements) {
    const layout = layouts.find((l) => l.room.id === p.roomId);
    if (layout && layout.cells[p.row]?.[p.col]) {
      layout.cells[p.row][p.col].studentId = p.studentId;
    }
  }
  return layouts;
}

/** 인접 같은 반/과목 통계 (검증·품질 표시용) */
export function adjacencyStats(
  rooms: RoomConfig[],
  assignment: Assignment,
  students: Student[],
): { sameClassPairs: number; sameElectivePairs: number } {
  const layouts = layoutsWithAssignments(rooms, assignment);
  const byId = new Map(students.map((s) => [s.id, s]));
  let sameClassPairs = 0;
  let sameElectivePairs = 0;
  for (const layout of layouts) {
    for (const cellRow of layout.cells) {
      for (const cell of cellRow) {
        if (!cell.studentId) continue;
        for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
          const r = cell.row + dr;
          const c = cell.col + dc;
          const other = layout.cells[r]?.[c]?.studentId;
          if (!other) continue;
          const a = byId.get(cell.studentId);
          const b = byId.get(other);
          if (!a || !b) continue;
          if (classKey(a) === classKey(b)) sameClassPairs++;
          const ea = electiveKey(a);
          const eb = electiveKey(b);
          if (ea !== "(공통)" && ea === eb) sameElectivePairs++;
        }
      }
    }
  }
  return { sameClassPairs, sameElectivePairs };
}
