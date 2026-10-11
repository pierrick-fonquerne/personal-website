Journal de recherche. Apprendre sans toucher aux synapses : une lecture. Un papier relu par les pairs, où seul le biais de chaque neurone est réglé.

J'ai lu un article de Mason, Sennik, Clopath, Gruber et Nicola, paru en deux mille vingt-six dans Communications Biology, et relu par les pairs. Je l'ai lu parce qu'il pose ma question à l'envers : que reste-t-il à apprendre quand les synapses ne bougent plus ?

Voici ce que montre le papier. Les connexions sont aléatoires et figées. Seul le biais de chaque neurone est réglé, c'est-à-dire son seuil d'excitabilité, la facilité avec laquelle il s'active. Avec ce seul réglage, un réseau récurrent reproduit des systèmes chaotiques de une à trois dimensions, et passe de l'un à l'autre. Vingt jeux de biais sans lien entre eux donnent la même sortie pour le système de Lorenz, et tous réussissent.

En boucle fermée, le réseau atteint quatre-vingt-dix-neuf virgule un pour cent de cibles pour un bras, et renvoie quatre-vingt-dix-huit virgule neuf pour cent des balles à Pong. Un second réseau, sans récurrence, a deux couches de seize mille neurones. Il atteint quatre-vingt-quatre virgule deux pour cent sur MNIST, et cinquante-neuf virgule trois pour cent sur Kuzushiji-MNIST. Au total, vingt-quatre tâches, dix graines aléatoires, et un code public.

Ce que j'en retiens, c'est d'abord un témoin bon marché pour mon banc d'essai : un mode où seuls les biais bougent et où les poids restent figés. Pour mon neurone vivant et persistant, c'est aussi une idée d'architecture, avec des biais rapides propres à chaque tâche et des poids lents partagés. Et une leçon de méthode : comme vingt solutions différentes réussissent la même tâche, comparer deux réseaux neurone par neurone ne veut rien dire, donc je comparerai les sorties.

Ce que je n'achète pas, maintenant. La règle d'apprentissage n'est locale que pour le réseau récurrent. Les biais sont appris hors ligne, pas pendant que le réseau tourne. L'absence d'oubli vient d'un vecteur de biais rangé pour chaque tâche : c'est un classement, pas de l'apprentissage continu. Les images donnent un rendement médiocre. Enfin, les auteurs ne mesurent ni la fréquence des bascules ratées, ni le nombre de tâches qu'un réseau peut porter, ni le mélange avec une plasticité des poids.

Reste ouvert. Je veux mesurer la fréquence des bascules ratées sur mon squelette en Rust, avec des instants et des tâches tirés au hasard. Ensuite, apprendre les biais en ligne. Et seulement après, tester des biais rapides avec des poids lents.

En une phrase. Un réseau aux connexions figées apprend des dizaines de tâches en ne réglant que l'excitabilité de ses neurones, et ce que j'en fais d'abord, c'est un témoin pour mon banc d'essai, en gardant en tête que ce n'est pas encore de l'apprentissage continu.
