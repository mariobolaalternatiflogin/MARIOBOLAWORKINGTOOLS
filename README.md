# MARIOBOLA Working Tools

Dashboard admin-only untuk pekerjaan harian Member dan Game.

## Menu
- DASHBOARD: ringkasan fungsi dan statistik.
- MEMBER: audit bonus, New Member First Deposit, Member Safety, ranking bonus harian.
- GAME: import Excel/CSV WIN/LOSE untuk 15 game dan urutkan hasil.

## Penyimpanan & akses
- Data kerja disimpan lokal di browser memakai localStorage.
- Password admin disimpan sebagai SHA-256 hash, bukan plaintext.
- Tidak ada data kerja yang otomatis dikirim ke server.
- Karena GitHub Pages adalah static hosting, login ini adalah proteksi aplikasi lokal, bukan security server-side. Jangan commit data member atau password ke repository. Untuk akses lintas perangkat dengan keamanan server-side, gunakan backend/auth terpisah.

## Bonus audit
- ID member harus berawalan `BEB@` (case-insensitive saat membaca input, hasil dinormalisasi uppercase).
- `SCB A BONUS DEPOSIT HARIAN` dibaca sebagai baris BONUS.
- Deposit dapat dibaca dari tabel Markdown/TSV/text yang ditempel.
- Semua deposit pada member+tanggal tetap dicatat sebagai riwayat individual.
- Basis bonus = deposit terbesar pada member+tanggal tersebut.
- Bonus seharusnya = rate x basis, dengan cap maksimum yang dapat diubah (default Rp100.000).
- Audit menandai SESUAI, LEBIH KASIH, KURANG KASIH, BELUM DAPAT, dan DOUBEL.

## New Member First Deposit
Masukkan daftar pendaftaran dan data deposit. Sistem mengambil deposit pertama secara kronologis per member lalu membandingkan tanggal daftar dengan tanggal deposit pertama.

## Game
Daftar game:
SPORT 1, SPORT 2, SPORT OMEGA, SSC, PG SOFT, PPLAY, CT CASINO, 12 LIVE, AFB GAMING 2022, DREAM GAMING, HABANERO, JDB, GD88, PHUMCASINO, TANGKAS.
Excel dibaca menggunakan SheetJS dari CDN. Format kolom dapat bervariasi; parser mencari ID `BEB@`, nama game, dan angka WIN/LOSE.

## Deploy GitHub Pages
Upload isi ZIP ke repository GitHub, aktifkan Pages dari branch/folder yang dipakai, lalu buka URL Pages.

## Reset admin
Untuk reset password lokal, hapus site data/localStorage untuk domain tersebut. Ini juga menghapus data kerja lokal.
