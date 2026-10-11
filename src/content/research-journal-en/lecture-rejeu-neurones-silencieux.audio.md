Research journal. Replaying in the silent neurons: a reading note. A paper that consolidates a network's memories while it works, with no sleep phase.

I just read a paper by Zhang Yanhai, Zhang Jie and Xu Chi, accepted at NeurIPS twenty twenty-six, titled Replay in the Silent Degrees of Freedom. I read it because it asks my question: consolidating old memories without ever stopping learning.

Replay means retraining the network on old examples kept in memory, so that it does not forget them. Usually this happens in a night phase, offline. Here, replay happens during the stream, in the neurons that the current input does not use. The network is small, it learns with a local rule, and it keeps one thousand examples in memory.

On split-MNIST, it reaches ninety-one point six percent. The replay method DER plus plus gets ninety-one point five, and the version with a real offline night eighty-nine percent. Most of the gain comes from one simple rule: the units that were active in one batch are switched off in the next. It brings three point six points, while the mask that protects the current input adds only one to three tenths of a point.

What I take from it is that it is one of the rare papers that keeps plastic weights, a local rule, and no border between learning and serving. That is exactly the idea of my page on local learning. In my reduced Rust version, this rotation lowers forgetting, from ten point five to six point one, without changing the final score.

Now, what I don't buy. The paper is accepted at NeurIPS, but I read the arXiv version. The testbed is small: MNIST, and on raw CIFAR ten the system gets twenty-eight point four percent, against thirty-one point six for ER-ACE. Everything rests on one thousand stored images, because without memory it falls to nineteen point four percent. The title sells the isolation, while the gain comes from the rotation. On an ordinary stream, the rotation has a cost, ninety-four point one against ninety-five point four, and replay needs two point two times more examples and about six times more time than the night. Finally, I could not read the appendices, and the accuracy gain does not show up in my reduced version.

One question stays open. In the paper, being awake is defined over a batch of sixteen examples, while my system processes a stream. I want two measures the paper does not have: the rotation against ordinary dropout at the same rate, then a version where each neuron keeps a trace of its recent activity. If the rotation only works by batches, it will not be useful.

In one sentence. This paper shows that a network with a local rule can consolidate its memories while working, thanks to a simple rotation of neurons, but on a small testbed, and I still have to check that the idea survives a real stream.
