Chapter one. Propositions and logical connectives. The language of rigour: how true or false statements combine into reasoning, and why, in logic, false implies true is true.

All of mathematics rests on one gesture: proving. Not convincing, not illustrating, proving. And proving requires a language where every sentence is either true or false, with no grey area. That language is propositional logic. It is the very first tool to lay down before writing a single serious proof.

By the end of this chapter, you will be able to answer three questions: what counts as a statement we are allowed to call true or false, how to combine such statements with not, and, or, and if then, and why implication behaves in a way that surprises everyone the first time. To follow along, you need nothing beyond a middle school level: no computation, no prior knowledge of logic.

The investigation: reasoning correctly.

Picture a detective at a crime scene. They only have facts, each of which is either true or false: the window was locked, the suspect was in town, the alarm went off. From these facts they chain deductions: if the window was locked and the alarm did not go off, then the intruder had a key. The whole of reasoning lives in those little linking words: not, and, or, if then. Propositional logic is exactly that, but made precise enough for a machine to check it.

What is a proposition.

A proposition is a statement we can unambiguously call true or false. For example, two plus two equals four is a true proposition. Seven is an even number is a false proposition. By contrast, what time is it is not a proposition, because a question is neither true nor false. Likewise, x greater than three is not a proposition as long as x is not fixed, because its truth value depends on x. We will handle that case in chapter two, with quantifiers. The principle that a proposition is either true or false, with no third possibility, is called bivalence. We write true as capital T, false as capital F, and we denote propositions by letters: P, Q, R.

Play with a truth table.

Before any theory, manipulate. On the page, an interactive table called a truth table shows you the value of several formulas for every possible combination of P and Q. You can toggle the values of P and Q with buttons, and the matching row is highlighted. You can even write your own formula using a small keyboard of symbols, and watch its table appear in real time. Take the time to find the single row where P and Q is true, then the single row where P or Q is false.

The first three connectives: not, and, or.

A logical connective is a symbol that builds a new proposition from one or two propositions. We define each one by its truth table, which is its complete definition. Negation, written not P, flips the value: not P is true exactly when P is false. Conjunction, P and Q, is true in only one case, the one where P and Q are both true; in the other three cases it is false. Disjunction, P or Q, is true as soon as at least one of the two is true. Beware the trap: this is an inclusive or. If both are true, P or Q is still true. That differs from the everyday or, when a waiter offers cheese or dessert and means one but not both. That exclusive or exists too, and we will meet it shortly.

Implication, the connective that traps you.

Here is the most important connective in mathematics, and the most counterintuitive. Implication, P implies Q, reads if P then Q. It has three equivalent readings worth knowing: if P then Q, P is sufficient for Q, and Q is necessary for P. Its truth table holds a surprise: P implies Q is false in only one case, the one where P is true but Q false. In every other case it is true. In particular, when P is false, P implies Q is true no matter what: we say it is vacuously true. To understand this, stay at the crime scene. The detective states a rule: if the suspect is guilty, then their fingerprints are on the weapon. When is this rule proven wrong? Only if the suspect is guilty and their fingerprints are not on the weapon. If the suspect is innocent, the rule says nothing about that case, so it cannot be contradicted, and it holds by default. Implication hides a second surprise: it can be rewritten without the symbol implies. Indeed, P implies Q is equivalent to not P or Q. This is a tool we will use constantly to manipulate implications inside proofs.

Equivalence, tautologies and contradictions.

When two propositions have the same truth value in every case, we say they are equivalent. The connective, P if and only if Q, is true exactly when P and Q have the same value. Two families deserve a name. A tautology is a proposition that is always true, whatever the values of its variables; the flagship example is P or not P, the law of excluded middle. A contradiction, by contrast, is always false; the flagship example is P and not P, because a proposition cannot be both true and false.

De Morgan's laws.

How do we negate an and? How do we negate an or? The answer lies in De Morgan's two laws, among the most used in all of mathematics. First law: the negation of P and Q is equivalent to not P or not Q. Second law: the negation of P or Q is equivalent to not P and not Q. In plain words, negating both amounts to saying at least one of the two is false, and negating at least one amounts to saying both are false. On the page, you can check these laws column against column in the interactive table.

Every formula is a tree.

A logical formula is not a flat string of symbols: it is a nested structure, a tree. The connectives are the nodes, the variables are the leaves. This tree dictates the order of evaluation: compute the leaves first, then climb back up. It also dictates the precedence of connectives, exactly as multiplication comes before addition. The convention, from highest to lowest precedence, is the following: negation, then and, then or, then implication, then equivalence. So not P or Q reads not P, then or Q, and not the negation of P or Q. When in doubt, parentheses settle it.

A history: from Boole to circuits.

The idea that reasoning could become computation is recent. In eighteen forty-seven, George Boole publishes an algebra where true and false are computed like numbers, and logic becomes mathematical. In eighteen seventy-nine, Gottlob Frege invents a notation for quantifiers and founds modern logic, whose rewards we will reap in chapter two. In nineteen thirty-seven, Claude Shannon shows that switching circuits realize exactly Boolean algebra: this is the birth of digital electronics. In passing, a bridge to another course. The connectives and and or can be computed by a circuit, or by a neuron. In the neural networks course, you will see that a single threshold neuron can compute and and or, but stumbles on a third connective: the exclusive or, that famous XOR, which is true when exactly one of the two inputs is true. In logic, XOR is built from the others: it is P or Q, but excluding the case where P and Q are both true. The geometric reason a single neuron cannot handle it is one of the founding results in the history of artificial intelligence.

In one sentence.

Propositional logic is a small exact calculus: propositions, true or false, combine through five connectives, and the value of any formula can be read mechanically from its truth table.

Towards chapter two.

We carefully avoided x greater than three, saying it was not a proposition. That is awkward, because mathematics is full of statements that depend on a variable. To make them true or false, we will need to say for all x, or there exists an x. Those are the quantifiers, the subject of chapter two. On the page, the chapter ends with two worked exercises and a quiz, to anchor all of this.
