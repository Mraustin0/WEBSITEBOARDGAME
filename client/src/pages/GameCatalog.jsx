import { useState, useMemo } from 'react';
import { GAME_DATA, TIME_SLOTS } from '../data/mockData';

export default function GameCatalog({ selectedGame, setSelectedGame, onGoToFloorPlan }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('popular');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedPax, setSelectedPax] = useState('all');
  
  // States สำหรับ Checker ฟอร์ม
  const [arrivalDate, setArrivalDate] = useState('วันนี้');
  const [sessionWindow, setSessionWindow] = useState(TIME_SLOTS[0]);
  const [partySize, setPartySize] = useState('4 ท่าน');
  const [vaultStatus, setVaultStatus] = useState('วันนี้, 14:00 - 17:00 • มีเกมพร้อมเล่น 42 เกม (กำลังเล่น 6 เกม)');

  const categories = [
    { id: 'all', name: 'ทั้งหมด (542)' },
    { id: 'strategy', name: 'วางแผน (184)' },
    { id: 'party', name: 'ปาร์ตี้ & เฮฮา' },
    { id: 'engine', name: 'สร้างระบบ (Engine)' },
    { id: 'family', name: 'ครอบครัว & เล่นเพลิน' },
    { id: 'coop', name: 'ร่วมมือกัน (Co-op)' },
    { id: 'heavy', name: 'ยูโรเกม (Heavy)' },
  ];

  const paxOptions = [
    { id: 'all', name: 'ไม่ระบุ' },
    { id: '1-2', name: '1-2 ท่าน' },
    { id: '3-4', name: '3-4 ท่าน' },
    { id: '5+', name: '5+ ท่าน' },
  ];

  const filteredGames = useMemo(() => {
    let result = GAME_DATA.filter(game => {
      const matchSearch = searchTerm === '' || 
        game.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        game.publisher.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCat = selectedCat === 'all' || game.categories.includes(selectedCat);
      
      let matchPax = true;
      if (selectedPax === '1-2') matchPax = game.minPlayers <= 2;
      else if (selectedPax === '3-4') matchPax = game.maxPlayers >= 3 && game.minPlayers <= 4;
      else if (selectedPax === '5+') matchPax = game.maxPlayers >= 5;

      return matchSearch && matchCat && matchPax;
    });

    if (sortOrder === 'rating') result.sort((a, b) => parseFloat(b.rating) - parseFloat(a.rating));
    else if (sortOrder === 'a-z') result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [searchTerm, sortOrder, selectedCat, selectedPax]);

  const handleCheckVault = () => {
    const time = sessionWindow.split(' (')[0];
    setVaultStatus(`${arrivalDate}, ${time} • มีเกมพร้อมเล่น 42 เกม (กำลังเล่น 6 เกม)`);
  };

  const handleBook = (game) => {
    setSelectedGame(game);
    onGoToFloorPlan(); // ฟังก์ชันนี้จะทำหน้าที่เปลี่ยนหน้ากลับไปที่ Floor Plan
  };

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6 font-sans">
      
      <div className="flex flex-wrap items-center justify-between gap-4 pb-1">
        <h1 className="font-heading font-bold text-3xl sm:text-4xl text-slate-900 tracking-tight">คลังบอร์ดเกม (Game Vault)</h1>
        <div className="bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-2xl flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">สถานะคลังเกม</span>
            <span className="text-sm font-bold text-emerald-950">ลงทะเบียน 542 • ว่าง 489</span>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-2">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div>
              
              <h2 className="font-heading font-bold text-xl sm:text-2xl text-slate-900">เช็กสถานะบอร์ดเกมที่พร้อมเล่น</h2>
            </div>
            <div className="self-start md:self-auto bg-slate-50 border border-slate-200/90 shadow-sm px-4 py-2 rounded-xl flex items-center gap-2 text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-medium">{vaultStatus}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end pt-1">
            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">วันที่เข้าใช้บริการ</label>
              <div className="grid grid-cols-3 gap-2">
                {['วันนี้', 'พรุ่งนี้', 'มะรืนนี้'].map(date => (
                  <button key={date} onClick={() => setArrivalDate(date)} type="button" 
                    className={`py-2.5 px-3 rounded-xl font-semibold text-xs text-center shadow-sm transition-all ${arrivalDate === date ? 'bg-emerald-700 text-white border border-emerald-600' : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                    {date}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">รอบเวลา</label>
              <div className="relative">
                <select value={sessionWindow} onChange={e => setSessionWindow(e.target.value)} className="w-full bg-slate-50/80 border border-slate-200 text-slate-800 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white appearance-none transition">
                  {TIME_SLOTS.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
                <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">จำนวนผู้เล่น</label>
              <div className="relative">
                <select value={partySize} onChange={e => setPartySize(e.target.value)} className="w-full bg-slate-50/80 border border-slate-200 text-slate-800 rounded-xl py-2.5 pl-3.5 pr-8 text-xs font-semibold focus:outline-none focus:border-emerald-600 focus:bg-white appearance-none transition">
                  <option>2 ท่าน</option><option>4 ท่าน</option><option>5 ท่าน</option><option>6+ กิลด์</option>
                </select>
                <i className="fa-solid fa-users absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
              </div>
            </div>

            <div className="lg:col-span-2">
              <button onClick={handleCheckVault} type="button" className="w-full h-[38px] bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl px-5 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                <i className="fa-solid fa-clock"></i> ตรวจสอบสถานะ
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-[69px] z-30 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3.5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-8 relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg"></i>
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} type="text" placeholder="ค้นหาเกมกว่า 500+ เกม จากชื่อ, นักออกแบบ หรือธีม..." 
                   className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white text-slate-800 placeholder-slate-400 rounded-xl text-xs font-medium pl-10 pr-4 py-2.5 focus:outline-none transition" />
          </div>
          <div className="md:col-span-4 flex items-center justify-between md:justify-end gap-3">
            <span className="text-xs text-slate-500 whitespace-nowrap">แสดง <strong className="text-emerald-950 font-bold">{filteredGames.length}</strong> เกม</span>
            <div className="relative">
              <select value={sortOrder} onChange={e => setSortOrder(e.target.value)} className="bg-white border border-slate-200 shadow-sm text-slate-700 font-semibold text-xs py-2 pl-3 pr-8 rounded-xl focus:outline-none appearance-none transition">
                <option value="popular">ยอดนิยมในร้าน</option>
                <option value="rating">คะแนน BGG สูงสุด</option>
                <option value="a-z">ตัวอักษร ก-ฮ / A-Z</option>
              </select>
              <i className="fa-solid fa-sort absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] pointer-events-none"></i>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            {categories.map(cat => (
              <button key={cat.id} onClick={() => setSelectedCat(cat.id)} className={`px-3.5 py-1.5 rounded-full font-semibold text-xs transition-all shadow-sm ${selectedCat === cat.id ? 'bg-emerald-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                {cat.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full border border-slate-200/80">
            {paxOptions.map(p => (
              <button key={p.id} onClick={() => setSelectedPax(p.id)} className={`px-3 py-1 rounded-full font-semibold text-xs transition ${selectedPax === p.id ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-700 hover:bg-white'}`}>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-2">
          {filteredGames.map((game, index) => {
            const isAvailable = game.status === 'available';
            const isWaitlist = game.status === 'waitlist';
            const isInUse = game.status === 'in-use';
            
            return (
              <article key={game.id} className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between group ${!isInUse && 'hover:-translate-y-1 hover:shadow-md transition-all duration-300'} ${isInUse && 'opacity-80'}`}>
                <div className="flex flex-col gap-3">
                  <div className="relative w-full h-44 rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                    <img src={game.cover} alt={game.title} className={`w-full h-full object-cover ${!isInUse && 'group-hover:scale-105 transition-transform duration-500'}`} onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                    <div className="absolute inset-0 hidden items-center justify-center text-4xl text-slate-400"><i className={`fa-solid ${game.icon}`}></i></div>
                    
                    <span className="absolute top-2 right-2 bg-slate-900/90 text-amber-300 border border-slate-700 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                      <span className="text-amber-400">★</span> {game.rating}
                    </span>
                    <span className={`absolute top-2 left-2 text-white text-xs px-2.5 py-1 rounded-full font-semibold shadow-sm flex items-center gap-1 ${isAvailable ? 'bg-emerald-600' : 'bg-amber-600'}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                      {isAvailable ? `ว่าง ${game.stockCount} กล่อง` : isWaitlist ? `กำลังเล่น (${game.inUseTables.join(', ')})` : `กำลังเล่น (โต๊ะ ${game.inUseTables[0]})`}
                    </span>
                  </div>
                  
                  <div>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">{game.publisher}</span>
                    <h3 className="font-heading font-bold text-base text-slate-900 line-clamp-1">{game.title}</h3>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {game.tags.map(tag => (
                      <span key={tag} className={`border text-[11px] px-2 py-0.5 rounded-md font-medium ${isAvailable ? 'bg-emerald-50 border-emerald-200/60 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-700'}`}>{tag}</span>
                    ))}
                  </div>

                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 my-1 grid grid-cols-3 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">ผู้เล่น</span>
                      <span className="text-xs font-bold text-slate-900">{game.minPlayers}–{game.maxPlayers} คน</span>
                    </div>
                    <div className="border-x border-slate-200">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">เวลา</span>
                      <span className="text-xs font-bold text-slate-900">{game.timeMin}–{game.timeMax} นาที</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">ความยาก</span>
                      <span className="text-xs font-bold text-slate-900">{game.weight} / 5</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  {isAvailable && (
                    <button onClick={() => handleBook(game)} className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition-all text-xs shadow-sm">
                      <span>จองโต๊ะพร้อมเกมนี้</span> <i className="fa-solid fa-arrow-right"></i>
                    </button>
                  )}
                  {isWaitlist && (
                    <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 transition text-xs shadow-sm">
                      <i className="fa-solid fa-lock"></i> จองคิวเล่นต่อ (18:00)
                    </button>
                  )}
                  {isInUse && (
                    <button disabled className="w-full bg-slate-100 text-slate-500 border border-slate-200 font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed text-xs">
                      <i className="fa-solid fa-hourglass-half"></i> กำลังใช้งาน (โต๊ะ {game.inUseTables[0]})
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-16 flex flex-col items-center justify-center text-center border border-slate-200 shadow-sm">
          <i className="fa-solid fa-ghost text-5xl text-slate-300 mb-4"></i>
          <h3 className="font-heading font-bold text-xl text-slate-800 mb-2">ไม่พบเกมที่คุณค้นหา</h3>
          <p className="text-sm text-slate-500">ลองเปลี่ยนคำค้นหา หรือปรับตัวกรองดูใหม่อีกครั้ง</p>
        </div>
      )}
    </main>
  );
}