const c = require('./client.js');
const { msg } = require('./build.js');
const ANES = [
  { role: '2.10^Anesthesiologist' },
  { role: '2.20^CRNA' },
  { role: '2.60^Resident - Anesthesia' },
  { role: '2.100^Student Nurse Anesthetist' },
];
function roster(overrides) { return ANES.map(r => Object.assign({}, r, overrides[r.role.split('^')[0]] || {})); }

const scenarios = {
  P1_inroom: { mcid: '900001', caseId: 'OR2782P1', pmrn: '99887701', csn: '2000009887701', event: 'In Room',
               senderId: '9101', senderName: ['OPTIME','PERIOP','NURSE'], anesRows: roster({}) },
  P1_anesstart: { mcid: '900002', caseId: 'OR2782P1', pmrn: '99887701', csn: '2000009887701', event: 'Anes Start',
               senderId: '9101', senderName: ['OPTIME','PERIOP','NURSE'],
               anesRows: roster({ '2.10': { personId: '7001', family: 'ANESDOC', given: 'ALICE' } }) },
  N1_anesstart: { mcid: '900003', caseId: 'OR2782N1', pmrn: '99887702', csn: '2000009887702', event: 'Anes Start',
               senderId: '9102', senderName: ['OPTIME','PERIOP','NURSE'],
               anesRows: roster({ '2.10': { personId: '7002', family: 'ANESDOC', given: 'BOB' } }) },
  N1_inroom: { mcid: '900004', caseId: 'OR2782N1', pmrn: '99887702', csn: '2000009887702', event: 'In Room',
               senderId: '9103', senderName: ['OPTIME','OTHER','NURSE'], anesRows: roster({}) },
  R1_anesstart: { mcid: '900005', caseId: 'OR2782REDFLIP', pmrn: '99887703', csn: '2000009887703', event: 'Anes Start',
               senderId: '9102', senderName: ['OPTIME','PERIOP','NURSE'],
               anesRows: roster({ '2.10': { personId: '7002', family: 'ANESDOC', given: 'BOB' } }) },
  R1_inroom_GREEN: { mcid: '900006', caseId: 'OR2782REDFLIP', pmrn: '99887703', csn: '2000009887703', event: 'In Room',
               senderId: '9103', senderName: ['OPTIME','OTHER','NURSE'],
               anesRows: roster({ '2.10': { personId: '7004', family: 'ANESDOC', given: 'CAROL' } }) },
  R1_flipped_RED: { mcid: '900007', caseId: 'OR2782REDFLIP', pmrn: '99887703', csn: '2000009887703', event: 'Anes Start',
               senderId: '9103', senderName: ['OPTIME','OTHER','NURSE'],
               anesRows: roster({ '2.10': { personId: '7004', family: 'ANESDOC', given: 'CAROL' } }) },
  R2_seed_inroom: { mcid: '900010', caseId: 'OR2782REDFLIP2', pmrn: '99887704', csn: '2000009887704', event: 'In Room',
               senderId: '9105', senderName: ['OPTIME','SEED','NURSE'], anesRows: roster({}) },
  R2_green_inroom: { mcid: '900011', caseId: 'OR2782REDFLIP2', pmrn: '99887704', csn: '2000009887704', event: 'In Room',
               senderId: '9106', senderName: ['OPTIME','OTHER','NURSE'],
               anesRows: roster({ '2.10': { personId: '7004', family: 'ANESDOC', given: 'CAROL' } }) },
  R2_revert_inroom: { mcid: '900013', caseId: 'OR2782REDFLIP2', pmrn: '99887704', csn: '2000009887704', event: 'In Room',
               senderId: '9106', senderName: ['OPTIME','OTHER','NURSE'],
               anesRows: roster({ '2.10': { personId: '7004', family: 'ANESDOC', given: 'CAROL' } }) },
  R2_red_anesstart: { mcid: '900012', caseId: 'OR2782REDFLIP2', pmrn: '99887704', csn: '2000009887704', event: 'Anes Start',
               senderId: '9106', senderName: ['OPTIME','OTHER','NURSE'],
               anesRows: roster({ '2.10': { personId: '7004', family: 'ANESDOC', given: 'CAROL' } }) },
  X_prefix_inroom: { mcid: '900020', caseId: 'OR2782PREFIX', pmrn: '99887705', csn: '2000009887705', event: 'In Room',
               senderId: '9101', senderName: ['OPTIME','PERIOP','NURSE'], anesRows: roster({}) },
  X_prefix_anesstart: { mcid: '900021', caseId: 'OR2782PREFIX', pmrn: '99887705', csn: '2000009887705', event: 'Anes Start',
               senderId: '9101', senderName: ['OPTIME','PERIOP','NURSE'],
               anesRows: roster({ '2.10': { personId: '7001', family: 'ANESDOC', given: 'ALICE' } }) },
  Z_restore_inroom: { mcid: '900030', caseId: 'OR2782RESTORE', pmrn: '99887706', csn: '2000009887706', event: 'In Room',
               senderId: '9101', senderName: ['OPTIME','PERIOP','NURSE'], anesRows: roster({}) },
  Z_restore_anesstart: { mcid: '900031', caseId: 'OR2782RESTORE', pmrn: '99887706', csn: '2000009887706', event: 'Anes Start',
               senderId: '9101', senderName: ['OPTIME','PERIOP','NURSE'],
               anesRows: roster({ '2.10': { personId: '7001', family: 'ANESDOC', given: 'ALICE' } }) },
  E_empty_inroom: { mcid: '900040', caseId: 'OR2782EMPTYAIP', pmrn: '99887707', csn: '2000009887707', event: 'In Room',
               senderId: '9101', senderName: ['OPTIME','PERIOP','NURSE'], anesRows: roster({}) },
  E_empty_anesstart: { mcid: '900041', caseId: 'OR2782EMPTYAIP', pmrn: '99887707', csn: '2000009887707', event: 'Anes Start',
               senderId: '9110', senderName: ['OPTIME','LATER','NURSE'], anesRows: roster({}) },
  K_rank_anesstart: { mcid: '900050', caseId: 'OR2782RANK', pmrn: '99887708', csn: '2000009887708', event: 'Anes Start',
               senderId: '9101', senderName: ['OPTIME','PERIOP','NURSE'],
               anesRows: [ { role: '2.60^Resident - Anesthesia', personId: '7060', family: 'RESIDENT', given: 'RITA' },
                           { role: '2.20^CRNA', personId: '7020', family: 'CRNA', given: 'CHRIS' },
                           { role: '2.100^Student Nurse Anesthetist', personId: '7100', family: 'SRNA', given: 'SAM' } ] },
};

(async () => {
  const which = process.argv[2];
  await c.login('admin', 'admin');
  const s = scenarios[which];
  if (!s) { console.error('unknown scenario', which); process.exit(1); }
  const raw = msg(s);
  require('fs').writeFileSync(which + '.hl7', raw.replace(/\r/g, '\n'));
  const res = await c.post('/api/admin/hl7-inbound-messages/send', { rawMessage: raw }, 'mayo-mayo');
  console.log(which, res.status, res.body.slice(0, 400));
})();
