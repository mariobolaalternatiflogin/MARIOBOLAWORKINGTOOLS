import assert from 'node:assert/strict';
import {parseReport,auditBonuses,processDailyBonus} from '../parser.js';

const qr=`| | **User Name** | **From Bank** | **To Bank** | **Amount** | **Reference** | **RRN** | **Date** | **Payment Method** | **Status** | **Invoice** | **Status Date** | **Remark** | **Edited By** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|1|BEB\\@Sf0810|DANA<br>Sultan Faiz Alfalah<br>08**19087***|PrabuPay<br>mariobola_oauser<br>id|**500.000**|179| |22/09/2026 12:00:37 AM|QR Pay|Confirmed|View|22/09/2026 12:01:23 AM| |QRPay User|`;
const history=`| ** ** | **User Name** | **From Bank** | **To Bank** | **Amount** | **Date** | **Payment Method** | **Status** | **Status Date** | **Remark** | **Edited By** |
|---|---|---|---|---|---|---|---|---|---|---|---|
|1|BEB\\@Sf0810|DANA<br>Sultan Faiz Alfalah<br>08**19087***|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|**25.000**|22/09/2026 12:03:28 AM|Agent Deposit|Confirmed|22/09/2026 12:03:57 AM||beb\\@mario08|`;
const p=parseReport(qr,'qrpay');
assert.equal(p[0].username,'BEB@Sf0810');
assert.equal(p[0].amount,500000);
assert.equal(p[0].editedBy,'');
const h=parseReport(history,'deposit-history');
assert.equal(h[0].transactionType,'DAILY_BONUS');
assert.equal(h[0].amount,25000);
assert.equal(h[0].editedBy,'');
const a=auditBonuses(qr,history,{rate:0.05});
assert.equal(a.length,1);
assert.equal(a[0].expectedBonus,25000);
assert.equal(a[0].givenBonus,25000);
assert.equal(a[0].status,'SESUAI');
assert.equal(a[0].doubleBonus,false);
console.log('BASIC TESTS PASSED');

// Same date, QRPay + Member Deposit: one bonus slot only.
const qrCross=`1 BEB@Maracana BCA PrabuPay 500.000 22/09/2026 10:00:00 AM QR Pay Confirmed
2 BEB@Maracana BCA PrabuPay 500.000 22/09/2026 01:00:00 PM QR Pay Confirmed`;
const histCross=`1 BEB@Maracana BCA SCB SCB A BONUS DEPOSIT HARIAN 01 25.000 22/09/2026 10:05:00 AM Agent Deposit Confirmed 22/09/2026 10:05:10 AM beb@mario08
2 BEB@Maracana BRI BRI Rizal 500.000 22/09/2026 03:00:00 PM Member Deposit Confirmed 22/09/2026 03:00:10 PM beb@mario08`;
const ac=auditBonuses(qrCross,histCross,{rate:0.05});
assert.equal(ac.length,1);
assert.equal(ac[0].depositAmount,500000);
assert.equal(ac[0].expectedBonus,25000);
assert.equal(ac[0].givenBonus,25000);
assert.equal(ac[0].status,'SESUAI');
assert.equal(ac[0].doubleBonus,false);
assert.equal(ac.suppressedDeposits,2); // second QRPay + Member Deposit are both repeated same-day deposits
console.log('SAME-DATE CROSS-SOURCE TEST PASSED');

// Cross-midnight: a bonus on 23/09 CANNOT use a 22/09 deposit.
const qrMidnight=`1 BEB@Midnight BCA PrabuPay 500.000 22/09/2026 11:50:00 PM QR Pay Confirmed`;
const histMidnight=`1 BEB@Midnight BCA SCB SCB A BONUS DEPOSIT HARIAN 01 25.000 23/09/2026 12:05:00 AM Agent Deposit Confirmed 23/09/2026 12:05:10 AM beb@mario08`;
const am=auditBonuses(qrMidnight,histMidnight,{rate:0.05});
assert.equal(am.length,2);
const am23=am.find(r=>r.dateKey==='2026-09-23');
assert.ok(am23);
assert.equal(am23.depositAmount,0);
assert.equal(am23.expectedBonus,0);
assert.equal(am23.givenBonus,25000);
assert.equal(am23.doubleBonus,false);
assert.equal(am23.status,'MISTAKE');
assert.equal(am23.noSameDayDeposit,true);
assert.match(am23.remarkStatus,/BONUS TANPA DEPOSIT/);
const am22=am.find(r=>r.dateKey==='2026-09-22');
assert.ok(am22);
assert.equal(am22.status,'BELUM DIBERIKAN');
console.log('CROSS-MIDNIGHT REJECTION TEST PASSED');

// Next calendar date is valid only when there is a new deposit on that date.
const qrNext=`1 BEB@NextDay BCA PrabuPay 500.000 22/09/2026 11:50:00 PM QR Pay Confirmed
2 BEB@NextDay BRI PrabuPay 400.000 23/09/2026 12:01:00 AM QR Pay Confirmed`;
const histNext=`1 BEB@NextDay BCA SCB SCB A BONUS DEPOSIT HARIAN 01 20.000 23/09/2026 12:05:00 AM Agent Deposit Confirmed 23/09/2026 12:05:10 AM beb@mario08`;
const an=auditBonuses(qrNext,histNext,{rate:0.05});
assert.equal(an.length,2);
const sep23=an.find(r=>r.dateKey==='2026-09-23');
assert.ok(sep23);
assert.equal(sep23.depositAmount,400000);
assert.equal(sep23.expectedBonus,20000);
assert.equal(sep23.givenBonus,20000);
assert.equal(sep23.status,'SESUAI');
console.log('NEXT-DATE NEW-DEPOSIT TEST PASSED');

// Repeated deposits on one date with no bonus still occupy only one daily slot.
const qrRepeatOnly=`1 BEB@Repeat BCA PrabuPay 100.000 22/09/2026 08:00:00 AM QR Pay Confirmed
2 BEB@Repeat BRI PrabuPay 300.000 22/09/2026 09:00:00 AM QR Pay Confirmed`;
const ar=auditBonuses(qrRepeatOnly,'',{rate:0.05});
assert.equal(ar.length,1);
assert.equal(ar[0].depositAmount,300000);
assert.equal(ar[0].status,'BELUM DIBERIKAN');
assert.equal(ar.suppressedDeposits,1);
console.log('REPEATED-DEPOSIT NO-BONUS TEST PASSED');

// Bonus before the same-day deposit is also invalid.
const qrOrder=`1 BEB@Order BCA PrabuPay 500.000 22/09/2026 10:10:00 AM QR Pay Confirmed`;
const histOrder=`1 BEB@Order BCA SCB SCB A BONUS DEPOSIT HARIAN 01 25.000 22/09/2026 10:05:00 AM Agent Deposit Confirmed 22/09/2026 10:05:10 AM beb@mario08`;
const ao=auditBonuses(qrOrder,histOrder,{rate:0.05});
assert.equal(ao.length,1);
assert.equal(ao[0].status,'MISTAKE');
assert.equal(ao[0].noSameDayDeposit,true);
assert.equal(ao[0].depositAmount,0);
console.log('SAME-DATE ORDER TEST PASSED');

// Two normal bonuses on the same date = DOUBLE BONUS + MISTAKE.
const qrDouble=`1 BEB@Double BCA PrabuPay 100.000 22/09/2026 02:59:00 AM QR Pay Confirmed`;
const histDouble=`1 BEB@Double BCA SCB SCB A BONUS DEPOSIT HARIAN 01 5.000 22/09/2026 03:00:00 AM Agent Deposit Confirmed 22/09/2026 03:00:05 AM beb@mario08
2 BEB@Double BCA SCB SCB A BONUS DEPOSIT HARIAN 01 5.000 22/09/2026 03:01:00 AM Agent Deposit Confirmed 22/09/2026 03:01:05 AM beb@mario08`;
const ad=auditBonuses(qrDouble,histDouble,{rate:0.05});
assert.equal(ad.length,1);
assert.equal(ad[0].doubleBonus,true);
assert.equal(ad[0].givenBonus,10000);
assert.equal(ad[0].status,'MISTAKE');
const ibd=processDailyBonus(histDouble,{sort:'amount-desc'});
assert.equal(ibd.rows.length,2);
assert.equal(ibd.rows.every(r=>r.doubleBonus),true);
assert.equal(ibd.duplicateCount,2);
console.log('DOUBLE BONUS SAME-DATE TEST PASSED');

// Overpayment = MISTAKE; underpayment = SUDAH DIBERIKAN.
const qrPay=`1 BEB@Pay BCA PrabuPay 200.000 22/09/2026 01:00:00 AM QR Pay Confirmed`;
const over=`1 BEB@Pay BCA SCB SCB A BONUS DEPOSIT HARIAN 01 12.000 22/09/2026 01:03:00 AM Agent Deposit Confirmed 22/09/2026 01:03:10 AM beb@mario08`;
const under=`1 BEB@Pay BCA SCB SCB A BONUS DEPOSIT HARIAN 01 8.000 22/09/2026 01:03:00 AM Agent Deposit Confirmed 22/09/2026 01:03:10 AM beb@mario08`;
const aOver=auditBonuses(qrPay,over,{rate:0.05});
assert.equal(aOver[0].expectedBonus,10000);
assert.equal(aOver[0].givenBonus,12000);
assert.equal(aOver[0].status,'MISTAKE');
const aUnder=auditBonuses(qrPay,under,{rate:0.05});
assert.equal(aUnder[0].givenBonus,8000);
assert.equal(aUnder[0].status,'SUDAH DIBERIKAN');
console.log('OVER/UNDER TEST PASSED');

// Input Bonus Harian: same-date duplicates only. Different date is not a duplicate.
const input=`1 BEB@Input BCA SCB SCB A BONUS DEPOSIT HARIAN 01 10.000 22/09/2026 03:00:00 AM Agent Deposit Confirmed 22/09/2026 03:00:05 AM beb@mario08
2 BEB@Input BCA SCB SCB A BONUS DEPOSIT HARIAN 01 5.000 22/09/2026 04:00:00 AM Agent Deposit Confirmed 22/09/2026 04:00:05 AM beb@mario08
3 BEB@Input BCA SCB SCB A BONUS DEPOSIT HARIAN 01 10.000 23/09/2026 03:00:00 AM Agent Deposit Confirmed 23/09/2026 03:00:05 AM beb@mario08`;
const ib=processDailyBonus(input,{sort:'amount-desc'});
assert.equal(ib.rows.length,3);
const sep22=ib.rows.filter(r=>r.date.startsWith('22/09/2026'));
const sep23b=ib.rows.filter(r=>r.date.startsWith('23/09/2026'));
assert.equal(sep22.length,2);
assert.equal(sep22.every(r=>r.doubleBonus),true);
assert.equal(sep23b.length,1);
assert.equal(sep23b[0].doubleBonus,false);
assert.equal(ib.duplicateCount,2);
console.log('INPUT BONUS CALENDAR-DAY TEST PASSED');

// Remark parser remains intact.
const parsedRemark=parseReport(`1 BEB@Y BCA SCB SCB A BONUS DEPOSIT HARIAN 01 25.000 22/09/2026 02:03:00 AM Agent Deposit Confirmed NO BONUS`);
assert.equal(parsedRemark[0].remarkStatus,'NO BONUS');

// Maximum bonus cap: expected bonus is never above Rp100,000 per username per calendar date.
const qrCap5=`1 BEB@Cap5 BCA PrabuPay 3.000.000 22/09/2026 05:00:00 AM QR Pay Confirmed`;
const histCap5=`1 BEB@Cap5 BCA SCB SCB A BONUS DEPOSIT HARIAN 01 100.000 22/09/2026 05:05:00 AM Agent Deposit Confirmed 22/09/2026 05:05:10 AM beb@mario08`;
const aCap5=auditBonuses(qrCap5,histCap5,{rate:0.05});
assert.equal(aCap5[0].depositAmount,3000000);
assert.equal(aCap5[0].expectedBonus,100000); // 5% = 150k, but capped at 100k
assert.equal(aCap5[0].givenBonus,100000);
assert.equal(aCap5[0].status,'SESUAI');

const qrCap10=`1 BEB@Cap10 BCA PrabuPay 2.000.000 22/09/2026 06:00:00 AM QR Pay Confirmed`;
const histCap10=`1 BEB@Cap10 BCA SCB SCB A BONUS DEPOSIT HARIAN 01 100.000 22/09/2026 06:05:00 AM Agent Deposit Confirmed 22/09/2026 06:05:10 AM beb@mario08`;
const aCap10=auditBonuses(qrCap10,histCap10,{rate:0.10});
assert.equal(aCap10[0].depositAmount,2000000);
assert.equal(aCap10[0].expectedBonus,100000); // 10% = 200k, but capped at 100k
assert.equal(aCap10[0].givenBonus,100000);
assert.equal(aCap10[0].status,'SESUAI');

const overCap=`1 BEB@CapOver BCA PrabuPay 3.000.000 22/09/2026 07:00:00 AM QR Pay Confirmed`;
const overCapHist=`1 BEB@CapOver BCA SCB SCB A BONUS DEPOSIT HARIAN 01 101.000 22/09/2026 07:05:00 AM Agent Deposit Confirmed 22/09/2026 07:05:10 AM beb@mario08`;
const aOverCap=auditBonuses(overCap,overCapHist,{rate:0.05});
assert.equal(aOverCap[0].expectedBonus,100000);
assert.equal(aOverCap[0].givenBonus,101000);
assert.equal(aOverCap[0].status,'MISTAKE');
console.log('MAXIMUM BONUS CAP TESTS PASSED');

console.log('ALL V1.4 TESTS PASSED');
