"""L'esecutore: genera preventivo e messaggio cliente da una richiesta. Solo contenuto che
richiede interpretazione — il documento PDF è un rendering deterministico a parte (ticket #3)."""
from typing import Callable

from .claude_cli import genera_testo
from .dati import formatta_catalogo
from .json_utils import estrai_json

_CAMPI_RIGA_PREVENTIVO = ("voce", "quantita", "prezzo_unitario", "totale")

_PROMPT = """Sei l'ufficio commerciale di un'azienda di servizi. Rispondi SOLO con un oggetto \
JSON valido, senza testo prima o dopo, con questa forma esatta:

{{
  "preventivo": [
    {{"voce": "...", "quantita": 0, "prezzo_unitario": 0.0, "totale": 0.0}}
  ],
  "messaggio_cliente": "testo dell'email da inviare al cliente, in italiano, tono professionale"
}}

Componi il preventivo usando solo voci presenti nel catalogo sottostante, con i prezzi unitari
del catalogo. Ogni riga deve avere tutti e quattro i campi (voce, quantita, prezzo_unitario,
totale) — nessuno omesso. Il messaggio_cliente deve fare riferimento a quello che il cliente ha
chiesto.

Catalogo servizi disponibili (voce, unità, prezzo unitario):
{catalogo}

Richiesta del cliente:
{richiesta}
"""


_CAMPI_NUMERICI_RIGA_PREVENTIVO = ("quantita", "prezzo_unitario", "totale")


def _valida_preventivo(preventivo: list[dict]) -> None:
    for i, riga in enumerate(preventivo):
        mancanti = [c for c in _CAMPI_RIGA_PREVENTIVO if c not in riga]
        if mancanti:
            raise ValueError(f"riga di preventivo #{i} priva dei campi {mancanti}: {riga}")
        non_numerici = [
            c for c in _CAMPI_NUMERICI_RIGA_PREVENTIVO if isinstance(riga[c], bool) or not isinstance(riga[c], (int, float))
        ]
        if non_numerici:
            raise ValueError(f"riga di preventivo #{i} con campi non numerici {non_numerici}: {riga}")


def genera_preventivo_e_messaggio(
    richiesta: dict, catalogo: list[dict], chiama_llm: Callable[[str], str] = genera_testo
) -> dict:
    prompt = _PROMPT.format(catalogo=formatta_catalogo(catalogo), richiesta=richiesta["testo"])
    dati = estrai_json(chiama_llm(prompt))

    if "preventivo" not in dati:
        raise ValueError("output dell'esecutore privo del campo 'preventivo'")
    if "messaggio_cliente" not in dati:
        raise ValueError("output dell'esecutore privo del campo 'messaggio_cliente'")

    _valida_preventivo(dati["preventivo"])

    return dati
