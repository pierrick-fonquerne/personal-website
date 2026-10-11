Research journal. Reading notes: continual learning through neuroevolution. A preprint, and what it changes for my plastic neurons.

I read Continual Reinforcement Learning with Neuroevolution, by Nisioti, Cossu, Korte and Risi, a preprint posted on arXiv. I read it because it asks a question close to mine: what helps a network keep its ability to learn when the task changes without warning?

The authors compare seven methods on the same network, two of them without gradients: an evolution strategy, called E S, which scores noisy copies of the weights, and a genetic algorithm. There are seven environments, eighteen configurations of twenty tasks each, the same budget for everyone, and ten trials per configuration.

E S gets the best trade-off between learning and forgetting in eight configurations out of eighteen, while gradient descent is the best in none. The genetic algorithm learns fastest in ten configurations, but it forgets more.

The proposed explanation comes down to one idea. E S settles in wide neighborhoods, meaning zones where you can move the weights without breaking the task. They are three point nine times wider than those of P P O, in median. And the width shared between two tasks predicts the trade-off, with a Spearman correlation of zero point seven seven.

What I take from it for my structural plasticity page is not that having no gradient makes a network stable. The genetic algorithm has no gradient either, and it still forgets. What protects E S is being evaluated under perturbation. I also keep a measure that does not depend on the learning rule: you perturb the weights and check whether the task holds, which applies as is to a plastic network.

Now, what I don't buy. First, it is a preprint that has not been peer reviewed. Second, eight out of eighteen is not domination. The mechanism rests on a correlation, with no intervention, and on very small networks. E S freezes when actions are inverted, on two environments. Finally, nothing is said about data cost, about learning during an individual's lifetime, or about local rules.

Still open. I want to test a local rule based on perturbation: a single network, each weight keeps its perturbation, and a global reward decides whether to reinforce it. If it inherits the stability of E S, it is a bridge toward learning while serving. Before that, I rerun my Rust test bench at the paper's full budget, to find out whether the gap I saw in E S stability comes from my reduced budget.

In one sentence. An optimizer evaluated under perturbation holds the balance between learning and retaining better than gradient descent, but the paper is still a preprint built on a correlation, and it is up to me to test whether a local rule can inherit that stability.
