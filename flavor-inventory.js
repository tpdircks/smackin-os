/*FLAVINV2*/
/* Smackin OS — Flavor Inventory, rebuilt.
   Fixes two things Michelle reported:
     1) Sort wouldn't stay put — the old table re-rendered and dropped the sort.
        This overlay keeps its own sort state, so it sticks.
     2) Flavors were missing (e.g. Sweet Thai Chile) — the old list was a hardcoded
        set of 34. This pulls EVERY finished-bag flavor from the live SKU list, so
        nothing is ever missing again.
   On-hand comes from DB.onHand (the authoritative SLC counts), not the old calc
   that was counting returns. Overlay off #nav (like Raw Materials). NO setInterval. */
(function(){
  if(window.__fiInit) return; window.__fiInit=true;

  var SIZE = { bag4:'4 oz', bag15:'1.5 oz', bag275:'2.75 oz', dollartree275:'2.75 oz DT' };
  function cat(it){ return (it.category||'').toString().trim().toLowerCase(); }
  function isFin(it){ return SIZE.hasOwnProperty(cat(it)); }
  function stripName(n){ return String(n||'').replace(/^bags?\s*\d+(\.\d+)?\s*oz\s*-\s*/i,'').replace(/^dollar tree\s*\d+(\.\d+)?\s*oz\s*-\s*/i,'').replace(/\s*\(UPC[^)]*\)/i,'').trim(); }
  function oh(code){ try{ var v=DB.onHand(code); return typeof v==='number'?v:0; }catch(e){ return 0; } }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function nfmt(n){ return (n||0).toLocaleString(); }
  function isLTO(it){ return /^TMP/i.test(it.code||''); }

  var S = { sortKey:'name', sortDir:1, q:'' };

  function rows(){
    var items=(window.DB&&DB.items&&DB.items())||[];
    return items.filter(isFin).map(function(it){
      var o=oh(it.code); var ro=+it.reorder||0;
      var status = o<=0 ? 'Out' : (ro>0 && o<=ro ? 'Low' : 'OK');
      return { name:stripName(it.name||it.code), size:SIZE[cat(it)], oh:o, reorder:ro, status:status, code:it.code, lto:isLTO(it) };
    });
  }
  function sortRows(rs){
    var k=S.sortKey, d=S.sortDir;
    var rank={Out:0,Low:1,OK:2};
    return rs.slice().sort(function(a,b){
      var av,bv;
      if(k==='oh'){ return (a.oh-b.oh)*d; }
      if(k==='status'){ return ((rank[a.status]||0)-(rank[b.status]||0))*d; }
      if(k==='size'){ av=a.size; bv=b.size; }
      else { av=(a.name||'').toLowerCase(); bv=(b.name||'').toLowerCase(); }
      return av<bv?-1*d:(av>bv?1*d:0);
    });
  }

  function render(){
    var o=ov(); if(!o) return;
    var all=rows();
    var q=S.q.toLowerCase().trim();
    var filtered = q ? all.filter(function(r){ return (r.name+' '+r.code+' '+r.size).toLowerCase().indexOf(q)>=0; }) : all;
    var rs=sortRows(filtered);
    var outN=all.filter(function(r){return r.status==='Out';}).length;
    var lowN=all.filter(function(r){return r.status==='Low';}).length;

    function th(key,label,cls){ var a= S.sortKey===key?(S.sortDir>0?' ▲':' ▼'):' ↕'; return '<th data-sk="'+key+'" class="'+(cls||'')+'">'+label+a+'</th>'; }
    var head='<div class="fi-hd"><div><h2>Flavor Inventory</h2><p>Every flavor from the live SKU list — on-hand from the current SLC counts. Sort sticks where you put it.</p></div>'+
      '<div class="fi-kpis"><div class="fi-kpi"><b>'+all.length+'</b><span>flavors</span></div>'+
      '<div class="fi-kpi lo"><b>'+lowN+'</b><span>low</span></div>'+
      '<div class="fi-kpi ou"><b>'+outN+'</b><span>out</span></div></div></div>';
    var search='<div class="fi-search"><input id="fi-q" placeholder="Filter flavors… (e.g. thai, bbq, 4oz)" value="'+esc(S.q)+'" autocomplete="off"></div>';
    var tbl='<table class="fi-tbl"><thead><tr>'+th('name','Flavor')+th('size','Size')+th('oh','Finished on-hand','n')+th('status','Status')+'</tr></thead><tbody>'+
      (rs.length? rs.map(function(r){
        var sc = r.status==='Out'?'out':(r.status==='Low'?'low':'ok');
        return '<tr class="'+(r.status==='Out'?'z':'')+'"><td class="nm"><b>'+esc(r.name)+'</b>'+(r.lto?' <span class="fi-lto">LTO</span>':'')+'</td>'+
          '<td>'+esc(r.size)+'</td><td class="n">'+nfmt(r.oh)+' <s>bags</s></td>'+
          '<td><span class="fi-pill '+sc+'">'+r.status+'</span></td></tr>';
      }).join('') : '<tr><td colspan="4" class="fi-empty">No flavors match "'+esc(S.q)+'".</td></tr>')+
      '</tbody></table>';
    o.innerHTML='<div class="fi-wrap">'+head+search+tbl+'</div>';
    wire(o);
  }
  function wire(o){
    var q=o.querySelector('#fi-q');
    if(q){ q.oninput=function(){ S.q=q.value; var p=q.selectionStart; render(); var n=document.getElementById('fi-q'); if(n){n.focus(); try{n.setSelectionRange(p,p);}catch(e){}} }; if(S.q){ q.focus(); try{q.setSelectionRange(q.value.length,q.value.length);}catch(e){} } }
    [].slice.call(o.querySelectorAll('.fi-tbl th')).forEach(function(th){ th.onclick=function(){ var k=th.getAttribute('data-sk'); if(!k)return; if(S.sortKey===k) S.sortDir=-S.sortDir; else { S.sortKey=k; S.sortDir=(k==='oh')?-1:1; } render(); }; });
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
      if(/flavor inventory/i.test(it.textContent)){ setTimeout(show,0); } else { hide(); }
    },true);
    window.__fiNavHook=true;
  }
  window.addEventListener('resize',function(){ if(window.__fiActive) place(ov()); });

  css();
  function css(){ if(document.getElementById('fi-css'))return; var s=document.createElement('style'); s.id='fi-css';
    s.textContent=
    '#fi-overlay{position:fixed;right:0;bottom:0;background:#f4f7fa;overflow:auto;z-index:50;padding:22px 26px}'+
    '.fi-wrap{max-width:820px}'+
    '.fi-hd{display:flex;align-items:flex-start;gap:18px;justify-content:space-between;margin-bottom:12px}'+
    '.fi-hd h2{margin:0;font:800 26px system-ui;color:#04223B}'+
    '.fi-hd p{margin:4px 0 0;font:13px system-ui;color:#6E7C8A;max-width:520px}'+
    '.fi-kpis{display:flex;gap:8px}'+
    '.fi-kpi{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:6px 12px;text-align:center;min-width:58px}'+
    '.fi-kpi b{display:block;font:800 18px system-ui;color:#006DB6}.fi-kpi span{font:10px system-ui;color:#6E7C8A}'+
    '.fi-kpi.lo b{color:#B7791F}.fi-kpi.ou b{color:#C0392B}'+
    '.fi-search{margin:6px 0 12px}'+
    '#fi-q{width:100%;box-sizing:border-box;padding:10px 12px;border:2px solid #cfdae6;border-radius:10px;font:600 14px system-ui;color:#04223B;background:#fff;outline:none}'+
    '#fi-q:focus{border-color:#006DB6}'+
    '.fi-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden;font:14px system-ui}'+
    '.fi-tbl th{position:sticky;top:0;text-align:left;background:#04223B;color:#fff;font:700 12px system-ui;padding:11px 14px;cursor:pointer;user-select:none;white-space:nowrap}'+
    '.fi-tbl th.n{text-align:right}'+
    '.fi-tbl td{padding:10px 14px;border-bottom:1px solid #eef2f6;color:#243642}'+
    '.fi-tbl td.n{text-align:right;font-variant-numeric:tabular-nums}'+
    '.fi-tbl td.n s{color:#9aa7b4;text-decoration:none;font-size:11px}'+
    '.fi-tbl td.nm b{color:#04223B}'+
    '.fi-tbl tr.z td{background:#fff7f6}'+
    '.fi-tbl tr:hover td{background:#f6faff}'+
    '.fi-lto{display:inline-block;margin-left:6px;background:#F26B21;color:#fff;font:700 10px system-ui;border-radius:4px;padding:1px 5px}'+
    '.fi-pill{font:700 11px system-ui;border-radius:6px;padding:2px 9px}'+
    '.fi-pill.ok{background:#e3f0e8;color:#1E7D46}.fi-pill.low{background:#F2C200;color:#3a2e00}.fi-pill.out{background:#C0392B;color:#fff}'+
    '.fi-empty{padding:22px;text-align:center;color:#6E7C8A}';
    document.head.appendChild(s);
  }
})();
