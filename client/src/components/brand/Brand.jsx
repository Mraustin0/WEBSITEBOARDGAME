// องค์ประกอบแบรนด์ที่ใช้ซ้ำทั้งเว็บ: โลโก้, แถบลายขอบบอร์ดเกม, รูปภาพพร้อมภาพแทนเมื่อยังไม่มีไฟล์
import { useState } from 'react';
import { MeepleIcon, DiceIcon, CardsIcon } from './BrandIcons.jsx';

/** โลโก้: meeple + ชื่อร้าน (variant="light" สำหรับพื้นเข้ม) */
export function Logo({ size = 'md', variant = 'dark', showTagline = false }) {
  const s = { sm: 28, md: 36, lg: 56 }[size] ?? 36;
  const text = { sm: 'text-base', md: 'text-lg', lg: 'text-3xl' }[size] ?? 'text-lg';
  const color = variant === 'light' ? 'text-cream' : 'text-forest';
  return (
    <span className="inline-flex items-center gap-2.5">
      <MeepleIcon size={s} fill={variant === 'light' ? '#daa520' : '#cd5c5c'} />
      <span className="leading-none">
        <span className={`block font-heading ${text} ${color} tracking-tight`}>
          Boardgame{' '}
          <span className={variant === 'light' ? 'text-mustard' : 'text-brick'}>Everyday</span>
        </span>
        {showTagline && (
          <span
            className={`block mt-1 text-[11px] font-semibold tracking-wide ${variant === 'light' ? 'text-cream/80' : 'text-slate-500'}`}
          >
            คาเฟ่บอร์ดเกม · เล่นด้วยกันทุกวัน
          </span>
        )}
      </span>
    </span>
  );
}

/** แถบลายสีแบรนด์ (เหมือนช่องเดินบนกระดานเกม) */
export function BoardBorder({ className = 'h-2.5' }) {
  return <div aria-hidden="true" className={`board-border w-full ${className}`} />;
}

// ชุดสีของภาพประกอบ (เลือกด้วย variant เพื่อให้หลายรูปในหน้าเดียวกันไม่ซ้ำกัน)
const SCENES = [
  {
    bg: '#f5f5dc',
    table: '#c2763f',
    board: '#2f4f2f',
    pawns: ['#cd5c5c', '#008080', '#daa520', '#2f4f2f', '#f5f5dc'],
  },
  {
    bg: '#f8e8b8',
    table: '#8b5a2b',
    board: '#008080',
    pawns: ['#2f4f2f', '#cd5c5c', '#f5f5dc', '#daa520', '#cd5c5c'],
  },
  {
    bg: '#f6dcdc',
    table: '#c2763f',
    board: '#cd5c5c',
    pawns: ['#daa520', '#2f4f2f', '#008080', '#f5f5dc', '#2f4f2f'],
  },
  {
    bg: '#d5eeee',
    table: '#a0612f',
    board: '#daa520',
    pawns: ['#cd5c5c', '#2f4f2f', '#f5f5dc', '#008080', '#cd5c5c'],
  },
];

/** ภาพประกอบแทนรูปถ่าย — โต๊ะเกมมุมมองจากบน (ใช้ตอนยังไม่ได้ใส่ไฟล์รูป) */
export function TableScene({ className = '', variant = 0 }) {
  const sc = SCENES[Math.abs(variant) % SCENES.length];
  return (
    <div
      className={`paper relative overflow-hidden flex items-center justify-center ${className}`}
      style={{ backgroundColor: sc.bg }}
    >
      <svg viewBox="0 0 320 200" className="w-full h-full" aria-hidden="true">
        <rect
          x="40"
          y="40"
          width="240"
          height="120"
          rx="60"
          fill={sc.table}
          stroke="#1f2a1f"
          strokeWidth="3"
        />
        <rect
          x="95"
          y="62"
          width="130"
          height="76"
          rx="6"
          fill={sc.board}
          stroke="#1f2a1f"
          strokeWidth="3"
        />
        {[0, 1, 2, 3, 4].map((i) => (
          <rect
            key={i}
            x={103 + i * 23}
            y="70"
            width="20"
            height="12"
            fill={['#cd5c5c', '#f5f5dc', '#daa520', '#008080', '#cd5c5c'][(i + variant) % 5]}
            stroke="#1f2a1f"
            strokeWidth="1.5"
          />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <rect
            key={`b${i}`}
            x={109 + i * 28}
            y="118"
            width="20"
            height="12"
            fill={['#daa520', '#008080', '#f5f5dc', '#cd5c5c'][(i + variant) % 4]}
            stroke="#1f2a1f"
            strokeWidth="1.5"
          />
        ))}
        {[
          [70, 30],
          [250, 30],
          [70, 170],
          [250, 170],
          [160, 22],
        ].map(([cx, cy], i) => (
          <g key={`p${i}`}>
            <circle cx={cx} cy={cy} r="15" fill={sc.pawns[i]} stroke="#1f2a1f" strokeWidth="3" />
            <circle cx={cx} cy={cy} r="5" fill="#1f2a1f" opacity=".15" />
          </g>
        ))}
      </svg>
      <div className="absolute left-4 bottom-3 flex gap-1">
        <DiceIcon size={30} />
        <CardsIcon size={30} />
      </div>
    </div>
  );
}

/**
 * รูปถ่ายบรรยากาศ — วางไฟล์ไว้ที่ client/public/images/<ชื่อ>.jpg
 * ถ้ายังไม่มีไฟล์ จะแสดงภาพประกอบแทน (ไม่มีรูปแตก) — variant 0–3 เปลี่ยนโทนสีภาพประกอบ
 */
export function Photo({ src, alt, className = '', variant = 0 }) {
  const [failed, setFailed] = useState(!src);
  if (failed) {
    return (
      <div role="img" aria-label={alt} className={`overflow-hidden ${className}`}>
        <TableScene className="w-full h-full" variant={variant} />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
