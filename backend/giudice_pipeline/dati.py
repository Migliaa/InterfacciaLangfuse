"""Caricamento di catalogo e richieste da file, separati dalla logica della pipeline.

Schema documentato in data/README.md — un'azienda reale sostituisce questi file, non il codice.
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _valida_campi(dati: dict, campi: tuple[str, ...], descrizione: str, percorso: Path) -> None:
    for campo in campi:
        if campo not in dati:
            raise ValueError(f"{percorso}: {descrizione} priva del campo '{campo}'")


def carica_catalogo(percorso: Path = DATA_DIR / "catalogo.json") -> list[dict]:
    catalogo = json.loads(Path(percorso).read_text(encoding="utf-8"))
    for i, voce in enumerate(catalogo):
        _valida_campi(voce, ("voce", "unita", "prezzo_unitario"), f"voce di catalogo #{i}", percorso)
    return catalogo


def carica_richieste(percorso: Path = DATA_DIR / "richieste.json") -> list[dict]:
    richieste = json.loads(Path(percorso).read_text(encoding="utf-8"))
    for i, richiesta in enumerate(richieste):
        _valida_campi(richiesta, ("id", "testo"), f"richiesta #{i}", percorso)
    return richieste


def carica_profilo_azienda(percorso: Path = DATA_DIR / "profilo_azienda.json") -> dict:
    profilo = json.loads(Path(percorso).read_text(encoding="utf-8"))
    _valida_campi(profilo, ("nome", "colore", "email", "telefono"), "profilo azienda", percorso)
    return profilo


def formatta_catalogo(catalogo: list[dict]) -> str:
    return "\n".join(f"- {v['voce']} ({v['unita']}): {v['prezzo_unitario']}" for v in catalogo)
