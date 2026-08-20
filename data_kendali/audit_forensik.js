// =========================================================================
// [MESIN AUDIT FORENSIK PUSAT] - VALIDASI KEBENARAN LRA SKPD (ULTIMATE V8.2)
// =========================================================================
// Dilengkapi Sensor Identitas Anti-Silang & Penarik Data Tanda Tangan (Jalur GET - Anti Gagal).
// Terhubung dengan Otak 'pendeteksi_3.js' dan 'script_3.js' milik SKPD.

const GAS_AUDIT_URL = "https://script.google.com/macros/s/AKfycbyhFPzwcma9noqUe-P-g0wcxgaC_uTzwySMOq5NQA_WTeVIXOZ9IZ94xzfAjpQc1R5XKw/exec";

document.addEventListener("DOMContentLoaded", function() {
    let inputAudit = document.createElement('input');
    inputAudit.type = 'file';
    inputAudit.id = 'fileAuditExcel';
    inputAudit.accept = '.xlsx, .xls, .csv';
    inputAudit.style.display = 'none';
    document.body.appendChild(inputAudit);

    inputAudit.addEventListener('change', prosesInvestigasiBerkas);
});

let auditAktif_KodeSkpd = "";
let auditAktif_NamaSkpd = "";
let auditAktif_Tahun = "2026"; 

window.mulaiAuditForensik = function(kodeSkpd, namaSkpd) {
    auditAktif_KodeSkpd = kodeSkpd;
    auditAktif_NamaSkpd = namaSkpd;
    
    Swal.fire({
        title: 'Validasi Kebenaran LRA',
        html: `<div style="font-size: 13px; color: #475569; margin-bottom: 15px;">Instansi: <b>${namaSkpd}</b><br><br>Sistem akan mengaudit kecocokan data dari server dengan dokumen asli SIPD. Silakan unggah berkas Excel LRA instansi ini.</div>`,
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
// 1. MESIN PEMBACA ANGKA CERDAS
// =====================================================================
function parseIndoNum(val) {
    if (!val) return 0;
    if (typeof val === 'number') return val;
    let str = String(val).trim();
    if (str === '-' || str === '') return 0;

    let isNeg = false;
    if (str.startsWith('(') && str.endsWith(')')) { isNeg = true; str = str.substring(1, str.length - 1).trim(); }
    else if (str.startsWith('-')) { isNeg = true; str = str.substring(1).trim(); }

    str = str.replace(/\s/g, '').replace(/%/g, '').replace(/Rp/gi, '');
    if (str.includes('.') && str.includes(',')) { str = str.replace(/\./g, '').replace(/,/g, '.'); }
    else if (str.includes(',') && !str.includes('.')) { let pts = str.split(','); if(pts[pts.length-1].length<=2) str=str.replace(/,/g,'.'); else str=str.replace(/,/g,''); }
    else if (str.includes('.') && !str.includes(',')) { let pts = str.split('.'); if(pts[pts.length-1].length===2 && pts.length===2){} else str=str.replace(/\./g,''); }
    
    let num = parseFloat(str);
    return isNeg ? -num : (isNaN(num) ? 0 : num);
}

// =====================================================================
// 2. MESIN DETEKTOR KUALITAS TEKS (FORENSIK)
// =====================================================================
function _cekKualitasTeksForensik(teks) {
    let bersih = teks.replace(/<[^>]*>?/gm, '').trim(); 
    bersih = bersih.replace(/\s+/g, ' ');

    if (bersih === '') return "OK";
    
    let hurufSaja = bersih.replace(/[^a-zA-Z]/g, '');  
    if (hurufSaja.length < 15) return "Teks Kurang (Min. 15 Huruf)";
    // if (/([a-zA-Z])\1{4,}/.test(bersih.toLowerCase())) return "Karakter Berulang (Ngawur)"; 
    // if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(bersih)) return "Konsonan Beruntun (Ngawur)"; 
    // if (/\b[a-zA-Z]{25,}\b/.test(bersih)) return "Kata Terlalu Panjang (Ngawur)"; 
    
    return "OK";
}

function _ekstrakDataForensik(jsonString) {
    let total = 0;
    let textGabungan = "";
    if (!jsonString || jsonString.trim() === "") return { totalHitung: 0, printText: "" };
    
    try {
        let parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0].sub === 'string') {
            let innerText = parsed[0].sub.trim();
            if (innerText.startsWith('[') && innerText.endsWith(']')) {
                try { parsed = JSON.parse(innerText); } catch(e){}
            }
        }
        
        if (Array.isArray(parsed)) {
            parsed.forEach(g => {
                if(g.sub) textGabungan += g.sub + " ";
                if(g.items) g.items.forEach(i => { total += (parseFloat(i.t) || 0); if(i.u) textGabungan += i.u + " "; });
            });
        } else if (parsed && parsed.items) {
            if(parsed.sub) textGabungan += parsed.sub + " ";
            parsed.items.forEach(i => { total += (parseFloat(i.t) || 0); if(i.u) textGabungan += i.u + " "; });
        }
    } catch(e) {}
    
    return { totalHitung: total, printText: textGabungan };
}

// =====================================================================
// 3. PROSES UTAMA INVESTIGASI (ULTIMATE PREMIUM)
// =====================================================================
function prosesInvestigasiBerkas(event) {
    const file = event.target.files[0];
    if (!file) return;

    Swal.fire({ title: 'Mengecek Berdasarkan Data SIPD...', html: 'Mencocokkan baris per baris Excel dengan Pangkalan Data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            // [INJEKSI DEWA 1: URL FIREBASE LOKAL ANTI-ERROR]
            // Karena FIREBASE_URL di file utama sudah disembunyikan (Jubah Gaib), 
            // kita panggil URL-nya secara mandiri di sini agar tidak Error!
            const URL_FB_AUDIT = (function() { return "https://lra-luwu-2026-default-rtdb.asia-southeast1.firebasedatabase.app/"; })();

            let data = new Uint8Array(e.target.result);
            let workbook = XLSX.read(data, {type: 'array'});
            let rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
            
            let kodeSkpdExcel = "";
            let namaSkpdExcel = "Instansi Tidak Dikenali / Format Salah";
            
            for (let r = 0; r < 30 && r < rawData.length; r++) {
                let row = rawData[r];
                if (!row) continue;
                let c1 = String(row[0] || '').trim(); let c2 = String(row[1] || '').trim();
                let c3 = String(row[2] || '').trim(); let c4 = String(row[3] || '').trim();
                let uraian = String(row[4] || '').trim();
                
                let segmen = [];
                if (c1) segmen.push(c1); if (c2) segmen.push(c2);
                if (c3) segmen.push(c3); if (c4) segmen.push(c4);
                let kodeRek = segmen.join('.');
                
                if (/[a-zA-Z]/.test(kodeRek)) kodeRek = "";
                let dots = (kodeRek.match(/\./g) || []).length;
                let textCol1 = c1.toLowerCase();
                
                if (kodeRek && (kodeRek.endsWith('.0000') || (dots >= 6 && dots <= 10))) {
                    if (textCol1 !== 'kode') {
                        if (!kodeSkpdExcel || (kodeRek.endsWith('.0000') && !kodeSkpdExcel.endsWith('.0000'))) {
                            kodeSkpdExcel = kodeRek;
                            namaSkpdExcel = uraian.toUpperCase();
                        }
                    }
                }
            }

            // === [INJEKSI DEWA 2: PENYAMAAN FREKUENSI KODE & NAMA (FUZZY LOGIC)] ===
            let isCocok = false;
            
            let targetKodeNormal = auditAktif_KodeSkpd.replace(/_/g, '.'); 
            let targetKodeBersih = targetKodeNormal.replace(/\.0000/g, '');
            let excelKodeBersih = kodeSkpdExcel.replace(/\.0000/g, '');
            
            let namaTarget = auditAktif_NamaSkpd.toUpperCase().trim();
            let namaExcel = namaSkpdExcel.toUpperCase().trim();

            if (kodeSkpdExcel === targetKodeNormal || 
               (excelKodeBersih && targetKodeBersih && (excelKodeBersih.startsWith(targetKodeBersih) || targetKodeBersih.startsWith(excelKodeBersih)))) {
                isCocok = true;
            }

            let hapusKataUmum = /(BADAN|DINAS|KANTOR|KECAMATAN|SEKRETARIAT|KABUPATEN|LUWU|PEMERINTAH|DAERAH|PROVINSI|\s)/g;
            let namaTargetClean = namaTarget.replace(hapusKataUmum, '');
            let namaExcelClean = namaExcel.replace(hapusKataUmum, '');

            if (namaTarget === namaExcel || namaExcelClean.includes(namaTargetClean) || namaTargetClean.includes(namaExcelClean)) {
                isCocok = true;
            }
            // ====================================================================

            if (!isCocok) {
                Swal.fire({
                    icon: 'error',
                    title: 'DOKUMEN DITOLAK!',
                    html: `<div style="font-size: 13px; text-align: left; line-height: 1.5;">
                           Anda sedang mengaudit instansi:<br><b>${auditAktif_NamaSkpd}</b><br><br>
                           Namun berkas Excel yang diunggah milik:<br><b style="color:#dc2626;">${namaSkpdExcel}</b><br><br>
                           <i style="color:#64748b;">Sistem memblokir proses ini untuk mencegah audit silang yang tidak valid.</i></div>`,
                    confirmButtonColor: '#1e3a5f',
                    confirmButtonText: 'Mengerti'
                });
                event.target.value = ''; 
                return; 
            }

            // A. BACA EXCEL ASLI
            let colAnggaran = []; let colRealisasi = []; let maxAngCount = 0;
            for (let r = 0; r < 15 && r < rawData.length; r++) {
                if (!rawData[r]) continue;
                let tempAng = []; let tempRea = [];
                for (let c = 4; c < rawData[r].length; c++) {
                    let cellVal = String(rawData[r][c] || '').toLowerCase().trim();
                    if (cellVal === 'anggaran') tempAng.push(c);
                    else if (cellVal === 'realisasi') tempRea.push(c);
                }
                if (tempAng.length > maxAngCount) { maxAngCount = tempAng.length; colAnggaran = tempAng; colRealisasi = tempRea; }
            }
            if (colAnggaran.length === 0) colAnggaran = [5, 7, 9, 11];
            if (colRealisasi.length === 0) colRealisasi = [6, 8, 10, 12];

            let rincianExcel = [];
            let trackerKode = "";

            for (let i = 0; i < rawData.length; i++) {
                let row = rawData[i];
                if (!row || row.length === 0) continue;

                let col1 = row[0] ? String(row[0]).trim() : ''; let col2 = row[1] ? String(row[1]).trim() : ''; 
                let col3 = row[2] ? String(row[2]).trim() : ''; let col4 = row[3] ? String(row[3]).trim() : ''; 
                let uraian = row[4] ? String(row[4]).trim() : '';

                let textCol1 = col1.toLowerCase(); let textCol2 = col2.toLowerCase(); let textUraian = uraian.toLowerCase();

                if (textCol1 === '1' && (textCol2 === '2' || textUraian === '2' || textUraian === '3')) continue;
                if (textCol1.includes('kab. luwu') || textUraian.includes('kab. luwu')) continue;
                if (textCol1.includes('rekapitulasi') || textUraian.includes('rekapitulasi')) continue;
                if (textCol1.includes('beserta hasil') || textUraian.includes('beserta hasil')) continue;

                let fullKode = col1 + col2 + col3 + col4;
                if (!fullKode && !uraian) continue; 

                let kodeRek = [col1, col2, col3, col4].filter(Boolean).join('.');
                if (/[a-zA-Z]/.test(kodeRek)) kodeRek = "";
                if (kodeRek) trackerKode = kodeRek;

                let isBarisJumlah = textUraian.includes('jumlah') || textUraian === 'total' || textUraian.includes('surplus') || textUraian.includes('defisit');
                let isRowKodeText = (textCol1 === 'kode' || textUraian.includes('uraian urusan, organisasi'));
                
                let isRincian = false;
                if (!isBarisJumlah && !isRowKodeText) {
                    if (!kodeRek && uraian) isRincian = true;
                    else if (col4) { let tails = col4.split('.'); if (tails.length > 5) isRincian = true; }
                }

                if (isRincian) {
                    let realisasi = 0;
                    colRealisasi.forEach(idx => { realisasi += parseIndoNum(row[idx]); });

                    if (realisasi > 0) {
                        let safeKode = trackerKode.replace(/[^a-zA-Z0-9]/g, "");
                        let safeUraian = uraian.substring(0, 25).replace(/[^a-zA-Z0-9]/g, "");
                        
                        rincianExcel.push({
                            rowID: `R_${safeKode}_${safeUraian}`,
                            isPAD: trackerKode.startsWith('4'),
                            realisasi: realisasi
                        });
                    }
                }
            }

            // B. TARIK DATA CLOUD MENGGUNAKAN URL LOKAL
            let amanKode = auditAktif_KodeSkpd.replace(/\./g, '_');
            
            // --> Memakai URL_FB_AUDIT agar fungsi ini bisa berdiri mandiri!
            let resLRA = await fetch(`${URL_FB_AUDIT}lra_${auditAktif_Tahun}/${amanKode}.json`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);

            let belanjaEx = 0, belanjaCl = 0;
            let padEx = 0, padCl = 0;
            let errKosong = 0, errSelisih = 0, errDraf = 0;

            rincianExcel.forEach(item => {
                if (item.isPAD) padEx += item.realisasi;
                else belanjaEx += item.realisasi;

                let cloudJson = resLRA ? resLRA[item.rowID] : null;

                if (!cloudJson || cloudJson === '[]' || cloudJson === '""') {
                    errKosong++;
                    return; 
                }

                let dataExtracted = _ekstrakDataForensik(cloudJson);
                let hitung = dataExtracted.totalHitung;
                let text = dataExtracted.printText;

                if (item.isPAD) padCl += hitung;
                else belanjaCl += hitung;

                if (Math.abs(hitung - item.realisasi) >= 1) {
                    errSelisih++;
                } else {
                    if (_cekKualitasTeksForensik(text) !== "OK") {
                        errDraf++;
                    }
                }
            });

            // C. TARIK DATA TANDA TANGAN 
            let statusTTD = `<span style="color: #94a3b8; font-weight: 800;">-</span>`; 
            try {
                let kodeSkpdTitik = auditAktif_KodeSkpd.replace(/_/g, '.');
                let getUrlGAS = `${GAS_AUDIT_URL}?action=load_ttd&tahun=${auditAktif_Tahun}&kode_skpd=${kodeSkpdTitik}&secret_key=Luwu.2026`;
                
                let resTTD = await fetch(getUrlGAS).then(r => r.json());
                
                if (resTTD.status === 'success' && resTTD.data) {
                    if (resTTD.data.nama && resTTD.data.nama !== 'NAMA KEPALA SKPD') {
                        let nma = resTTD.data.nama;
                        let nip = resTTD.data.nip || '-';
                        
                        statusTTD = `
                            <div style="text-align: right; line-height: 1.3; margin-top: 4px;">
                                <span style="color: #10b981; font-weight: 800; font-size: 11px; letter-spacing: 0.5px;"><i class="fa-solid fa-file-signature me-1"></i> NAMA PEJABAT</span><br>
                                <span style="color: #0f172a; font-weight: 800; font-size: 13px; text-transform: uppercase;">${nma}</span><br>
                                <span style="color: #64748b; font-size: 11px; font-family: monospace; letter-spacing: 0.5px;">${nip}</span>
                            </div>
                        `;
                    }
                }
            } catch (err) { console.warn("Pengecekan TTD dialihkan.", err); }

            // D. CETAK LAPORAN
            _tampilkanLaporanAudit(belanjaEx, belanjaCl, padEx, padCl, errKosong, errSelisih, errDraf, statusTTD);
            
        } catch (error) {
            console.error(error); // Untuk membantu jika ada error lain
            Swal.fire('Audit Dibatalkan', 'Gagal memproses berkas. Pastikan file Excel berasal dari SIPD.', 'error');
        }
        event.target.value = ''; 
    };
    reader.readAsArrayBuffer(file);
}

// =====================================================================
// 4. DESAIN VISUAL LAPORAN AUDIT ELEGAN (DENGAN IDENTITAS SKPD)
// =====================================================================
function _tampilkanLaporanAudit(belanjaEx, belanjaCl, padEx, padCl, errKosong, errSelisih, errDraf, statTTD) {
    let formatRp = { minimumFractionDigits: 0 };
    
    function _buatLabelStatus(target, terinput) {
        if (target === 0) return `<span style="color: #94a3b8 !important; font-weight: 800;">-</span>`;
        let selisih = Math.abs(target - terinput);
        let persen = target > 0 ? ((terinput / target) * 100) : 0;
        let persenStr = persen.toFixed(2);

        // [DIUBAH JADI SANGAT JUJUR]: 
        // 1. Selisih mutlak harus di bawah 1 rupiah (selisih < 1) ATAU 
        // 2. Persentasenya benar-benar berada di rentang 99.995% hingga 100.00% pas!
        // Jika masih 99.99%, dia TIDAK AKAN MASUK KONDISI VALID HIJAU, melainkan masuk ke blok merah selisih!
        let isBenarTuntas = selisih < 1 || (persen >= 99.995 && persen <= 100);

        if (isBenarTuntas) {
            return `<span style="color: #10b981 !important; font-weight: 900; font-size: 13px;"><i class="fa-solid fa-check-circle me-1" style="color: #10b981 !important;"></i> VALID (100% SESUAI)</span>`;
        } else {
            return `<span style="color: #1e293b !important; font-weight: 800; text-align: right; display: block; line-height: 1.4; font-size: 13px;">
                        Persentase inputan : <span style="color: #dc2626 !important;">${persenStr.replace('.', ',')}%</span><br>
                        <span style="font-size: 11px; color: #475569 !important; font-weight: 600;">
                            <i class="fa-solid fa-triangle-exclamation" style="color: #dc2626 !important;"></i> Selisih Rp <span style="color: #dc2626 !important;">${selisih.toLocaleString('id-ID', formatRp)}</span>
                        </span>
                    </span>`;
        }
    }

    let totalPelanggaran = errKosong + errSelisih + errDraf;
    let htmlForensik = "";
    
    if (belanjaEx === 0 && padEx === 0) {
        htmlForensik = `<div style="color: #94a3b8; font-weight: 600; text-align: center; font-style: italic;">Tidak Ada Data Ditemukan</div>`;
    } else if (totalPelanggaran === 0) {
        htmlForensik = `<div style="color: #10b981; font-weight: 800; padding: 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; text-align: center;"><i class="fa-solid fa-shield-check me-2"></i> 100% Seluruh Baris Valid & Lengkap</div>`;
    } else {
        let list = "";
        if (errKosong > 0) list += `<div style="color: #dc2626; font-weight: 600; margin-bottom: 6px;"><i class="fa-solid fa-xmark-circle me-2"></i> ${errKosong} Baris Belum Diisi / Kosong</div>`;
        if (errSelisih > 0) list += `<div style="color: #ea580c; font-weight: 600; margin-bottom: 6px;"><i class="fa-solid fa-scale-unbalanced me-2"></i> ${errSelisih} Baris Masih Selisih Angka</div>`;
        if (errDraf > 0) list += `<div style="color: #ca8a04; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation me-2"></i> ${errDraf} Baris Ketikan Asal/Ngawur</div>`;
        htmlForensik = `<div style="padding: 12px; background: #fff5f5; border: 1px dashed #fecaca; border-radius: 8px;">${list}</div>`;
    }

    let htmlLaporan = `
        <div style="text-align: left; font-family: Arial, sans-serif; font-size: 13px; color: #334155;">
            
            <!-- [INJEKSI DEWA] KOTAK IDENTITAS SKPD PREMIUM -->
            <div style="background: linear-gradient(to right, #f8fafc, #f1f5f9); border: 1px solid #cbd5e1; border-left: 4px solid #1e3a5f; border-radius: 6px; padding: 12px 15px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <div style="font-size: 10px; color: #64748b; font-weight: 800; letter-spacing: 1px; margin-bottom: 4px; text-transform: uppercase;"><i class="fa-solid fa-building-columns me-1"></i> HASIL KESESUAIAN DATA SKPD :</div>
                <div style="font-size: 13px; color: #0f172a; font-weight: 900; text-transform: uppercase; line-height: 1.3;">${auditAktif_NamaSkpd}</div>
            </div>
            
            <div style="border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px;">
                <h6 style="color: #1e3a5f; font-weight: 800; margin: 0; text-transform: uppercase;">1. Nilai Rincian Realisasi:</h6>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px dashed #cbd5e1;">
                <span style="font-weight: 600;">➖ Belanja Daerah</span>
                <span>${_buatLabelStatus(belanjaEx, belanjaCl)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; margin-bottom: 20px;">
                <span style="font-weight: 600;">➖ Pendapatan (PAD)</span>
                <span>${_buatLabelStatus(padEx, padCl)}</span>
            </div>

            <div style="border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px;">
                <h6 style="color: #1e3a5f; font-weight: 800; margin: 0; text-transform: uppercase;">2. Integritas Rincian :</h6>
            </div>
            <div style="margin-bottom: 20px;">
                ${htmlForensik}
            </div>

            <div style="border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px;">
                <h6 style="color: #1e3a5f; font-weight: 800; margin: 0; text-transform: uppercase;">3. PEJABAT PENANDA TANGAN:</h6>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 0;">
                <span style="font-weight: 600; margin-top: 4px;">➖ TTD Pejabat</span>
                <span>${statTTD}</span>
            </div>

        </div>
    `;

    Swal.fire({
        // Judul disesuaikan sedikit agar lebih general, nama spesifik masuk ke kotak premium di bawahnya
        title: '<span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 1px;"><i class="fa-solid fa-file-shield text-primary me-2"></i> RINGKASAN DATA ASLI SIPD</span>',
        html: htmlLaporan,
        confirmButtonColor: '#1e3a5f',
        confirmButtonText: 'Tutup',
        width: '550px'
    });
}
