(function() {
    'use strict';

    
    var ZOOM_MIN = 0.40;   
    var ZOOM_MAX = 1.15;   
    var ZOOM_STEP = 0.05;  
    var ZOOM_DEFAULT = 0.95; 

    // === STATE INTERNAL ===
    var _rangePrintActive = false;
    var _hiddenPages = [];
    var _currentZoom = ZOOM_DEFAULT;

    var _printCSSInjected = false;
    function injectPrintCSS() {
        if (_printCSSInjected) return;
        _printCSSInjected = true;

        var style = document.createElement('style');
        style.id = 'pcPrintSharpCSS';
        style.textContent =
            '@media print {' +                
                '@page { size: 330mm 215.9mm; margin: 0; }' +                
                '.page-pro,' +
                '.page-pro *,' +
                '.page-pro table,' +
                '.page-pro td,' +
                '.page-pro th,' +
                '.page-pro h4,' +
                '.page-pro h5,' +
                '.page-pro h6,' +
                '.page-pro div,' +
                '.page-pro span,' +
                '.page-pro small {' +
                    '-webkit-font-smoothing: subpixel-antialiased;' +
                    '-moz-osx-font-smoothing: auto;' +
                    'text-rendering: geometricPrecision;' +
                    'font-smooth: always;' +
                '}' +
                
                '.page-pro {' +
                    'will-change: transform;' +
                    'backface-visibility: hidden;' +
                    '-webkit-backface-visibility: hidden;' +
                '}' +
                
                '.table-lra th {' +
                    'background-color: #ffffff !important;' +
                    '-webkit-print-color-adjust: exact !important;' +
                    'print-color-adjust: exact !important;' +
                '}' +
                
                '.table-lra td,' +
                '.table-lra th {' +
                    'border: 0.5pt solid #000 !important;' +
                '}' +
                
                '.pdf-footer-pro {' +
                    '-webkit-font-smoothing: subpixel-antialiased;' +
                    'text-rendering: geometricPrecision;' +
                '}' +
            '}';
        document.head.appendChild(style);
    }
   
    var _originalTutup = typeof window.tutupPreviewCetak === 'function'
        ? window.tutupPreviewCetak : null;

    window.tutupPreviewCetak = function() {
        if (_rangePrintActive) {
            _hiddenPages.forEach(function(page) {
                page.style.display = '';
            });
            _hiddenPages = [];
            _rangePrintActive = false;
            return;
        }
        if (_originalTutup) _originalTutup();
    };

    // ================================================================
    // HELPER: Buat elemen dengan style langsung
    // ================================================================
    function el(tag, styles, attrs) {
        var e = document.createElement(tag);
        if (styles) e.style.cssText = styles;
        if (attrs) {
            for (var k in attrs) {
                if (attrs.hasOwnProperty(k)) e.setAttribute(k, attrs[k]);
            }
        }
        return e;
    }

    // ================================================================
    // FUNGSI SKALA / ZOOM
    // ================================================================
    function applyZoom(scale) {
        
        scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, scale));
        _currentZoom = scale;

        var pages = document.querySelectorAll('#printWrapper .page-pro');
        var baseMarginBottom = 25; 

        pages.forEach(function(page) {
            
            page.style.transform = 'scale(' + scale + ')';
            page.style.transformOrigin = 'top center';

            
            var h = page.offsetHeight || 816; 
            var compensation = h * (1 - scale);
            var newMargin = Math.max(4, baseMarginBottom - compensation);
            page.style.marginBottom = newMargin + 'px';
        });

        // Update label persentase di toolbar
        var label = document.getElementById('pcZoomLabel');
        if (label) label.textContent = Math.round(scale * 100) + '%';

        // Update state tombol (-) dan (+)
        var btnMinus = document.getElementById('pcBtnZoomOut');
        var btnPlus = document.getElementById('pcBtnZoomIn');
        if (btnMinus) btnMinus.style.opacity = (scale <= ZOOM_MIN) ? '0.3' : '1';
        if (btnPlus)  btnPlus.style.opacity  = (scale >= ZOOM_MAX) ? '0.3' : '1';
    }

    function zoomIn() {
        applyZoom(_currentZoom + ZOOM_STEP);
    }

    function zoomOut() {
        applyZoom(_currentZoom - ZOOM_STEP);
    }

    function zoomReset() {
        applyZoom(ZOOM_DEFAULT);
    }

    // ================================================================
    // INJEKSI KONTROL KE PREVIEW BAR
    // ================================================================
    function injectControls() {
        var ctrlBar = document.getElementById('previewControlBar');
        if (!ctrlBar || ctrlBar._pcInjected) return;

        
        injectPrintCSS();

        
        var originalBtns = ctrlBar.querySelectorAll(
            'button[onclick*="window.print"], button[onclick*="tutupPreviewCetak"]'
        );
        originalBtns.forEach(function(btn) { btn.style.display = 'none'; });

        
        ctrlBar.style.flexDirection = 'column';
        ctrlBar.style.alignItems = 'stretch';
        ctrlBar.style.gap = '0';

        // 3. Wrap semua anak asli ke dalam baris pertama (row info)
        var rowInfo = el('div',
            'display:flex;justify-content:space-between;align-items:center;min-height:36px;'
        );
        while (ctrlBar.firstChild) {
            rowInfo.appendChild(ctrlBar.firstChild);
        }
        ctrlBar.appendChild(rowInfo);

        // 4. Tombol Tutup di ujung kanan baris info
        var btnTutup = el('button',
            'background:rgba(255,255,255,0.06);color:#e2e8f0;border:1px solid rgba(255,255,255,0.15);' +
            'border-radius:7px;padding:6px 18px;font-size:11px;font-weight:700;cursor:pointer;' +
            'font-family:Segoe UI,Arial,sans-serif;transition:all 0.2s;flex-shrink:0;',
            { id: 'pcBtnClose' }
        );
        btnTutup.innerHTML = '<i class="fa-solid fa-xmark" style="margin-right:5px;"></i>Tutup';
        btnTutup.addEventListener('mouseenter', function() {
            this.style.background = 'rgba(255,255,255,0.12)'; this.style.color = '#fff';
        });
        btnTutup.addEventListener('mouseleave', function() {
            this.style.background = 'rgba(255,255,255,0.06)'; this.style.color = '#e2e8f0';
        });
        // 4b. Indikator Kertas F4 Terkunci (sebelum tombol Tutup)
        var f4Badge = el('span',
            'display:inline-flex;align-items:center;gap:5px;' +
            'background:rgba(16,185,129,0.1);color:#34d399;' +
            'border:1px solid rgba(16,185,129,0.2);border-radius:6px;' +
            'padding:4px 10px;font-size:10px;font-weight:700;letter-spacing:0.4px;' +
            'font-family:Segoe UI,Arial,sans-serif;flex-shrink:0;white-space:nowrap;'
        );
        f4Badge.innerHTML = '<i class="fa-solid fa-lock" style="font-size:8px;"></i> Kertas F4';
        f4Badge.title = 'Ukuran kertas dikunci ke F4 Landscape (330mm x 215.9mm)';
        rowInfo.appendChild(f4Badge);

        rowInfo.appendChild(btnTutup);

        // 5. Baris kedua: panel kontrol
        var rowKontrol = el('div',
            'display:flex;align-items:center;justify-content:space-between;' +
            'padding:9px 0 0 0;margin-top:8px;border-top:1px solid rgba(255,255,255,0.08);' +
            'flex-wrap:wrap;gap:8px;'
        );

        // ---- Group Kiri: Lihat Halaman ----
        var grpLihat = el('div',
            'display:flex;align-items:center;gap:6px;flex-shrink:0;'
        );
        grpLihat.innerHTML =
            '<span style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;">' +
            'Lihat Halaman</span>' +
            '<input type="number" id="pcJump" min="1" value="1" ' +
                'style="width:50px;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.12);' +
                'color:#fff;border-radius:6px;padding:5px 4px;font-size:12px;font-weight:600;' +
                'text-align:center;font-family:Segoe UI,Arial,sans-serif;outline:none;" ' +
                'onfocus="this.style.borderColor=\'rgba(59,130,246,0.6)\';this.style.boxShadow=\'0 0 0 2px rgba(59,130,246,0.15)\'" ' +
                'onblur="this.style.borderColor=\'rgba(255,255,255,0.12)\';this.style.boxShadow=\'none\'">' +
            '<button id="pcBtnJump" style="background:rgba(59,130,246,0.15);color:#60a5fa;' +
                'border:1px solid rgba(59,130,246,0.25);border-radius:6px;padding:5px 10px;' +
                'font-size:11px;font-weight:700;cursor:pointer;font-family:Segoe UI,Arial,sans-serif;' +
                'transition:all 0.2s;" ' +
                'onmouseover="this.style.background=\'rgba(59,130,246,0.3)\'" ' +
                'onmouseout="this.style.background=\'rgba(59,130,246,0.15)\'">' +
                '<i class="fa-solid fa-arrow-right"></i></button>';

        // ---- Group Tengah: Skala Tampilan ----
        var grpSkala = el('div',
            'display:flex;align-items:center;gap:0;flex-shrink:0;' +
            'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);' +
            'border-radius:8px;padding:3px 8px;'
        );
        grpSkala.innerHTML =
            '<span style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:0.5px;' +
            'text-transform:uppercase;white-space:nowrap;margin-right:6px;">Skala</span>' +
            '<button id="pcBtnZoomOut" title="Perkecil tampilan" style="' +
                'background:rgba(255,255,255,0.06);color:#cbd5e1;border:1px solid rgba(255,255,255,0.1);' +
                'border-radius:5px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;' +
                'font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;" ' +
                'onmouseover="this.style.background=\'rgba(255,255,255,0.12)\'" ' +
                'onmouseout="this.style.background=\'rgba(255,255,255,0.06)\'">-</button>' +
            '<span id="pcZoomLabel" style="color:#e2e8f0;font-size:12px;font-weight:700;' +
                'min-width:38px;text-align:center;font-family:Segoe UI,Arial,sans-serif;"' +
                'title="Ukuran tampilan kertas saat ini">' + Math.round(ZOOM_DEFAULT * 100) + '%</span>' +
            '<button id="pcBtnZoomIn" title="Perbesar tampilan" style="' +
                'background:rgba(255,255,255,0.06);color:#cbd5e1;border:1px solid rgba(255,255,255,0.1);' +
                'border-radius:5px;width:26px;height:26px;display:flex;align-items:center;justify-content:center;' +
                'font-size:13px;font-weight:700;cursor:pointer;transition:all 0.15s;" ' +
                'onmouseover="this.style.background=\'rgba(255,255,255,0.12)\'" ' +
                'onmouseout="this.style.background=\'rgba(255,255,255,0.06)\'">+</button>' +
            '<button id="pcBtnZoomReset" title="Kembalikan ke ukuran awal" style="' +
                'background:none;color:#64748b;border:none;border-radius:5px;width:26px;height:26px;' +
                'display:flex;align-items:center;justify-content:center;font-size:11px;' +
                'cursor:pointer;transition:all 0.15s;margin-left:2px;" ' +
                'onmouseover="this.style.color=\'#94a3b8\'" ' +
                'onmouseout="this.style.color=\'#64748b\'"><i class="fa-solid fa-rotate-left"></i></button>';

        // ---- Group Kanan: Cetak Halaman ----
        var grpCetak = el('div',
            'display:flex;align-items:center;gap:0;flex-shrink:0;'
        );

        var boxRange = el('div',
            'display:flex;align-items:center;gap:5px;' +
            'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);' +
            'border-radius:8px;padding:4px 10px;'
        );
        boxRange.innerHTML =
            '<span style="color:#94a3b8;font-size:10px;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;white-space:nowrap;">' +
            'Cetak Halaman</span>' +
            '<span style="color:#64748b;font-size:11px;">dari</span>' +
            '<input type="number" id="pcFrom" min="1" value="1" ' +
                'style="width:48px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);' +
                'color:#fff;border-radius:5px;padding:4px 4px;font-size:12px;font-weight:600;' +
                'text-align:center;font-family:Segoe UI,Arial,sans-serif;outline:none;" ' +
                'onfocus="this.style.borderColor=\'rgba(245,158,11,0.6)\';this.style.boxShadow=\'0 0 0 2px rgba(245,158,11,0.12)\'" ' +
                'onblur="this.style.borderColor=\'rgba(255,255,255,0.12)\';this.style.boxShadow=\'none\'">' +
            '<span style="color:#475569;font-size:12px;font-weight:500;">sampai</span>' +
            '<input type="number" id="pcTo" min="1" value="1" ' +
                'style="width:48px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);' +
                'color:#fff;border-radius:5px;padding:4px 4px;font-size:12px;font-weight:600;' +
                'text-align:center;font-family:Segoe UI,Arial,sans-serif;outline:none;" ' +
                'onfocus="this.style.borderColor=\'rgba(245,158,11,0.6)\';this.style.boxShadow=\'0 0 0 2px rgba(245,158,11,0.12)\'" ' +
                'onblur="this.style.borderColor=\'rgba(255,255,255,0.12)\';this.style.boxShadow=\'none\'">';

        // Tombol Cetak Pilihan
        var btnCetakPilihan = el('button',
            'background:linear-gradient(135deg,#f59e0b,#d97706);color:#fff;border:none;' +
            'border-radius:7px;padding:7px 16px;font-size:11px;font-weight:700;cursor:pointer;' +
            'font-family:Segoe UI,Arial,sans-serif;letter-spacing:0.3px;transition:all 0.2s;' +
            'box-shadow:0 2px 8px rgba(245,158,11,0.25);margin-left:8px;',
            { id: 'pcBtnRange' }
        );
        btnCetakPilihan.innerHTML = '<i class="fa-solid fa-file-export" style="margin-right:5px;"></i>Cetak Pilihan';
        btnCetakPilihan.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 4px 14px rgba(245,158,11,0.45)';
        });
        btnCetakPilihan.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '0 2px 8px rgba(245,158,11,0.25)';
        });

        // Tombol Cetak Semua
        var btnCetakSemua = el('button',
            'background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;' +
            'border-radius:7px;padding:7px 16px;font-size:11px;font-weight:700;cursor:pointer;' +
            'font-family:Segoe UI,Arial,sans-serif;letter-spacing:0.3px;transition:all 0.2s;' +
            'box-shadow:0 2px 8px rgba(59,130,246,0.25);margin-left:6px;',
            { id: 'pcBtnAll' }
        );
        btnCetakSemua.innerHTML = '<i class="fa-solid fa-print" style="margin-right:5px;"></i>Cetak Semua';
        btnCetakSemua.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 4px 14px rgba(59,130,246,0.45)';
        });
        btnCetakSemua.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.boxShadow = '0 2px 8px rgba(59,130,246,0.25)';
        });

        // Susun group kanan
        grpCetak.appendChild(boxRange);
        grpCetak.appendChild(btnCetakPilihan);
        grpCetak.appendChild(btnCetakSemua);

        // Susun baris kontrol: kiri (lihat) | tengah (skala) | kanan (cetak)
        rowKontrol.appendChild(grpLihat);
        rowKontrol.appendChild(grpSkala);
        rowKontrol.appendChild(grpCetak);
        ctrlBar.appendChild(rowKontrol);

        ctrlBar._pcInjected = true;

        // 6. Pasang event listener
        document.getElementById('pcBtnJump').addEventListener('click', lompatKeHalaman);
        document.getElementById('pcBtnZoomOut').addEventListener('click', zoomOut);
        document.getElementById('pcBtnZoomIn').addEventListener('click', zoomIn);
        document.getElementById('pcBtnZoomReset').addEventListener('click', zoomReset);
        btnCetakPilihan.addEventListener('click', cetakRange);
        btnCetakSemua.addEventListener('click', cetakSemua);
        btnTutup.addEventListener('click', function() {
            if (_originalTutup) _originalTutup();
        });

        updatePageLimits();
    }

    // ================================================================
    // UPDATE BATAS HALAMAN OTOMATIS
    // ================================================================
    function updatePageLimits() {
        var pages = document.querySelectorAll('#printWrapper .page-pro');
        var total = pages.length;
        if (total === 0) return;

        var elTo = document.getElementById('pcTo');
        var elFrom = document.getElementById('pcFrom');
        var elJump = document.getElementById('pcJump');

        if (elTo)   { elTo.max = total; elTo.value = total; }
        if (elFrom) { elFrom.max = total; }
        if (elJump) { elJump.max = total; }

        // Terapkan skala default saat pertama kali buka preview
        applyZoom(_currentZoom);
    }

    // ================================================================
    // LOMPAT KE HALAMAN (lihat pratinjau)
    // ================================================================
    function lompatKeHalaman() {
        var target = parseInt(document.getElementById('pcJump').value) || 1;
        var pages = document.querySelectorAll('#printWrapper .page-pro');
        var total = pages.length;
        target = Math.max(1, Math.min(target, total));
        document.getElementById('pcJump').value = target;

        if (pages[target - 1]) {
            pages[target - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ================================================================
    // CETAK RENTANG HALAMAN
    // ================================================================
    function cetakRange() {
        var from = parseInt(document.getElementById('pcFrom').value) || 1;
        var to = parseInt(document.getElementById('pcTo').value) || 1;
        var pages = document.querySelectorAll('#printWrapper .page-pro');
        var total = pages.length;

        // Normalisasi: pastikan dalam rentang valid
        from = Math.max(1, Math.min(from, total));
        to = Math.max(from, Math.min(to, total));
        document.getElementById('pcFrom').value = from;
        document.getElementById('pcTo').value = to;

        // Sembunyikan halaman di luar range yang dipilih
        _hiddenPages = [];
        pages.forEach(function(page) {
            var pageNum = parseInt(page.dataset.lembar) || 0;
            if (pageNum < from || pageNum > to) {
                page.style.display = 'none';
                _hiddenPages.push(page);
            }
        });

        _rangePrintActive = true;
        window.print();
    }

    // ================================================================
    // CETAK SEMUA HALAMAN
    // ================================================================
    function cetakSemua() {
        _rangePrintActive = false;
        window.print();
    }

    // ================================================================
    // KEYBOARD: Enter di input = langsung eksekusi aksi terkait
    // ================================================================
    document.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter') return;
        var id = e.target.id;
        if (id === 'pcJump') { e.preventDefault(); lompatKeHalaman(); }
        if (id === 'pcFrom' || id === 'pcTo') { e.preventDefault(); cetakRange(); }
    });

    // ================================================================
    // OBSERVER: Deteksi saat mode pratinjau dibuka/di-refresh
    // ================================================================
    function startObserving() {
        var ctrlBar = document.getElementById('previewControlBar');
        if (!ctrlBar) return;

        new MutationObserver(function() {
            if (ctrlBar.style.display === 'flex') {
                setTimeout(function() {
                    if (ctrlBar._pcInjected) {
                        updatePageLimits();
                    } else {
                        injectControls();
                    }
                }, 200);
            }
        }).observe(ctrlBar, { attributes: true, attributeFilter: ['style'] });
    }

    // ================================================================
    // INIT: Injek CSS cetak sedini mungkin agar @page F4
    //         sudah menjadi aturan terakhir di dokumen.
    // ================================================================
    injectPrintCSS();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startObserving);
    } else {
        startObserving();
    }

})();
