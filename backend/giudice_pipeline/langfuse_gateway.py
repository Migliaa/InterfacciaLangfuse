"""Confine con Langfuse: score config, coda di revisione, tracciamento. Nessuna logica di
dominio qui — solo come i dati arrivano a Langfuse. Il client è iniettato per essere sostituibile
nei test."""
from dataclasses import dataclass, field

from langfuse.api.commons.types.config_category import ConfigCategory
from langfuse.api.media.types.media_content_type import MediaContentType
from langfuse.media import LangfuseMedia

NOME_QUEUE = "revisione-preventivi"


@dataclass(frozen=True)
class SpecScoreConfig:
    data_type: str
    categorie: list[str] = field(default_factory=list)


ESITI_CATEGORICI = ["si", "da_rivedere", "no"]

# Nota: il giudice automatico scrive score con create_score(), quindi il loro `source` sarà
# "API" (non "EVAL" — riservato agli evaluator gestiti nativamente da Langfuse). Restano
# comunque distinguibili dai punteggi umani, che arrivano con source "ANNOTATION" dalla queue.
SCORE_CONFIGS: dict[str, SpecScoreConfig] = {
    "verdetto_preventivo": SpecScoreConfig("CATEGORICAL", ESITI_CATEGORICI),
    "verdetto_messaggio": SpecScoreConfig("CATEGORICAL", ESITI_CATEGORICI),
    "accordo_preventivo": SpecScoreConfig("BOOLEAN"),
    "accordo_messaggio": SpecScoreConfig("BOOLEAN"),
}


class LangfuseGateway:
    def __init__(self, client):
        self._client = client

    def _tutte_le_pagine(self, chiamata) -> list:
        pagina = 1
        risultati = []
        while True:
            risposta = chiamata(page=pagina, limit=100)
            if not risposta.data:
                break
            risultati.extend(risposta.data)
            pagina += 1
        return risultati

    def _osserva(self, *, name: str, as_type: str, input: dict, output: dict) -> None:
        with self._client.start_as_current_observation(name=name, as_type=as_type, input=input, output=output):
            pass

    def assicura_score_configs(self) -> dict[str, str]:
        esistenti = {c.name: c.id for c in self._tutte_le_pagine(self._client.api.score_configs.get)}
        ids: dict[str, str] = {}
        for nome, spec in SCORE_CONFIGS.items():
            if nome in esistenti:
                ids[nome] = esistenti[nome]
                continue
            if spec.data_type == "CATEGORICAL":
                categorie = [ConfigCategory(value=float(i), label=lab) for i, lab in enumerate(spec.categorie)]
                config = self._client.api.score_configs.create(
                    name=nome, data_type="CATEGORICAL", categories=categorie
                )
            else:
                config = self._client.api.score_configs.create(name=nome, data_type="BOOLEAN")
            ids[nome] = config.id
        return ids

    def assicura_queue(self, score_config_ids: dict[str, str]) -> str:
        esistenti = self._tutte_le_pagine(self._client.api.annotation_queues.list_queues)
        for queue in esistenti:
            if queue.name == NOME_QUEUE:
                return queue.id
        queue = self._client.api.annotation_queues.create_queue(
            name=NOME_QUEUE,
            score_config_ids=list(score_config_ids.values()),
            description=(
                "Revisione preventivi generati dall'esecutore, con doppio verdetto automatico "
                "(preventivo, messaggio cliente) da confermare o correggere."
            ),
        )
        return queue.id

    def registra_richiesta(
        self,
        *,
        richiesta: dict,
        preventivo: list[dict],
        messaggio_cliente: str,
        verdetto_preventivo: dict,
        verdetto_messaggio: dict,
        score_config_ids: dict[str, str],
        queue_id: str,
        documento_pdf: bytes | None = None,
    ) -> str:
        trace_id = self._client.create_trace_id(seed=richiesta["id"])

        with self._client.start_as_current_observation(
            trace_context={"trace_id": trace_id},
            name="pipeline-preventivo",
            as_type="span",
            input={"richiesta": richiesta["testo"]},
        ):
            self._osserva(
                name="esecutore",
                as_type="generation",
                input={"richiesta": richiesta["testo"]},
                output={"preventivo": preventivo, "messaggio_cliente": messaggio_cliente},
            )
            self._osserva(
                name="giudice-automatico",
                as_type="evaluator",
                input={"preventivo": preventivo, "messaggio_cliente": messaggio_cliente},
                output={"verdetto_preventivo": verdetto_preventivo, "verdetto_messaggio": verdetto_messaggio},
            )
            if documento_pdf is not None:
                # Rendering deterministico (ticket #3): il documento è referenziato sulla
                # traccia come media, così l'interfaccia può recuperarlo senza rigenerarlo.
                self._osserva(
                    name="documento-preventivo",
                    as_type="span",
                    input={},
                    output={
                        "documento": LangfuseMedia(
                            content_bytes=documento_pdf, content_type=MediaContentType.APPLICATION_PDF
                        )
                    },
                )

        self._client.create_score(
            trace_id=trace_id,
            name="verdetto_preventivo",
            value=verdetto_preventivo["esito"],
            data_type="CATEGORICAL",
            config_id=score_config_ids["verdetto_preventivo"],
            comment=verdetto_preventivo["testo"],
        )
        self._client.create_score(
            trace_id=trace_id,
            name="verdetto_messaggio",
            value=verdetto_messaggio["esito"],
            data_type="CATEGORICAL",
            config_id=score_config_ids["verdetto_messaggio"],
            comment=verdetto_messaggio["testo"],
        )

        self._client.api.annotation_queues.create_queue_item(
            queue_id=queue_id, object_id=trace_id, object_type="TRACE"
        )
        return trace_id
