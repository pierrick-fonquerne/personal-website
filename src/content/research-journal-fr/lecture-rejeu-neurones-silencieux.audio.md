Journal de recherche. Rejouer dans les neurones silencieux : note de lecture. Un papier qui consolide les souvenirs d'un réseau pendant qu'il travaille, sans phase de sommeil.

Je viens de lire un papier de Zhang Yanhai, Zhang Jie et Xu Chi, accepté à NeurIPS deux mille vingt-six, intitulé Replay in the Silent Degrees of Freedom. Je l'ai lue parce qu'elle pose ma question : consolider les anciens souvenirs sans jamais s'arrêter d'apprendre.

Le rejeu consiste à réentraîner le réseau sur d'anciens exemples gardés en mémoire, pour qu'il ne les oublie pas. D'habitude, on le fait pendant une phase de nuit, hors ligne. Ici, le rejeu se fait pendant le flux, dans les neurones que l'entrée en cours n'utilise pas. Le réseau est petit, il apprend avec une règle locale, et il garde mille exemples en mémoire.

Sur split-MNIST, il atteint quatre-vingt-onze virgule six pour cent. La méthode de rejeu DER plus plus fait quatre-vingt-onze virgule cinq, et la version avec une vraie nuit hors ligne quatre-vingt-neuf pour cent. Le gain vient surtout d'une règle simple : les unités actives à un lot sont éteintes au lot suivant. Elle apporte trois virgule six points, alors que le masque qui protège l'entrée en cours n'en ajoute qu'un dixième à trois dixièmes.

Ce que j'en retiens, c'est que c'est un des rares papiers qui garde des poids plastiques, une règle locale, et aucune frontière entre apprendre et servir. C'est exactement l'idée de ma page sur l'apprentissage local. Dans ma version réduite en Rust, cette rotation réduit l'oubli, de dix virgule cinq à six virgule un, sans changer le score final.

Ce que je n'achète pas, ensuite. Le papier est accepté à NeurIPS, mais j'ai lu la version arXiv. Le banc d'essai est petit : MNIST, et sur CIFAR dix brut le système fait vingt-huit virgule quatre pour cent, contre trente et un virgule six pour ER-ACE. Tout repose sur mille images stockées, car sans mémoire on tombe à dix-neuf virgule quatre pour cent. Le titre vend l'isolation, alors que le gain vient de la rotation. Sur un flux ordinaire, la rotation coûte, quatre-vingt-quatorze virgule un contre quatre-vingt-quinze virgule quatre, et le rejeu demande deux fois et deux dixièmes plus d'exemples et environ six fois plus de temps que la nuit. Enfin, je n'ai pas pu lire les annexes, et le gain de précision ne se retrouve pas dans ma version réduite.

Reste une question ouverte. Dans le papier, être éveillé se définit sur un lot de seize exemples, alors que mon système traite un flux. Je veux deux mesures que le papier n'a pas : la rotation contre un dropout ordinaire au même taux, puis une version où chaque neurone garde une trace de son activité récente. Si la rotation ne marche que par lots, elle ne servira pas.

En une phrase. Ce papier montre qu'un réseau à règle locale peut consolider ses souvenirs en travaillant, grâce à une rotation simple des neurones, mais sur un petit banc d'essai, et il me reste à vérifier que l'idée survit à un vrai flux.
