Journal de recherche. Lecture : apprendre en continu par neuroévolution. Une prépublication, et ce qu'elle change pour mes neurones plastiques.

J'ai lu Continual Reinforcement Learning with Neuroevolution, de Nisioti, Cossu, Korte et Risi, une prépublication parue sur arXiv. Je l'ai lue parce qu'elle pose une question proche de la mienne : qu'est-ce qui aide un réseau à garder la capacité d'apprendre quand la tâche change sans prévenir ?

Les auteurs comparent sept méthodes sur le même réseau, dont deux sans gradient : une stratégie d'évolution, qu'on appelle E S, qui note des copies bruitées des poids, et un algorithme génétique. Il y a sept environnements, dix-huit configurations de vingt tâches chacune, le même budget pour tout le monde, et dix essais par configuration.

E S obtient le meilleur compromis entre apprendre et oublier dans huit configurations sur dix-huit, alors que le gradient n'est le meilleur dans aucune. L'algorithme génétique, lui, apprend le plus vite dans dix configurations, mais il oublie davantage.

L'explication proposée tient en une idée. E S s'installe dans des voisinages larges, c'est-à-dire des zones où l'on peut bouger les poids sans casser la tâche. Ils sont trois virgule neuf fois plus larges que ceux de P P O, en médiane. Et la largeur partagée entre deux tâches prédit le compromis, avec une corrélation de Spearman de zéro virgule soixante-dix-sept.

Ce que j'en retiens pour ma page sur la plasticité structurelle, ce n'est pas que l'absence de gradient rend stable. L'algorithme génétique n'a pas de gradient non plus, et pourtant il oublie. Ce qui protège E S, c'est d'être évalué sous perturbation. Je garde aussi une mesure qui ne dépend pas de la règle d'apprentissage : on perturbe les poids et on regarde si la tâche tient, ce qui s'applique tel quel à un réseau plastique.

Ce que je n'achète pas, maintenant. D'abord, c'est une prépublication qui n'a pas été relue par des pairs. Ensuite, huit sur dix-huit n'est pas une domination. Le mécanisme repose sur une corrélation, sans intervention, et sur de très petits réseaux. E S se fige quand on inverse les actions, sur deux environnements. Enfin, rien n'est dit sur le coût en données, ni sur l'apprentissage pendant la vie d'un individu, ni sur les règles locales.

Reste ouvert. Je veux tester une règle locale par perturbation : un seul réseau, chaque poids garde sa perturbation, et une récompense globale décide de la renforcer. Si elle hérite de la stabilité de E S, on obtient un pont vers apprendre pendant qu'on sert. Avant cela, je relance mon banc d'essai en Rust au budget complet de l'article, pour savoir si l'écart que j'ai vu sur la stabilité de E S vient de mon budget réduit.

En une phrase. Un optimiseur évalué sous perturbation garde mieux l'équilibre entre apprendre et retenir que le gradient, mais le papier reste une prépublication fondée sur une corrélation, et c'est à moi de tester si une règle locale peut en hériter.
