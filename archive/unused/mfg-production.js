/*MFGPROD*/
/* Smackin OS — Manufacturing: daily production entry for Mixing & P-Mac.
   Model confirmed from Allen's files (P-Mac "1736 - Production Tracking" + the
   "Mixing Room Detail" workbook), 2026-09-16:
   - MIXING is measured in BINS, by FLAVOR (his log is per operator/machine/flavor/run;
     bag size does NOT apply at the mixing stage). Daily target ~35 bins/operator.
     -> Entry here is the day's total bins PER FLAVOR (Troy's call 9/16). Stored as a
        JSON map on mfg_daily.mixing_flavors = { "<flavorCode>": bins, ... }.
   - P-MAC is measured in total PACKAGES (floor counts boxes x pkgs/box), split by bag
     size 1.5oz / 4oz. Daily total per bag size. Stored in pmac_15 / pmac_4.
   Allen's per-operator / per-run detail stays in his own sheets; this captures the
   daily rollup that feeds the OS.
   - "Production Entry" nav item: enter the day's numbers, save to Supabase.
   - "Production Log" nav item: latest-day cards + recent-days table + weekly totals +
     the latest day's mixing-by-flavor breakdown.
   Self-contained IIFE. Overlay off #nav (like Safety/Maintenance). NO setInterval.
   Stores to Supabase mfg_daily. */
(function(){
if (window.__mpInit) return; window.__mpInit = true;

var SB='https://otwjxqhhwljwfyqbfuxz.supabase.co';
var KEY='sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY';
var H={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
function api(path,opts){opts=opts||{};opts.headers=Object.assign({},H,opts.headers||{});opts.cache='no-store';return fetch(SB+'/rest/v1/'+path,opts);}

function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function today(){ return new Date().toISOString().slice(0,10); }
function n(v){ v=(''+ (v==null?'':v)).replace(/[,\s]/g,''); return v===''||isNaN(+v)?0:+v; }
function fmt(x){ return (x==null?0:x).toLocaleString(); }
function fdate(s){ if(!s) return ''; var p=(''+s).slice(0,10).split('-'); return p.length===3? (p[1]+'/'+p[2]+'/'+p[0].slice(2)) : s; }

/* Flavor list for Mixing — pulled live from the item master (4oz bags) so it always
   matches the app's flavors. Code = the S##/L## part; core (S) first, then LTO (L). */
function flavorList(){
  var out=[], seen={};
  var items=(window.DB&&DB.items&&DB.items())||[];
  items.forEach(function(it){
    if(it.category!=='bag4') return;
    var code=String(it.code||'').replace(/^B4-/,'');
    if(!code||seen[code]) return; seen[code]=1;
    out.push({code:code, name:it.flavor||it.name||code});
  });
  out.sort(function(a,b){
    var ac=/^S/.test(a.code)?0:1, bc=/^S/.test(b.code)?0:1;
    if(ac!==bc) return ac-bc;
    return a.code.localeCompare(b.code, undefined, {numeric:true});
  });
  return out;
}

/* P-Mac cells (packages, by bag size) */
var PMAC=[ {k:'pmac_15', size:'1.5 oz'}, {k:'pmac_4', size:'4 oz'} ];

/* ---------- ENTRY form ---------- */
function formHTML(){
var fl=flavorList();
var core=fl.filter(function(f){return /^S/.test(f.code);});
var lto=fl.filter(function(f){return !/^S/.test(f.code);});
function flCell(f){
  return '<div class="mp-fl"><label class="mp-fllbl" title="'+esc(f.code)+'">'+esc(f.name)+'</label>'+
  '<input id="mp_mix_'+esc(f.code)+'" data-mix="'+esc(f.code)+'" class="mp-in mp-flnum" type="text" inputmode="numeric" placeholder="0"></div>';
}
var pmacCells=PMAC.map(function(c){
  return '<div class="mp-cell"><div class="mp-cell-h"><span class="mp-dept mp-pmac">P-Mac</span> <span class="mp-size">'+c.size+'</span></div>'+
  '<input id="mp_'+c.k+'" class="mp-in mp-num" type="text" inputmode="numeric" placeholder="0"><div class="mp-unit">packages</div></div>';
}).join('');

return '<div class="mp-wrap">'+
'<div class="mp-hd"><h2>Production Entry <span class="mp-sub">Mixing &amp; P-Mac</span></h2>'+
'<p>Enter today’s output. Mixing is bins by flavor; P-Mac is packages (bags) by size. Leave a flavor blank if it wasn’t mixed.</p></div>'+
'<div class="mp-row2">'+
'<div class="mp-fld"><label class="mp-lbl">Date</label><input id="mp_date" class="mp-in" type="date" value="'+today()+'"></div>'+
'<div class="mp-fld"><label class="mp-lbl">Shift</label><select id="mp_shift" class="mp-in"><option value="">All day</option><option>1st</option><option>2nd</option></select></div>'+
'<div class="mp-fld"><label class="mp-lbl">Entered by</label><input id="mp_by" class="mp-in" type="text" placeholder="Name"></div>'+
'</div>'+

'<div class="mp-sec-h"><span class="mp-dept mp-mix">Mixing</span> <span class="mp-sec-t">bins by flavor</span> <span class="mp-mixtot" id="mp_mixtot">0 bins</span></div>'+
'<div class="mp-flgrp"><div class="mp-flgrp-h">Core</div><div class="mp-flgrid">'+core.map(flCell).join('')+'</div></div>'+
(lto.length? '<div class="mp-flgrp"><div class="mp-flgrp-h">Limited editions</div><div class="mp-flgrid">'+lto.map(flCell).join('')+'</div></div>':'')+

'<div class="mp-sec-h" style="margin-top:18px"><span class="mp-dept mp-pmac">P-Mac</span> <span class="mp-sec-t">packages by bag size</span></div>'+
'<div class="mp-grid2">'+pmacCells+'</div>'+

'<div class="mp-fld full"><label class="mp-lbl">Notes</label><textarea id="mp_notes" class="mp-in" placeholder="Anything special about today’s runs — downtime, issues, operators"></textarea></div>'+
'<div id="mp_msg"></div>'+
'<div class="mp-bar"><button class="mp-btn" id="mp_save">✓ Save today’s numbers</button>'+
'<button class="mp-btn ghost" id="mp_log">→ View Production Log</button>'+
'<span class="mp-note">Saving updates the day’s row. Re-open any date to edit it.</span></div>'+
'</div>';
}

function recalcMixTot(){
  var t=0; [].slice.call(document.querySelectorAll('[data-mix]')).forEach(function(e){ t+=n(e.value); });
  var el=document.getElementById('mp_mixtot'); if(el) el.textContent=fmt(t)+' bins';
}

function loadInto(date){
api('mfg_daily?prod_date=eq.'+encodeURIComponent(date)+'&select=*&order=updated_at.desc&limit=1')
.then(function(r){return r.json();}).then(function(rows){
var d=(Array.isArray(rows)&&rows[0])||{};
var mix=d.mixing_flavors||{};
[].slice.call(document.querySelectorAll('[data-mix]')).forEach(function(e){ var c=e.getAttribute('data-mix'); e.value=(mix[c]!=null?mix[c]:''); });
PMAC.forEach(function(c){ var e=document.getElementById('mp_'+c.k); if(e) e.value=(d[c.k]!=null? d[c.k] : ''); });
var nb=document.getElementById('mp_by'); if(nb&&d.entered_by) nb.value=d.entered_by;
var nt=document.getElementById('mp_notes'); if(nt) nt.value=d.notes||'';
var ns=document.getElementById('mp_shift'); if(ns&&d.shift) ns.value=d.shift;
recalcMixTot();
}).catch(function(){});
}

function save(){
var msg=document.getElementById('mp_msg');
var date=(document.getElementById('mp_date')||{}).value||today();
var mix={};
[].slice.call(document.querySelectorAll('[data-mix]')).forEach(function(e){ var v=n(e.value); if(v>0) mix[e.getAttribute('data-mix')]=v; });
var rec={ prod_date:date, shift:(document.getElementById('mp_shift')||{}).value||null,
unit:'mixing=bins/flavor, pmac=packages', mixing_flavors:mix,
notes:(document.getElementById('mp_notes')||{}).value||'',
entered_by:(document.getElementById('mp_by')||{}).value||'', updated_at:new Date().toISOString() };
PMAC.forEach(function(c){ rec[c.k]=n((document.getElementById('mp_'+c.k)||{}).value); });
msg.innerHTML='<div class="mp-ok">Saving…</div>';
api('mfg_daily?on_conflict=prod_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify([rec])})
.then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
.then(function(){ var mb=0; Object.keys(mix).forEach(function(k){mb+=mix[k];}); var pm=rec.pmac_15+rec.pmac_4;
msg.innerHTML='<div class="mp-ok">✓ Saved '+fdate(date)+' — Mixing '+fmt(mb)+' bins ('+Object.keys(mix).length+' flavors), P-Mac '+fmt(pm)+' packages.</div>'; })
.catch(function(e){ msg.innerHTML='<div class="mp-err">Could not save ('+esc(String(e.message||e))+'). Is the mfg_daily table + mixing_flavors column present?</div>'; });
}

/* ---------- LOG / rollup ---------- */
function mixBins(row){ var m=row&&row.mixing_flavors||{}; var t=0; Object.keys(m).forEach(function(k){t+=n(m[k]);}); return t; }
function flavorNameByCode(code){
  var items=(window.DB&&DB.items&&DB.items())||[];
  var it=items.filter(function(x){return x.category==='bag4' && String(x.code||'').replace(/^B4-/,'')===code;})[0];
  return it?(it.flavor||it.name):code;
}
function logView(){
var o=ov(); o.innerHTML='<div class="mp-wrap"><div class="mp-hd"><h2>Production Log <span class="mp-sub">Mixing &amp; P-Mac</span></h2></div><div id="mp_body">Loading…</div></div>';
api('mfg_daily?select=*&order=prod_date.desc&limit=60').then(function(r){return r.json();}).then(function(rows){
if(!Array.isArray(rows)) rows=[];
var t=rows[0]||{};
var cut=new Date(); cut.setDate(cut.getDate()-6); cut=cut.toISOString().slice(0,10);
var wk={mix:0,pmac_15:0,pmac_4:0};
rows.forEach(function(r){ if((r.prod_date||'')>=cut){ wk.mix+=mixBins(r); wk.pmac_15+=n(r.pmac_15); wk.pmac_4+=n(r.pmac_4); } });
var cards=
'<div class="mp-card mp-mix"><div class="mp-card-h">Mixing</div><div class="mp-card-n">'+fmt(mixBins(t))+' <span class="mp-card-u">bins</span></div><div class="mp-card-s">'+fmt(wk.mix)+' this week</div></div>'+
'<div class="mp-card mp-pmac"><div class="mp-card-h">P-Mac · 1.5 oz</div><div class="mp-card-n">'+fmt(n(t.pmac_15))+' <span class="mp-card-u">pkgs</span></div><div class="mp-card-s">'+fmt(wk.pmac_15)+' this week</div></div>'+
'<div class="mp-card mp-pmac"><div class="mp-card-h">P-Mac · 4 oz</div><div class="mp-card-n">'+fmt(n(t.pmac_4))+' <span class="mp-card-u">pkgs</span></div><div class="mp-card-s">'+fmt(wk.pmac_4)+' this week</div></div>';

// latest-day mixing-by-flavor breakdown
var mf=t.mixing_flavors||{}; var mfKeys=Object.keys(mf).sort(function(a,b){return mf[b]-mf[a];});
var mixBreak = mfKeys.length? '<div class="mp-break"><div class="mp-break-h">Mixing by flavor — '+fdate(t.prod_date)+'</div>'+
  mfKeys.map(function(c){ return '<span class="mp-chip">'+esc(flavorNameByCode(c))+' <b>'+fmt(n(mf[c]))+'</b></span>'; }).join('')+'</div>' : '';

var latest = t.prod_date? ('Latest: '+fdate(t.prod_date)) : 'No entries yet';
var rowsHTML = rows.length? rows.map(function(r){
return '<tr><td>'+esc(fdate(r.prod_date))+'</td><td class="r b">'+fmt(mixBins(r))+'</td><td class="r">'+fmt(n(r.pmac_15))+'</td>'+
'<td class="r">'+fmt(n(r.pmac_4))+'</td><td class="r">'+fmt(n(r.pmac_15)+n(r.pmac_4))+'</td>'+
'<td><button class="mp-btn ghost sm" data-d="'+esc(r.prod_date)+'">Edit</button></td></tr>';
}).join('') : '<tr><td colspan="6" style="text-align:center;color:#6E7C8A;padding:20px">No production entered yet. Use Production Entry to add today’s numbers.</td></tr>';
document.getElementById('mp_body').innerHTML=
'<div class="mp-cards">'+cards+'</div>'+
'<div class="mp-latest">'+latest+' · cards show the latest day; sub-line is the last 7 days. Mixing in bins, P-Mac in packages.</div>'+
mixBreak+
'<table class="mp-tbl"><thead><tr><th>Date</th><th class="r">Mixing bins</th><th class="r">P-Mac 1.5</th><th class="r">P-Mac 4</th><th class="r">P-Mac total</th><th></th></tr></thead><tbody>'+rowsHTML+'</tbody></table>';
[].slice.call(document.querySelectorAll('#mp_body [data-d]')).forEach(function(b){ b.onclick=function(){ showForm(b.getAttribute('data-d')); }; });
}).catch(function(){ document.getElementById('mp_body').innerHTML='<div class="mp-err">Could not load. Is the mfg_daily table created?</div>'; });
}

/* ---------- overlay + views ---------- */
function ov(){ if(!document.getElementById('view'))return null; var o=document.getElementById('mp-overlay'); if(!o){ o=document.createElement('div'); o.id='mp-overlay'; o.style.display='none'; document.body.appendChild(o); } return o; }
function place(o){ var nav=document.getElementById('nav'); var r=nav?nav.getBoundingClientRect():{right:220,top:64}; o.style.left=r.right+'px'; o.style.top=r.top+'px'; }
function showForm(date){ var o=ov(); if(!o)return; window.__mpActive=true; place(o); o.style.display='block'; o.innerHTML=formHTML();
if(date){ var e=document.getElementById('mp_date'); if(e) e.value=date; }
loadInto((document.getElementById('mp_date')||{}).value||today());
document.getElementById('mp_date').onchange=function(){ loadInto(this.value); };
[].slice.call(o.querySelectorAll('[data-mix]')).forEach(function(e){ e.addEventListener('input',recalcMixTot); });
document.getElementById('mp_save').onclick=save;
document.getElementById('mp_log').onclick=logView; }
function showLog(){ var o=ov(); if(!o)return; window.__mpActive=true; place(o); o.style.display='block'; logView(); }
function hide(){ var o=document.getElementById('mp-overlay'); window.__mpActive=false; if(o)o.style.display='none'; }
window.__mpShowForm=showForm; window.__mpShowLog=showLog; window.__mpHide=hide;

/* ---------- nav group (persist through re-renders, NO setInterval) ---------- */
function ensureNav(){
var nav=document.getElementById('nav'); if(!nav) return;
if(document.getElementById('mp-navgroup')) return;
var g=document.createElement('div'); g.className='navgroup'; g.id='mp-navgroup';
g.innerHTML='<button class="navlabel" style="pointer-events:none">MANUFACTURING</button>'+
'<button class="navitem" id="mp-nav-entry"><span>🏭 Production Entry</span></button>'+
'<button class="navitem" id="mp-nav-log"><span>📊 Production Log</span></button>';
nav.appendChild(g);
g.querySelector('#mp-nav-entry').addEventListener('click',function(e){ e.stopPropagation(); setTimeout(function(){showForm();},0); });
g.querySelector('#mp-nav-log').addEventListener('click',function(e){ e.stopPropagation(); setTimeout(showLog,0); });
}
ensureNav();
var mo=new MutationObserver(function(){ if(!document.getElementById('mp-navgroup')) ensureNav(); });
var navEl=document.getElementById('nav'); if(navEl) mo.observe(navEl,{childList:true});
document.addEventListener('click',function(e){
var it=e.target.closest?e.target.closest('.navitem'):null; if(!it) return;
if(it.id==='mp-nav-entry'||it.id==='mp-nav-log') return;
hide();
},true);
window.addEventListener('resize',function(){ if(window.__mpActive) place(ov()); });

css();
function css(){ if(document.getElementById('mp-css'))return; var s=document.createElement('style'); s.id='mp-css';
s.textContent=
'#mp-overlay{position:fixed;right:0;bottom:0;background:#f4f7fa;overflow:auto;z-index:50;padding:22px 26px}'+
'.mp-wrap{max-width:900px}'+
'.mp-hd h2{margin:0;font:800 24px system-ui;color:#04223B}'+
'.mp-sub{font:600 15px system-ui;color:#006DB6;margin-left:6px}'+
'.mp-hd p{margin:4px 0 0;font:13px system-ui;color:#6E7C8A}'+
'.mp-row2{display:flex;gap:16px;flex-wrap:wrap;margin:16px 0}'+
'.mp-fld{display:flex;flex-direction:column;gap:4px}.mp-fld.full{margin-top:14px}'+
'.mp-lbl{font:600 12px system-ui;color:#33414d}'+
'.mp-in{border:1px solid #cfdae6;border-radius:8px;padding:8px 10px;font:14px system-ui;background:#fff}'+
'textarea.mp-in{min-height:52px;resize:vertical;width:100%;box-sizing:border-box}'+
'.mp-sec-h{display:flex;align-items:center;gap:10px;margin:16px 0 8px}'+
'.mp-sec-t{font:600 13px system-ui;color:#33414d}'+
'.mp-mixtot{margin-left:auto;font:800 14px system-ui;color:#006DB6;background:#eaf3fb;border:1px solid #cfe0ef;border-radius:999px;padding:3px 12px}'+
'.mp-dept{font:800 12px system-ui;color:#fff;border-radius:6px;padding:2px 8px}'+
'.mp-mix{background:#006DB6}.mp-pmac{background:#F26B21}'+
'.mp-size{font:700 13px system-ui;color:#33414d}'+
'.mp-flgrp{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:10px 14px;margin-bottom:10px}'+
'.mp-flgrp-h{font:700 11px system-ui;color:#8090a0;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px}'+
'.mp-flgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 14px}'+
'.mp-fl{display:flex;align-items:center;gap:8px}'+
'.mp-fllbl{flex:1;font:600 12px system-ui;color:#243642;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
'.mp-flnum{width:64px;text-align:right;font:700 14px system-ui;padding:5px 8px}'+
'.mp-grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}'+
'.mp-cell{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:14px 16px}'+
'.mp-cell-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}'+
'.mp-num{font:800 22px system-ui;width:100%;box-sizing:border-box;text-align:right}'+
'.mp-unit{font:12px system-ui;color:#8090a0;text-align:right;margin-top:2px}'+
'.mp-bar{margin:20px 0 40px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}'+
'.mp-btn{background:#006DB6;color:#fff;border:0;font:700 14px system-ui;border-radius:10px;padding:11px 18px;cursor:pointer}'+
'.mp-btn:hover{background:#005c9c}.mp-btn.ghost{background:#f4f9ff;color:#006DB6;border:1px solid #cfe0ef}.mp-btn.sm{padding:5px 10px;font-size:12px}'+
'.mp-note{font:12px system-ui;color:#6E7C8A;max-width:340px}'+
'.mp-ok{background:#e8f6ee;border:1px solid #b8e0c6;color:#1E7D46;border-radius:8px;padding:10px 12px;font:600 13px system-ui;margin-top:12px}'+
'.mp-err{background:#fdecea;border:1px solid #f3c0ba;color:#b3352a;border-radius:8px;padding:10px 12px;font:600 13px system-ui;margin-top:12px}'+
'.mp-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:6px}'+
'.mp-card{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:12px 14px;border-top:3px solid #006DB6}'+
'.mp-card.mp-pmac{border-top-color:#F26B21}'+
'.mp-card-h{font:700 12px system-ui;color:#6E7C8A}'+
'.mp-card-n{font:800 26px system-ui;color:#04223B;margin:2px 0}'+
'.mp-card-u{font:600 12px system-ui;color:#8090a0}'+
'.mp-card-s{font:12px system-ui;color:#8090a0}'+
'.mp-latest{font:12px system-ui;color:#6E7C8A;margin:12px 0}'+
'.mp-break{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:10px 14px;margin-bottom:14px}'+
'.mp-break-h{font:700 12px system-ui;color:#6E7C8A;margin-bottom:8px}'+
'.mp-chip{display:inline-block;background:#eef3f8;border:1px solid #dbe3ec;border-radius:999px;padding:3px 10px;margin:0 6px 6px 0;font:600 12px system-ui;color:#243642}'+
'.mp-chip b{color:#006DB6}'+
'.mp-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden}'+
'.mp-tbl th{background:#eef3f8;text-align:left;font:700 12px system-ui;color:#04223B;padding:9px 12px}'+
'.mp-tbl td{border-top:1px solid #eef2f6;padding:9px 12px;font:13px system-ui;color:#33414d}'+
'.mp-tbl .r{text-align:right}.mp-tbl .b{font-weight:800;color:#04223B}'+
'@media(max-width:760px){.mp-cards{grid-template-columns:1fr}.mp-grid2{grid-template-columns:1fr}.mp-flgrid{grid-template-columns:1fr 1fr}}';
document.head.appendChild(s);
}
})();
