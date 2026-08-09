(function(){
'use strict';
var CHUNK=10,DEBOUNCE=300,_tmr=null,_sup=false,_fn={};

function fmtRp(n){
var s=Math.abs(n).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g,'.');
return(n<0?'-Rp ':'Rp ')+s;
}

function injectCSS(){
var s=document.createElement('style');
s.id='ac-styles';
s.textContent=`
#modalPenjelasan .modal-dialog{max-width:97vw!important;margin:.5rem auto}
@media(min-width:1400px){#modalPenjelasan .modal-dialog{max-width:1320px!important}}
#modalPenjelasan .modal-content{border:none!important;border-radius:14px!important;box-shadow:0 25px 60px -15px rgba(0,0,0,.15),0 0 0 1px rgba(0,0,0,.04)!important;background:#f1f5f9!important}
#modalPenjelasan .modal-header{background:#fff!important;border-bottom:1px solid #e2e8f0!important;padding:10px 20px!important}
#modalPenjelasan .modal-header .modal-title{font-size:14px!important;font-weight:800!important;color:#0f172a!important}
#modalPenjelasan .btn-close{opacity:.4;transition:opacity .15s}
#modalPenjelasan .btn-close:hover{opacity:1}
#modalPenjelasan .modal-body{padding:0!important;background:#f1f5f9!important}
#modalPenjelasan .px-4.pt-3.pb-2{background:#fff!important;padding:8px 20px!important;border-bottom:1px solid #e2e8f0!important}
#modalPenjelasan .px-4.pt-3.pb-2>.bg-white{border:none!important;box-shadow:none!important;background:transparent!important;border-radius:0!important;padding:0!important;margin:0!important;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
#modalPenjelasan .px-4.pt-3.pb-2 .text-secondary.fw-bold{font-size:9px!important;color:#94a3b8!important;letter-spacing:.5px!important;margin:0!important}
#modalPenjelasan .px-4.pt-3.pb-2 .fw-bold.text-dark{font-size:12px!important;color:#0f172a!important;line-height:1.3!important;flex:1;min-width:160px;margin:0!important}
#modalPenjelasan .px-4.pt-3.pb-2 .text-end{flex-shrink:0;text-align:right!important}
#modalPenjelasan .px-4.pt-3.pb-2 .text-end .text-secondary{font-size:9px!important;margin:0!important}
#modalPenjelasan .px-4.pt-3.pb-2 .text-end .fw-bold{font-size:15px!important;color:#0f172a!important;letter-spacing:-.3px}
#modalPenjelasan #alertSmart{border:none!important;border-radius:0!important;padding:7px 20px!important;margin:0!important;box-shadow:none!important;background:#fff!important}
#modalPenjelasan #alertSmart .fs-4{font-size:13px!important;margin-right:8px!important}
#modalPenjelasan #titleSmart{font-size:11px!important;font-weight:700!important}
#modalPenjelasan #descSmart{font-size:10px!important;line-height:1.3!important;opacity:.7}
.ac-wrap{padding:0 14px 4px}.ac-sticky-top{position:sticky;top:0;z-index:25;background:#f1f5f9;padding:4px 0 3px}
.ac-strip{display:flex;align-items:stretch;background:#fff!important;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.04);margin-bottom:3px;border:1px solid #e2e8f0!important;overflow:hidden}
.ac-si{flex:1;padding:4px 12px;display:flex;align-items:center;gap:8px;position:relative}
.ac-si+.ac-si::before{content:'';position:absolute;left:0;top:20%;bottom:20%;width:1px;background:#e2e8f0}
.ac-si-ico{width:26px;height:26px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0}
.ac-si:nth-child(1) .ac-si-ico{background:#eff6ff;color:#2563eb}
.ac-si:nth-child(2) .ac-si-ico{background:#f0fdf4;color:#059669}
.ac-si:nth-child(3) .ac-si-ico{background:#fefce8;color:#d97706}
.ac-si-l{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.4px;line-height:1.1}
.ac-si-v{font-size:14px;font-weight:800;color:#0f172a;line-height:1.1;letter-spacing:-.2px}
.ac-si-v.ac-ok{color:#059669}
.ac-si-v.ac-warn{color:#d97706}
.ac-si-v.ac-err{color:#dc2626}
.ac-pg{height:2px;background:#e2e8f0;border-radius:2px;margin-bottom:0;overflow:hidden}
.ac-pg-f{height:100%;border-radius:2px;transition:width .4s ease,background .3s;width:0;background:#93c5fd}
.ac-pg-f.ac-pgok{background:#10b981}
.ac-pg-f.ac-pglow{background:#3b82f6}
.ac-pg-f.ac-pgover{background:#ef4444}
#groupsContainer{display:flex!important;flex-direction:column!important;gap:2px!important}
.group-container.ac-card{position:static!important;background:#fff!important;border-radius:10px!important;border:1px solid #cbd5e1!important;box-shadow:0 1px 2px rgba(0,0,0,.03),0 0 0 1px rgba(0,0,0,.02)!important;transition:all .2s!important;width:100%!important}
.group-container.ac-card:hover{border-color:#94a3b8!important;box-shadow:0 4px 12px rgba(0,0,0,.06),0 0 0 1px rgba(0,0,0,.03)!important}
.ac-ch{position:sticky;top:48px;z-index:20;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;border-radius:10px 10px 0 0;background:#f8fafc;box-shadow:0 1px 0 0 #e2e8f0}
.ac-ch:hover{background:#f1f5f9;box-shadow:0 1px 0 0 #e2e8f0}
.ac-cl{display:flex;align-items:center;gap:10px;flex:1;min-width:0}
.ac-cn{width:26px;height:26px;border-radius:7px;color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;transition:all .2s}
.group-container:nth-child(odd) .ac-cn{background:#1d4ed8;box-shadow:0 2px 6px rgba(29,78,216,.25)}
.group-container:nth-child(odd).ac-col .ac-cn{background:#3b82f6}
.group-container:nth-child(even) .ac-cn{background:#b91c1c;box-shadow:0 2px 6px rgba(185,28,28,.25)}
.group-container:nth-child(even).ac-col .ac-cn{background:#ef4444}
.ac-ci{flex:1;min-width:0}
.ac-cl-t{font-size:11px;font-weight:800;color:#64748b;line-height:1.2}
.ac-cl-p{font-size:11px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.2}
.ac-cl-p.ac-empty{color:#94a3b8;font-style:italic;font-weight:400}
.ac-cr{display:flex;align-items:center;gap:8px;flex-shrink:0}
.ac-group-total{font-size:11px;font-weight:800;color:#1e293b;background:#fff;padding:4px 10px;border-radius:6px;border:1px solid #e2e8f0;transition:all .2s;white-space:nowrap}
.group-container:nth-child(odd) .ac-group-total{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}
.group-container:nth-child(even) .ac-group-total{color:#b91c1c;background:#fef2f2;border-color:#fecaca}
.ac-cv{color:#94a3b8!important;font-size:10px;transition:transform .2s,color .15s;cursor:pointer;padding:4px}
.ac-cv:hover{color:#475569!important}
.ac-col .ac-cv{transform:rotate(180deg)}
.ac-cb{padding:8px 14px 6px;background:#fff;border-radius:0 0 10px 10px}
.ac-col .ac-cb{display:none}
.ac-cb .group-number-badge{display:none!important}
.ac-cb .form-label{font-size:9px!important;font-weight:700!important;color:#64748b!important;text-transform:uppercase!important;margin-bottom:3px!important;letter-spacing:.4px!important}
.ac-cb .uraian-sub{font-size:12px!important;border:1px solid #e2e8f0!important;border-radius:6px!important;padding:7px 10px!important;background:#fff!important;color:#0f172a!important;resize:vertical;min-height:38px!important;line-height:1.4!important;transition:border-color .15s,box-shadow .15s!important}
.ac-cb .item-rows-container .uraian{font-size:12px!important;border:1px solid #e2e8f0!important;border-radius:6px!important;padding:5px 10px!important;background:#fff!important;color:#0f172a!important;resize:vertical;min-height:32px!important;line-height:1.4!important;transition:border-color .15s,box-shadow .15s!important}
.ac-cb .item-rows-container .vol,.ac-cb .item-rows-container .satuan,.ac-cb .item-rows-container .harga{font-size:12px!important;border:1px solid #e2e8f0!important;border-radius:6px!important;padding:5px 10px!important;background:#fff!important;color:#0f172a!important;font-weight:600!important;height:34px!important;min-height:34px!important;transition:border-color .15s,box-shadow .15s!important;box-shadow:none!important}
.ac-cb .item-rows-container .harga{text-align:right!important;font-weight:700!important}
.ac-cb .uraian-sub:focus,.ac-cb .item-rows-container input:focus,.ac-cb .item-rows-container textarea:focus{border-color:#3b82f6!important;box-shadow:0 0 0 3px rgba(59,130,246,.1)!important;outline:none!important}
.ac-cb .uraian-sub::placeholder,.ac-cb .item-rows-container .uraian::placeholder,.ac-cb .item-rows-container .satuan::placeholder{color:#94a3b8!important;opacity:1!important}
.ac-cb .row.mb-2.fw-bold{background:#f8fafc!important;border-radius:4px;padding:3px 10px!important;margin-bottom:3px!important;border:none!important}
.ac-cb .row.mb-2.fw-bold>div{font-size:9px!important;font-weight:700!important;color:#94a3b8!important;text-transform:uppercase!important;letter-spacing:.3px!important}
.ac-cb .item-rows-container>.row{padding:2px 0!important;border-bottom:1px dashed #f1f5f9!important;align-items:center!important;margin-left:-6px!important;margin-right:-6px!important}
.ac-cb .item-rows-container>.row>div{padding-left:6px!important;padding-right:6px!important}
.ac-cb .item-rows-container>.row:last-child{border-bottom:none!important}
.ac-cb .item-rows-container .subtotal-txt{font-size:12px!important;font-weight:800!important;color:#1e40af!important;letter-spacing:-.2px!important}
.ac-cb .item-rows-container>.row .btn-sm{opacity:.25!important;transition:all .15s!important;color:#f87171!important;font-size:11px!important;padding:2px 4px!important;background:#fef2f2!important;border-radius:4px!important;border:1px solid #fecaca!important;width:24px!important;height:24px!important;display:flex!important;align-items:center!important;justify-content:center!important}
.ac-cb .item-rows-container>.row:hover .btn-sm{opacity:1!important}
.ac-cb .item-rows-container>.row .btn-sm:hover{background:#fee2e2!important;border-color:#fca5a5!important;color:#dc2626!important;transform:scale(1.1)!important}
.ac-cb>button[onclick*="tambahBaris"]{border:1.5px dashed #cbd5e1!important;border-radius:6px!important;background:#f8fafc!important;color:#64748b!important;font-size:11px!important;font-weight:700!important;padding:6px!important;width:100%!important;margin-top:6px!important;transition:all .15s!important;box-shadow:none!important}
.ac-cb>button[onclick*="tambahBaris"]:hover{border-color:#1d4ed8!important;color:#1d4ed8!important;background:#eff6ff!important}
.ac-lb{display:block;width:100%;padding:6px;margin-top:6px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;color:#64748b;font-size:11px;font-weight:700;cursor:pointer;transition:all .15s;text-align:center}
.ac-lb:hover{border-color:#3b82f6;color:#2563eb;background:#eff6ff}
.ac-hr{display:none!important}
.ac-wrap .d-flex.justify-content-center{margin-top:2px}
.ac-wrap .btn-add-group{border:1.5px dashed #cbd5e1!important;background:#fff!important;color:#64748b!important;font-size:11px!important;font-weight:700!important;padding:8px 20px!important;border-radius:8px!important;transition:all .15s!important;box-shadow:none!important}
.ac-wrap .btn-add-group:hover{border-color:#1d4ed8!important;color:#1d4ed8!important;background:#eff6ff!important}
#modalPenjelasan .modal-footer{padding:10px 20px!important;background:#fff!important;border-top:1px solid #e2e8f0!important;position:sticky;bottom:0;z-index:30}
#modalPenjelasan .modal-footer .btn{font-size:12px!important;font-weight:700!important;padding:8px 20px!important;border-radius:8px!important;transition:all .15s!important}
#modalPenjelasan .modal-footer .btn-light{background:#fff!important;border:1px solid #e2e8f0!important;color:#475569!important}
#modalPenjelasan .modal-footer .btn-light:hover{border-color:#94a3b8!important;background:#f8fafc!important}
#modalPenjelasan .modal-footer .btn-warning{background:#fef3c7!important;border:none!important;color:#78350f!important}
#modalPenjelasan .modal-footer .btn-warning:hover{background:#fde68a!important}
#modalPenjelasan .modal-footer .btn-success{background:#059669!important;border:none!important;color:#fff!important}
#modalPenjelasan .modal-footer .btn-success:hover{background:#047857!important;transform:translateY(-1px);box-shadow:0 4px 12px rgba(5,150,105,.2)}
@media(max-width:768px){
#modalPenjelasan .modal-dialog{margin:0!important;max-width:100vw!important;height:100vh!important}
#modalPenjelasan .modal-dialog-scrollable .modal-content{max-height:100vh!important;height:100vh!important}
.ac-sticky-top{position:static!important}
.ac-strip{flex-direction:column;gap:0}
.ac-si+.ac-si::before{display:none}
.ac-si+.ac-si{border-top:1px solid #e2e8f0}
.ac-wrap{padding:6px 10px 8px!important}
.ac-ch{top:0!important;padding:8px 10px!important}
.ac-cb{padding:8px 10px!important}
.ac-cb .item-rows-container>.row{flex-direction:column!important;align-items:stretch!important;gap:3px!important;padding:6px 0!important}
.ac-cb .item-rows-container>.row>div{flex:0 0 100%!important;max-width:100%!important}
.ac-cb .item-rows-container>.row>div:last-child{display:flex!important;flex-direction:row!important;justify-content:space-between!important;align-items:center!important}
.ac-cb .item-rows-container .vol,.ac-cb .item-rows-container .satuan{display:inline-flex!important;flex:0 0 48%!important;max-width:48%!important}
#modalPenjelasan .modal-footer .btn-warning,#modalPenjelasan .modal-footer .btn-success{flex:1!important;text-align:center!important}
.ac-group-total{font-size:10px!important;padding:3px 8px!important}
}
`;
document.head.appendChild(s);
}

function createBal(){
var m=document.querySelector('#modalPenjelasan .modal-body');
if(!m||document.getElementById('ac-bal'))return;
var wrap=document.createElement('div');
wrap.className='ac-wrap';
var gc=document.getElementById('groupsContainer');
var footerBtn=m.querySelector('.d-flex.justify-content-center');
var bal=document.createElement('div');
bal.id='ac-bal';
bal.className='ac-strip';
bal.innerHTML='<div class="ac-si"><span class="ac-si-ico"><i class="fa-solid fa-coins"></i></span><div><div class="ac-si-l">Target Realisasi</div><div class="ac-si-v" id="ac-b-r">Rp 0</div></div></div><div class="ac-si"><span class="ac-si-ico"><i class="fa-solid fa-pen-ruler"></i></span><div><div class="ac-si-l">Total Keseluruhan</div><div class="ac-si-v" id="ac-b-t">Rp 0</div></div></div><div class="ac-si"><span class="ac-si-ico"><i class="fa-solid fa-scale-balanced"></i></span><div><div class="ac-si-l">Selisih Tersedia</div><div class="ac-si-v" id="ac-b-s">Rp 0</div></div></div>';
var pg=document.createElement('div');
pg.className='ac-pg';
pg.innerHTML='<div class="ac-pg-f" id="ac-pg-f"></div>';
var stickyTop=document.createElement('div');
stickyTop.className='ac-sticky-top';
if(gc){
stickyTop.appendChild(bal);
stickyTop.appendChild(pg);
wrap.appendChild(stickyTop);
wrap.appendChild(gc);
if(footerBtn)wrap.appendChild(footerBtn);
m.appendChild(wrap);
}
}

function updateAll(){
var real=parseFloat(document.getElementById('modalTargetRealisasi').value)||0;
var grandTotal=0;
document.querySelectorAll('#groupsContainer .group-container.ac-card').forEach(function(g){
var groupTotal=0;
g.querySelectorAll('.item-rows-container .subtotal-txt').forEach(function(el){
groupTotal+=parseFloat(el.textContent.replace(/\./g,'').replace(/,/g,'.'))||0;
});
grandTotal+=groupTotal;
var ta=g.querySelector('.uraian-sub');
var pv=g.querySelector('.ac-cl-p');
var gt=g.querySelector('.ac-group-total');
if(ta&&pv){
var txt=ta.value.trim();
pv.textContent=txt||'Ket: Belum ada uraian...';
pv.className=txt?'ac-cl-p':'ac-cl-p ac-empty';
}
if(gt)gt.textContent=fmtRp(groupTotal);
});
var rEl=document.getElementById('ac-b-r');
var tEl=document.getElementById('ac-b-t');
var sEl=document.getElementById('ac-b-s');
var pgEl=document.getElementById('ac-pg-f');
if(rEl)rEl.textContent=fmtRp(real);
if(tEl)tEl.textContent=fmtRp(grandTotal);
var diff=grandTotal-real;
if(sEl){
sEl.textContent=fmtRp(diff);
sEl.className='ac-si-v';
if(real===0)sEl.classList.add('ac-warn');
else if(Math.abs(diff)<1)sEl.classList.add('ac-ok');
else if(diff<0)sEl.classList.add('ac-warn');
else sEl.classList.add('ac-err');
}
if(pgEl){
var pct=real>0?Math.min(grandTotal/real*100,100):0;
pgEl.style.width=pct+'%';
pgEl.className='ac-pg-f';
if(real>0&&Math.abs(diff)<1)pgEl.classList.add('ac-pgok');
else if(diff>0&&real>0)pgEl.classList.add('ac-pgover');
else pgEl.classList.add('ac-pglow');
}
}

function enhance(g){
if(g.classList.contains('ac-card'))return;
g.classList.add('ac-card');
var badge=g.querySelector('.group-number-badge');
var num=badge?badge.innerText:'1';
var hdr=document.createElement('div');
hdr.className='ac-ch';
hdr.innerHTML='<div class="ac-cl"><span class="ac-cn">'+num+'</span><div class="ac-ci"><div class="ac-cl-t">KELOMPOK SPJ '+num+'</div><div class="ac-cl-p ac-empty">Ket: Belum ada uraian...</div></div></div><div class="ac-cr"><div class="ac-group-total">Rp 0</div><i class="ac-cv fa-solid fa-chevron-up"></i></div>';
var del=g.querySelector('.btn-outline-danger');
if(del){
del.className='btn btn-sm border-0 p-0 m-0';
del.style.cssText='color:#ef4444;font-size:12px;background:#fef2f2;cursor:pointer;transition:all .15s;width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;border:1px solid #fecaca';
del.title='Hapus Kelompok';
del.innerHTML='<i class="fa-regular fa-trash-can"></i>';
del.onmouseenter=function(){del.style.background='#fee2e2';del.style.borderColor='#fca5a5';del.style.color='#dc2626'};
del.onmouseleave=function(){del.style.background='#fef2f2';del.style.borderColor='#fecaca';del.style.color='#ef4444'};
var _origDel=del.onclick;
del.onclick=function(e){
e.stopPropagation();
if(!confirm('Hapus Kelompok SPJ '+num+'?'))return;
if(_origDel)_origDel.call(this,e);
};
var cr=hdr.querySelector('.ac-cr');
cr.insertBefore(del,cr.firstChild);
}
var bdy=document.createElement('div');
bdy.className='ac-cb';
while(g.firstChild)bdy.appendChild(g.firstChild);
g.appendChild(hdr);
g.appendChild(bdy);
hdr.addEventListener('click',function(e){
if(e.target.closest('.btn'))return;
var col=g.classList.toggle('ac-col');
var cv=hdr.querySelector('.ac-cv');
if(cv)cv.className=col?'ac-cv fa-solid fa-chevron-down':'ac-cv fa-solid fa-chevron-up';
});
applyLazy(g);
}

function applyLazy(g){
var c=g.querySelector('.item-rows-container');
if(!c)return;
var rows=c.querySelectorAll(':scope > .row');
if(rows.length<=CHUNK)return;
for(var i=CHUNK;i<rows.length;i++)rows[i].classList.add('ac-hr');
if(!c.parentNode.querySelector('.ac-lb')){
var btn=document.createElement('button');
btn.className='ac-lb';
btn.type='button';
var rem=rows.length-CHUNK;
btn.textContent='Tampilkan '+Math.min(CHUNK,rem)+' rincian berikutnya ('+rem+' tersisa)';
btn.setAttribute('data-off',String(CHUNK));
btn.addEventListener('click',function(){showMore(g,btn);});
var addBtn=c.parentNode.querySelector('button[onclick*="tambahBaris"]');
if(addBtn)c.parentNode.insertBefore(btn,addBtn);
else c.parentNode.appendChild(btn);
}
}

function showMore(g,btn){
var c=g.querySelector('.item-rows-container');
if(!c)return;
var hidden=c.querySelectorAll(':scope > .row.ac-hr');
var shown=0;
for(var i=0;i<hidden.length&&shown<CHUNK;i++){hidden[i].classList.remove('ac-hr');shown++;}
var rem=c.querySelectorAll(':scope > .row.ac-hr').length;
if(rem===0)btn.remove();
else{
var off=parseInt(btn.getAttribute('data-off'))||CHUNK;
off+=shown;
btn.setAttribute('data-off',String(off));
btn.textContent='Tampilkan '+Math.min(CHUNK,rem)+' rincian berikutnya ('+rem+' tersisa)';
}
}

function watch(){
var gc=document.getElementById('groupsContainer');
if(!gc)return;
new MutationObserver(function(mutations){
mutations.forEach(function(m){
m.addedNodes.forEach(function(node){
if(node.nodeType===1&&node.classList&&node.classList.contains('group-container')&&!node.classList.contains('ac-card')){
enhance(node);
updateAll();
}
});
});
}).observe(gc,{childList:true});
}

function hook(){
_fn.kalkulasi=window.kalkulasiKombinasi;
window.kalkulasiKombinasi=function(){
if(_sup)return;
var self=this;
clearTimeout(_tmr);
_tmr=setTimeout(function(){
_fn.kalkulasi.call(self);
updateAll();
},DEBOUNCE);
};
_fn.bukaAsisten=window.bukaAsisten;
window.bukaAsisten=function(rowID,kodeRek,uraian,realisasi){
_sup=true;
_fn.bukaAsisten(rowID,kodeRek,uraian,realisasi);
_sup=false;
document.querySelectorAll('#groupsContainer .group-container:not(.ac-card)').forEach(function(g){enhance(g);});
var allCards=document.querySelectorAll('#groupsContainer .group-container.ac-card');
if(allCards.length>2){
allCards.forEach(function(g){
g.classList.add('ac-col');
var cv=g.querySelector('.ac-cv');
if(cv)cv.className='ac-cv fa-solid fa-chevron-down';
});
}
_fn.kalkulasi();
updateAll();
};
_fn.updateNomor=window.updateNomorUrutKelompok;
window.updateNomorUrutKelompok=function(){
_fn.updateNomor();
document.querySelectorAll('#groupsContainer .group-container.ac-card').forEach(function(g,i){
var n=g.querySelector('.ac-cn');
var l=g.querySelector('.ac-cl-t');
if(n)n.innerText=i+1;
if(l)l.innerText='KELOMPOK SPJ '+(i+1);
});
};
}

function init(){
if(!document.getElementById('modalPenjelasan'))return;
injectCSS();
createBal();
hook();
watch();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();