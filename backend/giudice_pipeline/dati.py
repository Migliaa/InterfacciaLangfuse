"""Caricamento di catalogo e richieste da file, separati dalla logica della pipeline.

Schema documentato in data/README.md — un'azienda reale sostituisce questi file, non il codice.
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def carica_catalogo(percorso: Path = DATA_DIR / "catalogo.json") -> list[dict]:
    catalogo = json.loads(Path(percorso).read_text(encoding="utf-8"))
    for i, voce in enumerate(catalogo):
        for campo in ("voce", "unita", "prezzo_unitario"):
            if campo not in voce:
                raise ValueError(f"{percorso}: voce di catalogo #{i} priva del campo '{campo}'")
    return catalogo


def carica_richieste(percorso: Path = DATA_DIR / "richieste.json") -> list[dict]:
    richieste = json.loads(Path(percorso).read_text(encoding="utf-8"))
    for i, richiesta in enumerate(richieste):
        for campo in ("id", "testo"):
            if campo not in richiesta:
                raise ValueError(f"{percorso}: richiesta #{i} priva del campo '{campo}'")
    return richieste


def formatta_catalogo(catalogo: list[dict]) -> str:
    return "\n".join(f"- {v['voce']} ({v['unita']}): {v['prezzo_unitario']}" for v in catalogo)
