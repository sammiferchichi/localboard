const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const assets = fs.readdirSync(path.join(dist, 'assets'));
const jsFile = assets.find(f => f.endsWith('.js'));
const js = fs.readFileSync(path.join(dist, 'assets', jsFile), 'utf-8');

let html = fs.readFileSync(path.join(dist, 'index.html'), 'utf-8');
html = html.replace(/<script type="module".*?<\/script>/, '<script>' + js + '</script>');
html = html.replace(/crossorigin /g, '');
fs.writeFileSync(path.join(dist, 'index.html'), html);

fs.rmSync(path.join(dist, 'assets'), { recursive: true, force: true });
console.log('Standalone ready: dist/index.html (' + (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1) + ' KB)');
