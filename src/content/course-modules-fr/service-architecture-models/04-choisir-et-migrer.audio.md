Chapitre quatre. Choisir son modèle : grille de décision, signaux d'alerte et trajectoires de migration. Aucun des trois modèles n'est bon dans l'absolu : ils répondent à des stratégies différentes. Ce chapitre donne les critères de choix, les symptômes du mauvais choix, et les chemins de migration éprouvés.

Les trois premiers chapitres ont décrit les modèles ; celui-ci répond à la question pratique : lequel choisir, et comment changer d'avis sans tout casser ? Car c'est la réalité des systèmes : on ne choisit pas une fois pour toutes, on choisit pour un contexte, et le contexte change.

Les cinq critères qui dominent la décision.

Des dizaines de facteurs influencent le choix, mais cinq écrasent tous les autres.

Premier critère, la stratégie de distribution. Vendras-tu, ou ouvriras-tu, les services séparément ? C'est le critère le plus discriminant : s'il faut livrer à la découpe, le monolithe intégré est éliminé d'office, quelles que soient ses autres qualités.

Deuxième critère, le nombre d'équipes. La loi de Conway ne se négocie pas : une ou deux équipes vivent très bien dans un monolithe ; dix équipes sur un noyau partagé se paralysent mutuellement.

Troisième critère, l'exigence d'intégration. Si la vue unifiée est le produit, tableaux de bord transverses, navigation fluide entre domaines, il faut soit le monolithe, soit un plan de contrôle fédéré ; les services autonomes purs feront payer chaque écran intégré.

Quatrième critère, l'exigence de cohérence. Cohérence immédiate garantie : monolithe. Cohérence à terme acceptable : fédéré. Conventions best effort suffisantes : autonomes.

Cinquième critère, l'existant. Un monolithe sain qui fonctionne est un actif, pas une honte ; des services déjà éparpillés appellent une fédération, pas une réécriture centrale.

Sur la page, une grille de décision interactive te pose ces cinq questions pour ton propre système, réel ou imaginaire, et affiche la tendance : monolithe modulaire, services autonomes ou modèle fédéré, avec une recommandation expliquée. Amuse-toi à trouver une combinaison de réponses qui élimine le monolithe dès la première question, puis une qui rend le fédéré incontournable. Mais garde en tête : cette grille donne une tendance, pas un verdict. Son vrai rôle est de forcer les cinq conversations qui comptent. Si ton comité d'architecture débat de la technologie de communication entre services avant d'avoir répondu à ces cinq questions, il débat dans le mauvais ordre.

Les signaux d'alerte du mauvais choix.

Les architectures ratées préviennent. Voici les symptômes à reconnaître, chacun pointant vers un diagnostic précis.

Premier symptôme : les déploiements en convoi. Tes services sont indépendants sur le papier, mais chaque release exige de les déployer ensemble, dans un ordre précis, après une réunion de coordination. Diagnostic : monolithe distribué, presque toujours causé par un noyau partagé ou des contrats implicites. Tu paies le distribué sans l'autonomie ; il faut soit ré-assumer le monolithe, soit casser le noyau partagé.

Deuxième symptôme : le backlog d'intégration qui enfle. Chaque trimestre, de nouvelles demandes de vue consolidée, de rapport transverse, de suppression globale, et chaque demande est un projet. Diagnostic : services autonomes face à un besoin d'intégration sous-estimé. La réponse durable n'est pas le énième écran d'agrégation, c'est un plan de contrôle fédéré.

Troisième symptôme : les ressources orphelines et les étiquettes incohérentes. Personne ne sait dire combien de boutiques existent vraiment, les audits trouvent des ressources sans propriétaire. Diagnostic : fédération par convention, sans contrat. Il manque les références externes contractuelles et la réconciliation.

Quatrième symptôme : l'équipe-noyau goulot. Toutes les autres équipes attendent les évolutions du module central ; le backlog du noyau a six mois de profondeur. Diagnostic : monolithe au-delà de son échelle organisationnelle. C'est le signal de départ d'une extraction.

Première trajectoire : du monolithe vers le fédéré.

La migration la plus fréquente, et la plus documentée. Elle suit le pattern du figuier étrangleur : le nouveau système pousse autour de l'ancien, qui continue de fonctionner jusqu'à devenir remplaçable. Cinq étapes, dans l'ordre.

Étape un : modulariser d'abord. Tracer les frontières logiques dans le monolithe, c'est le monolithe modulaire du chapitre un. Aucune infrastructure nouvelle ; tout le travail est dans le code et les interfaces internes.

Étape deux : extraire le module le plus autonome, celui qui a le moins de dépendances entrantes. Lui donner sa propre projection locale du concept partagé, alimentée au début par des appels au monolithe.

Étape trois : introduire le contrat de fédération sur le service extrait, référence externe, upsert idempotent. Le monolithe devient son premier plan de contrôle de fait.

Étape quatre : répéter, module par module, en commençant toujours par le plus découplé.

Étape cinq : promouvoir le noyau restant en plan de contrôle. Quand il ne reste au centre que la topologie, organisations, boutiques, utilisateurs, le monolithe est devenu, sans bascule brutale, le référentiel central du modèle fédéré.

La beauté de cette trajectoire : chaque étape a de la valeur même si la migration s'arrête là. Un monolithe modulaire est meilleur qu'un spaghetti ; un service extrait rend de l'autonomie à une équipe ; le contrat de fédération sert aussi aux outils d'infrastructure.

Deuxième trajectoire : des services autonomes vers le fédéré.

Le chemin inverse, typique des écosystèmes qui ont grandi en mode best-of-breed et dont les clients réclament l'expérience unifiée. Quatre étapes. Un : publier le langage commun, le vocabulaire minimal et le schéma d'identifiants du chapitre trois. C'est une décision de gouvernance, pas du code. Deux : ajouter le contrat de fédération à chaque service, références externes, marquage de gestion, upsert idempotent. Chaque service reste cent pour cent autonome ; il devient simplement fédérable. Trois : construire le plan de contrôle, d'abord en lecture, un inventaire consolidé, puis en écriture, le provisionnement. Quatre : adopter l'existant, avec la procédure d'adoption du chapitre deux, service par service, sans migration de données.

Les deux pièges qui condamnent une migration.

Premier piège : le big bang. Tout réécrire et basculer un week-end. L'histoire de l'industrie est un cimetière de big bangs ; la migration incrémentale n'est pas une option prudente, c'est la seule qui survit au contact du réel.

Second piège : le noyau partagé transitoire. Partageons les types juste le temps de la migration. Aucun noyau partagé transitoire n'est jamais mort de cause naturelle : le provisoire qui fonctionne devient permanent, et tu as construit un monolithe distribué en croyant migrer. Si tu dois partager quelque chose, partage le langage publié, jamais les types.

Ce qu'il faut retenir, du cours entier.

Chapitre un : le monolithe intégré et les services autonomes optimisent des objectifs opposés, intégration et cohérence contre autonomie et échelle ; le choix structure le produit et l'organisation. Chapitre deux : le modèle fédéré réconcilie les deux, plan de contrôle souverain sur la topologie, services souverains sur leurs ressources, convergence par réconciliation idempotente. Chapitre trois : les bounded contexts légitiment les définitions locales ; entre eux circulent des identifiants et des messages d'un langage publié, jamais des types partagés. Chapitre quatre : on choisit avec cinq critères, on surveille les signaux d'alerte, et on migre par étapes qui ont chacune leur valeur propre, jamais en big bang, jamais via un noyau partagé transitoire.

La compétence durable n'est pas de connaître le meilleur modèle : c'est de savoir lire la stratégie d'un produit dans son architecture, et réciproquement. Sur la page, un dernier quiz de quatre questions clôt le cours.
