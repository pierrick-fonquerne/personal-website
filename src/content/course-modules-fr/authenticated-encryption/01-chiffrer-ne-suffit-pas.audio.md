Chapitre un. Chiffrer ne suffit pas. Confidentialité contre intégrité : pourquoi un adversaire qui ne peut pas lire peut quand même tout casser, et comment le chiffrement authentifié répond.

En deux mille onze, des chercheurs ont montré qu'un adversaire positionné entre un navigateur et un serveur HTTPS pouvait, sans jamais déchiffrer un seul octet, modifier les données chiffrées de façon prévisible et forcer des comportements non prévus par l'application. L'attaque ne lisait rien. Elle réécrivait.

Ce scénario s'appelle la malléabilité. C'est le problème central de ce chapitre.

À la fin de ce chapitre, tu sauras expliquer la différence entre confidentialité et intégrité, reconnaître la malléabilité d'un chiffrement non authentifié, et dire ce que l'AEAD garantit et comment.

Pour suivre, il faut avoir une notion de chiffrement symétrique : ce qu'est une clé, un texte clair, un texte chiffré. Et une idée générale de ce qu'est une fonction de hachage. Pas besoin de connaître les mathématiques internes des primitives.

Confidentialité contre intégrité.

Ces deux propriétés sont distinctes, et les confondre est la source de nombreuses vulnérabilités réelles.

La confidentialité garantit qu'un adversaire qui observe le message chiffré ne peut pas en déduire le contenu. Elle protège contre un attaquant passif, qui écoute.

L'intégrité garantit qu'un adversaire ne peut pas modifier le message sans que cette modification soit détectée. Elle protège contre un attaquant actif, qui intervient.

Un système peut avoir l'une sans l'autre. Et c'est là que réside le piège.

L'adversaire actif.

Prenons un exemple concret. Un service de paiement chiffre le montant d'un virement avec un mode CTR, c'est-à-dire le mode compteur. En mode CTR, le chiffrement effectue un XOR entre le texte clair et un flux pseudo-aléatoire généré depuis la clé et un compteur.

Si un adversaire connaît la position dans le texte chiffré qui correspond au champ "montant", il peut inverser exactement le bon bit dans le chiffré. Quand le destinataire déchiffre, il obtient un montant modifié. L'adversaire n'a jamais su quel était le montant original. Il l'a juste changé.

C'est la malléabilité : la propriété d'un schéma de chiffrement qui permet de transformer un chiffré en un autre chiffré dont le déchiffrement est prévisible, sans connaître la clé.

Un schéma confidentiel peut être malléable. Un schéma malléable n'offre aucune garantie d'intégrité.

L'AEAD, la réponse.

Le chiffrement authentifié avec données associées, noté AEAD pour Authenticated Encryption with Associated Data, résout ce problème en combinant confidentialité et intégrité dans une seule opération.

Un schéma AEAD expose deux opérations.

La première s'appelle seal, fermer. Elle prend une clé k, un nonce N, des données associées A et un texte clair P. Elle produit un texte chiffré augmenté d'un tag d'authentification.

La seconde s'appelle open, ouvrir. Elle prend la clé k, le nonce N, les données associées A et le chiffré. Elle vérifie le tag, puis déchiffre. Si la vérification échoue, elle retourne une erreur, sans rien révéler d'autre.

Chaque symbole a son rôle. k est la clé secrète partagée. N est le nonce, un nombre utilisé une seule fois, qui garantit que deux chiffrements du même texte clair avec la même clé produisent des chiffrés différents. A est ce qu'on appelle les données associées : des métadonnées authentifiées mais non chiffrées, comme un en-tête HTTP, un identifiant de session ou une version de protocole. Elles ne font pas partie du chiffré, mais toute modification les concernant invalide le tag. P est le texte clair à protéger. Et C est la sortie, le texte chiffré concaténé avec le tag.

Le tag d'authentification.

Le tag est une empreinte cryptographique calculée sur le chiffré et les données associées avec la clé. Il est produit lors du seal et vérifié lors du open.

Si un bit du chiffré a été inversé, si une donnée associée a changé, si le tag lui-même a été trafiqué : la vérification échoue. L'open retourne une erreur générique, sans indiquer ce qui a changé ni où. Cette absence d'information est intentionnelle : révéler la cause permettrait à un adversaire d'apprendre quelque chose, ce qu'on appelle une attaque par oracle.

À retenir comme formule : le chiffrement cache, il ne protège pas. L'intégrité se prouve, elle ne se suppose pas.

Sur la page, le composant interactif te laisse inverser un bit dans le chiffré et observer ce qui se passe. En mode chiffrement simple, le bit inversé traverse le déchiffrement sans alerte. Le texte clair qui ressort est altéré, silencieusement. En mode AEAD, le même bit inversé provoque un échec de vérification. L'open retourne un rejet. Aucune information sur le contenu n'est divulguée. La différence de comportement est la démonstration concrète de ce que l'intégrité apporte.

Historique : bit-flipping et oracles de padding.

Les attaques sur les modes non authentifiés ont une longue histoire. Le bit-flipping contre CTR est connu depuis les années deux mille. Contre CBC, une variante plus subtile exploite le padding oracle. En observant si le serveur accepte ou rejette un message selon si le déchiffrement produit un padding valide, un adversaire peut reconstituer le texte clair octet par octet, sans jamais connaître la clé. L'attaque POODLE, en deux mille quatorze, est une instance réelle contre SSL trois point zéro.

Ces attaques sont toutes devenues caduques avec l'adoption généralisée de l'AEAD, qui retire à l'adversaire toute information sur le résultat du déchiffrement.

Ce qu'il faut retenir.

La confidentialité cache le contenu à un adversaire passif. Elle ne protège pas contre un adversaire actif.

L'intégrité garantit qu'une modification est détectée. Elle se prouve par un tag cryptographique.

La malléabilité est la propriété qui permet de modifier un chiffré de façon prévisible sans connaître la clé. CTR et CBC non authentifiés en souffrent.

L'AEAD combine les deux en une seule opération. Seal produit le chiffré augmenté du tag. Open vérifie le tag avant de déchiffrer.

Un open qui échoue retourne une erreur générique. Cette opacité est une propriété de sécurité.

Les données associées sont authentifiées mais non chiffrées. Les modifier invalide le tag, même si le chiffré est intact.

Les algorithmes courants sont AES-GCM et ChaCha20-Poly1305. Les modules suivants examinent leurs propriétés, leurs contraintes et leurs cas d'usage.
