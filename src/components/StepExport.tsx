import { useState } from "react";
import JSZip from "jszip";
import { Archive, FileSpreadsheet, FileText, FileType2, Loader2, Printer } from "lucide-react";
import { useApp } from "../store";
import { saveBinary } from "../lib/platform";
import { buildResultWorkbook, workbookToBytes } from "../lib/export/xlsx";
import { buildSeatMapPdf, buildTimetablePdf, buildAttendancePdf } from "../lib/export/pdf";
import { buildDocx } from "../lib/export/docx";
import { buildHwpx } from "../lib/export/hwpx";

function baseName(title: string): string {
  return (title || "시험").replace(/[\\/:*?"<>|]/g, "_");
}

export default function StepExport() {
  const { exam, students, rooms, assignment, maskNames, setMaskNames, setStep } = useApp();
  const [busy, setBusy] = useState<string | null>(null);

  if (!assignment) {
    return (
      <div className="mx-auto max-w-3xl p-10 text-center text-slate-400">
        먼저 4단계에서 자리 배치를 실행하세요.
        <div className="mt-4">
          <button onClick={() => setStep(4)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            배치 단계로 이동
          </button>
        </div>
      </div>
    );
  }

  const ctx = { exam, students, rooms, assignment, maskNames };
  const base = baseName(exam.title);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      alert(`생성 실패: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(null);
    }
  };

  const cards: {
    key: string;
    icon: React.ReactNode;
    title: string;
    desc: string;
    file: string;
    fn: () => Promise<Uint8Array | Blob>;
    accent: string;
  }[] = [
    {
      key: "seat-pdf",
      icon: <FileType2 size={20} />,
      title: "고사실별 좌석배치도 (PDF)",
      desc: "교탁 기준 도면형 배치도 — 고사실 앞 게시·감독 참고용",
      file: `${base}_좌석배치도.pdf`,
      fn: () => buildSeatMapPdf(ctx),
      accent: "bg-red-50 text-red-600",
    },
    {
      key: "tt-pdf",
      icon: <Printer size={20} />,
      title: "학생별 시험 시간표 (PDF)",
      desc: "선택과목 반영 개인 시간표 카드 — 절취 배포용 12분할",
      file: `${base}_학생별시간표.pdf`,
      fn: () => buildTimetablePdf(ctx),
      accent: "bg-indigo-50 text-indigo-600",
    },
    {
      key: "att-pdf",
      icon: <FileText size={20} />,
      title: "고사실별 출석부 (PDF)",
      desc: "좌석번호순 출석·결시 확인표 — 시험 당일 감독 필수",
      file: `${base}_출석부.pdf`,
      fn: () => buildAttendancePdf(ctx),
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      key: "hwpx",
      icon: <FileText size={20} />,
      title: "한글 문서 (.hwpx)",
      desc: "좌석배치도+출석부+시간표 통합 — 한글 2024 바로 편집 가능",
      file: `${base}_결과물.hwpx`,
      fn: () => buildHwpx(ctx),
      accent: "bg-sky-50 text-sky-600",
    },
    {
      key: "docx",
      icon: <FileText size={20} />,
      title: "워드 문서 (.docx)",
      desc: "동일 내용 MS Word 형식 — Office 2024·한글 호환",
      file: `${base}_결과물.docx`,
      fn: () => buildDocx(ctx),
      accent: "bg-blue-50 text-blue-600",
    },
    {
      key: "xlsx",
      icon: <FileSpreadsheet size={20} />,
      title: "엑셀 통합본 (.xlsx)",
      desc: "종합배정·고사실별 배치도·출석부·시간표 시트",
      file: `${base}_결과물.xlsx`,
      fn: async () => workbookToBytes(buildResultWorkbook(ctx)),
      accent: "bg-green-50 text-green-600",
    },
  ];

  const exportAll = () =>
    run("all", async () => {
      const zip = new JSZip();
      const folder = zip.folder(base)!;
      folder.file(`${base}_좌석배치도.pdf`, await buildSeatMapPdf(ctx));
      folder.file(`${base}_학생별시간표.pdf`, await buildTimetablePdf(ctx));
      folder.file(`${base}_출석부.pdf`, await buildAttendancePdf(ctx));
      folder.file(`${base}_결과물.hwpx`, await buildHwpx(ctx));
      folder.file(`${base}_결과물.docx`, await buildDocx(ctx));
      folder.file(`${base}_결과물.xlsx`, workbookToBytes(buildResultWorkbook(ctx)));
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      await saveBinary(`${base}_출력물.zip`, blob);
    });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="mb-1 text-lg font-bold">5단계 · 문서 출력</h2>
          <p className="text-[13px] text-slate-500">
            모든 문서는 기기 안에서 생성됩니다. 한글·워드·PDF·엑셀 형식을 지원합니다.
          </p>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-[12.5px] font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={maskNames}
            onChange={(e) => setMaskNames(e.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
          이름 마스킹 (게시용: 김○연)
        </label>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {cards.map((c) => (
          <button
            key={c.key}
            disabled={busy !== null}
            onClick={() => run(c.key, async () => { await saveBinary(c.file, await c.fn()); })}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-shadow hover:shadow-md disabled:opacity-50"
          >
            <span className={`rounded-xl p-2.5 ${c.accent}`}>{c.icon}</span>
            <span className="min-w-0">
              <span className="mb-0.5 flex items-center gap-2 text-[14px] font-bold">
                {c.title}
                {busy === c.key && <Loader2 size={14} className="animate-spin text-indigo-500" />}
              </span>
              <span className="block text-[12px] leading-4 text-slate-500">{c.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={exportAll}
        disabled={busy !== null}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {busy === "all" ? <Loader2 size={16} className="animate-spin" /> : <Archive size={16} />}
        전체 문서 한 번에 내려받기 (ZIP)
      </button>

      <p className="mt-3 text-center text-[11.5px] text-slate-400">
        TIP) 게시용 문서는 '이름 마스킹'을 켜고 내보내면 개인정보 보호에 더 안전합니다.
      </p>
    </div>
  );
}
