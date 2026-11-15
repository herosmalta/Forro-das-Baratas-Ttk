import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
if (!scripts.length) throw new Error('Nenhum bloco <script> encontrado em index.html.');
for (let i = 0; i < scripts.length; i++) {
  new vm.Script(scripts[i][1], { filename: `index.html:inline-script-${i + 1}` });
}
console.log(`HTML: ${scripts.length} bloco(s) JavaScript sem erros de sintaxe.`);
