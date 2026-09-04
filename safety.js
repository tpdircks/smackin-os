/*SAFETY*/
/* Smackin OS — Safety section: Workplace Incident Report (EN/ES).
   Digital version of the OSHA 29 CFR 1904 bilingual incident form.
   - "Incident Report" nav item: open to any worker — fill, save to Supabase, export PDF.
   - "Records" nav item: PIN-gated list of past incidents (holds injury/medical info).
   Self-contained IIFE. Overlay off #nav (like Time Off / Maintenance). NO setInterval.
   Stores to Supabase incident_reports (see incident_reports_table.sql). */
(function(){
  if (window.__sfInit) return; window.__sfInit = true;

  var SB='https://otwjxqhhwljwfyqbfuxz.supabase.co';
  var KEY='sb_publishable_KlPxfCQUmxbIAVc2p_M5Lw_ligy0COY';
  var H={apikey:KEY,Authorization:'Bearer '+KEY,'Content-Type':'application/json'};
  function api(path,opts){opts=opts||{};opts.headers=Object.assign({},H,opts.headers||{});opts.cache='no-store';return fetch(SB+'/rest/v1/'+path,opts);}
  var SAFETY_PIN='7233'; // "SAFE" — records access only. Change here if desired.

  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
  function BL(en,es){ return en+' <span class="sf-es">/ '+es+'</span>'; }        // bilingual label
  function today(){ var d=new Date(); return d.toISOString().slice(0,10); }
  function nowHM(){ var d=new Date(); return ('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2); }
  function genReportNo(){ var d=new Date(); return 'INC-'+d.getFullYear()+('0'+(d.getMonth()+1)).slice(-2)+('0'+d.getDate()).slice(-2)+'-'+('0'+Math.floor(Math.random()*90+10)).slice(-2); }

  /* ---------- form schema (faithful to the uploaded EN/ES form) ---------- */
  var CLASS_OPTS=[['injury','Injury / Illness','Lesión / Enfermedad'],['nearmiss','Near Miss','Cuasi accidente'],['property','Property / Equipment Damage','Daño a propiedad / equipo'],['dangerous','Dangerous Occurrence','Suceso peligroso'],['exposure','Hazardous Exposure','Exposición peligrosa'],['other','Other','Otro']];
  var INJURY_OPTS=[['strain','Strain / Sprain','Distensión / Esguince'],['cut','Cut / Laceration','Corte / Laceración'],['fracture','Fracture','Fractura'],['burn','Burn','Quemadura'],['fatigue','Fatigue / Heat','Fatiga / Calor'],['fume','Fume / Chemical Exposure','Exposición a humos / químicos'],['bruise','Bruising','Moretones'],['amputation','Amputation','Amputación'],['other','Other','Otro']];
  var EMPSTATUS_OPTS=[['ft','Employee (FT)','Empleado tiempo completo'],['pt','Employee (PT)','Empleado medio tiempo'],['contractor','Contractor','Contratista'],['labor','Labor Hire','Personal de agencia'],['visitor','Visitor','Visitante'],['public','Member of Public','Público en general']];
  var MEDTREAT_OPTS=[['firstaid','First Aid Only','Solo primeros auxilios'],['gp','GP / Doctor','Médico general'],['er','Emergency Room','Sala de emergencias'],['hospital','Hospitalization','Hospitalización'],['none','None Required','No requerido']];
  var NOTIF_OPTS=[['yes','Yes — Regulator notified immediately','Sí — Regulador notificado de inmediato'],['no','No','No']];
  var OSHA_OPTS=[['yes','Yes — Recorded on OSHA 300 Log','Sí — Registrado en el Registro OSHA 300'],['no','No — First Aid Only','No — Solo primeros auxilios']];

  // section defs: each field {k,en,es,t,val?,opts?}
  var SECTIONS=[
    {n:1,en:'Incident Details',es:'Detalles del Incidente',f:[
      {k:'incident_date',en:'Date of Incident',es:'Fecha del incidente',t:'date',val:today()},
      {k:'incident_time',en:'Time of Incident',es:'Hora del incidente',t:'time',val:nowHM()},
      {k:'date_reported',en:'Date Reported',es:'Fecha en que se reportó',t:'date',val:today()},
      {k:'report_no',en:'Report No.',es:'No. de informe',t:'text'},
      {k:'location',en:'Location / Site',es:'Ubicación / Sitio',t:'text'},
      {k:'department',en:'Department / Work Area',es:'Departamento / Área de trabajo',t:'text'},
      {k:'classification',en:'Classification',es:'Clasificación',t:'checks',opts:CLASS_OPTS,full:1},
      {k:'injury_type',en:'Injury Type (if applicable)',es:'Tipo de lesión (si aplica)',t:'checks',opts:INJURY_OPTS,full:1},
      {k:'exact_location',en:'Exact Location Description (building, floor, zone, equipment)',es:'Descripción exacta del lugar (edificio, piso, zona, equipo)',t:'textarea',full:1},
      {k:'description',en:'Detailed Description of Incident (what happened, sequence of events, what the person was doing, tools/equipment involved)',es:'Descripción detallada del incidente (qué pasó, secuencia de los hechos, qué hacía la persona, herramientas/equipo involucrado)',t:'textarea',full:1,big:1}
    ]},
    {n:2,en:'Injured / Affected Person(s)',es:'Persona(s) Lesionada(s) / Afectada(s)',f:[
      {k:'person_name',en:'Full Name',es:'Nombre completo',t:'text'},
      {k:'person_title',en:'Job Title / Role',es:'Puesto / Función',t:'text'},
      {k:'employee_id',en:'Employee ID',es:'ID de empleado',t:'text'},
      {k:'person_dob',en:'Date of Birth',es:'Fecha de nacimiento',t:'date'},
      {k:'person_dept',en:'Department',es:'Departamento',t:'text'},
      {k:'supervisor',en:'Supervisor',es:'Supervisor',t:'text'},
      {k:'employment_type',en:'Employment Type',es:'Tipo de empleo',t:'text'},
      {k:'contact_number',en:'Contact Number',es:'Número de contacto',t:'text'},
      {k:'employment_status',en:'Employment Status',es:'Situación laboral',t:'radio',opts:EMPSTATUS_OPTS,full:1},
      {k:'body_parts',en:'Body Part(s) Affected',es:'Parte(s) del cuerpo afectada(s)',t:'text',full:1},
      {k:'medical_desc',en:'Medical Treatment Required / Given (describe)',es:'Tratamiento médico requerido / brindado (describa)',t:'textarea',full:1},
      {k:'medical_treatment',en:'Medical Treatment',es:'Tratamiento médico',t:'radio',opts:MEDTREAT_OPTS,full:1}
    ]},
    {n:3,en:'Serious Incidents & Notifiable Events',es:'Incidentes Graves y Eventos Notificables',f:[
      {k:'notice3',t:'notice',en:'Notifiable: deaths, injuries needing immediate hospitalization, or dangerous incidents (racking collapse, forklift tip-over, uncontrolled fire/explosion, high-voltage shock). OSHA: fatality → report within 8 hrs (1-800-321-OSHA); inpatient hospitalization / amputation / loss of eye → within 24 hrs. Do NOT disturb the scene of a notifiable incident except to help the injured or make it safe.',es:'Notificable: muertes, lesiones que requieran hospitalización inmediata, o incidentes peligrosos. OSHA: fatalidad → reportar en 8 h; hospitalización / amputación / pérdida de ojo → en 24 h. NO altere la escena salvo para ayudar al lesionado o hacerla segura.'},
      {k:'notifiable',en:'Is this a Notifiable Event?',es:'¿Es un evento de notificación obligatoria?',t:'radio',opts:NOTIF_OPTS,full:1},
      {k:'osha_recordable',en:'Is this OSHA Recordable?',es:'¿Es registrable según OSHA?',t:'radio',opts:OSHA_OPTS,full:1},
      {k:'regulator_notified',en:'Regulator / OSHA Notified',es:'Regulador / OSHA notificado',t:'text'},
      {k:'notify_datetime',en:'Notification Date & Time',es:'Fecha y hora de notificación',t:'text'},
      {k:'notified_by',en:'Notified By',es:'Notificado por',t:'text'}
    ]},
    {n:4,en:'Reporting Process & Sign-Off',es:'Proceso de Reporte y Firmas',f:[
      {k:'notice4',t:'notice',en:'Process: worker notifies supervisor immediately → supervisor completes this report and submits to the Safety Manager → Safety Manager investigates, finds root cause, implements corrective actions → incident logged in the site register → if notifiable/recordable, regulator/OSHA contacted without delay. (Typed names below are the record; wet signatures go on the printed PDF.)',es:'Proceso: el trabajador notifica al supervisor de inmediato → el supervisor completa este informe y lo entrega al Gerente de Seguridad → se investiga, se halla la causa raíz y se implementan acciones correctivas → se registra en el registro del sitio → si es notificable, se contacta al regulador/OSHA sin demora.'},
      {k:'injured_sign',en:'Injured Person (name)',es:'Persona lesionada (nombre)',t:'text'},
      {k:'injured_date',en:'Date',es:'Fecha',t:'date'},
      {k:'witness_sign',en:'Witness (name)',es:'Testigo (nombre)',t:'text'},
      {k:'witness_sign_date',en:'Date',es:'Fecha',t:'date'},
      {k:'supervisor_name',en:'Supervisor Name',es:'Nombre del supervisor',t:'text'},
      {k:'date_submitted',en:'Date Submitted',es:'Fecha de entrega',t:'date',val:today()},
      {k:'submitted_to',en:'Report Submitted To',es:'Informe entregado a',t:'text'},
      {k:'safety_mgr',en:'Safety Manager Name',es:'Nombre del Gerente de Seguridad',t:'text'},
      {k:'date_received',en:'Date Received',es:'Fecha de recepción',t:'date'},
      {k:'investigation_due',en:'Investigation Due Date',es:'Fecha límite de investigación',t:'date'},
      {k:'register_no',en:'Incident Register Entry No.',es:'No. de entrada en el registro',t:'text'},
      {k:'osha_log_no',en:'OSHA 300 Log Entry No. (if applicable)',es:'No. de entrada Registro OSHA 300 (si aplica)',t:'text'}
    ]},
    {n:5,en:'Witness Statement',es:'Declaración del Testigo',f:[
      {k:'w_name',en:'Witness Name',es:'Nombre del testigo',t:'text'},
      {k:'w_title',en:'Job Title / Role',es:'Puesto / Función',t:'text'},
      {k:'w_date',en:'Date',es:'Fecha',t:'date'},
      {k:'w_contact',en:'Contact Number',es:'Número de contacto',t:'text'},
      {k:'w_where',en:'Where were you when the incident happened, and what were you doing?',es:'¿Dónde estaba cuando ocurrió el incidente y qué hacía?',t:'textarea',full:1},
      {k:'w_statement',en:'Statement (what you saw or heard, in your own words — English or Spanish)',es:'Declaración (lo que vio u oyó, en sus palabras — inglés o español)',t:'textarea',full:1,big:1}
    ]}
  ];

  /* ---------- render field ---------- */
  function fieldHTML(f){
    var id='sf_'+f.k;
    if(f.t==='notice'){ return '<div class="sf-notice">⚠ '+esc(f.en)+'<br><span class="sf-es">'+esc(f.es)+'</span></div>'; }
    var lbl='<label class="sf-lbl">'+BL(esc(f.en),esc(f.es))+'</label>';
    var input='';
    if(f.t==='textarea'){ input='<textarea id="'+id+'" class="sf-in'+(f.big?' big':'')+'"></textarea>'; }
    else if(f.t==='checks'){ input='<div class="sf-opts">'+f.opts.map(function(o){return '<label class="sf-opt"><input type="checkbox" name="'+id+'" value="'+o[0]+'"> '+esc(o[1])+' <span class="sf-es">/ '+esc(o[2])+'</span></label>';}).join('')+'</div>'; }
    else if(f.t==='radio'){ input='<div class="sf-opts">'+f.opts.map(function(o){return '<label class="sf-opt"><input type="radio" name="'+id+'" value="'+o[0]+'"> '+esc(o[1])+' <span class="sf-es">/ '+esc(o[2])+'</span></label>';}).join('')+'</div>'; }
    else { input='<input id="'+id+'" class="sf-in" type="'+(f.t||'text')+'" value="'+esc(f.val||'')+'">'; }
    return '<div class="sf-fld'+(f.full?' full':'')+'">'+lbl+input+'</div>';
  }

  function formHTML(){
    var secs=SECTIONS.map(function(s){
      return '<div class="sf-sec"><div class="sf-sh">SECTION '+s.n+' — '+esc(s.en)+' <span class="sf-es">/ SECCIÓN '+s.n+' — '+esc(s.es)+'</span></div>'+
        '<div class="sf-grid">'+s.f.map(fieldHTML).join('')+'</div></div>';
    }).join('');
    return '<div class="sf-wrap">'+
      '<div class="sf-hd"><div><h2>Workplace Incident Report <span class="sf-es">/ Informe de Incidente en el Lugar de Trabajo</span></h2>'+
      '<p>All incidents, near misses, and injuries must be reported, no matter how minor. <span class="sf-es">/ Todos los incidentes, cuasi accidentes y lesiones deben reportarse, sin importar lo leves que sean.</span></p>'+
      '<p class="sf-reg">Complies with OSHA 29 CFR 1904 · Retain min 5 years post-employment · CONFIDENTIAL — Workplace Health &amp; Safety Record</p></div></div>'+
      secs+
      '<div id="sf_msg"></div>'+
      '<div class="sf-bar sf-noprint"><button class="sf-btn" id="sf_save">✓ Submit &amp; Save <span class="sf-es">/ Enviar y guardar</span></button>'+
      '<button class="sf-btn ghost" id="sf_pdf">⬇ Download PDF</button>'+
      '<span class="sf-note">Save stores it to the Safety records log. Download a PDF to print for physical signatures.</span></div>'+
      '</div>';
  }

  /* ---------- collect ---------- */
  function val(k){ var e=document.getElementById('sf_'+k); return e?e.value.trim():''; }
  function checks(k){ return [].slice.call(document.querySelectorAll('input[name="sf_'+k+'"]:checked')).map(function(e){return e.value;}); }
  function labelFor(opts,v){ for(var i=0;i<opts.length;i++){ if(opts[i][0]===v) return opts[i][1]+' / '+opts[i][2]; } return v; }
  function collect(){
    var d={};
    SECTIONS.forEach(function(s){ s.f.forEach(function(f){
      if(f.t==='notice') return;
      if(f.t==='checks') d[f.k]=checks(f.k);
      else if(f.t==='radio') d[f.k]=(document.querySelector('input[name="sf_'+f.k+'"]:checked')||{}).value||'';
      else d[f.k]=val(f.k);
    });});
    return d;
  }

  /* ---------- save ---------- */
  function save(){
    var d=collect();
    var msg=document.getElementById('sf_msg');
    if(!d.incident_date || !d.description){ msg.innerHTML='<div class="sf-err">Please fill at least the Date of Incident and the Detailed Description. <span class="sf-es">/ Complete al menos la fecha y la descripción.</span></div>'; return; }
    if(!d.report_no){ d.report_no=genReportNo(); }
    var classLabels=(d.classification||[]).map(function(v){return labelFor(CLASS_OPTS,v).split(' / ')[0];}).join(', ');
    var rec={ report_no:d.report_no, incident_date:d.incident_date||null, person_name:d.person_name||'', classification:classLabels,
      notifiable:(d.notifiable==='yes'), osha_recordable:(d.osha_recordable==='yes'), data:d };
    msg.innerHTML='<div class="sf-ok">Saving…</div>';
    api('incident_reports',{method:'POST',headers:{Prefer:'return=representation'},body:JSON.stringify([rec])})
      .then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); })
      .then(function(){ msg.innerHTML='<div class="sf-ok">✓ Saved to Safety records — '+esc(d.report_no)+'. <span class="sf-es">/ Guardado.</span></div>'; })
      .catch(function(e){ msg.innerHTML='<div class="sf-err">Could not save ('+esc(String(e.message||e))+'). Is the incident_reports table created? You can still Download the PDF.</div>'; });
  }

  /* ---------- PDF (jsPDF) ---------- */
  function makePDF(d){
    d=d||collect();
    var J=(window.jspdf&&window.jspdf.jsPDF)||window.jsPDF; if(!J){ alert('PDF library not loaded.'); return; }
    var doc=new J({unit:'pt',format:'letter'}); var W=612, M=40, y=48, LH=13;
    function nl(n){ y+=(n||1)*LH; if(y>740){ doc.addPage(); y=48; } }
    function txt(s,o){ o=o||{}; doc.setFont('helvetica',o.b?'bold':'normal'); doc.setFontSize(o.s||9); doc.setTextColor(o.c||'#111');
      var lines=doc.splitTextToSize(String(s==null?'':s), o.w||(W-2*M)); doc.text(lines,o.x||M,y); y+=lines.length*(o.lh||LH); if(y>740){doc.addPage();y=48;} }
    doc.setFillColor('#04223B'); doc.rect(0,0,W,34,'F'); doc.setTextColor('#fff'); doc.setFont('helvetica','bold'); doc.setFontSize(13); doc.text('WORKPLACE INCIDENT REPORT / INFORME DE INCIDENTE',M,22);
    y=52;
    txt('OSHA 29 CFR 1904 · CONFIDENTIAL — Workplace Health & Safety Record · Report No. '+(d.report_no||''),{s:8,c:'#555'});
    nl(0.5);
    SECTIONS.forEach(function(s){
      nl(0.4); doc.setDrawColor('#006DB6'); doc.setLineWidth(1); doc.line(M,y-2,W-M,y-2); nl(0.2);
      txt('SECTION '+s.n+' — '+s.en+' / '+s.es,{b:true,s:10,c:'#04223B'});
      s.f.forEach(function(f){
        if(f.t==='notice') return;
        var v=d[f.k]; var out='';
        if(f.t==='checks'){ out=(v||[]).map(function(x){return labelFor(f.opts,x).split(' / ')[0];}).join(', '); }
        else if(f.t==='radio'){ out=v?labelFor(f.opts,v):''; }
        else out=v||'';
        if(f.t==='textarea' || f.big){ txt(f.en+':',{b:true,s:8.5,c:'#333'}); txt(out||'—',{s:9}); }
        else { txt(f.en+': '+(out||'________________'),{s:9}); }
      });
    });
    nl(0.5); doc.setDrawColor('#999'); doc.line(M,y,W-M,y); nl(0.3);
    txt('Signatures (sign on print): Injured Person ______________  Witness ______________  Supervisor ______________  Safety Manager ______________',{s:8,c:'#555'});
    doc.save('Incident_Report_'+(d.report_no||today())+'.pdf');
  }

  /* ---------- records (PIN-gated) ---------- */
  function records(){
    var o=ov(); if(!o) return;
    o.innerHTML='<div class="sf-wrap"><div class="sf-hd"><h2>Incident Records <span class="sf-es">/ Registros de Incidentes</span></h2></div>'+
      '<div class="sf-pin"><p>Enter Safety PIN to view records (injury &amp; medical info). <span class="sf-es">/ Ingrese el PIN de Seguridad.</span></p>'+
      '<input id="sf_pin" class="sf-in" type="password" inputmode="numeric" style="max-width:160px"> '+
      '<button class="sf-btn" id="sf_pin_go">Unlock</button><div id="sf_pin_msg"></div></div></div>';
    var go=function(){ if((document.getElementById('sf_pin').value||'')===SAFETY_PIN){ recordsList(); } else { document.getElementById('sf_pin_msg').innerHTML='<div class="sf-err">Incorrect PIN.</div>'; } };
    document.getElementById('sf_pin_go').onclick=go;
    document.getElementById('sf_pin').onkeydown=function(e){ if(e.key==='Enter') go(); };
  }
  function recordsList(){
    var o=ov(); o.innerHTML='<div class="sf-wrap"><div class="sf-hd"><h2>Incident Records</h2></div><div id="sf_recs">Loading…</div></div>';
    api('incident_reports?select=*&order=created_at.desc&limit=500').then(function(r){return r.json();}).then(function(rows){
      if(!Array.isArray(rows)) rows=[];
      window.__sfRecs=rows;
      var body = rows.length? rows.map(function(r,i){
        var flag = r.notifiable?'<span class="sf-pill hi">NOTIFIABLE</span>':(r.osha_recordable?'<span class="sf-pill md">OSHA 300</span>':'');
        return '<tr><td>'+esc(r.report_no||'')+'</td><td>'+esc(r.incident_date||'')+'</td><td>'+esc(r.person_name||'')+'</td><td>'+esc(r.classification||'')+' '+flag+'</td>'+
          '<td><button class="sf-btn ghost sm" data-i="'+i+'">View / PDF</button></td></tr>';
      }).join('') : '<tr><td colspan="5" style="text-align:center;color:#6E7C8A;padding:20px">No incident reports yet.</td></tr>';
      document.getElementById('sf_recs').innerHTML='<table class="sf-tbl"><thead><tr><th>Report No.</th><th>Date</th><th>Person</th><th>Type</th><th></th></tr></thead><tbody>'+body+'</tbody></table>';
      [].slice.call(document.querySelectorAll('#sf_recs [data-i]')).forEach(function(b){ b.onclick=function(){ makePDF(window.__sfRecs[+b.getAttribute('data-i')].data||{}); }; });
    }).catch(function(){ document.getElementById('sf_recs').innerHTML='<div class="sf-err">Could not load records. Is the incident_reports table created?</div>'; });
  }

  /* ---------- overlay + views ---------- */
  function ov(){ if(!document.getElementById('view'))return null; var o=document.getElementById('sf-overlay'); if(!o){ o=document.createElement('div'); o.id='sf-overlay'; o.style.display='none'; document.body.appendChild(o); } return o; }
  function place(o){ var nav=document.getElementById('nav'); var r=nav?nav.getBoundingClientRect():{right:220,top:64}; o.style.left=r.right+'px'; o.style.top=r.top+'px'; }
  function showForm(){ var o=ov(); if(!o)return; window.__sfActive=true; place(o); o.style.display='block'; o.innerHTML=formHTML();
    if(!val('report_no')){ var e=document.getElementById('sf_report_no'); if(e) e.value=genReportNo(); }
    document.getElementById('sf_save').onclick=save; document.getElementById('sf_pdf').onclick=function(){ makePDF(); }; }
  function showRecords(){ var o=ov(); if(!o)return; window.__sfActive=true; place(o); o.style.display='block'; records(); }
  function hide(){ var o=document.getElementById('sf-overlay'); window.__sfActive=false; if(o)o.style.display='none'; }
  window.__sfShowForm=showForm; window.__sfShowRecords=showRecords; window.__sfHide=hide;

  /* ---------- nav group (persist through re-renders, NO setInterval) ---------- */
  function ensureNav(){
    var nav=document.getElementById('nav'); if(!nav) return;
    if(document.getElementById('sf-navgroup')) return;
    var g=document.createElement('div'); g.className='navgroup'; g.id='sf-navgroup';
    g.innerHTML='<button class="navlabel" style="pointer-events:none">SAFETY</button>'+
      '<button class="navitem" id="sf-nav-report"><span>🦺 Incident Report</span></button>'+
      '<button class="navitem" id="sf-nav-records"><span>📁 Incident Records</span></button>';
    nav.appendChild(g);
    g.querySelector('#sf-nav-report').addEventListener('click',function(e){ e.stopPropagation(); setTimeout(showForm,0); });
    g.querySelector('#sf-nav-records').addEventListener('click',function(e){ e.stopPropagation(); setTimeout(showRecords,0); });
  }
  ensureNav();
  var mo=new MutationObserver(function(){ if(!document.getElementById('sf-navgroup')) ensureNav(); });
  var navEl=document.getElementById('nav'); if(navEl) mo.observe(navEl,{childList:true});
  // hide overlay when any OTHER nav item is clicked
  document.addEventListener('click',function(e){
    var it=e.target.closest?e.target.closest('.navitem'):null; if(!it) return;
    if(it.id==='sf-nav-report'||it.id==='sf-nav-records') return;
    hide();
  },true);
  window.addEventListener('resize',function(){ if(window.__sfActive) place(ov()); });

  css();
  function css(){ if(document.getElementById('sf-css'))return; var s=document.createElement('style'); s.id='sf-css';
    s.textContent=
    '#sf-overlay{position:fixed;right:0;bottom:0;background:#f4f7fa;overflow:auto;z-index:50;padding:22px 26px}'+
    '.sf-wrap{max-width:1000px}'+
    '.sf-hd h2{margin:0;font:800 24px system-ui;color:#04223B}'+
    '.sf-hd p{margin:4px 0 0;font:13px system-ui;color:#6E7C8A}'+
    '.sf-reg{color:#a85417!important;font-weight:600}'+
    '.sf-es{color:#8090a0;font-weight:400;font-style:italic}'+
    '.sf-sec{margin-top:18px;background:#fff;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden}'+
    '.sf-sh{background:#eef3f8;padding:9px 14px;font:800 13px system-ui;color:#04223B;border-bottom:1px solid #dbe3ec}'+
    '.sf-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 16px;padding:14px}'+
    '.sf-fld{display:flex;flex-direction:column;gap:4px}.sf-fld.full{grid-column:1/-1}'+
    '.sf-lbl{font:600 12px system-ui;color:#33414d}'+
    '.sf-in{border:1px solid #cfdae6;border-radius:8px;padding:8px 10px;font:14px system-ui;background:#fff}'+
    'textarea.sf-in{min-height:52px;resize:vertical}textarea.sf-in.big{min-height:90px}'+
    '.sf-opts{display:flex;flex-wrap:wrap;gap:6px 16px;padding:2px 0}'+
    '.sf-opt{font:13px system-ui;color:#33414d;display:flex;align-items:center;gap:5px}'+
    '.sf-notice{grid-column:1/-1;background:#fff8ef;border:1px solid #f0d9b8;border-radius:8px;padding:10px 12px;font:12px system-ui;color:#7a5320;line-height:1.5}'+
    '.sf-bar{margin:20px 0 40px;display:flex;align-items:center;gap:12px;flex-wrap:wrap}'+
    '.sf-btn{background:#006DB6;color:#fff;border:0;font:700 14px system-ui;border-radius:10px;padding:11px 18px;cursor:pointer}'+
    '.sf-btn:hover{background:#005c9c}.sf-btn.ghost{background:#f4f9ff;color:#006DB6;border:1px solid #cfe0ef}.sf-btn.sm{padding:5px 10px;font-size:12px}'+
    '.sf-note{font:12px system-ui;color:#6E7C8A;max-width:360px}'+
    '.sf-ok{background:#e8f6ee;border:1px solid #b8e0c6;color:#1E7D46;border-radius:8px;padding:10px 12px;font:600 13px system-ui;margin-top:12px}'+
    '.sf-err{background:#fdecea;border:1px solid #f3c0ba;color:#b3352a;border-radius:8px;padding:10px 12px;font:600 13px system-ui;margin-top:12px}'+
    '.sf-pin{background:#fff;border:1px solid #dbe3ec;border-radius:12px;padding:18px;margin-top:16px;max-width:420px}'+
    '.sf-pin p{font:13px system-ui;color:#33414d;margin:0 0 10px}'+
    '.sf-tbl{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dbe3ec;border-radius:12px;overflow:hidden}'+
    '.sf-tbl th{background:#eef3f8;text-align:left;font:700 12px system-ui;color:#04223B;padding:9px 12px}'+
    '.sf-tbl td{border-top:1px solid #eef2f6;padding:9px 12px;font:13px system-ui;color:#33414d}'+
    '.sf-pill{font:700 10px system-ui;border-radius:5px;padding:2px 6px;margin-left:6px}'+
    '.sf-pill.hi{background:#C0392B;color:#fff}.sf-pill.md{background:#F2C200;color:#3a2e00}'+
    '@media print{#nav,.sf-noprint{display:none!important}}';
    document.head.appendChild(s);
  }
})();
