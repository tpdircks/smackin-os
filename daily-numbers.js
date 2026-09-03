/*DAILYNUM*/
/* Smackin OS — Daily Numbers (renames + supersedes the old "Daily Metrics").
   Every department's daily output in one place, gathered over time:
     Manufacturing  — bags produced (P-Mac counter delta) + cases (production_pallets)
     Fulfillment    — E-Com labels + Amazon bags (DB.fulfillmentDaily)
     Shipping       — shipments out (shipping_log)
     Receiving      — receipts in (receiving_log)
     Quality        — checks logged (quality records; 0 until logging grows)
   Today tiles + a stacked bag-throughput trend + a 30-day history table.
   Renames the "Daily Metrics" nav item to "Daily Numbers" and overlays off #nav.
   NO setInterval (scroll-glitch safe). Reads only — no writes. */
(function(){
  if(window.__dnInit) return; window.__dnInit=true;
  var SB='https://otwjxqhhwljwfyqbfuxz.supabase.co/rest/v1/';
  var KEY='sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY';
  var NAVY='#04223B', BLUE='#006DB6', ORANGE='#F26B21', GREEN='#1E7D46', MUTE='#6E7C8A';

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function nf(n){ return (Math.round(n)||0).toLocaleString(); }
  function ymd(d){ return String(d||'').slice(0,10); }
  function daysAgo(n){ var d=new Date(); d.setDate(d.getDate()-n); return d.toISOString().slice(0,10); }
  function todayStr(){ return new Date().toISOString().slice(0,10); }
  function shortDate(s){ var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(!m) return s; var M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return M[+m[2]-1]+' '+(+m[3]); }
  function get(p){ return fetch(SB+p,{headers:{apikey:KEY,Authorization:'Bearer '+KEY},cache:'no-store'}).then(function(r){return r.ok?r.json():[];}).catch(function(){return[];}); }

  var CACHE=null;
  function load(){
    if(CACHE) return Promise.resolve(CACHE);
    // fulfillment is a sync DB cache; the rest are REST
    var ecom={}, amazon={};
    try{ (DB.fulfillmentDaily()||[]).forEach(function(x){ var d=ymd(x.fdate); if(!d)return; ecom[d]=(ecom[d]||0)+(+x.ecom_total||0); amazon[d]=(amazon[d]||0)+(+x.amazon_bags||0); }); }catch(e){}
    return Promise.all([
      get('production_days?select=prod_date,counter_start,counter_end,channel'),
      get('production_pallets?select=prod_date,cases'),
      get('shipping_log?select=ship_date'),
      get('receiving_log?select=recv_date'),
      get('quality_records?select=created_at').catch(function(){return[];})
    ]).then(function(a){
      var mfg={}, cases={}, ship={}, recv={}, qual={};
      (a[0]||[]).forEach(function(x){ if(x.channel&&!/retail/i.test(x.channel))return; var d=ymd(x.prod_date); if(!d)return; mfg[d]=(mfg[d]||0)+Math.max(0,(+x.counter_end||0)-(+x.counter_start||0)); });
      (a[1]||[]).forEach(function(x){ var d=ymd(x.prod_date); if(!d)return; cases[d]=(cases[d]||0)+(+x.cases||0); });
      (a[2]||[]).forEach(function(x){ var d=ymd(x.ship_date); if(!d)return; ship[d]=(ship[d]||0)+1; });
      (a[3]||[]).forEach(function(x){ var d=ymd(x.recv_date); if(!d)return; recv[d]=(recv[d]||0)+1; });
      (a[4]||[]).forEach(function(x){ var d=ymd(x.created_at); if(!d)return; qual[d]=(qual[d]||0)+1; });
      var dates={}; [mfg,cases,ecom,amazon,ship,recv,qual].forEach(function(o){Object.keys(o).forEach(function(d){dates[d]=1;});});
      var merged={}; Object.keys(dates).forEach(function(d){ merged[d]={mfg:mfg[d]||0,cases:cases[d]||0,ecom:ecom[d]||0,amazon:amazon[d]||0,ship:ship[d]||0,recv:recv[d]||0,qual:qual[d]||0}; });
      CACHE=merged; return merged;
    });
  }

  function sum(m,from,f){ var t=0; Object.keys(m).forEach(function(d){ if(!from||d>=from) t+=f(m[d]); }); return t; }
  function tile(icon,dept,rows){
    var vals=rows.map(function(r){return '<div class="dn-v"><b>'+nf(r[1])+'</b><span>'+esc(r[0])+'</span></div>';}).join('');
    return '<div class="dn-tile"><div class="dn-th">'+icon+' '+esc(dept)+'</div><div class="dn-vals">'+vals+'</div></div>';
  }

  function chart(m){
    var dates=Object.keys(m).filter(function(d){return (m[d].mfg+m[d].ecom+m[d].amazon)>0;}).sort().slice(-20);
    if(!dates.length) return '<div class="dn-empty">No output logged yet.</div>';
    var max=1; dates.forEach(function(d){ max=Math.max(max, m[d].mfg+m[d].ecom+m[d].amazon); });
    var W=880,H=250,padL=48,padB=42,padT=12,padR=8, plotW=W-padL-padR, plotH=H-padT-padB;
    var n=dates.length, step=plotW/n, bw=Math.max(6,Math.min(22,step*0.6));
    var bars='',labels='';
    dates.forEach(function(d,i){ var cx=padL+step*i+step/2, x=cx-bw/2, yb=padT+plotH, seg=[['mfg',NAVY],['ecom',ORANGE],['amazon',BLUE]];
      seg.forEach(function(s){ var v=m[d][s[0]]; if(v<=0)return; var hh=plotH*(v/max); yb-=hh; bars+='<rect x="'+x.toFixed(1)+'" y="'+yb.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+hh.toFixed(1)+'" fill="'+s[1]+'"><title>'+s[0]+' '+shortDate(d)+': '+nf(v)+'</title></rect>'; });
      if(n<=14||i%2===0) labels+='<text x="'+cx.toFixed(1)+'" y="'+(H-padB+16)+'" text-anchor="middle" font-size="10" fill="'+MUTE+'">'+shortDate(d)+'</text>';
    });
    var grid=''; for(var g=0;g<=2;g++){ var yv=max*g/2, y=padT+plotH-plotH*(g/2); grid+='<line x1="'+padL+'" y1="'+y.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+y.toFixed(1)+'" stroke="#eef2f6"/><text x="'+(padL-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+MUTE+'">'+nf(yv)+'</text>'; }
    return '<svg viewBox="0 0 '+W+' '+H+'" class="dn-svg" preserveAspectRatio="xMidYMid meet">'+grid+bars+labels+'</svg>';
  }

  function table(m){
    var dates=Object.keys(m).sort().reverse().slice(0,30);
    var rows=dates.map(function(d){ var x=m[d]; function c(v){return '<td class="n">'+(v>0?nf(v):'<s>—</s>')+'</td>';}
      return '<tr><td>'+esc(shortDate(d))+' '+d.slice(0,4)+'</td>'+c(x.mfg)+c(x.cases)+c(x.ecom)+c(x.amazon)+c(x.ship)+c(x.recv)+c(x.qual)+'</tr>'; }).join('');
    return '<table class="dn-tbl"><thead><tr><th>Date</th><th class="n">MFG Bags</th><th class="n">Cases</th><th class="n">E-Com</th><th class="n">Amazon</th><th class="n">Ship</th><th class="n">Recv</th><th class="n">Quality</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }

  function render(m){
    var o=ov(); if(!o)return;
    var td=todayStr(); var t=m[td]||{mfg:0,cases:0,ecom:0,amazon:0,ship:0,recv:0,qual:0};
    var wkBags=sum(m,daysAgo(7),function(r){return r.mfg+r.ecom+r.amazon;});
    var moBags=sum(m,daysAgo(30),function(r){return r.mfg+r.ecom+r.amazon;});
    var head='<div class="dn-hd"><div><h2>Daily Numbers</h2><p>Every department’s daily output in one place — pulled automatically from each team’s own entries, archived over time. Trend shows total bag throughput (Manufacturing + E-Com + Amazon).</p></div><button id="dn-ref" class="dn-refb">↻ Refresh</button></div>';
    var tiles='<div class="dn-tiles">'+
      tile('🏭','Manufacturing',[['Bags produced',t.mfg],['Cases',t.cases]])+
      tile('📦','Fulfillment',[['E-Com labels',t.ecom],['Amazon bags',t.amazon]])+
      tile('🚚','Shipping',[['Shipments out',t.ship]])+
      tile('📥','Receiving',[['Receipts in',t.recv]])+
      tile('🧪','Quality',[['Checks logged',t.qual]])+
      '</div>';
    var kpis='<div class="dn-kpis"><div class="dn-kpi"><b>'+nf(wkBags)+'</b><span>bags this week</span></div><div class="dn-kpi"><b>'+nf(moBags)+'</b><span>bags this month</span></div></div>';
    var legend='<div class="dn-legend"><span><i style="background:'+NAVY+'"></i>Manufacturing</span><span><i style="background:'+ORANGE+'"></i>E-Com</span><span><i style="background:'+BLUE+'"></i>Amazon</span></div>';
    o.innerHTML='<div class="dn-wrap">'+head+tiles+kpis+'<div class="dn-panel">'+legend+chart(m)+'</div><h3 class="dn-h3">Daily history</h3>'+table(m)+'</div>';
    var rb=o.querySelector('#dn-ref'); if(rb) rb.onclick=function(){ CACHE=null; load().then(render); };
  }

  // ---- overlay ----
  function ov(){ if(!document.getElementById('view'))return null; var o=document.getElementById('dn-overlay'); if(!o){o=document.createElement('div');o.id='dn-overlay';o.style.display='none';document.body.appendChild(o);} return o; }
  function place(o){ var nav=document.getElementById('nav'); var r=nav?nav.getBoundingClientRect():{right:220,top:64}; o.style.left=r.right+'px'; o.style.top=r.top+'px'; }
  function show(){ var o=ov(); if(!o)return; window.__dnActive=true; place(o); o.style.display='block'; o.innerHTML='<div class="dn-wrap"><div class="dn-hd"><div><h2>Daily Numbers</h2><p>Loading…</p></div></div></div>'; load().then(render); }
  function hide(){ var o=document.getElementById('dn-overlay'); window.__dnActive=false; if(o)o.style.display='none'; }
  window.__dnShow=show; window.__dnHide=hide;

  // ---- hook + relabel the "Daily Metrics" nav item ----
  function isMine(it){ return it && /daily metrics|daily numbers/i.test(it.textContent||''); }
  function relabel(){
    var nav=document.getElementById('nav'); if(!nav) return;
    [].slice.call(nav.querySelectorAll('.navitem')).forEach(function(n){
      if(/daily metrics/i.test(n.textContent)){ var sp=n.querySelector('span'); if(sp && /daily metrics/i.test(sp.textContent)) sp.textContent='Daily Numbers'; }
    });
  }
  if(!window.__dnNavHook){
    document.addEventListener('click',function(e){ var it=e.target.closest?e.target.closest('.navitem'):null; if(!it)return;
      if(isMine(it)){ setTimeout(show,0); } else { hide(); } },true);
    window.__dnNavHook=true;
  }
  var navEl=document.getElementById('nav');
  if(navEl && !window.__dnObs){ window.__dnObs=new MutationObserver(function(){ var st=navEl.scrollTop; relabel(); navEl.scrollTop=st; }); window.__dnObs.observe(navEl,{childList:true,subtree:true}); }
  relabel();
  window.addEventListener('resize',function(){ if(window.__dnActive) place(ov()); });

  css();
  function css(){ if(document.getElementById('dn-css'))return; var s=document.createElement('style'); s.id='dn-css';
    s.textContent=
    '#dn-overlay{position:fixed;right:0;bottom:0;background:#f4f7fa;overflow:auto;z-index:50;padding:22px 26px}'+
    '.dn-wrap{max-width:960px}'+
    '.dn-hd{display:flex;align-items:flex-start;gap:16px;justify-content:space-between;margin-bottom:14px}'+
    '.dn-hd h2{margin:0;font:800 26px system-ui;color:#04223B}'+
    '.dn-hd p{margin:4px 0 0;font:13px system-ui;color:#6E7C8A;max-width:640px}'+
    '.dn-refb{border:1px solid #cfe0ef;background:#f4f9ff;color:#006DB6;font:600 12px system-ui;border-radius:8px;padding:6px 11px;cursor:pointer;white-space:nowrap}'+
    '.dn-tiles{display:flex;gap:12px;margin-bottom:14px;flex-wrap:wrap}'+
    '.dn-tile{flex:1;min-width:150px;background:#fff;border:1px solid #dbe3ec;border-radius:14px;padding:12px 14px}'+
    '.dn-th{font:700 12px system-ui;color:#04223B;margin-bottom:8px}'+
    '.dn-vals{display:flex;gap:16px}'+
    '.dn-v b{display:block;font:800 22px system-ui;color:#006DB6;line-height:1}'+
    '.dn-v span{font:11px system-ui;color:#6E7C8A}'+
    '.dn-kpis{display:flex;gap:12px;margin-bottom:16px}'+
    '.dn-kpi{background:#04223B;color:#fff;border-radius:12px;padding:8px 16px;min-width:130px}'+
    '.dn-kpi b{display:block;font:800 22px system-ui}.dn-kpi span{font:11px system-ui;color:#cfe0ef}'+
    '.dn-panel{background:#fff;border:1px solid #dbe3ec;border-radius:14px;padding:14px 16px 8px;margin-bottom:20px}'+
    '.dn-legend{display:flex;gap:16px;font:600 12px system-ui;color:#40525f;margin-bottom:6px}'+
    '.dn-legend span{display:flex;align-items:center;gap:6px}.dn-legend i{width:11px;height:11px;border-radius:3px;display:inline-block}'+
    '.dn-svg{width:100%;height:auto;display:block}'+
    '.dn-h3{font:800 16px system-ui;color:#04223B;margin:0 0 8px}'+
    '.dn-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden;font:13px system-ui}'+
    '.dn-tbl th{position:sticky;top:0;text-align:left;background:#eef3f8;color:#04223B;font:700 11px system-ui;padding:8px 12px;border-bottom:1px solid #dbe3ec;white-space:nowrap}'+
    '.dn-tbl th.n{text-align:right}'+
    '.dn-tbl td{padding:8px 12px;border-bottom:1px solid #eef2f6;color:#243642}'+
    '.dn-tbl td.n{text-align:right;font-variant-numeric:tabular-nums}'+
    '.dn-tbl td.n s{color:#c3ccd6;text-decoration:none}'+
    '.dn-tbl tr:hover td{background:#f6faff}'+
    '.dn-empty{padding:26px;text-align:center;color:#94a2b0;font:13px system-ui}';
    document.head.appendChild(s);
  }
})();
