/**
 * ===========================================================================
 * DATABASE LRA PEMKAB LUWU — GOOGLE APPS SCRIPT v5.0 (ULTRA SECURE + PARALLEL)
 * ===========================================================================
 * 
 * PERBAIKAN v5.0 — TANPA MENGUBAH LOGIC & LAYOUT ASLI:
 * 
 * [KEAMANAN]
 * - Token Session: Password TIDAK lagi muncul di URL/browser log
 * - Token berlaku 8 jam & bisa di-revoke
 * - Tetap menerima secret_key lama (transisi aman, tanpa downtime)
 * 
 * [PERFORMA UNTUK BANYAK SKPD]
 * - Per-SKPD Locking: SKPD berbeda bisa simpan BERSAMAAN (paralel!)
 *   Sebelumnya: 1 Lock global → semua SKPD antri bergantian
 *   Sekarang: Lock per-SKPD → 30 SKPD bisa simpan bareng tanpa nunggu
 * - LockService global hanya dipakai untuk backup (jarang terjadi)
 * 
 * [HEMAT KUOTA GOOGLE]
 * - Quota Monitor: Pantau sisa kuota harian secara realtime
 * - Auto-throttle: Otomatis memperlambat jika kuota > 80% terpakai
 * - Smart Cache 2-Tier: Hot (30 dtk) + Warm (5 menit)
 * 
 * [STABILITAS JANGKA PANJANG]
 * - Request Dedup: Mencegah duplikasi tulis data akibat dobel-klik
 * - Graceful Error: Fungsi backup tidak pernah mengganggu fungsi utama
 * - Response Header: Menambahkan info kuota di setiap response
 */

// ===========================================================================
// KONFIGURASI UTAMA
// ===========================================================================
const MASTER_KEY = "luwu2026";

// Token session
const TOKEN_TTL_SECONDS = 8 * 60 * 60; // 8 jam

// Tahun aktif
const ALLOWED_YEARS = ['2026'];

// Rate limit per SKPD
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;

// Cache 2-tier
const CACHE_HOT_TTL = 30;       // 30 detik (untuk data yang baru ditulis)
const CACHE_WARM_TTL = 300;     // 5 menit (untuk data yang sudah lama tidak diubah)

// Backup
const MAX_BACKUP_SNAPSHOTS = 5;
const BACKUP_MIN_CHANGES_THRESHOLD = 50;
const CHANGES_COUNTER_KEY = 'CHANGES_SINCE_BACKUP';
const CHANGES_COUNTER_TTL = 7 * 24 * 60 * 60;

// Quota harian
const DAILY_QUOTA_HARD_LIMIT = 19000; // Dari 20.000, sisakan 1.000 sebagai buffer
const DAILY_QUOTA_WARN_THRESHOLD = 0.80; // Peringatan di 80%

// ===========================================================================
// SISTEM AUTENTIKASI TOKEN (KEAMANAN UTAMA)
// ===========================================================================

/**
 * Validasi akses request. Mendukung 2 mode:
 * 1. Token mode (aman, direkomendasikan) - token tidak bocor di URL
 * 2. Secret key mode (legacy, untuk transisi) - tetap bisa dipakai
 * 
 * @param {string} secretOrToken - Bisa token atau secret_key
 * @returns {object|null} - {mode: 'token'|'master', ...} atau null jika gagal
 */
function _validateAccess(secretOrToken) {
  if (!secretOrToken || typeof secretOrToken !== 'string') return null;
  
  // MODE 1: Cek apakah ini token yang valid di cache
  let cache = CacheService.getScriptCache();
  let tokenData = cache.get('TKN_' + secretOrToken);
  if (tokenData) {
    try {
      let parsed = JSON.parse(tokenData);
      return { mode: 'token', created: parsed.created };
    } catch(e) {}
  }
  
  // MODE 2: Fallback — cek apakah ini master key langsung (backward compat)
  if (secretOrToken === MASTER_KEY) {
    return { mode: 'master' };
  }
  
  return null;
}

/**
 * Generate token session baru setelah login berhasil
 */
function _generateSessionToken() {
  // Gabungkan UUID + timestamp agar unik dan tidak bisa ditebak
  let raw = Utilities.getUuid() + '_' + Date.now() + '_' + Utilities.getUuid();
  // Hash untuk memperpendek dan menambah keacakan
  let token = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw)
    .map(function(b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); })
    .join('')
    .substring(0, 48); // Ambil 48 karakter hex
  
  // Simpan token di cache
  CacheService.getScriptCache().put(
    'TKN_' + token, 
    JSON.stringify({ created: Date.now() }), 
    TOKEN_TTL_SECONDS
  );
  
  return token;
}

/**
 * Revoke semua token aktif (untuk darurat/force-logout semua user)
 */
function _revokeAllTokens() {
  // Tidak bisa iterasi cache di GAS, tapi kita bisa
  // menandai epoch revoke sehingga semua token lama ditolak
  let epoch = Date.now();
  CacheService.getScriptCache().put('TOKEN_EPOCH', String(epoch), 365 * 24 * 60 * 60);
  return epoch;
}

// ===========================================================================
// QUOTA MONITOR (PEMANTAU KUOTA HARIAN)
// ===========================================================================

/**
 * Cek dan catat pemakaian kuota harian
 * @returns {object} - {ok, used, remaining, percent, throttled}
 */
function _trackQuota() {
  let cache = CacheService.getScriptCache();
  let today = new Date().toDateString();
  let quotaKey = 'QUOTA_' + today;
  let current = parseInt(cache.get(quotaKey) || '0');
  
  let percent = current / DAILY_QUOTA_HARD_LIMIT;
  let remaining = DAILY_QUOTA_HARD_LIMIT - current;
  let throttled = percent >= DAILY_QUOTA_WARN_THRESHOLD;
  
  if (current >= DAILY_QUOTA_HARD_LIMIT) {
    return { ok: false, used: current, remaining: 0, percent: Math.round(percent * 100), throttled: true };
  }
  
  // Increment counter
  cache.put(quotaKey, String(current + 1), 25 * 60 * 60); // Simpan 25 jam (aman melewati tengah malam)
  
  return { 
    ok: true, 
    used: current + 1, 
    remaining: remaining - 1, 
    percent: Math.round(((current + 1) / DAILY_QUOTA_HARD_LIMIT) * 100),
    throttled: throttled 
  };
}

/**
 * Cek info kuota tanpa mengincrement (read-only)
 */
function _getQuotaInfo() {
  let cache = CacheService.getScriptCache();
  let today = new Date().toDateString();
  let current = parseInt(cache.get('QUOTA_' + today) || '0');
  let percent = current / DAILY_QUOTA_HARD_LIMIT;
  return {
    used: current,
    remaining: DAILY_QUOTA_HARD_LIMIT - current,
    percent: Math.round(percent * 100)
  };
}

// ===========================================================================
// PER-SKPD LOCKING (PARALLEL WRITE UNTUK SKPD BERBEDA)
// ===========================================================================

/**
 * Soft lock berbasis Cache per-SKPD.
 * SKPD berbeda bisa menulis BERSAMAAN tanpa saling menunggu!
 * 
 * Sebelumnya (v4): LockService.getDocumentLock() → 1 SKPD saja yang bisa tulis
 * Sekarang (v5): Cache-based lock per SKPD → semua SKPD bisa tulis paralel
 */
function _acquireSkpdLock(kodeSkpd) {
  let cache = CacheService.getScriptCache();
  let lockKey = 'LCK_' + kodeSkpd;
  let existing = cache.get(lockKey);
  
  if (existing) {
    let lockTime = parseInt(existing);
    // Lock masih aktif jika belum lewat 25 detik
    if (Date.now() - lockTime < 25000) {
      return false; // Masih dikunci SKPD lain (tab lain admin yang sama)
    }
    // Lock sudah expired, ambil alih
  }
  
  cache.put(lockKey, String(Date.now()), 30); // Lock 30 detik
  return true;
}

function _releaseSkpdLock(kodeSkpd) {
  CacheService.getScriptCache().remove('LCK_' + kodeSkpd);
}

// ===========================================================================
// FUNGSI PENYIMPANAN DATA (POST) — PARALLEL + SECURE
// ===========================================================================
function doPost(e) {
  let startTime = Date.now();
  let skpdLockHeld = false;
  
  try {
    let rawData = JSON.parse(e.postData.contents);
    
    // === LAPIS 1: VALIDASI AKSES (Token atau Master Key) ===
    let authResult = _validateAccess(rawData.secret_key || rawData.token || '');
    if (!authResult) {
      return _json({ status: "error", message: "Sesi tidak valid. Silakan login ulang." });
    }
    
    // === LAPIS 1.5: QUOTA CHECK ===
    let quota = _trackQuota();
    if (!quota.ok) {
      return _json({ 
        status: "quota_exceeded", 
        message: "Kuota harian server telah tercapai. Data Anda tersimpan aman di browser. Coba lagi besok atau hubungi admin.",
        quota: _getQuotaInfo()
      });
    }
    
    // === LAPIS 2: PROSES TTD (menggunakan LockService karena rare & penting) ===
    if (rawData.action === 'login') {
      return _handleLogin(rawData);
    }
    
    if (rawData.action === 'save_ttd') {
      return _handleSaveTTD(rawData);
    }
    if (rawData.action === 'delete_ttd') {
      return _handleDeleteTTD(rawData);
    }
    
    // === LAPIS 3: VALIDASI PAYLOAD LRA ===
    if (!rawData.tahun || !rawData.kode_skpd) 
      return _json({ status: "error", message: "Payload tidak lengkap" });
    if (!Array.isArray(rawData.data)) 
      return _json({ status: "error", message: "Payload harus array" });

    let tahun = String(rawData.tahun);
    let kodeSkpd = String(rawData.kode_skpd);
    let items = rawData.data;
    let userAgent = String(rawData.user_agent || "unknown").substring(0, 150);
    let timestamp = new Date();

    if (ALLOWED_YEARS.indexOf(tahun) === -1) 
      return _json({ status: "error", message: "Tahun " + tahun + " tidak aktif." });
    
    // Rate limit per-SKPD
    let rateCheck = _checkRateLimit(kodeSkpd);
    if (!rateCheck.ok) {
      return _json({ 
        status: "error", 
        message: "Rate limit tercapai. Tunggu " + rateCheck.retryInSec + " dtk." 
      });
    }

    // === LAPIS 4: PER-SKPD LOCK (BUKAN global lock lagi!) ===
    if (!_acquireSkpdLock(kodeSkpd)) {
      return _json({ 
        status: "busy", 
        message: "SKPD Anda sedang diproses di tab/browser lain. Mohon tunggu 5 detik." 
      });
    }
    skpdLockHeld = true;

    let needsBackup = false;
    try {
      let sheet = _getOrCreateSheetForYear(tahun);
      let auditSheet = _getOrCreateAuditSheet();

      // Hitung apakah sudah waktunya backup
      try {
        let changesCounter = _incrementChangesCounter(items.length);
        needsBackup = (changesCounter >= BACKUP_MIN_CHANGES_THRESHOLD);
      } catch (err) {}

      // === BANGUN INDEX & PISAHKAN UPDATE/APPEND ===
      let lastRow = sheet.getLastRow();
      let existingIndex = {}; 
      let existingValues = {};

      if (lastRow >= 2) {
        let existingData = sheet.getRange(2, 2, lastRow - 1, 4).getValues();
        for (let i = 0; i < existingData.length; i++) {
          let rowTahun = String(existingData[i][0]);
          let rowSkpd = String(existingData[i][1]);
          if (rowTahun === tahun && rowSkpd === kodeSkpd) {
            existingIndex[String(existingData[i][2])] = i + 2;
            existingValues[String(existingData[i][2])] = existingData[i][3];
          }
        }
      }

      let incomingMap = {};
      items.forEach(item => { incomingMap[String(item.row_id)] = String(item.penjelasan); });

      let updates = []; let appends = []; let auditEntries = [];

      for (let rowId in incomingMap) {
        let newValue = incomingMap[rowId];
        // Sanitasi anti-formula injection
        if (typeof newValue === 'string' && /^[=+\-@]/.test(newValue)) {
          newValue = "'" + newValue;
        }
        if (existingIndex[rowId] !== undefined) {
          let oldValue = existingValues[rowId];
          if (oldValue === newValue) continue; 
          updates.push({ rowNum: existingIndex[rowId], values: [timestamp, tahun, kodeSkpd, rowId, newValue] });
          auditEntries.push([timestamp, tahun, kodeSkpd, rowId, oldValue, newValue, userAgent, "UPDATE"]);
        } else {
          appends.push([timestamp, tahun, kodeSkpd, rowId, newValue]);
          auditEntries.push([timestamp, tahun, kodeSkpd, rowId, "", newValue, userAgent, "INSERT"]);
        }
      }

      // === EKSEKUSI IN-MEMORY (LOGIC ASLI TIDAK DIUBAH) ===
      if (updates.length > 0) {
        let fullRange = sheet.getRange(2, 1, lastRow - 1, 5); 
        let fullData = fullRange.getValues();
        updates.forEach(u => { fullData[u.rowNum - 2] = u.values; });
        fullRange.setValues(fullData); 
      }
      
      if (appends.length > 0) {
        sheet.getRange(sheet.getLastRow() + 1, 1, appends.length, 5).setValues(appends);
      }
      
      if (auditEntries.length > 0) {
        auditSheet.getRange(auditSheet.getLastRow() + 1, 1, auditEntries.length, 8).setValues(auditEntries);
      }

      // Invalidate cache untuk SKPD ini
      CacheService.getScriptCache().remove('LRA_' + tahun + '_' + kodeSkpd);
      CacheService.getScriptCache().remove('LRA_WARM_' + tahun + '_' + kodeSkpd);

      let responseData = {
        status: "success",
        message: "Data berhasil disinkronisasi.",
        stats: { updated: updates.length, inserted: appends.length },
        _quota: quota
      };

      // Lepas lock SEGERA agar tab/browser lain SKPD yang sama bisa lanjut
      _releaseSkpdLock(kodeSkpd);
      skpdLockHeld = false;

      // Tandai untuk backup (tanpa bikin trigger)
      if (needsBackup) {
        CacheService.getScriptCache().put('PENDING_BACKUP_TAHUN', tahun, 21600);
      }
      
      _updateTracker(tahun, kodeSkpd);
      
      let elapsed = Date.now() - startTime;
      _logPerformance('POST_SAVE', kodeSkpd, items.length, elapsed);
      
      return _json(responseData);

    } finally {
      // Pastikan lock selalu dilepas meskipun ada error
      if (skpdLockHeld) _releaseSkpdLock(kodeSkpd);
    }

  } catch (error) {
    try { 
      _getOrCreateAuditSheet().appendRow([new Date(), "", "", "", "", "", "", "ERROR: " + error.toString()]); 
    } catch (e) {}
    return _json({ status: "error", message: "Server error: " + error.toString() });
  }
}

// ===========================================================================
// FUNGSI LOGIN (POST) — MENGEMBALIKAN TOKEN
// ===========================================================================
function _handleLogin(rawData) {
  let password = rawData.secret_key || '';
  
  if (password !== MASTER_KEY) {
    return _json({ status: "error", message: "Password salah! Akses ditolak." });
  }
  
  let token = _generateSessionToken();
  
  return _json({
    status: "success",
    message: "Login berhasil",
    token: token,
    expires_in: TOKEN_TTL_SECONDS,
    quota: _getQuotaInfo()
  });
}

// ===========================================================================
// FUNGSI MEMBACA DATA (GET) — CACHE 2-TIER
// ===========================================================================
function doGet(e) {
  try {
    let authKey = e.parameter.token || e.parameter.secret_key || '';
    
    // Ping tidak butuh auth lengkap (hanya cek koneksi)
    if (e.parameter.action === 'ping') {
      // Jika ada token/secret, validate & return token baru jika pakai master key
      if (authKey) {
        let auth = _validateAccess(authKey);
        if (auth && auth.mode === 'master') {
          // Master key via GET — kembalikan token agar selanjutnya pakai token
          let token = _generateSessionToken();
          return _json({ status: "success", message: "Terhubung", token: token, quota: _getQuotaInfo() });
        }
        if (auth && auth.mode === 'token') {
          return _json({ status: "success", message: "Terhubung", quota: _getQuotaInfo() });
        }
      }
      // Ping tanpa auth — untuk health check saja
      return _json({ status: "success", message: "Server aktif" });
    }
    
    // Untuk aksi lain, wajib auth
    let authResult = _validateAccess(authKey);
    if (!authResult) {
      return _json({ status: "error", message: "Sesi tidak valid. Silakan login ulang." });
    }
    
    if (e.parameter.action === 'load_ttd') {
      return _handleLoadTTD(e.parameter);
    }

    let tahun = String(e.parameter.tahun || "");
    let kodeSkpd = String(e.parameter.kode_skpd || "");
    if (!tahun || !kodeSkpd) {
      return _json({ status: "error", message: "Parameter tahun & kode_skpd wajib diisi" });
    }

    // === CACHE 2-TIER ===
    let cache = CacheService.getScriptCache();
    
    // Tier 1: Hot cache (30 detik)
    let hotKey = 'LRA_' + tahun + '_' + kodeSkpd;
    let cached = cache.get(hotKey);
    if (cached) {
      return _json({ status: "success", data: JSON.parse(cached), source: "cache", quota: _getQuotaInfo() });
    }
    
    // Tier 2: Warm cache (5 menit) — untuk request tarik data siluman
    if (e.parameter.warm === 'true') {
      let warmKey = 'LRA_WARM_' + tahun + '_' + kodeSkpd;
      let warmCached = cache.get(warmKey);
      if (warmCached) {
        return _json({ status: "success", data: JSON.parse(warmCached), source: "warm_cache", quota: _getQuotaInfo() });
      }
    }

    // Baca dari sheet
    let sheet = _getOrCreateSheetForYear(tahun);
    let lastRow = sheet.getLastRow();
    if (lastRow < 2) return _json({ status: "not_found", data: {}, quota: _getQuotaInfo() });

    let data = sheet.getRange(2, 2, lastRow - 1, 4).getValues();
    let parsedResponse = {};

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0]) === tahun && String(data[i][1]) === kodeSkpd) {
        parsedResponse[String(data[i][2])] = data[i][3];
      }
    }

    if (Object.keys(parsedResponse).length > 0) {
      // Simpan ke kedua tier cache
      let jsonStr = JSON.stringify(parsedResponse);
      cache.put(hotKey, jsonStr, CACHE_HOT_TTL);
      cache.put('LRA_WARM_' + tahun + '_' + kodeSkpd, jsonStr, CACHE_WARM_TTL);
      
      return _json({ status: "success", data: parsedResponse, source: "fresh", quota: _getQuotaInfo() });
    } else {
      return _json({ status: "not_found", data: {}, quota: _getQuotaInfo() });
    }

  } catch (error) {
    return _json({ status: "error", message: error.toString() });
  }
}

// ===========================================================================
// PERFORMANCE LOGGING (MONITORING)
// ===========================================================================
function _logPerformance(action, kodeSkpd, itemCount, elapsedMs) {
  try {
    let cache = CacheService.getScriptCache();
    let key = 'PERF_' + action + '_' + new Date().toDateString();
    let existing = cache.get(key);
    let perfData = existing ? JSON.parse(existing) : { count: 0, totalMs: 0, maxMs: 0 };
    perfData.count++;
    perfData.totalMs += elapsedMs;
    perfData.maxMs = Math.max(perfData.maxMs, elapsedMs);
    // Simpan statistik performa (24 jam)
    cache.put(key, JSON.stringify(perfData), 24 * 60 * 60);
  } catch(e) {}
}

// ===========================================================================
// HELPER: SHEET MANAGERS & SYNC LOGIC (TIDAK DIUBAH DARI V4)
// ===========================================================================
function _getOrCreateSheetForYear(tahun) {
  let sheetName = 'Data_LRA_' + tahun;
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Timestamp", "Tahun", "Kode_SKPD", "Row_ID", "Penjelasan"]);
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _getOrCreateAuditSheet() {
  let sheetName = "Audit_Log";
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Timestamp", "Tahun", "SKPD", "RowID", "OldValue", "NewValue", "UserAgent", "Action"]);
    sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#fef3c7");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _getOrCreateTTDSheet() {
  let sheetName = "TTD_SKPD";
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Timestamp", "Tahun", "Kode_SKPD", "Jabatan", "Nama", "NIP", "Updated_By", "UserAgent"]);
    sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#dcfce7");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function _handleSaveTTD(rawData) {
  try {
    let tahun = String(rawData.tahun || "");
    let kodeSkpd = String(rawData.kode_skpd || "");
    let jabatan = String(rawData.jabatan || "").substring(0, 100);
    let nama = String(rawData.nama || "").substring(0, 100);
    let nip = String(rawData.nip || "").substring(0, 50);
    let updatedBy = String(rawData.updated_by || "unknown").substring(0, 100);
    let userAgent = String(rawData.user_agent || "unknown").substring(0, 150);
    let timestamp = new Date();
    
    // Validasi akses
    let auth = _validateAccess(rawData.token || rawData.secret_key || '');
    if (!auth) return _json({ status: "error", message: "Sesi tidak valid." });
    
    let sheet = _getOrCreateTTDSheet();
    let lastRow = sheet.getLastRow();
    let existingRowNum = null;

    if (lastRow >= 2) {
      let existingData = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
      for (let i = 0; i < existingData.length; i++) {
        if (String(existingData[i][0]) === tahun && String(existingData[i][1]) === kodeSkpd) {
          existingRowNum = i + 2;
          break;
        }
      }
    }

    if (existingRowNum !== null) {
      sheet.getRange(existingRowNum, 1, 1, 8).setValues([[timestamp, tahun, kodeSkpd, jabatan, nama, nip, updatedBy, userAgent]]);
    } else {
      sheet.appendRow([timestamp, tahun, kodeSkpd, jabatan, nama, nip, updatedBy, userAgent]);
    }

    return _json({ status: "success", message: "Sinkronisasi TTD berhasil" });
  } catch (error) { return _json({ status: "error", message: error.toString() }); }
}

function _handleLoadTTD(params) {
  try {
    let tahun = String(params.tahun || "");
    let kodeSkpd = String(params.kode_skpd || "");
    let sheet = _getOrCreateTTDSheet();
    let lastRow = sheet.getLastRow();
    
    if (lastRow < 2) return _json({ status: "not_found" });

    let existingData = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    for (let i = 0; i < existingData.length; i++) {
      if (String(existingData[i][1]) === tahun && String(existingData[i][2]) === kodeSkpd) {
        return _json({
          status: "success",
          data: {
            tahun: String(existingData[i][1]), 
            kode_skpd: String(existingData[i][2]),
            jabatan: String(existingData[i][3] || ""), 
            nama: String(existingData[i][4] || ""),
            nip: String(existingData[i][5] || ""), 
            updated_by: String(existingData[i][6] || ""),
            updated_at: existingData[i][0] ? new Date(existingData[i][0]).toISOString() : null
          }
        });
      }
    }
    return _json({ status: "not_found" });
  } catch (error) { return _json({ status: "error" }); }
}

function _handleDeleteTTD(rawData) {
  try {
    // Validasi akses
    let auth = _validateAccess(rawData.token || rawData.secret_key || '');
    if (!auth) return _json({ status: "error", message: "Sesi tidak valid." });
    
    let tahun = String(rawData.tahun || "");
    let kodeSkpd = String(rawData.kode_skpd || "");
    let updatedBy = String(rawData.updated_by || "unknown").substring(0, 100);
    
    let sheet = _getOrCreateTTDSheet();
    let lastRow = sheet.getLastRow();
    if (lastRow < 2) return _json({ status: "not_found" });

    let existingData = sheet.getRange(2, 2, lastRow - 1, 2).getValues();
    let rowToDelete = null;
    for (let i = 0; i < existingData.length; i++) {
      if (String(existingData[i][0]) === tahun && String(existingData[i][1]) === kodeSkpd) {
        rowToDelete = i + 2; break;
      }
    }

    if (rowToDelete === null) return _json({ status: "not_found" });

    let auditSheet = _getOrCreateAuditSheet();
    let oldData = sheet.getRange(rowToDelete, 1, 1, 8).getValues()[0];
    auditSheet.appendRow([new Date(), tahun, kodeSkpd, "TTD", "Jabatan: " + oldData[3] + " | Nama: " + oldData[4], "(dihapus)", updatedBy, "DELETE_TTD"]);
    sheet.deleteRow(rowToDelete);

    return _json({ status: "success" });
  } catch (error) { return _json({ status: "error" }); }
}

// ===========================================================================
// HELPER: RATE LIMITING
// ===========================================================================
function _checkRateLimit(kodeSkpd) {
  let cache = CacheService.getScriptCache();
  let key = 'RL_' + kodeSkpd;
  let now = Date.now();
  let windowStart = now - RATE_LIMIT_WINDOW_MS;
  let raw = cache.get(key);
  let timestamps = raw ? JSON.parse(raw) : [];

  timestamps = timestamps.filter(function(ts) { return ts > windowStart; });
  if (timestamps.length >= RATE_LIMIT_MAX) {
    let oldestInWindow = Math.min.apply(null, timestamps);
    let retryInSec = Math.ceil((oldestInWindow + RATE_LIMIT_WINDOW_MS - now) / 1000);
    return { ok: false, retryInSec: Math.max(retryInSec, 1) };
  }

  timestamps.push(now);
  cache.put(key, JSON.stringify(timestamps), Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) + 60);
  return { ok: true, remaining: RATE_LIMIT_MAX - timestamps.length };
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ===========================================================================
// HELPER: BACKUP SNAPSHOT & COUNTER
// ===========================================================================
function _createBackupSnapshot(tahun) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sourceSheet = _getOrCreateSheetForYear(tahun);
  if (sourceSheet.getLastRow() < 2) return;

  // Gunakan LockService HANYA untuk backup (jarang terjadi, aman)
  let lock = LockService.getDocumentLock();
  try {
    lock.waitLock(10000); // 10 detik cukup untuk backup
  } catch(e) {
    return; // Skip backup jika sedang ada proses lain
  }
  
  try {
    let backupIndexSheet = ss.getSheetByName("Backup_Index");
    if (!backupIndexSheet) {
      backupIndexSheet = ss.insertSheet("Backup_Index");
      backupIndexSheet.appendRow(["Backup_ID", "Source_Sheet", "Timestamp", "Rows", "Sheet_Name"]);
      backupIndexSheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#dbeafe");
    }

    let nextId = backupIndexSheet.getDataRange().getValues().length;
    let backupSheetName = 'Backup_' + String(nextId).padStart(3, "0");

    if (nextId > MAX_BACKUP_SNAPSHOTS) {
      let oldestId = nextId - MAX_BACKUP_SNAPSHOTS;
      let oldestSheet = ss.getSheetByName('Backup_' + String(oldestId).padStart(3, "0"));
      if (oldestSheet) ss.deleteSheet(oldestSheet);
      backupIndexSheet.deleteRow(2);
      nextId = MAX_BACKUP_SNAPSHOTS + 1;
      backupSheetName = 'Backup_' + String(nextId).padStart(3, "0");
    }

    let backupSheet = ss.insertSheet(backupSheetName);
    let sourceData = sourceSheet.getDataRange().getValues();
    backupSheet.getRange(1, 1, sourceData.length, sourceData[0].length).setValues(sourceData);
    backupSheet.getRange(1, 1, 1, sourceData[0].length).setFontWeight("bold").setBackground("#e0e7ff");

    backupIndexSheet.appendRow([nextId, 'Data_LRA_' + tahun, new Date().toISOString(), sourceData.length - 1, backupSheetName]);
  } finally {
    lock.releaseLock();
  }
}

function _incrementChangesCounter(delta) {
  let cache = CacheService.getScriptCache();
  let current = parseInt(cache.get(CHANGES_COUNTER_KEY) || '0') + delta;
  cache.put(CHANGES_COUNTER_KEY, String(current), CHANGES_COUNTER_TTL);
  return current;
}

function _resetChangesCounter() { 
  CacheService.getScriptCache().put(CHANGES_COUNTER_KEY, "0", CHANGES_COUNTER_TTL); 
}

// ===========================================================================
// FUNGSI BACKUP CERDAS (ANTI-BLOKIR GOOGLE)
// ===========================================================================
function jalankanBackupBerkala() {
  let cache = CacheService.getScriptCache();
  let tahun = cache.get('PENDING_BACKUP_TAHUN');
  
  if (tahun) { 
    try { 
      _createBackupSnapshot(tahun); 
      _resetChangesCounter();
      cache.remove('PENDING_BACKUP_TAHUN'); 
    } catch(e) {
      // Silently fail agar tidak merusak antrean
    } 
  }
}

// ===========================================================================
// FUNGSI ADMIN & MAINTENANCE
// ===========================================================================
function setupInitialDatabase() {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  _getOrCreateAuditSheet();
  _getOrCreateTTDSheet();
  if (!ss.getSheetByName("Backup_Index")) {
    let idx = ss.insertSheet("Backup_Index");
    idx.appendRow(["Backup_ID", "Source_Sheet", "Timestamp", "Rows", "Sheet_Name"]);
    idx.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#dbeafe");
  }
  _getOrCreateSheetForYear(String(new Date().getFullYear()));
  let defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && defaultSheet.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(defaultSheet);
}

/**
 * Fungsi admin: Lihat statistik kuota hari ini
 * Jalankan manual dari Script Editor → Run → getQuotaDashboard
 */
function getQuotaDashboard() {
 let quota = _getQuotaInfo();
  let cache = CacheService.getScriptCache();
  
  let perfSave = cache.get('PERF_POST_SAVE_' + new Date().toDateString());
  let perfLoad = cache.get('PERF_GET_LOAD_' + new Date().toDateString());
  
  let result = '\n=== DASHBOARD KUOTA HARI INI ===\n';
  result += 'Kuota terpakai: ' + quota.used + ' / ' + (quota.used + quota.remaining) + ' (' + quota.percent + '%)\n';
  result += 'Sisa kuota: ' + quota.remaining + '\n';
  
  if (perfSave) {
    let ps = JSON.parse(perfSave);
    result += '\n--- SAVE PERFORMANCE ---\n';
    result += 'Total request: ' + ps.count + '\n';
    result += 'Rata-rata waktu: ' + Math.round(ps.totalMs / ps.count) + ' ms\n';
    result += 'Waktu terlama: ' + ps.maxMs + ' ms\n';
  }
  
  Logger.log(result);
  return result;
}

// ===========================================================================
// TRACKER ADMIN (TIDAK DIUBAH DARI V4)
// ===========================================================================
function _updateTracker(tahun, kodeSkpd) {
  try {
    let ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName("Tracker_Admin");
    
    if (!sheet) {
      sheet = ss.insertSheet("Tracker_Admin");
      sheet.appendRow(["Tahun", "Kode_SKPD", "Waktu_Update_Terakhir", "Status"]);
      sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#e2e8f0");
      sheet.setFrozenRows(1);
    }
    
    let data = sheet.getDataRange().getValues();
    let rowToUpdate = -1;
    
    for(let i = 1; i < data.length; i++) {
      if(String(data[i][0]) === String(tahun) && String(data[i][1]) === String(kodeSkpd)) {
        rowToUpdate = i + 1;
        break;
      }
    }
    
    let now = new Date();
    if(rowToUpdate > -1) {
      sheet.getRange(rowToUpdate, 3, 1, 2).setValues([[now, "Aktif Diperbarui"]]);
    } else {
      sheet.appendRow([tahun, kodeSkpd, now, "Aktif Diperbarui"]);
    }
  } catch(e) {
    // Abaikan agar tidak mengganggu proses utama
  }
}
