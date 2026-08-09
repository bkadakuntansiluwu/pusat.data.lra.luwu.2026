(function(){
'use strict';
var _u,_d;
function css(){
var s=document.createElement('style');
s.id='pg-scrl';
s.textContent=
'.pg-sc{position:fixed;right:18px;top:50%;transform:translateY(-50%);z-index:999;display:flex;flex-direction:column;gap:5px}'+
'.pg-sc button{width:30px;height:30px;border-radius:50%;background:#fff;border:1px solid #e2e8f0;box-shadow:0 2px 8px rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#94a3b8;font-size:11px;transition:all .15s;opacity:0;pointer-events:none}'+
'.pg-sc button.pg-on{opacity:1;pointer-events:auto}'+
'.pg-sc button:hover{background:#1d4ed8;color:#fff;border-color:#1d4ed8;box-shadow:0 4px 12px rgba(29,78,216,.25)}'+
'.pg-sc button:active{transform:scale(.88)}'+
'@media(max-width:768px){.pg-sc{right:8px}.pg-sc button{width:26px;height:26px;font-size:10px}}'+
'@media print{.pg-sc{display:none!important}}';
document.head.appendChild(s);
}
function init(){
if(document.getElementById('pg-scrl'))return;
css();
var w=document.createElement('div');
w.id='pg-scrl';
w.className='pg-sc';
_u=document.createElement('button');
_u.type='button';_u.title='Ke Atas';
_u.innerHTML='<i class="fa-solid fa-angles-up"></i>';
_u.addEventListener('click',function(){window.scrollTo({top:0,behavior:'smooth'});});
_d=document.createElement('button');
_d.type='button';_d.title='Ke Bawah';
_d.innerHTML='<i class="fa-solid fa-angles-down"></i>';
_d.addEventListener('click',function(){window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});});
w.appendChild(_u);w.appendChild(_d);
document.body.appendChild(w);
window.addEventListener('scroll',chk,{passive:true});
chk();
}
function chk(){
var st=window.scrollY;
var mx=document.documentElement.scrollHeight-window.innerHeight;
_d.classList.toggle('pg-on',st<mx-80);
_u.classList.toggle('pg-on',st>120);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();
