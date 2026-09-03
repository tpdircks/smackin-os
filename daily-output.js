/*DAILYOUT*/
/* Smackin OS — Daily Output over time (Fulfillment), split E-Commerce vs Retail.
   Adds a "Daily Output" nav item after "Daily Fulfillment" and shows a trend view:
     - KPI cards (this week / this month / all-time), each split E-Com vs Retail
     - inline SVG grouped-bar trend (last 20 days, no chart library)
     - recent-days table (Date | E-Com | Retail | Total)
   Data sources (both already entered daily):
     - E-Commerce : DB.fulfillmentDaily()  ->  ecom_total + amazon_bags  per fdate
     - Retail     : production_days (channel=retail)  ->  counter_end - counter_start  per prod_date
   Overlay off #nav. NO setInterval (scroll-glitch safe). */
(function(){
  if(window.__doInit) return; window.__doInit=true;

  var SB_URL='https://otwjxqhhwljwfyqbfuxz.supabase.co/rest/v1/';
  var SB_KEY='sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY';
  var NAVY='#04223B', BLUE='#006DB6', ORANGE='#F26B21', MUTE='#6E7C8A';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function nf(n){ return (Math.round(n)||0).toLocaleString(); }
  function ymd(d){ return String(d||'').slice(0,10); }
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function daysAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }
  function shortDate(s){ var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(!m) return s; var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return MON[+m[2]-1]+' '+(+m[3]); }

  var CACHE=null; // merged {date:{ecom,retail}}

  function ecomRows(){
    try{ var r=DB.fulfillmentDaily&&DB.fulfillmentDaily(); if(!Array.isArray(r)) return {};
      var out={}; r.forEach(function(x){ var d=ymd(x.fdate); if(!d) return; var v=(+x.ecom_total||0)+(+x.amazon_bags||0); out[d]=(out[d]||0)+v; }); return out;
    }catch(e){ return {}; }
  }
  function fetchRetail(){
    return fetch(SB_URL+'production_days?select=prod_date,counter_start,counter_end,channel',{headers:{apikey:SB_KEY,Authorization:'Bearer '+SB_KEY},cache:'no-store'})
      .then(function(r){return r.json();})
      .then(function(rows){ var out={}; (rows||[]).forEach(function(x){ if(x.channel&&!/retail/i.test(x.channel)) return; var d=ymd(x.prod_date); if(!d) return; var v=Math.max(0,(+x.counter_end||0)-(+x.counter_start||0)); out[d]=(out[d]||0)+v; }); return out; })
      .catch(function(){ return {}; });
  }
  function load(){
    if(CACHE) return Promise.resolve(CACHE);
    var ec=ecomRows();
    return fetchRetail().then(function(rt){
      var dates={}; Object.keys(ec).forEach(function(d){dates[d]=1;}); Object.keys(rt).forEach(function(d){dates[d]=1;});
      var merged={}; Object.keys(dates).forEach(function(d){ merged[d]={ecom:ec[d]||0, retail:rt[d]||0}; });
      CACHE=merged; return merged;
    });
  }

  function sumRange(m, fromDate){
    var e=0,r=0; Object.keys(m).forEach(function(d){ if(!fromDate||d>=fromDate){ e+=m[d].ecom; r+=m[d].retail; } }); return {ecom:e, retail:r, total:e+r};
  }

  function card(title, s, big){
    return '<div class="do-card"><div class="do-ct">'+esc(title)+'</div>'+
      '<div class="do-cb">'+nf(s.total)+'</div>'+
      '<div class="do-split"><span class="do-ec">E-Com '+nf(s.ecom)+'</span><span class="do-rt">Retail '+nf(s.retail)+'</span></div></div>';
  }

  function chart(m){
    var dates=Object.keys(m).filter(function(d){return m[d].ecom>0||m[d].retail>0;}).sort();
    dates=dates.slice(-20);
    if(!dates.length) return '<div class="do-empty">No output logged yet.</div>';
    var max=1; dates.forEach(function(d){ max=Math.max(max, m[d].ecom, m[d].retail); });
    var W=860, H=240, padL=44, padB=42, padT=12, padR=8;
    var plotW=W-padL-padR, plotH=H-padT-padB;
    var n=dates.length, group=plotW/n, bw=Math.max(4, Math.min(16, group/2.6));
    var bars='', labels='';
    dates.forEach(function(d,i){
      var cx=padL + group*i + group/2;
      var he=plotH*(m[d].ecom/max), hr=plotH*(m[d].retail/max);
      bars+='<rect x="'+(cx-bw-1).toFixed(1)+'" y="'+(padT+plotH-he).toFixed(1)+'" width="'+bw+'" height="'+he.toFixed(1)+'" fill="'+ORANGE+'" rx="1.5"><title>E-Com '+shortDate(d)+': '+nf(m[d].ecom)+'</title></rect>';
      bars+='<rect x="'+(cx+1).toFixed(1)+'" y="'+(padT+plotH-hr).toFixed(1)+'" width="'+bw+'" height="'+hr.toFixed(1)+'" fill="'+BLUE+'" rx="1.5"><title>Retail '+shortDate(d)+': '+nf(m[d].retail)+'</title></rect>';
      if(n<=14 || i%2===0) labels+='<text x="'+cx.toFixed(1)+'" y="'+(H-padB+16)+'" text-anchor="middle" font-size="10" fill="'+MUTE+'">'+shortDate(d)+'</text>';
    });
    // y gridlines
    var grid=''; for(var g=0;g<=2;g++){ var yv=max*g/2, y=padT+plotH-plotH*(g/2); grid+='<line x1="'+padL+'" y1="'+y.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+y.toFixed(1)+'" stroke="#eef2f6"/><text x="'+(padL-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+MUTE+'">'+nf(yv)+'</text>'; }
    return '<svg viewBox="0 0 '+W+' '+H+'" class="do-svg" preserveAspectRatio="xMidYMid meet">'+grid+bars+labels+'</svg>';
  }

  function table(m){
    var dates=Object.keys(m).sort().reverse().slice(0,20);
    var rows=dates.map(function(d){ var x=m[d]; return '<tr><td>'+esc(shortDate(d))+' '+d.slice(0,4)+'</td><td class="n">'+(x.ecom?nf(x.ecom):'<s>—</s>')+'</td><td class="n">'+(x.retail?nf(x.retail):'<s>—</s>')+'</td><td class="n tot">'+nf(x.ecom+x.retail)+'</td></tr>'; }).join('');
    return '<table class="do-tbl"><thead><tr><th>Date</th><th class="n">E-Commerce</th><th class="n">Retail</th><th class="n">Total</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }

  function render(m){
    var o=ov(); if(!o) return;
    var wk=sumRange(m, daysAgo(7)), mo=sumRange(m, daysAgo(30)), all=sumRange(m, null);
    var head='<div class="do-hd"><div><h2>Daily Output</h2><p>Bags out the door each day — E-Commerce (labels + Amazon) and Retail (production count) — from the daily reports the team files. Last 20 days shown.</p></div>'+
      '<button id="do-refresh" class="do-ref">↻ Refresh</button></div>';
    var cards='<div class="do-cards">'+card('This week (7d)',wk)+card('This month (30d)',mo)+card('All-time',all)+'</div>';
    var legend='<div class="do-legend"><span><i class="do-sw" style="background:'+ORANGE+'"></i>E-Commerce</span><span><i class="do-sw" style="background:'+BLUE+'"></i>Retail</span></div>';
    o.innerHTML='<div class="do-wrap">'+head+cards+'<div class="do-panel">'+legend+chart(m)+'</div><h3 class="do-h3">Recent days</h3>'+table(m)+'</div>';
    var rb=o.querySelector('#do-refresh'); if(rb) rb.onclick=function(){ CACHE=null; o.querySelector('.do-wrap')&&(o.innerHTML='<div class="do-wrap"><div class="do-hd"><div><h2>Daily Output</h2><p>Loading…</p></div></div></div>'); load().then(render); };
  }

  // ---- overlay ----
  function ov(){ if(!document.getElementById('view'))return null; var o=document.getElementById('do-overlay'); if(!o){ o=document.createElement('div'); o.id='do-overlay'; o.style.display='none'; document.body.appendChild(o); } return o; }
  function place(o){ var nav=document.getElementById('nav'); var r=nav?nav.getBoundingClientRect():{right:220,top:64}; o.style.left=r.right+'px'; o.style.top=r.top+'px'; }
  function show(){ var o=ov(); if(!o)return; window.__doActive=true; place(o); o.style.display='block'; o.innerHTML='<div class="do-wrap"><div class="do-hd"><div><h2>Daily Output</h2><p>Loading…</p></div></div></div>'; load().then(render); }
  function hide(){ var o=document.getElementById('do-overlay'); window.__doActive=false; if(o)o.style.display='none'; }
  window.__doShow=show; window.__doHide=hide;

  // ---- nav item ----
  function makeItem(){
    var it=document.createElement('div'); it.className='navitem'; it.id='do-navitem';
    it.innerHTML='<svg class="lucide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="10" width="3" height="8"/><rect x="12" y="6" width="3" height="12"/><rect x="17" y="13" width="3" height="5"/></svg><span>Daily Output</span>';
    return it;
  }
  function ensureItem(){
    var nav=document.getElementById('nav'); if(!nav) return;
    if(document.getElementById('do-navitem')) return;
    var items=[].slice.call(nav.querySelectorAll('.navitem'));
    var anchor=items.filter(function(n){return /daily fulfillment/i.test(n.textContent);})[0]
            || items.filter(function(n){return /daily production/i.test(n.textContent);})[0];
    var st=nav.scrollTop;
    if(anchor && anchor.parentElement){ anchor.parentElement.insertBefore(makeItem(), anchor.nextSibling); }
    else { nav.appendChild(makeItem()); }
    nav.scrollTop=st;
  }

  function setActive(it){ try{ [].slice.call(document.querySelectorAll('#nav .navitem')).forEach(function(n){n.classList.remove('active');}); it.classList.add('active'); }catch(e){} }
  if(!window.__doNavHook){
    document.addEventListener('click',function(e){
      var it=e.target.closest?e.target.closest('.navitem'):null; if(!it)return;
      if(it.id==='do-navitem'){ e.stopPropagation(); e.preventDefault(); setActive(it); setTimeout(show,0); }
      else { hide(); }
    },true);
    window.__doNavHook=true;
  }
  var navEl=document.getElementById('nav');
  if(navEl && !window.__doObs){ window.__doObs=new MutationObserver(function(){ if(!document.getElementById('do-navitem')){ var st=navEl.scrollTop; ensureItem(); navEl.scrollTop=st; } }); window.__doObs.observe(navEl,{childList:true,subtree:true}); }
  ensureItem();
  window.addEventListener('resize',function(){ if(window.__doActive) place(ov()); });

  css();
  function css(){ if(document.getElementById('do-css'))return; var s=document.createElement('style'); s.id='do-css';
    s.textContent=
    '#do-overlay{position:fixed;right:0;bottom:0;background:#f4f7fa;overflow:auto;z-index:50;padding:22px 26px}'+
    '.do-wrap{max-width:920px}'+
    '.do-hd{display:flex;align-items:flex-start;gap:16px;justify-content:space-between;margin-bottom:14px}'+
    '.do-hd h2{margin:0;font:800 26px system-ui;color:#04223B}'+
    '.do-hd p{margin:4px 0 0;font:13px system-ui;color:#6E7C8A;max-width:600px}'+
    '.do-ref{border:1px solid #cfe0ef;background:#f4f9ff;color:#006DB6;font:600 12px system-ui;border-radius:8px;padding:6px 11px;cursor:pointer;white-space:nowrap}'+
    '.do-cards{display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap}'+
    '.do-card{flex:1;min-width:150px;background:#fff;border:1px solid #dbe3ec;border-radius:14px;padding:12px 16px}'+
    '.do-ct{font:600 12px system-ui;color:#6E7C8A}'+
    '.do-cb{font:800 30px system-ui;color:#04223B;line-height:1.1;margin:2px 0 6px}'+
    '.do-split{display:flex;gap:10px;font:700 11px system-ui}'+
    '.do-ec{color:#F26B21}.do-rt{color:#006DB6}'+
    '.do-panel{background:#fff;border:1px solid #dbe3ec;border-radius:14px;padding:14px 16px 8px;margin-bottom:20px}'+
    '.do-legend{display:flex;gap:16px;font:600 12px system-ui;color:#40525f;margin-bottom:6px}'+
    '.do-legend span{display:flex;align-items:center;gap:6px}'+
    '.do-sw{width:11px;height:11px;border-radius:3px;display:inline-block}'+
    '.do-svg{width:100%;height:auto;display:block}'+
    '.do-h3{font:800 16px system-ui;color:#04223B;margin:0 0 8px}'+
    '.do-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden;font:14px system-ui}'+
    '.do-tbl th{position:sticky;top:0;text-align:left;background:#eef3f8;color:#04223B;font:700 12px system-ui;padding:9px 14px;border-bottom:1px solid #dbe3ec;white-space:nowrap}'+
    '.do-tbl th.n{text-align:right}'+
    '.do-tbl td{padding:9px 14px;border-bottom:1px solid #eef2f6;color:#243642}'+
    '.do-tbl td.n{text-align:right;font-variant-numeric:tabular-nums}'+
    '.do-tbl td.n s{color:#c3ccd6;text-decoration:none}'+
    '.do-tbl td.tot{font-weight:700;color:#04223B}'+
    '.do-tbl tr:hover td{background:#f6faff}'+
    '.do-empty,.do-panel .do-empty{padding:26px;text-align:center;color:#94a2b0;font:13px system-ui}';
    document.head.appendChild(s);
  }
})();
