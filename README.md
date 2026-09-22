# Working Tools — Bonus Module v1.0

Versi mandiri yang difokuskan hanya pada:
1. Cek Bonus
2. Input Bonus Harian

## Sumber
- Deposit Request History (QRPay) = sumber deposit aktual.
- Deposit Request History = sumber bonus/agent deposit dan remark.

## Aturan penting
- `Edited By` diabaikan total dan tidak dipakai dalam parsing, matching, filter, maupun output.
- Username mempertahankan prefix `BEB@`.
- Waktu deposit diambil dari kolom `Date` pada QRPay dan dipertahankan sampai detik.
- Nominal laporan `500.000` dinormalisasi menjadi `500000`.
- QRPay: transaksi `Confirmed` dengan nominal > 0 dianggap deposit aktual.
- History: `Payment Method = Member Deposit` dianggap `MEMBER_DEPOSIT`.
- Fallback permintaan pengguna: `Agent Deposit` + `From Bank` atau `To Bank` mengandung `Member Deposit` dianggap `MEMBER_DEPOSIT`. Ini adalah fallback, bukan aturan utama.
- Bonus harian: `Payment Method = Agent Deposit` dan `To Bank` mengandung `SCB A BONUS DEPOSIT HARIAN`.
- Remark yang diblokir: SAFETY BET, SB, NO BONUS, TIDAK MAU BONUS, NB, BATAL WD, WD DIKEMBALIKAN KE MEMBER, MEMBER LANJUT MAIN, WD DIKEMBALIKAN MEMBER LANJUT MAIN.
- Tidak ada syarat bahwa tanggal transaksi harus sama dengan tanggal sistem.
- Cek Bonus memilih deposit TERBARU per username dari QRPay, lalu mencari bonus Confirmed pada username yang sama setelah waktu deposit dalam jendela default 24 jam. Exact amount bonus diprioritaskan.
- Hide/Show bersifat tampilan saja dan tidak menghapus data.

## Menjalankan
Buka `index.html` di browser modern. Tidak membutuhkan server.

## Audit internal
Automated tests berada di `test/parser.test.mjs` dan dijalankan dengan:
`node test/parser.test.mjs`

Test mencakup:
- QRPay parsing
- Deposit History parsing
- nominal
- timestamp
- `Edited By` diabaikan
- latest deposit
- sesuai / lebih bonus
- double bonus
- remark NO BONUS
- input bonus harian
