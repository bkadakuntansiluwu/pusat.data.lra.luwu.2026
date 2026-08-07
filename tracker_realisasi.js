let trackerTrackerInitialized = false;

document.addEventListener("DOMContentLoaded", function() {
    let initInterval = setInterval(() => {
        let targetContainer = document.querySelector('.control-panel .d-flex.justify-content-end, .control-panel .gap-2, .d-flex.gap-2');
        if (targetContainer && !trackerTrackerInitialized) {
            inisialisasiDropdownTracker(targetContainer);
            trackerTrackerInitialized = true;
            clearInterval(initInterval);
        }
    }, 500);

    // LOGIKA CERDAS: Hanya menghitung jika tab aktif dan menggunakan requestIdleCallback
    setInterval(() => {
        if (!document.hidden && typeof kodeSkpdAktif !== 'undefined' && kodeSkpdAktif !== "") {
            if ('requestIdleCallback' in window) {
                // Menunggu processor komputer santai (idle) baru menghitung progres
                requestIdleCallback(kalkulasiProgressRealisasi, { timeout: 1000 });
            } else {
                kalkulasiProgressRealisasi();
            }
        }
    }, 5000); // Mengecek setiap 5 detik (Sangat Ringan!)
});

function inisialisasiDropdownTracker(targetContainer) {
    let titleElement = document.querySelector('.control-panel h5');
    if (titleElement) {
        titleElement.style.whiteSpace = 'nowrap'; 
        titleElement.style.minWidth = 'max-content';
        titleElement.style.fontSize = '15px'; 
    }

    let wrapper = document.createElement('div');
    wrapper.id = 'wrapperTrackerPremium';
    wrapper.className = 'no-print';
    wrapper.style.cssText = 'position: relative; display: flex; align-items: center; z-index: 1060; flex-shrink: 0;';
    let triggerBtn = `
        <div id="btnAuditTracker" onclick="toggleAuditPanel(event)" style="background: #ffffff; height: 34px; padding: 0 12px; border-radius: 50px; font-size: 11px; font-family: 'Segoe UI', Arial, sans-serif; font-weight: 700; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 6px; cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); margin-right: 8px; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04); white-space: nowrap;">
            <div id="auditRing" style="width: 14px; height: 14px; border-radius: 50%; background: conic-gradient(#e2e8f0 100%, #e2e8f0 0%); position: relative; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                <div style="width: 8px; height: 8px; background: #ffffff; border-radius: 50%; box-shadow: 0 1px 2px rgba(0,0,0,0.1);"></div>
            </div>
            <span id="auditMiniText" style="color: #334155; letter-spacing: 0.3px;">Menghitung...</span>
        </div>
    `;

    let dropdownPanel = `
        <div id="panelAuditTracker" style="position: absolute; top: 44px; right: 10px; width: 380px; background: rgba(255, 255, 255, 0.98); backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); border: 1px solid rgba(255, 255, 255, 0.8); border-radius: 16px; padding: 20px; box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(226, 232, 240, 0.6); display: none; cursor: default; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); opacity: 0; transform: translateY(-10px);">
            
            <div style="font-size: 11px; font-weight: 800; color: #475569; letter-spacing: 1px; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; text-transform: uppercase;">
                <div style="background: #e0f2fe; padding: 6px; border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                    <i class="fa-solid fa-chart-pie" style="color: #0284c7; font-size: 12px;"></i>
                </div>
                Status Realisasi
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.01);">
                    <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Belanja Daerah</div>
                    <div id="auditTargetBelanja" style="font-size: 13px; color: #0f172a; font-weight: 800; word-break: break-word;">Rp 0</div>
                </div>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.01);">
                    <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">Pendapatan (PAD)</div>
                    <div id="auditTargetPAD" style="font-size: 13px; color: #94a3b8; font-weight: 800; word-break: break-word;">-</div>
                </div>
            </div>

            <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin-bottom: 16px; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.02);">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
                    <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Realisasi Keseluruhan</span>
                    <span id="auditTargetTotal" style="font-size: 12px; color: #0f172a; font-weight: 800;">Rp 0</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.3px;">Total Realisasi Terinput</span>
                    <span id="auditTerinputTotal" style="font-size: 12px; color: #10b981; font-weight: 800;">Rp 0</span>
                </div>
            </div>

            <div id="boxSisaRealisasi" style="background: linear-gradient(135deg, #fff1f2, #fef2f2); border: 1px solid #fecdd3; border-radius: 14px; padding: 18px; position: relative; overflow: hidden; transition: all 0.4s ease;">
                <div style="position: absolute; top: -10px; right: -10px; opacity: 0.04; transform: rotate(-15deg);">
                    <i class="fa-solid fa-wallet" style="font-size: 80px;"></i>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 14px; position: relative; z-index: 2;">
                    <div>
                        <div id="labelSisa" style="font-size: 10px; color: #e11d48; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 6px;">Sisa Realisasi Belum Terinci</div>
                        <div id="auditSisa" style="font-size: 17px; color: #be123c; font-weight: 900; letter-spacing: -0.5px;">Rp 0</div>
                    </div>
                    <div id="auditPersenDetail" style="font-size: 12px; font-weight: 800; color: #e11d48; background: #ffe4e6; padding: 4px 10px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">0%</div>
                </div>

                <div id="bgProgressBar" style="background: #fecdd3; border-radius: 50px; height: 6px; width: 100%; overflow: hidden; position: relative; z-index: 2; transition: all 0.4s ease;">
                    <div id="auditProgressBar" style="background: linear-gradient(90deg, #f43f5e, #e11d48); height: 100%; width: 0%; transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1), background 0.4s ease;"></div>
                </div>
            </div>
        </div>
    `;

    wrapper.innerHTML = triggerBtn + dropdownPanel;
    targetContainer.insertBefore(wrapper, targetContainer.firstChild);

    document.addEventListener('click', function(e) {
        let panel = document.getElementById('panelAuditTracker');
        let btn = document.getElementById('btnAuditTracker');
        if (panel && panel.style.display === 'block') {
            if (!panel.contains(e.target) && !btn.contains(e.target)) {
                panel.style.opacity = '0';
                panel.style.transform = 'translateY(-10px)';
                setTimeout(() => panel.style.display = 'none', 300);
            }
        }
    });
}

function toggleAuditPanel(e) {
    if (e) e.stopPropagation();
    let panel = document.getElementById('panelAuditTracker');
    if (!panel) return;

    if (panel.style.display === 'none' || panel.style.display === '') {
        panel.style.display = 'block';
        setTimeout(() => {
            panel.style.opacity = '1';
            panel.style.transform = 'translateY(0)';
        }, 10);
    } else {
        panel.style.opacity = '0';
        panel.style.transform = 'translateY(-10px)';
        setTimeout(() => panel.style.display = 'none', 300);
    }
}

function kalkulasiProgressRealisasi() {
    if (typeof window.hitungTotalDariTeks !== 'function') return;

    let targetBelanja = 0;
    let targetPAD = 0;
    let terinputBelanja = 0;
    let terinputPAD = 0;
    let adaDataAktif = false;

    document.querySelectorAll('.input-database').forEach(inp => {
        let nilaiRealisasiAsli = parseFloat(inp.getAttribute('data-realisasi')) || 0;
        
        if (nilaiRealisasiAsli !== 0) {
            adaDataAktif = true;
            let isPAD = inp.closest('.row-khusus-pad') !== null;
            
            if (isPAD) {
                targetPAD += nilaiRealisasiAsli;
            } else {
                targetBelanja += nilaiRealisasiAsli;
            }

            let rowId = inp.getAttribute('data-rowid');
            let printDiv = document.getElementById('print_' + rowId);
            
            if (printDiv) {
                let terinputCerdas = 0;
                
               
                let memoriNilai = printDiv.getAttribute('data-nilai-terinput');
                
                if (memoriNilai !== null) {
                    terinputCerdas = parseFloat(memoriNilai);
                } else {
                    
                    terinputCerdas = window.hitungTotalDariTeks(printDiv.innerHTML);
                    printDiv.setAttribute('data-nilai-terinput', terinputCerdas); 
                }
                
                if (terinputCerdas > nilaiRealisasiAsli) {
                    terinputCerdas = nilaiRealisasiAsli; 
                }
                
                if (isPAD) {
                    terinputPAD += terinputCerdas;
                } else {
                    terinputBelanja += terinputCerdas;
                }
            }
        }
    });

    let wrapper = document.getElementById('wrapperTrackerPremium');
    if (!wrapper) return;

    if (!adaDataAktif) {
        wrapper.style.display = 'none';
        return;
    } else {
        wrapper.style.display = 'flex';
    }

    let totalTarget = targetBelanja + targetPAD;
    let totalTerinput = terinputBelanja + terinputPAD;
    let sisa = totalTarget - totalTerinput;
    if (sisa < 0) sisa = 0;

    let persentase = totalTarget > 0 ? ((totalTerinput / totalTarget) * 100) : 0;
    let formatRp = { minimumFractionDigits: 0 };
    
    document.getElementById('auditTargetBelanja').innerText = "Rp " + targetBelanja.toLocaleString('id-ID', formatRp);
    
    let elTargetPAD = document.getElementById('auditTargetPAD');
    if (targetPAD > 0) {
        elTargetPAD.innerText = "Rp " + targetPAD.toLocaleString('id-ID', formatRp);
        elTargetPAD.style.color = "#0f172a";
    } else {
        elTargetPAD.innerText = "-";
        elTargetPAD.style.color = "#94a3b8";
    }
    
    document.getElementById('auditTargetTotal').innerText = "Rp " + totalTarget.toLocaleString('id-ID', formatRp);
    document.getElementById('auditTerinputTotal').innerText = "Rp " + totalTerinput.toLocaleString('id-ID', formatRp);
    
    let elSisa = document.getElementById('auditSisa');
    let elBar = document.getElementById('auditProgressBar');
    let elBgBar = document.getElementById('bgProgressBar');
    let elPctDetail = document.getElementById('auditPersenDetail');
    let boxSisa = document.getElementById('boxSisaRealisasi');
    let labelSisa = document.getElementById('labelSisa');

    elSisa.innerText = "Rp " + sisa.toLocaleString('id-ID', formatRp);
    elBar.style.width = persentase + "%";
    elPctDetail.innerText = persentase.toFixed(1) + "%";

    let miniText = document.getElementById('auditMiniText');
    let ring = document.getElementById('auditRing');
    let btnAudit = document.getElementById('btnAuditTracker');

    miniText.innerText = persentase.toFixed(0) + "% Selesai";

    let mainColor = '#3b82f6'; 

    if (persentase === 100) {
        mainColor = '#10b981'; 
        elSisa.innerText = "TUNTAS 100%";
        elSisa.style.color = '#166534';
        labelSisa.style.color = '#166534';
        boxSisa.style.background = 'linear-gradient(135deg, #f0fdf4, #dcfce7)';
        boxSisa.style.borderColor = '#bbf7d0';
        elPctDetail.style.color = '#166534';
        elPctDetail.style.background = '#bbf7d0';
        elBgBar.style.background = '#dcfce7';
        elBar.style.background = 'linear-gradient(90deg, #34d399, #10b981)';
    } else if (persentase >= 75) {
        mainColor = '#f59e0b'; 
        elSisa.style.color = '#b45309';
        labelSisa.style.color = '#d97706';
        boxSisa.style.background = 'linear-gradient(135deg, #fffbeb, #fef3c7)';
        boxSisa.style.borderColor = '#fde047';
        elPctDetail.style.color = '#b45309';
        elPctDetail.style.background = '#fde047';
        elBgBar.style.background = '#fef3c7';
        elBar.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
    } else {
        mainColor = '#3b82f6'; 
        elSisa.style.color = '#be123c';
        labelSisa.style.color = '#e11d48';
        boxSisa.style.background = 'linear-gradient(135deg, #fff1f2, #fef2f2)';
        boxSisa.style.borderColor = '#fecdd3';
        elPctDetail.style.color = '#e11d48';
        elPctDetail.style.background = '#ffe4e6';
        elBgBar.style.background = '#fecdd3';
        elBar.style.background = 'linear-gradient(90deg, #f43f5e, #e11d48)';
    }

    ring.style.background = `conic-gradient(${mainColor} ${persentase}%, #e2e8f0 0%)`;
    
    btnAudit.onmouseover = function() { 
        this.style.borderColor = mainColor; 
        this.style.boxShadow = `0 2px 8px ${mainColor}20`;
    }
    btnAudit.onmouseout = function() { 
        this.style.borderColor = '#e2e8f0'; 
        this.style.boxShadow = '0 2px 6px rgba(15, 23, 42, 0.04)';
    }
}
