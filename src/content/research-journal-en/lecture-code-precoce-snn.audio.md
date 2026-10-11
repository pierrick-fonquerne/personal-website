Research journal. Keeping the early code: a reading on spiking networks. A paper on how to stack layers when no error is backpropagated.

I read a paper by Attar, Cicciarella and Rossi, about temporal fusion in locally trained spiking networks. It is a preprint on arXiv. I was looking for how to stack layers when no error is backpropagated, which is exactly my situation with local learning.

The idea fits in one sentence: without a gradient, what a layer erases is lost. So the authors keep the first layer's code intact, and deeper layers can only annotate it. That code is the date of a neuron's first spike: early means strong, and silence means absent. The learning rule is local, STDP-style, which means each synapse only looks at the order of spikes around it.

With fully local learning, they report ninety-six point six percent on MNIST, eighty-six point three percent on Fashion MNIST, sixty-two point five percent on CIFAR ten, and ninety-five point one percent on N MNIST. Without their frozen input stage, accuracy falls to about ten percent on images, which is chance. And replacing the early code with a deep layer's code loses six to seven percent of accuracy. The final code is sparse: between six and thirteen percent of inputs are active, and ninety-five percent of the accuracy remains with a third to two thirds of the events.

What I take from it is first an invariant for my local learning page: every locally learned layer keeps a direct path from its input to the decision. I also borrow their three-factor readout rule, with a temporal corridor, several prototypes per class and a punishment limited to close rivals. And I take three measures for my test bench: the frozen-trunk ablation, the spike budget, and the data curve.

Now, what I don't buy. It is a preprint, not peer reviewed. The gain specific to the fusion is on the order of the noise between random seeds. The big gaps in the abstract come from the whole system, mostly from the input stage. The neuron model is never written down, and there is no gradient baseline at equal budget and no energy measurement. Above all, nothing on continual learning, because training runs in phases, with freezing and caching, and each image is an independent wave of spikes.

Still open. Deep layers trained by STDP add almost nothing. So I want to replace that rule with a local rule that receives a task signal, then remove the freezing and let all layers learn as a stream. If the early code stays stable while the readout learns, then the principle holds.

In one sentence. Without a gradient, what a layer erases is lost, so I keep a direct path to the decision, and now I test whether that principle survives when nothing is frozen anymore.
