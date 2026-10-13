// รายละเอียดราคา: ใช้ได้ทั้ง price จาก server (quote) และราคาประมาณ (estimatePrice)
import { hoursLabel } from '../../../lib/booking.js';
import { baht } from './pricing.js';

function Row({ label, value, muted, accent }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className={muted ? 'text-slate-400' : 'text-slate-600'}>{label}</span>
      <span
        className={`font-semibold whitespace-nowrap ${accent ? 'text-emerald-700' : 'text-slate-800'}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function PriceBreakdown({ price, rules }) {
  if (!price) return null;
  const flat = price.package === 'flat3h';
  const hours = Number(price.hours) || 0;
  const peakHours = Number(price.peakHours) || 0;
  const normalHours = hours - peakHours;
  const extra = Number(price.tableExtraPerHour) || 0;
  const extraHours = flat ? (rules?.FLAT_HOURS ?? 3) : hours;
  const flatPerPerson = rules?.FLAT_3H_PER_PERSON ?? 0;

  return (
    <div className="flex flex-col gap-2">
      {flat ? (
        <Row
          label={`เหมา ${hoursLabel(extraHours)} · ${price.players} คน × ${baht(flatPerPerson)}`}
          value={baht(price.players * flatPerPerson)}
        />
      ) : (
        <>
          {normalHours > 0 && (
            <Row
              label={`${price.players} คน × ${hoursLabel(normalHours)} × ${baht(price.perPersonHour)}`}
              value={baht(price.players * normalHours * price.perPersonHour)}
            />
          )}
          {peakHours > 0 && (
            <Row
              label={`ช่วงพีค: ${price.players} คน × ${hoursLabel(peakHours)} × ${baht(price.peakPerPersonHour)}`}
              value={baht(price.players * peakHours * price.peakPerPersonHour)}
            />
          )}
        </>
      )}
      {extra > 0 && (
        <Row
          label={`ค่าโต๊ะ ${baht(extra)}/ชม. × ${hoursLabel(extraHours)}`}
          value={baht(extra * extraHours)}
        />
      )}
      {price.discount > 0 && (
        <>
          <Row label="รวมก่อนส่วนลด" value={baht(price.subtotal)} muted />
          <Row
            label={`ส่วนลดนักศึกษา ${price.studentDiscountPercent}%`}
            value={`−${baht(price.discount)}`}
            accent
          />
        </>
      )}
      <div className="flex items-baseline justify-between border-t border-dashed border-slate-200 pt-2 mt-1">
        <span className="text-xs font-bold text-slate-700">ยอดรวม</span>
        <span className="text-2xl font-heading font-bold text-[#064e3b]">{baht(price.total)}</span>
      </div>
      {price.deposit > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 flex flex-col gap-1">
          <Row label="มัดจำ (หักตอนเช็คบิล · ไม่มาตามนัดจะไม่ได้คืน)" value={baht(price.deposit)} />
          <Row label="จ่ายที่ร้าน" value={baht(price.dueAtCounter)} />
        </div>
      )}
    </div>
  );
}
