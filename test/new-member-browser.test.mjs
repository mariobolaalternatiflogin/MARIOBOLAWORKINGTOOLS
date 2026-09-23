import assert from 'node:assert/strict';
import {parseNewMembers, processNewMemberFirstDeposit} from '../member.js';

const nm=`1
9/22/2026 10:21:30 PM
BEB@gacok212104
*****
*******36272
GO PAY
MHD AGUNG KURNIAWAN
08388614335
No
Open
2
9/22/2026 9:45:39 PM
BEB@Mamatdong8
******* pratama
*******54810
SEABANK
Irdatam pratama
901096837550
No
Open`;
const parsed=parseNewMembers(nm);
assert.equal(parsed.length,2);
assert.equal(parsed[0]['User Name'],'BEB@gacok212104');
assert.equal(parsed[1]['User Name'],'BEB@Mamatdong8');
assert.equal(parsed[1]['Register Date'],'9/22/2026 9:45:39 PM');

const hist=`619 BEB@Mamatdong8\nSEABANK\nIrdatam pratama\n90**96837***\nBCA\nBCA\nAccount\n25.000\n22/09/2026 09:47:13 PM\nAgent Deposit\nConfirmed\n22/09/2026 09:47:56 PM`;
const result=processNewMemberFirstDeposit(nm,'',hist);
assert.equal(result.matchedCount,1);
assert.equal(result.rows[0].username,'BEB@Mamatdong8');
assert.equal(result.rows[0].depositAmount,25000);
console.log('NEW MEMBER BROWSER COPY TEST PASSED');
