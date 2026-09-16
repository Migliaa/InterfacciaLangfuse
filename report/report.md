# giudice

**Quale problema risolve:**
Un'automazione che genera contenuto rivolto a un cliente — preventivo, risposta, documento — ha
bisogno che qualcuno in azienda possa bloccarlo o correggerlo prima dell'invio. Chi fa questo
controllo di solito non è chi ha costruito l'agente: è un addetto commerciale o di back office,
senza gli strumenti tecnici (tracce, punteggi, configurazioni) con cui un ingegnere AI osserva lo
stesso sistema. giudice collega quegli strumenti a un'interfaccia che quella persona può usare
senza formazione tecnica, per decidere se un output va bene, va corretto o va bloccato.

**A chi è indirizzato:**
A chi in azienda fa da ultimo controllo su un processo automatizzato senza averlo costruito: un
addetto commerciale, amministrativo o di back office, non un tecnico AI.

**Funzionalità:**
- Mostra affiancati richiesta originale, preventivo generato, documento pronto per l'invio e
  verdetto di un giudice automatico su due dimensioni separate: contenuto del preventivo, tono
  del messaggio al cliente.
- Il messaggio al cliente è modificabile direttamente nell'interfaccia prima dell'invio.
- Il giudice umano esprime un giudizio su ciascuna delle due dimensioni, con commento obbligatorio
  quando dissente dal verdetto automatico.
- Un clic registra il giudizio e carica l'item successivo della coda.
- "Invia mail" è uno stub: conferma a schermo, nessun invio reale.

**Personalizzazione:**
Catalogo prezzi e profilo aziendale del documento (il logo e i dati che compaiono sul preventivo)
sono dati separati dalla logica di revisione: sostituirli con quelli di un'azienda reale non
richiede modifiche all'interfaccia. La stessa interfaccia si applica a qualunque processo di
controllo su output testuali strutturati, non solo preventivi.
