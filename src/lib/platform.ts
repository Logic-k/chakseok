/** Tauri(데스크톱)와 브라우저(개발/테스트) 양쪽에서 동작하는 파일 저장/열기 추상화 */

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

/** 바이너리 저장 — Tauri: 네이티브 저장 대화상자, 브라우저: 다운로드 */
export async function saveBinary(filename: string, data: Uint8Array | Blob): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const ext = filename.split(".").pop() ?? "";
    const path = await save({
      defaultPath: filename,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    });
    if (!path) return false;
    const bytes = data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : data;
    await writeFile(path, bytes);
    return true;
  }
  const blob = data instanceof Blob ? data : new Blob([data as BlobPart]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

/** 텍스트 파일 저장 */
export async function saveText(filename: string, text: string): Promise<boolean> {
  return saveBinary(filename, new TextEncoder().encode(text));
}

/** 파일 열기 — Tauri: 네이티브 대화상자, 브라우저: input[file] */
export async function openFile(
  accept: string,
): Promise<{ name: string; data: ArrayBuffer } | null> {
  if (isTauri()) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const { readFile } = await import("@tauri-apps/plugin-fs");
    const exts = accept.replace(/\./g, "").split(",");
    const path = await open({
      multiple: false,
      filters: [{ name: "지원 파일", extensions: exts }],
    });
    if (!path || typeof path !== "string") return null;
    const data = await readFile(path);
    return { name: path.split(/[\\/]/).pop() ?? "file", data: data.buffer as ArrayBuffer };
  }
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      resolve({ name: f.name, data: await f.arrayBuffer() });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
