import assert from 'node:assert/strict';
import {parseReport,auditBonuses,processDailyBonus} from '../parser.js';
const qr=`| | **User Name** | **From Bank** | **To Bank** | **Amount** | **Reference** | **RRN** | **Date** | **Payment Method** | **Status** | **Invoice** | **Status Date** | **Remark** | **Edited By** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|1|BEB\\@Sf0810|DANA<br>Sultan Faiz Alfalah<br>08**19087***|PrabuPay<br>mariobola_oauser<br>id|**500.000**|179| |22/09/2026 12:00:37 AM|QR Pay|Confirmed|View|22/09/2026 12:01:23 AM| |QRPay User|`;
const history=`| ** ** | **User Name** | **From Bank** | **To Bank** | **Amount** | **Date** | **Payment Method** | **Status** | **Status Date** | **Remark** | **Edited By** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
|1|BEB\\@Sf0810|DANA<br>Sultan Faiz Alfalah<br>08**19087***|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|**25.000**|22/09/2026 12:03:28 AM|Agent Deposit|Confirmed|22/09/2026 12:03:57 AM||beb\\@mario08|`;
const p=parseReport(qr,'qrpay'); assert.equal(p[0].username,'BEB@Sf0810'); assert.equal(p[0].amount,500000); assert.equal(p[0].editedBy,'');
const h=parseReport(history,'deposit-history'); assert.equal(h[0].transactionType,'DAILY_BONUS'); assert.equal(h[0].amount,25000); assert.equal(h[0].editedBy,'');
const a=auditBonuses(qr,history,{rate:0.05}); assert.equal(a.length,1); assert.equal(a[0].expectedBonus,25000); assert.equal(a[0].givenBonus,25000); assert.equal(a[0].status,'SESUAI'); assert.equal(a[0].doubleBonus,false);
const ib=processDailyBonus(history,{sort:'amount-desc'}); assert.equal(ib.rows.length,1); assert.equal(ib.rows[0].username,'BEB@Sf0810'); assert.equal(ib.rows[0].amount,25000);
console.log('ALL TESTS PASSED');
const qr2=`| | User Name | From Bank | To Bank | Amount | Date | Payment Method | Status | Remark | Edited By |
|---|---|---|---|---|---|---|---|---|---|
|1|BEB@X|BCA|PrabuPay|100.000|22/09/2026 01:00:00 AM|QR Pay|Confirmed||bad-user|
|2|BEB@X|BCA|PrabuPay|200.000|22/09/2026 02:00:00 AM|QR Pay|Confirmed||bad-user|`;
const h2=`| | User Name | From Bank | To Bank | Amount | Date | Payment Method | Status | Status Date | Remark | Edited By |
|---|---|---|---|---|---|---|---|---|---|---|---|
|1|BEB@X|BCA|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|12.000|22/09/2026 02:03:00 AM|Agent Deposit|Confirmed|||bad-user|
|2|BEB@Y|BCA|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|25.000|22/09/2026 02:03:00 AM|Agent Deposit|Confirmed||NO BONUS|bad-user|`;
const a2=auditBonuses(qr2,h2,{rate:0.05}); assert.equal(a2.length,1); assert.equal(a2[0].depositAmount,200000); assert.equal(a2[0].expectedBonus,10000); assert.equal(a2[0].givenBonus,12000); assert.equal(a2[0].status,'LEBIH BONUS');
const h3=`| | User Name | From Bank | To Bank | Amount | Date | Payment Method | Status | Status Date | Remark | Edited By |
|---|---|---|---|---|---|---|---|---|---|---|---|
|1|BEB@Z|BCA|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|5.000|22/09/2026 03:00:00 AM|Agent Deposit|Confirmed|||x|
|2|BEB@Z|BCA|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|5.000|22/09/2026 03:01:00 AM|Agent Deposit|Confirmed|||y|`;
const ib3=processDailyBonus(h3,{sort:'amount-desc'}); assert.equal(ib3.rows.length,2); assert.equal(ib3.rows.every(r=>r.doubleBonus),true); assert.equal(ib3.duplicateCount,2);
const parsedRemark=parseReport(h2); assert.equal(parsedRemark[1].remarkStatus,'NO BONUS');
console.log('EDGE CASE TESTS PASSED');
