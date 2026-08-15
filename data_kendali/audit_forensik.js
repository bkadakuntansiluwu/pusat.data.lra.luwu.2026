// =========================================================================
// [MESIN AUDIT FORENSIK PUSAT] - VALIDASI KEBENARAN LRA SKPD (ULTIMATE V8.1)
// =========================================================================
// Dilengkapi Sensor Identitas Anti-Silang & Penarik Data Tanda Tangan (Nama + NIP).
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
    if (/([a-zA-Z])\1{4,}/.test(bersih.toLowerCase())) return "Karakter Berulang (Ngawur)"; 
    if (/[bcdfghjklmnpqrstvwxyz]{6,}/i.test(bersih)) return "Konsonan Beruntun (Ngawur)"; 
    if (/\b[a-zA-Z]{25,}\b/.test(bersih)) return "Kata Terlalu Panjang (Ngawur)"; 
    
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
// 3. PROSES UTAMA INVESTIGASI
// =====================================================================
function prosesInvestigasiBerkas(event) {
    const file = event.target.files[0];
    if (!file) return;

    Swal.fire({ title: 'Melakukan Audit Forensik...', html: 'Mencocokkan baris per baris Excel dengan Pangkalan Data...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const reader = new FileReader();
    reader.onload = async function(e) {
        try {
            let data = new Uint8Array(e.target.result);
            let workbook = XLSX.read(data, {type: 'array'});
            let rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
            
            // SENSOR IDENTITAS SKPD KUNCI GANDA (KODE + NAMA TEKS)
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

            let isCocok = false;
            let targetKodeBersih = auditAktif_KodeSkpd.replace(/\.0000/g, '');
            let excelKodeBersih = kodeSkpdExcel.replace(/\.0000/g, '');
            
            let namaTarget = auditAktif_NamaSkpd.toUpperCase().trim();
            let namaExcel = namaSkpdExcel.toUpperCase().trim();

            if (kodeSkpdExcel === auditAktif_KodeSkpd || 
               (excelKodeBersih && targetKodeBersih && (excelKodeBersih.startsWith(targetKodeBersih) || targetKodeBersih.startsWith(excelKodeBersih)))) {
                isCocok = true;
            }
            if (namaTarget === namaExcel || namaExcel.includes(namaTarget) || namaTarget.includes(namaExcel)) {
                isCocok = true;
            }

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

            // B. TARIK DATA CLOUD & JALANKAN MESIN PENDETEKSI
            let amanKode = auditAktif_KodeSkpd.replace(/\./g, '_');
            let resLRA = await fetch(`${FIREBASE_URL}lra_${auditAktif_Tahun}/${amanKode}.json`, { cache: 'no-store' }).then(r => r.json()).catch(() => null);

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

            // C. TARIK DATA TANDA TANGAN (TTD) DARI GOOGLE APPS SCRIPT
            let statusTTD = `<span style="color: #94a3b8; font-weight: 800;">-</span>`; 
            try {
                // [PERBAIKAN CERDAS]: Ubah format garis bawah (_) kembali menjadi titik (.) karena GAS menyimpannya dengan titik
                let kodeSkpdTitik = auditAktif_KodeSkpd.replace(/_/g, '.');
                
                // [PERBAIKAN CERDAS]: Ambil Kunci Rahasia Admin yang tersimpan di memori browser
                let sandiAdmin = sessionStorage.getItem("LRA_ADMIN_TOKEN_X7") || "Luwu.2026";
                
                let payloadTTD = { 
                    action: 'load_ttd', 
                    tahun: auditAktif_Tahun, 
                    kode_skpd: kodeSkpdTitik, // Menggunakan format titik
                    secret_key: sandiAdmin // Menyertakan kunci otorisasi
                };
                
                let resTTD = await fetch(GAS_AUDIT_URL, { 
                    method: "POST", 
                    body: JSON.stringify(payloadTTD) 
                }).then(r => r.json());
                
                if (resTTD.status === 'success' && resTTD.data) {
                    if (resTTD.data.nama && resTTD.data.nama !== 'NAMA KEPALA SKPD') {
                        // Membongkar Data Nama & NIP
                        let nma = resTTD.data.nama;
                        let nip = resTTD.data.nip || '-';
                        
                        // Membangun Tampilan TTD yang Mewah dan Berkelas
                        statusTTD = `
                            <div style="text-align: right; line-height: 1.3; margin-top: 4px;">
                                <span style="color: #10b981; font-weight: 800; font-size: 11px; letter-spacing: 0.5px;"><i class="fa-solid fa-file-signature me-1"></i> TEREKAM DI SERVER</span><br>
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
            Swal.fire('Audit Dibatalkan', 'Gagal memproses berkas. Pastikan file Excel berasal dari SIPD.', 'error');
        }
        event.target.value = ''; 
    };
    reader.readAsArrayBuffer(file);
}

// =====================================================================
// 4. DESAIN VISUAL LAPORAN AUDIT ELEGAN
// =====================================================================
function _tampilkanLaporanAudit(belanjaEx, belanjaCl, padEx, padCl, errKosong, errSelisih, errDraf, statTTD) {
    let formatRp = { minimumFractionDigits: 0 };
    
    function _buatLabelStatus(target, terinput) {
        if (target === 0) return `<span style="color: #94a3b8; font-weight: 800;">-</span>`;
        let selisih = Math.abs(target - terinput);
        let persen = target > 0 ? ((terinput / target) * 100) : 0;
        let persenStr = persen % 1 === 0 ? persen.toFixed(0) : persen.toFixed(2);

        if (selisih < 1 || persen >= 99.98) {
            return `<span style="color: #10b981; font-weight: 800; font-size: 13px;"><i class="fa-solid fa-check-circle me-1"></i> VALID (100% SESUAI)</span>`;
        } else {
            return `<span style="color: #dc2626; font-weight: 800; text-align: right; display: block; line-height: 1.4; font-size: 13px;">
                        BARU ${persenStr.replace('.', ',')}%<br>
                        <span style="font-size: 11px; color: #ef4444; font-weight: 600;"><i class="fa-solid fa-triangle-exclamation me-1"></i> Selisih Rp ${selisih.toLocaleString('id-ID', formatRp)}</span>
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
                <h6 style="color: #1e3a5f; font-weight: 800; margin: 0; text-transform: uppercase;">2. Integritas Rincian (Forensik):</h6>
            </div>
            <div style="margin-bottom: 20px;">
                ${htmlForensik}
            </div>

            <div style="border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; margin-bottom: 12px;">
                <h6 style="color: #1e3a5f; font-weight: 800; margin: 0; text-transform: uppercase;">3. Autentikasi Pengesahan:</h6>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 0;">
                <span style="font-weight: 600; margin-top: 4px;">➖ TTD Pejabat</span>
                <span>${statTTD}</span>
            </div>

        </div>
    `;

    Swal.fire({
        title: '<span style="font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: 1px;"><i class="fa-solid fa-file-shield text-primary me-2"></i> HASIL AUDIT FORENSIK SKPD</span>',
        html: htmlLaporan,
        confirmButtonColor: '#1e3a5f',
        confirmButtonText: 'Tutup Laporan',
        width: '550px'
    });
}
