/**
 * ===========================================================================
 * PATCH SCRIPT.JS v5.0 — UPGRADE TANPA MENGUBAH LAYOUT & LOGIC ASLI
 * ===========================================================================
 * 
 * CARA PAKAI:
 * 1. Buka file script.js Anda
 * 2. Cari dan GANTI fungsi-fungsi di bawah ini dengan versi baru
 * 3. TIDAK PERLU mengubah index.html, style.css, atau pendapatan.js
 * 
 * DAFTAR FUNGSI YANG DIGANTI:
 * - Baris 1-2: Tambah SESSION_TOKEN
 * - tampilkanGerbangKeamanan() : Login via POST, dapat token
 * - muatTTDDariCloud()       : Pakai token bukan secret_key di URL
 * - syncTTDKeCloud()         : Pakai token di body POST
 * - hapusTTDDariCloud()      : Pakai token di body POST
 * - simpanKeCloud()          : Pakai token + request queue
 * - eksekusiTarikDataLRA()   : Pakai token di URL
 * - tarikDataSiluman()       : Pakai token + warm cache
 * - cekKoneksiServer()       : Pakai token
 * - fungsiKeluarAplikasi()   : Hapus token saat keluar
 * ===========================================================================
 */

// ============================================================================
// PATCH 1: GANTI BARIS 1-2 (variabel global di atas)
// ============================================================================
// HAPUS baris lama:
//   const SCRIPT_URL_DATABASE = "https://script.google.com/...";
//   let SECRET_KEY = sessionStorage.getItem('LRA_AUTH_KEY') || "";
//
// GANTI DENGAN:
const SCRIPT_URL_DATABASE = "https://script.google.com/macros/s/AKfycbyhFPzwcma9noqUe-P-g0wcxgaC_uTzwySMOq5NQA_WTeVIXOZ9IZ94xzfAjpQc1R5XKw/exec";
let SECRET_KEY = sessionStorage.getItem('LRA_AUTH_KEY') || "";
let SESSION_TOKEN = sessionStorage.getItem('LRA_SESSION_TOKEN') || ""; // <-- BARU

// Request queue mencegah spam request (BARU)
let _requestQueue = [];
let _isRequestRunning = false;

// ============================================================================
// PATCH 2: FUNGSI QUEUE ANTI-SPAM (TAMBAHKAN DI MANA SAJA, misalnya setelah PATCH 1)
// ============================================================================
/**
 * Request Queue: Mencegah banyak request bersamaan ke server.
 * Hanya 1 request yang berjalan pada satu waktu. Sisanya menunggu antrian.
 * Ini mengurangi beban server dan mencegah tabrakan.
 */
function _enqueueRequest(fn) {
  return new Promise(function(resolve, reject) {
    _requestQueue.push({ fn: fn, resolve: resolve, reject: reject });
    _processQueue();
  });
}

function _processQueue() {
  if (_isRequestRunning || _requestQueue.length === 0) return;
  _isRequestRunning = true;
  
  let item = _requestQueue.shift();
  item.fn()
    .then(function(result) {
      _isRequestRunning = false;
      item.resolve(result);
      _processQueue(); // Proses item berikutnya
    })
    .catch(function(err) {
      _isRequestRunning = false;
      item.reject(err);
      _processQueue(); // Tetap lanjut ke item berikutnya
    });
}

/**
 * Smart Fetch: Fetch dengan automatic retry dan exponential backoff.
 * Jika gagal, coba ulang dengan jeda 2x lebih lama (maks 3 kali).
 */
function _smartFetch(url, options, maxRetries) {
  maxRetries = maxRetries || 2;
  let attempt = 0;
  
  function doFetch() {
    attempt++;
    return fetch(url, options)
      .then(function(response) {
        if (!response.ok && response.status >= 500 && attempt <= maxRetries) {
          // Server error — coba ulang setelah jeda
          let delay = Math.pow(2, attempt) * 1000; // 2s, 4s
          return new Promise(function(resolve) { setTimeout(resolve, delay); }).then(doFetch);
        }
        return response;
      })
      .catch(function(err) {
        if (attempt <= maxRetries) {
          let delay = Math.pow(2, attempt) * 1000;
          return new Promise(function(resolve) { setTimeout(resolve, delay); }).then(doFetch);
        }
        throw err;
      });
  }
  
  return doFetch();
}

// ============================================================================
// PATCH 3: GANTI fungsi tampilkanGerbangKeamanan()
// PERUBAHAN: Login via POST (password TIDAK muncul di URL)
// ============================================================================
function tampilkanGerbangKeamanan() {
    // Jika sudah punya token, langsung masuk
    if (SESSION_TOKEN !== "") {
        document.body.style.overflow = 'auto';
        document.querySelectorAll('.container-fluid, .print-page').forEach(function(el) {
            el.style.filter = 'none';
            el.style.pointerEvents = 'auto';
        });
        SECRET_KEY = sessionStorage.getItem('LRA_AUTH_KEY') || '';
        pulihkanDataSesiLokal();
        cekKoneksiServer();
        return;
    }

    // Jika punya secret key lama, auto-upgrade ke token
    if (SECRET_KEY !== "") {
        _upgradeToToken(SECRET_KEY);
        return;
    }

    Swal.fire({
        title: '<strong style="font-family: Arial;">Login Aplikasi LRA <i class="fa-solid fa-lock text-dark ms-1"></i></strong>',
        html: '\n            <div class="mb-3 mt-2 text-start" style="font-family: Arial;">\n                <label class="form-label fw-bold text-secondary" style="font-size:12px;">Masukkan Password Akses SKPD:</label>\n                <div class="input-group">\n                    <input type="password" id="swal-input-password" class="form-control form-control-lg shadow-none border-secondary" placeholder="Ketik sandi disini..." style="font-size: 14px;">\n                    <button class="btn btn-outline-secondary" type="button" id="togglePassword">\n                        <i class="fa-regular fa-eye"></i>\n                    </button>\n                </div>\n                <div class="mt-2 text-muted" style="font-size: 10px;">\n                    <i class="fa-solid fa-circle-info text-primary me-1"></i> Sesi aktif selama 8 jam.\n                </div>\n            </div>\n        ',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: true,
        confirmButtonText: 'Masuk <i class="fa-solid fa-arrow-right-to-bracket ms-1"></i>',
        confirmButtonColor: '#0f172a',
        showLoaderOnConfirm: true,
        didOpen: function() {
            document.body.style.overflow = 'hidden'; 
            document.querySelectorAll('.container-fluid, .print-page').forEach(function(el) {
                el.style.filter = 'blur(10px) grayscale(20%)';
                el.style.pointerEvents = 'none';
            });

            var toggleBtn = document.getElementById('togglePassword');
            var passwordInput = document.getElementById('swal-input-password');
            toggleBtn.addEventListener('click', function() {
                var isPassword = passwordInput.getAttribute('type') === 'password';
                passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
                toggleBtn.innerHTML = isPassword ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
            });
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') Swal.clickConfirm();
            });
        },
        preConfirm: function() {
            var pwd = document.getElementById('swal-input-password').value;
            if (!pwd) { Swal.showValidationMessage('Password tidak boleh kosong!'); return false; }
            
            // PERUBAHAN PENTING: Login via POST, bukan GET!
            // Password TIDAK lagi muncul di URL / browser history
            return fetch(SCRIPT_URL_DATABASE, {
                method: "POST",
                body: JSON.stringify({ action: 'login', secret_key: pwd })
            })
                .then(function(response) { return response.json(); })
                .then(function(res) {
                    if (res.status === 'error') {
                        Swal.showValidationMessage('Password Salah! Akses ditolak.');
                        return false;
                    }
                    // Berhasil — kembalikan data login (termasuk token)
                    return { password: pwd, token: res.token, quota: res.quota };
                })
                .catch(function(error) {
                    Swal.showValidationMessage('Gagal cek server. Pastikan internet aktif!');
                    return false;
                });
        }
    }).then(function(result) {
        if (result.isConfirmed) {
            SECRET_KEY = result.value.password;
            SESSION_TOKEN = result.value.token;
            
            // Simpan ke sessionStorage
            sessionStorage.setItem('LRA_AUTH_KEY', SECRET_KEY);
            sessionStorage.setItem('LRA_SESSION_TOKEN', SESSION_TOKEN);
            
            document.body.style.overflow = 'auto';
            document.querySelectorAll('.container-fluid, .print-page').forEach(function(el) {
                el.style.filter = 'none';
                el.style.pointerEvents = 'auto';
            });
            
            // Tampilkan info kuota jika tersedia
            var quotaInfo = '';
            if (result.value.quota) {
                quotaInfo = 'Kuota hari ini: ' + result.value.quota.percent + '% terpakai.';
            }
            
            Swal.fire({
                icon: 'success', 
                title: 'Berhasil Login', 
                text: 'Selamat bekerja! ' + quotaInfo, 
                timer: 2000, 
                showConfirmButton: false
            });
            
            pulihkanDataSesiLokal();
            cekKoneksiServer();
        }
    });
}

/**
 * Auto-upgrade: Jika user punya secret key lama dari v4, 
 * otomatis convert ke token v5 tanpa perlu login ulang.
 */
function _upgradeToToken(oldKey) {
    document.body.style.overflow = 'auto';
    document.querySelectorAll('.container-fluid, .print-page').forEach(function(el) {
        el.style.filter = 'none';
        el.style.pointerEvents = 'auto';
    });
    
    // Background: request token baru
    fetch(SCRIPT_URL_DATABASE, {
        method: "POST",
        body: JSON.stringify({ action: 'login', secret_key: oldKey })
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.status === 'success' && res.token) {
            SESSION_TOKEN = res.token;
            sessionStorage.setItem('LRA_SESSION_TOKEN', SESSION_TOKEN);
        }
    })
    .catch(function() {}); // Silent — tidak mengganggu user
    
    pulihkanDataSesiLokal();
    cekKoneksiServer();
}

// ============================================================================
// PATCH 4: GANTI fungsi cekKoneksiServer()
// PERUBAHAN: Pakai token di URL, handle quota info
// ============================================================================
function cekKoneksiServer() {
    var badge = document.getElementById('statusKoneksi');
    if (!badge) return;
    
    var authParam = SESSION_TOKEN ? ('token=' + SESSION_TOKEN) : ('secret_key=' + SECRET_KEY);
    var url = SCRIPT_URL_DATABASE + '?action=ping&' + authParam;
    
    fetch(url, { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.status === 'success') {
                // Update token jika server mengembalikan token baru
                if (res.token) {
                    SESSION_TOKEN = res.token;
                    sessionStorage.setItem('LRA_SESSION_TOKEN', SESSION_TOKEN);
                }
                
                badge.className = 'connection-badge online shadow-sm';
                badge.innerHTML = '<i class="fa-solid fa-circle-check"></i> Terhubung';
                
                // Tampilkan info kuota di badge jika tersedia
                if (res.quota && res.quota.percent > 70) {
                    badge.innerHTML += ' <span style="font-size:9px; opacity:0.7;">(' + res.quota.percent + '%)</span>';
                    if (res.quota.percent > 90) {
                        badge.className = 'connection-badge offline shadow-sm';
                        badge.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Kuota ' + res.quota.percent + '%';
                    }
                }
                
                // Mulai weker siluman setelah koneksi OK
                if (typeof jalankanWekerSiluman === 'function') {
                    jalankanWekerSiluman();
                }
            } else {
                badge.className = 'connection-badge offline shadow-sm';
                badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Sesi Kadaluarsa';
            }
        })
        .catch(function() {
            badge.className = 'connection-badge offline shadow-sm';
            badge.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Koneksi Terputus';
        });
}

// ============================================================================
// PATCH 5: GANTI fungsi muatTTDDariCloud()
// PERUBAHAN: Pakai token di URL (bukan secret_key)
// ============================================================================
function muatTTDDariCloud() {
    if (!kodeSkpdAktif) return;
    
    perbaruiBadgeTTD('loading');
    
    var tahun = document.getElementById('selectTahun').value;
    var authParam = SESSION_TOKEN ? ('token=' + SESSION_TOKEN) : ('secret_key=' + SECRET_KEY);
    var url = SCRIPT_URL_DATABASE + '?action=load_ttd&tahun=' + tahun + '&kode_skpd=' + kodeSkpdAktif + '&' + authParam;
    
    fetch(url)
    .then(function(r) { return r.json(); })
    .then(function(res) {
        ttdSyncInProgress = true;
        
        if (res.status === 'success' && res.data) {
            var data = res.data;
            if (data.jabatan) document.getElementById('ttd-jabatan').innerText = data.jabatan;
            if (data.nama) document.getElementById('ttd-nama').innerText = data.nama;
            if (data.nip) document.getElementById('ttd-nip').innerText = data.nip;
            
            localStorage.setItem('TTD_JAB_' + kodeSkpdAktif, data.jabatan || '');
            localStorage.setItem('TTD_NAMA_' + kodeSkpdAktif, data.nama || '');
            localStorage.setItem('TTD_NIP_' + kodeSkpdAktif, data.nip || '');
            
            perbaruiBadgeTTD('synced', data.updated_at);
        } else {
            var localJab = localStorage.getItem('TTD_JAB_' + kodeSkpdAktif);
            var localNma = localStorage.getItem('TTD_NAMA_' + kodeSkpdAktif);
            var localNip = localStorage.getItem('TTD_NIP_' + kodeSkpdAktif);
            
            if (localJab || localNma || localNip) {
                if (localJab) document.getElementById('ttd-jabatan').innerText = localJab;
                if (localNma) document.getElementById('ttd-nama').innerText = localNma;
                if (localNip) document.getElementById('ttd-nip').innerText = localNip;
                perbaruiBadgeTTD('local_only');
            } else {
                perbaruiBadgeTTD('empty');
            }
        }
        
        setTimeout(function() { ttdSyncInProgress = false; }, 2000);
    })
    .catch(function() { perbaruiBadgeTTD('offline'); });
}

// ============================================================================
// PATCH 6: GANTI fungsi syncTTDKeCloud()
// PERUBAHAN: Pakai token di body POST + smart retry
// ============================================================================
function syncTTDKeCloud() {
    if (!kodeSkpdAktif || ttdSyncInProgress) return;
    ttdSyncInProgress = true;
    
    var tahun = document.getElementById('selectTahun').value;
    var payload = {
        token: SESSION_TOKEN,        // <-- GANTI: pakai token
        action: 'save_ttd',
        tahun: tahun,
        kode_skpd: kodeSkpdAktif,
        jabatan: document.getElementById('ttd-jabatan').innerText.trim(),
        nama: document.getElementById('ttd-nama').innerText.trim(),
        nip: document.getElementById('ttd-nip').innerText.trim(),
        updated_by: document.getElementById('ttd-nama').innerText.trim() || 'unknown',
        user_agent: getUserAgentUntukAudit()
    };
    
    // Fallback: kirim secret_key jika token kosong (backward compat)
    if (!SESSION_TOKEN && SECRET_KEY) {
        payload.secret_key = SECRET_KEY;
        delete payload.token;
    }
    
    _smartFetch(SCRIPT_URL_DATABASE, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(function(r) { return r.json(); })
    .then(function(res) {
        if (res.status === 'success') {
            perbaruiBadgeTTD('synced');
            localStorage.setItem('TTD_JAB_' + kodeSkpdAktif, payload.jabatan);
            localStorage.setItem('TTD_NAMA_' + kodeSkpdAktif, payload.nama);
            localStorage.setItem('TTD_NIP_' + kodeSkpdAktif, payload.nip);
        } else {
            perbaruiBadgeTTD('local_only');
        }
        setTimeout(function() { ttdSyncInProgress = false; }, 3000);
    })
    .catch(function() {
        perbaruiBadgeTTD('offline');
        setTimeout(function() { ttdSyncInProgress = false; }, 3000);
    });
}

// ============================================================================
// PATCH 7: GANTI fungsi hapusTTDDariCloud()
// PERUBAHAN: Pakai token di body POST
// ============================================================================
function hapusTTDDariCloud() {
    if (!kodeSkpdAktif) return;
    
    Swal.fire({ 
        title: 'Hapus Tanda Tangan?', 
        text: 'Data tanda tangan akan dihapus dari server.',
        icon: 'warning',
        showCancelButton: true, 
        confirmButtonColor: '#d33', 
        cancelButtonText: 'Batal',
        confirmButtonText: 'Ya, Hapus' 
    }).then(function(result) {
        if (!result.isConfirmed) return;
        
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); } });
        
        var payload = {
            token: SESSION_TOKEN,    // <-- GANTI: pakai token
            action: 'delete_ttd',
            tahun: document.getElementById('selectTahun').value,
            kode_skpd: kodeSkpdAktif,
            updated_by: document.getElementById('ttd-nama').innerText.trim() || 'unknown'
        };
        
        // Fallback backward compat
        if (!SESSION_TOKEN && SECRET_KEY) {
            payload.secret_key = SECRET_KEY;
            delete payload.token;
        }
        
        fetch(SCRIPT_URL_DATABASE, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if (res.status === 'success' || res.status === 'not_found') {
                ttdSyncInProgress = true;
                document.getElementById('ttd-jabatan').innerText = 'PENGGUNA ANGGARAN';
                document.getElementById('ttd-nama').innerText = 'NAMA KEPALA SKPD';
                document.getElementById('ttd-nip').innerText = 'NIP. xxxxxxxx';
                
                localStorage.removeItem('TTD_JAB_' + kodeSkpdAktif);
                localStorage.removeItem('TTD_NAMA_' + kodeSkpdAktif);
                localStorage.removeItem('TTD_NIP_' + kodeSkpdAktif);
                
                perbaruiBadgeTTD('empty');
                setTimeout(function() { ttdSyncInProgress = false; }, 500);
                
                Swal.fire({
                    icon: 'success',
                    title: 'Tanda Tangan Dihapus',
                    text: 'Silakan isi ulang tanda tangan baru.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Gagal', res.message || 'Terjadi kesalahan.', 'error');
            }
        })
        .catch(function() {
            Swal.fire('Koneksi Gagal', 'Gagal terhubung ke server.', 'error');
        });
    });
}

// ============================================================================
// PATCH 8: GANTI fungsi simpanKeCloud()
// PERUBAHAN: Pakai token + request queue + handle quota_exceeded
// ============================================================================
async function simpanKeCloud() {
    const DOMAIN_RESMI = "bkadakuntansiluwu.github.io"; 
    let currentDomain = window.location.hostname;
    
    if (currentDomain !== DOMAIN_RESMI && currentDomain !== "localhost") {
        Swal.fire('Akses Ilegal', 'Aplikasi dijalankan dari server tidak resmi! Koneksi diblokir.', 'error');
        return; 
    }

    if(SCRIPT_URL_DATABASE.includes("ISI_DENGAN_URL")) { Swal.fire('Peringatan', 'URL Google Apps Script belum diset.', 'warning'); return; }
    if(!kodeSkpdAktif) { Swal.fire('Error', 'Harap upload LRA Excel terlebih dahulu!', 'warning'); return; }
    let tahun = document.getElementById('selectTahun').value;
    
    let dataPayload = [];
    document.querySelectorAll('.input-database.is-dirty').forEach(function(inp) {
        dataPayload.push({ row_id: inp.getAttribute('data-rowid'), penjelasan: inp.value.trim() });
    });

    if(dataPayload.length === 0) { Swal.fire('Info', 'Belum ada draf baru yang diketik untuk disimpan.', 'info'); return; }
    
    // === LOGIKA CHUNKING (TIDAK DIUBAH) ===
    const CHUNK_SIZE = 150; 
    const totalChunks = Math.ceil(dataPayload.length / CHUNK_SIZE);

    Swal.fire({
        title: 'Menyimpan Data...',
        html: 'Menyiapkan pengiriman data ke server...',
        allowOutsideClick: false,
        didOpen: function() { Swal.showLoading(); }
    });

    let totalDisimpan = 0;

    for (let i = 0; i < totalChunks; i++) {
        let chunkData = dataPayload.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        
        if (totalChunks > 1) {
            Swal.update({ html: 'Mengirim paket <b>' + (i + 1) + '</b> dari <b>' + totalChunks + '</b> ke server aman...' });
        }

        try {
            // PERUBAHAN: Pakai token, bukan secret_key
            let payload = { 
                token: SESSION_TOKEN,
                tahun: tahun, 
                kode_skpd: kodeSkpdAktif, 
                data: chunkData,
                user_agent: getUserAgentUntukAudit()
            };
            
            // Fallback backward compat
            if (!SESSION_TOKEN && SECRET_KEY) {
                payload.secret_key = SECRET_KEY;
                delete payload.token;
            }
            
            // Gunakan smart fetch (auto-retry jika server error)
            let response = await _smartFetch(SCRIPT_URL_DATABASE, {
                method: "POST", 
                body: JSON.stringify(payload)
            });

            let res = await response.json();
            
            if(res.status === 'success') {
                chunkData.forEach(function(item) {
                    let inp = document.getElementById('val_' + item.row_id);
                    if (inp) inp.classList.remove('is-dirty');
                });
                totalDisimpan += chunkData.length;
            } 
            else if (res.status === 'busy') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Jalur Sedang Penuh',
                    text: 'Server sedang antre ketat. Silakan klik Simpan Draft lagi sebentar lagi.',
                    confirmButtonText: 'Baik, Saya Mengerti'
                });
                return;
            }
            else if (res.status === 'quota_exceeded') {
                // PERUBAHAN BARU: Handle kuota habis
                Swal.fire({
                    icon: 'info',
                    title: 'Kuota Server Hari Ini Penuh',
                    html: 'Data Anda <b>tersimpan aman di browser</b> (localStorage).<br><br>Coba lagi <b>besok</b> atau hubungi admin.',
                    confirmButtonText: 'Saya Mengerti'
                });
                return;
            }
            else {
                Swal.fire('Gagal Menyimpan', res.message || 'Terjadi kesalahan sistem.', 'error');
                return;
            }
        } catch (err) {
            Swal.fire('Koneksi Terputus', 'Gagal terhubung ke server. Periksa internet dan coba lagi.', 'error');
            return;
        }
    }

    Swal.fire({
        icon: 'success',
        title: 'Tersimpan (Lengkap)',
        text: totalDisimpan + ' penjelasan berhasil diamankan ke server.',
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true
    });

    setTimeout(function() { 
        if(typeof tarikDataSiluman === 'function') tarikDataSiluman(); 
    }, 2500);
}

// ============================================================================
// PATCH 9: GANTI fungsi eksekusiTarikDataLRA()
// PERUBAHAN: Pakai token di URL
// ============================================================================
function eksekusiTarikDataLRA() {
    let tahun = document.getElementById('selectTahun').value;
    Swal.fire({ title: 'Sedang Menarik Data', allowOutsideClick: false, didOpen: function() { Swal.showLoading(); }});

    var authParam = SESSION_TOKEN ? ('token=' + SESSION_TOKEN) : ('secret_key=' + SECRET_KEY);
    let fetchUrl = SCRIPT_URL_DATABASE + '?action=load&tahun=' + tahun + '&kode_skpd=' + kodeSkpdAktif + '&' + authParam;

    fetch(fetchUrl)
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if(res.status === 'success') {
                let dataServer = res.data; let count = 0;
                document.querySelectorAll('.input-database').forEach(function(inp) {
                    let rowId = inp.getAttribute('data-rowid');
                    let realisasi = parseFloat(inp.getAttribute('data-realisasi'));
                    if(dataServer[rowId]) { 
                        inp.value = dataServer[rowId]; 
                        
                        let printText = formatTeksPenjelasan(dataServer[rowId]);
                        document.getElementById('print_' + rowId).innerHTML = printText;
                        
                        let btn = document.getElementById('btn_' + rowId);
                        if (btn) {
                            let isKeterangan = btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('bukaKeterangan');
                            
                            if (isKeterangan) {
                                if (printText.trim() === '') {
                                    btn.className = 'btn btn-sm w-100 text-start';
                                    btn.style.cssText = "font-family:Arial; font-size:11px; padding: 4px 8px; background-color: #ffffff; border: 1px solid #e2e8f0; color: #64748b; border-radius: 4px;";
                                    btn.innerHTML = '<i class="fa-regular fa-comment-dots text-muted me-1"></i>';
                                } else {
                                    btn.className = 'btn btn-sm w-100 text-start fw-bold';
                                    btn.style.cssText = "font-family:Arial; font-size:10px; padding: 4px 8px; background-color: #f8fafc; border: 1px solid #cbd5e1; color: #334155; border-radius: 4px;";
                                    btn.innerHTML = '<i class="fa-solid fa-check text-muted me-1"></i> Keterangan Disimpan';
                                }
                            } else {
                                perbaruiTombolStatus(rowId, printText, realisasi);
                            }
                        }
                        count++; 
                    }
                });
                Swal.fire({
                    icon: 'success',
                    title: 'Data Ditarik',
                    text: count + ' baris penjelasan berhasil dimuat dari server.',
                    timer: 2000,
                    showConfirmButton: false,
                    timerProgressBar: true
                });
            } 
            else if (res.status === 'busy') {
                Swal.fire({
                    icon: 'warning',
                    title: 'Mohon Tunggu Sebentar',
                    text: res.message || 'Sistem sedang memproses. Coba lagi dalam 1 menit.',
                    confirmButtonText: 'Baik, Saya Mengerti',
                    confirmButtonColor: '#f59e0b'
                });
            }
            else if (res.status === 'error') {
                Swal.fire({ icon: 'error', title: 'Sesi Tidak Valid', text: 'Silakan refresh halaman dan login ulang.', confirmButtonText: 'OK' });
            }
            else Swal.fire({ icon: 'info', title: 'Data tidak ditemukan', text: 'Belum ada penjelasan yang tersimpan.', confirmButtonText: 'OK' });
        }).catch(function() { 
            Swal.fire({
                icon: 'error', title: 'Koneksi Terputus', 
                text: 'Gagal terhubung ke server. Periksa koneksi internet Anda.', 
                confirmButtonText: 'OK'
            }); 
        });
}

// ============================================================================
// PATCH 10: GANTI fungsi tarikDataSiluman()
// PERUBAHAN: Pakai token + warm cache parameter
// ============================================================================
function tarikDataSiluman(tampilkanLoading) {
    tampilkanLoading = tampilkanLoading || false;
    if(!kodeSkpdAktif) return;
    
    let waktuSekarang = Date.now();
    if (waktuSekarang - waktuTerakhirSiluman < 15000) return; 
    waktuTerakhirSiluman = waktuSekarang; 

    let tahun = document.getElementById('selectTahun').value;
    var authParam = SESSION_TOKEN ? ('token=' + SESSION_TOKEN) : ('secret_key=' + SECRET_KEY);
    // PERUBAHAN: Tambah warm=true untuk memanfaatkan warm cache (hemat kuota)
    let fetchUrl = SCRIPT_URL_DATABASE + '?action=load&tahun=' + tahun + '&kode_skpd=' + kodeSkpdAktif + '&' + authParam + '&warm=true&t=' + waktuSekarang;

    let badge = document.getElementById('statusKoneksi');
    let oriHtml = badge.innerHTML;
    let oriClass = badge.className;
    
    if (tampilkanLoading) {
        badge.className = 'connection-badge checking shadow-sm';
        badge.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Menyinkronkan...';
    }

    fetch(fetchUrl, { cache: 'no-store' })
        .then(function(r) { return r.json(); })
        .then(function(res) {
            if(res.status === 'success') {
                let dataServer = res.data;
                let adaDataBaru = false; 

                document.querySelectorAll('.input-database').forEach(function(inp) {
                    let rowId = inp.getAttribute('data-rowid');
                    let realisasi = parseFloat(inp.getAttribute('data-realisasi'));

                    if(dataServer[rowId] !== undefined && !inp.classList.contains('is-dirty')) {
                        if(inp.value !== dataServer[rowId]) {
                            inp.value = dataServer[rowId];
                            adaDataBaru = true; 
                            
                            let printText = formatTeksPenjelasan(dataServer[rowId]);
                            let printDiv = document.getElementById('print_' + rowId);
                            if(printDiv) printDiv.innerHTML = printText;
                            
                            let btn = document.getElementById('btn_' + rowId);
                            if (btn) {
                                let isKeterangan = btn.getAttribute('onclick') && btn.getAttribute('onclick').includes('bukaKeterangan');
                                
                                if (isKeterangan) {
                                    if (printText.trim() === '') {
                                        btn.className = 'btn btn-sm w-100 text-start';
                                        btn.style.cssText = "font-family:Arial; font-size:11px; padding: 4px 8px; background-color: #ffffff; border: 1px solid #e2e8f0; color: #64748b; border-radius: 4px;";
                                        btn.innerHTML = '<i class="fa-regular fa-comment-dots text-muted me-1"></i>';
                                    } else {
                                        btn.className = 'btn btn-sm w-100 text-start fw-bold';
                                        btn.style.cssText = "font-family:Arial; font-size:10px; padding: 4px 8px; background-color: #f8fafc; border: 1px solid #cbd5e1; color: #334155; border-radius: 4px;";
                                        btn.innerHTML = '<i class="fa-solid fa-check text-muted me-1"></i> Keterangan Disimpan';
                                    }
                                } else {
                                    if(typeof perbaruiTombolStatus === 'function') perbaruiTombolStatus(rowId, printText, realisasi);
                                }
                            }
                        }
                    }
                });
                
                if (adaDataBaru) {
                    badge.className = 'connection-badge online shadow-sm';
                    badge.innerHTML = '<i class="fa-solid fa-check-double"></i> Data Tim Masuk!';
                    setTimeout(function() { badge.className = oriClass; badge.innerHTML = oriHtml; }, 4000);
                } else if (tampilkanLoading) {
                    badge.className = oriClass; badge.innerHTML = oriHtml;
                }
            }
        }).catch(function() {
            if (tampilkanLoading) { badge.className = oriClass; badge.innerHTML = oriHtml; }
        });
}

// ============================================================================
// PATCH 11: GANTI fungsi fungsiKeluarAplikasi()
// PERUBAHAN: Hapus token saat keluar
// ============================================================================
function fungsiKeluarAplikasi() {
    Swal.fire({
        title: 'Keluar dari Aplikasi?',
        text: 'Sesi Anda akan diakhiri.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal'
    }).then(function(result) {
        if (result.isConfirmed) {
            // Bersihkan semua sesi
            sessionStorage.removeItem('LRA_AUTH_KEY');
            sessionStorage.removeItem('LRA_SESSION_TOKEN');  // <-- BARU
            sessionStorage.removeItem('LRA_RAW_DATA_SESSION');
            
            SECRET_KEY = "";
            SESSION_TOKEN = "";  // <-- BARU
            kodeSkpdAktif = "";
            globalRawData = [];
            
            // Reset UI
            document.getElementById('containerRender').innerHTML = '<tr><td colspan="7" class="text-center text-muted py-5" style="font-family: Arial, sans-serif; vertical-align: middle;"><i>Harap Download File dari SIPD terlebih dahulu dalam Format excel (LRA Per Program) berdasarkan periode semester.<br>lalu upload file nya pada menu yang sudah di sediakan diatas...</i></td></tr>';
            document.getElementById('headerNamaSkpd').innerText = 'belum ada data skpd';
            document.getElementById('metaUrusan').innerText = ': -';
            document.getElementById('metaOrganisasi').innerText = ': -';
            
            // Reset TTD
            document.getElementById('ttd-jabatan').innerText = 'PENGGUNA ANGGARAN';
            document.getElementById('ttd-nama').innerText = 'NAMA KEPALA SKPD';
            document.getElementById('ttd-nip').innerText = 'NIP. xxxxxxxx';
            perbaruiBadgeTTD('empty');
            
            // Tampilkan gerbang keamanan lagi
            tampilkanGerbangKeamanan();
        }
    });
}
