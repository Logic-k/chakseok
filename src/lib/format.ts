/** 출력용 표시 헬퍼 */

/** 게시용 이름 마스킹: 가운데 글자 ○ 처리 ("김가연(03)" → "김○연(03)", "홍길동" → "홍○동") */
export function maskName(name: string): string {
  const paren = name.match(/^(.*?)(\([^)]*\))?$/);
  const base = paren?.[1] ?? name;
  const suffix = paren?.[2] ?? "";
  if (base.length <= 1) return name;
  if (base.length === 2) return base[0] + "○" + suffix;
  return base[0] + "○".repeat(base.length - 2) + base[base.length - 1] + suffix;
}
