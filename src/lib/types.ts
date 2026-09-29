/** 도메인 모델 — 고사실 자리배치·시간표 자동 생성 */

export interface Student {
  id: string;
  grade: number;
  classNo: number;
  number: number;
  name: string;
  /** 선택과목 그룹 키 (예: "확률과통계", "미적분"). 공통 과목만이면 생략 */
  electives: Record<string, string>;
  /** 결시/제외 여부 */
  absent?: boolean;
}

/** 명렬표에서 파생된 과목 열 정의 */
export interface ElectiveColumn {
  key: string; // 열 이름 (예: "선택과목1")
  options: string[]; // 등장한 값 목록
}

export interface RoomConfig {
  id: string;
  name: string;
  rows: number;
  cols: number;
  /** 사용 불가 좌석 "row,col" 목록 (0-based) */
  disabledSeats: string[];
  /** 담당 감독 교사 이름(선택) */
  proctor?: string;
}

export interface SeatCell {
  row: number;
  col: number;
  disabled: boolean;
  studentId: string | null;
}

export interface RoomLayout {
  room: RoomConfig;
  cells: SeatCell[][];
}

/** 시험 교시 정의. common: 모든 학생 동일 과목, elective: 학생 선택과목 키에 따라 과목 결정 */
export interface PeriodConfig {
  id: string;
  order: number;
  label: string; // "1교시" 등
  time: string; // "09:00~10:00"
  kind: "common" | "elective";
  /** common일 때 과목명 */
  subject?: string;
  /** elective일 때 학생 electives 맵에서 참조할 열 키 */
  electiveKey?: string;
}

export interface ExamConfig {
  title: string; // "2026학년도 1학기 중간고사"
  date: string; // "2026-04-28"
  periods: PeriodConfig[];
}

export type AssignStrategy =
  | "sequential" // 번호순 (학년-반-번호)
  | "interleave" // 반 섞기 (인접 좌석 다른 반)
  | "random" // 완전 무작위
  | "subject-spread"; // 선택과목 분산

export type FillOrder = "column-zigzag" | "column" | "row" | "row-zigzag";

export interface AssignOptions {
  strategy: AssignStrategy;
  fillOrder: FillOrder;
  /** 인접(상하좌우+대각) 같은 반 배치 금지 시도 */
  avoidSameClassAdjacent: boolean;
  seed: number;
  /** 학생ID→"roomId:row:col" 고정 배정 */
  pinned: Record<string, string>;
}

export interface Assignment {
  placements: Placement[];
  unassigned: Student[]; // 좌석 부족 등으로 배치 못한 학생
  warnings: string[];
}

export interface Placement {
  studentId: string;
  roomId: string;
  row: number;
  col: number;
  seatNo: number; // 좌석 번호 (배정 순서)
}

/** 학생별 시간표 행 */
export interface TimetableRow {
  periodLabel: string;
  time: string;
  subject: string;
  roomName: string;
  seatLabel: string; // "3행 4열" 또는 좌석번호
}

export interface Project {
  version: 1;
  exam: ExamConfig;
  students: Student[];
  electiveColumns: ElectiveColumn[];
  rooms: RoomConfig[];
  options: AssignOptions;
  assignment: Assignment | null;
}

export function seatKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function studentLabel(s: Student): string {
  return `${s.grade}-${s.classNo}-${String(s.number).padStart(2, "0")}`;
}
