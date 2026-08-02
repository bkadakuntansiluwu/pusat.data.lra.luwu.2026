const SCRIPT_URL_DATABASE = "https://script.google.com/macros/s/AKfycbwVJIDuQxZRzYpnvdIM0n1nN0gzhhVPkTIgNC7yR927BnOH_U6NhVjcMAN9mqxct8SOkg/exec";
let SECRET_KEY = sessionStorage.getItem('LRA_AUTH_KEY') || "";
let globalRawData = [];
let kodeSkpdAktif = ""; 
let modalAsisten;
let modalKeterangan;

// === STATE TTD CLOUD SYNC (v4.0 - SILENT, NO POPUP RIBET) ===
let ttdSyncTimer = null;
let ttdSyncInProgress = false;

document.addEventListener("DOMContentLoaded", function() {
    modalAsisten = new bootstrap.Modal(document.getElementById('modalPenjelasan'));
    modalKeterangan = new bootstrap.Modal(document.getElementById('modalKeterangan'));
    
    isiDropdownTahunOtomatis();
	tampilkanGerbangKeamanan();
    
	// 🛡️ MENCEGAH BUG TTD MENGUAP (KUNCI SEBELUM UPLOAD EXCEL)
    ['ttd-jabatan', 'ttd-nama', 'ttd-nip'].forEach(id => {
        document.getElementById(id).addEventListener('focus', function(e) {
            if(!kodeSkpdAktif) {
                e.target.blur(); // Usir kursor paksa
                Swal.fire('Peringatan', 'Harap Upload file Excel LRA terlebih dahulu!', 'warning');
            }
        });
    });
	
    // === SENSOR AUTO-SAVE TANDA TANGAN (LOCAL + CLOUD SYNC SILENT) ===
    // Strategi: 
    //   - Saat user ketik → simpan ke localStorage (instant)
    //   - Debounce 2 detik → sync ke cloud (silent, no popup)
    //   - Saat SKPD terdeteksi → fetch dari cloud, fallback localStorage
    document.getElementById('ttd-jabatan').addEventListener('input', function() { 
        if(kodeSkpdAktif) {
            localStorage.setItem('TTD_JAB_' + kodeSkpdAktif, this.innerText); 
            jadwalSyncTTDKeCloud();
        }
    });
    document.getElementById('ttd-nama').addEventListener('input', function() { 
        if(kodeSkpdAktif) {
            localStorage.setItem('TTD_NAMA_' + kodeSkpdAktif, this.innerText); 
            jadwalSyncTTDKeCloud();
        }
    });
    document.getElementById('ttd-nip').addEventListener('input', function() { 
        if(kodeSkpdAktif) {
            localStorage.setItem('TTD_NIP_' + kodeSkpdAktif, this.innerText); 
            jadwalSyncTTDKeCloud();
        }
    });
});

// =========================================================================
// USER AGENT UNTUK AUDIT LOG (v4.0 - PAKAI NAMA TTD OTOMATIS)
// Tidak ada prompt identitas. Pakai nama TTD yang user isi + info browser.
// =========================================================================
function getUserAgentUntukAudit() {
    let browser = navigator.userAgent.substring(0, 120);
    let namaTTD = document.getElementById('ttd-nama') 
        ? document.getElementById('ttd-nama').innerText.trim().substring(0, 40) 
        : '';
    return namaTTD ? `${namaTTD} | ${browser}` : browser;
}

// =========================================================================
// FUNGSI: JADWAL SYNC TTD KE CLOUD (DEBOUNCED 2 DETIK)
// Cegah spam: user ketik 10x → cuma kirim 1x di akhir
// =========================================================================
function jadwalSyncTTDKeCloud() {
    if (ttdSyncTimer) clearTimeout(ttdSyncTimer);
    ttdSyncTimer = setTimeout(() => syncTTDKeCloud(), 2000);
}

// =========================================================================
// FUNGSI: SYNC TTD KE CLOUD (SILENT - tidak munculkan popup)
// =========================================================================
function syncTTDKeCloud() {
    if (!kodeSkpdAktif || ttdSyncInProgress) return;
    
    let tahun = document.getElementById('selectTahun').value;
    let jabatan = document.getElementById('ttd-jabatan').innerText.trim();
    let nama = document.getElementById('ttd-nama').innerText.trim();
    let nip = document.getElementById('ttd-nip').innerText.trim();
    
    if (!jabatan && !nama && !nip) return;
    
    let payload = {
        secret_key: SECRET_KEY,
        action: 'save_ttd',
        tahun: tahun,
        kode_skpd: kodeSkpdAktif,
        jabatan: jabatan,
        nama: nama,
        nip: nip,
        updated_by: nama || 'unknown',
        user_agent: getUserAgentUntukAudit()
    };
    
    fetch(SCRIPT_URL_DATABASE, {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === 'success') {
            perbaruiBadgeTTD('synced');
        } else if (res.status === 'busy') {
            perbaruiBadgeTTD('local_only');
            setTimeout(() => syncTTDKeCloud(), 10000);
        } else {
            perbaruiBadgeTTD('local_only');
        }
    })
    .catch(() => perbaruiBadgeTTD('offline'));
}

// =========================================================================
// FUNGSI: LOAD TTD DARI CLOUD (saat SKPD terdeteksi)
// Strategi: cloud first, fallback localStorage
// =========================================================================
function muatTTDDariCloud() {
    if (!kodeSkpdAktif) return;
    
    perbaruiBadgeTTD('loading');
    
    let tahun = document.getElementById('selectTahun').value;
    let url = `${SCRIPT_URL_DATABASE}?action=load_ttd&tahun=${tahun}&kode_skpd=${kodeSkpdAktif}&secret_key=${SECRET_KEY}`;
    
    fetch(url)
    .then(r => r.json())
    .then(res => {
        ttdSyncInProgress = true;
        
        if (res.status === 'success' && res.data) {
            let data = res.data;
            if (data.jabatan) document.getElementById('ttd-jabatan').innerText = data.jabatan;
            if (data.nama) document.getElementById('ttd-nama').innerText = data.nama;
            if (data.nip) document.getElementById('ttd-nip').innerText = data.nip;
            
            localStorage.setItem('TTD_JAB_' + kodeSkpdAktif, data.jabatan || '');
            localStorage.setItem('TTD_NAMA_' + kodeSkpdAktif, data.nama || '');
            localStorage.setItem('TTD_NIP_' + kodeSkpdAktif, data.nip || '');
            
            perbaruiBadgeTTD('synced', data.updated_at);
        } else {
            let localJab = localStorage.getItem('TTD_JAB_' + kodeSkpdAktif);
            let localNma = localStorage.getItem('TTD_NAMA_' + kodeSkpdAktif);
            let localNip = localStorage.getItem('TTD_NIP_' + kodeSkpdAktif);
            
            if (localJab || localNma || localNip) {
                if (localJab) document.getElementById('ttd-jabatan').innerText = localJab;
                if (localNma) document.getElementById('ttd-nama').innerText = localNma;
                if (localNip) document.getElementById('ttd-nip').innerText = localNip;
                setTimeout(() => syncTTDKeCloud(), 500);
                perbaruiBadgeTTD('local_only');
            } else {
                // === TAMBAHKAN 3 BARIS INI UNTUK MERESET LAYAR ===
                document.getElementById('ttd-jabatan').innerText = 'PENGGUNA ANGGARAN';
                document.getElementById('ttd-nama').innerText = 'NAMA KEPALA SKPD';
                document.getElementById('ttd-nip').innerText = 'NIP. xxxxxxxx';
                // =================================================
                
                perbaruiBadgeTTD('empty');
            }
        }
        
        setTimeout(() => { ttdSyncInProgress = false; }, 500);
    })
    .catch(() => {
        let localJab = localStorage.getItem('TTD_JAB_' + kodeSkpdAktif);
        let localNma = localStorage.getItem('TTD_NAMA_' + kodeSkpdAktif);
        let localNip = localStorage.getItem('TTD_NIP_' + kodeSkpdAktif);
        
        if (localJab) document.getElementById('ttd-jabatan').innerText = localJab;
        if (localNma) document.getElementById('ttd-nama').innerText = localNma;
        if (localNip) document.getElementById('ttd-nip').innerText = localNip;
        
        ttdSyncInProgress = false;
        perbaruiBadgeTTD('offline');
    });
}

// =========================================================================
// FUNGSI: PERBARUI BADGE STATUS TTD (kecil, di sebelah kolom TTD)
// =========================================================================
function perbaruiBadgeTTD(status, updatedAt) {
    let badge = document.getElementById('ttdStatusBadge');
    if (!badge) return;
    
    let config = {
        loading:    { class: 'bg-secondary', text: ' Memuat', title: 'Sedang ambil data dari cloud' },
        synced:     { class: 'bg-success',   text: ' Tersimpan', title: 'Tersimpan di cloud' },
        local_only: { class: 'bg-warning',   text: ' Lokal', title: 'Hanya tersimpan di browser ini' },
        empty:      { class: 'bg-light',     text: ' Kosong', title: 'Ketik TTD untuk menyimpan' },
        offline:    { class: 'bg-danger',    text: ' Offline', title: 'Gagal koneksi, pakai data lokal' }
    };
    
    let cfg = config[status] || config.empty;
    badge.className = `badge ${cfg.class} text-dark`;
    badge.innerText = cfg.text;
    badge.title = cfg.title;
}

// =========================================================================
// FUNGSI: HAPUS TTD DARI CLOUD (reset kalau salah ketik)
// =========================================================================
function hapusTTDDariCloud() {
    if (!kodeSkpdAktif) {
        Swal.fire('Info', 'Silakan upload file Excel LRA terlebih dahulu.', 'info');
        return;
    }
    
    Swal.fire({
        title: 'Hapus Tanda Tangan?',
        text: 'Tanda tangan akan dihapus dari database. Anda dapat mengisi ulang setelah ini.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Ya, Hapus',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (!result.isConfirmed) return;
        
        Swal.fire({ title: 'Menghapus...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        let payload = {
            secret_key: SECRET_KEY,
            action: 'delete_ttd',
            tahun: document.getElementById('selectTahun').value,
            kode_skpd: kodeSkpdAktif,
            updated_by: document.getElementById('ttd-nama').innerText.trim() || 'unknown'
        };
        
        fetch(SCRIPT_URL_DATABASE, {
            method: "POST",
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(res => {
            if (res.status === 'success' || res.status === 'not_found') {
                ttdSyncInProgress = true;
                document.getElementById('ttd-jabatan').innerText = 'PENGGUNA ANGGARAN';
                document.getElementById('ttd-nama').innerText = 'NAMA KEPALA SKPD';
                document.getElementById('ttd-nip').innerText = 'NIP. xxxxxxxx';
                
                localStorage.removeItem('TTD_JAB_' + kodeSkpdAktif);
                localStorage.removeItem('TTD_NAMA_' + kodeSkpdAktif);
                localStorage.removeItem('TTD_NIP_' + kodeSkpdAktif);
                
                perbaruiBadgeTTD('empty');
                setTimeout(() => { ttdSyncInProgress = false; }, 500);
                
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
        .catch(err => Swal.fire('Error', 'Gagal koneksi: ' + err.message, 'error'));
    });
}

// ENGINE DROPDOWN TAHUN DINAMIS
function isiDropdownTahunOtomatis() {
    let select = document.getElementById('selectTahun');
    let tahunSekarang = new Date().getFullYear(); 
    let tahunMulai = 2026; 
    let tahunSelesai = tahunSekarang + 0; 

    select.innerHTML = ''; 
    for (let t = tahunMulai; t <= tahunSelesai; t++) {
        let opt = document.createElement('option');
        opt.value = t;
        opt.innerText = t;
        if (t === tahunSekarang) opt.selected = true;
        select.appendChild(opt);
    }
}

// SENSOR KALENDER TANDA TANGAN
function updateInfoTandaTangan() {
    let tahun = document.getElementById('selectTahun').value;
    let periodeStr = document.getElementById('selectPeriode').value;
    let tglElement = document.getElementById('ttd-tanggal');
    
    if (periodeStr.includes("Juni")) {
        tglElement.innerText = "Belopa, 30 Juni " + tahun;
    } else {
        tglElement.innerText = "Belopa, 31 Desember " + tahun;
    }

    if(!kodeSkpdAktif) return;
    
    // v4.0: Saat SKPD terdeteksi → auto-load TTD dari cloud (silent)
    muatTTDDariCloud();
}

// ========================================================
// MESIN PEMBACA ANGKA CERDAS (ANTI ERROR & PAHAM MINUS)
// ========================================================
function parseIndonesianNumber(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    
    let str = String(val).trim();
    if (str === '-' || str === '') return 0;

    let isNegative = false;
    // Cerdas membaca angka minus dalam kurung akuntansi: ( 1.500.000 )
    if (str.startsWith('(') && str.endsWith(')')) {
        isNegative = true;
        str = str.substring(1, str.length - 1).trim();
    } else if (str.startsWith('-')) {
        isNegative = true;
        str = str.substring(1).trim();
    }

    // Buang spasi, lambang %, atau Rp yang mengganggu
    str = str.replace(/\s/g, '').replace(/%/g, '').replace(/Rp/gi, '');

    // Logika pengubah Titik & Koma ke format Komputer
    if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(/,/g, '.'); // 1.500.000,00 -> 1500000.00
    } else if (str.includes(',') && !str.includes('.')) {
        let parts = str.split(',');
        if (parts[parts.length - 1].length <= 2) {
            str = str.replace(/,/g, '.'); // Jika koma adalah desimal
        } else {
            str = str.replace(/,/g, ''); // Jika koma adalah ribuan
        }
    } else if (str.includes('.') && !str.includes(',')) {
        let parts = str.split('.');
        if (parts[parts.length - 1].length === 2 && parts.length === 2) {
            // Biarkan (Kemungkinan salah ketik titik jadi desimal)
        } else {
            str = str.replace(/\./g, ''); // Hapus titik ribuan
        }
    }

    let num = parseFloat(str);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
}

// =========================================================================
// SENSOR UPLOAD LRA BELANJA (3 LAPIS KEAMANAN ANTI-HACKING & ANTI-ERROR)
// =========================================================================
document.getElementById('excelFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;

    // 🛡️ LAPIS 1: CEK EKSTENSI FILE (Wajib Excel/CSV)
    const namaFile = file.name.toLowerCase();
    if (!namaFile.endsWith('.xlsx') && !namaFile.endsWith('.xls') && !namaFile.endsWith('.csv')) {
        Swal.fire({ icon: 'error', title: 'Format Ditolak!', text: 'Maaf, file yang diupload bukan Excel. Silakan gunakan file LRA resmi!', confirmButtonColor: '#d33' });
        e.target.value = ''; return;
    }

    Swal.fire({ title: 'Sementara Proses...', text: 'Membaca File Data Belanja Anda...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            let rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
            
            // 🛡️ LAPIS 2: SENSOR X-RAY JEROAN EXCEL (Wajib ada Anggaran & Realisasi)
            let formatValid = false;
            for (let r = 0; r < 20 && r < rawData.length; r++) {
                let barisString = String(rawData[r] || '').toLowerCase();
                if (barisString.includes('anggaran') && barisString.includes('realisasi')) { 
                    formatValid = true; break; 
                }
            }
            
            if (!formatValid) {
                Swal.fire({ icon: 'warning', title: 'Isi Dokumen Tidak Sesuai!', html: 'Maaf, file ini bukan format LRA standar.<br>Tidak ditemukan kolom <b>Anggaran</b> & <b>Realisasi</b>.', confirmButtonColor: '#f59e0b' });
                e.target.value = ''; return;
            }

            // Jika lolos semua sensor, eksekusi mesin utama bos!
            globalRawData = rawData;
            processAndBuildLRA(); 
            e.target.value = ''; 
            
            Swal.fire({ icon: 'success', title: 'Tabel Belanja Berhasil Dimuat', timer: 2000, showConfirmButton: false });
        } catch (error) {
            // 🛡️ LAPIS 3: ANTI-CRASH (Tangkap Excel Rusak/Corrupt)
            Swal.fire({ icon: 'error', title: 'Gagal Membaca File!', text: 'File rusak atau tidak dapat dibaca oleh sistem. Silakan download ulang dari SIPD.', confirmButtonColor: '#d33' });
            e.target.value = ''; 
        }
    };
    reader.readAsArrayBuffer(file);
});

function applyFilters() {
    let tahun = document.getElementById('selectTahun').value;
    document.getElementById('headerTahun').innerText = "TAHUN ANGGARAN " + tahun;
    updateInfoTandaTangan(); 
    if(globalRawData.length > 0) processAndBuildLRA();
}

// =========================================================================
// FUNGSI GANTI SEMESTER (AMAN DARI RESET TABEL)
// =========================================================================
function gantiSemester() {
    // Fungsi ini HANYA akan memanggil sensor kalender tanda tangan.
    // Tabel LRA dan ketikan penjelasan admin SKPD 100% aman dan tidak akan terhapus.
    updateInfoTandaTangan(); 
}

function processAndBuildLRA() {
    const tbody = document.getElementById('containerRender');
	if (typeof window.backupBrankasDraf === 'function') window.backupBrankasDraf();
    tbody.innerHTML = '';
    let fragmentBelanja = document.createDocumentFragment();
    let urusanDitemukan = false;
    kodeSkpdAktif = ""; 
    let trackerKode = "";
	let trackerUnitAktif = "";

    // =========================================================================
    // 1. SENSOR RADAR KOLOM AI: Pelacak "Anggaran", "Realisasi", "Operasi", "Modal", "BTT", "Transfer"
    // =========================================================================
    let colAnggaran = [];
    let colRealisasi = [];
    let colOperasi = []; 
    let colModal = [];   
    let colBtt = [];      // Memori Kolom BTT
    let colTransfer = []; // Memori Kolom Transfer
    let maxAnggaranCount = 0;

    for (let r = 0; r < 15 && r < globalRawData.length; r++) {
        let rowObj = globalRawData[r];
        if (!rowObj) continue;
        
        let tempAng = []; let tempRea = [];
        
        for (let c = 4; c < rowObj.length; c++) {
            let cellVal = String(rowObj[c] || '').toLowerCase().trim();
            
            // Tangkap Koordinat Anggaran & Realisasi
            if (cellVal === 'anggaran') tempAng.push(c);
            else if (cellVal === 'realisasi') tempRea.push(c);
            
            // Tangkap Koordinat Header "Operasi", "Modal", "BTT", "Transfer"
            if (cellVal === 'operasi') { colOperasi.push(c); colOperasi.push(c + 1); } 
            else if (cellVal === 'modal') { colModal.push(c); colModal.push(c + 1); }
            else if (cellVal.includes('tak terduga')) { colBtt.push(c); colBtt.push(c + 1); }
            else if (cellVal.includes('transfer')) { colTransfer.push(c); colTransfer.push(c + 1); }
        }
        
        if (tempAng.length > maxAnggaranCount) {
            maxAnggaranCount = tempAng.length;
            colAnggaran = tempAng; colRealisasi = tempRea;
        }
    }

    // Fallback Jaring Pengaman (Kalau format Excel hancur)
    if (colAnggaran.length === 0) colAnggaran = [5, 7, 9, 11];
    if (colRealisasi.length === 0) colRealisasi = [6, 8, 10, 12];
    if (colOperasi.length === 0) colOperasi = [5, 6]; 
    if (colModal.length === 0) colModal = [7, 8];     
    // =========================================================================

    for (let i = 0; i < globalRawData.length; i++) {
        let row = globalRawData[i];
        if (!row || row.length === 0) continue;

        let col1 = row[0] ? String(row[0]).trim() : ''; let col2 = row[1] ? String(row[1]).trim() : ''; 
        let col3 = row[2] ? String(row[2]).trim() : ''; let col4 = row[3] ? String(row[3]).trim() : ''; 
        let uraian = row[4] ? String(row[4]).trim() : '';

        let textCol1 = col1.toLowerCase(); let textCol2 = col2.toLowerCase(); let textUraian = uraian.toLowerCase();

        if (textCol1 === '1' && (textCol2 === '2' || textUraian === '2' || textUraian === '3')) continue;
        if (textCol1.includes('kab. luwu') || textUraian.includes('kab. luwu')) continue;
        if (textCol1.includes('rekapitulasi') || textUraian.includes('rekapitulasi')) continue;
        if (textCol1.includes('beserta hasil') || textUraian.includes('beserta hasil')) continue;
        if (textCol1.includes('tahun anggaran') || textUraian.includes('tahun anggaran')) continue;

        let fullKode = col1 + col2 + col3 + col4;
        if (!fullKode && !uraian) continue; 

        let segmen = [];
        if (col1) segmen.push(col1); if (col2) segmen.push(col2);
        if (col3) segmen.push(col3); if (col4) segmen.push(col4);
        let kodeRekening = segmen.join('.');
        
        // 🛡️ SENSOR ANTI-CSV RUSAK: Kode Rekening JANGAN sampai ada hurufnya!
        if (/[a-zA-Z]/.test(kodeRekening)) {
            kodeRekening = ""; // Anggap tidak sah dan abaikan baris ini
        }
        
        if (kodeRekening) trackerKode = kodeRekening;

        // =========================================================================
        // 2. PERHITUNGAN SUPER AKURAT (MENGGABUNGKAN SEMUA KATEGORI KOLOM)
        // =========================================================================
        let anggaran = 0;
        colAnggaran.forEach(idx => {
            anggaran += parseIndonesianNumber(row[idx]);
        });

        let realisasi = 0;
        colRealisasi.forEach(idx => {
            realisasi += parseIndonesianNumber(row[idx]);
        });

        let selisih = realisasi - anggaran;
        let persentase = anggaran > 0 ? ((realisasi / anggaran) * 100).toFixed(2) : '0,00';
        // =========================================================================

        let paddingLevel = 0; let textStyle = ''; let isRincian = false;
        let isBarisJumlah = textUraian.includes('jumlah') || textUraian === 'total' || textUraian.includes('surplus') || textUraian.includes('defisit');
        let isRowKodeText = (textCol1 === 'kode' || textUraian.includes('uraian urusan, organisasi'));

        // =========================================================================
        // 3. LOGIKA HIERARKI UNIVERSAL (ANTI-HANCUR UNTUK PENDAPATAN & PEMBIAYAAN)
        // =========================================================================
        if (isBarisJumlah) {
            paddingLevel = 1; textStyle = 'style-bold'; isRincian = false;
        } else if (isRowKodeText) {
            paddingLevel = 0; textStyle = 'style-header'; isRincian = false;
        } else if (!kodeRekening && uraian) {
            // Rincian manual tanpa kode sama sekali
            paddingLevel = 10; textStyle = 'style-normal'; isRincian = true;
        } else if (col4) { 
            // -----------------------------------------------------------
            // INI BARIS AKUN REKENING (CERDAS: Universal untuk 4, 5, dan 6)
            // -----------------------------------------------------------
            let tailBlocks = col4.split('.');
            paddingLevel = 3 + tailBlocks.length; 
            
            // Di format SIPD, rincian terbawah selalu memiliki > 5 blok angka (cth: 5.1.02.01.001.00024)
            if (tailBlocks.length <= 5) { 
                textStyle = 'style-bold'; isRincian = false; 
            } else { 
                textStyle = 'style-normal'; isRincian = true; 
            }
        } else {
            // -----------------------------------------------------------
            // INI BARIS STRUKTUR INDUK (Urusan/Organisasi/Program/Kegiatan)
            // -----------------------------------------------------------
            let dots = (kodeRekening.match(/\./g) || []).length;
            if (dots <= 1) {
                paddingLevel = 0; textStyle = 'style-header';
                if(!urusanDitemukan && textCol1 !== 'kode') { document.getElementById('metaUrusan').innerText = ": " + kodeRekening + " " + uraian; urusanDitemukan = true; }
            } else if (kodeRekening.endsWith('.0000') || dots === 7 || dots === 8 || dots === 9 || dots === 10) {
                paddingLevel = 1; textStyle = 'style-bold';
                
                if (textCol1 !== 'kode') {
                    trackerUnitAktif = kodeRekening; // KUNCI KODE KELURAHAN SEBAGAI PEMOTONG
                }

                if(!kodeSkpdAktif && textCol1 !== 'kode') {
                    kodeSkpdAktif = kodeRekening; 
                    document.getElementById('metaOrganisasi').innerText = ": " + kodeRekening + " " + uraian;
                    
                    // KODE CERDAS: Tampilkan nama dinas di panel atas (huruf tidak kapital semua)
                    let textHeaderSkpd = document.getElementById('headerNamaSkpd');
                    if (textHeaderSkpd) {
                        textHeaderSkpd.innerText = uraian.toLowerCase();
                    }
                } 
            } else if (dots === 2 || dots === 3) { 
                paddingLevel = 1; textStyle = 'style-bold'; 
            } else if (dots === 4 || dots === 12 || dots === 13) { 
                paddingLevel = 2; textStyle = 'style-bold'; 
            } else { 
                paddingLevel = 3; textStyle = 'style-bold'; 
            }
        }

        let displayKode = isRowKodeText ? col1 : kodeRekening;
        
        // KODE CERDAS: Gunakan pelacak unit agar kode rincian selalu dipotong rapi
        if (trackerUnitAktif && displayKode.startsWith(trackerUnitAktif + '.') && paddingLevel > 1) {
            displayKode = displayKode.substring(trackerUnitAktif.length + 1);
        } else if (kodeSkpdAktif && displayKode.startsWith(kodeSkpdAktif + '.') && paddingLevel > 1) {
            displayKode = displayKode.substring(kodeSkpdAktif.length + 1);
        }

        let filePenjelasanHtml = '';
        let cleanUraian = uraian.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let cleanKode = displayKode ? displayKode.replace(/'/g, "\\'") : '';
        
        let safeKode = trackerKode.replace(/[^a-zA-Z0-9]/g, "");
        let safeUraian = uraian.substring(0, 25).replace(/[^a-zA-Z0-9]/g, "");
        let rowID = `R_${safeKode}_${safeUraian}`;

        // =========================================================================
        // 4. RENDER TOMBOL CERDAS (DESAIN MINIMALIS & PREMIUM)
        // =========================================================================
        if (isBarisJumlah) {
            // Kosong, tanpa tombol untuk baris surplus/defisit/jumlah
        } else if (isRincian) {
            filePenjelasanHtml = `
                <div class="no-print">
                    <button id="btn_${rowID}" class="btn btn-sm w-100 text-start" 
                            style="font-family:Arial; font-size:11px; font-weight:600; padding: 4px 8px; background-color: #ffffff; border: 1px solid #94a3b8; color: #1e293b; border-radius: 4px; transition: all 0.2s;"
                            onclick="bukaAsisten('${rowID}', '${cleanKode}', '${cleanUraian}', ${realisasi})">
                        <i class="fa-regular fa-pen-to-square me-1" style="color: #475569;"></i> Isi Penjelasan Rincian Belanja
                    </button>
                </div>
                <div id="print_${rowID}" class="print-view-text"></div>
                <input type="hidden" id="val_${rowID}" class="input-database" data-rowid="${rowID}" data-realisasi="${realisasi}">
            `;
        } else {
            filePenjelasanHtml = `
                <div class="no-print">
                    <button id="btn_${rowID}" class="btn btn-sm w-100 text-start" 
                            style="font-family:Arial; font-size:11px; padding: 4px 8px; background-color: #ffffff; border: 1px solid #e2e8f0; color: #64748b; border-radius: 4px; transition: all 0.2s;"
                            onclick="bukaKeterangan('${rowID}', '${cleanKode}', '${cleanUraian}')">
                        <i class="fa-regular fa-comment-dots text-muted me-1"></i>
                    </button>
                </div>
                <div id="print_${rowID}" class="print-view-text fw-bold text-dark" style="margin-top: 5px; font-size: 11px;"></div>
                <input type="hidden" id="val_${rowID}" class="input-database" data-rowid="${rowID}" data-realisasi="0">
            `;
        }

        let formatRp = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
        let strAng = anggaran !== 0 ? anggaran.toLocaleString('id-ID', formatRp) : '0,00';
        let strRea = realisasi !== 0 ? realisasi.toLocaleString('id-ID', formatRp) : '0,00';
        let strSel = selisih !== 0 ? (selisih < 0 ? '(' + Math.abs(selisih).toLocaleString('id-ID', formatRp) + ')' : selisih.toLocaleString('id-ID', formatRp)) : '0,00';
        let strPersen = persentase.replace('.', ',');

        if (isRowKodeText) {
            strAng = ''; strRea = ''; strSel = ''; strPersen = ''; displayKode = col1; 
        }
        
        let tr = document.createElement('tr');
        tr.className = `pad-lvl-${paddingLevel} ${textStyle}`;
        tr.dataset.pad = paddingLevel;

        // ---> MULAI SISIPAN PASPOR GAIB (TRIANGULASI AI 3 LAPIS) <---
        let kategori = 'induk';
        if (isRincian && !isBarisJumlah) {
            
            // LAPIS 1: SENSOR POSISI UANG (Membaca Angka dari Kolom Excel)
            let valOperasi = 0; colOperasi.forEach(idx => { valOperasi += Math.abs(parseIndonesianNumber(row[idx])); });
            let valModal = 0; colModal.forEach(idx => { valModal += Math.abs(parseIndonesianNumber(row[idx])); });
            let valBtt = 0; colBtt.forEach(idx => { valBtt += Math.abs(parseIndonesianNumber(row[idx])); });
            let valTransfer = 0; colTransfer.forEach(idx => { valTransfer += Math.abs(parseIndonesianNumber(row[idx])); });

            let teksUraianLcase = textUraian.toLowerCase();

            // Eksekusi Sensor 1: Lihat uangnya jatuh di bawah kolom apa?
            if (valOperasi > 0 && valModal === 0 && valBtt === 0 && valTransfer === 0) {
                kategori = 'operasi'; 
            } else if (valModal > 0 && valOperasi === 0 && valBtt === 0 && valTransfer === 0) {
                kategori = 'modal';   
            } else if (valBtt > 0 && valOperasi === 0 && valModal === 0 && valTransfer === 0) {
                kategori = 'btt';
            } else if (valTransfer > 0 && valOperasi === 0 && valModal === 0 && valBtt === 0) {
                kategori = 'transfer';
            }
            // LAPIS 2: SENSOR LINGUISTIK (Kamus Otak AI - Jika nilai uang nol/rincian teks)
            else if (teksUraianLcase.includes('tak terduga') || teksUraianLcase.includes('darurat') || teksUraianLcase.includes('kejadian luar biasa')) {
                kategori = 'btt';
            } else if (teksUraianLcase.includes('transfer') || teksUraianLcase.includes('bantuan keuangan') || teksUraianLcase.includes('bagi hasil') || teksUraianLcase.includes('bantuan sosial') || teksUraianLcase.includes('hibah') || teksUraianLcase.includes('subsidi') || teksUraianLcase.includes('dana desa')) {
                kategori = 'transfer';
            } else if (teksUraianLcase.includes('honor') || teksUraianLcase.includes('jasa') || teksUraianLcase.includes('barang') || teksUraianLcase.includes('makan') || teksUraianLcase.includes('perjalanan') || teksUraianLcase.includes('atk') || teksUraianLcase.includes('gaji') || teksUraianLcase.includes('kertas') || teksUraianLcase.includes('cetak') || teksUraianLcase.includes('habis pakai') || teksUraianLcase.includes('listrik') || teksUraianLcase.includes('air') || teksUraianLcase.includes('sewa')) {
                kategori = 'operasi';
            } else if (teksUraianLcase.includes('modal') || teksUraianLcase.includes('aset') || teksUraianLcase.includes('tanah') || teksUraianLcase.includes('mesin') || teksUraianLcase.includes('gedung') || teksUraianLcase.includes('bangunan') || teksUraianLcase.includes('jalan') || teksUraianLcase.includes('jaringan') || teksUraianLcase.includes('irigasi') || teksUraianLcase.includes('peralatan') || teksUraianLcase.includes('kendaraan')) {
                kategori = 'modal';
            } 
            // LAPIS 3: SENSOR KODE STANDAR (Hanya Sebagai Jaring Pengaman Terakhir)
            else if (kodeRekening.startsWith('5.1') || trackerKode.startsWith('5.1')) kategori = 'operasi';
            else if (kodeRekening.startsWith('5.2') || trackerKode.startsWith('5.2')) kategori = 'modal';
            else if (kodeRekening.startsWith('5.3') || trackerKode.startsWith('5.3')) kategori = 'btt';
            else if (kodeRekening.startsWith('5.4') || trackerKode.startsWith('5.4')) kategori = 'transfer';
            else kategori = 'lainnya'; 
        }
        tr.dataset.kategori = kategori;
        
		if (isRincian && !isBarisJumlah && textUraian.toLowerCase().includes('perjalanan')) {
            tr.dataset.subKategori = 'perjalanan';
        } else {
            tr.dataset.subKategori = 'lainnya';
        }
		
        // +++++ MEMORI REKALKULASI DINAMIS +++++
        tr.dataset.oriAng = anggaran || 0;
        tr.dataset.oriRea = realisasi || 0;
        tr.dataset.oriAngStr = strAng;
        tr.dataset.oriReaStr = strRea;
        tr.dataset.oriSelStr = strSel;
        tr.dataset.oriPerStr = strPersen;
        // ---> AKHIR SISIPAN <---

        // ====================================================================
        // ?? KOSMETIK FINAL: HAPUS GARIS TIDUR (HORIZONTAL) UNTUK "BELANJA DAERAH"
        // ====================================================================
        let kelasUraian = isBarisJumlah ? "uraian-cell text-center text-uppercase fw-bold text-dark" : "uraian-cell";
        
        // KODE CERDAS: Mengubah teks tulisan JUMLAH menjadi SURPLUS / (DEFISIT)
        if (isBarisJumlah && uraian.toLowerCase().trim() === 'jumlah') {
            uraian = 'SURPLUS / (DEFISIT)';
        }
        
        let styleGeneral = ''; 
        let styleUraian = '';  

        if (isRowKodeText) {
            // BARIS 1: "BELANJA DAERAH"
            displayKode = ''; 
            uraian = 'BELANJA DAERAH';
            kelasUraian = "uraian-cell text-dark fw-bold text-uppercase";
            
            // Hapus garis tidur (bawah) KECUALI untuk kolom Uraian
            styleGeneral = 'border-bottom: none !important;';
            styleUraian = 'border-bottom: 1px solid #000 !important;';
            filePenjelasanHtml = ''; 
            
            // Nyalakan alarm untuk baris berikutnya
            window.hapusGarisAtas = true; 
        } 
        else if (window.hapusGarisAtas) {
            // BARIS 2: URUSAN PEMERINTAHAN (Tepat di bawah Belanja Daerah)
            // Hapus garis tidur (atas) KECUALI untuk kolom Uraian
            styleGeneral = 'border-top: none !important;';
            styleUraian = 'border-top: 1px solid #000 !important;';
            
            // Matikan alarm agar baris ke-3 dan seterusnya normal kembali
            window.hapusGarisAtas = false; 
        }

        tr.innerHTML = `
            <td style="${styleGeneral}">${displayKode}</td>
            <td class="${kelasUraian}" style="${styleUraian}">${uraian}</td>
            <td class="text-end" style="${styleGeneral}">${strAng}</td>
            <td class="text-end" style="${styleGeneral}">${strRea}</td>
            <td class="text-end" style="${styleGeneral}">${strSel}</td>
            <td class="text-center" style="${styleGeneral}">${strPersen}</td>
            <td class="cell-penjelasan" style="${styleGeneral}">${filePenjelasanHtml}</td>
        `;
        // Masukkan ke keranjang bayangan dulu, jangan langsung ke layar
        fragmentBelanja.appendChild(tr); 
    } // <--- AKHIR DARI PERULANGAN EXCEL
    
    // Tumpahkan semua isi keranjang ke layar sekaligus (Super Cepat!)
    tbody.appendChild(fragmentBelanja);
    
    // =========================================================================
    // 🛡️ LAPIS 4: SENSOR FINAL (VALIDASI MUTLAK KODE SKPD PEMDA)
    // =========================================================================
    if (!kodeSkpdAktif) {
        // Jika sampai file habis dibaca tidak ada Kode SKPD yang sah, TENDANG KELUAR!
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5" style="font-family: Arial, sans-serif;">
            <i class="fa-solid fa-triangle-exclamation text-danger mb-3" style="font-size: 50px;"></i><br>
            <h5 class="fw-bold text-dark">DOKUMEN DITOLAK: Format Tidak Dikenali</h5>
            File Excel yang Anda upload tidak memiliki struktur Kode Rekening SKPD standar SIPD Pemerintah Daerah.<br>
            Sistem membatalkan proses agar database tidak rusak oleh data yang salah.
        </td></tr>`;
        
        document.getElementById('metaOrganisasi').innerText = ": -";
        document.getElementById('metaUrusan').innerText = ": -";
        
        // KODE CERDAS: Reset kembali nama dinas di panel atas
        let textHeaderSkpd = document.getElementById('headerNamaSkpd');
        if (textHeaderSkpd) {
            textHeaderSkpd.innerText = 'belum ada data skpd';
        }
        
        // Hapus memori kotor agar tombol SIMPAN & TARIK DATA terkunci mutlak!
        globalRawData = []; 
        
        Swal.fire({
            icon: 'error',
            title: 'Format Excel Ilegal!',
            text: 'Ini bukan file LRA SIPD yang sah. Sistem mendeteksi tidak ada Kode SKPD yang valid di dalamnya.',
            confirmButtonColor: '#d33'
        });
        
        return; // MENGHENTIKAN PROSES! (Mencegah error di fungsi bawahnya)
    }
    
    // Panggil ulang sensor TTD setelah kode SKPD terdeteksi
    updateInfoTandaTangan();
    terapkanFilterBelanja();
	if (typeof window.restoreBrankasDraf === 'function') window.restoreBrankasDraf();
}


function bukaKeterangan(rowID, kodeRek, uraian) {
    let nilaiLama = document.getElementById('val_' + rowID).value;
    document.getElementById('modalKetTargetRow').value = rowID;
    
    let judulRekening = kodeRek ? `${kodeRek} - ${uraian}` : uraian;
    document.getElementById('modalKetUraian').innerText = judulRekening;
    document.getElementById('modalKetTextarea').value = nilaiLama;
    modalKeterangan.show();
}

function simpanKeterangan() {
    let rowID = document.getElementById('modalKetTargetRow').value;
    let teks = document.getElementById('modalKetTextarea').value;
    
    // ---> INJEKSI KECERDASAN KAMUS <---
    simpanKeKamus(teks); 
    
    document.getElementById('val_' + rowID).value = teks;
    document.getElementById('val_' + rowID).classList.add('is-dirty'); 
    document.getElementById('print_' + rowID).innerText = teks;
    
    let btn = document.getElementById('btn_' + rowID);
    if (btn) {
        if (teks.trim() === '') {
            btn.className = 'btn btn-sm w-100 text-start';
            btn.style.cssText = "font-family:Arial; font-size:11px; padding: 4px 8px; background-color: #ffffff; border: 1px solid #e2e8f0; color: #64748b; border-radius: 4px;";
            btn.innerHTML = '<i class="fa-regular fa-comment-dots text-muted me-1"></i>';
        } else {
            btn.className = 'btn btn-sm w-100 text-start fw-bold';
            btn.style.cssText = "font-family:Arial; font-size:10px; padding: 4px 8px; background-color: #f8fafc; border: 1px solid #cbd5e1; color: #334155; border-radius: 4px;";
            btn.innerHTML = '<i class="fa-solid fa-check text-muted me-1"></i> Keterangan Disimpan';
        }
    }
    modalKeterangan.hide();
}

function hitungTotalDariTeks(teks) {
    let total = 0;
    let regex = /=\s*([^#\n\r]+)/g; 
    let matches = teks.match(regex);
    if(matches) {
        matches.forEach(m => {
            let cleanStr = m.replace(/=/g, '').replace(/Rp/gi, '').trim();
            let numMatch = cleanStr.match(/^[\d\.,]+/);
            if (numMatch) {
                let numStr = numMatch[0];
                if(numStr.includes(',') && numStr.split(',')[1].length <= 2) {
                    numStr = numStr.replace(/\./g, '').replace(',', '.');
                } else {
                    numStr = numStr.replace(/\./g, '').replace(/,/g, '');
                }
                let val = parseFloat(numStr);
                if(!isNaN(val)) total += val;
            }
        });
    }
    return total;
}

function formatRibuan(input) {
    let value = input.value.replace(/[^,\d]/g, '');
    let parts = value.split(',');
    let sisa = parts[0].length % 3;
    let rupiah = parts[0].substr(0, sisa);
    let ribuan = parts[0].substr(sisa).match(/\d{3}/gi);
    
    if (ribuan) {
        let separator = sisa ? '.' : '';
        rupiah += separator + ribuan.join('.');
    }
    input.value = parts[1] !== undefined ? rupiah + ',' + parts[1] : rupiah;
}

function perbaruiTombolStatus(rowID, printText, realisasi) {
    let btn = document.getElementById('btn_' + rowID);
    if (!btn) return;
    
    let totalHitung = hitungTotalDariTeks(printText);
    let selisih = totalHitung - realisasi;
    let formatRp = { minimumFractionDigits: 0 };
    
    let teksBersih = printText.replace(/<[^>]*>?/gm, '').trim(); 
    let statusTeks = cekKualitasTeks(teksBersih);
    
    btn.className = 'btn btn-sm w-100 text-start fw-bold';

    // 1. CEK KEKOSONGAN (Prioritas Tertinggi)
    if (teksBersih === '') {
        btn.style.cssText = "font-family:Arial; font-size:11px; font-weight:600; padding: 4px 8px; background-color: #ffffff; border: 1px solid #94a3b8; color: #1e293b; border-radius: 4px; transition: all 0.2s;"
        btn.innerHTML = '<i class="fa-regular fa-pen-to-square me-1" style="color: #475569;"></i> Isi Penjelasan Rincian Belanja';
        return; // Berhenti di sini
    }

    // 2. CEK KUALITAS TEKS (Prioritas Kedua - Wajib dicek SEBELUM cek uang)
    if (statusTeks !== "OK") { 
        btn.style.cssText = "font-family:Arial; font-size:11px; font-weight:700; padding: 4px 8px; background-color: #ef4444; border: 1px solid #e11d48; color: #881337; border-radius: 4px;";
        btn.innerHTML = `<i class="fa-solid fa-circle-exclamation me-1"></i> Draf: ${statusTeks}`;
        return; // Berhenti di sini kalau ngawur
    }

    // 3. CEK REALISASI NOL
    if (realisasi === 0) {
        btn.style.cssText = "font-family:Arial; font-size:11px; font-weight:700; padding: 4px 8px; background-color: #fde047; border: 1px solid #eab308; color: #713f12; border-radius: 4px;";
        btn.innerHTML = '<i class="fa-solid fa-check-double me-1"></i> Catatan Lokasi Tersimpan';
        return;
    }

    // 4. CEK KESEIMBANGAN UANG (Hanya sampai di sini kalau teks sudah pasti bagus)
    if (Math.abs(selisih) < 1) { 
        btn.style.cssText = "font-family:Arial; font-size:11px; font-weight:700; padding: 4px 8px; background-color: #22c55e; border: 1px solid #15803d; color: #ffffff; border-radius: 4px;";
        btn.innerHTML = '<i class="fa-solid fa-check-double me-1"></i> Nilai Rincian VALID';
    } else if (selisih < 0) { 
        let fKurang = Math.abs(selisih).toLocaleString('id-ID', formatRp);
        btn.style.cssText = "font-family:Arial; font-size:11px; font-weight:700; padding: 4px 8px; background-color: #fb923c; border: 1px solid #c2410c; color: #ffffff; border-radius: 4px;";
        btn.innerHTML = `<i class="fa-solid fa-file-pen me-1"></i> Jumlah Kurang (Selisih) Senilai Rp ${fKurang}`;
    } else { 
        let fLebih = selisih.toLocaleString('id-ID', formatRp);
        btn.style.cssText = "font-family:Arial; font-size:11px; font-weight:700; padding: 4px 8px; background-color: #ef4444; border: 1px solid #b91c1c; color: #ffffff; border-radius: 4px;";
        btn.innerHTML = `<i class="fa-solid fa-circle-xmark me-1"></i> Jumlah Lebih (Selisih) Senilai Rp ${fLebih}`;
    }
}

function setMode() {
    setTimeout(() => { kalkulasiKombinasi(); }, 100); 
}

// === 1. GLOBAL VARIABEL BARU UNTUK MULTI-KELOMPOK ===
let groupIdCounter = 0;

// === FUNGSI SAKTI: AUTO-NUMBERING KELOMPOK (ANTI-BOLONG) ===
function updateNomorUrutKelompok() {
    let groups = document.querySelectorAll('#groupsContainer .group-container');
    groups.forEach((group, index) => {
        let badge = group.querySelector('.group-number-badge');
        if (badge) badge.innerText = index + 1; // Selalu terurut mulai dari 1, 2, 3...
    });
}

// === 2. FUNGSI BARU: PENCIPTA KELOMPOK LOKASI/KEGIATAN ===
function tambahKelompok(subText = "", items = []) {
    groupIdCounter++;
    let gId = 'group_' + groupIdCounter;
    let container = document.getElementById('groupsContainer');
    
    let groupDiv = document.createElement('div');
    groupDiv.className = "group-container border bg-white p-4 mb-4 position-relative shadow-sm";
    groupDiv.style.borderRadius = "10px";
    groupDiv.style.border = "1px solid #e2e8f0";
    groupDiv.id = gId;
    
    // UI CERDAS: Tombol Hapus Grup (Panggil juga updateNomorUrutKelompok saat dihapus)
    groupDiv.innerHTML = `
        <button class="btn btn-sm btn-outline-danger position-absolute top-0 end-0 m-3" 
                onclick="document.getElementById('${gId}').remove(); kalkulasiKombinasi(); updateNomorUrutKelompok();" 
                title="Hapus Kelompok" 
                style="border-radius: 50%; width: 32px; height: 32px; padding: 0; display: flex; align-items: center; justify-content: center;">
            <i class="fa-solid fa-trash-can" style="font-size: 12px;"></i>
        </button>

        <div class="row mb-3">
            <div class="col-12 mb-3 pe-5">
                <label class="form-label fw-bold text-secondary d-flex align-items-center" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">
                    <span class="group-number-badge text-white bg-primary d-flex align-items-center justify-content-center me-2" style="width: 20px; height: 20px; border-radius: 50%; font-size: 11px;">1</span>
                    Keterangan : Kegiatan / Lokasi / Tanggal
                </label>
                <textarea class="form-control textarea-smart p-2 uraian-sub" rows="2" placeholder="Masukkan Keterangan Belanja Anda...." onkeyup="kalkulasiKombinasi()">${subText}</textarea>
            </div>
        </div>

        <div class="row mb-2 fw-bold text-secondary pb-1" style="font-size: 10px; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">
            <div class="col-4">Uraian Rincian Belanja</div>
            <div class="col-2 text-center">Vol</div>
            <div class="col-2 text-center">Satuan</div>
            <div class="col-3 text-end">Harga (Rp)</div>
            <div class="col-1 text-end">Total</div>
        </div>
        
        <div id="rows_${gId}" class="item-rows-container mb-3"></div>
        
        <button class="btn btn-sm btn-outline-secondary fw-bold text-secondary w-100 py-1" onclick="tambahBaris('${gId}')" style="font-size: 11px; border-radius: 6px; border-style: dashed; border-width: 1px;">
            <i class="fa-solid fa-plus me-1"></i> Tambah Baris Rincian
        </button>
    `;
    
    container.appendChild(groupDiv);
    
    // PEMANGGILAN NOMOR URUT SAAT KELOMPOK DITAMBAHKAN
    updateNomorUrutKelompok();

    if (items.length === 0) {
        tambahBaris(gId);
    } else {
        items.forEach(item => tambahBaris(gId, item.u, item.v, item.s, item.h));
    }
    kalkulasiKombinasi();
    
    setTimeout(() => { groupDiv.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 100);
}

// === 3. FUNGSI TAMBAH BARIS YANG DIPERBARUI (Fokus per Kelompok) ===
function tambahBaris(groupId, ur = "", v = "", s = "", h = "") {
    let container = document.getElementById('rows_' + groupId);
    let div = document.createElement('div');
    
    div.className = "row mb-3 align-items-center pb-2 border-bottom border-light"; 
    let hFormatted = h ? h.toLocaleString('id-ID') : "";

    div.innerHTML = `
        <div class="col-4">
            <textarea class="form-control textarea-smart p-2 uraian" rows="2" placeholder="Masukkan Nama Belanja Anda..." style="font-size: 12px; resize: vertical;">${ur}</textarea>
        </div>
        <div class="col-2">
            <input type="number" class="form-control form-control-sm text-center border-light-subtle shadow-none vol" placeholder="Vol" oninput="kalkulasiKombinasi()" value="${v}" style="font-size: 12px; background-color: #f8fafc;">
        </div>
        <div class="col-2">
            <input type="text" class="form-control form-control-sm text-center border-light-subtle shadow-none satuan" placeholder="Satuan" value="${s}" style="font-size: 12px; background-color: #f8fafc;">
        </div>
        <div class="col-3">
            <input type="text" class="form-control form-control-sm text-end border-light-subtle shadow-none harga" placeholder="Harga (Rp)" oninput="formatRibuan(this); kalkulasiKombinasi()" value="${hFormatted}" style="font-size: 12px; background-color: #f8fafc;">
        </div>
        <div class="col-1 d-flex flex-column align-items-end justify-content-center">
            <div class="fw-bold subtotal-txt text-dark mb-1" style="font-size: 12px; letter-spacing: 0.3px;">0</div>
            <button class="btn btn-sm p-0 border-0 shadow-none text-danger" 
                    style="opacity: 0.5; transition: all 0.2s ease-in-out;" 
                    onmouseover="this.style.opacity='1'; this.style.transform='scale(1.1)';" 
                    onmouseout="this.style.opacity='0.5'; this.style.transform='scale(1)';" 
                    onclick="this.parentElement.parentElement.remove(); kalkulasiKombinasi();" title="Hapus Baris">
                <i class="fa-regular fa-trash-can" style="font-size: 14px;"></i>
            </button>
        </div>
    `;
    container.appendChild(div);
    kalkulasiKombinasi();
}

// === 4. BUKA ASISTEN (Penyelamat Data Masa Lalu) ===
function bukaAsisten(rowID, kodeRek, uraian, realisasi) {
    let nilaiLama = document.getElementById('val_' + rowID).value;
	if (nilaiLama === "[]") {
        nilaiLama = "";
    }
	
    document.getElementById('modalTargetRow').value = rowID;
    document.getElementById('modalTargetRealisasi').value = realisasi;
    
    document.getElementById('modalUraian').innerText = kodeRek ? `${kodeRek} - ${uraian}` : uraian;
    document.getElementById('modalRealisasiTxt').innerText = "Rp " + realisasi.toLocaleString('id-ID');
    
    // Bersihkan layar
    document.getElementById('groupsContainer').innerHTML = '';
    groupIdCounter = 0;
    
    let groupsData = [];

    if (nilaiLama && nilaiLama.trim() !== "") {
        try { 
            let parsed = JSON.parse(nilaiLama); 
            // Cek jika datanya sudah Array (Format Super Baru)
            if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].items !== undefined) {
                groupsData = parsed;
            } 
            // Cek Format Lama (Hanya 1 grup)
            else if (parsed.items) {
                let textSub = parsed.sub || parsed.judul || "";
                groupsData = [{ sub: textSub, items: parsed.items }];
            } 
            // Cek Format Sangat Lama (V.1)
            else if (parsed.data && Array.isArray(parsed.data)) {
                groupsData = [{ sub: "", items: parsed.data }];
            } else if (parsed.data && typeof parsed.data === 'string') {
                groupsData = [{ sub: parsed.data, items: [] }];
            }
        } catch(e) { 
            groupsData = [{ sub: nilaiLama, items: [] }];
        }
    }

    if (groupsData.length === 0) {
        tambahKelompok(); // Default buat 1 grup kosong
    } else {
        groupsData.forEach(g => tambahKelompok(g.sub, g.items));
    }
    
    kalkulasiKombinasi();
    modalAsisten.show();
}

// === KALKULASI MENYELURUH (Scan Seluruh Kelompok + Wasit Tombol Ganda) ===
function kalkulasiKombinasi() {
    let realisasi = parseFloat(document.getElementById('modalTargetRealisasi').value);
    let totalHitung = 0;
    let isKosong = true;
    let teksGabungan = ""; // Untuk Lie Detector

    document.querySelectorAll('.group-container').forEach(group => {
        let sub = group.querySelector('.uraian-sub').value.trim();
        if(sub) { isKosong = false; teksGabungan += sub + " "; }

        group.querySelectorAll('.item-rows-container .row').forEach(row => {
            let v = parseFloat(row.querySelector('.vol').value) || 0;
            let hStr = row.querySelector('.harga').value.replace(/\./g, '').replace(/,/g, '.');
            let h = parseFloat(hStr) || 0;
            let subtotal = v * h;
            row.querySelector('.subtotal-txt').innerText = subtotal.toLocaleString('id-ID');
            totalHitung += subtotal;
            
            let ur = row.querySelector('.uraian').value.trim();
            if(ur || v > 0 || h > 0) isKosong = false;
            if(ur) teksGabungan += ur + " ";
        });
    });

    let alertBox = document.getElementById('alertSmart');
    let icon = document.getElementById('iconSmart');
    let title = document.getElementById('titleSmart');
    let desc = document.getElementById('descSmart');
    let selisih = totalHitung - realisasi;
    
    // TOMBOL GANDA (Lampu Lalu Lintas)
    let btnDraft = document.getElementById('btnSimpanDraft');
    let btnFinal = document.getElementById('btnSimpanFinal');

    // Eksekusi Detektor
    let statusTeks = cekKualitasTeks(teksGabungan);
    let isBalance = (realisasi > 0 && Math.abs(selisih) < 1);
    
    // Sensor Anti Copy-Paste (Lapis 2)
    let memoriCopyPaste = sessionStorage.getItem('last_saved_text') || "";
    let teksKunci = teksGabungan.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    let isCopyPaste = (teksKunci.length > 20 && memoriCopyPaste === teksKunci);

    if (isKosong) {
        alertBox.className = 'alert alert-pro alert-pro-info d-flex align-items-center mb-0 py-2 px-3';
        icon.className = 'fa-solid fa-pen-to-square fs-4 me-3 text-secondary';
        title.innerText = 'Mari Mulai Mengisi Rincian Belanja';
        desc.innerText = 'Silakan ketik nama barang atau jasa yang dibayar. Pastikan total hitungannya pas dengan Nilai Realisasi di atas.';
        if(btnDraft) { btnDraft.style.display = 'inline-block'; btnFinal.style.display = 'none'; }
    } else if (realisasi === 0) {
        alertBox.className = 'alert alert-pro alert-pro-info d-flex align-items-center mb-0 py-2 px-3';
        icon.className = 'fa-solid fa-info-circle fs-4 me-3 text-info';
        title.innerText = 'Nilai Realisasi Nol (0)';
        desc.innerText = 'Catatan akan dilampirkan sebagai penjelas nilai kosong ini.';
        if(btnDraft) { btnDraft.style.display = 'none'; btnFinal.style.display = 'inline-block'; } // Bebas Final
    } else if (isBalance) {
        if (statusTeks !== "OK") {
            // BALANCE TAPI NGAWUR (BOHONG) -> PAKSA TOMBOL DRAF!
            alertBox.className = 'alert alert-pro alert-pro-danger d-flex align-items-center mb-0 py-2 px-3';
            icon.className = 'fa-solid fa-circle-exclamation fs-4 me-3 text-danger';
            title.innerText = 'ANGKA SESUAI, TAPI PENJELASAN DITOLAK!';
            desc.innerHTML = `Total Rp${totalHitung.toLocaleString('id-ID')} sesuai, tapi <b>${statusTeks}</b>!`;
            if(btnDraft) { btnDraft.style.display = 'inline-block'; btnFinal.style.display = 'none'; }
        } else if (isCopyPaste) {
            // BALANCE TAPI COPY-PASTE BARU SAJA -> PAKSA TOMBOL DRAF!
            alertBox.className = 'alert alert-pro alert-pro-warning d-flex align-items-center mb-0 py-2 px-3';
            icon.className = 'fa-solid fa-copy fs-4 me-3 text-warning';
            title.innerText = 'INDIKASI COPY-PASTE TERDETEKSI!';
            desc.innerHTML = `Penjelasan Anda 100% mirip dengan rincian yang baru saja Anda simpan. Bedakan isinya!`;
            if(btnDraft) { btnDraft.style.display = 'inline-block'; btnFinal.style.display = 'none'; }
        } else {
            // MURNI SEMPURNA -> TOMBOL FINAL MUNCUL, DRAF HILANG!
            alertBox.className = 'alert alert-pro alert-pro-success d-flex align-items-center mb-0 py-2 px-3';
            icon.className = 'fa-solid fa-check-double fs-4 me-3 text-success';
            title.innerText = 'Rincian Realisasi VALID';
            desc.innerText = `Perhitungan Rp${totalHitung.toLocaleString('id-ID')} SESUAI, Silahkan Simpan Rincian Penjelasan Anda`;
            if(btnDraft) { btnDraft.style.display = 'none'; btnFinal.style.display = 'inline-block'; }
        }
    } else if (selisih < 0) {
        // KURANG (BARU NYICIL) -> TOMBOL DRAF MUNCUL
        alertBox.className = 'alert alert-pro alert-pro-warning d-flex align-items-center mb-0 py-2 px-3';
        icon.className = 'fa-solid fa-triangle-exclamation fs-4 me-3 text-warning';
        title.innerText = 'NILAI MASIH KURANG DARI REALISASI';
        desc.innerHTML = `Terinput: <b>Rp${totalHitung.toLocaleString('id-ID')}</b>. Masih Kurang Senilai: <b>Rp${Math.abs(selisih).toLocaleString('id-ID')}</b>.`;
        if(btnDraft) { btnDraft.style.display = 'inline-block'; btnFinal.style.display = 'none'; }
    } else {
        // LEBIH (SALAH KETIK) -> TOMBOL DRAF MUNCUL
        alertBox.className = 'alert alert-pro alert-pro-danger d-flex align-items-center mb-0 py-2 px-3';
        icon.className = 'fa-solid fa-circle-xmark fs-4 me-3 text-danger';
        title.innerText = 'JUMLAH MELEBIHI REALISASI';
        desc.innerHTML = `Melebihi Nilai Realisasi Sebesar <b>Rp${selisih.toLocaleString('id-ID')}</b>. Periksa angka Anda!`;
        if(btnDraft) { btnDraft.style.display = 'inline-block'; btnFinal.style.display = 'none'; }
    }
}

// === 6. SIMPAN DARI MODAL (Merakit Array Multi-Grup & Memori) ===
function simpanDariModal() {
    let rowID = document.getElementById('modalTargetRow').value;
    let realisasi = parseFloat(document.getElementById('modalTargetRealisasi').value);
    
    let groupsToSave = [];
    let textToPrint = "";

    // Sapu bersih semua grup di layar
    document.querySelectorAll('.group-container').forEach(group => {
        let sub = group.querySelector('.uraian-sub').value.trim();
        let dataJSON = [];
        let groupPrintText = "";

        if (sub) {
            groupPrintText += `${sub}\n\n`; 
            simpanKeKamus(sub); // ---> SEDOT MEMORI KEGIATAN
        }

        group.querySelectorAll('.item-rows-container .row').forEach(row => {
            let ur = row.querySelector('.uraian').value.trim();
            let rawVol = row.querySelector('.vol').value.trim();
            let v = parseFloat(rawVol) || 0;
            let s = row.querySelector('.satuan').value.trim();
            
            let rawHarga = row.querySelector('.harga').value.trim(); // Ambil harga mentah (pakai titik)
            let hStr = rawHarga.replace(/\./g, '').replace(/,/g, '.');
            let h = parseFloat(hStr) || 0;
            let t = v * h;
            
            if (ur || v > 0 || h > 0) {
                // ---> SEDOT SEMUA MEMORI KE KAMUS MASING-MASING <---
                if (ur) simpanKeKamus(ur); 
                if (rawVol) simpanKamusKhusus(rawVol, 'vol'); 
                if (s) simpanKamusKhusus(s, 'satuan'); 
                if (rawHarga && h > 0) simpanKamusKhusus(rawHarga, 'harga'); 

                dataJSON.push({u: ur, v: v, s: s, h: h, t: t});
                let st = s ? ` ${s}` : '';
                groupPrintText += `- ${ur}\n<div style="border-bottom: 1px dashed #666; padding-bottom: 4px; margin-bottom: 4px;"><em>${v} ${st} x Rp ${h.toLocaleString('id-ID')} = Rp ${t.toLocaleString('id-ID')}</em></div>`;
            }
        });

        // Simpan grup jika ada isinya
        if (sub || dataJSON.length > 0) {
            groupsToSave.push({ sub: sub, items: dataJSON });
            textToPrint += groupPrintText + "\n"; 
        }
    });
        
    let teksKunci = textToPrint.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (teksKunci.length > 20) {
        sessionStorage.setItem('last_saved_text', teksKunci);
    }
        
    let valToSave = JSON.stringify(groupsToSave);
    
    document.getElementById('val_' + rowID).value = valToSave;
    document.getElementById('val_' + rowID).classList.add('is-dirty'); 
    document.getElementById('print_' + rowID).innerHTML = textToPrint.trim();
    
    perbaruiTombolStatus(rowID, textToPrint, realisasi);
    modalAsisten.hide();
}

// =========================================================================
// MESIN PAGINASI CERDAS (ANTI-BOLONG & ANTI-KERTAS KOSONG)
// =========================================================================

// Helper 1: Pencari batas karakter yang muat di kertas
function binarySearchFit(makeProbe, penjelasanDiv, clone, maxBottom, maxLen) {
    let lo = 0, hi = maxLen, best = 0;
    while (lo <= hi) {
        let mid = Math.floor((lo + hi) / 2);
        let probe = makeProbe(mid);
        penjelasanDiv.appendChild(probe);
        let bottom = clone.getBoundingClientRect().bottom;
        penjelasanDiv.removeChild(probe);
        if (bottom <= maxBottom) {
            best = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    return best;
}

// Helper 2: Pemotong kata agar tidak terpotong di tengah huruf
function findWordBoundary(text, best) {
    let breakAt = best;
    let lastNL = text.lastIndexOf('\n', best - 1);
    if (lastNL > best * 0.5) return lastNL + 1;
    let lastSpace = text.lastIndexOf(' ', best - 1);
    if (lastSpace > best * 0.5) return lastSpace + 1;
    return breakAt;
}

// Helper 3: Mesin pemecah penjelasan menjadi dua bagian
function trySplitPenjelasan(clone, maxBottom) {
    let penjelasanDiv = clone.querySelector('.print-view-text');
    if (!penjelasanDiv) return { success: false };

    let originalHTML = penjelasanDiv.innerHTML;
    let originalText = penjelasanDiv.innerText;
    if (!originalText.trim()) return { success: false };

    penjelasanDiv.innerHTML = '';
    let baselineBottom = clone.getBoundingClientRect().bottom;

    if (baselineBottom > maxBottom) {
        penjelasanDiv.innerHTML = originalHTML;
        return { success: false };
    }

    let availablePx = maxBottom - baselineBottom;
    if (availablePx < 14) {
        penjelasanDiv.innerHTML = originalHTML;
        return { success: false };
    }

    penjelasanDiv.innerHTML = originalHTML;
    let originalNodes = Array.from(penjelasanDiv.childNodes);

    penjelasanDiv.innerHTML = '';
    let remainingNodes = [];
    let splitDone = false;

    for (let node of originalNodes) {
        if (splitDone) {
            remainingNodes.push(node);
            continue;
        }

        penjelasanDiv.appendChild(node.cloneNode(true));
        let testBottom = clone.getBoundingClientRect().bottom;

        if (testBottom > maxBottom) {
            penjelasanDiv.removeChild(penjelasanDiv.lastChild);
            let didSplit = false;

            if (node.nodeType === Node.TEXT_NODE) {
                let text = node.textContent;
                let best = binarySearchFit(
                    (len) => document.createTextNode(text.substring(0, len)),
                    penjelasanDiv, clone, maxBottom, text.length
                );
                if (best > 0) {
                    let breakAt = findWordBoundary(text, best);
                    let firstPart = text.substring(0, breakAt);
                    let restPart = text.substring(breakAt);
                    if (firstPart.trim()) penjelasanDiv.appendChild(document.createTextNode(firstPart));
                    if (restPart.trim()) remainingNodes.unshift(document.createTextNode(restPart));
                    didSplit = true;
                }
            }

            if (!didSplit) {
                remainingNodes.unshift(node);
            }
            splitDone = true;
        }
    }

    let keptText = penjelasanDiv.innerText.trim();
    if (!keptText || remainingNodes.length === 0) {
        penjelasanDiv.innerHTML = originalHTML;
        return { success: false };
    }

    let tempContainer = document.createElement('div');
    remainingNodes.forEach(n => tempContainer.appendChild(n));
    return {
        success: true,
        remainingHTML: tempContainer.innerHTML
    };
}

// Helper 4: Pembuat baris lanjutan di halaman baru (Tanpa mengulang judul)
function buildContinuationRow(remainingHTML, padLevel) {
    let tr = document.createElement('tr');
    tr.className = `pad-lvl-${padLevel} style-rincian continuation-row`;
    tr.dataset.pad = padLevel;
    tr.innerHTML = `
        <td></td>
        <td class="uraian-cell" style="font-style: italic; color: #555555; font-size: 9px; padding-top: 5px; vertical-align: top !important;"></td>
        <td></td>
        <td></td>
        <td></td>
        <td></td>
        <td class="cell-penjelasan" style="vertical-align: top !important; padding-top: 5px !important;">
            <div class="print-view-text" style="margin-top: 0;">${remainingHTML}</div>
        </td>
    `;
    return tr;
}

// =========================================================================
// SATPAM CETAK: Wajib Pilih Semester Sebelum Print
// =========================================================================
function validasiCetak() {
    // Ambil elemen dropdown
    let dropdownPeriode = document.getElementById('selectPeriode');
    
    // Cek apakah nilainya masih kosong
    if (dropdownPeriode.value === "") {
        // Tampilkan peringatan SweetAlert
        Swal.fire({
            icon: 'warning',
            title: 'Tunggu Dulu!',
            text: 'Silakan pilih Periode/Semester terlebih dahulu sebelum melanjutkan proses cetak.',
            confirmButtonColor: '#3b82f6',
            confirmButtonText: 'Baik, Saya Pilih Dulu'
        }).then(() => {
            // Arahkan kursor dan beri efek kedip merah pada dropdown agar user tahu tempatnya
            dropdownPeriode.focus();
            dropdownPeriode.style.boxShadow = "0 0 0 4px rgba(239,68,68,0.4)";
            setTimeout(() => dropdownPeriode.style.boxShadow = "", 2000);
        });
        
        return; // Hentikan eksekusi di sini, jangan lanjut cetak
    }
    
    // Jika sudah diisi, langsung jalankan mesin cetak utama
    cetakPro();
}

// === FUNGSI CETAK UTAMA YANG SUDAH DI-UPGRADE (ANTI-LAG & SUPER MULUS) ===
async function cetakPro() { // 1. Tambahkan kata 'async' di sini
    let tbodyLama = document.getElementById('containerRender');
    if(tbodyLama.children.length === 0 || tbodyLama.innerText.includes('Menunggu')) {
        Swal.fire('Data Kosong', 'Upload Excel LRA Per Pogram dari SIPD terlebih dahulu.', 'warning');
        return;
    }

    Swal.fire({ title: 'Tunggu...', text: 'Halaman Sedang diproses...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    // 2. Kita tidak pakai setTimeout lagi, langsung jalankan prosesnya
    let mulaiHalaman = parseInt(document.getElementById('inputHalaman').value) || 1;
    let rows = Array.from(tbodyLama.children);

    let wrapper = document.getElementById('printWrapper');
    wrapper.innerHTML = '';
    wrapper.style.display = 'block';

    document.querySelector('.container-fluid').style.display = 'none';
    document.querySelector('.print-page').style.display = 'none';

    let pageNum = mulaiHalaman;
    let currentPage = createPageTemplate(pageNum, true);
    wrapper.appendChild(currentPage);

    let currentTbody = currentPage.querySelector('.tbody-render');
    let currentFooter = currentPage.querySelector('.pdf-footer-pro');

    let queue = rows.map(r => ({
        type: 'row',
        source: r,
        padLevel: parseInt(r.dataset.pad) || 0
    }));

    let safetyCounter = 0;
    const SAFETY_MAX = 10000; 

    while (queue.length > 0 && safetyCounter < SAFETY_MAX) {
        safetyCounter++;
        
        // 3. INI KUNCI ANTI-LAG: Biarkan browser "bernapas" sejenak setiap memproses 5 baris
        if (safetyCounter % 5 === 0) {
            await new Promise(resolve => setTimeout(resolve, 1));
        }

        let item = queue.shift();

        let clone;
        if (item.type === 'row') {
            clone = item.source.cloneNode(true);
        } else {
            clone = buildContinuationRow(item.remainingHTML, item.padLevel);
        }

        currentTbody.appendChild(clone);

        let rowRect = clone.getBoundingClientRect();
        let footerRect = currentFooter.getBoundingClientRect();
        let maxBottom = footerRect.top - 1; // Mepet batas bawah

        if (rowRect.bottom <= maxBottom) {
            continue; 
        }

        let split = trySplitPenjelasan(clone, maxBottom);

        if (split.success) {
            queue.unshift({
                type: 'continuation',
                remainingHTML: split.remainingHTML,
                padLevel: item.padLevel
            });
        } else {
            currentTbody.removeChild(clone);
            pageNum++;
            currentPage = createPageTemplate(pageNum, false);
            wrapper.appendChild(currentPage);
            currentTbody = currentPage.querySelector('.tbody-render');
            currentFooter = currentPage.querySelector('.pdf-footer-pro');
            currentTbody.appendChild(clone);

            let freshRect = clone.getBoundingClientRect();
            let freshFooter = currentFooter.getBoundingClientRect();
            let freshMaxBottom = freshFooter.top - 1;

            if (freshRect.bottom > freshMaxBottom) {
                let forceSplit = trySplitPenjelasan(clone, freshMaxBottom);
                if (forceSplit.success) {
                    queue.unshift({
                        type: 'continuation',
                        remainingHTML: forceSplit.remainingHTML,
                        padLevel: item.padLevel
                    });
                }
            }
        }
    }

    let tgl = document.getElementById('ttd-tanggal').innerText;
    let jab = document.getElementById('ttd-jabatan').innerText;
    let nma = document.getElementById('ttd-nama').innerText;
    let nip = document.getElementById('ttd-nip').innerText;

    let ttdNode = document.createElement('div');
    ttdNode.style = "display: flex; justify-content: flex-end; padding-right: 50px; margin-top: 20px;";
    ttdNode.innerHTML = `
        <div class="text-center" style="width: 250px; font-family: Arial, sans-serif; font-size: 11px; color: #000; line-height: 1.4;">
            <div style="margin-bottom: 2px;">${tgl}</div>
            <div class="fw-bold">${jab}</div>
            <div style="height: 55px;"></div>
            <div class="fw-bold text-decoration-underline">${nma}</div>
            <div>${nip}</div>
        </div>
    `;

    currentPage.insertBefore(ttdNode, currentFooter);
    let ttdRect = ttdNode.getBoundingClientRect();
    let currentFooterRect = currentFooter.getBoundingClientRect();

    if (ttdRect.bottom > (currentFooterRect.top - 5)) {
        currentPage.removeChild(ttdNode);
        pageNum++;
        currentPage = createPageTemplate(pageNum, false);
        wrapper.appendChild(currentPage);
        currentPage.insertBefore(ttdNode, currentPage.querySelector('.pdf-footer-pro'));
    }

    Swal.close();
    
    let totalLembarKertas = wrapper.querySelectorAll('.page-pro').length;
    
    document.body.classList.add('preview-active');
    let wrapperPreview = document.getElementById('printWrapper');
    wrapperPreview.classList.add('preview-active');
    
    let ctrlBar = document.getElementById('previewControlBar');
    let badgeHalaman = document.getElementById('badgeInfoTotalHalaman');
    
    if (!badgeHalaman) {
        badgeHalaman = document.createElement('span');
        badgeHalaman.id = 'badgeInfoTotalHalaman';
        badgeHalaman.className = 'badge ms-2 px-2 py-1';
        badgeHalaman.style.cssText = 'background-color: #10b981; font-size: 11px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2); vertical-align: middle;';
        
        let titleSpan = ctrlBar.querySelector('.text-white.fw-bold.d-flex span');
        if (titleSpan) {
            let brTag = titleSpan.querySelector('br');
            if (brTag) titleSpan.insertBefore(badgeHalaman, brTag); 
            else titleSpan.appendChild(badgeHalaman);
        }
    }
    
    badgeHalaman.innerHTML = `<i class="fa-solid fa-copy me-1"></i> Total: ${totalLembarKertas} Halaman`;
    ctrlBar.style.display = 'flex';
}

function createPageTemplate(pageNum, isFirstPage) {
    let div = document.createElement('div');
	div.className = 'page-pro';
    div.style.cssText = "position: relative; width: 330mm; height: 215.9mm; padding: 10mm 5mm 10mm 15mm; margin: 0 auto 20px auto; background: #fff; box-sizing: border-box; overflow: hidden; page-break-after: always;";

    let tahun = document.getElementById('selectTahun').value;
    let periode = document.getElementById('selectPeriode').value;
    let urusan = document.getElementById('metaUrusan').innerText;
    let orgOri = document.getElementById('metaOrganisasi').innerText;
    let skpdBersih = orgOri.replace(/.*:\s*[0-9\.\-]+\s*/, ''); 

    let headerHTML = '';
    if (isFirstPage) {
        headerHTML = `
        <div style="display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
            <img src="img/luwu.png" style="height: 65px; width: auto; margin-right: 15px;">
            
            <div style="flex: 1; text-align: center; margin-left: -65px;">
                <h4 class="fw-bold m-0" style="letter-spacing: 1px; font-size: 16px;">PEMERINTAH KABUPATEN LUWU</h4>
                <h5 class="fw-bold m-0 mt-1" style="font-size: 13px;">PENJABARAN LAPORAN REALISASI ANGGARAN PENDAPATAN DAN BELANJA DAERAH</h5>
                <h6 class="fw-bold mt-1" style="font-size: 13px;">TAHUN ANGGARAN ${tahun}</h6>
            </div>
        </div>
        <div class="fw-bold mb-2" style="font-size: 11px; font-family: Arial, sans-serif;">
            <table style="width: 100%;">
                <tr><td style="width: 22%;">Urusan Pemerintahan</td><td>${urusan}</td></tr>
                <tr><td>Unit Organisasi</td><td>${orgOri}</td></tr>
            </table>
        </div>
        `;
    }

    div.innerHTML = `
        ${headerHTML} 
        <table class="table-lra">
            <colgroup>
                <col style="width: 18%;">
                <col style="width: 24%;">
                <col style="width: 11%;">
                <col style="width: 11%;">
                <col style="width: 11%;">
                <col style="width: 4%;"> 
                <col style="width: 25%;">
            </colgroup>
            <thead>
                <tr>
                    <th>KODE REKENING</th>
                    <th>URAIAN</th>
                    <th>ANGGARAN (Rp)</th>
                    <th>REALISASI (Rp)</th>
                    <th>BERTAMBAH/<br>(BERKURANG) (Rp)</th>
                    <th>(%)</th>
                    <th>PENJELASAN</th>
                </tr>
                <tr style="font-size: 9px; background-color: #fafafa;">
                    <th>1</th><th>2</th><th>3</th><th>4</th><th>5</th><th>6</th><th>7</th>
                </tr>
            </thead>
            <tbody class="tbody-render"></tbody>
        </table>
        
        <div class="pdf-footer-pro" style="position: absolute; bottom: 10mm; left: 15mm; right: 5mm; display: flex; justify-content: space-between; font-size: 10px; font-weight: bold; font-family: Arial, sans-serif; border-top: 2px solid #000; padding-top: 8px; color: #000; background: #fff;">
            <div>${periode} ${tahun}</div>
            <div class="text-uppercase">${skpdBersih}</div>
            <div class="page-number-indicator">Halaman ${pageNum}</div>
        </div>
    `;
    return div;
}

// =========================================================================
// FUNGSI KELUAR DARI MODE PRATINJAU & KEMBALI KE APLIKASI
// =========================================================================
function tutupPreviewCetak() {
    // Matikan mode gelap PDF Viewer
    document.body.classList.remove('preview-active');
    
    let wrapper = document.getElementById('printWrapper');
    if (wrapper) {
        wrapper.classList.remove('preview-active');
        wrapper.style.display = 'none';
        wrapper.innerHTML = ''; // Kosongkan kertas dari memori
    }
    
    // Sembunyikan Bilah Kontrol
    document.getElementById('previewControlBar').style.display = 'none';
    
    // Munculkan kembali UI Aplikasi utama
    document.querySelector('.container-fluid').style.display = 'block';
    document.querySelector('.print-page').style.display = 'block';
}

// Sensor Pintar: Otomatis menutup preview SETELAH proses print (atau batal print) dari browser selesai
window.addEventListener('afterprint', () => {
    tutupPreviewCetak();
});

function exportToExcelRapi() {
    if(globalRawData.length === 0) { Swal.fire('Data Kosong', 'Upload file Excel SIPD terlebih dahulu.', 'warning'); return; }
    let wb = XLSX.utils.book_new();
    let excelData = [];
    excelData.push(["KODE REKENING", "URAIAN", "ANGGARAN (Rp)", "REALISASI (Rp)", "BERTAMBAH/(BERKURANG)", "%", "PENJELASAN SKPD"]);
    
    document.querySelectorAll('#containerRender tr').forEach(tr => {
        let cols = tr.querySelectorAll('td');
        if (cols.length < 7) return;
        let padLevel = parseInt(tr.dataset.pad) || 0;
        let kode = cols[0].innerText.trim();
        let uraian = cols[1].innerText.trim();
        let divPrint = tr.querySelector('.print-view-text');
        let penjelasan = divPrint ? divPrint.innerText.trim() : "";
        let spasi = "   ".repeat(padLevel); 
        excelData.push([ kode, spasi + uraian, cols[2].innerText.trim(), cols[3].innerText.trim(), cols[4].innerText.trim(), cols[5].innerText.trim(), penjelasan ]);
    });

    let ws = XLSX.utils.aoa_to_sheet(excelData);
    ws['!cols'] = [ {wch: 28}, {wch: 60}, {wch: 18}, {wch: 18}, {wch: 18}, {wch: 8}, {wch: 60} ];
    let skpdOri = document.getElementById('metaOrganisasi').innerText;
    let skpdBersih = skpdOri.split(' ').slice(1).join(' ').replace(/^[0-9\.\- ]+/g, '');
    XLSX.utils.book_append_sheet(wb, ws, "Penjabaran_LRA");
    XLSX.writeFile(wb, "LRA_" + (skpdBersih || "SKPD") + "_2026.xlsx");
}

// =========================================================================
// MESIN KOMUNIKASI SERVER (DENGAN DOUBLE-LOCK SECURITY)
// =========================================================================

function simpanKeCloud() {
    // ??? SENSOR ANTI-BAJAKAN (DOMAIN LOCK)
    const DOMAIN_RESMI = "bkadakuntansiluwu.github.io"; 
    let currentDomain = window.location.hostname;
    
    if (currentDomain !== DOMAIN_RESMI) {
        Swal.fire('Akses Ilegal', 'Aplikasi dijalankan dari server tidak resmi! Koneksi diblokir.', 'error');
        return; 
    }

    if(SCRIPT_URL_DATABASE.includes("ISI_DENGAN_URL")) { Swal.fire('Peringatan', 'URL Google Apps Script belum diset.', 'warning'); return; }
    if(!kodeSkpdAktif) { Swal.fire('Error', 'Harap upload LRA Excel terlebih dahulu!', 'warning'); return; }
    let tahun = document.getElementById('selectTahun').value;
    let dataPayload = [];
    
    // ?? HANYA SEDOT BARIS YANG PUNYA STEMPEL 'is-dirty' (YANG BARU DIEDIT OLEH USER INI)
    document.querySelectorAll('.input-database.is-dirty').forEach(inp => {
        dataPayload.push({ row_id: inp.getAttribute('data-rowid'), penjelasan: inp.value.trim() });
    });

    if(dataPayload.length === 0) { Swal.fire('Info', 'Belum ada draf baru yang diketik untuk disimpan.', 'info'); return; }
    
    // === v4.0: 1 KLIK, 1 LOADING, 1 HASIL - TIDAK ADA RETRY RIBET ===
    Swal.fire({
        title: 'Menyimpan...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    fetch(SCRIPT_URL_DATABASE, {
        method: "POST", 
        body: JSON.stringify({ 
            secret_key: SECRET_KEY, 
            tahun: tahun, 
            kode_skpd: kodeSkpdAktif, 
            data: dataPayload,
            user_agent: getUserAgentUntukAudit()
        })
    }).then(r => r.json()).then(res => {
        if(res.status === 'success') {
            // === POPUP SUKSES SINGKAT - auto-close 2 detik, tidak perlu klik OK ===
            Swal.fire({
                icon: 'success',
                title: 'Tersimpan',
                text: 'Data penjelasan berhasil disimpan ke server.',
                timer: 2000,
                showConfirmButton: false,
                timerProgressBar: true
            });
            
            document.querySelectorAll('.input-database.is-dirty').forEach(inp => {
                inp.classList.remove('is-dirty');
            });
			setTimeout(() => { 
                if(typeof tarikDataSiluman === 'function') tarikDataSiluman(); 
            }, 2500);        
        }
        else if (res.status === 'busy') {
            // === POPUP FORMAL SINGKAT - tidak ada retry loop, tidak ada debug info ===
            Swal.fire({
                icon: 'warning',
                title: 'Mohon Tunggu Sebentar',
                text: res.message || 'Sistem sedang memproses permintaan lain. Silakan coba Simpan Draft kembali dalam 1 menit.',
                confirmButtonText: 'Baik, Saya Mengerti',
                confirmButtonColor: '#f59e0b'
            });
        }
        else {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Menyimpan',
                text: res.message || 'Terjadi kesalahan saat menyimpan data.',
                confirmButtonText: 'OK'
            });
        }
    }).catch(() => Swal.fire({
        icon: 'error',
        title: 'Koneksi Terputus',
        text: 'Gagal terhubung ke server. Periksa koneksi internet Anda, lalu coba Simpan Draft kembali.',
        confirmButtonText: 'OK'
    }));
}

function muatDataDariCloud() {
    // 🛡️ SENSOR ANTI-BAJAKAN (DOMAIN LOCK)
    const DOMAIN_RESMI = "bkadakuntansiluwu.github.io"; 
    let currentDomain = window.location.hostname;
    
    if (currentDomain !== DOMAIN_RESMI) {
        Swal.fire('Akses Ilegal 🚫', 'Aplikasi dijalankan dari server tidak resmi! Tarik data ditolak.', 'error');
        return; 
    }

    if(SCRIPT_URL_DATABASE.includes("ISI_DENGAN_URL")) { Swal.fire('Peringatan', 'URL Google Apps Script belum diset.', 'warning'); return; }
    if(!kodeSkpdAktif) { Swal.fire('Error', 'Harap upload LRA Excel terlebih dahulu!', 'warning'); return; }

    // =========================================================================
    // 🛡️ REM OTOMATIS: CEK APAKAH ADA DRAF LOKAL YANG BELUM DISIMPAN KE CLOUD
    // =========================================================================
    let drafBelumDisimpan = document.querySelectorAll('.input-database.is-dirty').length;
    if (drafBelumDisimpan > 0) {
        Swal.fire({
            title: 'Ada Draf Belum Disimpan!',
            html: `Anda memiliki <b>${drafBelumDisimpan} rincian</b> yang belum di-Simpan Draft ke Cloud.<br><br>Jika Anda Menarik Data sekarang, ketikan Anda tersebut akan <b>TERTIMPA/HILANG</b> oleh data lama dari server.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Timpa Data Saya (Hapus Draf)',
            cancelButtonText: 'Batal (Saya Mau Simpan Dulu)'
        }).then((result) => {
            if (result.isConfirmed) {
                // Hapus stempel is-dirty agar tidak bentrok, lalu lanjut tarik data
                document.querySelectorAll('.input-database.is-dirty').forEach(inp => inp.classList.remove('is-dirty'));
                eksekusiTarikDataLRA();
            }
        });
    } else {
        // Jika aman tidak ada draf menggantung, langsung tarik
        eksekusiTarikDataLRA();
    }
}

// =========================================================================
// FUNGSI INTI PENARIKAN DATA (DIPISAH AGAR LEBIH RAPI)
// =========================================================================
// =========================================================================
// FUNGSI INTI PENARIKAN DATA (SUDAH DIRAPIKAN)
// =========================================================================
function eksekusiTarikDataLRA() {
    let tahun = document.getElementById('selectTahun').value;
    Swal.fire({ title: 'Menarik Draf...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    let fetchUrl = `${SCRIPT_URL_DATABASE}?action=load&tahun=${tahun}&kode_skpd=${kodeSkpdAktif}&secret_key=${SECRET_KEY}`;

    fetch(fetchUrl)
        .then(r => r.json()).then(res => {
            if(res.status === 'success') {
                let dataServer = res.data; let count = 0;
                document.querySelectorAll('.input-database').forEach(inp => {
                    let rowId = inp.getAttribute('data-rowid');
                    let realisasi = parseFloat(inp.getAttribute('data-realisasi'));
                    if(dataServer[rowId]) { 
                        inp.value = dataServer[rowId]; 
                        
                        // MEMANGGIL PABRIK HTML TERPUSAT
                        let printText = formatTeksPenjelasan(dataServer[rowId]);

                        document.getElementById('print_' + rowId).innerHTML = printText;
                        
                        let btn = document.getElementById('btn_' + rowId);
                        if (btn && btn.innerHTML.includes('Isi Keterangan')) {
                            btn.className = 'btn btn-sm w-100 text-start fw-bold';
                            btn.style.cssText = "font-family:Arial; font-size:11px; padding: 4px 8px; background-color: #f8fafc; border: 1px solid #cbd5e1; color: #334155; border-radius: 4px;";
                            btn.innerHTML = '<i class="fa-solid fa-check text-muted me-1"></i> Keterangan Disimpan';
                        } else {
                            perbaruiTombolStatus(rowId, printText, realisasi);
                        }
                        count++; 
                    }
                });
                Swal.fire({
                    icon: 'success', title: 'Data Ditarik', text: `${count} baris penjelasan berhasil dimuat dari server.`,
                    timer: 2000, showConfirmButton: false, timerProgressBar: true
                });
            } 
            else if (res.status === 'busy') {
                Swal.fire({
                    icon: 'warning', title: 'Mohon Tunggu Sebentar',
                    text: res.message || 'Sistem sedang memproses permintaan lain. Silakan coba Tarik Data kembali dalam 1 menit.',
                    confirmButtonText: 'Baik, Saya Mengerti', confirmButtonColor: '#f59e0b'
                });
            }
            else if (res.status === 'error') {
                Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: res.message, confirmButtonText: 'OK' });
            }
            else Swal.fire({ icon: 'info', title: 'Data tidak ditemukan', text: 'Belum ada penjelasan yang tersimpan.', confirmButtonText: 'OK' });
        }).catch(() => Swal.fire({
            icon: 'error', title: 'Koneksi Terputus',
            text: 'Gagal terhubung ke server. Periksa koneksi internet Anda, lalu coba Tarik Data kembali.', confirmButtonText: 'OK'
        }));
}

// ====================================================================
// MESIN FILTER AI & REKALKULASI TOTAL DINAMIS (KELAS ENTERPRISE)
// ====================================================================
function terapkanFilterBelanja() {
    let selectObj = document.getElementById('selectFilterBelanja');
    if (!selectObj) return; 
    let filter = selectObj.value;
    let tbody = document.getElementById('containerRender');
    
    // Hapus Baris Total Dinamis Lama (Jika ada)
    let oldTotalRow = document.getElementById('rowDynamicTotal');
    if (oldTotalRow) oldTotalRow.remove();

    let rows = Array.from(document.querySelectorAll('#containerRender tr'));

    // TAHAP 1: Sortir Kategori Dasar (Penyortir Visual Mutlak)
    rows.forEach(tr => {
        let kat = tr.dataset.kategori;
        let subKat = tr.dataset.subKategori;
        tr.style.display = ''; // Tampilkan semua sebagai default

        if (filter !== 'semua') {
            if (kat !== 'induk') {
                if (filter === 'perjalanan') {
                    // Munculkan HANYA Perjalanan Dinas
                    if (subKat !== 'perjalanan') tr.style.display = 'none';
                } else if (filter === 'operasi_non_perjalanan') {
                    // Munculkan Operasi, SEMBUNYIKAN Perjalanan Dinas
                    if (kat !== 'operasi' || subKat === 'perjalanan') tr.style.display = 'none';
                } else if (filter === 'operasi') {
                    // Munculkan Operasi Utuh (termasuk perjalanannya)
                    if (kat !== 'operasi') tr.style.display = 'none';
                } else {
                    // Normal filter (Modal, BTT, Transfer)
                    if (kat !== filter) tr.style.display = 'none';
                }
            }
        }
    });

    // TAHAP 2: Pembersih Judul Program Kosong (Sapu bersih dari bawah)
    if (filter !== 'semua') {
        for (let i = rows.length - 1; i >= 0; i--) {
            let tr = rows[i];
            if (tr.dataset.kategori === 'induk') {
                let padLvl = parseInt(tr.dataset.pad) || 0;
                let hasVisibleChild = false;
                for (let j = i + 1; j < rows.length; j++) {
                    let childTr = rows[j];
                    let childPad = parseInt(childTr.dataset.pad) || 0;
                    if (childPad <= padLvl) break; 
                    if (childTr.style.display !== 'none') {
                        hasVisibleChild = true;
                        break;
                    }
                }
                if (!hasVisibleChild) tr.style.display = 'none';
            }
        }
    }

    // TAHAP 3: REKALKULASI TOTAL NILAI INDUK & GRAND TOTAL (AKURASI 100%)
    let grandAng = 0; let grandRea = 0;

    if (filter === 'semua') {
        rows.forEach(tr => {
            let tdAng = tr.children[2]; let tdRea = tr.children[3];
            let tdSel = tr.children[4]; let tdPer = tr.children[5];
            if(tdAng && tr.dataset.oriAngStr !== undefined) tdAng.innerText = tr.dataset.oriAngStr;
            if(tdRea && tr.dataset.oriReaStr !== undefined) tdRea.innerText = tr.dataset.oriReaStr;
            if(tdSel && tr.dataset.oriSelStr !== undefined) tdSel.innerText = tr.dataset.oriSelStr;
            if(tdPer && tr.dataset.oriPerStr !== undefined) tdPer.innerText = tr.dataset.oriPerStr;
        });
    } else {
        rows.forEach((tr, i) => {
            if (tr.style.display === 'none') return; // Abaikan baris yang sedang disembunyikan
            
            if (tr.dataset.kategori === 'induk') {
                let textUraianLcase = tr.children[1].innerText.toLowerCase();
                let isGrandTotal = textUraianLcase.includes('jumlah') || textUraianLcase === 'total' || textUraianLcase.includes('surplus') || textUraianLcase.includes('defisit');
                
                let padLvl = parseInt(tr.dataset.pad) || 0;
                let sumAng = 0; let sumRea = 0;

                if (isGrandTotal) {
                    tr.style.display = 'none'; 
                } else {
                    for (let j = i + 1; j < rows.length; j++) {
                        let childTr = rows[j];
                        let childPad = parseInt(childTr.dataset.pad) || 0;
                        if (childPad <= padLvl) break; 
                        // Induk hanya menjumlahkan angka rincian di bawahnya yang sedang TAMPIL di layar
                        if (childTr.style.display !== 'none' && childTr.dataset.kategori !== 'induk') {
                            sumAng += parseFloat(childTr.dataset.oriAng) || 0;
                            sumRea += parseFloat(childTr.dataset.oriRea) || 0;
                        }
                    }

                    let selisih = sumRea - sumAng;
                    let persentase = sumAng > 0 ? ((sumRea / sumAng) * 100).toFixed(2) : '0,00';
                    let formatRp = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
                    
                    let strAng = sumAng !== 0 ? sumAng.toLocaleString('id-ID', formatRp) : '0,00';
                    let strRea = sumRea !== 0 ? sumRea.toLocaleString('id-ID', formatRp) : '0,00';
                    let strSel = selisih !== 0 ? (selisih < 0 ? '(' + Math.abs(selisih).toLocaleString('id-ID', formatRp) + ')' : selisih.toLocaleString('id-ID', formatRp)) : '0,00';
                    let strPer = persentase.replace('.', ',');

                    if (tr.dataset.oriAngStr === '') { strAng = ''; strRea = ''; strSel = ''; strPer = ''; }

                    let tdAng = tr.children[2]; let tdRea = tr.children[3];
                    let tdSel = tr.children[4]; let tdPer = tr.children[5];
                    if(tdAng) tdAng.innerText = strAng;
                    if(tdRea) tdRea.innerText = strRea;
                    if(tdSel) tdSel.innerText = strSel;
                    if(tdPer) tdPer.innerText = strPer;
                }
            } else {
                // === MESIN PENANGKAP GRAND TOTAL (MUTLAK / 100% AKURAT) ===
                // Jika baris ini lolos filter (muncul di layar) dan BUKAN sebuah Induk program,
                // Berarti ini murni angka riil. Langsung masukkan ke Grand Total tanpa syarat!
                grandAng += parseFloat(tr.dataset.oriAng) || 0;
                grandRea += parseFloat(tr.dataset.oriRea) || 0;
            }
        });
    }

// TAHAP 4: INJEKSI BARIS TOTAL DINAMIS KE PALING BAWAH TABEL
    if (filter !== 'semua') {
        let namaFilter = "KESELURUHAN";
        if (filter === 'operasi') namaFilter = "BELANJA OPERASI";
        else if (filter === 'operasi_non_perjalanan') namaFilter = "BELANJA OPERASI (TANPA PERJALANAN DINAS)";
        else if (filter === 'modal') namaFilter = "BELANJA MODAL";
        else if (filter === 'btt') namaFilter = "BELANJA TAK TERDUGA";
        else if (filter === 'transfer') namaFilter = "BELANJA TRANSFER";
        else if (filter === 'perjalanan') namaFilter = "BELANJA PERJALANAN DINAS";
        
        let grandSel = grandRea - grandAng;
        let grandPer = grandAng > 0 ? ((grandRea / grandAng) * 100).toFixed(2).replace('.', ',') : '0,00';
        let formatRp = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
        
        let trTotal = document.createElement('tr');
        trTotal.id = 'rowDynamicTotal';
        trTotal.className = 'pad-lvl-1 style-bold';
        
        trTotal.style.backgroundColor = '#f8fafc';
        trTotal.style.borderTop = '2px solid #000';
        trTotal.style.borderBottom = '2px solid #000';
        trTotal.dataset.pad = 1;

        // Kosmetik Teks Agar Rapi (Menyebutkan nama filter di bagian Jumlah)
        trTotal.innerHTML = `
            <td></td>
            <td class="uraian-cell text-center text-uppercase text-dark" style="font-size: 12px; font-weight: 800; letter-spacing: 0.5px;">Total ${namaFilter}</td>
            <td class="text-end text-dark" style="font-weight: 800;">${grandAng !== 0 ? grandAng.toLocaleString('id-ID', formatRp) : '0,00'}</td>
            <td class="text-end text-dark" style="font-weight: 800;">${grandRea !== 0 ? grandRea.toLocaleString('id-ID', formatRp) : '0,00'}</td>
            <td class="text-end text-dark" style="font-weight: 800;">${grandSel !== 0 ? (grandSel < 0 ? '(' + Math.abs(grandSel).toLocaleString('id-ID', formatRp) + ')' : grandSel.toLocaleString('id-ID', formatRp)) : '0,00'}</td>
            <td class="text-center text-dark" style="font-weight: 800;">${grandPer}</td>
            <td></td>
        `;
        
        tbody.appendChild(trTotal);
    }
}

// ====================================================================
// MESIN DETEKTOR KEBOHONGAN (LAPIS 1: ANTI-NGASAL & LAPIS 2: PANJANG)
// ====================================================================
function cekKualitasTeks(teks) {
    let bersih = teks.replace(/<[^>]*>?/gm, '').trim(); // Hapus kode HTML
    let hurufSaja = bersih.replace(/[^a-zA-Z]/g, '');
    
    if (hurufSaja.length < 15) return "Teks Kurang (Min. 15 Kata)";
    if (/(.)\1{4,}/.test(bersih.toLowerCase())) return "Terdeteksi Ketikan Ngawur (Karakter Berulang)"; // Contoh: aaaaa
    if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(bersih)) return "Terdeteksi Ketikan Ngawur (Konsonan Beruntun)"; // Contoh: mnprst
    if (/\b[a-zA-Z]{25,}\b/.test(bersih)) return "Terdeteksi Ketikan Ngawur (Kata Terlalu Panjang)"; // Contoh: asdasdasdasdasd
    
    return "OK";
}

// =========================================================================
// MESIN SEKOCI PENYELAMAT: BACKUP & RESTORE DARURAT (OFFLINE)
// =========================================================================

function backupDaruratOffline() {
    if(!kodeSkpdAktif) { Swal.fire('Error', 'Harap upload LRA Excel terlebih dahulu!', 'warning'); return; }
    
    let tahun = document.getElementById('selectTahun').value;
    let dataPayload = {};
    let count = 0;
    
    // Sedot semua ketikan dari layar secara diam-diam
    document.querySelectorAll('.input-database').forEach(inp => {
        if(inp.value.trim() !== '') {
            dataPayload[inp.getAttribute('data-rowid')] = inp.value.trim();
            count++;
        }
    });

    if(count === 0) { Swal.fire('Info', 'Belum ada data rincian yang diketik untuk di-backup.', 'info'); return; }

    // Membungkus data dengan stempel resmi LRA LUWU
    let backupData = {
        app: "LRA_LUWU",
        tahun: tahun,
        kode_skpd: kodeSkpdAktif,
        timestamp: new Date().toISOString(),
        data: dataPayload
    };

    // Proses Download File Otomatis (UPGRADE BLOB UNTUK DATA RAKSASA)
    let jsonString = JSON.stringify(backupData);
    let blob = new Blob([jsonString], { type: "application/json" });
    let blobUrl = URL.createObjectURL(blob);
    
    let downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", blobUrl);
    
    // Nama file dibuat cerdas agar tidak tertukar
    let namaFile = `Backup_LRA_LUWU_${tahun}_${kodeSkpdAktif.replace(/\./g, '')}.json`;
    downloadAnchorNode.setAttribute("download", namaFile);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    
    // Pembersihan memori agar laptop pengguna tidak lemot
    downloadAnchorNode.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    
    Swal.fire('Berhasil', `File Backup Darurat berhasil diunduh (${count} rincian).<br><br><b>PENTING:</b> File ini digunakan saat internet mati. Simpan baik-baik!`, 'success');
}

function prosesRestoreOffline(event) {
    const file = event.target.files[0];
    if (!file) return;

    if(!kodeSkpdAktif) { 
        Swal.fire('Error', 'Harap upload LRA Excel dari SIPD terlebih dahulu di layar utama sebelum melakukan Restore!', 'warning'); 
        event.target.value = ''; // reset file
        return; 
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            let parsedData = JSON.parse(e.target.result);
            
            // ??? SENSOR 1: Pastikan ini benar-benar file dari Aplikasi kita
            if(parsedData.app !== "LRA_LUWU") {
                Swal.fire('File Ditolak', 'Ini bukan file backup resmi dari Aplikasi LRA Luwu.', 'error');
                return;
            }
            
            let tahunAktif = document.getElementById('selectTahun').value;
            let isWarning = false;
            let warningMsg = "";
            
            // ??? SENSOR 2: Cek Silang Tahun & SKPD (Anti-Tertukar)
            if(parsedData.tahun !== tahunAktif) { isWarning = true; warningMsg += `<br>- Tahun file (${parsedData.tahun}) beda dengan tahun aktif (${tahunAktif})`; }
            if(parsedData.kode_skpd !== kodeSkpdAktif) { isWarning = true; warningMsg += `<br>- Kode SKPD milik dinas lain`; }
            
            if(isWarning) {
                Swal.fire({
                    title: 'Peringatan Data Tidak Cocok!',
                    html: `File backup ini memiliki ketidaksesuaian:${warningMsg}<br><br>Apakah Anda yakin ingin memaksakan restore? Data baris yang tidak cocok akan diabaikan oleh sistem.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'Ya, Paksa Restore'
                }).then((result) => {
                    if (result.isConfirmed) eksekusiRestoreLokal(parsedData.data);
                });
            } else {
                eksekusiRestoreLokal(parsedData.data);
            }
            
        } catch (err) {
            Swal.fire('Error', 'File backup rusak atau gagal dibaca.', 'error');
        }
        event.target.value = ''; // reset input agar bisa milih file yang sama lagi jika perlu
    };
    reader.readAsText(file);
}

// LOGIKA RENDER (Di-copy 100% identik dari logika muatDataDariCloud agar akurasinya mutlak)
// LOGIKA RENDER RESTORE (SUDAH DIRAPIKAN)
function eksekusiRestoreLokal(dataServer) {
    let count = 0;
    Swal.fire({ title: 'Merestore Data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});
    
    setTimeout(() => {
        document.querySelectorAll('.input-database').forEach(inp => {
            let rowId = inp.getAttribute('data-rowid');
            let realisasi = parseFloat(inp.getAttribute('data-realisasi'));
            
            if(dataServer[rowId]) { 
                inp.value = dataServer[rowId]; 
                inp.classList.add('is-dirty');
                
                // MEMANGGIL PABRIK HTML TERPUSAT
                let printText = formatTeksPenjelasan(dataServer[rowId]);

                document.getElementById('print_' + rowId).innerHTML = printText;
                
                let btn = document.getElementById('btn_' + rowId);
                if (btn && btn.innerHTML.includes('Isi Keterangan')) {
                    btn.className = 'btn btn-sm w-100 text-start fw-bold';
                    btn.style.cssText = "font-family:Arial; font-size:11px; padding: 4px 8px; background-color: #f8fafc; border: 1px solid #cbd5e1; color: #334155; border-radius: 4px;";
                    btn.innerHTML = '<i class="fa-solid fa-check text-muted me-1"></i> Keterangan Disimpan';
                } else {
                    perbaruiTombolStatus(rowId, printText, realisasi);
                }
                count++; 
            }
        });
        
        Swal.fire('Restore Berhasil dimuat!', `${count} baris data berhasil dikembalikan dari file Backup Lokal Anda.`, 'success');
    }, 600);
}

// =========================================================================
// FUNGSI: RADAR PING SERVER (GELEMBUNG KONEKSI LIVE)
// =========================================================================
function cekKoneksiServer() {
    let badge = document.getElementById('statusKoneksi');
    let text = document.getElementById('teksKoneksi');
    let icon = badge.querySelector('i');

    // Jika admin lupa menempelkan URL di script.js
    if (!SCRIPT_URL_DATABASE || SCRIPT_URL_DATABASE.includes("ISI_DENGAN_URL")) {
        badge.className = 'connection-badge offline shadow-sm';
        icon.className = 'fa-solid fa-triangle-exclamation';
        text.innerText = 'Offline (URL Kosong)';
        return;
    }

    // Lakukan ping super ringan ke server Google
    let urlPing = `${SCRIPT_URL_DATABASE}?secret_key=${SECRET_KEY}&action=ping`;
    
    fetch(urlPing)
        .then(r => r.json())
        .then(res => {
            if (res && res.status === 'success') {
                badge.className = 'connection-badge online shadow-sm';
                icon.className = 'fa-solid fa-wifi';
                text.innerText = 'Terhubung';
            } else {
                throw new Error("Invalid response");
            }
        })
        .catch(err => {
            badge.className = 'connection-badge offline shadow-sm';
            icon.className = 'fa-solid fa-server'; 
            text.innerText = 'Server Offline';
        });
}

// =========================================================================
// SISTEM KEAMANAN SESSION (LOGIN 1X SELAMA BROWSER TERBUKA)
// =========================================================================

// --- GERBANG LOGIN AWAL ---
function tampilkanGerbangKeamanan() {
    // Jika password sudah ada di sesi ini, langsung izinkan masuk tanpa tanya lagi
    if (SECRET_KEY !== "") {
        document.body.style.overflow = 'auto';
        document.querySelectorAll('.container-fluid, .print-page').forEach(el => {
            el.style.filter = 'none';
            el.style.pointerEvents = 'auto';
        });
        cekKoneksiServer();
        return;
    }

    Swal.fire({
        title: '<strong style="font-family: Arial;">Login Aplikasi LRA <i class="fa-solid fa-lock text-dark ms-1"></i></strong>',
        html: `
            <div class="mb-3 mt-2 text-start" style="font-family: Arial;">
                <label class="form-label fw-bold text-secondary" style="font-size:12px;">Masukkan Password Akses SKPD:</label>
                <div class="input-group">
                    <input type="password" id="swal-input-password" class="form-control form-control-lg shadow-none border-secondary" placeholder="Ketik sandi disini..." style="font-size: 14px;">
                    <button class="btn btn-outline-secondary" type="button" id="togglePassword">
                        <i class="fa-regular fa-eye"></i>
                    </button>
                </div>
                <div class="mt-2 text-muted" style="font-size: 10px;">
                    <i class="fa-solid fa-circle-info text-primary me-1"></i> Sesi akan aktif selama browser belum ditutup.
                </div>
            </div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: true,
        confirmButtonText: 'Masuk <i class="fa-solid fa-arrow-right-to-bracket ms-1"></i>',
        confirmButtonColor: '#0f172a',
        showLoaderOnConfirm: true,
        didOpen: () => {
            // Kunci layar dan beri efek blur saat disuruh login
            document.body.style.overflow = 'hidden'; 
            document.querySelectorAll('.container-fluid, .print-page').forEach(el => {
                el.style.filter = 'blur(10px) grayscale(20%)';
                el.style.pointerEvents = 'none';
            });

            // Logika Mata Password
            const toggleBtn = document.getElementById('togglePassword');
            const passwordInput = document.getElementById('swal-input-password');
            toggleBtn.addEventListener('click', () => {
                const isPassword = passwordInput.getAttribute('type') === 'password';
                passwordInput.setAttribute('type', isPassword ? 'text' : 'password');
                toggleBtn.innerHTML = isPassword ? '<i class="fa-regular fa-eye-slash"></i>' : '<i class="fa-regular fa-eye"></i>';
            });
            passwordInput.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') Swal.clickConfirm();
            });
        },
        preConfirm: () => {
            const pwd = document.getElementById('swal-input-password').value;
            if (!pwd) { Swal.showValidationMessage('Password tidak boleh kosong!'); return false; }
            
            // Ping ke Server
            let urlPing = `${SCRIPT_URL_DATABASE}?secret_key=${pwd}&action=ping`;
            return fetch(urlPing)
                .then(response => response.json())
                .then(res => {
                    if (res.status === 'error') {
                        Swal.showValidationMessage('Password Salah! Akses ditolak.');
                        return false;
                    }
                    return pwd;
                })
                .catch(error => {
                    Swal.showValidationMessage('❌ Gagal cek server. Pastikan internet aktif!');
                    return false;
                });
        }
    }).then((result) => {
        if (result.isConfirmed) {
            SECRET_KEY = result.value;
            
            // SIMPAN KE SESSION STORAGE (Otomatis Musnah Saat Browser Ditutup)
            sessionStorage.setItem('LRA_AUTH_KEY', SECRET_KEY);
            
            // BUKA KUNCI BLUR & KEMBALIKAN FUNGSI LAYAR
            document.body.style.overflow = 'auto';
            document.querySelectorAll('.container-fluid, .print-page').forEach(el => {
                el.style.filter = 'none';
                el.style.pointerEvents = 'auto';
            });
            
            Swal.fire({
                icon: 'success', title: 'Berhasil Login', text: 'Selamat bekerja!', timer: 1500, showConfirmButton: false
            });
            cekKoneksiServer();
        }
    });
}

// =========================================================================
// 🧠 MESIN KAMUS AUTOCOMPLETE CERDAS (MULTI-KOLOM & ISOLASI MEMORI)
// =========================================================================
// 1. Memori terpisah agar teks panjang dan angka tidak saling bercampur
let kamusPengetikan = JSON.parse(localStorage.getItem('KAMUS_LRA_LUWU')) || [];
let kamusSatuan = JSON.parse(localStorage.getItem('KAMUS_SATUAN_LUWU')) || [];
let kamusHarga = JSON.parse(localStorage.getItem('KAMUS_HARGA_LUWU')) || [];
let kamusVol = JSON.parse(localStorage.getItem('KAMUS_VOL_LUWU')) || [];

// 2. Fungsi penyerap memori untuk Uraian (Teks Panjang)
function simpanKeKamus(teks) {
    if (!teks || teks.trim().length < 4) return; 
    let bersih = teks.trim();
    if (!kamusPengetikan.includes(bersih)) {
        kamusPengetikan.unshift(bersih); 
        if (kamusPengetikan.length > 250) kamusPengetikan.pop(); 
        localStorage.setItem('KAMUS_LRA_LUWU', JSON.stringify(kamusPengetikan));
    }
}

// 3. Fungsi penyerap memori khusus untuk Volume, Satuan, dan Harga (Pendek)
function simpanKamusKhusus(teks, tipe) {
    if (!teks) return;
    let bersih = String(teks).trim();
    if (bersih === '' || bersih === '0') return;
    
    let target, key;
    if (tipe === 'satuan') { target = kamusSatuan; key = 'KAMUS_SATUAN_LUWU'; }
    else if (tipe === 'harga') { target = kamusHarga; key = 'KAMUS_HARGA_LUWU'; }
    else if (tipe === 'vol') { target = kamusVol; key = 'KAMUS_VOL_LUWU'; }

    if (!target.includes(bersih)) {
        target.unshift(bersih);
        if (target.length > 30) target.pop(); // Batasi 30 memori saja agar sangat ringan
        localStorage.setItem(key, JSON.stringify(target));
    }
}

// 4. Penciptaan Kotak Saran Gaib
let boxSaran = document.createElement('div');
boxSaran.id = 'boxSaranLRA';
boxSaran.style.cssText = 'display:none; position:absolute; z-index:10000; max-height:220px; overflow-y:auto; font-family:Arial; font-size:12px; background:#ffffff; border:1px solid #94a3b8; border-radius:6px; box-shadow:0 10px 25px rgba(0,0,0,0.15);';
document.body.appendChild(boxSaran);

let activeInput = null;

// 5. Sensor Cerdas yang mengenali di kolom mana kursor sedang berada
document.addEventListener('input', function(e) {
    let isUraian = e.target.classList.contains('textarea-smart');
    let isSatuan = e.target.classList.contains('satuan');
    let isHarga = e.target.classList.contains('harga');
    let isVol = e.target.classList.contains('vol');

    if (isUraian || isSatuan || isHarga || isVol) {
        let val = e.target.value.toLowerCase().trim();
        let targetKamus = [];
        let minChar = 2; // Default batas huruf
        let tipeTarget = '';

        // Penentuan jenis memori berdasarkan letak kursor
        if (isUraian) { targetKamus = kamusPengetikan; minChar = 2; tipeTarget = 'uraian'; }
        if (isSatuan) { targetKamus = kamusSatuan; minChar = 1; tipeTarget = 'satuan'; } // 1 huruf bisa muncul saran
        if (isHarga) { targetKamus = kamusHarga; minChar = 1; tipeTarget = 'harga'; }
        if (isVol) { targetKamus = kamusVol; minChar = 1; tipeTarget = 'vol'; }

        if (val.length < minChar) {
            boxSaran.style.display = 'none';
            return;
        }

        let matches = targetKamus.filter(k => k.toLowerCase().includes(val));
        
        if (matches.length > 0) {
            activeInput = e.target;
            boxSaran.innerHTML = '';
            
            matches.slice(0, 8).forEach(match => { 
                let item = document.createElement('div');
                item.className = 'p-2 border-bottom text-secondary fw-bold d-flex justify-content-between align-items-center';
                item.style.cssText = 'transition:0.2s; background:#fff;';
                
                let textSpan = document.createElement('span');
                textSpan.className = 'text-truncate';
                textSpan.style.cssText = 'flex: 1; cursor: pointer; padding-right: 10px;';
                textSpan.innerText = match;
                
                // Jika diklik
                textSpan.onclick = function() {
                    activeInput.value = match;
                    boxSaran.style.display = 'none';
                    if (isHarga) formatRibuan(activeInput); // Otomatis format titik rupiah jika di kolom harga
                    if (typeof kalkulasiKombinasi === 'function') kalkulasiKombinasi(); // Update total Rp
                    activeInput.focus();
                };

                // Tombol Hapus X
                let delBtn = document.createElement('i');
                delBtn.className = 'fa-solid fa-xmark text-danger';
                delBtn.style.cssText = 'cursor: pointer; padding: 4px 8px; border-radius: 4px; opacity: 0.5; transition: 0.2s; font-size: 14px;';
                delBtn.title = 'Hapus saran ini';
                
                delBtn.onmouseover = function() { this.style.opacity = '1'; this.style.backgroundColor = '#fee2e2'; };
                delBtn.onmouseout = function() { this.style.opacity = '0.5'; this.style.backgroundColor = 'transparent'; };
                
                delBtn.onclick = function(event) {
                    event.stopPropagation(); 
                    if (tipeTarget === 'uraian') {
                        kamusPengetikan = kamusPengetikan.filter(k => k !== match);
                        localStorage.setItem('KAMUS_LRA_LUWU', JSON.stringify(kamusPengetikan));
                    } else if (tipeTarget === 'satuan') {
                        kamusSatuan = kamusSatuan.filter(k => k !== match);
                        localStorage.setItem('KAMUS_SATUAN_LUWU', JSON.stringify(kamusSatuan));
                    } else if (tipeTarget === 'harga') {
                        kamusHarga = kamusHarga.filter(k => k !== match);
                        localStorage.setItem('KAMUS_HARGA_LUWU', JSON.stringify(kamusHarga));
                    } else if (tipeTarget === 'vol') {
                        kamusVol = kamusVol.filter(k => k !== match);
                        localStorage.setItem('KAMUS_VOL_LUWU', JSON.stringify(kamusVol));
                    }
                    item.remove();
                    if (boxSaran.children.length === 0) boxSaran.style.display = 'none';
                };
                
                item.onmouseover = function() { this.style.backgroundColor = '#f1f5f9'; textSpan.style.color = '#0f172a'; };
                item.onmouseout = function() { this.style.backgroundColor = '#fff'; textSpan.style.color = ''; };
                
                item.appendChild(textSpan);
                item.appendChild(delBtn);
                boxSaran.appendChild(item);
            });

            // Otomatis menyesuaikan ukuran dropdown dengan lebar kotak input
            let rect = e.target.getBoundingClientRect();
            boxSaran.style.left = rect.left + window.scrollX + 'px';
            boxSaran.style.top = (rect.bottom + window.scrollY + 2) + 'px';
            boxSaran.style.width = rect.width + 'px'; 
            boxSaran.style.display = 'block';
        } else {
            boxSaran.style.display = 'none';
        }
    }
});

document.addEventListener('click', function(e) {
    if (e.target.id !== 'boxSaranLRA' && !e.target.closest('#boxSaranLRA') && !e.target.classList.contains('textarea-smart') && !e.target.classList.contains('satuan') && !e.target.classList.contains('harga') && !e.target.classList.contains('vol')) {
        boxSaran.style.display = 'none';
    }
});

document.addEventListener('scroll', function() { boxSaran.style.display = 'none'; }, true);

// =========================================================================
// 🛡️ MOBILE DETECTOR (PEMBLOKIR LAYAR HP UNTUK KENYAMANAN APLIKASI)
// =========================================================================
function cekResolusiLayar() {
    if (window.innerWidth < 1024) { // Jika lebar layar kurang dari standar laptop/tablet besar
        // Kunci semua aktivitas di latar belakang
        document.body.style.overflow = 'hidden'; 
        
        // Buat Layar Peringatan Profesional
        let mobileBlocker = document.getElementById('mobileBlockerLRA');
        if (!mobileBlocker) {
            mobileBlocker = document.createElement('div');
            mobileBlocker.id = 'mobileBlockerLRA';
            mobileBlocker.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background-color:#0f172a; z-index:999999; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:30px; color:#f8fafc; font-family:Arial, sans-serif;';
            
            mobileBlocker.innerHTML = `
                <i class="fa-solid fa-laptop-code text-primary mb-4" style="font-size: 60px;"></i>
                <h3 style="font-weight: bold; margin-bottom: 15px; letter-spacing: 1px;">Mode Desktop Diperlukan</h3>
                <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; max-width: 400px; margin: 0 auto 25px auto;">
                    Aplikasi Penjabaran LRA Pemkab Luwu memuat data tabel dan fitur cetak yang sangat kompleks.<br><br>
                    Untuk pengalaman kerja dan keamanan data terbaik, mohon buka aplikasi ini menggunakan <b>PC atau Laptop</b>.
                </p>
                <div style="padding: 10px 20px; background-color: rgba(255, 255, 255, 0.1); border-radius: 8px; font-size: 11px; color: #cbd5e1;">
                    Resolusi minimum yang disarankan: 1024px (Landscape)
                </div>
            `;
            document.body.appendChild(mobileBlocker);
        }
        mobileBlocker.style.display = 'flex';
    } else {
        // Jika dibuka di laptop, sembunyikan peringatan
        let mobileBlocker = document.getElementById('mobileBlockerLRA');
        if (mobileBlocker) {
            mobileBlocker.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }
}

// Cek saat pertama kali dibuka dan setiap kali ukuran layar berubah
window.addEventListener('load', cekResolusiLayar);
window.addEventListener('resize', cekResolusiLayar);



// =========================================================================
// ??? FITUR BRANKAS MEMORI GAIB (ANTI-HILANG SAAT UPLOAD EXCEL)
// =========================================================================
window.brankasDraf = [];

window.backupBrankasDraf = function() {
    let adaData = false;
    let tempDraft = [];
    // Sedot semua ketikan yang ada di layar
    document.querySelectorAll('.input-database').forEach(inp => {
        let id = inp.getAttribute('data-rowid');
        if (inp.value.trim() !== '') {
            adaData = true;
            tempDraft.push({
                id: id,
                val: inp.value,
                isDirty: inp.classList.contains('is-dirty'), // Simpan status belum tersimpan cloud
                printHtml: document.getElementById('print_' + id) ? document.getElementById('print_' + id).innerHTML : '',
                btnOuter: document.getElementById('btn_' + id) ? document.getElementById('btn_' + id).outerHTML : ''
            });
        }
    });
    if (adaData) {
        window.brankasDraf = tempDraft; // Simpan ke brankas
    }
};

window.restoreBrankasDraf = function() {
    if (!window.brankasDraf || window.brankasDraf.length === 0) return;
    
    // Kembalikan semua data dari brankas ke layar
    window.brankasDraf.forEach(item => {
        let inp = document.getElementById('val_' + item.id);
        if (inp) {
            inp.value = item.val;
            if (item.isDirty) inp.classList.add('is-dirty');
            
            let printDiv = document.getElementById('print_' + item.id);
            if (printDiv && item.printHtml) printDiv.innerHTML = item.printHtml;
            
            let btnDiv = document.getElementById('btn_' + item.id);
            if (btnDiv && item.btnOuter) {
                btnDiv.outerHTML = item.btnOuter;
            }
        }
    });
};

// =========================================================================
// ?? FITUR KERJA TIM: TARIK DATA SILUMAN (SUDAH DIRAPIKAN)
// =========================================================================
let waktuTerakhirSiluman = 0;

function tarikDataSiluman() {
    if(!kodeSkpdAktif) return;
    
    let waktuSekarang = Date.now();
    // Beri jeda minimal 15 detik (15000 milidetik) antar penarikan siluman
    if (waktuSekarang - waktuTerakhirSiluman < 15000) {
        console.log("Tarik data siluman dicegah sementara untuk menghemat beban server.");
        return; 
    }
    
    waktuTerakhirSiluman = waktuSekarang; // Catat waktu penarikan

    let tahun = document.getElementById('selectTahun').value;
    let fetchUrl = `${SCRIPT_URL_DATABASE}?action=load&tahun=${tahun}&kode_skpd=${kodeSkpdAktif}&secret_key=${SECRET_KEY}`;

    let badge = document.getElementById('statusKoneksi');
    let oriHtml = badge.innerHTML;
    let oriClass = badge.className;
    badge.className = 'connection-badge checking shadow-sm';
    badge.innerHTML = '<i class="fa-solid fa-rotate fa-spin"></i> Menyinkronkan data tim...';

    fetch(fetchUrl)
        .then(r => r.json()).then(res => {
            if(res.status === 'success') {
                let dataServer = res.data;
                document.querySelectorAll('.input-database').forEach(inp => {
                    let rowId = inp.getAttribute('data-rowid');
                    let realisasi = parseFloat(inp.getAttribute('data-realisasi'));

                    if(dataServer[rowId] && !inp.classList.contains('is-dirty')) {
                        if(inp.value !== dataServer[rowId]) {
                            inp.value = dataServer[rowId];
                            
                            // MEMANGGIL PABRIK HTML TERPUSAT
                            let printText = formatTeksPenjelasan(dataServer[rowId]);

                            // Update tampilan layar
                            let printDiv = document.getElementById('print_' + rowId);
                            if(printDiv) printDiv.innerHTML = printText;
                            
                            let btn = document.getElementById('btn_' + rowId);
                            if (btn && btn.innerHTML.includes('Isi Keterangan')) {
                                btn.className = 'btn btn-sm w-100 text-start fw-bold';
                                btn.style.cssText = "font-family:Arial; font-size:11px; padding: 4px 8px; background-color: #f8fafc; border: 1px solid #cbd5e1; color: #334155; border-radius: 4px;";
                                btn.innerHTML = '<i class="fa-solid fa-check text-muted me-1"></i> Keterangan Disimpan';
                            } else {
                                if(typeof perbaruiTombolStatus === 'function') perbaruiTombolStatus(rowId, printText, realisasi);
                            }
                        }
                    }
                });
                
                // Kembalikan indikator radar menjadi sukses
                badge.className = 'connection-badge online shadow-sm';
                badge.innerHTML = '<i class="fa-solid fa-check-double"></i> Tim Tersinkron';
                setTimeout(() => { badge.className = oriClass; badge.innerHTML = oriHtml; }, 3000);
            }
        }).catch(() => {
            badge.className = oriClass; badge.innerHTML = oriHtml; // Kembalikan jika gagal
        });
}

// =========================================================================
// PABRIK HTML TERPUSAT (Ubah desain rincian cukup dari sini saja!)
// =========================================================================
function formatTeksPenjelasan(dataServerString) {
    let printText = dataServerString;
    try { 
        let parsed = JSON.parse(dataServerString);
        let tempText = "";

        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].items !== undefined) {
            parsed.forEach(g => {
                if (g.sub) tempText += `${g.sub}\n\n`;
                if(g.items) {
                    g.items.forEach(i => {
                        let st = i.s ? ` ${i.s}` : '';
                        tempText += `- ${i.u}\n<div style="border-bottom: 1px dashed #666; padding-bottom: 4px; margin-bottom: 4px;"><em>${i.v} ${st} x Rp ${i.h.toLocaleString('id-ID')} = Rp ${i.t.toLocaleString('id-ID')}</em></div>`;
                    });
                }
                tempText += "\n";
            });
            printText = tempText.trim();
        } 
        else if (parsed && parsed.items) {
            let headText = parsed.sub || parsed.judul || ""; 
            if (headText) tempText += `${headText}\n\n`;
            parsed.items.forEach(i => {
                let st = i.s ? ` ${i.s}` : '';
                tempText += `- ${i.u}\n<div style="border-bottom: 1px dashed #666; padding-bottom: 4px; margin-bottom: 4px;"><em>${i.v} ${st} x Rp ${i.h.toLocaleString('id-ID')} = Rp ${i.t.toLocaleString('id-ID')}</em></div>`;
            });
            printText = tempText;
        } 
        else if (parsed && parsed.mode === 'auto') {
            printText = parsed.data.map(i => {
                let st = i.s ? ` ${i.s}` : '';
                return `- ${i.u}: ${i.v}${st} x Rp${i.h.toLocaleString('id-ID')} = Rp${i.t.toLocaleString('id-ID')}`;
            }).join('\n');
        } else if (parsed && parsed.mode === 'manual') {
            printText = parsed.data;
        }
    } catch(e) {} 
    
    return printText;
}