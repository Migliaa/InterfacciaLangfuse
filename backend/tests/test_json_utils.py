from giudice_pipeline.json_utils import estrai_json


def test_estrai_json_da_testo_puro():
    assert estrai_json('{"a": 1}') == {"a": 1}


def test_estrai_json_da_code_fence_markdown():
    testo = '```json\n{"a": 1, "b": [1, 2]}\n```'
    assert estrai_json(testo) == {"a": 1, "b": [1, 2]}


def test_estrai_json_con_spazi_attorno():
    testo = '  \n```\n{"a": true}\n```  '
    assert estrai_json(testo) == {"a": True}


def test_estrai_json_rimuove_solo_il_fence_esterno_non_backtick_interni():
    # i backtick dentro un valore stringa non devono essere confusi col fence che avvolge
    # l'intero blocco: si rimuove solo l'apertura/chiusura più esterna, non ogni riga che
    # inizia o finisce per backtick.
    testo = '```json\n{"messaggio_cliente": "prezzo di riferimento: ```960€```"}\n```'
    assert estrai_json(testo) == {"messaggio_cliente": "prezzo di riferimento: ```960€```"}
