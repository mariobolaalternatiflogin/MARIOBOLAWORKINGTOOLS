[README.md](https://github.com/user-attachments/files/32568174/README.md)
# Working Tools — Bonus + Member Module v2.1

## Scope
Version 2.0 adds the MEMBER module while keeping the existing 1.1/1.2 Bonus behavior intact.

### 1.1 Cek Bonus — LOCKED
`parser.js` is unchanged from v1.9 byte-for-byte. The existing QRPay/Member Deposit classification, same-calendar-day bonus rule, blacklist remark handling, double-bonus logic, mistake logic, and Rp100.000 cap remain unchanged.

### 1.2 Input Bonus Harian
Existing 1.2 behavior is retained: reads `To Bank` containing `SCB A BONUS DEPOSIT HARIAN`, ignores report total/footer metadata, and supports 2-column Excel copy (`USERNAME` + integer bonus).

### 2.1 Daftar Member Safety Bet
- Store username, reason, and optional additional note in browser `localStorage`.
- Reasons: SB, NB, Safety Bet, Tidak Mau Bonus, Tidak Pernah Capai TO, Hanya Main Bonus, SB BOLA, SB Cassino.
- Existing username is updated rather than duplicated.
- Saved usernames are applied as a persistent blacklist overlay in 1.1 Cek Bonus and shown as a full red row with BLACKLIST.

### 2.2 New Member First Deposit
- Inputs: Deposit Request History (QRPay), Deposit Request History, and New Members.
- QRPay and Deposit Request History deposits use the exact reader/classification already used by 1.1; `Agent Deposit` to member-facing banks remains a member deposit, while `SCB A BONUS DEPOSIT HARIAN` remains a bonus transaction.
- New Members registration date/time is parsed in the report's `M/D/YYYY h:mm:ss AM/PM` format and matched to deposits using the same calendar date.
- Deposit must occur at or after the registration time on that date.
- First deposit is the earliest eligible confirmed deposit from QRPay or Member Deposit.
- Output: REGISTER DATE, USERNAME, FIRST DEPOSIT; Excel copy uses tab-separated 3 columns and integer nominal values.

### Clock
Header clock is fixed to `Asia/Jakarta` (GMT+7) for display only. It is not used by any parser, date filter, matching, or calculation.


## v2.1 — New Member First Deposit: tampilkan semua New Members

Perubahan hanya pada modul MEMBER 2.2:
- Semua baris New Members yang dipaste tetap ditampilkan, meskipun tidak melakukan deposit.
- Member tanpa deposit yang memenuhi syarat mendapat nominal `0`.
- Member dengan deposit mendapat nominal first deposit yang paling awal, dari QRPay atau Deposit Request History, selama deposit confirmed terjadi pada tanggal kalender yang sama dan setelah waktu register.
- Urutan default tetap berdasarkan Register Date paling awal ke paling akhir.
- Copy ke Excel tetap 3 kolom TAB-separated: Register Date, Username, First Deposit. Nominal selalu integer tanpa titik/koma.
- Logika parser inti `parser.js` untuk 1.1 Cek Bonus dan 1.2 Input Bonus Harian tidak diubah.
