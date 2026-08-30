// =========================================================================
// [MODUL ADD-ON V6] : KONSOLIDASI DATA INDUK & BAWAHAN (PREMIUM SECURE BADGE)
// =========================================================================

document.addEventListener("DOMContentLoaded", function() {
    // 1. Suntik Tombol Floating Edge di Sisi Kiri Layar (Tengah Vertikal)
    let btnKonsolidasi = document.createElement('div');
    btnKonsolidasi.id = 'btnKonsolidasiBawahan';
    btnKonsolidasi.title = 'Sinkronisasi Data Unit Sub-ordinat';
    
    btnKonsolidasi.style.cssText = `
        position: fixed;
        top: 50%;
        left: 0;
        transform: translateY(-50%);
        z-index: 9999;
        background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%);
        color: #fff;
        padding: 15px 8px;
        border-radius: 0 12px 12px 0;
        box-shadow: 4px 0 15px rgba(55, 48, 163, 0.4);
        cursor: pointer;
        display: none;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-left: none;
    `;
    
    btnKonsolidasi.innerHTML = `
        <i class="fa-solid fa-code-merge mb-2" style="font-size: 16px; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.3));"></i>
        <span style="font-size: 11px; font-weight: 800; writing-mode: vertical-rl; transform: rotate(180deg); letter-spacing: 2px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);"></span>
    `;
    
    btnKonsolidasi.onmouseover = function() {
        this.style.padding = '15px 12px'; 
        this.style.background = 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)';
        this.style.boxShadow = '6px 0 20px rgba(55, 48, 163, 0.6)';
    };
    btnKonsolidasi.onmouseout = function() {
        this.style.padding = '15px 8px'; 
        this.style.background = 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)';
        this.style.boxShadow = '4px 0 15px rgba(55, 48, 163, 0.4)';
    };
    
    btnKonsolidasi.onclick = jalankanSinkronisasiBawahan;
    document.body.appendChild(btnKonsolidasi);
});

setInterval(() => {
    let btnKonsolidasi = document.getElementById('btnKonsolidasiBawahan');
    if (btnKonsolidasi) {
        if (typeof kodeSkpdAktif !== 'undefined' && kodeSkpdAktif !== "") {
            btnKonsolidasi.style.display = 'flex'; 
        } else {
            btnKonsolidasi.style.display = 'none'; 
        }
    }
}, 2000);

// =========================================================================
// 3. Mesin Utama Penarik Data Bawahan (Security & Enterprise Validation)
// =========================================================================
async function jalankanSinkronisasiBawahan() {
    // 1. BLOKIR KEAMANAN DOMAIN (ANTI-LOCAL RUN)
    const DOMAIN_RESMI = "bkadakuntansiluwu.github.io"; 
    let currentDomain = window.location.hostname;
    
    if (currentDomain !== DOMAIN_RESMI) {
        Swal.fire({
            icon: 'error',
            title: 'AKSES DITOLAK (UNAUTHORIZED)',
            html: '<div style="text-align: left; font-size: 13px;">Fitur Konsolidasi Data Terpusat memuat informasi klasifikasi tinggi dan <b>hanya diizinkan beroperasi melalui Server Resmi (Cloud).</b><br><br>Sistem mendeteksi akses melalui jalur lokal (Localhost/Offline). Koneksi ke Database <b>DIBLOKIR SECARA OTOMATIS</b>.</div>',
            confirmButtonColor: '#991b1b',
            confirmButtonText: '<i class="fa-solid fa-shield-halved me-1"></i> Mengerti'
        });
        return; 
    }

    // 2. VALIDASI OTENTIKASI DOKUMEN
    if (!kodeSkpdAktif) {
        Swal.fire('Otentikasi Gagal', 'Harap unggah dokumen LRA Excel Induk (SKPD) terlebih dahulu sebagai basis validasi data.', 'warning');
        return;
    }

    // 3. DIALOG KONFIRMASI EKSEKUTIF
    Swal.fire({
        title: 'Otorisasi Konsolidasi Data?',
        html: `
            <div style="font-size: 13px; text-align: left; line-height: 1.6; color: #334155;">
                Sistem akan memindai dan merekapitulasi data dari seluruh unit sub-ordinat (Puskesmas / Kelurahan) di bawah struktur organisasi Anda di <i>Server</i>.
                <br><br>
                <div style="background-color: #f0fdf4; border: 1px dashed #bbf7d0; padding: 10px; border-radius: 6px;">
                    <i class="fa-solid fa-shield-halved text-success me-1"></i> <b>Protokol Integritas Data:</b> Rincian belanja yang telah Anda input sebelumnya <b>DIJAMIN AMAN</b> dan tidak akan tertimpa. Integrasi hanya berlaku pada baris anggaran yang masih kosong.
                </div>
            </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#4f46e5',
        cancelButtonColor: '#f8fafc',
        confirmButtonText: '<i class="fa-solid fa-cloud-arrow-down me-2"></i>Ya, Proses Sinkronisasi',
        cancelButtonText: '<span style="color: #475569; font-weight: bold;">Batal</span>',
        customClass: {
            confirmButton: 'shadow-sm rounded-3',
            cancelButton: 'border shadow-sm rounded-3'
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            
            Swal.fire({
                title: 'Menyinkronkan Data...',
                html: 'Menjalankan operasi integrasi data unit terkait.',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            let tahun = document.getElementById('selectTahun').value;
            let urlAllDatabase = `${FIREBASE_URL}lra_${tahun}.json`;

            try {
                let response = await fetch(urlAllDatabase, { cache: 'no-store' });
                let allData = await response.json();

                if (!allData) {
                    Swal.fire('Informasi Sistem', 'Belum terdapat data rekapitulasi dari unit sub-ordinat di server untuk tahun anggaran berjalan.', 'info');
                    return;
                }

                let amanInduk = kodeSkpdAktif.replace(/\./g, '_'); 
                let countDisuntik = 0;
                let countSKPDBawahanDitemukan = 0;
                let daftarSkpdBawahan = [];

                for (let skpdKey in allData) {
                    if (skpdKey === amanInduk) continue;
                    
                    if (skpdKey.startsWith(amanInduk)) {
                        daftarSkpdBawahan.push(skpdKey);
                        countSKPDBawahanDitemukan++;
                    }
                }

                if (daftarSkpdBawahan.length === 0) {
                    Swal.fire('Informasi Sistem', 'Tidak ditemukan unit terdaftar yang berada di bawah hierarki kode rekening instansi Anda.', 'info');
                    return;
                }

                document.querySelectorAll('.input-database').forEach(inp => {
                    if (inp.value.trim() === '') { 
                        let rowId = inp.getAttribute('data-rowid');
                        let targetRealisasi = parseFloat(inp.getAttribute('data-realisasi')) || 0;

                        for (let i = 0; i < daftarSkpdBawahan.length; i++) {
                            let keyBawahan = daftarSkpdBawahan[i];
                            
                            if (allData[keyBawahan][rowId]) { 
                                let dataRincian = allData[keyBawahan][rowId];
                                
                                inp.value = dataRincian;
                                inp.classList.add('is-dirty'); 
                                
                                let printText = formatTeksPenjelasan(dataRincian);
                                let printDiv = document.getElementById('print_' + rowId);
                                if (printDiv) printDiv.innerHTML = printText;
                                
                                if (typeof perbaruiTombolStatus === 'function') {
                                    perbaruiTombolStatus(rowId, printText, targetRealisasi);
                                }
                                
                                countDisuntik++;
                                break; 
                            }
                        }
                    }
                });

                if (countDisuntik > 0) {
                    Swal.fire({
                        icon: 'success',
                        title: 'KONSOLIDASI SELESAI',
                        html: `
                            <div style="font-size: 13px; text-align: left;">
                                Sistem berhasil merekapitulasi <b>${countDisuntik} rincian belanja</b> dari <b>${countSKPDBawahanDitemukan} unit sub-ordinat</b>.<br><br>
                                <b class="text-danger">TINDAKAN DIPERLUKAN:</b><br>Gunakan fitur <b>Posting Data (Simpan Cloud)</b> untuk mengamankan perubahan ini secara permanen ke dalam dokumen Induk Anda.
                            </div>
                        `,
                        confirmButtonColor: '#10b981'
                    });
                    
                    if(typeof autoSaveIndexedDB === 'function') autoSaveIndexedDB();
                } else {
                    Swal.fire('Proses Selesai', `Terdeteksi ${countSKPDBawahanDitemukan} unit sub-ordinat, namun status sinkronisasi telah mencapai 100% (tidak ditemukan baris kosong baru yang memerlukan integrasi).`, 'info');
                }

            } catch (err) {
                Swal.fire('Koneksi Gagal', 'Integritas jaringan terganggu saat mengunduh data konsolidasi. Silakan periksa koneksi internet Anda.', 'error');
            }
        }
    });
}