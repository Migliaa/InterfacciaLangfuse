import ast
import inspect
from io import BytesIO

from pypdf import PdfReader

import giudice_pipeline.documento as documento
from giudice_pipeline.documento import genera_documento_preventivo

PROFILO_AZIENDA = {"nome": "ACME", "colore": "#1A5276", "email": "info@acme.it", "telefono": "+39 02 0000000"}
PREVENTIVO = [
    {"voce": "Tinteggiatura pareti", "quantita": 40, "prezzo_unitario": 12.0, "totale": 480.0},
    {"voce": "Sopralluogo", "quantita": 1, "prezzo_unitario": 50.0, "totale": 50.0},
]


def _testo_pdf(contenuto: bytes) -> str:
    lettore = PdfReader(BytesIO(contenuto))
    return "".join(pagina.extract_text() or "" for pagina in lettore.pages)


def test_genera_documento_preventivo_produce_un_pdf_valido():
    contenuto = genera_documento_preventivo(PREVENTIVO, PROFILO_AZIENDA)
    assert contenuto.startswith(b"%PDF")
    assert len(PdfReader(BytesIO(contenuto)).pages) >= 1


def test_genera_documento_preventivo_contiene_nome_azienda_e_voci_del_preventivo():
    testo = _testo_pdf(genera_documento_preventivo(PREVENTIVO, PROFILO_AZIENDA))
    assert "ACME" in testo
    assert "Tinteggiatura pareti" in testo
    assert "Sopralluogo" in testo


def test_genera_documento_preventivo_non_importa_il_client_llm():
    albero = ast.parse(inspect.getsource(documento))
    moduli_importati = set()
    for nodo in ast.walk(albero):
        if isinstance(nodo, ast.ImportFrom) and nodo.module:
            moduli_importati.add(nodo.module)
        elif isinstance(nodo, ast.Import):
            moduli_importati.update(alias.name for alias in nodo.names)
    assert not any("claude_cli" in m for m in moduli_importati)
