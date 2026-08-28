SELECT pt.identifier, ap.position, ap.risk, ap.no_prophylaxis,
       apo.step_number, apo.position AS opt_pos,
       string_agg(mc.category_name, '+' ORDER BY mc.category_name) AS drugs
FROM "demo-demo".antibiotic_pathways ap
JOIN "demo-demo".procedure_types pt ON pt.id = ap.procedure_type_id
LEFT JOIN "demo-demo".antibiotic_pathway_options apo ON apo.pathway_id = ap.id
LEFT JOIN "demo-demo".antibiotic_pathway_option_medication_categories aomc ON aomc.antibiotic_pathway_option_id = apo.id
LEFT JOIN "demo-demo".medication_categories mc ON mc.id = aomc.medication_category_id
GROUP BY 1,2,3,4,5,6 ORDER BY 1,2,5,6;
