"""Il giudice automatico: due verdetti separati (preventivo, messaggio), non uno unico — per
poter capire in quale dei due l'esecutore ha sbagliato e filtrare di conseguenza su Langfuse."""
from typing import Callable

from .claude_cli import genera_testo
from .dati import formatta_catalogo
from .json_utils import estrai_json

ESITI_VALIDI = {"si", "da_rivedere", "no"}

_PROMPT = """Sei un revisore interno che controlla preventivi commerciali prima che un umano \
li approvi definitivamente. Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo,
con questa forma esatta:

{{
  "verdetto_preventivo": {{"esito": "si|da_rivedere|no", "testo": "motivazione breve"}},
  "verdetto_messaggio": {{"esito": "si|da_rivedere|no", "testo": "motivazione breve"}}
}}

Valuta il preventivo confrontandolo col catalogo e con la richiesta: le voci e i prezzi sono
coerenti? manca qualcosa che il catalogo richiederebbe per questo tipo di servizio?
Valuta separatamente il messaggio cliente: il tono è professionale, e fa riferimento corretto a
quanto richiesto e a quanto contenuto nel preventivo (es. eventuali maggiorazioni)?

Catalogo servizi disponibili (voce, unità, prezzo unitario):
{catalogo}

Richiesta del cliente:
{richiesta}

Preventivo generato (voce, quantità, prezzo unitario, totale):
{preventivo}

Messaggio cliente generato:
{messaggio_cliente}
"""


def _formatta_preventivo(preventivo: list[dict]) -> str:
    return "\n".join(
        f"- {r['voce']} · {r.get('quantita', '')} · {r.get('prezzo_unitario', '')} · totale {r.get('totale', '')}"
        for r in preventivo
    )


def _valida_verdetto(verdetto: dict, nome_campo: str) -> None:
    if "esito" not in verdetto or "testo" not in verdetto:
        raise ValueError(f"{nome_campo} privo di 'esito' o 'testo'")
    if verdetto["esito"] not in ESITI_VALIDI:
        raise ValueError(f"esito non valido in {nome_campo}: {verdetto['esito']!r}, atteso uno di {ESITI_VALIDI}")


def valuta(
    richiesta: dict,
    preventivo: list[dict],
    messaggio_cliente: str,
    catalogo: list[dict],
    chiama_llm: Callable[[str], str] = genera_testo,
) -> dict:
    prompt = _PROMPT.format(
        catalogo=formatta_catalogo(catalogo),
        richiesta=richiesta["testo"],
        preventivo=_formatta_preventivo(preventivo),
        messaggio_cliente=messaggio_cliente,
    )
    dati = estrai_json(chiama_llm(prompt))

    if "verdetto_preventivo" not in dati:
        raise ValueError("output del giudice automatico privo del campo 'verdetto_preventivo'")
    if "verdetto_messaggio" not in dati:
        raise ValueError("output del giudice automatico privo del campo 'verdetto_messaggio'")

    _valida_verdetto(dati["verdetto_preventivo"], "verdetto_preventivo")
    _valida_verdetto(dati["verdetto_messaggio"], "verdetto_messaggio")

    return dati
