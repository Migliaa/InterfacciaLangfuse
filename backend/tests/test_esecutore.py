import json

import pytest

from giudice_pipeline.esecutore import genera_preventivo_e_messaggio

CATALOGO = [{"voce": "Pittura lavabile bianca", "unita": "mq", "prezzo_unitario": 12.0}]
RICHIESTA = {"id": "r1", "testo": "Vorrei tinteggiare 80 mq"}


def _fake_llm(risposta):
    return lambda prompt: json.dumps(risposta)


def test_genera_preventivo_e_messaggio_restituisce_preventivo_e_testo():
    risposta = {
        "preventivo": [{"voce": "Pittura lavabile bianca", "quantita": 80, "prezzo_unitario": 12.0, "totale": 960.0}],
        "messaggio_cliente": "Buongiorno, in allegato il preventivo richiesto.",
    }
    risultato = genera_preventivo_e_messaggio(RICHIESTA, CATALOGO, chiama_llm=_fake_llm(risposta))
    assert risultato["preventivo"][0]["totale"] == 960.0
    assert "Buongiorno" in risultato["messaggio_cliente"]


def test_genera_preventivo_e_messaggio_passa_richiesta_e_catalogo_nel_prompt():
    catturato = {}

    def llm(prompt):
        catturato["prompt"] = prompt
        return json.dumps({"preventivo": [], "messaggio_cliente": "x"})

    genera_preventivo_e_messaggio(RICHIESTA, CATALOGO, chiama_llm=llm)
    assert RICHIESTA["testo"] in catturato["prompt"]
    assert "Pittura lavabile bianca" in catturato["prompt"]


def test_genera_preventivo_e_messaggio_rifiuta_output_senza_messaggio_cliente():
    risposta = {"preventivo": []}
    with pytest.raises(ValueError, match="messaggio_cliente"):
        genera_preventivo_e_messaggio(RICHIESTA, CATALOGO, chiama_llm=_fake_llm(risposta))


def test_genera_preventivo_e_messaggio_rifiuta_output_senza_preventivo():
    risposta = {"messaggio_cliente": "x"}
    with pytest.raises(ValueError, match="preventivo"):
        genera_preventivo_e_messaggio(RICHIESTA, CATALOGO, chiama_llm=_fake_llm(risposta))


def test_genera_preventivo_e_messaggio_rifiuta_riga_senza_totale():
    risposta = {
        "preventivo": [{"voce": "Pittura lavabile bianca", "quantita": 80, "prezzo_unitario": 12.0}],
        "messaggio_cliente": "x",
    }
    with pytest.raises(ValueError, match="totale"):
        genera_preventivo_e_messaggio(RICHIESTA, CATALOGO, chiama_llm=_fake_llm(risposta))


def test_genera_preventivo_e_messaggio_rifiuta_riga_con_totale_non_numerico():
    risposta = {
        "preventivo": [{"voce": "Pittura lavabile bianca", "quantita": 80, "prezzo_unitario": 12.0, "totale": "960.0"}],
        "messaggio_cliente": "x",
    }
    with pytest.raises(ValueError, match="non numerici"):
        genera_preventivo_e_messaggio(RICHIESTA, CATALOGO, chiama_llm=_fake_llm(risposta))
