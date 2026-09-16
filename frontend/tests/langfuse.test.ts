import { beforeEach, describe, expect, it, vi } from "vitest";

import { caricaProssimoItemDaRivedere, registraGiudizioUmano } from "../lib/langfuse";
import { HOST, mockaFetchLangfuse as mockaFetch } from "./mock-langfuse";

describe("caricaProssimoItemDaRivedere", () => {
  beforeEach(() => {
    process.env.LANGFUSE_HOST = HOST;
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
  });

  it("solleva un errore (non 'nessun item') se la coda 'revisione-preventivi' non esiste", async () => {
    mockaFetch({ "/api/public/annotation-queues?limit=100": { data: [] } });

    await expect(caricaProssimoItemDaRivedere()).rejects.toThrow(/Coda 'revisione-preventivi' non trovata/);
  });

  it("restituisce null se non ci sono item non ancora giudicati", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=1&page=1": { data: [] },
    });

    expect(await caricaProssimoItemDaRivedere()).toBeNull();
  });

  it("restituisce documentoUrl nullo se la traccia non ha ancora l'osservazione del documento", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=1&page=1": {
        data: [{ id: "item-1", objectId: "trace-1" }],
      },
      "/api/public/traces/trace-1": {
        observations: [
          { name: "pipeline-preventivo", input: { richiesta: "Richiesta di prova" }, output: {} },
          {
            name: "esecutore",
            input: {},
            output: { preventivo: [], messaggio_cliente: "Testo" },
          },
          {
            name: "giudice-automatico",
            input: {},
            output: {
              verdetto_preventivo: { esito: "si", testo: "ok" },
              verdetto_messaggio: { esito: "si", testo: "ok" },
            },
          },
        ],
      },
    });

    const item = await caricaProssimoItemDaRivedere();
    expect(item?.documentoUrl).toBeNull();
  });

  it("restituisce documentoUrl nullo (non un crash) se l'osservazione del documento esiste ma è ancora vuota", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=1&page=1": {
        data: [{ id: "item-1", objectId: "trace-1" }],
      },
      "/api/public/traces/trace-1": {
        observations: [
          { name: "pipeline-preventivo", input: { richiesta: "Richiesta di prova" }, output: {} },
          {
            name: "esecutore",
            input: {},
            output: { preventivo: [], messaggio_cliente: "Testo" },
          },
          {
            name: "giudice-automatico",
            input: {},
            output: {
              verdetto_preventivo: { esito: "si", testo: "ok" },
              verdetto_messaggio: { esito: "si", testo: "ok" },
            },
          },
          { name: "documento-preventivo", input: {}, output: {} },
        ],
      },
    });

    const item = await caricaProssimoItemDaRivedere();
    expect(item?.documentoUrl).toBeNull();
  });

  it("solleva un errore se il verdetto del giudice automatico è malformato", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=1&page=1": {
        data: [{ id: "item-1", objectId: "trace-1" }],
      },
      "/api/public/traces/trace-1": {
        observations: [
          { name: "pipeline-preventivo", input: { richiesta: "Richiesta di prova" }, output: {} },
          { name: "esecutore", input: {}, output: { preventivo: [], messaggio_cliente: "Testo" } },
          { name: "giudice-automatico", input: {}, output: { verdetto_preventivo: {}, verdetto_messaggio: {} } },
        ],
      },
    });

    await expect(caricaProssimoItemDaRivedere()).rejects.toThrow(/verdetto_preventivo/);
  });

  it("solleva un errore se mancano le osservazioni di dominio attese sulla traccia", async () => {
    mockaFetch({
      "/api/public/annotation-queues?limit=100": {
        data: [{ id: "queue-1", name: "revisione-preventivi" }],
      },
      "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=1&page=1": {
        data: [{ id: "item-1", objectId: "trace-1" }],
      },
      "/api/public/traces/trace-1": { observations: [] },
    });

    await expect(caricaProssimoItemDaRivedere()).rejects.toThrow(/osservazioni attese mancanti/);
  });
});

describe("registraGiudizioUmano", () => {
  beforeEach(() => {
    process.env.LANGFUSE_HOST = HOST;
    process.env.LANGFUSE_PUBLIC_KEY = "pk-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-test";
  });

  const RISPOSTE_BASE = {
    "/api/public/annotation-queues?limit=100": {
      data: [{ id: "queue-1", name: "revisione-preventivi" }],
    },
    "/api/public/score-configs?limit=100": {
      data: [
        { id: "config-verdetto-preventivo", name: "verdetto_preventivo" },
        { id: "config-accordo-preventivo", name: "accordo_preventivo" },
        { id: "config-verdetto-messaggio", name: "verdetto_messaggio" },
        { id: "config-accordo-messaggio", name: "accordo_messaggio" },
      ],
    },
    "POST /api/public/scores": { id: "score-x" },
    "PATCH /api/public/annotation-queues/queue-1/items/item-1": {},
    "/api/public/annotation-queues/queue-1/items?status=PENDING&limit=1&page=1": { data: [] },
  };

  it("scrive i quattro score con source ANNOTATION e configId corretto, poi marca l'item completato", async () => {
    const fetchMock = mockaFetch(RISPOSTE_BASE);

    const risultato = await registraGiudizioUmano({
      idTraccia: "trace-1",
      idItemCoda: "item-1",
      esitoPreventivo: "da_rivedere",
      commentoPreventivo: "Manca una voce",
      accordoPreventivo: false,
      esitoMessaggio: "si",
      commentoMessaggio: "",
      accordoMessaggio: true,
      messaggioClienteCorretto: "Testo corretto",
    });

    expect(risultato).toBeNull();

    const chiamateScoreConfigs = fetchMock.mock.calls.filter(([url]) =>
      (url as string).endsWith("/api/public/score-configs?limit=100")
    );
    expect(chiamateScoreConfigs).toHaveLength(1);

    const chiamateScore = fetchMock.mock.calls
      .filter(([url]) => (url as string).endsWith("/api/public/scores"))
      .map(([, init]) => JSON.parse((init as RequestInit).body as string));

    expect(chiamateScore).toHaveLength(4);
    expect(chiamateScore).toContainEqual({
      id: "trace-1-verdetto_preventivo",
      traceId: "trace-1",
      name: "verdetto_preventivo",
      value: "da_rivedere",
      dataType: "CATEGORICAL",
      configId: "config-verdetto-preventivo",
      comment: "Manca una voce",
      metadata: undefined,
      source: "ANNOTATION",
    });
    expect(chiamateScore).toContainEqual({
      id: "trace-1-accordo_preventivo",
      traceId: "trace-1",
      name: "accordo_preventivo",
      value: 0,
      dataType: "BOOLEAN",
      configId: "config-accordo-preventivo",
      comment: undefined,
      metadata: undefined,
      source: "ANNOTATION",
    });
    expect(chiamateScore).toContainEqual({
      id: "trace-1-verdetto_messaggio",
      traceId: "trace-1",
      name: "verdetto_messaggio",
      value: "si",
      dataType: "CATEGORICAL",
      configId: "config-verdetto-messaggio",
      comment: undefined,
      metadata: { messaggio_cliente_corretto: "Testo corretto" },
      source: "ANNOTATION",
    });
    expect(chiamateScore).toContainEqual({
      id: "trace-1-accordo_messaggio",
      traceId: "trace-1",
      name: "accordo_messaggio",
      value: 1,
      dataType: "BOOLEAN",
      configId: "config-accordo-messaggio",
      comment: undefined,
      metadata: undefined,
      source: "ANNOTATION",
    });

    const chiamataPatch = fetchMock.mock.calls.find(([url]) =>
      (url as string).endsWith("/api/public/annotation-queues/queue-1/items/item-1")
    );
    expect(chiamataPatch?.[1]).toMatchObject({ method: "PATCH" });
    expect(JSON.parse((chiamataPatch?.[1] as RequestInit).body as string)).toEqual({ status: "COMPLETED" });
  });

  it("se una delle quattro scritture di score fallisce, non marca l'item come completato", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      const percorso = (url as string).replace(HOST, "");
      const metodo = init?.method ?? "GET";
      if (metodo === "POST" && percorso === "/api/public/scores") {
        const corpo = JSON.parse(init!.body as string);
        if (corpo.name === "accordo_messaggio") {
          return Promise.resolve({ ok: false, status: 500 } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ id: "score-x" }) } as Response);
      }
      const corpo = (RISPOSTE_BASE as Record<string, unknown>)[percorso];
      if (corpo === undefined) throw new Error(`URL non mockato nel test: ${metodo} ${url}`);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(corpo) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      registraGiudizioUmano({
        idTraccia: "trace-1",
        idItemCoda: "item-1",
        esitoPreventivo: "si",
        commentoPreventivo: "",
        accordoPreventivo: true,
        esitoMessaggio: "si",
        commentoMessaggio: "",
        accordoMessaggio: true,
        messaggioClienteCorretto: "Testo",
      })
    ).rejects.toBeDefined();

    const chiamataPatch = fetchMock.mock.calls.find(([url]: [string, RequestInit?]) =>
      url.endsWith("/api/public/annotation-queues/queue-1/items/item-1")
    );
    expect(chiamataPatch).toBeUndefined();
  });
});

