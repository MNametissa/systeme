import { existsSync } from 'node:fs';
import { collector } from './collect.mjs';
import { motionProbe, motionSnapshot, motionStatics, hoverTargets } from './motion.mjs';
import { intensityCollector } from './intensity.mjs';

// puppeteer-core plutot que puppeteer : on utilise le Chromium deja installe,
// pas 150 Mo telecharges a l'install. Sur Linux Mint, la detection ci-dessous suffit.
const CANDIDATES = [
  process.env.CHROME_PATH,
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean);

export function findChrome() {
  const hit = CANDIDATES.find(p => existsSync(p));
  if (!hit) {
    throw new Error(
      'Aucun Chromium trouve. Installe-le (`sudo apt install chromium`) ' +
      'ou renseigne CHROME_PATH=/chemin/vers/chrome.'
    );
  }
  return hit;
}

export async function capture(url, opts = {}) {
  const { default: puppeteer } = await import('puppeteer-core');
  // Le cas d'usage central est d'ouvrir des sites tiers : le bac a sable reste
  // actif. DM_NO_SANDBOX=1 seulement la ou il est indisponible (conteneur).
  const args = ['--disable-dev-shm-usage'];
  if (process.env.DM_NO_SANDBOX === '1') args.push('--no-sandbox');
  const browser = await puppeteer.launch({
    executablePath: opts.chromePath || findChrome(),
    headless: opts.headed ? false : 'new',
    args
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: opts.width ?? 1440,
      height: opts.height ?? 900,
      deviceScaleFactor: 1
    });
    // La sonde motion s'installe AVANT la navigation : les loaders vivent
    // dans les premieres centaines de millisecondes.
    if (opts.motion) await page.evaluateOnNewDocument(motionProbe);
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: opts.timeout ?? 45000 });
    } catch (e) {
      if (!/timeout/i.test(e.message)) throw e;
      // Le reseau ne s'apaise jamais (analytics, flux) : si le document est
      // charge, on continue. Sinon c'est une vraie panne, elle remonte.
      const state = await page.evaluate(() => document.readyState).catch(() => 'injoignable');
      if (state !== 'complete' && state !== 'interactive') throw e;
      console.error(`  reseau jamais apaise — document ${state}, on continue`);
    }

    if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 15000 });
    await new Promise(r => setTimeout(r, opts.settle ?? 1200));
    await page.evaluate(() => document.fonts && document.fonts.ready);
    if (opts.motion) {
      await page.evaluate(() => { const M = window.__dmMotion; if (M) M.markSettled = Date.now() - M.t0; });
    }

    // Deroule la page : le lazy-load cache la moitie des styles a l'ouverture.
    if (opts.scroll !== false) {
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += innerHeight) {
          scrollTo(0, y);
          await new Promise(r => setTimeout(r, 120));
        }
        scrollTo(0, 0);
      });
      await new Promise(r => setTimeout(r, 400));
    }

    const payload = await page.evaluate(collector);

    if (opts.intensity) payload.intensity = await page.evaluate(intensityCollector);

    if (opts.motion) {
      // Marque la fin de la fenetre scroll : tout ce qui apparait apres vient
      // du survol, pas du defilement.
      await page.evaluate(() => { const M = window.__dmMotion; if (M) M.markHover = Date.now() - M.t0; });

      // Survol mesure : deux instantanes par cible (transitions courtes et longues).
      const targets = await page.evaluate(hoverTargets);
      const hover = [];
      for (const t of targets) {
        await page.mouse.move(t.x, t.y);
        await new Promise(r => setTimeout(r, 90));
        const early = await page.evaluate(motionSnapshot);
        await new Promise(r => setTimeout(r, 260));
        const late = await page.evaluate(motionSnapshot);
        const seen = new Map();
        for (const a of [...early, ...late]) {
          if (a.type !== 'CSSTransition') continue;
          seen.set(`${a.name}|${a.duration}|${a.target}`, a);
        }
        if (seen.size) hover.push({ target: t.target, transitions: [...seen.values()].slice(0, 6) });
        await page.mouse.move(0, 0);
        await new Promise(r => setTimeout(r, 150));
      }

      const statics = await page.evaluate(motionStatics);
      const probe = await page.evaluate(() => {
        const M = window.__dmMotion;
        return M ? {
          samples: Object.values(M.byKey),
          styleMutations: M.styleMutations,
          rafTicks: M.rafTicks,
          markSettled: M.markSettled,
          markHover: M.markHover
        } : null;
      });
      payload.motionExt = { probe, statics, hover };
    }

    if (opts.screenshot) {
      await page.screenshot({ path: opts.screenshot, fullPage: false });
      payload.screenshot = opts.screenshot;
    }
    return payload;
  } finally {
    await browser.close();
  }
}
