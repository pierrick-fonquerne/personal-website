Chapitre un. Propositions et connecteurs logiques. Le langage de la rigueur : comment des énoncés vrais ou faux se combinent en raisonnements, et pourquoi, en logique, faux implique vrai est vrai.

Toutes les mathématiques reposent sur un geste : démontrer. Pas convaincre, pas illustrer, démontrer. Et démontrer suppose un langage où chaque phrase est soit vraie, soit fausse, sans zone grise. Ce langage, c'est la logique propositionnelle. C'est le tout premier outil à poser avant d'écrire la moindre démonstration sérieuse.

À la fin de ce chapitre, tu sauras répondre à trois questions : qu'est-ce qu'un énoncé qu'on a le droit d'appeler vrai ou faux, comment combiner de tels énoncés avec non, et, ou, et si alors, et pourquoi l'implication a un comportement qui surprend tout le monde la première fois. Pour suivre, rien de plus que le niveau collège n'est nécessaire : aucun calcul, aucune connaissance préalable en logique.

L'enquête : raisonner juste.

Imagine un détective sur une scène de crime. Il ne dispose que de faits, dont chacun est soit vrai, soit faux : la fenêtre était verrouillée, le suspect était en ville, l'alarme s'est déclenchée. À partir de ces faits, il enchaîne des déductions : si la fenêtre était verrouillée et que l'alarme ne s'est pas déclenchée, alors l'intrus avait une clé. Tout le raisonnement tient dans ces petits mots de liaison : non, et, ou, si alors. La logique propositionnelle, c'est exactement ça, mais rendue assez précise pour qu'une machine puisse la vérifier.

Qu'est-ce qu'une proposition.

Une proposition est un énoncé dont on peut dire sans ambiguïté s'il est vrai ou faux. Par exemple, deux plus deux égale quatre est une proposition vraie. Sept est un nombre pair est une proposition fausse. En revanche, quelle heure est-il n'est pas une proposition : une question n'est ni vraie ni fausse. De même, x supérieur à trois n'est pas une proposition tant que x n'est pas fixé, car sa valeur de vérité dépend de x. On réglera ce cas au chapitre deux, avec les quantificateurs. Le principe selon lequel une proposition est soit vraie, soit fausse, sans troisième possibilité, s'appelle la bivalence. On note le vrai V, le faux F, et on désigne les propositions par des lettres : P, Q, R.

Joue avec une table de vérité.

Avant toute théorie, manipule. Sur la page, un tableau interactif appelé table de vérité te montre la valeur de plusieurs formules pour chaque combinaison possible de P et de Q. Tu peux basculer les valeurs de P et de Q avec des boutons, et la ligne correspondante se surligne. Tu peux même écrire ta propre formule à l'aide d'un petit clavier de symboles, et voir sa table apparaître en direct. Prends le temps de chercher la seule ligne où P et Q vaut vrai, puis la seule ligne où P ou Q vaut faux.

Les trois premiers connecteurs : non, et, ou.

Un connecteur logique est un symbole qui fabrique une nouvelle proposition à partir d'une ou deux propositions. On définit chacun par sa table de vérité, qui est sa définition complète. La négation, notée non P, inverse la valeur : non P vaut vrai exactement quand P vaut faux. La conjonction, P et Q, ne vaut vrai que dans un seul cas, celui où P et Q sont vrais tous les deux ; dans les trois autres cas, elle est fausse. La disjonction, P ou Q, vaut vrai dès qu'au moins une des deux est vraie. Attention au piège : c'est un ou inclusif. Si les deux sont vraies, P ou Q reste vrai. C'est différent du ou de la vie courante, quand un serveur propose fromage ou dessert et sous-entend l'un mais pas les deux. Ce ou exclusif là existe aussi, on le retrouvera tout à l'heure.

L'implication, le connecteur qui piège.

Voici le connecteur le plus important des mathématiques, et le plus contre-intuitif. L'implication, P implique Q, se lit si P alors Q. Elle a trois lectures équivalentes qu'il faut connaître : si P alors Q, P est suffisant pour Q, et Q est nécessaire pour P. Sa table de vérité réserve une surprise : P implique Q n'est fausse que dans un seul cas, celui où P est vraie mais Q fausse. Dans tous les autres cas, elle est vraie. En particulier, quand P est fausse, P implique Q est vraie quoi qu'il arrive : on dit qu'elle est vraie par vacuité. Pour comprendre, reste sur la scène de crime. Le détective pose une règle : si le suspect est coupable, alors ses empreintes sont sur l'arme. Quand cette règle est-elle prise en défaut ? Uniquement si le suspect est coupable et que ses empreintes ne sont pas sur l'arme. Si le suspect est innocent, la règle ne dit rien de ce cas, on ne peut donc pas la contredire, et elle tient par défaut. L'implication cache une seconde surprise : elle se réécrit sans le symbole implique. En effet, P implique Q équivaut à non P ou Q. C'est un outil qu'on utilisera sans cesse pour manipuler les implications dans les démonstrations.

L'équivalence, les tautologies et les contradictions.

Quand deux propositions ont la même valeur de vérité dans tous les cas, on dit qu'elles sont équivalentes. Le connecteur, P si et seulement si Q, vaut vrai exactement quand P et Q ont la même valeur. Deux familles méritent un nom. Une tautologie est une proposition toujours vraie, quelles que soient les valeurs de ses variables ; l'exemple roi est P ou non P, le principe du tiers exclu. Une contradiction, à l'inverse, est toujours fausse ; l'exemple roi est P et non P, car une proposition ne peut pas être à la fois vraie et fausse.

Les lois de De Morgan.

Comment nie-t-on un et ? Comment nie-t-on un ou ? La réponse tient dans les deux lois de De Morgan, parmi les plus utilisées de toutes les mathématiques. Première loi : la négation de P et Q équivaut à non P ou non Q. Deuxième loi : la négation de P ou Q équivaut à non P et non Q. En clair, nier les deux revient à dire qu'au moins l'un des deux est faux, et nier au moins l'un revient à dire que les deux sont faux. Sur la page, tu peux vérifier ces lois colonne contre colonne dans le tableau interactif.

Toute formule est un arbre.

Une formule logique n'est pas une suite de symboles à plat : c'est une structure emboîtée, un arbre. Les connecteurs sont les nœuds, les variables sont les feuilles. Cet arbre dicte l'ordre d'évaluation : on calcule d'abord les feuilles, puis on remonte. Il dicte aussi la priorité des connecteurs, exactement comme la multiplication passe avant l'addition. La convention, du plus prioritaire au moins prioritaire, est la suivante : la négation, puis le et, puis le ou, puis l'implication, puis l'équivalence. Ainsi, non P ou Q se lit non P, le tout ou Q, et non pas la négation de P ou Q. En cas de doute, les parenthèses tranchent.

Une histoire : de Boole aux circuits.

L'idée que le raisonnement puisse devenir du calcul est récente. En mille huit cent quarante-sept, George Boole publie une algèbre où le vrai et le faux se calculent comme des nombres, et la logique devient mathématique. En mille huit cent soixante-dix-neuf, Gottlob Frege invente une notation pour les quantificateurs et fonde la logique moderne, dont on récoltera les fruits au chapitre deux. En mille neuf cent trente-sept, Claude Shannon montre que les circuits à interrupteurs réalisent exactement l'algèbre de Boole : c'est la naissance de l'électronique numérique. Au passage, un pont avec un autre cours. Les connecteurs et et ou peuvent être calculés par un circuit, ou par un neurone. Dans le cours sur les réseaux de neurones, tu verras qu'un neurone à seuil unique sait calculer et et ou, mais bute sur un troisième connecteur : le ou exclusif, ce fameux XOR, qui vaut vrai quand exactement une des deux entrées est vraie. En logique, XOR se construit à partir des autres : c'est P ou Q, mais en excluant le cas où P et Q sont vrais tous les deux. La raison géométrique pour laquelle un seul neurone n'y arrive pas est l'un des résultats fondateurs de l'histoire de l'intelligence artificielle.

En une phrase.

La logique propositionnelle est un petit calcul exact : des propositions, vraies ou fausses, se combinent par cinq connecteurs, et la valeur de n'importe quelle formule se lit mécaniquement dans sa table de vérité.

Vers le chapitre deux.

On a soigneusement évité x supérieur à trois, en disant que ce n'était pas une proposition. C'est gênant, car les mathématiques sont pleines d'énoncés qui dépendent d'une variable. Pour les rendre vrais ou faux, il faudra dire pour tout x, ou il existe un x. Ce sont les quantificateurs, le sujet du chapitre deux. Sur la page, le chapitre se termine par deux exercices corrigés et un quiz, à faire pour ancrer tout ça.
