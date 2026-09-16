import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ItemDaRivedereView } from "../components/ItemDaRivedereView";
import type { ItemDaRivedere } from "../lib/tipi";

const ITEM: ItemDaRivedere = {
  idTraccia: "trace-1",
  idItemCoda: "item-1",
  richiestaCliente: "Vorrei tinteggiare 80 mq",
  preventivo: [{ voce: "Pittura lavabile bianca", quantita: 80, prezzo_unitario: 12, totale: 960 }],
  messaggioCliente: "Buongiorno, in allegato il preventivo.",
  documentoUrl: null,
  verdettoPreventivo: { esito: "si", testo: "Coerente col catalogo." },
  verdettoMessaggio: { esito: "da_rivedere", testo: "Tono troppo informale." },
};

const ITEM_SUCCESSIVO: ItemDaRivedere = {
  ...ITEM,
  idTraccia: "trace-2",
  idItemCoda: "item-2",
  richiestaCliente: "Vorrei imbiancare una stanza",
};

function completaTuttiIGiudizi() {
  const gruppoPreventivo = screen.getByRole("group", { name: "Giudizio preventivo" });
  fireEvent.click(within(gruppoPreventivo).getByRole("button", { name: "Sì" }));

  const gruppoAccordoPreventivo = screen.getByRole("group", {
    name: "D'accordo col giudice automatico sul preventivo?",
  });
  fireEvent.click(within(gruppoAccordoPreventivo).getByRole("button", { name: "Sì" }));

  const gruppoMessaggio = screen.getByRole("group", { name: "Giudizio messaggio" });
  fireEvent.click(within(gruppoMessaggio).getByRole("button", { name: "Sì" }));

  const gruppoAccordoMessaggio = screen.getByRole("group", {
    name: "D'accordo col giudice automatico sul messaggio?",
  });
  fireEvent.click(within(gruppoAccordoMessaggio).getByRole("button", { name: "Sì" }));
}

describe("area di lavoro del giudice umano", () => {
  it("il messaggio cliente è modificabile", () => {
    render(<ItemDaRivedereView item={ITEM} catalogo={[]} registraGiudizio={async () => null} />);

    const campo = screen.getByDisplayValue("Buongiorno, in allegato il preventivo.");
    fireEvent.change(campo, { target: { value: "Testo corretto dal giudice." } });

    expect(screen.getByDisplayValue("Testo corretto dal giudice.")).toBeInTheDocument();
  });

  it("il pulsante di registrazione resta disabilitato finché i quattro giudizi non sono completi", () => {
    render(<ItemDaRivedereView item={ITEM} catalogo={[]} registraGiudizio={async () => null} />);

    const pulsanteSubmit = screen.getByRole("button", { name: "Registra giudizio e passa al prossimo" });
    expect(pulsanteSubmit).toBeDisabled();

    const gruppoPreventivo = screen.getByRole("group", { name: "Giudizio preventivo" });
    fireEvent.click(within(gruppoPreventivo).getByRole("button", { name: "Sì" }));
    expect(pulsanteSubmit).toBeDisabled();

    completaTuttiIGiudizi();
    expect(pulsanteSubmit).toBeEnabled();
  });

  it("il commento è obbligatorio quando l'esito non è 'sì'", () => {
    render(<ItemDaRivedereView item={ITEM} catalogo={[]} registraGiudizio={async () => null} />);

    completaTuttiIGiudizi();
    const pulsanteSubmit = screen.getByRole("button", { name: "Registra giudizio e passa al prossimo" });
    expect(pulsanteSubmit).toBeEnabled();

    const gruppoPreventivo = screen.getByRole("group", { name: "Giudizio preventivo" });
    fireEvent.click(within(gruppoPreventivo).getByRole("button", { name: "No" }));
    expect(pulsanteSubmit).toBeDisabled();

    const [commentoPreventivo] = screen.getAllByPlaceholderText("Commento (obbligatorio se non è 'Sì')");
    fireEvent.change(commentoPreventivo, { target: { value: "Manca una voce di catalogo" } });
    expect(pulsanteSubmit).toBeEnabled();
  });

  it("'Invia mail' mostra una conferma a schermo senza effettuare chiamate di rete", () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    render(<ItemDaRivedereView item={ITEM} catalogo={[]} registraGiudizio={async () => null} />);

    fireEvent.click(screen.getByRole("button", { name: "Invia mail" }));

    expect(screen.getByText(/mail inviata/i)).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("registrare il giudizio chiama registraGiudizio coi valori scelti e passa all'item successivo", async () => {
    const registraGiudizio = vi.fn().mockResolvedValue(ITEM_SUCCESSIVO);
    render(<ItemDaRivedereView item={ITEM} catalogo={[]} registraGiudizio={registraGiudizio} />);

    completaTuttiIGiudizi();

    const gruppoPreventivo = screen.getByRole("group", { name: "Giudizio preventivo" });
    fireEvent.click(within(gruppoPreventivo).getByRole("button", { name: "Da rivedere" }));
    const [commentoPreventivo] = screen.getAllByPlaceholderText("Commento (obbligatorio se non è 'Sì')");
    fireEvent.change(commentoPreventivo, { target: { value: "Manca una voce" } });

    fireEvent.click(screen.getByRole("button", { name: "Registra giudizio e passa al prossimo" }));

    expect(await screen.findByText("Vorrei imbiancare una stanza")).toBeInTheDocument();
    expect(registraGiudizio).toHaveBeenCalledWith({
      idTraccia: "trace-1",
      idItemCoda: "item-1",
      esitoPreventivo: "da_rivedere",
      commentoPreventivo: "Manca una voce",
      accordoPreventivo: true,
      esitoMessaggio: "si",
      commentoMessaggio: "",
      accordoMessaggio: true,
      messaggioClienteCorretto: "Buongiorno, in allegato il preventivo.",
    });
  });

  it("se la registrazione fallisce, mostra il messaggio d'errore specifico invece di uno generico", async () => {
    const registraGiudizio = vi.fn().mockRejectedValue(new Error("Score config 'accordo_messaggio' non trovata"));
    render(<ItemDaRivedereView item={ITEM} catalogo={[]} registraGiudizio={registraGiudizio} />);

    completaTuttiIGiudizi();
    fireEvent.click(screen.getByRole("button", { name: "Registra giudizio e passa al prossimo" }));

    expect(await screen.findByText("Score config 'accordo_messaggio' non trovata")).toBeInTheDocument();
  });

  it("se non ci sono altri item in coda, mostra lo stato vuoto dopo la registrazione", async () => {
    const registraGiudizio = vi.fn().mockResolvedValue(null);
    render(<ItemDaRivedereView item={ITEM} catalogo={[]} registraGiudizio={registraGiudizio} />);

    completaTuttiIGiudizi();
    fireEvent.click(screen.getByRole("button", { name: "Registra giudizio e passa al prossimo" }));

    expect(await screen.findByText("Nessun preventivo da rivedere al momento.")).toBeInTheDocument();
  });
});
