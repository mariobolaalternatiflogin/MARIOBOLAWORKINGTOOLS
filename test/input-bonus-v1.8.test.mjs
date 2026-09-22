import assert from 'node:assert/strict';
import {parseReport, processDailyBonus} from '../parser.js';

const sample = `# Deposit History

| ** ** | **User Name** | **From Bank** | **To Bank** | **Deposit** | **Date/Time** | **Edited By** |
| ----- | --------------- | ------------------------------------------------ | --------------------------------------- | ----------- | ---------------- | ------------- |
| 1 | BEB\\@Sf0810 | DANA<br>Sultan Faiz Alfalah<br>08**19087*** | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 25.000 | 22/09/2026 00:03 | beb\\@mario08 |
| 2 | BEB\\@Copler27 | BCA<br>Ismail Nadhom<br>1012091804 | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 10.000 | 22/09/2026 00:03 | beb\\@mario08 |
| 3 | BEB\\@msptra55 | GO PAY<br>Muhamadsaputra<br>08**98013*** | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 3.000 | 22/09/2026 00:03 | beb\\@mario08 |
| 4 | BEB\\@Wakleng123 | BNI<br>Sufriyadi<br>1888017846 | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 15.000 | 22/09/2026 00:04 | beb\\@mario08 |
| 5 | BEB\\@bily12 | DANA<br>pipit<br>08**15990*** | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 2.500 | 22/09/2026 00:04 | beb\\@mario08 |
| 6 | BEB\\@Rojan003 | DANA<br>Zul fadly<br>08**64185*** | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 2.500 | 22/09/2026 00:07 | beb\\@mario08 |
| 7 | BEB\\@Taian234 | BCA<br>Wanri damanik<br>0280317594 | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 3.500 | 22/09/2026 00:07 | beb\\@mario08 |
| 8 | BEB\\@GOODINEZ | GO PAY<br>Adittiajuliyansah<br>08**91942*** | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 4.000 | 22/09/2026 00:07 | beb\\@mario08 |
| 9 | BEB\\@Edho | BRI<br>Riliando<br>016401075757509 | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 2.500 | 22/09/2026 00:12 | beb\\@mario08 |`;

const parsed = parseReport(sample, 'deposit-history');
assert.equal(parsed.length, 9);
assert(parsed.every(r => r.toBank.includes('SCB A BONUS DEPOSIT HARIAN')));

const result = processDailyBonus(sample, {sort:'amount-desc'});
assert.equal(result.rows.length, 9);
assert.deepEqual(result.rows.map(r => [r.username, r.amount]), [
  ['BEB@Sf0810',25000],
  ['BEB@Wakleng123',15000],
  ['BEB@Copler27',10000],
  ['BEB@GOODINEZ',4000],
  ['BEB@Taian234',3500],
  ['BEB@msptra55',3000],
  ['BEB@bily12',2500],
  ['BEB@Rojan003',2500],
  ['BEB@Edho',2500],
]);
assert.equal(result.distinctDates.length, 1);
assert.equal(result.distinctDates[0], '2026-09-22');
assert.equal(result.duplicateCount, 0);

// Input 1.2 must keep every matching bonus transaction, including a duplicate username.
const duplicateSample = sample.replace(
  '| 9 | BEB\\@Edho | BRI<br>Riliando<br>016401075757509 | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 2.500 | 22/09/2026 00:12 | beb\\@mario08 |',
  '| 9 | BEB\\@Edho | BRI<br>Riliando<br>016401075757509 | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 2.500 | 22/09/2026 00:12 | beb\\@mario08 |\n| 10 | BEB\\@Edho | BRI<br>Riliando<br>016401075757509 | SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01 | 1.000 | 22/09/2026 00:20 | beb\\@mario08 |'
);
const dup = processDailyBonus(duplicateSample, {sort:'amount-desc'});
assert.equal(dup.rows.length, 10);
assert.equal(dup.rows.filter(r=>r.username==='BEB@Edho').length, 2);
assert(dup.rows.filter(r=>r.username==='BEB@Edho').every(r=>r.doubleBonus));

// All other To Bank values must not be pulled into Input Bonus Harian.
const nonBonus = sample.replaceAll('SCB<br>SCB A BONUS DEPOSIT HARIAN<br>01','BRI<br>RAHMAT<br>123456789');
const none = processDailyBonus(nonBonus);
assert.equal(none.rows.length, 0);

console.log('V1.8 INPUT BONUS TESTS PASSED');
