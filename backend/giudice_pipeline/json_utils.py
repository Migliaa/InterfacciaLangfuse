"""Estrazione di JSON dall'output testuale di un LLM, tollerante a code fence markdown."""
import json
import re

_FENCE_APERTURA = re.compile(r"^```[a-zA-Z]*\n?")
_FENCE_CHIUSURA = re.compile(r"\n?```$")


def estrai_json(testo: str) -> dict:
    pulito = testo.strip()
    if pulito.startswith("```"):
        pulito = _FENCE_APERTURA.sub("", pulito, count=1)
        pulito = _FENCE_CHIUSURA.sub("", pulito, count=1)
    return json.loads(pulito.strip())
