BEGIN; set search_path to "mayo-mayo";

            WITH sulfonamide_category AS (
                SELECT DISTINCT member.medication_category_id AS id
                FROM medications_medication_categories member
                WHERE EXISTS (SELECT 1
                              FROM medications_medication_categories tag
                                       JOIN medication_categories c ON c.id = tag.medication_category_id
                              WHERE tag.medication_id = member.medication_id
                                AND c.category_name = 'SULFONAMIDE')
                  AND NOT EXISTS (SELECT 1
                                  FROM medications_medication_categories tag
                                           JOIN medication_categories c ON c.id = tag.medication_category_id
                                  WHERE tag.medication_id = member.medication_id
                                    AND c.category_name = 'EXCLUDE_FROM_ANTIBIOTIC_CANDIDATE_EVAL')
            ),
                 sulfonamide_option AS (
                     SELECT DISTINCT o.id
                     FROM antibiotic_pathway_options o
                              JOIN antibiotic_pathway_option_medication_categories omc ON omc.antibiotic_pathway_option_id = o.id
                     WHERE omc.medication_category_id IN (SELECT id FROM sulfonamide_category)
                 ),
                 fallback_step AS (
                     SELECT o.pathway_id, MIN(o.step_number) AS step_number
                     FROM antibiotic_pathway_options o
                     WHERE o.id NOT IN (SELECT id FROM sulfonamide_option)
                     GROUP BY o.pathway_id
                 ),
                 target AS (
                     SELECT cr.id                AS compliance_result_id,
                            rfr.id               AS rule_fired_result_id,
                            rfr.created_date     AS fired_at,
                            rec.patient_id,
                            rfr.details::jsonb   AS details,
                            selected_category.id AS selected_category_id
                     FROM compliance_results cr
                              JOIN rule_fired_results rfr ON rfr.id = cr.rule_fired_result_id
                              JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
                              JOIN medications selected ON selected.medication_identifier = rfr.details::jsonb ->> 'MEDICATION_IDENTIFIER'
                              JOIN medication_categories selected_category ON selected_category.category_name = selected.primary_medication_category
                     WHERE rfr.rule_identifier = 'a-known-procedure-wrong-antibiotic'
                       AND cr.label = 'alert-compliance'
                       AND cr.compliant = FALSE
                       AND jsonb_typeof(rfr.details::jsonb -> 'ALTERNATIVE_ANTIBIOTIC_CANDIDATES') = 'array'
                       AND jsonb_array_length(rfr.details::jsonb -> 'ALTERNATIVE_ANTIBIOTIC_CANDIDATES') > 0
                       AND jsonb_typeof(rfr.details::jsonb -> 'PROCEDURE_IDS') = 'array'
                 ),
                 offered_only_sulfonamide AS (
                     SELECT t.*
                     FROM target t
                     WHERE NOT EXISTS (SELECT 1
                                       FROM jsonb_array_elements(t.details -> 'ALTERNATIVE_ANTIBIOTIC_CANDIDATES') offered
                                       WHERE NOT EXISTS (SELECT 1
                                                         FROM jsonb_array_elements(offered -> 'medicationCandidates') candidate
                                                                  JOIN medication_categories c ON c.category_name = candidate ->> 'medicationCategory'
                                                         WHERE c.id IN (SELECT id FROM sulfonamide_category)))
                 ),
                 sulfonamide_coded_allergy AS (
                     SELECT pa.patient_id, pa.created_date, COALESCE(pa.deleted, FALSE) AS deleted
                     FROM patient_allergies pa
                     WHERE pa.snomed_identifier = '372788003'
                        OR pa.rxnorm_identifier IN ('10831', '82101', '690161', '690740', '54476', '224975',
                                                    '128781', '10193', '10184')
                 ),
                 sulfonamide_allergic AS (
                     SELECT t.*
                     FROM offered_only_sulfonamide t
                     WHERE EXISTS (SELECT 1
                                   FROM sulfonamide_coded_allergy recorded
                                   WHERE recorded.patient_id = t.patient_id
                                     AND recorded.created_date <= t.fired_at
                                     AND (NOT recorded.deleted
                                          OR EXISTS (SELECT 1
                                                     FROM sulfonamide_coded_allergy replacement
                                                     WHERE replacement.patient_id = t.patient_id
                                                       AND replacement.created_date > t.fired_at)))
                 ),
                 case_pathway AS (
                     SELECT t.compliance_result_id, ap.id AS pathway_id
                     FROM sulfonamide_allergic t
                              CROSS JOIN LATERAL jsonb_array_elements_text(t.details -> 'PROCEDURE_IDS') procedure_id
                              JOIN procedure_types pt ON pt.identifier = procedure_id
                              JOIN antibiotic_pathways ap ON ap.procedure_type_id = pt.id
                     WHERE ap.no_prophylaxis = FALSE
                 ),
                 falls_back_to_selected AS (
                     SELECT t.compliance_result_id
                     FROM sulfonamide_allergic t
                     WHERE NOT EXISTS (SELECT 1
                                       FROM jsonb_array_elements_text(t.details -> 'PROCEDURE_IDS') procedure_id
                                       WHERE procedure_id IN ('p-whipple', 'p-pancreatectomy', 'p-biliary-stent-placement'))
                       AND EXISTS (SELECT 1 FROM case_pathway cp WHERE cp.compliance_result_id = t.compliance_result_id)
                       AND NOT EXISTS (SELECT 1
                                       FROM case_pathway cp
                                       WHERE cp.compliance_result_id = t.compliance_result_id
                                         AND NOT EXISTS (SELECT 1
                                                         FROM fallback_step fs
                                                                  JOIN antibiotic_pathway_options o
                                                                       ON o.pathway_id = fs.pathway_id
                                                                      AND o.step_number = fs.step_number
                                                                  JOIN antibiotic_pathway_option_medication_categories omc
                                                                       ON omc.antibiotic_pathway_option_id = o.id
                                                         WHERE fs.pathway_id = cp.pathway_id
                                                           AND omc.medication_category_id = t.selected_category_id))
                 )
            UPDATE compliance_results
            SET compliant          = TRUE,
                last_modified_date = NOW()
            WHERE id IN (SELECT compliance_result_id FROM falls_back_to_selected);
        
COMMIT;
