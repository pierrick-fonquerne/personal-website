Journal de recherche. Lecture : le type de neurone compte autant que la règle. Un papier sur la neuromodulation, et ce qu'il change pour mon neurone à état.

J'ai lu un papier de Claret, O'Neill, Cotofrei et Stoffel, qui s'intitule Multi-Behavioral Evolved Substrates Through Neuromodulation and Activation Selection. Il est publié aux actes de la conférence ALIFE deux mille vingt-six. Je l'ai lu parce qu'il pose ma question de départ : comment un seul petit réseau peut-il tenir plusieurs tâches, sans gradient ?

Voici ce que montre le papier. Un réseau d'une dizaine de neurones doit résoudre cinq portes logiques : le XOR, le ET, le OU, le NON-ET et le NON-OU. Il est trouvé par évolution, donc sans gradient. D'une tâche à l'autre, seules deux choses changent : un petit vecteur de neuromodulation, quatre nombres fixés à la main qui règlent le réseau de l'extérieur, et la fonction d'activation.

Quand tous les neurones utilisent tanh, la réussite tombe à zéro pour cent avec cinq tâches. Le XOR reste bloqué à soixante-quinze pour cent, c'est-à-dire trois réponses justes sur quatre. La raison, c'est que tanh est monotone : sa sortie ne fait que monter quand l'entrée monte, alors que le XOR demande l'inverse. Et le même réseau, entraîné avec Adam, atteint cent pour cent. Le défaut vient donc de la recherche, pas du réseau.

Avec un sinus pour le XOR, tanh ailleurs, et la neuromodulation, on arrive à cent pour cent, en quatorze générations en médiane. Si on retire l'un des deux ingrédients, on retombe à zéro.

Ce que j'en retiens, c'est que ce papier est un contrepoint à ma page sur le neurone à état. J'y défends que l'état interne est ce qui débloque du calcul. Ici, le déblocage vient d'une fonction sans mémoire, le sinus, et d'un signal de contexte venu du dehors. Le type de neurone compte, pas seulement son état. De plus, mon cœur plastique n'aura pas de gradient global, il est donc du côté de l'évolution dans ce papier. Si tous mes neurones sont monotones, je dois m'attendre au même plafond sur la parité. Je prévois donc au moins deux types de neurones, pas dix, car avec dix activations différentes, le papier retombe à zéro.

Ce que je n'achète pas. D'abord, c'est un article de conférence court. Le banc d'essai est fait de tâches jouets. Avec quatre entrées, l'activation par tâche tombe à treize virgule trois pour cent, et à sept tâches et plus, tout s'effondre. En régression continue, le sinus ne fait que six virgule sept pour cent, contre cent pour tanh. Sur le banc principal, le sinus seul suffit déjà, et l'activation par tâche est choisie par les expérimentateurs. Surtout, il n'y a rien sur les règles d'apprentissage locales, rien sur l'apprentissage séquentiel, et le contexte est donné au réseau au lieu d'être deviné.

Reste une question ouverte : le plateau à soixante-quinze pour cent existe-t-il avec une règle locale ? Dès qu'une première règle tourne, je la lance sur le XOR et le ET ensemble, avec tanh puis avec le sinus, et je lui donne un signal d'apprentissage gradué plutôt que binaire.

En une phrase. La neuromodulation ne suffit pas à faire tenir plusieurs tâches dans un réseau trouvé par évolution, il faut aussi changer le type de neurone, et c'est ce que je vais tester avec une règle locale.
