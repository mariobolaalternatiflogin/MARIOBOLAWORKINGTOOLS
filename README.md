[Uploading README.md…]()
# MARIOBOLA Working Tools

Dashboard admin-only untuk pekerjaan harian Member dan Game.

## Perubahan Audit Bonus v2

Parser bonus sekarang dirancang untuk membaca hasil **copy-paste tabel langsung dari browser**, termasuk tabel Markdown/TSV dengan `<br>`, `**nominal**`, separator `---`, dan format tanggal `DD/MM/YYYY hh:mm:ss AM/PM`.

### Tiga sumber audit

1. **History Deposit / Bonus** — transaksi `Agent Deposit`, termasuk `SCB A BONUS DEPOSIT HARIAN`, dibaca sebagai sumber bonus.
2. **History QR Pay / Deposit** — transaksi `QR Pay`/QRIS dibaca sebagai sumber deposit utama.
3. **Status / Pengecualian Member** — dibaca untuk mendeteksi status yang membuat member tidak menerima bonus.

### Status pengecualian

Jika ID member ditemukan bersama salah satu status berikut, parser menghasilkan **TIDAK DAPAT BONUS** dan tidak menghitungnya sebagai kekurangan bonus:

- SB
- NO BONUS
- Safety
- Safety Bet
- NB
- BATAL WD
- WD DIKEMBALIKAN KE MEMBER
- MEMBER LANJUT MAIN
- WD DIKEMBALIKAN MEMBER LANJUT MAIN
- Tidak mau bonus

Daftar Member Safety yang disimpan di aplikasi juga diperlakukan sebagai pengecualian.

### Urutan keputusan

1. Parse dan normalisasi seluruh baris.
2. Ambil ID `BEB@`, nominal, tanggal/waktu, status, dan seluruh isi baris.
3. Filter transaksi `Confirmed` sebagai transaksi valid.
4. Pisahkan deposit dan bonus.
5. Kelompokkan berdasarkan **ID member + tanggal**.
6. Basis bonus tetap mengikuti konfigurasi aplikasi: **deposit terbesar pada member + tanggal**, lalu `rate × basis`, dengan cap maksimum.
7. Periksa pengecualian **sebelum** memberi status kekurangan.
8. Hasil audit:
   - SESUAI
   - BELUM DIBERIKAN
   - KEKURANGAN BONUS
   - KELEBIHAN BONUS
   - DOBEL BONUS
   - TIDAK DAPAT BONUS

**Catatan:** aturan persentase/cap adalah konfigurasi bisnis yang sudah ada pada aplikasi. Parser tidak menebak aturan baru dari satu contoh nominal.

## New Member First Deposit

Masukkan daftar pendaftaran dan data deposit. Sistem mengambil deposit pertama secara kronologis per member lalu membandingkan tanggal daftar dengan tanggal deposit pertama.

## Game

Daftar game:
SPORT 1, SPORT 2, SPORT OMEGA, SSC, PG SOFT, PPLAY, CT CASINO, 12 LIVE, AFB GAMING 2022, DREAM GAMING, HABANERO, JDB, GD88, PHUMCASINO, TANGKAS.

Excel dibaca menggunakan SheetJS dari CDN.

## Penyimpanan & akses

Data kerja disimpan lokal di browser memakai localStorage. Password admin disimpan sebagai SHA-256 hash. Tidak ada data kerja yang otomatis dikirim ke server.

## Deploy

Upload isi folder `working-tools-mariobola/` ke repository/hosting static yang digunakan. Pastikan `index.html`, `app.js`, `styles.css`, dan `tests.js` berada pada lokasi yang sama.

## Pengujian

Setelah aplikasi terbuka dan login, buka browser console lalu jalankan:

`WorkingToolsTests.run()`

Target hasil:

`ALL TESTS PASSED`

