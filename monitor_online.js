document.addEventListener("DOMContentLoaded", function() {
    let browserId = localStorage.getItem('LRA_BROWSER_ID');
    if (!browserId) {
        browserId = 'USR_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        localStorage.setItem('LRA_BROWSER_ID', browserId);
    }

    let jumlahOnlineTerakhir = 1; 
    let sisaKuotaTerakhir = "Menghitung..."; 
    let persenKuotaTerakhir = 0; 
    let injeksiAktif = false;

    function aktifkanSensorSentuh() {
        let connDot = document.getElementById('uiConnDot');
        
        if (connDot && !injeksiAktif) {
            injeksiAktif = true;
            
            
            connDot.addEventListener('mouseenter', function() {
                this.setAttribute('title', 'Terhubung: ' + jumlahOnlineTerakhir + '');
            });

            
            connDot.addEventListener('dblclick', function() {
                
                let warnaKuota = persenKuotaTerakhir > 80 ? '#ef4444' : '#10b981';
                
                Swal.fire({
                    title: '<strong style="font-family: Arial;">Dashboard Server <i class="fa-solid fa-user-secret text-dark ms-1"></i></strong>',
                    html: `
                        <div style="font-family: Arial; text-align: left; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 10px; border-bottom: 1px dashed #cbd5e1; padding-bottom: 8px;">
                                <span style="color: #64748b; font-weight: bold; font-size: 12px;">Pengguna Aktif:</span>
                                <span style="color: #0f172a; font-weight: 900; font-size: 14px;">${jumlahOnlineTerakhir} Komputer</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="color: #64748b; font-weight: bold; font-size: 12px;">Sisa Kuota Harian:</span>
                                <span style="color: ${warnaKuota}; font-weight: 900; font-size: 14px;">${sisaKuotaTerakhir} Request</span>
                            </div>
                            <!-- Bar Persentase Mewah -->
                            <div style="width: 100%; background-color: #e2e8f0; border-radius: 4px; height: 6px; margin-top: 5px;">
                                <div style="width: ${persenKuotaTerakhir}%; background-color: ${warnaKuota}; height: 6px; border-radius: 4px;"></div>
                            </div>
                            <div style="text-align: right; font-size: 9px; color: #94a3b8; margin-top: 5px;">Kapasitas Terpakai: ${persenKuotaTerakhir}%</div>
                        </div>
                    `,
                    confirmButtonText: 'Tutup',
                    confirmButtonColor: '#0f172a',
                    width: '320px',
                    backdrop: 'rgba(15, 23, 42, 0.4)'
                });
            });
        }
    }

    function pingOnlineStatus() {
        if (typeof SCRIPT_URL_DATABASE === 'undefined' || SCRIPT_URL_DATABASE.includes("ISI_DENGAN_URL")) return;

        let url = SCRIPT_URL_DATABASE + "?action=ping_online&browser_id=" + browserId;

        fetch(url)
            .then(r => r.json())
            .then(res => {
                if (res.status === 'success') {
                    aktifkanSensorSentuh(); 
                    
                    
                    if (res.quota) {
                        sisaKuotaTerakhir = res.quota.remaining.toLocaleString('id-ID');
                        persenKuotaTerakhir = res.quota.percent;
                    }
                    
                    if (jumlahOnlineTerakhir !== res.online) {
                        jumlahOnlineTerakhir = res.online; 
                        
                        let connDot = document.getElementById('uiConnDot');
                        if (connDot) {
                            connDot.style.transform = 'scale(1.4)';
                            setTimeout(() => connDot.style.transform = 'scale(1)', 300);
                            
                            if (connDot.matches(':hover')) {
                                connDot.setAttribute('title', 'Terhubung: ' + jumlahOnlineTerakhir + '');
                            }
                        }
                    }
                }
            }).catch(e => {});
    }

    let uiCheckInterval = setInterval(() => {
        if (document.getElementById('uiConnDot')) {
            aktifkanSensorSentuh();
            clearInterval(uiCheckInterval);
            
            pingOnlineStatus();
            setInterval(pingOnlineStatus, 60000); 
        }
    }, 1000);
});
