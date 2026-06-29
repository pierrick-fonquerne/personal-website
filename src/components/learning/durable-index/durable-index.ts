/**
 * Moteur pur de la durabilite d'un index.
 *
 * Le chapitre precedent nous a appris a faire confiance a un index EN MEMOIRE :
 * l'oracle differentiel certifie qu'il retrouve vraiment ce qu'il pretend. Mais
 * cet index vit dans la RAM, et la RAM s'efface au moindre redemarrage. Ce module
 * met en scene le passage au disque et ses deux dangers jumeaux :
 *
 *  1. L'ECRITURE PARTIELLE (torn write). Si la machine tombe en pleine ecriture,
 *     le fichier peut rester a moitie ancien, a moitie neuf : corrompu, et souvent
 *     indetectable a la relecture naive. On modelise quatre strategies de
 *     persistance et un crash injectable a n'importe quelle etape, et on observe
 *     laquelle se dechire et laquelle survit.
 *
 *  2. LA SERIALISATION QUI MENT. Meme sans crash, ecrire puis relire peut ne pas
 *     redonner l'etat de depart : un arrondi de flottants perd de la precision, un
 *     ordre de voisins instable change les octets. On retrouve, transpose a la
 *     persistance, le reflexe du chapitre 5 : un controle LOGIQUE peut rester vert
 *     pendant qu'un oracle de round-trip OCTET POUR OCTET, lui, voit la difference.
 *
 * Le crash est modelise simplement et de facon deterministe : une ecriture est une
 * SUITE ORDONNEE d'operations bas niveau, et un crash apres `stepsExecuted` etapes
 * signifie que les etapes [0, stepsExecuted) ont pris effet et les suivantes non.
 * Le fsync final est modelise comme la barriere obligatoire qui scelle l'ecriture :
 * tant qu'il n'a pas eu lieu, une ecriture par reecriture n'est pas complete.
 *
 * Aucun texte de langue ici : tout le naturel (FR / EN) reste dans le composant.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Un noeud de l'index : un identifiant, son vecteur, ses voisins dans le graphe. */
export interface IndexNode {
  /** Identifiant stable du noeud. */
  id: number;
  /** Le vecteur stocke (flottants : sensible a l'arrondi). */
  vector: number[];
  /** Les identifiants des voisins dans le graphe de proximite. */
  neighbors: number[];
}

/** L'etat complet de l'index, une suite de noeuds (un noeud = un enregistrement). */
export type IndexState = IndexNode[];

/** Les quatre strategies de persistance comparees dans le chapitre. */
export type PersistenceStrategy =
  | 'inPlaceOverwrite'
  | 'atomicRename'
  | 'snapshot'
  | 'appendOnlyLog';

/** Un fichier cible du disque virtuel. */
export type WriteTarget = 'main' | 'temp' | 'log' | 'snapshot';

/** Une operation bas niveau d'un plan d'ecriture. Le composant fournit le libelle. */
export interface WriteStep {
  /** Nature de l'operation. */
  kind: 'writeBlock' | 'fsync' | 'rename' | 'appendRecord';
  /** Fichier touche par l'operation. */
  target: WriteTarget;
  /** Pour writeBlock / appendRecord : index du bloc ou de l'enregistrement concerne. */
  blockIndex?: number;
}

/** Le verdict de recuperation apres un redemarrage. */
export type RecoveryStatus =
  /** L'etat neuf complet a survecu. */
  | 'newIntact'
  /** L'ancien etat complet a survecu : l'ecriture n'a pas ete vue, mais tout est coherent. */
  | 'oldIntact'
  /** Etat coherent mais en retard : un prefixe consistant de l'evolution (journal). */
  | 'staleButIntact'
  /** Melange illisible : une ecriture partielle a dechire le fichier principal. */
  | 'corrupted';

/** Le rapport rendu par la simulation d'un crash. */
export interface RecoveryReport {
  /** Le verdict de recuperation. */
  status: RecoveryStatus;
  /** L'etat reconstruit a la relecture, ou null si le fichier est corrompu. */
  recovered: IndexState | null;
  /** Vrai si l'etat neuf complet a survecu et est durable. */
  isNewDurable: boolean;
}

/** Les interrupteurs de bug de serialisation pour l'oracle de round-trip. */
export interface SerializeOptions {
  /** Bug : l'ordre des voisins n'est pas canonique (instable d'une ecriture a l'autre). */
  nonDeterministicOrder?: boolean;
  /** Bug : les coordonnees sont arrondies a l'ecriture, la precision est perdue. */
  lossyFloat?: boolean;
}

// ---------------------------------------------------------------------------
// Plan d'ecriture : la suite ordonnee d'operations d'une strategie
// ---------------------------------------------------------------------------

/**
 * Construit la suite ordonnee d'operations bas niveau qu'une strategie execute
 * pour faire passer l'index de `oldState` a `newState`. Le journal append-only
 * suppose que `newState` PROLONGE `oldState` (memes premiers noeuds, puis des
 * ajouts) : il n'ecrit alors que les enregistrements du delta.
 */
export function planWrite(
  strategy: PersistenceStrategy,
  oldState: IndexState,
  newState: IndexState,
): WriteStep[] {
  switch (strategy) {
    case 'inPlaceOverwrite': {
      const steps: WriteStep[] = newState.map((_, i) => ({
        kind: 'writeBlock',
        target: 'main',
        blockIndex: i,
      }));
      steps.push({ kind: 'fsync', target: 'main' });
      return steps;
    }
    case 'atomicRename': {
      const steps: WriteStep[] = newState.map((_, i) => ({
        kind: 'writeBlock',
        target: 'temp',
        blockIndex: i,
      }));
      steps.push({ kind: 'fsync', target: 'temp' });
      steps.push({ kind: 'rename', target: 'main' });
      return steps;
    }
    case 'snapshot': {
      const steps: WriteStep[] = newState.map((_, i) => ({
        kind: 'writeBlock',
        target: 'snapshot',
        blockIndex: i,
      }));
      steps.push({ kind: 'fsync', target: 'snapshot' });
      steps.push({ kind: 'rename', target: 'main' });
      return steps;
    }
    case 'appendOnlyLog': {
      const delta = Math.max(0, newState.length - oldState.length);
      const steps: WriteStep[] = [];
      for (let i = 0; i < delta; i += 1) {
        steps.push({ kind: 'appendRecord', target: 'log', blockIndex: oldState.length + i });
      }
      steps.push({ kind: 'fsync', target: 'log' });
      return steps;
    }
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Simulation d'un crash et recuperation
// ---------------------------------------------------------------------------

function cloneState(state: IndexState): IndexState {
  return state.map((node) => ({
    id: node.id,
    vector: [...node.vector],
    neighbors: [...node.neighbors],
  }));
}

/**
 * Simule un crash apres `stepsExecuted` etapes du plan d'ecriture de `strategy`,
 * puis recupere ce que le disque permet de relire. Le coeur du chapitre :
 *
 *  - inPlaceOverwrite ecrit directement dans le fichier principal. Tant que les N
 *    blocs ne sont pas tous ecrits ET le fsync final passe, le fichier est un
 *    melange ancien / neuf, donc CORROMPU. Seule la sequence complete donne newIntact.
 *  - atomicRename ecrit a cote (temp), puis publie par un renommage atomique en
 *    derniere etape : le principal reste l'ancien intact jusqu'au renommage, jamais
 *    corrompu. Tout ou rien.
 *  - snapshot publie une copie complete par le meme renommage atomique : tout ou rien.
 *  - appendOnlyLog n'ajoute que des enregistrements ; la relecture rejoue le journal
 *    et tronque une eventuelle queue dechiree. On recupere toujours un prefixe
 *    consistant : oldIntact, staleButIntact, ou newIntact, jamais corrupted.
 */
export function simulateCrash(
  strategy: PersistenceStrategy,
  oldState: IndexState,
  newState: IndexState,
  stepsExecuted: number,
): RecoveryReport {
  const plan = planWrite(strategy, oldState, newState);
  const done = Math.max(0, Math.min(stepsExecuted, plan.length));
  const complete = done >= plan.length;

  switch (strategy) {
    case 'inPlaceOverwrite': {
      if (done === 0) {
        return { status: 'oldIntact', recovered: cloneState(oldState), isNewDurable: false };
      }
      if (complete) {
        return { status: 'newIntact', recovered: cloneState(newState), isNewDurable: true };
      }
      // Any partial write to the main file leaves a torn mix of old and new blocks.
      return { status: 'corrupted', recovered: null, isNewDurable: false };
    }

    case 'atomicRename':
    case 'snapshot': {
      // The main file only changes at the final rename step.
      if (complete) {
        return { status: 'newIntact', recovered: cloneState(newState), isNewDurable: true };
      }
      return { status: 'oldIntact', recovered: cloneState(oldState), isNewDurable: false };
    }

    case 'appendOnlyLog': {
      const delta = Math.max(0, newState.length - oldState.length);
      // Each completed appendRecord step is one durable record ; the trailing fsync
      // is the last step. Replaying the log rebuilds old + the appended prefix.
      const appended = Math.min(done, delta);
      const recovered = cloneState(oldState).concat(
        cloneState(newState.slice(oldState.length, oldState.length + appended)),
      );
      if (appended === 0) {
        return { status: 'oldIntact', recovered, isNewDurable: false };
      }
      if (appended >= delta) {
        return { status: 'newIntact', recovered, isNewDurable: true };
      }
      return { status: 'staleButIntact', recovered, isNewDurable: false };
    }

    default:
      return { status: 'corrupted', recovered: null, isNewDurable: false };
  }
}

// ---------------------------------------------------------------------------
// Serialisation et oracle de round-trip
// ---------------------------------------------------------------------------

function serializeNode(node: IndexNode, options: SerializeOptions): string {
  const coords = node.vector.map((v) => (options.lossyFloat ? v.toFixed(1) : String(v)));
  const neighbors = [...node.neighbors];
  // Canonical order is ascending ; the bug emits a different (descending) order to
  // model a serializer whose record order is not stable across writes.
  neighbors.sort((a, b) => (options.nonDeterministicOrder ? b - a : a - b));
  return `${node.id}|${coords.join(',')}|${neighbors.join(',')}`;
}

/**
 * Serialise l'etat en une chaine. La forme canonique trie les noeuds par
 * identifiant et les voisins par ordre croissant, en pleine precision. Les options
 * activent les bugs : `lossyFloat` arrondit les coordonnees, `nonDeterministicOrder`
 * emet les voisins dans un ordre non canonique.
 */
export function serialize(state: IndexState, options: SerializeOptions = {}): string {
  return [...state]
    .sort((a, b) => a.id - b.id)
    .map((node) => serializeNode(node, options))
    .join(';');
}

/**
 * Relit une chaine produite par `serialize` et reconstruit l'etat de l'index.
 * L'ordre des voisins est conserve tel qu'il a ete ecrit (la relecture ne
 * recanonicalise pas : c'est ce qui rend le bug d'ordre observable octet pour octet).
 */
export function deserialize(blob: string): IndexState {
  if (blob === '') return [];
  return blob.split(';').map((record) => {
    const [idPart, vectorPart, neighborPart] = record.split('|');
    const id = Number(idPart);
    const vector = (vectorPart ?? '') === '' ? [] : (vectorPart as string).split(',').map(Number);
    const neighbors = (neighborPart ?? '') === '' ? [] : (neighborPart as string).split(',').map(Number);
    return { id, vector, neighbors };
  });
}

function logicallyEqual(a: IndexState, b: IndexState): boolean {
  if (a.length !== b.length) return false;
  const byId = new Map(b.map((node) => [node.id, node]));
  for (const node of a) {
    const other = byId.get(node.id);
    if (!other) return false;
    if (node.vector.length !== other.vector.length) return false;
    for (let i = 0; i < node.vector.length; i += 1) {
      if (node.vector[i] !== other.vector[i]) return false;
    }
    // Logical equality compares neighbor SETS, blind to their order.
    if (new Set(node.neighbors).size !== new Set(other.neighbors).size) return false;
    const set = new Set(other.neighbors);
    for (const n of node.neighbors) {
      if (!set.has(n)) return false;
    }
  }
  return true;
}

/**
 * Controle LOGIQUE de round-trip : ecrit l'etat (avec les bugs eventuels), le
 * relit, et verifie l'egalite LOGIQUE (memes noeuds, memes vecteurs, memes
 * ensembles de voisins). Aveugle a l'ordre des voisins : un ordre instable lui
 * echappe, exactement comme les controles locaux du chapitre 5.
 */
export function roundTripLogicalEquals(state: IndexState, options: SerializeOptions = {}): boolean {
  return logicallyEqual(deserialize(serialize(state, options)), state);
}

/**
 * Oracle de round-trip OCTET POUR OCTET : les octets reellement ecrits (avec les
 * bugs eventuels) doivent etre identiques a la reference canonique. Strict, il
 * attrape l'arrondi des flottants ET l'ordre instable des voisins : c'est l'oracle
 * differentiel du chapitre 5 transpose a la persistance.
 */
export function roundTripBytesEqual(state: IndexState, options: SerializeOptions = {}): boolean {
  return serialize(state, options) === serialize(state, {});
}
