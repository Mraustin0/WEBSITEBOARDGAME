// เทสล้าง collection (users, games, reservations, ...) ทิ้ง → บังคับให้ใช้ DB แยกเสมอ
// ไม่ว่า MONGODB_URI ใน server/.env ชี้ DB ไหน จะถูกเปลี่ยนชื่อ DB เป็น boardgame-test
// (ถ้าชื่อ DB ลงท้าย -test อยู่แล้ว เช่นใน CI จะไม่แตะ) — ข้อมูล dev / seed:demo จึงไม่หาย
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
const m = uri?.match(/^(mongodb(?:\+srv)?:\/\/[^/?]+)\/?([^?]*)(\?.*)?$/);
if (m && !/-test$/.test(m[2])) {
  process.env.MONGODB_URI = `${m[1]}/boardgame-test${m[3] ?? ''}`;
}
