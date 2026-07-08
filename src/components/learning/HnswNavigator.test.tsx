import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import HnswNavigator from './HnswNavigator';

const labels = {
  mLabel: 'M',
  efLabel: 'ef',
  reshuffleLabel: 'Rebattre',
  stepLabel: 'Pas suivant',
  playLabel: 'Derouler la descente',
  resetLabel: 'Recommencer',
  queryHint: 'Clique dans le cadre pour deplacer la requete.',
  entryLabel: "Point d'entree",
  queryLabel: 'Requete',
  resultLabel: 'Voisin trouve',
  oracleLabel: 'Vrai voisin (oracle)',
  visitedLabel: 'Points visites',
  layerLabel: 'Couche',
  baseLayerLabel: 'Couche de base',
  hitLabel: 'Trouve',
  missLabel: 'Rate',
  statusIdleLabel: 'Pret',
};

describe('HnswNavigator query point keyboard access', () => {
  it('exposes the base layer query point as a focusable, labelled control', () => {
    render(<HnswNavigator seed={2024} pointCount={24} initialM={4} initialEf={8} labels={labels} />);

    const queryPoint = screen.getByRole('slider', { name: labels.queryLabel });
    expect(queryPoint.tabIndex).toBe(0);
  });

  it('moves the query point with the arrow keys', () => {
    render(<HnswNavigator seed={2024} pointCount={24} initialM={4} initialEf={8} labels={labels} />);

    const queryPoint = screen.getByRole('slider', { name: labels.queryLabel });
    const initialX = queryPoint.getAttribute('aria-valuenow');

    fireEvent.keyDown(queryPoint, { key: 'ArrowRight' });

    expect(queryPoint.getAttribute('aria-valuenow')).not.toBe(initialX);
  });
});
