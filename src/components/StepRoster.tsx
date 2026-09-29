import { useState } from "react";
import * as XLSX from "xlsx";
import { FileUp, Sparkles, Table2, Trash2, Download } from "lucide-react";
import { useApp } from "../store";
import { parseRosterFile, buildTemplateWorkbook } from "../lib/excel";
import { generateSampleStudents } from "../lib/sample";
import { openFile, saveBinary } from "../lib/platform";
import { studentLabel } from "../lib/types";

export default function StepRoster() {
  const { students, electiveColumns, importWarnings, setRoster, setStudents, setStep } = useApp();
  const [dragging, setDragging] = useState(false);
  const [sampleOpts, setSampleOpts] = useState({ classes: 4, perClass: 25 });

  const importFile = async (name: string, data: ArrayBuffer) => {
    const parsed = await parseRosterFile(data, name);
    setRoster(parsed.students, parsed.electiveColumns, parsed.warnings);
  };

  const pickFile = async () => {
    const f = await openFile(".xlsx,.xls,.csv");
    if (f) await importFile(f.name, f.data);
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) await importFile(f.name, await f.arrayBuffer());
  };

  const fillSample = () => {
    const s = generateSampleStudents(
      [{ grade: 1, classes: sampleOpts.classes, perClass: sampleOpts.perClass }],
      42,
    );
    setRoster(s, [{ key: "선택과목", options: ["확률과통계", "미적분", "기하"] }], [
      "시연용 가상 명단입니다. 실제 명단은 엑셀/CSV로 가져오세요.",
    ]);
  };

  const downloadTemplate = async () => {
    const wb = buildTemplateWorkbook();
    const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
    await saveBinary("명렬표_양식.xlsx", bytes);
  };

  const removeStudent = (id: string) => setStudents(students.filter((s) => s.id !== id));

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="mb-1 text-lg font-bold">1단계 · 학생 명렬표 준비</h2>
      <p className="mb-5 text-[13px] text-slate-500">
        엑셀/CSV 명렬표를 가져오세요. <b>학년·반·번호·성명</b> 열은 자동 인식하고, 그 외 열(예: 선택과목)은
        교시별 과목 배정에 사용됩니다.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {/* 파일 가져오기 */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            dragging ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white"
          }`}
        >
          <FileUp className="mb-2 text-slate-400" size={28} />
          <p className="mb-1 text-sm font-semibold">엑셀/CSV 파일을 끌어다 놓거나</p>
          <button
            onClick={pickFile}
            className="mt-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            파일 선택 (.xlsx .csv)
          </button>
          <button onClick={downloadTemplate} className="mt-3 flex items-center gap-1 text-[12px] text-indigo-600 hover:underline">
            <Download size={12} /> 명렬표 양식 다운로드
          </button>
        </div>

        {/* 샘플 생성 */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="text-sm font-bold">시연용 가상 명단 생성</h3>
          </div>
          <p className="mb-4 text-[12px] leading-5 text-slate-500">
            개인정보 없이 프로그램을 바로 체험할 수 있는 가상 데이터입니다. (가명 표기)
          </p>
          <div className="mb-4 flex items-end gap-3">
            <label className="text-[12px]">
              <span className="mb-1 block text-slate-500">반 수</span>
              <input
                type="number" min={1} max={15} value={sampleOpts.classes}
                onChange={(e) => setSampleOpts({ ...sampleOpts, classes: Number(e.target.value) })}
                className="w-20 rounded-lg border border-slate-300 px-2 py-1.5"
              />
            </label>
            <label className="text-[12px]">
              <span className="mb-1 block text-slate-500">반당 인원</span>
              <input
                type="number" min={5} max={40} value={sampleOpts.perClass}
                onChange={(e) => setSampleOpts({ ...sampleOpts, perClass: Number(e.target.value) })}
                className="w-20 rounded-lg border border-slate-300 px-2 py-1.5"
              />
            </label>
            <button
              onClick={fillSample}
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
            >
              생성
            </button>
          </div>
          {electiveColumns.length > 0 && (
            <div className="rounded-lg bg-slate-50 p-3 text-[12px] text-slate-600">
              <b>선택과목 열:</b>{" "}
              {electiveColumns.map((c) => `${c.key} (${c.options.length}가지)`).join(", ")}
            </div>
          )}
        </div>
      </div>

      {importWarnings.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12px] text-amber-800">
          {importWarnings.map((w, i) => (
            <div key={i}>· {w}</div>
          ))}
        </div>
      )}

      {students.length > 0 && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Table2 size={16} className="text-indigo-600" /> 명렬표 미리보기
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                {students.length}명
              </span>
            </div>
            <button
              onClick={() => setStep(2)}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-indigo-700"
            >
              다음: 시험·과목 설정 →
            </button>
          </div>
          <div className="max-h-[380px] overflow-auto">
            <table className="w-full text-[12.5px]">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  {["학번", "성명", ...electiveColumns.map((c) => c.key), ""].map((h) => (
                    <th key={h} className="px-4 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-4 py-1.5 font-mono text-slate-600">{studentLabel(s)}</td>
                    <td className="px-4 py-1.5 font-semibold">{s.name}</td>
                    {electiveColumns.map((c) => (
                      <td key={c.key} className="px-4 py-1.5 text-slate-600">{s.electives[c.key] ?? "-"}</td>
                    ))}
                    <td className="px-2 py-1.5 text-right">
                      <button onClick={() => removeStudent(s.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
