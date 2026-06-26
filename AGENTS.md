# AI Agents & Task Delegation

Proyek ini dibagi menjadi tiga peran agen (Roles) utama. Saat mengerjakan proyek ini, AI harus mengadopsi peran-peran ini secara berurutan atau paralel.

## 1. UI/UX & Audio Engineer Agent
**Tanggung Jawab:**
- Mengatur kerangka dasar Next.js dan Tailwind CSS.
- Membangun antarmuka pemutar musik yang sama persis dengan referensi `image_f39768.png`.
- Mengimplementasikan logika HTML5 Audio (Play, Pause, Skip playlist).
- Membuat *state* global (misalnya `isAudioPlaying`, `triggerBlur`) yang siap dikonsumsi oleh komponen lain.

**Checklist Tugas:**
- [ ] Inisialisasi komponen `MusicPlayer.tsx`.
- [ ] Inisialisasi komponen `CameraFeed.tsx` dengan elemen `<video>` dan `<canvas>` overlay.
- [ ] Terapkan logika CSS untuk kelas `.blur-active` (menggunakan `backdrop-filter`).

## 2. Computer Vision Specialist Agent
**Tanggung Jawab:**
- Mengintegrasikan model *MediaPipe Hand Landmarker* ke dalam aplikasi Next.js.
- Membangun *image processing pipeline* yang kuat di sisi klien. Setiap *frame* dari kamera harus diproses untuk mencari *landmark* tanpa menyebabkan *memory leak*.
- Menulis algoritma logika deteksi spasial:
  - Kalkulasi jarak antar *landmark* untuk mendeteksi gestur *Play/Pause/Skip*.
  - Kalkulasi spesifik untuk gestur *Peace* (mengecek apakah jari telunjuk dan tengah/manis terangkat lurus, sementara jempol dan kelingking terlipat).
- Mengatur konfigurasi `numHands: 4` (atau lebih) di MediaPipe untuk memastikan sistem tidak mengalami *bug* saat banyak orang masuk ke *frame* (Multi-user support).

**Checklist Tugas:**
- [ ] Buat utilitas `gestureDetection.ts`.
- [ ] Muat model TFLite/WASM MediaPipe secara asinkron agar tidak memblokir render awal.
- [ ] Kembalikan (*return*) nilai boolean atau *event triggers* dari *pipeline* deteksi.

## 3. Integration & State Manager Agent
**Tanggung Jawab:**
- Menghubungkan *output* dari Vision Agent ke fungsi-fungsi milik Audio Engineer Agent.
- Memastikan logika kondisi: Filter blur **hanya** bisa aktif jika `isAudioPlaying === true` AND `isPeaceGestureDetected === true`.
- Mengoptimalkan performa (menggunakan `requestAnimationFrame`, `useRef`, dan debouncing/throttling) agar UI tidak *freeze* saat banyak tangan terdeteksi bersamaan.

**Checklist Tugas:**
- [ ] Ikat *listener* MediaPipe ke *state* UI.
- [ ] Lakukan *testing* skenario: Lagu mati + gestur Peace = Tidak blur.
- [ ] Lakukan *testing* skenario: Lagu menyala + gestur Peace dari *user* ke-2 di latar belakang = Layar blur.