// =========================================================================
// [MESIN AUDIT FORENSIK PUSAT] - VALIDASI KEBENARAN LRA SKPD (V3.0)
// =========================================================================
// Membaca file Excel secara lokal (RAM) dan membandingkannya dengan Server.
// Menggunakan Otak Pengekstrak Kembar Identik dengan Aplikasi SKPD.

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

// =====================================================================
// MESIN PEMBACA ANGKA CERDAS (KEMBAR IDENTIK DENGAN SKPD)
// =====================================================================
function _parseIndoNum(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    
    let str = String(val).trim();
    if (str === '-' || str === '') return 0;

    let isNegative = false;
    if (str.startsWith('(') && str.endsWith(')')) {
        isNegative = true;
        str = str.substring(1, str.length - 1).trim();
    } else if (str.startsWith('-')) {
        isNegative = true;
        str = str.substring(1).trim();
    }

    str = str.replace(/\s/g, '').replace(/%/g, '').replace(/Rp/gi, '');

    if (str.includes('.') && str.includes(',')) {
        str = str.replace(/\./g, '').replace(/,/g, '.'); 
    } else if (str.includes(',') && !str.includes('.')) {
        let parts = str.split(',');
        if (parts[parts.length - 1].length <= 2) {
            str = str.replace(/,/g, '.'); 
        } else {
            str = str.replace(/,/g, ''); 
        }
    } else if (str.includes('.') && !str.includes(',')) {
        let parts = str.split('.');
        if (parts[parts.length - 1].length === 2 && parts.length === 2) {
            // Biarkan
        } else {
            str = str.replace(/\./g, ''); 
        }
    }

    let num = parseFloat(str);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
}

// 3. Mesin Pembaca Excel & Pengambil Keputusan
function prosesInvestigasiBerkas(event) {
    const file = event.target.files[0];
    if (!file) return;

    Swal.fire({ title: 'Melakukan Audit Forensik...', html: 'Memeriksa integritas data Pangkalan Data vs Dokumen Asli...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            // A. Baca Excel Asli (LOGIKA 100% SAMA DENGAN APLIKASI SKPD)
            let data = new Uint8Array(e.target.result);
            let workbook = XLSX.read(data, {type: 'array'});
            let rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
            
            // Pencarian Kolom Realisasi Akurat
            let colAnggaran = []; let colRealisasi = []; let maxAnggaranCount = 0;
            for (let r = 0; r < 15 && r < rawData.length; r++) {
                let rowObj = rawData[r];
                if (!rowObj) continue;
                let tempAng = []; let tempRea = [];
                for (let c = 4; c < rowObj.length; c++) {
                    let cellVal = String(rowObj[c] || '').toLowerCase().trim();
                    if (cellVal === 'anggaran') tempAng.push(c);
                    else if (cellVal === 'realisasi') tempRea.push(c);
                }
                if (tempAng.length > maxAnggaranCount) {
                    maxAnggaranCount = tempAng.length;
                    colAnggaran = tempAng; colRealisasi = tempRea;
                }
            }
            if (colAnggaran.length === 0) colAnggaran = [5, 7, 9, 11];
            if (colRealisasi.length === 0) colRealisasi = [6, 8, 10, 12];

            let targetBelanjaExcel = 0;
            let targetPADExcel = 0;
            let trackerKode = "";

            // Menjumlahkan target realisasi murni dari Excel
            for (let i = 0; i < rawData.length; i++) {
                let row = rawData[i];
                if (!row || row.length === 0) continue;

                let col1 = row[0] ? String(row[0]).trim() : ''; 
                let col2 = row[1] ? String(row[1]).trim() : ''; 
                let col3 = row[2] ? String(row[2]).trim() : ''; 
                let col4 = row[3] ? String(row[3]).trim() : ''; 
                let uraian = row[4] ? String(row[4]).trim() : '';

                let textCol1 = col1.toLowerCase(); 
                let textCol2 = col2.toLowerCase(); 
                let textUraian = uraian.toLowerCase();

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
                
                if (/[a-zA-Z]/.test(kodeRekening)) { kodeRekening = ""; }
                if (kodeRekening) trackerKode = kodeRekening;

                let isBarisJumlah = textUraian.includes('jumlah') || textUraian === 'total' || textUraian.includes('surplus') || textUraian.includes('defisit');
                let isRowKodeText = (textCol1 === 'kode' || textUraian.includes('uraian urusan, organisasi'));

                let isRincian = false;
                if (isBarisJumlah || isRowKodeText) {
                    isRincian = false;
                } else if (!kodeRekening && uraian) {
                    isRincian = true;
                } else if (col4) { 
                    let tailBlocks = col4.split('.');
                    if (tailBlocks.length > 5) isRincian = true; 
                }

                if (isRincian && !isBarisJumlah) {
                    let realisasi = 0;
                    colRealisasi.forEach(idx => { realisasi += _parseIndoNum(row[idx]); });

                    // Gunakan TrackerKode yang menempel untuk tahu ini Belanja (5) atau PAD (4)
                    if (trackerKode.startsWith('5')) targetBelanjaExcel += realisasi;
                    else if (trackerKode.startsWith('4')) targetPADExcel += realisasi;
                    else targetBelanjaExcel += realisasi; // Fallback Aman
                }
            }

            // B. Tarik Data Ketikan (Cloud Firebase)
            let amanKode = auditAktif_KodeSkpd.replace(/\./g, '_');
            let urlLRA = `${FIREBASE_URL}lra_${auditAktif_Tahun}/${amanKode}.json`;
            let resLRA = await fetch(urlLRA, { cache: 'no-store' }).then(r => r.json()).catch(() => null);

            let terinputBelanjaCloud = 0;
            let terinputPADCloud = 0;

            if (resLRA) {
                for (let key in resLRA) {
                    let jsonKetikan = resLRA[key];
                    let totalBarisIni = _kalkulasiTotalJsonCerdas(jsonKetikan);
                    
                    // Kunci Identifier: R_5 untuk Belanja, R_4 untuk PAD
                    if (key.startsWith('R_5')) terinputBelanjaCloud += totalBarisIni;
                    else if (key.startsWith('R_4')) terinputPADCloud += totalBarisIni;
                    else terinputBelanjaCloud += totalBarisIni;
                }
            }

            // C. Periksa Tanda Tangan (TTD)
            let statusTTD = "-";
            let colorTTD = "color: #94a3b8; font-weight: 800;"; // Abu-abu Strip
            
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
            console.error(error);
            Swal.fire('Audit Dibatalkan', 'Gagal memproses berkas. Pastikan file Excel berasal dari SIPD.', 'error');
        }
        event.target.value = ''; // Kosongkan RAM Laptop Admin
    };
    reader.readAsArrayBuffer(file);
}

// 4. Logika Pengekstrak Nilai Uang (Super Ringan)
function _kalkulasiTotalJsonCerdas(jsonString) {
    let total = 0;
    if (!jsonString || jsonString.trim() === "") return 0;
    try {
        let parsed = JSON.parse(jsonString);
        
        // Auto-Heal untuk JSON yang dibungkus 2 kali
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

// 5. Tampilan Sertifikat Laporan Formal (DENGAN PERSENTASE)
function _tampilkanLaporanAudit(belanjaEx, belanjaCl, padEx, padCl, statTTD, colorTTD) {
    let formatRp = { minimumFractionDigits: 0 };
    
    // Fungsi Pembuat Label Persentase Pintar
    function _buatLabelStatus(targetExcel, terinputCloud) {
        if (targetExcel === 0 && terinputCloud === 0) {
            return `<span style="color: #94a3b8; font-weight: 800;">-</span>`;
        }
        
        let selisih = Math.abs(targetExcel - terinputCloud);
        let persen = targetExcel > 0 ? ((terinputCloud / targetExcel) * 100) : (terinputCloud > 0 ? 100 : 0);
        let persenStr = persen % 1 === 0 ? persen.toFixed(0) : persen.toFixed(2);

        // Ambang batas sangat akurat (mengatasi pecahan desimal mesin)
        if (selisih < 1 || persen >= 99.98) {
            return `<span style="color: #10b981; font-weight: 800; font-size: 13px;"><i class="fa-solid fa-check-circle me-1"></i> 100% SESUAI</span>`;
        } else {
            return `<span style="color: #dc2626; font-weight: 800; text-align: right; display: block; line-height: 1.4; font-size: 13px;">
                        BARU ${persenStr.replace('.', ',')}%<br>
                        <span style="font-size: 11px; color: #ef4444; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation me-1"></i> Selisih Rp ${selisih.toLocaleString('id-ID', formatRp)}</span>
                    </span>`;
        }
    }

    let lblBelanja = _buatLabelStatus(belanjaEx, belanjaCl);
    let lblPAD = _buatLabelStatus(padEx, padCl);

    let htmlLaporan = `
        <div style="text-align: left; font-family: Arial, sans-serif; font-size: 13px; color: #334155;">
            <div style="border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px;">
                <h6 style="color: #1e3a5f; font-weight: 800; margin: 0; text-transform: uppercase;">1. Nilai Rincian Realisasi:</h6>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #cbd5e1;">
                <span style="font-weight: 600;">➖ Belanja Daerah</span>
                <span>${lblBelanja}</span>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; margin-bottom: 20px;">
                <span style="font-weight: 600;">➖ Pendapatan (PAD)</span>
                <span>${lblPAD}</span>
            </div>

            <div style="border-bottom: 2px solid #1e3a5f; padding-bottom: 10px; margin-bottom: 15px;">
                <h6 style="color: #1e3a5f; font-weight: 800; margin: 0; text-transform: uppercase;">2. Autentikasi Pengesahan:</h6>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
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
