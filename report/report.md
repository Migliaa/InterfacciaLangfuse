# giudice

*Un'interfaccia minima perché un non tecnico possa dare l'ultima parola su un output agentico.*

Un'automazione che genera contenuto rivolto a un cliente — un preventivo, una risposta, un
documento — resta un rischio finché nessuno in azienda può bloccarne uno prima che parta, e chi
dovrebbe farlo di solito non è la persona che ha costruito l'agente: è un addetto commerciale o
di back office, a cui gli strumenti pensati per chi costruisce l'agente (tracce, punteggi,
configurazioni) sono estranei quanto il codice sorgente. **giudice** mette tra l'agente e il
cliente finale una schermata pensata per chi deve solo decidere se un output va bene, va corretto
o va bloccato, senza dover imparare il linguaggio di chi ha costruito il sistema — la fiducia in
un processo automatizzato dipende da questo controllo quanto dalla qualità del modello che lo
alimenta.

Nel caso dimostrativo, il flusso è preventivo → verdetto di un giudice automatico → giudice
umano. Ogni item mostra affiancati richiesta originale, preventivo generato, documento pronto per
l'invio e verdetto automatico su due dimensioni distinte — il contenuto del preventivo, il tono
del messaggio al cliente. Il giudice umano corregge il testo se serve, esprime il proprio
giudizio su entrambe le dimensioni con un commento quando dissente dal verdetto automatico, e
passa all'item successivo con un clic: l'obiettivo è un giudizio in pochi secondi, non
un'analisi.

È pensato per chi in azienda fa da ultimo controllo su un processo automatizzato senza essere la
persona che lo ha costruito — un addetto commerciale, amministrativo o di back office, non un
tecnico AI.

Catalogo prezzi e profilo aziendale del documento sono dati separati dalla logica di revisione:
sostituirli con quelli di un'azienda reale non tocca l'interfaccia, che resta la stessa per
qualunque controllo su output testuali strutturati, non solo preventivi.
