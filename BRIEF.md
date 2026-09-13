# Brief — progetto "giudice"

Scritto dalla centralina del sito personale per avviare questo progetto, il 2026-09-10. Non è
una decisione presa da questa sessione: è contesto, quello che c'è da imparare, e alcune strade
concrete già verificate — non un progetto già scelto. La scelta esatta (quale strada, quale
taglio, cosa lasciare fuori) spetta a chi apre questa cartella per lavorarci davvero. Andrea può
cambiare qualunque punto qui sotto in una frase.

## Perché questo progetto

Il problema di partenza, posto da Andrea: chi in azienda fa da giudice sugli output di
un'automazione agentica spesso non è tecnico AI, e uno strumento come Langfuse — pensato per chi
costruisce l'agente, non per chi lo valuta dall'esterno — è troppo per lui. Serve un'interfaccia
con pochi pulsanti, che resti comunque collegata a Langfuse così l'ingegnere AI può usare quei
giudizi per ricalibrare il giudice automatico e l'agente.

`SitoPersonale/ricerca/ricerca-ai-engineer.md` segna come il buco più grave, non uno dei tanti:
"non c'è un utente" — né `tassonomia` né `metodo` sono mai stati usati da qualcuno che non sia
Andrea, ed è l'unica domanda che i recruiter dicono di farsi nei primi 15 secondi. Questo
progetto è il primo pensato apposta perché qualcun altro lo usi davvero, anche se quel qualcuno è
un caso finto e non un'azienda reale.

Copre anche un pezzo dell'altro buco segnato dalla stessa ricerca — "manca la metà produzione"
(API/backend 82%, Docker 31%, CI/CD 29% degli annunci) — se la strada scelta arriva fino a un
deploy vero e non resta un prototipo eseguibile solo in locale (vedi opzione 3 sotto).

Il valore di questo strumento non dipende da quanto sbagliano i modelli oggi: anche con un
giudice automatico perfetto, un'azienda vera vuole un umano che possa dire l'ultima parola su un
output prima che diventi un servizio — è una questione di fiducia e responsabilità, non un
tappabuchi in attesa di modelli migliori.

## Cosa c'è da imparare

- **Langfuse Annotation Queues** — la coda di revisione già integrata in Langfuse: si mettono in
  coda tracce o singole risposte di un agente, si definiscono gli *score config* (i tipi di
  giudizio possibili — es. una categoria, un numero, un sì/no), e chi revisiona lavora dalla
  coda invece che dalla vista tecnica completa.
- **Disegnare un'interfaccia minima** — il problema non è tecnico, è di progettazione: cosa
  vede per primo chi non sa cos'è un agente, quanti pulsanti servono davvero, cosa si può
  nascondere senza nascondere l'informazione che serve per giudicare bene.
- **LLM-as-judge e allineamento con l'annotazione umana** — Langfuse dichiara esplicitamente
  questa funzione ("Align your LLM-as-a-Judge evaluation with human annotation"), cioè usare i
  punteggi umani raccolti per correggere il giudice automatico. La documentazione pubblica non
  entra nel dettaglio tecnico di come: va verificato aprendo la coda vera, non assunto.
- *(Solo se si arriva alla strada 3)* **Un deploy vero** — container e hosting raggiungibili da
  un link, non solo un comando lanciato sul proprio computer.

## Strade possibili — verificate il 2026-09-10, da scegliere

Non sono in ordine di preferenza.

1. **Partire dal template pronto di Langfuse.**
   [`langfuse-examples/custom-annotation-ui`](https://github.com/langfuse/langfuse-examples/tree/main/applications/custom-annotation-ui) —
   verificato: Next.js/React/TypeScript, si collega a Langfuse con tre variabili d'ambiente
   (host, chiave pubblica, chiave segreta), dichiarato esplicitamente per rimuovere la
   complessità tecnica a chi non è tecnico. Di default gira in locale (`npm run dev`); niente
   Docker o hosting nella sua documentazione, quindi un deploy vero resta comunque da fare a
   parte (strada 3). È l'opzione più veloce per arrivare a qualcosa di funzionante.

2. **Un'interfaccia scritta da zero sopra le API di Langfuse**, invece di adattare il template.
   Più lenta e meno garantita, ma il taglio (quali pulsanti, quale flusso) resta interamente
   suo — e se il resto del sito è scritto a mano, uno strumento scritto a mano è una prova
   diversa da uno adattato da un template altrui.

3. **Andare oltre il prototipo locale**: un deploy vero — container più hosting (es. Render o
   Fly.io), raggiungibile da un link invece che solo eseguibile sul proprio computer. Copre
   anche l'area "messa in produzione", ancora scoperta in `PROGETTI.md`. Può restare un secondo
   tempo di questo stesso progetto, oppure diventare un progetto a sé se allunga troppo i tempi.

Le opzioni 1 e 2 sono alternative fra loro (si sceglie una base, non entrambe); la 3 è
un'estensione che si somma a qualunque delle due.

## Il caso da usare

Serve un caso finto abbastanza concreto da testare il flusso davvero — non un output generico,
ma qualcosa dove un addetto senza background tecnico deve poter dire "sì / no / da rivedere" su
un output di un agente in pochi secondi, con lo spazio per lasciare un commento quando dice no.
`DA-FARE.md` (nel sito) suggeriva un controllo preventivi come esempio: è un punto di partenza
ragionevole, non un vincolo.

## Cosa NON deve essere

- Non deve reinventare Langfuse: la coda, gli score config, lo storico dei giudizi esistono già
  e vanno usati, non ricostruiti da zero. Il lavoro è nell'interfaccia sopra, non sotto.
- Non deve necessariamente includere il deploy vero (strada 3): se allunga troppo i tempi, resta
  un prototipo che gira in locale con istruzioni chiare per chi lo vuole provare, e il deploy
  diventa un progetto successivo.

## Consegna

Per default, lo stesso formato già usato per `tassonomia` e `metodo`: un `report/report.md`
(prosa + figure) più un `CONSEGNA.md` nella stessa cartella con le istruzioni per la sessione del
sito — vedi `../metodo/report/CONSEGNA.md` come esempio più recente. Se il consegnabile
principale finisce per essere lo strumento stesso (un link, o uno screenshot/video di un uso
reale) più che un report lungo, va bene lo stesso: lo si dice esplicitamente nel `CONSEGNA.md`, e
la sessione del sito si adatta.
