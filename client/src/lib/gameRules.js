// กฎตรวจฟอร์มเกม (เพิ่มเกม / แก้ไขเกม) — ตรงกับ server/src/modules/games/games.schema.js
import { vNumber, vText } from './validate.js';

const THIS_YEAR = new Date().getFullYear();
const URL_MSG = 'ลิงก์รูปไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)';

/** ลิงก์รูป (ไม่บังคับ) ต้องเป็น http(s) */
export function vImageUrl(v) {
  const s = (v ?? '').toString().trim();
  if (!s) return '';
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? '' : URL_MSG;
  } catch {
    return URL_MSG;
  }
}

/** แยกรายการที่คั่นด้วย , */
export const splitList = (s) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

/** รายการคั่นด้วย , (หมวดหมู่ / กลไก / ผู้ออกแบบ) */
export function vList(v, { maxItems, maxLen, label }) {
  const items = splitList(v);
  if (items.length > maxItems) return `${label}ไม่เกิน ${maxItems} รายการ`;
  if (items.some((x) => x.length > maxLen)) return `${label}แต่ละรายการไม่เกิน ${maxLen} ตัวอักษร`;
  return '';
}

const players = (v, label) => vNumber(v, { min: 1, max: 99, integer: true, label });

export function gameRules(f) {
  const minErr = players(f.minPlayers, 'ผู้เล่นขั้นต่ำ');
  const maxErr = players(f.maxPlayers, 'ผู้เล่นสูงสุด');
  return {
    name: vText(f.name, { required: true, max: 200, label: 'ชื่อเกม' }),
    minPlayers: minErr,
    maxPlayers:
      maxErr ||
      (!minErr && Number(f.minPlayers) > Number(f.maxPlayers)
        ? 'ผู้เล่นสูงสุดต้องไม่น้อยกว่าผู้เล่นต่ำสุด'
        : ''),
    playtimeMin: vNumber(f.playtimeMin, { min: 1, max: 1440, integer: true, label: 'เวลาเล่น' }),
    copies: vNumber(f.copies, { min: 1, max: 999, integer: true, label: 'จำนวนกล่อง' }),
    yearPublished:
      f.yearPublished === '' || f.yearPublished == null
        ? ''
        : vNumber(f.yearPublished, { integer: true, label: 'ปีที่ออก' }) ||
          (Number(f.yearPublished) < 1800 || Number(f.yearPublished) > THIS_YEAR + 1
            ? `ปีที่ออกต้องอยู่ระหว่าง 1800–${THIS_YEAR + 1}`
            : ''),
    thumbnail: vImageUrl(f.thumbnail),
    image: vImageUrl(f.image),
    description: vText(f.description, { max: 10000, label: 'คำอธิบาย' }),
    categories: vList(f.categories, { maxItems: 30, maxLen: 80, label: 'หมวดหมู่' }),
    ...(f.mechanics !== undefined && {
      mechanics: vList(f.mechanics, { maxItems: 30, maxLen: 80, label: 'กลไกเกม' }),
    }),
    ...(f.designers !== undefined && {
      designers: vList(f.designers, { maxItems: 20, maxLen: 120, label: 'ผู้ออกแบบ' }),
    }),
  };
}
