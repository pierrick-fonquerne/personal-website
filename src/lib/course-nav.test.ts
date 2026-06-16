import { describe, expect, it } from 'vitest';

import { buildCourseNav, type CourseGroup } from './course-nav';

const groups: CourseGroup[] = [
  {
    theme: 'ai',
    themeLabel: 'IA',
    subthemes: [{ sub: 'neural-nets', subLabel: 'Réseaux de neurones', courseCount: 2 }],
  },
  {
    theme: 'security',
    themeLabel: 'Sécurité',
    subthemes: [{ sub: 'applied-crypto', subLabel: 'Cryptographie appliquée', courseCount: 1 }],
  },
];

describe('buildCourseNav', () => {
  it('maps each theme to an anchor id, label and total course count', () => {
    const nav = buildCourseNav(groups);
    expect(nav[0]).toEqual({
      theme: 'ai',
      label: 'IA',
      anchorId: 'theme-ai',
      count: 2,
      subthemes: [{ sub: 'neural-nets', label: 'Réseaux de neurones', anchorId: 'sub-neural-nets' }],
    });
  });

  it('sums course counts across subthemes', () => {
    const multi: CourseGroup[] = [
      {
        theme: 'ai',
        themeLabel: 'IA',
        subthemes: [
          { sub: 'a', subLabel: 'A', courseCount: 2 },
          { sub: 'b', subLabel: 'B', courseCount: 3 },
        ],
      },
    ];
    expect(buildCourseNav(multi)[0].count).toBe(5);
  });

  it('returns an empty array for no groups', () => {
    expect(buildCourseNav([])).toEqual([]);
  });
});
