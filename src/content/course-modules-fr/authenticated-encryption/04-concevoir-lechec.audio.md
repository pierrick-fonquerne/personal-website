Chapitre quatre. Concevoir l'échec. Authentifier avant de parser, erreur opaque, frontières de confiance : comment la manière dont un système échoue décide de sa sécurité.

Dans le premier module, tu as vu qu'un oracle de padding permettait à un adversaire de reconstruire un texte clair octet par octet, sans jamais connaître la clé. Ce que l'adversaire exploitait, ce n'était pas l'algorithme. C'était le comportement du système à l'échec : deux réponses distinctes selon la cause du rejet. Cette distinction observable était l'oracle.

L'AEAD élimine les oracles de padding en retirant à l'adversaire toute information sur le résultat du déchiffrement. Mais un système qui utilise correctement un algorithme AEAD peut quand même recréer un oracle, par sa façon d'échouer, de parser, ou de valider les octets entrants. Les erreurs de conception à ce niveau annulent les garanties cryptographiques.

Ce module examine les règles qui ferment ces failles. C'est le module final du cours : les principes qui suivent s'appuient sur les modules précédents. L'intégrité et la confidentialité du module un. L'unicité du nonce du module deux. La liaison au contexte du module trois.

Pré-requis et niveau.

Pour suivre ce module, tu as besoin des trois modules précédents : AEAD, tag d'authentification, nonce, données associées. Aucune connaissance des mathématiques des primitives n'est nécessaire. Les règles sont formulées avec précision et illustrées par des contre-exemples concrets.

Authentifier avant de parser.

La règle est absolue : vérifier le tag avant de toucher un seul octet du texte chiffré.

L'ordre paraît évident une fois énoncé. Mais les violations sont courantes. Un système qui parse les octets chiffrés avant d'avoir vérifié leur authenticité expose sa logique de parsing à des données entièrement contrôlées par l'adversaire. Chaque branchement conditionnel dans ce parseur devient une fuite potentielle.

Prenons un exemple. Un service reçoit une requête API chiffrée dont le premier champ est une longueur de payload. Si le service lit ce champ et alloue un buffer de la taille annoncée avant de vérifier le tag, un adversaire peut envoyer une valeur de longueur arbitraire et observer si l'allocation réussit ou échoue. Le parseur a traité des données non authentifiées. L'adversaire a obtenu une information.

La vérification du tag est une précondition. Pas une étape parmi d'autres dans le traitement.

Un schéma AEAD correct applique déjà ce principe dans son opération open. Le tag est vérifié en premier. Si la vérification échoue, aucun octet de texte clair n'est retourné. La règle s'étend à la couche applicative : même après l'open réussi, le texte clair obtenu doit être traité comme une donnée de source externe jusqu'à ce que son contenu soit validé.

Parse, don't validate.

Une fois le tag vérifié, les octets du texte clair sont authentiques, mais ils peuvent encore être malformés. La règle "parse, don't validate" dit : transformer les octets bruts en valeurs bien typées à la frontière d'entrée, une seule fois, de sorte que le reste du code ne puisse pas recevoir de données malformées.

La distinction est précise. Valider, c'est vérifier qu'une donnée satisfait une condition et continuer à manipuler la donnée brute si la condition est vraie. Parser, c'est construire une représentation typée depuis les octets bruts, et retourner une erreur si la construction échoue.

L'avantage du parsing est structurel : une fois la frontière franchie, les types garantissent la cohérence des données par construction, pas par vérification répétée.

L'erreur opaque.

Un système qui échoue de plusieurs façons observables est un oracle. La conséquence de conception est directe : un seul mode d'échec, sans information exploitable.

Ce que cela signifie concrètement.

Un seul message d'erreur. "Déchiffrement échoué" couvre tous les cas : tag invalide, nonce mal formé, données associées absentes, données corrompues. Distinguer ces cas dans le message retourné permet à l'adversaire de savoir ce qui a échoué et pourquoi.

Un seul code de retour. Même logique pour les codes de statut. Toute distinction observable entre les causes d'échec est une fuite.

Un temps de réponse constant. Comme vu dans le module deux avec la comparaison de tags en temps constant, une différence de temps de traitement entre deux causes d'échec est un canal caché. Un rejet qui arrive en deux millisecondes et un rejet qui arrive en vingt millisecondes sont deux messages distincts pour un adversaire qui peut mesurer.

L'erreur opaque s'applique aussi aux journaux internes : un log détaillé accessible via une interface externe peut devenir une fuite. Les journaux internes peuvent être précis ; ce qui est retourné au client ne doit pas l'être.

Note : la sécurité comme revue adversariale.

Les failles de conception à l'échec sont difficiles à trouver par inspection positive. Elles se révèlent par une revue adversariale : pour chaque chemin d'exécution, demander "qu'est-ce que l'adversaire observe si ce chemin est pris ?". La question "que se passe-t-il si le tag est invalide ?" doit avoir la même réponse observable que "que se passe-t-il si le nonce est mal formé ?". Si les réponses diffèrent de façon observable, le système a un oracle.

Les frontières de confiance.

Une frontière de confiance est le point où des octets non contrôlés entrent dans le système. Tout ce qui vient de l'extérieur de cette frontière est hostile par défaut.

Dans un système qui utilise l'AEAD, la frontière de confiance est l'opération open : ce qui arrive avant l'open est non authentifié, ce qui sort de l'open réussi est authentifié.

Valider dans les deux sens. Le seal doit vérifier que les champs inclus dans les données associées sont bien formés. Si l'émetteur inclut un identifiant de destinataire sans valider qu'il correspond à un destinataire existant, le chiffré peut être forgé avec un identifiant invalide, et le destinataire ne détectera l'erreur qu'après le déchiffrement.

Traiter tout ce qui vient de l'extérieur comme hostile. Cela inclut les octets chiffrés, mais aussi les métadonnées qui les accompagnent : un en-tête HTTP, un identifiant de session transmis séparément, un paramètre d'URL. Ces valeurs doivent être validées indépendamment.

La couche cryptographique n'est pas la seule ligne de défense. L'AEAD garantit qu'un message authentifié n'a pas été altéré. Elle ne garantit pas que le message a été construit correctement par un émetteur légitime. Les validations applicatives après l'open restent nécessaires.

Le diagramme sur la page illustre la différence structurelle entre l'ordre correct et l'ordre incorrect. Dans l'ordre correct, l'adversaire ne peut pas influencer le comportement du parseur, car le parseur ne reçoit que des données dont l'authenticité a déjà été établie. Dans l'ordre incorrect, chaque branchement du parseur est potentiellement observable par l'adversaire, qui contrôle entièrement les octets présentés.

Le pattern à retenir.

Ne touche aucun octet que tu n'as pas authentifié. Un seul mode d'échec, sans détail exploitable.

Ces deux règles se renforcent mutuellement. La première ferme l'oracle que le parseur pourrait créer. La seconde ferme l'oracle que le mécanisme d'erreur pourrait créer. Ensemble, elles font en sorte que le comportement observable du système à l'échec soit constant : un rejet, une seule façon, sans information sur la cause.

Ce qu'il faut retenir.

Un système peut utiliser correctement un schéma AEAD et quand même créer un oracle par sa logique d'échec. Ce que l'adversaire observe à l'échec est une surface d'attaque aussi réelle que l'algorithme lui-même.

Vérifier le tag avant de toucher un seul octet. La vérification est une précondition, pas une étape parmi d'autres. Tout parseur qui s'exécute sur des octets non authentifiés est exposé.

Parse, don't validate : transformer les octets bruts en valeurs bien typées à la frontière d'entrée, une seule fois. Ce qui passe la frontière est utilisable. Ce qui échoue est rejeté sans traitement partiel.

Un seul mode d'échec, sans information exploitable : même message d'erreur, même code de retour, même temps de traitement, quelle que soit la cause du rejet. Une différence observable est un oracle.

La comparaison de tags en temps constant est une instance de cette règle générale. Le temps de réponse est une information observable.

Tout ce qui vient de l'extérieur est hostile par défaut : valider les champs de contexte au seal et au open, ne pas supposer que la couche cryptographique remplace les validations applicatives.

Les quatre modules forment un tout. L'AEAD garantit l'intégrité et la confidentialité, à condition que le nonce soit unique, que le contexte soit lié au chiffré, et que le système échoue sans donner prise à un oracle. Chaque couche est nécessaire. Aucune ne remplace les autres.

C'est la conclusion de ce cours sur le chiffrement authentifié. Les outils cryptographiques sont solides quand on respecte leurs contrats d'usage. Ce que tu as appris ici, c'est autant une façon de raisonner sur les systèmes qu'une liste de règles : demander ce que l'adversaire observe, à chaque étape, à chaque échec.
