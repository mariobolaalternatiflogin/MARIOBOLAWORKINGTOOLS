[README.md](https://github.com/user-attachments/files/32134875/README.md)
# MARIOBOLA Support Tools

Modules:
1. New Member — opens the official registration form in a new tab.
2. BONUS — parses HISTORY QRIS PAY + HISTORY DEPOSIT; uses the largest deposit per username, 5% bonus, maximum Rp100,000; detects matching, double bonus, shortage, excess, and not-yet-given. Includes search, status filters, Copy, CSV, and Excel-compatible XLS export.
3. New Member First Deposit — matches New Member Harian + QRPay + Deposit History by username and registration date; selects the first QRPay deposit of that day and sums FREEBET remarks for that day. Includes search, Copy, CSV, and Excel-compatible XLS export.

All processing is local in the browser. No external API is required.

## v4.1 — International Amount Display
Nominal internal dari data Chrome tetap dinormalisasi agar format sumber seperti `2.500`, `12.500.000`, dan `100.000.000` terbaca sebagai 2.500, 12.500.000, dan 100.000.000. Tampilan hasil menggunakan gaya internasional/Inggris-AS: koma sebagai pemisah ribuan dan titik sebagai desimal, dengan 3 digit desimal, contoh `Rp 2,500.000`, `Rp 12,500,000.000`, `Rp 100,000,000.000`.
