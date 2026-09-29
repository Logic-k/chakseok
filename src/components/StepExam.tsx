import { Plus, Trash2 } from "lucide-react";
import { useApp } from "../store";
import { PeriodConfig } from "../lib/types";

export default function StepExam() {
  const { exam, setExam, electiveColumns, setStep } = useApp();

  const update = (patch: Partial<typeof exam>) => setExam({ ...exam, ...patch });
  const updatePeriod = (id: string, patch: Partial<PeriodConfig>) =>
    update({ periods: exam.periods.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  const addPeriod = () =>
    update({
      periods: [
        ...exam.periods,
        {
          id: `p${Date.now()}`,
          order: exam.periods.length + 1,
          label: `${exam.periods.length + 1}교시`,
          time: "",
          kind: "common",
          subject: "",
        },
      ],
    });
  const removePeriod = (id: string) =>
    update({ periods: exam.periods.filter((p) => p.id !== id).map((p, i) => ({ ...p, order: i + 1 })) });

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h2 className="mb-1 text-lg font-bold">2단계 · 시험 정보와 교시 설정</h2>
      <p className="mb-5 text-[13px] text-slate-500">
        시험 이름·날짜와 교시별 과목을 설정합니다. 선택과목 교시는 학생 명렬표의 과목 열과 연결됩니다.
      </p>

      <div className="mb-4 grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <label className="text-[12px]">
          <span className="mb-1 block font-semibold text-slate-600">시험명</span>
          <input
            value={exam.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="예: 2026학년도 1학기 중간고사"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-[12px]">
          <span className="mb-1 block font-semibold text-slate-600">시험일</span>
          <input
            type="date"
            value={exam.date}
            onChange={(e) => update({ date: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-bold">교시 구성 ({exam.periods.length}개)</h3>
          <button
            onClick={addPeriod}
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-indigo-700"
          >
            <Plus size={14} /> 교시 추가
          </button>
        </div>
        {exam.periods.length === 0 ? (
          <div className="p-6 text-center">
            <p className="mb-3 text-[13px] text-slate-400">
              교시를 추가하세요 — 예: 1교시 국어(공통), 2교시 선택과목
            </p>
            <button
              onClick={() =>
                update({
                  title: exam.title || "2026학년도 1학기 중간고사",
                  date: exam.date || "2026-04-28",
                  periods: [
                    { id: "p1", order: 1, label: "1교시", time: "09:00~10:00", kind: "common", subject: "국어" },
                    { id: "p2", order: 2, label: "2교시", time: "10:20~11:20", kind: "elective", electiveKey: electiveColumns[0]?.key ?? "" },
                    { id: "p3", order: 3, label: "3교시", time: "11:40~12:40", kind: "common", subject: "영어" },
                  ],
                })
              }
              className="rounded-lg bg-slate-100 px-4 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-200"
            >
              예시 구성 불러오기 (국어·선택과목·영어)
            </button>
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {["교시", "시간대", "과목 유형", "과목", ""].map((h) => (
                  <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exam.periods.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">
                    <input
                      value={p.label}
                      onChange={(e) => updatePeriod(p.id, { label: e.target.value })}
                      className="w-20 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      value={p.time}
                      onChange={(e) => updatePeriod(p.id, { time: e.target.value })}
                      placeholder="09:00~10:00"
                      className="w-32 rounded border border-slate-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={p.kind}
                      onChange={(e) => updatePeriod(p.id, { kind: e.target.value as "common" | "elective" })}
                      className="rounded border border-slate-300 px-2 py-1"
                    >
                      <option value="common">공통 과목</option>
                      <option value="elective">선택과목 (학생별)</option>
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    {p.kind === "common" ? (
                      <input
                        value={p.subject ?? ""}
                        onChange={(e) => updatePeriod(p.id, { subject: e.target.value })}
                        placeholder="예: 국어"
                        className="w-40 rounded border border-slate-300 px-2 py-1"
                      />
                    ) : (
                      <select
                        value={p.electiveKey ?? ""}
                        onChange={(e) => updatePeriod(p.id, { electiveKey: e.target.value })}
                        className="rounded border border-slate-300 px-2 py-1"
                      >
                        <option value="">— 과목 열 선택 —</option>
                        {electiveColumns.map((c) => (
                          <option key={c.key} value={c.key}>{c.key}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => removePeriod(p.id)} className="text-slate-300 hover:text-red-500">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-5 flex justify-between">
        <button onClick={() => setStep(1)} className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
          ← 명렬표
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!exam.title || exam.periods.length === 0}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          다음: 고사실 설정 →
        </button>
      </div>
    </div>
  );
}
