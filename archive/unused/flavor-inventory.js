/*FLAVINV2*/
/* Smackin OS — Finished Bags, consolidated + sectioned.
   ONE "Finished Bags" view (replaces the old "Flavor Inventory" duplicate, whose
   nav item is hidden). Counts come from DB.onHand (authoritative SLC numbers).
   Organized into three sections, top to bottom:
     1) Core Flavors        — the everyday line (S-series + Dollar Tree), what we sell most
     2) Active Limited       — limited-edition flavors currently in play (have stock)
     3) Inactive Limited     — past limited editions, not currently produced (0 on hand)
   Per-flavor rows with 4oz / 1.5oz / 2.75oz columns + Total + Status. Sortable, and the
   sort STICKS (module keeps state). Seasoning is excluded (its own Seasoning Lots section).
   Overlay off #nav. NO setInterval (scroll-glitch safe). */
(function(){
  if(window.__fiInit) return; window.__fiInit=true;

  var SIZE = { bag4:'oz4', bag15:'oz15', bag275:'oz275', dollartree275:'oz275' };
  function cat(it){ return (it.category||'').toString().trim().toLowerCase(); }
  function isFin(it){ return SIZE.hasOwnProperty(cat(it)); }
  function stripName(n){ return String(n||'').replace(/^bags?\s*\d+(\.\d+)?\s*oz\s*-\s*/i,'').replace(/^dollar tree\s*\d+(\.\d+)?\s*oz\s*-\s*/i,'').replace(/\s*\(UPC[^)]*\)/i,'').trim(); }
  function norm(s){ return String(s||'').toLowerCase().replace(/chile/g,'chili').replace(/[^a-z0-9]+/g,' ').trim(); }
  function oh(code){ try{ var v=DB.onHand(code); return typeof v==='number'?v:0; }catch(e){ return 0; } }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function nfmt(n){ return (n||0).toLocaleString(); }
  // Core = standard S-series (B4-S##/B15-S##) or Dollar Tree line. Everything else = limited.
  function isCoreCode(c){ return /-S\d/i.test(c||'') || /^DT275/i.test(c||''); }

  var S = { sortKey:'total', sortDir:-1, q:'' };

  function rows(){
    var items=(window.DB&&DB.items&&DB.items())||[];
    var by={};
    items.filter(isFin).forEach(function(it){
      var nm=stripName(it.name||it.code); var k=norm(nm);
      var r=by[k]||(by[k]={name:nm, oz4:0, oz15:0, oz275:0, core:false, lto:false});
      r[SIZE[cat(it)]] += oh(it.code);
      if(isCoreCode(it.code)) r.core=true;
      if(/^TMP/i.test(it.code||'')) r.lto=true;
      if(nm.length>r.name.length) r.name=nm;
    });
    return Object.keys(by).map(function(k){ var r=by[k]; r.total=r.oz4+r.oz15+r.oz275; r.status=r.total>0?'In stock':'Out';
      r.section = r.core ? 'core' : (r.total>0 ? 'active' : 'inactive'); return r; });
  }
  function sortRows(rs){
    var k=S.sortKey, d=S.sortDir;
    return rs.slice().sort(function(a,b){
      if(k==='name'){ var av=a.name.toLowerCase(), bv=b.name.toLowerCase(); return av<bv?-1*d:(av>bv?1*d:0); }
      if(k==='status'){ return ((a.total>0?1:0)-(b.total>0?1:0))*d; }
      return ((a[k]||0)-(b[k]||0))*d;
    });
  }

  function th(key,label,cls){ var a= S.sortKey===key?(S.sortDir>0?' ▲':' ▼'):' ↕'; return '<th data-sk="'+key+'" class="'+(cls||'')+'">'+label+a+'</th>'; }
  function cell(v){ return '<td class="n">'+(v>0?nfmt(v):'<s>—</s>')+'</td>'; }
  function tableFor(rs){
    if(!rs.length) return '<div class="fi-none">Nothing here.</div>';
    return '<table class="fi-tbl"><thead><tr>'+th('name','Flavor')+th('oz4','4 oz','n')+th('oz15','1.5 oz','n')+th('oz275','2.75 oz','n')+th('total','Total','n')+th('status','Status')+'</tr></thead><tbody>'+
      rs.map(function(r){
        return '<tr class="'+(r.total<=0?'z':'')+'"><td class="nm"><b>'+esc(r.name)+'</b>'+(r.lto?' <span class="fi-lto">LTO</span>':'')+'</td>'+
          cell(r.oz4)+cell(r.oz15)+cell(r.oz275)+'<td class="n tot">'+nfmt(r.total)+'</td>'+
          '<td><span class="fi-pill '+(r.total>0?'ok':'out')+'">'+r.status+'</span></td></tr>';
      }).join('')+'</tbody></table>';
  }
  function section(cls,title,sub,rs){
    return '<div class="fi-sec '+cls+'"><div class="fi-sh"><h3>'+esc(title)+'</h3><span class="fi-scount">'+rs.length+'</span><span class="fi-ssub">'+esc(sub)+'</span></div>'+tableFor(rs)+'</div>';
  }

  function render(){
    var o=ov(); if(!o) return;
    var all=rows();
    var q=norm(S.q);
    var filtered = q ? all.filter(function(r){ return norm(r.name).indexOf(q)>=0; }) : all;
    var core=sortRows(filtered.filter(function(r){return r.section==='core';}));
    var active=sortRows(filtered.filter(function(r){return r.section==='active';}));
    var inactive=sortRows(filtered.filter(function(r){return r.section==='inactive';}));
    var t=all.reduce(function(s,r){return s+r.total;},0);

    var head='<div class="fi-hd"><div><h2>Finished Bags</h2><p>Bagged product on hand, by flavor — counts from the current SLC inventory. Core line first, then the limited editions we’re running, then inactive ones. Sort any column; it stays put.</p></div>'+
      '<div class="fi-kpis"><div class="fi-kpi"><b>'+core.length+'</b><span>core</span></div>'+
      '<div class="fi-kpi ac"><b>'+active.length+'</b><span>active LTO</span></div>'+
      '<div class="fi-kpi in"><b>'+inactive.length+'</b><span>inactive LTO</span></div>'+
      '<div class="fi-kpi"><b>'+nfmt(t)+'</b><span>bags</span></div></div></div>';
    var search='<div class="fi-search"><input id="fi-q" placeholder="Filter flavors… (e.g. thai, bbq, ranch)" value="'+esc(S.q)+'" autocomplete="off"></div>';
    var body =
      section('c-core','Core Flavors','our everyday line — what we sell most', core) +
      section('c-active','Active Limited Editions','limited runs we’re currently doing', active) +
      section('c-inactive','Inactive Limited Editions','past limited editions — not currently produced', inactive);
    if(!core.length && !active.length && !inactive.length) body='<div class="fi-none" style="margin-top:14px">No flavors match “'+esc(S.q)+'”.</div>';
    o.innerHTML='<div class="fi-wrap">'+head+search+body+'</div>';
    wire(o);
  }
  function wire(o){
    var q=o.querySelector('#fi-q');
    if(q){ q.oninput=function(){ S.q=q.value; var p=q.selectionStart; render(); var n=document.getElementById('fi-q'); if(n){n.focus(); try{n.setSelectionRange(p,p);}catch(e){}} }; if(S.q){ q.focus(); try{q.setSelectionRange(q.value.length,q.value.length);}catch(e){} } }
    [].slice.call(o.querySelectorAll('.fi-tbl th')).forEach(function(th){ th.onclick=function(){ var k=th.getAttribute('data-sk'); if(!k)return; if(S.sortKey===k) S.sortDir=-S.sortDir; else { S.sortKey=k; S.sortDir=(k==='name')?1:-1; } render(); }; });
  }

  // ---- overlay ----
  function ov(){ if(!document.getElementById('view'))return null; var o=document.getElementById('fi-overlay'); if(!o){ o=document.createElement('div'); o.id='fi-overlay'; o.style.display='none'; document.body.appendChild(o); } return o; }
  function place(o){ var nav=document.getElementById('nav'); var r=nav?nav.getBoundingClientRect():{right:220,top:64}; o.style.left=r.right+'px'; o.style.top=r.top+'px'; }
  function show(){ var o=ov(); if(!o)return; window.__fiActive=true; place(o); o.style.display='block'; render(); }
  function hide(){ var o=document.getElementById('fi-overlay'); window.__fiActive=false; if(o)o.style.display='none'; }
  window.__fiShow=show; window.__fiHide=hide;

  if(!window.__fiNavHook){
    document.addEventListener('click',function(e){
      var it=e.target.closest?e.target.closest('.navitem'):null; if(!it)return;
      if(/finished bags/i.test(it.textContent)){ setTimeout(show,0); } else { hide(); }
    },true);
    window.__fiNavHook=true;
  }
  function hideFlavInv(){
    var nav=document.getElementById('nav'); if(!nav) return;
    [].slice.call(nav.querySelectorAll('.navitem')).forEach(function(n){
      if(/flavor inventory/i.test(n.textContent) && n.style.display!=='none'){ n.style.display='none'; }
    });
  }
  var navEl=document.getElementById('nav');
  if(navEl && !window.__fiObs){ window.__fiObs=new MutationObserver(function(){ var st=navEl.scrollTop; hideFlavInv(); navEl.scrollTop=st; }); window.__fiObs.observe(navEl,{childList:true,subtree:true}); }
  hideFlavInv();
  window.addEventListener('resize',function(){ if(window.__fiActive) place(ov()); });

  css();
  function css(){ if(document.getElementById('fi-css'))return; var s=document.createElement('style'); s.id='fi-css';
    s.textContent=
    '#fi-overlay{position:fixed;right:0;bottom:0;background:#f4f7fa;overflow:auto;z-index:50;padding:22px 26px}'+
    '.fi-wrap{max-width:900px}'+
    '.fi-hd{display:flex;align-items:flex-start;gap:18px;justify-content:space-between;margin-bottom:12px}'+
    '.fi-hd h2{margin:0;font:800 26px system-ui;color:#04223B}'+
    '.fi-hd p{margin:4px 0 0;font:13px system-ui;color:#6E7C8A;max-width:560px}'+
    '.fi-kpis{display:flex;gap:8px;flex-shrink:0}'+
    '.fi-kpi{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:6px 12px;text-align:center;min-width:58px}'+
    '.fi-kpi b{display:block;font:800 18px system-ui;color:#006DB6}.fi-kpi span{font:10px system-ui;color:#6E7C8A}'+
    '.fi-kpi.ac b{color:#F26B21}.fi-kpi.in b{color:#8794a2}'+
    '.fi-search{margin:6px 0 14px}'+
    '#fi-q{width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid #cfdae6;border-radius:10px;font:600 14px system-ui;color:#04223B;background:#fff;outline:none}'+
    '#fi-q:focus{border-color:#006DB6}'+
    '.fi-sec{margin-bottom:20px;border-radius:12px;overflow:hidden;border:1px solid #dbe3ec}'+
    '.fi-sh{display:flex;align-items:center;gap:10px;padding:11px 16px}'+
    '.fi-sh h3{margin:0;font:800 16px system-ui;color:#fff}'+
    '.fi-scount{background:rgba(255,255,255,.22);color:#fff;font:700 12px system-ui;border-radius:999px;padding:2px 10px}'+
    '.fi-ssub{font:600 12px system-ui;color:rgba(255,255,255,.85)}'+
    '.fi-sec.c-core .fi-sh{background:#04223B}'+
    '.fi-sec.c-active .fi-sh{background:#F26B21}'+
    '.fi-sec.c-inactive .fi-sh{background:#64748b}'+
    '.fi-tbl{width:100%;border-collapse:collapse;background:#fff;font:14px system-ui}'+
    '.fi-tbl th{position:sticky;top:0;text-align:left;background:#eef3f8;color:#04223B;font:700 12px system-ui;padding:9px 14px;cursor:pointer;user-select:none;white-space:nowrap;border-bottom:1px solid #dbe3ec}'+
    '.fi-tbl th.n{text-align:right}'+
    '.fi-tbl td{padding:9px 14px;border-bottom:1px solid #eef2f6;color:#243642}'+
    '.fi-tbl td.n{text-align:right;font-variant-numeric:tabular-nums}'+
    '.fi-tbl td.n s{color:#c3ccd6;text-decoration:none}'+
    '.fi-tbl td.tot{font-weight:700;color:#04223B}'+
    '.fi-tbl td.nm b{color:#04223B}'+
    '.fi-tbl tr.z td{background:#fcfdfe}'+
    '.fi-tbl tr:hover td{background:#f6faff}'+
    '.fi-lto{display:inline-block;margin-left:6px;background:#F26B21;color:#fff;font:700 10px system-ui;border-radius:4px;padding:1px 5px}'+
    '.fi-pill{font:700 11px system-ui;border-radius:6px;padding:2px 9px}'+
    '.fi-pill.ok{background:#e3f0e8;color:#1E7D46}.fi-pill.out{background:#eef1f4;color:#6b7885}'+
    '.fi-none{padding:16px;text-align:center;color:#94a2b0;font:13px system-ui;background:#fff}';
    document.head.appendChild(s);
  }
})();
