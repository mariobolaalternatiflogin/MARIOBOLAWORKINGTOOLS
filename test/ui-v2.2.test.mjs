import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app=readFileSync(new URL('../app.js', import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html', import.meta.url),'utf8');
const css=readFileSync(new URL('../styles.css', import.meta.url),'utf8');
const parser=readFileSync(new URL('../parser.js', import.meta.url),'utf8');

assert.match(html,/Copy 4 Kolom ke Excel/);
assert.match(html,/<th>NO<\/th><th>REGISTER DATE<\/th><th>USERNAME<\/th><th>FIRST DEPOSIT<\/th>/);
assert.match(app,/DI BLACKLIST MEMBER SB/);
assert.match(app,/Hasil 4 kolom berhasil disalin ke Excel/);
assert.match(app,/`\$\{i\+1\}\\t\$\{r\.registerDateRaw\}\\t\$\{r\.username\}\\t/);
assert.match(app,/data-show-new-member/);
assert.match(css,/\.blacklist-status/);
assert.match(css,/\.row-number-cell/);
assert.match(css,/\.blacklist-message/);
console.log('UI V2.2 TESTS PASSED');
