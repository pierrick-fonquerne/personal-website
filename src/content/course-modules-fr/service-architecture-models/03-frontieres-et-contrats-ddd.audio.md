Chapitre trois. Frontières et contrats entre services : bounded contexts, shared kernel et published language. Pourquoi client n'a pas le même sens dans deux services, pourquoi la bibliothèque de types partagée est un piège, et quels patterns du Domain-Driven Design organisent sainement les relations entre services.

Les deux premiers chapitres ont décrit comment organiser les concepts transverses. Ce chapitre explique pourquoi le modèle fédéré est le bon, avec les outils conceptuels du Domain-Driven Design. Car le DDD a formalisé, il y a vingt ans, exactement le problème que nous manipulons : que se passe-t-il quand le même mot désigne des choses différentes selon l'endroit où l'on se trouve ?

Même mot, sens différents : le bounded context.

Le Domain-Driven Design part d'une observation linguistique : dans toute organisation, le sens d'un mot dépend du contexte. Client ne désigne pas la même chose pour le service commercial, un prospect signé ; la comptabilité, un compte à facturer ; et le support, un détenteur de contrat. Forcer une définition unique produit un modèle monstrueux qui ne satisfait personne.

Le DDD nomme bounded context la frontière à l'intérieur de laquelle un modèle et son vocabulaire sont cohérents et univoques. La leçon centrale : ne pas unifier les modèles, unifier la carte. On accepte plusieurs définitions de client, une par contexte, et l'on rend explicites les relations entre contextes.

Vérifie-le sur notre suite de commerce. Sur la page, trois onglets interactifs montrent la définition du mot client dans trois contextes. Pour le catalogue, le client est un visiteur avec des préférences : langue, devise, historique de navigation, listes de souhaits. Pour le paiement, c'est un payeur avec des obligations réglementaires : moyens de paiement tokenisés, vérifications anti-fraude, conformité. Pour le support, c'est un détenteur de tickets avec un historique : conversations, engagements de délai, satisfaction à suivre. Parcours les trois et observe : aucun attribut ne coïncide, à part l'identifiant.

Que se passerait-il si l'on fusionnait ces trois définitions en une seule entité client universelle ? On obtiendrait une entité à trente attributs dont chaque service n'utiliserait qu'un cinquième, soumise aux contraintes réglementaires du paiement même pour afficher une liste de souhaits, et modifiée par trois équipes aux agendas incompatibles. C'est exactement le modèle monstrueux que le bounded context évite. Même nom, même intuition, trois définitions. Elles partagent un lien, c'est le même client aux yeux de l'utilisateur, mais ni leurs attributs, ni leur cycle de vie, ni leurs invariants ne coïncident. Chaque service est un bounded context, et c'est très bien ainsi.

La carte des relations : six patterns à connaître.

Une fois les contextes posés, le DDD nomme les relations possibles entre eux : c'est le context mapping. Six patterns couvrent l'essentiel du territoire. Le partnership : deux équipes co-évoluent leurs contextes, leur succès est lié. Le customer-supplier : l'aval exprime ses besoins, l'amont planifie pour lui. Le conformist : l'aval adopte tel quel le modèle de l'amont, typiquement face à un service externe dominant qui ne négocie pas. L'anticorruption layer : l'aval traduit le modèle de l'amont vers le sien, pour protéger son modèle. L'open host service : l'amont publie une API stable ouverte à tous. Et le published language : un format d'échange commun, publié et versionné, pour l'interopérabilité large.

Deux de ces patterns méritent qu'on s'y arrête. D'abord l'anticorruption layer : c'est la couche de traduction qu'un contexte place à sa frontière pour convertir le modèle d'autrui vers le sien. Quand le service support consomme les événements du service paiement, il ne stocke pas une transaction : il traduit en un motif de contact possible. Le modèle étranger ne pénètre jamais ; il est traduit à la douane. C'est le mécanisme concret qui rend les bounded contexts étanches. Ensuite, le couple open host service plus published language : il décrit exactement le contrat de fédération du chapitre deux. Chaque service publie une API stable, et les conventions communes de l'écosystème constituent un langage publié.

L'anti-pattern : le noyau partagé involontaire.

Face à nos trois définitions de client, la tentation du chapitre un revient sous une forme plus sournoise : puisque les services sont séparés, partageons au moins les types. Une bibliothèque commune qui définit la structure client une fois pour toutes, et que chaque service importe.

Le DDD appelle ce pattern shared kernel : un fragment de modèle possédé conjointement par plusieurs contextes. Et il l'accompagne d'un avertissement que l'industrie a appris à ses dépens : le noyau partagé n'est viable qu'entre équipes très proches, coordonnées en continu, sur un périmètre minuscule. Partout ailleurs, il produit le pire des deux mondes. Chaque évolution du type partagé exige de re-versionner et re-déployer tous les services qui l'importent : tu as recréé le couplage d'évolution du monolithe. Mais sans les bénéfices du monolithe : pas de transactions communes, pas d'intégration native, et la complexité opérationnelle du distribué en prime.

Ce résultat porte un nom : le monolithe distribué. Des services techniquement séparés, logiquement soudés. On paie le prix des deux architectures et l'on ne touche les dividendes d'aucune.

Avant de partager un type entre services, pose une seule question : si ce type change, suis-je prêt à redéployer tous les services le même jour ? Si la réponse est non, ce type ne doit pas être partagé. La frontière d'un déploiement indépendant est aussi la frontière d'un modèle indépendant.

Note la nuance : publier une bibliothèque de types depuis un service, vers ses clients, le contrat du service de paiement consommé par qui veut l'appeler, est sain. La dépendance suit le sens de l'appel et le fournisseur versionne son contrat. C'est l'open host service. Ce qui est toxique, c'est le type possédé par personne et importé par tous.

Le pattern sain : le langage publié.

Si l'on ne partage ni base de données, ni types, que reste-t-il ? La réponse du DDD s'appelle published language : un langage d'échange publié, stable, versionné, que chaque contexte traduit vers son modèle interne. Les exemples canoniques sont les grands standards d'interopérabilité : les protocoles d'identité fédérée, les formats d'événements normalisés, les spécifications d'API ouvertes, les formats d'échange comptables ou bancaires. Aucun ne partage de types internes ; tous publient un format de frontière que chacun implémente chez soi.

Pour un écosystème fédéré, le langage publié prend une forme concrète et minimale, en trois conventions. Un : un vocabulaire et une sémantique minimale. Ce qu'est une boutique pour l'écosystème : une clé stable, un nom d'affichage, l'appartenance à une organisation. Rien de plus : chaque contexte enrichit localement. Deux : un schéma d'identifiants normalisé, le format des références externes, structuré pour le plan de contrôle qui les émet, opaque pour les services qui les stockent. Trois : le contrat de fédération, l'upsert idempotent par référence externe, documenté dans une spécification d'API versionnée.

Une page de documentation suffit à fixer ces trois conventions. C'est l'investissement le plus rentable de toute l'architecture : il coûte une décision, et il épargne des années de couplage.

Retiens la hiérarchie : entre bounded contexts, on ne fait jamais circuler de structures internes. On fait circuler des identifiants, opaques et stables, et des messages conformes au langage publié, versionnés, traduits à la frontière par une anticorruption layer si besoin. L'identifiant relie, le message synchronise, le modèle reste chez soi.

La carte complète.

Tu disposes maintenant de la lecture complète des trois premiers chapitres. Qui possède la topologie ? Le plan de contrôle. Qui possède les ressources métier ? Chaque service. Que signifie client ? Une définition par contexte. Que partage-t-on entre services ? Des identifiants et des conventions, jamais des types. Comment se protège-t-on d'un modèle étranger ? Par la traduction à la frontière. Comment converge-t-on ? Par la réconciliation idempotente. Que ne fait-on jamais ? La bibliothèque de types importée par tous.

Cette grille s'applique bien au-delà des suites logicielles commerciales : plateformes de développement, systèmes industriels, écosystèmes de microservices internes, fusions de systèmes d'information après acquisition. Partout, la même tension entre intégration et autonomie, et partout la même issue : des contextes souverains, un langage publié, une convergence déclarative.

Reste la question pratique : face à un système réel, comment choisir son modèle, et comment migrer de l'un à l'autre ? C'est l'objet du dernier chapitre. Sur la page, un quiz de quatre questions t'attend pour vérifier ta compréhension.
