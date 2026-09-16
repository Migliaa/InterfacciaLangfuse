import type { ItemDaRivedere, RigaPreventivo, Verdetto } from "./tipi";

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

async function chiamaApiLangfuse<T>(percorso: string): Promise<T> {
  const { host, publicKey, secretKey } = configurazione();
  const autenticazione = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");

  const risposta = await fetch(`${host}${percorso}`, {
    headers: { Authorization: `Basic ${autenticazione}` },
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

async function trovaProssimaTracciaDaGiudicare(idCoda: string): Promise<string | null> {
  const risposta = await chiamaApiLangfuse<{ data: { objectId: string }[] }>(
    `/api/public/annotation-queues/${idCoda}/items?status=PENDING&limit=1&page=1`
  );
  return risposta.data[0]?.objectId ?? null;
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

/** Combina le chiamate di sola lettura necessarie per mostrare il prossimo item della coda:
 * risolve la coda per nome, prende la traccia in cima (non ancora giudicata dall'umano),
 * ne legge le osservazioni di dominio e, se presente, risolve il riferimento media del
 * documento preventivo in un URL scaricabile. */
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

  const idTraccia = await trovaProssimaTracciaDaGiudicare(idCoda);
  if (!idTraccia) return null;

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
    richiestaCliente: estraiRichiesta(pipeline, idTraccia),
    preventivo,
    messaggioCliente,
    documentoUrl,
    verdettoPreventivo: estraiVerdetto(outputGiudice?.verdetto_preventivo, "verdetto_preventivo", idTraccia),
    verdettoMessaggio: estraiVerdetto(outputGiudice?.verdetto_messaggio, "verdetto_messaggio", idTraccia),
  };
}
