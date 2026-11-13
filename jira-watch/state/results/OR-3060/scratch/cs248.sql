SET search_path TO "mayo-mayo";
SET LOCAL lock_timeout = '2s';
UPDATE compliance_results cr
            SET    compliant          = (moderate_dose.dose_amount = ma.dose_amount),
                   last_modified_date = NOW()
            FROM   rule_fired_results rfr
                   JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
                   JOIN medication_administrations ma ON ma.tracking_id = rec.tracking_id
                   CROSS JOIN LATERAL (
                       SELECT CASE
                                  WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 180 AND 219 THEN 4
                                  WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 220 AND 259 THEN 6
                                  WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 260 AND 299 THEN 8
                                  WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 300 AND 339 THEN 10
                                  WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 340 AND 379 THEN 12
                                  WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 380 AND 399 THEN 13
                              END AS dose_amount
                   ) moderate_dose
            WHERE  cr.rule_fired_result_id = rfr.id
              AND  rfr.rule_identifier = 'w-insulin-default-dose'
              AND  cr.label = 'default-dose'
              AND  COALESCE((rfr.details ->> 'USE_MODERATE_DOSE_SCALE')::boolean, FALSE) = FALSE
              AND  (rfr.details ->> 'LAST_GLUCOSE') ~ '^[0-9]+$'
              AND  moderate_dose.dose_amount IS NOT NULL
              AND  COALESCE(ma.deleted, FALSE) = FALSE
              AND  ma.route = 'SUBCUTANEOUS'
              AND  rfr.route_default_dose_override::jsonb ? 'SUBCUTANEOUS'
              AND  ma.dose_amount IS NOT NULL
              AND  LOWER(ma.dose_units) = 'units'
              AND  EXISTS (
                       SELECT 1
                       FROM   patient_conditions pc
                              JOIN condition_tags ct ON ct.id = pc.condition_id
                       WHERE  pc.patient_id = rec.patient_id
                         AND  ct.tags = 'DIABETES_TYPE_2'
                   )
              AND  cr.compliant <> (moderate_dose.dose_amount = ma.dose_amount);
WITH reclassified AS (
                SELECT rfr.id                         AS rule_fired_result_id,
                       rfr.route_default_dose_override AS override,
                       CASE
                           WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 180 AND 219 THEN 4
                           WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 220 AND 259 THEN 6
                           WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 260 AND 299 THEN 8
                           WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 300 AND 339 THEN 10
                           WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 340 AND 379 THEN 12
                           WHEN (rfr.details ->> 'LAST_GLUCOSE')::int BETWEEN 380 AND 399 THEN 13
                       END AS moderate_dose
                FROM   rule_fired_results rfr
                       JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
                WHERE  rfr.rule_identifier = 'w-insulin-default-dose'
                  AND  COALESCE((rfr.details ->> 'USE_MODERATE_DOSE_SCALE')::boolean, FALSE) = FALSE
                  AND  (rfr.details ->> 'LAST_GLUCOSE') ~ '^[0-9]+$'
                  AND  rfr.route_default_dose_override::jsonb ? 'SUBCUTANEOUS'
                  AND  EXISTS (
                           SELECT 1
                           FROM   patient_conditions pc
                                  JOIN condition_tags ct ON ct.id = pc.condition_id
                           WHERE  pc.patient_id = rec.patient_id
                             AND  ct.tags = 'DIABETES_TYPE_2'
                       )
            )
            UPDATE rule_fired_results rfr
            SET    route_default_dose_override = jsonb_set(
                       reclassified.override::jsonb,
                       '{SUBCUTANEOUS}',
                       (reclassified.override -> 'SUBCUTANEOUS')::jsonb || jsonb_build_object(
                           'doseAmount', reclassified.moderate_dose::numeric(10,1),
                           'calculatedDoseAmount', reclassified.moderate_dose::text,
                           'calculatedLabel', reclassified.moderate_dose::text || ' ' ||
                               (reclassified.override -> 'SUBCUTANEOUS' ->> 'calculatedDoseUnits'),
                           'rawLabel', reclassified.moderate_dose::text || ' ' ||
                               (reclassified.override -> 'SUBCUTANEOUS' ->> 'doseUnits')
                       )
                   )::json,
                   last_modified_date = NOW()
            FROM   reclassified
            WHERE  rfr.id = reclassified.rule_fired_result_id
              AND  reclassified.moderate_dose IS NOT NULL;
UPDATE rule_fired_results rfr
            SET    details            = jsonb_set(rfr.details::jsonb, '{USE_MODERATE_DOSE_SCALE}', 'true')::json,
                   last_modified_date = NOW()
            FROM   rule_execution_contexts rec
            WHERE  rec.id = rfr.rule_execution_context_id
              AND  rfr.rule_identifier = 'w-insulin-default-dose'
              AND  COALESCE((rfr.details ->> 'USE_MODERATE_DOSE_SCALE')::boolean, FALSE) = FALSE
              AND  EXISTS (
                       SELECT 1
                       FROM   patient_conditions pc
                              JOIN condition_tags ct ON ct.id = pc.condition_id
                       WHERE  pc.patient_id = rec.patient_id
                         AND  ct.tags = 'DIABETES_TYPE_2'
                   );