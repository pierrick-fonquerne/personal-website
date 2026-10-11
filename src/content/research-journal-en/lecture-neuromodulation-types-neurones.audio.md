Research journal. Reading: the neuron type matters as much as the rule. A paper on neuromodulation, and what it changes for my stateful neuron.

I read a paper by Claret, O'Neill, Cotofrei and Stoffel, titled Multi-Behavioral Evolved Substrates Through Neuromodulation and Activation Selection. It is published in the proceedings of the ALIFE twenty twenty-six conference. I read it because it asks my starting question: how can one small network hold several tasks, without gradients?

Here is what the paper shows. A network of about ten neurons must solve five logic gates: XOR, AND, OR, NAND and NOR. It is found by evolution, so without gradients. From one task to the next, only two things change: a small neuromodulation vector, four numbers set by hand that tune the network from the outside, and the activation function.

When every neuron uses tanh, success drops to zero percent with five tasks. XOR stays stuck at seventy-five percent, which means three right answers out of four. The reason is that tanh is monotone: its output only goes up when the input goes up, while XOR needs the opposite. And the same network, trained with Adam, reaches one hundred percent. So the flaw is in the search, not in the network.

With a sine for XOR, tanh elsewhere, and neuromodulation, it reaches one hundred percent, in a median of fourteen generations. Remove either ingredient and it falls back to zero.

What I take from it is that this paper is a counterpoint to my page on the stateful neuron. There I argue that internal state is what unlocks computation. Here, the unlock comes from a memoryless function, the sine, and from a context signal coming from outside. The neuron type matters, not only its state. Also, my plastic core will have no global gradient, so in this paper it sits on the evolution side. If all my neurons are monotone, I should expect the same ceiling on parity. So I plan at least two neuron types, not ten, because with ten different activations, the paper falls back to zero.

What I don't buy. First, it is a short conference paper. The test bench is made of toy tasks. With four inputs, per-task activation drops to thirteen point three percent, and at seven tasks and more, everything collapses. On continuous regression, the sine reaches only six point seven percent, against one hundred for tanh. On the main bench, the sine alone already suffices, and the per-task activation is chosen by the experimenters. Above all, there is nothing on local learning rules, nothing on sequential learning, and the context is handed to the network instead of being guessed.

One question stays open: does the seventy-five percent plateau exist with a local rule? As soon as a first rule runs, I will launch it on XOR and AND together, with tanh then with the sine, and I will give it a graded learning signal rather than a binary one.

In one sentence. Neuromodulation is not enough to fit several tasks into an evolved network, the neuron type has to change too, and that is what I will test with a local rule.
