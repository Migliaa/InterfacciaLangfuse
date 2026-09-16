export type RigaPreventivo = {
  voce: string;
  quantita: number;
  prezzo_unitario: number;
  totale: number;
};

export type Verdetto = {
  esito: "si" | "da_rivedere" | "no";
  testo: string;
};

export type ItemDaRivedere = {
  idTraccia: string;
  idItemCoda: string;
  richiestaCliente: string;
  preventivo: RigaPreventivo[];
  messaggioCliente: string;
  documentoUrl: string | null;
  verdettoPreventivo: Verdetto;
  verdettoMessaggio: Verdetto;
};

export type VoceCatalogo = {
  voce: string;
  unita: string;
  prezzo_unitario: number;
};

export type GiudizioUmano = {
  idTraccia: string;
  idItemCoda: string;
  esitoPreventivo: Verdetto["esito"];
  commentoPreventivo: string;
  accordoPreventivo: boolean;
  esitoMessaggio: Verdetto["esito"];
  commentoMessaggio: string;
  accordoMessaggio: boolean;
  messaggioClienteCorretto: string;
};
