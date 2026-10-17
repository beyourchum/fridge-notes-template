import {copyFileSync,existsSync,mkdirSync,readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=process.cwd();
const destination=path.join(root,'public/ocr');
mkdirSync(destination,{recursive:true});
copyFileSync(path.join(root,'node_modules/tesseract.js/dist/worker.min.js'),path.join(destination,'worker.min.js'));
for(const name of readdirSync(path.join(root,'node_modules/tesseract.js-core'))){if(name.endsWith('.wasm.js'))copyFileSync(path.join(root,'node_modules/tesseract.js-core',name),path.join(destination,name));}
copyFileSync(path.join(root,'node_modules/tesseract.js/LICENSE.md'),path.join(destination,'LICENSE-tesseract.txt'));
copyFileSync(path.join(root,'node_modules/tesseract.js-core/LICENSE'),path.join(destination,'LICENSE-core.txt'));
const manifest=JSON.parse(readFileSync(path.join(destination,'languages.json'),'utf8'));
for(const language of manifest){const file=path.join(destination,'lang',language.file);if(!existsSync(file)||createHash('sha256').update(readFileSync(file)).digest('hex')!==language.sha256)throw Error(`OCR language data missing or changed: ${language.file}`);}
console.log('OCR assets prepared and language checksums verified.');
