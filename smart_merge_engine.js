// =========================================================================
// [SMART MERGE ENGINE V5 - ISOLASI KELOMPOK MUTLAK]
// Memisahkan ketikan operator di Kelompok (Grup) yang berbeda secara cerdas
// Anti-Timpa | Anti-Campur Aduk | Tahan Banting | Sangat Ringan
// =========================================================================

window.SmartMergeEngine = {
    baselineMap: {}, // Memori Perekam (Kondisi Asli)

    setBaseline: function(dataObject) {
        this.baselineMap = dataObject ? JSON.parse(JSON.stringify(dataObject)) : {};
    },

    jahit3Way: async function(tahun, amanKodeSkpd, payloadLokal) {
        try {
            // 1. Intip kilat kondisi Server detik ini
            let fetchUrl = `${FIREBASE_URL}lra_${tahun}/${amanKodeSkpd}.json?r=${Date.now()}`;
            let response = await fetch(fetchUrl, { cache: 'no-store' });
            let dataServer = await response.json() || {};

            let payloadFinal = {};

            // 2. Bedah dan Jahit per Baris Rekening
            for (let rowId in payloadLokal) {
                let stringLokal = payloadLokal[rowId];
                let stringServer = dataServer[rowId] || "";
                let stringBaseline = this.baselineMap[rowId] || "";

                // Jika server tidak ada perubahan dari sejak ditarik, hajar pakai lokal
                if (stringServer === stringBaseline) {
                    payloadFinal[rowId] = stringLokal;
                    continue;
                }

                try {
                    let arrLoc = JSON.parse(stringLokal || "[]");
                    let arrSrv = JSON.parse(stringServer || "[]");
                    let arrBase = JSON.parse(stringBaseline || "[]");

                    // Pastikan formatnya adalah Array Standar aplikasi Bos
                    if (Array.isArray(arrLoc) && Array.isArray(arrSrv) && Array.isArray(arrBase)) {
                        
                        // Buat fungsi Pembuat Sidik Jari untuk 1 Kelompok Utuh (Bukan per rincian)
                        let hashGroup = (g) => JSON.stringify(g);

                        let baseSet = new Set(arrBase.map(hashGroup));
                        let locSet = new Set(arrLoc.map(hashGroup));
                        let srvSet = new Set(arrSrv.map(hashGroup));

                        let mergedGroups = [];
                        let addedHashes = new Set();

                        let amankanGroup = (g, h) => {
                            if (!addedHashes.has(h)) {
                                addedHashes.add(h);
                                mergedGroups.push(g); // Masukkan kelompok utuh
                            }
                        };

                        // [LOGIKA DEWA 1]: Masukkan Kelompok buatan Server/Teman yang tidak ada di Baseline
                        arrSrv.forEach(g => {
                            let h = hashGroup(g);
                            if (!baseSet.has(h)) amankanGroup(g, h);
                        });

                        // [LOGIKA DEWA 2]: Masukkan Kelompok buatan Lokal/Kita yang tidak ada di Baseline
                        arrLoc.forEach(g => {
                            let h = hashGroup(g);
                            if (!baseSet.has(h)) amankanGroup(g, h);
                        });

                        // [LOGIKA DEWA 3]: Masukkan Kelompok Lama yang TIDAK DIHAPUS oleh kedua pihak
                        arrSrv.forEach(g => {
                            let h = hashGroup(g);
                            if (locSet.has(h)) amankanGroup(g, h);
                        });

                        // Kembalikan ke dalam bentuk String untuk dilempar ke Firebase
                        payloadFinal[rowId] = JSON.stringify(mergedGroups);

                    } else {
                        // Jika struktur bukan array standar (catatan manual), timpa saja
                        payloadFinal[rowId] = stringLokal;
                    }
                } catch(e) {
                    payloadFinal[rowId] = stringLokal; // Fallback jika rusak
                }
            }

            // Perbarui baseline setelah penjahitan sukses
            this.setBaseline(payloadFinal);
            return payloadFinal;

        } catch (error) {
            console.error("Mesin 3-Way Merge Gagal, bypass ke lokal", error);
            return payloadLokal; // Kembali murni ke data lokal jika terjadi error jaringan
        }
    }
};