from unittest.mock import MagicMock

from giudice_pipeline.pipeline import esegui_pipeline

CATALOGO = [{"voce": "Pittura", "unita": "mq", "prezzo_unitario": 12.0}]
RICHIESTE = [
    {"id": "r1", "testo": "Vorrei tinteggiare 80 mq"},
    {"id": "r2", "testo": "Vorrei sostituire 6 finestre"},
]


def _fake_esecutore(richiesta, catalogo):
    return {
        "preventivo": [{"voce": "Pittura", "quantita": 80, "prezzo_unitario": 12.0, "totale": 960.0}],
        "messaggio_cliente": f"Messaggio per {richiesta['id']}",
    }


def _fake_giudice(richiesta, preventivo, messaggio_cliente, catalogo):
    return {
        "verdetto_preventivo": {"esito": "si", "testo": "coerente"},
        "verdetto_messaggio": {"esito": "si", "testo": "tono corretto"},
    }


def _fake_gateway():
    gateway = MagicMock()
    gateway.assicura_score_configs.return_value = {
        "verdetto_preventivo": "cfg-1", "verdetto_messaggio": "cfg-2",
        "accordo_preventivo": "cfg-3", "accordo_messaggio": "cfg-4",
    }
    gateway.assicura_queue.return_value = "queue-1"
    gateway.registra_richiesta.side_effect = [f"trace-{r['id']}" for r in RICHIESTE]
    return gateway


def test_esegui_pipeline_assicura_config_e_queue_una_sola_volta():
    gateway = _fake_gateway()
    esegui_pipeline(CATALOGO, RICHIESTE, _fake_esecutore, _fake_giudice, gateway)

    gateway.assicura_score_configs.assert_called_once()
    gateway.assicura_queue.assert_called_once_with(gateway.assicura_score_configs.return_value)


def test_esegui_pipeline_registra_ogni_richiesta_con_i_dati_giusti():
    gateway = _fake_gateway()
    trace_ids = esegui_pipeline(CATALOGO, RICHIESTE, _fake_esecutore, _fake_giudice, gateway)

    assert trace_ids == ["trace-r1", "trace-r2"]
    assert gateway.registra_richiesta.call_count == 2

    _, kwargs_prima = gateway.registra_richiesta.call_args_list[0]
    assert kwargs_prima["richiesta"] == RICHIESTE[0]
    assert kwargs_prima["preventivo"][0]["totale"] == 960.0
    assert kwargs_prima["messaggio_cliente"] == "Messaggio per r1"
    assert kwargs_prima["verdetto_preventivo"]["esito"] == "si"
    assert kwargs_prima["verdetto_messaggio"]["esito"] == "si"
    assert kwargs_prima["queue_id"] == "queue-1"
    assert kwargs_prima["score_config_ids"] == gateway.assicura_score_configs.return_value
    assert kwargs_prima["documento_pdf"] is None


def test_esegui_pipeline_con_rendering_genera_il_documento_dal_preventivo_e_lo_passa_al_gateway():
    gateway = _fake_gateway()
    genera_documento = MagicMock(return_value=b"%PDF-contenuto-finto")

    esegui_pipeline(
        CATALOGO, RICHIESTE, _fake_esecutore, _fake_giudice, gateway, genera_documento=genera_documento
    )

    assert genera_documento.call_count == 2
    args_prima, _ = genera_documento.call_args_list[0]
    assert args_prima[0][0]["totale"] == 960.0

    _, kwargs_prima = gateway.registra_richiesta.call_args_list[0]
    assert kwargs_prima["documento_pdf"] == b"%PDF-contenuto-finto"


def test_esegui_pipeline_con_richieste_vuote_assicura_comunque_config_e_coda():
    gateway = _fake_gateway()
    trace_ids = esegui_pipeline(CATALOGO, [], _fake_esecutore, _fake_giudice, gateway)

    assert trace_ids == []
    gateway.registra_richiesta.assert_not_called()
    gateway.assicura_score_configs.assert_called_once()
    gateway.assicura_queue.assert_called_once()
