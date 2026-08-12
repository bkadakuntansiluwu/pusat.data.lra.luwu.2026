// =========================================================================
// [SISTEM KEAMANAN TINGKAT TINGGI: KUNCI DOMAIN & ANTI-OFFLINE]
// =========================================================================
const DOMAIN_RESMI = "bkadakuntansiluwu.github.io"; 

if (window.location.protocol === "file:") {
    document.body.innerHTML = `<div style="background:#fff; height:100vh; display:flex; justify-content:center; align-items:center; color:#dc2626; font-family:sans-serif; text-align:center;"><h1>⚠️ AKSES ILEGAL DIBLOKIR</h1></div>`;
    throw new Error("Sistem mengunci diri. Eksekusi file lokal dilarang.");
}

if (window.location.hostname !== DOMAIN_RESMI && window.location.hostname !== "localhost") {
    document.body.innerHTML = `<div style="background:#fff; height:100vh; display:flex; justify-content:center; align-items:center; color:#dc2626; font-family:sans-serif; text-align:center;"><h1>⚠️ DOMAIN TIDAK DIKENAL</h1></div>`;
    throw new Error("Sistem mengunci diri. Domain tidak valid.");
}
// =========================================================================

const FIREBASE_URL = "https://lra-luwu-2026-default-rtdb.asia-southeast1.firebasedatabase.app/";

function jalankanJam() {
    setInterval(() => {
        let d = new Date();
        document.getElementById('liveClock').innerText = d.toLocaleTimeString('id-ID', { hour12: false });
    }, 1000);
}

function muatStatusSistem() {
    fetch(`${FIREBASE_URL}pengaturan_sistem.json?r=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
            let isLocked = data && data.status_kunci_2026 === true;
            let judul = document.getElementById('teksStatusSistem');
            let sub = document.getElementById('teksSubStatus');

            if (isLocked) {
                judul.innerHTML = '<span class="status-dot dot-locked"></span>SISTEM TERKUNCI';
                judul.className = "fw-bold mb-1 text-danger";
                sub.innerText = "Seluruh SKPD ditolak saat menyimpan data ke peladen.";
            } else {
                judul.innerHTML = '<span class="status-dot dot-safe"></span>SISTEM TERBUKA';
                judul.className = "fw-bold mb-1 text-success";
                sub.innerText = "Lalu lintas input data berjalan normal.";
            }
        }).catch(e => {
            document.getElementById('teksStatusSistem').innerHTML = '<i class="fa-solid fa-triangle-exclamation text-warning"></i> Gagal Terhubung';
        });
}

// FUNGSI CERDAS: MERAKIT POPUP SANDI DENGAN TOMBOL MATA
function rakitPopupSandi(judul, teksBawah, warnaTombol) {
    return Swal.fire({
        title: judul,
        html: `
            <div style="font-size: 14px; color: #64748b; margin-bottom: 15px;">${teksBawah}</div>
            <div style="position: relative; width: 85%; margin: 0 auto;">
                <input type="password" id="inputSandiRahasia" class="swal2-input" style="width: 100%; box-sizing: border-box; padding-right: 45px; margin: 0; border-radius: 8px;" placeholder="Ketik sandi di sini...">
                <i class="fa-solid fa-eye-slash" id="tombolMataSandi" style="position: absolute; right: 15px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #94a3b8; font-size: 18px; transition: 0.3s;"></i>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: warnaTombol,
        cancelButtonColor: '#94a3b8',
        confirmButtonText: 'Verifikasi Otoritas',
        didOpen: () => {
            // [LOGIKA JENIUS]: Mengubah tipe input saat ikon mata diklik
            const tombolMata = document.getElementById('tombolMataSandi');
            const inputSandi = document.getElementById('inputSandiRahasia');
            tombolMata.addEventListener('click', function () {
                if (inputSandi.type === 'password') {
                    inputSandi.type = 'text';
                    this.classList.remove('fa-eye-slash');
                    this.classList.add('fa-eye');
                    this.style.color = '#2563eb'; 
                } else {
                    inputSandi.type = 'password';
                    this.classList.remove('fa-eye');
                    this.classList.add('fa-eye-slash');
                    this.style.color = '#94a3b8';
                }
            });
        },
        preConfirm: () => {
            const sandi = document.getElementById('inputSandiRahasia').value;
            if (!sandi) Swal.showValidationMessage('Sandi otoritas tidak boleh kosong!');
            return sandi;
        }
    });
}

function ubahStatusSistem(perintahKunci) {
    let judul = perintahKunci ? "KUNCI LAPORAN?" : "BUKA LAPORAN?";
    let teks = perintahKunci ? "Sistem akan menolak data dari SKPD." : "SKPD akan diizinkan menyimpan data.";
    let warna = perintahKunci ? '#dc2626' : '#16a34a';

    rakitPopupSandi(judul, teks, warna).then((result) => {
        if (result.isConfirmed) {
            let ketikanSandi = result.value;
            Swal.fire({ title: 'Mengeksekusi Komando...', didOpen: () => Swal.showLoading() });
            
            fetch(`${FIREBASE_URL}pengaturan_sistem.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandi_admin: ketikanSandi, status_kunci_2026: perintahKunci })
            }).then(r => {
                if(r.ok) {
                    muatStatusSistem();
                    Swal.fire('Otoritas Diterima!', 'Perintah berhasil disebarkan.', 'success');
                } else {
                    Swal.fire('Ditolak!', 'Firebase menolak. Sandi Anda SALAH.', 'error');
                }
            }).catch(e => Swal.fire('Error', 'Gagal menyambung ke satelit.', 'error'));
        }
    });
}

let radarDataMentah = [];

function muatRadarSkpd() {
    document.getElementById('indikatorRadar').innerHTML = '<i class="fa-solid fa-satellite-dish fa-beat text-warning"></i> Memindai...';
    
    fetch(`${FIREBASE_URL}radar_2026.json?r=${Date.now()}`)
        .then(r => r.json())
        .then(data => {
            document.getElementById('indikatorRadar').innerHTML = '<i class="fa-solid fa-satellite-dish text-success"></i> Sinkronisasi Selesai';
            
            let tbody = document.getElementById('badanRadar');
            let pesanKosong = document.getElementById('pesanKosong');
            tbody.innerHTML = '';
            radarDataMentah = [];

            if (!data || Object.keys(data).length === 0) {
                pesanKosong.style.display = 'block';
                return;
            }
            pesanKosong.style.display = 'none';

            for (let kode in data) {
                let info = data[kode];
                radarDataMentah.push({
                    kode_asli: kode,
                    kode_format: kode.replace(/_/g, '.'), 
                    nama: info.nama_skpd || "Instansi Anonim",
                    persen: parseFloat(info.persentase || 0)
                });
            }

            radarDataMentah.sort((a, b) => a.kode_format.localeCompare(b.kode_format));
            renderTabelRadar(radarDataMentah);
        });
}

function renderTabelRadar(dataArray) {
    let tbody = document.getElementById('badanRadar');
    tbody.innerHTML = '';

    dataArray.forEach(item => {
        let warnaBar = item.persen === 100 ? 'bg-success' : (item.persen > 50 ? 'bg-info' : 'bg-warning');
        let tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold text-muted">${item.kode_format}</td>
            <td class="fw-bold text-dark text-uppercase">${item.nama}</td>
            <td>
                <div class="d-flex justify-content-between mb-1" style="font-size: 11px;">
                    <span class="text-muted">Progres Pengisian</span>
                    <span class="fw-bold">${item.persen}%</span>
                </div>
                <div class="progress-premium">
                    <div class="progress-bar-glow h-100 ${warnaBar}" style="width: ${item.persen}%"></div>
                </div>
            </td>
            <td class="text-center">
                <button onclick="lihatDetailSkpd('${item.kode_asli}')" class="btn btn-sm btn-outline-primary fw-bold" style="font-size: 11px; border-radius: 6px;">
                    <i class="fa-solid fa-magnifying-glass"></i> Cek Data
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterRadar() {
    let kataKunci = document.getElementById('cariSkpd').value.toLowerCase();
    let hasilFilter = radarDataMentah.filter(item => 
        item.nama.toLowerCase().includes(kataKunci) || 
        item.kode_format.includes(kataKunci)
    );
    renderTabelRadar(hasilFilter);
}

function lihatDetailSkpd(kode) {
    Swal.fire('Fitur Pengawasan', `Fitur pembacaan rincian arsip SKPD (${kode.replace(/_/g, '.')}) sedang disiapkan di pembaruan dasbor berikutnya.`, 'info');
}

function unduhMasterBrankas() {
    rakitPopupSandi('Unduh Master Database', 'Arsip seluruh instansi akan disatukan. Masukkan sandi:', '#2563eb').then((result) => {
        if (result.isConfirmed) {
            let ketikanSandi = result.value;
            Swal.fire({ title: 'Menyedot Data...', didOpen: () => Swal.showLoading() });
            
            fetch(`${FIREBASE_URL}pengaturan_sistem.json`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sandi_admin: ketikanSandi })
            }).then(r => {
                if (!r.ok) {
                    Swal.fire('Akses Ditolak', 'Sandi otoritas salah.', 'error');
                    throw new Error("Sandi Salah");
                }
                return fetch(`${FIREBASE_URL}lra_2026.json`);
            })
            .then(r => r.json())
            .then(data => {
                if (!data) { Swal.fire('Info', 'Database Master masih kosong.', 'info'); return; }
                
                let blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                let a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `MASTER_DATABASE_LRA_LUWU_2026_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                
                Swal.fire('Selesai', 'Data Master telah diamankan di perangkat Anda.', 'success');
            }).catch(e => {
                if(e.message !== "Sandi Salah") Swal.fire('Gagal', 'Terjadi kesalahan jaringan.', 'error');
            });
        }
    });
}

window.onload = function() {
    jalankanJam();
    muatStatusSistem();
    muatRadarSkpd();
    setInterval(muatRadarSkpd, 10000); 
};