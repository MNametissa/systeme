#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { normalize } from '../src/normalize.mjs';
import { merge, parseMap } from '../src/merge.mjs';
import { renderMaster, renderCss } from '../src/render.mjs';
import { verify, formatReport } from '../src/verify.mjs';
import { parseArgs } from '../src/args.mjs';

const argv = process.argv.slice(2);
const cmd = argv[0];
const { flags, positional } = parseArgs(argv.slice(1));
const flag = (name, fallback) => flags[name] ?? fallback;

const write = (path, content) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.error(`  ecrit ${path}`);
};

const USAGE = `
design-machine — extraire, composer, verifier

  dm extract <url> --label A [--motion] [--out sources/A.json] [--headed] [--screenshot a.png]
      Ouvre l'url, lit les computed styles du DOM rendu, ecrit les tokens normalises.
      --motion : capture aussi keyframes, loaders, apparitions au scroll, survols
      mesures — et SIGNALE le mouvement JS non instrumentable (rAF) sans l'estimer.

  dm merge --sources sources/ --map typography=A,palette=B,spatial=B,motion=C,surfaceStyle=A
           [--out design-system/]
      Compose une couche par source. Ecrit MASTER.md, tokens.css, tokens.json.

  dm design-md [--north-star "..."] [--out DESIGN.md]
      Derive DESIGN.md (format Impeccable, six sections) et .impeccable/design.json
      depuis le MASTER. Le MASTER reste la source de verite.

  dm waivers [--dry-run]
      Genere les derogations du detecteur Impeccable a partir du MASTER,
      via sa propre CLI. Une police declaree n'est pas de la slop.

  dm verify <url> [--master design-system/tokens.json] [--json] [--warn-only]
      Compare un rendu au MASTER. Sortie 1 si non conforme.

  dm gate [<url>] [--json] [--warn-only] [--no-impeccable]
      Porte unifiee : dm verify + impeccable detect, un seul verdict.
      Une etape absente (outil non installe) est ignoree ; une panne ferme.

  Couches composables : typography, palette, spatial, motion, surfaceStyle
  Non composable : les composants. Un composant est une intersection de couches.
`;

async function main() {
  if (!cmd || cmd === 'help' || cmd === '--help') { console.log(USAGE); return 0; }

  if (cmd === 'extract') {
    const url = positional[0];
    const label = flag('label');
    if (!url || typeof label !== 'string') { console.error(USAGE); return 2; }

    const { capture } = await import('../src/extract.mjs');
    console.error(`  ouverture ${url}`);
    const payload = await capture(url, {
      headed: !!flag('headed', false),
      motion: !!flag('motion', false),
      screenshot: typeof flag('screenshot') === 'string' ? flag('screenshot') : undefined,
      waitFor: typeof flag('wait-for') === 'string' ? flag('wait-for') : undefined,
      width: Number(flag('width', 1440))
    });
    const tokens = normalize(payload, label);
    const out = flag('out', `sources/${label}.json`);
    write(out, JSON.stringify({ ...tokens, _raw: payload.raw }, null, 2));
    console.error(`  ${payload.elements} elements · ${tokens.typography.families.length} familles · maille ${tokens.spatial.unit ?? '?'}px`);
    return 0;
  }

  if (cmd === 'merge') {
    const dir = flag('sources', 'sources');
    const map = parseMap(flag('map', ''));
    const files = readdirSync(dir).filter(f => f.endsWith('.json'));
    const sources = files.map(f => JSON.parse(readFileSync(join(dir, f), 'utf8')));
    const tokens = merge(sources, map);
    const out = flag('out', 'design-system');
    write(join(out, 'tokens.json'), JSON.stringify(tokens, null, 2));
    write(join(out, 'MASTER.md'), renderMaster(tokens));
    write(join(out, 'tokens.css'), renderCss(tokens));
    for (const w of tokens.warnings) console.error(`  ! ${w}`);
    return 0;
  }

  if (cmd === 'design-md') {
    const tokens = JSON.parse(readFileSync(flag('master', 'design-system/tokens.json'), 'utf8'));
    const northStar = typeof flag('north-star') === 'string' ? flag('north-star') : null;
    const { renderDesignMd, renderDesignJson } = await import('../src/designmd.mjs');
    write(flag('out', 'DESIGN.md'), renderDesignMd(tokens, { northStar }));
    write('.impeccable/design.json', JSON.stringify(renderDesignJson(tokens, { northStar }), null, 2));
    if (!northStar) console.error('  ! Creative North Star absente. Relance avec --north-star "..." — aucune extraction ne produit une intention.');
    return 0;
  }

  if (cmd === 'waivers') {
    const tokens = JSON.parse(readFileSync(flag('master', 'design-system/tokens.json'), 'utf8'));
    const imp = await import('../src/impeccable.mjs');
    const waivers = imp.waiversFromTokens(tokens);
    if (!waivers.length) { console.error('  aucune derogation necessaire'); return 0; }
    const applied = imp.applyWaivers(waivers, { dryRun: !!flag('dry-run', false) });
    for (const a of applied) console.error(`  ${a.status}  ${a.rule}=${a.value}${a.command ? `\n         ${a.command}` : ''}`);
    return applied.some(a => a.status === 'echec') ? 1 : 0;
  }

  if (cmd === 'gate') {
    const target = positional[0] || 'http://localhost:3000';
    const masterPath = flag('master', 'design-system/tokens.json');
    const { composeVerdict, formatVerdict } = await import('../src/gate.mjs');
    const steps = [];

    if (!existsSync(masterPath)) {
      steps.push({ name: 'dm verify', status: 'skip', reason: `${masterPath} absent` });
    } else {
      try {
        const tokens = JSON.parse(readFileSync(masterPath, 'utf8'));
        const { capture } = await import('../src/extract.mjs');
        const res = verify(await capture(target, {}), tokens);
        steps.push({ name: 'dm verify', status: res.pass ? 'pass' : 'fail', detail: formatReport(res) });
      } catch (e) {
        // Panne, pas absence : tokens corrompus, capture qui leve, timeout.
        // Ne pas pouvoir verifier ferme la porte.
        steps.push({ name: 'dm verify', status: 'error', reason: e.message });
      }
    }

    const imp = await import('../src/impeccable.mjs');
    if (!flag('no-impeccable', false) && imp.isAvailable()) {
      const d = imp.detect(flag('detect-target', target));
      steps.push({
        name: 'impeccable detect',
        status: d.status,
        reason: d.reason,
        detail: d.parsed ? d.parsed.findings.map(f => `[${f.severity}] ${f.rule} — ${f.where}`).join('\n') : d.stdout
      });
    } else {
      steps.push({ name: 'impeccable detect', status: 'skip', reason: 'impeccable non installe' });
    }

    const v = composeVerdict(steps);
    console.log(flag('json', false) ? JSON.stringify(v, null, 2) : formatVerdict(v));
    return v.pass || flag('warn-only', false) ? 0 : 1;
  }

  if (cmd === 'verify') {
    const target = positional[0];
    if (!target) { console.error(USAGE); return 2; }
    const tokens = JSON.parse(readFileSync(flag('master', 'design-system/tokens.json'), 'utf8'));
    const { capture } = await import('../src/extract.mjs');
    const payload = await capture(target, { width: Number(flag('width', 1440)) });
    const res = verify(payload, tokens);
    console.log(flag('json', false) ? JSON.stringify(res, null, 2) : formatReport(res));
    return res.pass || flag('warn-only', false) ? 0 : 1;
  }

  console.error(`Commande inconnue : ${cmd}`);
  console.error(USAGE);
  return 2;
}

main().then(code => process.exit(code)).catch(err => {
  console.error(`\n  erreur : ${err.message}\n`);
  process.exit(2);
});
