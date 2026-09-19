"""Gera PDF, Markdown, issues e matriz de cobertura sem acessar rede ou banco.

Requer reportlab e pypdf. Conteúdo manual em audit_content.py; inventário em
scan-evidence.json. Não modifica o código da aplicação. Falha se a evidência
congelada já existir e não corresponder aos arquivos atuais (revisão necessária).
"""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
import copy
import hashlib
import html
import json
from pathlib import Path
import re
import textwrap

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Preformatted, XPreformatted, Flowable, KeepTogether, CondPageBreak
from pypdf import PdfReader
from audit_content import PROJECT, DATE, HEAD, FINDINGS, CATEGORIES, MAPPING, STRENGTHS, GATES, CONTROLLERS, PRIORITIES, REFERENCES

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
W, H = A4
MARGIN = 56.7
WIDTH = W - 2*MARGIN
COLORS = {'crítica':'#B91C1C','alta':'#EA580C','média':'#D97706','baixa':'#2563EB','informativa':'#64748B','forte':'#059669'}
NAVY = '#172B3A'
INK = '#243746'
MUTED = '#526675'
LIGHT = '#F2F6F8'
LIME = '#ABFF10'

for name, filename in [('Audit','segoeui.ttf'),('AuditBold','segoeuib.ttf'),('AuditItalic','segoeuii.ttf'),('AuditMono','consola.ttf'),('AuditSymbols','seguisym.ttf')]:
    pdfmetrics.registerFont(TTFont(name,str(Path('C:/Windows/Fonts')/filename)))
pdfmetrics.registerFontFamily('Audit',normal='Audit',bold='AuditBold',italic='AuditItalic',boldItalic='AuditBold')

styles = {
 'body':ParagraphStyle('Body',fontName='Audit',fontSize=9.3,leading=13.1,textColor=colors.HexColor(INK),spaceAfter=7),
 'small':ParagraphStyle('Small',fontName='Audit',fontSize=8.2,leading=11.2,textColor=colors.HexColor(MUTED),spaceAfter=5),
 'h1':ParagraphStyle('H1',fontName='AuditBold',fontSize=21,leading=25,textColor=colors.HexColor(NAVY),spaceAfter=13,keepWithNext=True),
 'h2':ParagraphStyle('H2',fontName='AuditBold',fontSize=13.2,leading=17,textColor=colors.HexColor(NAVY),spaceBefore=9,spaceAfter=8,keepWithNext=True),
 'h3':ParagraphStyle('H3',fontName='AuditBold',fontSize=10.2,leading=14,textColor=colors.HexColor(NAVY),spaceBefore=8,spaceAfter=5,keepWithNext=True),
 'strong':ParagraphStyle('Strong',fontName='AuditBold',fontSize=13.2,leading=17,textColor=colors.HexColor(COLORS['forte']),spaceBefore=9,spaceAfter=8,keepWithNext=True),
 'cell':ParagraphStyle('Cell',fontName='Audit',fontSize=8,leading=10.7,textColor=colors.HexColor(INK),splitLongWords=True,spaceAfter=1),
 'head':ParagraphStyle('Head',fontName='AuditBold',fontSize=8,leading=11,textColor=colors.white),
 'code':ParagraphStyle('Code',fontName='AuditMono',fontSize=7.2,leading=9.6,textColor=colors.HexColor(INK),backColor=colors.HexColor(LIGHT),borderPadding=7,spaceBefore=3,spaceAfter=8),
 'issue':ParagraphStyle('Issue',fontName='AuditMono',fontSize=7.9,leading=10.6,textColor=colors.HexColor(INK),backColor=colors.HexColor('#F7F9FA'),borderPadding=7,spaceAfter=2),
}

def p(text, kind='body'):
    return Paragraph(html.escape(str(text)).replace('\n','<br/>'),styles[kind])

def tagged(label,text):
    return Paragraph('<b>'+html.escape(label)+'</b> '+html.escape(text),styles['body'])

def table(headers,rows,widths):
    cells=[[p(x,'head') for x in headers]]+[[v if isinstance(v,Flowable) else p(v,'cell') for v in row] for row in rows]
    t=Table(cells,colWidths=widths,repeatRows=1,hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),colors.HexColor(NAVY)),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),7),('BOTTOMPADDING',(0,0),(-1,-1),7),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor(LIGHT)]),('LINEBELOW',(0,0),(-1,0),.6,colors.HexColor(NAVY)),('LINEBELOW',(0,1),(-1,-1),.3,colors.HexColor('#DBE4EA'))]))
    return t

class Chip(Flowable):
    def __init__(self,severity):super().__init__();self.severity=severity;self.width=55;self.height=18
    def draw(self):
        c=self.canv;c.setFillColor(colors.HexColor(COLORS[self.severity]));c.roundRect(0,0,55,17,5,fill=1,stroke=0);c.setFillColor(colors.white);c.setFont('AuditBold',8);c.drawCentredString(27.5,5,self.severity.upper())

class SummaryCharts(Flowable):
    def __init__(self,findings):super().__init__();self.findings=findings;self.width=WIDTH;self.height=280
    def draw(self):
        c=self.canv;counts=Counter(f['severity'] for f in self.findings);cats=Counter(f['category'] for f in self.findings)
        c.setFillColor(colors.HexColor(NAVY));c.setFont('AuditBold',11);c.drawString(0,264,'Achados por severidade');c.drawString(254,264,'Achados por categoria')
        x,y,r=82,161,66;angle=90;total=len(self.findings)
        for severity in ['crítica','alta','média','baixa','informativa']:
            count=counts[severity]
            if count:
                extent=360*count/total;c.setFillColor(colors.HexColor(COLORS[severity]));c.wedge(x-r,y-r,x+r,y+r,angle,extent,fill=1,stroke=0);angle+=extent
        c.setFillColor(colors.white);c.circle(x,y,43,fill=1,stroke=0);c.setFillColor(colors.HexColor(NAVY));c.setFont('AuditBold',30);c.drawCentredString(x,y-2,str(total));c.setFont('Audit',9);c.drawCentredString(x,y-19,'achados')
        for i,severity in enumerate(['crítica','alta','média','baixa','informativa']):
            yy=70-i*13;c.setFillColor(colors.HexColor(COLORS[severity]));c.roundRect(0,yy,8,8,2,fill=1,stroke=0);c.setFillColor(colors.HexColor(INK));c.setFont('Audit',8.5);c.drawString(15,yy+1,f'{severity.capitalize()}: {counts[severity]}')
        short={1:'Isolamento',2:'Autorização',3:'IDOR',4:'Segredos',5:'XSS',6:'Adicional / hashes'}
        for i,cat in enumerate(CATEGORIES):
            yy=225-i*34;c.setFont('Audit',8.6);c.setFillColor(colors.HexColor(INK));c.drawString(254,yy+13,short[cat]);c.setFillColor(colors.HexColor('#E7EDF1'));c.roundRect(254,yy-1,184,9,3,fill=1,stroke=0);c.setFillColor(colors.HexColor('#31566C'));c.roundRect(254,yy-1,184*cats[cat]/3,9,3,fill=1,stroke=0);c.setFont('AuditBold',9);c.drawString(446,yy,str(cats[cat]))

class Cover(Flowable):
    def __init__(self):super().__init__();self.width=WIDTH;self.height=H-2*MARGIN-30
    def draw(self):
        c=self.canv;c.setFillColor(colors.HexColor(NAVY));c.roundRect(-15,0,WIDTH+30,self.height,12,fill=1,stroke=0)
        c.setFillColor(colors.HexColor(LIME));c.rect(20,self.height-64,46,5,fill=1,stroke=0)
        c.setFont('AuditBold',11);c.drawString(20,self.height-96,'ZYLLEN / REVISÃO DE CÓDIGO')
        def para(text,y,size=12,leading=18,color='#FFFFFF',bold=False):
            st=ParagraphStyle('cover',fontName='AuditBold' if bold else 'Audit',fontSize=size,leading=leading,textColor=colors.HexColor(color))
            el=Paragraph(html.escape(text),st);_,height=el.wrap(WIDTH-40,500);el.drawOn(c,20,y-height);return y-height
        y=para('Relatório de Auditoria de Segurança — Zyllen Gestão',self.height-132,30,37,bold=True)
        y=para(DATE,y-24,12,17,color='#C8D6DE')
        y=para('12 achados • 7 altos • 5 médios',y-29,15,22,color=LIME,bold=True)
        y=para('198 handlers • 20 controllers • 15 verificações isoladas',y-12,11,16)
        y=para('ESCOPO',y-32,10,15,color=LIME,bold=True)
        y=para('API NestJS/Prisma, frontend Next.js/React, schemas compartilhados, configuração/deploy, documentação, histórico Git local e bundle frontend disponível.',y-7,11,17)
        y=para('NOTA METODOLÓGICA',y-23,10,15,color=LIME,bold=True)
        y=para('As cinco categorias foram adaptadas ao isolamento manual por empresa/dono, aos guards RBAC, aos IDs das rotas NestJS, aos segredos de bootstrap/deploy e aos sinks HTML da aplicação. RLS real e configuração de produção não foram consultados.',y-7,10.3,16)
        para('Referência: '+HEAD+' • Leitura e testes sintéticos. Nenhuma conexão ao banco compartilhado; nenhuma alteração ou exploração em produção.',48,8.2,12,color='#C8D6DE')

class NumberedCanvas(canvas.Canvas):
    def __init__(self,*args,**kwargs):super().__init__(*args,**kwargs);self.saved=[]
    def showPage(self):self.saved.append(dict(self.__dict__));self._startPage()
    def save(self):
        total=len(self.saved)
        for state in self.saved:
            self.__dict__.update(state);self.saveState();self.setFont('Audit',8);self.setFillColor(colors.HexColor(MUTED));self.drawString(MARGIN,27,'Zyllen Gestão | Auditoria de Segurança');self.drawRightString(W-MARGIN,27,f'{self._pageNumber} / {total}');self.restoreState();super().showPage()
        super().save()

def page_header(c,doc):
    if doc.page>1:
        c.saveState();c.setFillColor(colors.HexColor(MUTED));c.setFont('Audit',8);c.drawString(MARGIN,H-31,'RELATÓRIO DE AUDITORIA DE SEGURANÇA — ZYLLEN GESTÃO');c.setStrokeColor(colors.HexColor('#D5E0E7'));c.line(MARGIN,H-39,W-MARGIN,H-39);c.restoreState()

def location(r):return f"{r['file']}:{r['start']}"+(f"-{r['end']}" if r['end']!=r['start'] else '')

def redact(line,file):
    if file=='apps/api/prisma/seed.ts':
        line=re.sub(r"bcrypt\.hash\('([^']+)'",lambda m:"bcrypt.hash('[CREDENCIAL_PADRAO_REDIGIDA]'",line)
        line=re.sub(r'PIN:\s*\d{4}', 'PIN: [PIN_REDIGIDO]',line)
    if file=='PROJETO.md':
        line=re.sub(r'((?:senha|PIN):\s*)`[^`]+`',r'\1`[CREDENCIAL_REDIGIDA]`',line,flags=re.I)
    return line

def evidence():
    findings=copy.deepcopy(FINDINGS);hashes={}
    for f in findings:
        for r in f['refs']:
            source=(ROOT/r['file']).read_text(encoding='utf-8');lines=source.splitlines()
            assert 1<=r['start']<=r['end']<=len(lines),location(r)
            hashes[r['file']]=hashlib.sha256(source.encode()).hexdigest()
            r['code']='\n'.join(f'{i}: {redact(lines[i-1],r["file"])}' for i in range(r['start'],r['end']+1))
    snapshot={'head':HEAD,'source_sha256':hashes}
    target=HERE/'source-manifest.json'
    if target.exists() and json.loads(target.read_text(encoding='utf-8'))!=snapshot:
        raise SystemExit('Evidência mudou. Revise conteúdo/linhas antes de renovar source-manifest.json; não reutilize achados automaticamente.')
    target.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (HERE/'findings.json').write_text(json.dumps({'project':PROJECT,'date':DATE,'head':HEAD,'findings':findings},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    return findings

def route_result(r):
    name=Path(r['file']).name;route=r['route'];issues=[]
    if 'Public()' in r['decorators']:issues.append('A03')
    if route=='/register/client':issues+=['A01','A02']
    if route=='/contractor/maintenance' and r['method']=='POST':issues.append('A04')
    if route.endswith('/assign-with-pin'):issues.append('A05')
    if route.endswith('/witness-signature') or (name in ['maintenance.controller.ts','contractor-maintenance.controller.ts'] and r['handler']=='removeFollowupBlock'):issues.append('A06')
    if route=='/maintenance/:id/status':issues.append('A07')
    if any('FilesInterceptor' in d for d in r['decorators']):issues.append('A10')
    if name=='labels.controller.ts' and r['method'] in ['POST','PUT'] and '/templates' in route:issues.append('A11')
    if route=='/clients/users' and r['method']=='GET':issues.append('A12')
    permission=next((d for d in r['decorators'] if d.startswith('RequirePermission')),None)
    if permission:policy=permission.removeprefix('RequirePermission(').removesuffix(')').replace("'",'')+'; interno/global'
    elif 'Public()' in r['decorators']:policy='Público; apenas relação dos IDs pai/filho'
    elif name=='client-maintenance.controller.ts' or name=='client-followups.controller.ts':policy='JWT + tipo externo + companyId do chamador'
    elif name=='contractor-maintenance.controller.ts':policy='JWT + contractor + dono da OS (criação fixa autor)'
    elif name=='client-tickets.controller.ts':policy='JWT + externo + externalUserId do chamador'
    elif name=='auth.controller.ts':policy='Fluxo público de sessão' if r['handler'] in ['login','refresh','logout'] else 'JWT + identidade do chamador; sem ID alheio livre'
    elif name=='tickets.controller.ts':policy='JWT + req.user.id; posse no fluxo my-internal'
    else:policy='Público de cadastro/login/health; sem guard RBAC'
    return {'policy':policy,'result':', '.join(issues) if issues else 'Controle observado', 'findings':issues}

def coverage(scan):
    rows=[dict(r,**route_result(r)) for r in scan['routes']]
    assert len(rows)==198 and len({r['file'] for r in rows})==20
    (HERE/'route-coverage.json').write_text(json.dumps({'head':HEAD,'handlers':len(rows),'controllers':20,'routes':rows},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    lines=['# Cobertura de rotas — Zyllen Gestão','',f'Base: `{HEAD}`. 198 handlers / 20 controllers.','', 'Controle observado significa que a fronteira de autorização pertinente foi localizada; não certifica ausência de toda vulnerabilidade. Recursos internos são globais sob RBAC. A01/A02 comprometem o ingresso na empresa mesmo quando o filtro downstream está correto. /uploads é superfície adicional fora dos 198 handlers.','']
    for filename, group in group_routes(rows).items():
        lines+=['## '+filename,'',CONTROLLERS[Path(filename).name],'','| Linhas | Método e rota | Política | Resultado |','|---|---|---|---|']
        for r in group:lines.append(f"| {r['line']}-{r['endLine']} | `{r['method']} {r['route']}` | {r['policy'].replace('|','/')} | {r['result']} |")
        lines.append('')
    (HERE/'route-coverage.md').write_text('\n'.join(lines),encoding='utf-8')
    return rows

def group_routes(rows):
    groups=defaultdict(list)
    for r in rows:groups[r['file']].append(r)
    return groups

def issue_text(f,index):
    # Evidência principal com trecho + relação completa dos demais pontos.
    pick={'A01':[1,2],'A02':[1],'A03':[0,7],'A04':[1,3],'A05':[2],'A06':[2,3],'A07':[1,3],'A08':[0],'A09':[0,1],'A10':[0,1,2],'A11':[3,5],'A12':[1]}
    refs=f['refs'];chosen=pick[f['id']]
    out=[f'--- ISSUE {index} ---',f'# [Segurança] {f["title"]}',f'Labels sugeridas: security, {f["severity"]}','',f'Identificador: {f["id"]} | Base: {HEAD}','', '## Problema e explorabilidade',f['problem'],'',f['condition'],'','## Evidência']
    for i in chosen:
        r=refs[i];out += [location(r),'```ts',r['code'],'```','']
    others=[location(r) for i,r in enumerate(refs) if i not in chosen]
    if others:out+=['Demais pontos do mesmo achado:']+['- '+x for x in others]+['']
    out+=['Validação: '+f['proof'],'','## Impacto',f['impact'],'','## Sugestão de correção',f['fix'],'','## Critérios de aceite']+['- [ ] '+s for s in f['acceptance']]+['','Nota: não executar testes em dados reais nem publicar segredos. Usar fixtures e banco isolado.',f'--- FIM ISSUE {index} ---']
    return '\n'.join(out)

def wrap_code(text,limit=101):
    # Mantém números originais; continuação indentada não recebe falso número.
    result=[]
    for line in text.splitlines():
        if len(line)>limit:result.extend(textwrap.wrap(line,limit,subsequent_indent='    ',replace_whitespace=False,drop_whitespace=False,break_long_words=True,break_on_hyphens=False))
        else:result.append(line)
    return '\n'.join(result)

def code_flow(text,issue=False):
    safe=html.escape(wrap_code(text,104 if issue else 107)).replace('✅','<font name="AuditSymbols">✅</font>')
    return XPreformatted(safe,styles['issue' if issue else 'code'])

def markdown(findings,scan,issues):
    out=[f'# Relatório de Auditoria de Segurança — {PROJECT}','',DATE,f'Base: `{HEAD}`','', '## Resumo','', '12 achados: 7 altos, 5 médios. Onze nas cinco categorias pedidas e um adicional (A12). Nenhuma crítica/baixa/informativa contabilizada. Severidade contextual; não é pontuação CVSS.','', '198 handlers / 20 controllers; 222 arquivos textuais atuais; 133 commits / 744 blobs textuais / 30 binários excluídos; bundle local de 56 JS/map (2.223.711 bytes). 13 testes de métodos reais e 2 provas em Chrome isolado. Sem banco, login ou exploração em produção.','', '## Mapeamento para a stack','']
    for name,text in MAPPING:out+=['### '+name,'',text,'']
    out+=['## Pontos fortes','']
    for title,loc,body in STRENGTHS:out+=['### '+title,'',body,'',loc,'']
    out+=['## Achados','']
    for f in findings:
        out += [f'### {f["id"]} · {f["severity"].upper()} · {f["title"]}', '', 'Categoria: '+CATEGORIES[f['category']],'']
        for label,key in [('Problema','problem'),('Condições','condition'),('Impacto','impact'),('Verificação','proof')]:out += ['**'+label+':** '+f[key],'']
        for r in f['refs']:out += [location(r)+((' — '+r['note']) if r['note'] else ''),'```ts',r['code'],'```','']
        out+=['**Correção sugerida:** '+f['fix'],'']
    out+=['## Recomendações priorizadas','']
    for priority,title,ids,body in PRIORITIES:out += [f'### {priority} — {title} ({ids})','',body,'']
    out+=['## Referências complementares','']
    for title,url,why in REFERENCES:out+=[why+' ['+title+']('+url+').','']
    out+=['## ISSUES PARA O GITHUB','',*issues]
    (HERE/'relatorio-auditoria-seguranca.md').write_text('\n'.join(out)+'\n',encoding='utf-8')
    (HERE/'github-issues.md').write_text('# ISSUES PARA O GITHUB\n\n'+'\n\n'.join(issues)+'\n',encoding='utf-8')

def build_pdf(findings,scan,rows,issues):
    story=[Cover(),PageBreak(),p('Resumo executivo','h1'),p('As fronteiras de autorização existem, mas o ingresso na empresa e algumas rotas alternativas permitem contorná-las. Os riscos centrais são acesso cruzado a OS, exposição de mídias, alteração de patrimônio e XSS persistente.'),SummaryCharts(findings),p('Contagem sem duplicidade: 11 achados nas cinco categorias solicitadas e 1 adicional de exposição de hashes. Um achado pode ter vários arquivos/rotas; A03 agrupa sete handlers públicos mais /uploads. Não há achado crítico, baixo ou informativo contabilizado. Severidade contextual, sem atribuição de CVSS.','small')]
    story += [table(['Cobertura','Resultado'],[['Handlers / controllers','198 / 20 — inventário completo, sem amostragem de rotas'],['Histórico local','133 commits; 744 blobs textuais; 30 objetos binários excluídos'],['Bundle disponível','56 arquivos JS/map; 2.223.711 bytes; Build ID '+scan['bundle']['buildId']],['Validações','13 testes offline + 2 reproduções em Chrome isolado'],['Produção','Nenhuma conexão ao banco ou chamada à aplicação de produção']],[140,WIDTH-140])]
    story += [PageBreak(),p('Stack e método','h1'),table(['Camada','Detectado'],[['Linguagem / workspace','TypeScript strict; monorepo pnpm; pacote compartilhado Zod'],['Backend / dados','NestJS 10; Prisma 6; PostgreSQL no Supabase; conexão de servidor'],['Autenticação','Passport-JWT; access/refresh; três tipos: internal, external, contractor; RBAC screen.action'],['Frontend','Next.js 16.1.6 App Router; React 19.2.3; três portais; localStorage para tokens'],['Deploy encontrado','Dockerfiles API/web; docker-compose.yml; GitHub Actions deploy.yml; ecosystem.config.js; Vercel configs. Documentação indica API manual Windows/Cloudflare e frontend Vercel.'],['Não aplicável / não encontrado','Não há Helm/Terraform no escopo localizado; nem backend de e-mail/markdown com HTML de usuário identificado.']],[110,WIDTH-110])]
    for title,body in MAPPING:story += [p(title,'h2'),p(body)]
    story += [p('Limites da conclusão','h2'),p('Auditoria estática com reproduções locais dirigidas; não é pentest remoto nem certificação de segurança. Todas as rotas foram percorridas, mas a execução dinâmica ficou nos 15 casos registrados. O banco compartilhado, RLS efetivo, valores de .env, arquivos de clientes, backups, logs operacionais e segredos reais não foram consultados. Não houve migração, seed, build da aplicação, deploy ou correção de código.'),p('O histórico inclui apenas refs e objetos disponíveis neste clone, sem fetch de branches remotos ou objetos inalcançáveis. A busca de segredos é heurística e pode não reconhecer formatos desconhecidos; os 30 blobs binários não foram inspecionados. O bundle local existente foi examinado sem reconstruí-lo, e não se afirma que corresponda ao bundle publicado ou ao HEAD.'),p('Alertas de segredo revisados: placeholders de .env.example e matches SQL PRIMARY KEY/CSS/framework foram descartados. Credenciais reais de provedores, chaves privadas ou URLs com senha não foram confirmadas entre os matches revisados. Defaults de seed/JWT permanecem achados condicionais A08/A09. Os trechos usam linhas do código auditado; apenas os valores literais de senha e PIN foram redigidos.')]
    story += [PageBreak(),p('Pontos fortes e pontos fracos','h1')]
    for title,loc,body in STRENGTHS:story += [p(title,'strong'),p(body),p(loc,'small')]
    story += [p('Riscos centrais','h2'),p('1. A identidade de empresa pode nascer incorreta, tornando insuficientes filtros posteriores corretos (A01/A02).\n2. Arquivos seguem um caminho de autorização diferente dos objetos de negócio (A03).\n3. Rotas alternativas e validações incompletas quebram privilégios, posse e imutabilidade (A04–A07).\n4. Defaults operacionais e conteúdo persistido ampliam impacto quando as condições descritas se verificam (A08–A12).')]
    story += [PageBreak(),p('Índice de achados por categoria','h1')]
    for category,title in CATEGORIES.items():
        group=[f for f in findings if f['category']==category];story += [p(f'{category}. {title}','h2')]
        data=[]
        for f in group:
            principal={'A01':1,'A02':1,'A03':0,'A04':3,'A05':2,'A06':2,'A07':1,'A08':0,'A09':0,'A10':0,'A11':5,'A12':1}[f['id']]
            data.append([Chip(f['severity']),location(f['refs'][principal]),f['id']+' — '+f['title']])
        story += [table(['Severidade','Arquivo:linha','Descrição'],data,[71,198,WIDTH-269]),Spacer(1,8)]
    for f in findings:
        story += [PageBreak(),p(f'{f["id"]} · {f["title"]}','h1'),Chip(f['severity']),Spacer(1,9),p(CATEGORIES[f['category']],'small'),tagged('Problema.',f['problem']),tagged('Explorabilidade.',f['condition']),tagged('Impacto.',f['impact']),tagged('Verificação.',f['proof']),tagged('Correção recomendada.',f['fix']),p('Evidência — arquivo por arquivo','h2')]
        for r in f['refs']:
            story += [CondPageBreak(90),p(location(r),'h3')]
            if r['note']:story.append(p(r['note'],'small'))
            story.append(code_flow(r['code']))
    story += [PageBreak(),p('Recomendações priorizadas','h1')]
    for priority,title,ids,body in PRIORITIES:story += [p(priority+' · '+title,'h2'),p(ids,'small'),p(body)]
    story += [p('Cuidado operacional','h2'),p('Esta máquina e o Supabase atendem produção. Não executar seed, reset, migrações destrutivas, testes com dados reais ou remoção indiscriminada de mídias. Planejar correções e verificação em fixtures/banco isolado. O relatório e as issues são propostas: nenhum ticket foi publicado e nenhuma correção/deploy foi feito.')]
    story += [PageBreak(),p('Cruzamento UI × API','h1'),p('Gates encontrados no código da aplicação. Exibições de nome de papel e seletores de responsáveis, sem restrição de ação, não foram confundidos com verificações de autorização. As permissões específicas de cada endpoint constam da matriz seguinte.')]
    for front,gate,back,result in GATES:story += [CondPageBreak(90),p(gate,'h2'),p(front,'small'),tagged('Servidor:',back),p(result)]
    story += [PageBreak(),p('Cobertura completa dos handlers','h1'),p('Uma linha por handler. “Controle observado” descreve a política localizada, não uma garantia de ausência de outras falhas. As linhas abrangem decorators e corpo do método. IDs internos globais são governados por permissão, não pela empresa do funcionário. /uploads foi auditado separadamente em A03/A10.')]
    for filename,group in group_routes(rows).items():
        story += [CondPageBreak(160),p(filename,'h2'),p(CONTROLLERS[Path(filename).name],'small')]
        data=[[f"{r['line']}-{r['endLine']}",r['method']+' '+r['route'],r['policy'],r['result']] for r in group]
        story.append(table(['Linhas','Método e rota','Política observada','Resultado'],data,[56,184,WIDTH-315,75]))
    story += [PageBreak(),p('Validações e rastreabilidade','h1'),p('Os scripts de verificação transpõem métodos do código real para dependências sintéticas. Nenhum PrismaClient real é instanciado. As duas provas de navegador usam servidor loopback temporário e Chrome headless com rede da página restrita à origem sintética. Não houve exfiltração nem acesso a credenciais.'),table(['Grupo','Evidência registrada'],[['Offline','offline-verification.json — 13 verificações confirmadas; inclui controles negativos corretos.'],['Navegador','browser-verification.json — 2 provas confirmadas: template de etiquetas e HTML em express.static.'],['Código','source-manifest.json — SHA-256 dos arquivos usados nos trechos; findings.json conserva evidências redigidas.'],['Cobertura','scan-evidence.json e route-coverage.json/md — inventário completo e classificação por rota.']],[90,WIDTH-90]),p('Referências complementares','h2')]
    for title,url,why in REFERENCES:
        story += [p(why),Paragraph('<a href="'+url+'" color="#2563EB">'+html.escape(title)+'</a>',styles['body'])]
    story += [p('Uso dos próximos blocos','h2'),p('As issues a seguir encerram o PDF. Cada bloco é completo e pode ser copiado para o GitHub; github-issues.md oferece o mesmo texto sem quebras de paginação. Agrupamentos: as sete rotas de arquivo ficam em A03; violações de assinatura em A06; credenciais de seed/docs/histórico em A08; variantes de upload em A10. Nenhuma issue foi enviada ao GitHub.')]
    story += [PageBreak(),p('ISSUES PARA O GITHUB','h1'),p('Texto integral em Markdown · 12 issues acionáveis · labels sugeridas','small')]
    for i,text in enumerate(issues):
        if i:story.extend([Spacer(1,18),CondPageBreak(250)])
        # Preformatted pode dividir entre páginas; linha longa recebe continuação,
        # sem cortar a margem. Companion .md conserva as linhas originais.
        story.append(code_flow(text,True))
    target=HERE/'relatorio-auditoria-seguranca.pdf'
    doc=SimpleDocTemplate(str(target),pagesize=A4,rightMargin=MARGIN,leftMargin=MARGIN,topMargin=MARGIN,bottomMargin=MARGIN,title='Relatório de Auditoria de Segurança — '+PROJECT,author='Auditoria de código — Zyllen Gestão',pageCompression=1)
    doc.build(story,onFirstPage=page_header,onLaterPages=page_header,canvasmaker=NumberedCanvas)
    reader=PdfReader(target);texts=[pg.extract_text() or '' for pg in reader.pages];all_text='\n'.join(texts)
    assert all(f'--- ISSUE {i} ---' in all_text and f'--- FIM ISSUE {i} ---' in all_text for i in range(1,13))
    assert len(reader.pages)>1 and 'ISSUES PARA O GITHUB' in all_text
    assert all(abs(float(pg.mediabox.width)-W)<1 for pg in reader.pages)
    checks={'pages':len(reader.pages),'a4':True,'findings':len(findings),'severity':dict(Counter(f['severity'] for f in findings)),'handlers':len(rows),'controllers':20,'complete_issue_blocks':12,'all_pages_have_text':all(bool(t.strip()) for t in texts),'visual_qa':'Pending rasterization and manual inspection; see visual-qa.json after QA.','pdf_sha256':hashlib.sha256(target.read_bytes()).hexdigest()}
    (HERE/'pdf-verification.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(checks,ensure_ascii=False,indent=2))

def main():
    scan=json.loads((HERE/'scan-evidence.json').read_text(encoding='utf-8'));assert scan['head']==HEAD
    findings=evidence();rows=coverage(scan);issues=[issue_text(f,i) for i,f in enumerate(findings,1)];markdown(findings,scan,issues);build_pdf(findings,scan,rows,issues)

if __name__=='__main__':main()
