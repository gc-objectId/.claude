SET search_path TO "mayo-mayo";
SELECT rfr.id, rfr.rule_identifier, cr.compliant, rfr.default_dose_override::text AS default_override, rfr.route_default_dose_override::text AS route_default,
  (SELECT string_agg(calculated_dose_amount||' '||calculated_dose_units, ',') FROM medication_administrations ma WHERE ma.tracking_id = rec.tracking_id) AS dose,
  COALESCE((SELECT f.details::jsonb->>'CRCL' FROM rule_fired_results f WHERE f.rule_execution_context_id = rec.id AND f.rule_identifier='a-antibiotic-early-redose' LIMIT 1),
           (SELECT n.details::jsonb->>'CRCL' FROM rule_not_fired_results n WHERE n.rule_execution_context_id = rec.id AND n.rule_identifier='a-antibiotic-early-redose' LIMIT 1), '-') AS crcl
FROM rule_fired_results rfr JOIN rule_execution_contexts rec ON rec.id = rfr.rule_execution_context_id
JOIN compliance_results cr ON cr.rule_fired_result_id = rfr.id AND cr.label='default-dose'
WHERE rfr.id::text LIKE '11111111-1111-1111-1111-%' ORDER BY rfr.id;
