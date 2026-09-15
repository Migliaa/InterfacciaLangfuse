# Schema dei dati

Questi file sostituiscono, per il prototipo, i dati che in un prodotto reale verrebbero da
un'azienda cliente. Il codice della pipeline (`giudice_pipeline/dati.py`) li legge da qui e non
contiene mai questi valori — sostituirli con dati reali non richiede toccare la pipeline.

## `catalogo.json`

Lista di voci di servizio con prezzo unitario:

```json
[
  { "voce": "Nome del servizio", "unita": "mq | cad. | una tantum", "prezzo_unitario": 12.0 }
]
```

## `richieste.json`

Lista di richieste cliente finte, ciascuna un input di partenza per l'esecutore:

```json
[
  { "id": "identificatore univoco", "testo": "richiesta scritta in linguaggio naturale" }
]
```

## `profilo_azienda.json`

Il profilo azienda (finto, "ACME") usato solo dal rendering del documento preventivo — nome,
colore e contatti che comparirebbero nell'intestazione del PDF. Un'azienda reale sostituisce
questo file, non `giudice_pipeline/documento.py`:

```json
{
  "nome": "Nome azienda",
  "colore": "#RRGGBB",
  "email": "contatto@azienda.it",
  "telefono": "+39 ..."
}
```
