// Run with a browser console after app loads: WorkingToolsTests.run()
(function(){
const C=window.WorkingToolsCore;
function assert(ok,msg){if(!ok)throw new Error(msg)}
window.WorkingToolsTests={run(){
 let r=C.auditBonus('User Name | Amount | Date | Status | Remark\nBEB@A | 500000 | 2026-09-11 | Confirmed | Member Deposit\nBEB@A | 25000 | 2026-09-11 | Confirmed | SCB A BONUS DEPOSIT HARIAN');
 assert(r.rows.length===1,'bonus group');assert(r.rows[0].expected===25000,'5% expected');assert(r.rows[0].status==='SESUAI','status');
 r=C.auditBonus('User Name | Amount | Date | Status | Remark\nBEB@A | 5000000 | 2026-09-11 | Confirmed | Member Deposit\nBEB@A | 100000 | 2026-09-11 | Confirmed | SCB A BONUS DEPOSIT HARIAN');assert(r.rows[0].expected===100000,'cap');
 r=C.auditBonus('User Name | Amount | Date | Status | Remark\nBEB@A | 100000 | 2026-09-11 | Confirmed | Member Deposit');assert(r.rows[0].status==='BELUM DAPAT','no bonus');
 r=C.auditBonus('User Name | Amount | Date | Status | Remark\nBEB@A | 100000 | 2026-09-11 | Confirmed | Member Deposit\nBEB@A | 5000 | 2026-09-11 | Confirmed | SCB A BONUS DEPOSIT HARIAN\nBEB@A | 5000 | 2026-09-11 | Confirmed | SCB A BONUS DEPOSIT HARIAN');assert(r.rows[0].double===true,'double');
 r=C.parseFirstDeposits('User Name | Date\nBEB@NEW | 2026-09-11','User Name | Amount | Date | Status | Remark\nBEB@NEW | 100000 | 2026-09-11 | Confirmed | Member Deposit');assert(r[0].same===true,'first deposit same day');
 r=C.parseRanking('ID Member | Bonus\nBEB@B | 100000\nBEB@A | 25000').sort((a,b)=>a.amount-b.amount);assert(r[0].id==='BEB@A','ranking');
 return 'ALL TESTS PASSED';}}
})();
