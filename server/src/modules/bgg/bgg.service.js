import { XMLParser } from 'fast-xml-parser';
import { AppError, notFound } from '../../lib/errors.js';
import { createCache } from '../../lib/cache.js';
import { env } from '../../config/env.js';

const BASE = 'https://boardgamegeek.com/xmlapi2';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

// 1 hour cache to be nice to BGG + avoid rate limits during demo
const cache = createCache({ ttlMs: 60 * 60 * 1000, maxEntries: 500 });

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

const pickPrimaryName = (names) => {
  const list = arr(names);
  return list.find((n) => n.type === 'primary')?.value || list[0]?.value || '';
};

const linksOfType = (links, type) =>
  arr(links)
    .filter((l) => l.type === type)
    .map((l) => l.value);

async function fetchXml(path) {
  const cached = cache.get(path);
  if (cached) return cached;

  const headers = {};
  if (env.BGG_TOKEN) {
    headers.Authorization = `Bearer ${env.BGG_TOKEN}`;
  }

  const res = await fetch(`${BASE}${path}`, { headers });
  if (!res.ok) throw new AppError(502, `BGG ${res.status}`);
  const parsed = parser.parse(await res.text());
  cache.set(path, parsed);
  return parsed;
}

export async function search(query) {
  const data = await fetchXml(`/search?query=${encodeURIComponent(query)}&type=boardgame`);
  return arr(data?.items?.item)
    .slice(0, 30)
    .map((it) => ({
      bggId: Number(it.id),
      name: it.name?.value || '',
      yearPublished: it.yearpublished?.value ? Number(it.yearpublished.value) : undefined,
    }));
}

export async function detail(bggId) {
  const data = await fetchXml(`/thing?id=${bggId}&stats=1`);
  const it = arr(data?.items?.item)[0];
  if (!it) throw notFound('game not on BGG');
  const ratings = it.statistics?.ratings ?? {};
  return {
    bggId,
    name: pickPrimaryName(it.name),
    minPlayers: Number(it.minplayers?.value) || 1,
    maxPlayers: Number(it.maxplayers?.value) || 4,
    playtimeMin: Number(it.playingtime?.value) || 60,
    minPlaytime: Number(it.minplaytime?.value) || undefined,
    maxPlaytime: Number(it.maxplaytime?.value) || undefined,
    minAge: Number(it.minage?.value) || undefined,
    yearPublished: Number(it.yearpublished?.value) || undefined,
    thumbnail: it.thumbnail || '',
    image: it.image || it.thumbnail || '',
    description: (it.description || '').toString().replace(/&#10;/g, '\n'),
    bggAverage: Number(ratings.average?.value) || undefined,
    bggRating: Number(ratings.bayesaverage?.value) || undefined,
    bggWeight: Number(ratings.averageweight?.value) || undefined,
    usersRated: Number(ratings.usersrated?.value) || undefined,
    categories: linksOfType(it.link, 'boardgamecategory'),
    mechanics: linksOfType(it.link, 'boardgamemechanic'),
    designers: linksOfType(it.link, 'boardgamedesigner'),
  };
}

/** BGG "hot list" — trending boardgames right now. */
export async function hot() {
  const data = await fetchXml('/hot?type=boardgame');
  return arr(data?.items?.item)
    .slice(0, 50)
    .map((it) => ({
      rank: Number(it.rank),
      bggId: Number(it.id),
      name: it.name?.value || '',
      yearPublished: it.yearpublished?.value ? Number(it.yearpublished.value) : undefined,
      thumbnail: it.thumbnail?.value || '',
    }));
}

// exported for tests
export const _internal = { cache };
