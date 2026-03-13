# ガンガのスケジュール (GitHub Pages)

Ini website statik (HTML/CSS/JS) buat nampilin jadwal bulanan dari Google Sheets.

## Cara pakai cepat
1) Upload folder ini ke repo GitHub (mis. `ganga-schedule`)
2) Buka **Settings → Pages**
   - Source: `Deploy from a branch`
   - Branch: `main` / `master`
   - Folder: `/ (root)`
3) Tunggu halaman aktif. Buka URL GitHub Pages-nya.

Supaya bisa di-fetch dari browser:
1) Google Sheets → tombol **Share**
2) Ubah akses jadi **Anyone with the link → Viewer** (public view)
3) (Opsional tapi paling aman) **File → Share → Publish to the web** (publish sheet)

Kalau belum public/publish, website otomatis pakai **data contoh**.

## Format tabel di Sheets
Header minimal:
- `Tanggal` (contoh: `01/31` atau `2026-01-31`)
- `勤務名` (contoh: `日勤`, `夜勤入`, `夜勤明`, `休み`)
Opsional:
- `Hari`

Kalau `勤務名` = `休み` (atau label off lain), isi kotaknya otomatis dikosongin (board clear).

## Edit config
Buka `script.js` → bagian `CONFIG`:
- ganti `SHEET_ID` / `GID` kalau sheet berubah
- kamu juga bisa isi `OVERRIDE_CSV_URL` kalau pakai link `pub?output=csv`

Enjoy ✨
