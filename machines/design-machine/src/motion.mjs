// Fonctions serialisees et injectees dans la page par extract.mjs (mode --motion).
// Tout ce qui est ici s'execute dans le navigateur : pas d'import, pas de Node.
//
// Trois instruments : la sonde (echantillonne getAnimations depuis le premier
// instant), les statiques (CSSOM : @keyframes et regles a pseudo-classe), le
// survol (transitions reellement declenchees). Plus un detecteur de ce qu'on
// NE PEUT PAS mesurer : rAF et mutations de style inline — signale, pas estime.

// Installee via evaluateOnNewDocument : tourne avant tout script de la page.
export function motionProbe() {
  const M = { byKey: {}, styleMutations: 0, rafTicks: 0, t0: Date.now(), markSettled: null, markHover: null };
  window.__dmMotion = M;

  const orig = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => { M.rafTicks++; return orig(cb); };

  const sample = () => {
    try {
      for (const a of document.getAnimations()) {
        let t = {}, el = null;
        try { t = a.effect.getTiming(); el = a.effect.target; } catch { /* animation demontee */ }
        const rec = {
          type: a.constructor.name,
          name: a.animationName || a.transitionProperty || '',
          duration: typeof t.duration === 'number' ? t.duration : null,
          easing: t.easing || '',
          iterations: t.iterations === Infinity ? 'infinite' : (t.iterations ?? 1),
          target: el ? el.tagName + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') : ''
        };
        const key = [rec.type, rec.name, rec.duration, rec.target].join('|');
        if (!M.byKey[key]) {
          if (Object.keys(M.byKey).length >= 300) return;
          M.byKey[key] = { ...rec, firstAt: Date.now() - M.t0, seen: 0 };
        }
        M.byKey[key].seen++;
      }
    } catch { /* getAnimations indisponible */ }
  };
  const loop = () => { if (Date.now() - M.t0 > 30000) return; sample(); setTimeout(loop, 250); };
  loop();

  const observe = () => {
    try {
      new MutationObserver(m => { M.styleMutations += m.length; })
        .observe(document.documentElement, { attributes: true, attributeFilter: ['style'], subtree: true });
    } catch { /* pas encore de documentElement */ }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe);
  else observe();
}

// Instantane autonome (le survol s'en sert, la sonde a le sien).
export function motionSnapshot() {
  const out = [];
  try {
    for (const a of document.getAnimations()) {
      try {
        const t = a.effect && a.effect.getTiming ? a.effect.getTiming() : {};
        const el = a.effect && a.effect.target;
        out.push({
          type: a.constructor.name,
          name: a.animationName || a.transitionProperty || '',
          duration: typeof t.duration === 'number' ? t.duration : null,
          easing: t.easing || '',
          iterations: t.iterations === Infinity ? 'infinite' : (t.iterations ?? 1),
          target: el ? el.tagName + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '') : ''
        });
      } catch { /* animation demontee en cours de lecture */ }
    }
  } catch { /* getAnimations indisponible */ }
  return out.slice(0, 60);
}

// CSSOM : ce qui est declare, lisible sans aucune interaction.
// Les feuilles cross-origin levent une SecurityError : comptees, pas devinees.
export function motionStatics() {
  const out = { keyframes: [], pseudo: [], sheetsTotal: 0, sheetsBlocked: 0 };
  const PSEUDO = /:(hover|focus-visible|focus|active)/;
  for (const sheet of document.styleSheets) {
    out.sheetsTotal++;
    let rules;
    try { rules = sheet.cssRules; } catch { out.sheetsBlocked++; continue; }
    if (!rules) continue;
    const walk = list => {
      for (const r of list) {
        if (out.keyframes.length > 40 && out.pseudo.length > 120) return;
        if (r.type === 7) { // CSSKeyframesRule
          const props = new Set();
          for (const k of r.cssRules) for (const p of k.style) props.add(p);
          out.keyframes.push({ name: r.name, steps: r.cssRules.length, properties: [...props].slice(0, 8) });
        } else if (r.type === 1 && PSEUDO.test(r.selectorText || '')) {
          const props = [...r.style].slice(0, 8);
          if (props.length) out.pseudo.push({
            selector: (r.selectorText || '').slice(0, 80),
            state: (r.selectorText.match(PSEUDO) || [])[1],
            properties: props
          });
        } else if (r.cssRules) walk(r.cssRules);
      }
    };
    try { walk(rules); } catch { /* regle exotique */ }
  }
  return out;
}

// Elements interactifs visibles dans le viewport, dedupliques par forme.
export function hoverTargets() {
  const seen = new Set(); const out = [];
  const els = document.querySelectorAll('a, button, [role="button"], input[type="submit"], summary, [class*="btn"], [class*="button"]');
  for (const el of els) {
    if (out.length >= 12) break;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) continue;
    const key = el.tagName + '|' + (typeof el.className === 'string' ? el.className : '');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      x: r.left + r.width / 2,
      y: r.top + r.height / 2,
      target: el.tagName + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')
    });
  }
  return out;
}
