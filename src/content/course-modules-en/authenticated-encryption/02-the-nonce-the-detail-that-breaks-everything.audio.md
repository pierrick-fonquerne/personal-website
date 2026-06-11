Chapter two. The nonce: the detail that breaks everything. Vital uniqueness, random versus counter, birthday bound and constant time: why the least secret number in the system is also the most dangerous.

In the previous chapter, you saw that AEAD guarantees confidentiality and integrity in a single operation, provided its parameters are used correctly. The nonce is one of those parameters. And its usage constraint is absolute.

In two thousand and sixteen, researchers published what they called the Forbidden attack against AES-GCM. The attack does not break the algorithm. It exploits a single usage error: reusing the same nonce with the same key. The result: not only are both messages partially exposed, but the internal authentication key, the GHASH key derived from the hashing polynomial of GCM, can be reconstructed by the adversary. Once the GHASH key is known, integrity collapses entirely. The adversary can forge valid tags for any message.

By the end of this chapter, you will be able to explain why nonce uniqueness is a security constraint and not a convention, demonstrate what reuse reveals via the two-time pad intuition, distinguish between random and counter strategies for nonce generation, and understand why tag comparison must be performed in constant time.

To follow this chapter, you need to have read module one of this course, in particular the notions of AEAD and authentication tag. You also need a notion of XOR as a bitwise operation. Galois polynomials and the internal construction of GCM are not required.

The nonce.

The nonce, short for number used once, is a value transmitted in plaintext with each encrypted message. Its role is precise: to guarantee that two encryptions of the same plaintext with the same key produce different ciphertexts.

What matters is not its confidentiality, but its uniqueness. A nonce can be read by anyone on the network without affecting security. However, using the same nonce twice with the same key, even for two distinct messages, breaks fundamental guarantees.

AES-GCM uses a ninety-six-bit nonce. XChaCha20-Poly1305 uses a one-hundred-and-ninety-two-bit nonce. These differences have concrete consequences for how nonces are generated.

Reuse: the catastrophe.

The two-time pad intuition.

To understand why nonce reuse is catastrophic, it is enough to look at what a stream cipher does. A stream cipher generates a pseudo-random stream from the key and the nonce. The plaintext is XORed with this stream.

If two messages are encrypted with the same nonce and the same key, their ciphertexts XORed together give directly the XOR of the two plaintexts. The keystream cancels out. If one of the two messages is known or guessable, such as a fixed protocol header, the other is immediately recoverable.

On the page, an interactive component illustrates this mechanism. Edit the two messages and observe how the XOR of the ciphertexts directly reveals the combination of the plaintexts. Modify the first message to resemble a known header, and watch what the recovered field displays for the second.

The Forbidden attack: when integrity collapses too.

Plaintext leakage is only the first consequence. In AES-GCM, the authentication tag is computed via a polynomial function parameterised by an internal key called H. If two messages encrypted with the same nonce and the same key are observed, an adversary can construct a system of equations over H and solve it. Once H is known, they can forge a valid tag for any ciphertext of their choice.

Nonce reuse does not degrade AES-GCM security: it annihilates it.

Random versus counter.

Two main strategies exist for generating unique nonces. They have very different risk profiles.

The random nonce.

Drawing a nonce uniformly at random from a sufficiently large space makes collisions negligible. XChaCha20-Poly1305 uses a one-hundred-and-ninety-two-bit nonce: it would take on the order of two to the sixty-four messages encrypted under the same key for the collision probability to reach only two to the minus sixty-five, a negligible risk at any real-world scale. These nonces can be generated with a secure cryptographic generator without any coordination between parties.

AES-GCM with its ninety-six-bit nonce is more constrained. The birthday bound tells us that the collision probability grows approximately as the square of the number of nonces generated divided by the space size. After two to the thirty-two messages, roughly four billion, the collision probability with a random ninety-six-bit nonce becomes concerning in high-throughput systems. The NIST recommendation limits the use of a single AES-GCM key to two to the thirty-two messages with random nonces.

A note on the birthday bound. If a room contains twenty-three people drawn at random, the probability that two of them share the same birthday exceeds fifty percent. The same phenomenon applies to nonces: the collision probability is proportional to the square of the number of nonces generated, not to the number itself. Doubling the message volume multiplies the risk by four.

The counter nonce.

A monotone counter guarantees uniqueness without a probabilistic limit: each value is distinct by construction. This is the recommended strategy for AES-GCM in deterministic systems, with a single producer, a single key, and persistent state.

The fragility is operational. The counter must survive restarts, be unique per instance in a distributed system, and its limit must trigger a key rotation. In a distributed system where two nodes each maintain their own counter starting at zero, they will inevitably produce the same nonce values for different messages.

The design rule: a guarantee that rests on a usage condition must be made impossible to violate by construction, not entrusted to human discipline.

Constant time.

Tag verification at open must be performed in constant time: the execution time must not depend on the values being compared.

A naive comparison, byte by byte with return on the first difference, creates a timing side channel. An adversary who can measure a server's response time gains information: if the rejection arrives faster, the first bytes of the tag are incorrect. By repeating enough attempts, they can reconstruct the valid tag byte by byte, without ever knowing the key.

The defence: compare both tags via an XOR of all bytes, then check that the cumulative result is zero, with no early conditional branching.

ChaCha20 is designed to depend only on additions, rotations, and XOR. These operations have an execution time that does not vary with the data. AES in pure software, without AES-NI instructions, uses substitution tables accessed in memory. The processor cache can reveal which entries were accessed, creating a side-channel leak. With AES-NI, the hardware instructions are constant time by construction.

Choosing a primitive.

AES-GCM is preferable when the environment has AES-NI: x86-64 servers, modern ARM processors with cryptographic extensions. Performance is excellent and constant time is guaranteed by hardware. The main constraint is managing the ninety-six-bit nonce in high-throughput or distributed systems.

ChaCha20-Poly1305 is preferable in environments without hardware acceleration: older mobile devices, microcontrollers, WASM, native JavaScript. Constant time is ensured by algorithmic construction. The one-hundred-and-ninety-two-bit nonce of XChaCha20 simplifies management by allowing random generation without practical limits.

In both cases, cryptographic agility recommends encapsulating the choice of primitive in an abstraction layer, to allow migration without rewriting if a vulnerability is discovered.

TLS 1.3 mandates AES-one-hundred-and-twenty-eight-GCM, AES-two-hundred-and-fifty-six-GCM, and ChaCha20-Poly1305 as the only symmetric cipher suites. The CBC suites from previous versions, the source of many vulnerabilities such as POODLE and Lucky13, have been removed.

Key takeaways.

The nonce travels in plaintext. What matters is not its confidentiality, but its absolute uniqueness per key-nonce pair.

Reusing a nonce with the same key cancels the keystream: the two ciphertexts XORed together give directly the XOR of the two plaintexts. If one message is known, the other is recoverable.

In AES-GCM, reuse also allows reconstructing the GHASH key and forging valid tags. This is the Forbidden attack of two thousand and sixteen.

AES-GCM with a ninety-six-bit nonce requires a well-managed counter in distributed contexts. The birthday bound limits random nonces to roughly two to the thirty-two messages per key.

XChaCha20-Poly1305 with a one-hundred-and-ninety-two-bit nonce allows random generation without practical limits.

A guarantee that rests on a usage condition must be made impossible to violate by construction, not entrusted to human discipline.

Tag verification must be performed in constant time to eliminate the timing side channel. ChaCha20 is constant time by construction. AES-NI is constant time by hardware. Pure software AES can create cache leaks.
