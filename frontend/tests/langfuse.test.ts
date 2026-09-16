import { beforeEach, describe, expect, it } from "vitest";

import { caricaProssimoItemDaRivedere } from "../lib/langfuse";
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
        data: [{ objectId: "trace-1" }],
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
        data: [{ objectId: "trace-1" }],
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
        data: [{ objectId: "trace-1" }],
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
        data: [{ objectId: "trace-1" }],
      },
      "/api/public/traces/trace-1": { observations: [] },
    });

    await expect(caricaProssimoItemDaRivedere()).rejects.toThrow(/osservazioni attese mancanti/);
  });
});
