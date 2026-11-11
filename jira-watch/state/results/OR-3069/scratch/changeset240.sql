set search_path to "mayo-mayo";
begin;

            WITH recognized_route(route) AS (
                VALUES ('INTRAVENOUS'), ('INTRAOSSEOUS'), ('ORAL'), ('GASTRIC_TUBE'),
                       ('GASTROSTOMY_TUBE'), ('INJECTION'), ('INTRAMUSCULAR')
            ),
            target AS (
                SELECT DISTINCT ON (rfr.id)
                       rfr.id AS firing_id,
                       CASE LOWER(ma.dose_units)
                           WHEN 'g' THEN ma.dose_amount = 2
                           WHEN 'mg' THEN ma.dose_amount = 2000
                       END AS given_two_grams
                FROM   rule_fired_results rfr
                       JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
                       JOIN operations op ON op.id = rec.operation_id
                       JOIN medication_administrations ma ON ma.tracking_id = rec.tracking_id
                                                         AND COALESCE(ma.deleted, FALSE) = FALSE
                       CROSS JOIN LATERAL (
                           SELECT COALESCE(
                               (SELECT f.details::jsonb -> 'CRCL'
                                FROM   rule_fired_results f
                                WHERE  f.rule_execution_context_id = rec.id
                                  AND  f.rule_identifier = 'a-antibiotic-early-redose'
                                  AND  f.details::jsonb -> 'CRCL' IS NOT NULL
                                LIMIT 1),
                               (SELECT n.details::jsonb -> 'CRCL'
                                FROM   rule_not_fired_results n
                                WHERE  n.rule_execution_context_id = rec.id
                                  AND  n.rule_identifier = 'a-antibiotic-early-redose'
                                  AND  n.details::jsonb -> 'CRCL' IS NOT NULL
                                LIMIT 1)
                           ) AS crcl
                       ) recorded
                WHERE  rfr.rule_identifier = 'w-default-dose-adjustment'
                  AND  rfr.details::jsonb ->> 'MEDICATION_IDENTIFIER' = 'm-cefazolin'
                  AND  COALESCE(rec.weight_classification, rfr.details::jsonb ->> 'WEIGHT_CLASSIFICATION')
                           IN ('OVERWEIGHT1', 'OVERWEIGHT2')
                  AND  json_typeof(rfr.route_default_dose_override) = 'object'
                  AND  NOT EXISTS (
                           SELECT 1
                           FROM   json_each(rfr.route_default_dose_override) route_default
                           WHERE  route_default.value ->> 'calculatedLabel' IS DISTINCT FROM '3 g'
                       )
                  AND  ma.dose_amount IS NOT NULL
                  AND  LOWER(ma.dose_units) IN ('g', 'mg')
                  AND  EXISTS (
                           SELECT 1
                           FROM   medication_administrations earlier
                           WHERE  earlier.operation_id = rec.operation_id
                             AND  earlier.medication_identifier = 'm-cefazolin'
                             AND  COALESCE(earlier.deleted, FALSE) = FALSE
                             AND  earlier.route IN (SELECT route FROM recognized_route)
                             AND  earlier.tracking_id IS DISTINCT FROM rec.tracking_id
                             AND  earlier.administration_date >= op.start_time - INTERVAL '1 minute'
                             AND  earlier.administration_date <= ma.administration_date
                       )
                  AND  (jsonb_typeof(recorded.crcl) = 'null'
                        OR (jsonb_typeof(recorded.crcl) = 'number' AND (recorded.crcl::text)::numeric >= 50))
                ORDER BY rfr.id, ma.last_modified_date DESC
            ),
            rewritten_default AS (
                UPDATE rule_fired_results rfr
                SET    route_default_dose_override = (
                           SELECT json_object_agg(
                                      route_default.key,
                                      (route_default.value::jsonb
                                          || '{"doseAmount": 2.0, "doseUnits": "g", "calculatedDoseAmount": "2", "calculatedDoseUnits": "g", "calculatedLabel": "2 g", "rawLabel": "2 g"}'::jsonb
                                      )::json)
                           FROM   json_each(rfr.route_default_dose_override) route_default
                       ),
                       last_modified_date = NOW()
                FROM   target
                WHERE  rfr.id = target.firing_id
                RETURNING rfr.id
            )
            UPDATE compliance_results cr
            SET    compliant          = target.given_two_grams,
                   last_modified_date = NOW()
            FROM   target
            WHERE  cr.rule_fired_result_id = target.firing_id
              AND  cr.label = 'default-dose'
              AND  cr.compliant IS DISTINCT FROM target.given_two_grams;
        
commit;
