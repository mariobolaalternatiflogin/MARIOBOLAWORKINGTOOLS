import assert from 'node:assert/strict';
import {parseNewMembers, processNewMemberFirstDeposit, sortMemberFirstDepositRows} from '../member.js';

const newMembers = `# New Members

| ** ** | **Register Date** | **User Name** | **Full Name** | **Contact Number** | **Mobile Phone Number** | **E_mail** | **Bank Name** | **Account Name** | **Account Number** | **Suspend** | **Status** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 9/22/2026 10:21:30 PM | BEB\\@gacok212104 | ***** | *******36272 | | *****ek\\@gmail.com | GO PAY | MHD AGUNG KURNIAWAN | 08388614335 | No | Open |
| 2 | 9/22/2026 9:45:39 PM | BEB\\@Mamatdong8 | ******* pratama | *******54810 | | *******ernado810\\@gmail.com | SEABANK | Irdatam pratama | 901096837550 | No | Open |
| 3 | 9/22/2026 9:20:21 PM | BEB\\@Uwi | ***** | *******10804 | | *****tidwi4\\@gmail.com | BCA | Ubung | 8670979734 | No | Open |
| 4 | 9/22/2026 8:40:21 PM | BEB\\@fatimah25 | ******* | *******23232 | | *****@gmail.com | BCA | fatimah | 2250685176 | No | Open |`;

const qr = `| ** ** | **User Name** | **From Bank** | **To Bank** | **Amount** | **Reference** | **RRN** | **Date** | **Payment Method** | **Status** | **Invoice** | **Status Date** | **Remark** | **Edited By** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|618|BEB\\@bola87|DANA<br>Danu prakoso<br>08**2205***|PrabuPay<br>mariobola_oauser<br>id|**90.000**|17900848064099189||22/09/2026 09:46:46 PM|QR Pay|Confirmed|View|22/09/2026 09:47:31 PM|Abd|QRPay User|
|619|BEB\\@Mamatdong8|SEABANK<br>Irdatam pratama<br>90**96837***|PrabuPay<br>mariobola_oauser<br>id|**25.000**|17900848328862355||22/09/2026 09:47:13 PM|QR Pay|Confirmed|View|22/09/2026 09:47:56 PM|Abd|QRPay User|
|620|BEB\\@tepen33|BCA<br>Steven Iman Nuel<br>7125811582|PrabuPay<br>mariobola_oauser<br>id|**30.000**|17900848371231025||22/09/2026 09:47:17 PM|QR Pay|Confirmed|View|22/09/2026 09:48:11 PM|Abd|QRPay User|`;

const history = `| ** ** | **User Name** | **From Bank** | **To Bank** | **Amount** | **Date** | **Payment Method** | **Status** | **Status Date** | **Remark** | **Edited By** |
|---|---|---|---|---|---|---|---|---|---|---|---|
|395|BEB\\@Mamatdong8|SEABANK<br>Irdatam pratama<br>90**96837***|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|**1.250**|22/09/2026 09:55:18 PM|Agent Deposit|Confirmed|22/09/2026 09:57:29 PM||beb\\@mario08|
|396|BEB\\@bola87|DANA<br>Danu prakoso<br>08**2205***|SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01|**4.500**|22/09/2026 09:55:26 PM|Agent Deposit|Confirmed|22/09/2026 09:57:29 PM||beb\\@mario08|`;

const parsed = parseNewMembers(newMembers);
assert.equal(parsed.length,4);
assert.equal(parsed[1]['User Name'],'BEB@Mamatdong8');
assert.equal(parsed[1]['Register Date'],'9/22/2026 9:45:39 PM');

const result=processNewMemberFirstDeposit(newMembers,qr,history);
assert.equal(result.memberCount,4);
assert.equal(result.matchedCount,1);
assert.equal(result.noDepositCount,3);
assert.equal(result.rows.length,4);
assert.equal(result.rows[0].username,'BEB@fatimah25');
assert.equal(result.rows[0].depositAmount,0);
assert.equal(result.rows[1].username,'BEB@Uwi');
assert.equal(result.rows[1].depositAmount,0);
assert.equal(result.rows[2].username,'BEB@Mamatdong8');
assert.equal(result.rows[2].depositAmount,25000);
assert.equal(result.rows[3].username,'BEB@gacok212104');
assert.equal(result.rows[3].depositAmount,0);
assert.equal(result.rows[2].username,'BEB@Mamatdong8');
assert.equal(result.rows[2].depositAmount,25000);
assert.equal(result.rows[2].registerDateRaw,'9/22/2026 9:45:39 PM');
assert.equal(result.rows[2].depositSource,'qrpay');

const sorted=sortMemberFirstDepositRows(result.rows,'username-asc');
assert.equal(sorted[0].username,'BEB@fatimah25');
assert.equal(sorted[0].depositAmount,0);
assert.equal(sorted.find(x=>x.username==='BEB@Mamatdong8')?.depositAmount,25000);

// Same-day bank-to-bank Agent Deposit on a member bank is a valid member deposit.
const historyDeposit=`1 BEB@Uwi\nDANA\nUbung\n08**1***\nBCA\nBCA\nAccount\n12.000\n22/09/2026 09:30:00 PM\nAgent Deposit\nConfirmed\n22/09/2026 09:31:00 PM`;
const r2=processNewMemberFirstDeposit(newMembers,'',historyDeposit);
assert.equal(r2.rows.find(x=>x.username==='BEB@Uwi')?.depositAmount,12000);

// Deposit before registration on the same date must NOT match.
const historyEarly=`1 BEB@Uwi\nDANA\nUbung\n08**1***\nBCA\nBCA\nAccount\n12.000\n22/09/2026 08:00:00 PM\nAgent Deposit\nConfirmed\n22/09/2026 08:01:00 PM`;
const r3=processNewMemberFirstDeposit(newMembers,'',historyEarly);
assert.equal(r3.rows.some(x=>x.username==='BEB@Uwi'),true);
assert.equal(r3.rows.find(x=>x.username==='BEB@Uwi')?.depositAmount,0);
assert.equal(r3.rows.length,4);

console.log('MEMBER NEW FIRST DEPOSIT TESTS PASSED');
