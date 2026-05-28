Chapitre deux. Algèbre vectorielle. Pour parler proprement de neurones empilés et de réseaux.

Au chapitre un, on a écrit la formule du neurone sous trois formes : développée, somme symbolique, et vectorielle compacte y égal f de w scalaire x plus b. Ce chapitre installe les fondations nécessaires pour comprendre cette troisième forme, puis franchit deux étapes supplémentaires : la transposée et le produit matrice-matrice, qui vont ouvrir la voie aux réseaux multi-couches.

Le vecteur, une liste ordonnée de nombres.

Un vecteur, c'est simplement une liste ordonnée de nombres. On le note souvent en gras minuscule, par exemple x égal x un, x deux, x trois. Chaque nombre s'appelle une coordonnée ou une composante. Le nombre total de coordonnées s'appelle la dimension du vecteur. Géométriquement, en dimension deux ou trois, on visualise un vecteur comme une flèche partant de l'origine. Au-delà de trois dimensions, on ne visualise plus, mais les règles algébriques restent les mêmes.

En machine learning, les vecteurs sont partout. Les entrées d'un neurone sont un vecteur x. Ses poids sont un vecteur w de même dimension. Une image en niveaux de gris de vingt-huit fois vingt-huit pixels devient un vecteur de sept cent quatre-vingt-quatre nombres. Un mot dans un modèle de langage devient un vecteur d'embedding de plusieurs centaines de coordonnées. Apprends à voir le vecteur comme un objet unique manipulable, pas comme une collection séparée de nombres.

Le produit scalaire.

Le produit scalaire de deux vecteurs x et w de même dimension est défini par : x scalaire w égal somme pour i allant de un à n de x i fois w i. C'est UN nombre, un scalaire, pas un vecteur. On l'appelle aussi parfois produit interne ou produit ponctué.

Exemple chiffré. Reprenons les valeurs du chapitre un, mais en notation vectorielle. C'est exactement la même somme pondérée que dans le chapitre un, écrite cette fois avec la notation vectorielle. Le vecteur des entrées est x égal un, zéro, un. Le vecteur des poids est w égal zéro virgule huit, zéro virgule cinq, zéro virgule neuf. Le produit scalaire x scalaire w vaut un fois zéro virgule huit, plus zéro fois zéro virgule cinq, plus un fois zéro virgule neuf, donc un virgule sept. En ajoutant le biais moins zéro virgule cinq, on retrouve z égal un virgule deux, comme au chapitre un.

Sur la page, le composant interactif dessine deux vecteurs x et w dans le plan. Bouge les curseurs et observe trois choses simultanément : le produit scalaire change, mais aussi la norme et l'angle entre eux. Quand l'angle approche quatre-vingt-dix degrés, le produit scalaire tombe à zéro. Les vecteurs sont alors orthogonaux.

Trois expériences à tenter. Aligne les deux vecteurs sur la même direction : le produit scalaire devient maximal, égal au produit des normes. Place-les perpendiculairement : le produit scalaire est exactement zéro. Inverse le sens de w avec des coordonnées négatives : le produit scalaire devient négatif, parce que les flèches pointent dans des directions opposées.

Cauchy-Schwarz, ou pourquoi la formule géométrique est légitime.

Beaucoup de cours présentent la formule x scalaire w égal norme de x, fois norme de w, fois cosinus thêta, comme une seconde définition tombée du ciel. Ce n'est pas honnête. La bonne lecture est inverse : on définit le produit scalaire algébriquement, on démontre une inégalité fondamentale, et c'est cette inégalité qui rend la formule géométrique légitime.

L'inégalité de Cauchy-Schwarz dit que la valeur absolue de x scalaire w est toujours inférieure ou égale au produit des normes. L'égalité ne tient que si x et w sont colinéaires.

Démonstration par le discriminant, en quatre étapes. Étape un : on suppose w non nul et on regarde le polynôme P de t égal carré de la norme de x plus t fois w. Comme c'est un carré de norme, P de t est toujours positif ou nul. Étape deux : en développant grâce à l'identité du parallélogramme, on obtient P de t égal carré de la norme de x, plus deux fois t fois le produit scalaire x scalaire w, plus t carré fois le carré de la norme de w. C'est un polynôme du second degré en t, à coefficient dominant strictement positif. Étape trois : un tel polynôme est partout positif si et seulement si son discriminant est négatif ou nul. Le discriminant vaut quatre fois la différence entre le carré du produit scalaire et le produit des carrés des normes. Étape quatre : la condition discriminant négatif ou nul s'écrit exactement carré du produit scalaire inférieur ou égal au produit des carrés des normes. En prenant la racine carrée, on obtient l'inégalité de Cauchy-Schwarz. L'égalité a lieu quand le discriminant s'annule, c'est-à-dire quand x et w sont colinéaires.

Maintenant qu'on a cette borne, on peut diviser sans risque et définir le cosinus thêta comme le quotient du produit scalaire par le produit des normes. Cette quantité tombe forcément dans l'intervalle moins un, plus un, grâce à Cauchy-Schwarz. On peut donc l'identifier au cosinus d'un unique angle thêta entre zéro et pi. En réarrangeant, on récupère exactement la formule géométrique x scalaire w égal norme de x, fois norme de w, fois cosinus thêta. Mais elle n'est plus un postulat mystérieux : c'est une conséquence directe de la définition algébrique et de Cauchy-Schwarz.

En dimension deux, on vérifie facilement que ce thêta algébrique coïncide avec l'angle géométrique euclidien : il suffit de poser x selon le premier axe et w en coordonnées polaires, et le calcul direct donne cosinus thêta égal cosinus de l'angle géométrique.

Norme et distance.

La norme d'un vecteur x mesure sa longueur, et se définit comme la racine carrée du produit scalaire de x par lui-même. C'est exactement le théorème de Pythagore généralisé. La distance euclidienne entre deux vecteurs x et y est la norme de leur différence. C'est cette distance que la plupart des algorithmes de machine learning cherchent à minimiser pour comparer des points.

Transposée et produit matriciel.

Avant d'empiler les neurones pour former une couche, il manque deux opérations matricielles. La première est la transposée. La transposée d'une matrice A, notée A grand T, est la matrice obtenue en échangeant ses lignes et ses colonnes. Si A est de taille m fois n, alors A grand T est de taille n fois m, et la coordonnée i, j de A grand T est égale à la coordonnée j, i de A. En pratique, la transposée sert à aligner les dimensions quand on traite un lot d'exemples empilés en matrice : la couche s'écrit alors X fois W grand T, où chaque ligne de X est un exemple et chaque ligne de W est un neurone. Cette notation est partout dans PyTorch et NumPy.

La seconde opération est le produit matrice-matrice. Pour deux matrices A et B compatibles, c'est-à-dire telles que le nombre de colonnes de A égale le nombre de lignes de B, le produit A B est défini par : la coordonnée i, j de A B est la somme pour k allant de un à n du produit de la coordonnée i, k de A par la coordonnée k, j de B. Autrement dit, chaque coefficient du produit est un produit scalaire entre une ligne de A et une colonne de B. Le produit matriciel est donc un tableau de produits scalaires faits en parallèle.

Une propriété cruciale qui revient sans cesse : la transposée d'un produit est égale au produit des transposées dans l'ordre inverse. Autrement dit, A B le tout transposé égal B transposée fois A transposée. La démonstration tient en quatre lignes : on compare les coefficients i, j des deux matrices, on déplie la définition du produit, on reconnaît des coefficients transposés, et l'ordre s'inverse naturellement parce que ce sont eux qui partagent l'indice de sommation.

Empiler les neurones.

Une matrice est un tableau rectangulaire de nombres, organisé en lignes et colonnes. Une matrice de taille m fois n a m lignes et n colonnes. On la note souvent en majuscule, par exemple grand W. Une matrice peut représenter une collection de vecteurs empilés : chaque ligne de W est le vecteur des poids d'un neurone.

Le produit matrice-vecteur permet d'exprimer une couche entière de m neurones en une seule opération. Si W est la matrice des poids, de taille m fois n, et x le vecteur des entrées, de dimension n, alors W x est un vecteur de dimension m, dont la j-ième coordonnée est le produit scalaire de la j-ième ligne de W par x. C'est-à-dire la somme pondérée du j-ième neurone de la couche. Ajouter un vecteur de biais b et appliquer l'activation à chaque coordonnée donne la sortie de la couche.

En une phrase. Un vecteur est une liste ordonnée de nombres, le produit scalaire est leur multiplication composante par composante puis sommée, et grâce à la transposée et au produit matrice-matrice, on peut empiler proprement plusieurs neurones en une seule opération.

Vers le chapitre trois. On a maintenant tout le vocabulaire pour décrire l'opération linéaire d'un neurone. Et surtout, grâce au produit matrice-matrice qu'on vient d'apprendre, on va découvrir une chose troublante. Si on empile deux couches sans fonction d'activation, la première calcule W un fois x, la seconde calcule W deux fois W un fois x. Ce qui se réécrit, en associant, comme W deux fois W un, le tout multiplié par x. C'est-à-dire une seule matrice. Deux couches s'effondrent en une seule. C'est le théorème central du chapitre trois, et il justifie à lui seul l'existence des fonctions d'activation non linéaires comme la sigmoïde, ReLU et tanh, que tu vas apprendre à comparer et à choisir.
