import assert from 'node:assert/strict';
import {parseReport, auditBonuses, classifyTransaction} from '../parser.js';

function browserRow(n,user,from,to,amount,date,payment='Agent Deposit',status='Confirmed',extraToLines=''){
  return `${n} ${user}\n${from}\nAccount Name\n08**123***\n${to}\n${extraToLines || 'Account Name\n123456789'}\n${amount}\n${date}\n${payment}\n${status}\n${date}`;
}

const history = [
  browserRow(1,'BEB@kakekbiru','DANA','BRI','40.000','23/09/2026 12:51:20 AM'),
  browserRow(2,'BEB@kakekbiru','DANA','SCB','2.000','23/09/2026 12:51:36 AM','Agent Deposit','Confirmed','SCB A BONUS DEPOSIT HARIAN\n01'),
  browserRow(3,'BEB@Mamates','DANA','BCA','50.000','23/09/2026 12:52:00 AM'),
  browserRow(4,'BEB@Mamates','DANA','SCB','2.500','23/09/2026 12:52:44 AM','Agent Deposit','Confirmed','SCB A BONUS DEPOSIT HARIAN\n01'),
].join('\n');

const recs = parseReport(history,'deposit-history');
const byUser = Object.fromEntries(recs.map(r=>[`${r.username}|${r.dateRaw}`,r]));
const k = recs.find(r=>r.username==='BEB@kakekbiru' && r.amount===40000);
const m = recs.find(r=>r.username==='BEB@Mamates' && r.amount===50000);
assert(k && m);
assert.equal(k.toBank,'BRI');
assert.equal(m.toBank,'BCA');
assert.equal(classifyTransaction(k),'MEMBER_DEPOSIT');
assert.equal(classifyTransaction(m),'MEMBER_DEPOSIT');
const kb = recs.find(r=>r.username==='BEB@kakekbiru' && r.amount===2000);
assert.equal(kb.transactionType,'DAILY_BONUS');

const audited = auditBonuses('',history,{rate:.05});
const kr=audited.find(r=>r.username==='BEB@kakekbiru');
const mr=audited.find(r=>r.username==='BEB@Mamates');
assert.equal(kr.depositAmount,40000);
assert.equal(kr.expectedBonus,2000);
assert.equal(kr.givenBonus,2000);
assert.equal(kr.status,'SESUAI');
assert.equal(mr.depositAmount,50000);
assert.equal(mr.expectedBonus,2500);
assert.equal(mr.givenBonus,2500);
assert.equal(mr.status,'SESUAI');

// All supported To Bank labels must classify Agent Deposit as MEMBER_DEPOSIT.
for (const bank of ['DANA','BCA','MANDIRI','BNI','BRI','DANAMON','GOPAY','GO PAY','LINKAJA','OVO']) {
  const txt = browserRow(10,'BEB@Test'+bank.replace(/\s/g,''),'DANA',bank,'10.000','23/09/2026 01:00:00 AM');
  const r=parseReport(txt,'deposit-history')[0];
  assert.equal(r.toBank,bank==='GO PAY'?'GO PAY':bank);
  assert.equal(r.transactionType,'MEMBER_DEPOSIT',bank);
}

// SCB daily bonus must never become a deposit merely because it is Agent Deposit.
const scbBonus = parseReport(browserRow(11,'BEB@scbtest','DANA','SCB','5.000','23/09/2026 02:00:00 AM','Agent Deposit','Confirmed','SCB A BONUS DEPOSIT HARIAN\n01'),'deposit-history')[0];
assert.equal(scbBonus.transactionType,'DAILY_BONUS');

console.log('V1.6 BANK CLASSIFICATION TESTS PASSED');
