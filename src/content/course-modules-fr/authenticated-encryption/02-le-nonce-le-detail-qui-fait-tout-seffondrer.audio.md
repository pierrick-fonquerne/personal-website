Chapitre deux. Le nonce, le détail qui fait tout s'effondrer. Unicité vitale, aléatoire contre compteur, borne d'anniversaire et temps constant : pourquoi le nombre le moins secret du système est aussi le plus dangereux.

Au chapitre précédent, tu as vu que l'AEAD garantit confidentialité et intégrité en une seule opération, à condition que ses paramètres soient utilisés correctement. Le nonce fait partie de ces paramètres. Et sa contrainte d'usage est absolue.

En deux mille seize, des chercheurs ont publié ce qu'ils ont appelé la Forbidden attack contre AES-GCM. L'attaque ne casse pas l'algorithme. Elle exploite une seule erreur d'utilisation : réutiliser le même nonce avec la même clé. Résultat : non seulement les deux messages se retrouvent partiellement exposés, mais la clé d'authentification interne, la clé GHASH dérivée du polynôme de hachage de GCM, peut être reconstruite par l'adversaire. Quand la clé GHASH est connue, l'intégrité s'effondre entièrement. L'adversaire peut forger des tags valides pour n'importe quel message.

À la fin de ce chapitre, tu sauras expliquer pourquoi l'unicité du nonce est une contrainte de sécurité et non une convention, montrer ce que la réutilisation révèle via l'intuition du two-time pad, distinguer les stratégies aléatoire et compteur pour la génération de nonces, et comprendre pourquoi la comparaison de tags doit s'effectuer en temps constant.

Pour suivre ce chapitre, il faut avoir lu le module un de ce cours, en particulier les notions d'AEAD et de tag d'authentification. Il faut aussi avoir une notion de XOR comme opération bit à bit. Les polynômes de Galois et la construction interne de GCM ne sont pas nécessaires.

Le nonce.

Le nonce, contraction de "number used once", est une valeur transmise en clair avec chaque message chiffré. Son rôle est précis : garantir que deux chiffrements du même texte clair avec la même clé produisent des chiffrés différents.

Ce qui compte n'est pas sa confidentialité, mais son unicité. Un nonce peut être lu par n'importe qui sur le réseau sans que cela affecte la sécurité. En revanche, utiliser deux fois le même nonce avec la même clé, même pour deux messages distincts, brise des garanties fondamentales.

AES-GCM utilise un nonce de quatre-vingt-seize bits. XChaCha20-Poly1305 utilise un nonce de cent quatre-vingt-douze bits. Ces différences ont des conséquences concrètes sur la façon dont on génère les nonces.

Réutilisation : la catastrophe.

L'intuition du two-time pad.

Pour comprendre pourquoi la réutilisation du nonce est catastrophique, il suffit de regarder ce que fait un chiffrement à flot. Un chiffrement à flot génère un flux pseudo-aléatoire depuis la clé et le nonce. Le texte clair est mis en XOR avec ce flux.

Si deux messages sont chiffrés avec le même nonce et la même clé, leurs chiffrés mis en XOR donnent directement le XOR des deux textes clairs. Le flux de clé s'annule. Si l'un des deux messages est connu ou devinable, comme un en-tête de protocole fixe, l'autre est immédiatement récupérable.

Sur la page, un composant interactif illustre cette mécanique. Édite les deux messages et observe comment le XOR des chiffrés révèle directement la combinaison des textes clairs. Modifie le premier message pour qu'il ressemble à un en-tête connu, et regarde ce que le champ "récupéré" affiche pour le second.

La Forbidden attack : quand l'intégrité s'effondre aussi.

La fuite des textes clairs n'est que la première conséquence. Dans AES-GCM, le tag d'authentification est calculé via une fonction polynomiale paramétrée par une clé interne appelée H. Si deux messages chiffrés avec le même nonce et la même clé sont observés, un adversaire peut construire un système d'équations sur H et le résoudre. Une fois H connue, il peut forger un tag valide pour n'importe quel chiffré de son choix.

La réutilisation du nonce ne dégrade pas la sécurité d'AES-GCM : elle l'annule.

Aléatoire contre compteur.

Deux stratégies principales existent pour générer des nonces uniques. Elles ont des profils de risque très différents.

Le nonce aléatoire.

Tirer un nonce uniformément au hasard dans un espace suffisamment grand rend les collisions négligeables. XChaCha20-Poly1305 utilise un nonce de cent quatre-vingt-douze bits : il faudrait de l'ordre de deux puissance soixante-quatre messages chiffrés sous la même clé pour que la probabilité de collision atteigne seulement deux puissance moins soixante-cinq, un risque négligeable à toute échelle réelle. On peut générer ces nonces avec un générateur cryptographique sûr sans aucune coordination entre les parties.

AES-GCM avec son nonce de quatre-vingt-seize bits est plus contraignant. La borne d'anniversaire nous dit que la probabilité de collision croît approximativement comme le carré du nombre de nonces générés divisé par la taille de l'espace. Après deux puissance trente-deux messages, soit environ quatre milliards, la probabilité de collision avec un nonce aléatoire de quatre-vingt-seize bits devient préoccupante dans des systèmes à haut débit. La recommandation du NIST limite l'utilisation d'une même clé AES-GCM à deux puissance trente-deux messages avec des nonces aléatoires.

Une parenthèse sur la borne d'anniversaire. Si une salle contient vingt-trois personnes tirées au hasard, la probabilité que deux d'entre elles partagent le même anniversaire dépasse cinquante pour cent. Le même phénomène s'applique aux nonces : la probabilité de collision est proportionnelle au carré du nombre de nonces générés, et non au nombre lui-même. Doubler le volume de messages multiplie le risque par quatre.

Le nonce compteur.

Un compteur monotone garantit l'unicité sans limite probabiliste : chaque valeur est distincte par construction. C'est la stratégie recommandée pour AES-GCM dans des systèmes déterministes, avec un seul producteur, une seule clé et un état persistant.

La fragilité est opérationnelle. Le compteur doit survivre aux redémarrages, être unique par instance dans un système distribué, et sa limite doit déclencher une rotation de clé. Dans un système distribué où deux nœuds maintiennent chacun leur propre compteur démarrant à zéro, ils vont inévitablement produire les mêmes valeurs de nonce pour des messages différents.

La règle de conception : une garantie qui repose sur une condition d'usage doit être rendue impossible à violer par construction, pas confiée à la discipline humaine.

Temps constant.

La vérification du tag à l'ouverture doit s'effectuer en temps constant : le temps d'exécution ne doit pas dépendre des valeurs comparées.

Une comparaison naïve, octet par octet avec retour dès la première différence, crée un canal caché temporel. Un adversaire qui peut mesurer le temps de réponse d'un serveur obtient une information : si le rejet arrive plus vite, les premiers octets du tag sont incorrects. En répétant suffisamment de tentatives, il peut reconstruire le tag valide octet par octet, sans jamais connaître la clé.

La défense : comparer les deux tags via un XOR de tous les octets, puis vérifier que le résultat cumulé est nul, sans branchement conditionnel anticipé.

ChaCha20 est conçu pour ne dépendre que d'additions, de rotations et de XOR. Ces opérations ont un temps d'exécution qui ne varie pas avec les données. AES en logiciel pur, sans instruction AES-NI, utilise des tables de substitution accédées en mémoire. Le cache processeur peut trahir quelles entrées ont été accédées, créant une fuite par canal auxiliaire. Avec AES-NI, les instructions matérielles sont en temps constant par construction.

Choisir une primitive.

AES-GCM est à privilégier quand l'environnement dispose d'AES-NI : serveurs x86-64, ARM récents avec extensions cryptographiques. Les performances sont excellentes et le temps constant est garanti par le matériel. La contrainte principale est la gestion du nonce de quatre-vingt-seize bits dans les systèmes à fort débit ou distribués.

ChaCha20-Poly1305 est à privilégier dans les environnements sans accélération matérielle : mobiles anciens, microcontrôleurs, WASM, JavaScript natif. Le temps constant est assuré par construction algorithmique. Le nonce de cent quatre-vingt-douze bits de XChaCha20 simplifie la gestion en permettant la génération aléatoire sans limite pratique.

Dans les deux cas, l'agilité cryptographique recommande d'encapsuler le choix de la primitive dans une couche d'abstraction, pour pouvoir migrer sans réécriture si une vulnérabilité est découverte.

TLS 1.3 impose AES-cent-vingt-huit-GCM, AES-deux-cent-cinquante-six-GCM et ChaCha20-Poly1305 comme seules suites symétriques. Les suites CBC des versions précédentes, source de nombreuses vulnérabilités comme POODLE et Lucky13, ont été retirées.

Ce qu'il faut retenir.

Le nonce voyage en clair. Ce qui importe n'est pas sa confidentialité, mais son unicité absolue par paire clé-nonce.

Réutiliser un nonce avec la même clé annule le flux de clé : les deux chiffrés mis en XOR donnent directement le XOR des deux textes clairs. Si un message est connu, l'autre est récupérable.

Dans AES-GCM, la réutilisation permet aussi de reconstruire la clé GHASH et de forger des tags valides. C'est la Forbidden attack de deux mille seize.

AES-GCM avec un nonce de quatre-vingt-seize bits exige un compteur bien géré en contexte distribué. La borne d'anniversaire limite les nonces aléatoires à environ deux puissance trente-deux messages par clé.

XChaCha20-Poly1305 avec un nonce de cent quatre-vingt-douze bits permet la génération aléatoire sans limite pratique.

Une garantie qui repose sur une condition d'usage doit être rendue impossible à violer par construction, pas confiée à la discipline humaine.

La vérification du tag doit s'effectuer en temps constant pour supprimer le canal caché temporel. ChaCha20 est en temps constant par construction. AES-NI l'est par le matériel. AES logiciel pur peut créer des fuites de cache.
