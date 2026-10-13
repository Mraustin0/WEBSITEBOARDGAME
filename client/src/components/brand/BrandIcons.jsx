// ชุดไอคอนแบรนด์สไตล์วาดมือ: เส้นขอบสีหมึกหนา + เติมสีแบรนด์ (ตามภาพ Iconography)
// ใช้: <MeepleIcon size={48} />  (สีเปลี่ยนได้ด้วย prop fill)
const INK = '#1f2a1f';
const C = {
  forest: '#2f4f2f',
  brick: '#cd5c5c',
  cream: '#f5f5dc',
  mustard: '#daa520',
  teal: '#008080',
  wood: '#c2763f',
};

function Svg({ size = 48, title, children, viewBox = '0 0 64 64' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      fill="none"
      stroke={INK}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export function MeepleIcon({ fill = C.forest, ...p }) {
  return (
    <Svg {...p}>
      <path
        d="M32 8c-5.4 0-9.3 4.1-9.3 9.2 0 2.5 1 4.5 2.3 6C17.8 24.6 9.5 27.2 9.5 31.9c0 3.3 4.3 4.5 9.9 4.3l-6 14.5c-.6 1.6.6 3.2 2.3 3.2h10c1 0 1.8-.6 2.2-1.5L32 44l4.1 8.4c.4.9 1.2 1.5 2.2 1.5h10c1.7 0 2.9-1.6 2.3-3.2l-6-14.5c5.6.2 9.9-1 9.9-4.3 0-4.7-8.3-7.3-15.5-8.7 1.3-1.5 2.3-3.5 2.3-6C41.3 12.1 37.4 8 32 8z"
        fill={fill}
      />
      <path d="M26 28c2 1.4 4 2 6 2" stroke={INK} strokeWidth="1.6" opacity=".5" />
    </Svg>
  );
}

export function DiceIcon({ fill = C.cream, ...p }) {
  return (
    <Svg {...p}>
      <path d="M14 22 32 12l18 10v20L32 52 14 42z" fill={fill} />
      <path d="M14 22l18 10 18-10M32 32v20" />
      <circle cx="32" cy="21" r="2.2" fill={INK} stroke="none" />
      <circle cx="20" cy="31" r="2" fill={INK} stroke="none" />
      <circle cx="26" cy="41" r="2" fill={INK} stroke="none" />
      <circle cx="38" cy="36" r="2" fill={INK} stroke="none" />
      <circle cx="44" cy="31" r="2" fill={INK} stroke="none" />
      <circle cx="44" cy="41" r="2" fill={INK} stroke="none" />
    </Svg>
  );
}

export function DiceTowerIcon({ fill = C.wood, ...p }) {
  return (
    <Svg {...p}>
      <path d="M18 10h22v34H18z" fill={fill} />
      <path d="M40 10l6 4v34l-6-4" fill="#a8622f" />
      <path d="M12 44h28l6 4v6H18l-6-4z" fill={fill} />
      <rect x="24" y="18" width="10" height="7" rx="1.5" fill={INK} stroke="none" opacity=".75" />
      <circle cx="29" cy="34" r="2" fill={INK} stroke="none" />
      <circle cx="25" cy="38" r="1.6" fill={INK} stroke="none" />
    </Svg>
  );
}

export function WoodIcon({ fill = C.wood, ...p }) {
  return (
    <Svg {...p}>
      <path d="M12 36l26-14 12 7-26 14z" fill={fill} />
      <path d="M12 36v8l12 7v-8M50 29v8L24 51" fill="#a8622f" />
      <path d="M14 24l26-14 10 6-26 14z" fill={fill} />
      <path d="M14 24v7l10 6v-7" fill="#a8622f" />
      <path d="M22 22l14-7M30 41l12-6" strokeWidth="1.6" opacity=".55" />
    </Svg>
  );
}

export function CardsIcon({ fill = C.brick, back = C.forest, accent = C.mustard, ...p }) {
  return (
    <Svg {...p}>
      <rect x="10" y="14" width="24" height="34" rx="4" transform="rotate(-14 22 31)" fill={back} />
      <rect x="22" y="12" width="26" height="36" rx="4" transform="rotate(8 35 30)" fill={fill} />
      <rect
        x="26"
        y="17"
        width="18"
        height="26"
        rx="2.5"
        transform="rotate(8 35 30)"
        fill={accent}
      />
      <path
        d="M35 24c-3 3-5 5-5 7.5a3 3 0 0 0 5 2.2 3 3 0 0 0 5-2.2c0-2.5-2-4.5-5-7.5z"
        fill={INK}
        stroke="none"
      />
    </Svg>
  );
}

export function GameBoxIcon({ fill = C.mustard, ...p }) {
  return (
    <Svg {...p}>
      <path d="M8 26l24-10 24 10-24 10z" fill={C.cream} />
      <path d="M8 26v16l24 10V36z" fill={fill} />
      <path d="M56 26v16L32 52V36z" fill="#b8860b" />
      <path d="M8 26l24 10 24-10" />
      <path d="M20 22l24 9" stroke={C.forest} strokeWidth="2" />
    </Svg>
  );
}

export function TableIcon({ fill = C.wood, ...p }) {
  return (
    <Svg {...p}>
      <ellipse cx="32" cy="28" rx="22" ry="9" fill={fill} />
      <path d="M10 28v4c0 5 10 9 22 9s22-4 22-9v-4" fill="#a8622f" />
      <path d="M20 39l-3 14M44 39l3 14M32 41v12" />
      <circle cx="26" cy="26" r="2.4" fill={C.brick} />
      <circle cx="36" cy="25" r="2.4" fill={C.teal} />
    </Svg>
  );
}

export function ClockIcon({ fill = C.cream, ...p }) {
  return (
    <Svg {...p}>
      <circle cx="32" cy="34" r="20" fill={fill} />
      <path d="M32 22v12l8 6" />
      <path d="M24 10h16M32 10v4" />
      <path d="M49 17l4-4" />
    </Svg>
  );
}

export function StarIcon({ fill = C.mustard, ...p }) {
  return (
    <Svg {...p}>
      <path d="M32 8l7 15 16 2-12 11 3 16-14-8-14 8 3-16L9 25l16-2z" fill={fill} />
    </Svg>
  );
}

export function FamilyIcon({ ...p }) {
  return (
    <Svg {...p}>
      <circle cx="20" cy="20" r="7" fill={C.brick} />
      <circle cx="44" cy="20" r="7" fill={C.teal} />
      <circle cx="32" cy="32" r="5.5" fill={C.mustard} />
      <path d="M8 52c0-9 5-15 12-15s9 4 10 7" fill={C.brick} />
      <path d="M56 52c0-9-5-15-12-15s-9 4-10 7" fill={C.teal} />
      <path d="M24 54c0-7 4-11 8-11s8 4 8 11z" fill={C.mustard} />
    </Svg>
  );
}

export function CalendarIcon({ fill = C.cream, ...p }) {
  return (
    <Svg {...p}>
      <rect x="10" y="14" width="44" height="40" rx="5" fill={fill} />
      <path d="M10 26h44" />
      <rect x="10" y="14" width="44" height="12" rx="5" fill={C.brick} />
      <path d="M22 9v10M42 9v10" />
      <rect x="18" y="33" width="8" height="7" rx="1.5" fill={C.forest} stroke="none" />
      <rect x="30" y="33" width="8" height="7" rx="1.5" fill={C.mustard} stroke="none" />
    </Svg>
  );
}

export function TrophyIcon({ fill = C.mustard, ...p }) {
  return (
    <Svg {...p}>
      <path d="M20 10h24v12c0 7-5 12-12 12s-12-5-12-12z" fill={fill} />
      <path d="M20 14h-7c0 8 3 11 8 12M44 14h7c0 8-3 11-8 12" />
      <path d="M32 34v8" />
      <path d="M22 54h20l-2-12H24z" fill={C.forest} />
    </Svg>
  );
}

export const BRAND_ICONS = {
  meeple: MeepleIcon,
  dice: DiceIcon,
  tower: DiceTowerIcon,
  wood: WoodIcon,
  cards: CardsIcon,
  box: GameBoxIcon,
  table: TableIcon,
  clock: ClockIcon,
  star: StarIcon,
  family: FamilyIcon,
  calendar: CalendarIcon,
  trophy: TrophyIcon,
};
