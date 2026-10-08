import React, { useState, useEffect, useRef } from 'react';

/* ---------- Tiny inline icon set ---------- */
const ICONS = {
  dice: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1" />
      <circle cx="15.5" cy="15.5" r="1" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  table: (
    <>
      <path d="M4 8h16" />
      <path d="M7 8v10M17 8v10" />
      <path d="M5 5h14a1 1 0 0 1 1 1v2H4V6a1 1 0 0 1 1-1z" />
    </>
  ),
  stool: (
    <>
      <ellipse cx="12" cy="8" rx="8" ry="3" />
      <path d="M12 11v9M7 20h10" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6l8-3z" />
      <circle cx="12" cy="11" r="2" />
    </>
  ),
  book: (
    <>
      <path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3z" />
      <path d="M21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z" />
    </>
  ),
  bookmark: <path d="M6 3h12v18l-6-4-6 4z" />,
  bell: (
    <>
      <path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" />
      <path d="M10 21h4" />
    </>
  ),
  gamepad: (
    <>
      <rect x="2" y="7" width="20" height="11" rx="5" />
      <path d="M7 10v5M4.5 12.5h5" />
      <circle cx="16" cy="11.5" r=".8" />
      <circle cx="18.5" cy="13.5" r=".8" />
    </>
  ),
  check: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  checkClip: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v2H9z" />
      <path d="M9 13l2 2 4-4" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  clockPlus: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2 2M9 3h6" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h14l-3-3M20 16H6l3 3" />
    </>
  ),
  headset: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="1.5" />
      <rect x="17" y="14" width="4" height="6" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 8v5l3 2" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  share: (
    <>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8.2 11l7.6-4M8.2 13l7.6 4" />
    </>
  ),
  userPlus: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0M18 8v6M15 11h6" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" />
      <rect x="14" y="4" width="6" height="6" />
      <rect x="4" y="14" width="6" height="6" />
      <path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 19h1" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4h8l9 9-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.2" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  close: <path d="M18 6L6 18M6 6l12 12" />,
  alertTriangle: (
    <>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  user: (
    <>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </>
  ),
};

const Icon = ({ name, className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {ICONS[name] || null}
  </svg>
);

export default function MyReservations() {
  const [activeTab, setActiveTab] = useState('active');
  const [activeModal, setActiveModal] = useState(null); // 'return' | 'switch' | 'edit' | 'cancel' | 'request' | 'allHistory' | 'newBooking' | null
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [requestType, setRequestType] = useState('extend');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Form States
  const [editDate, setEditDate] = useState('25 ต.ค. (ศุกร์)');
  const [editTime, setEditTime] = useState('18:30 - 21:30 น.');
  const [editPax, setEditPax] = useState(4);

  // New Booking Form State
  const [newTable, setNewTable] = useState('โต๊ะ T-03 (Standard)');
  const [newGame, setNewGame] = useState('Ark Nova');
  const [newDate, setNewDate] = useState('2025-10-27');
  const [newTime, setNewTime] = useState('14:00 - 17:00 น.');

  // Data
  const [activeSession, setActiveSession] = useState({
    id: 'SES-20251024-T04',
    tableName: 'โต๊ะ T-04 • Grand Campaign Table',
    tableZone: 'ชั้น 1 โซน Mezzanine Vault • ผู้เล่น 5/8 คน',
    timeRemaining: '1 ชม. 15 นาที',
    progressPercent: 58,
    timeSlot: '14:00 - 17:00 น.',
    currentGame: {
      id: 'game_wingspan_01',
      code: 'BGM-WNG-004',
      name: 'Wingspan (Asia Expansion)',
      publisher: 'STONEMAIER GAMES',
      details: 'ฉบับแปลไทย • ใส่ซองกันรอยครบ',
      image: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=300',
      rating: 8.1,
      borrowedTime: '14:05 น.',
      pax: '1-5 Pax',
      duration: '40-70m',
    },
    standbyGame: {
      id: 'game_cascadia_02',
      name: 'Cascadia (คาสคาเดีย)',
      publisher: 'FLATOUT GAMES',
      details: 'กล่องสำรองโต๊ะ • พร้อมเล่นต่อได้ทันที',
      image: 'https://images.unsplash.com/photo-1632501641765-e568d28b0015?w=300',
      rating: 8.8,
      borrowedTime: '14:15 น.',
      pax: '1-4 Pax',
      duration: '30-45m',
    },
  });

  const [upcomingReservations, setUpcomingReservations] = useState([
    {
      id: 'RES-9031',
      icon: 'stool',
      iconStyle: 'bg-slate-100 text-slate-700',
      tableName: 'โต๊ะ T-02 (Cozy Booth)',
      badge: 'ยืนยันแล้ว',
      zone: 'โซน Atrium (โต๊ะมาตรฐาน 4 ที่นั่ง)',
      countdown: 'อีก 1 วัน',
      date: 'วันศุกร์ที่ 25 ต.ค. 2025',
      time: '18:30 - 21:30 น. (3 ชั่วโมง)',
      gameName: 'Terraforming Mars (Big Box Ed.)',
      pax: '4 คน',
    },
    {
      id: 'RES-9118',
      icon: 'shield',
      iconStyle: 'bg-emerald-800 text-white',
      tableName: "ห้อง VIP-01 (Dragon's Keep)",
      badge: 'VIP Reserved',
      zone: 'ห้องส่วนตัวเก็บเสียง (6 ที่นั่ง)',
      countdown: 'อีก 2 วัน',
      date: 'วันเสาร์ที่ 26 ต.ค. 2025',
      time: '13:00 - 17:00 น. (4 ชั่วโมง)',
      gameName: 'Dune: Imperium (Uprising)',
      pax: '4 คน',
    },
  ]);

  const [historyRows, setHistoryRows] = useState([
    {
      id: '#BM-8921',
      table: 'โต๊ะ T-06',
      zone: 'Forest Chamber',
      game: 'Scythe (เคียว)',
      date: '20 ต.ค. 2025 • 15:30 น.',
      status: 'คืนเกมแล้ว',
      pts: '+25 pts',
    },
    {
      id: '#BM-8842',
      table: 'โต๊ะ T-01',
      zone: 'Atrium Zone',
      game: 'Catan (ล่าอาณานิคม)',
      date: '15 ต.ค. 2025 • 19:00 น.',
      status: 'คืนเกมแล้ว',
      pts: '+15 pts',
    },
    {
      id: '#BM-8710',
      table: 'โต๊ะ T-04',
      zone: 'Mezzanine Vault',
      game: 'Brass: Birmingham',
      date: '10 ต.ค. 2025 • 14:00 น.',
      status: 'คืนเกมแล้ว',
      pts: '+30 pts',
    },
    {
      id: '#BM-8655',
      table: 'โต๊ะ VIP-02',
      zone: 'Private Room',
      game: 'Gloomhaven',
      date: '02 ต.ค. 2025 • 18:00 น.',
      status: 'คืนเกมแล้ว',
      pts: '+50 pts',
    },
    {
      id: '#BM-8520',
      table: 'โต๊ะ T-03',
      zone: 'Atrium Zone',
      game: 'Ticket to Ride',
      date: '25 ก.ย. 2025 • 16:30 น.',
      status: 'คืนเกมแล้ว',
      pts: '+15 pts',
    },
    {
      id: '#BM-8411',
      table: 'โต๊ะ T-05',
      zone: 'Forest Chamber',
      game: 'Splendor',
      date: '18 ก.ย. 2025 • 13:00 น.',
      status: 'คืนเกมแล้ว',
      pts: '+10 pts',
    },
    {
      id: '#BM-8302',
      table: 'โต๊ะ T-02',
      zone: 'Atrium Zone',
      game: 'Azul',
      date: '10 ก.ย. 2025 • 19:00 น.',
      status: 'คืนเกมแล้ว',
      pts: '+15 pts',
    },
    {
      id: '#BM-8199',
      table: 'โต๊ะ T-01',
      zone: 'Atrium Zone',
      game: '7 Wonders Duel',
      date: '01 ก.ย. 2025 • 15:00 น.',
      status: 'คืนเกมแล้ว',
      pts: '+20 pts',
    },
  ]);

  const vaultGamesList = [
    {
      id: 'v1',
      name: 'Dune: Imperium',
      pax: '1-4 คน',
      duration: '60-120m',
      publisher: 'Dire Wolf',
      type: 'Worker Placement',
      inStock: 2,
    },
    {
      id: 'v2',
      name: 'Ark Nova',
      pax: '1-4 คน',
      duration: '90-150m',
      publisher: 'Feuerland Spiele',
      type: 'Hand Management',
      inStock: 1,
    },
    {
      id: 'v3',
      name: 'Catan (ล่าอาณานิคม)',
      pax: '3-4 คน',
      duration: '60m',
      publisher: 'Kosmos',
      type: 'Trading / Gateway',
      inStock: 4,
    },
    {
      id: 'v4',
      name: 'Terraforming Mars',
      pax: '1-5 คน',
      duration: '120m',
      publisher: 'FryxGames',
      type: 'Sci-Fi / Engine',
      inStock: 2,
    },
  ];

  // Ref สำหรับ Scroll Spy
  const sectionRefs = {
    active: useRef(null),
    upcoming: useRef(null),
    history: useRef(null),
  };

  const isManualScroll = useRef(false);

  // Scroll Spy Logic
  useEffect(() => {
    const handleScroll = () => {
      if (isManualScroll.current) return;
      const scrollPosition = window.scrollY + 200;

      for (const key of ['active', 'upcoming', 'history']) {
        const el = sectionRefs[key].current;
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveTab(key);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabClick = (key) => {
    setActiveTab(key);
    isManualScroll.current = true;
    const targetEl = sectionRefs[key].current;
    if (targetEl) {
      const yOffset = -120;
      const y = targetEl.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
    setTimeout(() => {
      isManualScroll.current = false;
    }, 800);
  };

  // Actions
  const handleConfirmReturn = () => {
    setLoading(true);
    setTimeout(() => {
      setActiveSession(null);
      setLoading(false);
      setActiveModal(null);
      alert('คืนบอร์ดเกมเข้าคลังเรียบร้อย สถานะถูกเปลี่ยนเป็น available แล้ว');
    }, 600);
  };

  const handleConfirmSwitchGame = (gameName) => {
    setLoading(true);
    setTimeout(() => {
      if (activeSession) {
        setActiveSession({
          ...activeSession,
          currentGame: {
            ...activeSession.currentGame,
            name: gameName,
            publisher: 'VAULT SELECTION',
            details: 'สลับเปลี่ยนกล่องใหม่เรียบร้อย • พร้อมเล่นทันที',
          },
        });
      }
      setLoading(false);
      setActiveModal(null);
      alert(`เปลี่ยนบอร์ดเกมเป็น ${gameName} เรียบร้อยแล้ว`);
    }, 600);
  };

  const handleConfirmEdit = () => {
    setLoading(true);
    setTimeout(() => {
      if (selectedReservation) {
        setUpcomingReservations((prev) =>
          prev.map((r) =>
            r.id === selectedReservation.id
              ? {
                  ...r,
                  time: `${editTime} (${editPax} คน)`,
                  pax: `${editPax} คน`,
                }
              : r,
          ),
        );
      }
      setLoading(false);
      setActiveModal(null);
      alert('แก้ไขข้อมูลการจองเรียบร้อยแล้ว');
    }, 600);
  };

  const handleConfirmCancel = () => {
    setLoading(true);
    setTimeout(() => {
      if (selectedReservation) {
        setUpcomingReservations((prev) => prev.filter((r) => r.id !== selectedReservation.id));
      }
      setLoading(false);
      setActiveModal(null);
      alert('ยกเลิกการจองเรียบร้อย คืนสิทธิ์โต๊ะเข้าสู่ระบบแล้ว');
    }, 600);
  };

  const handleConfirmRequest = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setActiveModal(null);
      alert(
        requestType === 'extend'
          ? 'ส่งคำขอต่อเวลาเรียบร้อยแล้ว เจ้าหน้าที่กำลังดำเนินการ'
          : 'เรียก GM เรียบร้อยแล้ว! เจ้าหน้าที่จะมาที่โต๊ะ T-04 ในสักครู่',
      );
    }, 600);
  };

  const handleCreateBooking = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      const newRes = {
        id: `RES-${Math.floor(1000 + Math.random() * 9000)}`,
        icon: 'stool',
        iconStyle: 'bg-slate-100 text-slate-700',
        tableName: newTable,
        badge: 'ยืนยันแล้ว',
        zone: 'โซน Atrium (โต๊ะมาตรฐาน)',
        countdown: 'อีก 3 วัน',
        date: newDate,
        time: newTime,
        gameName: newGame,
        pax: '4 คน',
        shareLabel: 'แชร์ชวนเพื่อน',
        shareIcon: 'share',
      };
      setUpcomingReservations([newRes, ...upcomingReservations]);
      setLoading(false);
      setActiveModal(null);
      alert('จองโต๊ะสำเร็จแล้ว!');
    }, 600);
  };

  const handleRebook = (gameName) => {
    setNewGame(gameName);
    setActiveModal('newBooking');
  };

  const handleShare = (resId) => {
    navigator.clipboard?.writeText?.(`https://boardgamevault.app/join/${resId}`);
    alert(`คัดลอกลิงก์ชวนเพื่อนเรียบร้อยแล้ว! (รหัสการจอง #${resId})`);
  };

  const tabs = [
    { key: 'active', label: 'กำลังใช้งาน', count: activeSession ? 1 : 0, icon: null },
    {
      key: 'upcoming',
      label: 'รายการล่วงหน้า',
      count: upcomingReservations.length,
      icon: 'calendar',
    },
    { key: 'history', label: 'ประวัติที่ผ่านไปแล้ว', count: historyRows.length, icon: 'history' },
  ];

  // Filtered History Data
  const filteredHistory = historyRows.filter(
    (r) =>
      r.game.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.table.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#f2f5f4] text-emerald-950 font-sans pb-16">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');`}</style>

      {/* ===== Sticky Header Bar ===== */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-emerald-950">
                ประวัติการจองและคืนเกม
              </h1>
              <p className="text-xs text-slate-500">
                จัดการโต๊ะ เบิก-คืนบอร์ดเกม และตรวจสอบสถานะการจองของคุณ
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2 bg-white">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-slate-700">
                  {activeSession ? 'กำลังใช้งาน 1 โต๊ะ' : 'ไม่มีโต๊ะกำลังใช้งาน'}
                </span>
              </div>
            </div>
          </div>

          {/* Dynamic Tabs Navigation */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-full p-1">
              {tabs.map((t) => {
                const on = activeTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => handleTabClick(t.key)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      on
                        ? 'bg-emerald-300 text-emerald-950 shadow-sm'
                        : 'text-slate-600 hover:bg-white/70'
                    }`}
                  >
                    {t.icon ? (
                      <Icon name={t.icon} className="w-3.5 h-3.5" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    )}
                    {t.label}
                    <span
                      className={`min-w-[18px] h-[18px] px-1 rounded-full text-[10px] flex items-center justify-center ${
                        on ? 'bg-emerald-900 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon name="search" className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารหัสจอง หรือชื่อบอร์ดเกม..."
                className="w-64 pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 transition"
              />
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-12">
        {/* ===== SECTION 1: Active session ===== */}
        <section ref={sectionRefs.active} className="scroll-mt-36">
          {activeSession ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Icon name="table" className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />{' '}
                        LIVE ACTIVE
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono tracking-wide">
                        #{activeSession.id}
                      </span>
                    </div>
                    <h2 className="text-2xl font-bold mt-1">{activeSession.tableName}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{activeSession.tableZone}</p>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl py-3 px-5 flex items-center gap-4 self-start md:self-auto">
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400">เวลาคงเหลือ</p>
                    <p className="text-lg font-bold leading-tight">{activeSession.timeRemaining}</p>
                    <p className="text-[10px] text-slate-400">รอบ {activeSession.timeSlot}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full border-2 border-emerald-800 bg-white flex items-center justify-center text-[11px] font-bold text-emerald-900">
                    {activeSession.progressPercent}%
                  </div>
                </div>
              </div>

              {/* Games in play */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold flex items-center gap-2 text-slate-700">
                    <Icon name="gamepad" className="w-4 h-4 text-emerald-600" /> บอร์ดเกมประจำโต๊ะ
                    (In-Possession Games)
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    คืนเกมเพื่อเปลี่ยนเป็นสถานะ available ทันที
                  </span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    {
                      g: activeSession.currentGame,
                      tag: 'IN_USE',
                      right: (
                        <span className="text-emerald-700 font-semibold">
                          {activeSession.currentGame.pax} • {activeSession.currentGame.duration}
                        </span>
                      ),
                    },
                    {
                      g: activeSession.standbyGame,
                      tag: 'STANDBY',
                      right: (
                        <button
                          onClick={() => setActiveModal('switch')}
                          className="text-emerald-700 font-semibold hover:underline"
                        >
                          สลับเป็นเกมหลัก
                        </button>
                      ),
                    },
                  ].map(({ g, tag, right }) => (
                    <div
                      key={tag}
                      className="border border-slate-200 rounded-2xl p-3 flex gap-4 bg-white hover:border-emerald-300 transition"
                    >
                      <div className="relative w-[84px] h-[84px] rounded-xl overflow-hidden shrink-0 bg-slate-200">
                        <img src={g.image} alt={g.name} className="w-full h-full object-cover" />
                        <span className="absolute top-1.5 left-1.5 bg-white/90 text-emerald-950 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          ● {tag}
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div>
                          <p className="text-[10px] font-bold text-emerald-700 uppercase">
                            {g.publisher}
                          </p>
                          <h4 className="font-bold text-sm truncate">{g.name}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">{g.details}</p>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-1.5 mt-1.5">
                          <span>เบิกเมื่อ: {g.borrowedTime}</span>
                          {right}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Banner */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center shrink-0">
                    <Icon name="checkClip" className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">
                      เล่นเสร็จแล้วหรือต้องการเปลี่ยนเกมกล่องใหม่?
                    </h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      กดคืนเกมเพื่ออัปเดตสถานะให้สมาชิกคนอื่นจองต่อทันที
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveModal('return')}
                  className="w-full md:w-auto bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition flex items-center justify-center gap-2 text-sm shrink-0"
                >
                  <Icon name="checkClip" className="w-4 h-4" /> เล่นเสร็จแล้ว / คืนเกม{' '}
                  <Icon name="arrow" className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] border-t border-slate-100 pt-3">
                <span className="text-slate-400">คำสั่งด่วนระหว่างเล่น:</span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => {
                      setRequestType('extend');
                      setActiveModal('request');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-full text-slate-700 font-medium hover:bg-slate-200 transition"
                  >
                    <Icon name="clockPlus" className="w-3.5 h-3.5 text-emerald-700" /> ขอต่อเวลา
                  </button>
                  <button
                    onClick={() => setActiveModal('switch')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-full text-slate-700 font-medium hover:bg-slate-200 transition"
                  >
                    <Icon name="swap" className="w-3.5 h-3.5 text-emerald-700" /> เปลี่ยนบอร์ดเกม
                  </button>
                  <button
                    onClick={() => {
                      setRequestType('gm');
                      setActiveModal('request');
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-full text-slate-700 font-medium hover:bg-slate-200 transition"
                  >
                    <Icon name="headset" className="w-3.5 h-3.5 text-emerald-700" /> เรียก GM
                    ช่วยสอนเล่น
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center text-slate-500">
              <p className="text-lg font-bold">ไม่มีการใช้งานโต๊ะในขณะนี้</p>
              <p className="text-sm text-slate-400 mt-1">เลือกจองโต๊ะและบอร์ดเกมเพื่อเริ่มใช้งาน</p>
              <button
                onClick={() => setActiveModal('newBooking')}
                className="mt-4 inline-flex items-center gap-2 bg-emerald-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-900 transition"
              >
                <Icon name="plus" className="w-4 h-4" /> จองโต๊ะเลย
              </button>
            </div>
          )}
        </section>

        {/* ===== SECTION 2: Upcoming ===== */}
        <section ref={sectionRefs.upcoming} className="scroll-mt-36">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">รายการจองล่วงหน้า (Upcoming)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                การนัดหมายเล่นบอร์ดเกมที่คุณจองไว้ล่วงหน้า
              </p>
            </div>
            <button
              onClick={() => setActiveModal('newBooking')}
              className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-sm transition"
            >
              <Icon name="plus" className="w-3.5 h-3.5" /> จองโต๊ะเพิ่ม
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {upcomingReservations.map((res) => (
              <div
                key={res.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm hover:border-emerald-300 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${res.iconStyle}`}
                    >
                      <Icon name={res.icon} className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-sm">{res.tableName}</h3>
                        <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {res.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {res.zone} • รหัส: #{res.id}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    {res.countdown}
                  </span>
                </div>

                <div className="bg-slate-50 rounded-xl p-3 text-[11px] space-y-1.5 border border-slate-100">
                  <p className="flex items-center gap-2 text-slate-700">
                    <Icon name="clock" className="w-3.5 h-3.5 text-emerald-700" />{' '}
                    <strong>{res.date}</strong> • {res.time}
                  </p>
                  <p className="flex items-center gap-2 text-slate-700">
                    <Icon name="dice" className="w-3.5 h-3.5 text-emerald-700" /> เกมที่ล็อกไว้:{' '}
                    <strong>{res.gameName}</strong>
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1">
                  <button
                    onClick={() => handleShare(res.id)}
                    className="flex items-center gap-1.5 text-emerald-700 hover:underline font-semibold"
                  >
                    <Icon name={res.shareIcon} className="w-3.5 h-3.5" /> {res.shareLabel}
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedReservation(res);
                        setActiveModal('edit');
                      }}
                      className="px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700 font-medium hover:bg-slate-200 transition"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => {
                        setSelectedReservation(res);
                        setActiveModal('cancel');
                      }}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== SECTION 3: History ===== */}
        <section ref={sectionRefs.history} className="scroll-mt-36">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">ประวัติการเล่นและคืนเกม (History)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                รายการบอร์ดเกมที่คุณเคยใช้งานและส่งคืนเข้าคลังเรียบร้อยแล้ว
              </p>
            </div>
            <button
              onClick={() => setActiveModal('allHistory')}
              className="flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline"
            >
              ดูประวัติทั้งหมด ({historyRows.length}) <Icon name="chevron" className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-[11px] text-slate-600">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">รหัสเซสชัน</th>
                  <th className="p-3.5">โต๊ะ / โซน</th>
                  <th className="p-3.5">บอร์ดเกมที่เล่น</th>
                  <th className="p-3.5">วันที่ใช้งาน</th>
                  <th className="p-3.5">สถานะ</th>
                  <th className="p-3.5 text-right">แต้มที่ได้</th>
                  <th className="p-3.5 text-center">การกระทำ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.slice(0, 4).map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 font-mono font-semibold text-slate-700">{r.id}</td>
                    <td className="p-3.5">
                      <p className="font-semibold text-emerald-950">{r.table}</p>
                      <p className="text-[10px] text-slate-400">{r.zone}</p>
                    </td>
                    <td className="p-3.5 font-semibold text-emerald-950">
                      <span className="inline-flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                          <Icon name="dice" className="w-3 h-3" />
                        </span>
                        {r.game}
                      </span>
                    </td>
                    <td className="p-3.5">{r.date}</td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-0.5 rounded-full text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-emerald-700">{r.pts}</td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleRebook(r.game)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-slate-700 transition"
                      >
                        จองซ้ำ
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* ========================================================================= */}
      {/* ============================== MODALS =================================== */}
      {/* ========================================================================= */}

      {/* MODAL 1: Return & Checkout */}
      {activeModal === 'return' && activeSession && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative text-emerald-950">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-700 tracking-wider uppercase mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> RETURN & CHECKOUT
            </div>
            <h3 className="text-xl font-bold">ยืนยันการคืนบอร์ดเกม</h3>
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between">
              <div>
                <p className="font-bold text-xs">{activeSession.tableName}</p>
                <p className="text-[10px] text-slate-500">{activeSession.tableZone}</p>
              </div>
              <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {activeSession.id}
              </span>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-[11px] font-semibold text-slate-500">บอร์ดเกมที่จะคืนเข้าคลัง:</p>
              <div className="border border-slate-200 rounded-2xl p-3 flex items-center gap-3 bg-white">
                <img
                  src={activeSession.currentGame.image}
                  alt=""
                  className="w-10 h-10 rounded-xl object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-xs truncate">{activeSession.currentGame.name}</h4>
                  <p className="text-[10px] text-slate-400">
                    สถานะจะเปลี่ยนเป็น: Available (พร้อมใช้งาน)
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-700">+20 BoardPoints</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium text-slate-700"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleConfirmReturn}
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold shadow-md transition disabled:opacity-50"
                >
                  {loading ? 'กำลังบันทึก...' : '✔ ยืนยันการคืนเกม'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Switch Game */}
      {activeModal === 'switch' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-emerald-950">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-4">สลับเปลี่ยนบอร์ดเกม</h3>
            <p className="text-xs text-slate-500 mb-3">
              เลือกเกมจากคลัง Vault เพื่อเปลี่ยนสลับทันที
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {vaultGamesList.map((vg) => (
                <div
                  key={vg.id}
                  onClick={() => handleConfirmSwitchGame(vg.name)}
                  className="p-3 border border-slate-200 hover:border-emerald-500 rounded-xl cursor-pointer transition flex items-center justify-between bg-white"
                >
                  <div>
                    <h5 className="font-bold text-xs">{vg.name}</h5>
                    <p className="text-[10px] text-slate-400">
                      {vg.pax} • {vg.duration}
                    </p>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                    พร้อมเล่น
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Edit Reservation */}
      {activeModal === 'edit' && selectedReservation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-emerald-950">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-1">แก้ไขรายการจอง</h3>
            <p className="text-xs text-slate-500 mb-4">
              {selectedReservation.tableName} (#{selectedReservation.id})
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">วันที่ต้องการเล่น</label>
                <input
                  type="text"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">ช่วงเวลา</label>
                <input
                  type="text"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">จำนวนผู้เล่น (คน)</label>
                <input
                  type="number"
                  value={editPax}
                  onChange={(e) => setEditPax(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmEdit}
                disabled={loading}
                className="px-5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold"
              >
                {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Cancel Reservation */}
      {activeModal === 'cancel' && selectedReservation && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-emerald-950">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-red-600 mb-2">ยืนยันยกเลิกการจอง</h3>
            <p className="text-xs text-slate-600 mb-4">
              คุณต้องการยกเลิกการจอง <strong>{selectedReservation.tableName}</strong> สำหรับวันที่{' '}
              {selectedReservation.date} ใช่หรือไม่?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-medium"
              >
                เก็บไว้ก่อน
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={loading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold"
              >
                {loading ? 'กำลังยกเลิก...' : 'ยืนยันยกเลิกจอง'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Quick Requests (Extend / Call GM) */}
      {activeModal === 'request' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-emerald-950">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-2">
              {requestType === 'extend' ? 'คำขอต่อเวลาใช้งานโต๊ะ' : 'เรียก GM ผู้ช่วยสอนเล่น'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {requestType === 'extend'
                ? 'ระบบจะตรวจสอบคิวการจองถัดไปของโต๊ะ T-04'
                : 'เจ้าหน้าที่จะมาช่วยสอนกติกาที่โต๊ะ T-04 ภายใน 3-5 นาที'}
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-medium"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmRequest}
                disabled={loading}
                className="px-5 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold"
              >
                {loading ? 'กำลังส่งคำขอ...' : 'ยืนยันส่งคำขอ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: All History View */}
      {activeModal === 'allHistory' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 relative text-emerald-950 max-h-[85vh] flex flex-col">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-1">ประวัติการใช้งานและคืนเกมทั้งหมด</h3>
            <p className="text-xs text-slate-500 mb-4">
              รายการย้อนหลังทั้งหมดของคุณ ({historyRows.length} รายการ)
            </p>

            <div className="overflow-y-auto flex-1 border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-[11px] text-slate-600">
                <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0 border-b border-slate-200">
                  <tr>
                    <th className="p-3">รหัส</th>
                    <th className="p-3">โต๊ะ</th>
                    <th className="p-3">บอร์ดเกม</th>
                    <th className="p-3">วันที่</th>
                    <th className="p-3 text-right">แต้ม</th>
                    <th className="p-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredHistory.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="p-3 font-mono font-semibold">{r.id}</td>
                      <td className="p-3 font-medium">{r.table}</td>
                      <td className="p-3 font-semibold text-emerald-900">{r.game}</td>
                      <td className="p-3">{r.date}</td>
                      <td className="p-3 text-right font-bold text-emerald-700">{r.pts}</td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            setActiveModal(null);
                            handleRebook(r.game);
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded font-semibold text-slate-700"
                        >
                          จองซ้ำ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: New Booking */}
      {activeModal === 'newBooking' && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative text-emerald-950">
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600"
            >
              <Icon name="close" className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-1">จองโต๊ะเล่นบอร์ดเกม</h3>
            <p className="text-xs text-slate-500 mb-4">
              ระบุรายละเอียดเพื่อสำรองโต๊ะและล็อกเกมล่วงหน้า
            </p>

            <form onSubmit={handleCreateBooking} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold mb-1">เลือกบอร์ดเกมที่ต้องการล็อก</label>
                <input
                  type="text"
                  value={newGame}
                  onChange={(e) => setNewGame(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">เลือกโต๊ะ / โซน</label>
                <select
                  value={newTable}
                  onChange={(e) => setNewTable(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option>โต๊ะ T-03 (Standard Booth)</option>
                  <option>โต๊ะ T-05 (Forest Chamber)</option>
                  <option>ห้อง VIP-01 (Dragon's Keep)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold mb-1">วันที่</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  required
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block font-bold mb-1">รอบเวลา</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option>13:00 - 16:00 น.</option>
                  <option>16:30 - 19:30 น.</option>
                  <option>19:30 - 22:30 น.</option>
                </select>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-medium"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-800 text-white rounded-xl text-xs font-bold"
                >
                  {loading ? 'กำลังบันทึก...' : 'ยืนยันการจอง'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
