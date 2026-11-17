Research journal. Why a single neuron is enough to settle persistence. Three points that were still open, and one rule to close them.

Today I closed the three points that were still open in the refutable model of the living and persistent neuron. The guiding thread was the same throughout: choose the leanest form that might be enough, then try to break it.

The first point is where forgetting comes from. On a single unit, there is no network where a memory can hide. So forgetting can only come from one thing: the same weights encoding both the first pattern and the second. That is why the overlap of afferences between the two patterns, meaning the share of inputs they have in common, becomes the real variable of the experiment, not a detail. We sweep it from zero to one, and we read a retention curve rather than a single verdict.

The second point is the neuron's signature. It is only useful if it does not drift with the weights. So I fix it as a slow state that steers the sleep replay toward events consistent with what the neuron is. The chosen form is minimal: a vector of slow afferent traces. It scores the episodes of the journal, but it does not regenerate the pattern, and that is exactly what prevents winning by cheating.

The third point is the unbounded journal. Keeping everything has a cost, and I accept it. The full journal serves as an upper bound, a kind of oracle, and I measure its cost so that each retention can be read against its price. So the question is not whether it is free, but how much a buffer of limited size recovers at equal compute. A cost that grows with the length of the experiment is the condition of the experiment, not a flaw to hide.

One question remains open: choosing the form of the next brick, a concept page you can play with, or Rust code written under test-driven development. The teaching side of replay, the Proustian madeleine, will come with it.

In one sentence. On a single neuron, forgetting can only come from shared weights, the signature anchors replay without cheating, and the full journal is a yardstick whose price is measured honestly.
