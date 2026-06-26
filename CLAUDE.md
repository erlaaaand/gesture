@AGENTS.md
# Project Name: Gesture-Controlled Music Player (Tema: Foto Kita Blur) - Virtual Touch Edition

## 1. Deskripsi Proyek
Membangun aplikasi web interaktif berbasis Next.js (App Router) di mana pengguna dapat mengontrol pemutar musik (Play, Pause, Skip) menggunakan interaksi "Virtual Touch" (sentuhan di udara) di depan kamera. Selain kontrol musik, aplikasi ini mengimplementasikan fitur filter video real-time: ketika lagu sedang diputar dan ada pengguna di dalam frame kamera yang menunjukkan gestur jari *Peace* (telunjuk dan jari tengah/manis terangkat), layar video akan otomatis buram (blur). Konsep filter ini terinspirasi langsung dari tren video TikTok menggunakan lagu Sal Priadi yang berjudul "Foto Kita Blur".

## 2. Referensi UI & Layout (Berdasarkan image_f39768.png)
Antarmuka web dirancang bersih, intuitif, dan responsif dengan struktur vertikal:
* **Music Player Card (Bagian Atas):**
  * **Album Art:** Kotak kontainer di sebelah kiri untuk menampilkan sampul album.
  * **Informasi Lagu:** Teks judul lagu dan nama artis di sebelah kanan album.
  * **Control Buttons:** Terletak di bawah judul lagu, terdiri dari tiga tombol interaktif utama:
    * `[<|]` : Tombol Skip Backward / Previous
    * `[|>||]` : Tombol Play / Pause Toggle
    * `[|>]` : Tombol Skip Forward / Next
  * *Catatan Penting:* Setiap tombol ini harus memiliki bounding box DOM yang jelas karena akan digunakan dalam kalkulasi deteksi tabrakan koordinat jari.
* **Camera Feed & Overlay (Bagian Bawah / Background):**
  * Elemen `<video>` yang menampilkan feed kamera webcam secara real-time.
  * Elemen `<canvas>` overlay di atas video untuk merender kursor visual (misalnya titik atau lingkaran loading) yang mengikuti posisi ujung jari telunjuk pengguna secara presisi.

## 3. Spesifikasi Fitur & Logika Teknis

### A. Kontrol Audio Jari Virtual (Spatial UI & Collision Detection)
* **Pelacakan Jari (Finger Tracking):** Sistem mendeteksi koordinat 2D dari ujung jari telunjuk (`INDEX_FINGER_TIP`) melalui kamera menggunakan tangan bebas (kiri atau kanan).
* **Pemetaan Koordinat (Coordinate Mapping):** Mengonversi koordinat normalisasi (0.0 hingga 1.0) dari MediaPipe ke koordinat piksel aktual di viewport browser (X, Y). Skala cermin (mirroring) harus diterapkan agar gerakan tangan pengguna bersifat natural (intuitif seperti cermin).
* **Deteksi Tabrakan (Collision Detection):** * Aplikasi secara berkala membaca posisi geometris tombol pemutar musik menggunakan fungsi `getBoundingClientRect()`.
  * Sistem akan mendeteksi apakah koordinat ujung jari telunjuk berada di dalam area batas (*bounding box*) tombol `[<|]`, `[|>||]`, atau `[|>]`.
* **Mekanisme Pemicu Aksi (Trigger Mechanism):** Untuk menghindari ketidaksengajaan klik saat jari hanya lewat, aksi tombol dipicu dengan salah satu metode berikut:
  1. *Hover Delay (Dwell Time):* Jari telunjuk harus menetap di dalam area tombol selama 1 detik. Elemen canvas akan menampilkan animasi lingkaran loading (*circular progress bar*) di sekitar kursor jari sebagai indikator sebelum aksi dieksekusi.
  2. *Pinch to Click:* Aksi langsung dipicu jika pengguna melakukan gestur mencubit (merapatkan ujung jari jempol dan telunjuk) saat posisi kursor berada di atas tombol.

### B. Filter Blur Multi-User (TikTok Sal Priadi Trend)
* **Kondisi Aktivasi:** Filter blur **hanya** dapat aktif jika status audio sedang berputar (`isAudioPlaying === true`) DAN terdapat gestur *Peace* yang terdeteksi di dalam frame kamera.
* **Logika Gestur Peace:** Jari telunjuk dan jari tengah (atau jari manis) dalam posisi tegak lurus ke atas, sementara ibu jari, kelingking, dan jari lainnya melipat ke dalam telapak tangan.
* **Dukungan Multi-User (Anti-Bug):** Konfigurasi deteksi tangan harus diatur untuk mendukung banyak tangan sekaligus (`numHands: 4` atau lebih). Jika terdapat lebih dari satu orang dalam frame video, deteksi gestur *Peace* dari tangan **siapa pun** di dalam frame akan langsung mengaktifkan filter blur secara global.
* **Efek Visual:** Menggunakan Tailwind CSS kelas `.blur-active` yang menerapkan properti `backdrop-filter: blur(20px);` atau `filter: blur(20px);` secara langsung pada elemen video/layar feed kamera dengan efek transisi (*transition-all duration-500*) agar perubahan terasa halus.

## 4. Tumpukan Teknologi & Arsitektur Sistem
* **Framework:** Next.js (App Router) dengan React Hooks (`useRef`, `useEffect`, `useState`).
* **Styling:** Tailwind CSS untuk pengaturan tata letak kartu pemutar musik dan efek animasi blur.
* **Computer Vision Engine:** **MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`)**.
  * Model WASM dan TFLite harus dimuat secara asinkron di sisi klien (*client-side*) agar tidak menghambat proses rendering awal halaman web.
* **Image Processing Pipeline:** Pemrosesan frame video webcam dilakukan secara sinkron menggunakan `requestAnimationFrame` untuk memastikan ekstraksi koordinat tangan berjalan *real-time* dengan latency serendah mungkin tanpa menyebabkan kebocoran memori (*memory leak*).
* **State Management:** Zustand atau React Context API untuk mengelola state global seperti koordinat kursor jari, status hover tombol, status pemutaran lagu (`isAudioPlaying`), dan status filter (`isBlurActive`).
* **Audio Handling:** HTML5 Audio API untuk memutar, menghentikan, dan mengganti file musik/playlist secara programatik.