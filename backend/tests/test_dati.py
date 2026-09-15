import json

import pytest

from giudice_pipeline.dati import (
    carica_catalogo,
    carica_profilo_azienda,
    carica_richieste,
    formatta_catalogo,
)


def test_carica_richieste_rifiuta_voce_senza_id(tmp_path):
    percorso = tmp_path / "richieste.json"
    percorso.write_text(json.dumps([{"testo": "manca l'id"}]), encoding="utf-8")
    with pytest.raises(ValueError, match="id"):
        carica_richieste(percorso)


def test_carica_catalogo_rifiuta_voce_senza_prezzo(tmp_path):
    percorso = tmp_path / "catalogo.json"
    percorso.write_text(json.dumps([{"voce": "Pittura", "unita": "mq"}]), encoding="utf-8")
    with pytest.raises(ValueError, match="prezzo_unitario"):
        carica_catalogo(percorso)


def test_carica_richieste_reali_sono_valide():
    richieste = carica_richieste()
    assert len(richieste) >= 1
    assert all("id" in r and "testo" in r for r in richieste)


def test_carica_catalogo_reale_e_valido():
    catalogo = carica_catalogo()
    assert len(catalogo) >= 1


def test_formatta_catalogo():
    catalogo = [{"voce": "Pittura", "unita": "mq", "prezzo_unitario": 12.0}]
    assert formatta_catalogo(catalogo) == "- Pittura (mq): 12.0"


def test_carica_profilo_azienda_rifiuta_profilo_senza_colore(tmp_path):
    percorso = tmp_path / "profilo_azienda.json"
    percorso.write_text(json.dumps({"nome": "ACME", "email": "a@a.it", "telefono": "123"}), encoding="utf-8")
    with pytest.raises(ValueError, match="colore"):
        carica_profilo_azienda(percorso)


def test_carica_profilo_azienda_reale_e_valido():
    profilo = carica_profilo_azienda()
    assert profilo["nome"] == "ACME"
