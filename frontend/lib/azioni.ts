"use server";

import { registraGiudizioUmano as registraGiudizioUmanoInterno } from "./langfuse";
import type { GiudizioUmano, ItemDaRivedere } from "./tipi";

export async function registraGiudizioUmano(giudizio: GiudizioUmano): Promise<ItemDaRivedere | null> {
  return registraGiudizioUmanoInterno(giudizio);
}
