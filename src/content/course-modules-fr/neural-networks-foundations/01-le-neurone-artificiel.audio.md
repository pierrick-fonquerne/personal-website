Chapitre un. Le neurone artificiel. Du biologique au mathématique, ce qui se passe vraiment dans la brique élémentaire d'un réseau.

Tout réseau de neurones, du plus simple au plus profond, est un assemblage d'une seule brique élémentaire répétée par millions. Cette brique, le neurone artificiel, n'a pourtant rien de magique. C'est une équation à trois ingrédients qui s'inspire d'une cellule biologique vieille de plusieurs centaines de millions d'années.

À la fin de ce chapitre, tu sauras répondre à trois questions : qu'est-ce qu'un neurone artificiel calcule exactement, d'où vient cette idée, et pourquoi un neurone tout seul a une limite que les réseaux modernes ont dû dépasser.

Pour suivre, il faut savoir faire des additions et des multiplications, connaître la notion de fonction à une variable, et avoir un peu d'intuition géométrique en deux dimensions : un point dans un plan, une droite, un côté ou l'autre d'une droite. Pas besoin de calcul différentiel à ce stade, ni d'algèbre linéaire formelle, ni de programmation.

L'inspiration biologique.

Ton cerveau contient environ quatre-vingt-six milliards de neurones. Chaque neurone reçoit des signaux électriques de ses voisins via ses dendrites, intègre ces signaux dans son corps cellulaire, et décide selon un seuil interne s'il doit envoyer un signal le long de son axone. En mille neuf cent quarante-trois, Warren McCulloch et Walter Pitts modélisent ce comportement par une équation. Ce n'est pas une copie fidèle de la biologie. C'est une simplification mathématique qui s'avère puissante.

L'analogie de l'arbitre.

Imagine un arbitre de foot qui doit décider si une faute mérite un penalty. Il reçoit plusieurs informations, et chacune compte plus ou moins selon le contexte. La main a touché le ballon : poids zéro virgule huit. Dans la surface de réparation : poids zéro virgule cinq. Geste intentionnel : poids zéro virgule neuf. L'arbitre fait dans sa tête une somme pondérée : il additionne les informations en les multipliant chacune par leur importance. Si le total dépasse un seuil, il siffle. C'est exactement ce que fait un neurone artificiel.

Joue avec un neurone.

Sur la page, le composant interactif te laisse bouger les curseurs pour trois entrées notées x un, x deux, x trois, leurs trois poids w un, w deux, w trois, et un biais b. Avec les valeurs par défaut, x un égal un, x deux égal zéro, x trois égal un, et les poids zéro virgule huit, zéro virgule cinq, zéro virgule neuf, et un biais de moins zéro virgule cinq, la somme pondérée notée z vaut un fois zéro virgule huit, plus zéro fois zéro virgule cinq, plus un fois zéro virgule neuf, moins zéro virgule cinq, ce qui donne un virgule deux. La sortie y est la sigmoïde appliquée à un virgule deux, environ zéro virgule soixante-dix-sept.

Trois choses à remarquer en jouant. Une entrée à zéro annule la contribution de son poids, peu importe la valeur de ce dernier. Augmenter un poids accentue l'influence de son entrée ; le passer en négatif inverse son effet. Le biais translate la sortie indépendamment des entrées. Un biais très négatif rend le neurone très difficile à activer.

Note historique. Les neurones originaux de McCulloch et Pitts en quarante-trois et le perceptron de Rosenblatt en cinquante-huit utilisaient une fonction seuil binaire : sortie un si la somme dépasse zéro, sortie zéro sinon. Pas de nuance. Sur la page, un sélecteur au-dessus du diagramme te permet de basculer en direct entre la sigmoïde et la fonction de Heaviside, ce seuil binaire. Avec la configuration de départ, la sigmoïde donne environ zéro virgule soixante-dix-sept, le seuil bascule directement à un. Joue avec les curseurs pour repérer les zones où le seuil change de sortie : tu y verras l'effet tout ou rien du neurone historique. Le passage à la sigmoïde, puis plus tard à ReLU, est historiquement lié à la backpropagation de quatre-vingt-six, qui exige une fonction d'activation dérivable pour propager le gradient. La sigmoïde te donne une intuition plus douce ici, mais le neurone le plus simple, mathématiquement, est celui à seuil.

Au passage, on introduit une notation utile pour la suite. Pour une condition logique P, on note un un crochet P la fonction indicatrice de P : elle vaut un si P est vraie, zéro sinon. En particulier un un crochet z supérieur ou égal à zéro est exactement la fonction de Heaviside, parfois notée H de z, qu'on vient de voir comme l'activation du neurone original. Cette notation servira dans la démonstration formelle qui ferme ce chapitre.

La formule mathématique.

L'opération du neurone se résume en une équation. Si on note les trois entrées x un, x deux, x trois, leurs trois poids w un, w deux, w trois, et le biais b, alors la somme pondérée notée z vaut : x un fois w un, plus x deux fois w deux, plus x trois fois w trois, plus b. On applique ensuite la fonction d'activation f à cette somme pour obtenir la sortie y. Avec n entrées, on note souvent ça avec un symbole somme : z égal somme pour i allant de un à n de x i fois w i, le tout plus b. Et en notation vectorielle compacte, y égal f de w scalaire x plus b, où le point central désigne le produit scalaire. Ces trois écritures disent la même chose à des niveaux d'abstraction croissants. Apprends à les reconnaître toutes les trois, tu les croiseras partout.

Vocabulaire essentiel. Les x i sont les entrées du neurone, ses observations du monde. Les w i sont les poids, l'importance accordée à chaque entrée. b est le biais, un terme additif qui translate la sortie. f est la fonction d'activation, qui introduit la non-linéarité. Et z est l'activation pré-synaptique, avant passage dans f.

Le problème de la séparation linéaire.

Considère deux entrées seulement. Quand z est strictement positif, le neurone s'active. Quand z est négatif, il ne s'active pas. La frontière entre les deux régions, où z vaut exactement zéro, est une droite dans le plan : l'équation w un x un plus w deux x deux plus b égal zéro est l'équation d'une droite. Un neurone unique trace donc une droite et classe chaque point selon le côté où il se trouve. Cela suffit pour des problèmes linéairement séparables, comme l'opération ET : il existe une droite qui isole le point un-un des trois autres. Mais pour l'opération XOR, où les cas positifs sont en diagonale, aucune droite ne sépare les positifs des négatifs.

L'aperçu interactif te laisse essayer à la main. Bouge les curseurs pour orienter et déplacer la droite. Sur AND et OR, tu peux atteindre quatre points correctement classés sur quatre. Sur XOR, jamais. Un point est toujours du mauvais côté. C'est exactement ce qu'ont démontré Minsky et Papert en soixante-neuf. Géométriquement, un neurone correspond à une droite ; XOR demande une frontière qui ne peut pas être linéaire. La solution viendra des réseaux multi-couches, qui peuvent composer plusieurs droites pour dessiner des frontières plus complexes.

Le rôle du biais, visuellement. Sans biais, la droite tracée par le neurone passe forcément par l'origine. C'est une contrainte forte : la plupart des problèmes réels ont une frontière de décision qui n'est pas à l'origine. Le biais résout ça en translatant la droite n'importe où dans le plan. Image mentale utile : les poids contrôlent l'orientation de la droite, sa pente ; le biais contrôle sa position.

En une phrase. Un neurone artificiel calcule une combinaison linéaire de ses entrées, ajoute un biais, et passe le tout dans une fonction non-linéaire. C'est tout. La puissance vient de ce qu'on en fait quand on les empile et les entraîne.

Vers le chapitre deux. Tu as vu que la formule du neurone s'écrit aussi sous la forme compacte y égal f de w scalaire x plus b. Cette notation vectorielle est partout en deep learning. Qu'est-ce qu'un vecteur exactement ? Que veut dire le point central entre w et x ? Le chapitre deux installe ces fondations d'algèbre linéaire en restant strictement utile pour la suite du cours.
