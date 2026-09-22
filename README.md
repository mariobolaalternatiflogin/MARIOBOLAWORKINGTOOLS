[README.md](https://github.com/user-attachments/files/32529977/README.md)
# Working Tools — Bonus Module v1.4

Versi mandiri yang difokuskan pada:
1. Cek Bonus
2. Input Bonus Harian

## Sumber
- Deposit Request History (QRPay) = sumber deposit aktual.
- Deposit Request History = sumber bonus/agent deposit dan member deposit.

## Aturan utama v1.4 — SATU BONUS PER TANGGAL KALENDER + BATAS BONUS RP100.000
- Maksimal **1 bonus deposit untuk 1 username dalam 1 tanggal kalender (00:00–23:59)**.
- Ini **bukan rolling 24 jam**.
- QRPay dan Member Deposit digabung sebagai satu sumber deposit lintas metode, tetapi tetap berada dalam **tanggal kalender yang sama**.
- Bonus pada tanggal berbeda **tidak boleh memakai deposit dari tanggal sebelumnya**.
- Bonus Confirmed hanya valid bila terdapat deposit Confirmed username yang sama pada **tanggal kalender yang sama** dan waktunya **lebih dulu** daripada bonus.
- Jika bonus terjadi pada tanggal berikutnya dan tidak ada deposit pada tanggal tersebut, bonus dianggap **bonus tanpa deposit pada tanggal yang sama** dan statusnya **MISTAKE**.
- Jika bonus terjadi sebelum deposit pada tanggal yang sama, bonus tersebut juga dianggap **MISTAKE** karena urutan waktunya salah.
- Jika username sudah memperoleh 1 bonus normal pada tanggal tersebut, semua deposit berulang pada tanggal yang sama tidak membuat baris bonus baru. Ini berlaku untuk kombinasi QRPay maupun Member Deposit.
- Username yang sama dapat memperoleh bonus lagi pada **tanggal berikutnya**, tetapi hanya bila tanggal berikutnya mempunyai deposit yang valid pada tanggal tersebut.
- Lebih dari satu bonus Confirmed normal untuk username yang sama pada tanggal yang sama = **DOUBLE BONUS** dan status **MISTAKE**.
- **Batas maksimum bonus deposit**: berapa pun nominal deposit dan apakah rate **5% maupun 10%**, expected bonus maksimal **Rp100.000 per username per tanggal kalender**. Rumus: `min(deposit × rate, 100000)`.
- Contoh: deposit Rp3.000.000 pada 5% = expected Rp100.000 (bukan Rp150.000); deposit Rp2.000.000 pada 10% = expected Rp100.000 (bukan Rp200.000).
- Bila bonus yang diberikan melebihi expected setelah batas Rp100.000 diterapkan, status = **MISTAKE**.
- Bonus yang totalnya melebihi expected = **MISTAKE**.
- Kekurangan bonus tidak diberi status shortage; bila bonus sudah diberikan tetapi di bawah expected, status = **SUDAH DIBERIKAN**.
- Jika bonus diberikan lebih dari sekali pada tanggal yang sama, seluruh nominal bonus yang relevan tetap ditampilkan dalam audit sehingga kesalahan dapat terlihat.

## Contoh BEB@Maracana
```text
22/09 10:00  QRPay          500.000   <- deposit eligible
22/09 10:05  Bonus          25.000   <- bonus valid
22/09 15:00  Member Deposit 500.000   <- deposit berulang, tidak ditampilkan lagi

Hasil: 1 periode, SESUAI, DOUBLE BONUS = TIDAK
```

Contoh lintas tanggal:
```text
22/09 23:50  QRPay          500.000   <- deposit
23/09 00:05  Bonus          25.000   <- TIDAK boleh memakai deposit 22/09

Hasil pada 23/09: MISTAKE — BONUS TANPA DEPOSIT PADA TANGGAL YANG SAMA
```

Contoh tanggal berikutnya yang sah:
```text
22/09 23:50  QRPay          500.000   <- siklus 22/09
23/09 00:01  Member Deposit 400.000   <- deposit baru pada 23/09
23/09 00:05  Bonus          20.000   <- valid untuk 23/09
```

## Parsing
- `Edited By` diabaikan total dan tidak dipakai untuk matching, filter, atau output.
- Username mempertahankan prefix `BEB@`.
- Waktu deposit diambil dari kolom `Date` dan dipertahankan sampai detik.
- Nominal laporan `500.000` dinormalisasi menjadi `500000`.
- QRPay: transaksi `Confirmed` dengan nominal > 0 dianggap deposit aktual.
- History: `Payment Method = Member Deposit` dianggap `MEMBER_DEPOSIT`.
- Fallback: `Agent Deposit` + salah satu `From Bank`/`To Bank` mengandung `Member Deposit` juga diklasifikasikan sebagai `MEMBER_DEPOSIT`.
- Bonus harian: `Payment Method = Agent Deposit` dan `To Bank` mengandung `SCB A BONUS DEPOSIT HARIAN`.
- Remark yang diblokir: SAFETY BET, SB, NO BONUS, TIDAK MAU BONUS, NB, BATAL WD, WD DIKEMBALIKAN KE MEMBER, MEMBER LANJUT MAIN, WD DIKEMBALIKAN MEMBER LANJUT MAIN.
- Parser mendukung format Markdown table, TSV, dan copy langsung dari browser dengan row multiline.

## Input Bonus Harian
- Tidak bergantung pada tanggal sistem.
- Semua bonus `SCB A BONUS DEPOSIT HARIAN` Confirmed yang normal diproses.
- DOUBLE BONUS pada Input Bonus Harian dihitung berdasarkan **username + tanggal kalender yang sama**, bukan rolling 24 jam.
- Urutan tetap dapat dipilih berdasarkan nominal besar→kecil, kecil→besar, username A→Z, atau Z→A.

## Menjalankan
Buka `index.html` di browser modern. Tidak membutuhkan server.

## Audit internal
Automated tests berada di `test/parser.test.mjs` dan mencakup:
- QRPay parsing
- Deposit History parsing
- browser copy multiline
- nominal
- timestamp
- `Edited By` diabaikan
- satu bonus per username per tanggal
- QRPay + Member Deposit lintas metode pada tanggal yang sama
- deposit berulang pada tanggal yang sama disaring
- lintas tengah malam tidak boleh match
- bonus tanpa deposit pada tanggal yang sama = MISTAKE
- bonus sebelum deposit pada tanggal yang sama = MISTAKE
- double bonus pada tanggal yang sama
- bonus pada tanggal berikutnya dengan deposit baru yang sama tanggal tetap valid
- over bonus = MISTAKE
- underpayment = SUDAH DIBERIKAN
