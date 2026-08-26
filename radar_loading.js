// =========================================================================
// FILE: radar_loading.js
// FUNGSI: UI Loading Elegan, Putih Polos, Halus, dan Sangat Akurat
// SIFAT: Terisolasi 100% (Tidak mengganggu script.js asli)
// =========================================================================

document.addEventListener("DOMContentLoaded", function() {
    let radarInterval;
    
    // 1. INJEKSI CSS MINIMALIS & ELEGAN (Putih, Bersih, Halus)
    let style = document.createElement('style');
    style.innerHTML = `
        @keyframes fadeInSmooth { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .elegant-panel-lra {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 40px 50px;
            box-shadow: 0 15px 35px rgba(15, 23, 42, 0.08);
            text-align: center; width: 380px;
            animation: fadeInSmooth 0.3s ease-out forwards;
        }
        .sleek-bar-container {
            width: 100%; background: #f1f5f9;
            border-radius: 6px; height: 6px; margin-top: 25px; overflow: hidden;
        }
        .sleek-bar-fill {
            height: 100%; background: #0f172a; /* Warna gelap elegan murni, tanpa gradasi neon */
            border-radius: 6px; width: 0%; transition: width 0.1s linear;
        }
        /* Menghilangkan Swal bawaan agar tidak bertumpuk */
        body.hide-swal-temporarily .swal2-container { display: none !important; }
    `;
    document.head.appendChild(style);

    // 2. BANGUN LAYAR BLUR HALUS (Putih Transparan)
    let uiMewah = document.createElement('div');
    uiMewah.id = 'uiMewahLRA';
    uiMewah.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
        z-index: 9999999; display: none; flex-direction: column;
        align-items: center; justify-content: center;
        opacity: 0; transition: opacity 0.3s ease;
    `;
    uiMewah.innerHTML = `
        <div class="elegant-panel-lra">
            <div style="margin-bottom: 15px;">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 35px; color: #64748b;"></i>
            </div>
            
            <h3 style="color: #1e293b; font-family: 'Segoe UI', Arial, sans-serif; font-weight: 700; letter-spacing: 1px; font-size: 15px; margin-bottom: 15px;">
                Penyusunan Dokumen Laporan
            </h3>
            
            <div id="angkaPersen" style="font-size: 55px; font-weight: 300; color: #0f172a; font-family: 'Segoe UI', Arial, sans-serif; margin-bottom: 5px; line-height: 1;">
                0<span style="font-size: 24px; font-weight: 600; color: #94a3b8;">%</span>
            </div>
            
            <div id="teksStatusRadar" style="color: #64748b; font-size: 12px; font-weight: 500; letter-spacing: 0.5px;">
                Menyiapkan Data Rincian Belanja...
            </div>

            <div class="sleek-bar-container">
                <div id="barPersen" class="sleek-bar-fill"></div>
            </div>
        </div>
    `;
    document.body.appendChild(uiMewah);

    // 3. SENSOR PENYADAP KLIK (Hanya muncul saat tombol cetak benar-benar ditekan)
    document.body.addEventListener('click', function(e) {
        let btn = e.target.closest('button');
        if (!btn) return;
        let fungsiKlik = btn.getAttribute('onclick') || '';
        
        if (fungsiKlik.includes('validasiCetak') || fungsiKlik.includes('cetakPro')) {
            // Memberi jeda sepersekian detik agar sistem siap, baru layar blur dimunculkan dengan halus
            setTimeout(mulaiRadarPembacaDOM, 50); 
        }
    });

    function mulaiRadarPembacaDOM() {
        document.body.classList.add('hide-swal-temporarily');
        
        uiMewah.style.display = 'flex';
        setTimeout(() => { uiMewah.style.opacity = '1'; }, 10); 

        // Reset visual awal dengan sangat bersih
        document.getElementById('angkaPersen').innerHTML = '0<span style="font-size: 24px; font-weight: 600; color: #94a3b8;">%</span>';
        document.getElementById('barPersen').style.width = '0%';
        document.getElementById('teksStatusRadar').innerText = 'Menyiapkan Data Rincian Belanja...';
        document.getElementById('teksStatusRadar').style.color = '#64748b';

        // 4. MENGHITUNG TARGET SECARA AKURAT
        let tbodyAsli = document.getElementById('containerRender');
        if (!tbodyAsli) return;
        let barisAsli = Array.from(tbodyAsli.children).filter(tr => tr.style.display !== 'none');
        let totalTarget = barisAsli.length;
        if (totalTarget === 0) totalTarget = 1; 

        // 5. RADAR BERDETAK (SANGAT RINGAN)
        radarInterval = setInterval(() => {
            let areaPrint = document.getElementById('printWrapper');
            let barisSelesai = areaPrint ? areaPrint.querySelectorAll('.tbody-render tr').length : 0;

            let persen = Math.floor((barisSelesai / totalTarget) * 100);
            if (persen > 99) persen = 99;

            // Update Angka dan Garis yang Elegan
            document.getElementById('angkaPersen').innerHTML = persen + '<span style="font-size: 24px; font-weight: 600; color: #94a3b8;">%</span>';
            document.getElementById('barPersen').style.width = persen + '%';

            // Efek Psikologis dengan Bahasa Resmi
            let teksStatus = document.getElementById('teksStatusRadar');
            if (persen > 10 && persen < 40) teksStatus.innerText = 'Menyesuaikan Format Kertas...';
            else if (persen >= 40 && persen < 70) teksStatus.innerText = 'Menghitung Tata Letak Tabel...';
            else if (persen >= 70 && persen <= 99) teksStatus.innerText = 'Menyusun Tampilan Dokumen...';

            // 6. SENSOR KEMATIAN RADAR (Tanda 100% Selesai Mutlak)
            if (document.body.classList.contains('preview-active')) {
                clearInterval(radarInterval);
                
                // Set mutlak ke 100%
                document.getElementById('angkaPersen').innerHTML = '100<span style="font-size: 24px; font-weight: 600; color: #94a3b8;">%</span>';
                document.getElementById('barPersen').style.width = '100%';
                document.getElementById('teksStatusRadar').innerText = 'DOKUMEN SIAP DI TAMPILKAN!';
                document.getElementById('teksStatusRadar').style.color = '#0f172a';
                
                // Menghilang dengan sangat halus (fade out)
                setTimeout(() => {
                    uiMewah.style.opacity = '0';
                    setTimeout(() => {
                        uiMewah.style.display = 'none';
                        document.body.classList.remove('hide-swal-temporarily'); 
                    }, 300);
                }, 400);
            }
        }, 60);
    }
});