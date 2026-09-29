import { CalendarCheck, ClipboardList, DoorOpen, Download, Printer, RotateCcw, Save, Upload, Users } from "lucide-react";
import { useApp } from "./store";
import { openFile, saveText } from "./lib/platform";
import { Project } from "./lib/types";
import StepRoster from "./components/StepRoster";
import StepExam from "./components/StepExam";
import StepRooms from "./components/StepRooms";
import StepAssign from "./components/StepAssign";
import StepExport from "./components/StepExport";

const STEPS = [
  { n: 1, label: "명렬표", icon: Users },
  { n: 2, label: "시험·과목", icon: ClipboardList },
  { n: 3, label: "고사실", icon: DoorOpen },
  { n: 4, label: "배치", icon: CalendarCheck },
  { n: 5, label: "출력", icon: Printer },
] as const;

export default function App() {
  const { step, setStep, toProject, loadProject, reset } = useApp();

  const saveProject = async () => {
    await saveText("착석_프로젝트.chakseok.json", JSON.stringify(toProject(), null, 2));
  };
  const openProject = async () => {
    const f = await openFile(".json");
    if (!f) return;
    try {
      const p = JSON.parse(new TextDecoder().decode(f.data)) as Project;
      if (p.version !== 1) throw new Error("버전 불일치");
      loadProject(p);
    } catch {
      alert("프로젝트 파일을 읽지 못했습니다.");
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-lg font-extrabold text-white">
            착
          </div>
          <div>
            <h1 className="text-[15px] font-bold leading-tight">착석 CHAKSEOK</h1>
            <p className="text-[11px] text-slate-500">고사실 자리배치·시험시간표 자동 생성</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openProject}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Upload size={14} /> 프로젝트 열기
          </button>
          <button
            onClick={saveProject}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <Save size={14} /> 프로젝트 저장
          </button>
          <button
            onClick={() => {
              if (confirm("모든 데이터를 초기화할까요?")) reset();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <RotateCcw size={14} /> 초기화
          </button>
        </div>
      </header>

      {/* 단계 표시줄 */}
      <nav className="flex items-center gap-1 border-b border-slate-200 bg-white px-5">
        {STEPS.map(({ n, label, icon: Icon }, i) => (
          <div key={n} className="flex items-center">
            <button
              onClick={() => setStep(n as 1 | 2 | 3 | 4 | 5)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                step === n
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={15} />
              {n}. {label}
            </button>
            {i < STEPS.length - 1 && <span className="text-slate-300">›</span>}
          </div>
        ))}
        <div className="ml-auto pb-0.5">
          <a
            className="flex items-center gap-1 text-[11px] text-slate-400"
            title="이 프로그램은 완전 오프라인으로 동작하며 어떤 데이터도 외부로 전송하지 않습니다"
          >
            <Download size={12} className="rotate-180" /> 100% 오프라인 · 개인정보 외부전송 없음
          </a>
        </div>
      </nav>

      <main className="min-h-0 flex-1 overflow-auto">
        {step === 1 && <StepRoster />}
        {step === 2 && <StepExam />}
        {step === 3 && <StepRooms />}
        {step === 4 && <StepAssign />}
        {step === 5 && <StepExport />}
      </main>
    </div>
  );
}
