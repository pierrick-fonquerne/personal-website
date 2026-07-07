/**
 * Moteur pur du pipeline RAG (Retrieval-Augmented Generation, ou generation
 * augmentee par la recherche). Dernier maillon du cours : tout ce qu on a
 * construit converge ici.
 *
 * Le chapitre precedent nous a donne une recherche hybride robuste : par le sens
 * (cosinus), par la lettre (BM25), fusionnee par le rang (RRF). Mais RETROUVER
 * n est pas REPONDRE. Ce module branche cette recherche sur un modele de langage,
 * en quatre temps :
 *
 *  1. retrieve : on reutilise TEL QUEL le pipeline hybride du chapitre 7 pour
 *     classer les passages. Le retrieval du RAG, c est la recherche du cours.
 *
 *  2. buildContext : on ne peut pas tout donner au modele, sa fenetre de contexte
 *     est bornee. On ne garde que les k meilleurs passages. Ce budget est le point
 *     de bascule du chapitre : si le bon passage tombe hors des k, le modele ne
 *     pourra pas repondre, aussi bon soit-il.
 *
 *  3. generateGrounded : la generation ANCREE. Le modele ne parle QUE de ce que le
 *     contexte contient, et cite ses sources. Si aucun passage du contexte ne porte
 *     le fait demande, il refuse honnetement plutot que d inventer. La reponse est
 *     donc plafonnee par la qualite du retrieval.
 *
 *  4. generateParametric : le contre-modele. Le LLM SEUL, qui repond de memoire
 *     sans jamais lire les documents. Sa signature ne prend aucun document : c est
 *     precisement ce qui le fait halluciner sur des faits qu il ne connait pas.
 *
 * Aucun texte de langue ici : tout le naturel (FR / EN, les faits, les reponses)
 * reste dans le composant, passe en props depuis le MDX bilingue.
 */

import {
  corpusStats,
  bm25Score,
  cosineSimilarity,
  rank,
  reciprocalRankFusion,
  type Document,
  type ScoredDoc,
} from '../hybrid-search/hybrid-search';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Un passage indexe. Il porte de quoi le CLASSER (tokens, vector : exactement le
 * Document du chapitre 7) et, en plus, de quoi FONDER une reponse : le fait qu il
 * enonce et les requetes qu il permet de traiter.
 */
export interface RagDocument extends Document {
  /** Le texte affiche du passage. */
  text: string;
  /** Le fait ancre que ce passage permet d enoncer, s il en porte un. */
  fact?: string;
  /** Les identifiants des requetes que ce passage sait fonder. */
  answersQueryIds?: string[];
}

/**
 * Une requete utilisateur. Elle porte de quoi la CLASSER (tokens, vector) et deux
 * reponses pre-ecrites pour la demonstration : celle que produirait le modele SEUL
 * (parametrique), et le texte de refus honnete si l ancrage echoue.
 */
export interface RagQuery {
  /** Identifiant stable de la requete. */
  id: string;
  /** Libelle lisible de la requete. */
  label: string;
  /** Tokens lexicaux pour BM25. */
  tokens: string[];
  /** Vecteur de sens pour le cosinus. */
  vector: number[];
  /** La reponse du modele SEUL, produite de memoire, sans acces aux documents. */
  parametricAnswer: string;
  /** Nature de cette reponse parametrique, pour l affichage. */
  parametricStatus: 'hallucinated' | 'vague';
  /** Ce que repond le RAG quand le contexte ne fonde pas la reponse. */
  refusalText: string;
}

/** Un passage classe : son document source, son score fusionne, son rang base sur 1. */
export interface RankedPassage {
  /** Le document source complet. */
  doc: RagDocument;
  /** Le score de fusion reciproque des rangs (RRF). */
  rrfScore: number;
  /** Rang dans le classement hybride, le meilleur valant 1. */
  rank: number;
}

/** Statut d une reponse ancree : soit fondee sur une source, soit un refus honnete. */
export type GroundedStatus = 'grounded' | 'honest-refusal';

/** Une reponse produite par le pipeline RAG. */
export interface GroundedAnswer {
  /** Fondee (grounded) ou refus honnete (honest-refusal). */
  status: GroundedStatus;
  /** Le texte de la reponse, avec ses marqueurs de citation quand elle est fondee. */
  text: string;
  /** Les positions base 1, dans le contexte, des passages cites. Vide si refus. */
  citations: number[];
}

/** Une reponse produite par le modele SEUL, sans retrieval. */
export interface ParametricAnswer {
  /** Le texte de la reponse, produit de memoire. */
  text: string;
  /** Nature de la reponse : hallucination ou reponse vague. */
  status: RagQuery['parametricStatus'];
}

/** Les hyperparametres du retrieval hybride, herites du chapitre 7. */
export interface RetrieveOptions {
  /** Saturation de la frequence de terme (BM25). */
  k1: number;
  /** Force de la normalisation par longueur (BM25). */
  b: number;
  /** Constante d amortissement de la fusion reciproque des rangs. */
  rrfK: number;
}

// ---------------------------------------------------------------------------
// 1. Retrieval : le pipeline hybride du chapitre 7, reutilise tel quel.
// ---------------------------------------------------------------------------

/**
 * Classe les passages pour une requete en rejouant la recherche hybride du
 * chapitre precedent : un classement lexical (BM25), un classement semantique
 * (cosinus), fusionnes par le rang (RRF). Renvoie chaque passage avec son score
 * fusionne et son rang, du meilleur au moins bon.
 */
export function retrieve(
  query: RagQuery,
  documents: RagDocument[],
  options: RetrieveOptions,
): RankedPassage[] {
  const stats = corpusStats(documents);
  const lexScored: ScoredDoc[] = documents.map((d) => ({
    id: d.id,
    score: bm25Score(query.tokens, d, stats, { k1: options.k1, b: options.b }),
  }));
  const semScored: ScoredDoc[] = documents.map((d) => ({
    id: d.id,
    score: cosineSimilarity(query.vector, d.vector),
  }));

  const fused = reciprocalRankFusion([rank(lexScored), rank(semScored)], options.rrfK);

  const byId = new Map<string, RagDocument>();
  for (const d of documents) byId.set(d.id, d);

  return fused.map((entry) => ({
    doc: byId.get(entry.id) as RagDocument,
    rrfScore: entry.score,
    rank: entry.rank,
  }));
}

// ---------------------------------------------------------------------------
// 2. Contexte : le budget borne. On ne garde que les k meilleurs passages.
// ---------------------------------------------------------------------------

/**
 * Retient les k premiers passages du classement pour former le contexte injecte
 * dans le prompt. Modelise la fenetre de contexte bornee du modele : au-dela de
 * k, un passage, meme pertinent, ne sera jamais vu par le generateur.
 */
export function buildContext(ranked: RankedPassage[], k: number): RankedPassage[] {
  if (k <= 0) return [];
  return ranked.slice(0, k);
}

// ---------------------------------------------------------------------------
// 3. Generation ancree : ne parler que du contexte, ou refuser honnetement.
// ---------------------------------------------------------------------------

/**
 * Produit une reponse ANCREE sur le contexte. Cherche, parmi les passages fournis,
 * le premier qui sait fonder la requete (via answersQueryIds). S il existe, la
 * reponse reprend son fait et cite sa position base 1 dans le contexte. Sinon,
 * elle renvoie le refus honnete de la requete, sans rien inventer.
 *
 * Point clef du chapitre : cette fonction ne regarde QUE le contexte recu, jamais
 * le corpus complet. Un fait qui n a pas ete retenu par buildContext est, pour
 * elle, introuvable. La reponse est donc plafonnee par le retrieval.
 */
export function generateGrounded(query: RagQuery, context: RankedPassage[]): GroundedAnswer {
  const index = context.findIndex((passage) =>
    passage.doc.answersQueryIds?.includes(query.id),
  );

  if (index === -1) {
    return { status: 'honest-refusal', text: query.refusalText, citations: [] };
  }

  const source = context[index] as RankedPassage;
  const citation = index + 1;
  const fact = source.doc.fact ?? source.doc.text;
  return {
    status: 'grounded',
    text: `${fact} [${citation}]`,
    citations: [citation],
  };
}

// ---------------------------------------------------------------------------
// 4. Generation parametrique : le modele SEUL, sans document.
// ---------------------------------------------------------------------------

/**
 * Produit la reponse du modele SEUL, de memoire. Sa signature ne prend AUCUN
 * document : il ne peut donc pas s ancrer, et sur un fait prive ou posterieur a
 * son entrainement, il comble le vide par une reponse plausible mais fausse. C est
 * la definition meme de l hallucination, et le probleme que le RAG resout.
 */
export function generateParametric(query: RagQuery): ParametricAnswer {
  return { text: query.parametricAnswer, status: query.parametricStatus };
}
