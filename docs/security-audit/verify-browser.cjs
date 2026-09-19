/* Local-only browser reproductions. No application login, DB, .env or remote traffic. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const {createRequire}=require('module');
const root=path.resolve(__dirname,'../..');
const apiRequire=createRequire(path.join(root,'apps/api/package.json'));
const ts=apiRequire('typescript');
const runtime=process.env.AUDIT_RUNTIME_ROOT || 'C:/Users/SERVIDOR ZYLLEN/.cache/codex-runtimes/codex-primary-runtime/dependencies';
const {chromium}=require(path.join(runtime,'node/node_modules/playwright'));
const express=createRequire(apiRequire.resolve('@nestjs/platform-express'))('express');
function compile(text){return ts.transpileModule(text,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;}
const mod={exports:{}};
vm.runInNewContext(compile(fs.readFileSync(path.join(root,'apps/web/src/lib/label-template.ts'),'utf8')),{module:mod,exports:mod.exports});
const source=fs.readFileSync(path.join(root,'apps/web/src/app/dashboard/etiquetas/page.tsx'),'utf8');
const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let printer;
function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='openPrintWindow')printer=node.initializer.getText(ast);ts.forEachChild(node,visit);}
visit(ast);assert.ok(printer);
const printerJs=compile('const invoke = '+printer+';\ninvoke("<div>synthetic label</div>",1);');
const template=mod.exports.parseTemplate(JSON.stringify({elements:[],heightMm:'30</style><script>window.opener.__auditXss=1</script><style>'}));
assert.equal(typeof template.heightMm,'string');
const results=[];
(async()=>{
 const app=express();
 app.use('/uploads',express.static(path.join(__dirname,'fixtures'),{index:false}));
 app.get('/',(req,res)=>res.type('html').send('<!doctype html><title>Synthetic audit origin</title>'));
 const server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
 let browser;
 try {
  const base='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
  const context=await browser.newContext();
  await context.route('**/*',route=>route.request().url().startsWith(base+'/')?route.continue():route.abort());
  await context.addInitScript(()=>{window.print=()=>{};});
  const page=await context.newPage();await page.goto(base+'/');
  await page.evaluate(({printerJs,template})=>{const activeTemplate=template;const toast={error:()=>{}};eval(printerJs);},{printerJs,template});
  await page.waitForFunction(()=>window.__auditXss===1);
  results.push({name:'Real parseTemplate + openPrintWindow execute stored heightMm as JavaScript in the opener origin',result:'confirmed'});
  const upload=await context.newPage();const response=await upload.goto(base+'/uploads/uploaded.html');
  assert.match(response.headers()['content-type'],/^text\/html/);
  assert.equal(await upload.evaluate(()=>window.__auditUploadedHtml),1);
  results.push({name:'Same Express static middleware serves retained .html extension as text/html and browser executes it',result:'confirmed',contentType:response.headers()['content-type']});
  fs.writeFileSync(path.join(__dirname,'browser-verification.json'),JSON.stringify({scope:'Synthetic loopback server; no production, database, credentials or remote requests',timestamp:new Date().toISOString(),browser:browser.version(),results},null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
 } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;});
