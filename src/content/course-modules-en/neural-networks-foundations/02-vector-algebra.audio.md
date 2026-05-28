Chapter two. Vector algebra. To talk cleanly about stacked neurons and networks.

In chapter one, we wrote the neuron's formula in three forms: expanded, symbolic sum, and the compact vector form y equals f of w dot x plus b. This chapter lays down the foundations needed to understand that third form and to pave the way for multi-layer networks.

The vector, an ordered list of numbers.

A vector is simply an ordered list of numbers. We often denote it in bold lowercase, for example x equals x one, x two, x three. Each number is called a coordinate or a component. The total number of coordinates is called the dimension of the vector. Geometrically, in dimension two or three, we picture a vector as an arrow from the origin. Beyond three dimensions we no longer visualise, but the algebraic rules stay the same.

In machine learning, vectors are everywhere. The inputs of a neuron are a vector x. Its weights are a vector w of the same dimension. A grayscale image of twenty-eight by twenty-eight pixels becomes a vector of seven hundred and eighty-four numbers. A word in a language model becomes an embedding vector with hundreds of coordinates. Learn to see a vector as a single manipulable object, not as a separate collection of numbers.

The dot product.

The dot product of two vectors x and w of the same dimension is defined by: x dot w equals the sum, for i from one to n, of x i times w i. It is one number, a scalar, not a vector. It is also sometimes called the inner product or the scalar product.

Numerical example. Take the values from chapter one, in vector notation. The input vector is x equals one, zero, one. The weight vector is w equals zero point eight, zero point five, zero point nine. The dot product x dot w equals one times zero point eight, plus zero times zero point five, plus one times zero point nine, which gives one point seven. That is the weighted sum of the neuron, without the bias. Adding b equal to minus zero point five gives z equal to one point two, just like in chapter one.

On the page, the interactive component draws two vectors x and w in the plane. Move the sliders and watch three things at once: the dot product changes, but so do the norms and the angle between them. When the angle gets close to ninety degrees, the dot product drops to zero. The vectors are then orthogonal.

Three experiments to try. Align the two vectors on the same direction: the dot product hits its maximum, equal to the product of the norms. Place them perpendicularly: the dot product is exactly zero. Flip the sense of w with negative coordinates: the dot product becomes negative, because the arrows point in opposite directions.

Geometric intuition. There is an equivalent second formula for the dot product: x dot w equals the norm of x, times the norm of w, times the cosine of the angle theta between them. Norms measure the lengths of the arrows, and the cosine of the angle equals one when they point in the same direction, zero when they are perpendicular, and minus one when they are opposite. It is the same quantity as the algebraic definition sum x i w i. Both give the same number, seen from two different angles. Importantly, the geometric formula intuitively explains why a neuron classifies based on the orientation of its weights relative to its inputs.

The Cauchy-Schwarz inequality. The absolute value of x dot w is always less than or equal to the product of the norms. Equality holds only when x and w are colinear, meaning they point in the same direction or opposite directions. This inequality shows up everywhere in optimisation and statistical analysis. Roughly: the dot product cannot exceed the product of the lengths.

Norm and distance.

The norm of a vector x, written double-bar x double-bar, measures its length. Its usual definition, the Euclidean or two-norm: the norm of x equals the square root of the sum of the squares of its coordinates. That is precisely the generalised Pythagorean theorem. The Euclidean distance between two vectors x and y is simply the norm of their difference: the distance from x to y equals the norm of x minus y. This is the distance most machine learning algorithms try to minimise when comparing points.

Toward matrices: stacking neurons.

A matrix is a rectangular array of numbers, arranged in rows and columns. A matrix of size m by n has m rows and n columns. It is often written in uppercase, for example capital W. A matrix can represent a stack of vectors: for instance each row of W is the weight vector of a neuron.

The matrix-vector product lets us express an entire layer of m neurons in one operation. If W is the weight matrix, of size m by n, and x is the input vector of dimension n, then W x is a vector of dimension m, whose j-th coordinate is the dot product of the j-th row of W with x. That is, the weighted sum of the j-th neuron in the layer. Adding a bias vector b and applying the activation coordinate by coordinate yields the layer's output. This operation, W x plus b followed by activation, is what gets repeated at every layer of a network in chapter five.

In one sentence. A vector is an ordered list of numbers, the dot product is their component-wise multiplication then sum, and a matrix lets us stack several neurons in one operation.

On to chapter three. We now have the vocabulary to describe the linear operation of a neuron. But without the activation function, a stack of neurons collapses into a single linear combination and loses all of its power. Chapter three shows you exactly which activation functions we use, why, and the vanishing-gradient trap that held deep learning back for decades.
