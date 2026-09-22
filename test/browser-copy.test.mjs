import assert from 'node:assert/strict';
import {parseReport,auditBonuses,processDailyBonus} from '../parser.js';

const qr=`727 BEB@Fahmiolo BCA\nMuhammad Fahmi\n0941978168 PrabuPay\nmariobola_oauser\n4398778-be92-469d-bd58-cb6a18a886e7 1,050.000 17900927488641523\n22/09/2026 11:59:09 PM QR Pay Confirmed View 22/09/2026 11:59:19 PM Abd QRPay User\n121,458.664`;
const hist=`465 BEB@Pingky DANA\nRahmat pani habisuan\n08**6265**** SCB\nSCB A BONUS DEPOSIT HARIAN\n01 1.500 22/09/2026 11:53:22 PM Agent Deposit Confirmed 22/09/2026 11:54:07 PM beb@mario08\n`;
const p=parseReport(qr,'qrpay');
console.log('QR',p);
assert.equal(p.length,1); assert.equal(p[0].username,'BEB@Fahmiolo'); assert.equal(p[0].amount,1050000); assert.equal(p[0].dateRaw,'22/09/2026 11:59:09 PM'); assert.equal(p[0].paymentMethod,'QR Pay'); assert.equal(p[0].status,'Confirmed');
const h=parseReport(hist,'deposit-history');
console.log('HIST',h);
assert.equal(h.length,1); assert.equal(h[0].username,'BEB@Pingky'); assert.equal(h[0].amount,1500); assert.equal(h[0].transactionType,'DAILY_BONUS'); assert.equal(h[0].dateRaw,'22/09/2026 11:53:22 PM');
console.log('BROWSER COPY TEST PASSED');
const qr3=`727 BEB@Pingky BCA\nRahmat pani habisuan\n08**6265**** PrabuPay\nmariobola_oauser\n4398778-be92-469d-bd58-cb6a18a886e7 30.000 17900927488641523\n22/09/2026 11:50:09 PM QR Pay Confirmed View 22/09/2026 11:51:19 PM QRPay User`;
const a=auditBonuses(qr3,hist,{rate:0.05});
console.log('AUDIT',a);
assert.equal(a.length,1); assert.equal(a[0].depositAmount,30000); assert.equal(a[0].expectedBonus,1500); assert.equal(a[0].givenBonus,1500); assert.equal(a[0].status,'SESUAI');
console.log('FULL BROWSER AUDIT PASSED');
