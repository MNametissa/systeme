// Fonction serialisee et injectee dans la page par extract.mjs.
// Tout ce qui est ici s'execute dans le navigateur : pas d'import, pas de Node.
export function collector() {
  const acc = {
    family: {}, size: {}, weight: {}, lineHeight: {}, tracking: {},
    ink: {}, bg: {}, radius: {}, shadow: {}, borderColor: {}, borderWidth: {},
    duration: {}, easing: {}, space: {}
  };

  const bump = (bag, key, n = 1) => {
    if (key === undefined || key === null) return;
    const k = String(key).trim();
    if (!k || k === 'none' || k === 'normal' || k === '0s' || k === '0px' || k === 'auto') return;
    bag[k] = (bag[k] || 0) + n;
  };

  const TRANSPARENT = /rgba?\([^)]*,\s*0(\.0+)?\s*\)/;
  const TEXT_NODES = new Set(['P','H1','H2','H3','H4','H5','H6','A','SPAN','LI','TD','TH','LABEL','BUTTON','STRONG','EM','BLOCKQUOTE','FIGCAPTION','SMALL']);

  const headings = [];
  let counted = 0;

  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;

    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || parseFloat(s.opacity) === 0) continue;

    counted++;
    const area = Math.round((r.width * r.height) / 1000);

    // -- fond : pondere par surface, c'est ce qui distingue une dominante d'un accent
    if (!TRANSPARENT.test(s.backgroundColor) && s.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      bump(acc.bg, s.backgroundColor, area);
    }

    // -- typographie : ne compter que les elements qui portent du texte propre
    const ownText = Array.from(el.childNodes)
      .filter(n => n.nodeType === 3)
      .map(n => n.textContent.trim())
      .join('').length;

    if (ownText > 0 || TEXT_NODES.has(el.tagName)) {
      const w = Math.max(1, Math.round(ownText / 10));
      bump(acc.family, s.fontFamily, w);
      bump(acc.size, s.fontSize, w);
      bump(acc.weight, s.fontWeight, w);
      bump(acc.lineHeight, s.lineHeight, w);
      bump(acc.tracking, s.letterSpacing, w);
      bump(acc.ink, s.color, w);
    }

    if (/^H[1-6]$/.test(el.tagName) && headings.length < 40) {
      headings.push({
        tag: el.tagName,
        size: s.fontSize,
        weight: s.fontWeight,
        family: s.fontFamily,
        lineHeight: s.lineHeight,
        tracking: s.letterSpacing
      });
    }

    // -- surface
    bump(acc.radius, s.borderTopLeftRadius);
    bump(acc.shadow, s.boxShadow);
    if (parseFloat(s.borderTopWidth) > 0) {
      bump(acc.borderWidth, s.borderTopWidth);
      bump(acc.borderColor, s.borderTopColor);
    }

    // -- motion
    for (const d of s.transitionDuration.split(',')) bump(acc.duration, d);
    for (const e of s.transitionTimingFunction.split(',')) bump(acc.easing, e);
    if (s.animationDuration) for (const d of s.animationDuration.split(',')) bump(acc.duration, d);

    // -- spatial : padding et gap uniquement (les marges sont trop bruitees)
    for (const p of [s.paddingTop, s.paddingLeft, s.rowGap, s.columnGap]) bump(acc.space, p);
  }

  // -- webfonts : necessaire pour l'alerte de licence
  const fontFaces = [];
  try {
    for (const f of document.fonts) {
      if (fontFaces.length > 30) break;
      fontFaces.push({ family: f.family, weight: f.weight, style: f.style, status: f.status });
    }
  } catch { /* document.fonts indisponible */ }

  const linked = Array.from(document.querySelectorAll('link[rel="stylesheet"], link[rel="preload"][as="font"]'))
    .map(l => l.href)
    .filter(h => /font|typekit|typography|use\.typekit|fonts\./i.test(h))
    .slice(0, 20);

  return {
    url: location.href,
    title: document.title,
    viewport: { w: innerWidth, h: innerHeight },
    elements: counted,
    headings,
    fontFaces,
    fontSources: linked,
    raw: acc
  };
}
