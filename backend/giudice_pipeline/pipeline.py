"""Punto d'ingresso unico della pipeline (seam 1): per ogni richiesta, esecutore → giudice
automatico → registrazione su Langfuse, con un passo opzionale di rendering del documento
preventivo. Esecutore, giudice, rendering e gateway sono iniettati: nei test si passano
fake/mock, nell'uso reale le implementazioni vere (vedi run_pipeline.py)."""
from typing import Callable

from .langfuse_gateway import LangfuseGateway


def esegui_pipeline(
    catalogo: list[dict],
    richieste: list[dict],
    genera_preventivo_e_messaggio: Callable[[dict, list[dict]], dict],
    valuta: Callable[[dict, list[dict], str, list[dict]], dict],
    gateway: LangfuseGateway,
    genera_documento: Callable[[list[dict]], bytes] | None = None,
) -> list[str]:
    score_config_ids = gateway.assicura_score_configs()
    queue_id = gateway.assicura_queue(score_config_ids)

    trace_ids = []
    for richiesta in richieste:
        esecuzione = genera_preventivo_e_messaggio(richiesta, catalogo)
        verdetti = valuta(
            richiesta, esecuzione["preventivo"], esecuzione["messaggio_cliente"], catalogo
        )
        documento_pdf = genera_documento(esecuzione["preventivo"]) if genera_documento is not None else None
        trace_id = gateway.registra_richiesta(
            richiesta=richiesta,
            preventivo=esecuzione["preventivo"],
            messaggio_cliente=esecuzione["messaggio_cliente"],
            verdetto_preventivo=verdetti["verdetto_preventivo"],
            verdetto_messaggio=verdetti["verdetto_messaggio"],
            score_config_ids=score_config_ids,
            queue_id=queue_id,
            documento_pdf=documento_pdf,
        )
        trace_ids.append(trace_id)

    return trace_ids
