WITH opt AS (
  SELECT o.id, o.pathway_id, o.step_number, o.position,
         string_agg(mc.category_name, ' AND ' ORDER BY c.position) AS drugs
  FROM "mayo-mayo".antibiotic_pathway_options o
  JOIN "mayo-mayo".antibiotic_pathway_option_medication_categories c ON c.antibiotic_pathway_option_id = o.id
  JOIN "mayo-mayo".medication_categories mc ON mc.id = c.medication_category_id
  GROUP BY o.id, o.pathway_id, o.step_number, o.position
), step AS (
  SELECT pathway_id, step_number, string_agg('('||drugs||')', ' OR ' ORDER BY position) AS s
  FROM opt GROUP BY pathway_id, step_number
)
SELECT pt.identifier, p.position AS pw, p.risk, p.no_prophylaxis,
       (SELECT string_agg(acuity, '|' ORDER BY acuity) FROM "mayo-mayo".antibiotic_pathway_acuities a WHERE a.pathway_id = p.id) AS acuities,
       (SELECT string_agg(s, ' -> ' ORDER BY step_number) FROM step WHERE step.pathway_id = p.id) AS pathway
FROM "mayo-mayo".antibiotic_pathways p
JOIN "mayo-mayo".procedure_types pt ON pt.id = p.procedure_type_id
WHERE pt.identifier IN ('p-duodenal-ulcer','p-exploratory-laparotomy','p-exploratory-laparoscopy',
 'p-myomectomy-open','p-myomectomy-laparoscopic','p-myomectomy-robotic','p-pelvic-floor-repair-open',
 'p-pelvic-floor-repair-laparoscopic','p-pelvic-floor-repair-robotic','p-pelvic-floor-repair-endoscopic',
 'p-urogynecologic-with-cystoscopy-other','p-urogynecologic-no-cystoscopy-other','p-gynecologic-laparoscopic-other',
 'p-gynecologic-open-other','p-vulvectomy','p-vesicovaginal-fistula','p-rectovaginal-fistula',
 'p-hysterectomy-open')
ORDER BY pt.identifier, p.position;
