Chapter one. The artificial neuron. From biological to mathematical, what really happens inside the elementary brick of a network.

Every neural network, from the simplest to the deepest, is an assembly of one elementary brick repeated by the millions. That brick, the artificial neuron, has nothing magical about it. It is an equation with three ingredients, inspired by a biological cell hundreds of millions of years old.

By the end of this chapter, you will be able to answer three questions: what exactly does an artificial neuron compute, where does the idea come from, and why does a lone neuron carry a limitation that modern networks had to overcome.

To follow along, you need to know how to add and multiply, you need the notion of a single-variable function, and a bit of two-dimensional geometric intuition: a point in a plane, a line, one side or the other of a line. No differential calculus at this stage, no formal linear algebra, no programming.

The biological inspiration.

Your brain contains about eighty-six billion neurons. Each neuron receives electrical signals from its neighbours through its dendrites, integrates those signals in its cell body, and decides, based on an internal threshold, whether to send a signal along its axon. In nineteen forty-three, Warren McCulloch and Walter Pitts model this behaviour with an equation. It is not a faithful copy of biology. It is a mathematical simplification that turns out to be powerful.

The referee analogy.

Picture a football referee deciding whether a foul deserves a penalty. He weighs several pieces of information, each more or less important depending on context. The hand touched the ball: weight zero point eight. Inside the penalty area: weight zero point five. Deliberate gesture: weight zero point nine. The referee mentally computes a weighted sum: he adds the pieces of information after multiplying each by its importance. If the total clears a threshold, he whistles. That is exactly what an artificial neuron does.

Play with a neuron.

On the page, the interactive component lets you drag sliders for three inputs labelled x one, x two, x three, their three weights w one, w two, w three, and a bias b. With the default values, x one equals one, x two equals zero, x three equals one, weights zero point eight, zero point five, zero point nine, and a bias of minus zero point five, the weighted sum, noted z, equals one times zero point eight, plus zero times zero point five, plus one times zero point nine, minus zero point five. That gives one point two. The output y is the sigmoid applied to one point two, about zero point seventy-seven.

Three things to notice while playing. An input at zero cancels the contribution of its weight, no matter the weight's value. Increasing a weight amplifies the influence of its input; flipping it negative reverses the effect. The bias shifts the output independently of the inputs. A very negative bias makes the neuron very hard to activate.

Historical note. The original McCulloch and Pitts neurons in forty-three and Rosenblatt's perceptron in fifty-eight used a binary threshold function: output one if the sum clears zero, output zero otherwise. No nuance. On the page, a selector above the diagram lets you flip live between the sigmoid and the Heaviside function, that binary threshold. With the starting configuration, the sigmoid gives about zero point seventy-seven, the threshold snaps straight to one. Move the sliders to find the zones where the threshold switches output: you will see the all-or-nothing behaviour of the historical neuron. The shift to the sigmoid, then later to ReLU, is historically tied to backpropagation in eighty-six, which requires a differentiable activation to propagate the gradient. The sigmoid gives you a smoother intuition here, but the simplest neuron, mathematically, is the threshold one.

While we are here, let us introduce a notation that will be useful soon. For a logical condition P, we write one with square brackets P for the indicator function of P: it equals one if P is true, zero otherwise. In particular one with brackets z greater or equal to zero is exactly the Heaviside function, sometimes written H of z, which we have just seen as the activation of the original neuron. This notation will come back in the formal proof that closes this chapter.

The mathematical formula.

The neuron's operation reduces to a single equation. With three inputs x one, x two, x three, three weights w one, w two, w three, and bias b, the weighted sum, noted z, equals: x one times w one, plus x two times w two, plus x three times w three, plus b. We then apply the activation function f to that sum to obtain the output y. With n inputs, this is often written with a sum symbol: z equals the sum, for i from one to n, of x i times w i, plus b. And in compact vector notation, y equals f of w dot x plus b, where the central dot stands for the dot product. These three notations say the same thing at increasing levels of abstraction. Learn to recognise all three; you will see them everywhere.

Essential vocabulary. The x i are the neuron's inputs, its observations of the world. The w i are the weights, the importance assigned to each input. b is the bias, an additive term that shifts the output. f is the activation function, which injects non-linearity. And z is the pre-synaptic activation, before passing through f.

The linear separation problem.

Consider just two inputs. When z is strictly positive, the neuron fires. When z is negative, it does not. The boundary between the two regions, where z equals zero exactly, is a line in the plane: the equation w one x one plus w two x two plus b equals zero is the equation of a line. So a single neuron draws a line and classifies each point by which side of the line it sits on. That is enough for linearly separable problems, like the AND gate: there is a line that isolates the one-one point from the other three. But for XOR, with positive cases on the diagonal, no line separates positives from negatives.

The interactive viewer lets you try by hand. Move the sliders to tilt and shift the line. On AND and OR, you can reach four correctly classified points out of four. On XOR, never. One point is always on the wrong side. That is exactly what Minsky and Papert proved formally in nineteen sixty-nine. Geometrically, a neuron is a line; XOR demands a non-linear boundary. The fix will come from multi-layer networks, which compose several lines to draw richer boundaries.

The role of the bias, visually. Without bias, the line drawn by the neuron must pass through the origin. That is a strong constraint: most real-world problems have a decision boundary that does not sit at the origin. The bias fixes that by translating the line anywhere in the plane. Mental image: weights control the orientation of the line, its slope; the bias controls its position.

In one sentence. An artificial neuron computes a linear combination of its inputs, adds a bias, and passes the whole thing through a non-linear function. That is it. The power comes from what we do with them once we stack them and train them.

On to chapter two. You saw that the neuron's formula also reads in the compact form y equals f of w dot x plus b. That vector notation is everywhere in deep learning. What is a vector exactly? What does the central dot between w and x mean? Chapter two lays down those linear-algebra foundations, staying strictly useful for the rest of the course.
