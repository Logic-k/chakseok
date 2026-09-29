import { useMemo, useState } from "react";
import { AlertTriangle, Pin, Play } from "lucide-react";
import { useApp } from "../store";
import { layoutsWithAssignments, adjacencyStats } from "../lib/assign";
import { AssignStrategy, FillOrder, seatKey, studentLabel } from "../lib/types";
import { maskName } from "../lib/format";

const STRATEGIES: { value: AssignStrategy; label: string; desc: string }[] = [
  { value: "sequential", label: "번호순", desc: "학년-반-번호 순으로 차례대로 배치" },
  { value: "interleave", label: "반 섞기", desc: "같은 반이 이웃하지 않도록 반별 분산" },
  { value: "subject-spread", label: "과목 분산", desc: "같은 선택과목 학생이 이웃하지 않도록 분산" },
  { value: "random", label: "무작위", desc: "완전 무작위(난수 시드로 재현 가능)" },
];

export default function StepAssign() {
  const {
    students, rooms, options, setOptions, assignment, runAssign, swapSeats, setStep, maskNames,
  } = useApp();
  const [dragSrc, setDragSrc] = useState<{ roomId: string; row: number; col: number } | null>(null);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const layouts = useMemo(
    () => layoutsWithAssignments(rooms, assignment),
    [rooms, assignment],
  );
  const stats = useMemo(
    () => (assignment ? adjacencyStats(rooms, assignment, students) : null),
    [rooms, assignment, students],
  );

  const pinKey = (roomId: string, r: number, c: number) => `${roomId}:${r}:${c}`;
  const pinnedSeats = new Set(Object.values(options.pinned));
  const pinnedStudents = new Set(Object.keys(options.pinned));

  const togglePin = (roomId: string, r: number, c: number) => {
    const layout = layouts.find((l) => l.room.id === roomId);
    const sid = layout?.cells[r]?.[c]?.studentId;
    if (!sid) return;
    const pinned = { ...options.pinned };
    if (pinned[sid] === pinKey(roomId, r, c)) delete pinned[sid];
    else pinned[sid] = pinKey(roomId, r, c);
    setOptions({ pinned });
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h2 className="mb-1 text-lg font-bold">4단계 · 자리 배치</h2>
      <p className="mb-5 text-[13px] text-slate-500">
        배치 방식을 고르고 실행하세요. 결과는 <b>드래그로 좌석 교환</b>, <b>우클릭으로 학생 고정</b>할 수 있습니다.
      </p>

      {/* 배치 옵션 */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">배치 방식</span>
            <div className="flex gap-1.5">
              {STRATEGIES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setOptions({ strategy: s.value })}
                  title={s.desc}
                  className={`rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors ${
                    options.strategy === s.value
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">채우기 순서</span>
            <select
              value={options.fillOrder}
              onChange={(e) => setOptions({ fillOrder: e.target.value as FillOrder })}
              className="rounded-lg border border-slate-300 px-2 py-2 text-[12px]"
            >
              <option value="column-zigzag">세로 지그재그 (1열→2열↕)</option>
              <option value="column">세로 순차</option>
              <option value="row">가로 순차</option>
              <option value="row-zigzag">가로 지그재그</option>
            </select>
          </div>
          <label className="flex items-center gap-2 pb-2 text-[12px] font-medium text-slate-700">
            <input
              type="checkbox"
              checked={options.avoidSameClassAdjacent}
              onChange={(e) => setOptions({ avoidSameClassAdjacent: e.target.checked })}
              className="h-4 w-4 rounded accent-indigo-600"
            />
            인접 좌석 같은 반/과목 회피
          </label>
          <div>
            <span className="mb-1.5 block text-[12px] font-semibold text-slate-600">난수 시드</span>
            <input
              type="number"
              value={options.seed}
              onChange={(e) => setOptions({ seed: Number(e.target.value) })}
              className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-[12px]"
            />
          </div>
          <button
            onClick={runAssign}
            disabled={!students.length || !rooms.length}
            className="ml-auto flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-indigo-700 disabled:opacity-40"
          >
            <Play size={16} /> 배치 실행
          </button>
        </div>
      </div>

      {/* 경고·통계 */}
      {assignment && (
        <div className="mb-4 space-y-2">
          {assignment.warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] font-medium text-amber-800">
              <AlertTriangle size={15} /> {w}
            </div>
          ))}
          {stats && (
            <div className="flex gap-3 text-[12px]">
              <span className="rounded-lg bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">
                배정 완료 {assignment.placements.length}명
              </span>
              <span className={`rounded-lg px-3 py-1.5 font-semibold ${stats.sameClassPairs ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                인접 동반석 {stats.sameClassPairs}쌍
              </span>
              <span className={`rounded-lg px-3 py-1.5 font-semibold ${stats.sameElectivePairs ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"}`}>
                인접 동일과목 {stats.sameElectivePairs}쌍
              </span>
              {assignment.unassigned.length > 0 && (
                <span className="rounded-lg bg-red-50 px-3 py-1.5 font-semibold text-red-700">
                  미배정 {assignment.unassigned.length}명
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 고사실별 좌석도 */}
      {assignment ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {layouts.map((layout) => (
            <div key={layout.room.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold">{layout.room.name}</h3>
                <span className="text-[11px] text-slate-400">
                  {layout.room.proctor ? `감독 ${layout.room.proctor} · ` : ""}
                  {assignment.placements.filter((p) => p.roomId === layout.room.id).length}명 배정
                </span>
              </div>
              <div className="mb-1 text-center text-[10px] font-semibold tracking-widest text-slate-400">
                ◀ 교탁 ▶
              </div>
              <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${layout.room.cols}, minmax(0,1fr))` }}>
                {layout.cells.flat().map((cell) => {
                  const s = cell.studentId ? byId.get(cell.studentId) : null;
                  const pinned = s && pinnedStudents.has(s.id) && pinnedSeats.has(pinKey(layout.room.id, cell.row, cell.col));
                  if (cell.disabled)
                    return (
                      <div key={seatKey(cell.row, cell.col)} className="flex h-14 items-center justify-center rounded-lg bg-slate-100 text-[10px] text-slate-400">
                        미사용
                      </div>
                    );
                  return (
                    <div
                      key={seatKey(cell.row, cell.col)}
                      draggable={!!s}
                      onDragStart={() => s && setDragSrc({ roomId: layout.room.id, row: cell.row, col: cell.col })}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragSrc) swapSeats(dragSrc, { roomId: layout.room.id, row: cell.row, col: cell.col });
                        setDragSrc(null);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (s) togglePin(layout.room.id, cell.row, cell.col);
                      }}
                      title={s ? `${s.name} ${studentLabel(s)} — 드래그: 자리 교환 / 우클릭: 고정` : "빈 좌석 — 학생을 끌어다 놓으세요"}
                      className={`relative flex h-14 cursor-${s ? "grab" : "default"} flex-col items-center justify-center rounded-lg border text-center leading-tight transition-colors ${
                        s
                          ? pinned
                            ? "border-amber-400 bg-amber-50"
                            : "border-indigo-300 bg-indigo-50 hover:border-indigo-500"
                          : "border-dashed border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/40"
                      }`}
                    >
                      {pinned && <Pin size={10} className="absolute right-1 top-1 text-amber-500" />}
                      {s ? (
                        <>
                          <span className="px-1 text-[11.5px] font-bold">{maskNames ? maskName(s.name) : s.name}</span>
                          <span className="text-[9.5px] font-medium text-slate-500">{studentLabel(s)}</span>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-300">빈좌석</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white/60 p-14 text-center text-slate-400">
          배치 실행 버튼을 누르면 고사실별 좌석도가 여기에 표시됩니다
        </div>
      )}

      <div className="mt-5 flex justify-between">
        <button onClick={() => setStep(3)} className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
          ← 고사실
        </button>
        <button
          onClick={() => setStep(5)}
          disabled={!assignment}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          다음: 출력 →
        </button>
      </div>
    </div>
  );
}
