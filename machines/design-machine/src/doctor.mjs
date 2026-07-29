// Le defaut fondateur des machines : s'installer cassees en silence.
// doctor verifie les preconditions et ECHOUE BRUYAMMENT — sur une machine
// neuve, il nomme exactement ce qui manque avant qu'un livrable echoue.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { findChrome } from './extract.mjs';

export function collectDoctor({ env = process.env, cwd = process.cwd() } = {}) {
  const items = [];
  const push = (name, ok, requis, detail) => items.push({ name, ok, requis, detail });

  const major = Number(process.versions.node.split('.')[0]);
  push('Node >= 20', major >= 20, true, `v${process.versions.node}`);

  let chrome = null;
  try { chrome = findChrome(); } catch { /* absent */ }
  push('Chromium', !!chrome, true, chrome || 'sudo apt install chromium, ou CHROME_PATH=/chemin');

  // Le piege recurrent (D11/R9/N4) : le bon PROFIL, pas seulement la presence.
  const configDir = env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude');
  const skillPath = join(configDir, 'skills', 'design-machine', 'SKILL.md');
  push(`skill design-machine (${configDir})`, existsSync(skillPath), false,
    existsSync(skillPath) ? skillPath : `cp -r skill/design-machine ${join(configDir, 'skills')}/`);
  const autreProfil = configDir.endsWith('.claude-mecid')
    ? join(homedir(), '.claude', 'skills', 'design-machine')
    : join(homedir(), '.claude-mecid', 'skills', 'design-machine');
  if (!existsSync(skillPath) && existsSync(autreProfil)) {
    push('skill dans le MAUVAIS profil', false, false, autreProfil);
  }

  const imp = spawnSync('npx', ['--no-install', 'impeccable', '--version'],
    { encoding: 'utf8', timeout: 20000, cwd });
  push('impeccable (optionnel)', imp.status === 0, false,
    imp.status === 0 ? `v${(imp.stdout || '').trim()}` : 'npm i -D impeccable — dm gate sautera cette etape');

  const al = hasAccessLint(configDir);
  push('accesslint (optionnel)', al, false, al
    ? `plugin accesslint@accesslint (${configDir})`
    : 'claude plugin marketplace add accesslint/skills && claude plugin install accesslint@accesslint');

  const contrat = join(cwd, 'design-system', 'tokens.json');
  push('contrat du projet (design-system/tokens.json)', existsSync(contrat), false,
    existsSync(contrat) ? contrat : 'aucun MASTER ici — dm extract puis dm merge pour le creer');

  return items;
}

function hasAccessLint(configDir) {
  try {
    const settings = JSON.parse(readFileSync(join(configDir, 'settings.json'), 'utf8'));
    if (Object.keys(settings.enabledPlugins || {}).some(k => k.startsWith('accesslint@'))) return true;
  } catch { /* pas de settings lisible */ }
  try {
    const plugDir = join(configDir, 'plugins');
    for (const e of readdirSync(plugDir)) {
      if (/accesslint/i.test(e)) return true;
      try {
        if (readdirSync(join(plugDir, e)).some(f => /accesslint/i.test(f))) return true;
      } catch { /* pas un dossier */ }
    }
  } catch { /* pas de dossier plugins */ }
  return false;
}

export function doctorExitCode(items) {
  return items.some(i => i.requis && !i.ok) ? 1 : 0;
}

export function formatDoctor(items) {
  const l = [];
  for (const i of items) {
    const mark = i.ok ? 'OK     ' : i.requis ? 'MANQUE ' : 'ABSENT ';
    l.push(`  ${mark} ${i.name}`);
    l.push(`          ${i.detail}`);
  }
  const manque = items.filter(i => i.requis && !i.ok);
  l.push('');
  l.push(manque.length
    ? `${manque.length} precondition(s) REQUISE(S) manquante(s) — la machine ne peut pas fonctionner ici.`
    : 'Preconditions requises reunies. Les ABSENT sont des options, chacune avec son geste.');
  return l.join('\n');
}
