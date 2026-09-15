# Diario

Una riga per sessione, memoria grezza del processo. Non letto dalla sessione del sito: solo
`report/report.md` e `CONSEGNA.md` lo sono.

- **2026-09-10 → 2026-09-15, grilling + spec + ticket.** Da `BRIEF.md` (opzioni non ancora
  scelte) a un progetto completamente specificato tramite grilling Matt Pocock a più round:
  scelta la strada 1 del brief (template `langfuse-examples/custom-annotation-ui`, adattato),
  caso d'uso controllo preventivi, struttura a doppio giudice (esecutore → giudice automatico →
  giudice umano) con doppio verdetto/giudizio (preventivo, messaggio cliente) invece di uno
  unico — per poter capire dove sbaglia l'esecutore. Deciso di eseguire esecutore e giudice
  automatico tramite l'abbonamento Claude (`claude -p` non interattivo) invece di una chiave API,
  per azzerare i costi. Deciso di separare il documento preventivo (PDF) e il messaggio cliente:
  contenuto interpretato dall'esecutore, documento come rendering deterministico a valle, senza
  LLM. Fatto un prototipo throwaway (3 varianti di layout per il giudizio umano, dati finti),
  archiviato sul branch `prototype/giudice-ui`; vinta la variante "tre colonne + area di lavoro".
  Esclusa la ricalibrazione del giudice automatico dallo scope, dopo aver verificato che non
  esiste un metodo standard riconosciuto in modo unanime (industria: editing manuale del prompt;
  accademia: fine-tuning/preference optimization; filone recente: calibrazione statistica —
  nessuno prevale). Scritti spec (issue #1) e ticket (#2–#5, con dipendenze a blocchi).
- **2026-09-15, ticket #2 — pipeline.** Implementato `backend/giudice_pipeline/`: esecutore
  (genera preventivo + messaggio cliente da una richiesta), giudice automatico (doppio verdetto),
  gateway Langfuse (score config, coda, tracciamento). TDD, 32 test, mypy pulito. Code review con
  8 agenti in parallelo (angoli A-H): 7 problemi trovati e corretti (validazione mancante,
  paginazione assente su Langfuse, duplicazione di `_formatta_catalogo`, early-return che
  saltava il setup di coda/config, tra gli altri). Rotto e risolto un problema reale solo al
  primo run end-to-end con Claude vero (non mockato): `claude -p` senza `--safe-mode` scopriva il
  `CLAUDE.md` di questo stesso repo e usciva dal ruolo di esecutore/giudice, rispondendo di sé
  invece di generare l'output richiesto. Tentato prima `--bare` (risolve il problema ma forza la
  chiave API, incompatibile con l'abbonamento); risolto con `--safe-mode` (disattiva
  CLAUDE.md/skill/plugin, autenticazione via abbonamento intatta). Verificato con run reale
  contro Langfuse Cloud. Noto ma non risolto: rilanciare `run_pipeline.py` sulle stesse richieste
  non è idempotente su punteggi/coda (solo su config/coda). Commit `aa210ba`, `39173de`.
- **2026-09-15, ticket #3 — rendering documento preventivo (PDF).** Implementato
  `backend/giudice_pipeline/documento.py`: rendering deterministico con `reportlab`, nessun
  import di `claude_cli` (verificato via AST nei test, non solo a occhio). Profilo azienda finto
  (ACME) in `data/profilo_azienda.json`, caricato con lo stesso pattern di validazione già usato
  per catalogo e richieste. Il PDF viene referenziato sulla traccia Langfuse come media
  (`LangfuseMedia`, content-type `application/pdf`) in una nuova osservazione
  `documento-preventivo`, verificato con una chiamata reale a Langfuse che il riferimento è
  effettivamente recuperabile dalla traccia. TDD (9 nuovi test), mypy pulito. Code review con 8
  agenti in parallelo: trovato e corretto un bug reale (la larghezza delle colonne della tabella,
  175mm, eccedeva l'area utile della pagina A4 con i margini di default di reportlab, 159.2mm —
  verificato programmaticamente, non solo per ispezione) e un rischio di crash (nessuna
  validazione di tipo sui campi numerici del preventivo prima di formattarli/sommarli — esteso
  `_valida_preventivo` in `esecutore.py` per rifiutare tipi non numerici, fail-fast dove i dati
  vengono prodotti, non dove vengono renderizzati). Ristrutturata la firma di `esegui_pipeline`:
  invece di due parametri opzionali (`genera_documento_preventivo`, `profilo_azienda`) legati da
  un `assert` a runtime (disattivabile con `python -O`), un solo parametro (`genera_documento`)
  già bindato al profilo azienda in `run_pipeline.py` tramite `functools.partial` — lo stato
  illegale "uno presente, l'altro no" diventa irrappresentabile. Estratto un helper `_osserva` nel
  gateway per eliminare la ripetizione di tre blocchi `with ...: pass` identici. Deduplicata la
  validazione di campi obbligatori in `dati.py` (stesso pattern ripetuto tre volte) in un helper
  `_valida_campi`. Notato, in fase di review, che questo file (`DIARIO.md`) non esisteva ancora
  nonostante il CLAUDE.md di progetto lo richieda esplicitamente da subito — creato ora,
  recuperando anche la sessione del ticket #2 a memoria/da `CONTEXT.md` e dai commit, dato che il
  diario grezzo di quella sessione non era stato scritto in tempo reale.
