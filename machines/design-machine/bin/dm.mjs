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

  dm extract <url> --label A [--motion] [--scheme dark] [--out sources/A.json] [--headed] [--screenshot a.png]
      Ouvre l'url, lit les computed styles du DOM rendu, ecrit les tokens normalises.
      --motion : capture aussi keyframes, loaders, apparitions au scroll, survols
      mesures — et SIGNALE le mouvement JS non instrumentable (rAF) sans l'estimer.
      --scheme dark|light : force prefers-color-scheme — extraire le theme sombre
      d'une source se fait en la capturant en sombre (label distinct, ex. A-dark).

  dm merge --sources sources/ --map typography=A,palette=B,spatial=B,motion=C,surfaceStyle=A[,paletteDark=D]
           [--out design-system/]
      Compose une couche par source. Ecrit MASTER.md, tokens.css, tokens.json.
      paletteDark (optionnel) : le volet sombre de la palette — sa source peut
      differer du clair. tokens.css emet alors le media query + [data-theme].

  dm design-md [--north-star "..."] [--out DESIGN.md]
      Derive DESIGN.md (format Impeccable, six sections) et .impeccable/design.json
      depuis le MASTER. Le MASTER reste la source de verite.

  dm waivers [--dry-run]
      Genere les derogations du detecteur Impeccable a partir du MASTER,
      via sa propre CLI. Une police declaree n'est pas de la slop.

  dm verify <url> [--scheme dark] [--master design-system/tokens.json] [--json] [--warn-only]
      Compare un rendu au MASTER. Sortie 1 si non conforme. --scheme dark juge
      contre le volet paletteDark — REFUS explicite si le contrat n'en a pas.

  dm compare <url-source> <url-rendu> [--json] [--warn-only]
      Compare la DENSITE mesuree : animes/visibles, boucles infinies, rotations,
      ombres dures + blocs decales, chevauchements, saut typographique.
      Rendu sous la moitie de la source sur une metrique = ECART, sortie 1.

  dm density <url> [--json]
      La meme densite, pour une seule page — qualifier un candidat pendant la
      chasse aux references (voir CHASSE.md).

  dm export <dart|ts> [--master design-system/tokens.json] [--out ...]
      Projette le contrat en natif : tokens.dart (Flutter), tokens.ts
      (React Native, Electron, Ionic). Derives, regeneres, jamais edites.

  dm pack [--out <nom>.design.json]
      Exporte le design en UN fichier portable : contrat (provenance comprise),
      sources mesurees, North Star — l'inderivable seulement, somme de controle.

  dm unpack <fichier> [--force]
      Importe un design : verifie la somme de controle, ecrit sources/ et
      tokens.json, REGENERE les derives (MASTER.md, tokens.css, DESIGN.md).
      Un contrat existant ne s'ecrase pas sans --force.

  dm scheme <dark|light> [--force] [--master design-system/tokens.json]
      Derive le volet manquant depuis l'autre : teinte/saturation conservees
      (OKLab), clartes inversees, contrastes WCAG reproduits par dichotomie —
      rapport de fidelite imprime, ecart hors gamut avoue. Le volet est marque
      DERIVE ; un volet MESURE ne s'ecrase qu'avec --force.

  dm palette <image> [--label X --out sources/X.json] [--json]
      Une image (png/jpg/webp/gif) comme source de palette MESUREE : pixels
      quantifies, roles par regles (surface, contraste). Avec --label/--out,
      ecrit une source utilisable par dm merge (palette=X ou paletteDark=X).
      On derive des regles, pas des actifs : l'image n'entre jamais au livrable.

  dm doctor
      Preconditions nommees, echec bruyant : Node, Chromium, skill dans le BON
      profil, impeccable/accesslint presents ou explicitement absents, contrat
      du projet. Sortie 1 si un element requis manque.

  dm lint <dir> [--json]
      Porte statique : enumere TOUT litteral de couleur (#hex, rgb(), hsl(),
      Color(0x…)) hors fichiers tokens/theme. Pour les stacks dont le rendu ne
      se mesure pas (Flutter, natif) — et second filet ailleurs. Sortie 1 si
      litteraux, 2 si aucun fichier examine.

  --mobile sur extract/verify/gate/compare/density : emulation device reelle
  (UA iPhone, 390x844, DPR 3, touch) — pas une simple fenetre etroite.

  dm gate [<url>] [--json] [--warn-only] [--no-impeccable]
      Porte unifiee : dm verify + impeccable detect, un seul verdict.
      Si le contrat porte un volet paletteDark, verify tourne dans LES DEUX
      schemas — conforme en clair et casse en sombre ferme la porte.
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
      mobile: !!flag('mobile', false),
      scheme: typeof flag('scheme') === 'string' ? flag('scheme') : undefined,
      screenshot: typeof flag('screenshot') === 'string' ? flag('screenshot') : undefined,
      fullPage: !!flag('full-page', false),
      waitFor: typeof flag('wait-for') === 'string' ? flag('wait-for') : undefined,
      width: flag('width') ? Number(flag('width')) : undefined
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
      let tokens = null;
      const baseOpts = {
        mobile: !!flag('mobile', false),
        width: flag('width') ? Number(flag('width')) : undefined
      };
      try {
        tokens = JSON.parse(readFileSync(masterPath, 'utf8'));
        const { capture } = await import('../src/extract.mjs');
        const res = verify(await capture(target, baseOpts), tokens);
        steps.push({ name: 'dm verify', status: res.pass ? 'pass' : 'fail', detail: formatReport(res) });
      } catch (e) {
        // Panne, pas absence : tokens corrompus, capture qui leve, timeout.
        // Ne pas pouvoir verifier ferme la porte.
        steps.push({ name: 'dm verify', status: 'error', reason: e.message });
      }
      // Un volet sombre au contrat = le sombre est aussi sous contrat.
      // Conforme en clair et casse en sombre doit fermer la porte.
      if (tokens?.paletteDark) {
        try {
          const { capture } = await import('../src/extract.mjs');
          const payload = await capture(target, { ...baseOpts, scheme: 'dark' });
          const res = verify(payload, tokens, { scheme: 'dark' });
          steps.push({ name: 'dm verify (sombre)', status: res.pass ? 'pass' : 'fail', detail: formatReport(res) });
        } catch (e) {
          steps.push({ name: 'dm verify (sombre)', status: 'error', reason: e.message });
        }
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

  if (cmd === 'compare') {
    const [srcUrl, renduUrl] = positional;
    if (!srcUrl || !renduUrl) { console.error(USAGE); return 2; }
    const { capture } = await import('../src/extract.mjs');
    const { compareIntensity, formatCompare } = await import('../src/compare.mjs');
    const capOpts = {
      intensity: true,
      mobile: !!flag('mobile', false),
      width: flag('width') ? Number(flag('width')) : undefined,
      scheme: typeof flag('scheme') === 'string' ? flag('scheme') : undefined
    };
    console.error(`  ouverture ${srcUrl}`);
    const a = await capture(srcUrl, capOpts);
    console.error(`  ouverture ${renduUrl}`);
    const b = await capture(renduUrl, capOpts);
    const rows = compareIntensity(a.intensity, b.intensity);
    if (flag('json', false)) {
      console.log(JSON.stringify(rows.map(({ fmt, ...r }) => r), null, 2));
    } else {
      console.log(formatCompare(rows, [srcUrl, renduUrl]));
    }
    return rows.some(r => r.ecart) && !flag('warn-only', false) ? 1 : 0;
  }

  if (cmd === 'density') {
    const url = positional[0];
    if (!url) { console.error(USAGE); return 2; }
    const { capture } = await import('../src/extract.mjs');
    const { deriveIntensity, formatDensity } = await import('../src/compare.mjs');
    console.error(`  ouverture ${url}`);
    const p = await capture(url, {
      intensity: true,
      mobile: !!flag('mobile', false),
      width: flag('width') ? Number(flag('width')) : undefined,
      scheme: typeof flag('scheme') === 'string' ? flag('scheme') : undefined,
      screenshot: typeof flag('screenshot') === 'string' ? flag('screenshot') : undefined,
      fullPage: !!flag('full-page', false)
    });
    console.log(flag('json', false) ? JSON.stringify(deriveIntensity(p.intensity), null, 2) : formatDensity(p.intensity, url));
    return 0;
  }

  if (cmd === 'export') {
    const target = positional[0];
    const tokens = JSON.parse(readFileSync(flag('master', 'design-system/tokens.json'), 'utf8'));
    const { renderDart, renderTs } = await import('../src/native.mjs');
    if (target === 'dart') { write(flag('out', 'design-system/tokens.dart'), renderDart(tokens)); return 0; }
    if (target === 'ts') { write(flag('out', 'design-system/tokens.ts'), renderTs(tokens)); return 0; }
    console.error(USAGE); return 2;
  }

  if (cmd === 'pack') {
    const masterPath = flag('master', 'design-system/tokens.json');
    if (!existsSync(masterPath)) {
      console.error(`  ${masterPath} absent — rien a exporter (dm extract puis dm merge d'abord).`);
      return 2;
    }
    const tokens = JSON.parse(readFileSync(masterPath, 'utf8'));
    const srcDir = flag('sources', 'sources');
    const sources = existsSync(srcDir)
      ? readdirSync(srcDir).filter(f => f.endsWith('.json'))
          .map(f => JSON.parse(readFileSync(join(srcDir, f), 'utf8')))
      : [];
    let northStar = null;
    try { northStar = JSON.parse(readFileSync('.impeccable/design.json', 'utf8')).northStar ?? null; }
    catch { /* pas de DESIGN.md derive ici */ }
    let notes;
    try { notes = readFileSync('design-system/NOTES.md', 'utf8'); }
    catch { /* pas de grammaire deposee */ }
    const { buildPack } = await import('../src/pack.mjs');
    const pack = buildPack({ tokens, sources, northStar, notes });
    const out = flag('out', 'design.pack.json');
    write(out, JSON.stringify(pack, null, 2));
    console.error(`  ${sources.length} source(s) · North Star ${northStar ? 'inclus' : 'ABSENT'} · grammaire ${notes ? 'incluse' : 'ABSENTE (design-system/NOTES.md)'} · sha256 ${pack.checksum.slice(0, 12)}…`);
    return 0;
  }

  if (cmd === 'unpack') {
    const file = positional[0];
    if (!file) { console.error(USAGE); return 2; }
    const { applyPack } = await import('../src/pack.mjs');
    const pack = JSON.parse(readFileSync(file, 'utf8'));
    if (existsSync('design-system/tokens.json') && !flag('force', false)) {
      console.error('  design-system/tokens.json existe deja — un import ne l\'ecrase pas. Relance avec --force si c\'est voulu.');
      return 1;
    }
    const { files, warnings } = applyPack(pack);
    for (const f of files) write(f.path, f.content);
    for (const w of warnings) console.error(`  ! ${w}`);
    console.error(`  importe (emballe le ${pack.packedAt}) — derives regeneres, pas transportes.`);
    return 0;
  }

  if (cmd === 'scheme') {
    const sens = positional[0];
    if (sens !== 'dark' && sens !== 'light') { console.error(USAGE); return 2; }
    const masterPath = flag('master', 'design-system/tokens.json');
    const tokens = JSON.parse(readFileSync(masterPath, 'utf8'));
    const source = sens === 'dark' ? tokens.palette : tokens.paletteDark;
    const cibleKey = sens === 'dark' ? 'paletteDark' : 'palette';
    if (!source) {
      console.error(`  volet source absent (${sens === 'dark' ? 'palette' : 'paletteDark'}) — rien a deriver.`);
      return 2;
    }
    const existant = tokens[cibleKey];
    if (existant && !existant.derived && !flag('force', false)) {
      console.error(`  ${cibleKey} existe et vient d'une MESURE — un derive ne l'ecrase pas. Relance avec --force si c'est voulu.`);
      return 1;
    }
    const { invertPalette, formatSchemeReport } = await import('../src/scheme.mjs');
    const { palette: derive, report } = invertPalette(source);
    tokens[cibleKey] = derive;
    tokens.provenance = tokens.provenance || {};
    tokens.provenance[cibleKey] = {
      source: 'derive',
      url: `inversion OKLab du volet ${sens === 'dark' ? 'clair' : 'sombre'}`,
      title: 'non mesure'
    };
    tokens.generatedAt = new Date().toISOString();
    const outDir = dirname(masterPath);
    write(masterPath, JSON.stringify(tokens, null, 2));
    write(join(outDir, 'MASTER.md'), renderMaster(tokens));
    write(join(outDir, 'tokens.css'), renderCss(tokens));
    console.log(formatSchemeReport(report, sens === 'dark' ? 'SOMBRE' : 'CLAIR'));
    return 0;
  }

  if (cmd === 'palette') {
    const img = positional[0];
    if (!img) { console.error(USAGE); return 2; }
    const { paletteFromImage, formatPalette, toSource } = await import('../src/palette.mjs');
    console.error(`  lecture ${img}`);
    const p = await paletteFromImage(img);
    const label = flag('label');
    if (typeof label === 'string') {
      write(flag('out', `sources/${label}.json`), JSON.stringify(toSource(p, label, img), null, 2));
    }
    console.log(flag('json', false) ? JSON.stringify(p, null, 2) : formatPalette(p, img));
    return 0;
  }

  if (cmd === 'doctor') {
    const { collectDoctor, doctorExitCode, formatDoctor } = await import('../src/doctor.mjs');
    const items = collectDoctor();
    console.log(flag('json', false) ? JSON.stringify(items, null, 2) : formatDoctor(items));
    return doctorExitCode(items);
  }

  if (cmd === 'lint') {
    const dir = positional[0] || '.';
    const { lintDir, formatLint } = await import('../src/lint.mjs');
    const res = lintDir(dir);
    console.log(flag('json', false) ? JSON.stringify(res, null, 2) : formatLint(res, dir));
    if (!res.scanned) return 2;
    return res.findings.length ? 1 : 0;
  }

  if (cmd === 'verify') {
    const target = positional[0];
    if (!target) { console.error(USAGE); return 2; }
    const tokens = JSON.parse(readFileSync(flag('master', 'design-system/tokens.json'), 'utf8'));
    const { capture } = await import('../src/extract.mjs');
    const scheme = typeof flag('scheme') === 'string' ? flag('scheme') : undefined;
    const payload = await capture(target, {
      mobile: !!flag('mobile', false),
      width: flag('width') ? Number(flag('width')) : undefined,
      scheme
    });
    const res = verify(payload, tokens, { scheme });
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
