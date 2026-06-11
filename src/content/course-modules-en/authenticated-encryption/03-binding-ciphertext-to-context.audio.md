Chapter three. Binding ciphertext to its context. Associated data, domain separation, authenticated headers and versioned formats: why a perfectly valid ciphertext can still be a vulnerability if replayed outside its context.

In the previous chapter, you saw that nonce uniqueness is an absolute constraint of the AEAD scheme. This chapter introduces a different, and subtler, problem. A ciphertext can have a valid tag and a unique nonce, and still be a vulnerability if nobody checks the context in which it is being used.

Imagine a software update system. A package is encrypted and authenticated for component A, version two. An adversary replays it as an update for component B. The tag is valid. The nonce is unique. Nothing has been modified. And yet, code intended for one component executes in another.

By the end of this chapter, you will be able to define associated data and its role in binding a ciphertext to its context, explain domain separation, understand why a plaintext header must be covered by the tag, and describe how a versioned format enables cryptographic migration without breaking existing data.

To follow this chapter, you need to have read modules one and two of this course: AEAD, authentication tag, nonce. No knowledge of the mathematics of primitives is required.

Associated data.

The full notation for an AEAD seal is: ciphertext C equals encryption with key k, nonce N, associated data A, and plaintext P. The parameter A is mentioned in module one. This chapter examines it in detail.

Associated data, sometimes abbreviated AAD for Associated Data, is information that travels in plaintext with the encrypted message, but is bound to the ciphertext by the authentication tag. It is not encrypted: anyone can read it in transit. However, it is part of the tag computation. If the associated data presented during decryption differs from that used during encryption, the tag is invalid and decryption fails, without revealing any information.

The central intuition: AAD binds a ciphertext to its context of use.

AAD can contain a user identifier, a session identifier, a version number, a destination identifier, or any combination of these elements. What matters is that the value used during encryption is identical to the value presented during decryption. Any divergence invalidates the tag.

Returning to the update package example: if encryption includes in the AAD the identifier of the target component and the expected version, decryption fails as soon as the package is presented to a different component or for a different version. The ciphertext cannot be replayed outside its declared context.

One clarification: passing an empty AAD is not a cryptographic error. The scheme remains secure. But it means the ciphertext is not bound to any context and can be freely replayed. The question is always: which context must this ciphertext be unable to leave?

Domain separation.

Domain separation is the principle that a key must serve only one well-defined purpose. Two different operations in the same system must not share the same key, even if they use the same algorithm.

Here are two representative cases.

First case: session tokens and API tokens. A service generates tokens encrypted with AES-GCM. If the same key is used to encrypt both session tokens and long-lived API tokens, an adversary who obtains an API token can try to present it as a session token. The tag is valid, the nonce is unique. Without domain separation, the system has no way to distinguish the two.

Second case: direction in a messaging protocol. Messages encrypted by Alice to Bob and by Bob to Alice must not share the same directional key. Without that, a message from Alice can be replayed as if it came from Bob.

Separation is implemented in two ways, often combined.

First way: a key per purpose. Derive a distinct key for each role from a master key, with an explicit label, such as session-token or api-token.

Second way: context in the AAD. Systematically include a domain identifier in the associated data, for example the string "purpose=session" or "direction=client-to-server". Two ciphertexts produced in different domains will have different AAD values, hence different tags, even with the same key.

The principle: an encrypted object must explicitly declare its domain of use, and the system must make it impossible to present it in a different domain.

Plaintext headers, but authenticated.

In many protocols, a header travels in plaintext before the ciphertext. This header can contain a version identifier, an algorithm identifier, a recipient identifier, a message length. It must be readable before decryption, to route the request to the correct key or algorithm.

The problem: if this header is not covered by the tag, it is malleable. An adversary can modify it without invalidating the authentication.

Three concrete examples.

One: recipient redirection. If the recipient identifier in the header is not authenticated, an adversary can replace Bob's identifier with Alice's. The message is decrypted by Alice, who receives content intended for Bob. The tag is valid, because it does not cover the header.

Two: algorithm downgrade. If the algorithm identifier in the header is not authenticated, an adversary can replace it with a weaker algorithm. The recipient attempts to decrypt with that algorithm, believing it is what the sender chose.

Three: version confusion. If the version number is not covered by the tag, an adversary can make a message from one version pass as another, hoping the other version's parser handles the bytes differently.

The solution is direct: place the entire header in the AAD. The header remains readable in plaintext, but any modification invalidates the tag. This is the same mechanism as in module one: the tag covers everything that must be protected against modification, whether it is encrypted or not.

Versioned formats and cryptographic agility.

A system deployed in production cannot change algorithms in a single restart. Data exists, encrypted with the current algorithm. Older clients must continue to work. Migration must be progressive.

Cryptographic agility is the ability of a system to migrate from one algorithm to another without rewriting the entire codebase and without invalidating existing data. It relies on a versioned message format.

The principle: the first byte of the encoded message indicates which primitive was used to encrypt it. The decryptor reads this field first, chooses the appropriate decryption path, then proceeds.

Version one means AES-two-hundred-and-fifty-six-GCM. Version two means XChaCha20-Poly1305. Version three could, tomorrow, mean a quantum-resistant algorithm. Data encrypted in version one remains decryptable as long as the version one key is retained.

This mechanism is present in common protocols. TLS encodes the cipher suite identifier in the handshake. GPG key formats include an algorithm byte. JWT tokens include an "alg" field in the header.

But it introduces a critical constraint: the version byte must itself be covered by the tag. Otherwise, an adversary can modify it to force the decryptor to use a weaker algorithm. The version byte is in plaintext so the decryptor knows what to do, but it must appear in the associated data of both seal and open.

A note on post-quantum migration. Current symmetric-key algorithms, AES-two-hundred-and-fifty-six and ChaCha20, are considered sound against quantum computers. However, the asymmetric key exchange mechanisms used to establish the symmetric key, such as ECDH, are vulnerable. A versioned format allows adopting a post-quantum key encapsulation mechanism, such as ML-KEM standardised in two thousand and twenty-four by NIST, without modifying the data encryption format itself.

The diagram on the page illustrates the structure of an authenticated message. The header, which contains the version, the nonce, and optionally the recipient identifier, travels in plaintext but is fully covered by the tag via the associated data. The body contains the ciphertext and the tag. Any modification to a header field invalidates the tag.

The binding principle.

Everything above converges on a single principle.

An authentic ciphertext outside its context remains a vulnerability. Context is part of the message.

Concretely: each ciphertext must declare who it is for, for what purpose, in which domain, with which version. These metadata must not merely accompany the ciphertext, they must be bound to it by the tag. A replay in the wrong context must be detected cryptographically, not merely by an application-level check. Both layers, cryptographic and applicative, are complementary.

Key takeaways.

Associated data is transmitted in plaintext but covered by the tag. Modifying it causes decryption to fail. It binds the ciphertext to its context of use.

An empty AAD is cryptographically valid, but means the ciphertext is not bound to any context and can be freely replayed.

Domain separation consists of deriving distinct keys per purpose or including a domain identifier in the AAD, so that a ciphertext produced in one domain is not valid in another.

Every plaintext header field must appear in the AAD: version, algorithm, recipient identifier, direction. Without this, the header is malleable without detection.

A versioned format enables primitive migration without invalidating existing data. The version byte must itself be covered by the tag.

An authentic ciphertext outside its context remains a vulnerability. Context is part of the message.
