Chapter one. Integrated monolith and autonomous services: two opposite answers to concept sharing. Customer, shop, project, organization: when several services of the same product handle the same concepts, two architectures dominate the market, and they optimize incompatible goals.

Imagine an online commerce software suite: a catalog service, a payment service, a shipping service, a customer support service. Very quickly, something becomes obvious: all these services talk about the same things. A shop. A customer. An order. The user, however, sees only one: their shop, which has products, transactions, parcels and support tickets.

This problem is in no way specific to commerce. An office suite shares the document and the workspace between editing, sharing and messaging. An ERP shares the customer and the order between sales, accounting and logistics. A development platform shares the project and the environment between code management, deployment and feature flags. A banking information system shares the account and the holder across dozens of applications. Everywhere, the same question shapes the architecture: who owns the concepts everybody handles? The answer commits everything: the ability to ship services separately, the smoothness of the integrated experience, the cost of evolving the system, and even the organization of teams.

The problem of cross-cutting concepts.

Let us state the problem precisely, because it is more subtle than it looks. The payment service needs to attach its transactions to something: call it a shop. The catalog service organizes its products by shop too. The shipping service attaches its parcels to orders, themselves placed in a shop. These concepts look extremely similar. Same name, same intuition, same position in the hierarchy. The temptation is immediate: it is the same concept, let us model it once. That is exactly the temptation we need to examine, because the two big architecture families on the market answer it in opposite ways. And neither answer is a mistake: they are two coherent optimizations of different goals.

Model one: the integrated monolith.

The first model is the one used by integrated software suites: ERPs, all-in-one development forges, management suites. The shared concept is a single central entity, stored once, on which every feature depends: the catalog hangs off the shop, the transactions hang off the shop, the shipments and the tickets too.

The benefits are real and immediate. Perfect integration: a shop page shows products, sales, parcels and tickets without inter-service calls, without synchronization, without any possible inconsistency. One model to learn, with a single lifecycle. Trivial transactions: creating a shop and its default catalog in the same database transaction, no distributed protocol to invent. And consistency guaranteed by construction: a transaction cannot reference a nonexistent shop, the integrity constraint lives in the schema.

The cost is just as real, but deferred. First, it is impossible to ship one building block separately: the payment service cannot exist without the core that defines the shop. You cannot offer it as a standalone product, nor replace it with a better market component. Second, evolution coupling: any change to the central entity potentially impacts every feature. The shop schema becomes the bottleneck of every team. Third, organizational scale is limited: ten teams working on the same core step on each other.

That is Conway's law in its most brutal form: organizations design systems that mirror their communication structures. As long as one team owns the core, all is well; as soon as several teams must evolve it together, every change becomes a negotiation. Remember this: choosing a service model is also choosing a team organization. If your architecture and your org chart tell two different stories, the org chart wins.

One variant deserves a detour: the modular monolith. Same single deliverable, same database, but strict logical boundaries between modules: the payment module accesses the shop module only through an explicit internal interface, never by joining its tables directly. It is an excellent starting choice: it keeps the monolith's benefits while preparing the boundaries that will allow, one day, extracting a module into a service. Most successful migrations start from a modular monolith, not from a spaghetti one. Logical boundaries precede physical boundaries; we will come back to this in chapter four.

Model two: autonomous services.

The second model is the one used by the large public cloud providers and best-of-breed ecosystems. Here, each service owns its own resources and knows nothing about the others. There is no shared global entity at all. How does the user find their way? Through three after-the-fact federation mechanisms. One: normalized identifiers, a unique name structured by a global convention for every resource. Two: labels, free key-value pairs attached to resources, the decentralized equivalent of grouping. Three: an aggregation console, a presentation layer that queries each service and rebuilds a unified view. Integration is not in the data model: it is recomputed at display time.

The benefits mirror the monolith's costs. Each service lives its own life: it is designed, deployed, versioned and sold separately, one team per service. Evolution is local: changing a service's internal model impacts nobody as long as identifiers stay stable. The customer can compose their system with the best service of each category. And organizational scale is proven: this is the model that allowed catalogs of hundreds of services to grow for twenty years.

And the costs mirror the monolith's benefits. The integrated experience is a permanent construction site: every cross-cutting view must be built explicitly on top of the services, and maintained. Consistency is soft: nothing guarantees that a label is set everywhere, or spelled the same; orphaned resources and incomplete groupings are everyday life. And the shared concept exists nowhere: the shop is only a convention, no service can rely on it contractually.

On the page, an interactive explorer offers five scenarios: evolve the shared concept, sell one service piece by piece, display a unified view, guarantee cross-cutting consistency, grow from two to ten teams. For each scenario, it shows what happens in each of the two models. Take the time to find the scenario where the monolith clearly wins, then the one where it definitively loses.

The fundamental incompatibility.

Put the two models side by side and the dilemma appears. Shared concept: a single contractual entity on one side, a mere tag convention on the other. Shipping one block alone: impossible versus natural. Integrated experience: native versus rebuilt. Cross-cutting consistency: guaranteed versus best effort. Evolution: coupled versus free.

If your strategy requires both, autonomous building blocks adoptable one by one, and an integrated experience where the shared concept really exists, then neither canonical model is enough. You need a third one, borrowing from both without inheriting their disqualifying flaws. That is the federated model, the subject of the next chapter.

One last reflex to remember. In front of any multi-service system, ask the revealing question: if I want to deploy this service alone, without the rest, can I? The answer immediately tells you which family you are in, and therefore which structural costs you will pay. On the page, the chapter ends with a four-question quiz, to anchor all of this.
