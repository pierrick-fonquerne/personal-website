Chapitre trois. Lier le chiffré à son contexte. Données associées, séparation de domaines, en-têtes authentifiés et formats versionnés : pourquoi un chiffré parfaitement valide peut rester une faille s'il est rejoué hors de son contexte.

Au chapitre précédent, tu as vu que l'unicité du nonce est une contrainte absolue du schéma AEAD. Ce chapitre introduit un problème différent, et plus subtil. Un chiffré peut avoir un tag valide et un nonce unique, et rester une faille si personne ne vérifie dans quel contexte il est utilisé.

Imagine un système de mise à jour logicielle. Un paquet est chiffré et authentifié pour le composant A, version deux. Un adversaire le rejoue comme mise à jour du composant B. Le tag est valide. Le nonce est unique. Rien n'a été modifié. Et pourtant, un code prévu pour un composant s'exécute dans un autre.

À la fin de ce chapitre, tu sauras définir les données associées et leur rôle dans la liaison d'un chiffré à son contexte, expliquer la séparation de domaines, comprendre pourquoi un en-tête en clair doit être couvert par le tag, et décrire comment un format versionné permet la migration cryptographique sans casser les données existantes.

Pour suivre ce chapitre, il faut avoir lu les modules un et deux de ce cours : AEAD, tag d'authentification, nonce. Aucune connaissance des mathématiques des primitives n'est nécessaire.

Les données associées.

La notation complète d'un seal AEAD est : chiffré C égal chiffrement avec la clé k, le nonce N, les données associées A, et le texte clair P. Le paramètre A est mentionné dans le module un. Ce chapitre l'examine en détail.

Les données associées, parfois abrégées AAD pour "Associated Data", sont des informations qui voyagent en clair avec le message chiffré, mais qui sont liées au chiffré par le tag d'authentification. Elles ne sont pas chiffrées : n'importe qui peut les lire en transit. En revanche, elles font partie du calcul du tag. Si les données associées présentées lors du déchiffrement diffèrent de celles utilisées lors du chiffrement, le tag est invalide et le déchiffrement échoue, sans révéler d'information.

L'intuition centrale : l'AAD lie un chiffré à son contexte d'usage.

L'AAD peut contenir un identifiant d'utilisateur, un identifiant de session, un numéro de version, un identifiant de destination, ou n'importe quelle combinaison de ces éléments. Ce qui compte, c'est que la valeur utilisée lors du chiffrement soit identique à la valeur présentée lors du déchiffrement. Toute divergence invalide le tag.

Reprenons l'exemple du paquet de mise à jour. Si le chiffrement inclut en AAD l'identifiant du composant cible et la version attendue, le déchiffrement échoue dès que le paquet est présenté à un autre composant ou pour une autre version. Le chiffré ne peut pas être rejoué hors de son contexte déclaré.

Une précision : passer une AAD vide n'est pas une erreur cryptographique. Le schéma reste sûr. Mais cela signifie que le chiffré n'est lié à aucun contexte et peut être rejoué librement. La question est toujours : quel contexte ce chiffré doit-il être incapable de quitter ?

Séparation de domaines.

La séparation de domaines est le principe selon lequel une clé ne doit servir qu'à un seul usage bien défini. Deux opérations différentes dans un même système ne doivent pas partager la même clé, même si elles utilisent le même algorithme.

Voici deux cas représentatifs.

Premier cas : tokens de session et tokens d'API. Un service génère des tokens chiffrés avec AES-GCM. Si la même clé sert à chiffrer les tokens de session et les tokens d'API longue durée, un adversaire qui obtient un token d'API peut essayer de le présenter comme token de session. Le tag est valide, le nonce est unique. Sans séparation de domaines, le système n'a aucun moyen de distinguer les deux.

Deuxième cas : direction d'un protocole de messagerie. Les messages chiffrés d'Alice vers Bob et de Bob vers Alice ne doivent pas partager la même clé directionnelle. Sans ça, un message d'Alice peut être rejoué comme s'il venait de Bob.

La séparation s'implémente de deux façons, souvent combinées.

Première façon : une clé par usage. On dérive une clé distincte pour chaque rôle depuis une clé maîtresse, avec une étiquette explicite, par exemple "session-token" ou "api-token".

Deuxième façon : un contexte dans l'AAD. On inclut systématiquement dans les données associées un identifiant de domaine, par exemple la chaîne "purpose=session" ou "direction=client-to-server". Deux chiffrés produits dans des domaines différents auront des AAD différentes, donc des tags différents, même avec la même clé.

Le principe : un objet chiffré doit déclarer explicitement son domaine d'usage, et le système doit rendre impossible sa présentation dans un autre domaine.

En-têtes en clair, mais authentifiés.

Dans de nombreux protocoles, un en-tête voyage en clair avant le chiffré. Cet en-tête peut contenir un identifiant de version, un identifiant d'algorithme, un identifiant de destinataire, une longueur de message. Il doit être lisible avant le déchiffrement, pour aiguiller la requête vers la bonne clé ou le bon algorithme.

Le problème : si cet en-tête n'est pas couvert par le tag, il est malléable. Un adversaire peut le modifier sans invalider l'authentification.

Trois exemples concrets.

Un : redirection de destinataire. Si l'identifiant de destinataire dans l'en-tête n'est pas authentifié, un adversaire peut remplacer l'identifiant de Bob par celui d'Alice. Le message est déchiffré par Alice, qui reçoit un contenu prévu pour Bob. Le tag est valide, car il ne couvre pas l'en-tête.

Deux : rétrogradation d'algorithme. Si l'identifiant d'algorithme dans l'en-tête n'est pas authentifié, un adversaire peut le remplacer par un algorithme plus faible. Le destinataire tente de déchiffrer avec cet algorithme, en croyant que c'est ce que l'émetteur a choisi.

Trois : confusion de version. Si le numéro de version n'est pas couvert par le tag, un adversaire peut faire passer un message d'une version pour une autre, en espérant que le parseur traite les octets différemment.

La solution est directe : placer l'en-tête entier dans l'AAD. L'en-tête reste lisible en clair, mais toute modification invalide le tag. C'est le même mécanisme que dans le module un : le tag couvre tout ce qui doit être protégé contre la modification, qu'il soit chiffré ou non.

Formats versionnés et agilité cryptographique.

Un système déployé en production ne peut pas changer d'algorithme en un seul redémarrage. Des données existent, chiffrées avec l'algorithme actuel. Des clients anciens doivent continuer à fonctionner. La migration doit être progressive.

L'agilité cryptographique est la capacité d'un système à migrer d'un algorithme à un autre sans réécriture de l'ensemble du code et sans invalider les données existantes. Elle repose sur un format de message versionné.

Le principe : le premier octet du message encodé indique quelle primitive a été utilisée pour le chiffrer. Le déchiffreur lit ce champ en premier, choisit le chemin de déchiffrement approprié, puis procède.

Une version un signifie AES-deux-cent-cinquante-six-GCM. Une version deux signifie XChaCha20-Poly1305. Une version trois pourrait, demain, signifier un algorithme résistant aux ordinateurs quantiques. Les données chiffrées en version un restent déchiffrables tant que la clé de version un est conservée.

Ce mécanisme est présent dans des protocoles courants. TLS encode l'identifiant de suite de chiffrement dans le handshake. Les formats de clé GPG incluent un octet d'algorithme. Les jetons JWT incluent un champ "alg" dans l'en-tête.

Mais il introduit une contrainte critique : l'octet de version doit lui-même être couvert par le tag. Sinon, un adversaire peut le modifier pour forcer le déchiffreur à utiliser un algorithme plus faible. L'octet de version est en clair pour que le déchiffreur sache quoi faire, mais il doit figurer dans les données associées du seal et du open.

Une note sur la migration post-quantique. Les algorithmes à clé symétrique actuels, AES-deux-cent-cinquante-six et ChaCha20, sont considérés comme solides face aux ordinateurs quantiques. En revanche, les mécanismes d'échange de clés asymétriques utilisés pour établir la clé symétrique, comme ECDH, sont vulnérables. Un format versionné permet d'adopter un mécanisme d'encapsulation de clé post-quantique, comme ML-KEM standardisé en deux mille vingt-quatre par le NIST, sans modifier le format de chiffrement des données lui-même.

Le schéma présenté sur la page illustre la structure d'un message authentifié. L'en-tête, qui contient la version, le nonce et éventuellement l'identifiant de destinataire, voyage en clair mais est intégralement couvert par le tag via les données associées. Le corps contient le chiffré et le tag. Toute modification d'un champ de l'en-tête invalide le tag.

Le principe de liaison.

Tout ce qui précède converge vers un seul principe.

Un chiffré authentique mais hors de son contexte reste une faille. Le contexte fait partie du message.

Concrètement : chaque chiffré doit déclarer pour qui il est, pour quel usage, dans quel domaine, avec quelle version. Ces métadonnées ne doivent pas seulement accompagner le chiffré, elles doivent être liées à lui par le tag. Un replay dans le mauvais contexte doit être détecté cryptographiquement, pas seulement par une vérification applicative. Les deux couches, cryptographique et applicative, sont complémentaires.

Ce qu'il faut retenir.

Les données associées sont transmises en clair mais couvertes par le tag. Leur modification invalide le déchiffrement. Elles lient le chiffré à son contexte d'usage.

Une AAD vide est cryptographiquement valide, mais signifie que le chiffré n'est lié à aucun contexte et peut être rejoué librement.

La séparation de domaines consiste à dériver des clés distinctes par usage ou à inclure un identifiant de domaine dans l'AAD, pour qu'un chiffré produit dans un domaine ne soit pas valide dans un autre.

Tout champ d'en-tête en clair doit figurer dans l'AAD : version, algorithme, identifiant de destinataire, direction. Sans ça, l'en-tête est malléable sans détection.

Un format versionné permet la migration de primitives sans invalider les données existantes. L'octet de version doit lui-même être couvert par le tag.

Un chiffré authentique mais hors de son contexte reste une faille. Le contexte fait partie du message.
