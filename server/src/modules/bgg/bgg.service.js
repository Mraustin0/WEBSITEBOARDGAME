import { XMLParser } from 'fast-xml-parser';
import { AppError, notFound } from '../../lib/errors.js';

const BASE = 'https://boardgamegeek.com/xmlapi2';
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);

const pickPrimaryName = (names) => {
  const list = arr(names);
  return list.find((n) => n.type === 'primary')?.value || list[0]?.value || '';
};

async function fetchXml(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new AppError(502, `BGG ${res.status}`);
  return parser.parse(await res.text());
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
  return {
    bggId,
    name: pickPrimaryName(it.name),
    minPlayers: Number(it.minplayers?.value) || 1,
    maxPlayers: Number(it.maxplayers?.value) || 4,
    playtimeMin: Number(it.playingtime?.value) || 60,
    yearPublished: Number(it.yearpublished?.value) || undefined,
    thumbnail: it.thumbnail || it.image || '',
    description: (it.description || '').toString().replace(/&#10;/g, '\n'),
  };
}
