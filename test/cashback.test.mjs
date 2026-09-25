import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readXlsxReport } from '../xlsx-lite.js';
import { processCashbackReports, excelLoss, displayLoss, deriveGameName } from '../cashback.js';

const filePath = '/mnt/data/Pragmatic Play_2026-09-14_to_2026-09-20(1).xlsx';
const buffer = await fs.readFile(filePath);
const file = new File([buffer], 'Pragmatic Play_2026-09-14_to_2026-09-20(1).xlsx', {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
const parsed = await readXlsxReport(file);
assert.equal(parsed.rows.length, 362, 'Expected 362 data rows excluding header');
const ag = parsed.rows.find(r=>r.username==='beb@agoodman');
assert.ok(ag, 'agoodman must be parsed');
assert.equal(ag.winLoseAmt, -1129.35, 'agoodman WinLoseAmt must be -1129.35');
assert.equal(excelLoss(ag.winLoseAmt), -1129350, 'Excel loss conversion failed');
assert.equal(displayLoss(ag.winLoseAmt), '-1,129.35', 'Display loss formatting failed');
assert.equal(deriveGameName(file.name), 'Pragmatic Play', 'Game name extraction failed');

const result = processCashbackReports([{fileName:file.name, game:'Pragmatic Play', rows:parsed.rows}], 'Pragmatic Play');
assert.equal(result.rows.length, 72, 'Expected 72 qualifying usernames; TOTAL must be excluded');
assert.equal(result.rows[0].username, 'beb@jokowi99');
assert.equal(result.rows[0].rawLoss, -29647.99);
assert.equal(result.rows.at(-1).username, 'beb@jung');
assert.equal(result.rows.at(-1).rawLoss, -507.69);
assert.ok(!result.rows.some(r=>r.username.toUpperCase()==='TOTAL'), 'TOTAL row must never be included');
assert.ok(!result.rows.some(r=>r.username==='beb@luthfi27'), '499rb-class loss must be excluded');

const mixed = processCashbackReports([{fileName:'A.xlsx',game:'A',rows:[
  {username:'beb@Test',winLoseAmt:-499.99},
  {username:'beb@500',winLoseAmt:-500},
  {username:'TOTAL',winLoseAmt:-100000}
]}], 'A');
assert.deepEqual(mixed.rows.map(r=>r.username), ['beb@500']);
assert.equal(excelLoss(mixed.rows[0].rawLoss), -500000);

const crossGame = processCashbackReports([
  {fileName:'Pragmatic Play_x.xlsx',game:'Pragmatic Play',rows:[{username:'beb@cross',winLoseAmt:-300}]},
  {fileName:'Game B_x.xlsx',game:'Game B',rows:[{username:'beb@cross',winLoseAmt:-300}]}
], 'all');
assert.equal(crossGame.rows[0].username, 'beb@cross');
assert.equal(crossGame.rows[0].rawLoss, -600);
assert.equal(excelLoss(crossGame.rows[0].rawLoss), -600000);

console.log('CASHBACK XLSX TESTS PASSED');
