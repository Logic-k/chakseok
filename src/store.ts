import { create } from "zustand";
import { persist } from "zustand/middleware";
import { assignSeats } from "./lib/assign";
import {
  AssignOptions,
  Assignment,
  ElectiveColumn,
  ExamConfig,
  Project,
  RoomConfig,
  Student,
} from "./lib/types";

export type Step = 1 | 2 | 3 | 4 | 5;

interface AppState {
  step: Step;
  exam: ExamConfig;
  students: Student[];
  electiveColumns: ElectiveColumn[];
  rooms: RoomConfig[];
  options: AssignOptions;
  assignment: Assignment | null;
  importWarnings: string[];
  /** 출력 시 이름 마스킹 (게시용 공개 출력물용) */
  maskNames: boolean;

  setStep: (s: Step) => void;
  setExam: (e: ExamConfig) => void;
  setRoster: (students: Student[], cols: ElectiveColumn[], warnings: string[]) => void;
  setStudents: (s: Student[]) => void;
  setRooms: (r: RoomConfig[]) => void;
  setOptions: (o: Partial<AssignOptions>) => void;
  setMaskNames: (v: boolean) => void;
  runAssign: () => void;
  swapSeats: (a: { roomId: string; row: number; col: number }, b: { roomId: string; row: number; col: number }) => void;
  clearAssignment: () => void;
  loadProject: (p: Project) => void;
  toProject: () => Project;
  reset: () => void;
}

export const defaultOptions: AssignOptions = {
  strategy: "interleave",
  fillOrder: "column-zigzag",
  avoidSameClassAdjacent: true,
  seed: 20260428,
  pinned: {},
};

const initialExam: ExamConfig = {
  title: "",
  date: "",
  periods: [],
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      step: 1,
      exam: initialExam,
      students: [],
      electiveColumns: [],
      rooms: [],
      options: defaultOptions,
      assignment: null,
      importWarnings: [],
      maskNames: false,

      setStep: (step) => set({ step }),
      setExam: (exam) => set({ exam, assignment: null }),
      setRoster: (students, electiveColumns, warnings) =>
        set({ students, electiveColumns, importWarnings: warnings, assignment: null }),
      setStudents: (students) => set({ students, assignment: null }),
      setRooms: (rooms) => set({ rooms, assignment: null }),
      setOptions: (o) => set({ options: { ...get().options, ...o }, assignment: null }),
      setMaskNames: (maskNames) => set({ maskNames }),

      runAssign: () => {
        const { students, rooms, options } = get();
        const assignment = assignSeats(students, rooms, options);
        set({ assignment });
      },

      swapSeats: (a, b) => {
        const assignment = get().assignment;
        if (!assignment) return;
        const pa = assignment.placements.find((p) => p.roomId === a.roomId && p.row === a.row && p.col === a.col);
        const pb = assignment.placements.find((p) => p.roomId === b.roomId && p.row === b.row && p.col === b.col);
        if (!pa && !pb) return;
        if (pa && pb) {
          [pa.studentId, pb.studentId] = [pb.studentId, pa.studentId];
        } else if (pa) {
          pa.row = b.row;
          pa.col = b.col;
        } else if (pb) {
          pb.row = a.row;
          pb.col = a.col;
        }
        const options = get().options;
        let pinned = options.pinned;
        for (const p of [pa, pb]) {
          const key = p ? `${p.roomId}:${p.row}:${p.col}` : null;
          if (p && p.studentId && pinned[p.studentId] && pinned[p.studentId] !== key) {
            if (pinned === options.pinned) pinned = { ...pinned };
            pinned[p.studentId] = key!;
          }
        }
        set({
          assignment: { ...assignment, placements: [...assignment.placements] },
          ...(pinned === options.pinned ? {} : { options: { ...options, pinned } }),
        });
      },

      clearAssignment: () => set({ assignment: null }),

      toProject: () => {
        const s = get();
        return {
          version: 1,
          exam: s.exam,
          students: s.students,
          electiveColumns: s.electiveColumns,
          rooms: s.rooms,
          options: s.options,
          assignment: s.assignment,
        };
      },

      loadProject: (p) =>
        set({
          exam: p.exam,
          students: p.students,
          electiveColumns: p.electiveColumns,
          rooms: p.rooms,
          options: p.options,
          assignment: p.assignment,
          step: 4,
        }),

      reset: () =>
        set({
          step: 1,
          exam: initialExam,
          students: [],
          electiveColumns: [],
          rooms: [],
          options: defaultOptions,
          assignment: null,
          importWarnings: [],
        }),
    }),
    { name: "chakseok-project" },
  ),
);
