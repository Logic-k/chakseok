import { mulberry32 } from "./assign";
import { ExamConfig, RoomConfig, Student } from "./types";

const FAMILY = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const GIVEN = [
  "가연", "나래", "다온", "라온", "마루", "바름", "새론", "아라", "자운", "차미",
  "하윤", "해솔", "도현", "로운", "미래", "별하", "서준", "이든", "지안", "태오",
];

/**
 * 시연용 가상 명단 생성.
 * 실제 인물이 아님을 알 수 있도록 학년-반-번호 기반 순번 이름("홍길동식" 가명)을 사용.
 */
export function generateSampleStudents(
  grades: { grade: number; classes: number; perClass: number }[],
  seed = 42,
  electivePool: { key: string; options: string[]; take: number }[] = [
    { key: "선택과목", options: ["확률과통계", "미적분", "기하"], take: 1 },
  ],
): Student[] {
  const rnd = mulberry32(seed);
  const students: Student[] = [];
  let seq = 0;
  for (const g of grades) {
    for (let c = 1; c <= g.classes; c++) {
      for (let n = 1; n <= g.perClass; n++) {
        const electives: Record<string, string> = {};
        for (const pool of electivePool) {
          const picks = new Set<string>();
          while (picks.size < Math.min(pool.take, pool.options.length)) {
            picks.add(pool.options[Math.floor(rnd() * pool.options.length)]);
          }
          electives[pool.key] = [...picks].join(",");
        }
        students.push({
          id: `st-${seq++}`,
          grade: g.grade,
          classNo: c,
          number: n,
          name: `${FAMILY[Math.floor(rnd() * FAMILY.length)]}${GIVEN[Math.floor(rnd() * GIVEN.length)]}(${String(n).padStart(2, "0")})`,
          electives,
        });
      }
    }
  }
  return students;
}

export function sampleExam(): ExamConfig {
  return {
    title: "2026학년도 1학기 중간고사",
    date: "2026-04-28",
    periods: [
      { id: "p1", order: 1, label: "1교시", time: "09:00~10:00", kind: "common", subject: "국어" },
      { id: "p2", order: 2, label: "2교시", time: "10:20~11:20", kind: "elective", electiveKey: "선택과목" },
      { id: "p3", order: 3, label: "3교시", time: "11:40~12:40", kind: "common", subject: "영어" },
    ],
  };
}

export function sampleRooms(): RoomConfig[] {
  return [
    { id: "r1", name: "1-1 고사실", rows: 5, cols: 6, disabledSeats: [], proctor: "" },
    { id: "r2", name: "1-2 고사실", rows: 5, cols: 6, disabledSeats: [], proctor: "" },
    { id: "r3", name: "2-1 고사실", rows: 5, cols: 6, disabledSeats: ["0,0"], proctor: "" },
  ];
}
