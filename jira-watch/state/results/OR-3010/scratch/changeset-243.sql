set search_path to "mayo-mayo";
begin;
SET LOCAL lock_timeout = '2s';
WITH target AS (
                SELECT cr.id AS compliance_result_id,
                       rfr.id AS firing_id,
                       actual.kg,
                       expected.grams,
                       given.grams AS given_grams
                FROM   compliance_results cr
                       JOIN rule_fired_results rfr ON rfr.id = cr.rule_fired_result_id
                       JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
                       CROSS JOIN LATERAL (
                           SELECT COUNT(*) AS administrations,
                                  MIN(CASE LOWER(ma.calculated_dose_units)
                                          WHEN 'g' THEN ma.calculated_dose_amount
                                          WHEN 'mg' THEN ma.calculated_dose_amount / 1000
                                      END) AS grams
                           FROM   medication_administrations ma
                           WHERE  ma.tracking_id = rec.tracking_id
                             AND  COALESCE(ma.deleted, FALSE) = FALSE
                       ) given
                       CROSS JOIN LATERAL (
                           SELECT CASE LOWER(obs.observation_units)
                                      WHEN 'kg' THEN obs.observation_value::numeric
                                      WHEN 'g' THEN obs.observation_value::numeric / 1000
                                  END AS kg
                           FROM   patient_observations obs
                           WHERE  obs.patient_id = rec.patient_id
                             AND  obs.type = 'BODY_WEIGHT'
                             AND  COALESCE(obs.deleted, FALSE) = FALSE
                             AND  obs.effective_time <= rfr.created_date
                             AND  obs.observation_value ~ '^[0-9]+(\.[0-9]+)?$'
                           ORDER BY obs.effective_time DESC
                           LIMIT 1
                       ) actual
                       CROSS JOIN LATERAL (
                           SELECT CASE WHEN actual.kg >= 40
                                       THEN ROUND(actual.kg * 15 / 1000 / 0.25) * 0.25
                                       ELSE actual.kg * 15 / 1000
                                  END AS grams
                       ) expected
                WHERE  cr.label = 'default-dose'
                  AND  cr.compliant = FALSE
                  AND  rfr.rule_identifier = 'w-default-dose-adjustment'
                  AND  rfr.details::jsonb ->> 'MEDICATION_IDENTIFIER' = 'm-vancomycin-iv'
                  AND  rec.weight_type = 'IDEAL'
                  AND  json_typeof(rfr.route_default_dose_override) = 'object'
                  AND  given.administrations = 1
            ),
            matched AS (
                SELECT target.*,
                       CASE WHEN target.kg >= 40
                            THEN jsonb_build_object(
                                     'calculatedDoseAmount', trim_scale(target.grams)::text,
                                     'calculatedDoseUnits', 'g',
                                     'calculatedLabel', trim_scale(target.grams)::text || ' g',
                                     'weightBasedDoseCalculation',
                                         '15 mg/kg × ' || RTRIM(TO_CHAR(target.kg, 'FM999,990.9'), '.') || ' kg (recorded weight)<br/>='
                                         || RTRIM(TO_CHAR(target.kg * 15, 'FM999,999,990.99'), '.') || ' mg, rounded to the nearest 0.2 g<br/>≈'
                                         || trim_scale(target.grams)::text || ' g')
                            ELSE jsonb_build_object(
                                     'calculatedDoseAmount', RTRIM(TO_CHAR(target.kg * 15, 'FM990.9999'), '.'),
                                     'calculatedDoseUnits', 'mg',
                                     'calculatedLabel', RTRIM(TO_CHAR(target.kg * 15, 'FM990.9999'), '.') || ' mg',
                                     'weightBasedDoseCalculation',
                                         '15 mg/kg × ' || RTRIM(TO_CHAR(target.kg, 'FM999,990.9'), '.') || ' kg (recorded weight)<br/>='
                                         || RTRIM(TO_CHAR(target.kg * 15, 'FM999,999,990.99'), '.') || ' mg')
                       END AS actual_weight_default
                FROM   target
                WHERE  target.given_grams = target.grams
            ),
            rewritten_default AS (
                UPDATE rule_fired_results rfr
                SET    route_default_dose_override = (
                           SELECT json_object_agg(
                                      route_default.key,
                                      (route_default.value::jsonb || matched.actual_weight_default)::json)
                           FROM   json_each(rfr.route_default_dose_override) route_default
                       ),
                       last_modified_date = NOW()
                FROM   matched
                WHERE  rfr.id = matched.firing_id
                RETURNING rfr.id
            )
            UPDATE compliance_results cr
            SET    compliant          = TRUE,
                   last_modified_date = NOW()
            FROM   matched
            WHERE  cr.id = matched.compliance_result_id;
commit;
