// หน้าแรกของร้าน (/) — แนะนำร้าน, ฟีเจอร์ที่ใช้ได้จริง, เกมแนะนำจากคลัง, ขั้นตอนจอง, บรรยากาศร้าน
// ข้อมูลจริงจาก API: จำนวนเกม, เกมคะแนน BGG สูงสุด, เวลาเปิด-ปิด/ราคา (ถ้าโหลดไม่ได้ ส่วนนั้นจะซ่อนไป)
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useSession } from '../lib/session.js';
import { fetchGames, fetchRules } from '../services/api.js';
import { BoardBorder, Photo } from '../components/brand/Brand.jsx';
import { openingHoursText } from '../components/brand/hours.js';
import {
  CalendarIcon,
  CardsIcon,
  ClockIcon,
  DiceIcon,
  FamilyIcon,
  GameBoxIcon,
  MeepleIcon,
  StarIcon,
  TableIcon,
  TrophyIcon,
} from '../components/brand/BrandIcons.jsx';

const playersText = (g) =>
  g.minPlayers && g.maxPlayers && g.minPlayers !== g.maxPlayers
    ? `${g.minPlayers}–${g.maxPlayers} คน`
    : `${g.maxPlayers || g.minPlayers || '-'} คน`;

const FEATURES = [
  {
    Icon: GameBoxIcon,
    tint: 'bg-mustard-light',
    title: 'เกมให้เลือกเยอะ',
    body: 'ตั้งแต่เกมปาร์ตี้เล่นง่าย เกมครอบครัว ไปจนถึงเกมวางแผนจัดเต็ม ดูคะแนนและความยากจาก BoardGameGeek ประกอบการเลือกได้',
  },
  {
    Icon: TableIcon,
    tint: 'bg-cream',
    title: 'จองโต๊ะออนไลน์ เห็นโต๊ะว่างแบบเรียลไทม์',
    body: 'เปิดผังร้านดูได้เลยว่าโต๊ะไหนว่างช่วงเวลาที่อยากมา เลือกโต๊ะเองแล้วจองได้ในไม่กี่คลิก',
  },
  {
    Icon: MeepleIcon,
    tint: 'bg-forest-100',
    title: 'มีพนักงานสอนเล่น — มือใหม่ก็สนุก',
    body: 'ไม่เคยเล่นมาก่อนก็ไม่ต้องกังวล กดเรียกพนักงานจากมือถือให้มาอธิบายกติกาที่โต๊ะได้ทันที',
  },
  {
    Icon: CardsIcon,
    tint: 'bg-brick-light',
    title: 'เลือกเกมพร้อมจองล่วงหน้า',
    body: 'ล็อกเกมที่อยากเล่นไว้กับการจอง มาถึงร้านก็เริ่มเล่นได้เลย ไม่ต้องลุ้นว่ากล่องจะว่างไหม',
  },
  {
    Icon: ClockIcon,
    tint: 'bg-teal-light',
    title: 'ต่อเวลา / คืนเกมเองได้',
    body: 'เกมยังไม่จบ? ต่อเวลาจากหน้า “การจองของฉัน” ได้เลย เล่นเสร็จก็กดคืนเกมเองได้ ไม่ต้องรอคิว',
  },
  {
    Icon: FamilyIcon,
    tint: 'bg-mustard-light',
    title: 'เหมาะกับครอบครัวและเพื่อน',
    body: 'มีโต๊ะหลายขนาดสำหรับมาเป็นคู่ไปจนถึงแก๊งใหญ่ พร้อมรีวิวเกมจากสมาชิกช่วยเลือกเกมที่ใช่',
  },
];

const STEPS = [
  {
    Icon: CalendarIcon,
    color: 'bg-brick',
    title: 'เลือกเกม',
    body: 'เปิดคลังบอร์ดเกม กรองตามจำนวนคน เวลาเล่น หรือความยาก แล้วเลือกเกมที่อยากลอง',
    to: '/catalog',
    cta: 'ไปที่คลังเกม',
  },
  {
    Icon: TableIcon,
    color: 'bg-mustard',
    title: 'จองโต๊ะ',
    body: 'เลือกวัน เวลา จำนวนคน แล้วจิ้มโต๊ะว่างบนผังร้าน ระบบสรุปราคาให้ก่อนยืนยัน',
    to: '/booking',
    cta: 'เปิดผังโต๊ะ',
  },
  {
    Icon: DiceIcon,
    color: 'bg-teal',
    title: 'มาเล่นที่ร้าน',
    body: 'มาถึงแจ้งชื่อกับพนักงาน เกมที่เลือกไว้พร้อมรอที่โต๊ะ ทอยลูกเต๋าได้เลย!',
    to: '/reservations',
    cta: 'ดูการจองของฉัน',
  },
];

const GALLERY = [
  {
    src: '/images/play-1.jpg',
    alt: 'เพื่อน ๆ ล้อมวงเล่นบอร์ดเกมในร้าน',
    cap: 'แก๊งเพื่อนวันศุกร์',
    rot: '-rotate-2',
  },
  {
    src: '/images/play-2.jpg',
    alt: 'ครอบครัวเล่นบอร์ดเกมด้วยกัน',
    cap: 'ครอบครัวสุดสัปดาห์',
    rot: 'rotate-2',
  },
  {
    src: '/images/play-3.jpg',
    alt: 'การ์ดและลูกเต๋าบนโต๊ะเกม',
    cap: 'ตาสุดท้ายลุ้นสุดตัว',
    rot: '-rotate-1',
  },
  {
    src: '/images/play-4.jpg',
    alt: 'ชั้นวางบอร์ดเกมในร้าน',
    cap: 'ชั้นเกมให้เลือกจุใจ',
    rot: 'rotate-3',
  },
];

const STYLES = {
  beginner: {
    label: 'มือใหม่',
    Icon: MeepleIcon,
    headline: 'ไม่เคยเล่นก็มาได้ เราช่วยตั้งแต่ตาแรก',
    points: [
      'เริ่มจากเกมที่มีป้าย “เหมาะกับมือใหม่” กติกาสั้น เล่นจบใน 30–60 นาที',
      'กรองเกมในคลังตามจำนวนคนในแก๊ง ไม่ต้องเดาว่าเกมไหนเล่นได้',
      'ระหว่างเล่นกดเรียกพนักงานมาสอนกติกาที่โต๊ะได้เลย',
      'เล่นจบแล้วให้คะแนนรีวิว ช่วยเพื่อนมือใหม่คนต่อไปเลือกเกม',
    ],
    cta: { to: '/catalog', label: 'หาเกมเล่นง่าย ๆ' },
  },
  pro: {
    label: 'สายโปร',
    Icon: TrophyIcon,
    headline: 'เกมใหญ่ เวลายาว จองไว้ไม่พลาดกล่อง',
    points: [
      'ดูคะแนน BGG และค่าความยากก่อนเลือก ป้าย “สายวางแผน” คือเกมหนักจัดเต็ม',
      'ล็อกกล่องเกมไว้กับการจองล่วงหน้า มาถึงเปิดกล่องเล่นได้ทันที',
      'จองโต๊ะยาวหลายชั่วโมงสำหรับแคมเปญใหญ่ เกมยังไม่จบก็ต่อเวลาจากมือถือ',
      'อ่านรีวิวจากสมาชิกคนอื่น ก่อนลองเกมใหม่ในคลัง',
    ],
    cta: { to: '/booking', label: 'จองโต๊ะสำหรับเกมยาว' },
  },
};

function SectionHeading({ eyebrow, title, desc, light = false, center = true }) {
  return (
    <div className={`max-w-2xl ${center ? 'mx-auto text-center' : ''}`}>
      {eyebrow && (
        <span
          className={`inline-block text-xs font-bold tracking-wide px-3 py-1 rounded-full mb-3 ${
            light ? 'bg-cream/15 text-mustard' : 'bg-forest-100 text-forest'
          }`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={`font-heading text-3xl sm:text-4xl leading-tight ${light ? 'text-cream' : 'text-forest'}`}
      >
        {title}
      </h2>
      {desc && (
        <p className={`mt-3 text-sm sm:text-base ${light ? 'text-cream/80' : 'text-slate-600'}`}>
          {desc}
        </p>
      )}
    </div>
  );
}

/** กรอบรูปโพลารอยด์เอียง ๆ เหมือนแปะบนกระดาษ */
function Polaroid({ src, alt, caption, variant, className = '', photoClass = 'aspect-[4/3]' }) {
  return (
    <figure
      className={`bg-cream-light p-2.5 pb-2 rounded-sm shadow-xl ring-1 ring-ink/10 ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute -top-3 left-1/2 -translate-x-1/2 w-16 h-5 bg-mustard/70 rotate-[-3deg] rounded-sm"
      />
      <Photo src={src} alt={alt} variant={variant} className={`w-full ${photoClass}`} />
      {caption && (
        <figcaption className="font-heading text-ink text-sm text-center pt-2 pb-0.5 truncate">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

function GameCover({ src, name }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <div className="paper w-full h-full flex items-center justify-center">
        <GameBoxIcon size={64} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={`กล่องเกม ${name}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
    />
  );
}

function GameCard({ g }) {
  const weight = g.bggWeight != null ? Number(g.bggWeight) : null;
  const easy = weight != null && weight > 0 && weight <= 2;
  const heavy = weight != null && weight >= 3;
  return (
    <article className="group flex flex-col bg-white rounded-2xl border-2 border-ink overflow-hidden shadow-[4px_4px_0_0_#1f2a1f] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#1f2a1f] transition">
      <div className="relative aspect-square bg-cream overflow-hidden border-b-2 border-ink">
        <GameCover src={g.cover || g.thumbnail} name={g.name} />
        {g.rating && (
          <span
            className="absolute top-2 left-2 inline-flex items-center gap-1 bg-mustard text-ink text-xs font-bold px-2 py-0.5 rounded-full border-2 border-ink"
            title="คะแนนเฉลี่ยจาก BoardGameGeek"
          >
            <i className="fa-solid fa-star text-[10px]" aria-hidden="true"></i>
            {g.rating}
            <span className="sr-only">คะแนน BGG</span>
          </span>
        )}
      </div>
      <div className="flex-1 flex flex-col p-3 sm:p-4 gap-2">
        <h3 className="font-heading text-base sm:text-lg text-ink leading-snug line-clamp-2">
          {g.name}
        </h3>
        <p className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1">
          <span className="whitespace-nowrap">
            <i className="fa-solid fa-user-group mr-1 text-forest" aria-hidden="true"></i>
            {playersText(g)}
          </span>
          <span className="whitespace-nowrap">
            <i className="fa-regular fa-clock mr-1 text-forest" aria-hidden="true"></i>
            {g.playtimeMin ?? 60} นาที
          </span>
        </p>
        {(easy || heavy) && (
          <div className="flex flex-wrap gap-1.5">
            {easy && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-forest-100 text-forest-800">
                เหมาะกับมือใหม่
              </span>
            )}
            {heavy && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brick-light text-brick-dark">
                สายวางแผน
              </span>
            )}
          </div>
        )}
        <Link
          to={`/booking?game=${g._id}`}
          className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-forest text-cream text-xs sm:text-sm font-bold px-3 py-2 leading-tight text-center hover:bg-forest-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-300 transition"
        >
          จองโต๊ะเล่นเกมนี้
        </Link>
      </div>
    </article>
  );
}

function GameCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white overflow-hidden animate-pulse">
      <div className="aspect-square bg-slate-100" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-8 bg-slate-100 rounded-full mt-3" />
      </div>
    </div>
  );
}

export default function Home() {
  const user = useSession();
  const [gameTotal, setGameTotal] = useState(null);
  const [rules, setRules] = useState(null);
  const [games, setGames] = useState(null); // null = กำลังโหลด, [] = ไม่มี/โหลดไม่ได้
  const [style, setStyle] = useState('beginner');

  useEffect(() => {
    let alive = true;
    api('/games', { query: { limit: 1 } })
      .then((d) => alive && setGameTotal(d?.total ?? d?.counts?.total ?? null))
      .catch(() => {});
    fetchRules()
      .then((r) => alive && setRules(r))
      .catch(() => {});

    const score = (g) => Number(g.bggRating ?? g.bggAverage ?? 0);
    fetchGames({ sort: 'bggRating', order: 'desc', limit: 8 })
      .catch(() => fetchGames({ limit: 50 })) // เผื่อ server ไม่รองรับ sort นี้ → เรียงเองฝั่ง client
      .then((list) => {
        if (!alive) return;
        const sorted = [...(list ?? [])].sort((a, b) => score(b) - score(a)).slice(0, 8);
        setGames(sorted);
      })
      .catch(() => alive && setGames([]));
    return () => {
      alive = false;
    };
  }, []);

  const hours = openingHoursText(rules?.OPERATING);
  const price = rules?.PRICE_PER_PERSON_HOUR;
  const advance = rules?.MAX_ADVANCE_DAYS;
  const active = STYLES[style];

  const stats = [
    gameTotal > 0 && {
      icon: 'fa-chess-knight',
      text: `${gameTotal.toLocaleString('th-TH')} เกมในคลัง`,
    },
    price > 0 && { icon: 'fa-coins', text: `เริ่ม ${price} บาท/คน/ชม.` },
    advance > 0 && { icon: 'fa-calendar-days', text: `จองล่วงหน้าได้ ${advance} วัน` },
  ].filter(Boolean);

  return (
    <div className="bg-cream-light text-ink">
      {/* ---------- Hero ---------- */}
      <section className="relative bg-forest text-cream overflow-hidden">
        <BoardBorder className="h-3" />
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(#f5f5dc 1.2px, transparent 1.2px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold bg-cream/10 border border-cream/20 text-cream px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-mustard" aria-hidden="true" />
              คาเฟ่บอร์ดเกม{hours ? ` · ${hours}` : ' · เปิดทุกวัน'}
            </span>
            <h1 className="font-heading mt-5 text-4xl sm:text-5xl lg:text-6xl leading-[1.15]">
              มารวมตัวกัน
              <br />
              เล่นบอร์ดเกม
              <br />
              <span className="text-mustard">ด้วยกันทุกวัน</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-cream/85 max-w-xl leading-relaxed">
              มือใหม่ก็สนุก สายโปรก็จุใจ — เลือกเกมจากคลังของร้าน ดูโต๊ะว่างแบบเรียลไทม์
              แล้วจองได้ในไม่กี่คลิก มาถึงร้านก็ทอยเต๋าได้เลย
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/booking"
                className="inline-flex items-center gap-2 rounded-full bg-brick text-white font-bold px-6 py-3 text-base shadow-[0_4px_0_0_#8f3434] hover:bg-brick-dark hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-mustard transition"
              >
                <i className="fa-solid fa-chair" aria-hidden="true"></i>
                จองโต๊ะ
              </Link>
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-full border-2 border-cream text-cream font-bold px-6 py-3 text-base hover:bg-cream hover:text-forest focus:outline-none focus-visible:ring-4 focus-visible:ring-mustard transition"
              >
                <i className="fa-solid fa-book-open" aria-hidden="true"></i>
                ดูคลังบอร์ดเกม
              </Link>
            </div>
            {stats.length > 0 && (
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/90">
                {stats.map((s) => (
                  <li key={s.text} className="inline-flex items-center gap-2">
                    <i className={`fa-solid ${s.icon} text-mustard`} aria-hidden="true"></i>
                    {s.text}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* คอลลาจรูปโพลารอยด์ */}
          <div className="relative h-[330px] sm:h-[440px] lg:h-[460px] max-w-lg w-full mx-auto">
            <Polaroid
              src="/images/hero.jpg"
              alt="เพื่อน ๆ หัวเราะกันรอบโต๊ะบอร์ดเกม"
              caption="คืนบอร์ดเกมกับแก๊งเพื่อน"
              variant={0}
              className="absolute left-0 top-6 w-[74%] -rotate-3 z-10"
            />
            <Polaroid
              src="/images/play-1.jpg"
              alt="ครอบครัวเล่นบอร์ดเกมด้วยกัน"
              caption="ครอบครัวก็สนุก"
              variant={1}
              className="absolute right-0 top-0 w-[46%] rotate-6 z-20"
            />
            <Polaroid
              src="/images/play-2.jpg"
              alt="มือกำลังวางการ์ดบนกระดานเกม"
              caption="ตานี้ต้องชนะ!"
              variant={2}
              className="absolute right-[4%] bottom-0 w-[52%] -rotate-2 z-30"
            />
            <div
              className="absolute left-[6%] bottom-2 z-30 rotate-12 drop-shadow-lg"
              aria-hidden="true"
            >
              <DiceIcon size={56} />
            </div>
          </div>
        </div>
        <BoardBorder className="h-3" />
      </section>

      {/* ---------- ทำไมต้องเรา ---------- */}
      <section className="paper py-16 sm:py-20" aria-labelledby="why-title">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow="ทำไมต้อง Boardgame Everyday"
            title={<span id="why-title">ร้านที่ทำให้การรวมแก๊งเล่นเกม ง่ายขึ้นทุกขั้นตอน</span>}
            desc="ตั้งแต่เลือกเกม จองโต๊ะ จนถึงเรียกพนักงาน ทำได้จากมือถือเครื่องเดียว"
          />
          <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {FEATURES.map(({ Icon, tint, title, body }) => (
              <div
                key={title}
                className="bg-white rounded-3xl border-2 border-ink p-6 shadow-[5px_5px_0_0_#1f2a1f] flex flex-col gap-4"
              >
                <div
                  className={`w-16 h-16 rounded-2xl ${tint} border-2 border-ink flex items-center justify-center`}
                >
                  <Icon size={44} />
                </div>
                <div>
                  <h3 className="font-heading text-xl text-forest leading-snug">{title}</h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- เกมแนะนำ ---------- */}
      {(games === null || games.length > 0) && (
        <section
          className="bg-cream-light py-16 sm:py-20 border-t-2 border-ink/10"
          aria-labelledby="rec-title"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <SectionHeading
                center={false}
                eyebrow="คะแนนสูงจาก BoardGameGeek"
                title={<span id="rec-title">เกมแนะนำ</span>}
                desc="เกมยอดนิยมในคลังของร้าน กดจองโต๊ะพร้อมเกมนี้ได้ทันที"
              />
              <Link
                to="/catalog"
                className="self-start sm:self-auto inline-flex items-center gap-2 rounded-full border-2 border-forest text-forest font-bold px-5 py-2 text-sm hover:bg-forest hover:text-cream transition whitespace-nowrap"
              >
                ดูเกมทั้งหมด <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </Link>
            </div>
            <div
              className="mt-10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
              aria-busy={games === null}
            >
              {games === null
                ? Array.from({ length: 8 }, (_, i) => <GameCardSkeleton key={i} />)
                : games.map((g) => <GameCard key={g._id} g={g} />)}
            </div>
          </div>
        </section>
      )}

      {/* ---------- 3 ขั้นตอน ---------- */}
      <section className="bg-forest-50 py-16 sm:py-20" aria-labelledby="steps-title">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow="ง่ายกว่าที่คิด"
            title={<span id="steps-title">เริ่มเล่นง่าย ๆ 3 ขั้นตอน</span>}
          />
          <div className="relative mt-12">
            {/* เส้นทางเดินแบบกระดานเกมเชื่อมแต่ละขั้น */}
            <div
              aria-hidden="true"
              className="hidden md:block absolute top-10 left-[16%] right-[16%] border-t-4 border-dashed border-forest-300"
            />
            <ol className="relative grid md:grid-cols-3 gap-8 md:gap-6">
              {STEPS.map(({ Icon, color, title, body, to, cta }, i) => (
                <li key={title} className="relative flex flex-col items-center text-center">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-3xl bg-white border-2 border-ink shadow-[4px_4px_0_0_#1f2a1f] flex items-center justify-center">
                      <Icon size={48} />
                    </div>
                    <span
                      className={`absolute -top-3 -right-3 w-9 h-9 rounded-full ${color} border-2 border-ink text-white font-heading text-lg flex items-center justify-center`}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="mt-5 font-heading text-2xl text-forest">{title}</h3>
                  <p className="mt-2 text-sm text-slate-600 max-w-xs leading-relaxed">{body}</p>
                  <Link
                    to={to}
                    className="mt-3 text-sm font-bold text-teal hover:text-teal-dark underline-offset-4 hover:underline"
                  >
                    {cta} →
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ---------- มือใหม่ / สายโปร ---------- */}
      <section className="paper py-16 sm:py-20" aria-labelledby="style-title">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <SectionHeading
              center={false}
              eyebrow="เล่นแบบไหนก็มีที่ให้คุณ"
              title={<span id="style-title">มือใหม่ หรือ สายโปร?</span>}
              desc="เลือกสไตล์ของคุณ แล้วดูว่าจะใช้ร้านเราให้สนุกที่สุดได้อย่างไร"
            />
            <div
              role="tablist"
              aria-label="สไตล์ผู้เล่น"
              className="mt-6 inline-flex p-1 rounded-full bg-white border-2 border-ink"
            >
              {Object.entries(STYLES).map(([key, s]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  id={`tab-${key}`}
                  aria-selected={style === key}
                  aria-controls="style-panel"
                  onClick={() => setStyle(key)}
                  className={`px-5 sm:px-6 py-2 rounded-full text-sm font-bold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-forest-300 ${
                    style === key ? 'bg-forest text-cream' : 'text-slate-600 hover:text-forest'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div
            id="style-panel"
            role="tabpanel"
            aria-labelledby={`tab-${style}`}
            className="bg-white rounded-3xl border-2 border-ink shadow-[6px_6px_0_0_#1f2a1f] overflow-hidden"
          >
            <div
              className={`flex items-center gap-4 px-6 py-5 border-b-2 border-ink ${
                style === 'beginner' ? 'bg-forest-100' : 'bg-mustard-light'
              }`}
            >
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-white border-2 border-ink flex items-center justify-center">
                <active.Icon size={40} />
              </div>
              <h3 className="font-heading text-xl sm:text-2xl text-forest leading-snug">
                {active.headline}
              </h3>
            </div>
            <ul className="px-6 py-5 space-y-3">
              {active.points.map((p) => (
                <li key={p} className="flex gap-3 text-sm sm:text-base text-slate-700">
                  <span className="mt-0.5 shrink-0">
                    <StarIcon size={20} />
                  </span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <div className="px-6 pb-6">
              <Link
                to={active.cta.to}
                className="inline-flex items-center gap-2 rounded-full bg-forest text-cream font-bold px-5 py-2.5 text-sm hover:bg-forest-800 transition"
              >
                {active.cta.label} <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- บรรยากาศในร้าน ---------- */}
      <section
        className="bg-cream-light py-16 sm:py-20 border-t-2 border-ink/10"
        aria-labelledby="gallery-title"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <SectionHeading
            eyebrow="แวะมานั่งเล่นกัน"
            title={<span id="gallery-title">บรรยากาศในร้าน</span>}
            desc="มุมสบาย ๆ เสียงหัวเราะ และลูกเต๋าที่กลิ้งไม่หยุด"
          />
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-8">
            {GALLERY.map((p, i) => (
              <Polaroid
                key={p.src}
                src={p.src}
                alt={p.alt}
                caption={p.cap}
                variant={i}
                photoClass="aspect-square"
                className={`relative ${p.rot} hover:rotate-0 hover:scale-[1.02] transition`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ท้ายหน้า ---------- */}
      <section className="relative bg-brick text-white overflow-hidden">
        <BoardBorder className="h-3" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-14 sm:py-16 flex flex-col md:flex-row md:items-center gap-8">
          <div className="hidden sm:flex shrink-0 w-24 h-24 rounded-3xl bg-cream border-2 border-ink items-center justify-center rotate-[-6deg] shadow-[5px_5px_0_0_#1f2a1f]">
            <MeepleIcon size={64} fill="#2f4f2f" />
          </div>
          <div className="flex-1">
            <h2 className="font-heading text-3xl sm:text-4xl leading-tight">
              ชวนเพื่อนมาสักตาไหม?
            </h2>
            <p className="mt-2 text-white/90 text-sm sm:text-base">
              {hours ? `${hours} · ` : ''}จองโต๊ะไว้ก่อน มาถึงก็เล่นได้เลย ไม่ต้องรอคิว
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/booking"
              className="inline-flex items-center gap-2 rounded-full bg-cream text-brick-dark font-bold px-6 py-3 shadow-[0_4px_0_0_#1f2a1f] hover:-translate-y-0.5 focus:outline-none focus-visible:ring-4 focus-visible:ring-mustard transition"
            >
              <i className="fa-solid fa-chair" aria-hidden="true"></i>
              จองโต๊ะเลย
            </Link>
            {user ? (
              <Link
                to="/reservations"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white text-white font-bold px-6 py-3 hover:bg-white hover:text-brick-dark transition"
              >
                การจองของฉัน
              </Link>
            ) : (
              <Link
                to="/signin"
                state={{ from: '/booking' }}
                className="inline-flex items-center gap-2 rounded-full border-2 border-white text-white font-bold px-6 py-3 hover:bg-white hover:text-brick-dark transition"
              >
                สมัครสมาชิกฟรี
              </Link>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
