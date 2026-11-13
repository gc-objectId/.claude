set search_path to "mayo-mayo";
UPDATE compliance_results cr
            SET    compliant          = TRUE,
                   last_modified_date = NOW()
            FROM   rule_fired_results rfr
                   JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
                   JOIN operations o ON o.id = rec.operation_id
            WHERE  cr.rule_fired_result_id = rfr.id
              AND  cr.label = 'alert-compliance'
              AND  cr.compliant = FALSE
              AND  rfr.rule_identifier = 'a-insulin-glucose-check'
              AND  (
                       (
                           COALESCE(rfr.details ->> 'ROUTE_QUALIFIER', 'BOLUS') = 'BOLUS'
                           AND EXISTS (
                               SELECT 1
                               FROM   medication_administrations ma
                                      JOIN medications m ON m.id = ma.medication_id
                               WHERE  ma.patient_id = rec.patient_id
                                 AND  ma.administration_date = to_timestamp((rfr.details ->> 'INSULIN_ADMINISTRATION_DATE')::bigint / 1000.0)
                                 AND  COALESCE(ma.deleted, FALSE) = FALSE
                                 AND  m.medication_categories::jsonb ? 'INSULIN'
                                 AND  ma.route = 'SUBCUTANEOUS'
                           )
                       )
                       OR
                       (
                           rfr.details ->> 'ROUTE_QUALIFIER' = 'INFUSION'
                           AND EXISTS (
                               SELECT 1
                               FROM   infusion_medication_administrations ima
                                      JOIN medications m ON m.id = ima.medication_id
                                      CROSS JOIN LATERAL jsonb_array_elements(ima.infusion_events::jsonb) AS event
                               WHERE  ima.patient_id = rec.patient_id
                                 AND  ima.operation_id = rec.operation_id
                                 AND  COALESCE(ima.deleted, FALSE) = FALSE
                                 AND  m.medication_categories::jsonb ? 'INSULIN'
                                 AND  ima.route = 'SUBCUTANEOUS'
                                 AND  event ->> 'eventType' IN ('START', 'RATE_CHANGE')
                               GROUP BY ima.id
                               HAVING MIN((event ->> 'eventDate')::bigint) = (rfr.details ->> 'INSULIN_ADMINISTRATION_DATE')::bigint
                           )
                       )
                   )
              AND  NOT EXISTS (
                       SELECT 1
                       FROM   medication_administrations ma
                              JOIN medications m ON m.id = ma.medication_id
                       WHERE  ma.patient_id = rec.patient_id
                         AND  COALESCE(ma.deleted, FALSE) = FALSE
                         AND  m.medication_categories::jsonb ? 'INSULIN'
                         AND  ma.route IS DISTINCT FROM 'SUBCUTANEOUS'
                         AND  ma.administration_date >= o.start_time
                         AND  ma.administration_date <= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                   )
              AND  NOT EXISTS (
                       SELECT 1
                       FROM   infusion_medication_administrations ima
                              JOIN medications m ON m.id = ima.medication_id
                              CROSS JOIN LATERAL jsonb_array_elements(ima.infusion_events::jsonb) AS event
                       WHERE  ima.patient_id = rec.patient_id
                         AND  COALESCE(ima.deleted, FALSE) = FALSE
                         AND  m.medication_categories::jsonb ? 'INSULIN'
                         AND  ima.route IS DISTINCT FROM 'SUBCUTANEOUS'
                       GROUP BY ima.id
                       HAVING MIN(to_timestamp((event ->> 'eventDate')::bigint / 1000.0))
                                  FILTER (WHERE event ->> 'eventType' IN ('START', 'RATE_CHANGE')) <= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                          AND (BOOL_OR(to_timestamp((event ->> 'eventDate')::bigint / 1000.0) >= o.start_time)
                               OR MAX(to_timestamp((event ->> 'eventDate')::bigint / 1000.0))
                                      FILTER (WHERE event ->> 'eventType' IN ('START', 'RATE_CHANGE')
                                              AND to_timestamp((event ->> 'eventDate')::bigint / 1000.0) < o.start_time)
                                  > COALESCE(MAX(to_timestamp((event ->> 'eventDate')::bigint / 1000.0))
                                                 FILTER (WHERE event ->> 'eventType' = 'STOP'
                                                         AND to_timestamp((event ->> 'eventDate')::bigint / 1000.0) < o.start_time),
                                             '-infinity'::timestamptz))
                   )
              AND  EXISTS (
                       SELECT 1
                       FROM   patient_observations po
                       WHERE  po.patient_id = rec.patient_id
                         AND  po.type = 'GLUCOSE'
                         AND  COALESCE(po.deleted, FALSE) = FALSE
                         AND  po.created_date  <= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                         AND  po.effective_time <  to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                         AND  po.effective_time >= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0) - INTERVAL '2 hours'
                   );

UPDATE compliance_results cr
            SET    compliant          = TRUE,
                   last_modified_date = NOW()
            FROM   rule_fired_results rfr
                   JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
                   JOIN operations o ON o.id = rec.operation_id
            WHERE  cr.rule_fired_result_id = rfr.id
              AND  cr.label = 'alert-compliance'
              AND  cr.compliant = FALSE
              AND  rfr.rule_identifier = 'a-insulin-glucose-check-app-launch'
              AND  (EXISTS (
                       SELECT 1
                       FROM   medication_administrations ma
                              JOIN medications m ON m.id = ma.medication_id
                       WHERE  ma.patient_id = rec.patient_id
                         AND  COALESCE(ma.deleted, FALSE) = FALSE
                         AND  m.medication_categories::jsonb ? 'INSULIN'
                         AND  ma.route = 'SUBCUTANEOUS'
                         AND  ma.administration_date >= o.start_time
                         AND  ma.administration_date <= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                   )
                    OR EXISTS (
                       SELECT 1
                       FROM   infusion_medication_administrations ima
                              JOIN medications m ON m.id = ima.medication_id
                              CROSS JOIN LATERAL jsonb_array_elements(ima.infusion_events::jsonb) AS event
                       WHERE  ima.patient_id = rec.patient_id
                         AND  COALESCE(ima.deleted, FALSE) = FALSE
                         AND  m.medication_categories::jsonb ? 'INSULIN'
                         AND  ima.route = 'SUBCUTANEOUS'
                       GROUP BY ima.id
                       HAVING MIN(to_timestamp((event ->> 'eventDate')::bigint / 1000.0))
                                  FILTER (WHERE event ->> 'eventType' IN ('START', 'RATE_CHANGE')) <= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                          AND (BOOL_OR(to_timestamp((event ->> 'eventDate')::bigint / 1000.0) >= o.start_time)
                               OR MAX(to_timestamp((event ->> 'eventDate')::bigint / 1000.0))
                                      FILTER (WHERE event ->> 'eventType' IN ('START', 'RATE_CHANGE')
                                              AND to_timestamp((event ->> 'eventDate')::bigint / 1000.0) < o.start_time)
                                  > COALESCE(MAX(to_timestamp((event ->> 'eventDate')::bigint / 1000.0))
                                                 FILTER (WHERE event ->> 'eventType' = 'STOP'
                                                         AND to_timestamp((event ->> 'eventDate')::bigint / 1000.0) < o.start_time),
                                             '-infinity'::timestamptz))
                   ))
              AND  NOT EXISTS (
                       SELECT 1
                       FROM   medication_administrations ma
                              JOIN medications m ON m.id = ma.medication_id
                       WHERE  ma.patient_id = rec.patient_id
                         AND  COALESCE(ma.deleted, FALSE) = FALSE
                         AND  m.medication_categories::jsonb ? 'INSULIN'
                         AND  ma.route IS DISTINCT FROM 'SUBCUTANEOUS'
                         AND  ma.administration_date >= o.start_time
                         AND  ma.administration_date <= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                   )
              AND  NOT EXISTS (
                       SELECT 1
                       FROM   infusion_medication_administrations ima
                              JOIN medications m ON m.id = ima.medication_id
                              CROSS JOIN LATERAL jsonb_array_elements(ima.infusion_events::jsonb) AS event
                       WHERE  ima.patient_id = rec.patient_id
                         AND  COALESCE(ima.deleted, FALSE) = FALSE
                         AND  m.medication_categories::jsonb ? 'INSULIN'
                         AND  ima.route IS DISTINCT FROM 'SUBCUTANEOUS'
                       GROUP BY ima.id
                       HAVING MIN(to_timestamp((event ->> 'eventDate')::bigint / 1000.0))
                                  FILTER (WHERE event ->> 'eventType' IN ('START', 'RATE_CHANGE')) <= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                          AND (BOOL_OR(to_timestamp((event ->> 'eventDate')::bigint / 1000.0) >= o.start_time)
                               OR MAX(to_timestamp((event ->> 'eventDate')::bigint / 1000.0))
                                      FILTER (WHERE event ->> 'eventType' IN ('START', 'RATE_CHANGE')
                                              AND to_timestamp((event ->> 'eventDate')::bigint / 1000.0) < o.start_time)
                                  > COALESCE(MAX(to_timestamp((event ->> 'eventDate')::bigint / 1000.0))
                                                 FILTER (WHERE event ->> 'eventType' = 'STOP'
                                                         AND to_timestamp((event ->> 'eventDate')::bigint / 1000.0) < o.start_time),
                                             '-infinity'::timestamptz))
                   )
              AND  EXISTS (
                       SELECT 1
                       FROM   patient_observations po
                       WHERE  po.patient_id = rec.patient_id
                         AND  po.type = 'GLUCOSE'
                         AND  COALESCE(po.deleted, FALSE) = FALSE
                         AND  po.created_date  <= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                         AND  po.effective_time <  to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0)
                         AND  po.effective_time >= to_timestamp((rfr.details ->> 'EVALUATION_DATE')::bigint / 1000.0) - INTERVAL '2 hours'
                   );

