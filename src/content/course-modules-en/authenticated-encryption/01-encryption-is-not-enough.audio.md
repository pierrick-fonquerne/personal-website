Chapter one. Encryption is not enough. Confidentiality versus integrity: why an adversary who cannot read can still break everything, and how authenticated encryption responds.

In two thousand and eleven, researchers showed that an adversary positioned between a browser and an HTTPS server could, without ever decrypting a single byte, modify encrypted data in a predictable way and force behaviours the application never intended. The attack read nothing. It rewrote.

This scenario is called malleability. It is the central problem of this chapter.

By the end of this chapter, you will be able to explain the difference between confidentiality and integrity, recognise the malleability of unauthenticated encryption, and describe what AEAD guarantees and how.

To follow along, you need a notion of symmetric encryption: what a key is, what plaintext is, what ciphertext is. And a general idea of what a hash function is. No knowledge of the internal mathematics of primitives is required.

Confidentiality versus integrity.

These two properties are distinct, and confusing them is the source of many real-world vulnerabilities.

Confidentiality guarantees that an adversary who observes an encrypted message cannot deduce its content. It protects against a passive attacker, one who listens.

Integrity guarantees that an adversary cannot modify a message without that modification being detected. It protects against an active attacker, one who intervenes.

A system can have one without the other. And that is where the trap lies.

The active adversary.

Consider a concrete example. A payment service encrypts the amount of a transfer using CTR mode, that is, counter mode. In CTR mode, encryption XORs the plaintext with a pseudo-random stream generated from the key and a counter.

If an adversary knows the position in the ciphertext that corresponds to the amount field, they can flip exactly the right bit in the ciphertext. When the recipient decrypts, they obtain a modified amount. The adversary never knew what the original amount was. They just changed it.

This is malleability: the property of an encryption scheme that allows transforming a ciphertext into another ciphertext whose decryption is predictable, without knowing the key.

A confidential scheme can be malleable. A malleable scheme offers no integrity guarantee.

AEAD: the answer.

Authenticated Encryption with Associated Data, written AEAD, solves this problem by combining confidentiality and integrity in a single operation.

An AEAD scheme exposes two operations.

The first is called seal. It takes a key k, a nonce N, associated data A, and a plaintext P. It produces a ciphertext augmented with an authentication tag.

The second is called open. It takes the key k, the nonce N, the associated data A, and the ciphertext. It verifies the tag, then decrypts. If verification fails, it returns an error without revealing anything else.

Each symbol has its role. k is the shared secret key. N is the nonce, a number used once, which guarantees that two encryptions of the same plaintext with the same key produce different ciphertexts. A is what we call the associated data: metadata that is authenticated but not encrypted, such as an HTTP header, a session identifier, or a protocol version. It is not part of the ciphertext, but any modification to it invalidates the tag. P is the plaintext to protect. And C is the output, the ciphertext concatenated with the authentication tag.

The authentication tag.

The tag is a cryptographic fingerprint computed over the ciphertext and the associated data using the key. It is produced during seal and verified during open.

If a bit of the ciphertext has been flipped, if an associated data field has changed, if the tag itself has been tampered with: verification fails. The open returns a generic error, without indicating what changed or where. This absence of information is intentional: revealing the cause would allow an adversary to learn something, what we call an oracle attack.

The formula to remember: encryption hides; it does not protect. Integrity is proved, not assumed.

On the page, the interactive component lets you flip a bit in the ciphertext and observe what happens. In simple encryption mode, the flipped bit passes through decryption without any alert. The plaintext that comes out is silently altered. In AEAD mode, the same flipped bit triggers a verification failure. The open returns a rejection. No information about the content is disclosed. The difference in behaviour is a concrete demonstration of what integrity provides.

History: bit-flipping and padding oracles.

Attacks on unauthenticated modes have a long history. Bit-flipping against CTR has been known since the early two thousands. Against CBC, a subtler variant exploits the padding oracle. By observing whether the server accepts or rejects a message based on whether decryption produces valid padding, an adversary can reconstruct the plaintext byte by byte, without ever knowing the key. The POODLE attack, in two thousand and fourteen, is a real-world instance against SSL three point zero.

All of these attacks became obsolete with the widespread adoption of AEAD, which removes from the adversary any information about the result of decryption.

Key takeaways.

Confidentiality hides the content from a passive adversary. It does not protect against an active adversary.

Integrity guarantees that a modification is detected. It is proved by a cryptographic tag.

Malleability is the property that allows modifying a ciphertext in a predictable way without knowing the key. Unauthenticated CTR and CBC suffer from it.

AEAD combines both properties in a single operation. Seal produces the ciphertext augmented with the tag. Open verifies the tag before decrypting.

A failing open returns a generic error. This opacity is a security property.

Associated data is authenticated but not encrypted. Modifying it invalidates the tag, even if the ciphertext is intact.

The common algorithms are AES-GCM and ChaCha20-Poly1305. The following modules examine their properties, constraints, and use cases.
