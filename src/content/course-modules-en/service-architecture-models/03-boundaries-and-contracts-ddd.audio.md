Chapter three. Boundaries and contracts between services: bounded contexts, shared kernel and published language. Why customer does not mean the same thing in two services, why the shared types library is a trap, and which Domain-Driven Design patterns healthily organize the relations between services.

The first two chapters described how to organize cross-cutting concepts. This chapter explains why the federated model is the right one, using the conceptual tools of Domain-Driven Design. Because DDD formalized, twenty years ago, exactly the problem we are handling: what happens when the same word designates different things depending on where you stand?

Same word, different meanings: the bounded context.

Domain-Driven Design starts from a linguistic observation: in any organization, the meaning of a word depends on context. Customer does not designate the same thing for the sales department, a signed prospect; accounting, an account to invoice; and support, a contract holder. Forcing a single definition produces a monstrous model that satisfies nobody.

DDD names bounded context the boundary within which a model and its vocabulary are consistent and unambiguous. The central lesson: do not unify the models, unify the map. You accept several definitions of customer, one per context, and you make the relations between contexts explicit.

Verify it on our commerce suite. On the page, three interactive tabs show the definition of the word customer in three contexts. For the catalog, the customer is a visitor with preferences: language, currency, browsing history, wish lists. For payment, a payer with regulatory obligations: tokenized payment methods, anti-fraud checks, compliance. For support, a ticket holder with a history: conversations, response time commitments, satisfaction to track. Browse all three and observe: no attribute coincides, except the identifier.

What would happen if these three definitions were merged into a single universal customer entity? You would get an entity with thirty attributes of which each service would use a fifth, subject to the payment context's regulatory constraints even to display a wish list, and modified by three teams with incompatible agendas. That is exactly the monstrous model the bounded context avoids. Same name, same intuition, three definitions. They share a link, it is the same customer in the user's eyes, but neither their attributes, nor their lifecycle, nor their invariants coincide. Each service is a bounded context, and that is perfectly fine.

The relationship map: six patterns to know.

Once the contexts are laid out, DDD names the possible relations between them: this is context mapping. Six patterns cover most of the territory. Partnership: two teams co-evolve their contexts, their success is linked. Customer-supplier: downstream expresses its needs, upstream plans for it. Conformist: downstream adopts the upstream model as-is, typically facing a dominant external service that does not negotiate. Anticorruption layer: downstream translates the upstream model into its own, to protect its model. Open host service: upstream publishes a stable API open to all. And published language: a common exchange format, published and versioned, for broad interoperability.

Two of these patterns deserve a closer look. First the anticorruption layer: it is the translation layer a context places at its boundary to convert someone else's model into its own. When the support service consumes the payment service's events, it does not store a transaction: it translates it into a possible contact reason. The foreign model never penetrates; it is translated at customs. That is the concrete mechanism that keeps bounded contexts watertight. Second, the open host service plus published language pair: it describes exactly the federation contract of chapter two. Each service publishes a stable API, and the ecosystem's common conventions constitute a published language.

The anti-pattern: the involuntary shared kernel.

Facing our three definitions of customer, the temptation from chapter one comes back in a sneakier form: since the services are separate, let us at least share the types. A common library defining the customer structure once and for all, imported by every service.

DDD calls this pattern the shared kernel: a model fragment jointly owned by several contexts. And it comes with a warning the industry learned the hard way: a shared kernel is only viable between very close teams, continuously coordinated, on a tiny scope. Everywhere else, it produces the worst of both worlds. Every evolution of the shared type requires re-versioning and re-deploying all the services importing it: you have recreated the monolith's evolution coupling. But without the monolith's benefits: no common transactions, no native integration, and the operational complexity of distribution on top.

This outcome has a name: the distributed monolith. Services technically separated, logically welded together. You pay the price of both architectures and collect the dividends of neither.

Before sharing a type between services, ask a single question: if this type changes, am I ready to redeploy all the services the same day? If the answer is no, this type must not be shared. The boundary of independent deployment is also the boundary of an independent model.

Note the nuance: publishing a types library from one service, towards its clients, the payment service's contract consumed by whoever wants to call it, is healthy. The dependency follows the direction of the call and the provider versions its contract. That is the open host service. What is toxic is the type owned by nobody and imported by everybody.

The healthy pattern: the published language.

If you share neither a database nor types, what is left? DDD's answer is called published language: a published exchange language, stable, versioned, that each context translates to and from its internal model. The canonical examples are the great interoperability standards: federated identity protocols, normalized event formats, open API specifications, accounting or banking exchange formats. None shares internal types; all publish a boundary format that everyone implements at home.

For a federated ecosystem, the published language takes a concrete and minimal form, in three conventions. One: a vocabulary and a minimal semantics. What a shop is for the ecosystem: a stable key, a display name, membership in an organization. Nothing more: each context enriches locally. Two: a normalized identifier scheme, the format of external references, structured for the control plane that emits them, opaque for the services that store them. Three: the federation contract, the idempotent upsert by external reference, documented in a versioned API specification.

One documentation page is enough to fix these three conventions. It is the most profitable investment of the whole architecture: it costs one decision, and it saves years of coupling.

Remember the hierarchy: between bounded contexts, you never circulate internal structures. You circulate identifiers, opaque and stable, and messages conforming to the published language, versioned, translated at the boundary by an anticorruption layer if needed. The identifier links, the message synchronizes, the model stays home.

The complete map.

You now hold the complete reading of the first three chapters. Who owns the topology? The control plane. Who owns the business resources? Each service. What does customer mean? One definition per context. What is shared between services? Identifiers and conventions, never types. How do you protect yourself from a foreign model? Through translation at the boundary. How do we converge? Through idempotent reconciliation. What do we never do? The types library imported by all.

This grid applies far beyond commercial software suites: development platforms, industrial systems, internal microservice ecosystems, information system mergers after an acquisition. Everywhere, the same tension between integration and autonomy, and everywhere the same way out: sovereign contexts, a published language, declarative convergence.

One practical question remains: facing a real system, how do you choose your model, and how do you migrate from one to another? That is the subject of the last chapter. On the page, a four-question quiz awaits to check your understanding.
