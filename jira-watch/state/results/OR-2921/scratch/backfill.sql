            UPDATE compliance_results cr
            SET    compliant          = TRUE,
                   last_modified_date = NOW()
            FROM   rule_fired_results rfr
                   JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
                   JOIN operations o ON o.id = rec.operation_id
            WHERE  cr.rule_fired_result_id = rfr.id
              AND  rfr.rule_identifier = 'a-preop-doxycycline-check'
              AND  cr.label = 'alert-compliance'
              AND  cr.compliant = FALSE
              AND  (
                       EXISTS (
                           SELECT 1
                           FROM   operation_procedure_types opt
                                  JOIN procedure_types pt ON pt.id = opt.procedure_type_id
                           WHERE  opt.operation_id = o.id
                             AND  pt.identifier NOT IN (
                                      'p-dilation-and-evacuation-nonpregnancy',
                                      'p-dilation-and-evacuation-abortion',
                                      'p-dilation-and-evacuation-postpartum',
                                      'p-dilation-and-evacuation-other',
                                      'p-dilation-and-curettage'
                                  )
                             AND  NOT (
                                      EXISTS (SELECT 1
                                              FROM   antibiotic_pathways ap
                                              WHERE  ap.procedure_type_id = pt.id
                                                AND  ap.no_prophylaxis)
                                      AND NOT EXISTS (SELECT 1
                                                      FROM   antibiotic_pathways ap
                                                      WHERE  ap.procedure_type_id = pt.id
                                                        AND  NOT ap.no_prophylaxis)
                                  )
                       )
                       OR CASE
                              WHEN jsonb_typeof(o.source_procedure_mappings) = 'object'
                                  THEN EXISTS (SELECT 1
                                               FROM   jsonb_each(o.source_procedure_mappings) mapping
                                               WHERE  mapping.value = 'null'::jsonb)
                              ELSE FALSE
                          END
                   );
