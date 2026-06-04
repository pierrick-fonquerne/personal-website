Chapter two. The federated model: control plane, local projections and reconciliation. The synthesis that reconciles integration and autonomy: a control plane that owns the topology, services that own their resources, and a declarative convergence between the two.

The previous chapter ended on a dilemma: the integrated monolith provides consistency but forbids autonomy of the building blocks; autonomous services provide autonomy but give up consistency. This chapter presents the synthesis that reconciles both, under one non-negotiable condition: accepting that the same concept exists several times, at different levels of responsibility.

The central idea: separating topology from resources.

The federated model rests on a precise sharing of sovereignty. The control plane is the source of truth for the organizational topology: organizations, shops, who belongs to what, who has access to what. Each service is the source of truth for its business resources: products for the catalog, transactions for payment, parcels for shipping. And the bridge between the two: each service maintains a local projection of the topological entities that concern it. The payment service has its own shop table, minimal, which mirrors the central referential when a control plane exists, or gets filled manually when the service runs alone.

This is the most important property of the model. Each service remains complete and autonomous: its local projection is enough to operate without a control plane. And the whole remains consistent: when the control plane exists, it is the one creating and synchronizing those projections. The same binary serves both scenarios: standalone product, or integrated building block of a suite. This schema applies everywhere: replace shop with project and you get a development platform; with workspace and you get a collaboration suite; with legal entity and you get a multi-subsidiary management system.

Careful, the federated model requires giving up a dogma: a piece of data must exist in only one place. Here, the shop exists in the control plane and in every service. This is not accidental duplication, it is an assumed projection, with a clear owner and an explicit convergence mechanism. Ungoverned duplication is debt; governed projection is architecture.

First mechanism: the opaque external reference.

How does the control plane find its shop inside each service? Through a dedicated field on each service's topological entities, called external ref. It is an identifier set by the external system and never interpreted by the service. The service indexes it with a uniqueness constraint, returns it, but never reads its structure. It is the annotations pattern from container orchestration systems: a memo the external manager leaves to itself.

Why opaque? Because any interpreted structure becomes coupling. If the payment service parsed the identifier to extract the organization name, its format would become a schema contract between all systems, impossible to evolve. Kept opaque, it remains a simple link: and a link, unlike a schema, never breaks. This is exactly the strategy of federated identity protocols: the subject identifier is defined as an opaque string. Twenty-five years of interoperability rest on that opacity.

Second mechanism: the idempotent upsert and convergence.

The control plane does not create projections: it reconciles. Each service's API exposes an operation whose contract is: make sure a shop with this external reference exists and looks like this. If no entity carries this reference, creation. If an entity already carries it, update of the projected fields. In all cases, replaying the operation changes nothing: that is the definition of idempotence.

This property changes the nature of synchronization. No need to guarantee that a message arrives exactly once, a costly guarantee, often illusory in distributed systems: being able to replay it is enough. The control plane can re-declare the complete desired state at every startup, after every incident, periodically as a safety net. The services' state converges towards the declared state.

Note the inversion: the control plane does not say do this, imperative, fragile, order-dependent. It says: here is the desired state. Declarative, replayable, self-healing. Every robust distributed system of the last twenty years made that choice: container orchestrators with their reconciliation loop, infrastructure-as-code tools with their execution plan. The federated model applies the same physics to business concepts.

On the page, an interactive simulator puts the control plane's desired state face to face with a service's local projection. You can edit a shop locally to cause some drift, remove a shop from the desired state to create an orphan, then run the reconciliation and watch the convergence: drifts are overwritten, orphans are purged, everything returns to in-sync. What you observe has a name in distributed systems: anti-entropy. Disorder accumulates naturally; a periodic loop absorbs it by replaying the desired state.

Third mechanism: the management marker.

Last piece: the managed by field. It indicates who governs the entity: the control plane, an infrastructure-as-code tool, or nobody, in case of manual creation. Its role is first ergonomic: the service's interface can display managed by the suite, and protect the entity against an accidental manual edit, doomed to be overwritten at the next reconciliation. It is the answer to the classic problem of declarative systems: the local change silently reverted by the central manager, an endless source of confusion if nothing signals it.

The failure modes, and why they are acceptable.

An architecture model is judged by its failures as much as by its nominal operation. Three main cases.

The control plane outage. This is the model's most beautiful property: the services barely notice. Each one keeps operating on its local projection; only topological operations, creating a shop, changing an attachment, are unavailable. Everyday availability is decoupled from the central referential's availability. Compare with the monolith: core down, everything down.

Drift. Someone edits a local projection by hand, or a reconciliation fails halfway. The model's answer: the next anti-entropy pass erases the drift. The residual cost: between two passes, the system is temporarily inconsistent. That is the model's structural price: eventual consistency, not immediate consistency. For organizational topology, which rarely changes, this compromise is almost always acceptable; for transactional data it would not be, and that is why business resources stay in their service with their local guarantees.

Deletion. The trickiest case. A shop disappears from the desired state: what does the service do with its attached transactions? Two policies exist, and the choice must be explicit. Cascade: delete everything, irreversible and dangerous. Or orphaning: mark the projection orphaned, freeze the resources, let a human or a retention policy decide. Most mature systems choose orphaning with deferred purge: a topology mistake is recoverable, a cascade deletion is not.

Adopting the existing: brownfield federation.

Last realistic scenario: the suite deploys its control plane while the services have been running for two years, full of manually created entities. The federated model handles this case with an adoption operation: the control plane discovers the existing local entities, proposes a pairing with its referential, then sets the external reference and the management marker afterwards on the confirmed entities. This is a major difference with the integrated monolith, where integrating an existing system means migrating its data into the core. Here, the data does not move: only a link is added. Adoption is progressive, reversible, and service by service.

The federation contract.

Let us recap what a service must expose to be federable. It is remarkably little. One: local topological entities carrying an opaque external reference and a management marker. Two: an idempotent upsert by external reference. Three: an explicit deletion policy. Four: a published, versioned, documented API. A service honoring this contract works alone, integrates with any control plane, and the day a central referential is born, federation is an API client to write, not a migration.

Notice the symmetry with chapter one: the federated model reuses the normalized-identifier idea from autonomous services, but adds what was missing, a contractual local entity and a designated owner of the topology. And it reuses the monolith's consistency, but recomputed through convergence rather than guaranteed by a shared database.

One question remains: what do services actually share with each other, if neither code nor schema? The answer is conceptual, and Domain-Driven Design formulates it best. That is the subject of the next chapter. On the page, a four-question quiz awaits to check your understanding.
