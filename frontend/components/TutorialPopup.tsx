"use client";

import { useState } from "react";

export function TutorialPopup({ demo }: { demo: boolean }) {
  const [visibile, setVisibile] = useState(true);
  if (!visibile) return null;

  return (
    <div className="popup-overlay" role="dialog" aria-modal="true" aria-label="Come funziona dietro le quinte">
      <div className="popup-riquadro">
        <h2>Come funziona dietro le quinte</h2>
        <p>
          Ogni preventivo che vedi arriva da un agente che genera testo e da un secondo agente
          ("giudice automatico") che lo valuta prima di te. Entrambi scrivono su Langfuse, la
          piattaforma di osservabilità con cui un ingegnere AI traccia i costi e l'accuratezza
          degli agenti in produzione.
        </p>
        <p>
          Il tuo giudizio si aggiunge a quello automatico sulla stessa piattaforma: è il segnale
          che l'ingegnere userebbe per capire dove l'agente sbaglia e correggerne il
          comportamento nel tempo.
        </p>
        {demo && (
          <p className="popup-nota-demo">
            Stai usando dati fittizi: le scelte che fai in questa demo restano solo nel browser,
            non vengono scritte da nessuna parte.
          </p>
        )}
        <button type="button" className="popup-chiudi" onClick={() => setVisibile(false)}>
          Ho capito
        </button>
      </div>
    </div>
  );
}
