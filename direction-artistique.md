# Direction artistique — L'Alchimiste de Brume

Document de référence pour la partie graphique : ce à quoi ressemblent le héros,
les ennemis, le laboratoire et l'équipement. Objectif : une identité lisible en
2 secondes sur un écran de téléphone, produisible par une seule personne, et qui
ne coûte rien en performance (le jeu tourne en idle, souvent en arrière-plan).

---

## 1. Parti pris général

**Pixel art 2D, vue de profil, silhouettes fortes.**

| Choix | Pourquoi |
| --- | --- |
| Pixel art plutôt que vectoriel/3D | Un sprite de 64×64 se produit en 30 min, se relit instantanément, et 200 sprites pèsent moins qu'une seule scène 3D. |
| Vue de profil (side-view) | Le combat est automatique : deux silhouettes face à face, c'est tout ce qu'il faut lire. |
| Silhouette avant détail | Sur mobile, l'ennemi fait ~100 px de haut. Ce qui se lit, c'est la forme, pas la texture. |
| Palette resserrée | La brume est le personnage principal. Tout le reste est désaturé sauf les liquides. |

### Palette

```
Brume        #2b3140  #3d4557  #545d72   (fonds, brouillard, ombres)
Pierre noyée #1a1d26  #262b36              (sols, murs, silhouettes lointaines)
Cuir/héros   #6b4b34  #8a6544              (manteau, sangles, sacoche)
Verre        #a8c4cc  #d6e8ec              (fioles vides, lentilles, alambic)
```

**Les seules couleurs saturées du jeu sont les liquides** : élixirs, essence,
lucidité, éclats. C'est la règle qui tient tout l'ensemble. Un pixel vif à
l'écran = quelque chose que le joueur gagne ou consomme.

```
Essence      #4fd6a0   vert-turquoise
Réactifs     #d68b3f   ambre
Lucidité     #7f9dff   bleu pâle lumineux
Éclats       #e0d0ff   violet blanchi (rare, donc précieux à l'œil)
```

---

## 2. Le héros : un alchimiste, pas un mage

Tu as raison de bloquer sur le mage. Le mage est une impasse pour ce jeu :
il implique des sorts, des écoles de magie, un bâton, une barre de mana — rien
de tout ça n'existe dans la boucle. Notre personnage **ne lance rien avec les
mains** : il jette, verse, brise et allume ce qu'il a distillé dans son laboratoire.

### Silhouette

- **Long manteau de cuir huilé**, taillé pour l'humidité, ourlet lourd et sale.
- **Masque respiratoire à filtre** (bec court, verres ronds) — il descend dans
  des quartiers noyés de vapeurs. Le masque règle aussi un problème pratique :
  pas de visage à animer, pas d'âge, pas de genre imposé.
- **Bandoulière de fioles** en travers du torse : 6 à 8 tubes de couleur.
  C'est le détail signature, visible même en tout petit.
- **Une lanterne à la ceinture** qui projette un petit halo — la seule source
  de lumière chaude du jeu, et un point d'ancrage visuel dans la brume.
- Pas de chapeau pointu, pas de barbe, pas de bâton, pas de robe.

### Animations (7 au total, c'est suffisant)

| Anim | Frames | Note |
| --- | --- | --- |
| `idle` | 4 | Respiration, la lanterne oscille |
| `throw` | 5 | Frappe : sort une fiole, la lance, elle éclate sur l'ennemi |
| `pour` | 4 | Frappe alternée : verse un réactif au sol, montée acide |
| `hurt` | 2 | Recul, une fiole se brise à sa ceinture |
| `death` | 6 | Genou à terre, la lanterne tombe et s'éteint → écran plus sombre |
| `revive` | 4 | La lanterne se rallume en premier, puis lui |
| `walk` | 6 | Uniquement pour la transition entre districts |

L'anim de mort qui éteint la lanterne (et assombrit littéralement la scène de
combat) est le genre de détail qui fait exister un idle game. Deux lignes de CSS.

### Effets de frappe

Pas de boule de feu. Le type de projectile est **piloté par le palier de pureté
du Flacon équipé** — donc l'équipement se voit en combat, gratuitement :

| Palier | Projectile |
| --- | --- |
| Trouble | Fiole terne, éclaboussure grise |
| Clair | Éclaboussure turquoise nette |
| Prismatique | La fiole se scinde en 3 traits colorés |
| Éthéré | Traînée de vapeur qui persiste 1 s |
| Quintessence | Le liquide flotte avant de retomber |
| Absolu | L'impact laisse un cercle de brume aspirée |

---

## 3. Les ennemis

**Règle de base : ce sont des habitants de la ville, transformés par ce qu'ils
ont respiré.** Pas des monstres génériques. Ça donne une gamme de « bonhommes »
crédible, humanoïde, et ça se décline sans effort par district.

Chaque district a **3 archétypes + 1 gardien**, soit 24 sprites. Un archétype
se décline en 3 variantes de vagues par simple recoloration + un accessoire.

| District | Archétypes | Gardien |
| --- | --- | --- |
| Les Quais Bas | Dockers noyés (démarche lourde, cordages), Rats de cale, Ferrailleurs | **Le Contremaître** — grand, crochet de grue en main |
| Le Marché Noyé | Marchands boursouflés, Colporteurs à sacs, Chiens errants | **La Peseuse** — trois bras, une balance |
| La Verrerie | Souffleurs de verre (bulles de verre à la place des mains), Éclats animés, Apprentis brûlés | **Le Maître Verrier** — corps mi-verre, se fissure à mesure qu'il perd de l'Intégrité |
| Les Citernes | Puisatiers, Choses sans visage, Nageurs | **La Citerne Mère** — masse d'eau à silhouette vaguement humaine |
| L'Observatoire | Astronomes aveugles, Lentilles flottantes, Copistes | **L'Œil Cerclé** — immobile, attaque par faisceaux |
| Le Puits Prismatique | Reflets du héros (!), Prismes, Ombres denses | **Le Premier Alchimiste** — même silhouette que le joueur, en inversé |

Le gardien du district 6 qui est ton propre sprite recoloré : coût de production
quasi nul, effet narratif maximal, et ça justifie la boucle de dissolution.

### Rendu des ennemis

- Sprites **64×64** pour les archétypes, **96×96** pour les gardiens.
- Les ennemis apparaissent **à droite, sortant de la brume** : un fondu depuis
  l'opacité 0 + un décalage horizontal de 40 px. Suffit à faire une entrée.
- 4 animations seulement : `idle` (4f), `attack` (4f), `hurt` (2f), `death` (5f).
- **Cycles supérieurs (Cycle II, III…)** : même sprites, teinte poussée vers le
  violet + contour lumineux. La profondeur infinie ne coûte aucun asset neuf.

### Barres et chiffres

- Une seule barre d'Intégrité par ennemi, fine, collée sous les pieds.
- Chiffres de dégâts en pixel font, montée + fondu en 400 ms.
- Les critiques sortent en **1.4×** de taille et en jaune. Rien d'autre ne
  clignote pendant le combat, sinon un jeu idle devient insupportable.

---

## 4. Le laboratoire : le chaudron est le centre du jeu

C'est le point le plus important du document. Aujourd'hui le laboratoire est une
abstraction (« niveau 14 »). Il doit être **une pièce qu'on regarde**.

### La scène

Une pièce unique en vue de profil, en coupe, comme une maison de poupée. Au
centre : **le chaudron-alambic**, gros, cuivré, cabossé, avec un serpentin qui
monte vers le plafond et un bec verseur qui goutte dans une fiole de collecte.

```
        ╭─ serpentin ─╮
   ╭────┴────╮        │
   │ CHAUDRON│  ═════ ╯   étagères, fioles, notes punaisées
   ╰────┬────╯   bec → 🧪
      foyer
```

### Ce que le chaudron raconte, en temps réel

| État du jeu | Ce que le joueur voit |
| --- | --- |
| Distillation en cours | Le liquide bouillonne, des bulles montent, le serpentin fume |
| Progression de la distillation | **Le niveau du liquide dans la fiole de collecte monte** — c'est ça, la barre de progression. Pas de barre UI. |
| Palier de pureté du résultat | La couleur de la vapeur en sortie de serpentin |
| Réactifs à 0 | Le foyer s'éteint, le chaudron est froid et gris |
| Réactifs disponibles | Braises vives sous le chaudron |
| Distillation terminée | Un flash bref + la fiole pleine reste posée jusqu'au ramassage |

### Le niveau de laboratoire se voit

Le niveau ne s'affiche pas seulement en chiffre : **la pièce grandit**.

| Niveaux | Ce qui apparaît |
| --- | --- |
| 1–10 | Une cave nue, un chaudron cabossé, une caisse |
| 11–25 | Étagères, fioles rangées, un tabouret, un deuxième brûleur |
| 26–50 | Un mur d'alambics secondaires, une table de notes, un chat |
| 51–100 | Second étage visible, tuyauterie de cuivre au plafond |
| 100+ | Le mur du fond s'ouvre sur la brume, la pièce devient un observatoire |

C'est le meilleur retour de progression possible dans un idle : le joueur ne lit
pas son avancement, il l'habite. Et chaque palier est 2–3 sprites à poser dans
la scène, pas un redessin.

### Après une dissolution

La pièce est **vidée** : plancher nu, chaudron froid, mais **les legs restent
physiquement visibles** — les six legs permanents sont six objets accrochés au
mur du fond (un cristal, une clé, un carnet, un prisme, un alambic miniature,
une lentille). Ils s'illuminent au fur et à mesure qu'on les achète. Après 20
dissolutions, le mur est couvert. C'est le trophée du prestige.

---

## 5. L'équipement

Quatre emplacements, quatre formes reconnaissables en silhouette :

| Emplacement | Objet | Lecture visuelle |
| --- | --- | --- |
| **Flacon** | Fiole / flasque à la main | Forme de la fiole + couleur du liquide |
| **Manteau** | Manteau de cuir | Longueur, capuche, doublure |
| **Lentille** | Verre monoculaire sur le masque | Nombre de cerclages, teinte du verre |
| **Gantelet** | Gant renforcé | Plaques, tuyaux, cuivre |

### Les paliers de pureté

Chaque palier a **une couleur, un cadre d'icône et un effet** — la couleur seule
ne suffit pas pour les daltoniens et pour la lisibilité en plein soleil.

| Palier | Couleur | Cadre | Effet |
| --- | --- | --- | --- |
| Trouble | Gris `#6e737d` | Fin, mat | aucun |
| Clair | Blanc `#cdd6dd` | Fin, clair | aucun |
| Prismatique | Turquoise `#4fd6a0` | Double trait | léger reflet qui passe |
| Éthéré | Violet `#9b7fe0` | Double + coins | halo pulsé lent |
| Quintessence | Ambre `#e8a33d` | Épais, orné | particules qui montent |
| Absolu | Blanc irisé | Épais + brume | la brume s'écarte autour de l'icône |

**Les niveaux d'affinage** ajoutent des encoches sur le cadre de l'icône (une
encoche par 5 niveaux). Lisible d'un coup d'œil dans une grille d'objets.

### Icônes

- 48×48, fond transparent, même angle 3/4 pour toutes.
- 4 emplacements × 6 paliers = **24 icônes de base**, plus 2 variantes de forme
  par palier pour éviter la monotonie → ~48 icônes. C'est tout le set.

---

## 6. Les cinq vues

| Vue | Traitement |
| --- | --- |
| **Brume** | Scène de combat plein écran, 3 couches de parallaxe (fond noyé / brume / silhouettes au premier plan) |
| **Laboratoire** | La pièce en coupe, cliquable directement (le chaudron est un bouton) |
| **Élixirs** | Grille d'icônes, comparaison côte-à-côte avec l'objet équipé |
| **Recherche** | Arbre en nœuds reliés, gravé comme un plan sur papier huilé, nœuds acquis en ambre |
| **Dissolution** | Écran sombre, le chaudron au centre qui se vide ; les éclats montent |

La brume est le liant : un `<canvas>` unique de particules lentes, en surcouche
de toutes les vues, opacité 15 %. Un seul effet, partout, pour ~40 lignes.

---

## 7. Contraintes techniques

- **Format** : PNG en atlas (un atlas par district, un pour l'UI, un pour le héros).
- **Rendu** : `image-rendering: pixelated`, échelle entière uniquement (×2, ×3)
  pour ne jamais avoir de pixels flous.
- **Animation** : spritesheets en `steps()` CSS, pas de moteur d'animation.
  Zéro dépendance, zéro JS par frame.
- **Budget** : viser < 2 Mo d'images au total. Un idle se laisse ouvert des heures,
  il ne doit pas chauffer le téléphone.
- **Arrière-plan** : quand l'onglet perd le focus, on coupe le rendu et on ne
  garde que la simulation (`step()`). L'anim reprend au retour.
- **Sécurité de production** : chaque sprite doit rester lisible en niveaux de
  gris. Si ce n'est pas le cas, la silhouette est ratée, pas la palette.

---

## 8. Ordre de production suggéré

1. Le héros (7 anims) + 3 ennemis des Quais Bas + 1 gardien → la scène de combat existe.
2. Le chaudron et ses états → le laboratoire existe.
3. Les 24 icônes de paliers → l'équipement se lit.
4. Les 5 districts restants, un par un.
5. La pièce qui grandit, palier par palier.
6. Le mur des legs.

Les étapes 1 à 3 suffisent pour que le jeu ait l'air d'un jeu. Le reste est
de l'ajout incrémental qui ne bloque rien.
