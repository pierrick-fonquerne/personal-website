Chapter two. Vector algebra. To talk cleanly about stacked neurons and networks.

In chapter one, we wrote the neuron's formula in three forms: expanded, symbolic sum, and the compact vector form y equals f of w dot x plus b. This chapter lays down the foundations needed to understand that third form, then takes two more steps: the transpose and the matrix-matrix product, which will pave the way to multi-layer networks.

The vector, an ordered list of numbers.

A vector is simply an ordered list of numbers. We often denote it in bold lowercase, for example x equals x one, x two, x three. Each number is called a coordinate or a component. The total number of coordinates is called the dimension of the vector. Geometrically, in dimension two or three, we picture a vector as an arrow from the origin. Beyond three dimensions we no longer visualise, but the algebraic rules stay the same.

In machine learning, vectors are everywhere. The inputs of a neuron are a vector x. Its weights are a vector w of the same dimension. A grayscale image of twenty-eight by twenty-eight pixels becomes a vector of seven hundred and eighty-four numbers. A word in a language model becomes an embedding vector with hundreds of coordinates. Learn to see a vector as a single manipulable object, not as a separate collection of numbers.

The dot product.

The dot product of two vectors x and w of the same dimension is defined by: x dot w equals the sum, for i from one to n, of x i times w i. It is one number, a scalar, not a vector. It is also sometimes called the inner product or the scalar product.

Numerical example. Take the values from chapter one, in vector notation. It is exactly the same weighted sum as in chapter one, written this time in vector notation. The input vector is x equals one, zero, one. The weight vector is w equals zero point eight, zero point five, zero point nine. The dot product x dot w equals one times zero point eight, plus zero times zero point five, plus one times zero point nine, which gives one point seven. Adding the bias minus zero point five recovers z equal to one point two, just like in chapter one.

On the page, the interactive component draws two vectors x and w in the plane. Move the sliders and watch three things at once: the dot product changes, but so do the norms and the angle between them. When the angle gets close to ninety degrees, the dot product drops to zero. The vectors are then orthogonal.

Three experiments to try. Align the two vectors on the same direction: the dot product hits its maximum, equal to the product of the norms. Place them perpendicularly: the dot product is exactly zero. Flip the sense of w with negative coordinates: the dot product becomes negative, because the arrows point in opposite directions.

Cauchy-Schwarz, or why the geometric formula is legitimate.

Many courses present the formula x dot w equals the norm of x, times the norm of w, times the cosine of theta, as a second definition dropped from the sky. That is not honest. The right reading is the other way round: we define the dot product algebraically, we prove a fundamental inequality, and that inequality is what makes the geometric formula legitimate.

The Cauchy-Schwarz inequality says that the absolute value of x dot w is always less than or equal to the product of the norms. Equality holds only when x and w are colinear.

Proof by the discriminant, in four steps. Step one: assume w is non-zero, and look at the polynomial P of t equals the squared norm of x plus t times w. Since this is a squared norm, P of t is always non-negative. Step two: expanding using the squared-norm expansion, we get P of t equals the squared norm of x, plus two times t times the dot product x dot w, plus t squared times the squared norm of w. This is a second-degree polynomial in t with strictly positive leading coefficient. Step three: such a polynomial is non-negative everywhere if and only if its discriminant is non-positive. The discriminant equals four times the difference between the squared dot product and the product of the squared norms. Step four: the non-positive discriminant condition reads exactly squared dot product less than or equal to product of squared norms. Taking the square root yields the Cauchy-Schwarz inequality. Equality occurs when the discriminant vanishes, that is when x and w are colinear.

Now that we have this bound, we can divide safely and define the cosine of theta as the quotient of the dot product by the product of the norms. This quantity necessarily lies in the interval minus one to plus one, thanks to Cauchy-Schwarz. We can therefore identify it as the cosine of a unique angle theta between zero and pi. Rearranging gives back exactly the geometric formula x dot w equals norm of x, times norm of w, times cosine of theta. But this formula is no longer a mysterious postulate: it is a direct consequence of the algebraic definition and of Cauchy-Schwarz.

In dimension two, we easily check that this algebraic theta coincides with the Euclidean geometric angle: pick x along the first axis, write w in polar coordinates, and the direct calculation gives cosine of theta equals cosine of the geometric angle.

Norm and distance.

The norm of a vector x measures its length, and is defined as the square root of the dot product of x with itself. That is precisely the generalised Pythagorean theorem. The Euclidean distance between two vectors x and y is the norm of their difference. This is the distance that most machine learning algorithms try to minimise when comparing points.

Transpose and matrix product.

Before stacking neurons to form a layer, two matrix operations are still missing. The first one is the transpose. The transpose of a matrix A, written A T, is the matrix obtained by swapping its rows and columns. If A is of size m by n, then A T is of size n by m, and entry i, j of A T equals entry j, i of A. In practice, the transpose is used to line up dimensions when handling a batch of stacked examples: the layer then writes as X times W T, where each row of X is one example and each row of W is one neuron. This notation is everywhere in PyTorch and NumPy.

The second operation is the matrix-matrix product. For two compatible matrices A and B, meaning the number of columns of A equals the number of rows of B, the product A B is defined by: entry i, j of A B is the sum, for k from one to n, of entry i, k of A times entry k, j of B. In other words, every coefficient of the product is a dot product of a row of A with a column of B. The matrix product is therefore a table of dot products carried out in parallel.

A crucial property that comes back constantly: the transpose of a product equals the product of the transposes in reverse order. In other words, A B all transposed equals B transpose times A transpose. The proof fits in four lines: compare entries i, j of both matrices, unfold the product definition, recognise the transposed entries, and the order swaps naturally because those are the entries that share the summation index.

Stacking neurons.

A matrix is a rectangular array of numbers, arranged in rows and columns. A matrix of size m by n has m rows and n columns. It is often written in uppercase, for example capital W. A matrix can represent a stack of vectors: each row of W is the weight vector of a neuron.

The matrix-vector product lets us express an entire layer of m neurons in one operation. If W is the weight matrix, of size m by n, and x is the input vector of dimension n, then W x is a vector of dimension m, whose j-th coordinate is the dot product of the j-th row of W with x. That is, the weighted sum of the j-th neuron in the layer. Adding a bias vector b and applying the activation coordinate by coordinate yields the layer's output.

In one sentence. A vector is an ordered list of numbers, the dot product is their component-wise multiplication then sum, and thanks to the transpose and the matrix-matrix product, we can cleanly stack several neurons in one operation.

On to chapter three. We now have all the vocabulary to describe the linear operation of a neuron. And more importantly, thanks to the matrix-matrix product we just learned, we are about to discover something disturbing. If we stack two layers without an activation function, the first computes W one times x, the second computes W two times W one times x. Reassociating, this rewrites as W two times W one, the whole thing multiplied by x. That is a single matrix. Two layers collapse into one. This is the central theorem of chapter three, and on its own it justifies the existence of non-linear activation functions like sigmoid, ReLU and tanh, that you will learn to compare and choose between.
