Chapter two. Exact search and the curse of dimensionality. Comparing every vector gives the perfect answer, but it comes at a price, and high dimension sets a trap for our intuition that we need to understand before we can escape it.

In the previous chapter, we learned to turn meaning into a vector and to measure how close two vectors are. Now imagine a real engine: not two vectors, but millions. For each query, you would need, in principle, to scan them all. Two questions arise. Is that really a problem? And does our planar intuition, the one with arrows we can draw and point to, still hold when vectors live in a thousand dimensions?

Let us begin with the simplest and safest approach. You have a query vector and a database of millions of vectors. You want the closest ones. The obvious method: compute the distance from the query to every vector in the database, then keep the best. Finding the k closest elements to a query is called the nearest neighbor problem. And this method, comparing the query to everyone, is called exhaustive search, or linear scan, or a flat index in the vocabulary of vector databases.

It has one quality nothing else will ever fully match: it is exact. Since it examines every vector, it cannot miss any neighbor. The ranking it returns is the truth. Hold on to that word, truth. From chapter 3 onwards we will look for faster methods that accept being slightly wrong. To know how wrong, we will need a perfect reference. That reference is exhaustive search. We say it serves as an oracle.

Now for the wall. To compare the query to one vector of dimension d, we traverse all d coordinates: on the order of d operations. We repeat for all n vectors. The total cost of one query is therefore proportional to n times d, written big O of n times d. Put in realistic numbers. Ten million documents, embeddings of dimension fifteen hundred and thirty-six: one single query needs roughly fifteen billion multiplications. At one thousand queries per second, the math is brutal.

The course thread is a vector engine that does implement exhaustive search, precisely because it is exact. Not to serve production queries, but to act as a test oracle: ask it for the truth, then check that a fast index does not stray too far from it. A slow but exact index is never useless. It is the judge of all the others.

Now for the second wall, the more insidious one. You might think the only problem is cost, and that being smarter, building a shortcut structure, would be enough. That is the hope of the chapters ahead. But before getting there, we need to understand why being smart is so difficult. The reason has nothing to do with the speed of machines. It lies in the geometry itself.

In the plane or in three-dimensional space, our intuition works. There are close points and distant points, dense regions and sparse ones. Finding the nearest neighbor has a clear meaning. In high dimension, that intuition breaks. The set of phenomena that arise carries a name: the curse of dimensionality. Two of them alone decide the difficulty of all vector search.

The first is distance concentration. Draw random points and measure their distances to a reference point. In high dimension, those distances all look alike. The nearest is barely closer than the farthest. The very notion of nearest neighbor becomes blurry.

The second is quasi-orthogonality. Two vectors drawn at random in high dimension are almost always perpendicular, meaning their cosine similarity is close to zero. Space is so vast that two random directions almost never share anything in common.

Both claims sound surprising. In the component, you can slide the dimension from one up to a thousand and watch two histograms transform. The left tab shows distances to a query point; the right tab shows cosines between pairs. At low dimension the histograms are wide. As dimension climbs they narrow and squeeze together, concentrating around a single value.

Why does this happen? The explanation is elegant and fits in a few lines. The squared distance between two random points is a sum of d independent terms, one per dimension. A sum of many independent terms has a mean that grows like d and a standard deviation that grows only like the square root of d. When you form the ratio of the standard deviation to the mean, the relative spread, you get a constant times one over the square root of d. As dimension explodes, that factor crushes everything: the relative spread tends to zero.

In words: all distances grow together, but their gap relative to their size disappears. The cloud of all distances shrinks to a thin shell around a common value. Nearest and farthest become almost indistinguishable. Not a bug in the machines or the data: a theorem about geometry in high dimension.

The same argument applies to angles. The dot product of two random zero-mean vectors is also a sum of d terms with zero mean. Divide by the norms, which grow like the square root of d, and the cosine concentrates around zero with a spread that shrinks like one over the square root of d. That is the bell tightening in the cosine tab.

To put a number on it: that spread is about three hundredths in dimension one thousand, which corresponds to an angle barely two degrees away from a right angle. In other words, in the space where real embeddings live, two directions drawn at random are almost always perpendicular.

So what do we do when we cannot trust distances to guide us? We need a quality measure for imperfect search. The most common is recall at k. The principle is direct. Ask exhaustive search for the k true nearest neighbors: that is the ground truth. Ask the fast method for its k best results. Recall at k is the fraction of the ground truth the fast method recovered. A recall at k of one means nothing was missed. A recall at k of zero point nine means one neighbor in ten slipped through. That number will follow us to the end of the course: every time we gain speed, we will ask what it costs in recall.

The two exercises in the chapter are worth doing with a pencil. One asks you to compute the total number of multiplications for a database of two million vectors in dimension seven hundred sixty-eight, at five hundred queries per second. The other walks you through computing a recall at three by hand, given a ground truth and a fast result list.

In one sentence. Exhaustive search is exact and serves as an oracle, but its cost in n times d and the curse of dimensionality, which concentrates distances and makes random vectors quasi-perpendicular, force us to build faster indexes whose error we will measure by recall at k.

Towards chapter three. We know two uncomfortable truths: scanning everything is too slow, and high dimension blurs proximity itself. The next chapter asks: what if vectors were linked by a network of shortcuts, so that starting from any point and always moving towards a neighbor closer to the query, you arrive near the goal in just a few hops? That navigable network exists. It is called HNSW, and it turns a linear scan into a stroll of a few steps. See you there.
