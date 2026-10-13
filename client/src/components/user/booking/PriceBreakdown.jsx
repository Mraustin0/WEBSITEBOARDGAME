// รายละเอียดราคา: ใช้ได้ทั้ง price จาก server (quote) และราคาประมาณ (estimatePrice)
import { hoursLabel } from '../../../lib/booking.js';
import { baht } from './pricing.js';

function Row({ label, value, muted, accent }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className={`min-w-0 flex-1 ${muted ? 'text-slate-500' : 'text-slate-700'}`}>
        {label}
      </span>
      <span
        className={`shrink-0 font-semibold whitespace-nowrap ${accent ? 'text-teal-dark' : 'text-ink'}`}
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
      <div className="flex items-baseline justify-between border-t border-dashed border-ink/20 pt-2 mt-1">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">ยอดรวม</span>
        <span className="text-2xl font-heading text-forest">{baht(price.total)}</span>
      </div>
      {price.deposit > 0 && (
        <div className="rounded-xl bg-mustard-light/60 border border-mustard/50 px-3 py-2 flex flex-col gap-1.5">
          <Row
            label={
              <>
                <span className="font-semibold text-ink">มัดจำ</span>{' '}
                <span className="block text-[10px] leading-snug text-slate-600">
                  (หักตอนเช็คบิล · ไม่มาตามนัดจะไม่ได้คืน)
                </span>
              </>
            }
            value={baht(price.deposit)}
          />
          <Row label="จ่ายที่ร้าน" value={baht(price.dueAtCounter)} />
        </div>
      )}
    </div>
  );
}
