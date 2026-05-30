import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';

import { buildFeedItems } from '../lib/feed';

export const GET: APIRoute = async (context) => {
  const items = await buildFeedItems();

  return rss({
    title: 'Pierrick Fonquerne, cours et recherche',
    description:
      'Nouveaux cours interactifs et notes de recherche, en francais et en anglais. Chaque entree est prefixee par sa langue.',
    site: context.site ?? 'https://pierrick.fonquerne.com',
    items,
    customData: '<language>fr</language>',
  });
};
