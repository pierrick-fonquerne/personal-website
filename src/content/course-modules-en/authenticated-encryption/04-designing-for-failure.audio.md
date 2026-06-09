Chapter four. Designing for failure. Authenticate before parsing, opaque errors, trust boundaries: how the way a system fails determines its security.

In module one, you saw that a padding oracle allowed an adversary to reconstruct a plaintext byte by byte, without ever knowing the key. What the adversary exploited was not the algorithm. It was the system's behaviour on failure: two distinct responses depending on the cause of the rejection. This observable distinction was the oracle.

AEAD eliminates padding oracles by removing from the adversary any information about the result of decryption. But a system that correctly uses an AEAD algorithm can still recreate an oracle, through the way it fails, parses, or validates incoming bytes. Design errors at this level annul cryptographic guarantees.

This module examines the rules that close these flaws. It is the final module of the course: the principles that follow build on the previous modules. Integrity and confidentiality from module one. Nonce uniqueness from module two. Context binding from module three.

Prerequisites and level.

To follow this module, you need the three previous modules: AEAD, authentication tag, nonce, associated data. No knowledge of the mathematics of primitives is required. Rules are formulated precisely and illustrated with concrete counterexamples.

Authenticate before parsing.

The rule is absolute: verify the tag before touching a single byte of the ciphertext.

The order seems obvious once stated. But violations are common. A system that parses encrypted bytes before verifying their authenticity exposes its parsing logic to data entirely controlled by the adversary. Every conditional branch in that parser becomes a potential leak.

Consider an example. A service receives an encrypted API request whose first field is a payload length. If the service reads this field and allocates a buffer of the announced size before verifying the tag, an adversary can send an arbitrary length value and observe whether the allocation succeeds or fails. The parser has processed unauthenticated data. The adversary has gained information.

Tag verification is a precondition. Not one step among others in the processing pipeline.

A correct AEAD scheme already applies this principle in its open operation. The tag is verified first. If verification fails, no plaintext byte is returned. The rule extends to the application layer: even after a successful open, the obtained plaintext must be treated as data from an external source until its content is validated.

Parse, don't validate.

Once the tag is verified, the plaintext bytes are authentic, but they can still be malformed. The "parse, don't validate" rule says: transform raw bytes into well-typed values at the input boundary, once, so that the rest of the code cannot receive malformed data.

The distinction is precise. To validate is to check that data satisfies a condition and continue manipulating the raw data if the condition is true. To parse is to construct a typed representation from the raw bytes, and return an error if construction fails.

The advantage of parsing is structural: once the boundary is crossed, types guarantee data consistency by construction, not by repeated checking.

The opaque error.

A system that fails in multiple observable ways is an oracle. The design consequence is direct: a single failure mode, with no exploitable information.

What this means in practice.

A single error message. "Decryption failed" covers all cases: invalid tag, malformed nonce, missing associated data, corrupted data. Distinguishing these cases in the returned message allows an adversary to know what failed and why.

A single return code. Same logic for status codes. Any observable distinction between failure causes is a leak.

A constant response time. As seen in module two with constant-time tag comparison, a difference in processing time between two failure causes is a side channel. A rejection arriving in two milliseconds and a rejection arriving in twenty milliseconds are two distinct messages for an adversary who can measure.

The opaque error applies to internal logs as well: a detailed log accessible via an external interface can become a leak. Internal logs can be precise; what is returned to the client must not be.

Note: security as adversarial review.

Design flaws in failure handling are difficult to find by positive inspection. They are revealed by adversarial review: for each execution path, ask "what does the adversary observe if this path is taken?". The question "what happens if the tag is invalid?" must have the same observable answer as "what happens if the nonce is malformed?". If the answers differ in any observable way, the system has an oracle.

Trust boundaries.

A trust boundary is the point where uncontrolled bytes enter the system. Everything that comes from outside this boundary is hostile by default.

In a system using AEAD, the trust boundary is the open operation: what arrives before the open is unauthenticated, what comes out of a successful open is authenticated.

Validate in both directions. The seal must verify that the fields included in the associated data are well-formed. If the sender includes a recipient identifier without validating that it corresponds to an existing recipient, the ciphertext can be forged with an invalid identifier, and the recipient will only detect the error after decryption.

Treat everything from the outside as hostile. This includes the encrypted bytes, but also the metadata accompanying them: an HTTP header, a session identifier transmitted separately, a URL parameter. These values must be validated independently.

The cryptographic layer is not the only line of defence. AEAD guarantees that an authenticated message has not been altered. It does not guarantee that the message was correctly constructed by a legitimate sender. Application-level validations after the open remain necessary.

The diagram on the page illustrates the structural difference between the correct order and the incorrect order. In the correct order, the adversary cannot influence the parser's behaviour, because the parser only receives data whose authenticity has already been established. In the incorrect order, every branch of the parser is potentially observable by the adversary, who entirely controls the bytes presented.

The pattern to retain.

Touch no byte you have not authenticated. A single failure mode, with no exploitable detail.

These two rules reinforce each other. The first closes the oracle the parser could create. The second closes the oracle the error mechanism could create. Together, they ensure that the observable behaviour of the system on failure is constant: a rejection, a single way, with no information about the cause.

Key takeaways.

A system can correctly use an AEAD scheme and still create an oracle through its failure logic. What the adversary observes on failure is an attack surface as real as the algorithm itself.

Verify the tag before touching a single byte. Verification is a precondition, not one step among others. Any parser that runs on unauthenticated bytes is exposed.

Parse, don't validate: transform raw bytes into well-typed values at the input boundary, once. What crosses the boundary is usable. What fails to cross it is rejected without partial processing.

A single failure mode, with no exploitable information: same error message, same return code, same processing time, regardless of the cause of rejection. An observable difference is an oracle.

Constant-time tag comparison is an instance of this general rule. Response time is observable information.

Everything from the outside is hostile by default: validate context fields at seal and open, do not assume the cryptographic layer replaces application-level validations.

The four modules form a whole. AEAD guarantees integrity and confidentiality, provided the nonce is unique, the context is bound to the ciphertext, and the system fails without giving an adversary an oracle. Each layer is necessary. None replaces the others.

This concludes this course on authenticated encryption. Cryptographic tools are sound when their usage contracts are respected. What you have learned here is as much a way of reasoning about systems as a list of rules: ask what the adversary observes, at each step, at each failure.
