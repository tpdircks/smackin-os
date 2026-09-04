/*MAINT2*/
/* Smackin OS — Maintenance section.
   Submitting is owned by Maintainly (public "create request" link works perfectly).
   This view shows:
     1) a "Submit a Request" button -> Maintainly create link
     2) an "Open Requests" list AND a "Closed Requests" list
   The lists pull LIVE from Maintainly when window.MAINT_PROXY is set (a Supabase Edge
   Function that holds the API token server-side and returns tasks); until then it shows
   the app's own maintenance records (DB.maintenance()) so it's never empty.
   Maintainly API: GET https://app.maintainly.com/v1/yoqzrzeo/tasks (Bearer token).
   Overlay off #nav (like Time Off / Raw Materials). NO setInterval. */
(function(){
  if(window.__mtInit) return; window.__mtInit=true;

  var MAINTAINLY_CREATE = 'https://app.maintainly.com/yoqzrzeo/requests/create/gzj778k54q';
  var MAINTAINLY_ORG    = 'yoqzrzeo';
  var CLOSED_LIMIT      = 40; // show the most-recent N closed so the list stays readable
  // Set this to the Supabase Edge Function URL once the Maintainly API token is wired.
  window.MAINT_PROXY = window.MAINT_PROXY || '';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function isClosed(s){ return /complete|closed|done|cancel|resolv|finish/i.test(String(s||'')); }
  function localAll(){ try{ return (window.DB&&DB.maintenance&&DB.maintenance())||[]; }catch(e){ return []; } }
  function fmt(d){ if(!d)return ''; var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(String(d)); if(!m)return String(d); var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return MON[+m[2]-1]+' '+ (+m[3]); }
  function prCls(p){ p=String(p||'').toLowerCase(); return p.indexOf('high')>=0||p.indexOf('urgent')>=0||p.indexOf('critical')>=0?'hi':(p.indexOf('low')>=0?'lo':'md'); }

  function loadRequests(){
    if(window.MAINT_PROXY){
      return fetch(window.MAINT_PROXY,{cache:'no-store'}).then(function(r){return r.json();})
        .then(function(rows){ return {src:'maintainly', rows:normalize(rows)}; })
        .catch(function(){ return {src:'error', rows:normalize(localAll())}; });
    }
    return Promise.resolve({src:'local', rows:normalize(localAll())});
  }
  // Accepts a Maintainly tasks payload ({data:[...]} or [...]) OR the app's local rows.
  function normalize(rows){
    if(!rows) return [];
    if(!Array.isArray(rows) && rows.data) rows=rows.data;
    if(!Array.isArray(rows)) return [];
    return rows.map(function(r){
      var assignee = r.assignee || r.assigned_to || '';
      if(!assignee && Array.isArray(r.assignees) && r.assignees.length) assignee = r.assignees.map(function(a){return a.name||a.full_name||a;}).join(', ');
      else if(!assignee && r.assignee && r.assignee.name) assignee = r.assignee.name;
      var url = r.url || r.link || '';
      if(!url && r.id) url = 'https://app.maintainly.com/'+MAINTAINLY_ORG+'/requests/'+r.id;
      return { title:r.title||r.summary||r.name||'(untitled)', problem:r.problem||r.description||'',
               area:r.area||r.site||r.location||(r.asset&&(r.asset.name||r.asset))||'', priority:r.priority||r.severity||'',
               status:r.status||r.state||'Open',
               assignee:assignee, opened_date:r.opened_date||r.created_at||r.created||'', target_date:r.target_date||r.due||r.due_date||r.due_at||'',
               url:url };
    });
  }

  function cardHTML(r){
    var pill='<span class="mt-pill '+prCls(r.priority)+'">'+esc(r.priority||r.status||'Open')+'</span>';
    var meta=[];
    if(r.area) meta.push('<span class="mt-mi">📍 '+esc(r.area)+'</span>');
    if(r.assignee) meta.push('<span class="mt-mi">👤 '+esc(r.assignee)+'</span>');
    if(r.status) meta.push('<span class="mt-mi">'+esc(r.status)+'</span>');
    if(r.opened_date) meta.push('<span class="mt-mi">Opened '+esc(fmt(r.opened_date))+'</span>');
    if(r.target_date) meta.push('<span class="mt-mi due">Target '+esc(fmt(r.target_date))+'</span>');
    var open = r.url? '<a class="mt-open" href="'+esc(r.url)+'" target="_blank" rel="noopener">Open in Maintainly ↗</a>' : '';
    return '<div class="mt-card'+(isClosed(r.status)?' done':'')+'"><div class="mt-ch"><b>'+esc(r.title)+'</b>'+pill+'</div>'+
      (r.problem?'<div class="mt-prob">'+esc(r.problem)+'</div>':'')+
      '<div class="mt-meta">'+meta.join('')+'</div>'+open+'</div>';
  }

  function render(data){
    var o=ov(); if(!o) return;
    var rows=data?data.rows:[]; var src=data?data.src:'local';
    var open=rows.filter(function(r){return !isClosed(r.status);});
    var closed=rows.filter(function(r){return isClosed(r.status);});
    var closedShown=closed.slice(0, CLOSED_LIMIT);
    var srcTxt = src==='maintainly' ? '<span class="mt-src ok">● Live from Maintainly</span>'
      : src==='error' ? '<span class="mt-src warn">● Maintainly unreachable — showing in-app log</span>'
      : '<span class="mt-src">● In-app log · live Maintainly sync pending API token</span>';
    var head =
      '<div class="mt-hd"><div><h2>Maintenance</h2><p>Submit a request to Maintainly and track what’s open and closed — all in one place.</p></div></div>'+
      '<div class="mt-actions">'+
        '<a class="mt-submit" href="'+MAINTAINLY_CREATE+'" target="_blank" rel="noopener">＋ Submit a Request</a>'+
        '<span class="mt-submit-note">Opens Maintainly — no login needed. You’ll get email updates as it progresses.</span>'+
        srcTxt+'<button id="mt-refresh" class="mt-ref">↻ Refresh</button>'+
      '</div>';
    var openList = open.length ? open.map(cardHTML).join('') : '<div class="mt-empty">No open requests right now. 🎉</div>';
    var closedList = closedShown.length ? closedShown.map(cardHTML).join('') : '<div class="mt-empty">No closed requests to show.</div>';
    var closedNote = closed.length>CLOSED_LIMIT ? '<span class="mt-src">showing '+CLOSED_LIMIT+' of '+closed.length+'</span>' : '';
    o.innerHTML='<div class="mt-wrap">'+head+
      '<div class="mt-lh"><h3>Open Requests</h3><span class="mt-cnt">'+open.length+'</span></div>'+
      '<div class="mt-list">'+openList+'</div>'+
      '<div class="mt-lh mt-lh2"><h3>Closed Requests</h3><span class="mt-cnt closed">'+closed.length+'</span>'+closedNote+'</div>'+
      '<div class="mt-list">'+closedList+'</div></div>';
    var rb=o.querySelector('#mt-refresh'); if(rb) rb.onclick=function(){ o.querySelector('.mt-list').innerHTML='<div class="mt-empty">Loading…</div>'; loadRequests().then(render); };
  }

  // ---- overlay plumbing ----
  function ov(){ if(!document.getElementById('view'))return null; var o=document.getElementById('mt-overlay'); if(!o){ o=document.createElement('div'); o.id='mt-overlay'; o.style.display='none'; document.body.appendChild(o); } return o; }
  function place(o){ var nav=document.getElementById('nav'); var r=nav?nav.getBoundingClientRect():{right:220,top:64}; o.style.left=r.right+'px'; o.style.top=r.top+'px'; }
  function show(){ var o=ov(); if(!o)return; window.__mtActive=true; place(o); o.style.display='block'; o.innerHTML='<div class="mt-wrap"><div class="mt-hd"><div><h2>Maintenance</h2><p>Loading…</p></div></div></div>'; loadRequests().then(render); }
  function hide(){ var o=document.getElementById('mt-overlay'); window.__mtActive=false; if(o)o.style.display='none'; }
  window.__mtShow=show; window.__mtHide=hide;

  // hook the EXISTING Maintenance nav item (don't add a new one)
  if(!window.__mtNavHook){
    document.addEventListener('click',function(e){
      var it=e.target.closest?e.target.closest('.navitem'):null; if(!it)return;
      if(/mainten/i.test(it.textContent)){ setTimeout(show,0); }   // overlay on top of app's own render
      else { hide(); }
    },true);
    window.__mtNavHook=true;
  }
  window.addEventListener('resize',function(){ if(window.__mtActive) place(ov()); });

  css();
  function css(){ if(document.getElementById('mt-css'))return; var s=document.createElement('style'); s.id='mt-css';
    s.textContent=
    '#mt-overlay{position:fixed;right:0;bottom:0;background:#f4f7fa;overflow:auto;z-index:50;padding:22px 26px}'+
    '.mt-wrap{max-width:920px}'+
    '.mt-hd h2{margin:0;font:800 26px system-ui;color:#04223B}'+
    '.mt-hd p{margin:4px 0 0;font:14px system-ui;color:#6E7C8A}'+
    '.mt-actions{margin:16px 0 22px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}'+
    '.mt-submit{display:inline-block;background:#F26B21;color:#fff;font:800 15px system-ui;text-decoration:none;padding:12px 20px;border-radius:12px;box-shadow:0 2px 6px rgba(242,107,33,.3)}'+
    '.mt-submit:hover{background:#e05f18}'+
    '.mt-submit-note{font:12px system-ui;color:#6E7C8A;max-width:320px}'+
    '.mt-lh{display:flex;align-items:center;gap:10px;margin-bottom:12px}'+
    '.mt-lh2{margin-top:26px}'+
    '.mt-lh h3{margin:0;font:800 18px system-ui;color:#04223B}'+
    '.mt-cnt{background:#006DB6;color:#fff;font:700 12px system-ui;border-radius:999px;padding:2px 10px}'+
    '.mt-cnt.closed{background:#6E7C8A}'+
    '.mt-src{font:600 12px system-ui;color:#6E7C8A;margin-left:2px}'+
    '.mt-src.ok{color:#1E7D46}.mt-src.warn{color:#B7791F}'+
    '.mt-ref{border:1px solid #cfe0ef;background:#f4f9ff;color:#006DB6;font:600 12px system-ui;border-radius:8px;padding:5px 10px;cursor:pointer}'+
    '.mt-list{display:flex;flex-direction:column;gap:12px}'+
    '.mt-card{background:#fff;border:1px solid #dbe3ec;border-left:4px solid #006DB6;border-radius:12px;padding:14px 16px}'+
    '.mt-card.done{border-left-color:#9aa8b5;opacity:.86}'+
    '.mt-ch{display:flex;align-items:flex-start;gap:10px;justify-content:space-between}'+
    '.mt-ch b{font:700 15px system-ui;color:#04223B}'+
    '.mt-prob{margin-top:6px;font:13px system-ui;color:#5a6b7a}'+
    '.mt-meta{margin-top:10px;display:flex;flex-wrap:wrap;gap:8px}'+
    '.mt-mi{font:600 12px system-ui;color:#40525f;background:#eef3f8;border-radius:999px;padding:3px 10px}'+
    '.mt-mi.due{background:#fff3e6;color:#a85417}'+
    '.mt-pill{font:700 11px system-ui;border-radius:6px;padding:2px 8px;white-space:nowrap}'+
    '.mt-pill.hi{background:#C0392B;color:#fff}.mt-pill.md{background:#F2C200;color:#3a2e00}.mt-pill.lo{background:#e3ebf2;color:#40525f}'+
    '.mt-open{display:inline-block;margin-top:10px;font:600 12px system-ui;color:#006DB6;text-decoration:none}'+
    '.mt-empty{padding:26px;text-align:center;color:#6E7C8A;font:14px system-ui;background:#fff;border:1px dashed #cfdae6;border-radius:12px}';
    document.head.appendChild(s);
  }
})();
