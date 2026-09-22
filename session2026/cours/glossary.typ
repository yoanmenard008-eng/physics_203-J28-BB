#import "@preview/theorion:0.4.1": *
#import cosmos.rainbow: *
#show: show-theorion

// ===================== GLOSSAIRE =====================

#heading(level: 1)[Glossaire — Concepts clés du cours]

#tip-box(title: "Comment lire ce glossaire")[
  Ce glossaire regroupe tous les concepts clés du cours, classés par thème. Chaque définition est volontairement courte — pour le détail, référez-vous à la session indiquée.
]

// ============================================================
#heading(level: 2)[Mathématiques & Géométrie (Session 1)]
// ============================================================

#definition-box(title: "Vecteur")[
  Grandeur ayant une direction et une magnitude. Représenté par une flèche, décomposé en composantes selon les axes du plan cartésien.
]

#definition-box(title: "Magnitude / Norme")[
  Longueur d'un vecteur, notée $||arrow(v)||$. En 2D : $sqrt(v_x^2 + v_y^2)$ (Pythagore).
]

#definition-box(title: "Vecteur unitaire")[
  Vecteur de longueur 1, noté $hat(u)$. Obtenu en divisant un vecteur par sa norme : $hat(u) = arrow(v) / ||arrow(v)||$. Sert à représenter une direction pure.
]

#definition-box(title: "Produit scalaire")[
  Opération qui retourne un *nombre* : $arrow(u) dot arrow(v) = ||arrow(u)|| dot ||arrow(v)|| dot cos(theta)$. Nul si les vecteurs sont perpendiculaires.
]

#definition-box(title: "Produit vectoriel")[
  Opération 3D qui retourne un *vecteur* perpendiculaire aux deux opérandes : $arrow(a) times arrow(b)$. Non commutatif. Sa norme donne l'aire du parallélogramme formé.
]

#definition-box(title: "Projection")[
  Composante d'un vecteur dans la direction d'un autre : $"proj"_v (arrow(u)) = ((arrow(u) dot arrow(v)) / ||arrow(v)||^2) arrow(v)$.
]

#definition-box(title: "Déterminant")[
  Outil algébrique qui, pour le produit vectoriel, donne les composantes du vecteur perpendiculaire. Sert aussi à résoudre des systèmes d'équations.
]



// ============================================================
#heading(level: 2)[Cinématique (Session 2)]
// ============================================================

#definition-box(title: "Cinématique")[
  Branche de la mécanique qui *décrit* le mouvement (position, vitesse, accélération) sans s'occuper de ses causes (forces).
]

#definition-box(title: "Vecteur position")[
  Vecteur $arrow(r)$ pointant de l'origine vers la position d'un objet. En 2D : $arrow(r) = vec(x, y)$.
]

#definition-box(title: "Vitesse")[
  Dérivée de la position par rapport au temps. Vecteur tangent à la trajectoire. On distingue vitesse *moyenne* ($Delta arrow(r) / Delta t$) et *instantanée* ($d arrow(r) / d t$).
]

#definition-box(title: "Accélération")[
  Dérivée de la vitesse par rapport au temps. Peut changer la magnitude ou la direction de la vitesse (ou les deux).
]

#definition-box(title: "Trajectoire")[
  Courbe formée par l'ensemble des positions successives d'un objet au cours du temps.
]

#definition-box(title: "Mouvement rectiligne uniforme")[
  Mouvement en ligne droite à vitesse constante. Accélération nulle.
]

#definition-box(title: "Mouvement circulaire uniforme")[
  Mouvement sur un cercle à vitesse scalaire constante. L'accélération est centripète (vers le centre), de magnitude $R omega^2$.
]

#definition-box(title: "Mouvement parabolique (projectile)")[
  Mouvement d'un objet soumis à la gravité seule. Vitesse horizontale constante, vitesse verticale décroissante. Accélération $arrow(a) = vec(0, -g)$.
]

// ============================================================
#heading(level: 2)[Lois de Newton (Session 3)]
// ============================================================

#definition-box(title: "Première loi — Inertie")[
  Un objet au repos reste au repos, un objet en mouvement continue en ligne droite à vitesse constante, *sauf* si une force extérieure agit.
]

#definition-box(title: "Deuxième loi — Dynamique")[
  $arrow(F) = m dot arrow(a)$. L'accélération est proportionnelle à la force et inversement proportionnelle à la masse.
]

#definition-box(title: "Troisième loi — Action-Réaction")[
  Pour toute force exercée par A sur B, B exerce une force égale et opposée sur A : $arrow(F)_(A->B) = -arrow(F)_(B->A)$.
]

#definition-box(title: "Dynamique")[
  Branche de la mécanique qui relie le mouvement aux *forces* qui le causent (contrairement à la cinématique).
]

// ============================================================
#heading(level: 2)[Forces de la nature (Session 4)]
// ============================================================

#definition-box(title: "Gravité / Poids")[
  Force d'attraction vers le centre de la Terre : $arrow(P) = m dot arrow(g)$, avec $g approx 9.81$ "m/s"^2.
]

#definition-box(title: "Force normale (N)")[
  Force avec laquelle une surface repousse un objet qui appuie contre elle. Perpendiculaire à la surface. Sur un sol plat : $N = m g$.
]

#definition-box(title: "Frottement sec (Coulomb)")[
  Frottement de contact entre deux solides : $||arrow(f)|| = mu dot ||arrow(N)||$. Dépend du coefficient de friction $mu$ et de la normale.
]

#definition-box(title: "Frottement statique")[
  Frottement sur un objet *immobile*. S'adapte jusqu'à un seuil $F_max = mu_s N$, avec $mu_s > mu_k$ en général.
]

#definition-box(title: "Frottement cinétique")[
  Frottement sur un objet qui *glisse*. Force constante $F_k = mu_k N$.
]

#definition-box(title: "Frottement visqueux (fluide)")[
  Résistance de l'air ou de l'eau. Linéaire ($-k dot arrow(v)$) à faible vitesse, quadratique ($-C dot ||v||^2 dot hat(v)$) à haute vitesse.
]

#definition-box(title: "Vitesse terminale")[
  Vitesse limite atteinte quand la gravité et le frottement fluide s'annulent. L'objet ne peut plus accélérer.
]

// ============================================================
#heading(level: 2)[Intégration numérique (Sessions 5, 8, 12)]
// ============================================================

#definition-box(title: "Intégration numérique")[
  Discrétisation du temps continu en pas $Delta t$ pour calculer position et vitesse image par image. Nécessaire car l'ordinateur calcule frame par frame.
]

#definition-box(title: "Pas de temps (dt)")[
  Intervalle de temps entre deux frames. À 60 FPS, $Delta t approx 0.016$ s. Rend la physique indépendante du framerate.
]

#definition-box(title: "Méthode d'Euler")[
  Intégration du premier ordre : $arrow(v)_(n+1) = arrow(v)_n + arrow(a) dot Delta t$, puis $arrow(r)_(n+1) = arrow(r)_n + arrow(v) dot Delta t$. Simple mais dérive en énergie.
]

#definition-box(title: "Euler semi-implicite (symplectique)")[
  Variante où on met à jour la vitesse *avant* la position, et utilise la *nouvelle* vitesse. Plus stable, choix par défaut des moteurs de jeu.
]

#definition-box(title: "Série de Taylor")[
  Toute trajectoire peut être décomposée en une série de Taylor: 
  
  $x(t + Delta t) = x(t) + x'(t) dot Delta t + frac(1, 2!) x''(t) dot (Delta t)^2 + frac(1, 3!) x'''(t) dot (Delta t)^3 + ...$
  
  Euler ne garde que le premier terme (ordre 1).
]

#definition-box(title: "Intégration de Verlet")[
  Méthode qui ne stocke pas la vitesse explicitement : $v approx (x_n - x_(n-1)) / d t$. Plus précise ($O(d t^4)$), symplectique, tolère les déplacements manuels de positions.
]

#definition-box(title: "Damping (amortissement)")[
  Dissipation d'énergie. En Verlet, on multiplie la vitesse implicite par un coefficient $d <= 1$ à chaque frame.
]

#definition-box(title: "RK4 (Runge-Kutta 4)")[
  Intégration qui évalue l'accélération à *4 endroits* du pas de temps et fait une moyenne pondérée. Précision $O(d t^4)$. Indispensable pour les orbites (systèmes conservatifs).
]

#definition-box(title: "Sub-stepping")[
  Diviser le $d t$ d'une frame en $N$ sous-pas plus petits. Améliore la précision même avec un intégrateur simple. Complémentaire de RK4.
]

#definition-box(title: "Système conservatif")[
  Système sans dissipation (orbites, pendules). L'énergie se conserve — Euler y accumule de l'erreur, d'où RK4.
]

// ============================================================
#heading(level: 2)[Impulsion & Collisions (Session 6)]
// ============================================================

#definition-box(title: "Quantité de mouvement (p)")[
  $arrow(p) = m dot arrow(v)$. Grandeur vectorielle qui mesure "combien de mouvement" porte un objet. Se conserve dans un système isolé.
]

#definition-box(title: "Impulsion (J)")[
  Produit $arrow(J) = arrow(F) dot Delta t$ qui change la vitesse instantanément lors d'un choc : $arrow(J) = Delta arrow(p) = m dot Delta arrow(v)$. Évite de simuler une force énorme frame par frame.
]

#definition-box(title: "Coefficient de restitution (e)")[
  Rapport entre la vitesse de séparation et la vitesse d'approche : $v_"rel"("après") = -e dot v_"rel"("avant")$. $e=1$ : élastique ; $e=0$ : mou.
]

#definition-box(title: "Vitesse relative")[
  Vitesse de rapprochement projetée sur la normale de collision : $v_"rel" = (arrow(v)_A - arrow(v)_B) dot arrow(n)$. Négative = rapprochement.
]

#definition-box(title: "Normale de collision")[
  Direction perpendiculaire au contact, de A vers B. Seule la composante *normale* de la vitesse est modifiée par l'impulsion.
]

#definition-box(title: "Masse réduite")[
  $m_"red" = (m_A m_B) / (m_A + m_B)$. Combine les deux masses en une seule pour le calcul d'impulsion.
]

#definition-box(title: "Vitesse tangentielle")[
  Composante de vitesse perpendiculaire à la normale. Inchangée par l'impulsion (glissement).
]

// ============================================================
#heading(level: 2)[Détection de collision — Broad Phase (Session 7)]
// ============================================================

#definition-box(title: "Pipeline de collision")[
  Entonnoir en 3 étapes : *Broad Phase* (candidats) → *Narrow Phase* (confirmation) → *Response* (impulsion). Chaque étage divise le travail par un ordre de grandeur.
]

#definition-box(title: "Broad Phase")[
  Première étape : trouver rapidement quelles paires d'objets *pourraient* entrer en collision, via des boîtes simplifiées (AABB). Élimine 95--99 % des paires.
]

#definition-box(title: "Narrow Phase")[
  Deuxième étape : tester géométriquement chaque paire candidate pour *confirmer* la collision et calculer le contact (point, normale, profondeur).
]

#definition-box(title: "Collision Response")[
  Troisième étape : appliquer l'impulsion et corriger la position suite à une collision confirmée.
]

#definition-box(title: "AABB (Axis Aligned Bounding Box)")[
  Plus petit rectangle/pavé *aligné sur les axes* contenant un objet. Définie par deux points min et max. Test de chevauchement trivial (6 comparaisons en 3D).
]

#definition-box(title: "OBB (Oriented Bounding Box)")[
  Comme une AABB mais *orientée* selon les axes locaux de l'objet. Plus précise pour les objets allongés et tournés. Testée via SAT (15 axes en 3D).
]

#definition-box(title: "Grille uniforme (Spatial Hashing)")[
  Découpe le monde en cases de taille fixe. Chaque objet va dans sa case. On ne teste que les 27 cases voisines (3D). Complexité $O(N)$ si distribution uniforme.
]

#definition-box(title: "Quadtree / Octree")[
  Arbre spatial : on découpe récursivement une boîte en 4 (2D) ou 8 (3D) sous-boîtes quand elle dépasse un seuil d'objets. S'adapte à la densité.
]

#definition-box(title: "Sweep and Prune (SAP)")[
  Projette les AABB sur un axe, trie les intervalles, maintient un ensemble "actif". Exploite la *cohérence temporelle* : quasi $O(N)$ amorti.
]

#definition-box(title: "Cohérence temporelle")[
  D'une frame à l'autre, les objets bougent peu. La liste triée de SAP est presque la même → tri par insertion $O(N)$ au lieu de $O(N log N)$.
]

// ============================================================
#heading(level: 2)[Narrow Phase avancée (Session 11)]
// ============================================================

#definition-box(title: "SAT (Separating Axis Theorem)")[
  Deux polygones convexes ne se touchent pas s'il existe un *axe séparateur* où leurs projections ne se chevauchent pas. On teste les normales des faces. L'axe au plus petit chevauchement donne le contact.
]

#definition-box(title: "Axe séparateur")[
  Axe sur lequel les projections de deux formes ont un *gap* : preuve qu'elles ne se touchent pas.
]

#definition-box(title: "GJK (Gilbert-Johnson-Keerthi)")[
  Algorithme itératif qui construit un *simplex* dans la *différence de Minkowski* $A minus B$. Si l'origine est à l'intérieur → collision. Universel pour toute forme convexe.
]

#definition-box(title: "Différence de Minkowski")[
  Ensemble $A minus B = {a - b | a in A, b in B}$. A et B se touchent ssi l'origine est à l'intérieur de $A minus B$.
]

#definition-box(title: "Fonction de support")[
  $S_A(arrow(d))$ retourne le point de A le plus extrême dans la direction $arrow(d)$. Triviale pour les primitives (sphère, boîte).
]

#definition-box(title: "Simplex")[
  Généralisation du triangle : point (0D), segment (1D), triangle (2D), tétraèdre (3D). GJK le construit itérativement pour encercler l'origine.
]

#definition-box(title: "EPA (Expanding Polytope Algorithm)")[
  Prolonge GJK après collision : étend le simplex vers la vraie frontière de $A minus B$ pour obtenir la *normale* et la *profondeur* de pénétration.
]

// ============================================================
#heading(level: 2)[Position Based Dynamics (Session 8)]
// ============================================================

#definition-box(title: "Position Based Dynamics (PBD)")[
  Au lieu de calculer des forces (Hooke) puis d'intégrer, on *corrige directement les positions* pour satisfaire des contraintes géométriques. Inconditionnellement stable.
]

#definition-box(title: "Contrainte de distance")[
  Règle : "$p_1$ et $p_2$ doivent être à distance $L_0$". Si violée, on déplace chaque particule de la moitié de l'écart le long de la direction.
]

#definition-box(title: "Itérations PBD")[
  Nombre de passes de contraintes par frame. *La raideur émerge du nombre d'itérations* : $N=1$ mou, $N=20$ rigide. Pas de paramètre $k$.
]

#definition-box(title: "Loi de Hooke")[
  Force de rappel d'un ressort : $arrow(F) = -k dot (L - L_0) dot hat(u)$. Instable avec Euler si $k$ est grand — d'où PBD.
]

#definition-box(title: "Shear constraint")[
  Contrainte diagonale (en plus des horizontales/verticales) qui empêche un tissu de se déformer en losange.
]


// ============================================================
#heading(level: 2)[Rotations & Corps rigides (Session 10)]
// ============================================================

#definition-box(title: "Corps rigide")[
  Objet avec étendue spatiale, centre de masse, orientation et répartition de masse. Peut *translater* et *pivoter* simultanément. Les points internes ne bougent pas les uns par rapport aux autres.
]

#definition-box(title: "Particule vs corps rigide")[
  Une particule est un point sans orientation. Un corps rigide a une étendue, une orientation et résiste à la rotation.
]

#definition-box(title: "Couple (Torque)")[
  Équivalent angulaire de la force : $arrow(tau) = arrow(r) times arrow(F)$. Dépend de la force *et* du bras de levier $arrow(r)$.
]

#definition-box(title: "Bras de levier")[
  Distance entre le centre de masse et le point d'application d'une force. Plus il est grand, plus le couple est grand.
]

#definition-box(title: "Moment d'inertie (I)")[
  Résistance d'un objet à la rotation : $I = sum m_i r_i^2$. Dépend de la *répartition* de la masse par rapport à l'axe. Analogue de la masse en rotation.
]

#definition-box(title: "Vitesse angulaire (ω)")[
  Dérivée de l'orientation par rapport au temps (rad/s). Analogue de la vitesse linéaire.
]

#definition-box(title: "Accélération angulaire (α)")[
  Dérivée de la vitesse angulaire : $arrow(alpha) = arrow(tau) / I$. Analogue de $arrow(a) = arrow(F) / m$.
]

#definition-box(title: "Moment angulaire (L)")[
  $arrow(L) = I dot arrow(omega)$. Se conserve en l'absence de couple externe — d'où le patineur qui accélère en rapprochant ses bras.
]

#definition-box(title: "Théorème de Huygens-Steiner")[
  $I = I_"cm" + m d^2$. Permet de calculer $I$ autour d'un axe parallèle à distance $d$ à partir de $I$ au centre de masse.
]

#definition-box(title: "Roulement sans glissement")[
  Condition $v_G = omega R$ : le point de contact est immobile par rapport au sol. La boule avance à la vitesse exacte de sa rotation.
]

#definition-box(title: "Friction de glissement")[
  Force cinétique au point de contact qui *ralentit* la translation *et* *accélère* la rotation, jusqu'à atteindre le roulement pur.
]

#definition-box(title: "Résistance au roulement")[
  Très faible force due à la déformation microscopique du sol. Décélère lentement une boule en roulement pur.
]

#definition-box(title: "Gimbal lock")[
  Perte d'un degré de liberté des angles d'Euler quand deux axes s'alignent. Évité par les *quaternions*.
]

#definition-box(title: "Quaternion")[
  Représentation d'une rotation 3D : $q = (w, x, y, z)$. Pas de gimbal lock, interpolation naturelle. Intégré via $q_"new" = q_"delta" dot q_"old"$.
]

// ============================================================
#heading(level: 2)[Orbites & Gravitation (Session 12)]
// ============================================================

#definition-box(title: "Gravitation universelle")[
  $arrow(F) = G dot (m_1 m_2) / r^2 dot hat(u)$. L'accélération subie ne dépend que de la masse attractive $M$ et de la distance $r$.
]

#definition-box(title: "Vitesse orbitale")[
  $v = sqrt(G M / r)$. Vitesse tangentielle pour une orbite *circulaire* parfaite à la distance $r$.
]

#definition-box(title: "N-body")[
  Gravité *mutuelle* entre tous les corps. Les orbites ne sont plus parfaitement circulaires — les planètes se perturbent.
]

// ============================================================
#heading(level: 2)[Moteurs physiques commerciaux (Sessions 13--14)]
// ============================================================

#definition-box(title: "Moteur physique commercial")[
  Bibliothèque éprouvée (PhysX, Havok, Jolt, Box2D, Rapier) qui gère broad phase, solveur, sleeping, joints. Économise des années de R&D.
]

#definition-box(title: "Rigid Body vs Soft Body")[
  *Rigid* : indéformable (95 % des cas). *Soft* : déformable (tissu, gelée), simulé par masse-ressort ou FEM — beaucoup plus coûteux.
]

#definition-box(title: "CCD (Continuous Collision Detection)")[
  Teste la collision le long de la *trajectoire* entre deux frames, pas seulement aux positions discrètes. Évite le *tunneling* des objets rapides.
]

#definition-box(title: "Tunneling")[
  Un objet rapide traverse un mur mince entre deux frames : aucune position discrète n'est *dans* le mur. Le CCD le prévient.
]

#definition-box(title: "Sleeping")[
  Un objet immobile (vitesses sous un seuil) arrête d'être simulé. Économise du CPU. Se réveille s'il est touché ou reçoit une force.
]

#definition-box(title: "Dynamic / Fixed / Kinematic")[
  *Dynamic* : subit forces et collisions. *Fixed* : jamais bougé (murs, sol). *Kinematic* : contrôlé par le code, pousse les dynamic mais ignore les forces.
]

#definition-box(title: "Raycast")[
  Projette un rayon dans le monde et retourne le premier collider touché, avec distance et normale. Outil de *requête* — ne modifie pas la simulation.
]

#definition-box(title: "Shapecast")[
  "Si je déplace cette forme de A à B, que touche-t-elle en premier ?" Utilisé par les character controllers.
]

#definition-box(title: "Overlap")[
  "Quels corps chevauchent ce volume ?" Pour zones de dégâts, pickups, déclencheurs.
]

#definition-box(title: "Déterminisme")[
  Mêmes inputs → exactement mêmes outputs, même sur des machines différentes. Essentiel pour le multijoueur lockstep et les replays. Difficile (ordre des ops, flottants, threads).
]

#definition-box(title: "ECS (Entity-Component-System)")[
  Architecture des moteurs modernes : *Entity* (ID), *Component* (données pures), *System* (logique sur toutes les entités ayant certains composants). Composition, cache-friendly.
]

#definition-box(title: "Rapier")[
  Moteur physique écrit en Rust, compilé en WASM. Standard pour Three.js. API moderne, déterministe localement.
]

#definition-box(title: "Jolt Physics")[
  Moteur open-source C++ moderne, multithreadé. Moteur par défaut de Godot 4.4+. Rivalise avec PhysX/Havok.
]

#definition-box(title: "WASM (WebAssembly)")[
  Format binaire qui tourne à pleine vitesse dans le navigateur. Rapier est compilé en WASM ; chargement asynchrone via `RAPIER.init()`.
]

// ============================================================
#heading(level: 2)[Joints, Moteurs & Raycasts (Session 15)]
// ============================================================

#definition-box(title: "Joint (articulation)")[
  Contrainte qui relie *deux* rigid bodies et limite leurs degrés de liberté relatifs. Résolue par le solveur au même titre que les contacts.
]

#definition-box(title: "Fixed joint")[
  Soudure : les deux corps sont rigidement liés (distance et orientation figées). Cassable à l'exécution — outil de la destruction.
]

#definition-box(title: "Revolute joint")[
  Charnnière : les deux corps ne peuvent que *tourner* autour d'un axe. Porte, roue, coude.
]

#definition-box(title: "Prismatic joint")[
  Tiroir : les deux corps ne peuvent que *glisser* le long d'un axe. Vérin, piston, platine.
]

#definition-box(title: "Spherical joint")[
  Rotule : les ancres coïncident, rotations libres dans les 3 axes. Épaule, hanche, chaîne.
]

#definition-box(title: "Motor (moteur d'articulation)")[
  Composant optionnel d'un joint qui *pousse* vers une cible : *vitesse* (régulateur) ou *position* (servo). Paramètres `stiffness` et `damping` comme un ressort.
]

#definition-box(title: "Limits (butées)")[
  Bornes min/max sur l'angle (revolute) ou la translation (prismatic) d'un joint. Équivalent d'un butoir mécanique.
]

// ============================================================
#heading(level: 2)[Contraintes & IK (Session 16)]
// ============================================================

#definition-box(title: "PBD vs Impulse Based")[
  *PBD* corrige les positions (simple, stable, vitesses incorrectes). *Impulse Based* calcule les impulsions (physiquement correct, conserve la quantité de mouvement).
]

#definition-box(title: "PGS (Projected Gauss-Seidel)")[
  Solveur itératif : pour chaque contact, calculer l'impulsion, l'appliquer, recommencer. Typiquement 4--8 itérations.
]

#definition-box(title: "Warm Starting")[
  Réutiliser les impulsions de la frame précédente pour converger plus vite.
]

#definition-box(title: "Position Correction (Baumgarte)")[
  Corriger légèrement la position pour réduire la pénétration : $"correction" = "penetration" dot "facteur" dot arrow(n)$.
]

#definition-box(title: "Forward Kinematics (FK)")[
  Des angles des articulations → position de l'extrémité. $arrow(p) = f(theta_1, theta_2, ...)$.
]

#definition-box(title: "Inverse Kinematics (IK)")[
  De la position cible de l'extrémité → angles des articulations. $theta = f^-1(arrow(p))$. Plusieurs solutions possibles, parfois aucune.
]

#definition-box(title: "CCD (Cyclic Coordinate Descent)")[
  IK itérative : ajuster les articulations une par une, de l'extrémité vers la base. Simple, converge vite, mouvements peu naturels.
]

#definition-box(title: "FABRIK")[
  IK par positions : aller (forward) de la main vers l'épaule, puis revenir (backward) en respectant les distances. Mouvements naturels, rapide.
]

// ============================================================
#heading(level: 2)[Véhicules (Session 17)]
// ============================================================

#definition-box(title: "Raycast Vehicle")[
  Modèle arcade : pas de vraies roues, mais des *raycasts* depuis le châssis vers le sol. Plus stable, plus performant.
]

#definition-box(title: "Suspension")[
  Chaque roue simule un ressort : raycast → compression $c = 1 - d / "maxLen"$ → force $F = k c - "damping" dot v_"susp"$.
]

#definition-box(title: "Grip / Slip angle")[
  *Grip* : adhérence du pneu. *Slip angle* : angle entre la direction du pneu et la direction réelle du mouvement. Petit = tourne normalement, grand = dérape (drift).
]

// ============================================================
#heading(level: 2)[Personnages (Session 18)]
// ============================================================

#definition-box(title: "Dynamic Character Controller (DCC)")[
  Personnage = RigidBody standard. Interagit naturellement avec le monde mais difficile à contrôler (glisse, est poussé).
]

#definition-box(title: "Kinematic Character Controller (KCC)")[
  Personnage = RigidBody kinematic. Contrôle total et game feel précis, mais il faut coder les collisions, la gravité, les pentes. Norme AAA.
]

#definition-box(title: "Move and Slide")[
  Algorithme : calculer le mouvement souhaité, tenter de déplacer, si on touche un mur *glisser* le long en annulant la composante normale : $arrow(v)' = arrow(v) - (arrow(v) dot arrow(n)) arrow(n)$.
]

#definition-box(title: "Corner Trap")[
  Blocage quand on glisse le long de deux murs (un coin). Solution : traiter une collision à la fois, trier par profondeur, résoudre la plus profonde.
]

#definition-box(title: "Coyote Time")[
  Après avoir quitté une plateforme, le joueur peut encore sauter pendant $~0.1$ s. Tolérance qui améliore le game feel.
]

#definition-box(title: "Jump Buffering")[
  Si le joueur appuie sur saut juste avant d'atterrir, le saut s'exécute dès l'atterrissage. Évite la frustration des sauts "ratés".
]

// ============================================================
#heading(level: 2)[Physique, GPU & IA (Session 19)]
// ============================================================

#definition-box(title: "Reinforcement Learning (RL)")[
  Boucle : *Agent* (personnage) — *Environment* (monde physique) — *State* (capteurs) — *Action* (forces/torques) — *Reward* (note). Apprend par essai/erreur.
]

#definition-box(title: "Neuroevolution")[
  Algorithmes génétiques appliqués aux réseaux de neurones : population aléatoire → évaluation (fitness) → sélection → crossover/mutation → nouvelle génération.
]

#definition-box(title: "Compute Shader")[
  Programme qui s'exécute sur le GPU mais n'est *pas* un shader de rendu. Met à jour positions/vitesses/lifetime des particules stockées dans un SSBO.
]

#definition-box(title: "SSBO (Shader Storage Buffer Object)")[
  Buffer GPU accessible en lecture/écriture par un compute shader. Les données des particules y restent — pas de transfert CPU/GPU.
]
