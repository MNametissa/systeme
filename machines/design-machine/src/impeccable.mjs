import { spawnSync } from 'node:child_process';

// Impeccable possede son propre format de configuration et le fera evoluer.
// On ne l'ecrit donc jamais a la main : on passe par sa CLI, qui reste le
// proprietaire de son schema. Seule la decision vient du MASTER.

const RULE_OVERUSED_FONT = 'overused-font';

export function isAvailable() {
  const r = spawnSync('npx', ['--no-install', 'impeccable', '--version'], { encoding: 'utf8', timeout: 20000 });
  return r.status === 0;
}

// Le detecteur d'Impeccable bloque les polices surexploitees (Inter, Arial,
// system-ui). Si le MASTER en declare une, c'est un choix assume, pas de la
// slop : la derogation est generee depuis le contrat, avec sa raison.
export function waiversFromTokens(tokens) {
  const OVERUSED = /^(Inter|Roboto|Arial|Helvetica|Segoe UI|system-ui|-apple-system|Space Grotesk|Open Sans|Lato|Montserrat)$/i;
  return (tokens.typography?.families || [])
    .map(f => f.primary)
    .filter(name => OVERUSED.test(name))
    .map(name => ({
      rule: RULE_OVERUSED_FONT,
      value: name,
      reason: `Declare dans design-system/MASTER.md, source ${tokens.provenance?.typography?.source ?? '?'}`
    }));
}

export function applyWaivers(waivers, { dryRun = false } = {}) {
  const applied = [];
  for (const w of waivers) {
    const args = ['--no-install', 'impeccable', 'ignores', 'add-value', w.rule, w.value, '--reason', w.reason];
    if (dryRun) { applied.push({ ...w, command: `npx ${args.join(' ')}`, status: 'dry-run' }); continue; }
    const r = spawnSync('npx', args, { encoding: 'utf8', timeout: 60000 });
    applied.push({ ...w, status: r.status === 0 ? 'ok' : 'echec', stderr: (r.stderr || '').trim().slice(0, 300) });
  }
  return applied;
}

// La forme du JSON d'Impeccable peut bouger : on la lit defensivement et,
// a defaut, on retombe sur le code de sortie, qui est le contrat stable.
export function parseDetect(stdout) {
  let data;
  try { data = JSON.parse(stdout); } catch { return null; }
  const findings =
    Array.isArray(data) ? data :
    Array.isArray(data.findings) ? data.findings :
    Array.isArray(data.issues) ? data.issues :
    Array.isArray(data.results) ? data.results : null;
  if (!findings) return null;
  const sev = f => String(f.severity ?? f.level ?? '').toLowerCase();
  return {
    total: findings.length,
    errors: findings.filter(f => ['error', 'high', 'critical', 'fail'].includes(sev(f))).length,
    findings: findings.slice(0, 20).map(f => ({
      rule: f.rule ?? f.id ?? f.name ?? '?',
      severity: sev(f) || 'inconnu',
      where: f.file ?? f.selector ?? f.location ?? '?',
      message: f.message ?? f.description ?? ''
    }))
  };
}

export function detect(target, { json = true } = {}) {
  const args = ['--no-install', 'impeccable', 'detect'];
  if (json) args.push('--json');
  args.push(target);
  const r = spawnSync('npx', args, { encoding: 'utf8', timeout: 180000 });
  if (r.error) return { status: 'skip', reason: r.error.message };
  return {
    status: r.status === 0 ? 'pass' : 'fail',
    exitCode: r.status,
    parsed: parseDetect(r.stdout || ''),
    stdout: (r.stdout || '').slice(0, 4000),
    stderr: (r.stderr || '').trim().slice(0, 600)
  };
}
