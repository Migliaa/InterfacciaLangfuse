"use client";

import { useState } from "react";

import type {
  GiudizioUmano,
  ItemDaRivedere,
  Verdetto as VerdettoTipo,
  VoceCatalogo,
} from "@/lib/tipi";

const RESA_ESITO: Record<VerdettoTipo["esito"], { etichetta: string; classe: string }> = {
  si: { etichetta: "Coerente", classe: "pill-ok" },
  da_rivedere: { etichetta: "Da rivedere", classe: "pill-warn" },
  no: { etichetta: "Incoerente", classe: "pill-bad" },
};

const OPZIONI_ESITO: { valore: VerdettoTipo["esito"]; etichetta: string }[] = [
  { valore: "si", etichetta: "Sì" },
  { valore: "da_rivedere", etichetta: "Da rivedere" },
  { valore: "no", etichetta: "No" },
];

const OPZIONI_ACCORDO: { valore: boolean; etichetta: string }[] = [
  { valore: true, etichetta: "Sì" },
  { valore: false, etichetta: "No" },
];

function commentoObbligatorioSoddisfatto(esito: VerdettoTipo["esito"] | null, commento: string): boolean {
  return esito === "si" || commento.trim() !== "";
}

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

function GruppoScelte<T>({
  etichetta,
  opzioni,
  valore,
  onCambia,
}: {
  etichetta: string;
  opzioni: { valore: T; etichetta: string }[];
  valore: T | null;
  onCambia: (valore: T) => void;
}) {
  return (
    <>
      <p className="etichetta">{etichetta}</p>
      <div className="gruppo-scelte" role="group" aria-label={etichetta}>
        {opzioni.map((opzione, i) => (
          <button
            key={i}
            type="button"
            aria-pressed={valore === opzione.valore}
            className={valore === opzione.valore ? "selezionata" : ""}
            onClick={() => onCambia(opzione.valore)}
          >
            {opzione.etichetta}
          </button>
        ))}
      </div>
    </>
  );
}

export function ItemDaRivedereView({
  item,
  catalogo,
  registraGiudizio,
}: {
  item: ItemDaRivedere;
  catalogo: VoceCatalogo[];
  registraGiudizio: (giudizio: GiudizioUmano) => Promise<ItemDaRivedere | null>;
}) {
  const [itemAttuale, setItemAttuale] = useState<ItemDaRivedere | null>(item);
  const [scheda, setScheda] = useState<"tabella" | "documento">("tabella");
  const [catalogoVisibile, setCatalogoVisibile] = useState(false);

  const [messaggioCliente, setMessaggioCliente] = useState(item.messaggioCliente);
  const [esitoPreventivo, setEsitoPreventivo] = useState<VerdettoTipo["esito"] | null>(null);
  const [commentoPreventivo, setCommentoPreventivo] = useState("");
  const [accordoPreventivo, setAccordoPreventivo] = useState<boolean | null>(null);
  const [esitoMessaggio, setEsitoMessaggio] = useState<VerdettoTipo["esito"] | null>(null);
  const [commentoMessaggio, setCommentoMessaggio] = useState("");
  const [accordoMessaggio, setAccordoMessaggio] = useState<boolean | null>(null);

  const [mailConfermata, setMailConfermata] = useState(false);
  const [registrazioneInCorso, setRegistrazioneInCorso] = useState(false);
  const [erroreRegistrazione, setErroreRegistrazione] = useState<string | null>(null);

  if (!itemAttuale) {
    return (
      <div className="stato-vuoto">
        <p>Nessun preventivo da rivedere al momento.</p>
      </div>
    );
  }

  const commentoPreventivoOk = commentoObbligatorioSoddisfatto(esitoPreventivo, commentoPreventivo);
  const commentoMessaggioOk = commentoObbligatorioSoddisfatto(esitoMessaggio, commentoMessaggio);
  const giudizioCompleto =
    esitoPreventivo !== null &&
    commentoPreventivoOk &&
    accordoPreventivo !== null &&
    esitoMessaggio !== null &&
    commentoMessaggioOk &&
    accordoMessaggio !== null;

  const totale = itemAttuale.preventivo.reduce((somma, riga) => somma + riga.totale, 0);

  function passaAlProssimoItem(prossimo: ItemDaRivedere | null) {
    setItemAttuale(prossimo);
    setScheda("tabella");
    setCatalogoVisibile(false);
    setMessaggioCliente(prossimo?.messaggioCliente ?? "");
    setEsitoPreventivo(null);
    setCommentoPreventivo("");
    setAccordoPreventivo(null);
    setEsitoMessaggio(null);
    setCommentoMessaggio("");
    setAccordoMessaggio(null);
    setMailConfermata(false);
  }

  async function registra() {
    if (!giudizioCompleto || !itemAttuale) return;
    setRegistrazioneInCorso(true);
    setErroreRegistrazione(null);
    try {
      const prossimo = await registraGiudizio({
        idTraccia: itemAttuale.idTraccia,
        idItemCoda: itemAttuale.idItemCoda,
        esitoPreventivo,
        commentoPreventivo,
        accordoPreventivo: accordoPreventivo as boolean,
        esitoMessaggio,
        commentoMessaggio,
        accordoMessaggio: accordoMessaggio as boolean,
        messaggioClienteCorretto: messaggioCliente,
      });
      passaAlProssimoItem(prossimo);
    } catch (errore) {
      setErroreRegistrazione(errore instanceof Error ? errore.message : "Registrazione non riuscita: riprovare.");
    } finally {
      setRegistrazioneInCorso(false);
    }
  }

  return (
    <div className="pagina">
      <div className="colonne">
        <section className="pannello" aria-label="Richiesta cliente">
          <h2>Richiesta cliente</h2>
          <p>{itemAttuale.richiestaCliente}</p>
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
                  {itemAttuale.preventivo.map((riga, i) => (
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
              {itemAttuale.documentoUrl ? (
                <iframe src={itemAttuale.documentoUrl} title="Anteprima documento preventivo" />
              ) : (
                <p className="muto">Anteprima del documento non disponibile.</p>
              )}
            </div>
          )}
        </section>

        <section className="pannello" aria-label="Verdetto automatico">
          <h2>Verdetto automatico</h2>
          <BloccoVerdetto titolo="Preventivo" verdetto={itemAttuale.verdettoPreventivo} />
          <BloccoVerdetto titolo="Messaggio cliente" verdetto={itemAttuale.verdettoMessaggio} />
        </section>
      </div>

      <div className="area-lavoro">
        <section className="pannello">
          <h3>Il preventivo va bene?</h3>
          <GruppoScelte
            etichetta="Giudizio preventivo"
            opzioni={OPZIONI_ESITO}
            valore={esitoPreventivo}
            onCambia={setEsitoPreventivo}
          />
          <textarea
            placeholder="Commento (obbligatorio se non è 'Sì')"
            value={commentoPreventivo}
            onChange={(e) => setCommentoPreventivo(e.target.value)}
          />
          <GruppoScelte
            etichetta="D'accordo col giudice automatico sul preventivo?"
            opzioni={OPZIONI_ACCORDO}
            valore={accordoPreventivo}
            onCambia={setAccordoPreventivo}
          />
        </section>

        <section className="pannello">
          <h3>Messaggio cliente</h3>
          <textarea
            className="msg-box"
            value={messaggioCliente}
            onChange={(e) => setMessaggioCliente(e.target.value)}
          />
          <GruppoScelte
            etichetta="Giudizio messaggio"
            opzioni={OPZIONI_ESITO}
            valore={esitoMessaggio}
            onCambia={setEsitoMessaggio}
          />
          <textarea
            placeholder="Commento (obbligatorio se non è 'Sì')"
            value={commentoMessaggio}
            onChange={(e) => setCommentoMessaggio(e.target.value)}
          />
          <GruppoScelte
            etichetta="D'accordo col giudice automatico sul messaggio?"
            opzioni={OPZIONI_ACCORDO}
            valore={accordoMessaggio}
            onCambia={setAccordoMessaggio}
          />
        </section>
      </div>

      {erroreRegistrazione && <p className="testo-errore">{erroreRegistrazione}</p>}
      {mailConfermata && <p className="testo-conferma">Mail inviata (simulata).</p>}

      <div className="barra-azioni">
        <button type="button" className="send-btn" onClick={() => setMailConfermata(true)}>
          Invia mail
        </button>
        <button
          type="button"
          className="submit-btn"
          disabled={!giudizioCompleto || registrazioneInCorso}
          onClick={registra}
        >
          {registrazioneInCorso ? "Registrazione in corso…" : "Registra giudizio e passa al prossimo"}
        </button>
      </div>
    </div>
  );
}
