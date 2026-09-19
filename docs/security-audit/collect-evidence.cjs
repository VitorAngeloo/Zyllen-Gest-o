/* Read-only audit inventory. No database connection, HTTP requests or secret output. */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const root = path.resolve(__dirname, '../..');
const ts = require(path.join(root, 'apps/api/node_modules/typescript'));
const git = (...args) => cp.execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 });
const walk = (p) => fs.existsSync(p) ? fs.readdirSync(p, { withFileTypes: true }).flatMap(d => d.isDirectory() ? walk(path.join(p, d.name)) : [path.join(p, d.name)]) : [];
const relative = p => path.relative(root, p).replace(/\\/g, '/');
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
function decorators(n) { return (ts.getDecorators(n) || []).map(d => d.expression.getText()); }
function routes() {
  const found = [];
  for (const p of walk(path.join(root, 'apps/api/src')).filter(p => /\.ts$/.test(p))) {
    const sf = ts.createSourceFile(p, fs.readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true);
    for (const cl of sf.statements.filter(ts.isClassDeclaration)) {
      const decs = decorators(cl), controller = decs.find(d => /^Controller\(/.test(d));
      if (!controller) continue;
      const base = controller.match(/['"]([^'"]*)['"]/)?.[1] || '';
      for (const m of cl.members.filter(ts.isMethodDeclaration)) {
        const ds = decorators(m), route = ds.find(d => /^(Get|Post|Put|Patch|Delete|All|Head|Options)\(/.test(d));
        if (!route) continue;
        const part = route.match(/['"]([^'"]*)['"]/)?.[1] || '';
        found.push({ file: relative(p), line: sf.getLineAndCharacterOfPosition(m.getStart(sf)).line + 1,
          endLine: sf.getLineAndCharacterOfPosition(m.end).line + 1, handler: m.name.getText(),
          method: route.split('(')[0].toUpperCase(), route: '/' + [base, part].filter(Boolean).join('/'),
          classGuards: decs.filter(d => /UseGuards/.test(d)), decorators: ds,
          calls: [...m.getText().matchAll(/this\.\w+\.\w+\([^;]*/g)].map(x => x[0].replace(/\s+/g, ' ').slice(0, 350)) });
      }
    }
  }
  return found;
}
const patterns = [
 ['provider-token', /(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|sb_secret_[A-Za-z0-9_-]{10,}|AKIA[A-Z0-9]{16}|eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})/g],
 ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g],
 ['credential-url', /(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|https?):\/\/[^\s/:'"<>]+:([^\s@'"<>]+)@[^\s'"<>]+/g],
 ['secret-assignment', /(?:password|passwd|pwd|secret|api[_-]?key|service[_-]?role[_-]?key|access[_-]?token|refresh[_-]?token|encryption[_-]?key|auth[_-]?token|pin)\s*['"]?\s*[:=]\s*['"`]([^'"`\r\n]{3,})['"`]/gi],
 ['env-secret', /(?:PASSWORD|PASSWD|SECRET|API_KEY|SERVICE_ROLE_KEY|TOKEN|ENCRYPTION_KEY)\s*[:=]\s*([^\s"'`]{3,})/g],
 ['hash-literal', /(?:bcrypt\.)?hash\(\s*['"]([^'"]{3,})['"]/g],
 ['default-secret', /(?:SECRET|PASSWORD|TOKEN|KEY)[^\r\n]{0,50}(?:\|\||\?\?|:-|,\s*)\s*['"`]([^'"`\r\n]{3,})/g],
 ['documented-credential', /(?:senha|password|pin)\s*[:=]\s*`([^`\r\n]+)`/gi],
 ['compose-default', /\$\{(?:[A-Z_]*(?:SECRET|PASSWORD|TOKEN|KEY)[A-Z_]*):-([^}\r\n]+)\}/g],
];
function scan(text, loc) {
 const hits=[];
 for (const [kind, re] of patterns) {
  re.lastIndex=0;
  for (const m of text.matchAll(re)) {
   const value=m[1] || m[0];
   if (/^\$\{|^process\.env|^env\(|^<|^\{\{|^\*|^your[-_]|^sua[-_]|^seu[-_]/i.test(value)) continue;
   hits.push({ ...loc, line: text.slice(0,m.index).split('\n').length, kind, fingerprint: hash(value), length: value.length });
  }
 }
 return hits;
}
function currentScan() {
 const paths = [...new Set(git('ls-files', '-z').split('\0').filter(Boolean))];
 let scanned=0; const hits=[];
 for (const p of paths) {
  if (/\.(?:png|jpg|jpeg|gif|ico|pdf|woff2?|ttf|lock|tsbuildinfo)$/.test(p) || p==='pnpm-lock.yaml') continue;
  const full=path.join(root,p); if (!fs.existsSync(full)) continue;
  const b=fs.readFileSync(full); if(b.includes(0)) continue;
  scanned++; hits.push(...scan(b.toString('utf8'),{file:p}));
 }
 return {scanned,hits};
}
function historyScan() {
 const objects=git('rev-list','--objects','--all').trim().split('\n').map(s=>({oid:s.slice(0,40),file:s.slice(41)})).filter(o=>o.file);
 const input=objects.map(o=>o.oid).join('\n')+'\n';
 const batch=cp.execFileSync('git',['cat-file','--batch'],{cwd:root,input,encoding:null,maxBuffer:256*1024*1024});
 let offset=0, blobs=0, skippedBinary=0; const hits=[];
 for (const o of objects) {
  const end=batch.indexOf(10,offset), header=batch.subarray(offset,end).toString().split(' '), size=Number(header[2]);
  const b=batch.subarray(end+1,end+1+size); offset=end+1+size+1;
  if(header[1]!=='blob') continue;
  if(b.includes(0)){skippedBinary++;continue;}
  blobs++; hits.push(...scan(b.toString('utf8'),o));
 }
 return {commits:Number(git('rev-list','--count','--all').trim()),blobs,skippedBinary,hits};
}
function bundleScan() {
 const files=walk(path.join(root,'apps/web/.next/static')).filter(p=>/\.(js|map)$/.test(p));
 let bytes=0; const hits=[];
 for(const p of files){const b=fs.readFileSync(p);bytes+=b.length;hits.push(...scan(b.toString('utf8'),{file:relative(p)}));}
 return {files:files.length,bytes,buildId:fs.existsSync(path.join(root,'apps/web/.next/BUILD_ID'))?fs.readFileSync(path.join(root,'apps/web/.next/BUILD_ID'),'utf8').trim():null,hits};
}
const mode=process.argv[2] || 'all';
if(mode==='redact') {
 const p=process.argv[3], original=fs.readFileSync(path.join(root,p),'utf8');
 let safe=original;
 for(const [kind,re] of patterns){safe=safe.replace(re,(...args)=>{const m=args[0];return `<${kind}:redigido>`;});}
 console.log(safe.split('\n').map((s,i)=>`${i+1}: ${s}`).join('\n'));
} else if(mode==='triage') {
 const s=JSON.parse(fs.readFileSync(path.join(__dirname,'scan-evidence.json'),'utf8'));
 const unique=[...new Map(s.history.hits.map(h=>[h.fingerprint,h])).values()];
 for(const h of unique) {
   const source=git('cat-file','blob',h.oid), line=source.split('\n')[h.line-1];
   let safe=line;
   for(const [,re] of patterns) safe=safe.replace(re,`[REDACTED ${h.kind}]`);
   const commits=git('log','--all',`--find-object=${h.oid}`,'--format=%H %ad %s','--date=short').trim().split('\n');
   console.log(JSON.stringify({...h,context:safe,commits}));
 }
 for(const h of [...new Map(s.bundle.hits.map(h=>[h.fingerprint,h])).values()]) {
   const source=fs.readFileSync(path.join(root,h.file),'utf8');
   for(const [kind,re] of patterns) for(const m of source.matchAll(re)) {
     if(hash(m[1]||m[0])!==h.fingerprint)continue;
     console.log(JSON.stringify({...h,context:source.slice(Math.max(0,m.index-55),m.index)+`[REDACTED ${kind}]`+source.slice(m.index+m[0].length,m.index+m[0].length+55)}));
   }
 }
} else {
 const result={head:git('rev-parse','HEAD').trim(),timestamp:new Date().toISOString()};
 if(mode==='all'||mode==='routes') result.routes=routes();
 if(mode==='all'||mode==='secrets') {result.current=currentScan();result.history=historyScan();result.bundle=bundleScan();}
 const out=path.join(__dirname,mode==='routes'?'route-inventory.json':'scan-evidence.json');
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');
 console.log(JSON.stringify({...result,routes:result.routes?.length,current:result.current&&{scanned:result.current.scanned,hits:result.current.hits},history:result.history&&{commits:result.history.commits,blobs:result.history.blobs,skippedBinary:result.history.skippedBinary,hits:result.history.hits.length},bundle:result.bundle},null,2));
}
