# giudice

Interfaccia minima, collegata a Langfuse, che permette a un revisore umano non tecnico di dare
un verdetto su preventivi prodotti da un agente e già valutati da un giudice automatico.

## Language

**Preventivo**:
L'oggetto da giudicare: l'output prodotto dall'esecutore per una richiesta di un cliente finto.
_Avoid_: Output, risposta dell'agente

**Esecutore**:
L'agente che, data una richiesta, produce il preventivo. È uno dei due soggetti che il giudizio
umano valuta implicitamente.
_Avoid_: Agente (troppo generico — nel progetto ci sono più agenti con ruoli distinti)

**Giudice automatico**:
L'agente LLM-as-judge che assegna un punteggio al preventivo prodotto dall'esecutore, prima che
arrivi al giudice umano. È il secondo soggetto che il giudizio umano valuta implicitamente.
_Avoid_: LLM-as-judge (termine tecnico Langfuse, va bene nei documenti tecnici ma non come nome
del ruolo nel dominio), giudice (ambiguo con giudice umano)

**Giudice umano**:
La persona non tecnica che rivede preventivo e verdetto del giudice automatico tramite
l'interfaccia "giudice", e dà il proprio verdetto finale. Il suo giudizio è il termine di
paragone sia per l'esecutore sia per il giudice automatico.
_Avoid_: Revisore, annotatore (termine tecnico Langfuse)

**Catalogo**:
L'elenco di servizi/voci di prezzo da cui l'esecutore compone un preventivo. Nel prototipo è
scritto a mano una volta; in un prodotto reale sarebbe fornito dall'azienda cliente.
_Avoid_: Listino (sinonimo valido ma meno usato nel progetto)

**Richiesta cliente**:
L'input di partenza da cui l'esecutore genera il preventivo — descrive cosa il cliente finto
vuole. Nel prototipo è scritta a mano una volta, non generata a runtime.
_Avoid_: Query, prompt (troppo tecnici per un termine di dominio)

**Ricalibrazione**:
Meccanismo che usa i verdetti del giudice umano per correggere il comportamento del giudice
automatico. Nel prototipo serve a dimostrare che il collegamento funziona, non a validarne
l'efficacia con ripetizioni o misure statistiche.
_Avoid_: Fine-tuning, allineamento (termine Langfuse per il caso d'uso, tenuto come sinonimo
tecnico ma non come nome primario)

## Decisioni prese

- Base tecnica: si parte dal template `langfuse-examples/custom-annotation-ui` (Next.js/TS),
  adattato — non da un'interfaccia scritta da zero. Verificato: è l'unico template Langfuse
  pensato per revisione umana custom, nessuna alternativa reale trovata.
- Caso d'uso: controllo preventivi.
- Struttura a doppio giudice: esecutore → giudice automatico → giudice umano.
- L'esecutore genera il preventivo da zero a partire da una richiesta cliente finta (non
  corregge un preventivo preesistente).
- Il giudice umano vede, affiancati nella stessa schermata: richiesta originale, preventivo
  generato dall'esecutore, verdetto del giudice automatico.
- Il giudizio umano è espresso con due score config distinti: uno sul preventivo (sì/no/da
  rivedere + commento), uno sull'accordo col giudice automatico (sì/no) — quest'ultimo è ciò che
  rende possibile giudicare il giudice automatico senza doverlo dedurre da un commento libero.
- Scala: poche ripetizioni, bastano a dimostrare che il collegamento funziona — nessuna
  validazione statistica del giudice automatico o dell'effetto della ricalibrazione.
- Langfuse Cloud, piano gratuito (Hobby) — nessun self-hosting necessario per il prototipo.
- Nessun login per il giudice umano in questo prototipo — rimandato a un eventuale prodotto reale.
- Deploy vero (strada 3 del brief) rimandato: si progetta e imposta il sistema in modo che sia
  predisponibile alla produzione in un secondo momento, ma non si fa il deploy adesso.
- Backend che fa girare esecutore + giudice automatico + inserimento in coda Langfuse: Python
  (SDK Langfuse Python), separato dall'interfaccia web che resta Next.js/TS adattata dal
  template. Due linguaggi nel progetto, uno per componente.
- Catalogo e richieste cliente: scritti a mano una volta da noi (nessun dataset pronto esiste),
  coerente con "poche ripetizioni, basta dimostrare che il collegamento funziona".
- Predisposizione alla produzione, in concreto: catalogo e richieste cliente non vanno
  hardcoded nella logica della pipeline, ma caricati da una fonte dati separata e sostituibile
  (schema documentato) — così un'azienda reale può in futuro collegare il proprio catalogo e il
  proprio storico preventivi senza riscrivere la pipeline.
- Formato di consegna: breve — report sintetico + `CONSEGNA.md`, non il formato lungo
  prosa+figure di tassonomia/metodo, perché il centro del progetto è uno strumento da usare, non
  un'analisi da leggere.
- Il metodo di inserimento dati per la predisposizione alla produzione resta a livello di schema
  documentato e disaccoppiato dalla pipeline (es. file con una struttura definita + comando da
  eseguire) — non si costruisce una schermata di caricamento nell'interfaccia web ora, coerente
  con l'assenza di login e di deploy in questo prototipo.
- Ricalibrazione: **fuori scope**, verificato. Andrea non vuole dimostrare che il giudizio umano
  modifichi il comportamento del giudice automatico entro questo progetto — è un processo
  separato, lato backend dell'AI engineer — a meno che non fosse un metodo standard e
  riconosciuto in modo pressoché unanime dalla comunità. Verificato che non lo è: industria
  (Langfuse, Braintrust) prescrive editing manuale del prompt guidato dai disaccordi, letteratura
  accademica prescrive fine-tuning/preference optimization di un modello giudice dedicato, un
  filone più recente propone calibrazione statistica dei punteggi — nessuno riconosciuto come
  standard rispetto agli altri. Le fonti convergono solo sulla fase di misurazione (dataset con
  etichette umane, calcolo dell'accordo), non sulla correzione. Il prototipo si ferma quindi a
  raccogliere i punteggi umani (`source: ANNOTATION`) leggibili via API — la loro lettura per
  correggere il giudice resta un passo manuale futuro, non costruito qui.
