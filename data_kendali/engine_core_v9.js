(function () {
// =========================================================================
// [SISTEM KEAMANAN & KENDALI GLOBAL TINGKAT DEWA V10 - ULTIMATE EDITION]
// =========================================================================

// --- [PERISAI ANTI-HACKER 1: BLOKIR INSPECT ELEMENT & NETWORK TAB] ---
document.addEventListener('contextmenu', e => e.preventDefault()); 
document.onkeydown = function(e) {
    if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 67 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
        return false;
    }
};

// --- [PERISAI ANTI-HACKER 2: MESIN ENKRIPSI MEMORI LOKAL] ---
function enkripsiLokal(text) { return btoa(encodeURIComponent(text)).split('').reverse().join(''); }
function dekripsiLokal(encoded) { try { return decodeURIComponent(atob(encoded.split('').reverse().join(''))); } catch(e) { return null; } }

// --- [PERISAI ANTI-HACKER 3: JUBAH GAIB VARIABEL GLOBAL (ANTI-OBFUSCATOR WARNING)] ---
const DOMAIN_RESMI = (function() { return "bkadakuntansiluwu.github.io"; })(); 

if (window.location.protocol === "file:") {
    document.body.innerHTML = `<div style="background:#fff; height:100vh; display:flex; justify-content:center; align-items:center; color:#dc2626; font-family:sans-serif; text-align:center;"><h1>⚠️ AKSES ILEGAL DIBLOKIR</h1></div>`;
    throw new Error("Sistem mengunci diri.");
}

if (window.location.hostname !== DOMAIN_RESMI && window.location.hostname !== "localhost") {
    document.body.innerHTML = `<div style="background:#fff; height:100vh; display:flex; justify-content:center; align-items:center; color:#dc2626; font-family:sans-serif; text-align:center;"><h1>⚠️ DOMAIN TIDAK DIKENAL</h1></div>`;
    throw new Error("Sistem mengunci diri.");
}

const FIREBASE_URL = (function() { return "https://lra-luwu-2026-default-rtdb.asia-southeast1.firebasedatabase.app/"; })();
const KUNCI_SESI = (function() { return "LRA_ADMIN_TOKEN_X7_SECURE"; })(); 

let sandiSesiAktif = (function() { return ""; })(); 
let statusSistemTerkini = (function() { return false; })(); 
let radarDataMentah = [];
let globalKunciSkpd = {}; 
let grafikStatistik;

// ==========================================
// [FUNGSI ANTARMUKA: MATA, TEMA, & LACI MENU]
// ==========================================
window.toggleMata = function(inputId, iconId) {
    let inp = document.getElementById(inputId);
    let icon = document.getElementById(iconId);
    if (inp.type === 'password') {
        inp.type = 'text';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
        icon.style.color = '#3b5998';
    } else {
        inp.type = 'password';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
        icon.style.color = '#94a3b8';
    }
};

window.ubahMataLogin = function() { toggleMata('inputSandiLogin', 'toggleMataLogin'); }

window.toggleSubMenu = function(menuId) {
    let menu = document.getElementById(menuId);
    let icon = document.getElementById('arrow-' + menuId);
    if (menu.classList.contains('active')) {
        menu.classList.remove('active');
        icon.classList.remove('rotate');
    } else {
        menu.classList.add('active');
        icon.classList.add('rotate');
    }
};

window.toggleSidebar = function() {
    document.getElementById('premiumSidebar').classList.toggle('active');
    let overlay = document.getElementById('sidebarOverlay');
    if (document.getElementById('premiumSidebar').classList.contains('active')) {
        overlay.style.display = 'block';
        setTimeout(() => overlay.classList.add('active'), 10);
    } else {
        overlay.classList.remove('active');
        setTimeout(() => overlay.style.display = 'none', 300);
    }
};

window.toggleTheme = function() {
    let body = document.body;
    let icon = document.getElementById('themeIcon');
    body.classList.toggle('dark-mode');
    
    if (body.classList.contains('dark-mode')) {
        icon.classList.replace('fa-moon', 'fa-sun');
        localStorage.setItem('temaLRA', 'dark');
        if(grafikStatistik) { Chart.defaults.color = '#ffffff'; grafikStatistik.update(); }
    } else {
        icon.classList.replace('fa-sun', 'fa-moon');
        localStorage.setItem('temaLRA', 'light');
        if(grafikStatistik) { Chart.defaults.color = '#0f172a'; grafikStatistik.update(); }
    }
};

// ==========================================
// [GERBANG LOGIN ANTI-HACKER (VERIFIKASI MEMORI)]
// ==========================================
function verifikasiSandiFirebase(sandiInput) {
    return fetch(`${FIREBASE_URL}pengaturan_sistem/sandi_admin.json?_c=${Date.now()}`).then(r => {
        if (!r.ok) throw new Error('Gagal membaca data');
        return r.text();
    }).then(sandiTersimpan => {
        if (sandiTersimpan === 'null' || sandiTersimpan === undefined || sandiTersimpan === null) {
            throw new Error('Konfigurasi sandi belum ada di server');
        }
        sandiTersimpan = sandiTersimpan.replace(/^"|"$/g, '');
        return sandiInput === sandiTersimpan;
    });
}

function lakukanPatchOtoritas(dataBody) {
    return fetch(`${FIREBASE_URL}pengaturan_sistem.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataBody)
    });
}

document.getElementById("inputSandiLogin")?.addEventListener("keyup", function(event) {
    if (event.key === "Enter") prosesLogin();
});

window.prosesLogin = function() {
    let ketikanSandi = document.getElementById('inputSandiLogin').value;
    if (!ketikanSandi) { Swal.fire('Kredensial Kosong', 'Harap masukkan sandi master.', 'warning'); return; }

    let btn = document.getElementById('btnLogin');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i> MENGOTENTIKASI...';
    btn.disabled = true;

    verifikasiSandiFirebase(ketikanSandi).then(cocok => {
        if (cocok) {
            sandiSesiAktif = ketikanSandi; 
            sessionStorage.setItem(KUNCI_SESI, enkripsiLokal(ketikanSandi)); // ENKRIPSI AKTIF
            mulaiSistemUtama();
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Otorisasi Diterima.', showConfirmButton: false, timer: 2000 });
        } else {
            Swal.fire('Akses Ditolak!', 'Sandi tidak dikenali.', 'error');
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i> MASUK SISTEM';
            btn.disabled = false;
        }
    }).catch(e => {
        Swal.fire('Koneksi Gagal', 'Gagal terhubung ke server.', 'error');
        btn.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i> MASUK SISTEM';
        btn.disabled = false;
    });
}

function mulaiSistemUtama() {
    document.getElementById('loginGate').style.display = 'none';
    document.getElementById('appDashboard').style.display = 'flex';
    
    let btnLogin = document.getElementById('btnLogin');
    if(btnLogin) {
        btnLogin.innerHTML = '<i class="fa-solid fa-right-to-bracket me-2"></i> MASUK SISTEM';
        btnLogin.disabled = false;
    }
    
    if (localStorage.getItem('temaLRA') === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeIcon').classList.replace('fa-moon', 'fa-sun');
    }
    
    jalankanJam();
    inisialisasiGrafik(); 
    muatSinyalDanStatus(); 
    aktifkanSensorSiluman(); 
}

window.onload = function() {
    let sandiTerenkripsi = sessionStorage.getItem(KUNCI_SESI);
    if (sandiTerenkripsi) {
        let sandiAsli = dekripsiLokal(sandiTerenkripsi);
        if (sandiAsli) {
            verifikasiSandiFirebase(sandiAsli).then(cocok => {
                if (cocok) {
                    sandiSesiAktif = sandiAsli;
                    mulaiSistemUtama();
                } else {
                    sessionStorage.removeItem(KUNCI_SESI);
                }
            }).catch(() => { sessionStorage.removeItem(KUNCI_SESI); });
        } else {
            sessionStorage.removeItem(KUNCI_SESI);
        }
    }
};

function jalankanJam() {
    setInterval(() => { document.getElementById('liveClock').innerText = new Date().toLocaleTimeString('id-ID', { hour12: false }); }, 1000);
}

// ==========================================
// [MESIN TELEMETRI KUOTA]
// ==========================================
let totalBytesAllTime = parseFloat(localStorage.getItem('LRA_KUOTA_USAGE') || 0);

function catatPemakaianKuota(ukuranBita) {
    totalBytesAllTime += ukuranBita;
    localStorage.setItem('LRA_KUOTA_USAGE', totalBytesAllTime);
    
    let mbUsed = (totalBytesAllTime / (1024 * 1024)).toFixed(3);
    let persenKuota = (mbUsed / 1024) * 100;
    
    let elPemakaian = document.getElementById('teksPemakaianKuota');
    let elTotal = document.getElementById('teksTotalDownload');
    let elBar = document.getElementById('barKuota');
    
    if(elPemakaian) elPemakaian.innerText = `${mbUsed} MB / 1024 MB`;
    if(elTotal) elTotal.innerText = `${(totalBytesAllTime / 1024).toFixed(2)} KB`;
    if(elBar) elBar.style.width = `${Math.min(persenKuota, 100)}%`;
}

// ==========================================
// [MESIN SENSOR SILUMAN GANDA (DUAL-CORE)] - KILAT & HEMAT KUOTA
// ==========================================
let firebaseRadarSource = null;
let firebaseSistemSource = null;
let sensorRadarPertama = true; 
let sensorSistemPertama = true; 

function aktifkanSensorSiluman() {
    // 📡 SENSOR 1: RADAR SKPD
    if (!firebaseRadarSource) {
        function hubungkanRadar() {
            firebaseRadarSource = new EventSource(`${FIREBASE_URL}radar_2026.json`);
            let penahanSinyalRadar = null;

            firebaseRadarSource.addEventListener('put', function(e) {
                if (sensorRadarPertama) { sensorRadarPertama = false; return; }
                
                let ind = document.getElementById('indikatorRadar');
                if(ind) ind.innerHTML = '<i class="fa-solid fa-bolt text-warning me-1"></i> Mendeteksi Pergerakan...';
                
                clearTimeout(penahanSinyalRadar);
                penahanSinyalRadar = setTimeout(function() { muatSinyalDanStatus(); }, 1500); 
            });

            firebaseRadarSource.onerror = function() {
                firebaseRadarSource.close(); firebaseRadarSource = null;
                setTimeout(hubungkanRadar, 3000);
            };
        }
        hubungkanRadar();
    }

    // 🔒 SENSOR 2: KENDALI GEMBOK (REAKSI 100MS SECEPAT KILAT)
    if (!firebaseSistemSource) {
        function hubungkanSistem() {
            firebaseSistemSource = new EventSource(`${FIREBASE_URL}pengaturan_sistem.json`);
            let penahanSinyalSistem = null;

            firebaseSistemSource.addEventListener('put', function(e) {
                if (sensorSistemPertama) { sensorSistemPertama = false; return; }
                
                clearTimeout(penahanSinyalSistem);
                penahanSinyalSistem = setTimeout(function() { muatSinyalDanStatus(); }, 100); 
            });

            firebaseSistemSource.onerror = function() {
                firebaseSistemSource.close(); firebaseSistemSource = null;
                setTimeout(hubungkanSistem, 3000);
            };
        }
        hubungkanSistem();
    }
}

// ==========================================
// [INISIALISASI GRAFIK & SINKRONISASI]
// ==========================================
function inisialisasiGrafik() {
    const ctx = document.getElementById('chartStatistik').getContext('2d');
    Chart.defaults.color = document.body.classList.contains('dark-mode') ? '#ffffff' : '#0f172a';
    
    if(grafikStatistik) grafikStatistik.destroy(); 
    
    grafikStatistik = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Belum Mulai', 'Sedang Proses', 'Selesai 100%'],
            datasets: [{
                label: 'Jumlah SKPD',
                data: [0, 0, 0],
                backgroundColor: ['rgba(100, 116, 139, 0.7)', 'rgba(245, 158, 11, 0.8)', 'rgba(16, 185, 129, 0.8)'],
                borderWidth: 0, borderRadius: 6, barPercentage: 0.5
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } }, x: { grid: { display: false } } }
        }
    });
}

function updateStatistikRadar(total, proses, tuntas) {
    let elTotal = document.getElementById('statTotal'); let elProses = document.getElementById('statProses'); let elTuntas = document.getElementById('statTuntas');
    if(elTotal) elTotal.innerText = total; if(elProses) elProses.innerText = proses; if(elTuntas) elTuntas.innerText = tuntas;
    if(grafikStatistik) {
        grafikStatistik.data.datasets[0].data = [total - (proses + tuntas), proses, tuntas];
        grafikStatistik.update();
    }
}

window.muatSinyalDanStatus = function() {
    let ind = document.getElementById('indikatorRadar');
    if(ind) ind.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-1"></i> Memuat...';
    
    Promise.all([
        fetch(`${FIREBASE_URL}radar_2026.json?_t=${Date.now()}`).then(r => r.text()),
        fetch(`${FIREBASE_URL}pengaturan_sistem.json?_t=${Date.now()}`).then(r => r.text())
    ]).then(([radarTxt, sistemTxt]) => {
        
        let beratBita = new Blob([radarTxt, sistemTxt]).size;
        catatPemakaianKuota(beratBita);

        let dataRadar = radarTxt !== "null" ? JSON.parse(radarTxt) : {};
        let dataSistem = sistemTxt !== "null" ? JSON.parse(sistemTxt) : {};

        if(ind) ind.innerHTML = '<i class="fa-solid fa-satellite-dish text-success me-1"></i> AKTIF';
        let elWaktuUpdate = document.getElementById('waktuUpdateTerakhir');
        if(elWaktuUpdate) elWaktuUpdate.innerText = new Date().toLocaleTimeString('id-ID', {timeZone: 'Asia/Makassar', hour:'2-digit', minute:'2-digit', second:'2-digit'});
        
        let isLockedGlobal = dataSistem && dataSistem.status_kunci_2026 === true;
        statusSistemTerkini = isLockedGlobal; 
        
        let statusBox = document.getElementById('sidebarStatusBox');
        let headerBadge = document.getElementById('headerStatusBadge');

        if (isLockedGlobal) {
            if(statusBox) { statusBox.className = "sidebar-status-box status-box-closed"; statusBox.innerHTML = '<i class="fa-solid fa-lock me-2 text-danger"></i> Akses Global Ditutup'; }
            if(headerBadge) { headerBadge.className = "badge bg-danger px-3 py-2"; headerBadge.innerHTML = '<i class="fa-solid fa-lock me-1"></i> AKSES DITUTUP'; }
        } else {
            if(statusBox) { statusBox.className = "sidebar-status-box status-box-open"; statusBox.innerHTML = '<i class="fa-solid fa-lock-open me-2 text-success"></i> Akses Global Terbuka'; }
            if(headerBadge) { headerBadge.className = "badge bg-success px-3 py-2"; headerBadge.innerHTML = '<i class="fa-solid fa-lock-open me-1"></i> AKSES DIBUKA'; }
        }

        globalKunciSkpd = (dataSistem && dataSistem.kunci_skpd) ? dataSistem.kunci_skpd : {};
        radarDataMentah = []; window.daftarSkpdOnline = []; 
        let totalSkpd = 0, prosesSkpd = 0, tuntasSkpd = 0;
        let pesanKosong = document.getElementById('pesanKosong');

        if (!dataRadar || Object.keys(dataRadar).length === 0) {
            if(pesanKosong) pesanKosong.style.display = 'block';
            renderTabelRadar([]); updateStatistikRadar(0, 0, 0); return;
        }
        if(pesanKosong) pesanKosong.style.display = 'none';

        let petaSkpdUnik = {};

        for (let kode in dataRadar) {
            let info = dataRadar[kode];
            let namaRaw = info.nama_skpd || "Instansi Anonim";
            let namaBersih = namaRaw.toUpperCase().replace(/\s+/g, ' ').trim();
            let isPadOnly = kode.startsWith('PAD_');
            let persenMentah = parseFloat(info.persentase || 0);
            let persenAkurat = parseFloat(persenMentah.toFixed(2));
            let waktuAsli = info.waktu_update;
            let ts = (!isNaN(waktuAsli) && waktuAsli !== null && waktuAsli !== "") ? Number(waktuAsli) : 0;

            if (!petaSkpdUnik[namaBersih]) {
                petaSkpdUnik[namaBersih] = { kode_asli: kode, nama: namaRaw, persen: persenAkurat, waktu_ts: ts, waktu_str: waktuAsli, is_pad_only: isPadOnly };
            } else {
                let dataLama = petaSkpdUnik[namaBersih];
                if (dataLama.is_pad_only && !isPadOnly) {
                    dataLama.kode_asli = kode; dataLama.persen = persenAkurat; dataLama.is_pad_only = false; dataLama.nama = namaRaw;
                } else if (!dataLama.is_pad_only && !isPadOnly) {
                    if (ts > dataLama.waktu_ts) { dataLama.kode_asli = kode; dataLama.persen = persenAkurat; dataLama.nama = namaRaw; }
                }
                if (ts > dataLama.waktu_ts) { dataLama.waktu_ts = ts; dataLama.waktu_str = waktuAsli; }
            }
        }

        for (let namaBersih in petaSkpdUnik) {
            let item = petaSkpdUnik[namaBersih];
            let waktuUpdateManusia = "Belum ada riwayat";
            let ts = item.waktu_ts;
            
            if (ts > 0) {
                let selisihMenit = (Date.now() - ts) / (1000 * 60);
                if (selisihMenit <= 15) window.daftarSkpdOnline.push(item.nama);
                
                let objDate = new Date(ts);
                if (!isNaN(objDate.getTime())) {
                    let tgl = objDate.toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: '2-digit', month: 'short', year: 'numeric' });
                    let jam = objDate.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour: '2-digit', minute: '2-digit' }).replace(/\./g, ':');
                    waktuUpdateManusia = `${tgl}, ${jam} WITA`; 
                } else { waktuUpdateManusia = item.waktu_str; }
            } else { waktuUpdateManusia = item.waktu_str || "Belum ada riwayat"; }

            totalSkpd++;
            if (item.persen === 100) tuntasSkpd++; else if (item.persen > 0) prosesSkpd++;

            radarDataMentah.push({ kode_asli: item.kode_asli, kode_format: item.kode_asli.replace(/_/g, '.'), nama: item.nama, persen: item.persen, waktu_update: waktuUpdateManusia, waktu_mesin: ts });
        }
        
        let elTeksOnline = document.getElementById('teksJumlahOnline');
        if (elTeksOnline) elTeksOnline.innerText = `${window.daftarSkpdOnline.length} Online`;     
        
        updateStatistikRadar(totalSkpd, prosesSkpd, tuntasSkpd);
        
        radarDataMentah.sort((a, b) => {
            if (b.persen !== a.persen) return b.persen - a.persen; 
            return b.waktu_mesin - a.waktu_mesin;
        });

        renderTabelRadar(radarDataMentah);
    }).catch(e => {
        if(ind) ind.innerHTML = '<i class="fa-solid fa-triangle-exclamation text-danger me-1"></i> Gagal Sinkron';
    });
}

// ==========================================
// [OTORITAS & MANAJEMEN DATABASE PRE-CHECK]
// ==========================================
window.ubahStatusSistem = function(perintahKunci) {
    if (perintahKunci === statusSistemTerkini) { Swal.fire({ icon: 'info', title: 'Tidak Ada Perubahan', text: perintahKunci ? "Akses penginputan data SKPD SUDAH DITUTUP." : "Akses penginputan data SKPD SUDAH DIBUKA.", confirmButtonColor: '#1e3a5f' }); return; }
    Swal.fire({
        title: perintahKunci ? "Tutup Akses Global?" : "Buka Akses Global?",
        html: `<div style="font-size:13px; margin-bottom:15px; color: var(--text-primary);">${perintahKunci ? "Status penginputan semua SKPD akan dikunci." : "Semua SKPD bisa melakukan penginputan kembali."}</div>
               <div style="position:relative; width:85%; margin:0 auto;">
                   <input type="password" id="inputSandiRahasia" class="swal2-input m-0 w-100" style="padding-right:40px;" placeholder="Sandi otoritas...">
                   <i class="fa-solid fa-eye-slash" id="mataGembokGlobal" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); cursor:pointer; color:#94a3b8;" onclick="toggleMata('inputSandiRahasia', 'mataGembokGlobal')"></i>
               </div>`,
        showCancelButton: true, confirmButtonColor: perintahKunci ? '#dc2626' : '#10b981',
        preConfirm: () => {
            let sandi = document.getElementById('inputSandiRahasia').value;
            if(!sandi) { Swal.showValidationMessage('Sandi wajib diisi'); return false; }
            return sandi;
        }
    }).then((res) => {
        if(res.isConfirmed && res.value) {
            Swal.fire({ title: 'Memverifikasi...', didOpen: () => Swal.showLoading() });
            verifikasiSandiFirebase(res.value).then(cocok => {
                if (!cocok) { Swal.fire('Ditolak!', 'Sandi otoritas salah.', 'error'); return; }
                return lakukanPatchOtoritas({ status_kunci_2026: perintahKunci });
            }).then(r => {
                // [KODE DIKEMBALIKAN!] Memaksa Layar Langsung Refresh Saat Itu Juga!
                if (r && r.ok) { 
                    muatSinyalDanStatus(); 
                    Swal.fire('Berhasil', 'Sistem diperbarui', 'success'); 
                }
            }).catch(() => Swal.fire('Ditolak!', 'Sandi otoritas salah.', 'error'));
        }
    });
}

window.toggleKunciSkpd = function(kodeAsli, namaSkpd, perintahKunci) {
    Swal.fire({
        title: perintahKunci ? "Kunci Laporan SKPD?" : "Buka Kunci SKPD?",
        html: `<div style="font-size: 13px; text-align:left; margin-bottom:15px; color: var(--text-heading);">Instansi: <b>${namaSkpd}</b><br><br>${perintahKunci ? "Kunci Inputan SKPD ini pada:" : "Buka kembali akses input rincian untuk instansi ini?"}</div>
               ${perintahKunci ? `<select id="inputSemesterSkpd" class="swal2-select m-0 mb-3 w-100"><option value="Semester 1">Semester I (Jan - Jun)</option><option value="Semester 2">Semester II (1 Tahun)</option></select>` : ""}
               <div style="position: relative;">
               <input type="password" id="inputSandiPerSkpd" class="swal2-input m-0 w-100" style="padding-right:40px;" placeholder="Ketik sandi otoritas...">
               <i class="fa-solid fa-eye-slash" id="mataSandiSkpd" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8;" onclick="toggleMata('inputSandiPerSkpd', 'mataSandiSkpd')"></i>
               </div>`,
        showCancelButton: true, confirmButtonColor: perintahKunci ? '#10b981' : '#dc2626',
        preConfirm: () => { 
            // Proteksi Cerdas Anti Error DOM
            let elSemester = document.getElementById('inputSemesterSkpd');
            return { 
                sandi: document.getElementById('inputSandiPerSkpd').value, 
                semester: elSemester ? elSemester.value : "" 
            }; 
        }
    }).then((res) => {
        if (res.isConfirmed && res.value.sandi) {
            Swal.fire({ title: 'Memverifikasi...', didOpen: () => Swal.showLoading() });
            verifikasiSandiFirebase(res.value.sandi).then(cocok => {
                if (!cocok) { Swal.fire('Gagal', 'Sandi otoritas salah.', 'error'); throw new Error('Sandi salah'); }
                return lakukanPatchOtoritas({ [`kunci_skpd/${kodeAsli}/terkunci`]: perintahKunci, [`kunci_skpd/${kodeAsli}/semester`]: res.value.semester });
            }).then(r => { 
                // [KODE DIKEMBALIKAN!] Memaksa Layar Langsung Refresh Saat Itu Juga!
                if (r && r.ok) { 
                    muatSinyalDanStatus(); 
                    Swal.fire('Berhasil', `Instansi berhasil di${perintahKunci ? 'kunci' : 'buka'}.`, 'success'); 
                }
            }).catch(() => {});
        }
    });
};

window.backupTotalDatabase = function() {
    Swal.fire({
        title: 'Konfirmasi Cadangkan Data?', text: "Proses ini akan menyimpan seluruh data LRA SKPD.",
        showCancelButton: true, confirmButtonText: 'Ok Bos', confirmButtonColor: '#2563eb'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'Memverifikasi Otoritas...', didOpen: () => Swal.showLoading() });
            verifikasiSandiFirebase(sandiSesiAktif).then(cocok => {
                if (!cocok) { Swal.fire('Akses Ditolak', 'Sesi tidak valid. Silakan logout dan login ulang.', 'error'); throw new Error('Sesi kadaluarsa'); }
                return Promise.all([
                    fetch(`${FIREBASE_URL}lra_2026.json`).then(r => r.json()),
                    fetch(`${FIREBASE_URL}radar_2026.json`).then(r => r.json()),
                    fetch(`${FIREBASE_URL}pengaturan_sistem.json`).then(r => r.json())
                ]);
            }).then(([lraData, radarData, sistemData]) => {
                let backupGabungan = { lra_2026: lraData || {}, radar_2026: radarData || {}, pengaturan_sistem: sistemData || {} };
                delete backupGabungan.pengaturan_sistem.sandi_admin;
                let blob = new Blob([JSON.stringify(backupGabungan, null, 2)], { type: "application/json" });
                let a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                let tk = new Date(); let nf = `BACKUP_LRA_${tk.getFullYear()}${String(tk.getMonth()+1).padStart(2,'0')}${String(tk.getDate()).padStart(2,'0')}_${String(tk.getHours()).padStart(2,'0')}${String(tk.getMinutes()).padStart(2,'0')}.json`;
                a.download = nf; document.body.appendChild(a); a.click(); a.remove();
                Swal.fire('Backup Sukses', `Disimpan dengan nama: ${nf}`, 'success');
            }).catch(() => {});
        }
    });
}

window.triggerRestoreDatabase = function() {
    if(statusSistemTerkini === true) { Swal.fire({ icon: 'warning', title: 'Sistem Terkunci!', text: 'Harap klik BUKA AKSES GLOBAL terlebih dahulu sebelum melakukan Restore.', confirmButtonColor: '#1e3a5f' }); return; }
    Swal.fire({
        title: 'KONFIRMASI PEMULIHAN DATA', html: 'Anda akan menimpa database server saat ini menggunakan file cadangan lokal.<br><br><b>Masukkan Kata Sandi:</b>',
        input: 'password', showCancelButton: true, confirmButtonColor: '#d97706',
        preConfirm: (sandi) => { if(!sandi) Swal.showValidationMessage('Sandi wajib diisi'); return sandi; }
    }).then((result) => {
        if(result.isConfirmed) {
            Swal.fire({ title: 'Memeriksa Otoritas...', didOpen: () => Swal.showLoading() });
            verifikasiSandiFirebase(result.value).then(cocok => {
                if (!cocok) { Swal.fire('Akses Ditolak', 'Sandi otoritas salah.', 'error'); return; }
                Swal.close(); 
                document.getElementById('fileRestore').click(); 
            }).catch(() => Swal.fire('Galat', 'Gagal memverifikasi.', 'error'));
        }
    });
}

window.prosesRestoreDatabase = function(event) {
    let file = event.target.files[0]; if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let jsonData = JSON.parse(e.target.result);
            if (!jsonData.lra_2026 && !jsonData.radar_2026) { Swal.fire('File Salah', 'Ini bukan file Backup LRA yang valid.', 'error'); return; }
            
            Swal.fire({ title: 'Memulihkan...', html: 'Mengirim ribuan baris data secara paralel...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            let kumpulanJanjiUpload = [];
            
            if (jsonData.lra_2026) { for (let ks in jsonData.lra_2026) kumpulanJanjiUpload.push(fetch(`${FIREBASE_URL}lra_2026/${ks}.json`, { method:'PUT', headers: {'Content-Type':'application/json'}, body:JSON.stringify(jsonData.lra_2026[ks]) })); }
            if (jsonData.radar_2026) { for (let ks in jsonData.radar_2026) kumpulanJanjiUpload.push(fetch(`${FIREBASE_URL}radar_2026/${ks}.json`, { method:'PUT', headers: {'Content-Type':'application/json'}, body:JSON.stringify(jsonData.radar_2026[ks]) })); }
            if (jsonData.pengaturan_sistem) {
                delete jsonData.pengaturan_sistem.sandi_admin;
                kumpulanJanjiUpload.push(fetch(`${FIREBASE_URL}pengaturan_sistem.json`, { method:'PATCH', headers: {'Content-Type':'application/json'}, body:JSON.stringify(jsonData.pengaturan_sistem) }));
            }

            Promise.all(kumpulanJanjiUpload).then(arr => {
                // SENSOR 2 AKAN OTOMATIS MERENDER LAYAR!
                if (arr.every(r => r.ok)) { Swal.fire('Pemulihan Selesai!', 'Seluruh data berhasil dikembalikan.', 'success'); } 
                else { Swal.fire('Peringatan', 'Proses selesai, namun sebagian data ditolak.', 'warning'); }
            }).catch(err => Swal.fire('Koneksi Putus', 'Gagal saat proses pemulihan.', 'error'));
        } catch (err) { Swal.fire('File Rusak', 'Format file JSON korup.', 'error'); }
        event.target.value = ''; 
    }; reader.readAsText(file);
}

window.toggleKunciSkpd = function(kodeAsli, namaSkpd, perintahKunci) {
    Swal.fire({
        title: perintahKunci ? "Kunci Laporan SKPD?" : "Buka Kunci SKPD?",
        html: `<div style="font-size: 13px; text-align:left; margin-bottom:15px; color: var(--text-heading);">Instansi: <b>${namaSkpd}</b><br><br>${perintahKunci ? "Kunci Inputan SKPD ini pada:" : "Buka kembali akses input rincian untuk instansi ini?"}</div>
               ${perintahKunci ? `<select id="inputSemesterSkpd" class="swal2-select m-0 mb-3 w-100"><option value="Semester 1">Semester I (Jan - Jun)</option><option value="Semester 2">Semester II (1 Tahun)</option></select>` : ""}
               <div style="position: relative;">
               <input type="password" id="inputSandiPerSkpd" class="swal2-input m-0 w-100" style="padding-right:40px;" placeholder="Ketik sandi otoritas...">
               <i class="fa-solid fa-eye-slash" id="mataSandiSkpd" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8;" onclick="toggleMata('inputSandiPerSkpd', 'mataSandiSkpd')"></i>
               </div>`,
        showCancelButton: true, confirmButtonColor: perintahKunci ? '#10b981' : '#dc2626',
        preConfirm: () => { return { sandi: document.getElementById('inputSandiPerSkpd').value, semester: perintahKunci ? document.getElementById('inputSemesterSkpd').value : "" }; }
    }).then((res) => {
        if (res.isConfirmed && res.value.sandi) {
            Swal.fire({ title: 'Memverifikasi...', didOpen: () => Swal.showLoading() });
            verifikasiSandiFirebase(res.value.sandi).then(cocok => {
                if (!cocok) { Swal.fire('Gagal', 'Sandi otoritas salah.', 'error'); throw new Error('Sandi salah'); }
                return lakukanPatchOtoritas({ [`kunci_skpd/${kodeAsli}/terkunci`]: perintahKunci, [`kunci_skpd/${kodeAsli}/semester`]: res.value.semester });
            }).then(r => { 
                // SENSOR 2 AKAN OTOMATIS MERENDER LAYAR!
                if (r && r.ok) { Swal.fire('Berhasil', `Instansi berhasil di${perintahKunci ? 'kunci' : 'buka'}.`, 'success'); }
            }).catch(() => {});
        }
    });
};

window.lihatDetailSkpd = function(kode) { Swal.fire('Informasi Modul', `Fasilitas pembacaan arsip untuk instansi ${kode.replace(/_/g, '.')} sedang dalam tahap pemutakhiran.`, 'info'); }

function renderTabelRadar(dataArray) {
    let tbody = document.getElementById('badanRadar');
    tbody.innerHTML = ''; 
    const fragmenMemori = document.createDocumentFragment();

    dataArray.forEach((item, index) => {
        let nilaiPersenNum = parseFloat(item.persen || 0);
        let nilaiPersen = nilaiPersenNum.toFixed(2);
        let isTuntas = nilaiPersenNum === 100; 
        let isOver = nilaiPersenNum > 100; 
        let warnaBar = isTuntas ? 'bg-success' : (isOver ? 'bg-danger' : (nilaiPersenNum >= 75 ? 'bg-warning' : 'bg-danger'));
        
        let infoGembok = globalKunciSkpd[item.kode_asli];
        let isDigembok = infoGembok && infoGembok.terkunci === true;
        
        let ts = '';
        if (isTuntas) ts = `<span class="badge bg-success"><i class="fa-solid fa-check-double me-1"></i> Selesai 100%</span>`;
        else if (isOver) ts = `<span class="badge" style="background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);"><i class="fa-solid fa-triangle-exclamation me-1"></i> OVERBUDGET (${nilaiPersen}%)</span>`;
        else ts = `<span class="fw-bold text-heading">${nilaiPersen}%</span>`;
        
        if (isDigembok) ts += `<div class="mt-2"><span class="badge" style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444;"><i class="fa-solid fa-lock me-1"></i> TERKUNCI: Selesai ${infoGembok.semester}</span></div>`;

        let bgRowStyle = isDigembok ? 'border-left: 3px solid #ef4444;' : (isOver ? 'border-left: 4px solid #dc2626; background-color: #fff1f2;' : (isTuntas ? 'border-left: 3px solid #10b981;' : '')); 

        let elemenWaktu = item.waktu_update !== "Belum ada riwayat" 
            ? `<span style="color: var(--accent-blue);"><i class="fa-regular fa-clock me-1"></i> Terakhir Update: ${item.waktu_update}</span>` 
            : `<span style="color: var(--text-faint);"><i class="fa-solid fa-circle-minus me-1"></i> Belum ada riwayat</span>`;

        let tr = document.createElement('tr');
        if(bgRowStyle !== '') tr.style.cssText = bgRowStyle;
        
        let lebarVisual = nilaiPersenNum > 100 ? 100 : nilaiPersenNum;
        
        tr.innerHTML = `
            <td class="text-center fw-bold text-muted" style="vertical-align: middle;">${index + 1}</td>
            <td class="fw-bold text-muted" style="vertical-align: middle;">${item.kode_format}</td>
            <td style="vertical-align: middle;">
                <div class="fw-bold text-uppercase text-heading" style="margin-bottom: 6px;">${item.nama}</div>
                <div style="font-size: 10px; font-family: var(--font-mono); background: var(--bg-page); border: 1px solid var(--border-light); display: inline-block; padding: 4px 8px; border-radius: 6px;">
                    ${elemenWaktu}
                </div>
            </td>
            <td style="vertical-align: middle;">
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-muted d-flex align-items-center" style="font-size:11px;">
                        Inputan Realisasi 
                        <i class="fa-solid fa-arrows-rotate ms-2" style="cursor: pointer; color: #3b82f6; font-size: 11px; transition: 0.3s;" onclick="refreshRadarTunggal('${item.kode_asli}', this)" title="Tarik Persentase Asli dari Server"></i>
                    </span>
                    <span class="text-end" id="wrap_persen_${item.kode_asli}">${ts}</span>
                </div>
                <div class="progress-premium" id="container_bar_${item.kode_asli}" style="${isTuntas ? 'height: 6px;' : ''}">
                    <div id="bar_persen_${item.kode_asli}" class="progress-bar-glow h-100 ${warnaBar}" style="width: ${lebarVisual}%"></div>
                </div>
            </td>
            <td class="text-center" style="vertical-align: middle;">
                <button onclick="lihatDetailSkpd('${item.kode_asli}')" class="btn btn-outline-primary w-100 mb-1"><i class="fa-solid fa-magnifying-glass"></i> Rincian</button>
                <button onclick="mulaiAuditForensik('${item.kode_asli}', '${item.nama}')" class="btn btn-outline-warning w-100 mb-1" style="font-weight: 700; color: #d97706; border-color: #fbbf24;"><i class="fa-solid fa-file-shield"></i> Validasi</button>
                ${isDigembok ? `<button onclick="toggleKunciSkpd('${item.kode_asli}', '${item.nama}', false)" class="btn btn-danger w-100"><i class="fa-solid fa-unlock"></i> Buka Kunci</button>` : `<button onclick="toggleKunciSkpd('${item.kode_asli}', '${item.nama}', true)" class="btn btn-outline-success w-100"><i class="fa-solid fa-lock"></i> Kunci</button>`}
            </td>
        `;
        fragmenMemori.appendChild(tr);
    });
    tbody.appendChild(fragmenMemori);
}

window.filterRadar = function() {
    let k = document.getElementById('cariSkpd').value.toLowerCase();
    renderTabelRadar(radarDataMentah.filter(item => item.nama.toLowerCase().includes(k) || item.kode_format.includes(k)));
}

window.prosesLogout = function() {
    Swal.fire({
        title: 'Akhiri Sesi?', 
        html: '<span style="font-size: 14px; color: var(--text-muted);">Anda akan keluar dari sistem.</span>',
        icon: 'warning', 
        showCancelButton: true, 
        confirmButtonColor: '#dc2626', 
        cancelButtonColor: '#64748b', 
        confirmButtonText: '<i class="fa-solid fa-power-off me-1"></i> Ya, Keluar', 
        reverseButtons: true 
    }).then((result) => {
        if (result.isConfirmed) {
            sandiSesiAktif = ""; 
            sessionStorage.removeItem(KUNCI_SESI);
            
            // --- [INJEKSI DEWA: MEMATIKAN DUA MESIN SSE SEKALIGUS] ---
            if (firebaseRadarSource) { firebaseRadarSource.close(); firebaseRadarSource = null; } 
            if (firebaseSistemSource) { firebaseSistemSource.close(); firebaseSistemSource = null; } 

            Swal.fire({ 
                title: 'Menutup Akses...', 
                timer: 1000, 
                showConfirmButton: false, 
                allowOutsideClick: false, 
                didOpen: () => Swal.showLoading() 
            }).then(() => {
                document.getElementById('appDashboard').style.display = 'none';
                document.getElementById('loginGate').style.display = 'flex';
                
                let inputSandi = document.getElementById('inputSandiLogin');
                if(inputSandi) inputSandi.value = '';
            });
        }
    });
};

window.tampilkanDaftarOnline = function() {
    if (!window.daftarSkpdOnline || window.daftarSkpdOnline.length === 0) {
        Swal.fire({ icon: 'info', title: 'Tidak Ada SKPD Aktif', text: 'Saat ini belum ada instansi yang melakukan transmisi data dalam 15 menit terakhir.', confirmButtonColor: '#1e3a5f' });
        return;
    }

    let listHtml = '<div style="max-height: 280px; overflow-y: auto; text-align: left; font-size: 12px; font-family: var(--font-mono); background: var(--bg-page); padding: 12px; border-radius: 8px; border: 1px solid var(--border-light);">';
    let daftarUrut = window.daftarSkpdOnline.sort();
    
    daftarUrut.forEach(nama => {
        listHtml += `<div style="padding: 10px 8px; border-bottom: 1px dashed var(--border-default); color: var(--text-heading); display: flex; align-items: center;">
                        <span class="status-dot-bar" style="margin-right: 10px; background-color: #10b981; box-shadow: 0 0 6px #10b981;"></span> ${nama}
                     </div>`;
    });
    listHtml += '</div>';

    Swal.fire({
        title: '<div style="font-size: 16px; font-weight: 800; color: var(--text-heading);"><i class="fa-solid fa-satellite-dish text-success me-2"></i> SKPD SEDANG AKTIF</div>',
        html: `<div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">aktivitas transmisi dalam 15 menit terakhir.</div>${listHtml}`,
        showConfirmButton: true, confirmButtonText: 'Tutup Monitor', confirmButtonColor: '#1e3a5f', background: 'var(--bg-card)'
    });
};

window.refreshRadarTunggal = function(kodeAsli, iconElement) {
    iconElement.classList.add('fa-spin');
    iconElement.style.color = '#94a3b8'; 
    iconElement.style.pointerEvents = 'none'; 

    fetch(`${FIREBASE_URL}radar_2026/${kodeAsli}.json?_t=${Date.now()}`)
    .then(r => r.json())
    .then(data => {
        if(data) {
            let persenMentah = parseFloat(data.persentase || 0);
            let nilaiPersen = persenMentah.toFixed(2);
            let isTuntas = persenMentah === 100;
            let isOver = persenMentah > 100;
            let warnaBar = isTuntas ? 'bg-success' : (isOver ? 'bg-danger' : (persenMentah >= 75 ? 'bg-warning' : 'bg-danger'));
            let lebarVisual = persenMentah > 100 ? 100 : persenMentah;
            
            let infoGembok = globalKunciSkpd[kodeAsli];
            let isDigembok = infoGembok && infoGembok.terkunci === true;
            
            let ts = '';
            if (isTuntas) ts = `<span class="badge bg-success"><i class="fa-solid fa-check-double me-1"></i> Selesai 100%</span>`;
            else if (isOver) ts = `<span class="badge" style="background-color: #fef2f2; color: #dc2626; border: 1px solid #fecaca; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.1);"><i class="fa-solid fa-triangle-exclamation me-1"></i> OVERBUDGET (${nilaiPersen}%)</span>`;
            else ts = `<span class="fw-bold text-heading">${nilaiPersen}%</span>`;
            if (isDigembok) ts += `<div class="mt-2"><span class="badge" style="background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid #ef4444;"><i class="fa-solid fa-lock me-1"></i> TERKUNCI: Selesai ${infoGembok.semester}</span></div>`;

            let wrap = document.getElementById(`wrap_persen_${kodeAsli}`);
            if(wrap) wrap.innerHTML = ts;

            let bar = document.getElementById(`bar_persen_${kodeAsli}`);
            if(bar) {
                bar.className = `progress-bar-glow h-100 ${warnaBar}`;
                bar.style.width = `${lebarVisual}%`;
            }

            let cBar = document.getElementById(`container_bar_${kodeAsli}`);
            if(cBar) cBar.style.height = isTuntas ? '6px' : '';

            iconElement.classList.remove('fa-spin');
            iconElement.style.color = '#10b981'; 
            setTimeout(() => { 
                iconElement.style.color = '#3b82f6'; 
                iconElement.style.pointerEvents = 'auto'; 
            }, 2000);
        }
    }).catch(e => {
        iconElement.classList.remove('fa-spin');
        iconElement.style.color = '#ef4444'; 
        setTimeout(() => { 
            iconElement.style.color = '#3b82f6'; 
            iconElement.style.pointerEvents = 'auto'; 
        }, 2000);
    });
};

})(); // PENUTUP KURUNGAN GAIB (IIFE) - WAJIB ADA!
