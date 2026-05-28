Chapitre quatre. Le perceptron. Comment Rosenblatt a fait apprendre une machine sans gradient en mille neuf cent cinquante-huit.

Au chapitre trois, on a démontré qu'une fonction d'activation devait être non linéaire et dérivable pour qu'un réseau profond ait un intérêt mathématique. Or le premier neurone artificiel capable d'apprendre, le perceptron de Frank Rosenblatt en mille neuf cent cinquante-huit, utilise la fonction de seuil, qui est presque partout dérivable de dérivée nulle. Comment Rosenblatt a-t-il pu lui faire apprendre quoi que ce soit ? Ce chapitre répond à cette question en construisant le perceptron d'un point de vue géométrique, sans dérivée. On démontre que la procédure converge sur un dataset séparable, on regarde ce qui se passe quand cette hypothèse tombe, puis on découvre la limite qui a mis fin au premier âge des réseaux de neurones.

La géométrie d'un hyperplan.

Pose une règle plate sur une table. Cette règle divise la surface de la table en deux zones, la partie devant la règle et la partie derrière. Le bord de la règle, c'est la frontière. La direction perpendiculaire au bord, c'est le vecteur normal, qu'on notera w. La distance entre la règle et un point particulier de la table, c'est ce qui nous intéresse pour mesurer à quel point un point est bien classé ou non.

Définition formelle. Un hyperplan grand H dans R puissance n est l'ensemble des points x tels que w scalaire x plus b égal zéro, avec w un vecteur normal non nul et b un scalaire. En dimension deux c'est une droite, en dimension trois un plan, au-delà on ne visualise plus mais l'équation reste la même.

La distance signée d'un point x à l'hyperplan vaut w scalaire x plus b, le tout divisé par la norme de w. Le signe indique de quel côté du plan se trouve le point, et la valeur absolue mesure la distance euclidienne. On normalise par la norme de w pour que cette distance ne dépende que de l'hyperplan, pas du codage particulier w, b qu'on a choisi.

Linéairement séparable, avec marge.

L'analogie de la bande tampon. Imagine une frontière entre deux pays avec une bande tampon de largeur fixe. Tout point à l'intérieur de cette bande est ambigu. Tout point à l'extérieur est clairement d'un côté ou de l'autre. La marge, c'est la largeur de cette bande.

Encodage des cibles. Pour la suite des démonstrations, on encode les cibles dans moins un, plus un, et non dans zéro, un. Pourquoi ? Avec y dans zéro, un, distinguer bien classé et mal classé demande deux inégalités séparées selon la classe. Avec y dans moins un, plus un, un seul produit suffit : un exemple est bien classé si et seulement si y fois la quantité w scalaire x plus b est strictement positif. Pratique pour les démonstrations.

Définitions formelles. La marge fonctionnelle d'un exemple x i, y i pour les paramètres w, b est gamma chapeau i égal y i fois w scalaire x i plus b. La marge fonctionnelle du dataset est le minimum sur tous les exemples. La marge géométrique est la marge fonctionnelle divisée par la norme de w. Un dataset est linéairement séparable avec marge gamma si la marge géométrique est strictement positive.

Le perceptron et la tension avec le chapitre trois.

Définition. Le perceptron est l'application qui à un vecteur x associe le signe de w scalaire x plus b. On note sgn cette fonction signe : elle vaut plus un si l'argument est positif ou nul, moins un sinon. C'est exactement la fonction de Heaviside du chapitre un, mais codée plus un, moins un au lieu de zéro, un.

Mille neuf cent cinquante-huit et mille neuf cent soixante sont deux dates distinctes. Cinquante-huit, c'est l'article théorique de Rosenblatt dans Psychological Review. Soixante, c'est la machine physique Mark un Perceptron, construite au Cornell Aeronautical Laboratory : quatre cents photorécepteurs et des poids ajustables via des potentiomètres motorisés. Beaucoup de récits confondent les deux. L'article précède la machine de deux ans.

La tension avec le chapitre trois. Au chapitre trois, on a démontré que la profondeur d'un réseau ne sert à rien sans non-linéarité, et qu'on a besoin d'une fonction dérivable pour calculer un gradient. Or sgn est presque partout dérivable de dérivée nulle. Comment Rosenblatt a-t-il fait apprendre une machine équipée d'une telle fonction ? La réponse, étonnamment, est qu'il n'a pas eu besoin d'une dérivée. Sa procédure d'apprentissage est une correction géométrique locale : quand le perceptron se trompe sur un exemple, on déplace le vecteur de poids dans la direction qui corrigerait l'erreur, sans jamais calculer de gradient. C'est une exception historique. À partir du chapitre sept, on rebasculera sur des fonctions d'activation dérivables et la descente de gradient prendra le relais.

La règle d'apprentissage du perceptron.

L'analogie du panneau de signalisation. Imagine un panneau mal orienté. À chaque automobiliste qui se trompe à cause de lui, tu le tournes d'un cran dans la direction qui aurait évité l'erreur. Tu ne calcules pas de dérivée, tu ne maximises rien : tu réagis localement, à chaque incident. Au bout d'un certain nombre d'incidents, le panneau est correctement orienté.

Énoncé. Soit eta strictement positif le taux d'apprentissage. Pour un exemple x i, y i mal classé, la règle d'apprentissage applique w devient w plus eta y i x i, et b devient b plus eta y i. Pour un exemple bien classé, on ne touche à rien. La procédure parcourt le dataset et applique cet update à chaque erreur, jusqu'à ce qu'il n'y ait plus d'erreur ou que le budget d'itérations soit épuisé.

Démonstration que l'update améliore strictement la marge fonctionnelle de l'exemple corrigé. On calcule la nouvelle marge fonctionnelle gamma chapeau i prime. En développant l'expression et en utilisant le fait que y i au carré vaut un, on trouve que gamma chapeau i prime est égale à l'ancienne gamma chapeau i plus eta fois la norme au carré de x i plus eta. Comme eta est strictement positif et la norme au carré aussi, l'update augmente strictement la marge sur l'exemple qu'on vient de corriger. Pas de garantie sur les autres exemples, mais sur cet exemple précis, on progresse.

Le théorème de convergence de Novikoff, mille neuf cent soixante-deux.

L'analogie du curseur qui zigzague. Imagine un curseur qui zigzague autour d'une cible. Chaque correction le rapproche un peu de la cible, mais peut le faire dépasser ou reculer sur une autre dimension. Pourtant, si la cible est entourée d'une zone tampon, le curseur ne peut pas zigzaguer indéfiniment sans tomber dedans. Le théorème de Novikoff formalise exactement cette intuition.

Énoncé. Soit un dataset linéairement séparable avec marge géométrique gamma strictement positive. Soit grand R la norme maximale des exemples. Alors le nombre total de corrections du perceptron, en partant de poids nuls, est borné par R au carré divisé par gamma au carré. La borne ne dépend ni du nombre d'exemples, ni du taux d'apprentissage.

Démonstration en deux lemmes. Premier lemme, on minore le produit scalaire de w courant avec un séparateur optimal w étoile. À chaque update sur un exemple mal classé, ce produit scalaire augmente d'au moins gamma. Donc après grand T corrections, w scalaire w étoile est minoré par T gamma. Deuxième lemme, on majore la norme au carré de w. À chaque update, la norme au carré augmente d'au plus R au carré. Donc après grand T corrections, la norme au carré de w est majorée par T R au carré. En combinant les deux par Cauchy-Schwarz, on obtient T gamma inférieur ou égal à la norme de w qui est inférieure ou égale à la racine de T R. On élève au carré et on simplifie par T, ce qui donne T inférieur ou égal à R au carré sur gamma au carré. La procédure converge en un nombre fini d'étapes.

Lecture intuitive. Plus la marge gamma est étroite, deux classes très proches, plus la borne explose et plus la convergence est lente. Plus le rayon R est grand, points éloignés de l'origine, plus la borne croît quadratiquement. Mais quelle que soit la difficulté, la borne reste finie tant que gamma est strictement positif.

Et si le dataset n'est pas séparable ?

Le théorème de Novikoff fait une hypothèse cruciale : il existe un séparateur linéaire de marge gamma strictement positive. Que se passe-t-il quand cette hypothèse tombe ? La règle d'apprentissage de Rosenblatt continue à corriger en boucle sans jamais converger. Le vecteur de poids w oscille indéfiniment.

La solution classique est étonnamment simple : on garde en poche le meilleur w, b jamais rencontré. À chaque mise à jour, on évalue le nouveau w, b sur l'ensemble du dataset, on compte le nombre d'exemples bien classés, et si ce nombre dépasse celui du couple en poche, on remplace. À la fin, on retourne le contenu de la poche, pas la dernière valeur. Cette procédure, le Pocket Algorithm, a été introduite par Gallant en mille neuf cent quatre-vingt-dix. Sur dataset séparable elle se réduit au perceptron classique. Sur dataset non séparable, elle converge en probabilité vers le séparateur qui maximise le nombre d'exemples bien classés. On perd la garantie de Novikoff, mais on récupère une procédure utilisable en pratique.

L'impossibilité de XOR.

L'analogie du damier impossible. Imagine quatre cases d'un échiquier : les diagonales alternent les couleurs. Aucune droite ne peut séparer les blanches des noires. C'est exactement la situation de la fonction XOR.

Énoncé. La fonction XOR sur deux variables booléennes, qui vaut un quand exactement une des deux entrées vaut un et zéro sinon, n'est pas réalisable par un seul perceptron.

Démonstration par contradiction. On utilise l'encodage zéro, un et la convention Heaviside : sortie un si w scalaire x plus b supérieur ou égal à zéro, zéro sinon. Supposons qu'il existe des poids w un, w deux et un biais b qui réalisent XOR. Les quatre contraintes s'écrivent. Pour le point zéro zéro qui doit donner zéro : b strictement négatif. Pour le point un zéro qui doit donner un : w un plus b supérieur ou égal à zéro. Pour le point zéro un qui doit donner un : w deux plus b supérieur ou égal à zéro. Pour le point un un qui doit donner zéro : w un plus w deux plus b strictement négatif. En additionnant les deux contraintes du milieu : w un plus w deux plus deux b supérieur ou égal à zéro, donc w un plus w deux supérieur ou égal à moins deux b. De la dernière contrainte : w un plus w deux strictement inférieur à moins b. En combinant : moins deux b inférieur ou égal à w un plus w deux strictement inférieur à moins b, donc moins deux b strictement inférieur à moins b, soit b strictement positif. Contradiction avec la première contrainte qui imposait b strictement négatif. Aucun choix de poids et de biais ne peut résoudre XOR avec un seul perceptron.

Le contexte historique. En mille neuf cent soixante-neuf, Minsky et Papert démontrent cette impossibilité formellement dans leur livre Perceptrons. Beaucoup en concluent à tort que les réseaux de neurones sont une impasse. Les financements s'effondrent. La solution, les réseaux multi-couches, existait pourtant déjà en théorie. Il faudra attendre mille neuf cent quatre-vingt-six et la backpropagation pour pouvoir les entraîner efficacement.

En une phrase. Le perceptron est le premier neurone qui apprend, par projection géométrique sans gradient. Sa convergence est garantie sur dataset séparable, mais il ne peut pas représenter XOR. Pour le résoudre, il faut empiler.

Vers le chapitre cinq. XOR n'est pas linéairement séparable, mais on peut l'écrire comme une composition de fonctions qui le sont. XOR de x un et x deux égale x un ou x deux, le tout et la négation de x un et x deux. OR est séparable, NAND est séparable, AND est séparable. Trois perceptrons, deux dans une première couche, OR et NAND, puis un dans une seconde, AND, suffisent à résoudre XOR. C'est exactement ce que le chapitre cinq va formaliser : empiler des perceptrons en couches élargit drastiquement la classe de fonctions que le réseau peut représenter. Au chapitre cinq, un seul neurone séparera l'espace en deux, plusieurs neurones organisés en couches sépareront en régions arbitrairement complexes.
