self.onmessage = function(event) {
    let pesan = event.data;

    if (pesan.action === 'hitung_kalkulasi') {
        let hasilTotal = prosesHitungTotal(pesan.teks);
        
        self.postMessage({
            action: 'hasil_kalkulasi',
            rowId: pesan.rowId,
            total: hasilTotal
        });
    }
    
    else if (pesan.action === 'bedah_data_json') {
        let teksHTML = formatTeksPenjelasanWorker(pesan.dataString);
        
        self.postMessage({
            action: 'hasil_bedah_json',
            rowId: pesan.rowId,
            htmlString: teksHTML
        });
    }
};

// =========================================================================
// MESIN PENGHITUNG LATAR BELAKANG
// =========================================================================
function prosesHitungTotal(teks) {
    let total = 0;
    if (!teks) return total;
    
    let regex = /=\s*([^#\n\r]+)/g; 
    let matches = teks.match(regex);
    
    if(matches) {
        matches.forEach(m => {
            let cleanStr = m.replace(/=/g, '').replace(/Rp/gi, '').trim();
            let numMatch = cleanStr.match(/^[\d\.,]+/);
            if (numMatch) {
                let numStr = numMatch[0];
                if(numStr.includes(',') && numStr.split(',')[1].length <= 2) {
                    numStr = numStr.replace(/\./g, '').replace(',', '.');
                } else {
                    numStr = numStr.replace(/\./g, '').replace(/,/g, '');
                }
                let val = parseFloat(numStr);
                if(!isNaN(val)) total += val;
            }
        });
    }
    return total;
}

// =========================================================================
// MESIN PEMBEDAH JSON LATAR BELAKANG
// =========================================================================
function formatTeksPenjelasanWorker(dataServerString) {
    if (!dataServerString || dataServerString === "[]" || dataServerString === '""') return "";
    let printText = dataServerString;
    try { 
        let parsed = JSON.parse(dataServerString);
        let tempText = "";
        
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].items !== undefined) {
            parsed.forEach(g => {
                if (g.sub) tempText += `${g.sub}\n\n`;
                if(g.items) {
                    g.items.forEach(i => {
                        let st = i.s ? ` ${i.s}` : '';
                        tempText += `- ${i.u}\n<div style="border-bottom: 1px dashed #666; padding-bottom: 4px; margin-bottom: 4px;"><em>${i.v} ${st} x Rp ${i.h.toLocaleString('id-ID')} = Rp ${i.t.toLocaleString('id-ID')}</em></div>`;
                    });
                }
                tempText += "\n";
            });
            printText = tempText.trim();
        } 
        else if (parsed && parsed.items) {
            let headText = parsed.sub || parsed.judul || ""; 
            if (headText) tempText += `${headText}\n\n`;
            parsed.items.forEach(i => {
                let st = i.s ? ` ${i.s}` : '';
                tempText += `- ${i.u}\n<div style="border-bottom: 1px dashed #666; padding-bottom: 4px; margin-bottom: 4px;"><em>${i.v} ${st} x Rp ${i.h.toLocaleString('id-ID')} = Rp ${i.t.toLocaleString('id-ID')}</em></div>`;
            });
            printText = tempText;
        }
    } catch(e) {
        
    } 
    return printText;
}