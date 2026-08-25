const NAMA_CACHE = 'aura-turbo-v99';
const ASET_YANG_DISIMPAN = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './img/aura.png'
];

// 1. INSTALASI: Memasukkan desain UI ke dalam brankas browser SKPD
self.addEventListener('install', (event) => {
    self.skipWaiting(); // ?? KODE MANDOR 1: Paksa mesin baru langsung hidup tanpa antre!
    
    event.waitUntil(
        caches.open(NAMA_CACHE).then((cache) => {
            return cache.addAll(ASET_YANG_DISIMPAN);
        })
    );
});

// 2. AKTIVASI: Otomatis menghapus cache lama
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((daftarCache) => {
            return Promise.all(
                daftarCache.map((cacheLama) => {
                    if (cacheLama !== NAMA_CACHE) {
                        return caches.delete(cacheLama);
                    }
                })
            );
        }).then(() => {
            return clients.claim(); // ?? KODE MANDOR 2: Langsung ambil alih layar SKPD detik itu juga!
        })
    );
});

// 3. MESIN TURBO INTERCEPTOR: Menembakkan aset 0 detik tanpa internet!
self.addEventListener('fetch', (event) => {
    
    // Jangan pernah menyimpan (cache) data dari Firebase atau Google Script! 
    // Biarkan data SKPD selalu segar dan Real-Time dari server aslinya.
    if (event.request.url.includes('firebaseio.com') || 
        event.request.url.includes('firebasedatabase.app') || 
        event.request.url.includes('script.google.com')) {
        return; 
    }

    // Untuk file HTML, CSS, JS, dan Gambar, ambil dari mesin Turbo!
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Jika ada di memori Turbo, langsung tampilkan (0 detik). Jika tidak, baru ambil dari internet.
            return response || fetch(event.request);
        })
    );
});
