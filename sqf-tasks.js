/* ============================================================================
   SQF Tasks (sqf-tasks.js)
   Quality screen for Monica's outstanding SQF clause list.
   Import once from the 2026-10-26 sheet, then this screen is the live list.
   Cloud-gated seed upserts on clause and stops after a localStorage flag.
   ?sqfseed=dry logs the rows and does not write. ?sqfseed=force writes again.
   Does not use improvements or quality_logs. Open questions workbook is out of scope.
   Loaded before dept-homes.js so Back can wrap SQFTASKS.open.
   ========================================================================== */
(function (root) {
  "use strict";

  var SOURCE_FILE_ID = "189B-m0zBUn5QEMwxcKaVzzRaMxnQDonf";
  var DRIVE_URL = "https://drive.google.com/file/d/" + SOURCE_FILE_ID + "/view";
  var FLAG = "sqf-seed-2026-10-26-v1";
  var LS_ROWS = "sqf-tasks-local";
  var OWNERS = ["Allen", "Brittney", "Monica", "Todd", "Ken", "Matt", "Michelle", "Troy", "All"];
  var STATUSES = ["open", "in_progress", "done", "blocked"];

  var RAW = [{"clause":"11.1.2.4","section":"Facility","requirement":"Walls, partitions, ceilings, and doors shall be of durable construction. Internal surfaces shall have an even and regular surface and be impervious with a light-colored finish and shall be kept clean (refer to 11.2.5).\nWall-to-wall and wall-to-floor junctions shall be designed to be easily cleaned and sealed to prevent the accumulation of food debris.","owner_raw":"Allen/Todd","action_notes":"Walkthrough needed to list damaged/unsealed walls, ceiling panels, and wall-to-floor junctions. Ken has been working on this. Todd has been working repairing holes in the wall. Angel will come out and do some additional repairs.","due_raw":"","due_date":"2026-10-23","status":"open"},{"clause":"11.1.2.6","section":"Facility","requirement":"Pipes carrying sanitary waste or wastewater that are located directly over product lines or storage areas shall be designed and constructed to prevent the contamination of food, materials, ingredients, and food contact surfaces and shall allow ease of cleaning. \nA risk analysis shall be conducted to ensure food contamination risks are mitigated.","owner_raw":"Allen/Todd - complete; Monica to complete RA","action_notes":"An issue like this was identified and corrected when we were working to be certified with the Department of Agriculture and Food with the  State of Utah. Monica will complete a RA","due_raw":"","due_date":"2026-10-31","status":"open"},{"clause":"11.1.2.7","section":"Facility","requirement":"Doors, hatches, and windows and their frames in food processing, handling, or storage areas shall be of a material and construction that meets the same functional requirements as for internal walls and partitions. Doors and hatches shall be of solid construction, and windows shall be made of shatterproof glass or similar material.","owner_raw":"Allen/Todd","action_notes":"Ken and Todd have been working on improving the dock doors.  I will followup with them about the status. \nWe have some repairs around door frames going into the cleaning room that Angel will repair as noted above.","due_raw":"","due_date":"2026-10-23","status":"open"},{"clause":"11.1.2.8","section":"Facility","requirement":"Product shall be processed and handled in areas that are fitted with a ceiling or other acceptable structure that is constructed and  maintained to prevent the contamination of products. Drop ceilings, where present, shall be constructed to enable monitoring for pest activity, facilitate cleaning, and provide access to utilities.","owner_raw":"Allen/Todd","action_notes":"Todd is working to replace a celing tile in the P-Mac room. I believe there is also a missing tile in mixing as well.","due_raw":"","due_date":"2026-10-23","status":"open"},{"clause":"11.1.5.1","section":"Facility","requirement":"All external windows, ventilation openings, doors, and other openings shall be effectively sealed when closed, and proofed against dust, vermin, and other pests. \nExternal personnel access doors shall be effectively insect-proofed and fitted with a self-closing device and proper seals to protect against entry of dust, vermin, and other pests.","owner_raw":"Allen/Todd","action_notes":"Todd scheduled to complete dock door gaps by 10/21/26 (see pest items).","due_raw":"","due_date":"2026-10-21","status":"open"},{"clause":"11.1.5.2","section":"Facility","requirement":"External doors, including overhead dock doors in food handling areas used for product, pedestrian, or truck access, shall be  designed and maintained to prevent pest ingress by at least one or a combination of the following methods:\ni. A self-closing device;\nii. An effective air curtain;\niii. A pest-proof screen;\niv. A pest-proof annex; and\nv. Adequate sealing around trucks in docking areas.","owner_raw":"Allen/Todd","action_notes":"Same as above. \n\nNo air curtains for now.","due_raw":"","due_date":"2026-10-21","status":"open"},{"clause":"11.1.6.1","section":"Facility","requirement":"Adequate ventilation shall be provided in enclosed processing and food handling areas.\nWhere appropriate, positive air-pressure systems shall be installed to prevent airborne contamination.","owner_raw":"Matt","action_notes":"Matt & Michelle are working on installing dust extraction in the Mixing room. We also need a positive-air pressure system in both clean rooms. I will follow-up with them to get a time-line. We are currently waiting on an updated bid. MN 10/19/26","due_raw":"TBD","due_date":"","status":"open"},{"clause":"11.1.6.4","section":"Facility","requirement":"Fans and exhaust vents shall be insect-proofed and located so they do not pose a contamination risk and shall be kept clean.","owner_raw":"Allen","action_notes":"We have been cleaning the fans in the cleanrooms. There are no external vents or fans. We will add this to the master cleaning schedule.","due_raw":"","due_date":"2026-10-16","status":"open"},{"clause":"11.1.7.2","section":"Facility","requirement":"Equipment and utensils shall be designed, constructed, installed, operated, and maintained to meet any applicable regulatory requirements and to not pose a contamination threat to products.","owner_raw":"Allen","action_notes":"Inspect equipment for rust, flaking paint, tape/wire temporary fixes, and non-food-grade parts; document repairs. Confirm only food-grade lubricants are used.","due_raw":"","due_date":"2026-10-20","status":"open"},{"clause":"11.1.7.3","section":"Facility","requirement":"Equipment storage rooms shall be designed and constructed to allow for the hygienic and efficient storage of equipment and containers. Where possible, food contact equipment shall be segregated from non-food contact equipment.","owner_raw":"Allen","action_notes":"Set up a designated equipment storage area with labeled shelving off the floor; keep food-contact equipment separate from non-food-contact.","due_raw":"","due_date":"2026-10-20","status":"open"},{"clause":"11.1.7.5","section":"Facility","requirement":"Benches, tables, conveyors, mixers, mincers, graders, and other mechanical processing equipment shall be hygienically designed and located for appropriate cleaning. Equipment surfaces shall be smooth, impervious, and free from cracks or crevices.","owner_raw":"Allen","action_notes":"Wood/porous tables in P-Mac have been replaced with stainless steel tables.\nEnsure all tape, strings and cardboard are removed as this can not be effectively cleaned and is considered a temporary repair.\nLeo is working on the Tape fixes 10/20/26 BC","due_raw":"","due_date":"2026-10-20","status":"open"},{"clause":"11.1.7.6","section":"Facility","requirement":"Product containers, tubs, and bins used for edible and inedible material shall be constructed of materials that are non-toxic, smooth, impervious, and readily cleaned as per 11.2.5.1. Bins used for inedible material shall be clearly identified.","owner_raw":"Allen","action_notes":"The bins used in production are food safe. \nReplace cracked/damaged bins. \nAll items must remain off the floor","due_raw":"","due_date":"2026-10-16","status":"open"},{"clause":"11.1.8.1","section":"Facility","requirement":"A suitable external environment shall be established, and the effectiveness of the measures shall be monitored and periodically reviewed. The premises, its surrounding areas, storage facilities, machinery, and equipment shall be kept free of waste or accumulated debris, and vegetation shall be controlled so as not to attract pests and vermin or present a food safety hazard to the sanitary operation of the site.","owner_raw":"Allen/Ken","action_notes":"This is something Ken has worked on. I will visit with him to see if the suroundings are in compliance. Start a monthly exterior inspection log.","due_raw":"","due_date":"2026-10-20","status":"open"},{"clause":"11.2.1.2","section":"Maintenance","requirement":"Routine maintenance of plant and equipment in any food processing, handling, or storage areas shall be performed according to a maintenance control schedule and recorded.\nThe maintenance schedule shall be prepared to include buildings, equipment, and other areas of the premises critical to the maintenance of product safety.","owner_raw":"Allen/Todd","action_notes":"Build a written preventive maintenance schedule for building and equipment (mixers, P-Mac machines) with a log to record completed work. Roadblock: compiling the full equipment list with Todd.","due_raw":"","due_date":"2026-10-23","status":"open"},{"clause":"11.2.1.6","section":"Maintenance","requirement":"Temporary repairs, where required, shall not pose a food safety risk and shall be included in routine inspections (refer to 2.5.4.3) and the cleaning program. There shall be a plan in place to address the completion of temporary repairs to ensure they do not become permanent solutions.","owner_raw":"Allen/Todd","action_notes":"Create a temporary repair log (date, item, owner, permanent-fix date) and add temporary repairs to pre-op/GMP inspections and the cleaning program.","due_raw":"","due_date":"2026-10-20","status":"open"},{"clause":"11.2.3.2","section":"Calibration","requirement":"Equipment shall be calibrated against national or international reference standards and methods or to an accuracy appropriate to its use. In cases where standards are not available, the site shall provide evidence to support the calibration reference method applied.","owner_raw":"Brittney","action_notes":"Completed 09/16/26\n Completed 10/2/26","due_raw":"Completed","due_date":"","status":"done"},{"clause":"11.2.3.6","section":"Calibration","requirement":"A directory of measuring, testing, and inspection equipment that require calibration and records of the calibration tests shall be maintained.","owner_raw":"Brittney","action_notes":"Completed","due_raw":"Completed","due_date":"","status":"done"},{"clause":"11.2.4.1","section":"Pest Prevention","requirement":"A documented pest prevention program shall be effectively implemented. It shall:\ni. Describe the methods and responsibility for the development, implementation, and maintenance of the pest prevention program;\nii. Record pest sightings and trend the frequency of pest activity to target pesticide applications;\niii. Outline the methods used to prevent pest problems;\niv. Outline the pest elimination methods and the appropriate documentation for each inspection;\nv. Outline the frequency with which pest status is to be checked;\nvi. Include the identification, location, number, and type of applied pest control/monitoring devices on a site map;\nvii. List the chemicals used. The chemicals are required to be approved by the relevant authority and their Safety Data Sheets (SDS) made available;\nviii. Outline the methods used to make staff aware of the bait control program and the measures to take when they come into contact with a bait station;\nix. Outline the requirements for staff awareness and training in the use of pest and vermin control chemicals and baits; and\nx. Measure the effectiveness of the program to verify the elimination of applicable pests and to identify trends.","owner_raw":"Brittney","action_notes":"Casey is coming to \n sign off on outstanding\n  items on 10/23/26\n Todd will complete\n the gaps on doc \n doors by 10/21/26\nCasey is coming 10/23/26","due_raw":"In proccess","due_date":"","status":"in_progress"},{"clause":"11.2.4.2","section":"Pest Prevention","requirement":"Pest contractors and/or internal pest controllers shall:\ni. Be licensed and approved by the local relevant authority;\nii. Use only trained and qualified operators, who comply with regulatory requirements;\niii. Use only approved chemicals;\niv. Provide a pest prevention plan (refer to 2.3.2.8), which includes a site map, indicating the location of bait stations traps and other applicable pest control/monitoring devices;\nv. Report to a responsible authorized person on entering the premises and after the completion of inspections or treatments;\nvi. Provide regular inspections for pest activity with appropriate action taken if pests are present, and\nvii. Provide a written report of their findings and the inspections and treatments applied.","owner_raw":"Brittney","action_notes":"Casey is coming to \n sign off on outstanding\n  items on 10/23/26\n Todd will complete\n the gaps on doc \n doors by 10/21/26\nCasey is coming 10/15/26","due_raw":"In proccess","due_date":"","status":"in_progress"},{"clause":"11.2.5.1","section":"sanitation","requirement":"The methods and responsibility for the effective cleaning of the food handling and processing equipment and environment and storage areas shall be documented and implemented. Consideration shall be given to:\ni. What is to be cleaned;\nii. How it is to be cleaned;\niii. When it is to be cleaned;\niv. Who is responsible for the cleaning;\nv. Validation of the cleaning procedures for food contact surfaces (including CIP);\nvi. Methods used to confirm the correct concentrations of detergents and sanitizers; and\nvii. The responsibility and methods used to verify the effectiveness of the cleaning and sanitation program.","owner_raw":"Allen/Brittney","action_notes":"In process \nNeed SSOP for each item to be cleaned.","due_raw":"","due_date":"2026-10-31","status":"open"},{"clause":"11.2.5.2","section":"sanitation","requirement":"Detergents and sanitizers shall be suitable for use in a food manufacturing environment, labeled according to regulatory requirements, and purchased in accordance with applicable legislation. The organization shall ensure:\ni. The site maintains a list of chemicals approved for use;\nii. An inventory of all purchased and used chemicals is maintained;\niii. Detergents and sanitizers are stored as outlined in element 11.6.4;\niv. Safety Data Sheets (SDS) are provided for all detergents and sanitizers purchased; and\nv. Only trained staff handle sanitizers and detergents.","owner_raw":"Allen/Brittney/Ken","action_notes":"We have the                                                           \nchemical list \ncreated and \nall sds sheets just need \n. Training for this was \ncompleted last month\nBrittney or Ken - can you save the list in the SQF folder?","due_raw":"Completed \n10/16/26","due_date":"","status":"done"},{"clause":"11.2.5.8","section":"sanitation","requirement":"Staff amenities, sanitary facilities, and other essential areas shall be inspected by qualified personnel at a defined frequency to ensure the areas are clean.","owner_raw":"Allen/Brittney","action_notes":"Restrooms are being cleaned, also need to document break areas\nDocument created will do training tonight","due_raw":"Completed \n10/19/26","due_date":"","status":"done"},{"clause":"11.2.5.9","section":"sanitation","requirement":"The responsibility and methods used to verify the effectiveness of the cleaning procedures shall be documented and implemented. A verification schedule shall be prepared.\nA record of pre-operational hygiene inspections, cleaning and sanitation activities, and verification activities shall be maintained.","owner_raw":"Allen/Brittney","action_notes":"Cleaning log, Pre Op\nhas already been \nImplemented and records\nkept. Working on a master cleaning schedule","due_raw":"","due_date":"2026-10-31","status":"open"},{"clause":"11.3.3.1","section":"clothing and personnel","requirement":"The site shall undertake a risk analysis to ensure that the clothing and hair policy protects materials, food, and food contact  surfaces from unintentional microbiological or physical contamination.","owner_raw":"Monica","action_notes":"Need time to complete","due_raw":"","due_date":"2026-10-31","status":"open"},{"clause":"11.3.3.8","section":"clothing and personnel","requirement":"Jewelry and other loose objects shall not be worn or taken into a food handling or processing operation or into any area where food is exposed. Wearing plain bands with no stones, prescribed medical alert bracelets, or jewelry accepted for religious or cultural reasons can be permitted, provided these items are properly covered and do not pose a food safety risk. \nAll exceptions shall meet regulatory and customer requirements and shall be subject to a risk assessment and evidence of ongoing risk management.","owner_raw":"Allen/Brittney","action_notes":"Already implemented. This requires frequent follow-up training and inspection. GMP form \nis filled out daily","due_raw":"Completed","due_date":"","status":"done"},{"clause":"11.4.1.1","section":"processing operations","requirement":"All personnel engaged in any food handling, preparation, or processing operations shall ensure that products and materials are handled and stored in such a way as to prevent damage or product contamination. They shall comply with the following processing practices:\ni. Personnel entry to processing areas shall be through the personnel access doors only;\nii. All doors are to be kept closed. Doors shall not be open for extended periods when access is required for waste removal or receiving of product/ingredient/packaging;\niii. Packaging, product, and ingredients shall be kept in appropriate containers as required and off the floor;\niv. Waste shall be contained in the bins identified for this purpose and removed from the processing area on a regular basis and not left to accumulate; and\nv. All wash down and compressed air hoses shall be stored on hose racks after use and not left on the floor.","owner_raw":"Allen/Brittney","action_notes":"Allen and Brittney will hold a \nmeeting this week to reinforce all GMP pracitces.","due_raw":"10/20/26 Completed","due_date":"","status":"done"},{"clause":"11.4.1.2","section":"processing operations","requirement":"Personnel working in or visiting food handling or processing operations shall ensure that:\ni. Staff shall not eat or taste any product being processed in the food handling/contact zones,\nexcept as noted in element 11.4.1.4;\nSQF Food Safety Code: Food Manufacturing, Edition 9 68\nPART B: The SQF Food Safety Code: Food Manufacturing – Module 11\nii. The wearing of false fingernails, false eyelashes, eyelash extensions, long nails, or fingernail\npolish is not permitted when handling exposed food;\niii. Hair restraints and beard covers, where applicable, shall be used in areas where product is\nexposed.\niv. Smoking, chewing, eating, or spitting is not permitted in areas where product is produced,\nstored, or otherwise exposed.\nv. Drinking water is permissible only under conditions that prevent contamination or other food\nsafety risks from occurring. Drinking water containers in production and storage areas shall\nbe stored in clear, covered containers, and in designated areas away from raw materials,\npackaging, tools, or equipment storage.","owner_raw":"Allen","action_notes":"As noted above re-train staff on GMP rules (no eating/chewing, no nail polish/false nails/lashes, hair and beard nets, water only in clear covered containers in a designated area). Cover at the 10/16 meeting with a sign-in sheet; post bilingual signs.","due_raw":"","due_date":"2026-10-20","status":"open"},{"clause":"11.4.1.3","section":"processing operations","requirement":"The flow of personnel in food processing and handling areas shall be managed such\nthat the potential for contamination is minimized.","owner_raw":"Allen\\Brittney\\Monica","action_notes":"Draft and post a personnel flow map (entry, handwash, Mixing to P-Mac, break room) and restrict traffic from warehouse/outside into production.\nWe have been in the process of improving this.","due_raw":"","due_date":"2026-10-20","status":"open"},{"clause":"11.4.1.4","section":"processing operations","requirement":"In circumstances where it is necessary to undertake sensory evaluations in a food handling/contact zone, the site shall implement controls and procedures to ensure:\ni. Food safety is not compromised;\nii. Sensory evaluations are conducted by authorized personnel only;\niii. A high standard of personal hygiene is practiced by personnel conducting sensory evaluations;\niv. Sensory evaluations are conducted in areas equipped for the purpose; and\nv. Equipment used for sensory evaluations is sanitized, maintained, and stored separately from processing equipment.","owner_raw":"Allen","action_notes":"Write a sensory evaluation procedure (authorized tasters only, designated area, sanitized utensils stored separately), or document that no tasting is done on the floor.","due_raw":"","due_date":"2026-10-20","status":"open"},{"clause":"11.5.1.2","section":"water supply","requirement":"Contingency plans shall be in place for instances when the potable water supply is deemed to be contaminated or otherwise inappropriate for use.","owner_raw":"Monica","action_notes":"Need to write a water contingency plan","due_raw":"","due_date":"2026-10-31","status":"open"},{"clause":"11.5.1.4","section":"water supply","requirement":"The delivery of water within the premises shall ensure potable water is not contaminated. Testing of the backflow system, where possible, shall be conducted at least annually and records shall be maintained.","owner_raw":"Michelle?","action_notes":"Need to call a plumber in to test and certify backflow system","due_raw":"","due_date":"","status":"open"},{"clause":"11.6.3.2","section":"storage","requirement":"Racks provided for the storage of packaging shall be constructed of impervious materials and designed to enable cleaning and inspection of the floors and behind the racks. Storage areas shall be cleaned at a pre-determined frequency.","owner_raw":"Allen/Brittney","action_notes":"Add warehouse racking to Master Sanitation Schedule","due_raw":"","due_date":"2026-10-31","status":"open"},{"clause":"11.6.4.2","section":"hazardous chemicals","requirement":"Storage of hazardous chemicals and toxic substances shall be:\ni. Located in an area with appropriate signage indicating that the area is for hazardous storage;\nii. Controlled, lockable, and accessible only by personnel trained in the storage and use of chemicals;\niii. Adequately ventilated;\niv. Stored where intended and not comingled (e.g., food versus non-food grade); \nv. Designed such that pesticides, rodenticides, fumigants, and insecticides are stored separately from sanitizers and detergents; and\nvi. Stored in a manner that prevents a hazard to finished product or product contact surfaces.\nProcessing utensils and packaging shall not be stored in areas used to store hazardous chemicals and toxic substances.","owner_raw":"Ken/Allen","action_notes":"Need a Flammable Storage Cabinet. \n\nAllen will review with Ken how to meet this requirement.","due_raw":"","due_date":"2026-10-23","status":"open"},{"clause":"11.6.4.4","section":"hazardous chemicals","requirement":"Daily supplies of chemicals used for continuous sanitizing of water, as a processing aid, or for emergency cleaning of food processing equipment and surfaces in food contact zones may be stored within or in close proximity to a processing area, provided that access to the chemical storage facility is restricted to only authorized personnel.","owner_raw":"Ken/Allen","action_notes":"Keep daily-use sanitizer at the diluter in a labeled, restricted area; post a list of trained/authorized personnel.","due_raw":"","due_date":"2026-10-16","status":"open"},{"clause":"11.6.4.5","section":"hazardous chemicals","requirement":"Personnel who handle hazardous chemicals and toxic substances, including pesticides and cleaning chemicals,:\ni. Shall be fully trained in the purpose of the hazardous chemicals and toxic substances, their storage, handling, and use;\nii. Be provided first aid equipment and personnel protective equipment (PPE); and\niii. Ensure compliance with the proper identification, storage, usage, disposal, and clean-up requirements.","owner_raw":"Ken/Allen","action_notes":"Training was completed\nlast month.\n\nKeep training records on file and verify PPE and first aid/eyewash are stocked near the chemical area.","due_raw":"","due_date":"2026-10-16","status":"open"},{"clause":"11.6.5.2","section":"loading/unloading","requirement":"Vehicles (e.g., trucks/vans/containers) used for transporting food within the site and from the site shall be inspected prior to loading to ensure they are clean, in good repair, suitable for the purpose, and free from odors or other conditions that may impact negatively on the product.","owner_raw":"Troy","action_notes":"Need a record for each delivery and shipment","due_raw":"Trailer Inspection forms created 9/16","due_date":"","status":"open"},{"clause":"2.1.1.3","section":"management responsibility","requirement":"The reporting structure shall identify and describe site personnel with specific responsibilities for tasks within the food safety management system and identify a backup for the absence of key personnel. \nJob descriptions for the key personnel shall be documented.\nSite management shall ensure departments and operations are appropriately staffed and organizationally aligned to meet food safety objectives.","owner_raw":"Michelle/Monica","action_notes":"Need Org chart from Matt to supervisors. Isn't this done? Let me know if you need the org chart in electronic form. MN 10/19/26","due_raw":"","due_date":"","status":"open"},{"clause":"2.1.1.4","section":"management responsibility","requirement":"Senior site management shall designate a primary and substitute SQF practitioner for each site with responsibility and authority to:\ni. Oversee the development, implementation, review, and maintenance of the SQF System;\nii. Take appropriate action to ensure the integrity of the SQF System; and\niii. Communicate to relevant personnel all information essential to ensure the effective implementation and maintenance of the SQF System.","owner_raw":"Monica","action_notes":"Monica can be primary. Does anyone else have HACCP or PCQI?\nBrittney has HACCP","due_raw":"","due_date":"","status":"open"},{"clause":"2.1.1.5","section":"management responsibility","requirement":"The primary and substitute SQF practitioner shall:\ni. Be employed by the site;\nii. Hold a position of responsibility related to the management of the site's SQF System;\niii. Have completed a HACCP training course;\niv. Be competent to implement and maintain HACCP based food safety plans; and\nv. Have an understanding of the SQF Food Safety Code: Food Manufacturing and the requirements to implement and maintain an SQF System relevant to the site's scope of certification","owner_raw":"Monica","action_notes":"Need to identify a backup\n\nBrittney is the Backup?","due_raw":"","due_date":"","status":"open"},{"clause":"2.1.1.6","section":"management responsibility","requirement":"Senior site management shall ensure the training needs of the site are resourced, implemented, and meet the requirements outlined in system elements 2.9 and that site personnel meet the required competencies to carry out those functions affecting the legality and safety of food products.","owner_raw":"Matt/Michelle","action_notes":"Need to hold trainings for GMP, Personal hygiene, Food Defense, Food Fraud, SQF, HACCP, Sanitation, Pest Control annually","due_raw":"","due_date":"","status":"open"},{"clause":"2.1.1.7","section":"management responsibility","requirement":"Senior site management shall ensure the integrity and continued operation of the food safety system in the event of organizational or personnel changes within the company or associated facilities.","owner_raw":"Matt/Michelle","action_notes":"Need adequate personnel to complete all tasks required","due_raw":"","due_date":"","status":"open"},{"clause":"2.1.2.1","section":"management review","requirement":"The SQF System shall be reviewed by senior site management at least annually and include:\ni. Changes to food safety management system documentation (policies, procedures, specifications, food safety plan);\nii. Food safety culture performance;\niii. Food safety objectives and performance measures;\niv. Corrective and preventative actions and trends in findings from internal and external audits, customer complaints, and verification and validation activities;\nv. Hazard and risk management system; and\nvi. Follow-up action items from previous management reviews.\nRecords of all management reviews and updates shall be maintained.","owner_raw":"All","action_notes":"Need a formal review once all are implemented","due_raw":"","due_date":"","status":"open"},{"clause":"2.1.2.2","section":"management review","requirement":"The SQF practitioner(s) shall update senior site management on at least a monthly basis on matters impacting the implementation and maintenance of the SQF System.\nThe updates and management responses shall be documented.","owner_raw":"All","action_notes":"Monthly Management meetings need to occur","due_raw":"","due_date":"","status":"open"},{"clause":"2.1.3.3","section":"complaint management","requirement":"Corrective and preventative action shall be implemented based on the seriousness of the incident and the root cause analysis as outlined in 2.5.3. Records of customer complaints, their investigation, and resolution shall be maintained.","owner_raw":"Monica/Brittney","action_notes":"Where are all the customer complaints \nsent?","due_raw":"","due_date":"","status":"open"},{"clause":"2.2.3.2","section":"records","requirement":"All records shall be legible and confirmed by those undertaking monitoring activities that demonstrate inspections, analyses, and other essential activities that have been completed.","owner_raw":"All","action_notes":"Brittney will conduct Good Document Training by 10/20","due_raw":"Completed 10/21/26","due_date":"","status":"done"},{"clause":"2.3.1.6","section":"product formulation","requirement":"Records of product design, formulations, label compliance, process flows, shelf life trials, and approvals for all new and existing products shall be maintained.","owner_raw":"Monica","action_notes":"Records missing or show inaccuracies - especially in label compliance","due_raw":"","due_date":"","status":"open"},{"clause":"2.3.2.2","section":"specifications","requirement":"Specifications for all raw materials and packaging, including, but not limited to, ingredients, additives, hazardous chemicals, processing aids, and packaging that impact finished product safety shall be documented and kept current.","owner_raw":"Brittney","action_notes":"Need specifications for all finished product. Specifications must match labels. Could these be living in Sales? Wondering about information we've given Customers? MN\nI am creating all FG Specs","due_raw":"","due_date":"2026-10-31","status":"open"},{"clause":"2.3.2.6","section":"specifications","requirement":"Verification of packaging shall include a certification of all packaging that comes into direct contact with food meets either regulatory acceptance or approval criteria. Documentation shall either be in the form of a declaration of continued guarantee of compliance, a certificate of conformance, or a certificate from the applicable regulatory agency.\nIn the absence of a certificate of conformance, certificate of analysis, or letter of guarantee, analyses to confirm the absence of potential chemical migration from the packaging to the food contents shall be conducted and records maintained.","owner_raw":"Brittney","action_notes":"Brittney has requested COC from packaging suppliers. Recieved COC from Belmark already","due_raw":"","due_date":"2026-10-16","status":"open"},{"clause":"2.3.2.7","section":"specifications","requirement":"Finished product labels shall be accurate, comply with the relevant legislation, and be approved by qualified company personnel.","owner_raw":"Brittney/Monica","action_notes":"We have identified inaccuracies. Need to update artwork as soon as possible and/or ingredient suppliers. Does someone have a list of all of these inaccuracies? MN 10/19/26","due_raw":"","due_date":"","status":"open"},{"clause":"2.3.2.8","section":"specifications","requirement":"Description of services for contract service providers that have an impact on product safety shall be documented, current, include a full description of the services to be provided, and detail relevant training requirements of all contract personnel.","owner_raw":"Michelle/Monica","action_notes":"Need a list of all contract service providers and what services they provide. Also need an agreement with each","due_raw":"","due_date":"","status":"open"},{"clause":"2.3.2.9","section":"specifications","requirement":"Finished product specifications shall be documented, current, approved by the site and its customer, accessible to relevant staff, and shall include, where applicable:\ni. Microbiological, chemical, and physical limits;\nii. Composition to meet label claims;\niii. Labeling and packaging requirements; and\niv. Storage conditions.","owner_raw":"Brittney/Monica","action_notes":"Need to develop finished product specs. What have we been supplying to our customers? MN 10/19/26\nI have been working on creating spec sheets for finished good but we do not do Microbioloical, chemical, testing","due_raw":"","due_date":"","status":"open"},{"clause":"2.3.2.10","section":"specifications","requirement":"Specifications for raw materials and packaging, chemicals, processing aids, contract services, and finished products shall be reviewed as changes occur that impact product safety. Records of reviews shall be maintained.\nA list of all the above specifications shall be maintained and kept current.","owner_raw":"Brittney/Monica","action_notes":"Should have all spec's on file. Need a master list of each to keep on file. Could this be saved in the 000 files on the G Drive? MN 10/19/26 \nWe already request spec sheets for every thing we use and file them in the G drive","due_raw":"","due_date":"","status":"open"},{"clause":"2.3.3.2","section":"contract manufacturers","requirement":"The site shall establish a method to determine the food safety risk level of contract manufactured product and shall document the risk. The site shall ensure that:\ni. Products and processes of co-manufacturers that are considered high-risk have undergone an audit by the site or third-party agency to confirm compliance with the SQF Food Safety Code: Food Manufacturing and regulatory and customer requirements;\nii. Products and processes of co-manufacturers that are considered low-risk meet the requirements of the SQF Food Safety Code: Food Manufacturing, or other GFSI benchmarked certification programs, and regulatory and customer requirements; and\niii. Changes to contractual agreements are approved by both parties and communicated to relevant personnel.","owner_raw":"Brittney","action_notes":"Need to gather all documents from Herman's. Has this been requested? MN 10/19/26\n The last I was told anything the seeds and nuts were seperate?\nHave I been left out of the loop or ? I have not request nor do I have a contact for Hermans BC","due_raw":"","due_date":"","status":"open"},{"clause":"2.3.4.2","section":"approved supplier","requirement":"The approved supplier program shall be based on the past performance of a supplier and the risk level of the raw materials, ingredients, processing aids, packaging, and services supplied, and shall contain at a minimum:\ni. Agreed specifications (refer to 2.3.2);\nii. Reference to the level of risk applied to raw materials, ingredients, packaging, and services from the approved supplier;\niii. A summary of the food safety controls implemented by the approved supplier;\niv. Methods for granting approved supplier status;\nv. Methods and frequency of monitoring approved suppliers;\nvi. Details of the certificates of conformance, if required; and\nvii. Methods and frequency of reviewing approved supplier performance and status.","owner_raw":"Brittney/Monica","action_notes":"Missing: \nFirehouse\nADM 1 doc","due_raw":"","due_date":"2026-10-23","status":"open"},{"clause":"2.3.4.6","section":"approved supplier","requirement":"Supplier audits shall be based on risk (as determined in 2.3.4.2) and shall be conducted by individuals knowledgeable of applicable regulatory and food safety requirements and trained in auditing techniques.","owner_raw":"Monica","action_notes":"Need to create a risk for all suppliers","due_raw":"","due_date":"","status":"open"},{"clause":"2.4.5.2","section":"non-conforming product","requirement":"Quarantine records and records of the handling, corrective action, or disposal of nonconforming materials or product shall be maintained.","owner_raw":"Brittney","action_notes":"Need to ensure we have all documented and logged. What form are we using for this? Where will these files be stored? MN 10/19/26","due_raw":"","due_date":"","status":"open"},{"clause":"2.4.7.1","section":"product release","requirement":"The responsibility and methods for releasing products shall be documented and implemented. The methods applied shall ensure the product is released by authorized personnel, and only after all inspections and analyses are successfully completed and documented to verify legislative and other established food safety controls have been met.\nRecords of all product releases shall be maintained.","owner_raw":"Troy/Brittney","action_notes":"Need to verify we have records for all outbound shipments. We also need to create a product release procedure. Is this the \"scanner\" plan? MN 10/19/26","due_raw":"","due_date":"","status":"open"},{"clause":"2.5.3.2","section":"capa","requirement":"Records of all investigation, root cause analysis, and resolution of non-conformities, their corrections, and the implementation of preventative actions shall be maintained.","owner_raw":"Brittney/Monica","action_notes":"Need to document and log all CAPA's","due_raw":"","due_date":"","status":"open"},{"clause":"2.5.4.2","section":"internal audits","requirement":"Staff conducting internal audits shall be trained and competent in internal audit procedures. Where practical, staff conducting internal audits shall be independent of the function being audited.","owner_raw":"Monica","action_notes":"Monica has IA training, need to train others so more people can conduct IA.","due_raw":"","due_date":"","status":"open"},{"clause":"2.5.4.4","section":"internal audits","requirement":"Records of internal audits and inspections and any corrective and preventative actions taken as a result of internal audits shall be recorded as per 2.5.3. \nChanges implemented from internal audits that have an impact on the site's ability to deliver safe food shall require a review of applicable aspects of the SQF System (refer to 2.3.1.3).","owner_raw":"Monica","action_notes":"Once we are audit ready, we can conduct a IA. \nThis file will act as IA","due_raw":"","due_date":"","status":"open"},{"clause":"2.6.2.1","section":"traceability","requirement":"The responsibility and methods used to trace product shall be documented and implemented to ensure:\ni. Finished product is traceable at least one step forward to the customer and at least one step back from the process to the manufacturing supplier;\nii. The receipt dates of raw materials, ingredients, food contact packaging and materials, and\nother inputs are recorded (refer to 2.8.1.8 for traceback of allergen containing food products.);\niii. Traceability is maintained where product is reworked (refer to 2.4.6); and\niv. The effectiveness of the product trace system is reviewed at least annually, as part of the product recall and withdrawal review (refer to 2.6.3.2).\nRecords of raw and packaging material receipt and use and finished product dispatch and destination shall be maintained.","owner_raw":"All","action_notes":"Need to successfully conduct a traceability exercise. Must go from the supplier to the customer.","due_raw":"","due_date":"","status":"open"},{"clause":"2.6.3.2","section":"traceability","requirement":"The product withdrawal and recall system shall be reviewed, tested, and verified as effective at least annually. Testing shall include incoming materials (minimum traceability one step back) and finished product (minimum traceability one step forward).\nTesting shall be carried out on products from different shifts and for materials (including bulk materials) that are used across a range of products and/or products that are shipped to a wide range of customers.","owner_raw":"All","action_notes":"Need to successfully conduct a recall exercise. Must go from the supplier to the customer.","due_raw":"","due_date":"","status":"open"},{"clause":"2.6.4.1","section":"crisis management","requirement":"A crisis management plan based on the understanding of known potential dangers (e.g., flood, drought, fire, tsunami, or other severe weather events, warfare or civil unrest, computer outage, pandemic, loss of electricity or refrigeration, ammonia leak, labor strike) that can impact the site's ability to deliver safe food shall be documented by senior management, outlining the methods and responsibility the site shall implement to cope with such a business crisis. The crisis management plan shall include at a minimum:\ni. A senior manager responsible for decision making, oversight, and initiating actions arising from a crisis management incident;\nii. The nomination and training of a crisis management team;\niii. The controls implemented to ensure any responses do not compromise product safety;\niv. The measures to isolate and identify product affected by a response to a crisis;\nv. The measures taken to verify the acceptability of food prior to release;\nvi. The preparation and maintenance of a current crisis alert contact list, including supply chain customers;\nvii. Sources of legal and expert advice; and \nviii. The responsibility for internal communications and communicating with authorities, external organizations, and media.","owner_raw":"Monica","action_notes":"Need to create a plan","due_raw":"","due_date":"","status":"open"},{"clause":"2.6.4.2","section":"crisis management","requirement":"The crisis management plan shall be reviewed, tested, and verified at least annually with gaps and appropriate corrective actions documented. Records of reviews of the crisis management plan shall be maintained.","owner_raw":"Monica","action_notes":"Need to test and verify the plan","due_raw":"","due_date":"","status":"open"},{"clause":"2.7.1.2","section":"food defense","requirement":"A food defense plan shall be documented, implemented, and maintained based on the threat assessment (refer to 2.7.1.1). The food defense plan shall meet legislative requirements as applicable and shall include at a minimum:\ni. The methods, responsibility, and criteria for preventing food adulteration caused by a deliberate act of sabotage or terrorist-like incident;\nii. The name of the senior site management person responsible for food defense;\niii. The methods implemented to ensure only authorized personnel have access to production equipment and vehicles, manufacturing, and storage areas through designated access points;\niv. The methods implemented to protect sensitive processing points from intentional adulteration;\nv. The measures taken to ensure the secure receipt and storage of raw materials, ingredients, packaging, equipment, and hazardous chemicals to protect them from deliberate acts of sabotage or terrorist-like incidents;\nvi. The measures implemented to ensure raw materials, ingredients, packaging (including labels), work-in-progress, process inputs, and finished products are held under secure storage and transportation conditions; and\nvii. The methods implemented to record and control access to the premises by site personnel, contractors, and visitors.","owner_raw":"Monica","action_notes":"Need to document a food defense plan","due_raw":"","due_date":"","status":"open"},{"clause":"2.7.1.3","section":"food defense","requirement":"Instruction shall be provided to all relevant staff on the effective implementation of the food defense plan (refer to 2.9.2.1).","owner_raw":"Monica","action_notes":"train staff","due_raw":"","due_date":"","status":"open"},{"clause":"2.7.1.4","section":"food defense","requirement":"The food defense threat assessment and prevention plan shall be reviewed and tested at least annually or when the threat level, as defined in the threat assessment, changes. Records of reviews and tests of the food defense plan shall be maintained.","owner_raw":"Monica","action_notes":"Need to conduct a threat assessment and test","due_raw":"","due_date":"","status":"open"},{"clause":"2.7.2.2","section":"food fraud","requirement":"A food fraud mitigation plan shall be developed and implemented that specifies the methods by which the identified food fraud vulnerabilities shall be controlled, including identified food safety vulnerabilities of ingredients and materials.","owner_raw":"Monica","action_notes":"Need to create a mitigation plan","due_raw":"","due_date":"","status":"open"},{"clause":"2.7.2.3","section":"food fraud","requirement":"Instruction shall be provided to all relevant staff on the effective implementation of the food fraud mitigation plan (refer to 2.9.2.1).","owner_raw":"Monica","action_notes":"train staff","due_raw":"","due_date":"","status":"open"},{"clause":"2.7.2.4","section":"food fraud","requirement":"The food fraud vulnerability assessment and mitigation plan shall be reviewed and verified at least annually with gaps and corrective actions documented. Records of reviews shall be maintained.","owner_raw":"Monica","action_notes":"need to conduct a vulnerability assessment and mitigation plan review","due_raw":"","due_date":"","status":"open"},{"clause":"2.8.1.1","section":"allergens","requirement":"The responsibility and methods used to control allergens and to prevent sources of allergens from contaminating product shall be documented and implemented. The allergen management program shall include:\ni. A risk analysis of those raw materials, ingredients, and processing aids, including food grade lubricants, that contain food allergens;\nii. An assessment of workplace-related food allergens that may originate from locker rooms, vending machines, lunchrooms, and visitors;\niii. A list of allergens that is applicable in the country of manufacture and the country(ies) of destination, if known;\niv. A list of allergens that is accessible to relevant staff;\nv. The control of hazards associated with allergens and incorporated into the food safety plan, and\nvi. Management plans for control of the identified allergens.","owner_raw":"Monica/Brittney/Allen","action_notes":"Need a full allergen plan, including lunchroom allergens, create a master list for staff to reference","due_raw":"","due_date":"","status":"open"},{"clause":"2.8.1.4","section":"allergens","requirement":"Where allergenic material may be intentionally or unintentionally present cleaning and sanitation of product contact surfaces between line changeovers shall be effective, appropriate to the risk and legal requirements, and sufficient to remove all potential target allergens from product contact surfaces, including aerosols as appropriate, to prevent cross-contact.\nSeparate handling and production equipment shall be provided, where satisfactory line hygiene and clean-up or segregation are not possible.","owner_raw":"Monica","action_notes":"","due_raw":"","due_date":"","status":"open"},{"clause":"2.8.1.5","section":"allergens","requirement":"Based on risk assessment, procedures for validation and verification of the effectiveness of the cleaning and sanitation of areas and equipment in which allergens are used shall be documented and effectively implemented.","owner_raw":"Monica","action_notes":"Need to verify allergen cleaning effectiveness.","due_raw":"","due_date":"","status":"open"},{"clause":"2.8.1.9","section":"allergens","requirement":"The site shall document and implement methods to control the accuracy of finished product labels (or consumer information where applicable) and assure work-in progress and finished product are true to label with regard to allergens. Measures may include label approvals at receipt, label reconciliations during production, destruction of obsolete labels, verification of labels on finished product as appropriate, and product change over procedures.","owner_raw":"Monica/Brittney/Allen","action_notes":"Label all raw materials with allergens present in each - sticker pallets or individual units\nThe best way I have seen this be done and work is a colored label with a referance page posted near the product BC 10/23/26","due_raw":"","due_date":"","status":"open"},{"clause":"2.9.2.1","section":"training","requirement":"A training program shall be documented and implemented that at a minimum outlines the necessary competencies for specific duties and the training methods to be applied to personnel carrying out tasks associated with:\ni. Implementing HACCP for staff involved in developing and maintaining food safety plans;\nii. Monitoring and corrective action procedures for all staff engaged in monitoring critical control points (CCPs);\niii. Personal hygiene for all staff involved in the handling of food products and food contact surfaces;\niv. Good Manufacturing Practices and work instructions for all staff engaged in food handling, food processing, and equipment;\nv. Sampling and test methods for all staff involved in sampling and testing of raw materials, packaging, work-in-progress, and finished products;\nvi. Environmental monitoring for relevant staff;\nvii. Allergen management, food defense, and food fraud for all relevant staff; and\nviii. Tasks identified as critical to meeting the effective implementation and maintenance of the SQF code.\nThe training program shall include provisions for identifying and implementing the refresher training needs of the organization.","owner_raw":"Ken/Brittney","action_notes":"Need training for HACCP, Metal Detector, Personal hygiene, GMP, sampling and testing materials, environmental (QA), Allergens, food defense, food fraud, food defense, SQF, Shipping/receiving (those involved with this)","due_raw":"Completed with everyone on \nthe floor but missing a few \npeople in the office for training\n Matt, Michelle, and Troy 10/23/26 BC","due_date":"","status":"done"},{"clause":"2.9.2.2","section":"training","requirement":"Training materials, the delivery of training, and procedures on all tasks critical to meeting regulatory compliance and the maintenance of food safety shall be provided in language(s) understood by staff.","owner_raw":"Ken/Brittney","action_notes":"Ken is developing materials and conducting trainings. approximately 3 hours of training needed for each employee.","due_raw":"","due_date":"","status":"open"},{"clause":"2.9.2.3","section":"training","requirement":"Training records shall be maintained and include:\ni. Participant name;\nii. Skills description;\niii. Description of the training provided;\niv. Date training completed;\nv. Trainer or training provider; and\nvi. Verification that the trainee is competent to complete the required tasks.","owner_raw":"Ken/Brittney\nKen is helping manage this project","action_notes":"need to create a master spreadsheet with all of this information","due_raw":"","due_date":"","status":"open"}];

  var I18N = {
    en: {
      title: "SQF Tasks",
      hint: "Outstanding SQF items. After the one-time import, this screen is the live list. Export a file when Monica needs to update her sheet.",
      source: "Drive source file",
      daysUntil: "{n} days until the SQF audit ({d})",
      dayUntil: "1 day until the SQF audit ({d})",
      auditToday: "SQF audit is today ({d})",
      auditPassed: "SQF audit date has passed ({d})",
      open: "Open",
      past: "Past due",
      progress: "In progress",
      done: "Done",
      blocked: "Blocked",
      anyOwner: "Any owner",
      section: "Section",
      anySection: "All sections",
      status: "Status",
      anyStatus: "All statuses",
      module: "Module",
      anyModule: "Modules 2 and 11",
      mod2: "Module 2",
      mod11: "Module 11",
      pastOnly: "Past due only",
      search: "Search clause, notes, or owner",
      clause: "Clause",
      requirement: "Requirement",
      owners: "Owners",
      notes: "Action notes",
      due: "Due",
      evidence: "Evidence",
      noDate: "No date",
      full: "Full text",
      hide: "Hide text",
      edit: "Edit",
      save: "Save",
      cancel: "Cancel",
      markDone: "Mark done",
      reopen: "Reopen",
      exportCsv: "Export CSV",
      exportXlsx: "Export Excel",
      showing: "Showing {n} of {t}",
      empty: "No tasks match these filters.",
      loading: "Loading SQF tasks...",
      cloudErr: "Could not load SQF tasks.",
      localNote: "This browser is not on the shared cloud list. Edits stay on this device.",
      saved: "Saved",
      saveErr: "Could not save",
      sheetOwner: "Original sheet owner text",
      evidenceUrl: "Evidence link",
      evidenceNote: "Evidence note",
      completed: "Completed",
      close: "Close",
      seeded: "Imported {n} SQF tasks",
      dry: "Dry run only. Nothing was written.",
      undated: "Undated open",
      target: "New due date",
      redateSelected: "Set selected",
      redateOpen: "Set all open",
      selectShown: "Select shown",
      clearSelected: "Clear selection",
      redateHint: "Select past due or undated, then set the due date. Selecting does not change anything until you set the date. Notes and status stay as they are. All open means not done.",
      selectPast: "Select past due",
      selectUndated: "Select undated",
      mb: "Monica or Brittney",
      redateNeed: "Pick a due date first.",
      redateNone: "No tasks to re-date.",
      redateAsk: "Set {n} tasks to {d}? Notes and status stay the same.",
      redateDone: "Due date set on {n} tasks.",
      redatePartial: "Due date set on {n} of {t} tasks."
    },
    es: {
      title: "Tareas SQF",
      hint: "Items pendientes de SQF. Despues de la importacion unica, esta pantalla es la lista viva. Exporte un archivo cuando Monica necesite actualizar su hoja.",
      source: "Archivo de origen en Drive",
      daysUntil: "{n} dias para la auditoria SQF ({d})",
      dayUntil: "1 dia para la auditoria SQF ({d})",
      auditToday: "La auditoria SQF es hoy ({d})",
      auditPassed: "La fecha de auditoria SQF ya paso ({d})",
      open: "Abiertos",
      past: "Vencidos",
      progress: "En proceso",
      done: "Hechos",
      blocked: "Bloqueado",
      anyOwner: "Cualquier responsable",
      section: "Seccion",
      anySection: "Todas las secciones",
      status: "Estado",
      anyStatus: "Todos los estados",
      module: "Modulo",
      anyModule: "Modulos 2 y 11",
      mod2: "Modulo 2",
      mod11: "Modulo 11",
      pastOnly: "Solo vencidos",
      search: "Buscar clausula, notas o responsable",
      clause: "Clausula",
      requirement: "Requisito",
      owners: "Responsables",
      notes: "Notas de accion",
      due: "Fecha",
      evidence: "Evidencia",
      noDate: "Sin fecha",
      full: "Texto completo",
      hide: "Ocultar texto",
      edit: "Editar",
      save: "Guardar",
      cancel: "Cancelar",
      markDone: "Marcar hecho",
      reopen: "Reabrir",
      exportCsv: "Exportar CSV",
      exportXlsx: "Exportar Excel",
      showing: "Mostrando {n} de {t}",
      empty: "Ninguna tarea coincide con estos filtros.",
      loading: "Cargando tareas SQF...",
      cloudErr: "No se pudieron cargar las tareas SQF.",
      localNote: "Este navegador no esta en la lista compartida. Los cambios quedan en este equipo.",
      saved: "Guardado",
      saveErr: "No se pudo guardar",
      sheetOwner: "Texto original del responsable",
      evidenceUrl: "Enlace de evidencia",
      evidenceNote: "Nota de evidencia",
      completed: "Completado",
      close: "Cerrar",
      seeded: "Se importaron {n} tareas SQF",
      dry: "Solo simulacion. No se escribio nada.",
      undated: "Abiertos sin fecha",
      target: "Nueva fecha",
      redateSelected: "Fecha a los marcados",
      redateOpen: "Fecha a todos los abiertos",
      selectShown: "Marcar los visibles",
      clearSelected: "Quitar marcas",
      redateHint: "Marque vencidos o sin fecha, luego ponga la fecha. Marcar no cambia nada hasta que ponga la fecha. Las notas y el estado se quedan. Todos los abiertos significa que no estan hechos.",
      selectPast: "Marcar vencidos",
      selectUndated: "Marcar sin fecha",
      mb: "Monica o Brittney",
      redateNeed: "Elija una fecha primero.",
      redateNone: "No hay tareas para fechar.",
      redateAsk: "Poner {n} tareas en {d}? Las notas y el estado se quedan igual.",
      redateDone: "Fecha puesta en {n} tareas.",
      redatePartial: "Fecha puesta en {n} de {t} tareas."
    },
    pt: {
      title: "Tarefas SQF",
      hint: "Itens pendentes do SQF. Depois da importacao unica, esta tela e a lista viva. Exporte um arquivo quando a Monica precisar atualizar a planilha.",
      source: "Arquivo de origem no Drive",
      daysUntil: "{n} dias para a auditoria SQF ({d})",
      dayUntil: "1 dia para a auditoria SQF ({d})",
      auditToday: "A auditoria SQF e hoje ({d})",
      auditPassed: "A data da auditoria SQF ja passou ({d})",
      open: "Abertas",
      past: "Vencidas",
      progress: "Em andamento",
      done: "Feitas",
      blocked: "Bloqueado",
      anyOwner: "Qualquer responsavel",
      section: "Secao",
      anySection: "Todas as secoes",
      status: "Status",
      anyStatus: "Todos os status",
      module: "Modulo",
      anyModule: "Modulos 2 e 11",
      mod2: "Modulo 2",
      mod11: "Modulo 11",
      pastOnly: "So vencidas",
      search: "Buscar clausula, notas ou responsavel",
      clause: "Clausula",
      requirement: "Requisito",
      owners: "Responsaveis",
      notes: "Notas de acao",
      due: "Data",
      evidence: "Evidencia",
      noDate: "Sem data",
      full: "Texto completo",
      hide: "Ocultar texto",
      edit: "Editar",
      save: "Salvar",
      cancel: "Cancelar",
      markDone: "Marcar feita",
      reopen: "Reabrir",
      exportCsv: "Exportar CSV",
      exportXlsx: "Exportar Excel",
      showing: "Mostrando {n} de {t}",
      empty: "Nenhuma tarefa combina com estes filtros.",
      loading: "Carregando tarefas SQF...",
      cloudErr: "Nao foi possivel carregar as tarefas SQF.",
      localNote: "Este navegador nao esta na lista compartilhada. As edicoes ficam neste aparelho.",
      saved: "Salvo",
      saveErr: "Nao foi possivel salvar",
      sheetOwner: "Texto original do responsavel",
      evidenceUrl: "Link da evidencia",
      evidenceNote: "Nota da evidencia",
      completed: "Concluido",
      close: "Fechar",
      seeded: "{n} tarefas SQF importadas",
      dry: "Somente simulacao. Nada foi gravado.",
      undated: "Abertas sem data",
      target: "Nova data",
      redateSelected: "Data nas marcadas",
      redateOpen: "Data em todas as abertas",
      selectShown: "Marcar as visiveis",
      clearSelected: "Limpar marcas",
      redateHint: "Marque vencidas ou sem data, depois coloque a data. Marcar nao muda nada ate colocar a data. Notas e status ficam. Todas as abertas significa que nao estao feitas.",
      selectPast: "Marcar vencidas",
      selectUndated: "Marcar sem data",
      mb: "Monica ou Brittney",
      redateNeed: "Escolha uma data primeiro.",
      redateNone: "Nao ha tarefas para datar.",
      redateAsk: "Colocar {n} tarefas em {d}? Notas e status ficam iguais.",
      redateDone: "Data colocada em {n} tarefas.",
      redatePartial: "Data colocada em {n} de {t} tarefas."
    }
  };

  var MONTHS = {
    en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    es: ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"],
    pt: ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]
  };

  var cfg = root.SMACKIN_CONFIG || {};
  var doc = root.document;
  var sb = null;
  var rows = null;
  var active = false;
  var editClause = null;
  var expanded = {};
  var loadError = "";
  var filters = { owner: "", section: "", status: "", module: "", past: false, undated: false, q: "" };
  var picked = {};
  var targetDate = "";
  var redateBusy = false;
  var seedPromise = null;

  function tx(key) {
    var pack = I18N[lang()] || I18N.en;
    return pack[key] || I18N.en[key] || key;
  }
  function lang() {
    if (!doc) return "en";
    var es = doc.getElementById("lang-es");
    var pt = doc.getElementById("lang-pt");
    if (es && es.classList.contains("active")) return "es";
    if (pt && pt.classList.contains("active")) return "pt";
    return "en";
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function toast(m) {
    if (root.UI && typeof root.UI.toast === "function") {
      try { root.UI.toast(m); return; } catch (e) {}
    }
    var t = doc && doc.getElementById("toast");
    if (!t) return;
    t.textContent = m;
    t.classList.add("show");
    setTimeout(function () { t.classList.remove("show"); }, 2200);
  }
  function todayDenver() {
    try {
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Denver", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    } catch (e) {
      return new Date().toISOString().slice(0, 10);
    }
  }
  function auditDate() {
    var d = String((root.SMACKIN_CONFIG || {}).SQF_AUDIT_DATE || "2027-01-31").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : "2027-01-31";
  }
  function daysUntil(iso, today) {
    var a = Date.parse(today + "T12:00:00Z");
    var b = Date.parse(iso + "T12:00:00Z");
    return Math.round((b - a) / 86400000);
  }
  function prettyDate(iso) {
    var p = String(iso || "").split("-");
    if (p.length < 3) return iso || "";
    var names = MONTHS[lang()] || MONTHS.en;
    var month = names[(parseInt(p[1], 10) || 1) - 1] || p[1];
    return month + " " + String(parseInt(p[2], 10)) + ", " + p[0];
  }
  function usDate(iso) {
    var p = String(iso || "").slice(0, 10).split("-");
    if (p.length < 3 || !p[0]) return "";
    return p[1] + "/" + p[2] + "/" + p[0];
  }
  function clip(s, n) {
    var t = String(s || "").replace(/\s+/g, " ").trim();
    if (t.length <= n) return t;
    return t.slice(0, n - 3) + "...";
  }
  function titleSection(s) {
    var t = String(s || "").trim();
    if (!t) return "";
    if (t.toLowerCase() === "capa") return "CAPA";
    var small = { and: 1, of: 1, the: 1, to: 1, for: 1 };
    return t.replace(/[A-Za-z]+/g, function (w, offset) {
      var low = w.toLowerCase();
      if (offset > 0 && small[low]) return low;
      return low.charAt(0).toUpperCase() + low.slice(1);
    });
  }
  function parseOwners(raw) {
    var text = String(raw == null ? "" : raw);
    var found = [];
    OWNERS.forEach(function (name) {
      var re = new RegExp("\\b" + name + "\\b", "i");
      if (re.test(text)) found.push(name);
    });
    var lower = text.toLowerCase();
    found.sort(function (a, b) {
      return lower.indexOf(a.toLowerCase()) - lower.indexOf(b.toLowerCase());
    });
    return found;
  }
  function moduleOf(clause) {
    var n = parseInt(String(clause || "").split(".")[0], 10);
    if (n === 11 || n === 2) return n;
    return null;
  }
  function completedDate(status, dueRaw) {
    if (status !== "done") return null;
    var m = String(dueRaw || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    var year = m[3].length === 2 ? 2000 + parseInt(m[3], 10) : parseInt(m[3], 10);
    var month = String(m[1]).padStart(2, "0");
    var day = String(m[2]).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }
  function buildRow(src) {
    var clause = String(src.clause || "").trim();
    var status = String(src.status || "open").trim();
    if (STATUSES.indexOf(status) < 0) status = "open";
    var due = String(src.due_date || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) due = null;
    var dueRaw = String(src.due_raw || "").trim();
    return {
      clause: clause,
      module: moduleOf(clause),
      section: titleSection(src.section),
      requirement: String(src.requirement || "").trim(),
      owner_raw: String(src.owner_raw == null ? "" : src.owner_raw).trim(),
      owners: parseOwners(src.owner_raw),
      action_notes: String(src.action_notes || "").trim(),
      due_date: due,
      due_raw: dueRaw || null,
      status: status,
      completed_date: completedDate(status, src.due_raw),
      source_file_id: SOURCE_FILE_ID,
      updated_by: "sqf-import"
    };
  }
  function parseCsv(text) {
    var s = String(text || "").replace(/^\uFEFF/, "");
    var rowsOut = [];
    var row = [];
    var cur = "";
    var i = 0;
    var q = false;
    while (i < s.length) {
      var c = s.charAt(i);
      if (q) {
        if (c === '"') {
          if (s.charAt(i + 1) === '"') { cur += '"'; i += 2; continue; }
          q = false;
          i++;
          continue;
        }
        cur += c;
        i++;
        continue;
      }
      if (c === '"') { q = true; i++; continue; }
      if (c === ",") { row.push(cur); cur = ""; i++; continue; }
      if (c === "\n" || c === "\r") {
        if (c === "\r" && s.charAt(i + 1) === "\n") i++;
        row.push(cur);
        rowsOut.push(row);
        row = [];
        cur = "";
        i++;
        continue;
      }
      cur += c;
      i++;
    }
    if (cur.length || row.length) { row.push(cur); rowsOut.push(row); }
    if (!rowsOut.length) return [];
    var head = rowsOut[0];
    var out = [];
    for (var r = 1; r < rowsOut.length; r++) {
      if (rowsOut[r].length === 1 && rowsOut[r][0] === "") continue;
      var obj = {};
      for (var h = 0; h < head.length; h++) obj[head[h]] = rowsOut[r][h] == null ? "" : rowsOut[r][h];
      if (!String(obj.clause || "").trim()) continue;
      out.push(obj);
    }
    return out;
  }

  var SEED = RAW.map(buildRow);

  function cloneRows(list) {
    return (list || []).map(function (r) {
      var o = {};
      Object.keys(r).forEach(function (k) { o[k] = r[k]; });
      o.owners = (r.owners || []).slice();
      return o;
    });
  }
  function isPastDue(row, today) {
    if (!row || row.status === "done" || !row.due_date) return false;
    return String(row.due_date).slice(0, 10) < today;
  }
  function isOpenWork(row) {
    return !!row && row.status !== "done";
  }
  function isUndatedOpen(row) {
    return isOpenWork(row) && !row.due_date;
  }
  function counts(list, today) {
    var c = { open: 0, past: 0, undated: 0, in_progress: 0, done: 0, blocked: 0, total: (list || []).length };
    (list || []).forEach(function (r) {
      if (r.status === "open") c.open++;
      else if (r.status === "in_progress") c.in_progress++;
      else if (r.status === "done") c.done++;
      else if (r.status === "blocked") c.blocked++;
      if (isPastDue(r, today)) c.past++;
      if (isUndatedOpen(r)) c.undated++;
    });
    return c;
  }
  function redatePlan(list, clauses, date) {
    var iso = String(date || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return { ok: false, error: "date", date: "", rows: [] };
    var want = {};
    (clauses || []).forEach(function (c) { if (c) want[String(c)] = 1; });
    var out = [];
    (list || []).forEach(function (r) {
      if (!r || !want[String(r.clause)]) return;
      out.push({
        clause: r.clause,
        due_date: iso,
        status: r.status,
        action_notes: r.action_notes || "",
        due_raw: r.due_raw || null,
        completed_date: r.completed_date || null,
        owners: (r.owners || []).slice()
      });
    });
    return { ok: true, date: iso, rows: out };
  }
  function redatePayload(date, by, at) {
    return { due_date: date, updated_by: by, updated_at: at };
  }
  function applyDueOnly(row, date, by, at) {
    if (!row) return null;
    row.due_date = date;
    if (by) row.updated_by = by;
    if (at) row.updated_at = at;
    return {
      due_date: row.due_date,
      status: row.status,
      action_notes: row.action_notes || "",
      due_raw: row.due_raw || null,
      completed_date: row.completed_date || null
    };
  }
  function filterRows(list, f, today) {
    f = f || {};
    var q = String(f.q || "").toLowerCase().trim();
    return (list || []).filter(function (r) {
      if (f.owner === "mb") {
        var names = r.owners || [];
        if (names.indexOf("Monica") < 0 && names.indexOf("Brittney") < 0) return false;
        if (r.status === "done") return false;
      } else if (f.owner && (r.owners || []).indexOf(f.owner) < 0) return false;
      if (f.section && r.section !== f.section) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.module && String(r.module) !== String(f.module)) return false;
      if (f.past && !isPastDue(r, today)) return false;
      if (f.undated && !isUndatedOpen(r)) return false;
      if (q) {
        var blob = [r.clause, r.section, r.requirement, r.owner_raw, (r.owners || []).join(" "), r.action_notes, r.due_raw, r.evidence_note].join(" ").toLowerCase();
        if (blob.indexOf(q) < 0) return false;
      }
      return true;
    });
  }
  function sortRows(list) {
    return list.slice().sort(function (a, b) {
      var ma = a.module || 0;
      var mb = b.module || 0;
      if (ma !== mb) return mb - ma;
      var pa = String(a.clause || "").split(".").map(function (n) { return parseInt(n, 10) || 0; });
      var pb = String(b.clause || "").split(".").map(function (n) { return parseInt(n, 10) || 0; });
      var len = Math.max(pa.length, pb.length);
      for (var i = 0; i < len; i++) {
        var d = (pa[i] || 0) - (pb[i] || 0);
        if (d) return d;
      }
      return 0;
    });
  }
  function displaySort(list, today) {
    return (list || []).slice().sort(function (a, b) {
      function rank(r) {
        if (isPastDue(r, today)) return 0;
        if (isUndatedOpen(r)) return 1;
        if (isOpenWork(r)) return 2;
        return 3;
      }
      var d = rank(a) - rank(b);
      if (d) return d;
      if (rank(a) === 0) return String(a.due_date || "").localeCompare(String(b.due_date || ""));
      return 0;
    });
  }
  function sectionsOf(list) {
    var seen = {};
    var out = [];
    (list || []).forEach(function (r) {
      if (r.section && !seen[r.section]) { seen[r.section] = 1; out.push(r.section); }
    });
    out.sort();
    return out;
  }
  function statusLabel(status) {
    if (status === "in_progress") return tx("progress");
    if (status === "done") return tx("done");
    if (status === "blocked") return tx("blocked");
    return tx("open");
  }
  function pillClass(status) {
    if (status === "done") return "ok";
    if (status === "in_progress") return "sqf-prog";
    if (status === "blocked") return "out";
    return "low";
  }

  function isCloud() {
    return !!(root.DB && root.DB.mode === "cloud" && root.supabase && cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY);
  }
  function client() {
    if (!root.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    if (!sb) {
      try {
        sb = root.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "sqf-tasks-auth" }
        });
      } catch (e) { sb = null; }
    }
    return sb;
  }
  function lsGet() {
    try {
      var v = root.localStorage.getItem(LS_ROWS);
      return v ? JSON.parse(v) : [];
    } catch (e) { return []; }
  }
  function lsSet(list) {
    try { root.localStorage.setItem(LS_ROWS, JSON.stringify(list)); } catch (e) {}
  }
  function flagDone() {
    try { return root.localStorage.getItem(FLAG) || ""; } catch (e) { return ""; }
  }
  function markFlag() {
    try { root.localStorage.setItem(FLAG, new Date().toISOString()); } catch (e) {}
  }
  function modeFlag() {
    var q = "";
    try { q = String(root.location && root.location.search || ""); } catch (e) { q = ""; }
    if (/sqfseed=dry/.test(q)) return "dry";
    if (/sqfseed=force/.test(q)) return "force";
    return "";
  }
  function who() {
    try {
      var email = root.localStorage.getItem("smk-email");
      if (email) return String(email).slice(0, 80);
    } catch (e) {}
    return "smackin-os";
  }
  function asOwners(v) {
    if (Array.isArray(v)) return v.filter(Boolean);
    if (v == null || v === "") return [];
    return String(v).replace(/^\{|\}$/g, "").split(",").map(function (s) {
      return s.replace(/^"|"$/g, "").trim();
    }).filter(Boolean);
  }
  function findRow(clause) {
    var list = rows || [];
    for (var i = 0; i < list.length; i++) if (list[i].clause === clause) return list[i];
    return null;
  }

  function seedPayload(list) {
    return list.map(function (r) {
      return {
        clause: r.clause,
        module: r.module,
        section: r.section,
        requirement: r.requirement,
        owner_raw: r.owner_raw,
        owners: r.owners || [],
        action_notes: r.action_notes || "",
        due_date: r.due_date || null,
        due_raw: r.due_raw || null,
        status: r.status || "open",
        completed_date: r.completed_date || null,
        source_file_id: SOURCE_FILE_ID,
        updated_by: "sqf-import"
      };
    });
  }

  var seeding = false;
  function run() {
    var flag = modeFlag();
    if (flag !== "force" && flag !== "dry" && flagDone()) return Promise.resolve(true);
    if (!isCloud() || !client() || seeding) return Promise.resolve(false);
    seeding = true;
    if (flag === "dry") {
      console.log("[sqf-seed] dry", SEED.length, SEED.map(function (r) {
        return { clause: r.clause, owners: r.owners, status: r.status, due_date: r.due_date, section: r.section };
      }));
      seeding = false;
      return Promise.resolve(true);
    }
    var c = client();
    var payload = seedPayload(SEED);
    var opts = flag === "force"
      ? { onConflict: "clause" }
      : { onConflict: "clause", ignoreDuplicates: true };
    var chain = Promise.resolve();
    for (var i = 0; i < payload.length; i += 25) {
      (function (chunk) {
        chain = chain.then(function () {
          return c.from("sqf_tasks").upsert(chunk, opts).then(function (res) {
            if (res && res.error) throw new Error(res.error.message || "sqf seed failed");
          });
        });
      })(payload.slice(i, i + 25));
    }
    return chain.then(function () {
      markFlag();
      console.log("[sqf-seed] applied", payload.length, flag === "force" ? "force" : "upsert");
      seeding = false;
      if (active) return load().then(function () { if (active) render(); });
      return true;
    }).then(function () { return true; }).catch(function (e) {
      console.warn("[sqf-seed]", e && e.message ? e.message : e);
      seeding = false;
      return false;
    });
  }

  function ensureSeed() {
    if (!seedPromise) {
      seedPromise = new Promise(function (resolve) {
        var tries = 0;
        function tick() {
          run().then(function (ok) {
            if (ok || ++tries >= 240) resolve();
            else setTimeout(tick, 500);
          });
        }
        tick();
      });
    }
    return seedPromise;
  }

  function load() {
    if (!isCloud()) {
      var local = lsGet();
      rows = local.length ? local : cloneRows(SEED);
      loadError = "";
      return Promise.resolve(rows);
    }
    var c = client();
    if (!c) {
      rows = [];
      loadError = tx("cloudErr");
      return Promise.resolve(rows);
    }
    return c.from("sqf_tasks").select("*").limit(500).then(function (res) {
      if (res && res.error) throw new Error(res.error.message || "read failed");
      rows = sortRows((res && res.data) || []);
      rows.forEach(function (r) { r.owners = asOwners(r.owners); });
      loadError = "";
      return rows;
    }).catch(function (e) {
      rows = [];
      loadError = (e && e.message) || tx("cloudErr");
      return rows;
    });
  }

  function styleOnce() {
    if (!doc || doc.getElementById("sqf-style")) return;
    var s = doc.createElement("style");
    s.id = "sqf-style";
    s.textContent = [
      "#sqf-root .sqf-kpis{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}",
      "#sqf-root .sqf-kpis button,#sqf-root .sqf-kpis div{flex:1;min-width:120px;text-align:left;border:0;border-radius:10px;padding:12px 14px;background:#04223B;color:#fff;cursor:pointer;font-family:inherit}",
      "#sqf-root .sqf-kpis div{cursor:default}",
      "#sqf-root .sqf-kpis button strong,#sqf-root .sqf-kpis div strong{display:block;font-size:22px;font-weight:800}",
      "#sqf-root .sqf-kpis button span,#sqf-root .sqf-kpis div span{font-size:12px;opacity:.85}",
      "#sqf-root .sqf-kpis button.sqf-past{background:#B52024}",
      "#sqf-root .sqf-kpis button.sqf-undated{background:#E39412;color:#1a1204}",
      "#sqf-root .sqf-redate{display:flex;flex-wrap:wrap;gap:8px;align-items:flex-end;margin-top:12px}",
      "#sqf-root .sqf-redate > div{min-width:180px}",
      "#sqf-root .sqf-redate button{min-height:44px;font-weight:800}",
      "#sqf-root .sqf-ref{margin-top:8px}",
      "#sqf-root .sqf-kpis button.on{outline:3px solid #F26B21}",
      "#sqf-root .sqf-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}",
      "#sqf-root .sqf-chips button{border:1px solid #d7dde6;background:#fff;border-radius:20px;padding:5px 10px;font-weight:700;font-size:13px;cursor:pointer;color:#243044;font-family:inherit}",
      "#sqf-root .sqf-chips button.on{background:#04223B;color:#fff;border-color:#04223B}",
      "#sqf-root .sqf-filters{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}",
      "#sqf-root .sqf-filters > div{min-width:160px;flex:1}",
      "#sqf-root .sqf-filters label{margin-top:0}",
      "#sqf-root .sqf-pastcheck{display:flex;align-items:center;gap:8px;width:fit-content;font-weight:700;font-size:14px;margin:10px 0 4px}",
      "#sqf-root .sqf-pastcheck input{width:auto;margin:0}",
      "#sqf-root .sqf-tools{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}",
      "#sqf-root table{font-size:13px}",
      "#sqf-root td{vertical-align:top}",
      "#sqf-root tr.sqf-late td{background:#FBE3E0;color:#7d1b12}",
      "#sqf-root .sqf-due-late{color:#B52024;font-weight:800}",
      "#sqf-root .sqf-clip{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-width:280px}",
      "#sqf-root .sqf-notes{max-width:260px}",
      "#sqf-root .pill.sqf-prog{background:#E1EEF7;color:#04223B}",
      "#sqf-root .sqf-back{position:fixed;inset:0;background:rgba(4,34,59,.4);z-index:10000}",
      "#sqf-root .sqf-drawer{position:fixed;top:0;right:0;height:100vh;width:min(460px,100vw);background:#fff;z-index:10001;overflow:auto;padding:18px 18px 48px;box-shadow:-8px 0 28px rgba(0,0,0,.2)}",
      "#sqf-root .sqf-owners{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:6px}",
      "#sqf-root .sqf-owners label{display:flex;align-items:center;gap:6px;margin:0;font-weight:600}",
      "#sqf-root .sqf-src{font-weight:700}"
    ].join("");
    doc.head.appendChild(s);
  }

  function targetValue() {
    return targetDate || auditDate();
  }
  function countdownLine() {
    var iso = auditDate();
    var n = daysUntil(iso, todayDenver());
    var pretty = prettyDate(iso);
    var key = n > 1 ? "daysUntil" : n === 1 ? "dayUntil" : n === 0 ? "auditToday" : "auditPassed";
    return tx(key).replace("{n}", String(n)).replace("{d}", pretty);
  }

  function opt(value, label, current) {
    return '<option value="' + esc(value) + '"' + (String(value) === String(current) ? " selected" : "") + ">" + esc(label) + "</option>";
  }

  function render() {
    if (!doc) return;
    styleOnce();
    var host = doc.getElementById("view");
    if (!host) return;
    var today = todayDenver();
    var all = displaySort(sortRows(rows || []), today);
    var c = counts(all, today);
    var shown = filterRows(all, filters, today);
    var secs = sectionsOf(all);
    var focusQ = doc.activeElement && doc.activeElement.id === "sqf-q";
    var qPos = focusQ ? (doc.activeElement.selectionStart || 0) : 0;

    var chips = '<button type="button" data-sqf="owner" data-val="" class="' + (filters.owner ? "" : "on") + '">' + esc(tx("anyOwner")) + "</button>" +
      '<button type="button" data-sqf="owner" data-val="mb" class="' + (filters.owner === "mb" ? "on" : "") + '">' + esc(tx("mb")) + "</button>" +
      OWNERS.map(function (name) {
        return '<button type="button" data-sqf="owner" data-val="' + esc(name) + '" class="' + (filters.owner === name ? "on" : "") + '">' + esc(name) + "</button>";
      }).join("");

    var secOpts = opt("", tx("anySection"), filters.section) + secs.map(function (s) { return opt(s, s, filters.section); }).join("");
    var stOpts = opt("", tx("anyStatus"), filters.status) +
      STATUSES.map(function (s) { return opt(s, statusLabel(s), filters.status); }).join("");
    var modOpts = opt("", tx("anyModule"), filters.module) + opt("11", tx("mod11"), filters.module) + opt("2", tx("mod2"), filters.module);

    var kpi = function (key, num, label, extra) {
      var on = extra || "";
      if (key === "days") return '<div class="' + on + '"><strong>' + esc(String(num)) + "</strong><span>" + esc(label) + "</span></div>";
      return '<button type="button" data-sqf="kpi" data-val="' + key + '" class="' + on + '"><strong>' + num + "</strong><span>" + esc(label) + "</span></button>";
    };
    var pastOn = filters.past ? "sqf-past on" : "sqf-past";
    var undatedOn = filters.undated ? "sqf-undated on" : "sqf-undated";
    var openOn = filters.status === "open" && !filters.past && !filters.undated ? "on" : "";
    var progOn = filters.status === "in_progress" ? "on" : "";
    var doneOn = filters.status === "done" ? "on" : "";

    var body = shown.map(function (r) {
      var late = isPastDue(r, today);
      var dueHtml = r.due_date
        ? '<span class="' + (late ? "sqf-due-late" : "") + '">' + esc(usDate(r.due_date)) + "</span>"
        : (r.due_raw ? '<span class="muted">' + esc(clip(r.due_raw, 80)) + "</span>" : '<span class="muted">' + esc(tx("noDate")) + "</span>");
      var owners = (r.owners && r.owners.length) ? r.owners.join(", ") : (r.owner_raw || "");
      var ev = r.evidence_url ? ' <a href="' + esc(r.evidence_url) + '" target="_blank" rel="noopener">' + esc(tx("evidence")) + "</a>" : "";
      var openFull = !!expanded[r.clause];
      var req = openFull ? esc(r.requirement || "") : '<span class="sqf-clip">' + esc(clip(r.requirement || "", 180)) + "</span>";
      var notes = openFull ? esc(r.action_notes || "") : '<span class="sqf-clip sqf-notes">' + esc(clip(r.action_notes || "", 160)) + "</span>";
      var toggle = '<button type="button" class="ghost sm" data-sqf="expand" data-clause="' + esc(r.clause) + '">' + esc(openFull ? tx("hide") : tx("full")) + "</button>";
      var on = picked[r.clause] ? " checked" : "";
      return '<tr class="' + (late ? "sqf-late" : "") + '">' +
        '<td><input type="checkbox" data-sqf="pick" data-clause="' + esc(r.clause) + '"' + on + "></td>" +
        "<td><b>" + esc(r.clause) + "</b><div class=\"muted sm\">M" + esc(r.module || "") + "</div></td>" +
        "<td>" + esc(r.section || "") + "</td>" +
        "<td>" + req + "<div>" + toggle + "</div></td>" +
        "<td>" + esc(owners) + "</td>" +
        "<td>" + notes + ev + "</td>" +
        "<td>" + dueHtml + "</td>" +
        '<td><span class="pill ' + pillClass(r.status) + '">' + esc(statusLabel(r.status)) + "</span></td>" +
        '<td><button type="button" class="ghost sm" data-sqf="edit" data-clause="' + esc(r.clause) + '">' + esc(tx("edit")) + "</button></td></tr>";
    }).join("");

    var table = shown.length
      ? '<div class="tblwrap"><table><thead><tr><th></th><th>' + esc(tx("clause")) + "</th><th>" + esc(tx("section")) + "</th><th>" + esc(tx("requirement")) + "</th><th>" + esc(tx("owners")) + "</th><th>" + esc(tx("notes")) + "</th><th>" + esc(tx("due")) + "</th><th>" + esc(tx("status")) + '</th><th data-nosort></th></tr></thead><tbody>' + body + "</tbody></table></div>"
      : "<p class=\"muted\">" + esc(loadError || tx("empty")) + "</p>";

    var localNote = isCloud() ? "" : '<p class="hint">' + esc(tx("localNote")) + "</p>";

    var selectedN = Object.keys(picked).length;
    host.innerHTML = '<div id="sqf-root">' +
      '<div class="card"><h2>' + esc(tx("title")) + "</h2>" +
      '<div class="sqf-kpis">' +
      kpi("days", String(daysUntil(auditDate(), today)), prettyDate(auditDate()), "") +
      kpi("open", c.open, tx("open"), openOn) +
      kpi("past", c.past, tx("past"), pastOn) +
      kpi("undated", c.undated, tx("undated"), undatedOn) +
      kpi("progress", c.in_progress, tx("progress"), progOn) +
      kpi("done", c.done, tx("done"), doneOn) +
      "</div>" +
      '<div class="sqf-redate">' +
      "<div><label>" + esc(tx("target")) + '</label><input id="sqf-target" data-sqf="target" type="date" value="' + esc(targetValue()) + '"></div>' +
      '<button type="button" class="primary" data-sqf="redate" data-mode="selected">' + esc(tx("redateSelected")) + (selectedN ? " (" + selectedN + ")" : "") + "</button>" +
      '<button type="button" class="primary" data-sqf="redate" data-mode="open">' + esc(tx("redateOpen")) + "</button>" +
      '<button type="button" class="ghost" data-sqf="pick-past">' + esc(tx("selectPast")) + "</button>" +
      '<button type="button" class="ghost" data-sqf="pick-undated">' + esc(tx("selectUndated")) + "</button>" +
      '<button type="button" class="ghost" data-sqf="pick-shown">' + esc(tx("selectShown")) + "</button>" +
      '<button type="button" class="ghost" data-sqf="clear-picked">' + esc(tx("clearSelected")) + "</button>" +
      "</div>" +
      '<p class="hint">' + esc(tx("redateHint")) + "</p></div>" +
      '<div class="card"><div class="sqf-chips">' + chips + "</div>" +
      '<div class="sqf-filters">' +
      "<div><label>" + esc(tx("section")) + '</label><select data-sqf="section">' + secOpts + "</select></div>" +
      "<div><label>" + esc(tx("status")) + '</label><select data-sqf="status">' + stOpts + "</select></div>" +
      "<div><label>" + esc(tx("module")) + '</label><select data-sqf="module">' + modOpts + "</select></div>" +
      "<div><label>" + esc(tx("search")) + '</label><input id="sqf-q" data-sqf="q" value="' + esc(filters.q) + '" autocomplete="off"></div>' +
      "</div>" +
      '<label class="sqf-pastcheck"><input type="checkbox" data-sqf="past"' + (filters.past ? " checked" : "") + "> " + esc(tx("pastOnly")) + "</label>" +
      "<p class=\"muted sm\">" + esc(tx("showing").replace("{n}", String(shown.length)).replace("{t}", String(all.length))) + "</p>" +
      '<div class="sqf-tools"><button type="button" class="ghost sm" data-sqf="csv">' + esc(tx("exportCsv")) + '</button><button type="button" class="ghost sm" data-sqf="xlsx">' + esc(tx("exportXlsx")) + "</button></div></div>" +
      '<div class="card">' + table + "</div>" +
      '<div class="card sqf-ref"><p class="hint">' + esc(tx("hint")) + "</p>" +
      '<p class="sqf-src"><a class="polink" href="' + DRIVE_URL + '" target="_blank" rel="noopener">' + esc(tx("source")) + "</a></p>" +
      "<p><b>" + esc(countdownLine()) + "</b></p>" + localNote + "</div>" +
      drawerHtml() +
      "</div>";

    if (focusQ) {
      var box = doc.getElementById("sqf-q");
      if (box) {
        box.focus();
        try { box.setSelectionRange(qPos, qPos); } catch (e) {}
      }
    }
    markNav();
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e2) {}
  }

  function drawerHtml() {
    if (!editClause) return "";
    var r = findRow(editClause);
    if (!r) return "";
    var names = OWNERS.slice();
    (r.owners || []).forEach(function (n) { if (names.indexOf(n) < 0) names.push(n); });
    var boxes = names.map(function (n) {
      var on = (r.owners || []).indexOf(n) >= 0;
      return '<label><input type="checkbox" data-owner="' + esc(n) + '"' + (on ? " checked" : "") + "> " + esc(n) + "</label>";
    }).join("");
    var st = STATUSES.map(function (s) { return opt(s, statusLabel(s), r.status); }).join("");
    var doneBtn = r.status === "done"
      ? '<button type="button" class="ghost" data-sqf="reopen">' + esc(tx("reopen")) + "</button>"
      : '<button type="button" class="primary sm" data-sqf="mark">' + esc(tx("markDone")) + "</button>";
    return '<div class="sqf-back" data-sqf="cancel"></div><div class="sqf-drawer" role="dialog" aria-label="' + esc(tx("edit")) + " " + esc(r.clause) + '">' +
      "<h2>" + esc(r.clause) + "</h2>" +
      '<p class="muted sm">' + esc(r.section || "") + " | M" + esc(r.module || "") + "</p>" +
      "<p>" + esc(r.requirement || "") + "</p>" +
      (r.owner_raw ? '<p class="muted sm"><b>' + esc(tx("sheetOwner")) + ":</b> " + esc(r.owner_raw) + "</p>" : "") +
      "<label>" + esc(tx("status")) + '</label><select id="sqf-status">' + st + "</select>" +
      "<label>" + esc(tx("owners")) + '</label><div class="sqf-owners">' + boxes + "</div>" +
      "<label>" + esc(tx("due")) + '</label><input id="sqf-due" type="date" value="' + esc(r.due_date ? String(r.due_date).slice(0, 10) : "") + '">' +
      (r.due_raw ? '<p class="muted sm">' + esc(r.due_raw) + "</p>" : "") +
      "<label>" + esc(tx("notes")) + '</label><textarea id="sqf-notes" rows="5">' + esc(r.action_notes || "") + "</textarea>" +
      "<label>" + esc(tx("evidenceUrl")) + '</label><input id="sqf-ev-url" value="' + esc(r.evidence_url || "") + '" placeholder="https://">' +
      "<label>" + esc(tx("evidenceNote")) + '</label><textarea id="sqf-ev-note" rows="3">' + esc(r.evidence_note || "") + "</textarea>" +
      (r.completed_date ? '<p class="muted sm">' + esc(tx("completed")) + ": " + esc(usDate(r.completed_date)) + "</p>" : "") +
      '<div class="sqf-tools">' + doneBtn +
      '<button type="button" class="primary sm" data-sqf="save">' + esc(tx("save")) + "</button>" +
      '<button type="button" class="ghost sm" data-sqf="cancel">' + esc(tx("cancel")) + "</button></div></div>";
  }

  function readEdit() {
    var statusEl = doc.getElementById("sqf-status");
    var dueEl = doc.getElementById("sqf-due");
    var notesEl = doc.getElementById("sqf-notes");
    var urlEl = doc.getElementById("sqf-ev-url");
    var noteEl = doc.getElementById("sqf-ev-note");
    var owners = [];
    var boxes = doc.querySelectorAll("#sqf-root input[data-owner]");
    for (var i = 0; i < boxes.length; i++) if (boxes[i].checked) owners.push(boxes[i].getAttribute("data-owner"));
    var due = dueEl && dueEl.value ? dueEl.value : null;
    return {
      status: statusEl ? statusEl.value : "open",
      owners: owners,
      due_date: due,
      action_notes: notesEl ? notesEl.value : "",
      evidence_url: urlEl ? urlEl.value.trim() : "",
      evidence_note: noteEl ? noteEl.value : ""
    };
  }

  function applyPatch(row, patch) {
    row.status = STATUSES.indexOf(patch.status) >= 0 ? patch.status : row.status;
    row.owners = patch.owners || [];
    row.due_date = patch.due_date || null;
    row.action_notes = patch.action_notes || "";
    row.evidence_url = patch.evidence_url || "";
    row.evidence_note = patch.evidence_note || "";
    if (row.status === "done") {
      if (!row.completed_date) row.completed_date = todayDenver();
    } else {
      row.completed_date = null;
    }
    row.updated_by = who();
    row.updated_at = new Date().toISOString();
    return row;
  }

  function saveEdit(extra) {
    var row = findRow(editClause);
    if (!row) return;
    var patch = readEdit();
    if (extra) Object.keys(extra).forEach(function (k) { patch[k] = extra[k]; });
    if (extra && extra.status === "done") patch.owners = patch.owners || row.owners;
    applyPatch(row, patch);
    var payload = {
      status: row.status,
      owners: row.owners,
      due_date: row.due_date || null,
      action_notes: row.action_notes,
      evidence_url: row.evidence_url || null,
      evidence_note: row.evidence_note || null,
      completed_date: row.completed_date || null,
      updated_by: row.updated_by,
      updated_at: row.updated_at
    };
    var finish = function (ok, msg) {
      if (!ok) { toast(msg || tx("saveErr")); return; }
      toast(tx("saved"));
      editClause = null;
      render();
    };
    if (!isCloud()) {
      lsSet(rows);
      finish(true);
      return;
    }
    var c = client();
    if (!c) { finish(false, tx("saveErr")); return; }
    c.from("sqf_tasks").update(payload).eq("clause", row.clause).select("clause").then(function (res) {
      if (res && res.error) { finish(false, res.error.message || tx("saveErr")); return; }
      if (!res || !res.data || !res.data.length) { finish(false, tx("saveErr")); return; }
      finish(true);
    }).catch(function (e) { finish(false, (e && e.message) || tx("saveErr")); });
  }

  function exportList(kind) {
    var today = todayDenver();
    var list = filterRows(sortRows(rows || []), filters, today);
    var data = list.map(function (r) {
      return {
        clause: r.clause || "",
        module: r.module == null ? "" : r.module,
        section: r.section || "",
        requirement: r.requirement || "",
        owner_raw: r.owner_raw || "",
        owners: (r.owners || []).join("; "),
        action_notes: r.action_notes || "",
        due_date: r.due_date ? String(r.due_date).slice(0, 10) : "",
        due_raw: r.due_raw || "",
        status: r.status || "",
        evidence_url: r.evidence_url || "",
        evidence_note: r.evidence_note || "",
        completed_date: r.completed_date ? String(r.completed_date).slice(0, 10) : ""
      };
    });
    var stamp = todayDenver();
    if (kind === "xlsx" && root.XLSX) {
      var ws = root.XLSX.utils.json_to_sheet(data);
      var wb = root.XLSX.utils.book_new();
      root.XLSX.utils.book_append_sheet(wb, ws, "Outstanding items");
      root.XLSX.writeFile(wb, "sqf-tasks-" + stamp + ".xlsx");
      return;
    }
    var headers = ["clause", "module", "section", "requirement", "owner_raw", "owners", "action_notes", "due_date", "due_raw", "status", "evidence_url", "evidence_note", "completed_date"];
    var lines = [headers.join(",")];
    data.forEach(function (r) {
      lines.push(headers.map(function (h) {
        var v = String(r[h] == null ? "" : r[h]);
        if (/[",\n\r]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
        return v;
      }).join(","));
    });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var a = doc.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sqf-tasks-" + stamp + ".csv";
    doc.body.appendChild(a);
    a.click();
    a.remove();
  }

  function redate(mode) {
    if (redateBusy || !doc) return;
    var input = doc.getElementById("sqf-target");
    var date = input && input.value ? input.value : targetValue();
    targetDate = date;
    var clauses = mode === "selected"
      ? Object.keys(picked)
      : (rows || []).filter(isOpenWork).map(function (r) { return r.clause; });
    var plan = redatePlan(rows, clauses, date);
    if (!plan.ok) { toast(tx("redateNeed")); return; }
    if (!plan.rows.length) { toast(tx("redateNone")); return; }
    var ask = tx("redateAsk").replace("{n}", String(plan.rows.length)).replace("{d}", usDate(plan.date));
    if (!root.confirm(ask)) return;
    var before = {};
    var oldDue = {};
    plan.rows.forEach(function (hit) { before[hit.clause] = hit; });
    var now = new Date().toISOString();
    var by = who();
    plan.rows.forEach(function (hit) {
      var row = findRow(hit.clause);
      if (!row) return;
      oldDue[hit.clause] = row.due_date || null;
      applyDueOnly(row, plan.date, by, now);
    });
    function undo() {
      Object.keys(oldDue).forEach(function (clause) {
        var row = findRow(clause);
        if (row) row.due_date = oldDue[clause];
      });
    }
    function finish(n, total) {
      redateBusy = false;
      plan.rows.forEach(function (hit) { delete picked[hit.clause]; });
      var msg = n === total
        ? tx("redateDone").replace("{n}", String(n))
        : tx("redatePartial").replace("{n}", String(n)).replace("{t}", String(total));
      toast(msg);
      render();
    }
    if (!isCloud()) {
      lsSet(rows);
      finish(plan.rows.length, plan.rows.length);
      return;
    }
    var c = client();
    if (!c) { undo(); toast(tx("saveErr")); render(); return; }
    redateBusy = true;
    var payload = redatePayload(plan.date, by, now);
    c.from("sqf_tasks").update(payload).in("clause", plan.rows.map(function (h) { return h.clause; })).select("clause,status,action_notes,due_date").then(function (res) {
      if (res && res.error) {
        undo();
        redateBusy = false;
        toast(res.error.message || tx("saveErr"));
        render();
        return;
      }
      var got = (res && res.data) || [];
      var bad = false;
      got.forEach(function (r) {
        var hit = before[r.clause];
        if (!hit) return;
        if (r.status !== hit.status) bad = true;
        if ((r.action_notes || "") !== (hit.action_notes || "")) bad = true;
        if (String(r.due_date || "").slice(0, 10) !== plan.date) bad = true;
      });
      if (bad || !got.length) {
        undo();
        redateBusy = false;
        toast(tx("saveErr"));
        render();
        return;
      }
      finish(got.length, plan.rows.length);
    }).catch(function (e) {
      undo();
      redateBusy = false;
      toast((e && e.message) || tx("saveErr"));
      render();
    });
  }

  function onClick(e) {
    var t = e.target && e.target.closest ? e.target.closest("[data-sqf]") : null;
    if (!t || !doc.getElementById("sqf-root")) return;
    var act = t.getAttribute("data-sqf");
    if (act === "owner") {
      filters.owner = t.getAttribute("data-val") || "";
      render();
      return;
    }
    if (act === "kpi") {
      var key = t.getAttribute("data-val");
      if (key === "open") { filters.status = filters.status === "open" && !filters.past && !filters.undated ? "" : "open"; filters.past = false; filters.undated = false; }
      else if (key === "past") { filters.past = !filters.past; if (filters.past) { filters.status = ""; filters.undated = false; } }
      else if (key === "undated") { filters.undated = !filters.undated; if (filters.undated) { filters.past = false; filters.status = ""; } }
      else if (key === "progress") { filters.status = filters.status === "in_progress" ? "" : "in_progress"; filters.past = false; filters.undated = false; }
      else if (key === "done") { filters.status = filters.status === "done" ? "" : "done"; filters.past = false; filters.undated = false; }
      render();
      return;
    }
    if (act === "expand") {
      var clause = t.getAttribute("data-clause");
      expanded[clause] = !expanded[clause];
      render();
      return;
    }
    if (act === "edit") {
      editClause = t.getAttribute("data-clause");
      render();
      return;
    }
    if (act === "cancel") {
      editClause = null;
      render();
      return;
    }
    if (act === "save") { saveEdit(); return; }
    if (act === "mark") {
      var cur = readEdit();
      cur.status = "done";
      saveEdit(cur);
      return;
    }
    if (act === "reopen") {
      var back = readEdit();
      back.status = "open";
      saveEdit(back);
      return;
    }
    if (act === "csv") { exportList("csv"); return; }
    if (act === "xlsx") { exportList("xlsx"); return; }
    if (act === "pick") {
      var id = t.getAttribute("data-clause");
      if (!id) return;
      if (t.checked) picked[id] = 1;
      else delete picked[id];
      render();
      return;
    }
    if (act === "pick-past") {
      var todayPast = todayDenver();
      (rows || []).forEach(function (r) { if (isPastDue(r, todayPast)) picked[r.clause] = 1; });
      render();
      return;
    }
    if (act === "pick-undated") {
      (rows || []).forEach(function (r) { if (isUndatedOpen(r)) picked[r.clause] = 1; });
      render();
      return;
    }
    if (act === "pick-shown") {
      var todayPick = todayDenver();
      filterRows(sortRows(rows || []), filters, todayPick).forEach(function (r) { picked[r.clause] = 1; });
      render();
      return;
    }
    if (act === "clear-picked") { picked = {}; render(); return; }
    if (act === "redate") { redate(t.getAttribute("data-mode") || "selected"); return; }
  }

  function onChange(e) {
    var t = e.target;
    if (!t || !t.getAttribute || !doc.getElementById("sqf-root")) return;
    var act = t.getAttribute("data-sqf");
    if (act === "section") filters.section = t.value;
    else if (act === "status") filters.status = t.value;
    else if (act === "module") filters.module = t.value;
    else if (act === "past") { filters.past = !!t.checked; if (filters.past) filters.undated = false; }
    else if (act === "target") { targetDate = t.value || ""; return; }
    else if (act === "pick") return;
    else return;
    render();
  }
  function onInput(e) {
    var t = e.target;
    if (!t || t.id !== "sqf-q") return;
    filters.q = t.value || "";
    render();
  }

  function markNav() {
    if (!doc) return;
    var nav = doc.getElementById("nav");
    if (!nav || !active) return;
    var mine = doc.getElementById("sqf-nav");
    if (!mine) return;
    var items = nav.querySelectorAll(".navitem.active");
    for (var i = 0; i < items.length; i++) items[i].classList.remove("active");
    mine.classList.add("active");
  }
  function injectNav() {
    if (!doc) return;
    var nav = doc.getElementById("nav");
    if (!nav || doc.getElementById("sqf-nav")) return;
    var anchor = null;
    var items = nav.querySelectorAll("button.navitem");
    for (var i = 0; i < items.length; i++) {
      var oc = items[i].getAttribute("onclick") || "";
      if (oc.indexOf("UI_go('compliance')") >= 0) { anchor = items[i]; break; }
    }
    if (!anchor) return;
    var btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "navitem";
    btn.id = "sqf-nav";
    btn.innerHTML = '<i class="navico" data-lucide="list-checks"></i><span>SQF Tasks</span>';
    btn.addEventListener("click", function (ev) {
      ev.preventDefault();
      if (root.SQFTASKS && typeof root.SQFTASKS.open === "function") root.SQFTASKS.open();
      else open();
    });
    if (anchor.nextSibling) anchor.parentNode.insertBefore(btn, anchor.nextSibling);
    else anchor.parentNode.appendChild(btn);
    try { if (root.lucide && root.lucide.createIcons) root.lucide.createIcons(); } catch (e) {}
    if (active) markNav();
  }
  function onScreen() {
    return !!(doc && doc.getElementById("sqf-root"));
  }
  function open() {
    if (!doc) return;
    active = true;
    styleOnce();
    var host = doc.getElementById("view");
    if (host) host.innerHTML = '<div id="sqf-root"><div class="card"><h2>' + esc(tx("title")) + '</h2><p class="muted">' + esc(tx("loading")) + "</p></div></div>";
    try {
      var n = doc.getElementById("nav");
      var bd = doc.getElementById("navBackdrop");
      if (n) n.classList.remove("open");
      if (bd) bd.classList.remove("show");
    } catch (e) {}
    markNav();
    var paint = function () { if (active) load().then(function () { if (active) render(); }); };
    paint();
    ensureSeed().then(paint);
  }

  function leaveIfOther(e) {
    var t = e.target && e.target.closest ? e.target.closest("#sqf-nav, [data-dept-tool], #nav .navitem, .dept-tab, #dept-back") : null;
    if (!t) return;
    if (t.id === "sqf-nav") return;
    if (t.getAttribute && t.getAttribute("data-dept-tool") === "sqftasks") return;
    active = false;
    editClause = null;
  }

  var api = {
    open: open,
    parseOwners: parseOwners,
    titleSection: titleSection,
    moduleOf: moduleOf,
    completedDate: completedDate,
    buildRow: buildRow,
    parseCsv: parseCsv,
    seed: function () { return SEED; },
    raw: function () { return RAW; },
    counts: counts,
    isPastDue: isPastDue,
    isUndatedOpen: isUndatedOpen,
    isOpenWork: isOpenWork,
    redatePlan: redatePlan,
    displaySort: displaySort,
    redatePayload: redatePayload,
    applyDueOnly: applyDueOnly,
    filterRows: filterRows,
    SOURCE_FILE_ID: SOURCE_FILE_ID
  };
  root.SQFTASKS = api;

  if (doc) {
    doc.addEventListener("click", onClick);
    doc.addEventListener("change", onChange);
    doc.addEventListener("input", onInput);
    doc.addEventListener("click", leaveIfOther, true);
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && editClause) { editClause = null; render(); }
    });
    ["lang-en", "lang-es", "lang-pt"].forEach(function (id) {
      doc.addEventListener("click", function (e) {
        if (e.target && e.target.id === id && active) setTimeout(function () { if (active && onScreen()) render(); }, 0);
      });
    });
    root.SMK_VIEW_LOCKS = root.SMK_VIEW_LOCKS || [];
    root.SMK_VIEW_LOCKS.push(function () { return active && onScreen(); });
    root.SMK_BUSY = root.SMK_BUSY || [];
    root.SMK_BUSY.push(function () { return !!editClause && onScreen(); });
    try {
      var mo = new MutationObserver(function () {
        injectNav();
        if (active && doc.getElementById("view") && !doc.getElementById("sqf-root")) render();
      });
      mo.observe(doc.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { setTimeout(injectNav, 400); ensureSeed(); });
    else { setTimeout(injectNav, 400); ensureSeed(); }
  }

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
