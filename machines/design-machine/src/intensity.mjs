// Fonction serialisee et injectee dans la page par extract.mjs (dm compare).
// Tout ce qui est ici s'execute dans le navigateur : pas d'import, pas de Node.
//
// Mesure les MATERIAUX de ce qu'on appelle « intensite » et « profondeur » :
// des decomptes, pas des impressions. Le jugement (est-ce que ca evoque le
// North Star ?) reste humain — ici on ne compte que l'observable.

export function intensityCollector() {
  const out = {
    visible: 0, animated: 0, infiniteLoops: 0, rotated: 0,
    hardShadows: 0, darkPseudo: 0, overlapPairs: 0, sampled: 0,
    chromatic: 0, hueBuckets: {},
    sizes: {}
  };

  // La couleur est une population comme une autre : ce qui n'est pas compte
  // derive (constat : des rendus conformes qui tournent au noir et blanc).
  const CHROMA_SAT = 0.25;
  const satHue = css => {
    const m = String(css).match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) return null;
    const [r, g, b] = m.map(Number);
    if (m.length > 3 && Number(m[3]) < 0.5) return null; // quasi transparent
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max < 40) return { sat: 0, hue: null }; // le quasi-noir n'est pas une teinte
    const sat = max ? (max - min) / max : 0;
    if (max === min) return { sat, hue: null };
    const d = max - min;
    let h;
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return { sat, hue: Math.round((h * 60) / 30) % 12 };
  };

  // Cibles animees a l'instant de la mesure (les boucles infinies y sont).
  const animTargets = new Set();
  try {
    for (const a of document.getAnimations()) {
      try {
        if (a.effect && a.effect.target) animTargets.add(a.effect.target);
        if (a.effect.getTiming().iterations === Infinity) out.infiniteLoops++;
      } catch { /* animation demontee */ }
    }
  } catch { /* getAnimations indisponible */ }

  const rects = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none') continue;
    out.visible++;

    if (animTargets.has(el) || (s.animationName && s.animationName !== 'none')) out.animated++;

    // Chromaticite : fond ou texte sature = element en couleur
    let chroma = false;
    for (const c of [s.backgroundColor, s.color]) {
      const sh = satHue(c);
      if (sh && sh.sat >= CHROMA_SAT) {
        chroma = true;
        if (sh.hue !== null) out.hueBuckets[sh.hue] = (out.hueBuckets[sh.hue] || 0) + 1;
      }
    }
    if (chroma) out.chromatic++;

    // Rotation posee (indice de composition « sticker »)
    const m = s.transform;
    if (m && m.startsWith('matrix(')) {
      const p = m.slice(7, -1).split(',').map(Number);
      const angle = Math.abs(Math.atan2(p[1], p[0]) * 180 / Math.PI);
      if (angle > 2 && angle < 358) out.rotated++;
    }

    // Profondeur par ombre DURE : box-shadow sans flou avec decalage
    const bs = s.boxShadow;
    if (bs && bs !== 'none') {
      for (const part of bs.split(/,(?![^(]*\))/)) {
        const nums = part.match(/-?\d+\.?\d*px/g);
        if (nums && nums.length >= 3) {
          const [x, y, blur] = nums.map(parseFloat);
          if (Math.abs(blur) < 0.5 && (Math.abs(x) >= 3 || Math.abs(y) >= 3)) { out.hardShadows++; break; }
        }
      }
    }

    // Profondeur par bloc plein : pseudo-element absolu sombre
    for (const pse of ['::before', '::after']) {
      try {
        const ps = getComputedStyle(el, pse);
        if (ps.content !== 'none' && ps.position === 'absolute') {
          const rgb = (ps.backgroundColor.match(/\d+/g) || []).slice(0, 3).map(Number);
          if (rgb.length === 3 && rgb[0] + rgb[1] + rgb[2] < 180) { out.darkPseudo++; break; }
        }
      } catch { /* pseudo illisible */ }
    }

    const size = parseFloat(s.fontSize);
    if (size && el.childNodes.length) out.sizes[Math.round(size)] = (out.sizes[Math.round(size)] || 0) + 1;

    if (rects.length < 220 && r.width > 40 && r.height > 40) {
      rects.push({ x: r.left, y: r.top, w: r.width, h: r.height, el });
    }
  }

  // Chevauchements partiels entre elements sans lien de parente : l'occlusion,
  // premier indice de profondeur. L'imbrication (conteneur/contenu) ne compte pas.
  const contains = (p, q) => p.x <= q.x && p.y <= q.y && p.x + p.w >= q.x + q.w && p.y + p.h >= q.y + q.h;
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i], b = rects[j];
      if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 8 && iy > 8 && !contains(a, b) && !contains(b, a)) out.overlapPairs++;
    }
  }
  out.sampled = rects.length;

  return out;
}
