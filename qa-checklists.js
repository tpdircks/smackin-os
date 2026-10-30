/* ============================================================================
   Quality checklists (qa-checklists.js)
   Daily and hourly Quality forms. Standalone. Does not OCR paper scans.

   Cross-reference only. Do not print these ids on the record:
     QUAL_FORM_11.0 v2 Pre-Operational Checklist, Monica Smith, 02.24.26
     Drive file 19iEBVaJwews-_G0BQqgHcLaI7n5DjSM9np__aPJda-0
     QUAL_FORM_21.0 v1 Metal Detector Monitoring, M. Smith, 12.12.25
     Completed GMP Checklist folder 1-Jo9IBlDLkIKHXs8SxbKLu4kMw2qiN3q
       (MIXING / P-MAC / WAREHOUSE)
     Completed Hourly Pouch Checks folder 1Xa9sCKHRnvg4nV6EEVnCV9dbIskTFieN
     GMP policy cross-reference ADMIN_PRO_1.0

   Shared save uses public.qc_forms (form_type, form_date, header jsonb,
   lines jsonb, status, operator, reviewer, plus ref, machine, result).
   The table is already empty and open to anon. This file does not run DDL.
   It does not write quality_logs. Paper stays the backup until QA confirms
   digital storage. This screen is not the official SQF record.

   Loaded before dept-homes.js so Back can wrap QACHECK.open.
   ========================================================================== */
(function (root) {
  "use strict";

  var doc = root.document;
  var cfg = root.SMACKIN_CONFIG || {};
  var LS = "qa-checklists-local-v1";
  var TYPES = ["preop", "metal", "gmp", "pouch"];
  var DAYS = ["mon", "tue", "wed", "thu", "fri", "sat"];
  var AREAS = ["mixing", "pmac", "warehouse"];
  var REF = {
    preop: "QUAL_FORM_11.0",
    metal: "QUAL_FORM_21.0",
    gmp: "ADMIN_PRO_1.0",
    pouch: "HOURLY_POUCH_CHECK"
  };
  var DC = {
    preop: { name: "Pre-Operational Checklist", ver: "2", eff: "02/24/2026", controlled: true },
    metal: { name: "Metal Detector Monitoring", ver: "1.0", eff: "12/12/2025", controlled: true },
    gmp: { name: "GMP Checklist", ver: "", eff: "", controlled: false },
    pouch: { name: "Hourly Pouch Check", ver: "", eff: "", controlled: false }
  };
  var PREOP = [
    { key: "secure", dept_en: "All", dept_es: "Todos",
      en: "The facility warehouse is secure with no open man doors or dock doors.",
      es: "La instalación y el almacén están seguros, sin puertas peatonales ni puertas de muelle abiertas." },
    { key: "tools", dept_en: "P-Mac", dept_es: "Empaque (P-Mac)",
      en: "Packaging tools are clean and in good condition.",
      es: "Las herramientas de empaque están limpias y en buenas condiciones." },
    { key: "packroom", dept_en: "P-Mac", dept_es: "Empaque (P-Mac)",
      en: "Packaging room food contact surfaces and equipment are clean, the room is clean, no trash or debris on the floors.",
      es: "Las superficies de contacto con alimentos y el equipo del área de empaque están limpios; el área está limpia, sin basura ni residuos en el piso." },
    { key: "mixroom", dept_en: "Mixing", dept_es: "Mezclado",
      en: "Mixing room food-contact surfaces and equipment are clean, with no trash or debris on floors or surfaces; all flavors and non-allergens are segregated.",
      es: "Las superficies de contacto con alimentos y el equipo en la sala de mezclado están limpios, sin basura ni residuos en los pisos ni en las superficies; todos los sabores y no alérgenos están segregados." },
    { key: "mixsurface", dept_en: "Mixing", dept_es: "Mezclado",
      en: "Mixing food contact surfaces are clean and in good condition.",
      es: "Las superficies de contacto con alimentos en el área de mezclado están limpias y en buenas condiciones." },
    { key: "prev", dept_en: "All", dept_es: "Todos",
      en: "Materials from Previous flavor are removed from each machine.",
      es: "Se eliminan los materiales del sabor anterior de cada máquina." },
    { key: "gmp", dept_en: "All", dept_es: "Todos",
      en: "Employees follow company GMPs, including hygiene, clothing, handwashing, sanitizing, and proper glove use.",
      es: "Los empleados siguen las BPM de la empresa, incluyendo higiene personal, vestimenta adecuada, lavado de manos, sanitización y uso correcto de guantes." },
    { key: "utensils", dept_en: "All", dept_es: "Todos",
      en: "Utensils and small tools (including bowls, blades, and scoops) are clean and in good condition.",
      es: "Los utensilios y herramientas pequeños (incluidos tazones, cuchillas y palas) están limpios y en buenas condiciones." },
    { key: "water", dept_en: "All", dept_es: "Todos",
      en: "Water only in designated areas. Food and other drinks stay in the breakroom.",
      es: "Agua solo en las áreas designadas; los alimentos y otras bebidas deben permanecer en la sala de descanso." },
    { key: "floor", dept_en: "All", dept_es: "Todos",
      en: "Nothing is on the floor. All items must be on pallets or trolleys.",
      es: "Nada debe estar en el piso; todos los artículos deben estar sobre tarimas o carritos." }
  ];
  var GMP = [
    { key: "follow", fromPreop: true,
      en: "Employees follow company GMPs, including hygiene, clothing, handwashing, sanitizing, and proper glove use.",
      es: "Los empleados siguen las BPM de la empresa, incluyendo higiene personal, vestimenta adecuada, lavado de manos, sanitización y uso correcto de guantes.",
      pt: "Os funcionarios seguem as BPF da empresa, incluindo higiene, roupa, lavagem das maos, sanitizacao e uso correto de luvas." },
    { key: "hygiene",
      en: "Personal hygiene is acceptable. Hands are clean and cuts are covered.",
      es: "La higiene personal es aceptable. Las manos estan limpias y los cortes estan cubiertos.",
      pt: "A higiene pessoal esta aceitavel. As maos estao limpas e os cortes estao cobertos." },
    { key: "clothing",
      en: "Clothing is clean and suitable for the area. No torn or dirty work clothes.",
      es: "La vestimenta esta limpia y es adecuada para el area. No hay ropa de trabajo rota o sucia.",
      pt: "A roupa esta limpa e adequada para a area. Nao ha roupa de trabalho rasgada ou suja." },
    { key: "handwash",
      en: "Hands are washed before starting work and after breaks, the restroom, or touching non-food surfaces.",
      es: "Las manos se lavan antes de empezar y despues de descansos, el bano, o tocar superficies que no son de alimentos.",
      pt: "As maos sao lavadas antes de comecar e depois dos intervalos, do banheiro, ou de tocar superficies que nao sao de alimento." },
    { key: "sanitize",
      en: "Hands are sanitized when this area requires it.",
      es: "Las manos se sanitizan cuando esta area lo requiere.",
      pt: "As maos sao sanitizadas quando esta area exige." },
    { key: "gloves",
      en: "Gloves are clean and intact, and used the way this area requires.",
      es: "Los guantes estan limpios e intactos, y se usan como esta area lo requiere.",
      pt: "As luvas estao limpas e intactas, e sao usadas como esta area exige." },
    { key: "jewelry",
      en: "No jewelry or loose objects. A plain band is covered if it is allowed.",
      es: "No hay joyas ni objetos sueltos. Una argolla lisa esta cubierta si esta permitida.",
      pt: "Nao ha joias nem objetos soltos. Uma alianca lisa fica coberta se for permitida." },
    { key: "hairnet",
      en: "Hairnet is worn. A beard cover is worn when needed.",
      es: "Se usa cofia. Se usa cubrebarba cuando hace falta.",
      pt: "A touca e usada. A cobertura de barba e usada quando precisa." },
    { key: "water", fromPreop: true,
      en: "Water only in designated areas. Food and other drinks stay in the breakroom.",
      es: "Agua solo en las áreas designadas; los alimentos y otras bebidas deben permanecer en la sala de descanso.",
      pt: "Agua so nas areas designadas. Comida e outras bebidas ficam na sala de descanso." },
    { key: "floor", fromPreop: true,
      en: "Nothing is on the floor. All items must be on pallets or trolleys.",
      es: "Nada debe estar en el piso; todos los artículos deben estar sobre tarimas o carritos.",
      pt: "Nada fica no chao. Tudo fica em paletes ou carrinhos." }
  ];

  var STR = {
    en: {
      title: "QA Checklists",
      paper: "Paper remains backup until QA confirms digital storage.",
      paperPrint: "Working copy. Paper remains backup until QA confirms digital storage.",
      noScans: "Older paper scans are not loaded here.",
      loading: "Loading checklists...",
      recent: "Saved in this screen",
      empty: "No checklists saved in Smackin OS yet. Older paper scans are not loaded here.",
      dashTitle: "Saved forms",
      dashEmpty: "0 saved forms across pre-op, metal, GMP, and pouch. An empty list stays visible here.",
      dashSaved: "Saved",
      dashComplete: "Marked complete",
      dashByDay: "By day and form",
      dashNone: "No date",
      newForm: "New",
      open: "Open",
      back: "Back to list",
      saveDraft: "Save draft",
      saveComplete: "Mark complete",
      print: "Print",
      addRow: "Add row",
      remove: "Remove",
      status: "Status",
      draft: "Draft",
      complete: "Complete",
      operator: "Operator",
      reviewer: "Reviewer",
      date: "Date",
      weekOf: "Week of / Semana de",
      weekHint: "The date snaps to Monday.",
      supervisor: "Supervisor weekly signature / Firma semanal del supervisor",
      weeklyBy: "Weekly verification / Verificacion semanal",
      weeklyDate: "Date / Fecha",
      initials: "QA operator initials / Iniciales del operador de calidad",
      time: "Time completed / Hora en que se completo",
      deviation: "Deviation / Desviacion",
      action: "Corrective action / Accion correctiva",
      verification: "Verification / Verificacion",
      dept: "Dept / Dpto.",
      task: "Checklist task / Tarea de verificacion",
      legendEn: "All satisfactory items will be marked with a check. Any unsatisfactory item will be marked with an X, and corrective actions will be recorded below.",
      legendEs: "Todos los puntos satisfactorios se marcaran con una paloma. Cualquier punto no satisfactorio se marcara con una X y las acciones correctivas se registraran a continuacion.",
      weekHint2: "Save a draft through the week. Mark complete when the week is finished.",
      initialsCol: "Initials",
      pass: "OK",
      fail: "X",
      na: "NA",
      blank: "Blank",
      area: "Area",
      line: "Line / machine",
      flavor: "Flavor",
      hour: "Hour",
      seal: "Seal OK",
      weight: "Fill weight OK",
      code: "Code / date OK",
      film: "Film OK",
      notes: "Notes",
      corrective: "Corrective action (if failure occurs)",
      verifiedBy: "Verified by",
      verifiedDate: "Verified date",
      standard: "Test standard",
      every2: "Check each wand every 2 hours, plus or minus 15 minutes. Standards: Fe 2.0, NF 2.0, and 316 SS 2.0. Line supervisor or designee.",
      gmpPolicy: "Cross-reference ADMIN_PRO_1.0 GMP Policy. Monica can refine this list.",
      pouchRefine: "Working hourly check. Brittney or Monica can refine this list. One sheet per date and line.",
      localBanner: "LOCAL: this browser is not on the shared database. Save keeps the record on this device only.",
      loadFail: "Could not load checklists",
      saveFail: "Save failed",
      savedOk: "Saved. Read-back matched.",
      savedLocal: "Saved on this device only. This browser is not on the shared database.",
      result: "Result",
      allTypes: "All forms",
      form: "Form",
      entered: "Entered by",
      filter: "Show",
      preop: "Pre-Operational Checklist",
      metal: "Metal Detector Monitoring",
      gmp: "GMP Checklist",
      pouch: "Hourly Pouch Checks",
      preopBlurb: "Week sheet, Monday through Saturday. English and Spanish.",
      metalBlurb: "Fe 2.0, NF 2.0, and 316 SS 2.0 every 2 hours.",
      gmpBlurb: "Daily GMP walk for Mixing, P-Mac, or Warehouse.",
      pouchBlurb: "Hourly seal, fill weight, code, and film.",
      mixing: "Mixing",
      pmac: "P-Mac",
      warehouse: "Warehouse",
      mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat",
      mark: "Result",
      item: "Item",
      discard: "Leave this checklist without saving the latest edits?",
      missing: "That saved checklist is not on this list.",
      dateReq: "Date is required.",
      needMarks: "Mark at least one check, or save a draft.",
      needDeviation: "An X needs a deviation and a corrective action.",
      needDayMeta: "Add QA initials and the time completed for {d}.",
      needOperator: "Operator is required to mark complete.",
      needReviewer: "Verified by is required to mark complete.",
      needLine: "Add at least one check row, or save a draft.",
      needMetal: "Each check needs a time, Fe, NF, SS, and initials.",
      needAction: "A failed check needs a corrective action.",
      needArea: "Area is required.",
      needItems: "Answer every GMP item (OK, X, or NA) to mark complete.",
      needGmpNote: "A failed GMP item needs a note.",
      needMachine: "Line / machine is required.",
      needPouch: "Each hour needs a time, flavor, seal, fill weight, code/date, film, and initials.",
      needNotes: "A failed pouch check needs notes.",
      revisions: "Revision history",
      change: "Change made",
      reason: "Reason for change",
      approved: "Approved by",
      version: "Version",
      eff: "Date",
      localTag: "this device",
      fe: "Fe 2.0",
      nf: "NF 2.0",
      ss: "316 SS 2.0",
      waitCloud: "Waiting for the shared database..."
    },
    es: {
      title: "Listas de calidad",
      paper: "El papel sigue como respaldo hasta que Calidad confirme el almacenamiento digital.",
      paperPrint: "Copia de trabajo. El papel sigue como respaldo hasta que Calidad confirme el almacenamiento digital.",
      noScans: "Los escaneos de papel antiguos no se cargan aqui.",
      loading: "Cargando listas...",
      recent: "Guardados en esta pantalla",
      empty: "Aun no hay listas guardadas en Smackin OS. Los escaneos de papel antiguos no se cargan aqui.",
      dashTitle: "Formas guardadas",
      dashEmpty: "0 formas guardadas entre preoperacional, detector de metal, GMP y bolsas. La lista vacia se queda visible.",
      dashSaved: "Guardadas",
      dashComplete: "Marcadas completas",
      dashByDay: "Por dia y forma",
      dashNone: "Sin fecha",
      newForm: "Nueva",
      open: "Abrir",
      back: "Volver a la lista",
      saveDraft: "Guardar borrador",
      saveComplete: "Marcar completo",
      print: "Imprimir",
      addRow: "Agregar fila",
      remove: "Quitar",
      status: "Estado",
      draft: "Borrador",
      complete: "Completo",
      operator: "Operador",
      reviewer: "Revisor",
      date: "Fecha",
      weekOf: "Week of / Semana de",
      weekHint: "La fecha se ajusta al lunes.",
      supervisor: "Supervisor weekly signature / Firma semanal del supervisor",
      weeklyBy: "Weekly verification / Verificacion semanal",
      weeklyDate: "Date / Fecha",
      initials: "QA operator initials / Iniciales del operador de calidad",
      time: "Time completed / Hora en que se completo",
      deviation: "Deviation / Desviacion",
      action: "Corrective action / Accion correctiva",
      verification: "Verification / Verificacion",
      dept: "Dept / Dpto.",
      task: "Checklist task / Tarea de verificacion",
      legendEn: "All satisfactory items will be marked with a check. Any unsatisfactory item will be marked with an X, and corrective actions will be recorded below.",
      legendEs: "Todos los puntos satisfactorios se marcaran con una paloma. Cualquier punto no satisfactorio se marcara con una X y las acciones correctivas se registraran a continuacion.",
      weekHint2: "Guarde un borrador durante la semana. Marque completo cuando la semana termine.",
      initialsCol: "Iniciales",
      pass: "OK",
      fail: "X",
      na: "NA",
      blank: "Vacio",
      area: "Area",
      line: "Linea / maquina",
      flavor: "Sabor",
      hour: "Hora",
      seal: "Sello OK",
      weight: "Peso de llenado OK",
      code: "Codigo / fecha OK",
      film: "Pelicula OK",
      notes: "Notas",
      corrective: "Accion correctiva (si hay falla)",
      verifiedBy: "Verificado por",
      verifiedDate: "Fecha de verificacion",
      standard: "Patron de prueba",
      every2: "Revise cada varilla cada 2 horas, mas o menos 15 minutos. Patrones: Fe 2.0, NF 2.0 y 316 SS 2.0. Supervisor de linea o designado.",
      gmpPolicy: "Referencia cruzada ADMIN_PRO_1.0 Politica GMP. Monica puede ajustar esta lista.",
      pouchRefine: "Revision horaria de trabajo. Brittney o Monica pueden ajustar esta lista. Una hoja por fecha y linea.",
      localBanner: "LOCAL: este navegador no esta en la base compartida. Guardar deja el registro solo en este equipo.",
      loadFail: "No se pudieron cargar las listas",
      saveFail: "No se guardo",
      savedOk: "Guardado. La relectura coincidio.",
      savedLocal: "Guardado solo en este equipo. Este navegador no esta en la base compartida.",
      result: "Resultado",
      allTypes: "Todas las formas",
      form: "Forma",
      entered: "Capturado por",
      filter: "Ver",
      preop: "Lista preoperacional",
      metal: "Monitoreo del detector de metal",
      gmp: "Lista GMP",
      pouch: "Revision horaria de bolsas",
      preopBlurb: "Hoja de la semana, lunes a sabado. Ingles y espanol.",
      metalBlurb: "Fe 2.0, NF 2.0 y 316 SS 2.0 cada 2 horas.",
      gmpBlurb: "Recorrido GMP diario de Mezclado, P-Mac o Almacen.",
      pouchBlurb: "Sello, peso, codigo y pelicula cada hora.",
      mixing: "Mezclado",
      pmac: "P-Mac",
      warehouse: "Almacen",
      mon: "Lun", tue: "Mar", wed: "Mie", thu: "Jue", fri: "Vie", sat: "Sab",
      mark: "Resultado",
      item: "Punto",
      discard: "Salir de esta lista sin guardar los ultimos cambios?",
      missing: "Esa lista guardada no esta en esta lista.",
      dateReq: "La fecha es obligatoria.",
      needMarks: "Marque al menos un punto, o guarde un borrador.",
      needDeviation: "Una X necesita desviacion y accion correctiva.",
      needDayMeta: "Agregue iniciales de calidad y la hora para {d}.",
      needOperator: "El operador es obligatorio para marcar completo.",
      needReviewer: "Verificado por es obligatorio para marcar completo.",
      needLine: "Agregue al menos una fila, o guarde un borrador.",
      needMetal: "Cada revision necesita hora, Fe, NF, SS e iniciales.",
      needAction: "Una falla necesita accion correctiva.",
      needArea: "El area es obligatoria.",
      needItems: "Responda cada punto GMP (OK, X o NA) para marcar completo.",
      needGmpNote: "Un punto GMP con X necesita una nota.",
      needMachine: "La linea o maquina es obligatoria.",
      needPouch: "Cada hora necesita hora, sabor, sello, peso, codigo/fecha, pelicula e iniciales.",
      needNotes: "Una falla en la bolsa necesita notas.",
      revisions: "Historial de revision",
      change: "Cambio",
      reason: "Motivo del cambio",
      approved: "Aprobado por",
      version: "Version",
      eff: "Fecha",
      localTag: "este equipo",
      fe: "Fe 2.0",
      nf: "NF 2.0",
      ss: "316 SS 2.0",
      waitCloud: "Esperando la base compartida..."
    },
    pt: {
      title: "Listas de qualidade",
      paper: "O papel continua como copia de apoio ate a Qualidade confirmar o armazenamento digital.",
      paperPrint: "Copia de trabalho. O papel continua como copia de apoio ate a Qualidade confirmar o armazenamento digital.",
      noScans: "Escaneamentos de papel antigos nao sao carregados aqui.",
      loading: "Carregando listas...",
      recent: "Salvos nesta tela",
      empty: "Ainda nao ha listas salvas no Smackin OS. Escaneamentos de papel antigos nao sao carregados aqui.",
      dashTitle: "Formularios salvos",
      dashEmpty: "0 formularios salvos entre pre-op, detector de metal, GMP e sache. A lista vazia continua visivel.",
      dashSaved: "Salvos",
      dashComplete: "Marcados completos",
      dashByDay: "Por dia e formulario",
      dashNone: "Sem data",
      newForm: "Nova",
      open: "Abrir",
      back: "Voltar a lista",
      saveDraft: "Salvar rascunho",
      saveComplete: "Marcar completo",
      print: "Imprimir",
      addRow: "Adicionar linha",
      remove: "Remover",
      status: "Status",
      draft: "Rascunho",
      complete: "Completo",
      operator: "Operador",
      reviewer: "Revisor",
      date: "Data",
      weekOf: "Week of / Semana de",
      weekHint: "A data vai para a segunda-feira.",
      supervisor: "Supervisor weekly signature / Firma semanal del supervisor",
      weeklyBy: "Weekly verification / Verificacion semanal",
      weeklyDate: "Date / Fecha",
      initials: "QA operator initials / Iniciales del operador de calidad",
      time: "Time completed / Hora en que se completo",
      deviation: "Deviation / Desviacion",
      action: "Corrective action / Accion correctiva",
      verification: "Verification / Verificacion",
      dept: "Dept / Dpto.",
      task: "Checklist task / Tarea de verificacion",
      legendEn: "All satisfactory items will be marked with a check. Any unsatisfactory item will be marked with an X, and corrective actions will be recorded below.",
      legendEs: "Todos los puntos satisfactorios se marcaran con una paloma. Cualquier punto no satisfactorio se marcara con una X y las acciones correctivas se registraran a continuacion.",
      weekHint2: "Salve um rascunho durante a semana. Marque completo quando a semana terminar.",
      initialsCol: "Iniciais",
      pass: "OK",
      fail: "X",
      na: "NA",
      blank: "Vazio",
      area: "Area",
      line: "Linha / maquina",
      flavor: "Sabor",
      hour: "Hora",
      seal: "Selo OK",
      weight: "Peso de enchimento OK",
      code: "Codigo / data OK",
      film: "Filme OK",
      notes: "Notas",
      corrective: "Acao corretiva (se houver falha)",
      verifiedBy: "Verificado por",
      verifiedDate: "Data da verificacao",
      standard: "Padrao de teste",
      every2: "Confira cada vareta a cada 2 horas, mais ou menos 15 minutos. Padroes: Fe 2.0, NF 2.0 e 316 SS 2.0. Supervisor da linha ou designado.",
      gmpPolicy: "Referencia cruzada ADMIN_PRO_1.0 Politica GMP. A Monica pode ajustar esta lista.",
      pouchRefine: "Checagem horaria de trabalho. Brittney ou Monica podem ajustar esta lista. Uma ficha por data e linha.",
      localBanner: "LOCAL: este navegador nao esta na base compartilhada. Salvar guarda o registro so neste aparelho.",
      loadFail: "Nao foi possivel carregar as listas",
      saveFail: "Nao salvou",
      savedOk: "Salvo. A releitura bateu.",
      savedLocal: "Salvo so neste aparelho. Este navegador nao esta na base compartilhada.",
      result: "Resultado",
      allTypes: "Todos os formularios",
      form: "Formulario",
      entered: "Lancado por",
      filter: "Ver",
      preop: "Lista pre-operacional",
      metal: "Monitoramento do detector de metal",
      gmp: "Lista GMP",
      pouch: "Checagem horaria de sache",
      preopBlurb: "Ficha da semana, segunda a sabado. Ingles e espanhol.",
      metalBlurb: "Fe 2.0, NF 2.0 e 316 SS 2.0 a cada 2 horas.",
      gmpBlurb: "Ronda GMP diaria de Mistura, P-Mac ou Almoxarifado.",
      pouchBlurb: "Selo, peso, codigo e filme a cada hora.",
      mixing: "Mistura",
      pmac: "P-Mac",
      warehouse: "Almoxarifado",
      mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sab",
      mark: "Resultado",
      item: "Item",
      discard: "Sair desta lista sem salvar as ultimas edicoes?",
      missing: "Essa lista salva nao esta nesta lista.",
      dateReq: "A data e obrigatoria.",
      needMarks: "Marque pelo menos um item, ou salve um rascunho.",
      needDeviation: "Um X precisa de desvio e acao corretiva.",
      needDayMeta: "Adicione iniciais da qualidade e a hora para {d}.",
      needOperator: "O operador e obrigatorio para marcar completo.",
      needReviewer: "Verificado por e obrigatorio para marcar completo.",
      needLine: "Adicione pelo menos uma linha, ou salve um rascunho.",
      needMetal: "Cada checagem precisa de hora, Fe, NF, SS e iniciais.",
      needAction: "Uma falha precisa de acao corretiva.",
      needArea: "A area e obrigatoria.",
      needItems: "Responda cada item GMP (OK, X ou NA) para marcar completo.",
      needGmpNote: "Um item GMP com X precisa de uma nota.",
      needMachine: "A linha ou maquina e obrigatoria.",
      needPouch: "Cada hora precisa de hora, sabor, selo, peso, codigo/data, filme e iniciais.",
      needNotes: "Uma falha no sache precisa de notas.",
      revisions: "Historico de revisao",
      change: "Mudanca",
      reason: "Motivo da mudanca",
      approved: "Aprovado por",
      version: "Versao",
      eff: "Data",
      localTag: "este aparelho",
      fe: "Fe 2.0",
      nf: "NF 2.0",
      ss: "316 SS 2.0",
      waitCloud: "Aguardando a base compartilhada..."
    }
  };

  var sb = null;
  var rows = [];
  var cacheMode = "";
  var loadError = "";
  var saveError = "";
  var filterType = "";
  var viewMode = "list";
  var cur = null;
  var active = false;
  var saving = false;

  function lang() {
    if (!doc) return "en";
    var es = doc.getElementById("lang-es");
    var pt = doc.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function tx(key) {
    var pack = STR[lang()] || STR.en;
    if (pack[key] != null) return pack[key];
    return STR.en[key] != null ? STR.en[key] : key;
  }
  function issueText(code) {
    var parts = String(code || "").split(":");
    var msg = tx(parts[0]);
    if (parts[1]) msg = msg.replace("{d}", tx(parts[1]));
    return msg;
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { n = String(n); return n.length < 2 ? "0" + n : n; }
  function today() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function mondayOf(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
    if (!m) return "";
    var d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (isNaN(d.getTime())) return "";
    var day = d.getDay();
    var diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function asObj(v) {
    if (!v) return {};
    if (typeof v === "string") { try { return JSON.parse(v) || {}; } catch (e) { return {}; } }
    return v;
  }
  function asList(v) {
    if (!v) return [];
    if (typeof v === "string") { try { v = JSON.parse(v); } catch (e) { return []; } }
    return Array.isArray(v) ? v : [];
  }
  function isUuid(s) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ""));
  }
  function toast(m) {
    if (!doc) return;
    var t = doc.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 5200);
  }
  function trim(s) { return String(s == null ? "" : s).trim(); }
  function emptyMarks() {
    var o = {};
    DAYS.forEach(function (d) { o[d] = ""; });
    return o;
  }
  function emptyDev() { return { date: "", deviation: "", action: "", verification: "" }; }
  function emptyMetal() { return { time: "", fe: "", nf: "", ss: "", action: "", initials: "" }; }
  function emptyPouch() { return { hour: "", flavor: "", seal: "", weight: "", code: "", film: "", initials: "", notes: "" }; }
  function emptyGmp(src) { return { key: src.key, mark: "", note: "" }; }
  function dayMeta() {
    var o = {};
    DAYS.forEach(function (d) { o[d] = { initials: "", time: "" }; });
    return o;
  }
  function repeat(fn, n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(fn());
    return out;
  }
  function gmpByKey(key) {
    for (var i = 0; i < GMP.length; i++) if (GMP[i].key === key) return GMP[i];
    return null;
  }
  function preopByKey(key) {
    for (var i = 0; i < PREOP.length; i++) if (PREOP[i].key === key) return PREOP[i];
    return null;
  }
  function itemText(src) {
    var l = lang();
    if (l === "pt" && src.pt) return src.pt;
    if (l === "es") return src.es || src.en;
    return src.en;
  }
  function blank(type) {
    type = TYPES.indexOf(type) >= 0 ? type : "preop";
    var rec = {
      id: "",
      form_type: type,
      form_date: type === "preop" ? mondayOf(today()) : today(),
      machine: "",
      operator: "",
      reviewer: "",
      reviewed_at: "",
      status: "draft",
      header: {},
      lines: [],
      dirty: false,
      local_only: false
    };
    if (type === "preop") {
      rec.header = { supervisor: "", weekly_by: "", weekly_date: "", day_meta: dayMeta(), deviations: [emptyDev(), emptyDev()] };
      rec.lines = PREOP.map(function (src) {
        return { key: src.key, dept_en: src.dept_en, dept_es: src.dept_es, en: src.en, es: src.es, marks: emptyMarks() };
      });
    } else if (type === "metal") {
      rec.header = { verified_date: "" };
      rec.lines = repeat(emptyMetal, 8);
    } else if (type === "gmp") {
      rec.header = {};
      rec.lines = GMP.map(emptyGmp);
    } else {
      rec.header = {};
      rec.lines = repeat(emptyPouch, 6);
    }
    return rec;
  }
  function normMark(v) {
    v = String(v || "");
    if (v === "pass" || v === "fail" || v === "na") return v;
    return "";
  }
  function hydrate(row) {
    var type = TYPES.indexOf(row.form_type) >= 0 ? row.form_type : "preop";
    var base = blank(type);
    var header = asObj(row.header);
    var lines = asList(row.lines);
    base.id = row.id || "";
    base.form_date = String(row.form_date || "").slice(0, 10) || base.form_date;
    base.machine = row.machine || "";
    base.operator = row.operator || "";
    base.reviewer = row.reviewer || "";
    base.reviewed_at = row.reviewed_at || "";
    base.status = row.status === "complete" ? "complete" : "draft";
    base.local_only = !isUuid(row.id);
    if (type === "preop") {
      base.header.supervisor = header.supervisor || "";
      base.header.weekly_by = header.weekly_by || "";
      base.header.weekly_date = header.weekly_date || "";
      DAYS.forEach(function (d) {
        var meta = header.day_meta && header.day_meta[d] ? header.day_meta[d] : {};
        base.header.day_meta[d] = { initials: meta.initials || "", time: meta.time || "" };
      });
      var devs = asList(header.deviations).map(function (r) {
        return { date: r.date || "", deviation: r.deviation || "", action: r.action || "", verification: r.verification || "" };
      });
      base.header.deviations = devs.length ? devs : [emptyDev()];
      var saved = {};
      lines.forEach(function (r) { if (r && r.key) saved[r.key] = r; });
      base.lines = PREOP.map(function (src) {
        var hit = saved[src.key] || {};
        var marks = emptyMarks();
        DAYS.forEach(function (d) { marks[d] = normMark(hit.marks && hit.marks[d]); });
        return { key: src.key, dept_en: src.dept_en, dept_es: src.dept_es, en: src.en, es: src.es, marks: marks };
      });
    } else if (type === "metal") {
      base.header.verified_date = header.verified_date || "";
      base.lines = lines.length ? lines.map(function (r) {
        return { time: r.time || "", fe: normMark(r.fe), nf: normMark(r.nf), ss: normMark(r.ss), action: r.action || "", initials: r.initials || "" };
      }) : [emptyMetal()];
    } else if (type === "gmp") {
      var gsave = {};
      lines.forEach(function (r) { if (r && r.key) gsave[r.key] = r; });
      base.lines = GMP.map(function (src) {
        var hit = gsave[src.key] || {};
        return { key: src.key, mark: normMark(hit.mark), note: hit.note || "" };
      });
    } else {
      base.lines = lines.length ? lines.map(function (r) {
        return {
          hour: r.hour || "", flavor: r.flavor || "", seal: normMark(r.seal), weight: normMark(r.weight),
          code: normMark(r.code), film: normMark(r.film), initials: r.initials || "", notes: r.notes || ""
        };
      }) : [emptyPouch()];
    }
    base.dirty = false;
    return base;
  }
  function metalUsed(r) { return !!(trim(r.time) || r.fe || r.nf || r.ss || trim(r.action) || trim(r.initials)); }
  function pouchUsed(r) {
    return !!(trim(r.hour) || trim(r.flavor) || r.seal || r.weight || r.code || r.film || trim(r.initials) || trim(r.notes));
  }
  function hasFail(rec) {
    var i;
    if (!rec) return false;
    if (rec.form_type === "preop") {
      for (i = 0; i < rec.lines.length; i++) {
        var marks = rec.lines[i].marks || {};
        for (var d = 0; d < DAYS.length; d++) if (marks[DAYS[d]] === "fail") return true;
      }
      return false;
    }
    if (rec.form_type === "metal") {
      for (i = 0; i < rec.lines.length; i++) {
        var m = rec.lines[i];
        if (m.fe === "fail" || m.nf === "fail" || m.ss === "fail") return true;
      }
      return false;
    }
    if (rec.form_type === "gmp") {
      for (i = 0; i < rec.lines.length; i++) if (rec.lines[i].mark === "fail") return true;
      return false;
    }
    for (i = 0; i < rec.lines.length; i++) {
      var p = rec.lines[i];
      if (p.seal === "fail" || p.weight === "fail" || p.code === "fail" || p.film === "fail") return true;
    }
    return false;
  }
  function resultOf(rec) {
    if (hasFail(rec)) return "fail";
    if (rec.status === "complete") return "pass";
    return "draft";
  }
  function validate(rec, status) {
    var errs = [];
    if (!rec || TYPES.indexOf(rec.form_type) < 0) return ["dateReq"];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(rec.form_date || ""))) errs.push("dateReq");
    if (status !== "complete") return errs;
    if (!trim(rec.operator)) errs.push("needOperator");
    var i;
    if (rec.form_type === "preop") {
      var any = false;
      var dayHit = {};
      var failed = false;
      rec.lines.forEach(function (line) {
        DAYS.forEach(function (d) {
          var mark = line.marks && line.marks[d];
          if (mark === "pass" || mark === "fail") { any = true; dayHit[d] = true; }
          if (mark === "fail") failed = true;
        });
      });
      if (!any) errs.push("needMarks");
      DAYS.forEach(function (d) {
        if (!dayHit[d]) return;
        var meta = rec.header.day_meta && rec.header.day_meta[d] ? rec.header.day_meta[d] : {};
        if (!trim(meta.initials) || !trim(meta.time)) errs.push("needDayMeta:" + d);
      });
      if (failed) {
        var okDev = (rec.header.deviations || []).some(function (r) { return trim(r.deviation) && trim(r.action); });
        if (!okDev) errs.push("needDeviation");
      }
    } else if (rec.form_type === "metal") {
      if (!trim(rec.reviewer)) errs.push("needReviewer");
      var usedM = rec.lines.filter(metalUsed);
      if (!usedM.length) errs.push("needLine");
      usedM.forEach(function (r) {
        if (!trim(r.time) || !r.fe || !r.nf || !r.ss || !trim(r.initials)) errs.push("needMetal");
        if ((r.fe === "fail" || r.nf === "fail" || r.ss === "fail") && !trim(r.action)) errs.push("needAction");
      });
    } else if (rec.form_type === "gmp") {
      if (!trim(rec.machine) || AREAS.indexOf(rec.machine) < 0) errs.push("needArea");
      rec.lines.forEach(function (r) {
        if (r.mark !== "pass" && r.mark !== "fail" && r.mark !== "na") errs.push("needItems");
        if (r.mark === "fail" && !trim(r.note)) errs.push("needGmpNote");
      });
    } else {
      if (!trim(rec.machine)) errs.push("needMachine");
      var usedP = rec.lines.filter(pouchUsed);
      if (!usedP.length) errs.push("needLine");
      usedP.forEach(function (r) {
        if (!trim(r.hour) || !trim(r.flavor) || !r.seal || !r.weight || !r.code || !r.film || !trim(r.initials)) errs.push("needPouch");
        if ((r.seal === "fail" || r.weight === "fail" || r.code === "fail" || r.film === "fail") && !trim(r.notes)) errs.push("needNotes");
      });
    }
    var seen = {};
    return errs.filter(function (e) { if (seen[e]) return false; seen[e] = 1; return true; });
  }
  function toRow(rec) {
    var reviewer = trim(rec.reviewer);
    var status = rec.status === "complete" ? "complete" : "draft";
    var row = {
      form_type: rec.form_type,
      ref: REF[rec.form_type] || "",
      form_date: rec.form_date,
      machine: trim(rec.machine),
      header: clone(rec.header || {}),
      lines: clone(rec.lines || []),
      result: resultOf({ form_type: rec.form_type, status: status, lines: rec.lines, header: rec.header }),
      operator: trim(rec.operator),
      reviewer: reviewer,
      reviewed_at: reviewer ? (rec.reviewed_at || new Date().toISOString()) : null,
      status: status
    };
    if (isUuid(rec.id)) row.id = rec.id;
    return row;
  }
  function normJson(v) {
    if (Array.isArray(v)) return v.map(normJson);
    if (v && typeof v === "object") {
      var o = {};
      Object.keys(v).sort().forEach(function (k) {
        if (v[k] == null) o[k] = "";
        else o[k] = normJson(v[k]);
      });
      return o;
    }
    if (v == null) return "";
    return v;
  }
  function sameJson(a, b) {
    return JSON.stringify(normJson(a)) === JSON.stringify(normJson(b));
  }
  function sameTime(a, b) {
    if (!a && !b) return true;
    var da = Date.parse(a);
    var db = Date.parse(b);
    if (isNaN(da) || isNaN(db)) return String(a || "") === String(b || "");
    return Math.abs(da - db) < 120000;
  }
  function readbackError(sent, got) {
    if (!got) return "Read-back failed: row not found";
    if (String(got.form_type || "") !== String(sent.form_type || "")) return "Read-back failed: form type mismatch";
    if (String(got.form_date || "").slice(0, 10) !== String(sent.form_date || "").slice(0, 10)) return "Read-back failed: date mismatch";
    if (String(got.status || "") !== String(sent.status || "")) return "Read-back failed: status mismatch";
    if (String(got.operator || "") !== String(sent.operator || "")) return "Read-back failed: operator mismatch";
    if (String(got.reviewer || "") !== String(sent.reviewer || "")) return "Read-back failed: reviewer mismatch";
    if (String(got.machine || "") !== String(sent.machine || "")) return "Read-back failed: machine mismatch";
    if (String(got.result || "") !== String(sent.result || "")) return "Read-back failed: result mismatch";
    if (String(got.ref || "") !== String(sent.ref || "")) return "Read-back failed: ref mismatch";
    if (!sameTime(sent.reviewed_at, got.reviewed_at)) return "Read-back failed: reviewed time mismatch";
    if (!sameJson(sent.header, got.header)) return "Read-back failed: header mismatch";
    if (!sameJson(sent.lines, got.lines)) return "Read-back failed: lines mismatch";
    return "";
  }

  function client() {
    if (sb) return sb;
    if (root.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY) {
      try {
        sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "qa-checklists-auth" }
        });
      } catch (e) { sb = null; }
    }
    return sb;
  }
  function cloudConfigured() {
    return !!(cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY && root.supabase);
  }
  function waitMode() {
    return new Promise(function (resolve) {
      var t0 = Date.now();
      (function tick() {
        if (root.DB && root.DB.mode === "cloud") return resolve("cloud");
        // mode starts as "local" and flips to "cloud" when DB.init() finishes.
        // The department bar is already on screen during that wait, so a
        // visible menu is not proof the browser will stay local.
        if (!cloudConfigured()) return resolve("local");
        if (Date.now() - t0 > 8000) return resolve("local");
        setTimeout(tick, 100);
      })();
    });
  }
  function lsGet() {
    try {
      var v = root.localStorage.getItem(LS);
      var list = v ? JSON.parse(v) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function lsSet(list) {
    try { root.localStorage.setItem(LS, JSON.stringify(list)); } catch (e) {}
  }
  function saveLocal(row, id) {
    var list = lsGet();
    var useId = id && String(id) ? String(id) : (row.id || ("QC-" + Date.now().toString(36)));
    var stored = clone(row);
    stored.id = useId;
    stored.created_at = new Date().toISOString();
    var idx = -1;
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === useId) idx = i;
    if (idx >= 0) {
      stored.created_at = list[idx].created_at || stored.created_at;
      list[idx] = stored;
    } else list.unshift(stored);
    lsSet(list);
    return stored;
  }
  function dropLocal(id) {
    if (!id) return;
    var list = lsGet().filter(function (r) { return String(r.id) !== String(id); });
    lsSet(list);
  }
  function mergeRows(cloud, local) {
    var seen = {};
    var out = [];
    (cloud || []).forEach(function (r) {
      if (!r || !r.id) return;
      seen[String(r.id)] = 1;
      out.push(r);
    });
    (local || []).forEach(function (r) {
      if (!r || !r.id || seen[String(r.id)]) return;
      out.push(r);
    });
    return out;
  }
  function sortRows(list) {
    return list.slice().sort(function (a, b) {
      var da = String(a.form_date || "");
      var db = String(b.form_date || "");
      if (da !== db) return da < db ? 1 : -1;
      var ca = String(a.created_at || "");
      var cb = String(b.created_at || "");
      if (ca !== cb) return ca < cb ? 1 : -1;
      return 0;
    });
  }
  function loadRows() {
    return waitMode().then(function (mode) {
      var local = lsGet();
      if (mode !== "cloud" || !client()) {
        rows = sortRows(local);
        cacheMode = "local";
        loadError = "";
        return rows;
      }
      return client().from("qc_forms").select("*").order("created_at", { ascending: false }).limit(200).then(function (r) {
        if (r && r.error) {
          loadError = tx("loadFail") + ": " + (r.error.message || "not loaded");
          rows = sortRows(local);
          cacheMode = "local";
          return rows;
        }
        loadError = "";
        cacheMode = "cloud";
        rows = sortRows(mergeRows((r && r.data) || [], local));
        return rows;
      }).catch(function (e) {
        loadError = tx("loadFail") + ": " + (e && e.message ? e.message : "not loaded");
        rows = sortRows(local);
        cacheMode = "local";
        return rows;
      });
    });
  }
  function findRow(id) {
    for (var i = 0; i < rows.length; i++) if (String(rows[i].id) === String(id)) return rows[i];
    return null;
  }
  function readBack(id) {
    return client().from("qc_forms").select("*").eq("id", id).limit(1).then(function (r) {
      if (r && r.error) throw new Error(r.error.message || "read-back failed");
      if (!r || !r.data || !r.data.length) {
        var err = new Error("Read-back failed: row not found");
        err.savedId = id;
        throw err;
      }
      return r.data[0];
    });
  }
  function insertRow(row) {
    var payload = clone(row);
    delete payload.id;
    return client().from("qc_forms").insert(payload).select("*").then(function (r) {
      if (r && r.error) throw new Error(r.error.message || "insert failed");
      var inserted = r && r.data && r.data[0];
      if (!inserted || !inserted.id) throw new Error("Save failed: insert returned no row");
      return readBack(inserted.id).catch(function (e) {
        e.savedId = inserted.id;
        throw e;
      });
    });
  }
  function updateRow(row) {
    var id = row.id;
    var payload = clone(row);
    delete payload.id;
    return client().from("qc_forms").update(payload).eq("id", id).select("*").then(function (r) {
      if (r && r.error) throw new Error(r.error.message || "update failed");
      if (!r || !r.data || !r.data.length) throw new Error("Save failed: no row updated");
      return readBack(id).catch(function (e) {
        e.savedId = id;
        throw e;
      });
    });
  }
  function save(status) {
    if (!cur || saving) return;
    var nextStatus = status === "complete" ? "complete" : "draft";
    if (cur.form_type === "preop" && cur.form_date) cur.form_date = mondayOf(cur.form_date) || cur.form_date;
    var problems = validate(cur, nextStatus);
    if (problems.length) {
      saveError = problems.map(issueText).join(" ");
      toast(saveError);
      render();
      return;
    }
    cur.status = nextStatus;
    if (trim(cur.reviewer) && !cur.reviewed_at) cur.reviewed_at = new Date().toISOString();
    if (!trim(cur.reviewer)) cur.reviewed_at = "";
    var row = toRow(cur);
    var prevId = cur.id || "";
    saving = true;
    function afterWrite() {
      saving = false;
      return loadRows().then(function () { if (active) render(); }, function () { if (active) render(); });
    }
    function failWrite(e) {
      saving = false;
      var msg = tx("saveFail") + ": " + (e && e.message ? e.message : tx("saveFail"));
      saveError = msg;
      if (e && e.savedId) cur.id = e.savedId;
      var keptFail = saveLocal(row, cur.id || prevId);
      if (!isUuid(cur.id)) cur.id = keptFail.id;
      cur.local_only = !isUuid(cur.id);
      cur.dirty = true;
      toast(msg);
      render();
    }
    waitMode().then(function (mode) {
      if (mode !== "cloud" || !client()) {
        var kept = saveLocal(row, prevId);
        cur.id = kept.id;
        cur.dirty = false;
        cur.local_only = true;
        saveError = "";
        toast(tx("savedLocal"));
        return afterWrite();
      }
      var writing = isUuid(prevId) ? updateRow(row) : insertRow(row);
      return writing.then(function (got) {
        var err = readbackError(row, got);
        if (err) {
          saving = false;
          saveError = err;
          cur.id = got && got.id ? got.id : prevId;
          cur.dirty = true;
          cur.local_only = false;
          saveLocal(row, cur.id);
          toast(err);
          render();
          return;
        }
        dropLocal(prevId);
        dropLocal(got.id);
        saveError = "";
        cur = hydrate(got);
        cur.dirty = false;
        cur.local_only = false;
        toast(tx("savedOk"));
        return afterWrite();
      }).catch(failWrite);
    }).catch(failWrite);
  }

  function markChar(v) {
    if (v === "pass") return "\u2713";
    if (v === "fail") return "X";
    if (v === "na") return "NA";
    return "";
  }
  function topRight(type) {
    var d = DC[type] || DC.preop;
    if (d.controlled) return d.name + "  |  Version " + d.ver + "  |  Effective " + d.eff;
    return d.name + "  |  Working copy";
  }
  function ynSelect(attrs, value, allowNa) {
    var opts = [["", ""], ["pass", tx("pass")], ["fail", tx("fail")]];
    if (allowNa) opts.push(["na", tx("na")]);
    return "<select " + attrs + ">" + opts.map(function (o) {
      return '<option value="' + o[0] + '"' + (value === o[0] ? " selected" : "") + ">" + esc(o[1]) + "</option>";
    }).join("") + "</select>";
  }
  function areaSelect(value) {
    var opts = '<option value=""></option>' + AREAS.map(function (a) {
      return '<option value="' + a + '"' + (value === a ? " selected" : "") + ">" + esc(tx(a)) + "</option>";
    }).join("");
    return '<select data-k="top" data-f="machine">' + opts + "</select>";
  }
  function flavorOpts() {
    var seen = {};
    var out = [];
    try {
      if (root.DB && typeof root.DB.items === "function") {
        root.DB.items().forEach(function (it) {
          var f = it && it.flavor ? String(it.flavor) : "";
          if (f && !seen[f]) { seen[f] = 1; out.push(f); }
        });
      }
    } catch (e) {}
    out.sort();
    return out.map(function (f) { return '<option value="' + esc(f) + '"></option>'; }).join("");
  }
  function completion(list) {
    var byType = { preop: 0, metal: 0, gmp: 0, pouch: 0 };
    var completeByType = { preop: 0, metal: 0, gmp: 0, pouch: 0 };
    var days = {};
    var total = 0;
    var done = 0;
    (list || []).forEach(function (r) {
      var t = r && r.form_type;
      if (TYPES.indexOf(t) < 0) return;
      total++;
      byType[t]++;
      var finished = r.status === "complete";
      if (finished) { completeByType[t]++; done++; }
      var d = String(r.form_date || "").slice(0, 10);
      if (!days[d]) days[d] = { date: d, preop: 0, metal: 0, gmp: 0, pouch: 0, total: 0, complete: 0 };
      days[d][t]++;
      days[d].total++;
      if (finished) days[d].complete++;
    });
    var dayList = Object.keys(days).sort(function (a, b) {
      if (a === b) return 0;
      if (!a) return 1;
      if (!b) return -1;
      return a < b ? 1 : -1;
    });
    return {
      total: total,
      complete: done,
      byType: byType,
      completeByType: completeByType,
      days: dayList.map(function (d) { return days[d]; })
    };
  }
  function alertHtml() {
    var html = "";
    if (loadError) html += '<div class="qa-error" role="alert">' + esc(loadError) + "</div>";
    if (saveError) html += '<div class="qa-error" role="alert">' + esc(saveError) + "</div>";
    if (cacheMode === "local") html += '<div class="qa-error" role="alert">' + esc(tx("localBanner")) + "</div>";
    return html;
  }
  function paperHtml() {
    return '<p class="hint">' + esc(tx("paper")) + '</p><p class="hint">' + esc(tx("noScans")) + "</p>";
  }
  function dashHtml(list) {
    var s = completion(list);
    var note = s.total ? "" : '<p class="qa-empty">' + esc(tx("dashEmpty")) + "</p>";
    var kpis = '<div class="qa-kpis">' +
      '<div><strong>' + s.total + "</strong><span>" + esc(tx("dashSaved")) + "</span></div>" +
      '<div><strong>' + s.complete + "</strong><span>" + esc(tx("dashComplete")) + "</span></div>" +
      TYPES.map(function (t) {
        return '<div><strong>' + s.byType[t] + "</strong><span>" + esc(tx(t)) + " · " + s.completeByType[t] + " " + esc(tx("complete").toLowerCase()) + "</span></div>";
      }).join("") + "</div>";
    var head = "<tr><th>" + esc(tx("date")) + "</th>" + TYPES.map(function (t) { return "<th>" + esc(tx(t)) + "</th>"; }).join("") + "<th>" + esc(tx("dashSaved")) + "</th><th>" + esc(tx("dashComplete")) + "</th></tr>";
    var shown = s.days.slice(0, 14);
    var body = shown.map(function (d) {
      return "<tr><td>" + esc(d.date || tx("dashNone")) + "</td>" + TYPES.map(function (t) { return "<td>" + d[t] + "</td>"; }).join("") + "<td><b>" + d.total + "</b></td><td>" + d.complete + "</td></tr>";
    }).join("");
    if (!body) body = "<tr><td>" + esc(tx("dashNone")) + "</td>" + TYPES.map(function () { return "<td>0</td>"; }).join("") + "<td><b>0</b></td><td>0</td></tr>";
    return '<h2 class="sub2">' + esc(tx("dashTitle")) + "</h2>" + note + kpis +
      '<p class="muted sm">' + esc(tx("dashByDay")) + "</p>" +
      '<div class="tblwrap"><table><thead>' + head + "</thead><tbody>" + body + "</tbody></table></div>";
  }
  function typeButtons() {
    return '<div class="qa-types">' + TYPES.map(function (t) {
      return '<button type="button" data-act="new" data-type="' + t + '"><strong>' + esc(tx("newForm")) + " " + esc(tx(t)) + "</strong><span>" + esc(tx(t + "Blurb")) + "</span></button>";
    }).join("") + "</div>";
  }
  function listHtml() {
    var chips = '<div class="qa-chips"><button type="button" data-act="filter" data-type="" class="' + (filterType ? "" : "on") + '">' + esc(tx("allTypes")) + "</button>" +
      TYPES.map(function (t) {
        return '<button type="button" data-act="filter" data-type="' + t + '" class="' + (filterType === t ? "on" : "") + '">' + esc(tx(t)) + "</button>";
      }).join("") + "</div>";
    var list = rows.filter(function (r) { return !filterType || r.form_type === filterType; });
      var body;
    if (!list.length) body = '<p class="muted">' + esc(tx("empty")) + "</p>";
    else {
      body = '<div class="tblwrap"><table><thead><tr><th>' + esc(tx("date")) + "</th><th>" + esc(tx("form")) + "</th><th>" + esc(tx("line")) + "</th><th>" + esc(tx("operator")) + "</th><th>" + esc(tx("status")) + "</th><th>" + esc(tx("result")) + "</th><th></th></tr></thead><tbody>" +
        list.map(function (r) {
          var local = !isUuid(r.id);
          return "<tr><td>" + esc(String(r.form_date || "").slice(0, 10)) + "</td><td>" + esc(tx(r.form_type || "")) + "</td><td>" + esc(r.machine || "") + "</td><td>" + esc(r.operator || "") +
            (local ? ' <span class="pill low">' + esc(tx("localTag")) + "</span>" : "") +
            "</td><td>" + esc(r.status === "complete" ? tx("complete") : tx("draft")) + "</td><td>" + esc(r.result || "") +
            '</td><td><button type="button" class="ghost sm" data-act="reopen" data-id="' + esc(r.id) + '">' + esc(tx("open")) + "</button></td></tr>";
        }).join("") + "</tbody></table></div>";
    }
    return '<div class="card"><h2>' + esc(tx("title")) + "</h2>" + alertHtml() + typeButtons() + chips +
      dashHtml(rows) +
      '<h2 class="sub2">' + esc(tx("recent")) + "</h2>" + body + paperHtml() + "</div>";
  }
  function actionsHtml() {
    return '<div class="qa-actions"><button type="button" class="ghost" data-act="back">' + esc(tx("back")) + '</button>' +
      '<button type="button" class="ghost" data-act="save-draft">' + esc(tx("saveDraft")) + '</button>' +
      '<button type="button" class="primary" data-act="save-complete">' + esc(tx("saveComplete")) + '</button>' +
      '<button type="button" class="ghost" data-act="print">' + esc(tx("print")) + "</button></div>";
  }
  function preopHtml(rec) {
    var head = "<tr><th>" + esc(tx("dept")) + "</th><th>" + esc(tx("task")) + "</th>" +
      DAYS.map(function (d) { return "<th>" + esc(tx(d)) + "</th>"; }).join("") + "</tr>";
    var body = rec.lines.map(function (line, i) {
      var cells = DAYS.map(function (d) {
        var v = line.marks[d] || "";
        return '<td><button type="button" class="qa-mark ' + esc(v) + '" data-act="cycle" data-i="' + i + '" data-day="' + d + '">' + esc(markChar(v) || "\u00b7") + "</button></td>";
      }).join("");
      return "<tr><td>" + esc(line.dept_en) + " / " + esc(line.dept_es) + "</td><td>" + esc(line.en) + '<span class="qa-es">' + esc(line.es) + "</span></td>" + cells + "</tr>";
    }).join("");
    var initRow = "<tr><th colspan=\"2\">" + esc(tx("initials")) + "</th>" + DAYS.map(function (d) {
      var meta = rec.header.day_meta[d];
      return '<td><input data-k="day" data-day="' + d + '" data-f="initials" value="' + esc(meta.initials) + '" autocomplete="off"></td>';
    }).join("") + "</tr>";
    var timeRow = "<tr><th colspan=\"2\">" + esc(tx("time")) + "</th>" + DAYS.map(function (d) {
      var meta = rec.header.day_meta[d];
      return '<td><input data-k="day" data-day="' + d + '" data-f="time" type="time" value="' + esc(meta.time) + '"></td>';
    }).join("") + "</tr>";
    var devs = rec.header.deviations.map(function (r, i) {
      return "<tr><td><input data-k=\"dev\" data-i=\"" + i + "\" data-f=\"date\" type=\"date\" value=\"" + esc(r.date) + "\"></td>" +
        "<td><input data-k=\"dev\" data-i=\"" + i + "\" data-f=\"deviation\" value=\"" + esc(r.deviation) + "\" autocomplete=\"off\"></td>" +
        "<td><input data-k=\"dev\" data-i=\"" + i + "\" data-f=\"action\" value=\"" + esc(r.action) + "\" autocomplete=\"off\"></td>" +
        "<td><input data-k=\"dev\" data-i=\"" + i + "\" data-f=\"verification\" value=\"" + esc(r.verification) + "\" autocomplete=\"off\"></td>" +
        '<td><button type="button" class="ghost sm" data-act="del-dev" data-i="' + i + '">' + esc(tx("remove")) + "</button></td></tr>";
    }).join("");
    return '<div class="card">' + actionsHtml() + '<div class="row">' +
      '<div><label>' + esc(tx("weekOf")) + '</label><input data-k="top" data-f="form_date" type="date" value="' + esc(rec.form_date) + '"><p class="hint">' + esc(tx("weekHint")) + "</p></div>" +
      '<div><label>' + esc(tx("operator")) + '</label><input data-k="top" data-f="operator" value="' + esc(rec.operator) + '" autocomplete="off"></div>' +
      '<div style="flex:2"><label>' + esc(tx("supervisor")) + '</label><input data-k="top" data-f="reviewer" value="' + esc(rec.reviewer) + '" autocomplete="off"></div>' +
      '</div><p class="hint">' + esc(tx("weekHint2")) + "</p></div>" +
      '<div class="card"><p>' + esc(tx("legendEn")) + '</p><p class="qa-es">' + esc(tx("legendEs")) + '</p>' +
      '<div class="qa-scroll"><table class="qa-pre"><thead>' + head + "</thead><tbody>" + body + initRow + timeRow + "</tbody></table></div></div>" +
      '<div class="card"><h2 class="sub2">' + esc(tx("deviation")) + '</h2><div class="tblwrap"><table><thead><tr><th>' + esc(tx("date")) + "</th><th>" + esc(tx("deviation")) + "</th><th>" + esc(tx("action")) + "</th><th>" + esc(tx("verification")) + "</th><th></th></tr></thead><tbody>" +
      devs + '</tbody></table></div><button type="button" class="ghost" data-act="add-dev">' + esc(tx("addRow")) + "</button>" +
      '<div class="row" style="margin-top:12px"><div><label>' + esc(tx("weeklyBy")) + '</label><input data-k="weekly" data-f="weekly_by" value="' + esc(rec.header.weekly_by) + '" autocomplete="off"></div>' +
      '<div><label>' + esc(tx("weeklyDate")) + '</label><input data-k="weekly" data-f="weekly_date" type="date" value="' + esc(rec.header.weekly_date) + '"></div></div></div>';
  }
  function metalHtml(rec) {
    var body = rec.lines.map(function (r, i) {
      return "<tr><td><input data-k=\"metal\" data-i=\"" + i + "\" data-f=\"time\" type=\"time\" value=\"" + esc(r.time) + "\"></td>" +
        "<td>" + ynSelect('data-k="metal" data-i="' + i + '" data-f="fe"', r.fe, false) + "</td>" +
        "<td>" + ynSelect('data-k="metal" data-i="' + i + '" data-f="nf"', r.nf, false) + "</td>" +
        "<td>" + ynSelect('data-k="metal" data-i="' + i + '" data-f="ss"', r.ss, false) + "</td>" +
        "<td><input data-k=\"metal\" data-i=\"" + i + "\" data-f=\"action\" value=\"" + esc(r.action) + "\" autocomplete=\"off\"></td>" +
        "<td><input data-k=\"metal\" data-i=\"" + i + "\" data-f=\"initials\" value=\"" + esc(r.initials) + "\" autocomplete=\"off\"></td>" +
        '<td><button type="button" class="ghost sm" data-act="del-line" data-i="' + i + '">' + esc(tx("remove")) + "</button></td></tr>";
    }).join("");
    return '<div class="card">' + actionsHtml() + '<div class="row">' +
      '<div><label>' + esc(tx("date")) + '</label><input data-k="top" data-f="form_date" type="date" value="' + esc(rec.form_date) + '"></div>' +
      '<div><label>' + esc(tx("line")) + '</label><input data-k="top" data-f="machine" value="' + esc(rec.machine) + '" autocomplete="off"></div>' +
      '<div><label>' + esc(tx("operator")) + '</label><input data-k="top" data-f="operator" value="' + esc(rec.operator) + '" autocomplete="off"></div>' +
      "</div><div class=\"row\">" +
      '<div><label>' + esc(tx("verifiedBy")) + '</label><input data-k="top" data-f="reviewer" value="' + esc(rec.reviewer) + '" autocomplete="off"></div>' +
      '<div><label>' + esc(tx("verifiedDate")) + '</label><input data-k="metalhead" data-f="verified_date" type="date" value="' + esc(rec.header.verified_date || "") + '"></div>' +
      '</div><p class="hint">' + esc(tx("every2")) + "</p></div>" +
      '<div class="card"><div class="tblwrap"><table><thead><tr><th>' + esc(tx("time")) + "</th><th>" + esc(tx("fe")) + "</th><th>" + esc(tx("nf")) + "</th><th>" + esc(tx("ss")) + "</th><th>" + esc(tx("corrective")) + "</th><th>" + esc(tx("initialsCol")) + "</th><th></th></tr></thead><tbody>" +
      body + "</tbody></table></div><button type=\"button\" class=\"ghost\" data-act=\"add-line\">" + esc(tx("addRow")) + "</button></div>";
  }
  function gmpHtml(rec) {
    var body = rec.lines.map(function (r, i) {
      var src = gmpByKey(r.key) || { en: r.key, es: "", fromPreop: false };
      var text = src.fromPreop
        ? esc(src.en) + '<span class="qa-es">' + esc(src.es) + "</span>"
        : esc(itemText(src)) + (lang() !== "es" && src.es ? '<span class="qa-es">' + esc(src.es) + "</span>" : "");
      return "<tr><td>" + text + "</td><td>" + ynSelect('data-k="gmp" data-i="' + i + '" data-f="mark"', r.mark, true) + "</td>" +
        "<td><input data-k=\"gmp\" data-i=\"" + i + "\" data-f=\"note\" value=\"" + esc(r.note) + "\" autocomplete=\"off\"></td></tr>";
    }).join("");
    return '<div class="card">' + actionsHtml() + '<div class="row">' +
      '<div><label>' + esc(tx("date")) + '</label><input data-k="top" data-f="form_date" type="date" value="' + esc(rec.form_date) + '"></div>' +
      '<div><label>' + esc(tx("area")) + "</label>" + areaSelect(rec.machine) + "</div>" +
      '<div><label>' + esc(tx("operator")) + '</label><input data-k="top" data-f="operator" value="' + esc(rec.operator) + '" autocomplete="off"></div>' +
      '<div><label>' + esc(tx("reviewer")) + '</label><input data-k="top" data-f="reviewer" value="' + esc(rec.reviewer) + '" autocomplete="off"></div>' +
      '</div><p class="hint">' + esc(tx("gmpPolicy")) + "</p></div>" +
      '<div class="card"><div class="tblwrap"><table><thead><tr><th>' + esc(tx("item")) + "</th><th>" + esc(tx("mark")) + "</th><th>" + esc(tx("notes")) + "</th></tr></thead><tbody>" +
      body + "</tbody></table></div></div>";
  }
  function pouchHtml(rec) {
    var body = rec.lines.map(function (r, i) {
      return "<tr><td><input data-k=\"pouch\" data-i=\"" + i + "\" data-f=\"hour\" type=\"time\" value=\"" + esc(r.hour) + "\"></td>" +
        "<td><input data-k=\"pouch\" data-i=\"" + i + "\" data-f=\"flavor\" list=\"qa-flavors\" value=\"" + esc(r.flavor) + "\" autocomplete=\"off\"></td>" +
        "<td>" + ynSelect('data-k="pouch" data-i="' + i + '" data-f="seal"', r.seal, false) + "</td>" +
        "<td>" + ynSelect('data-k="pouch" data-i="' + i + '" data-f="weight"', r.weight, false) + "</td>" +
        "<td>" + ynSelect('data-k="pouch" data-i="' + i + '" data-f="code"', r.code, false) + "</td>" +
        "<td>" + ynSelect('data-k="pouch" data-i="' + i + '" data-f="film"', r.film, false) + "</td>" +
        "<td><input data-k=\"pouch\" data-i=\"" + i + "\" data-f=\"initials\" value=\"" + esc(r.initials) + "\" autocomplete=\"off\"></td>" +
        "<td><input data-k=\"pouch\" data-i=\"" + i + "\" data-f=\"notes\" value=\"" + esc(r.notes) + "\" autocomplete=\"off\"></td>" +
        '<td><button type="button" class="ghost sm" data-act="del-line" data-i="' + i + '">' + esc(tx("remove")) + "</button></td></tr>";
    }).join("");
    return '<datalist id="qa-flavors">' + flavorOpts() + '</datalist><div class="card">' + actionsHtml() + '<div class="row">' +
      '<div><label>' + esc(tx("date")) + '</label><input data-k="top" data-f="form_date" type="date" value="' + esc(rec.form_date) + '"></div>' +
      '<div><label>' + esc(tx("line")) + '</label><input data-k="top" data-f="machine" value="' + esc(rec.machine) + '" autocomplete="off"></div>' +
      '<div><label>' + esc(tx("operator")) + '</label><input data-k="top" data-f="operator" value="' + esc(rec.operator) + '" autocomplete="off"></div>' +
      '<div><label>' + esc(tx("reviewer")) + '</label><input data-k="top" data-f="reviewer" value="' + esc(rec.reviewer) + '" autocomplete="off"></div>' +
      '</div><p class="hint">' + esc(tx("pouchRefine")) + "</p></div>" +
      '<div class="card"><div class="qa-scroll"><table class="qa-pre"><thead><tr><th>' + esc(tx("hour")) + "</th><th>" + esc(tx("flavor")) + "</th><th>" + esc(tx("seal")) + "</th><th>" + esc(tx("weight")) + "</th><th>" + esc(tx("code")) + "</th><th>" + esc(tx("film")) + "</th><th>" + esc(tx("initialsCol")) + "</th><th>" + esc(tx("notes")) + "</th><th></th></tr></thead><tbody>" +
      body + '</tbody></table></div><button type="button" class="ghost" data-act="add-line">' + esc(tx("addRow")) + "</button></div>";
  }
  function editHtml(rec) {
    var body = rec.form_type === "metal" ? metalHtml(rec) : rec.form_type === "gmp" ? gmpHtml(rec) : rec.form_type === "pouch" ? pouchHtml(rec) : preopHtml(rec);
    return '<div class="card"><h2>' + esc(tx(rec.form_type)) + "</h2>" + alertHtml() +
      '<p class="hint">' + esc(tx("status")) + ": " + esc(rec.status === "complete" ? tx("complete") : tx("draft")) +
      (rec.local_only ? " · " + esc(tx("localTag")) : "") + "</p></div>" + body;
  }
  function render() {
    if (!doc || !active) return;
    var host = doc.getElementById("view");
    if (!host) return;
    var y = root.scrollY || 0;
    host.innerHTML = '<div id="qa-root">' + (viewMode === "edit" && cur ? editHtml(cur) : listHtml()) + "</div>";
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
    markNav();
    try { root.scrollTo(0, y); } catch (e2) {}
  }
  function onEdit(e) {
    if (!cur || viewMode !== "edit") return;
    var el = e.target;
    if (!el || !el.getAttribute) return;
    var k = el.getAttribute("data-k");
    if (!k) return;
    cur.dirty = true;
    var f = el.getAttribute("data-f");
    var i = Number(el.getAttribute("data-i"));
    if (k === "top") {
      if (f === "form_date") {
        cur.form_date = el.value;
        if (cur.form_type === "preop") {
          cur.form_date = mondayOf(el.value) || el.value;
          el.value = cur.form_date;
        }
      } else if (f === "machine") cur.machine = el.value;
      else if (f === "operator") cur.operator = el.value;
      else if (f === "reviewer") {
        cur.reviewer = el.value;
        cur.reviewed_at = trim(el.value) ? (cur.reviewed_at || new Date().toISOString()) : "";
      }
      return;
    }
    if (k === "day") {
      var day = el.getAttribute("data-day");
      if (cur.header.day_meta && cur.header.day_meta[day]) cur.header.day_meta[day][f] = el.value;
      return;
    }
    if (k === "weekly") { cur.header[f] = el.value; return; }
    if (k === "dev" && cur.header.deviations[i]) { cur.header.deviations[i][f] = el.value; return; }
    if (k === "metalhead") { cur.header[f] = el.value; return; }
    if (k === "metal" && cur.lines[i]) { cur.lines[i][f] = el.value; return; }
    if (k === "gmp" && cur.lines[i]) { cur.lines[i][f] = el.value; return; }
    if (k === "pouch" && cur.lines[i]) { cur.lines[i][f] = el.value; return; }
  }
  function cycleMark(i, day, btn) {
    if (!cur || !cur.lines[i]) return;
    var order = ["", "pass", "fail"];
    var now = cur.lines[i].marks[day] || "";
    var next = order[(order.indexOf(now) + 1) % order.length];
    cur.lines[i].marks[day] = next;
    cur.dirty = true;
    btn.textContent = markChar(next) || "\u00b7";
    btn.className = "qa-mark" + (next ? " " + next : "");
  }
  function onClick(e) {
    var btn = e.target && e.target.closest ? e.target.closest("[data-act]") : null;
    if (!btn || !btn.closest || !btn.closest("#qa-root")) return;
    var act = btn.getAttribute("data-act");
    if (act === "new") { startNew(btn.getAttribute("data-type")); return; }
    if (act === "filter") { filterType = btn.getAttribute("data-type") || ""; render(); return; }
    if (act === "reopen") { reopen(btn.getAttribute("data-id")); return; }
    if (act === "back") { backList(); return; }
    if (act === "save-draft") { save("draft"); return; }
    if (act === "save-complete") { save("complete"); return; }
    if (act === "print") { printRecord(); return; }
    if (act === "cycle") { cycleMark(Number(btn.getAttribute("data-i")), btn.getAttribute("data-day"), btn); return; }
    if (!cur) return;
    if (act === "add-dev") { cur.header.deviations.push(emptyDev()); cur.dirty = true; render(); return; }
    if (act === "del-dev") {
      cur.header.deviations.splice(Number(btn.getAttribute("data-i")), 1);
      if (!cur.header.deviations.length) cur.header.deviations.push(emptyDev());
      cur.dirty = true; render(); return;
    }
    if (act === "add-line") {
      if (cur.form_type === "metal") cur.lines.push(emptyMetal());
      else if (cur.form_type === "pouch") cur.lines.push(emptyPouch());
      cur.dirty = true; render(); return;
    }
    if (act === "del-line") {
      cur.lines.splice(Number(btn.getAttribute("data-i")), 1);
      if (!cur.lines.length) cur.lines.push(cur.form_type === "metal" ? emptyMetal() : emptyPouch());
      cur.dirty = true; render(); return;
    }
  }
  function startNew(type) {
    if (cur && cur.dirty && !root.confirm(tx("discard"))) return;
    cur = blank(type);
    viewMode = "edit";
    saveError = "";
    render();
  }
  function reopen(id) {
    if (cur && cur.dirty && !root.confirm(tx("discard"))) return;
    var raw = findRow(id);
    if (!raw) { toast(tx("missing")); return; }
    cur = hydrate(raw);
    viewMode = "edit";
    saveError = "";
    render();
  }
  function backList() {
    if (cur && cur.dirty && !root.confirm(tx("discard"))) return;
    cur = null;
    viewMode = "list";
    saveError = "";
    render();
  }
  function td(v) { return "<td>" + esc(v || "") + "</td>"; }
  function revTable(rowsHtml) {
    return "<h3>" + esc(tx("revisions")) + "</h3><table><tr><th>" + esc(tx("version")) + "</th><th>" + esc(tx("eff")) + "</th><th>" + esc(tx("change")) + "</th><th>" + esc(tx("reason")) + "</th><th>" + esc(tx("approved")) + "</th></tr>" + rowsHtml + "</table>";
  }
  function printHtml(rec) {
    rec = rec || blank("preop");
    var type = rec.form_type;
    var page = type === "preop" ? "letter landscape" : "letter portrait";
    var dcCss = "@page{size:" + page + ";margin:0.7in 0.45in 0.75in 0.45in;" +
      "@top-left{content:\"SMACKIN' SNACKS  |  Approved By: Quality Assurance Manager\";font:bold 9px Arial,sans-serif}" +
      "@top-right{content:\"" + topRight(type) + "\";font:9px Arial,sans-serif}" +
      "@bottom-left{content:\"This document is the property of Smackin' Snacks. Do not copy, reproduce, or distribute without expressed written permission. Smackin' Snacks Inc. 1736 S. 4250 W. SLC, Utah 84104\";font:8px Arial,sans-serif;color:#555}" +
      "@bottom-right{content:\"Page \" counter(page) \" of \" counter(pages);font:9px Arial,sans-serif}}";
    var body = "";
    if (type === "preop") {
      var head = "<tr><th>Dept / Dpto.</th><th>Checklist task / Tarea de verificacion</th>" + DAYS.map(function (d) { return "<th>" + esc(tx(d)) + "</th>"; }).join("") + "</tr>";
      var grid = rec.lines.map(function (line) {
        var cells = DAYS.map(function (d) { return td(markChar(line.marks && line.marks[d])); }).join("");
        return "<tr><td>" + esc(line.dept_en) + " / " + esc(line.dept_es) + "</td><td>" + esc(line.en) + "<br><span class=\"muted\">" + esc(line.es) + "</span></td>" + cells + "</tr>";
      }).join("");
      var init = "<tr><th colspan=\"2\">QA initials / Iniciales</th>" + DAYS.map(function (d) { return td(rec.header.day_meta && rec.header.day_meta[d] && rec.header.day_meta[d].initials); }).join("") + "</tr>";
      var times = "<tr><th colspan=\"2\">Time / Hora</th>" + DAYS.map(function (d) { return td(rec.header.day_meta && rec.header.day_meta[d] && rec.header.day_meta[d].time); }).join("") + "</tr>";
      var devs = (rec.header.deviations || []).map(function (r) {
        return "<tr>" + td(r.date) + td(r.deviation) + td(r.action) + td(r.verification) + "</tr>";
      }).join("") || "<tr><td colspan=\"4\"></td></tr>";
      body = "<p><b>Week of / Semana de:</b> " + esc(rec.form_date) + " &nbsp; <b>Operator:</b> " + esc(rec.operator) +
        " &nbsp; <b>Supervisor / Firma semanal:</b> " + esc(rec.reviewer) + "</p>" +
        "<p>" + esc(tx("legendEn")) + "</p><p class=\"muted\">" + esc(tx("legendEs")) + "</p>" +
        "<table>" + head + grid + init + times + "</table>" +
        "<h2>Deviation / Desviacion</h2><table><tr><th>Date / Fecha</th><th>Deviation / Desviacion</th><th>Corrective action / Accion correctiva</th><th>Verification / Verificacion</th></tr>" + devs + "</table>" +
        "<p><b>Weekly verification / Verificacion semanal:</b> " + esc(rec.header.weekly_by) + " &nbsp; <b>Date / Fecha:</b> " + esc(rec.header.weekly_date) + "</p>" +
        revTable("<tr><td>1</td><td>01/05/2026</td><td>New</td><td>Initial release</td><td>Quality Assurance Manager</td></tr><tr><td>2</td><td>02/24/2026</td><td>English/Spanish version</td><td>Bilingual checklist</td><td>Monica Smith</td></tr>");
    } else if (type === "metal") {
      var mrows = rec.lines.map(function (r) {
        return "<tr>" + td(r.time) + td(markChar(r.fe)) + td(markChar(r.nf)) + td(markChar(r.ss)) + td(r.action) + td(r.initials) + "</tr>";
      }).join("");
      body = "<p>" + esc(tx("every2")) + "</p><p><b>Date:</b> " + esc(rec.form_date) + " &nbsp; <b>Line:</b> " + esc(rec.machine) + " &nbsp; <b>Operator:</b> " + esc(rec.operator) + "</p>" +
        "<table><tr><th>Time</th><th>Fe 2.0</th><th>NF 2.0</th><th>316 SS 2.0</th><th>Corrective action</th><th>Initials</th></tr>" + mrows + "</table>" +
        "<p><b>Verified by:</b> " + esc(rec.reviewer) + " &nbsp; <b>Date:</b> " + esc(rec.header.verified_date) + "</p>" +
        revTable("<tr><td>1.0</td><td>12/12/2025</td><td>Initial release</td><td>Metal detector monitoring</td><td>M. Smith</td></tr>");
    } else if (type === "gmp") {
      var grows = rec.lines.map(function (r) {
        var src = gmpByKey(r.key) || { en: r.key, es: "" };
        var label = esc(src.en) + (src.es ? "<br><span class=\"muted\">" + esc(src.es) + "</span>" : "");
        return "<tr><td>" + label + "</td>" + td(markChar(r.mark)) + td(r.note) + "</tr>";
      }).join("");
      body = "<p>" + esc(tx("gmpPolicy")) + "</p><p><b>Date:</b> " + esc(rec.form_date) + " &nbsp; <b>Area:</b> " + esc(tx(rec.machine) || rec.machine) +
        " &nbsp; <b>Operator:</b> " + esc(rec.operator) + " &nbsp; <b>Reviewer:</b> " + esc(rec.reviewer) + "</p>" +
        "<table><tr><th>Item</th><th>Result</th><th>Notes</th></tr>" + grows + "</table>";
    } else {
      var prows = rec.lines.map(function (r) {
        return "<tr>" + td(r.hour) + td(r.flavor) + td(markChar(r.seal)) + td(markChar(r.weight)) + td(markChar(r.code)) + td(markChar(r.film)) + td(r.initials) + td(r.notes) + "</tr>";
      }).join("");
      body = "<p>" + esc(tx("pouchRefine")) + "</p><p><b>Date:</b> " + esc(rec.form_date) + " &nbsp; <b>Line:</b> " + esc(rec.machine) +
        " &nbsp; <b>Operator:</b> " + esc(rec.operator) + " &nbsp; <b>Reviewer:</b> " + esc(rec.reviewer) + "</p>" +
        "<table><tr><th>Hour</th><th>Flavor</th><th>Seal OK</th><th>Fill weight OK</th><th>Code / date OK</th><th>Film OK</th><th>Initials</th><th>Notes</th></tr>" + prows + "</table>";
    }
    return "<!doctype html><html><head><meta charset=\"utf-8\"><title>" + esc(DC[type].name) + "</title><style>" + dcCss +
      "body{font-family:Arial,sans-serif;font-size:11px;margin:0;color:#222}table{border-collapse:collapse;width:100%;margin:6px 0 12px}th,td{border:1px solid #ccc;padding:3px 4px;text-align:left;vertical-align:top}h1{font-size:18px;margin:0 0 4px}h2{font-size:14px;margin:14px 0 4px}h3{margin:16px 0 4px}.muted{color:#555}</style></head><body>" +
      "<h1>" + esc(DC[type].name) + "</h1><p class=\"muted\">" + esc(tx("paperPrint")) + "</p>" + body + "</body></html>";
  }
  function printRecord() {
    if (!cur || !doc) return;
    var html = printHtml(cur);
    var w = root.open("", "_blank");
    if (!w) { toast(tx("print")); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 300);
  }

  function markNav() {
    if (!doc) return;
    var nav = doc.getElementById("nav");
    if (!nav || !active) return;
    var mine = doc.getElementById("qa-nav");
    if (!mine) return;
    var items = nav.querySelectorAll(".navitem.active");
    for (var i = 0; i < items.length; i++) items[i].classList.remove("active");
    mine.classList.add("active");
  }
  function injectNav() {
    if (!doc) return;
    var nav = doc.getElementById("nav");
    if (!nav || doc.getElementById("qa-nav")) return;
    var anchor = null;
    var items = nav.querySelectorAll("button.navitem");
    for (var i = 0; i < items.length; i++) {
      var oc = items[i].getAttribute("onclick") || "";
      if (oc.indexOf("UI_go('quality')") >= 0) { anchor = items[i]; break; }
    }
    if (!anchor) return;
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "navitem";
    btn.id = "qa-nav";
    btn.innerHTML = '<i class="navico" data-lucide="clipboard-check"></i><span>QA Checklists</span>';
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (root.QACHECK && typeof root.QACHECK.open === "function") root.QACHECK.open();
      else open();
    });
    if (anchor.nextSibling) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else anchor.parentNode.appendChild(btn);
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
    if (active) markNav();
  }
  function styleOnce() {
    if (!doc || doc.getElementById("qa-style")) return;
    var s = doc.createElement("style");
    s.id = "qa-style";
    s.textContent = "#qa-root .qa-banner{background:#FFF6E9;color:#7a4d05;border-radius:8px;padding:10px 12px;font-weight:700;margin:8px 0}#qa-root .qa-error{background:#FBE3E0;color:#7d1b12;border-radius:8px;padding:10px 12px;font-weight:700;margin:8px 0}#qa-root .qa-types{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:8px;margin:10px 0}#qa-root .qa-types button{text-align:left;background:#fff;border:1px solid #d7dde6;border-radius:10px;padding:10px 12px;cursor:pointer;font-family:inherit;color:#04223B}#qa-root .qa-types button strong{display:block;margin-bottom:4px}#qa-root .qa-types button span{display:block;font-size:12px;color:#3d4c5e;font-weight:600}#qa-root .qa-types button:hover{border-color:#006DB6}#qa-root .qa-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}#qa-root .qa-chips button{border:1px solid #d7dde6;background:#fff;border-radius:20px;padding:5px 10px;font-weight:700;font-size:13px;cursor:pointer;color:#243044;font-family:inherit}#qa-root .qa-chips button.on{background:#04223B;color:#fff;border-color:#04223B}#qa-root .qa-es{display:block;color:#3d4c5e;font-size:12px;font-weight:600;margin-top:3px}#qa-root .qa-scroll{overflow:auto}#qa-root table.qa-pre{min-width:980px}#qa-root .qa-mark{min-width:44px;min-height:36px;font-weight:800;border-radius:8px;border:1px solid #d7dde6;background:#fff;cursor:pointer;font-size:16px}#qa-root .qa-mark.pass{background:#E0F4E8;color:#1d5631}#qa-root .qa-mark.fail{background:#FBE3E0;color:#7d1b12}#qa-root .qa-actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 10px}#qa-root .qa-actions button{margin-top:0;min-height:44px;font-weight:800}#qa-root td,#qa-root th{vertical-align:top}#qa-root .qa-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:8px 0}#qa-root .qa-kpis div{background:#04223B;color:#fff;border-radius:10px;padding:10px 12px}#qa-root .qa-kpis strong{display:block;font-size:22px}#qa-root .qa-kpis span{font-size:12px;font-weight:700}#qa-root .qa-empty{font-weight:800;color:#04223B;margin:6px 0}";
    doc.head.appendChild(s);
  }
  function onScreen() { return !!(doc && doc.getElementById("qa-root")); }
  function open() {
    if (!doc) return;
    if (cur && cur.dirty && onScreen() && !root.confirm(tx("discard"))) return;
    active = true;
    viewMode = "list";
    cur = null;
    saveError = "";
    styleOnce();
    var host = doc.getElementById("view");
    if (host) host.innerHTML = '<div id="qa-root"><div class="card"><h2>' + esc(tx("title")) + "</h2><p class=\"muted\">" + esc(tx("loading")) + "</p></div></div>";
    try {
      var n = doc.getElementById("nav");
      var bd = doc.getElementById("navBackdrop");
      if (n) n.classList.remove("open");
      if (bd) bd.classList.remove("show");
    } catch (e) {}
    markNav();
    loadRows().then(function () { if (active) render(); });
  }
  function leaveIfOther(e) {
    if (!active) return;
    var t = e.target && e.target.closest ? e.target.closest("#qa-nav, [data-dept-tool], #nav .navitem, .dept-tab, #dept-back") : null;
    if (!t) return;
    if (t.id === "qa-nav") return;
    if (t.getAttribute && t.getAttribute("data-dept-tool") === "qacheck") return;
    if (cur && cur.dirty) {
      if (!root.confirm(tx("discard"))) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    active = false;
    cur = null;
  }

  var api = {
    open: open,
    blank: blank,
    hydrate: hydrate,
    validate: validate,
    toRow: toRow,
    readbackError: readbackError,
    printHtml: printHtml,
    mondayOf: mondayOf,
    hasFail: hasFail,
    resultOf: resultOf,
    completion: completion,
    TYPES: TYPES,
    PREOP: PREOP,
    GMP: GMP,
    DAYS: DAYS,
    AREAS: AREAS,
    REF: REF,
    paperBanner: STR.en.paper
  };
  root.QACHECK = api;

  if (doc) {
    doc.addEventListener("input", function (e) {
      if (!onScreen()) return;
      onEdit(e);
    }, true);
    doc.addEventListener("change", function (e) {
      if (!onScreen()) return;
      onEdit(e);
    }, true);
    doc.addEventListener("click", function (e) {
      if (!onScreen()) return;
      onClick(e);
    });
    doc.addEventListener("click", leaveIfOther, true);
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      doc.addEventListener("click", function (e) {
        if (e.target && e.target.id === id && active && onScreen()) setTimeout(render, 0);
      }, false);
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return active && onScreen(); });
    try {
      var mo = new MutationObserver(function () {
        injectNav();
        if (active && doc.getElementById("view") && !doc.getElementById("qa-root")) render();
      });
      mo.observe(doc.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 400); });
    else setTimeout(injectNav, 400);
  }

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
