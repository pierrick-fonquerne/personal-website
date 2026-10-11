Research journal. Learning without touching the synapses: a reading. A peer-reviewed paper where only each neuron's bias is tuned.

I read a paper by Mason, Sennik, Clopath, Gruber and Nicola, published in twenty twenty-six in Communications Biology, and peer reviewed. I read it because it asks my question backwards: what is left to learn once the synapses stop moving?

Here is what the paper shows. The connections are random and frozen. Only each neuron's bias is tuned, meaning its excitability threshold, how easily it fires. With that single knob, a recurrent network reproduces chaotic systems of one to three dimensions, and switches from one to another. Twenty unrelated sets of biases give the same output for the Lorenz system, and all of them succeed.

In closed loop, the network reaches ninety-nine point one percent of targets for an arm, and returns ninety-eight point nine percent of balls in Pong. A second network, with no recurrence, has two layers of sixteen thousand neurons. It reaches eighty-four point two percent on MNIST, and fifty-nine point three percent on Kuzushiji-MNIST. In all, twenty-four tasks, ten random seeds, and public code.

What I take from it is first a cheap control for my test bench: a mode where only the biases move and the weights stay frozen. For my living and persistent neuron, it is also an architecture idea, with fast biases specific to each task and slow shared weights. And a lesson in method: since twenty different solutions succeed at the same task, comparing two networks neuron by neuron means nothing, so I will compare outputs.

Now, what I don't buy. The learning rule is local only for the recurrent network. The biases are learned offline, not while the network runs. The absence of forgetting comes from one bias vector stored for each task: that is filing, not continual learning. Images give a mediocre return. Finally, the authors measure neither how often a switch fails, nor how many tasks a network can hold, nor the mix with weight plasticity.

Still open. I want to measure how often switches fail on my Rust skeleton, with random times and random tasks. Then learn the biases online. And only after that, test fast biases with slow weights.

In one sentence. A network with frozen connections learns dozens of tasks by tuning only the excitability of its neurons, and what I do with it first is a control for my test bench, remembering that this is not yet continual learning.
