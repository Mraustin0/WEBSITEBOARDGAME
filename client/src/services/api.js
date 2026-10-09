import { api } from '../lib/api.js';

// Cache tables list so we can resolve code 'T-01' -> ObjectId
let cachedTables = null;

export async function fetchTables(query = {}) {
  const data = await api('/tables', { query });
  const list = Array.isArray(data) ? data : (data?.items ?? []);
  cachedTables = list;

  return list.map((t) => ({
    id: t.code || `T-${String(t.number).padStart(2, '0')}`,
    _id: t._id,
    code: t.code,
    number: t.number,
    capMin: t.minCapacity || 2,
    capMax: t.capacity || 4,
    desc: t.name || t.zone || `โต๊ะ ${t.code || t.number}`,
    status:
      t.status === 'occupied'
        ? 'in-play'
        : t.status === 'reserved'
          ? 'reserved'
          : t.status === 'maintenance'
            ? 'maintenance'
            : 'available',
  }));
}

export function mapGameToUI(g) {
  const categories = (g.categories || []).map((c) => c.toLowerCase().trim().replace(/\s+/g, '-'));
  const vaultCopies = g.copiesInVault ?? g.copies ?? 1;

  return {
    id: g._id,
    _id: g._id,
    title: g.name,
    name: g.name,
    publisher:
      g.publisher ||
      (Array.isArray(g.designers) && g.designers.length
        ? g.designers.join(', ')
        : 'Board Game Studio'),
    cover: g.image || g.thumbnail || '',
    thumbnail: g.thumbnail || g.image || '',
    icon: 'fa-chess',
    tags: [...(g.categories || []), ...(g.mechanics || [])].slice(0, 3),
    categories,
    rawCategories: g.categories || [],
    minPlayers: g.minPlayers ?? 1,
    maxPlayers: g.maxPlayers ?? 4,
    timeMin: g.playtimeMin ?? 30,
    timeMax: g.maxPlaytime || g.playtimeMin || 60,
    weight: g.bggWeight != null ? g.bggWeight.toFixed(1) : '-',
    rating:
      g.bggAverage != null
        ? g.bggAverage.toFixed(1)
        : g.bggRating != null
          ? g.bggRating.toFixed(1)
          : '-',
    stockCount: vaultCopies,
    inUseTables: [],
    status: vaultCopies > 0 ? 'available' : g.status === 'in_use' ? 'in-use' : 'waitlist',
    copiesInVault: g.copiesInVault,
    copiesInPlay: g.copiesInPlay,
    copiesInRepair: g.copiesInRepair,
  };
}

export async function fetchGames(params = {}) {
  const query = { limit: 100, ...params };
  const data = await api('/games', { query });
  const items = Array.isArray(data) ? data : (data?.items ?? []);
  return items.map(mapGameToUI);
}

export async function fetchFloorPlan(params = {}) {
  const data = await api('/tables/floor', { query: params });
  return data;
}

export async function submitBooking(payload) {
  let tableId = payload.table || payload.tableId;

  // Resolve table code to ObjectId if needed
  if (tableId && tableId.length !== 24) {
    if (!cachedTables) {
      await fetchTables();
    }
    const found = cachedTables?.find(
      (t) =>
        t.code === tableId ||
        t._id === tableId ||
        `T-${String(t.number).padStart(2, '0')}` === tableId,
    );
    if (found) {
      tableId = found._id;
    }
  }

  // Calculate startAt and durationHours from slots
  let startAt = payload.startAt;
  let durationHours = payload.durationHours || 1;

  if (!startAt && payload.slots && payload.slots.length > 0) {
    const firstSlot = payload.slots[0];
    const startTimeStr = firstSlot.split(' - ')[0] || '13:00';
    const [hh, mm] = startTimeStr.split(':').map(Number);

    const d = new Date();
    d.setHours(hh || 13, mm || 0, 0, 0);
    startAt = d.toISOString();
    durationHours = payload.slots.length;
  }

  const body = {
    table: tableId,
    game: payload.gameId || payload.game || undefined,
    players: Number(payload.players || payload.guests || 4),
    startAt: startAt || new Date().toISOString(),
    durationHours: Number(durationHours) || 1,
    package: payload.package || 'hourly',
    note: payload.note || '',
  };

  return api('/reservations', { method: 'POST', body });
}

export async function fetchMyReservations(query = {}) {
  return api('/reservations', { query });
}

export async function cancelReservation(id, reason = 'ลูกค้ายกเลิกการจอง') {
  return api(`/reservations/${id}/cancel`, { method: 'PATCH', body: { reason } });
}

export async function extendReservation(id, hours = 1) {
  return api(`/reservations/${id}/extend`, { method: 'PATCH', body: { hours: Number(hours) } });
}

export async function returnGame(id, condition = 'good', damageNote = '') {
  return api(`/reservations/${id}/return`, {
    method: 'PATCH',
    body: { condition, damageNote },
  });
}

export async function callGM(reservationId, topic = 'other', note = 'ขอความช่วยเหลือที่โต๊ะ') {
  return api('/assist', {
    method: 'POST',
    body: { reservation: reservationId, topic, note },
  });
}
