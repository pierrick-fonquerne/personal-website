Chapter four. The perceptron. How Rosenblatt taught a machine to learn without a gradient in nineteen fifty-eight.

In chapter three, we proved that an activation function must be non-linear and differentiable for a deep network to make mathematical sense. Yet the first artificial neuron capable of learning, Frank Rosenblatt's perceptron in nineteen fifty-eight, uses the threshold function, which is almost everywhere differentiable with derivative zero. How was Rosenblatt able to make it learn anything? This chapter answers that question by building the perceptron from a purely geometric viewpoint, without any derivative. We prove that the procedure converges on a separable dataset, look at what happens when that assumption fails, then discover the limitation that ended the first age of neural networks.

The geometry of a hyperplane.

Lay a flat ruler on a table. That ruler splits the table's surface into two zones, the part in front of the ruler and the part behind it. The edge of the ruler is the boundary. The direction perpendicular to the edge is the normal vector, which we call w. The distance between the ruler and a given point on the table is what we care about, to measure how well or how poorly a point is classified.

Formal definition. A hyperplane capital H in R to the n is the set of points x such that w dot x plus b equals zero, with w a non-zero normal vector and b a scalar. In dimension two it is a line, in dimension three a plane, beyond that we no longer visualise but the equation stays the same.

The signed distance from a point x to the hyperplane equals w dot x plus b, all divided by the norm of w. The sign tells which side of the plane the point lies on, and the absolute value measures the Euclidean distance. We normalise by the norm of w so that this distance depends only on the hyperplane, not on the particular encoding w, b we chose.

Linearly separable, with a margin.

The buffer-zone analogy. Picture a border between two countries with a fixed-width buffer zone. Any point inside the buffer is ambiguous. Any point outside it clearly belongs to one side or the other. The margin is the width of that buffer.

Target encoding. For the proofs that follow, we encode targets in minus one, plus one, rather than zero, one. Why? With y in zero, one, telling apart well-classified and misclassified takes two separate inequalities depending on the class. With y in minus one, plus one, a single product suffices: an example is well-classified if and only if y times the quantity w dot x plus b is strictly positive. Handy for the proofs.

Formal definitions. The functional margin of an example x i, y i for parameters w, b is gamma hat i equals y i times w dot x i plus b. The functional margin of the dataset is the minimum across all examples. The geometric margin is the functional margin divided by the norm of w. A dataset is linearly separable with margin gamma if the geometric margin is strictly positive.

The perceptron and the tension with chapter three.

Definition. The perceptron is the function that maps a vector x to the sign of w dot x plus b. We write sgn for that sign function: it equals plus one when its argument is non-negative, minus one otherwise. It is exactly the Heaviside function of chapter one, but encoded plus one, minus one instead of zero, one.

Nineteen fifty-eight and nineteen sixty are two distinct dates. Fifty-eight is Rosenblatt's theoretical paper in Psychological Review. Sixty is the Mark one Perceptron physical machine, built at the Cornell Aeronautical Laboratory: four hundred photoreceptors and weights tuned by motorised potentiometers. Many accounts blur the two. The paper precedes the machine by two years.

The tension with chapter three. In chapter three, we proved that depth without non-linearity is useless, and that we need a differentiable activation to compute a gradient. Yet sgn is almost everywhere differentiable with derivative zero. How did Rosenblatt make a machine equipped with such a function learn anything? The answer, surprisingly, is that he did not need a derivative. His learning procedure is a local geometric correction: when the perceptron misclassifies an example, we move the weight vector in the direction that would have corrected the error, without ever computing a gradient. It is a historical exception. From chapter seven onward, we switch back to differentiable activations and gradient descent takes over.

The perceptron learning rule.

The road-sign analogy. Picture a misoriented road sign. Every time a driver gets it wrong because of the sign, you turn it a notch in the direction that would have avoided the mistake. You do not compute a derivative, you do not maximise anything: you react locally, incident after incident. After enough incidents, the sign points the right way.

Statement. Let eta be a strictly positive learning rate. For a misclassified example x i, y i, the learning rule applies w gets w plus eta y i x i, and b gets b plus eta y i. For a correctly classified example, we touch nothing. The procedure walks the dataset and applies this update at every error, until no error remains or the iteration budget runs out.

Proof that the update strictly increases the functional margin of the corrected example. We compute the new functional margin gamma hat i prime. Expanding the expression and using the fact that y i squared equals one, we find that gamma hat i prime equals the old gamma hat i plus eta times the squared norm of x i plus eta. Since eta is strictly positive and so is the squared norm, the update strictly increases the margin on the example we just corrected. No guarantee on the other examples, but on this specific one we make progress.

The Novikoff convergence theorem, nineteen sixty-two.

The zigzagging slider analogy. Picture a slider zigzagging around a target. Each correction brings it slightly closer to the target, but may push it past or back on another dimension. Yet if the target is surrounded by a buffer zone, the slider cannot zigzag forever without falling into it. The Novikoff theorem formalises exactly that intuition.

Statement. Let a dataset be linearly separable with geometric margin gamma strictly positive. Let capital R be the maximum norm of the examples. Then the total number of corrections of the perceptron, starting from zero weights, is bounded by R squared divided by gamma squared. The bound depends neither on the number of examples nor on the learning rate.

Proof in two lemmas. First lemma, we lower-bound the dot product of the current w with an optimal separator w star. At each update on a misclassified example, this dot product grows by at least gamma. So after capital T corrections, w dot w star is at least T gamma. Second lemma, we upper-bound the squared norm of w. At each update, the squared norm grows by at most R squared. So after capital T corrections, the squared norm of w is at most T R squared. Combining the two via Cauchy-Schwarz, we get T gamma less than or equal to the norm of w which is less than or equal to the square root of T times R. Squaring and simplifying by T yields T less than or equal to R squared over gamma squared. The procedure converges in finitely many steps.

Intuitive reading. The narrower the margin gamma, two very close classes, the bigger the bound and the slower the convergence. The larger the radius R, points far from the origin, the bigger the bound grows quadratically. But whatever the difficulty, the bound stays finite as long as gamma is strictly positive.

What if the dataset is not separable?

The Novikoff theorem makes a crucial assumption: there exists a linear separator with margin gamma strictly positive. What happens when that assumption fails? Rosenblatt's learning rule keeps correcting forever, never converges. The weight vector w oscillates indefinitely.

The classical fix is surprisingly simple: keep the best w, b ever seen in your pocket. After every update, evaluate the new w, b on the whole dataset, count the number of correctly classified examples, and if that number beats the pocket's count, replace it. At the end, you return the pocket content, not the last value. This procedure, the Pocket Algorithm, was introduced by Gallant in nineteen ninety. On a separable dataset it reduces to the standard perceptron. On a non-separable dataset it converges in probability to the separator that maximises the number of correctly classified examples. We lose the Novikoff guarantee, but we recover a procedure usable in practice.

The impossibility of XOR.

The impossible checkerboard analogy. Picture four squares of a chessboard: the diagonals alternate colours. No straight line can separate the whites from the blacks. That is exactly the situation of the XOR function.

Statement. The XOR function on two boolean variables, which equals one when exactly one of the two inputs equals one and zero otherwise, is not realisable by a single perceptron.

Proof by contradiction. We use the zero, one encoding and the Heaviside convention: output one if w dot x plus b is at least zero, zero otherwise. Suppose there exist weights w one, w two and a bias b that realise XOR. The four constraints read. For the point zero zero that must give zero: b strictly negative. For the point one zero that must give one: w one plus b at least zero. For the point zero one that must give one: w two plus b at least zero. For the point one one that must give zero: w one plus w two plus b strictly negative. Adding the two middle constraints: w one plus w two plus two b at least zero, so w one plus w two at least minus two b. From the last constraint: w one plus w two strictly less than minus b. Combining: minus two b less than or equal to w one plus w two strictly less than minus b, so minus two b strictly less than minus b, that is b strictly positive. Contradiction with the first constraint that required b strictly negative. No choice of weights and bias can solve XOR with a single perceptron.

Historical context. In nineteen sixty-nine, Minsky and Papert prove this impossibility formally in their book Perceptrons. Many wrongly conclude that neural networks are a dead end. Funding collapses. The fix, multi-layer networks, already existed in theory. We had to wait until nineteen eighty-six and backpropagation to train them efficiently.

In one sentence. The perceptron is the first neuron that learns, by geometric projection without a gradient. Its convergence is guaranteed on a separable dataset, but it cannot represent XOR. To solve it, we need to stack.

On to chapter five. XOR is not linearly separable, but we can write it as a composition of functions that are. XOR of x one and x two equals x one or x two, all and the negation of x one and x two. OR is separable, NAND is separable, AND is separable. Three perceptrons, two in a first layer, OR and NAND, then one in a second layer, AND, suffice to solve XOR. That is exactly what chapter five will formalise: stacking perceptrons in layers dramatically widens the class of functions the network can represent. In chapter five, a single neuron splits space in two, several neurons organised in layers split space into arbitrarily complex regions.
