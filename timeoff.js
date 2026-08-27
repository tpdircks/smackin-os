/*TIMEOFF*/
/* Smackin OS — Time Off section. Self-contained IIFE; does NOT touch app.js.
   Reads Supabase tables time_off / time_off_groups / time_off_holidays / time_off_sync
   (credentials from window.SMACKIN_CONFIG at runtime). Renders a fixed overlay off #nav,
   like the Quality (SQF) section. Nav item lives under TEAM & OPS, below People.
   NO setInterval — nav is kept alive by wrapping UI_go + a MutationObserver gated to
   "my item missing" that preserves nav.scrollTop (honors the no-scroll-glitch rule). */
(function(){
  if(window.__toInit) return; window.__toInit=true;
  function cfg(){var c=window.SMACKIN_CONFIG||{};return {url:c.SUPABASE_URL,key:c.SUPABASE_ANON_KEY};}
  function api(p){var c=cfg();if(!c.url)return Promise.reject(new Error('config'));
    return fetch(c.url+'/rest/v1/'+p,{headers:{apikey:c.key,Authorization:'Bearer '+c.key},cache:'no-store'}).then(function(r){return r.ok?r.json():[];}).catch(function(){return[];});}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}

  // ---- date helpers (all in local time, date-only) ----
  function pd(s){ if(!s)return null; var m=/^(\d{4})-(\d{2})-(\d{2})/.exec(s); if(!m)return null; return new Date(+m[1],+m[2]-1,+m[3]); }
  function today(){ var d=new Date(); return new Date(d.getFullYear(),d.getMonth(),d.getDate()); }
  function addD(d,n){ return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n); }
  function key(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  function isWknd(d){ var g=d.getDay(); return g===0||g===6; }
  var HOLSET={};
  function isHol(d){ return !!HOLSET[key(d)]; }
  function nextWork(d){ var x=addD(d,1); var guard=0; while(isWknd(x)&&guard<40){x=addD(x,1);guard++;} return x; }
  var MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var DOW=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  function fmt(d){ return d?MON[d.getMonth()]+' '+d.getDate():''; }
  function fmtLong(d){ return d?DOW[d.getDay()]+' '+MON[d.getMonth()]+' '+d.getDate():''; }

  var DATA={groups:[],off:[],hols:[],sync:null};
  function load(){
    return Promise.all([
      api('time_off_groups?order=sort_order.asc'),
      api('time_off?order=start_date.asc'),
      api('time_off_holidays?order=holiday_date.asc'),
      api('time_off_sync?id=eq.1')
    ]).then(function(a){
      DATA={groups:a[0]||[], off:a[1]||[], hols:a[2]||[], sync:(a[3]&&a[3][0])||null};
      HOLSET={}; DATA.hols.forEach(function(h){HOLSET[key(pd(h.holiday_date))]=h;});
      return DATA;
    });
  }

  function statusOf(r){ var t=today(),s=pd(r.start_date),e=pd(r.end_date); if(!s||!e)return 'upcoming';
    if(e<t)return 'past'; if(s<=t&&t<=e)return 'out'; return 'upcoming'; }
  function dayCount(r){ var s=pd(r.start_date),e=pd(r.end_date); if(!s||!e)return 0; return Math.round((e-s)/86400000)+1; }

  // ---- staleness ----
  function syncInfo(){
    var s=DATA.sync; if(!s||!s.synced_at) return {txt:'never synced', stale:true, days:999};
    var d=pd(s.synced_at)||new Date(s.synced_at); var days=Math.floor((Date.now()-new Date(s.synced_at).getTime())/86400000);
    return {txt:'Last sync '+fmtLong(pd(s.synced_at)||today()), stale:days>3, days:days, by:s.synced_by};
  }

  // ---- calendar board for a group's people (21 days from today) ----
  function board(rows){
    var t=today(); var span=21; var days=[]; for(var i=0;i<span;i++)days.push(addD(t,i));
    // one lane per person who has any out/upcoming within the window
    var byP={};
    rows.forEach(function(r){ if(statusOf(r)==='past')return; var s=pd(r.start_date),e=pd(r.end_date); if(!s||!e)return;
      if(e<t||s>addD(t,span-1))return; (byP[r.employee]||(byP[r.employee]=[])).push(r); });
    var names=Object.keys(byP).sort(); if(!names.length)return '';
    var colw=34, nmw=150;
    var grid='grid-template-columns:'+nmw+'px repeat('+span+','+colw+'px)';
    var h='<div class="to-boardwrap"><div class="to-board">';
    // header row
    h+='<div class="to-row" style="'+grid+'"><div class="to-corner">Who</div>';
    days.forEach(function(d){ var cls='to-hc'+(isWknd(d)?' wk':'')+(key(d)===key(t)?' td':'');
      h+='<div class="'+cls+'"><u>'+DOW[d.getDay()][0]+'</u><s>'+d.getDate()+'</s></div>'; });
    h+='</div>';
    names.forEach(function(nm){
      h+='<div class="to-row" style="'+grid+'"><div class="to-nm"><b>'+esc(nm)+'</b><i>'+esc(byP[nm][0].title||byP[nm][0].policy||'')+'</i></div>';
      h+='<div class="to-trk" style="grid-template-columns:repeat('+span+','+colw+'px)">';
      // background cells
      days.forEach(function(d){ var cls='to-cell'+(isWknd(d)?' wk':'')+(key(d)===key(t)?' td':''); h+='<div class="'+cls+'"></div>'; });
      // bars
      byP[nm].forEach(function(r){ var s=pd(r.start_date),e=pd(r.end_date);
        var startIdx=Math.max(0,Math.round((s-t)/86400000)); var endIdx=Math.min(span-1,Math.round((e-t)/86400000));
        if(endIdx<0||startIdx>span-1)return; var colStart=startIdx+2, colEnd=endIdx+2; // +2: name col(1) + 1-based
        var live=statusOf(r)==='out'; var len=endIdx-startIdx+1;
        h+='<div class="to-bar'+(live?' live':'')+(len<=1?' tiny':'')+'" style="grid-column:'+colStart+' / '+(colEnd+1)+'"><span>'+esc(r.title||r.policy||'Off')+'</span></div>'; });
      h+='</div></div>';
    });
    h+='</div></div>';
    return h;
  }

  function nowCards(rows){
    var out=rows.filter(function(r){return statusOf(r)==='out';});
    if(!out.length)return '';
    var h='<div class="to-now">';
    out.forEach(function(r){ var back=nextWork(pd(r.end_date));
      h+='<div class="to-card"><h4>'+esc(r.employee)+'</h4><div class="r">'+esc(r.title||r.policy||'Time off')+'</div>'+
        '<dl><dt>Out</dt><dd>'+fmt(pd(r.start_date))+' – '+fmt(pd(r.end_date))+'</dd>'+
        '<dt>Back</dt><dd class="hi">'+fmtLong(back)+'</dd></dl></div>'; });
    return h+'</div>';
  }

  function offTable(rows){
    var upc=rows.filter(function(r){return statusOf(r)!=='past';})
      .sort(function(a,b){return (a.start_date||'').localeCompare(b.start_date||'');});
    if(!upc.length) return '<div class="to-empty">No approved time off on the calendar.</div>';
    var h='<div class="to-tblwrap"><table><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th class="n">Days</th><th>Back on</th><th>Status</th><th>Note</th></tr></thead><tbody>';
    upc.forEach(function(r){ var st=statusOf(r); var pill=st==='out'?'a':(st==='upcoming'?'b':'c'); var lbl=st==='out'?'Out now':(st==='upcoming'?'Upcoming':'Done');
      h+='<tr><td class="b">'+esc(r.employee)+'</td><td>'+esc(r.title||r.policy||'')+'</td><td>'+fmt(pd(r.start_date))+' – '+fmt(pd(r.end_date))+'</td>'+
        '<td class="n">'+dayCount(r)+'</td><td class="ret">'+fmtLong(nextWork(pd(r.end_date)))+'</td>'+
        '<td><span class="to-pill '+pill+'">'+lbl+'</span></td><td class="note">'+esc(r.note||'')+'</td></tr>'; });
    return h+'</tbody></table></div>';
  }

  function holChips(){
    if(!DATA.hols.length)return '';
    var t=today(); var up=DATA.hols.filter(function(h){var d=pd(h.holiday_date);return d&&d>=addD(t,-1);}).slice(0,8);
    if(!up.length)return '';
    var h='<div class="to-foot"><b>Upcoming paid holidays</b><div class="to-hols">';
    up.forEach(function(x){ var flag=!!x.override_label; h+='<div class="to-hol'+(flag?' flag':'')+'"><b>'+esc(x.name)+'</b><i>'+fmt(pd(x.holiday_date))+(flag?' · '+esc(x.override_label):'')+'</i></div>'; });
    return h+'</div></div>';
  }

  function groupBlock(g){
    var rows=DATA.off.filter(function(r){return r.group_key===g.key;});
    var covered=!!g.covered;
    var outN=rows.filter(function(r){return statusOf(r)==='out';}).length;
    var chip = !covered ? '<span class="to-chip">no Gusto feed</span>'
      : (outN? '<span class="to-chip out">'+outN+' out today</span>' : '<span class="to-chip ok">all in</span>');
    var open = covered ? ' open' : '';
    var body;
    if(!covered){
      body='<div class="to-warn">This crew isn’t on the Time Off feed yet — <b>'+esc(g.owner||'their manager')+'</b> would need to run the Gusto sync (or Troy gets company-wide Gusto rights). Headcount: <b>'+(g.headcount||0)+'</b>. When it’s connected, this fills in automatically.</div>';
    } else {
      body = nowCards(rows) + board(rows) + offTable(rows);
    }
    return '<div class="to-grp'+open+'" data-g="'+esc(g.key)+'">'+
      '<div class="to-grph" onclick="this.parentNode.classList.toggle(\'open\')"><h3>'+esc(g.label)+'</h3>'+
      '<span class="to-chip">'+(g.headcount||0)+' people</span>'+chip+'<span class="to-car">▾</span></div>'+
      '<div class="to-body">'+body+'</div></div>';
  }

  function render(){
    var o=ov(); if(!o)return;
    var si=syncInfo();
    var allOutToday=DATA.off.filter(function(r){return statusOf(r)==='out';}).length;
    var upcoming=DATA.off.filter(function(r){return statusOf(r)==='upcoming';}).length;
    var covered=DATA.groups.filter(function(g){return g.covered;}).length;
    var head='<div class="to-hd"><div><h2>Time Off</h2><p>Everyone’s approved time off from Gusto — who’s out and when they’re back.</p></div>'+
      '<div class="to-sync'+(si.stale?' stale':'')+'"><b>'+esc(si.txt)+'</b>'+(si.stale?'this data may be behind — refresh the Gusto sync':'live from Gusto')+'</div></div>';
    var tiles='<div class="to-tiles">'+
      '<div class="to-tile f"><div class="k">'+allOutToday+'</div><div class="l">Out today</div><div class="s">across covered crews</div></div>'+
      '<div class="to-tile"><div class="k">'+upcoming+'</div><div class="l">Upcoming</div><div class="s">approved, not started</div></div>'+
      '<div class="to-tile m"><div class="k">'+covered+' / '+DATA.groups.length+'</div><div class="l">Crews on feed</div><div class="s">Gusto-connected</div></div>'+
      '</div>';
    var stale = si.stale ? '<div class="to-warn"><b>Heads up:</b> the Gusto sync last ran '+(si.days>=999?'—':si.days+' day'+(si.days===1?'':'s')+' ago')+'. Numbers below may be behind until it runs again (weekdays 6:00 AM).</div>' : '';
    var groups=DATA.groups.map(groupBlock).join('');
    o.innerHTML='<div>'+head+tiles+stale+groups+'</div>';
  }

  // ---- overlay plumbing (mirrors the Quality/SQF section) ----
  function ov(){ if(!document.getElementById('view'))return null; var o=document.getElementById('to-overlay'); if(!o){o=document.createElement('div');o.id='to-overlay';o.style.display='none';document.body.appendChild(o);} return o; }
  function place(o){ var nav=document.getElementById('nav'); var r=nav?nav.getBoundingClientRect():{right:220,top:64}; o.style.left=r.right+'px'; o.style.top=r.top+'px'; }
  function show(){ var o=ov(); if(!o)return; window.__toActive=true; place(o); o.style.display='block'; o.innerHTML='<div class="to-hd"><div><h2>Time Off</h2><p>Loading…</p></div></div>'; load().then(render).catch(function(e){o.innerHTML='<div class="to-err">Couldn’t load time off: '+esc(e.message)+'</div>';}); }
  function hide(){ var o=document.getElementById('to-overlay'); window.__toActive=false; if(o)o.style.display='none'; }
  window.__toShow=show; window.__toHide=hide;

  function ensureNav(){
    var nav=document.getElementById('nav'); if(!nav) return; if(document.getElementById('to-nav-item')) return;
    var b=document.createElement('button'); b.id='to-nav-item'; b.className='navitem'; b.innerHTML='<span>🌴 Time Off</span>';
    b.onclick=function(){ [].slice.call(nav.querySelectorAll('.navitem')).forEach(function(n){n.classList.remove('active');}); b.classList.add('active'); show(); };
    // place right after the People nav item, in the same group; else append to last group
    var people=[].slice.call(nav.querySelectorAll('.navitem')).filter(function(n){return /people/i.test(n.textContent);})[0];
    if(people && people.parentNode){ people.parentNode.insertBefore(b, people.nextSibling); }
    else {
      var grp=document.createElement('div'); grp.className='navgroup';
      grp.innerHTML='<button class="navlabel" style="pointer-events:none">TEAM & OPS</button>';
      grp.appendChild(b); nav.appendChild(grp);
    }
  }

  // hide overlay when another nav item is clicked
  if(!window.__toNavHook){ document.addEventListener('click',function(e){ var it=e.target.closest?e.target.closest('.navitem'):null; if(it&&it.id!=='to-nav-item') hide(); },true); window.__toNavHook=true; }
  window.addEventListener('resize',function(){ if(window.__toActive) place(ov()); });

  // keep nav item alive across the app's re-renders — NO setInterval.
  // 1) wrap UI_go so we re-insert in the same render pass
  if(typeof window.UI_go==='function' && !window.UI_go.__toWrapped){
    var orig=window.UI_go; var w=function(){ var r=orig.apply(this,arguments); try{ensureNav();}catch(e){} return r; }; w.__toWrapped=true; window.UI_go=w;
  }
  // 2) MutationObserver gated to "my item is missing" — preserve nav scroll to avoid any jump
  var navEl=document.getElementById('nav');
  if(navEl && !window.__toObs){ window.__toObs=new MutationObserver(function(){ if(!document.getElementById('to-nav-item')){ var st=navEl.scrollTop; ensureNav(); navEl.scrollTop=st; } }); window.__toObs.observe(navEl,{childList:true,subtree:true}); }

  ensureNav();
})();
