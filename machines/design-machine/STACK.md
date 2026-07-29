# STACK

Tout ce qui compose la chaine de design, dans l'ordre d'installation.

La regle de lecture : **un seul moteur de gout, autant de portes que possible.**
Les postures se contredisent entre elles ; les portes s'additionnent sans conflit.

---

## Vue d'ensemble

| # | Quoi | Nature | Requis | Ce que ca apporte |
| --- | --- | --- | --- | --- |
| 0 | Node 20+ et Chromium | runtime | **oui** | fait tourner la machine |
| 1 | `design-machine` | instruments + 1 skill | **oui** | extraction, contrat, porte de conformite |
| 2 | Impeccable | 1 skill + 1 CLI | recommande | moteur de gout, detecteur de slop |
| 3 | AccessLint | 3 skills + MCP | recommande | porte d'accessibilite sur DOM vivant |
| 4 | Vercel agent-skills | 2 skills retenus | utile | patterns React, perf et composition |
| 5 | Bencium `typography` | 1 skill | optionnel | guillemets courbes, tirets |

Descriptions chargees en contexte au total : **7**, si tout est pris.
Le reste (CLI, MCP, scripts) ne consomme rien tant qu'il n'est pas appele.

---

## 0. Runtime

```bash
node --version          # 20 minimum
sudo apt install chromium
```

Rien n'est telecharge par la suite : le paquet utilise ce Chromium.
Sinon `export CHROME_PATH=/chemin/vers/chrome`.

## 1. design-machine — le noyau

```bash
cd design-machine
npm install
npm test                # 61 tests, sans navigateur
npm link                # met `dm` dans le PATH

cp -r skill/design-machine ~/.claude/skills/
cp hooks/settings.snippet.json      # fusionner dans .claude/settings.json
cat templates/CLAUDE.snippet.md     # ajouter au CLAUDE.md du projet
```

Apporte : `dm extract`, `dm merge`, `dm design-md`, `dm waivers`, `dm verify`, `dm gate`.
Voir `README.md` pour le detail.

## 2. Impeccable — moteur de gout et detecteur

Apache 2.0. Deux niveaux d'engagement, a choisir :

```bash
npx impeccable detect .        # le detecteur seul, rien d'installe
npx impeccable install         # + le skill et ses 23 commandes
```

Le detecteur seul suffit a `dm gate`. Le skill n'a d'interet que si tu veux le
vocabulaire de commandes (`/impeccable typeset`, `/impeccable critique`).

**Exclusion :** ne pas installer `frontend-design` a cote. Impeccable en est
explicitement derive — meme couche, meme declencheur, directives concurrentes.
Le modele en applique un et ignore l'autre selon l'ordre de chargement.

Apres install, accorder au detecteur les polices que ton MASTER declare :

```bash
dm waivers
```

## 3. AccessLint — porte d'accessibilite

```bash
claude plugin marketplace add accesslint/skills
claude plugin install accesslint@accesslint
```

> Verifier les noms exacts via `/plugin` apres avoir ajoute le marketplace.
> Le depot a ete restructure recemment, les identifiants peuvent avoir bouge.

Trois skills : `scan`, `diff`, `audit`. WCAG 2.2, audit du DOM rendu via CDP.

**Le seul qui compte vraiment est `diff`** : il capture une baseline, restaure ton
travail, et ne rapporte que les violations **nouvelles**. `scan` et `audit` se
recouvrent largement avec lui. Si tu veux resserrer a 5 descriptions au lieu de 7,
c'est la qu'il faut couper.

## 4. Vercel agent-skills — patterns d'ingenierie

```bash
npx skills add vercel-labs/agent-skills
```

**A retirer apres install** — quatre skills sans usage ici, quatre descriptions
chargees pour rien a chaque session :

```
react-native-guidelines     # tu fais du Flutter
writing-guidelines
vercel-deploy-claimable
vercel-optimize             # tu deploies sur ton VPS, pas sur Vercel
```

> Un flag `--skill` existe chez skills.sh, documente sur d'autres depots mais
> pas sur celui de Vercel. Tester `npx skills add vercel-labs/agent-skills --list`
> avant de supposer qu'il marche ; sinon supprimer les dossiers a la main.

**A garder :**

- `react-best-practices` — priorise par impact reel (waterfalls et bundle en
  critique, `useMemo` en moyen), a rebours de l'instinct par defaut du modele
- `composition-patterns` — la regle anti-props-booleens vaut l'install a elle seule

Optionnel, plus tard : `react-view-transitions`, le jour ou tu attaques des
transitions de page.

## 5. Bencium typography — optionnel

```bash
npx skills add bencium/bencium-marketplace -g --skill typography
```

Autonome, se declenche en post-traitement, aucune collision avec le reste.
Le seul du lot Bencium a prendre : les trois « designers » du depot se marchent
dessus et entrent en collision avec Impeccable.

---

## Ce qui s'exclut

| Groupe | Regle |
| --- | --- |
| Moteur de gout | **un seul** parmi Impeccable, `frontend-design`, `ui-ux-pro-max`, les designers Bencium |
| `ui-ux-pro-max` | ecarte : ton MASTER fait deja son travail, a partir de sources que tu choisis |
| `web-design-guidelines` (Vercel) | ecarte : couvert par AccessLint, et il fetch ses regles a distance a chaque run |

## Ce qui s'additionne

Les portes, sans conflit, parce qu'elles posent des questions differentes :

| Porte | Question |
| --- | --- |
| `dm verify` | est-ce conforme a **ton** contrat ? |
| `impeccable detect` | est-ce de la slop generique ? |
| `accesslint diff` | est-ce accessible, et pire qu'avant ? |

`dm gate` enchaine les deux premieres et rend un verdict unique. `accesslint diff`
reste separe : il a son propre mecanisme de baseline, l'absorber n'apporterait rien.

Et les patterns d'ingenierie s'ajoutent librement : ils se declenchent sur
*refactor*, *optimize*, *review perf* — jamais sur *build*.

---

## Verification finale

```bash
uvx mcp-scan@latest --skills
```

Audit de securite de tout ce qui est installe. Snyk mesure 36,8 % de skills avec
au moins un defaut sur 3 984 scannes, 13,4 % avec un defaut critique — mais un
taux de faux positifs de 0 % sur le top 100. Le risque est dans la longue traine,
pas chez les projets etablis. Les quatre ci-dessus viennent d'Anthropic, Vercel,
AccessLint et un depot Apache 2.0 a 36 contributeurs.

Deux points de privilege a connaitre quand meme :

- AccessLint lance **Chrome en CDP** et embarque un serveur MCP. C'est le plus
  privilegie du lot. Lire son `SKILL.md` avant.
- `design-machine` lance Chromium aussi — c'est le meme mecanisme, et le code
  tient dans `src/collect.mjs` et `src/extract.mjs`. Lisible en dix minutes.

---

## Ordre de mise en route

Ne pas tout installer d'un coup. L'ordre importe, parce que chaque etape rend la
suivante evaluable :

1. `npm install && npm test` — la machine tourne
2. `dm extract` sur un site que tu connais visuellement bien — l'extraction dit-elle vrai ?
3. `dm merge` puis lire `design-system/MASTER.md` — le contrat tient-il debout ?
4. `dm verify` a la main sur une page — la porte est-elle juste ?
5. Seulement la : cabler le hook, puis ajouter Impeccable, puis AccessLint

Une porte cablee avant d'etre calibree se desactive au bout de deux sessions.
