/*ORDNUM*/
/* Smackin OS — Order Numbers hub. The counterpart to Daily Numbers:
   Daily Numbers = what we PRODUCE; Order Numbers = what customers ORDER.
   - YTD channel split (Retail vs E-Commerce: orders / $ / bags) — the long-term record,
     seeded from Troy's "2026 YTD Orders" report (Jan 1 – Sep 2, 2026, pulled Sep 2).
   - Monthly $ trend (SPS retail vs ShipStation e-com), Jan–Aug.
   - Retail-by-customer and e-com-by-source breakdowns.
   - LIVE daily retail orders from the app's orders table (bucketed by ship date).
   Adds an "Order Numbers" nav item after Daily Numbers; overlay off #nav. NO setInterval. */
(function(){
  if(window.__onInit) return; window.__onInit=true;
  var SB='https://otwjxqhhwljwfyqbfuxz.supabase.co/rest/v1/';
  var KEY='sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY';
  var NAVY='#04223B', BLUE='#006DB6', ORANGE='#F26B21', GREEN='#1E7D46', MUTE='#6E7C8A';

  // ---------- baked YTD record (from the report) ----------
  var YTD={
    asof:'Sep 2, 2026',
    retail:{orders:2312, dollars:7.86e6, bags:5.18e6, note:'SPS 2,151 + direct 161'},
    ecom:{orders:147433, dollars:7.49e6, bags:3.25e6, note:'ShipStation 121,108 + TikTok 26,325'},
    total:{orders:149745, dollars:15.34e6, bags:8.43e6}
  };
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];
  var SPS=[928836,1058387,1395364,1064275,1139665,727914,349278,379848];
  var SS=[320681,392296,1083080,927164,1142689,1085103,997276,713510];
  var RETCUST=[['Target',1002,1713816,2605000],['Vistar',72,813924,1312016],['Kroger',16,753792,1073725],['Core-Mark',277,469584,707898],['McLane',187,372672,562735],['KeHE',103,185724,256959],['Scheels',199,105606,211212],['Cooper Booth',14,112824,159192],['Bass Pro',80,95400,143100],['Walmart',null,null,114396]];
  var ECOMSRC=[['ShipStation',121108,6.68e6,2.87e6,'$55 avg order'],['TikTok Shop',26325,0.80e6,0.38e6,'$30 avg order']];

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function nf(n){ return (Math.round(n)||0).toLocaleString(); }
  function money(n){ if(n>=1e6) return '$'+(n/1e6).toFixed(2)+'M'; if(n>=1e3) return '$'+Math.round(n/1e3)+'k'; return '$'+nf(n); }
  function bags(n){ if(n>=1e6) return (n/1e6).toFixed(2)+'M'; return nf(n); }
  function pdate(s){ if(!s) return null; s=String(s).trim(); var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(m) return m[1]+'-'+m[2]+'-'+m[3];
    var d=/^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(s); if(d) return d[3]+'-'+('0'+d[1]).slice(-2)+'-'+('0'+d[2]).slice(-2); return null; }
  function shortDate(s){ var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(!m) return s; var M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return M[+m[2]-1]+' '+(+m[3]); }
  function get(p){ return fetch(SB+p,{headers:{apikey:KEY,Authorization:'Bearer '+KEY},cache:'no-store'}).then(function(r){return r.ok?r.json():[];}).catch(function(){return[];}); }

  var LIVE=null;
  function loadLive(){ if(LIVE) return Promise.resolve(LIVE);
    return get('orders?select=ship_date,created_at,invoice_date,customer,status').then(function(rows){
      var byDay={}; (rows||[]).forEach(function(r){ var d=pdate(r.ship_date)||pdate(r.created_at)||pdate(r.invoice_date); if(!d)return; byDay[d]=(byDay[d]||0)+1; });
      LIVE={byDay:byDay, total:(rows||[]).length}; return LIVE;
    });
  }

  // ---------- render pieces ----------
  function splitCards(){
    function card(cls,label,o){ return '<div class="on-card '+cls+'"><div class="on-cl">'+label+'</div>'+
      '<div class="on-cbig">'+nf(o.orders)+'<span> orders</span></div>'+
      '<div class="on-crow"><b>'+money(o.dollars)+'</b><b>'+bags(o.bags)+' bags</b></div>'+
      (o.note?'<div class="on-cnote">'+esc(o.note)+'</div>':'')+'</div>'; }
    return '<div class="on-cards">'+card('rt','🏬 Retail',YTD.retail)+card('ec','🛒 E-Commerce',YTD.ecom)+card('tot','Σ Total',YTD.total)+'</div>';
  }
  function monthChart(){
    var max=1; for(var i=0;i<MON.length;i++){ max=Math.max(max,SPS[i],SS[i]); }
    var W=880,H=250,padL=52,padB=40,padT=12,padR=8, plotW=W-padL-padR, plotH=H-padT-padB, n=MON.length, step=plotW/n, bw=Math.min(20,step/3);
    var bars='',labels='';
    for(var j=0;j<n;j++){ var cx=padL+step*j+step/2, yb=padT+plotH;
      var hs=plotH*(SPS[j]/max), hp=plotH*(SS[j]/max);
      bars+='<rect x="'+(cx-bw-1).toFixed(1)+'" y="'+(yb-hs).toFixed(1)+'" width="'+bw+'" height="'+hs.toFixed(1)+'" fill="'+NAVY+'"><title>SPS '+MON[j]+': '+money(SPS[j])+'</title></rect>';
      bars+='<rect x="'+(cx+1).toFixed(1)+'" y="'+(yb-hp).toFixed(1)+'" width="'+bw+'" height="'+hp.toFixed(1)+'" fill="'+ORANGE+'"><title>ShipStation '+MON[j]+': '+money(SS[j])+'</title></rect>';
      labels+='<text x="'+cx.toFixed(1)+'" y="'+(H-padB+16)+'" text-anchor="middle" font-size="11" fill="'+MUTE+'">'+MON[j]+'</text>';
    }
    var grid=''; for(var g=0;g<=2;g++){ var yv=max*g/2, y=padT+plotH-plotH*(g/2); grid+='<line x1="'+padL+'" y1="'+y.toFixed(1)+'" x2="'+(W-padR)+'" y2="'+y.toFixed(1)+'" stroke="#eef2f6"/><text x="'+(padL-6)+'" y="'+(y+3).toFixed(1)+'" text-anchor="end" font-size="10" fill="'+MUTE+'">'+money(yv)+'</text>'; }
    return '<svg viewBox="0 0 '+W+' '+H+'" class="on-svg" preserveAspectRatio="xMidYMid meet">'+grid+bars+labels+'</svg>';
  }
  function retailTable(){
    var rows=RETCUST.map(function(r){ return '<tr><td class="b">'+esc(r[0])+'</td><td class="n">'+(r[1]!=null?nf(r[1]):'—')+'</td><td class="n">'+(r[2]!=null?nf(r[2]):'—')+'</td><td class="n tot">'+money(r[3])+'</td></tr>'; }).join('');
    return '<table class="on-tbl"><thead><tr><th>Retail customer</th><th class="n">POs</th><th class="n">Bags</th><th class="n">Dollars</th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function ecomTable(){
    var rows=ECOMSRC.map(function(r){ return '<tr><td class="b">'+esc(r[0])+'</td><td class="n">'+nf(r[1])+'</td><td class="n">'+bags(r[3])+'</td><td class="n tot">'+money(r[2])+'</td><td class="note">'+esc(r[4])+'</td></tr>'; }).join('');
    return '<table class="on-tbl"><thead><tr><th>E-com source</th><th class="n">Orders</th><th class="n">Bags</th><th class="n">Dollars</th><th></th></tr></thead><tbody>'+rows+'</tbody></table>';
  }
  function liveSection(live){
    var days=Object.keys(live.byDay).sort().slice(-20);
    if(!days.length) return '<div class="on-empty">No dated retail orders in the app yet.</div>';
    var max=1; days.forEach(function(d){max=Math.max(max,live.byDay[d]);});
    var W=880,H=170,padL=30,padB=34,padT=10,padR=8, plotW=W-padL-padR, plotH=H-padT-padB, n=days.length, step=plotW/n, bw=Math.max(5,Math.min(20,step*0.6));
    var bars='',labels='';
    days.forEach(function(d,i){ var cx=padL+step*i+step/2, h=plotH*(live.byDay[d]/max);
      bars+='<rect x="'+(cx-bw/2).toFixed(1)+'" y="'+(padT+plotH-h).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+BLUE+'" rx="1.5"><title>'+shortDate(d)+': '+live.byDay[d]+' orders</title></rect>';
      if(n<=12||i%2===0) labels+='<text x="'+cx.toFixed(1)+'" y="'+(H-padB+15)+'" text-anchor="middle" font-size="9" fill="'+MUTE+'">'+shortDate(d)+'</text>';
    });
    return '<svg viewBox="0 0 '+W+' '+H+'" class="on-svg2">'+bars+labels+'</svg>';
  }

  function render(live){
    var o=ov(); if(!o) return;
    var head='<div class="on-hd"><div><h2>Order Numbers</h2><p>What customers order — Retail (SPS EDI + direct POs) vs E-Commerce (ShipStation + TikTok). Year-to-date record from the 2026 Orders report (through '+YTD.asof+'), plus live daily retail orders from the app.</p></div></div>';
    var mtrend='<div class="on-panel"><div class="on-ph">Monthly dollars — SPS retail vs ShipStation e-com <span class="on-lg"><i style="background:'+NAVY+'"></i>SPS<i style="background:'+ORANGE+'"></i>ShipStation</span></div>'+monthChart()+'<div class="on-cap">Jan–Aug. Direct POs and TikTok not shown on the monthly curve (TikTok keeps only 180 days of detail).</div></div>';
    var breaks='<div class="on-two"><div><h3 class="on-h3">Retail by customer (SPS)</h3>'+retailTable()+'</div><div><h3 class="on-h3">E-commerce by source</h3>'+ecomTable()+'</div></div>';
    var liveblk='<div class="on-panel"><div class="on-ph">Live daily retail orders <span class="on-livechip">● from the app · '+nf(live.total)+' orders on file</span></div>'+liveSection(live)+'<div class="on-cap">Retail orders in Smackin OS, counted by ship date (last 20 days shown). E-com daily isn’t stored per-order — see the YTD figures above for volume.</div></div>';
    o.innerHTML='<div class="on-wrap">'+head+splitCards()+mtrend+breaks+liveblk+'</div>';
  }

  // ---------- overlay ----------
  function ov(){ if(!document.getElementById('view'))return null; var o=document.getElementById('on-overlay'); if(!o){o=document.createElement('div');o.id='on-overlay';o.style.display='none';document.body.appendChild(o);} return o; }
  function place(o){ var nav=document.getElementById('nav'); var r=nav?nav.getBoundingClientRect():{right:220,top:64}; o.style.left=r.right+'px'; o.style.top=r.top+'px'; }
  function show(){ var o=ov(); if(!o)return; window.__onActive=true; place(o); o.style.display='block'; o.innerHTML='<div class="on-wrap"><div class="on-hd"><div><h2>Order Numbers</h2><p>Loading…</p></div></div></div>'; loadLive().then(render); }
  function hide(){ var o=document.getElementById('on-overlay'); window.__onActive=false; if(o)o.style.display='none'; }
  window.__onShow=show; window.__onHide=hide;

  // ---------- nav item (after Daily Numbers) ----------
  function makeItem(){ var it=document.createElement('div'); it.className='navitem'; it.id='on-navitem';
    it.innerHTML='<svg class="lucide" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg><span>Order Numbers</span>'; return it; }
  function ensureItem(){ var nav=document.getElementById('nav'); if(!nav) return; if(document.getElementById('on-navitem')) return;
    var items=[].slice.call(nav.querySelectorAll('.navitem'));
    var anchor=items.filter(function(n){return /daily numbers|daily metrics/i.test(n.textContent);})[0] || items.filter(function(n){return /dashboard/i.test(n.textContent);})[0];
    var st=nav.scrollTop;
    if(anchor && anchor.parentElement){ anchor.parentElement.insertBefore(makeItem(), anchor.nextSibling); } else { nav.appendChild(makeItem()); }
    nav.scrollTop=st;
  }
  function setActive(it){ try{ [].slice.call(document.querySelectorAll('#nav .navitem')).forEach(function(n){n.classList.remove('active');}); it.classList.add('active'); }catch(e){} }
  if(!window.__onNavHook){ document.addEventListener('click',function(e){ var it=e.target.closest?e.target.closest('.navitem'):null; if(!it)return;
    if(it.id==='on-navitem'){ e.stopPropagation(); e.preventDefault(); setActive(it); setTimeout(show,0); } else { hide(); } },true); window.__onNavHook=true; }
  var navEl=document.getElementById('nav');
  if(navEl && !window.__onObs){ window.__onObs=new MutationObserver(function(){ if(!document.getElementById('on-navitem')){ var st=navEl.scrollTop; ensureItem(); navEl.scrollTop=st; } }); window.__onObs.observe(navEl,{childList:true,subtree:true}); }
  ensureItem();
  window.addEventListener('resize',function(){ if(window.__onActive) place(ov()); });

  css();
  function css(){ if(document.getElementById('on-css'))return; var s=document.createElement('style'); s.id='on-css';
    s.textContent=
    '#on-overlay{position:fixed;right:0;bottom:0;background:#f4f7fa;overflow:auto;z-index:50;padding:22px 26px}'+
    '.on-wrap{max-width:960px}'+
    '.on-hd h2{margin:0;font:800 26px system-ui;color:#04223B}'+
    '.on-hd p{margin:4px 0 14px;font:13px system-ui;color:#6E7C8A;max-width:660px}'+
    '.on-cards{display:flex;gap:12px;margin-bottom:18px;flex-wrap:wrap}'+
    '.on-card{flex:1;min-width:190px;background:#fff;border:1px solid #dbe3ec;border-radius:14px;padding:14px 16px;border-top:4px solid #cfd8e2}'+
    '.on-card.rt{border-top-color:#04223B}.on-card.ec{border-top-color:#F26B21}.on-card.tot{border-top-color:#006DB6;background:#f6fafd}'+
    '.on-cl{font:700 13px system-ui;color:#04223B}'+
    '.on-cbig{font:800 30px system-ui;color:#04223B;line-height:1.1;margin:4px 0}.on-cbig span{font:700 13px system-ui;color:#6E7C8A}'+
    '.on-crow{display:flex;gap:14px;font:700 14px system-ui;color:#006DB6}'+
    '.on-cnote{font:11px system-ui;color:#6E7C8A;margin-top:4px}'+
    '.on-panel{background:#fff;border:1px solid #dbe3ec;border-radius:14px;padding:14px 16px 10px;margin-bottom:18px}'+
    '.on-ph{font:800 14px system-ui;color:#04223B;display:flex;align-items:center;gap:10px;margin-bottom:8px}'+
    '.on-lg,.on-livechip{margin-left:auto;font:600 11px system-ui;color:#6E7C8A;display:flex;align-items:center;gap:6px}'+
    '.on-lg i{width:10px;height:10px;border-radius:2px;display:inline-block;margin-left:6px}'+
    '.on-livechip{color:#1E7D46}'+
    '.on-svg{width:100%;height:auto;display:block}.on-svg2{width:100%;height:auto;display:block}'+
    '.on-cap{font:11px system-ui;color:#94a2b0;margin-top:4px}'+
    '.on-two{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:18px}.on-two>div{flex:1;min-width:320px}'+
    '.on-h3{font:800 15px system-ui;color:#04223B;margin:0 0 8px}'+
    '.on-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden;font:13px system-ui}'+
    '.on-tbl th{text-align:left;background:#eef3f8;color:#04223B;font:700 11px system-ui;padding:8px 12px;border-bottom:1px solid #dbe3ec;white-space:nowrap}'+
    '.on-tbl th.n{text-align:right}'+
    '.on-tbl td{padding:8px 12px;border-bottom:1px solid #eef2f6;color:#243642}'+
    '.on-tbl td.n{text-align:right;font-variant-numeric:tabular-nums}.on-tbl td.b{font-weight:700;color:#04223B}.on-tbl td.tot{font-weight:700;color:#006DB6}.on-tbl td.note{color:#6E7C8A;font-size:11px}'+
    '.on-empty{padding:20px;text-align:center;color:#94a2b0;font:13px system-ui}';
    document.head.appendChild(s);
  }
})();
