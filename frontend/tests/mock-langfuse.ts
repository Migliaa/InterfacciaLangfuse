import { vi } from "vitest";

export const HOST = "https://langfuse.test";

/** Mocka `global.fetch` con una mappa percorso → corpo JSON, per non fare chiamate reali a
 * Langfuse nei test. Condiviso tra i test di `lib/langfuse.ts` e quelli del componente. */
export function mockaFetchLangfuse(risposte: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const percorso = url.replace(HOST, "");
      const corpo = risposte[percorso];
      if (corpo === undefined) throw new Error(`URL non mockato nel test: ${url}`);
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(corpo),
      } as Response);
    })
  );
}
