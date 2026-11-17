Journal de recherche. Pourquoi un seul neurone suffit à trancher la persistance. Trois points qui restaient ouverts, et une même règle pour les fermer.

Aujourd'hui, j'ai fermé les trois points qui restaient ouverts dans le modèle réfutable du neurone vivant et persistant. Le fil conducteur a été le même partout : choisir la forme la plus pauvre qui pourrait suffire, puis chercher à la casser.

Premier point : d'où vient l'oubli. Sur une seule unité, il n'y a pas de réseau où cacher une mémoire. L'oubli ne peut donc venir que d'une chose, le fait que les mêmes poids codent à la fois le premier motif et le second. C'est pour cela que le recouvrement des afférences entre les deux motifs, c'est-à-dire la part des entrées qu'ils ont en commun, devient la vraie variable de l'expérience, et pas un détail. On le fait varier de zéro à un, et on lit une courbe de rétention plutôt qu'un seul verdict.

Deuxième point : la signature du neurone. Elle n'est utile que si elle ne dérive pas avec les poids. Je la fixe donc comme un état lent, qui oriente le replay du sommeil vers les événements cohérents avec ce que le neurone est. La forme retenue est minimale : un vecteur de traces afférentes lentes. Il donne une note aux épisodes du journal, mais il ne régénère pas le motif, et c'est précisément ce qui empêche de gagner en trichant.

Troisième point : le journal non borné. Tout garder a un coût, et je l'assume. Le journal complet sert de borne supérieure, une sorte d'oracle, et je mesure son coût pour lire chaque rétention en regard de son prix. La question n'est donc pas de savoir si c'est gratuit, mais combien un buffer de taille limitée en récupère, à calcul égal. Un coût qui grandit avec la durée de l'expérience, c'est la condition de l'expérience, pas un défaut à cacher.

Reste une question ouverte : choisir la forme de la prochaine brique, une page concept qu'on peut manipuler, ou du code Rust écrit en TDD. La dimension pédagogique du replay, la madeleine de Proust, viendra avec.

En une phrase. Sur un seul neurone, l'oubli ne peut venir que des poids partagés, la signature ancre le replay sans tricher, et le journal complet sert d'étalon dont on mesure honnêtement le prix.
