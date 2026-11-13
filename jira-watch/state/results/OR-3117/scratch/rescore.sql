
            WITH target AS (
                SELECT rfr.id AS firing_id
                FROM   rule_fired_results rfr
                       JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
                       JOIN compliance_results cr ON cr.rule_fired_result_id = rfr.id
                                                 AND cr.label = 'default-dose'
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
                       CROSS JOIN LATERAL (
                           SELECT COUNT(*) AS administration_count,
                                  MIN(ma.calculated_dose_amount
                                      * CASE LOWER(ma.calculated_dose_units) WHEN 'mg' THEN 0.001 WHEN 'g' THEN 1 END) AS dose_g
                           FROM   medication_administrations ma
                           WHERE  ma.tracking_id = rec.tracking_id
                             AND  NOT COALESCE(ma.deleted, FALSE)
                       ) given
                       LEFT JOIN LATERAL (
                           SELECT obs.observation_value::numeric AS actual_kg
                           FROM   patient_observations obs
                           WHERE  obs.patient_id = rec.patient_id
                             AND  obs.type = 'BODY_WEIGHT'
                             AND  obs.observation_units = 'kg'
                             AND  obs.observation_value ~ '^[0-9]+(\.[0-9]+)?$'
                             AND  NOT COALESCE(obs.deleted, FALSE)
                             AND  obs.effective_time <= rfr.created_date
                           ORDER BY obs.effective_time DESC
                           LIMIT 1
                       ) weighed ON TRUE
                       CROSS JOIN LATERAL (
                           SELECT ROUND(15 * weighed.actual_kg / 1000 / 0.25) * 0.25 AS minimum_g,
                                  ROUND(20 * weighed.actual_kg / 1000 / 0.25) * 0.25 AS maximum_g
                       ) band
                WHERE  rfr.rule_identifier = 'w-default-dose-adjustment'
                  AND  rfr.details::jsonb ->> 'MEDICATION_IDENTIFIER' = 'm-vancomycin-iv'
                  AND  cr.compliant = FALSE
                  AND  jsonb_typeof(recorded.crcl) = 'number'
                  AND  (recorded.crcl::text)::numeric < 50
                  AND  given.administration_count = 1
                  AND  given.dose_g IS NOT NULL
                  AND  weighed.actual_kg IS NOT NULL
                  AND  given.dose_g BETWEEN band.minimum_g AND band.maximum_g
            ),
            removed_default AS (
                UPDATE rule_fired_results rfr
                SET    route_default_dose_override = '{}'::json,
                       default_dose_override       = NULL,
                       last_modified_date          = NOW()
                FROM   target
                WHERE  rfr.id = target.firing_id
                RETURNING rfr.id
            )
            UPDATE compliance_results cr
            SET    compliant          = TRUE,
                   last_modified_date = NOW()
            FROM   target
            WHERE  cr.rule_fired_result_id = target.firing_id
              AND  cr.label = 'default-dose';
        
