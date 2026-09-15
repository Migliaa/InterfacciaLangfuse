"""Rendering deterministico del documento preventivo (PDF) — nessuna interpretazione di
contenuto: se il preventivo esiste già come dato strutturato, qui ci si limita a impaginarlo.
Nessuna chiamata a un LLM in questo modulo."""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def genera_documento_preventivo(preventivo: list[dict], profilo_azienda: dict) -> bytes:
    buffer = BytesIO()
    documento = SimpleDocTemplate(
        buffer, pagesize=A4, topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=20 * mm, rightMargin=20 * mm
    )
    colore_brand = colors.HexColor(profilo_azienda["colore"])
    stili = getSampleStyleSheet()

    # Area profilo azienda: visivamente distinta (colore del brand) e l'unica parte del
    # documento che dipende dai dati dell'azienda cliente, non dal preventivo.
    stile_nome_azienda = ParagraphStyle("nome_azienda", parent=stili["Title"], textColor=colore_brand)
    contatti = f"{profilo_azienda['email']} · {profilo_azienda['telefono']}"

    intestazione_tabella = ["Voce", "Quantità", "Prezzo unitario", "Totale"]
    righe_tabella = [intestazione_tabella] + [
        [riga["voce"], str(riga["quantita"]), f"{riga['prezzo_unitario']:.2f}", f"{riga['totale']:.2f}"]
        for riga in preventivo
    ]
    # Larghezze entro l'area utile della pagina: A4 (210mm) meno 20mm di margine per lato = 170mm.
    tabella = Table(righe_tabella, colWidths=[70 * mm, 25 * mm, 35 * mm, 35 * mm])
    tabella.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colore_brand),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
            ]
        )
    )

    totale_generale = sum(riga["totale"] for riga in preventivo)

    documento.build(
        [
            Paragraph(profilo_azienda["nome"], stile_nome_azienda),
            Paragraph(contatti, stili["Normal"]),
            Spacer(1, 10 * mm),
            Paragraph("Preventivo", stili["Heading2"]),
            tabella,
            Spacer(1, 5 * mm),
            Paragraph(f"Totale: {totale_generale:.2f}", stili["Heading3"]),
        ]
    )
    return buffer.getvalue()
