import { Plus, Trash2 } from "lucide-react";
import { useApp } from "../store";
import { RoomConfig, seatKey } from "../lib/types";

export default function StepRooms() {
  const { rooms, setRooms, students, setStep } = useApp();

  const update = (id: string, patch: Partial<RoomConfig>) =>
    setRooms(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRoom = () =>
    setRooms([
      ...rooms,
      { id: `r${Date.now()}`, name: `${rooms.length + 1}고사실`, rows: 5, cols: 6, disabledSeats: [] },
    ]);
  const removeRoom = (id: string) => setRooms(rooms.filter((r) => r.id !== id));
  const toggleSeat = (room: RoomConfig, r: number, c: number) => {
    const k = seatKey(r, c);
    const has = room.disabledSeats.includes(k);
    update(room.id, {
      disabledSeats: has ? room.disabledSeats.filter((x) => x !== k) : [...room.disabledSeats, k],
    });
  };

  const capacity = rooms.reduce((sum, r) => sum + r.rows * r.cols - r.disabledSeats.length, 0);
  const active = students.filter((s) => !s.absent).length;

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h2 className="mb-1 text-lg font-bold">3단계 · 고사실 구성</h2>
          <p className="text-[13px] text-slate-500">
            고사실별 행×열 크기와 사용 불가 좌석(사물함·기둥 자리 등)을 설정합니다.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-right text-[12px]">
          <div>
            응시 <b className="text-indigo-700">{active}명</b> / 좌석{" "}
            <b className={capacity >= active ? "text-emerald-600" : "text-red-600"}>{capacity}석</b>
          </div>
          {capacity < active && <div className="font-semibold text-red-600">좌석이 {active - capacity}석 부족합니다</div>}
        </div>
      </div>

      <button
        onClick={addRoom}
        className="mb-4 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700"
      >
        <Plus size={15} /> 고사실 추가
      </button>

      <div className="grid gap-4 md:grid-cols-2">
        {rooms.map((room) => (
          <div key={room.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <input
                value={room.name}
                onChange={(e) => update(room.id, { name: e.target.value })}
                className="w-32 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold"
              />
              <label className="flex items-center gap-1 text-[12px] text-slate-500">
                행
                <input
                  type="number" min={1} max={10} value={room.rows}
                  onChange={(e) => update(room.id, { rows: Math.max(1, Number(e.target.value)) })}
                  className="w-14 rounded border border-slate-300 px-1.5 py-1"
                />
              </label>
              <label className="flex items-center gap-1 text-[12px] text-slate-500">
                열
                <input
                  type="number" min={1} max={10} value={room.cols}
                  onChange={(e) => update(room.id, { cols: Math.max(1, Number(e.target.value)) })}
                  className="w-14 rounded border border-slate-300 px-1.5 py-1"
                />
              </label>
              <input
                value={room.proctor ?? ""}
                onChange={(e) => update(room.id, { proctor: e.target.value })}
                placeholder="감독 교사"
                className="w-24 rounded border border-slate-300 px-2 py-1 text-[12px]"
              />
              <button onClick={() => removeRoom(room.id)} className="ml-auto text-slate-300 hover:text-red-500">
                <Trash2 size={15} />
              </button>
            </div>
            <div className="mb-1 text-center text-[10px] font-semibold tracking-widest text-slate-400">◀ 교탁 ▶</div>
            <div
              className="grid gap-1"
              style={{ gridTemplateColumns: `repeat(${room.cols}, minmax(0,1fr))` }}
            >
              {Array.from({ length: room.rows * room.cols }).map((_, i) => {
                const r = Math.floor(i / room.cols);
                const c = i % room.cols;
                const disabled = room.disabledSeats.includes(seatKey(r, c));
                return (
                  <button
                    key={i}
                    onClick={() => toggleSeat(room, r, c)}
                    title={disabled ? "사용 불가 좌석 — 클릭 시 복구" : "클릭 시 사용 불가로 전환"}
                    className={`h-8 rounded text-[10px] font-semibold transition-colors ${
                      disabled
                        ? "bg-slate-200 text-slate-400 line-through"
                        : "border border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50"
                    }`}
                  >
                    {disabled ? "X" : `${r + 1}-${c + 1}`}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              좌석 클릭 → 사용 불가 전환 (사물함·비어있는 자리)
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-between">
        <button onClick={() => setStep(2)} className="rounded-lg border border-slate-300 px-4 py-2 text-[13px] font-semibold text-slate-600 hover:bg-slate-50">
          ← 시험·과목
        </button>
        <button
          onClick={() => setStep(4)}
          disabled={rooms.length === 0}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-[13px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
        >
          다음: 배치 실행 →
        </button>
      </div>
    </div>
  );
}
