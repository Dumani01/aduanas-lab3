import json
from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from pypdf import PdfReader

root = Path(__file__).resolve().parent.parent
pages = json.loads((root / 'docs/investigacion.json').read_text(encoding='utf-8'))
pdfmetrics.registerFont(TTFont('Segoe', 'C:/Windows/Fonts/segoeui.ttf'))
pdfmetrics.registerFont(TTFont('SegoeBold', 'C:/Windows/Fonts/segoeuib.ttf'))
pdfmetrics.registerFontFamily('Segoe', normal='Segoe', bold='SegoeBold')
body = ParagraphStyle('Body', fontName='Segoe', fontSize=9.3, leading=14, textColor=HexColor('#405449'), spaceAfter=10)
heading = ParagraphStyle('Heading', fontName='SegoeBold', fontSize=11, leading=15, textColor=HexColor('#244d40'), spaceBefore=10, spaceAfter=5)
title = ParagraphStyle('Title', fontName='SegoeBold', fontSize=24, leading=30, textColor=HexColor('#1c3c2c'), spaceAfter=10)
subtitle = ParagraphStyle('Subtitle', fontName='Segoe', fontSize=10, leading=15, textColor=HexColor('#7a8b72'), spaceAfter=18)
reference = ParagraphStyle('Reference', parent=body, fontSize=7.3, leading=10, spaceAfter=3, wordWrap='CJK')
refheading = ParagraphStyle('RefHeading', parent=heading, fontSize=8, leading=10, spaceBefore=4, spaceAfter=2)

def decorate(canvas, doc):
    canvas.setStrokeColor(HexColor('#dce4d6'))
    canvas.line(48, 798, 547, 798)
    canvas.setFillColor(HexColor('#6f8067'))
    canvas.setFont('Segoe', 8)
    canvas.drawString(48, 811, 'ADUANA / LABORATORIO 3')
    canvas.drawRightString(547, 811, 'INVESTIGACIÓN APLICADA')
    canvas.line(48, 43, 547, 43)
    canvas.drawString(48, 29, 'Borrador académico · Integrantes pendientes · 23-10-2026')
    canvas.drawRightString(547, 29, f'{doc.page} / 5')

out = root / 'output/pdf'
out.mkdir(parents=True, exist_ok=True)
target = out / 'Investigacion_Lab3.pdf'
doc = SimpleDocTemplate(str(target), pagesize=(595.28, 841.89), topMargin=62, bottomMargin=58, leftMargin=48, rightMargin=48)
story = []
md = '# Investigación aplicada: inventario aduanero\n\n'
for i, page in enumerate(pages):
    if i: story.append(PageBreak())
    story.extend([Paragraph(escape(page['title']), title), Paragraph(escape(page['subtitle']), subtitle)])
    md += f"\n## {page['title']}\n\n"
    for name, text in page['sections']:
        isref = name.startswith('[')
        story.append(Paragraph(escape(name), refheading if isref else heading))
        story.append(Paragraph(escape(text), reference if isref else body))
        md += f'### {name}\n\n{text}\n\n'
doc.build(story, onFirstPage=decorate, onLaterPages=decorate)
reader = PdfReader(target)
if len(reader.pages) != 5:
    raise RuntimeError(f'Revisar maquetación: {len(reader.pages)} páginas, se esperaban 5')
(root / 'docs/investigacion.md').write_text(md, encoding='utf-8')
(root / 'entrega/PENDIENTE_Nombre_Investigacion_Lab3.pdf').write_bytes(target.read_bytes())
print('PDF de investigación: 5 páginas. Pendiente revisión visual de los renders.')
