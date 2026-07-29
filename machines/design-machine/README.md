# design-machine

Extraire des tokens de design depuis des sites existants, composer plusieurs sources
par couches orthogonales, verifier qu'un rendu respecte le resultat.

> **Tu cherches la liste complete de ce qu'il faut installer ?** -> [`STACK.md`](STACK.md)
> Ce README ne couvre que le paquet lui-meme. `STACK.md` couvre toute la chaine :
> Impeccable, AccessLint, Vercel, ce qui s'exclut, ce qui s'additionne, dans quel ordre.
>
> Raccourci noyau : `./install-stack.sh` — 4 gestes reels, echec bruyant,
> `dm doctor` en constat final. La chaine complete reste manuelle (STACK.md).

Trois commandes, un contrat, une porte.

```
dm extract    <url> --label A   ->  sources/A.json
dm merge      --map ...         ->  design-system/{MASTER.md, tokens.css, tokens.json}
dm design-md  --north-star ...  ->  DESIGN.md + .impeccable/design.json
dm waivers                      ->  derogations du detecteur Impeccable
dm verify     <url>             ->  conformite au MASTER
dm gate       [<url>]           ->  verdict unique, sortie 1 si ferme
```

---

## Installation

```bash
cd design-machine
npm install                 # puppeteer-core uniquement, ~2 Mo
# mettre `dm` dans le PATH — un wrapper, pas npm link (survit aux changements de Node) :
printf '#!/usr/bin/env bash\nexec node "%s/bin/dm.mjs" "$@"\n' "$PWD" > ~/.local/bin/dm
chmod +x ~/.local/bin/dm
```

C'est LE chemin d'installation — le hook et le skill supposent `dm` dans le PATH
(surcharge possible via `DM_BIN`).

C'est tout. Aucun skill, aucun plugin, aucun autre outil n'est requis.

Aucun Chromium n'est telecharge. Le paquet utilise celui qui est deja installe.
Sur Linux Mint : `sudo apt install chromium` si besoin. Sinon `CHROME_PATH=/chemin/vers/chrome`.

Verifier que tout tourne :

```bash
npm test            # 62 tests sur les parties deterministes, sans navigateur
npm run test:e2e    # 8 passes reelles Chromium sur fixtures locales, zero reseau
dm doctor           # preconditions nommees : Node, Chromium, profil, options
```

`dm doctor` echoue bruyamment (sortie 1) si un element REQUIS manque, et donne
le geste exact pour chaque absent — une machine ne s'installe jamais cassee en
silence.

---

## 1. Extraire

```bash
dm extract https://exemple-a.com --label A
dm extract https://exemple-b.com --label B --screenshot b.png
dm extract https://exemple-c.com --label C --motion
```

`--motion` etend la capture au mouvement, en trois instruments :

- **CSSOM** — `@keyframes` (nom, etapes, proprietes) et regles `:hover`/`:focus`/
  `:active` declarees. Les feuilles cross-origin illisibles sont comptees.
- **`document.getAnimations()` echantillonne** — au chargement (loaders), pendant
  le deroule (apparitions au scroll), et au survol programmatique des elements
  interactifs (durees REELLES des transitions declenchees).
- **Detecteur de non-instrumentable** — le mouvement pilote en JS pur (rAF, GSAP,
  canvas) ne produit aucun token : il est detecte (ticks rAF, mutations de style
  inline) et signale dans le MASTER, jamais estime.

Ce qui se passe : Chromium ouvre l'url, attend le reseau et les polices, deroule
toute la page (le lazy-load cache la moitie des styles a l'ouverture), puis lit
les `computed styles` de chaque element visible.

Deux ponderations font la difference entre un resultat utilisable et du bruit :

- **Les fonds sont ponderes par surface.** Sans ca, une couleur d'accent posee sur
  200 petits badges ecrase la dominante du body.
- **La typographie est ponderee par volume de texte.** Un `<span>` de deux
  caracteres ne pese pas autant qu'un paragraphe.

Sortie : `sources/A.json`, cinq couches deja normalisees.

## 2. Composer

```bash
dm merge --sources sources \
  --map typography=A,palette=B,spatial=B,motion=C,surfaceStyle=A
```

**Une couche vient d'une seule source.** C'est la seule regle qui empeche le collage.

| Couche | Contenu |
| --- | --- |
| `typography` | familles, echelle et ses ratios, graisses, interlignes, approche |
| `palette` | fond dominant, surfaces, encre, attenue, accents |
| `spatial` | maille d'espacement, paliers, couverture |
| `motion` | durees, courbes |
| `surfaceStyle` | rayons, bordures, ombres |

Ces cinq dimensions sont independantes : rien dans une echelle typographique ne
presuppose une palette. Les composants, non — `dm merge` refuse `--map hero=A`
avec un message explicite. Un composant est une intersection de couches ; en
prendre un chez A et un chez B importe deux systemes entiers d'un coup.

Au-dela de trois sources, la commande avertit : aucune couche ne domine plus assez
pour produire une identite.

Sorties :

- `design-system/MASTER.md` — ce que l'agent lit
- `design-system/tokens.css` — ce que le code consomme
- `design-system/tokens.json` — ce que la porte compare

## 3. Verifier

```bash
dm verify http://localhost:3000
dm verify http://localhost:3000 --json      # pour la CI
```

Meme collecteur, cible differente. Quatre regles :

| Regle | Severite |
| --- | --- |
| famille de police hors MASTER | echec |
| taille de texte hors echelle (tolerance 1px) | echec |
| fond non declare occupant plus de 2 % de la surface | echec |
| duree de transition hors du jeu declare | avertissement |

Le motion n'est qu'un avertissement parce que trop de bibliotheques injectent
leurs propres durees. Bloquer dessus rend la porte insupportable, et une porte
insupportable finit desactivee.

## 4. Brancher Impeccable — facultatif

**Rien ici n'est requis.** La machine tourne sans. `dm gate` detecte l'absence
d'Impeccable, saute l'etape et ouvre la porte. La seule dependance du paquet est
`puppeteer-core`.

Cela dit, [Impeccable](https://github.com/pbakaus/impeccable) (Apache 2.0) est le
complement exact de cette machine, pas son concurrent :

| | question posee |
| --- | --- |
| `impeccable detect` | est-ce de la slop generique ? |
| `dm verify` | est-ce conforme a **ton** contrat ? |

Deux façons de s'en servir, selon ce que tu veux charger :

```bash
npx impeccable detect .    # le detecteur seul, sans rien installer
npx impeccable install     # + le skill et ses 23 commandes dans ton harnais
```

La premiere ligne suffit pour que `dm gate` ait ses deux etapes. La seconde
ajoute une posture dans ton contexte a chaque session — a ne prendre que si tu
veux le vocabulaire de commandes (`/impeccable typeset`, `/impeccable critique`).

### Le conflit de contrat, et comment il est tranche

Impeccable ecrit un `DESIGN.md` a la racine. Cette machine ecrit
`design-system/MASTER.md`. Deux fichiers qui pretendent decrire le meme systeme
divergent en trois semaines.

**Le MASTER est la source. `DESIGN.md` en est un derive.**

```bash
dm design-md --north-star "Le sanctuaire editorial"
```

Genere un `DESIGN.md` au format attendu par Impeccable — six sections, ordre fixe,
noms fixes — plus le sidecar `.impeccable/design.json`. Les deux fichiers sont
ecrases a chaque regeneration : ne jamais les editer.

Deux refus assumes dans ce rendu :

- **Section 05 Components reste vide.** Un composant est une intersection de
  couches ; l'extraction ne peut pas le deriver. La remplir avec
  `/impeccable document` une fois qu'un bouton et une carte existent dans le code.
- **Le Creative North Star n'est pas invente.** Sans `--north-star`, le champ
  porte `TODO` et la commande le signale. Aucune extraction ne produit une intention.

### Derogations du detecteur

Le detecteur d'Impeccable bloque les polices surexploitees (Inter, Arial,
system-ui). Si ton MASTER en declare une, c'est un choix assume, pas de la slop :

```bash
dm waivers --dry-run     # voir les commandes
dm waivers               # les appliquer
```

La derogation est generee depuis le contrat, avec sa raison. Le format de
configuration appartient a Impeccable : `dm waivers` passe par sa CLI plutot
que d'ecrire son JSON, pour que ses evolutions ne cassent rien ici.

## 5. Cabler la porte

```bash
cat hooks/settings.snippet.json     # fusionner dans .claude/settings.json (evenement Stop)
cp -r skill/design-machine ~/.claude-mecid/skills/
cat templates/CLAUDE.snippet.md     # ajouter au CLAUDE.md du projet
```

Le hook est cable en `Stop` — fin de tour — pas en `PostToolUse` : lancer
Chromium a chaque ecriture de fichier rend la porte insupportable, et une porte
insupportable finit desactivee.

Il enchaine deux portes : `dm lint` d'abord (statique, rapide, tourne meme sans
serveur de dev — le cas Flutter), puis `dm gate` si un serveur repond.

Il appelle `dm gate`, qui enchaine `dm verify` et `impeccable detect` et rend
**un seul verdict**. Trois hooks qui parlent chacun dans leur coin, c'est trois
fois le bruit et aucune decision consolidee.

Une etape ABSENTE est ignoree : sans MASTER, sans serveur de dev, ou sans
Impeccable installe, la porte s'ouvre en silence. Une PANNE, non : tokens
corrompus, capture qui leve, timeout ferment la porte. Ne pas pouvoir verifier
n'est pas etre conforme.

Le hook sort en silence si le MASTER n'existe pas ou si le serveur de dev est
eteint. Il ne bloque que sur une derive reelle, et renvoie le rapport a l'agent
en code 2 pour qu'il corrige dans la foulee.

---

## Clair et sombre

Le mode sombre est un volet de la palette, pas un second systeme :

```bash
dm extract <url> --label A                 # theme clair (schema force)
dm extract <url> --scheme dark --label A-dark
dm merge --sources sources --map ...,paletteDark=A-dark
```

- Le volet peut venir d'une AUTRE source que le clair (une couche, une source).
- `tokens.css` emet `@media (prefers-color-scheme: dark)` + `[data-theme="dark"]` ;
  `dm export dart|ts` projette les deux jeux.
- `dm gate` verifie LES DEUX schemas des que le volet existe : conforme en
  clair et casse en sombre ferme la porte.
- `dm verify --scheme dark` sans volet au contrat = REFUS explicite — juger un
  rendu sombre contre la palette claire produirait un verdict faux.

## Stacks non-web : Flutter, React Native, Electron, Ionic

Le contrat est `tokens.json` — `tokens.css` n'en est qu'une projection. Deux
autres projections et une porte statique couvrent les stacks ou le rendu ne
passe pas (ou pas seulement) par un DOM mesurable :

```bash
dm export dart      # design-system/tokens.dart — Flutter
dm export ts        # design-system/tokens.ts  — React Native, Electron, Ionic
dm lint <dir>       # litteraux de couleur hors tokens/theme : fichier:ligne + decompte
```

- **Electron / Ionic / PWA** : rendu navigateur → toute la chaine s'applique
  (verify, gate, compare) sur le localhost de dev.
- **React Native** : via Expo Web, la chaine s'applique en proxy — le rendu
  natif differe a la marge, le dire plutot que l'ignorer.
- **Flutter** : rendu canvas, invisible aux instruments DOM — `dm lint` est la
  porte (le code, pas le rendu), `dm export dart` la consommation. Un litteral
  assume se marque `dm-lint-ignore` avec sa raison.

`--mobile` (extract, verify, gate, compare, density) : emulation device reelle —
UA iPhone, 390x844, DPR 3, touch. Sans UA mobile, beaucoup de sites servent le
markup desktop et on mesurerait une fenetre etroite, pas du mobile. Mesure : la
densite mobile de bonito differe du desktop sur les six metriques.

## Licences de police

`dm merge` liste dans `licenceReview` toute famille non systeme rencontree, et
l'affiche en avertissement dans le MASTER.

Extraire `font-family: "Editorial New"` d'un site ne te donne aucun droit dessus.
La regle utile : **tu derives des regles, pas des actifs.** Une echelle
typographique, un ratio de contraste, une duree de transition sont des faits non
protegeables. Une identite visuelle reconnaissable ne l'est pas.

---

## Limites connues

Elles sont reelles, pas cosmetiques. A calibrer sur tes propres sources.

- **La surface des fonds est comptee avec recouvrement.** Un element sur un
  parent de meme couleur compte deux fois. L'ordre relatif reste juste, les
  pourcentages absolus sont approximatifs. Le seuil de 2 % est a ajuster.
- **Un seul viewport par extraction.** Le responsive n'est pas capture. Relance
  avec `--width 375` pour comparer, la fusion des deux n'est pas automatisee.
- **Sans `--motion`, etat au repos uniquement.** Avec, le survol est mesure et
  les animations jouees sont lues — mais pas d'etat ouvert (menu, modale), et le
  mouvement rAF/canvas reste seulement detecte, jamais tokenise.
- **Pas de conversion OKLCH.** Les couleurs sortent en hexadecimal sRGB. Si tu
  veux raisonner en luminosite perceptuelle, la conversion reste a ecrire.
- **Le schema de couleurs est toujours force** — clair par defaut, sombre via
  `--scheme dark` — jamais herite de l'environnement : un Chromium sur une
  machine au theme sombre mesurait le sombre en croyant mesurer le clair.
- **La detection de maille est un vote, pas une preuve.** La maille retenue est
  la plus grande unite qui couvre au moins 80 % des valeurs ; sous ce seuil, le
  repli est le meilleur score et la couverture l'avoue. Une couverture sous 0.8
  signifie que le site n'a probablement pas de grille reguliere — le lire comme
  tel plutot que d'imposer la valeur trouvee. Ancien mode d'echec, corrige :
  le vote aux hits bruts elisait l'unite 2 (qui divise tout nombre pair) avec
  couverture 1.00 des qu'une valeur hors maille trainait.

## Structure

```
bin/dm.mjs              CLI
src/args.mjs            parseur d'arguments (booleens vs valeurs)
src/collect.mjs         execute dans la page — code navigateur
src/motion.mjs          execute dans la page — sonde, CSSOM, survol (--motion)
src/extract.mjs         pilotage Chromium
src/normalize.mjs       brut -> cinq couches
src/merge.mjs           composition, refus des non-composables
src/render.mjs          MASTER.md + tokens.css
src/verify.mjs          comparaison au contrat
src/designmd.mjs        derive DESIGN.md + design.json pour Impeccable
src/native.mjs          derive tokens.dart / tokens.ts (dm export)
src/lint.mjs            porte statique — litteraux de couleur hors tokens
src/intensity.mjs       execute dans la page — decomptes de densite
src/compare.mjs         densite source vs rendu (dm compare, dm density)
src/impeccable.mjs      pont vers le detecteur et ses derogations
src/gate.mjs            composition du verdict unique
skill/design-machine/   SKILL.md — quand lancer quoi
STACK.md                la chaine complete : quoi installer, dans quel ordre
install-stack.sh        installeur, simulation par defaut
hooks/                  porte Claude Code
templates/              bloc CLAUDE.md
test/run.mjs            62 tests, sans navigateur ni Impeccable
```

MIT.
