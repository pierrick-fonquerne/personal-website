Chapitre deux. Le modèle fédéré : plan de contrôle, projections locales et réconciliation. La synthèse qui réconcilie intégration et autonomie : un plan de contrôle qui possède la topologie, des services qui possèdent leurs ressources, et une convergence déclarative entre les deux.

Le chapitre précédent s'est terminé sur un dilemme : le monolithe intégré donne la cohérence mais interdit l'autonomie des briques ; les services autonomes donnent l'autonomie mais abandonnent la cohérence. Ce chapitre présente la synthèse qui réconcilie les deux, à une condition non négociable : accepter que le même concept existe plusieurs fois, à des niveaux de responsabilité différents.

L'idée centrale : séparer la topologie des ressources.

Le modèle fédéré repose sur un partage de souveraineté précis. Le plan de contrôle est la source de vérité de la topologie organisationnelle : les organisations, les boutiques, qui appartient à quoi, qui a accès à quoi. Chaque service est la source de vérité de ses ressources métier : les produits pour le catalogue, les transactions pour le paiement, les colis pour l'expédition. Et le pont entre les deux : chaque service maintient une projection locale des entités topologiques qui le concernent. Le service de paiement a sa propre table boutique, minimale, qui reflète le référentiel central quand un plan de contrôle existe, ou qui se remplit à la main quand le service tourne seul.

C'est la propriété la plus importante du modèle. Chaque service reste complet et autonome : sa projection locale lui suffit pour fonctionner sans plan de contrôle. Et l'ensemble reste cohérent : quand le plan de contrôle existe, c'est lui qui crée et synchronise ces projections. Le même binaire sert les deux scénarios : produit autonome, ou brique intégrée d'une suite. Ce schéma se décline partout : remplace boutique par projet et tu obtiens une plateforme de développement ; par espace de travail et tu obtiens une suite collaborative ; par entité juridique et tu obtiens un système de gestion multi-filiales.

Attention, le modèle fédéré exige de renoncer à un dogme : une donnée ne doit exister qu'à un seul endroit. Ici, la boutique existe dans le plan de contrôle et dans chaque service. Ce n'est pas de la duplication accidentelle, c'est une projection assumée, avec un propriétaire clair et un mécanisme de convergence explicite. La duplication non gouvernée est une dette ; la projection gouvernée est une architecture.

Premier mécanisme : la référence externe opaque.

Comment le plan de contrôle retrouve-t-il sa boutique dans chaque service ? Par un champ dédié sur les entités topologiques de chaque service, appelé external ref. C'est un identifiant posé par le système externe et jamais interprété par le service. Le service l'indexe avec une contrainte d'unicité, le restitue, mais n'en lit jamais la structure. C'est le pattern des annotations dans les systèmes d'orchestration de conteneurs : une mémoire que le gestionnaire externe se laisse à lui-même.

Pourquoi opaque ? Parce que toute structure interprétée devient un couplage. Si le service de paiement analysait l'identifiant pour en extraire le nom de l'organisation, son format deviendrait un contrat de schéma entre tous les systèmes, impossible à faire évoluer. Opaque, il reste un simple lien : et un lien, contrairement à un schéma, ne casse jamais. C'est exactement la stratégie des protocoles d'identité fédérée : l'identifiant de sujet y est défini comme une chaîne opaque. Vingt-cinq ans d'interopérabilité reposent sur cette opacité.

Deuxième mécanisme : l'upsert idempotent et la convergence.

Le plan de contrôle ne crée pas les projections : il réconcilie. L'API de chaque service expose une opération dont le contrat est : assure-toi qu'une boutique avec cette référence externe existe et ressemble à ceci. Si aucune entité ne porte cette référence, création. Si une entité la porte déjà, mise à jour des champs projetés. Dans tous les cas, rejouer l'opération ne change rien : c'est la définition de l'idempotence.

Cette propriété change la nature de la synchronisation. Plus besoin de garantir qu'un message arrive exactement une fois, garantie coûteuse et souvent illusoire en distribué : il suffit de pouvoir le rejouer. Le plan de contrôle peut re-déclarer l'état désiré complet à chaque démarrage, après chaque incident, périodiquement par sécurité. L'état des services converge vers l'état déclaré.

Note le renversement : le plan de contrôle ne dit pas fais ceci, impératif, fragile, dépendant de l'ordre. Il dit : voici l'état désiré. Déclaratif, rejouable, auto-réparant. Tous les systèmes distribués robustes des vingt dernières années ont fait ce choix : les orchestrateurs de conteneurs avec leur boucle de réconciliation, les outils d'infrastructure as code avec leur plan d'exécution. Le modèle fédéré applique la même physique aux concepts métier.

Sur la page, un simulateur interactif met face à face l'état désiré du plan de contrôle et la projection locale d'un service. Tu peux modifier une boutique localement pour provoquer une dérive, retirer une boutique de l'état désiré pour créer une orpheline, puis lancer la réconciliation et observer la convergence : les dérives sont écrasées, les orphelines sont purgées, tout repasse en synchronisé. Ce que tu observes a un nom dans les systèmes distribués : l'anti-entropie. Le désordre s'accumule naturellement ; une boucle périodique le résorbe en rejouant l'état désiré.

Troisième mécanisme : le marquage de gestion.

Dernière pièce : le champ managed by. Il indique qui gouverne l'entité : le plan de contrôle, un outil d'infrastructure as code, ou personne, en cas de création manuelle. Son rôle est d'abord ergonomique : l'interface du service peut afficher géré par la suite, et protéger l'entité contre une édition manuelle accidentelle, vouée à être écrasée à la prochaine réconciliation. C'est la réponse au problème classique des systèmes déclaratifs : la modification locale silencieusement annulée par le gestionnaire central, source de confusion sans fin si rien ne la signale.

Les modes de défaillance, et pourquoi ils sont acceptables.

Un modèle d'architecture se juge à ses pannes autant qu'à son fonctionnement nominal. Trois cas principaux.

La panne du plan de contrôle. C'est la plus belle propriété du modèle : les services ne s'en aperçoivent presque pas. Chacun continue de fonctionner sur sa projection locale ; seules les opérations topologiques, créer une boutique, changer un rattachement, sont indisponibles. La disponibilité du quotidien est découplée de la disponibilité du référentiel central. Compare avec le monolithe : noyau en panne, tout est en panne.

La dérive. Quelqu'un modifie une projection locale à la main, ou une réconciliation échoue à mi-chemin. Réponse du modèle : la prochaine passe d'anti-entropie efface la dérive. Le coût résiduel : entre deux passes, le système est temporairement incohérent. C'est le prix structurel du modèle : une cohérence à terme, pas une cohérence immédiate. Pour de la topologie organisationnelle, qui change rarement, ce compromis est presque toujours acceptable ; pour des données transactionnelles, il ne le serait pas, et c'est pourquoi les ressources métier restent dans leur service avec leurs garanties locales.

La suppression. Le cas le plus délicat. Une boutique disparaît de l'état désiré : que fait le service de ses transactions rattachées ? Deux politiques existent, et le choix doit être explicite. La cascade : tout supprimer, irréversible et dangereux. Ou l'orphelinage : marquer la projection orpheline, geler les ressources, laisser un humain ou une politique de rétention décider. La plupart des systèmes matures choisissent l'orphelinage avec purge différée : l'erreur de topologie est rattrapable, la suppression en cascade ne l'est pas.

Adopter l'existant : la fédération brownfield.

Dernier scénario réaliste : la suite déploie son plan de contrôle alors que les services tournent depuis deux ans, remplis d'entités créées à la main. Le modèle fédéré gère ce cas avec une opération d'adoption : le plan de contrôle découvre les entités locales existantes, propose un appariement avec son référentiel, puis pose la référence externe et le marquage de gestion après coup sur les entités confirmées. C'est une différence majeure avec le monolithe intégré, où intégrer un existant signifie migrer ses données dans le noyau. Ici, les données ne bougent pas : seul un lien s'ajoute. L'adoption est progressive, réversible, et service par service.

Le contrat de fédération.

Récapitulons ce qu'un service doit exposer pour être fédérable. C'est remarquablement peu. Un : des entités topologiques locales portant une référence externe opaque et un marquage de gestion. Deux : un upsert idempotent par référence externe. Trois : une politique de suppression explicite. Quatre : une API publiée, versionnée et documentée. Un service qui respecte ce contrat fonctionne seul, s'intègre à n'importe quel plan de contrôle, et le jour où un référentiel central naît, la fédération est un client d'API à écrire, pas une migration.

Remarque la symétrie avec le chapitre un : le modèle fédéré reprend l'idée des identifiants normalisés des services autonomes, mais il y ajoute ce qui manquait, une entité locale contractuelle et un propriétaire désigné de la topologie. Et il reprend la cohérence du monolithe, mais recalculée par convergence plutôt que garantie par une base partagée.

Reste une question : que partagent réellement les services entre eux, si ce n'est ni du code ni un schéma ? La réponse est conceptuelle, et c'est le Domain-Driven Design qui la formule le mieux. C'est l'objet du prochain chapitre. Sur la page, un quiz de quatre questions t'attend pour vérifier ta compréhension.
