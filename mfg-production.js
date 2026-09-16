/*MFGPROD*/
/* Smackin OS — Manufacturing: daily production numbers for Mixing & P-Mac (1.5oz + 4oz).
   From Allen's "1736 - Production Tracking" (Detail tab = P-Mac). Captures four daily totals:
   Mixing 1.5oz / Mixing 4oz / P-Mac 1.5oz / P-Mac 4oz.
   UNITS (confirmed by Allen 9/15): P-Mac = total PACKAGES (floor counts boxes, then x pkgs/box);
   Mixing = BINS produced. Entry is a daily total per line/bag size — Allen's per-operator /
   per-machine / per-flavor / per-lot detail stays in his own sheets (new sheet per lot).
   NOTE: Mixing lives in a separate file Allen is sending; the Mixing structure here
   (split by bag size) may be revised once that file arrives.
   - "Production Entry" nav item: open, enter the day's numbers, save to Supabase.
   - "Production Log" nav item: today's cards + recent-days table + weekly totals.
   Self-contained IIFE. Overlay off #nav (like Safety/Maintenance). NO setInterval.
   Stores to Supabase mfg_daily (see mfg_daily_table.sql). */
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

/* the four cells: key, dept, size, unit (Mixing = bins, P-Mac = packages) */
var CELLS=[
{k:'mixing_15', dept:'Mixing', size:'1.5 oz', unit:'bins'},
{k:'mixing_4', dept:'Mixing', size:'4 oz', unit:'bins'},
{k:'pmac_15', dept:'P-Mac', size:'1.5 oz', unit:'packages'},
{k:'pmac_4', dept:'P-Mac', size:'4 oz', unit:'packages'}
];

/* ---------- ENTRY form ---------- */
function formHTML(){
var grid=CELLS.map(function(c){
return '<div class="mp-cell"><div class="mp-cell-h"><span class="mp-dept mp-'+(c.dept==='Mixing'?'mix':'pmac')+'">'+c.dept+'</span> <span class="mp-size">'+c.size+'</span></div>'+
'<input id="mp_'+c.k+'" class="mp-in mp-num" type="text" inputmode="numeric" placeholder="0"><div class="mp-unit">'+c.unit+'</div></div>';
}).join('');
return '<div class="mp-wrap">'+
'<div class="mp-hd"><h2>Production Entry <span class="mp-sub">Mixing &amp; P-Mac</span></h2>'+
'<p>Enter today’s output for each line and bag size — P-Mac in packages (bags), Mixing in bins.</p></div>'+
'<div class="mp-row2">'+
'<div class="mp-fld"><label class="mp-lbl">Date</label><input id="mp_date" class="mp-in" type="date" value="'+today()+'"></div>'+
'<div class="mp-fld"><label class="mp-lbl">Shift</label><select id="mp_shift" class="mp-in"><option value="">All day</option><option>1st</option><option>2nd</option></select></div>'+
'<div class="mp-fld"><label class="mp-lbl">Entered by</label><input id="mp_by" class="mp-in" type="text" placeholder="Name"></div>'+
'</div>'+
'<div class="mp-grid">'+grid+'</div>'+
'<div class="mp-fld full"><label class="mp-lbl">Notes</label><textarea id="mp_notes" class="mp-in" placeholder="Anything special about today’s runs — flavors, downtime, issues"></textarea></div>'+
'<div id="mp_msg"></div>'+
'<div class="mp-bar"><button class="mp-btn" id="mp_save">✓ Save today’s numbers</button>'+
'<button class="mp-btn ghost" id="mp_log">→ View Production Log</button>'+
'<span class="mp-note">Saving updates the day’s row. Re-open any date to edit it.</span></div>'+
'</div>';
}

function loadInto(date){
api('mfg_daily?prod_date=eq.'+encodeURIComponent(date)+'&select=*&order=updated_at.desc&limit=1')
.then(function(r){return r.json();}).then(function(rows){
var d=(Array.isArray(rows)&&rows[0])||{};
CELLS.forEach(function(c){ var e=document.getElementById('mp_'+c.k); if(e) e.value=(d[c.k]!=null? d[c.k] : ''); });
var nb=document.getElementById('mp_by'); if(nb&&d.entered_by) nb.value=d.entered_by;
var nt=document.getElementById('mp_notes'); if(nt) nt.value=d.notes||'';
var ns=document.getElementById('mp_shift'); if(ns&&d.shift) ns.value=d.shift;
}).catch(function(){});
}

function save(){
var msg=document.getElementById('mp_msg');
var date=(document.getElementById('mp_date')||{}).value||today();
var rec={ prod_date:date, shift:(document.getElementById('mp_shift')||{}).value||null,
unit:'pmac=packages, mixing=bins', notes:(document.getElementById('mp_notes')||{}).value||'',
entered_by:(document.getElementById('mp_by')||{}).value||'', updated_at:new Date().toISOString() };
CELLS.forEach(function(c){ rec[c.k]=n((document.getElementById('mp_'+c.k)||{}).value); });
msg.innerHTML='<div class="mp-ok">Saving…</div>';
// upsert on prod_date
api('mfg_daily?on_conflict=prod_date',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify([rec])})
.then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
.then(function(){ var mix=rec.mixing_15+rec.mixing_4, pm=rec.pmac_15+rec.pmac_4;
msg.innerHTML='<div class="mp-ok">✓ Saved '+fdate(date)+' — Mixing '+fmt(mix)+' bins, P-Mac '+fmt(pm)+' packages.</div>'; })
.catch(function(e){ msg.innerHTML='<div class="mp-err">Could not save ('+esc(String(e.message||e))+'). Is the mfg_daily table created?</div>'; });
}

/* ---------- LOG / rollup ---------- */
function logView(){
var o=ov(); o.innerHTML='<div class="mp-wrap"><div class="mp-hd"><h2>Production Log <span class="mp-sub">Mixing &amp; P-Mac</span></h2></div><div id="mp_body">Loading…</div></div>';
api('mfg_daily?select=*&order=prod_date.desc&limit=60').then(function(r){return r.json();}).then(function(rows){
if(!Array.isArray(rows)) rows=[];
var t=rows[0]||{};
// 7-day window totals
var cut=new Date(); cut.setDate(cut.getDate()-6); cut=cut.toISOString().slice(0,10);
var wk={mixing_15:0,mixing_4:0,pmac_15:0,pmac_4:0};
rows.forEach(function(r){ if((r.prod_date||'')>=cut){ CELLS.forEach(function(c){ wk[c.k]+=n(r[c.k]); }); } });
var cards=CELLS.map(function(c){
return '<div class="mp-card mp-'+(c.dept==='Mixing'?'mix':'pmac')+'"><div class="mp-card-h">'+c.dept+' · '+c.size+'</div>'+
'<div class="mp-card-n">'+fmt(n(t[c.k]))+' <span class="mp-card-u">'+c.unit+'</span></div><div class="mp-card-s">'+fmt(wk[c.k])+' this week</div></div>';
}).join('');
var latest = t.prod_date? ('Latest: '+fdate(t.prod_date)) : 'No entries yet';
var rowsHTML = rows.length? rows.map(function(r){
var mix=n(r.mixing_15)+n(r.mixing_4), pm=n(r.pmac_15)+n(r.pmac_4);
return '<tr><td>'+esc(fdate(r.prod_date))+'</td><td class="r">'+fmt(n(r.mixing_15))+'</td><td class="r">'+fmt(n(r.mixing_4))+'</td>'+
'<td class="r">'+fmt(n(r.pmac_15))+'</td><td class="r">'+fmt(n(r.pmac_4))+'</td><td class="r b">'+fmt(mix)+'</td><td class="r b">'+fmt(pm)+'</td>'+
'<td><button class="mp-btn ghost sm" data-d="'+esc(r.prod_date)+'">Edit</button></td></tr>';
}).join('') : '<tr><td colspan="8" style="text-align:center;color:#6E7C8A;padding:20px">No production entered yet. Use Production Entry to add today’s numbers.</td></tr>';
document.getElementById('mp_body').innerHTML=
'<div class="mp-cards">'+cards+'</div>'+
'<div class="mp-latest">'+latest+' · cards show the latest day; sub-line is the last 7 days. Mixing in bins, P-Mac in packages.</div>'+
'<table class="mp-tbl"><thead><tr><th>Date</th><th class="r">Mix 1.5</th><th class="r">Mix 4</th><th class="r">P-Mac 1.5</th><th class="r">P-Mac 4</th><th class="r">Mix bins</th><th class="r">P-Mac pkgs</th><th></th></tr></thead><tbody>'+rowsHTML+'</tbody></table>';
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
'.mp-row2{display:flex;gap:16px;flex-wrap:wrap;margin-top:16px}'+
'.mp-fld{display:flex;flex-direction:column;gap:4px}.mp-fld.full{margin-top:14px}'+
'.mp-lbl{font:600 12px system-ui;color:#33414d}'+
'.mp-in{border:1px solid #cfdae6;border-radius:8px;padding:8px 10px;font:14px system-ui;background:#fff}'+
'textarea.mp-in{min-height:52px;resize:vertical;width:100%;box-sizing:border-box}'+
'.mp-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:16px}'+
'.mp-cell{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:14px 16px}'+
'.mp-cell-h{display:flex;align-items:center;gap:8px;margin-bottom:8px}'+
'.mp-dept{font:800 12px system-ui;color:#fff;border-radius:6px;padding:2px 8px}'+
'.mp-mix{background:#006DB6}.mp-pmac{background:#F26B21}'+
'.mp-size{font:700 13px system-ui;color:#33414d}'+
'.mp-num{font:800 22px system-ui;width:100%;box-sizing:border-box;text-align:right}'+
'.mp-unit{font:12px system-ui;color:#8090a0;text-align:right;margin-top:2px}'+
'.mp-bar{margin:20px 0 40px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}'+
'.mp-btn{background:#006DB6;color:#fff;border:0;font:700 14px system-ui;border-radius:10px;padding:11px 18px;cursor:pointer}'+
'.mp-btn:hover{background:#005c9c}.mp-btn.ghost{background:#f4f9ff;color:#006DB6;border:1px solid #cfe0ef}.mp-btn.sm{padding:5px 10px;font-size:12px}'+
'.mp-note{font:12px system-ui;color:#6E7C8A;max-width:340px}'+
'.mp-ok{background:#e8f6ee;border:1px solid #b8e0c6;color:#1E7D46;border-radius:8px;padding:10px 12px;font:600 13px system-ui;margin-top:12px}'+
'.mp-err{background:#fdecea;border:1px solid #f3c0ba;color:#b3352a;border-radius:8px;padding:10px 12px;font:600 13px system-ui;margin-top:12px}'+
'.mp-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:6px}'+
'.mp-card{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:12px 14px;border-top:3px solid #006DB6}'+
'.mp-card.mp-pmac{border-top-color:#F26B21}'+
'.mp-card-h{font:700 12px system-ui;color:#6E7C8A}'+
'.mp-card-n{font:800 26px system-ui;color:#04223B;margin:2px 0}'+
'.mp-card-u{font:600 12px system-ui;color:#8090a0}'+
'.mp-card-s{font:12px system-ui;color:#8090a0}'+
'.mp-latest{font:12px system-ui;color:#6E7C8A;margin:12px 0}'+
'.mp-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden}'+
'.mp-tbl th{background:#eef3f8;text-align:left;font:700 12px system-ui;color:#04223B;padding:9px 12px}'+
'.mp-tbl td{border-top:1px solid #eef2f6;padding:9px 12px;font:13px system-ui;color:#33414d}'+
'.mp-tbl .r{text-align:right}.mp-tbl .b{font-weight:800;color:#04223B}'+
'@media(max-width:760px){.mp-cards{grid-template-columns:1fr 1fr}.mp-grid{grid-template-columns:1fr}}';
document.head.appendChild(s);
}
})();
