set search_path to "mayo-mayo";
create or replace function clone_firing(src uuid, ma_shift interval) returns uuid language plpgsql as $$
declare new_rec uuid := gen_random_uuid(); new_tracking uuid := gen_random_uuid(); src_rec uuid; src_tracking uuid; new_rfr uuid := gen_random_uuid(); r record; nid uuid;
begin
  select rule_execution_context_id into src_rec from rule_fired_results where id = src;
  select tracking_id into src_tracking from rule_execution_contexts where id = src_rec;
  insert into rule_execution_contexts select (jsonb_populate_record(null::rule_execution_contexts, to_jsonb(x) || jsonb_build_object('id', new_rec, 'tracking_id', new_tracking))).* from rule_execution_contexts x where id = src_rec;
  for r in select * from rule_fired_results where rule_execution_context_id = src_rec loop
    nid := case when r.id = src then new_rfr else gen_random_uuid() end;
    insert into rule_fired_results select (jsonb_populate_record(null::rule_fired_results, to_jsonb(r) || jsonb_build_object('id', nid, 'rule_execution_context_id', new_rec))).*;
    insert into compliance_results select (jsonb_populate_record(null::compliance_results, to_jsonb(c) || jsonb_build_object('id', gen_random_uuid(), 'rule_fired_result_id', nid))).* from compliance_results c where c.rule_fired_result_id = r.id;
  end loop;
  insert into rule_not_fired_results select (jsonb_populate_record(null::rule_not_fired_results, to_jsonb(n) || jsonb_build_object('id', gen_random_uuid(), 'rule_execution_context_id', new_rec))).* from rule_not_fired_results n where n.rule_execution_context_id = src_rec;
  insert into medication_administrations select (jsonb_populate_record(null::medication_administrations, to_jsonb(m) || jsonb_build_object('id', gen_random_uuid(), 'tracking_id', new_tracking, 'administration_date', m.administration_date + ma_shift))).* from medication_administrations m where m.tracking_id = src_tracking;
  return new_rfr;
end $$;

create table if not exists or3069_fixture(label text primary key, rfr_id uuid, expect text);
-- A: in scope (overweight redose, CrCl unknown, given 2 g) -> expect rescored compliant, default 2 g
insert into or3069_fixture values ('A-inscope-2g', '01a1c670-3845-70a5-a09f-6988323609c2', 'rewritten 2 g, compliant true');
-- B: overweight first dose (no earlier bolus) -> untouched (stays 3 g / false)
insert into or3069_fixture values ('B-firstdose', '01a1c670-8826-7483-855e-ce8281d84c73', 'untouched 3 g / false');
-- C: normal weight redose -> untouched
insert into or3069_fixture values ('C-normalweight', '01a1c670-93f6-7a00-86f2-34164508acf5', 'untouched 3 g / false');
-- clones of A
insert into or3069_fixture select 'D-crcl40', clone_firing('01a1c670-3845-70a5-a09f-6988323609c2', interval '1 minute'), 'untouched 3 g / false';
insert into or3069_fixture select 'E-units-mL', clone_firing('01a1c670-3845-70a5-a09f-6988323609c2', interval '2 minute'), 'untouched 3 g / false';
insert into or3069_fixture select 'G-crcl50-2000mg', clone_firing('01a1c670-3845-70a5-a09f-6988323609c2', interval '3 minute'), 'rewritten 2 g, compliant true';
insert into or3069_fixture select 'H-inscope-given3g', clone_firing('01a1c670-3845-70a5-a09f-6988323609c2', interval '4 minute'), 'rewritten 2 g, compliant false';
insert into or3069_fixture select 'I-null-dose', clone_firing('01a1c670-3845-70a5-a09f-6988323609c2', interval '5 minute'), 'untouched 3 g / false';
insert into or3069_fixture select 'J-already-2g', clone_firing('01a1c670-3845-70a5-a09f-6988323609c2', interval '6 minute'), 'untouched 2 g / true';
insert into or3069_fixture select 'K-crcl49', clone_firing('01a1c670-3845-70a5-a09f-6988323609c2', interval '7 minute'), 'untouched 3 g / false';

-- pre-fix shape: w-default-dose-adjustment with a 3 g default on every route (shape copied from the real first-dose firing B)
update rule_fired_results set rule_identifier = 'w-default-dose-adjustment',
  route_default_dose_override = (select route_default_dose_override from rule_fired_results where id = '01a1c670-8826-7483-855e-ce8281d84c73'),
  details = (details::jsonb - 'DEFAULT_DOSE_CASE')::json
where id in (select rfr_id from or3069_fixture where label <> 'J-already-2g');
update rule_fired_results set rule_identifier = 'w-default-dose-adjustment', details = (details::jsonb - 'DEFAULT_DOSE_CASE')::json
where id = (select rfr_id from or3069_fixture where label = 'J-already-2g');

-- variant data flips
update rule_fired_results f set details = (f.details::jsonb || '{"CRCL": 40}')::json
  where f.rule_identifier = 'a-antibiotic-early-redose' and f.rule_execution_context_id = (select rule_execution_context_id from rule_fired_results where id = (select rfr_id from or3069_fixture where label='D-crcl40'));
update rule_fired_results f set details = (f.details::jsonb || '{"CRCL": 49.9}')::json
  where f.rule_identifier = 'a-antibiotic-early-redose' and f.rule_execution_context_id = (select rule_execution_context_id from rule_fired_results where id = (select rfr_id from or3069_fixture where label='K-crcl49'));
update rule_fired_results f set details = (f.details::jsonb || '{"CRCL": 50}')::json
  where f.rule_identifier = 'a-antibiotic-early-redose' and f.rule_execution_context_id = (select rule_execution_context_id from rule_fired_results where id = (select rfr_id from or3069_fixture where label='G-crcl50-2000mg'));
update medication_administrations set dose_amount = 2000, dose_units = 'mg' where tracking_id = (select rec.tracking_id from rule_fired_results r join rule_execution_contexts rec on rec.id=r.rule_execution_context_id where r.id = (select rfr_id from or3069_fixture where label='G-crcl50-2000mg'));
update medication_administrations set dose_amount = 20, dose_units = 'mL' where tracking_id = (select rec.tracking_id from rule_fired_results r join rule_execution_contexts rec on rec.id=r.rule_execution_context_id where r.id = (select rfr_id from or3069_fixture where label='E-units-mL'));
update medication_administrations set dose_amount = 3 where tracking_id = (select rec.tracking_id from rule_fired_results r join rule_execution_contexts rec on rec.id=r.rule_execution_context_id where r.id = (select rfr_id from or3069_fixture where label='H-inscope-given3g'));
update medication_administrations set dose_amount = null where tracking_id = (select rec.tracking_id from rule_fired_results r join rule_execution_contexts rec on rec.id=r.rule_execution_context_id where r.id = (select rfr_id from or3069_fixture where label='I-null-dose'));

create or replace view or3069_state as
select x.label, x.expect, r.id as rfr_id, r.rule_identifier, rec.weight_classification,
       r.route_default_dose_override->'INTRAVENOUS'->>'calculatedLabel' as iv_default,
       r.route_default_dose_override->'INTRAOSSEOUS'->>'calculatedLabel' as io_default,
       (select string_agg(cr.compliant::text, ',') from compliance_results cr where cr.rule_fired_result_id = r.id and cr.label='default-dose') as default_dose_compliant,
       ma.dose_amount, ma.dose_units,
       (select e.details::jsonb->'CRCL' from rule_fired_results e where e.rule_execution_context_id=rec.id and e.rule_identifier='a-antibiotic-early-redose' limit 1) as crcl
from or3069_fixture x join rule_fired_results r on r.id = x.rfr_id join rule_execution_contexts rec on rec.id = r.rule_execution_context_id
left join medication_administrations ma on ma.tracking_id = rec.tracking_id order by x.label;
