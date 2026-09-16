"use client";

import { useState } from "react";

import type { ItemDaRivedere, Verdetto as VerdettoTipo, VoceCatalogo } from "@/lib/tipi";

const RESA_ESITO: Record<VerdettoTipo["esito"], { etichetta: string; classe: string }> = {
  si: { etichetta: "Coerente", classe: "pill-ok" },
  da_rivedere: { etichetta: "Da rivedere", classe: "pill-warn" },
  no: { etichetta: "Incoerente", classe: "pill-bad" },
};

function BloccoVerdetto({ titolo, verdetto }: { titolo: string; verdetto: VerdettoTipo }) {
  const { etichetta, classe } = RESA_ESITO[verdetto.esito];
  return (
    <div className="blocco-verdetto">
      <p className="etichetta">{titolo}</p>
      <span className={`pill ${classe}`}>{etichetta}</span>
      <p className="testo-motivazione">{verdetto.testo}</p>
    </div>
  );
}

function TabellaCatalogo({ catalogo }: { catalogo: VoceCatalogo[] }) {
  return (
    <table className="tabella-catalogo">
      <tbody>
        {catalogo.map((voce) => (
          <tr key={voce.voce}>
            <td>{voce.voce}</td>
            <td>
              {voce.prezzo_unitario.toFixed(2)} € / {voce.unita}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function ItemDaRivedereView({
  item,
  catalogo,
}: {
  item: ItemDaRivedere;
  catalogo: VoceCatalogo[];
}) {
  const [scheda, setScheda] = useState<"tabella" | "documento">("tabella");
  const [catalogoVisibile, setCatalogoVisibile] = useState(false);
  const totale = item.preventivo.reduce((somma, riga) => somma + riga.totale, 0);

  return (
    <div className="pagina">
      <div className="colonne">
        <section className="pannello" aria-label="Richiesta cliente">
          <h2>Richiesta cliente</h2>
          <p>{item.richiestaCliente}</p>
        </section>

        <section className="pannello" aria-label="Preventivo">
          <div className="schede" role="tablist">
            <button
              role="tab"
              type="button"
              aria-selected={scheda === "tabella"}
              className={scheda === "tabella" ? "scheda-btn attiva" : "scheda-btn"}
              onClick={() => setScheda("tabella")}
            >
              Tabella
            </button>
            <button
              role="tab"
              type="button"
              aria-selected={scheda === "documento"}
              className={scheda === "documento" ? "scheda-btn attiva" : "scheda-btn"}
              onClick={() => setScheda("documento")}
            >
              Documento
            </button>
          </div>

          {scheda === "tabella" ? (
            <div>
              <table className="tabella-preventivo">
                <tbody>
                  {item.preventivo.map((riga, i) => (
                    <tr key={i}>
                      <td>
                        {riga.voce} · {riga.quantita}
                      </td>
                      <td>{riga.totale.toFixed(2)} €</td>
                    </tr>
                  ))}
                  <tr className="riga-totale">
                    <td>Totale</td>
                    <td>{totale.toFixed(2)} €</td>
                  </tr>
                </tbody>
              </table>
              <button type="button" className="ghost-btn" onClick={() => setCatalogoVisibile((v) => !v)}>
                {catalogoVisibile ? "Nascondi catalogo di riferimento" : "Vedi catalogo di riferimento"}
              </button>
              {catalogoVisibile && <TabellaCatalogo catalogo={catalogo} />}
            </div>
          ) : (
            <div className="anteprima-documento">
              {item.documentoUrl ? (
                <iframe src={item.documentoUrl} title="Anteprima documento preventivo" />
              ) : (
                <p className="muto">Anteprima del documento non disponibile.</p>
              )}
            </div>
          )}
        </section>

        <section className="pannello" aria-label="Verdetto automatico">
          <h2>Verdetto automatico</h2>
          <BloccoVerdetto titolo="Preventivo" verdetto={item.verdettoPreventivo} />
          <BloccoVerdetto titolo="Messaggio cliente" verdetto={item.verdettoMessaggio} />
        </section>
      </div>

      <div className="area-lavoro">
        <section className="pannello">
          <h3>Il preventivo va bene?</h3>
          <div className="gruppo-scelte">
            <button type="button" disabled>
              Sì
            </button>
            <button type="button" disabled>
              Da rivedere
            </button>
            <button type="button" disabled>
              No
            </button>
          </div>
          <textarea disabled placeholder="Commento (obbligatorio se non è 'Sì')" />
          <p className="etichetta">D&apos;accordo col giudice automatico sul preventivo?</p>
          <div className="gruppo-scelte">
            <button type="button" disabled>
              Sì
            </button>
            <button type="button" disabled>
              No
            </button>
          </div>
        </section>

        <section className="pannello">
          <h3>Messaggio cliente</h3>
          <textarea disabled className="msg-box" defaultValue={item.messaggioCliente} />
          <div className="gruppo-scelte">
            <button type="button" disabled>
              Sì
            </button>
            <button type="button" disabled>
              Da rivedere
            </button>
            <button type="button" disabled>
              No
            </button>
          </div>
          <textarea disabled placeholder="Commento (obbligatorio se non è 'Sì')" />
          <p className="etichetta">D&apos;accordo col giudice automatico sul messaggio?</p>
          <div className="gruppo-scelte">
            <button type="button" disabled>
              Sì
            </button>
            <button type="button" disabled>
              No
            </button>
          </div>
        </section>
      </div>

      <div className="barra-azioni">
        <button type="button" className="send-btn" disabled>
          Invia mail
        </button>
        <button type="button" className="submit-btn" disabled>
          Registra giudizio e passa al prossimo
        </button>
      </div>
    </div>
  );
}
