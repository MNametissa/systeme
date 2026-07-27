import { existsSync } from 'node:fs';
import { collector } from './collect.mjs';

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
    await page.goto(url, { waitUntil: 'networkidle2', timeout: opts.timeout ?? 45000 });

    if (opts.waitFor) await page.waitForSelector(opts.waitFor, { timeout: 15000 });
    await new Promise(r => setTimeout(r, opts.settle ?? 1200));
    await page.evaluate(() => document.fonts && document.fonts.ready);

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

    if (opts.screenshot) {
      await page.screenshot({ path: opts.screenshot, fullPage: false });
      payload.screenshot = opts.screenshot;
    }
    return payload;
  } finally {
    await browser.close();
  }
}
