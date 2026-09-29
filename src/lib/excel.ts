import * as XLSX from "xlsx";
import { ElectiveColumn, Student } from "./types";

/** 헤더 자동 인식 규칙 (NEIS/학교 명렬표 관용 표현) */
const HEADER_ALIASES: Record<string, "grade" | "classNo" | "number" | "name" | "elective"> = {
  학년: "grade",
  학급: "classNo",
  반: "classNo",
  번호: "number",
  성명: "name",
  이름: "name",
};

export interface ParsedRoster {
  students: Student[];
  electiveColumns: ElectiveColumn[];
  /** 매핑된 열 정보 (헤더 → 필드) */
  mapping: { header: string; field: string }[];
  warnings: string[];
}

function norm(v: unknown): string {
  return String(v ?? "").trim();
}

/**
 * 엑셀/CSV 명렬표 파싱.
 * - 1행을 헤더로 인식해 학년/반/번호/이름 자동 매핑
 * - 매핑되지 않은 열 중 값이 2개 이상 있는 열은 선택과목 열로 간주
 */
export function parseRosterSheet(sheet: XLSX.WorkSheet): ParsedRoster {
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const warnings: string[] = [];
  if (!rows.length) return { students: [], electiveColumns: [], mapping: [], warnings: ["빈 시트입니다."] };

  const headers = Object.keys(rows[0]);
  const mapping: { header: string; field: string }[] = [];
  const fieldOf: Record<string, string> = {};
  for (const h of headers) {
    const clean = h.replace(/\s/g, "");
    const alias = HEADER_ALIASES[clean];
    if (alias) {
      fieldOf[h] = alias;
      mapping.push({ header: h, field: alias });
    }
  }
  const required = ["grade", "classNo", "number", "name"] as const;
  for (const f of required) {
    if (!Object.values(fieldOf).includes(f)) {
      warnings.push(`필수 열 누락: ${f === "grade" ? "학년" : f === "classNo" ? "반" : f === "number" ? "번호" : "성명"}`);
    }
  }

  // 나머지 열 → 선택과목 후보 (빈 값이 아닌 셀이 2개 이상일 때)
  const electiveHeaders = headers.filter((h) => !fieldOf[h]);
  const electiveColumns: ElectiveColumn[] = [];
  for (const h of electiveHeaders) {
    const vals = [...new Set(rows.map((r) => norm(r[h])).filter(Boolean))];
    if (vals.length >= 1 && vals.length <= 30 && vals.every((v) => v.length <= 20)) {
      electiveColumns.push({ key: h, options: vals });
      mapping.push({ header: h, field: "elective" });
      fieldOf[h] = `elective:${h}`;
    }
  }

  const students: Student[] = [];
  let seq = 0;
  for (const r of rows) {
    const grade = Number(norm(r[headers.find((h) => fieldOf[h] === "grade") ?? ""]));
    const classNo = Number(norm(r[headers.find((h) => fieldOf[h] === "classNo") ?? ""]));
    const number = Number(norm(r[headers.find((h) => fieldOf[h] === "number") ?? ""]));
    const name = norm(r[headers.find((h) => fieldOf[h] === "name") ?? ""]);
    if (!name && !classNo && !grade) continue; // 완전 빈 행
    if (!name || !Number.isFinite(classNo) || !Number.isFinite(grade)) {
      warnings.push(`건너뜀: "${name || "(무제)"}" — 학년/반/성명 확인 필요`);
      continue;
    }
    const electives: Record<string, string> = {};
    for (const h of electiveHeaders) {
      if (fieldOf[h]?.startsWith("elective:")) {
        const v = norm(r[h]);
        if (v) electives[h] = v;
      }
    }
    students.push({ id: `st-${seq++}`, grade, classNo, number, name, electives });
  }

  const duplicates = new Set<string>();
  const seen = new Set<string>();
  for (const s of students) {
    const k = `${s.grade}-${s.classNo}-${s.number}`;
    if (seen.has(k)) duplicates.add(k);
    seen.add(k);
  }
  if (duplicates.size) warnings.push(`중복 학번 의심: ${[...duplicates].slice(0, 5).join(", ")}`);

  return { students, electiveColumns, mapping, warnings };
}

export async function parseRosterFile(file: File | ArrayBuffer, name: string): Promise<ParsedRoster> {
  const data = file instanceof File ? await file.arrayBuffer() : file;
  const wb = XLSX.read(data, { type: "array" });
  const target = wb.SheetNames.includes("명렬표")
    ? "명렬표"
    : wb.SheetNames.includes(name)
      ? name
      : wb.SheetNames[0];
  const sheet = wb.Sheets[target];
  const parsed = parseRosterSheet(sheet);
  if (wb.SheetNames.length > 1) {
    parsed.warnings.unshift(`시트 "${target}" 사용 (전체 ${wb.SheetNames.length}개 중)`);
  }
  return parsed;
}

/** 명렬표 양식(.xlsx) 생성 — 학교에서 바로 채워 쓸 수 있는 템플릿 */
export function buildTemplateWorkbook(electiveKeys: string[] = ["선택과목1", "선택과목2"]): XLSX.WorkBook {
  const header = ["학년", "반", "번호", "성명", ...electiveKeys];
  const aoa: (string | number)[][] = [header];
  for (let i = 1; i <= 30; i++) {
    aoa.push([1, Math.ceil(i / 5) + 0, ((i - 1) % 5) + 1, "", "", ""]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa.slice(0, 1));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "명렬표");
  return wb;
}
