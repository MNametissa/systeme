import { normalize } from './normalize.mjs';

// Le controle ne vient pas du prompt. Il vient d'ici.
// Meme collecteur que l'extraction, cible differente : ton rendu au lieu de la source.

const SEV = { fail: 'FAIL', warn: 'WARN' };

export function verify(payload, tokens, opts = {}) {
  const bgTolerance = opts.bgTolerance ?? 0.02;
  const sizeTolerance = opts.sizeTolerance ?? 1;
  const observed = normalize(payload, 'cible');
  const findings = [];

  // 1. Familles de police
  const allowed = new Set((tokens.typography?.families || []).map(f => f.primary.toLowerCase()));
  for (const f of observed.typography.families) {
    if (!allowed.has(f.primary.toLowerCase())) {
      findings.push({ severity: SEV.fail, rule: 'font-family', found: f.primary, expected: [...allowed].join(', ') });
    }
  }

  // 2. Echelle typographique
  const scale = tokens.typography?.scale || [];
  for (const size of observed.typography.scale) {
    const near = scale.some(s => Math.abs(s - size) <= sizeTolerance);
    if (!near) {
      findings.push({ severity: SEV.fail, rule: 'type-scale', found: `${size}px`, expected: scale.join(', ') });
    }
  }

  // 3. Fonds non declares au-dela du seuil de surface
  const declared = new Set(
    [tokens.palette?.background, ...(tokens.palette?.surfaces || []), ...(tokens.palette?.accents || [])]
      .filter(Boolean).map(c => c.split(' / ')[0].toLowerCase())
  );
  const backgrounds = observed.palette.evidence.backgrounds;
  const totalArea = backgrounds.reduce((n, c) => n + c.area, 0) || 1;
  for (const c of backgrounds) {
    const share = c.area / totalArea;
    const hex = c.hex.split(' / ')[0].toLowerCase();
    if (!declared.has(hex) && share > bgTolerance) {
      findings.push({
        severity: SEV.fail, rule: 'undeclared-background',
        found: `${c.hex} (${(share * 100).toFixed(1)} %)`,
        expected: [...declared].join(', ')
      });
    }
  }

  // 4. Motion — avertissement, pas blocage : trop de bibliotheques injectent leurs durees
  const durations = new Set((tokens.motion?.durations || []).map(d => d.ms));
  for (const d of observed.motion.durations) {
    if (durations.size && !durations.has(d.ms)) {
      findings.push({ severity: SEV.warn, rule: 'motion-duration', found: `${d.ms}ms`, expected: [...durations].join(', ') });
    }
  }

  const fails = findings.filter(f => f.severity === SEV.fail);
  return {
    url: payload.url,
    sampled: payload.elements,
    pass: fails.length === 0,
    counts: { fail: fails.length, warn: findings.length - fails.length },
    findings
  };
}

export function formatReport(res) {
  const l = [];
  l.push(`${res.pass ? 'CONFORME' : 'NON CONFORME'} — ${res.url}`);
  l.push(`${res.sampled} elements echantillonnes · ${res.counts.fail} echec(s) · ${res.counts.warn} avertissement(s)`);
  if (res.findings.length) {
    l.push('');
    for (const f of res.findings) {
      l.push(`  [${f.severity}] ${f.rule}`);
      l.push(`        trouve   : ${f.found}`);
      l.push(`        attendu  : ${f.expected}`);
    }
  }
  return l.join('\n');
}
