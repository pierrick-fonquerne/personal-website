Chapter four. Choosing your model: decision grid, warning signs and migration trajectories. None of the three models is good in the absolute: they answer different strategies. This chapter gives the choice criteria, the symptoms of the wrong choice, and the proven migration paths.

The first three chapters described the models; this one answers the practical question: which one to choose, and how to change your mind without breaking everything? Because that is the reality of systems: you do not choose once and for all, you choose for a context, and the context changes.

The five criteria that dominate the decision.

Dozens of factors influence the choice, but five crush all the others.

First criterion, the distribution strategy. Will you sell, or open, the services separately? This is the most discriminating criterion: if you must ship piece by piece, the integrated monolith is eliminated outright, whatever its other qualities.

Second criterion, the number of teams. Conway's law is non-negotiable: one or two teams live very well in a monolith; ten teams on a shared core paralyze each other.

Third criterion, the integration requirement. If the unified view is the product, cross-cutting dashboards, smooth navigation between domains, you need either the monolith or a federated control plane; pure autonomous services will make you pay for every integrated screen.

Fourth criterion, the consistency requirement. Immediate guaranteed consistency: monolith. Acceptable eventual consistency: federated. Sufficient best-effort conventions: autonomous.

Fifth criterion, the existing system. A healthy working monolith is an asset, not a shame; already scattered services call for federation, not a central rewrite.

On the page, an interactive decision grid asks you these five questions for your own system, real or imaginary, and displays the tendency: modular monolith, autonomous services or federated model, with an explained recommendation. Have fun finding a combination of answers that eliminates the monolith from the first question, then one that makes the federated model unavoidable. But keep in mind: this grid gives a tendency, not a verdict. Its real role is to force the five conversations that matter. If your architecture committee debates the inter-service communication technology before answering these five questions, it debates in the wrong order.

The warning signs of the wrong choice.

Failed architectures give warnings. Here are the symptoms to recognize, each pointing to a precise diagnosis.

First symptom: lockstep deployments. Your services are independent on paper, but every release requires deploying them together, in a precise order, after a coordination meeting. Diagnosis: distributed monolith, almost always caused by a shared kernel or implicit contracts. You pay for distribution without autonomy; either re-assume the monolith, or break the shared core.

Second symptom: the swelling integration backlog. Every quarter, new requests for consolidated views, cross-cutting reports, global deletion, and every request is a project. Diagnosis: autonomous services facing an underestimated integration need. The durable answer is not the nth aggregation screen, it is a federated control plane.

Third symptom: orphaned resources and inconsistent labels. Nobody can say how many shops really exist, audits find resources without owners. Diagnosis: federation by convention, without contract. What is missing: contractual external references and reconciliation.

Fourth symptom: the core-team bottleneck. All the other teams wait for the central module's evolutions; the core's backlog is six months deep. Diagnosis: monolith beyond its organizational scale. That is the starting signal for an extraction.

First trajectory: from the monolith to the federated model.

The most frequent migration, and the best documented. It follows the strangler fig pattern: the new system grows around the old one, which keeps working until it becomes replaceable. Five steps, in order.

Step one: modularize first. Draw the logical boundaries inside the monolith, that is the modular monolith from chapter one. No new infrastructure; all the work is in the code and internal interfaces.

Step two: extract the most autonomous module, the one with the fewest incoming dependencies. Give it its own local projection of the shared concept, fed at first by calls to the monolith.

Step three: introduce the federation contract on the extracted service, external reference, idempotent upsert. The monolith becomes its first de facto control plane.

Step four: repeat, module by module, always starting with the most decoupled.

Step five: promote the remaining core to control plane. When only the topology remains at the center, organizations, shops, users, the monolith has become, without any brutal switch, the central referential of the federated model.

The beauty of this trajectory: each step has value even if the migration stops there. A modular monolith is better than spaghetti; an extracted service gives a team back its autonomy; the federation contract also serves infrastructure tools.

Second trajectory: from autonomous services to the federated model.

The reverse path, typical of ecosystems that grew best-of-breed and whose customers demand the unified experience. Four steps. One: publish the common language, the minimal vocabulary and the identifier scheme from chapter three. It is a governance decision, not code. Two: add the federation contract to each service, external references, management marker, idempotent upsert. Each service stays one hundred percent autonomous; it simply becomes federable. Three: build the control plane, first read-only, a consolidated inventory, then read-write, the provisioning. Four: adopt the existing, with the adoption procedure from chapter two, service by service, without data migration.

The two traps that doom a migration.

First trap: the big bang. Rewriting everything and switching over one weekend. The industry's history is a graveyard of big bangs; incremental migration is not a cautious option, it is the only one that survives contact with reality.

Second trap: the transitional shared kernel. Let us share the types just for the duration of the migration. No transitional shared kernel ever died of natural causes: the temporary that works becomes permanent, and you have built a distributed monolith while believing you were migrating. If you must share something, share the published language, never the types.

Key takeaways, from the whole course.

Chapter one: the integrated monolith and autonomous services optimize opposite goals, integration and consistency versus autonomy and scale; the choice shapes the product and the organization. Chapter two: the federated model reconciles both, a control plane sovereign over the topology, services sovereign over their resources, convergence through idempotent reconciliation. Chapter three: bounded contexts legitimize local definitions; between them circulate identifiers and messages of a published language, never shared types. Chapter four: you choose with five criteria, you watch for the warning signs, and you migrate through steps that each carry their own value, never big bang, never via a transitional shared kernel.

The durable skill is not knowing the best model: it is knowing how to read a product's strategy in its architecture, and vice versa. On the page, one last four-question quiz closes the course.
