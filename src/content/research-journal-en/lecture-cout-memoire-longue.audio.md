Research journal. Reading: the cost of long memory. A theory paper that puts a price on remembering far back for a stateful model.

I read "The Cost of Long Memory", by Yuheng Song, a single-author preprint. I was looking for a number on what long memory costs a model that keeps its past in an internal state, and that is exactly the paper's question.

The paper does not propose a new model. It prices three levers, for guessing the next value of a series whose past fades slowly. The first is the number of internal states. You need on the order of the square of the logarithm of one over tau, where tau is the target error. The bound is proven in both directions, so it can be done, and you cannot do better in this class of models. The second is the context, meaning the number of past observations you look at directly. The extra error falls like one over L, so ten times more context only divides it by ten. The third is stability. A recurrence is stable when it shrinks the state at each step, by a factor rho below one. It then necessarily forgets exponentially, so aiming for a small error pushes rho toward one, which is the edge of instability. That is necessary, but not sufficient.

One test stayed with me. With rho equal to zero point eight, a stateful model learns almost perfectly a target that fades at the same rate, with a relative error of about seven millionths, and it hits a floor on a slower target, with an error of four point five hundredths, whatever its width.

For my stateful neuron, that speaks directly. A stateful neuron is a leaky accumulator. What matters is not having many units, it is that the forgetting rate matches the tail of what you want to keep. A neuron with a single time constant will therefore hit a floor, and it needs varied constants, some very close to one.

I don't buy all of it. It is an unreviewed preprint, and I have not checked the proofs. The setting is narrow: a one-dimensional Gaussian signal, one-step forecasting. No constant is given, so the formula does not say whether you need twenty states or two thousand. The experiments are tiny, with a window of sixty-four steps, a width of at most one hundred twenty-eight, and three or four seeds. The nonlinear result is not tested. And everything is trained by backpropagation, so nothing on local or continual learning.

One question stays open. The paper assumes uniform contraction, while a neuron whose time constants adapt falls outside that frame. So I want to measure, on a power-law target, the error floor of a neuron with several time constants, then see whether a local rule pushes them toward one by itself.

In one sentence. To remember far back, a stateful model needs varied time constants close to the edge of instability, and that is what I will test on a neuron that learns locally.
