/**
 * =====================================================================
 * PENDETEKSI PENJELASAN BELUM LENGKAP v2.0 (BUGFIX)
 * =====================================================================
 * v2.0 — Perbaikan 3 bug timing yang menyebabkan badge tidak muncul:
 *   BUG 1: Scan pertama berjalan sebelum data IndexedDB/cloud ter-restore
 *   BUG 2: Perubahan value di hidden input TIDAK memicu MutationObserver
 *   BUG 3: Tarik data dari cloud tidak memicu scan ulang
 *
 * Solusi: Tambah heartbeat 3 detik + hook ke fungsi restore/tarik data
 * =====================================================================
 */
(function () {
    'use strict';

    // === KONFIGURASI ===
    var DEBOUNCE_MS = 500;           // Jeda antar-scan cepat (ms)
    var HEARTBEAT_MS = 3000;         // Scan otomatis berkala (ms)
    var HIGHLIGHT_MS = 2500;         // Durasi sorotan kuning pada baris (ms)
    var PANEL_WIDTH_PX = 380;        // Lebar panel geser (px)
    var MAX_ITEMS_SHOW = 200;        // Batas maksimum item di panel
    var DELAY_SETELAH_BUILD = 2500;  // Tunggu data restore sebelum scan pertama

    // === STATE INTERNAL ===
    var _cache = [];                 // Array hasil deteksi terakhir
    var _cacheCount = -1;            // Jumlah masalah terakhir (untuk skip jika sama)
    var _timer = null;               // Timer debounce
    var _heartbeatId = null;         // Timer heartbeat
    var _panelOpen = false;          // Status panel terbuka/tutup
    var _badgePulse = false;         // Animasi pulse aktif?
    var _observer = null;            // MutationObserver reference
    var _tabelSiap = false;          // Tabel sudah pernah dibangun?
    var _lastScanHash = '';          // Hash ringkas untuk deteksi perubahan

    // =========================================================================
    // 1. INJEKSI CSS
    // =========================================================================
    function _injectCSS() {
        if (document.getElementById('css-pendeteksi')) return;
        var s = document.createElement('style');
        s.id = 'css-pendeteksi';
        var pw = PANEL_WIDTH_PX;
        s.textContent =
'#pd-badge{position:fixed;right:0;top:calc(50% - 60px);transform:translateY(-50%);z-index:8000;cursor:pointer;display:none;flex-direction:column;align-items:center;justify-content:center;width:42px;height:42px;border-radius:12px 0 0 12px;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;font-family:Arial,sans-serif;font-weight:800;font-size:15px;box-shadow:-3px 0 12px rgba(239,68,68,0.4);transition:width .25s ease,box-shadow .25s ease;user-select:none;-webkit-user-select:none}' +
'#pd-badge:hover{width:52px;box-shadow:-4px 0 20px rgba(239,68,68,0.6)}' +
'#pd-badge.pd-pulse{animation:pdPulse 2s ease-in-out infinite}' +
'#pd-badge .pd-badge-icon{font-size:16px;line-height:1}' +
'#pd-badge .pd-badge-count{font-size:13px;font-weight:900;line-height:1.1;margin-top:1px}' +
'#pd-badge .pd-badge-label{font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;opacity:.85;writing-mode:vertical-rl;text-orientation:mixed;margin-top:3px}' +
'@keyframes pdPulse{0%,100%{box-shadow:-3px 0 12px rgba(239,68,68,.4)}50%{box-shadow:-3px 0 24px rgba(239,68,68,.7),0 0 0 6px rgba(239,68,68,.1)}}' +
'#pd-close-btn{position:absolute;top:10px;right:10px;width:30px;height:30px;border-radius:50%;border:1px solid #e2e8f0;background:#fff;color:#64748b;font-size:14px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;z-index:10}' +
'#pd-close-btn:hover{background:#fef2f2;border-color:#fca5a5;color:#dc2626}' +
'#pd-panel{position:fixed;top:0;right:-' + pw + 'px;width:' + pw + 'px;height:100vh;background:#fff;box-shadow:-8px 0 30px rgba(0,0,0,.12);z-index:8001;display:flex;flex-direction:column;transition:right .3s cubic-bezier(.4,0,.2,1);font-family:Arial,sans-serif}' +
'#pd-panel.pd-open{right:0}' +
'#pd-header{padding:16px 18px 12px;border-bottom:1px solid #e2e8f0;background:#f8fafc;flex-shrink:0}' +
'#pd-header-title{font-size:13px;font-weight:800;color:#0f172a;margin:0 0 2px;letter-spacing:-.2px}' +
'#pd-header-sub{font-size:10px;font-weight:600;color:#94a3b8;margin:0}' +
'#pd-summary-bar{display:flex;gap:8px;padding:10px 18px;background:#fff;border-bottom:1px solid #f1f5f9;flex-shrink:0}' +
'.pd-chip{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:10px;font-weight:700}' +
'.pd-chip-kosong{background:#fef2f2;color:#991b1b;border:1px solid #fecaca}' +
'.pd-chip-selisih{background:#fff7ed;color:#9a3412;border:1px solid #fed7aa}' +
'.pd-chip-draf{background:#fefce8;color:#854d0e;border:1px solid #fef08a}' +
'#pd-list{flex:1;overflow-y:auto;padding:8px 10px}' +
'#pd-list::-webkit-scrollbar{width:5px}' +
'#pd-list::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:10px}' +
'.pd-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;margin-bottom:6px;border-radius:8px;border:1px solid #f1f5f9;background:#fff;cursor:pointer;transition:all .15s}' +
'.pd-item:hover{border-color:#cbd5e1;box-shadow:0 2px 8px rgba(0,0,0,.06);transform:translateX(-2px)}' +
'.pd-item-icon{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0;margin-top:2px}' +
'.pd-item-icon.kosong{background:#fee2e2;color:#dc2626}' +
'.pd-item-icon.selisih{background:#ffedd5;color:#ea580c}' +
'.pd-item-icon.draf{background:#fef9c3;color:#ca8a04}' +
'.pd-item-body{flex:1;min-width:0}' +
'.pd-item-uraian{font-size:11px;font-weight:700;color:#1e293b;line-height:1.3;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
'.pd-item-kode{font-size:9px;font-weight:600;color:#94a3b8;margin-bottom:3px;font-family:monospace}' +
'.pd-item-desc{font-size:10px;font-weight:600;line-height:1.3}' +
'.pd-item-desc.kosong{color:#dc2626}' +
'.pd-item-desc.selisih{color:#ea580c}' +
'.pd-item-desc.draf{color:#ca8a04}' +
'.pd-item-rea{font-size:9px;font-weight:600;color:#64748b;margin-top:2px}' +
'.pd-highlight{background-color:#fef08a!important;transition:background-color .3s ease!important}' +
'#pd-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;color:#94a3b8}' +
'#pd-empty i{font-size:36px;margin-bottom:12px;color:#10b981}' +
'#pd-empty .pd-empty-title{font-size:13px;font-weight:800;color:#0f172a;margin-bottom:4px}' +
'#pd-empty .pd-empty-desc{font-size:11px;color:#64748b;text-align:center;line-height:1.4}' +
'#pd-overlay{position:fixed;inset:0;background:rgba(15,23,42,.3);z-index:8000;display:none;backdrop-filter:blur(2px);-webkit-backdrop-filter:blur(2px)}' +
'#pd-overlay.pd-show{display:block}' +
'#pd-footer{padding:10px 18px;border-top:1px solid #e2e8f0;background:#f8fafc;flex-shrink:0}' +
'#pd-footer-text{font-size:9px;font-weight:600;color:#94a3b8;text-align:center;margin:0}' +
'@media print{#pd-badge,#pd-panel,#pd-overlay{display:none!important}}' +
'body.preview-active #pd-badge,body.preview-active #pd-panel,body.preview-active #pd-overlay{display:none!important}';
        document.head.appendChild(s);
    }

    // =========================================================================
    // 2. BANGUN ELEMEN DOM
    // =========================================================================
    function _buildUI() {
        var badge = document.createElement('div');
        badge.id = 'pd-badge';
        badge.title = 'Pendeteksi Penjelasan Belum Lengkap';
        badge.innerHTML = '<i class="fa-solid fa-magnifying-glass pd-badge-icon"></i>' +
            '<span class="pd-badge-count">0</span>' +
            '<span class="pd-badge-label">CEK</span>';
        badge.addEventListener('click', _togglePanel);
        document.body.appendChild(badge);

        var overlay = document.createElement('div');
        overlay.id = 'pd-overlay';
        overlay.addEventListener('click', _closePanel);
        document.body.appendChild(overlay);

        var panel = document.createElement('div');
        panel.id = 'pd-panel';
        panel.innerHTML =
            '<button id="pd-close-btn" title="Tutup Panel"><i class="fa-solid fa-xmark"></i></button>' +
            '<div id="pd-header">' +
                '<p id="pd-header-title">Pendeteksi Penjelasan</p>' +
                '<p id="pd-header-sub">Menunggu data diupload...</p>' +
            '</div>' +
            '<div id="pd-summary-bar"></div>' +
            '<div id="pd-list"></div>' +
            '<div id="pd-footer"><p id="pd-footer-text">Otomatis memindai setiap ada perubahan data</p></div>';
        document.body.appendChild(panel);

        document.getElementById('pd-close-btn').addEventListener('click', _closePanel);
    }

    // =========================================================================
    // 3. MESIN DETEKSI
    // =========================================================================

    /**
     * Hitung hash ringkas dari semua value input-database.
     * Digunakan untuk skip scan jika tidak ada perubahan data.
     */
    function _hitungHash() {
        var hash = '';
        var inputs = document.getElementsByClassName('input-database');
        var len = inputs.length;
        for (var i = 0; i < len; i++) {
            var v = inputs[i].value;
            hash += v.length + ':' + (v.charAt(0) || '') + (v.charAt(v.length - 1) || '') + ',';
        }
        return hash;
    }

    /**
     * Memindai semua baris rincian, mengembalikan array masalah.
     */
    function _scanSemuaBaris() {
        var hasil = [];
        var semuaInput = document.getElementsByClassName('input-database');

        for (var i = 0; i < semuaInput.length && hasil.length < MAX_ITEMS_SHOW; i++) {
            var inp = semuaInput[i];
            var rowID = inp.getAttribute('data-rowid');
            if (!rowID) continue;

            // Hanya baris rincian (bukaAsisten), bukan keterangan (bukaKeterangan)
            var btn = document.getElementById('btn_' + rowID);
            if (!btn) continue;
            var onclickAttr = btn.getAttribute('onclick') || '';
            if (onclickAttr.indexOf('bukaAsisten') === -1) continue;

            var realisasi = parseFloat(inp.getAttribute('data-realisasi')) || 0;
            if (realisasi === 0) continue;

            var tr = inp.closest('tr');
            if (!tr) continue;
            if (tr.style.display === 'none') continue;

            var tds = tr.querySelectorAll('td');
            var kode = tds[0] ? tds[0].innerText.trim() : '';
            var uraian = tds[1] ? tds[1].innerText.trim() : '';
            if (!uraian) continue;

            var val = inp.value.trim();
            var printEl = document.getElementById('print_' + rowID);
            var printText = printEl ? (printEl.innerText || '').trim() : '';

            // TIPE 1: KOSONG
            if (!val || val === '[]' || val === '""' || printText === '') {
                hasil.push({ rowID: rowID, kode: kode, uraian: uraian, realisasi: realisasi, tipe: 'kosong', deskripsi: 'Belum ada rincian penjelasan' });
                continue;
            }

            // TIPE 2: SELISIH
            var totalHitung = 0;
            if (typeof window.hitungTotalDariTeks === 'function') {
                totalHitung = window.hitungTotalDariTeks(printText);
            }
            var selisih = Math.abs(totalHitung - realisasi);

            if (selisih >= 1) {
                var formatRp = { minimumFractionDigits: 0 };
                var selisihStr;
                if (totalHitung < realisasi) {
                    selisihStr = 'Kurang Rp ' + (realisasi - totalHitung).toLocaleString('id-ID', formatRp);
                } else {
                    selisihStr = 'Lebih Rp ' + (totalHitung - realisasi).toLocaleString('id-ID', formatRp);
                }
                hasil.push({ rowID: rowID, kode: kode, uraian: uraian, realisasi: realisasi, tipe: 'selisih', deskripsi: selisihStr });
                continue;
            }

            // TIPE 3: DRAF BERMASALAH
            if (typeof window.cekKualitasTeks === 'function') {
                var statusTeks = window.cekKualitasTeks(printText);
                if (statusTeks !== 'OK') {
                    hasil.push({ rowID: rowID, kode: kode, uraian: uraian, realisasi: realisasi, tipe: 'draf', deskripsi: 'Draf: ' + statusTeks });
                }
            }
        }

        return hasil;
    }

    // =========================================================================
    // 4. UPDATE UI
    // =========================================================================
    function _updateUI(forceRender) {
        // Cek hash dulu — skip jika tidak ada perubahan data
        var newHash = _hitungHash();
        if (!forceRender && newHash === _lastScanHash) return;
        _lastScanHash = newHash;

        _cache = _scanSemuaBaris();
        var total = _cache.length;

        // Skip jika jumlah tidak berubah DAN panel tidak terbuka
        if (!forceRender && total === _cacheCount && !_panelOpen) return;
        _cacheCount = total;

        var badge = document.getElementById('pd-badge');
        if (!badge) return;

        if (total === 0) {
            badge.style.display = 'none';
            badge.classList.remove('pd-pulse');
            _badgePulse = false;
        } else {
            badge.style.display = 'flex';
            badge.querySelector('.pd-badge-count').textContent = total > 99 ? '99+' : total;
            if (!_badgePulse) {
                badge.classList.add('pd-pulse');
                _badgePulse = true;
            }
        }

        if (_panelOpen) _renderPanel();
    }

    function _renderPanel() {
        var listEl = document.getElementById('pd-list');
        var subEl = document.getElementById('pd-header-sub');
        var sumEl = document.getElementById('pd-summary-bar');
        if (!listEl) return;

        var total = _cache.length;
        var nKosong = 0, nSelisih = 0, nDraf = 0;
        for (var i = 0; i < _cache.length; i++) {
            if (_cache[i].tipe === 'kosong') nKosong++;
            else if (_cache[i].tipe === 'selisih') nSelisih++;
            else if (_cache[i].tipe === 'draf') nDraf++;
        }

        if (subEl) subEl.textContent = total === 0 ? 'Semua penjelasan sudah lengkap dan valid' : 'Ditemukan ' + total + ' baris yang perlu diisi atau diperbaiki';

        if (sumEl) {
            var chips = '';
            if (nKosong > 0) chips += '<span class="pd-chip pd-chip-kosong"><i class="fa-regular fa-circle-xmark"></i> ' + nKosong + ' Kosong</span>';
            if (nSelisih > 0) chips += '<span class="pd-chip pd-chip-selisih"><i class="fa-solid fa-scale-unbalanced"></i> ' + nSelisih + ' Selisih</span>';
            if (nDraf > 0) chips += '<span class="pd-chip pd-chip-draf"><i class="fa-solid fa-triangle-exclamation"></i> ' + nDraf + ' Draf</span>';
            sumEl.innerHTML = chips;
        }

        if (total === 0) {
            listEl.innerHTML = '<div id="pd-empty"><i class="fa-solid fa-circle-check"></i><div class="pd-empty-title">SEMUA VALID</div><div class="pd-empty-desc">Tidak ada penjelasan yang bermasalah.<br>Semua rincian sudah lengkap dan sesuai.</div></div>';
            return;
        }

        var html = '';
        var formatRp = { minimumFractionDigits: 0 };
        for (var i = 0; i < _cache.length; i++) {
            var item = _cache[i];
            var iconClass, iconHtml;
            if (item.tipe === 'kosong') { iconClass = 'kosong'; iconHtml = '<i class="fa-regular fa-circle-xmark"></i>'; }
            else if (item.tipe === 'selisih') { iconClass = 'selisih'; iconHtml = '<i class="fa-solid fa-scale-unbalanced"></i>'; }
            else { iconClass = 'draf'; iconHtml = '<i class="fa-solid fa-triangle-exclamation"></i>'; }

            var uraianEsc = item.uraian.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            var kodeEsc = item.kode.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            var reaStr = 'Rp ' + item.realisasi.toLocaleString('id-ID', formatRp);

            html += '<div class="pd-item" data-rowid="' + item.rowID + '">' +
                '<div class="pd-item-icon ' + iconClass + '">' + iconHtml + '</div>' +
                '<div class="pd-item-body">' +
                '<div class="pd-item-uraian" title="' + uraianEsc + '">' + uraianEsc + '</div>' +
                (kodeEsc ? '<div class="pd-item-kode">' + kodeEsc + '</div>' : '') +
                '<div class="pd-item-desc ' + iconClass + '">' + item.deskripsi.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
                '<div class="pd-item-rea">Realisasi: ' + reaStr + '</div>' +
                '</div></div>';
        }
        listEl.innerHTML = html;

        listEl.onclick = function (e) {
            var itemEl = e.target.closest('.pd-item');
            if (!itemEl) return;
            _scrollKeBaris(itemEl.getAttribute('data-rowid'));
        };
    }

    // =========================================================================
    // 5. SCROLL & HIGHLIGHT
    // =========================================================================
    function _scrollKeBaris(rowID) {
        var inp = document.getElementById('val_' + rowID);
        if (!inp) return;
        var tr = inp.closest('tr');
        if (!tr) return;
        tr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        tr.classList.add('pd-highlight');
        setTimeout(function () { tr.classList.remove('pd-highlight'); }, HIGHLIGHT_MS);
        _closePanel();
    }

    // =========================================================================
    // 6. BUKA / TUTUP PANEL
    // =========================================================================
    function _togglePanel() {
        if (_panelOpen) _closePanel(); else _openPanel();
    }
    function _openPanel() {
        _panelOpen = true;
        var p = document.getElementById('pd-panel');
        var o = document.getElementById('pd-overlay');
        if (p) p.classList.add('pd-open');
        if (o) o.classList.add('pd-show');
        _updateUI(true);
    }
    function _closePanel() {
        _panelOpen = false;
        var p = document.getElementById('pd-panel');
        var o = document.getElementById('pd-overlay');
        if (p) p.classList.remove('pd-open');
        if (o) o.classList.remove('pd-show');
    }

    // =========================================================================
    // 7. TRIGGER — 5 Cara Pendeteksi Dipicu
    // =========================================================================

    /** Jadwalkan scan dengan debounce */
    function _jadwalkanScan() {
        clearTimeout(_timer);
        _timer = setTimeout(function () {
            if (document.body.classList.contains('preview-active')) return;
            _tabelSiap = true;
            _updateUI(false);
        }, DEBOUNCE_MS);
    }

    /** TRIGGER 1: MutationObserver saat DOM tabel berubah (upload Excel, filter) */
    function _pasangObserver() {
        var target = document.getElementById('containerRender');
        if (!target) return;
        _observer = new MutationObserver(function (mutations) {
            var adaPerubahan = false;
            for (var i = 0; i < mutations.length; i++) {
                if (mutations[i].addedNodes.length > 0 || mutations[i].removedNodes.length > 0) {
                    adaPerubahan = true; break;
                }
            }
            if (adaPerubahan) {
                // Setelah tabel dibangun ulang, tunggu lebih lama
                // karena autoRestoreIndexedDB() butuh waktu
                _tabelSiap = false;
                _lastScanHash = ''; // Reset hash supaya scan pasti jalan
                clearTimeout(_timer);
                _timer = setTimeout(function () {
                    if (document.body.classList.contains('preview-active')) return;
                    _tabelSiap = true;
                    _updateUI(false);
                }, DELAY_SETELAH_BUILD);
            }
        });
        _observer.observe(target, { childList: true, subtree: false });
    }

    /** TRIGGER 2: Hook ke simpanDariModal dan simpanKeterangan */
    function _pasangHookSimpan() {
        var origSimpan = window.simpanDariModal;
        if (typeof origSimpan === 'function') {
            window.simpanDariModal = function () {
                var result = origSimpan.apply(this, arguments);
                _lastScanHash = ''; // Force rescan
                setTimeout(function () { _jadwalkanScan(); }, 400);
                return result;
            };
        }
        var origKet = window.simpanKeterangan;
        if (typeof origKet === 'function') {
            window.simpanKeterangan = function () {
                var result = origKet.apply(this, arguments);
                _lastScanHash = '';
                setTimeout(function () { _jadwalkanScan(); }, 400);
                return result;
            };
        }
    }

    /** TRIGGER 3: Hook ke fungsi restore/tarik data dari cloud */
    function _pasangHookRestore() {
        // Hook eksekusiTarikDataLRA — ini fungsi yang menarik data dari server
        // dan mengisi val_ + print_ per baris. MutationObserver TIDAK menangkap
        // perubahan value/innerHTML, hanya penambahan/penghapusan elemen.
        var origTarik = window.eksekusiTarikDataLRA;
        if (typeof origTarik === 'function') {
            window.eksekusiTarikDataLRA = function () {
                var result = origTarik.apply(this, arguments);
                // Data dari cloud sudah masuk ke DOM, scan ulang
                _lastScanHash = '';
                setTimeout(function () { _jadwalkanScan(); }, 800);
                return result;
            };
        }

        // Hook simpanDraftDariModal jika ada
        var origDraft = window.simpanDraftDariModal;
        if (typeof origDraft === 'function') {
            window.simpanDraftDariModal = function () {
                var result = origDraft.apply(this, arguments);
                _lastScanHash = '';
                setTimeout(function () { _jadwalkanScan(); }, 400);
                return result;
            };
        }
    }

    /** TRIGGER 4: Listener filter belanja */
    function _pasangListenerFilter() {
        var sel = document.getElementById('selectFilterBelanja');
        if (sel) {
            sel.addEventListener('change', function () {
                _lastScanHash = '';
                setTimeout(function () { _jadwalkanScan(); }, 600);
            });
        }
    }

    /** TRIGGER 5: Heartbeat — scan berkala untuk menangkap perubahan yang terlewat */
    function _mulaiHeartbeat() {
        _heartbeatId = setInterval(function () {
            // Jangan scan jika:
            // - Tidak ada tabel yang pernah dibangun
            // - Sedang mode preview cetak
            if (!_tabelSiap) return;
            if (document.body.classList.contains('preview-active')) return;
            // Cepat check pakai getElementsByClassName (live collection, sangat ringan)
            // daripada querySelector yang harus parse CSS selector
            if (!document.getElementsByClassName('input-database').length) return;

            _updateUI(false);
        }, HEARTBEAT_MS);
    }

    // =========================================================================
    // 8. INISIALISASI
    // =========================================================================
    function _init() {
        _injectCSS();
        _buildUI();
        _pasangObserver();
        _pasangHookSimpan();
        _pasangHookRestore();
        _pasangListenerFilter();
        _mulaiHeartbeat();

        // CRITICAL FIX: Setelah refresh, data IndexedDB ter-restore tapi
        // TIDAK menambah/menghapus elemen DOM (hanya ubah value/innerText).
        // MutationObserver (subtree:false) tidak menangkap ini, jadi _tabelSiap
        // tidak pernah jadi true. Solusi: cek berkala apakah data sudah muncul.
        _scanAwalSetelahRefresh();
    }

    /**
     * Polling ringan setelah refresh: cek tiap 500ms apakah .input-database
     * sudah ada. Kalau sudah, aktifkan scan dan hentikan polling.
     * Maksimal polling 15 detik (30x500ms) lalu berhenti sendiri.
     */
    function _scanAwalSetelahRefresh() {
        var pollCount = 0;
        var maxPoll = 30; // 30 x 500ms = 15 detik max
        var pollId = setInterval(function () {
            pollCount++;
            if (document.body.classList.contains('preview-active')) return;

            var inputs = document.getElementsByClassName('input-database');
            if (inputs.length > 0) {
                // Data sudah ada di DOM — aktifkan tabel dan scan
                _tabelSiap = true;
                _lastScanHash = ''; // Force scan pasti jalan
                _updateUI(false);
                clearInterval(pollId); // Berhenti polling
            } else if (pollCount >= maxPoll) {
                clearInterval(pollId); // Timeout, berhenti
            }
        }, 500);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }

})();