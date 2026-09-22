import assert from 'node:assert/strict';
import {processDailyBonus} from '../parser.js';

const markdown = `# Deposit History

| ** ** | **User Name** | **From Bank** | **To Bank** | **Deposit** | **Date/Time** | **Edited By** |
| ----- | --------------- | ------------------------------------------------ | --------------------------------------- | ----------- | ---------------- | ------------- |
| 404 | BEB\\@Tungtung77 | DANA<br>ALFIAN<br>08**36191*** | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 2.000 | 22/09/2026 23:54 | beb\\@mario08 |
| 405 | BEB\\@Kael1 | MANDIRI<br>Michael Hany Situmorang<br>1070016978662 | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 2.400 | 22/09/2026 23:54 | beb\\@mario08 |
| 406 | BEB\\@Pingky | DANA<br>Rahmat pandi hasibuan<br>08**62655*** | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 1.500 | 22/09/2026 23:54 | beb\\@mario08 |
|   |   |   |   | 2,432.400 |   |   |
« ‹ Page of 1 › »`;

const md = processDailyBonus(markdown,{sort:'amount-desc'});
assert.deepEqual(md.rows.map(r=>[r.username,r.amount]), [
  ['BEB@Kael1',2400],
  ['BEB@Tungtung77',2000],
  ['BEB@Pingky',1500]
]);
assert(!md.rows.some(r=>r.amount===2432400));
assert.equal(md.rows.find(r=>r.username==='BEB@Pingky').amount,1500);

const browser = `404 BEB@Tungtung77 DANA
ALFIAN
08**36191*** SCB
SCB A BONUS DEPOSIT HARIAN
01 2.000 22/09/2026 11:54:00 PM beb@mario08
405 BEB@Kael1 MANDIRI
Michael Hany Situmorang
1070016978662 SCB
SCB A BONUS DEPOSIT HARIAN
01 2.400 22/09/2026 11:54:10 PM beb@mario08
406 BEB@Pingky DANA
Rahmat pandi hasibuan
08**62655*** SCB
SCB A BONUS DEPOSIT HARIAN
01 1.500 22/09/2026 11:54:20 PM beb@mario08
2,432.400
« ‹ Page
1
of 1 › »`;

const br = processDailyBonus(browser,{sort:'amount-desc'});
assert.deepEqual(br.rows.map(r=>[r.username,r.amount]), [
  ['BEB@Kael1',2400],
  ['BEB@Tungtung77',2000],
  ['BEB@Pingky',1500]
]);
assert(!br.rows.some(r=>r.amount===2432400));
assert.equal(br.rows.find(r=>r.username==='BEB@Pingky').amount,1500);

console.log('FOOTER TOTAL TOLERANCE TESTS PASSED');
