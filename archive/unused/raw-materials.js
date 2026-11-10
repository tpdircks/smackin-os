/*INVRM*/
/* Smackin OS — Inventory browser: Raw Materials + Finished Bags.
   Self-contained IIFE. Does NOT touch app.js. Reads DB.items()/DB.onHand() live.
   - Two areas: Raw Materials (seeds, seasoning, film, packaging & supplies) and Finished Bags.
   - Instant global search across name/code/flavor, normalizes chile<->chili and punctuation.
   - Shows EVERY item incl. LTO/temp (TMP-) flavors with an LTO badge — nothing hidden.
   - Folds in mis-cased category orphans (SEASONING/SEEDS) via case-insensitive matching.
   - Fixed overlay off #nav + MutationObserver nav item. NO setInterval (scroll-glitch safe). */
(function(){
  if(window.__rmInit) return; window.__rmInit=true;

  // ---------- category maps (all matched case-insensitively) ----------
  var FINISHED = { bag4:'4 oz', bag15:'1.5 oz', bag275:'2.75 oz', dollartree275:'2.75 oz (Dollar Tree)' };
  var RAWSUB = {
    seed:'Seeds', seeds:'Seeds',
    seasoning:'Seasoning',
    film4:'Film', film15:'Film', film275:'Film',
    packaging:'Packaging & Supplies', bucket:'Packaging & Supplies', lid:'Packaging & Supplies',
    sticker:'Packaging & Supplies', mastercase:'Packaging & Supplies', display:'Packaging & Supplies',
    supply:'Packaging & Supplies'
  };
  var RAW_ORDER = ['Seeds','Seasoning','Film','Packaging & Supplies'];
  var FB_ORDER  = ['4 oz','1.5 oz','2.75 oz','2.75 oz (Dollar Tree)'];

  function catKey(it){ return (it.category||'').toString().trim().toLowerCase(); }
  function isFinished(it){ return FINISHED.hasOwnProperty(catKey(it)); }
  function fbSize(it){ return FINISHED[catKey(it)]||'Other'; }
  function rawSub(it){ return RAWSUB[catKey(it)] || (isFinished(it)?null:'Other'); }

  function items(){ try{ return (window.DB&&DB.items())||[]; }catch(e){ return []; } }
  function oh(code){ try{ var v=DB.onHand(code); return typeof v==='number'?v:0; }catch(e){ return 0; } }
  function isLTO(it){ return /^TMP/i.test(it.code||''); }
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function norm(s){ return String(s==null?'':s).toLowerCase().replace(/chile/g,'chili').replace(/[^a-z0-9]+/g,' ').trim(); }
  function nfmt(n){ return (n||0).toLocaleString(); }

  // ---------- state ----------
  var S = { area:'raw', q:'', rawSub:'All', fbSize:'All', sortKey:'name', sortDir:1 };

  // ---------- data helpers ----------
  function decorate(list){
    return list.map(function(it){
      return { it:it, code:it.code||'', name:it.name||it.description||'', flavor:it.flavor||'',
               unit:it.unit||'', reorder:(it.reorder!=null?it.reorder:''), supplier:it.supplier||'',
               oh:oh(it.code), lto:isLTO(it), sub:rawSub(it), size:fbSize(it), fin:isFinished(it) };
    });
  }
  function matchQ(r){
    if(!S.q) return true;
    var hay = norm(r.name+' '+r.code+' '+r.flavor+' '+(r.it.category||''));
    return S.q.split(' ').every(function(tok){ return hay.indexOf(tok)>=0; });
  }
  function sortRows(rows){
    var k=S.sortKey, d=S.sortDir;
    return rows.slice().sort(function(a,b){
      var av, bv;
      if(k==='oh'){ av=a.oh; bv=b.oh; return (av-bv)*d; }
      if(k==='reorder'){ av=+a.reorder||0; bv=+b.reorder||0; return (av-bv)*d; }
      av=(a[k]||'').toString().toLowerCase(); bv=(b[k]||'').toString().toLowerCase();
      return av<bv?-1*d:(av>bv?1*d:0);
    });
  }

  // ---------- table render ----------
  function statusPill(r){
    var ro = +r.reorder||0;
    if(r.oh<=0) return '<span class="rm-pill out">OUT</span>';
    if(ro>0 && r.oh<=ro) return '<span class="rm-pill low">LOW</span>';
    return '';
  }
  function tableFor(rows){
    if(!rows.length) return '<div class="rm-empty">No items here.</div>';
    var sk=S.sortKey, sd=S.sortDir;
    function th(key,label,cls){ var arrow = sk===key?(sd>0?' ▲':' ▼'):''; return '<th data-sk="'+key+'" class="'+(cls||'')+'">'+label+arrow+'</th>'; }
    var h='<table class="rm-tbl"><thead><tr>'+
      th('name','Item')+th('code','Code')+th('oh','On hand','n')+th('unit','Unit')+th('reorder','Reorder','n')+th('supplier','Supplier')+
      '</tr></thead><tbody>';
    rows.forEach(function(r){
      var low = (r.oh<=0) || ((+r.reorder||0)>0 && r.oh<=(+r.reorder||0));
      h+='<tr class="'+(r.oh<=0?'z':'')+'">'+
        '<td class="nm"><b>'+esc(r.name)+'</b>'+(r.lto?' <span class="rm-lto">LTO</span>':'')+statusPill(r)+'</td>'+
        '<td class="mono">'+esc(r.code)+'</td>'+
        '<td class="n '+(low?'lowc':'')+'">'+nfmt(r.oh)+'</td>'+
        '<td>'+esc(r.unit)+'</td>'+
        '<td class="n">'+(r.reorder!==''?nfmt(+r.reorder):'—')+'</td>'+
        '<td>'+esc(r.supplier||'—')+'</td>'+
      '</tr>';
    });
    return h+'</tbody></table>';
  }

  function groupBlock(title, rows, count){
    var inStock = rows.filter(function(r){return r.oh>0;}).length;
    return '<div class="rm-grp"><div class="rm-grph"><h3>'+esc(title)+'</h3>'+
      '<span class="rm-cnt">'+rows.length+' item'+(rows.length===1?'':'s')+'</span>'+
      '<span class="rm-cnt sub">'+inStock+' in stock</span></div>'+ tableFor(rows) +'</div>';
  }

  // ---------- main render ----------
  function render(){
    var o=ov(); if(!o) return;
    var all=decorate(items());
    var raw=all.filter(function(r){return !r.fin;});
    var fin=all.filter(function(r){return r.fin;});
    var ltoCount=all.filter(function(r){return r.lto;}).length;

    // chips counts
    function rawCount(sub){ return raw.filter(function(r){return sub==='All'||r.sub===sub;}).length; }
    function fbCount(sz){ return fin.filter(function(r){return sz==='All'||r.size===sz;}).length; }

    var asof = window.SLC_ASOF ? ' · SLC as of '+window.SLC_ASOF : '';
    var head =
      '<div class="rm-hd"><div><h2>Inventory</h2>'+
      '<p>Everything in the warehouse — raw materials and finished bags. Nothing hidden, LTO flavors included.'+asof+'</p></div>'+
      '<div class="rm-kpis">'+
        '<div class="rm-kpi"><b>'+all.length+'</b><span>total items</span></div>'+
        '<div class="rm-kpi"><b>'+all.filter(function(r){return r.oh>0;}).length+'</b><span>in stock</span></div>'+
        '<div class="rm-kpi lto"><b>'+ltoCount+'</b><span>LTO flavors</span></div>'+
      '</div></div>';

    var search = '<div class="rm-search"><span class="rm-mag">⚲</span>'+
      '<input id="rm-q" type="text" placeholder="Search anything — flavor, code, ‘thai’, ‘bacon’, ‘film 4oz’…" value="'+esc(S.qraw||'')+'" autocomplete="off">'+
      (S.q?'<button id="rm-clear" class="rm-clear">Clear</button>':'')+'</div>';

    var body='';
    if(S.q){
      // GLOBAL search mode — matches across everything, grouped by area
      var mR=sortRows(raw.filter(matchQ)), mF=sortRows(fin.filter(matchQ));
      var total=mR.length+mF.length;
      body='<div class="rm-resline">'+total+' match'+(total===1?'':'es')+' for “'+esc(S.qraw)+'”</div>';
      if(mR.length) body+=groupBlock('Raw Materials · '+mR.length, mR);
      if(mF.length) body+=groupBlock('Finished Bags · '+mF.length, mF);
      if(!total) body+='<div class="rm-empty">Nothing matches “'+esc(S.qraw)+'”. Try a shorter word.</div>';
    } else if(S.area==='raw'){
      var chips=['All'].concat(RAW_ORDER).map(function(sub){
        return '<button class="rm-chip'+(S.rawSub===sub?' on':'')+'" data-sub="'+esc(sub)+'">'+esc(sub)+' <i>'+rawCount(sub)+'</i></button>';
      }).join('');
      body='<div class="rm-tabs"><button class="rm-tab on" data-area="raw">Raw Materials</button><button class="rm-tab" data-area="fin">Finished Bags</button></div>';
      body+='<div class="rm-chips">'+chips+'</div>';
      RAW_ORDER.forEach(function(sub){
        if(S.rawSub!=='All' && S.rawSub!==sub) return;
        var rows=sortRows(raw.filter(function(r){return r.sub===sub;}));
        if(rows.length) body+=groupBlock(sub, rows);
      });
    } else {
      var chipsF=['All'].concat(FB_ORDER).map(function(sz){
        var c=fbCount(sz); if(c===0 && sz!=='All') return '';
        return '<button class="rm-chip'+(S.fbSize===sz?' on':'')+'" data-size="'+esc(sz)+'">'+esc(sz)+' <i>'+c+'</i></button>';
      }).join('');
      body='<div class="rm-tabs"><button class="rm-tab" data-area="raw">Raw Materials</button><button class="rm-tab on" data-area="fin">Finished Bags</button></div>';
      body+='<div class="rm-chips">'+chipsF+'</div>';
      FB_ORDER.forEach(function(sz){
        if(S.fbSize!=='All' && S.fbSize!==sz) return;
        var rows=sortRows(fin.filter(function(r){return r.size===sz;}));
        if(rows.length) body+=groupBlock(sz, rows);
      });
    }

    o.innerHTML='<div class="rm-wrap">'+head+search+body+'</div>';
    wire(o);
  }

  function wire(o){
    var q=o.querySelector('#rm-q');
    if(q){
      q.oninput=function(){ S.qraw=q.value; S.q=norm(q.value); var pos=q.selectionStart; render(); var n=document.getElementById('rm-q'); if(n){ n.focus(); try{n.setSelectionRange(pos,pos);}catch(e){} } };
      // keep focus if we're in search
      if(S.q){ q.focus(); try{ q.setSelectionRange(q.value.length,q.value.length); }catch(e){} }
    }
    var clr=o.querySelector('#rm-clear'); if(clr) clr.onclick=function(){ S.q=''; S.qraw=''; render(); };
    [].slice.call(o.querySelectorAll('.rm-tab')).forEach(function(b){ b.onclick=function(){ S.area=b.getAttribute('data-area'); render(); }; });
    [].slice.call(o.querySelectorAll('.rm-chip')).forEach(function(b){ b.onclick=function(){
      if(b.hasAttribute('data-sub')) S.rawSub=b.getAttribute('data-sub');
      if(b.hasAttribute('data-size')) S.fbSize=b.getAttribute('data-size');
      render(); }; });
    [].slice.call(o.querySelectorAll('.rm-tbl th')).forEach(function(th){ th.onclick=function(){
      var k=th.getAttribute('data-sk'); if(!k) return;
      if(S.sortKey===k) S.sortDir=-S.sortDir; else { S.sortKey=k; S.sortDir=(k==='oh'||k==='reorder')?-1:1; }
      render(); }; });
  }

  // ---------- overlay plumbing (mirrors Time Off) ----------
  function ov(){ if(!document.getElementById('view'))return null; var o=document.getElementById('rm-overlay'); if(!o){ o=document.createElement('div'); o.id='rm-overlay'; o.style.display='none'; document.body.appendChild(o); } return o; }
  function place(o){ var nav=document.getElementById('nav'); var r=nav?nav.getBoundingClientRect():{right:220,top:64}; o.style.left=r.right+'px'; o.style.top=r.top+'px'; }
  function show(){ var o=ov(); if(!o)return; window.__rmActive=true; place(o); o.style.display='block'; render(); }
  function hide(){ var o=document.getElementById('rm-overlay'); window.__rmActive=false; if(o)o.style.display='none'; }
  window.__rmShow=show; window.__rmHide=hide;

  css();
  function ensureNav(){
    var nav=document.getElementById('nav'); if(!nav) return; if(document.getElementById('rm-nav-item')) return;
    var b=document.createElement('button'); b.id='rm-nav-item'; b.className='navitem';
    b.innerHTML='<i data-lucide="boxes"></i><span>Raw Materials</span>';
    b.onclick=function(){ [].slice.call(nav.querySelectorAll('.navitem')).forEach(function(n){n.classList.remove('active');}); b.classList.add('active'); show(); };
    // place it under the INVENTORY group, before "Finished Bags" if present, else after Overview
    var navitems=[].slice.call(nav.querySelectorAll('.navitem'));
    var fb=navitems.filter(function(n){return /finished bags/i.test(n.textContent);})[0];
    var ov0=navitems.filter(function(n){return /overview/i.test(n.textContent);})[0];
    if(fb && fb.parentNode){ fb.parentNode.insertBefore(b, fb); }
    else if(ov0 && ov0.parentNode){ ov0.parentNode.insertBefore(b, ov0.nextSibling); }
    else { nav.appendChild(b); }
    try{ if(window.lucide&&window.lucide.createIcons) window.lucide.createIcons(); }catch(e){}
  }

  if(!window.__rmNavHook){ document.addEventListener('click',function(e){ var it=e.target.closest?e.target.closest('.navitem'):null; if(it&&it.id!=='rm-nav-item') hide(); },true); window.__rmNavHook=true; }
  window.addEventListener('resize',function(){ if(window.__rmActive) place(ov()); });

  if(typeof window.UI_go==='function' && !window.UI_go.__rmWrapped){ var orig=window.UI_go; var w=function(){ var r=orig.apply(this,arguments); try{ensureNav();}catch(e){} return r; }; w.__rmWrapped=true; window.UI_go=w; }
  var navEl=document.getElementById('nav');
  if(navEl && !window.__rmObs){ window.__rmObs=new MutationObserver(function(){ if(!document.getElementById('rm-nav-item')){ var st=navEl.scrollTop; ensureNav(); navEl.scrollTop=st; } }); window.__rmObs.observe(navEl,{childList:true,subtree:true}); }
  ensureNav();

  function css(){ if(document.getElementById('rm-css'))return; var s=document.createElement('style'); s.id='rm-css';
    s.textContent=
    '#rm-overlay{position:fixed;right:0;bottom:0;background:#f4f7fa;overflow:auto;z-index:50;padding:22px 26px}'+
    '.rm-wrap{max-width:1150px}'+
    '.rm-hd{display:flex;align-items:flex-start;gap:18px;justify-content:space-between;margin-bottom:14px}'+
    '.rm-hd h2{margin:0;font:800 26px system-ui;color:#04223B}'+
    '.rm-hd p{margin:4px 0 0;font:14px system-ui;color:#6E7C8A;max-width:560px}'+
    '.rm-kpis{display:flex;gap:10px}'+
    '.rm-kpi{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:8px 14px;text-align:center;min-width:76px}'+
    '.rm-kpi b{display:block;font:800 20px system-ui;color:#006DB6}'+
    '.rm-kpi span{font:11px system-ui;color:#6E7C8A}'+
    '.rm-kpi.lto b{color:#F26B21}'+
    '.rm-search{position:relative;margin:6px 0 14px}'+
    '.rm-search .rm-mag{position:absolute;left:14px;top:50%;transform:translateY(-50%) rotate(45deg);color:#9aa7b4;font-size:16px}'+
    '#rm-q{width:100%;box-sizing:border-box;padding:13px 14px 13px 40px;border:2px solid #cfdae6;border-radius:12px;font:600 15px system-ui;color:#04223B;background:#fff;outline:none}'+
    '#rm-q:focus{border-color:#006DB6;box-shadow:0 0 0 3px rgba(0,109,182,.12)}'+
    '.rm-clear{position:absolute;right:10px;top:50%;transform:translateY(-50%);border:1px solid #cfdae6;background:#eef4fa;border-radius:8px;padding:5px 10px;font:600 12px system-ui;color:#006DB6;cursor:pointer}'+
    '.rm-resline{font:600 13px system-ui;color:#6E7C8A;margin:2px 0 10px}'+
    '.rm-tabs{display:flex;gap:8px;margin-bottom:12px}'+
    '.rm-tab{border:1px solid #cfdae6;background:#fff;border-radius:10px;padding:9px 16px;font:700 14px system-ui;color:#5a6b7a;cursor:pointer}'+
    '.rm-tab.on{background:#04223B;color:#fff;border-color:#04223B}'+
    '.rm-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}'+
    '.rm-chip{border:1px solid #dbe3ec;background:#fff;border-radius:999px;padding:6px 12px;font:600 13px system-ui;color:#40525f;cursor:pointer;display:flex;align-items:center;gap:6px}'+
    '.rm-chip i{font-style:normal;background:#eef2f6;border-radius:999px;padding:1px 7px;font:700 11px system-ui;color:#6E7C8A}'+
    '.rm-chip.on{background:#006DB6;border-color:#006DB6;color:#fff}'+
    '.rm-chip.on i{background:rgba(255,255,255,.25);color:#fff}'+
    '.rm-grp{background:#fff;border:1px solid #dbe3ec;border-radius:14px;margin-bottom:16px;overflow:hidden}'+
    '.rm-grph{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#04223B}'+
    '.rm-grph h3{margin:0;font:800 16px system-ui;color:#fff}'+
    '.rm-cnt{font:600 12px system-ui;color:#9fc4e2;background:rgba(255,255,255,.08);border-radius:999px;padding:2px 10px}'+
    '.rm-cnt.sub{color:#fff;background:rgba(242,107,33,.9)}'+
    '.rm-tbl{width:100%;border-collapse:collapse;font:14px system-ui}'+
    '.rm-tbl th{position:sticky;top:0;text-align:left;background:#eef3f8;color:#04223B;font:700 12px system-ui;letter-spacing:.02em;padding:9px 14px;border-bottom:1px solid #dbe3ec;cursor:pointer;user-select:none;white-space:nowrap}'+
    '.rm-tbl th.n{text-align:right}'+
    '.rm-tbl td{padding:9px 14px;border-bottom:1px solid #eef2f6;color:#243642;vertical-align:middle}'+
    '.rm-tbl td.n{text-align:right;font-variant-numeric:tabular-nums}'+
    '.rm-tbl td.mono{font:12px ui-monospace,Menlo,monospace;color:#6E7C8A}'+
    '.rm-tbl td.nm b{color:#04223B}'+
    '.rm-tbl tr.z td{background:#fff7f6}'+
    '.rm-tbl td.n.lowc{color:#C0392B;font-weight:700}'+
    '.rm-tbl tr:hover td{background:#f6faff}'+
    '.rm-lto{display:inline-block;margin-left:7px;background:#F26B21;color:#fff;font:700 10px system-ui;border-radius:4px;padding:1px 5px;vertical-align:middle}'+
    '.rm-pill{display:inline-block;margin-left:7px;font:700 10px system-ui;border-radius:4px;padding:1px 6px;vertical-align:middle}'+
    '.rm-pill.out{background:#C0392B;color:#fff}.rm-pill.low{background:#F2C200;color:#3a2e00}'+
    '.rm-empty{padding:22px;color:#6E7C8A;font:14px system-ui;text-align:center}';
    document.head.appendChild(s);
  }
})();
