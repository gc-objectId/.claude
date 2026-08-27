# OR-2806 — Nerve block confirmation if different admins and not an edit

Status: Testing   Assignee: Ryan Ducharme

## Description

For 019fdc7b-2df0-79e7-99d3-4d4bec456e6b - there are 2 nerve blocks of 50mg within 4 mins of each other and we wanted to confirm these are the same med admin and not an edit (in bold below)

*Local Anesthetic Dosing Summary*

Medication: Bupivacaine (preservative-free) 0.25% (2.5 mg/mL) injection
Evaluation time: August 7, 2026 at 13:41
Patient weight: 122 kg actual; dosing based on ideal body weight of 57.8 kg (weight classification: normal)
Known allergies: none on file

Doses administered:

* *Bupivacaine 0.25%, 50 mg, nerve block, at 13:41 on 08/07/2026*
* *Bupivacaine 0.25%, 50 mg, nerve block, at 13:37 on 08/07/2026*
* Lidocaine 2%, 100 mg, IV, at 12:55 on 08/07/2026

Maximum dose calculation (same result for epidural, spinal, and nerve block routes, since all use the same drug and concentration):

* Bupivacaine max dose = 2.5 mg/kg × 57.8 kg ideal weight = 144.46 mg (rounded down to 144 mg, about 57 mL)
* 50 mg given ÷ 144.46 mg max = 35% of max
* Lidocaine max dose = 1.5 mg/kg × 57.8 kg ideal weight = 86.68 mg
* 100 mg given ÷ 86.68 mg max = 115% of max
* Combined percent of maximum administered = 35% + 115% = 150%
* Remaining allowable amount = 0%

Remaining allowed dose (all routes — epidural, spinal, nerve block): 0 mg (about 0 mL)



|019fdc7b-2df0-79e7-99d3-4d4bec456e6b|August 7, 2026, 8:48 AM|w-last-local-anesthetic-max-dose|m-bupivacaine-0.25| |144 mg (≈57 mL)|0 mg (≈0 mL)|20|mL|NERVE_BLOCK|August 7, 2026, 8:41 AM|Wrong Dose|{"MEDICATION_IDENTIFIER":"m-bupivacaine-0.25","EPIDURAL_CONCENTRATION_MG_ML":"2.5","IDEAL_WEIGHT":{"value":57.7874,"unit":"kg"},"NERVE_BLOCK_REMAINING_ALLOWED_DOSE":"0","NERVE_BLOCK_ROUNDING_TEXT":"(rounded down)","SPINAL_MAX_DOSE_VALUE":"144","NERVE_BLOCK_REMAINING_DOSE":"0 mg (≈0 mL)","REMAINING_DOSE_ML_PER_ROUTE":{"EPIDURAL":0.0000,"NERVE_BLOCK":0.0000,"SPINAL":0.0000},"SPINAL_MAX_DOSE_UNIT":"mg","WEIGHT_CLASSIFICATION":"NORMAL","SPINAL_MAX_DOSE_TIMES_CONCENTRATION_ML":"57.78","SPINAL_MAX_DOSE_MG":"144","EPIDURAL_REMAINING_ALLOWED_DOSE_AMOUNT_ML":0.0,"EPIDURAL_REMAINING_ALLOWED_DOSE_AMOUNT_MG":0.0,"WEIGHT_CALCULATION_TYPE":"IDEAL","SPINAL_MAX_DOSE_MG_PER_KG":"2.5","SPINAL_MAX_DOSE_ML":57.7874,"NERVE_BLOCK_MAX_DOSE_TIMES_CONCENTRATION_ML":"57.78","MEDICATION_NAME":"Bupivacaine","SPINAL_REMAINING_DOSE_ML":"0","EPIDURAL_MAX_DOSE_MG_PER_KG":"2.5","SPINAL_ROUNDING_TEXT":"(rounded down)","NERVE_BLOCK_MAX_DOSE_MG_PER_KG":"2.5","NERVE_BLOCK_MAX_DOSE":"144 mg (≈57 mL)","SPINAL_MAX_DOSE":"144 mg (≈57 mL)","NERVE_BLOCK_EXPANDED_CALCULATION":"<br/><expandable title=\"Show Calculation\">Bupivacaine (pf) 0.25 % (2.5 Mg/ml) Injection Solution max dose = 2.5 mg/kg × 57.8 kg ideal weight = 144.46 mg<br/>50 mg ÷ 144.46 mg = 35%<br/><br/>Lidocaine (pf) 100 Mg/5 Ml (2 %) Intravenous Syringe max dose = 1.5 mg/kg × 57.8 kg ideal weight = 86.68 mg<br/>100 mg ÷ 86.68 mg = 115%<br/><br/>Total percent of max administered = 35% + 115% = 150%<br/>Remaining amount = 0%</expandable>","EPIDURAL_MAX_DOSE_VALUE":"144","NERVE_BLOCK_REMAINING_ALLOWED_DOSE_AMOUNT_ML":0.0,"AVAILABLE_ROUTES":["EPIDURAL","SPINAL","NERVE_BLOCK"],"NERVE_BLOCK_REMAINING_ALLOWED_DOSE_AMOUNT_MG":0.0,"EPIDURAL_REMAINING_PERCENT":"0%","EVALUATION_DATE":1786110060000,"BUFFER_MG":5.0,"BUFFER_ML":1.0,"EPIDURAL_EXPANDED_CALCULATION":"<br/><expandable title=\"Show Calculation\">Bupivacaine (pf) 0.25 % (2.5 Mg/ml) Injection Solution max dose = 2.5 mg/kg × 57.8 kg ideal weight = 144.46 mg<br/>50 mg ÷ 144.46 mg = 35%<br/><br/>Lidocaine (pf) 100 Mg/5 Ml (2 %) Intravenous Syringe max dose = 1.5 mg/kg × 57.8 kg ideal weight = 86.68 mg<br/>100 mg ÷ 86.68 mg = 115%<br/><br/>Total percent of max administered = 35% + 115% = 150%<br/>Remaining amount = 0%</expandable>","NERVE_BLOCK_HAS_CONCENTRATION":true,"NERVE_BLOCK_REMAINING_PERCENT":"0%","EPIDURAL_REMAINING_DOSE":"0 mg (≈0 mL)","EPIDURAL_ROUNDING_TEXT":"(rounded down)","EPIDURAL_MAX_DOSE_ML":57.7874,"SPINAL_REMAINING_ALLOWED_DOSE":"0","PATIENT_ALLERGIES_FULL":[],"EPIDURAL_MAX_DOSE_MG":"144","PATIENT_WEIGHT_KG":"57.8","EPIDURAL_HAS_CONCENTRATION":true,"WEIGHT_TYPE":"ideal weight","LOCAL_ANESTHETIC_ADMINISTRATIONS":[{"name":"Bupivacaine 0.25%","dose":"50 mg","route":"Block","time":"at 13:41 on 08/07/2026"},{"name":"Bupivacaine 0.25%","dose":"50 mg","route":"Block","time":"at 13:37 on 08/07/2026"},{"name":"Lidocaine 2%","dose":"100 mg","route":"IV","time":"at 12:55 on 08/07/2026"}],"NERVE_BLOCK_REMAINING_DOSE_ML":"0","SPINAL_CONCENTRATION_MG_ML":"2.5","NERVE_BLOCK_CONCENTRATION_MG_ML":"2.5","SUPPRESSED_ALLERGIES":[],"EPIDURAL_MAX_DOSE_UNIT":"mg","IS_LIDOCAINE":false,"SPINAL_HAS_CONCENTRATION":true,"SPINAL_REMAINING_PERCENT":"0%","NERVE_BLOCK_MAX_DOSE_VALUE":"144","CITATION_MEDICATION_NAME":"Bupivacaine","SPINAL_REMAINING_DOSE":"0 mg (≈0 mL)","SPINAL_REMAINING_ALLOWED_DOSE_AMOUNT_ML":0.0,"EPIDURAL_REMAINING_ALLOWED_DOSE":"0","EPIDURAL_MAX_DOSE":"144 mg (≈57 mL)","NERVE_BLOCK_MAX_DOSE_ML":57.7874,"ACTUAL_WEIGHT":{"value":122,"unit":"kg"},"SPINAL_EXPANDED_CALCULATION":"<br/><expandable title=\"Show Calculation\">Bupivacaine (pf) 0.25 % (2.5 Mg/ml) Injection Solution max dose = 2.5 mg/kg × 57.8 kg ideal weight = 144.46 mg<br/>50 mg ÷ 144.46 mg = 35%<br/><br/>Lidocaine (pf) 100 Mg/5 Ml (2 %) Intravenous Syringe max dose = 1.5 mg/kg × 57.8 kg ideal weight = 86.68 mg<br/>100 mg ÷ 86.68 mg = 115%<br/><br/>Total percent of max administered = 35% + 115% = 150%<br/>Remaining amount = 0%</expandable>","NERVE_BLOCK_MAX_DOSE_MG":"144","EPIDURAL_REMAINING_DOSE_ML":"0","EPIDURAL_MAX_DOSE_TIMES_CONCENTRATION_ML":"57.78","SPINAL_REMAINING_ALLOWED_DOSE_AMOUNT_MG":0.0,"NERVE_BLOCK_MAX_DOSE_UNIT":"mg"}|

## Comments (1)

### Theodore Nguyen-Cao — 2026-08-18T21:43:50

Yes, there were two.

