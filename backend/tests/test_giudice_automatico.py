import json

import pytest

from giudice_pipeline.giudice_automatico import ESITI_VALIDI, valuta

RICHIESTA = {"id": "r1", "testo": "Vorrei tinteggiare 80 mq"}
CATALOGO = [{"voce": "Pittura lavabile bianca", "unita": "mq", "prezzo_unitario": 12.0}]
PREVENTIVO = [{"voce": "Pittura lavabile bianca", "quantita": 80, "prezzo_unitario": 12.0, "totale": 960.0}]
MESSAGGIO = "Buongiorno, in allegato il preventivo."


def _fake_llm(risposta):
    return lambda prompt: json.dumps(risposta)


def test_valuta_restituisce_due_verdetti_distinti():
    risposta = {
        "verdetto_preventivo": {"esito": "si", "testo": "coerente col catalogo"},
        "verdetto_messaggio": {"esito": "da_rivedere", "testo": "tono troppo informale"},
    }
    risultato = valuta(RICHIESTA, PREVENTIVO, MESSAGGIO, CATALOGO, chiama_llm=_fake_llm(risposta))
    assert risultato["verdetto_preventivo"]["esito"] == "si"
    assert risultato["verdetto_messaggio"]["esito"] == "da_rivedere"
    assert risultato["verdetto_preventivo"]["testo"] != risultato["verdetto_messaggio"]["testo"]


def test_valuta_rifiuta_esito_non_valido():
    risposta = {
        "verdetto_preventivo": {"esito": "forse", "testo": "..."},
        "verdetto_messaggio": {"esito": "si", "testo": "..."},
    }
    with pytest.raises(ValueError, match="esito"):
        valuta(RICHIESTA, PREVENTIVO, MESSAGGIO, CATALOGO, chiama_llm=_fake_llm(risposta))


def test_valuta_rifiuta_output_senza_verdetto_messaggio():
    risposta = {"verdetto_preventivo": {"esito": "si", "testo": "..."}}
    with pytest.raises(ValueError, match="verdetto_messaggio"):
        valuta(RICHIESTA, PREVENTIVO, MESSAGGIO, CATALOGO, chiama_llm=_fake_llm(risposta))


def test_esiti_validi_sono_tre():
    assert ESITI_VALIDI == {"si", "da_rivedere", "no"}
