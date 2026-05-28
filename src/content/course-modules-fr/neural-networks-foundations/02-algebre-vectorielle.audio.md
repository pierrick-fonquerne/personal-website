Chapitre deux. Algèbre vectorielle. Pour parler proprement de neurones empilés et de réseaux.

Au chapitre un, on a écrit la formule du neurone sous trois formes : développée, somme symbolique, et vectorielle compacte y égal f de w scalaire x plus b. Ce chapitre installe les fondations nécessaires pour comprendre cette troisième forme et ouvrir la voie aux réseaux multi-couches.

Le vecteur, une liste ordonnée de nombres.

Un vecteur, c'est simplement une liste ordonnée de nombres. On le note souvent en gras minuscule, par exemple x égal x un, x deux, x trois. Chaque nombre s'appelle une coordonnée ou une composante. Le nombre total de coordonnées s'appelle la dimension du vecteur. Géométriquement, en dimension deux ou trois, on visualise un vecteur comme une flèche partant de l'origine. Au-delà de trois dimensions, on ne visualise plus, mais les règles algébriques restent les mêmes.

En machine learning, les vecteurs sont partout. Les entrées d'un neurone sont un vecteur x. Ses poids sont un vecteur w de même dimension. Une image en niveaux de gris de vingt-huit fois vingt-huit pixels devient un vecteur de sept cent quatre-vingt-quatre nombres. Un mot dans un modèle de langage devient un vecteur d'embedding de plusieurs centaines de coordonnées. Apprends à voir le vecteur comme un objet unique manipulable, pas comme une collection séparée de nombres.

Le produit scalaire.

Le produit scalaire de deux vecteurs x et w de même dimension est défini par : x scalaire w égal somme pour i allant de un à n de x i fois w i. C'est UN nombre, un scalaire, pas un vecteur. On l'appelle aussi parfois produit interne ou produit ponctué.

Exemple chiffré. Reprenons les valeurs du chapitre un, mais en notation vectorielle. Le vecteur des entrées est x égal un, zéro, un. Le vecteur des poids est w égal zéro virgule huit, zéro virgule cinq, zéro virgule neuf. Le produit scalaire x scalaire w vaut un fois zéro virgule huit, plus zéro fois zéro virgule cinq, plus un fois zéro virgule neuf, donc un virgule sept. C'est la somme pondérée du neurone, sans le biais. En ajoutant b égal moins zéro virgule cinq, on obtient z égal un virgule deux, comme au chapitre un.

Sur la page, le composant interactif dessine deux vecteurs x et w dans le plan. Bouge les curseurs et observe trois choses simultanément : le produit scalaire change, mais aussi la norme et l'angle entre eux. Quand l'angle approche quatre-vingt-dix degrés, le produit scalaire tombe à zéro. Les vecteurs sont alors orthogonaux.

Trois expériences à tenter. Aligne les deux vecteurs sur la même direction : le produit scalaire devient maximal, égal au produit des normes. Place-les perpendiculairement : le produit scalaire est exactement zéro. Inverse le sens de w avec des coordonnées négatives : le produit scalaire devient négatif, parce que les flèches pointent dans des directions opposées.

Intuition géométrique. Il existe une seconde formule équivalente du produit scalaire : x scalaire w égal norme de x, fois norme de w, fois cosinus de l'angle thêta entre les deux. Les normes mesurent la longueur des flèches, et le cosinus de l'angle vaut un quand ils pointent dans la même direction, zéro quand ils sont perpendiculaires, et moins un quand ils sont opposés. C'est la même quantité que la définition algébrique somme x i w i. Les deux donnent le même nombre, vues sous deux angles différents. Important : la formule géométrique éclaire intuitivement pourquoi un neurone classe en fonction de l'orientation de ses poids par rapport à ses entrées.

L'inégalité de Cauchy-Schwarz. La valeur absolue de x scalaire w est toujours inférieure ou égale au produit des normes. Et l'égalité ne tient que si x et w sont colinéaires, c'est-à-dire pointent dans la même direction ou dans des directions opposées. Cette inégalité revient partout en optimisation et en analyse statistique. Elle dit grosso modo : le produit scalaire ne peut pas être plus grand que le produit des longueurs.

Norme et distance.

La norme d'un vecteur x, notée double-barre x double-barre, mesure sa longueur. Sa définition usuelle, la norme euclidienne ou norme deux : norme de x égal racine carrée de la somme des carrés des coordonnées. C'est exactement le théorème de Pythagore généralisé. La distance euclidienne entre deux vecteurs x et y est simplement la norme de leur différence : distance de x à y égale norme de x moins y. C'est cette distance que la plupart des algorithmes de machine learning cherchent à minimiser pour comparer des points.

Vers les matrices : empiler des neurones.

Une matrice est un tableau rectangulaire de nombres, organisé en lignes et colonnes. Une matrice de taille m fois n a m lignes et n colonnes. On la note souvent en majuscule, par exemple grand W. Une matrice peut représenter une collection de vecteurs empilés : par exemple chaque ligne de W est le vecteur des poids d'un neurone.

Le produit matrice-vecteur permet d'exprimer une couche entière de m neurones en une seule opération. Si W est la matrice des poids, de taille m fois n, et x le vecteur des entrées, de dimension n, alors W x est un vecteur de dimension m, dont la j-ième coordonnée est le produit scalaire de la j-ième ligne de W par x. C'est-à-dire la somme pondérée du j-ième neurone de la couche. Ajouter un vecteur de biais b et appliquer l'activation à chaque coordonnée donne la sortie de la couche. C'est cette opération, W x plus b puis activation, qui sera répétée à chaque couche d'un réseau au chapitre cinq.

En une phrase. Un vecteur est une liste ordonnée de nombres, le produit scalaire est leur multiplication composante par composante puis sommée, et une matrice permet d'empiler plusieurs neurones en une seule opération.

Vers le chapitre trois. On a maintenant tout le vocabulaire pour décrire l'opération linéaire d'un neurone. Mais sans la fonction d'activation, un réseau de neurones empilés se réduit à une seule combinaison linéaire et perd toute sa puissance. Le chapitre trois te montre exactement quelles fonctions d'activation on utilise, pourquoi, et le piège du vanishing gradient qui a freiné le deep learning pendant des décennies.
