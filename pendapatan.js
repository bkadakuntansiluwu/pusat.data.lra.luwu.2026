

let globalRawPAD = null;

function prosesUploadPAD(event) {
    const file = event.target.files[0];
    if (!file) return;

    const namaFile = file.name.toLowerCase();
    if (!namaFile.endsWith('.xlsx') && !namaFile.endsWith('.xls') && !namaFile.endsWith('.csv')) {
        Swal.fire({ icon: 'error', title: 'Format Ditolak!', text: 'Maaf, file yang diupload bukan Excel. Silakan gunakan file LRA resmi!', confirmButtonColor: '#d33' });
        event.target.value = ''; return;
    }

    Swal.fire({ title: 'Sementara Proses...', text: 'Membaca File Data PAD Anda...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); }});

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            let rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});
            
            let formatValid = false;
            for (let r = 0; r < 20 && r < rawData.length; r++) {
                let barisString = String(rawData[r] || '').toLowerCase();
                if (barisString.includes('anggaran') && barisString.includes('realisasi')) { formatValid = true; break; }
            }
            if (!formatValid) {
                Swal.fire({ icon: 'warning', title: 'Isi Dokumen Tidak Sesuai!', html: 'Maaf, file ini bukan format LRA standar.<br>Tidak ditemukan kolom <b>Anggaran</b> & <b>Realisasi</b>.', confirmButtonColor: '#f59e0b' });
                event.target.value = ''; return;
            }

            globalRawPAD = rawData;
			try {
                sessionStorage.setItem('PAD_RAW_DATA', JSON.stringify(rawData));
            } catch (err) {}
            let sukses = injeksiDataPADkeTabel(); 
            event.target.value = ''; 
            
            if (sukses) {
                
                Swal.fire({
                    html: `
                        <div style="display: flex; align-items: center; text-align: left; gap: 16px;">
                            <div style="background: linear-gradient(135deg, #10b981, #059669); min-width: 45px; height: 45px; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);">
                                <i class="fa-solid fa-check" style="color: #ffffff; font-size: 20px;"></i>
                            </div>
                            <div>
                                <div style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 800; color: #0f172a; font-size: 15px; letter-spacing: 0.3px; margin-bottom: 2px;">Tabel PAD Berhasil Dimuat</div>
                                <div style="font-family: 'Segoe UI', Arial, sans-serif; font-weight: 500; color: #64748b; font-size: 12px;">Data pendapatan siap untuk dikerjakan.</div>
                            </div>
                        </div>
                    `,
                    showConfirmButton: false,
                    timer: 2000,
                    width: '360px', 
                    padding: '20px',
                    backdrop: 'rgba(15, 23, 42, 0.4)', 
                    background: '#ffffff'
                });
            }
        } catch (error) {
            Swal.fire({ icon: 'error', title: 'Gagal Membaca File!', text: 'File rusak atau tidak dapat dibaca. Silakan download ulang dari SIPD.', confirmButtonColor: '#d33' });
            event.target.value = ''; 
        }
    };
    reader.readAsArrayBuffer(file);
}

function injeksiDataPADkeTabel() {
    let tbody = document.getElementById('containerRender');
    if (!tbody || !globalRawPAD || globalRawPAD.length === 0) return false;
    if (typeof window.backupBrankasDraf === 'function') window.backupBrankasDraf();
    document.querySelectorAll('.row-khusus-pad').forEach(el => el.remove());

    let namaDinasPAD = "";
    for (let i = 0; i < 5; i++) {
        if (globalRawPAD[i]) {
            for (let j = 0; j < 3; j++) {
                let text = String(globalRawPAD[i][j] || '').trim().toUpperCase();
                if (text && !text.includes('PEMERINTAH') && !text.includes('LAPORAN') && !text.includes('TAHUN') && !text.includes('S.D') && !text.match(/^[0-9\.\-\s]+$/)) {
                    namaDinasPAD = text;
                    break;
                }
            }
        }
        if (namaDinasPAD) break;
    }
    if(!namaDinasPAD) namaDinasPAD = "PENDAPATAN DAERAH";

    let headerSkpdElement = document.getElementById('headerNamaSkpd');
    let namaBelanja = headerSkpdElement ? headerSkpdElement.innerText.toUpperCase() : 'BELUM ADA DATA SKPD';
    
    if (kodeSkpdAktif && namaBelanja !== 'BELUM ADA DATA SKPD') {
        let cleanPad = namaDinasPAD.replace(/(BADAN|DINAS|KANTOR|KECAMATAN|SEKRETARIAT|KABUPATEN|LUWU|PEMERINTAH|DAERAH|PROVINSI)/g, '').trim();
        let cleanBelanja = namaBelanja.replace(/(BADAN|DINAS|KANTOR|KECAMATAN|SEKRETARIAT|KABUPATEN|LUWU|PEMERINTAH|DAERAH|PROVINSI)/g, '').trim();
        
        let isMatch = false;
        if (cleanBelanja.includes(cleanPad) || cleanPad.includes(cleanBelanja)) {
            isMatch = true;
        } else {
            let wPad = cleanPad.split(' ').filter(w => w.length > 3);
            let matchCount = wPad.filter(w => cleanBelanja.includes(w)).length;
            if (matchCount >= Math.min(1, wPad.length) && wPad.length > 0) {
                isMatch = true;
            }
        }
        
        if (!isMatch) {
            Swal.fire({
                icon: 'info', 
                title: '<span style="font-family: \'Segoe UI\', Arial, sans-serif; font-weight: 800; color: #0f172a; font-size: 22px; letter-spacing: -0.5px;">AKSES DITOLAK</span>',
                html: `
                    <div style="text-align: left; font-family: 'Segoe UI', Arial, sans-serif; font-size: 13px; color: #475569; line-height: 1.6;">
                        <p style="margin-bottom: 16px;">Terdeteksi pergantian dokumen <b>Belanja Daerah</b> dari instansi yang berbeda. Untuk menjaga akurasi laporan, data <b>Pendapatan (PAD)</b> dari instansi sebelumnya telah dikosongkan secara otomatis.</p>
                        
                        <!-- Kotak Info File PAD (Yang Dihapus Sistem) -->
                        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 12px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                            <div style="font-size: 10px; color: #991b1b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Pendapatan Daerah (Saat Ini) Milik:</div>
                            <div style="font-weight: 800; color: #7f1d1d; font-size: 14px;">${namaDinasPAD}</div>
                        </div>

                        <!-- Kotak Info File Belanja (Yang Sedang Aktif) -->
                        <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 12px 16px; margin-bottom: 20px; border-radius: 4px; box-shadow: 0 1px 2px rgba(0,0,0,0.02);">
                            <div style="font-size: 10px; color: #166534; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; font-weight: 600;">Belanja Daerah Aktif (Saat Ini):</div>
                            <div style="font-weight: 800; color: #14532d; font-size: 14px;">${namaBelanja}</div>
                        </div>
                        
                        <div style="background-color: #f8fafc; padding: 10px; border-radius: 6px; font-weight: 600; color: #334155; font-size: 12px; display: flex; align-items: center;">
                            <i class="fa-solid fa-circle-info text-primary me-2" style="font-size: 16px;"></i> 
                            Catatan: Apabila SKPD terkait memiliki rincian PAD, mohon unggah dokumen PAD yang sesuai.
                        </div>
                    </div>
                `,
                confirmButtonColor: '#0f172a',
                confirmButtonText: '<i class="fa-solid fa-check-double me-1"></i> Saya Mengerti',
                background: '#ffffff',
                padding: '1.5rem',
                backdrop: `rgba(15, 23, 42, 0.6)` 
            });

            globalRawPAD = null; 
            sessionStorage.removeItem('PAD_RAW_DATA'); 
            // --------------------------------------------------
            
            return false; 
        }
        
    } 
    else if (!kodeSkpdAktif) {
        kodeSkpdAktif = "PAD_" + namaDinasPAD.replace(/[^A-Z0-9]/g, '_');
        
        let metaOrg = document.getElementById('metaOrganisasi');
        let metaUrs = document.getElementById('metaUrusan');
        if (metaOrg) metaOrg.innerText = ": " + namaDinasPAD;
        if (metaUrs) metaUrs.innerText = ": PENDAPATAN DAERAH";
        if (headerSkpdElement) headerSkpdElement.innerText = namaDinasPAD.toLowerCase();
        
        let placeholder = tbody.querySelector('td.py-5');
        if (placeholder) {
            let tr = placeholder.closest('tr');
            if (tr) tr.remove();
        }

        if (typeof updateInfoTandaTangan === 'function') updateInfoTandaTangan();
        if (typeof tarikDataSiluman === 'function') setTimeout(() => tarikDataSiluman(true), 1000);
    }

    let colAng = 2; let colRea = 3; 
    for (let r = 0; r < 15 && r < globalRawPAD.length; r++) {
        let rowObj = globalRawPAD[r];
        if (!rowObj) continue;
        for (let c = 0; c < rowObj.length; c++) {
            let cellVal = String(rowObj[c] || '').toLowerCase().trim();
            if (cellVal === 'anggaran') colAng = c;
            if (cellVal.includes('realisasi') && !cellVal.includes('2025') && !cellVal.includes('lalu')) colRea = c; 
        }
    }

    let padFragment = document.createDocumentFragment();
    let trackerKode = "";
    let validPADCount = 0;

    for (let i = 0; i < globalRawPAD.length; i++) {
        let row = globalRawPAD[i];
        if (!row || row.length === 0) continue;

        let col1 = row[0] ? String(row[0]).trim() : ''; 
        let uraian = row[1] ? String(row[1]).trim() : '';
        let textUraian = uraian.toLowerCase();
        
        if (col1 && /[a-zA-Z]/.test(col1)) continue;

        if (col1.startsWith('5') || textUraian.includes('belanja daerah')) continue;
        if (!col1.startsWith('4') && !textUraian.includes('jumlah pendapatan') && !textUraian.includes('jumlah lain lain')) continue;
        
        if (col1.startsWith('4')) validPADCount++; 

        let anggaran = parseIndonesianNumberPAD(row[colAng]);
        let realisasi = parseIndonesianNumberPAD(row[colRea]);
        
        if (anggaran === 0 && realisasi === 0 && !textUraian.includes('jumlah')) continue;

        let selisih = realisasi - anggaran;
        let persentase = anggaran > 0 ? ((realisasi / anggaran) * 100).toFixed(2) : '0,00';
        
        if (col1) trackerKode = col1;

        let isBarisJumlah = textUraian.includes('jumlah');
        let paddingLevel = 1; let textStyle = 'style-bold'; let isRincian = false;

        if (isBarisJumlah) { paddingLevel = 1; textStyle = 'style-bold'; isRincian = false; } 
        else if (col1) {
            let dots = (col1.match(/\./g) || []).length;
            if (dots <= 1) { paddingLevel = 1; textStyle = 'style-bold'; }
            else if (dots === 2) { paddingLevel = 2; textStyle = 'style-bold'; }
            else if (dots === 3) { paddingLevel = 3; textStyle = 'style-bold'; }
            else if (dots === 4) { paddingLevel = 4; textStyle = 'style-bold'; }
            else if (dots >= 5) { paddingLevel = 5; textStyle = 'style-normal'; isRincian = true; }
        }

        let safeKode = trackerKode.replace(/[^a-zA-Z0-9]/g, "");
        let safeUraian = uraian.substring(0, 25).replace(/[^a-zA-Z0-9]/g, "");
        let rowID = `R_PAD_${safeKode}_${safeUraian}`; 
        let cleanUraian = uraian.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        let cleanKode = col1.replace(/'/g, "\\'");

        let filePenjelasanHtml = '';
        if (isBarisJumlah) {
        } else if (isRincian) {
            filePenjelasanHtml = `
                <div class="no-print">
                    <button id="btn_${rowID}" class="btn btn-sm w-100 text-start" 
                            style="font-family:Arial; font-size:11px; padding: 4px 8px; background-color: #ffffff; border: 1px solid #cbd5e1; color: #475569; border-radius: 4px;"
                            onclick="bukaAsisten('${rowID}', '${cleanKode}', '${cleanUraian}', ${realisasi})">
                        <i class="fa-regular fa-pen-to-square text-secondary me-1"></i> Input Rincian PAD
                    </button>
                </div>
                <div id="print_${rowID}" class="print-view-text"></div>
                <input type="hidden" id="val_${rowID}" class="input-database" data-rowid="${rowID}" data-realisasi="${realisasi}">
            `;
        } else {
            filePenjelasanHtml = `
                <div class="no-print">
                    <button id="btn_${rowID}" class="btn btn-sm w-100 text-start" 
                            style="font-family:Arial; font-size:11px; padding: 4px 8px; background-color: #ffffff; border: 1px solid #e2e8f0; color: #64748b; border-radius: 4px;"
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

        let tr = document.createElement('tr');
        tr.className = `pad-lvl-${paddingLevel} ${textStyle} row-khusus-pad`;
        tr.dataset.pad = paddingLevel;
        tr.dataset.kategori = 'pad';
        
        tr.dataset.oriAng = anggaran || 0;
        tr.dataset.oriRea = realisasi || 0;
        tr.dataset.oriAngStr = strAng;
        tr.dataset.oriReaStr = strRea;
        tr.dataset.oriSelStr = strSel;
        tr.dataset.oriPerStr = strPersen;

        let kelasUraian = isBarisJumlah ? "uraian-cell text-uppercase fw-bold text-dark" : "uraian-cell";

        tr.innerHTML = `
            <td>${col1}</td>
            <td class="${kelasUraian}">${uraian}</td>
            <td class="text-end">${strAng}</td>
            <td class="text-end">${strRea}</td>
            <td class="text-end">${strSel}</td>
            <td class="text-center">${strPersen}</td>
            <td class="cell-penjelasan">${filePenjelasanHtml}</td>
        `;
        padFragment.appendChild(tr);
    }

    if (validPADCount === 0) {
        Swal.fire({
            icon: 'error',
            title: 'Format PAD Tidak Sesuai!',
            text: 'Sistem Menolak! File PAD yang Anda upload tidak sesuai. Tidak ditemukan satupun Kode Rekening Pendapatan.',
            confirmButtonColor: '#d33'
        });
        globalRawPAD = null;
        return false;
    }

    let trPemisah = document.createElement('tr');
    trPemisah.className = `pad-lvl-1 style-bold row-khusus-pad`;
    trPemisah.dataset.pad = 1;
    trPemisah.dataset.kategori = 'pad';
    trPemisah.innerHTML = `
        <td colspan="7" style="border-top: 2px dashed #94a3b8 !important; border-bottom: 3px solid #000 !important; background-color: #f8fafc; padding: 6px !important;">
            <div class="no-print text-center" style="font-size: 10px; font-weight: 800; letter-spacing: 2px; color: #64748b;">
                <i class="fa-solid fa-angles-down me-1"></i> BATAS PENDAPATAN & BELANJA DAERAH <i class="fa-solid fa-angles-down ms-1"></i>
            </div>
        </td>
    `;
    padFragment.appendChild(trPemisah);

    if (tbody.firstChild) {
        tbody.insertBefore(padFragment, tbody.firstChild);
    } else {
        tbody.appendChild(padFragment);
    }
    if (typeof window.restoreBrankasDraf === 'function') window.restoreBrankasDraf();
    return true;
}

function parseIndonesianNumberPAD(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    let str = String(val).trim();
    if (str === '-' || str === '') return 0;
    let isNegative = false;
    if (str.startsWith('(') && str.endsWith(')')) { isNegative = true; str = str.substring(1, str.length - 1).trim(); } 
    else if (str.startsWith('-')) { isNegative = true; str = str.substring(1).trim(); }
    str = str.replace(/\s/g, '').replace(/%/g, '').replace(/Rp/gi, '');
    if (str.includes('.') && str.includes(',')) { str = str.replace(/\./g, '').replace(/,/g, '.'); } 
    else if (str.includes(',') && !str.includes('.')) { let parts = str.split(','); if (parts[parts.length - 1].length <= 2) { str = str.replace(/,/g, '.'); } else { str = str.replace(/,/g, ''); } } 
    else if (str.includes('.') && !str.includes(',')) { let parts = str.split('.'); if (parts[parts.length - 1].length === 2 && parts.length === 2) {} else { str = str.replace(/\./g, ''); } }
    let num = parseFloat(str);
    if (isNaN(num)) return 0;
    return isNegative ? -num : num;
}

let timeoutPAD;
const observerPAD = new MutationObserver(() => {
    clearTimeout(timeoutPAD);
    timeoutPAD = setTimeout(() => {
        let tbody = document.getElementById('containerRender');
        if (tbody && tbody.children.length > 0 && !document.querySelector('.row-khusus-pad')) {
            if (globalRawPAD && globalRawPAD.length > 0) {
                let filterAktif = document.getElementById('selectFilterBelanja') ? document.getElementById('selectFilterBelanja').value : 'semua';
                if (filterAktif === 'semua') {
                    injeksiDataPADkeTabel();
                }
            }
        }
    }, 500);
});

window.addEventListener('DOMContentLoaded', () => {
    let target = document.getElementById('containerRender');
    if(target) { observerPAD.observe(target, { childList: true }); }
});
