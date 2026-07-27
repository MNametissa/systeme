// Une seule porte, deux questions. Trois hooks qui parlent chacun dans leur
// coin, c'est trois fois plus de bruit et aucune decision consolidee.
//
//   dm verify          -> est-ce conforme a TON contrat ?
//   impeccable detect  -> est-ce de la slop generique ?
//
// Une etape absente (skip) est ignoree : une porte qui echoue faute d'outil
// est une porte qu'on desactive. Une PANNE (error) ferme : tokens corrompus,
// capture qui leve, timeout — ne pas pouvoir verifier n'est pas etre conforme.

export function composeVerdict(steps) {
  const ran = steps.filter(s => s.status !== 'skip');
  const failed = ran.filter(s => s.status === 'fail' || s.status === 'error');
  return {
    pass: failed.length === 0,
    ran: ran.length,
    skipped: steps.length - ran.length,
    failed: failed.map(s => s.name),
    steps
  };
}

export function formatVerdict(v) {
  const l = [];
  l.push(v.pass ? 'PORTE OUVERTE' : `PORTE FERMEE — ${v.failed.join(', ')}`);
  l.push('');
  for (const s of v.steps) {
    const mark = s.status === 'pass' ? 'ok  ' : s.status === 'fail' ? 'ECHEC' : s.status === 'error' ? 'PANNE' : 'passe';
    l.push(`  ${mark}  ${s.name}${s.reason ? ` — ${s.reason}` : ''}`);
    if (s.status === 'fail' && s.detail) {
      for (const line of String(s.detail).split('\n').slice(0, 24)) l.push(`         ${line}`);
    }
  }
  if (v.skipped) {
    l.push('');
    l.push(`  ${v.skipped} etape(s) non executee(s). Une etape absente ne ferme pas la porte.`);
  }
  return l.join('\n');
}
