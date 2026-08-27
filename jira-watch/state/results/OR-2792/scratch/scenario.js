const { req, login } = require('./client');

function J(r) { try { return JSON.parse(r.body); } catch (e) { throw new Error(`${r.status} ${r.body.slice(0,400)}`); } }

async function makeCase(procs) {
  const p = J(await req('POST', '/api/admin/patients/', { body: JSON.stringify({ prmnPrefix: 'or2792' }) }));
  const op = J(await req('POST', `/api/admin/patients/${p.uuid}/operations/create`,
    { body: JSON.stringify({ startTime: new Date(Date.now() + 3600e3).toISOString(), procedureTypes: procs.map(id => ({ id })) }) }));
  return { pmrn: p.pmrn, patientUuid: p.uuid, caseId: op.caseId, op };
}

async function candidates(pmrn, caseId) {
  const r = await req('GET', `/api/admin/patients/${encodeURIComponent(pmrn)}/operations/${caseId}/antibiotic-candidates`);
  return J(r);
}

function summarize(d) {
  const lines = [];
  lines.push(`outcome=${d.outcome}  caseAcuity=${d.caseAcuity}`);
  lines.push(`recommended=${JSON.stringify((d.recommended || []).map(o => o.medicationCategories || o))}`);
  lines.push(`contraindicated=${JSON.stringify(d.contraindicated)}`);
  for (const pr of d.procedures) {
    lines.push(`  procedure ${pr.procedure.identifier} risk=${pr.procedureRisk}`);
    for (const pw of pr.pathways) {
      lines.push(`    pathway ${pw.position} applies=${pw.appliesToCase} noProph=${pw.noProphylaxis} :: ${pw.notation}`);
      for (const st of pw.steps) for (const o of st.options)
        lines.push(`       step ${st.stepNumber}: ${o.medicationCategories.join(' AND ')} -> ${o.status}`);
    }
  }
  return lines.join('\n');
}

async function addAllergy(pmrn, caseId, allergen) {
  const q = `caseId=${caseId}&type=ALLERGEN&identifier=${encodeURIComponent(allergen)}&reaction=${encodeURIComponent('Rash')}`;
  const r = await req('POST', `/api/admin/patients/${encodeURIComponent(pmrn)}/allergies?${q}`, { body: '{}' });
  return r;
}

module.exports = { makeCase, candidates, summarize, addAllergy, login, req, J };
