from types import SimpleNamespace
from unittest.mock import MagicMock

from giudice_pipeline.langfuse_gateway import NOME_QUEUE, SCORE_CONFIGS, LangfuseGateway

RICHIESTA = {"id": "r1", "testo": "Vorrei tinteggiare 80 mq"}
PREVENTIVO = [{"voce": "Pittura", "quantita": 80, "prezzo_unitario": 12.0, "totale": 960.0}]
MESSAGGIO = "Buongiorno, in allegato il preventivo."
VERDETTO_PREVENTIVO = {"esito": "si", "testo": "coerente"}
VERDETTO_MESSAGGIO = {"esito": "da_rivedere", "testo": "tono informale"}


def _pagina_singola(elementi):
    """Simula un endpoint paginato: restituisce `elementi` a pagina 1, poi pagine vuote."""
    def _chiamata(*, page, limit):
        return SimpleNamespace(data=elementi if page == 1 else [])
    return _chiamata


def _client_senza_config_esistenti():
    client = MagicMock()
    client.api.score_configs.get.side_effect = _pagina_singola([])
    client.api.annotation_queues.list_queues.side_effect = _pagina_singola([])
    client.api.score_configs.create.side_effect = lambda **kw: SimpleNamespace(id=f"cfg-{kw['name']}")
    client.api.annotation_queues.create_queue.side_effect = lambda **kw: SimpleNamespace(id="queue-1")
    client.create_trace_id.return_value = "trace-1"
    return client


def test_assicura_score_configs_ne_crea_quattro_se_mancanti():
    client = _client_senza_config_esistenti()
    gateway = LangfuseGateway(client)

    ids = gateway.assicura_score_configs()

    assert set(ids.keys()) == set(SCORE_CONFIGS.keys())
    assert client.api.score_configs.create.call_count == 4
    nomi_creati = {kw["name"] for _, kw in client.api.score_configs.create.call_args_list}
    assert nomi_creati == set(SCORE_CONFIGS.keys())


def test_assicura_score_configs_non_ricrea_quelli_esistenti():
    client = MagicMock()
    esistente = SimpleNamespace(id="cfg-esistente", name="verdetto_preventivo")
    client.api.score_configs.get.side_effect = _pagina_singola([esistente])

    gateway = LangfuseGateway(client)
    ids = gateway.assicura_score_configs()

    assert ids["verdetto_preventivo"] == "cfg-esistente"
    nomi_creati = {kw["name"] for _, kw in client.api.score_configs.create.call_args_list}
    assert "verdetto_preventivo" not in nomi_creati
    assert client.api.score_configs.create.call_count == 3


def test_assicura_score_configs_trova_config_esistenti_oltre_la_prima_pagina():
    client = MagicMock()
    esistente = SimpleNamespace(id="cfg-esistente", name="verdetto_preventivo")

    def _due_pagine(*, page, limit):
        if page == 1:
            return SimpleNamespace(data=[SimpleNamespace(id="altro", name="config-di-un-altro-progetto")])
        if page == 2:
            return SimpleNamespace(data=[esistente])
        return SimpleNamespace(data=[])

    client.api.score_configs.get.side_effect = _due_pagine

    gateway = LangfuseGateway(client)
    ids = gateway.assicura_score_configs()

    assert ids["verdetto_preventivo"] == "cfg-esistente"
    nomi_creati = {kw["name"] for _, kw in client.api.score_configs.create.call_args_list}
    assert "verdetto_preventivo" not in nomi_creati


def test_assicura_queue_crea_se_mancante_con_i_config_id_giusti():
    client = _client_senza_config_esistenti()
    gateway = LangfuseGateway(client)
    score_config_ids = {"verdetto_preventivo": "cfg-1", "verdetto_messaggio": "cfg-2",
                         "accordo_preventivo": "cfg-3", "accordo_messaggio": "cfg-4"}

    queue_id = gateway.assicura_queue(score_config_ids)

    assert queue_id == "queue-1"
    _, kwargs = client.api.annotation_queues.create_queue.call_args
    assert kwargs["name"] == NOME_QUEUE
    assert set(kwargs["score_config_ids"]) == set(score_config_ids.values())


def test_assicura_queue_non_ricrea_se_esiste_gia():
    client = MagicMock()
    esistente = SimpleNamespace(id="queue-esistente", name=NOME_QUEUE)
    client.api.annotation_queues.list_queues.side_effect = _pagina_singola([esistente])

    gateway = LangfuseGateway(client)
    queue_id = gateway.assicura_queue({"verdetto_preventivo": "cfg-1"})

    assert queue_id == "queue-esistente"
    client.api.annotation_queues.create_queue.assert_not_called()


def test_registra_richiesta_scrive_due_score_e_accoda_la_traccia():
    client = _client_senza_config_esistenti()
    gateway = LangfuseGateway(client)
    score_config_ids = {"verdetto_preventivo": "cfg-1", "verdetto_messaggio": "cfg-2",
                         "accordo_preventivo": "cfg-3", "accordo_messaggio": "cfg-4"}

    trace_id = gateway.registra_richiesta(
        richiesta=RICHIESTA,
        preventivo=PREVENTIVO,
        messaggio_cliente=MESSAGGIO,
        verdetto_preventivo=VERDETTO_PREVENTIVO,
        verdetto_messaggio=VERDETTO_MESSAGGIO,
        score_config_ids=score_config_ids,
        queue_id="queue-1",
    )

    assert trace_id == "trace-1"

    chiamate_score = client.create_score.call_args_list
    assert len(chiamate_score) == 2
    per_nome = {kw["name"]: kw for _, kw in chiamate_score}
    assert per_nome["verdetto_preventivo"]["value"] == "si"
    assert per_nome["verdetto_preventivo"]["config_id"] == "cfg-1"
    assert per_nome["verdetto_preventivo"]["comment"] == "coerente"
    assert per_nome["verdetto_preventivo"]["trace_id"] == "trace-1"
    assert per_nome["verdetto_messaggio"]["value"] == "da_rivedere"
    assert per_nome["verdetto_messaggio"]["config_id"] == "cfg-2"

    client.api.annotation_queues.create_queue_item.assert_called_once()
    _, kwargs = client.api.annotation_queues.create_queue_item.call_args
    assert kwargs["queue_id"] == "queue-1"
    assert kwargs["object_id"] == "trace-1"
    assert kwargs["object_type"] == "TRACE"
