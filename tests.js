// Automated regression tests for the bonus parser.
// Run in a browser console after app loads: WorkingToolsTests.run()
(function(){
const C=window.WorkingToolsCore;
function assert(ok,msg){if(!ok)throw new Error(msg)}
window.WorkingToolsTests={run(){
 let qr=`| 1 | BEB@senja95 | DANA<br>henra Lumban Batu<br>08**50892*** | PrabuPay<br>mariobola_oauser | **500.000** | 17890561011479310 | | 11/09/2026 12:01:41 AM | QR Pay | Confirmed | View | 11/09/2026 12:02:50 AM | Abd | QRPay User |
| 2 | BEB@doyol212 | DANA<br>muhammad hanar lubis<br>08**70768*** | PrabuPay<br>mariobola_oauser | **50.000** | 17890561940439042 | | 11/09/2026 12:03:14 AM | QR Pay | Confirmed | View | 11/09/2026 12:04:07 AM | Abd | QRPay User |`;
 let bonus=`| 1 | BEB@senja95 | DANA<br>henra Lumban Batu<br>08**50892*** | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | **25.000** | 11/09/2026 12:07:14 AM | Agent Deposit | Confirmed | 11/09/2026 12:08:25 AM | | beb@mario08 |
| 2 | BEB@doyol212 | DANA<br>muhammad hanar lubis<br>08**70768*** | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | **2.500** | 11/09/2026 12:05:59 AM | Agent Deposit | Confirmed | 11/09/2026 12:06:56 AM | | beb@mario08 |`;
 let r=C.auditBonus(bonus,qr,'',5,100000,[]);
 assert(r.rows.length===2,'browser rows parsed');
 let s=r.rows.find(x=>x.id==='BEB@SENJA95'); assert(s.basis===500000,'QR amount parsed'); assert(s.given===25000,'bonus amount parsed'); assert(s.status==='SESUAI','matched bonus');
 r=C.auditBonus(`BEB@A | 500000 | 11/09/2026 01:00:00 AM | Confirmed | Member Deposit\nBEB@A | 25000 | 11/09/2026 01:05:00 AM | Confirmed | SCB A BONUS DEPOSIT HARIAN`,'','',5,100000,[]); assert(r.rows[0].status==='SESUAI','basic audit');
 r=C.auditBonus(`BEB@A | 100000 | 2026-09-11 | Confirmed | Member Deposit`,'','BEB@A | NO BONUS | 2026-09-11',5,100000,[]); assert(r.rows[0].status==='TIDAK DAPAT BONUS','NO BONUS exclusion');
 r=C.auditBonus(`BEB@A | 100000 | 2026-09-11 | Confirmed | Member Deposit\nBEB@A | 5000 | 2026-09-11 | Confirmed | SCB A BONUS DEPOSIT HARIAN\nBEB@A | 5000 | 2026-09-11 | Confirmed | SCB A BONUS DEPOSIT HARIAN`,'','',5,100000,[]); assert(r.rows[0].status==='DOBEL BONUS','double bonus');
 r=C.auditBonus(`BEB@A | 100000 | 2026-09-11 | Confirmed | Member Deposit`,'','BEB@A | MEMBER LANJUT MAIN | 2026-09-11',5,100000,[]); assert(r.rows[0].status==='TIDAK DAPAT BONUS','member lanjut main exclusion');
 r=C.auditBonus(`BEB@A | 100000 | 2026-09-11 | Confirmed | Member Deposit`,'','BEB@A | Safety Bet | 2026-09-11',5,100000,[]); assert(r.rows[0].status==='TIDAK DAPAT BONUS','safety bet exclusion');
 r=C.auditBonus(`BEB@A | 100000 | 2026-09-11 | Confirmed | Member Deposit`,'','BEB@A | SB | 2026-09-11',5,100000,[]); assert(r.rows[0].status==='TIDAK DAPAT BONUS','SB exclusion');
 r=C.auditBonus(`BEB@A | 100000 | 2026-09-11 | Confirmed | Member Deposit`,'','',5,100000,[{id:'BEB@A',category:'SAFETY BET'}]); assert(r.rows[0].status==='TIDAK DAPAT BONUS','manual safety exclusion');
 r=C.auditBonus(`BEB@A | 100000 | 2026-09-11 | Confirmed | Member Deposit`,'','',5,100000,[]); assert(r.rows[0].status==='BELUM DIBERIKAN','missing bonus');
 r=C.parseNum('25.000')===25000; assert(r,'Indonesian number');
 return 'ALL TESTS PASSED';
}}
})();
