[Uploading README.md…]()
# Working Tools — Bonus + Member Module v2.2

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
- Output: NO, REGISTER DATE, USERNAME, FIRST DEPOSIT; Excel copy uses tab-separated 4 columns and integer nominal values. Semua New Members tetap ditampilkan; member tanpa deposit = 0.

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


## v2.2 — New Member First Deposit 4 kolom + Safety Bet database linkage
- 2.2 menghasilkan semua New Members yang dipaste, termasuk yang tidak deposit (FIRST DEPOSIT = 0).
- Output UI dan Copy Excel menjadi 4 kolom TAB-separated: NO, REGISTER DATE, USERNAME, FIRST DEPOSIT.
- Nomor urut mengikuti urutan hasil saat ini, dimulai dari 1.
- 2.1 Safety Bet tetap disimpan sebagai database lokal browser (`localStorage`) dan menjadi acuan blacklist pada 1.1.
- Username yang ada di database 2.1 ditandai satu baris penuh merah pada 1.1 dengan label `DI BLACKLIST MEMBER SB` dan alasan/keterangan yang tersimpan.
- Blacklist pada 1.1 adalah overlay tampilan/operasional; mesin parser `parser.js` tidak diubah.
- Jam header tetap Asia/Jakarta (GMT+7) dan hanya untuk tampilan.

## v2.5 — 3.1 Cashback Mingguan Slot
- Input utama berupa upload file Excel `.xlsx`, bukan copy-paste.
- Sistem membaca kolom `Username` dan `WinLoseAmt` dari worksheet report.
- Hanya kekalahan minimal Rp500.000 yang diambil. Pada format laporan yang diuji, `WinLoseAmt = -500` setara Rp500.000 dan `WinLoseAmt = -1129.35` setara -Rp1.129.350.
- Baris `TOTAL` dan footer laporan tidak diperlakukan sebagai member.
- Nilai tampilan tetap mengikuti format laporan, sedangkan Copy ke Excel mengubah nilai menjadi integer rupiah (contoh `-1,129.35` → `-1129350`).
- Filter game terbentuk dari nama file, maksimal 6 game unik. SEMUA GAME menggabungkan total kekalahan per username dari semua game yang diunggah.
- Mesin parser BONUS/MEMBER lama tidak diubah.


## v2.6 Cashback rounding update
3.1 Cashback Mingguan Slot rounds the final loss amount to the nearest whole thousand-unit before display/export: below .50 rounds toward zero, .50 and above rounds away from zero.

## v2.7 Cashback output notation update
The 3.1 result and Excel copy now omit the trailing `.000` after rounding. Examples: `-29,647.99` -> `-29,648`; `-19,955.29` -> `-19,955`; `-19,955.50` -> `-19,956`. Excel copy uses the same rounded whole-thousand-unit integer (`-29648`, `-19955`, `-19956`) and does not multiply it by 1,000.
