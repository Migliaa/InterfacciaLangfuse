# Consegna — progetto `giudice`

Per la sessione del sito. Tutto quello che serve sta in `Progetti/giudice/report/report.md`.

## Formato di consegna

Diverso da `tassonomia` e `metodo`: qui il centro del progetto è lo strumento stesso, non
un'analisi da leggere (deciso in `CONTEXT.md`). Non c'è un formato lungo prosa+figure — solo il
report breve, 299 parole, già editoriale, senza sezioni da dividere fra home e pubblicazione
estesa: è già la lunghezza di un blocco da home.

Non leggere `DIARIO.md`, `CONTEXT.md`, `BRIEF.md`, né `frontend/`/`backend/`: sono lavoro interno.

## Vincoli sul testo

Nessuna sezione pre-approvata da riscrivere: il report è nuovo, non derivato da un testo
precedente. Lo stile segue le preferenze in `~/.claude/CLAUDE.md` (periodi lunghi e coesi, niente
frasi brevi rafforzative, niente tono da vendita) — se lo si adatta al taglio del sito, mantenere
lo stesso registro.

## Nessuna figura

Il report non ha figure. Se la pagina del sito ne vuole una, uno screenshot reale
dell'interfaccia (schermata a tre colonne + area di lavoro, con un item di prova) comunicherebbe
più di un diagramma — non esiste ancora, andrebbe catturato lanciando `npm run dev` in
`frontend/` con un item in coda.

## Cose da sapere

- Il progetto è un prototipo che gira in locale (`frontend/` + `backend/`), non ha un link
  pubblico: se la pagina del sito promette un demo raggiungibile, va chiarito che si tratta di
  uno strumento eseguibile, non hostato (deciso in `CONTEXT.md`: il deploy vero è rimandato).
- Non c'è login né invio email reale nel prodotto — scelte esplicite, non lacune da segnalare
  come limite.
- Repo: https://github.com/Migliaa/InterfacciaLangfuse.

## Da aggiornare in `SitoPersonale/PROGETTI.md`

La riga di `giudice` va aggiornata a "completato" — la sessione del sito decide la formulazione
esatta.
