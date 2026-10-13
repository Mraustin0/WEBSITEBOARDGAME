// จำนวนกล่องบนการ์ด: ทุกกล่องว่าง → "20 กล่อง", มีซ่อม/กำลังเล่น → "ว่าง 19/20 กล่อง"
// (copiesInVault มาจาก GET /api/games = กล่องบนชั้น ไม่นับที่ซ่อม/กำลังเล่น)
export function copyLabel(g) {
  const copies = g.copies ?? 1;
  const ready = g.copiesInVault ?? copies;
  if (ready === copies) return copies > 1 ? ` · ${copies} กล่อง` : '';
  return ` · ว่าง ${ready}/${copies} กล่อง`;
}
