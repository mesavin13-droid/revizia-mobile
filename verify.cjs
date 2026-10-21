// Dependency-free regression checks of business rules from the actual main.tsx.
const fs=require('fs');const vm=require('vm');const assert=require('assert');
let ts;try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
const source=fs.readFileSync(__dirname+'/src/main.tsx','utf8');
const ast=ts.createSourceFile('main.tsx',source,ts.ScriptTarget.ES2022,true,ts.ScriptKind.TSX);
const wanted=['qty','normalized','searchWords','productMatches','deriveCounts'];
const declarations=[];
for (const st of ast.statements){
 if(!ts.isVariableStatement(st))continue;
 for(const d of st.declarationList.declarations){
   if(ts.isIdentifier(d.name)&&wanted.includes(d.name.text))declarations.push('const '+d.name.text+'='+d.initializer.getText(ast)+';');
 }
}
const transpiled=ts.transpileModule(declarations.join('\n')+'\n globalThis.api={'+wanted.join(',')+'}',{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const context={};vm.runInNewContext(transpiled,context);
const {qty,normalized,searchWords,productMatches,deriveCounts}=context.api;
assert.strictEqual(qty('-12'),0);assert.strictEqual(qty('24'),24);assert.strictEqual(qty('Infinity'),0);
assert.strictEqual(normalized(' 04601234567890 '),'04601234567890');
const product={id:'1',name:'Молоко 3,2% 1 л',sku:'MLK01',barcode:'4601234567890',actual:0,scanned:false,pack:12};
assert.strictEqual(productMatches(product,'молоко 1'),true);
assert.strictEqual(productMatches(product,'1 молоко'),true);
assert.strictEqual(productMatches(product,'МОЛОКО MLK01'),true);
assert.strictEqual(productMatches(product,'чужой'),false);
assert.strictEqual(productMatches(product,'777888',{'777888':'1'}),true);
const counted=deriveCounts([product],[{productId:'1',total:0},{productId:'1',total:12}]);assert.strictEqual(counted[0].actual,12);assert.strictEqual(counted[0].scanned,true);
const zero=deriveCounts([product],[{productId:'1',total:0}]);assert.strictEqual(zero[0].actual,0);assert.strictEqual(zero[0].scanned,true);
const notScanned=deriveCounts([product],[]);assert.strictEqual(notScanned[0].scanned,false);
const diagnostics=ts.transpileModule(source,{fileName:'main.tsx',reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).diagnostics||[];
assert.deepStrictEqual(diagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText,' ')),[]);
console.log('OK: 13 inventory/restore/search/zero-count rules; TSX syntax valid.');
