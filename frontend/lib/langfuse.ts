import type { GiudizioUmano, ItemDaRivedere, RigaPreventivo, Verdetto } from "./tipi";

const NOME_QUEUE = "revisione-preventivi";
const RIFERIMENTO_MEDIA = /id=([^|]+)/;

function configurazione() {
  const host = process.env.LANGFUSE_HOST;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;
  if (!host || !publicKey || !secretKey) {
    throw new Error(
      "Configurazione Langfuse mancante: impostare LANGFUSE_HOST, LANGFUSE_PUBLIC_KEY e LANGFUSE_SECRET_KEY."
    );
  }
  return { host, publicKey, secretKey };
}

async function chiamaApiLangfuse<T>(
  percorso: string,
  opzioni: { metodo?: string; corpo?: unknown } = {}
): Promise<T> {
  const { host, publicKey, secretKey } = configurazione();
  const autenticazione = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  const risposta = await fetch(`${host}${percorso}`, {
    method: opzioni.metodo ?? "GET",
    headers: {
      Authorization: `Basic ${autenticazione}`,
      ...(opzioni.corpo !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: opzioni.corpo !== undefined ? JSON.stringify(opzioni.corpo) : undefined,
    cache: "no-store",
  });
  if (!risposta.ok) {
    throw new Error(`Chiamata a ${percorso} fallita con stato ${risposta.status}`);
  }
  return (await risposta.json()) as T;
}

/** La coda deve esistere già (creata da `run_pipeline.py` lato backend) — se manca è un problema
 * di configurazione (host/progetto Langfuse sbagliato), non uno stato normale, quindi si segnala
 * con un errore esplicito invece di confonderlo con "nessun item da giudicare". */
async function trovaIdCoda(): Promise<string> {
  const risposta = await chiamaApiLangfuse<{ data: { id: string; name: string }[] }>(
    "/api/public/annotation-queues?limit=100"
  );
  const idCoda = risposta.data.find((coda) => coda.name === NOME_QUEUE)?.id;
  if (!idCoda) {
    throw new Error(
      `Coda '${NOME_QUEUE}' non trovata sul progetto Langfuse configurato: verificare LANGFUSE_HOST/LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY, oppure eseguire prima run_pipeline.py nel backend.`
    );
  }
  return idCoda;
}

async function trovaProssimoItemCoda(
  idCoda: string
): Promise<{ idTraccia: string; idItemCoda: string } | null> {
  const risposta = await chiamaApiLangfuse<{ data: { id: string; objectId: string }[] }>(
    `/api/public/annotation-queues/${idCoda}/items?status=PENDING&limit=1&page=1`
  );
  const item = risposta.data[0];
  return item ? { idTraccia: item.objectId, idItemCoda: item.id } : null;
}

async function caricaItemDaCoda(idCoda: string): Promise<ItemDaRivedere | null> {
  const prossimo = await trovaProssimoItemCoda(idCoda);
  if (!prossimo) return null;
  const { idTraccia, idItemCoda } = prossimo;

  const osservazioni = await caricaOsservazioni(idTraccia);
  const pipeline = osservazioni.find((o) => o.name === "pipeline-preventivo");
  const esecutore = osservazioni.find((o) => o.name === "esecutore");
  const giudiceAutomatico = osservazioni.find((o) => o.name === "giudice-automatico");
  const documento = osservazioni.find((o) => o.name === "documento-preventivo");

  if (!pipeline || !esecutore || !giudiceAutomatico) {
    throw new Error(`Traccia ${idTraccia}: osservazioni attese mancanti`);
  }

  const outputGiudice = giudiceAutomatico.output as {
    verdetto_preventivo?: unknown;
    verdetto_messaggio?: unknown;
  } | null;

  let documentoUrl: string | null = null;
  if (documento) {
    const idDocumento = documento.output as { documento?: unknown } | null;
    if (typeof idDocumento?.documento === "string") {
      const idMedia = idDocumento.documento.match(RIFERIMENTO_MEDIA)?.[1];
      if (idMedia) documentoUrl = await risolviUrlMedia(idMedia);
    }
  }

  const { preventivo, messaggioCliente } = estraiEsecutore(esecutore, idTraccia);

  return {
    idTraccia,
    idItemCoda,
    richiestaCliente: estraiRichiesta(pipeline, idTraccia),
    preventivo,
    messaggioCliente,
    documentoUrl,
    verdettoPreventivo: estraiVerdetto(outputGiudice?.verdetto_preventivo, "verdetto_preventivo", idTraccia),
    verdettoMessaggio: estraiVerdetto(outputGiudice?.verdetto_messaggio, "verdetto_messaggio", idTraccia),
  };
}

/** Il nome di ogni score coincide col nome della sua score config (vedi `SCORE_CONFIGS` lato
 * backend, `backend/giudice_pipeline/langfuse_gateway.py`): risolte per nome in un'unica chiamata
 * invece che una per score, dato che le quattro config esistono già dal primo avvio della
 * pipeline e non cambiano tra un giudizio e l'altro. */
async function caricaMappaScoreConfig(): Promise<Record<string, string>> {
  const risposta = await chiamaApiLangfuse<{ data: { id: string; name: string }[] }>(
    "/api/public/score-configs?limit=100"
  );
  return Object.fromEntries(risposta.data.map((config) => [config.name, config.id]));
}

function idScoreConfig(mappa: Record<string, string>, nome: string): string {
  const id = mappa[nome];
  if (!id) {
    throw new Error(
      `Score config '${nome}' non trovata sul progetto Langfuse configurato: eseguire prima run_pipeline.py nel backend, che la crea al primo avvio.`
    );
  }
  return id;
}

type ScoreDaScrivere = {
  nome: string;
  valore: string | number;
  dataType: "CATEGORICAL" | "BOOLEAN";
  commento?: string;
  metadata?: Record<string, unknown>;
};

/** Un `id` deterministico (traccia + nome score) rende la scrittura idempotente: un retry dopo un
 * fallimento parziale sovrascrive lo score già scritto invece di duplicarlo. */
async function scriviScore(
  idTraccia: string,
  mappaConfig: Record<string, string>,
  score: ScoreDaScrivere
): Promise<void> {
  await chiamaApiLangfuse("/api/public/scores", {
    metodo: "POST",
    corpo: {
      id: `${idTraccia}-${score.nome}`,
      traceId: idTraccia,
      name: score.nome,
      value: score.valore,
      dataType: score.dataType,
      configId: idScoreConfig(mappaConfig, score.nome),
      comment: score.commento || undefined,
      metadata: score.metadata,
      source: "ANNOTATION",
    },
  });
}

/** Scrive i quattro score del giudizio umano (source ANNOTATION, a differenza di quelli
 * automatici scritti dal backend con source API) e marca l'item come completato in coda —
 * altrimenti resterebbe in cima e l'interfaccia mostrerebbe sempre lo stesso item. Il testo del
 * messaggio cliente eventualmente corretto dal giudice viene allegato come metadata allo score
 * 'verdetto_messaggio', altrimenti andrebbe perso: non c'è altro posto dove salvarlo. Restituisce
 * il prossimo item da rivedere (o null se la coda è ormai vuota). */
export async function registraGiudizioUmano(giudizio: GiudizioUmano): Promise<ItemDaRivedere | null> {
  const idCoda = await trovaIdCoda();
  const mappaConfig = await caricaMappaScoreConfig();

  const risultati = await Promise.allSettled([
    scriviScore(giudizio.idTraccia, mappaConfig, {
      nome: "verdetto_preventivo",
      valore: giudizio.esitoPreventivo,
      dataType: "CATEGORICAL",
      commento: giudizio.commentoPreventivo,
    }),
    scriviScore(giudizio.idTraccia, mappaConfig, {
      nome: "accordo_preventivo",
      valore: giudizio.accordoPreventivo ? 1 : 0,
      dataType: "BOOLEAN",
    }),
    scriviScore(giudizio.idTraccia, mappaConfig, {
      nome: "verdetto_messaggio",
      valore: giudizio.esitoMessaggio,
      dataType: "CATEGORICAL",
      commento: giudizio.commentoMessaggio,
      metadata: { messaggio_cliente_corretto: giudizio.messaggioClienteCorretto },
    }),
    scriviScore(giudizio.idTraccia, mappaConfig, {
      nome: "accordo_messaggio",
      valore: giudizio.accordoMessaggio ? 1 : 0,
      dataType: "BOOLEAN",
    }),
  ]);

  const fallito = risultati.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (fallito) {
    throw fallito.reason;
  }

  await chiamaApiLangfuse(`/api/public/annotation-queues/${idCoda}/items/${giudizio.idItemCoda}`, {
    metodo: "PATCH",
    corpo: { status: "COMPLETED" },
  });

  return caricaItemDaCoda(idCoda);
}

type Osservazione = { name: string; input: unknown; output: unknown };

async function caricaOsservazioni(idTraccia: string): Promise<Osservazione[]> {
  const risposta = await chiamaApiLangfuse<{ observations: Osservazione[] }>(
    `/api/public/traces/${idTraccia}`
  );
  return risposta.observations;
}

async function risolviUrlMedia(idMedia: string): Promise<string> {
  const risposta = await chiamaApiLangfuse<{ url: string }>(`/api/public/media/${idMedia}`);
  return risposta.url;
}

function estraiRichiesta(pipeline: Osservazione, idTraccia: string): string {
  const input = pipeline.input as { richiesta?: unknown } | null;
  if (typeof input?.richiesta !== "string") {
    throw new Error(`Traccia ${idTraccia}: 'pipeline-preventivo' priva di input.richiesta`);
  }
  return input.richiesta;
}

function estraiEsecutore(
  esecutore: Osservazione,
  idTraccia: string
): { preventivo: RigaPreventivo[]; messaggioCliente: string } {
  const output = esecutore.output as { preventivo?: unknown; messaggio_cliente?: unknown } | null;
  if (!Array.isArray(output?.preventivo) || typeof output?.messaggio_cliente !== "string") {
    throw new Error(`Traccia ${idTraccia}: 'esecutore' priva di preventivo/messaggio_cliente validi`);
  }
  return { preventivo: output.preventivo as RigaPreventivo[], messaggioCliente: output.messaggio_cliente };
}

function estraiVerdetto(verdetto: unknown, campo: string, idTraccia: string): Verdetto {
  const v = verdetto as { esito?: unknown; testo?: unknown } | null;
  if (typeof v?.esito !== "string" || typeof v?.testo !== "string") {
    throw new Error(`Traccia ${idTraccia}: '${campo}' privo di esito/testo validi`);
  }
  return v as Verdetto;
}

/** Combina le chiamate di sola lettura necessarie per mostrare il prossimo item della coda:
 * risolve la coda per nome, prende la traccia in cima (non ancora giudicata dall'umano),
 * ne legge le osservazioni di dominio e, se presente, risolve il riferimento media del
 * documento preventivo in un URL scaricabile. Restituisce `null` solo per lo stato legittimo
 * "coda vuota, nessun item da giudicare" — una coda mancante o dati malformati sono errori. */
export async function caricaProssimoItemDaRivedere(): Promise<ItemDaRivedere | null> {
  const idCoda = await trovaIdCoda();
  return caricaItemDaCoda(idCoda);
}
