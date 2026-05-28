Foreword. Why neural networks, what problems they solve, and how to read this course.

In two thousand and twelve, a program called AlexNet cut by half the error rate of the world's best image recognition system. Since then, neural networks have infiltrated translation, vision, assisted driving, medical prediction, and the generation of images and text. This course teaches you what really happens inside that technology, which is now reshaping so many fields.

Thirteen chapters, about three and a half hours of reading. No programming language required. The only prerequisite: being able to read a simple equation without panicking.

What neural networks can do today.

Without claiming to be exhaustive, here are the use cases where they truly changed the game. In computer vision, they recognise a cat, segment a tumour on an MRI, drive a car. The error rate on the ImageNet dataset dropped from twenty-six percent in two thousand and eleven to under four percent in two thousand and twenty. In machine translation, DeepL and Google Translate were modernised by transformers from two thousand and seventeen onward. Quality is now indistinguishable from a human on major language pairs. In text understanding and generation, you have conversational assistants like GPT, Claude, Gemini, Mistral, automatic summarisation, assisted programming. All of them rest on the transformer architecture. In image and sound generation, you have Stable Diffusion, Midjourney, DALL-E, and text-to-speech models. Photorealism is indistinguishable on some domains. In games and planning, AlphaGo beat the world's go champion in two thousand and sixteen, and AlphaFold predicts the three-dimensional structure of proteins since two thousand and twenty-one. The common thread of all these systems: they are assemblies, sometimes massive, up to billions of parameters, of the elementary brick you will study in chapter one.

What they cannot do yet.

Important so you do not buy into the hype. First, formal reasoning. A network can solve a quadratic equation after training, but it does not understand why the formula is what it is. It interpolates, it does not deduce. Second, learning from few examples. A human recognises a cat after seeing three. A classical network needs thousands. Third, generalisation out of distribution. A network trained on daylight images stumbles on the same objects photographed at night. Fourth, hallucinations. Language models sometimes produce false statements with full confidence. This is a structural flaw of their training, not a bug. And finally explainability. A deep network classifies correctly, but explaining why it classified that way is still an open research problem.

AI is not magic. The marketing often exaggerates capabilities. Understanding the mathematical foundations this course gives you is the best antidote to commercial discourse. You will see that a neural network is essentially stacked linear combinations and non-linear functions, not a form of consciousness.

Three phases in an eighty-year story.

To place what we study in time. The initial dream, from nineteen forty to nineteen sixty. McCulloch and Pitts model the neuron in forty-three. Rosenblatt makes the perceptron learn in fifty-eight. People think artificial thinking is just around the corner. Then the two winters, from sixty-nine to eighty-six, then from ninety-five to two thousand and ten. Minsky proves the perceptron's limits in sixty-nine, the Lighthill report cuts funding in seventy-three. A short respite in the eighties with backpropagation. New slowdown when support vector machines take over. Finally, the renaissance, from two thousand and twelve. ImageNet, GPUs and large datasets trigger the explosion. AlexNet in twelve, transformers in seventeen, foundation models from twenty onward.

The thirteen-chapter journey is organised in four progressive blocks. Block one, conceptual foundations: the artificial neuron, vector algebra, activation functions, the perceptron. Everything needed to understand a single brick. Block two, from brick to network: stacking neurons in layers, forward pass, cost functions. Block three, learning: derivatives and the chain rule, backpropagation, gradient descent. This is the mathematical heart of the field. Block four, optimisation and generalisation: regularisation, initialisation and batch normalisation, advanced optimisers. What makes the difference between a network that works in theory and one that works in practice.

How to read this course. First reading, linear order: read chapters one through twelve in order. Each chapter builds on the previous one. If you already know linear algebra, you can skim chapter two. If you are mainly after backpropagation, make sure chapters one, two, five, six, and seven are solid before tackling chapter eight. Every chapter offers a self-corrected quiz and at least two pencil-and-paper exercises with worked solutions. Play the game: putting pen to paper radically changes what sticks.

The interactive blocks are not decorative. Spend three minutes playing with the parameters before moving on. You will learn faster than by prose alone.

In one sentence. Modern neural networks are massive assemblies of an old elementary brick. This course gives you the exact mathematical mechanics, without hiding the derivations and without asking for background you do not have.

Everything starts with the brick. How a biological neuron inspired an equation. Why that equation alone is enough for simple problems, and why it fails on XOR. That is the topic of the next chapter.
