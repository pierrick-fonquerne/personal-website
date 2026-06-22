Foreword. Searching by meaning, not by characters.

You type the word car into a search engine, and a document that only talks about an automobile slips right through your fingers. Yet they mean the same thing. The engine was not looking for meaning, it was looking for a sequence of characters, and to it those two words have nothing in common. This course fixes exactly that flaw.

We are going to learn how to search by meaning. To do that, we first need to turn text into a geometric object, a point in a space, so that two texts with similar meaning become two nearby points. This object has a name, the embedding, and it is the first building block of everything else.

There are two broad ways to search, and the whole course lives in the tension between them. The first is lexical search, where you compare words and characters. It is fast, exact, and unbeatable for finding a precise identifier or a rare word, but it is blind to synonyms: car and automobile are strangers to it. The second is semantic search, where you compare meanings. It finds automobile starting from car, and even a reworded question starting from its familiar words. Its price is that you have to represent meaning as numbers, and accept that you are no longer looking for an exact match but for proximity.

This second way has exploded for a very concrete reason. Language models need, in order to answer correctly, to be handed the right passages from a large body of documents. This marriage between meaning-based search and a model that writes has a name, RAG, and it is the destination of this course.

A word about prerequisites. To follow along, you need to know what a vector is, that is, an ordered list of numbers, and to have the idea that a neural network learns from examples. Both notions come from the course on the foundations of neural networks, which is the natural prerequisite for this one, because it is a network that produces the embeddings we will use. You do not, however, need to know any particular vector database, nor advanced linear algebra, which we will introduce as we go.

The course follows a simple thread, in three blocks. The first block learns to represent meaning and to measure proximity between two vectors, then confronts exact search and the wall it crashes into when vectors number in the millions. The second block gives up exactness to gain speed, with the HNSW graph, the landscape of index families, and above all the tool that tells you whether an approximate index is good or silently lying. The third block makes the index durable without corrupting it on the first crash, marries it to lexical search, and finally connects it to a language model.

In one sentence. Searching by meaning means representing each text as a point in a space, measuring proximity between those points, then building all the tooling that lets you retrieve the closest ones at scale, quickly and without mistakes.

Towards chapter one. Everything starts from an almost philosophical question. If meaning must become a position in space, then what exactly is a position, and how do we measure that two positions are close. Should a perfectionist but distant word beat an approximate but very close one. That is where, in the geometry of similarity, chapter one begins.
