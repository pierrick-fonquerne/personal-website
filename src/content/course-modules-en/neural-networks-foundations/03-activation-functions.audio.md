Chapter three. Activation functions. The piece that turns a linear stack into a network that can really learn.

In chapter one, we wrote y equals f of z, where z is the weighted sum plus the bias, and f is the activation function. We used the sigmoid by default, without explaining why. This chapter fills that gap. You will see which activation functions we use in practice, how they behave in terms of gradient, and the historical vanishing-gradient problem that held deep learning back until two thousand and twelve.

Why a non-linearity?

Stacking several linear neurons without activation is strictly equivalent to a single linear neuron. Short proof: if layer one computes z one equals W one x plus b one, and layer two computes z two equals W two times z one plus b two, then substituting gives z two equals W two times W one x, plus W two times b one, plus b two. That is one single linear combination with an effective weight matrix W two times W one and an effective bias. Without non-linearity, depth equals shallow. The activation function is what prevents that collapse.

The three main activation functions.

First, the sigmoid. Notation sigma of x. Definition: sigma of x equals one divided by one plus the exponential of minus x. Output strictly between zero and one. Its derivative is sigma prime of x equals sigma of x times one minus sigma of x. The derivative peaks at x equals zero, where it equals zero point twenty-five. The sigmoid dominated deep learning between nineteen eighty-six and two thousand and ten. Its S-shape compresses any real number into the open interval zero to one, which lets us interpret the output as a probability. Modern usage: keep it on the output layer for binary classification or for outputs you want to read as a probability.

Second, the ReLU function. ReLU means Rectified Linear Unit. Definition: ReLU of x equals the maximum of zero and x. If x is negative, output zero. If x is non-negative, output x. Derivative: zero for negative x, one for strictly positive x. Strictly speaking, it is not differentiable at zero, but by convention we set its value there to zero. Advantages: very fast to compute, and its gradient equals one on the active part, which largely solves the vanishing gradient problem on the sigmoid. Drawback: the dying ReLU problem. If a neuron receives a combination that always produces a negative pre-activation on the data it sees, it always outputs zero, its gradient is zero, and it stops learning. It is dead.

On the page, the interactive component lets you push the bias of a ReLU neuron toward very negative values. You will see all the points flip red, the neuron dies. At that stage, the neuron will not learn anymore, because its gradient is zero everywhere.

Third, the hyperbolic tangent, written tanh. Definition: tanh of x equals the exponential of x minus the exponential of minus x, all divided by the exponential of x plus the exponential of minus x. Derivative: one minus tanh of x squared. Shape: the same S-curve as the sigmoid, but centred. Output between minus one and one. The hyperbolic tangent is the centred cousin of the sigmoid. We prefer it when we want a zero-centred output, statistically preferable for training. Often used in classical RNNs.

Play with the functions.

On the page, the workshop component plots the four functions sigmoid, ReLU, tanh, identity over the domain x between minus five and five. You can toggle each function and display the derivatives as dashed lines. Five experiments to try. At x equals zero, check that sigma of zero equals zero point five and that sigma prime of zero equals zero point twenty-five. At x equals two, see that sigma prime of two already dropped toward zero point one. The sigmoid saturates fast. At x equals minus three, ReLU and its derivative are strictly zero. On that branch no gradient flows back. Compare at the centre the tangent slope of the sigmoid, at most zero point twenty-five, with ReLU's for positive x, always exactly one. That is the root of the vanishing gradient.

The vanishing gradient problem.

When we differentiate the sigmoid, we get sigma prime of x equals sigma of x times one minus sigma of x. The maximum is reached at x equals zero and equals zero point twenty-five. So at every layer crossed, the gradient is multiplied by a factor of at most zero point twenty-five. For a ten-layer network using sigmoid, the gradient at the first layer is multiplied by at most zero point twenty-five to the tenth power, about nine point five times ten to the minus seventh. That is extremely small. The first layer stops learning. This is the vanishing gradient problem, identified rigorously by Glorot and Bengio in two thousand and ten.

ReLU largely solves this problem: on its active part, the gradient is exactly one. Multiplying by one does not shrink the gradient. This is one of the two reasons, along with computational speed, for its modern dominance.

On the page, the component simulates a deep network. Move the number of layers and switch the activation. On sigmoid, the bars shrink visibly. On ReLU, they keep their length. Push to fifteen layers with sigmoid and look at the first-layer gradient: it is on the order of ten to the minus ninth, totally insufficient to update a weight. Now switch to ReLU and watch the bars all match again. That is the exact technical reason why sigmoid was dropped from hidden layers in favour of ReLU starting in two thousand and twelve.

The vanishing-gradient trap in practice. If you train a deep network and the first layer stays mute while the last one converges, you almost certainly have a vanishing gradient. First reflexes: swap sigmoids for ReLUs, check the initialisation in chapter eleven, and try batch normalisation, same chapter.

How to choose in practice. A simple heuristic that works in ninety-five percent of cases. Hidden layers: ReLU by default. Output layer for binary classification: sigmoid. Output layer for multi-class classification: softmax, which we will cover later. Output layer for regression: no activation, keep the raw value. For more exotic cases there are variants like leaky ReLU and GELU, which finely address the dying ReLU problem.

In one sentence. An activation function is what turns a linear stack into a real learning network, and the choice between sigmoid, ReLU and tanh depends on the trade-off between saturation and piecewise linearity.

On to chapter four. You now know the artificial neuron and the activation functions. Chapter four introduces Rosenblatt's perceptron, the historical ancestor of machine learning, and the first learning rule with a provable convergence when the data is linearly separable.
