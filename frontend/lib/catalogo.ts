import fs from "node:fs";
import path from "node:path";

import type { VoceCatalogo } from "./tipi";

const CAMPI_VOCE_CATALOGO = ["voce", "unita", "prezzo_unitario"] as const;

function valida(voce: unknown, indice: number, percorso: string): VoceCatalogo {
  const v = voce as Record<string, unknown> | null;
  const mancanti = CAMPI_VOCE_CATALOGO.filter((campo) => !v || !(campo in v));
  if (mancanti.length > 0) {
    throw new Error(`${percorso}: voce di catalogo #${indice} priva dei campi ${mancanti.join(", ")}`);
  }
  return v as unknown as VoceCatalogo;
}

/** Stesso catalogo usato dalla pipeline Python (backend/data/catalogo.json), esposto in sola
 * lettura: non un dato nuovo, solo la vista di riferimento per il giudice umano. Stessa
 * validazione minima di `dati.py` lato backend, per non propagare voci malformate al rendering. */
export function caricaCatalogo(): VoceCatalogo[] {
  const percorso = path.join(process.cwd(), "..", "backend", "data", "catalogo.json");
  const dati = JSON.parse(fs.readFileSync(percorso, "utf-8"));
  return (dati as unknown[]).map((voce, i) => valida(voce, i, percorso));
}
