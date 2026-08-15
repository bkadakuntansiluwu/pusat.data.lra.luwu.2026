// =========================================================================
// [MESIN AUDIT FORENSIK PUSAT] - VALIDASI KEBENARAN LRA SKPD
// =========================================================================
// Membaca file Excel secara lokal (RAM) dan membandingkannya dengan Server.
// Sangat ringan, terisolasi, dan menggunakan bahasa pelaporan formal.

const GAS_AUDIT_URL = "https://script.google.com/macros/s/AKfycbyhFPzwcma9noqUe-P-g0wcxgaC_uTzwySMOq5NQA_WTeVIXOZ9IZ94xzfAjpQc1R5XKw/exec";

// 1. Injeksi Input File Siluman untuk Excel Audit
document.addEventListener("DOMContentLoaded", function() {
    let inputAudit = document.createElement('input');
    inputAudit.type = 'file';
    inputAudit.id = 'fileAuditExcel';
    inputAudit.accept = '.xlsx, .xls, .csv';
    inputAudit.style.display = 'none';
    document.body.appendChild(inputAudit);

    inputAudit.addEventListener('change', prosesInvestigasiBerkas);
});

// Variabel Global Sementara untuk Audit
let auditAktif_KodeSkpd = "";
let auditAktif_NamaSkpd = "";
let auditAktif_Tahun = "2026"; 

// 2. Fungsi Gerbang Utama (Dipanggil dari Tombol di Tabel Radar)
window.mulaiAuditForensik = function(kodeSkpd, namaSkpd) {
    auditAktif_KodeSkpd = kodeSkpd;
    auditAktif_NamaSkpd = namaSkpd;
    
    Swal.fire({
        title: 'Validasi Kebenaran LRA',
        html: `<div style="font-size: 13px; color: #475569; margin-bottom: 15px;">Instansi: <b>${namaSkpd}</b><br><br>Sistem akan mengaudit kecocokan data Cloud dengan dokumen asli. Silakan unggah berkas Excel LRA instansi ini.</div>`,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#1e3a5f',
        cancelButtonColor: '#94a3b8',
        confirmButtonText: '<i class="fa-solid fa-file-excel me-1"></i> Unggah Berkas Excel',
        cancelButtonText: 'Batal'
    }).then((result) => {
        if (result.isConfirmed) {
            document.getElementById('fileAuditExcel').click();
        }
    });
};

// 3. Mesin Pembaca Excel & Pengambil Keputusan
function prosesInvestigasiBerkas(event) {
    const file = event.target.files[0];
    if (!file) return;

    Swal.fire({ title: 'Melakukan Audit Forensik...', html: 'Memeriksa integritas data Pangkalan Data vs Dokumen Asli...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            // A. Baca Excel Asli (Hanya Ekstrak Angka Realisasi)
            let data = new Uint8Array(e.target.result);
            let workbook = XLSX.read(data, {type: 'array'});
            let rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
            
            let colRea = -1;
            let targetBelanjaExcel = 0;
            let targetPADExcel = 0;

            // Cari kolom Realisasi
            for (let r = 0; r < 15 && r < rawData.length; r++) {
                if (!rawData[r]) continue;
                for (let c = 0; c < rawData[r].length; c++) {
                    let cellVal = String(rawData[r][c] || '').toLowerCase().trim();
                    if (cellVal === 'realisasi') { colRea = c; break; }
                }
                if (colRea !== -1) break;
            }

            if (colRea === -1) throw new Error("Format Excel Tidak Sah. Kolom Realisasi tidak ditemukan.");

            // Kalkulasi Akurat Excel
            for (let i = 0; i < rawData.length; i++) {
                let row = rawData[i];
                if (!row || !row[0]) continue;
                let kodeStr = String(row[0]).trim();
                let realisasiVal = parseFloat(String(row[colRea] || '0').replace(/[^0-9\.\-]/g, '').replace(/\./g, '')) || 0;

                let dots = (kodeStr.match(/\./g) || []).length;
                if (dots >= 5) {
                    if (kodeStr.startsWith('5.')) targetBelanjaExcel += realisasiVal;
                    if (kodeStr.startsWith('4.')) targetPADExcel += realisasiVal;
                }
            }

            // B. Tarik Data Ketikan (Cloud)
            let amanKode = auditAktif_KodeSkpd.replace(/\./g, '_');
            let urlLRA = `${FIREBASE_URL}lra_${auditAktif_Tahun}/${amanKode}.json`;
            let resLRA = await fetch(urlLRA, { cache: 'no-store' }).then(r => r.json()).catch(() => null);

            let terinputBelanjaCloud = 0;
            let terinputPADCloud = 0;

            if (resLRA) {
                for (let key in resLRA) {
                    let jsonKetikan = resLRA[key];
                    let totalBarisIni = _kalkulasiTotalJsonCerdas(jsonKetikan);
                    
                    if (key.startsWith('R_5')) terinputBelanjaCloud += totalBarisIni;
                    else if (key.startsWith('R_4')) terinputPADCloud += totalBarisIni;
                }
            }

            // C. Periksa Tanda Tangan (TTD)
            let statusTTD = "-";
            let colorTTD = "color: #dc2626; font-weight: 800;"; // Merah
            
            try {
                let payload = { action: 'load_ttd', tahun: auditAktif_Tahun, kode_skpd: auditAktif_KodeSkpd };
                let resTTD = await fetch(GAS_AUDIT_URL, { method: "POST", body: JSON.stringify(payload) }).then(r => r.json());
                
                if (resTTD.status === 'success' && resTTD.data) {
                    if (resTTD.data.nama && resTTD.data.nama !== 'NAMA KEPALA SKPD') {
                        statusTTD = "Sudah Terisi";
                        colorTTD = "color: #10b981; font-weight: 800;"; // Hijau
                    }
                }
            } catch (err) { console.warn("Pengecekan TTD dialihkan."); }

            // D. Cetak Laporan Audit
            _tampilkanLaporanAudit(targetBelanjaExcel, terinputBelanjaCloud, targetPADExcel, terinputPADCloud, statusTTD, colorTTD);
            
        } catch (error) {
            Swal.fire('Audit Dibatalkan', 'Gagal memproses berkas. Pastikan file Excel berasal dari SIPD.', 'error');
        }
        event.target.value = ''; // Reset Input
    };
    reader.readAsArrayBuffer(file);
}

// 4. Logika Pengekstrak Nilai Uang (Super Ringan)
function _kalkulasiTotalJsonCerdas(jsonString) {
    let total = 0;
    try {
        let parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0].sub === 'string') {
            let innerText = parsed[0].sub.trim();
            if (innerText.startsWith('[') && innerText.endsWith(']')) {
                try { parsed = JSON.parse(innerText); } catch(e){}
            }
        }
        if (Array.isArray(parsed)) {
            parsed.forEach(g => { if(g.items) g.items.forEach(i => { total += (parseFloat(i.t) || 0); }); });
        } else if (parsed && parsed.items) {
            parsed.items.forEach(i => { total += (parseFloat(i.t) || 0); });
        }
    } catch(e) {}
    return total;
}

// 5. Tampilan Sertifikat Laporan Formal
function _tampilkanLaporanAudit(belanjaEx, belanjaCl, padEx, padCl, statTTD, colorTTD) {
    let formatRp = { minimumFractionDigits: 0 };
    
    // Status Belanja
    let selisihBelanja = Math.abs(belanjaEx - belanjaCl);
    let lblBelanja = "";
    if (belanjaEx === 0 && belanjaCl === 0) lblBelanja = `<span style="color: #94a3b8; font-weight: 800;">-</span>`;
    else if (selisihBelanja < 1) lblBelanja = `<span style="color: #10b981; font-weight: 800;"><i class="fa-solid fa-check-circle me-1"></i> VALID</span>`;
    else lblBelanja = `<span style="color: #dc2626; font-weight: 800;"><i class="fa-solid fa-triangle-exclamation me-1"></i> MASIH SELISIH (Rp ${selisihBelanja.toLocaleString('id-ID', formatRp)})</span>`;

    // Status PAD
    let selisihPAD = Math.abs(padEx - padCl);
    let lblPAD = "";
    if (padEx === 0) lblPAD = `<span style="color: #94a3b8; font-weight: 800;">-</span>`;
    else if (selisihPAD < 1) lblPAD = `<span style="color: #10b981; font-weight: 800;"><i class="fa-solid fa-check-circle me-1"></i> VALID</span>`;
    else lblPAD = `<span style="color: #dc2626; font-weight: 800;"><i class="fa-solid fa-triangle-exclamation me-1"></i> MASIH SELISIH (Rp ${selisihPAD.toLocaleString('id-ID', formatRp)})</span>`;

    let htmlLaporan = `
        <div style="text-align: left; font-family: Arial, sans-serif; font-size: 13px; color: #334155;">
            <div style="border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px;">
                <h6 style="color: #1e3a5f; font-weight: 800; margin: 0; text-transform: uppercase;">1. Nilai Rincian Realisasi:</h6>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #cbd5e1;">
                <span style="font-weight: 600;">➖ Belanja Daerah</span>
                <span>${lblBelanja}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 6px 0; margin-bottom: 20px;">
                <span style="font-weight: 600;">➖ Pendapatan (PAD)</span>
                <span>${lblPAD}</span>
            </div>

            <div style="border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px;">
                <h6 style="color: #1e3a5f; font-weight: 800; margin: 0; text-transform: uppercase;">2. Autentikasi Pengesahan:</h6>
            </div>
            
            <div style="display: flex; justify-content: space-between; padding: 6px 0;">
                <span style="font-weight: 600;">➖ TTD Pejabat</span>
                <span style="${colorTTD}">${statTTD}</span>
            </div>
        </div>
    `;

    Swal.fire({
        title: '<span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 1px;"><i class="fa-solid fa-file-shield text-primary me-2"></i> HASIL VALIDASI KEBENARAN SKPD</span>',
        html: htmlLaporan,
        confirmButtonColor: '#1e3a5f',
        confirmButtonText: 'Tutup Laporan',
        width: '500px'
    });
}