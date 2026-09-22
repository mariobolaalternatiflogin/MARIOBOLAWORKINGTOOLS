[Uploading README.md…]()
# Working Tools — Bonus Module v1.8

This ZIP contains the Bonus module with two tools:

## 1.1 Cek Bonus
The existing 1.1 parser and reconciliation logic are preserved. v1.8 does not alter its business rules.

## 1.2 Input Bonus Harian
Reads every `Confirmed` transaction where `To Bank` contains `SCB A BONUS DEPOSIT HARIAN` from the pasted Deposit Request History. It uses the transaction Date/Time present in the pasted data, not the system date.

The output is designed for Excel:

- Column 1: `USERNAME`
- Column 2: `NOMINAL BONUS`

Nominal is copied as an integer only, e.g. `25.000` becomes `25000` with no decimal/thousands separators.

Default sort: nominal largest to smallest. Other sort options: nominal smallest to largest, username A-Z, username Z-A.

Every matching daily-bonus transaction is retained. Multiple bonuses for the same username on the same calendar date are flagged in the audit metadata as double bonus, but they are not suppressed from Input Bonus Harian.

`Edited By` is ignored.
