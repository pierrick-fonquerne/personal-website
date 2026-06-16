Chapter four. Stress-testing the threat model. We become the malicious server and attack the system from the first three chapters: what holds, what is accepted, and the engineering disciplines that make it all hold over time.

A cryptographic design is only worth its threat model: the explicit list of what it protects against, what it accepts, and what it does not cover. The first three chapters built a vault; this one attacks it. You will take on the most powerful role in the model: the malicious server, which holds every blob, serves whatever it wants, and observes everything in transit.

The exercise: you are the server. Let's run the attacks one by one. Read a file's content? Fails: each chunk is encrypted under a random file key, enveloped under the account key, itself enveloped under a master key that never transited. Read names, directory structure? Fails: that metadata lives inside encrypted blobs; the server only sees opaque identifiers.

Reorder a file's chunks? This attack deserves detail. The server cannot rewrite the manifest, it is an authenticated blob. It can, however, serve chunk B when the client asks for chunk A. But the client requests each chunk by its address, in the order dictated by the authenticated manifest, and verifies that the digest of the received blob matches the requested address. The wrong chunk has the wrong digest: immediate detection, before decryption is even attempted. The order is protected because it lives in an authenticated object, and delivery is verified by addressing.

Substitute a chunk from another file with identical content? No: the other file is encrypted under a different random key. Identical plaintext, unrelated ciphertexts, unrelated addresses. Swap blobs across roles, serve an envelope in place of a manifest? Fails: domain separation, the tag no longer matches. Weaken the derivation at login? Fails: client-side floor.

Replay an old state? Serve the client an old root, perfectly valid, correctly encrypted, simply stale, to make recent files disappear. Here, honesty: the design as built does not detect this. The blob is authentic; it is its freshness that is not. Coverage requires an additional mechanism, a signed version counter, root chaining, which belongs to a next iteration. A good threat model writes this down in black and white instead of forgetting it.

The honest table has three columns. Covered: reading content and metadata, tampering, substitution, reordering, role confusion, derivation downgrade. Accepted and documented: approximate sizes, activity timestamps, the reference graph. Not covered, explicitly: replay of an old state, denial of service by the server, and compromise of the client device, which holds the keys by definition.

From design to code: the disciplines that make it hold. A clean threat model does not survive a careless implementation. Five disciplines turn the design into a trustworthy system.

Typing as a guardrail. Every key gets its own type: passing one where another is expected becomes a compile-time error, not a production bug. Key types implement neither debug printing nor serialization: accidentally logging a key is impossible by construction.

Memory hygiene. A key going out of scope must be wiped from RAM, not merely deallocated. The classic trap: intermediate copies. Decoding a recovery code creates temporary buffers holding the key; a buffer that reallocates while growing abandons its old, unwiped copy on the heap. The discipline is to trace every copy of sensitive material, including the ones the language creates quietly.

Frozen regression vectors. Format version one is a commitment: a blob encrypted today must decrypt in ten years. Reference blobs are generated once, their bytes frozen as constants in the test suite, and any accidental format break fails continuous integration immediately. It is the single most important test of a storage format.

Property-based testing. Rather than hand-picked examples, invariants verified over hundreds of generated inputs: every encrypt-decrypt round trip restores the input; every single-bit flip makes opening fail. With one audit subtlety: a badly written property can be weaker than it looks. If the flipped bit is drawn from too narrow a range, the test only ever touches the start of the blob, and the authentication tag, at the end, is never exercised. Re-reading your properties matters as much as writing them.

Fuzzing the parsers. Everything that parses bytes coming from outside is exposed to adversarial input by construction. Fuzzing hammers those paths with random and mutated inputs, hunting for crashes. On a vault, the priority targets are the trust boundaries: whatever the server can fabricate.

One last lesson, beyond cryptography. None of the hardenings in this course came out perfect on the first draft: the unauthenticated header, the derivation-parameter downgrade, the unwiped memory copies are review findings. Someone re-read the design asking: what if I were the server? A security design must be attacked by its authors, methodically, before others do. The threat model is not an end-of-project document; it is the working tool of every review.

Key takeaways. A threat model is worked in three columns: covered, accepted, not covered, and the honesty of the third column makes the first two credible. The malicious server exercise validates the design; replay of an old state remains open and documented. Typing turns key misuse into compile-time errors; memory hygiene tracks every copy of sensitive material. Frozen vectors lock format compatibility; property-based tests verify invariants, provided their generators are audited; fuzzing hammers the parsers. And security is an adversarial review process.
