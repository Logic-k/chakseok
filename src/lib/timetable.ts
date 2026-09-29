import { Assignment, ExamConfig, RoomConfig, Student, TimetableRow } from "./types";

/** 학생 한 명의 교시별 시간표 생성 (선택과목 반영) */
export function studentTimetable(
  student: Student,
  exam: ExamConfig,
  assignment: Assignment | null,
  rooms: RoomConfig[],
): TimetableRow[] {
  const placement = assignment?.placements.find((p) => p.studentId === student.id);
  const room = placement ? rooms.find((r) => r.id === placement.roomId) : null;
  const seatLabel = placement ? `${placement.row + 1}행 ${placement.col + 1}열` : "-";
  return [...exam.periods]
    .sort((a, b) => a.order - b.order)
    .map((p) => ({
      periodLabel: p.label,
      time: p.time,
      subject:
        p.kind === "common"
          ? (p.subject ?? "-")
          : (student.electives[p.electiveKey ?? ""] ?? "(미배정)"),
      roomName: room?.name ?? "-",
      seatLabel,
    }));
}

/** 고사실별 배정 학생 목록 (출석부용 — 좌석 행/열 순 정렬) */
export function roomRoster(
  roomId: string,
  assignment: Assignment,
  students: Student[],
): { student: Student; row: number; col: number; seatNo: number }[] {
  const byId = new Map(students.map((s) => [s.id, s]));
  return assignment.placements
    .filter((p) => p.roomId === roomId)
    .map((p) => ({ student: byId.get(p.studentId)!, row: p.row, col: p.col, seatNo: p.seatNo }))
    .filter((x) => x.student)
    .sort((a, b) => a.seatNo - b.seatNo);
}
