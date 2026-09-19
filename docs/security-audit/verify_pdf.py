"""QA local de páginas rasterizadas. Não requer rede nem instala dependências."""
import json
import hashlib
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
from pypdf import PdfReader
HERE=Path(__file__).resolve().parent
ROOT=HERE.parent.parent
PDF=HERE/'relatorio-auditoria-seguranca.pdf'
PREVIEW=ROOT/'tmp/pdfs/security-audit-preview'
reader=PdfReader(PDF)
pages=sorted(PREVIEW.glob('final-*.png'))
assert len(pages)==len(reader.pages),(len(pages),len(reader.pages))
font=ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf',17)
contacts=[]
for offset in range(0,len(pages),12):
    group=pages[offset:offset+12]
    sheet=Image.new('RGB',(4*330,3*465),'#DAE3E8')
    draw=ImageDraw.Draw(sheet)
    for j,path in enumerate(group):
        image=Image.open(path).convert('RGB');image.thumbnail((310,432))
        x=(j%4)*330+10;y=(j//4)*465+7
        sheet.paste(image,(x,y));draw.text((x,y+435),f'Página {offset+j+1}',font=font,fill='#172B3A')
    target=PREVIEW/f'contact-{offset//12+1:02}.jpg';sheet.save(target,quality=90);contacts.append(str(target.relative_to(ROOT)))
bad=[]
for i,page in enumerate(reader.pages,1):
    text=page.extract_text() or ''
    if '\x00' in text or '\ufffd' in text:bad.append(i)
assert not bad,('Caractere ausente detectado',bad)
result={'pages':len(pages),'all_pages_rasterized':True,'missing_glyph_text_pages':bad,'contact_sheets':contacts,'pdf_sha256':hashlib.sha256(PDF.read_bytes()).hexdigest(),'manual_visual_review':'pending'}
(HERE/'visual-qa.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(result,ensure_ascii=False,indent=2))
