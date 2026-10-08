import { useState, useMemo, useEffect } from 'react';
import { TABLE_DATA, GAME_DATA, BOOKING_DATA, TIME_SLOTS, DATES } from '../data/mockData';

export default function FloorPlan({ initialGame, clearInitialGame }) {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isGameModalOpen, setIsGameModalOpen] = useState(false);

    const [selectedTableId, setSelectedTableId] = useState('');
    const [selectedDate, setSelectedDate] = useState(DATES[0].id);
    const [selectedSlots, setSelectedSlots] = useState([]);
    const [players, setPlayers] = useState(4);
    const [selectedGame, setSelectedGame] = useState(initialGame || null);

    const [filterDate, setFilterDate] = useState(DATES[0].id);
    const [filterSlot, setFilterSlot] = useState(TIME_SLOTS[0]);

    const selectedTableData = TABLE_DATA.find(t => t.id === selectedTableId) || TABLE_DATA[0];
    const ratePerHour = 120;
    const totalCost = players * selectedSlots.length * ratePerHour;

    useEffect(() => {
        if (initialGame) {
            setSelectedGame(initialGame);
            clearInitialGame();
        }
    }, [initialGame, clearInitialGame]);

    const floorPlanStatuses = useMemo(() => {
        const statuses = {};
        TABLE_DATA.forEach(t => {
            const booking = BOOKING_DATA.find(b => b.tableId === t.id && b.date === filterDate && b.slots.includes(filterSlot));
            statuses[t.id] = booking ? { status: booking.status } : { status: 'available' };
        });
        return statuses;
    }, [filterDate, filterSlot]);

    const getTableStatus = (tableId) => {
        if (selectedTableId === tableId) return 'selected';
        return floorPlanStatuses[tableId]?.status || 'available';
    };

    const getTableBgColor = (tableId) => {
        const status = getTableStatus(tableId);
        if (status === 'selected') return 'bg-white border-[#064e3b] ring-4 ring-[#064e3b]/20 shadow-md scale-[1.02] z-10';
        if (status === 'in-play') return 'bg-rose-50 border-rose-300';
        if (status === 'reserved') return 'bg-amber-50 border-amber-300';
        return 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm';
    };

    const getTableBadge = (tableId, isSmall = false) => {
        const status = getTableStatus(tableId);
        const baseClass = `font-semibold rounded-full ${isSmall ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-0.5'}`;
        if (status === 'selected') return <span className={`${baseClass} bg-emerald-100 text-emerald-800 border border-emerald-300`}>เลือกอยู่</span>;
        if (status === 'in-play') return <span className={`${baseClass} bg-rose-100 text-rose-700 border border-rose-200`}>กำลังเล่น</span>;
        if (status === 'reserved') return <span className={`${baseClass} bg-amber-100 text-amber-800 border border-amber-300`}>จองแล้ว</span>;
        return <span className={`${baseClass} bg-slate-100 text-slate-700 border border-slate-200`}>ว่าง</span>;
    };

    const handleTableClick = (tableId) => {
        const table = TABLE_DATA.find(t => t.id === tableId);
        setSelectedTableId(tableId);
        setPlayers(Math.min(Math.max(players, table.capMin), table.capMax));
        setIsDrawerOpen(true);
    };

    const toggleTimeSlot = (slot) => {
        if (selectedSlots.includes(slot)) setSelectedSlots(selectedSlots.filter(s => s !== slot).sort());
        else setSelectedSlots([...selectedSlots, slot].sort());
    };

    const handleConfirmBooking = () => {
        // TODO (Backend): รวบรวมข้อมูล Booking Payload ส่ง API ตรงนี้
        const payload = { tableId: selectedTableId, date: selectedDate, slots: selectedSlots, guests: players, gameId: selectedGame?.id, totalCost };
        console.log("Submit to API:", payload);
        alert(`ส่งคำขอจอง ${selectedTableId} เรียบร้อย (Check Console)`);
        setIsDrawerOpen(false);
    };

    return (
        <>
            <main className="flex-1 relative overflow-auto p-4 sm:p-6 md:p-8 flex items-center justify-center floor-grid-blueprint">
                <div className="relative w-full max-w-7xl bg-white/95 rounded-3xl border border-slate-200/90 shadow-xl p-6 sm:p-8 md:p-10 flex flex-col gap-7 backdrop-blur-sm">

                    {/* Dropdowns & Legend */}
                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-5">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col">
                                    <label className="text-[11px] font-bold text-slate-500 mb-1.5">วันที่</label>
                                    <div className="relative">
                                        <select value={filterDate} onChange={e => setFilterDate(e.target.value)} className="appearance-none bg-[#f8fafc] border border-slate-300 rounded-xl text-sm font-bold text-[#064e3b] pl-4 pr-10 py-2.5 outline-none cursor-pointer">
                                            {DATES.map(d => <option key={d.id} value={d.id}>{d.display}</option>)}
                                        </select>
                                        <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-[#064e3b] text-[10px] pointer-events-none"></i>
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-[11px] font-bold text-slate-500 mb-1.5">เวลา</label>
                                    <div className="relative">
                                        <select value={filterSlot} onChange={e => setFilterSlot(e.target.value)} className="appearance-none bg-[#f8fafc] border border-slate-300 rounded-xl text-sm font-bold text-[#064e3b] pl-4 pr-10 py-2.5 outline-none cursor-pointer">
                                            {TIME_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                        <i className="fa-solid fa-chevron-down absolute right-3.5 top-1/2 -translate-y-1/2 text-[#064e3b] text-[10px] pointer-events-none"></i>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3.5 text-[11px] font-bold text-slate-700 bg-[#f8fafc] px-4 py-2.5 rounded-2xl border border-slate-200">
                                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-white border-2 border-[#064e3b] flex items-center justify-center"><i className="fa-solid fa-check text-[8px] text-[#064e3b]"></i></span><span className="text-[#064e3b]">เลือกอยู่</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-white border border-slate-300"></span><span>ว่าง</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-rose-200 border border-rose-400"></span><span>กำลังเล่น</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-amber-200 border border-amber-400"></span><span>จองแล้ว</span></div>
                                <div className="flex items-center gap-1.5"><span className="w-4 h-4 rounded bg-blue-100 border border-blue-400"></span><span>เคาน์เตอร์</span></div>
                            </div>
                        </div>

                        
                    </div>

                    <div className="w-full flex flex-col gap-6 sm:gap-7">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6">
                            {['T-03', 'T-04', 'T-05'].map(id => {
                                const t = TABLE_DATA.find(x => x.id === id);
                                return (
                                    <div key={id} onClick={() => handleTableClick(id)} className={`group relative border-2 rounded-2xl p-5 min-h-[175px] flex flex-col justify-between transition-all duration-300 cursor-pointer ${getTableBgColor(id)}`}>
                                        <div className="flex items-start justify-between">
                                            <span className={`w-9 h-9 rounded-full ${getTableStatus(id) === 'selected' ? 'bg-[#064e3b] text-white' : 'bg-purple-100 border border-purple-300 text-purple-900'} font-heading font-bold text-base flex items-center justify-center shadow-xs`}>{id.replace('T-0', '')}</span>
                                            {getTableBadge(id)}
                                        </div>
                                        <div className="flex justify-center items-center gap-3 my-3 py-3 bg-slate-50/70 rounded-xl border border-dashed border-slate-200">
                                            <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                            <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                        </div>
                                        <div className="flex justify-between items-baseline text-xs">
                                            <div>
                                                <h4 className={`font-bold text-sm transition ${getTableStatus(id) === 'selected' ? 'text-[#064e3b]' : 'text-slate-800'}`}>
                                                    {t.name || `Table ${id.replace('T-0', '')}`} {getTableStatus(id) === 'selected' && <i className="fa-solid fa-circle-check text-[#064e3b] ml-1"></i>}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">({t.capMin}-{t.capMax} คน)</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="grid grid-cols-12 gap-5 lg:gap-6 items-stretch">
                            <div onClick={() => handleTableClick('T-02')} className={`group col-span-12 md:col-span-3 border-2 rounded-2xl p-5 min-h-[185px] flex flex-col justify-between transition-all duration-300 cursor-pointer ${getTableBgColor('T-02')}`}>
                                <div className="flex items-start justify-between">
                                    <span className={`w-9 h-9 rounded-full ${getTableStatus('T-02') === 'selected' ? 'bg-[#064e3b] text-white' : 'bg-purple-100 border border-purple-300 text-purple-900'} font-heading font-bold text-base flex items-center justify-center shadow-xs`}>2</span>
                                    {getTableBadge('T-02')}
                                </div>
                                <div className="grid grid-cols-2 gap-3 my-3 py-3 px-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 place-items-center">
                                    <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                    <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                </div>
                                <div className="text-xs">
                                    <h4 className={`font-bold text-sm transition ${getTableStatus('T-02') === 'selected' ? 'text-[#064e3b]' : 'text-slate-800 group-hover:text-[#064e3b]'}`}>
                                        Table 02 {getTableStatus('T-02') === 'selected' && <i className="fa-solid fa-circle-check text-[#064e3b] ml-1"></i>}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">(4-6 คน)</p>
                                </div>
                            </div>

                            <div className="col-span-12 md:col-span-6 grid grid-cols-3 gap-3 sm:gap-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                                {['T-10', 'T-09', 'T-08'].map(id => (
                                    <div key={id} onClick={() => handleTableClick(id)} className={`group border-2 rounded-xl p-3.5 flex flex-col justify-between min-h-[175px] cursor-pointer transition-all duration-200 ${getTableBgColor(id)}`}>
                                        <div className="flex justify-between items-start">
                                            <span className={`w-8 h-8 rounded-full ${getTableStatus(id) === 'selected' ? 'bg-[#064e3b] text-white' : 'bg-purple-100 border border-purple-300 text-purple-900'} font-heading font-bold text-xs flex items-center justify-center`}>{id.split('-')[1]}</span>
                                            {getTableBadge(id, true)}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 my-auto py-2.5 place-items-center">
                                            <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                            <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                        </div>
                                        <div className="text-left">
                                            <span className={`block text-xs font-bold transition ${getTableStatus(id) === 'selected' ? 'text-[#064e3b]' : 'text-slate-800 group-hover:text-[#064e3b]'}`}>
                                                {id} {getTableStatus(id) === 'selected' && <i className="fa-solid fa-circle-check text-[#064e3b] ml-0.5"></i>}
                                            </span>
                                            <span className="text-[11px] text-slate-500">2-4 ที่นั่ง</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div onClick={() => handleTableClick('T-06')} className={`group col-span-12 md:col-span-3 border-2 rounded-2xl p-5 min-h-[185px] flex flex-col justify-between transition-all duration-300 cursor-pointer ${getTableBgColor('T-06')}`}>
                                <div className="flex items-start justify-between">
                                    <span className={`w-9 h-9 rounded-full ${getTableStatus('T-06') === 'selected' ? 'bg-[#064e3b] text-white' : 'bg-purple-100 border border-purple-300 text-purple-900'} font-heading font-bold text-base flex items-center justify-center shadow-xs`}>6</span>
                                    {getTableBadge('T-06')}
                                </div>
                                <div className="grid grid-cols-2 gap-3 my-3 py-3 px-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 place-items-center">
                                    <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                    <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                </div>
                                <div className="text-xs">
                                    <h4 className={`font-bold text-sm transition ${getTableStatus('T-06') === 'selected' ? 'text-[#064e3b]' : 'text-slate-800 group-hover:text-[#064e3b]'}`}>
                                        Table 06 {getTableStatus('T-06') === 'selected' && <i className="fa-solid fa-circle-check text-[#064e3b] ml-1"></i>}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">(4-6 คน)</p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-12 gap-5 lg:gap-6 items-stretch">
                            <div onClick={() => handleTableClick('T-01')} className={`group col-span-12 md:col-span-3 border-2 rounded-2xl p-5 min-h-[175px] flex flex-col justify-between transition-all duration-300 cursor-pointer ${getTableBgColor('T-01')}`}>
                                <div className="flex items-start justify-between">
                                    <span className={`w-9 h-9 rounded-full ${getTableStatus('T-01') === 'selected' ? 'bg-[#064e3b] text-white' : 'bg-purple-100 border border-purple-300 text-purple-900'} font-heading font-bold text-base flex items-center justify-center shadow-xs`}>1</span>
                                    {getTableBadge('T-01')}
                                </div>
                                <div className="grid grid-cols-2 gap-3 my-3 py-3 place-items-center bg-slate-50/50 rounded-xl">
                                    <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                    <span className="w-3 h-3 rounded-full bg-slate-400"></span><span className="w-3 h-3 rounded-full bg-slate-400"></span>
                                </div>
                                <div className="text-xs">
                                    <h4 className={`font-bold text-sm transition ${getTableStatus('T-01') === 'selected' ? 'text-[#064e3b]' : 'text-slate-800 group-hover:text-[#064e3b]'}`}>
                                        Table 01 {getTableStatus('T-01') === 'selected' && <i className="fa-solid fa-circle-check text-[#064e3b] ml-1"></i>}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">(2-4 คน)</p>
                                </div>
                            </div>

                            {/* Cashier Station */}
                            <div className="col-span-12 md:col-span-6 relative bg-blue-50/80 border-2 border-blue-500 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xs min-h-[175px]">
                                <div className="pt-4 pb-2 px-5 text-center">
                                    <div className="inline-flex items-center gap-2.5 bg-blue-100 text-blue-950 border border-blue-300 px-4 py-1.5 rounded-full text-xs font-heading font-bold tracking-wide uppercase">
                                        <i className="fa-solid fa-mug-hot text-blue-600 text-sm"></i> โซนใต้: จุดเช็กอิน & บาริสต้า
                                    </div>
                                    <p className="text-xs text-blue-800 mt-1.5 font-medium">จุดรับคำแนะนำบอร์ดเกมและบริการเครื่องดื่มพิเศษ</p>
                                </div>
                                <div className="flex items-end justify-between px-8 w-full h-16">
                                    <div className="w-24 h-12 bg-blue-200 border-t-2 border-r-2 border-blue-400 rounded-tr-lg flex flex-col items-center justify-center text-xs text-blue-900 font-semibold shadow-inner">
                                        <i className="fa-solid fa-cash-register text-xs mb-0.5"></i> POS 1
                                    </div>
                                    <div className="flex-1 mx-4 h-12 flex items-center justify-center border-b-2 border-dashed border-blue-300 text-xs text-blue-500 font-mono">
                                        ทางเดินพนักงาน
                                    </div>
                                    <div className="w-24 h-12 bg-blue-200 border-t-2 border-l-2 border-blue-400 rounded-tl-lg flex flex-col items-center justify-center text-xs text-blue-900 font-semibold shadow-inner">
                                        <i className="fa-solid fa-coffee text-xs mb-0.5"></i> บาริสต้า
                                    </div>
                                </div>
                            </div>

                            <div onClick={() => handleTableClick('T-07')} className={`group col-span-12 md:col-span-3 border-2 rounded-2xl p-5 min-h-[175px] flex flex-col justify-between transition-all duration-300 cursor-pointer ${getTableBgColor('T-07')}`}>
                                <div className="flex items-start justify-between">
                                    <span className={`w-9 h-9 rounded-full ${getTableStatus('T-07') === 'selected' ? 'bg-[#064e3b] text-white' : 'bg-rose-100 border border-rose-300 text-rose-800'} font-heading font-bold text-base flex items-center justify-center shadow-xs`}>7</span>
                                    {getTableBadge('T-07')}
                                </div>
                                <div className="grid grid-cols-2 gap-3 my-3 py-3 place-items-center bg-rose-100/40 rounded-xl">
                                    <span className="w-3 h-3 rounded-full bg-rose-400"></span><span className="w-3 h-3 rounded-full bg-rose-400"></span>
                                    <span className="w-3 h-3 rounded-full bg-rose-400"></span><span className="w-3 h-3 rounded-full bg-rose-400"></span>
                                </div>
                                <div className="text-xs">
                                    <h4 className={`font-bold text-sm transition ${getTableStatus('T-07') === 'selected' ? 'text-[#064e3b]' : 'text-slate-800'}`}>
                                        Table 07 {getTableStatus('T-07') === 'selected' && <i className="fa-solid fa-circle-check text-[#064e3b] ml-1"></i>}
                                    </h4>
                                    <p className="text-xs text-slate-500 mt-0.5">(4-6 คน)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-500 font-sans">
                        <div className="flex items-center gap-2">
                            <i className="fa-solid fa-door-open text-[#064e3b] text-base"></i>
                            <span>ทางเข้าหลัก (MAIN ENTRANCE - ตรงข้ามเคาน์เตอร์บาริสต้า)</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* 3. Drawer Backdrop */}
            {isDrawerOpen && (
                <div className="fixed inset-0 bg-black/25 backdrop-blur-[2px] z-40 transition-opacity" onClick={() => setIsDrawerOpen(false)}></div>
            )}

            {/* 4. Right Slide-Over Drawer */}
            <aside className={`fixed top-0 right-0 h-full w-full md:w-[460px] bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>

                {/* Drawer Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <h2 className="text-xl font-heading font-bold text-[#064e3b]">โต๊ะ {selectedTableId}</h2>
                            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">พร้อมจอง</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{selectedTableData.desc} • พร้อมสิ่งอำนวยความสะดวกครบครัน</p>
                    </div>
                    <button onClick={() => setIsDrawerOpen(false)} className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>

                {/* Drawer Content Body */}
                <div className="p-6 flex flex-col gap-5 overflow-y-auto flex-1">

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-0.5">
                            <span className="text-slate-400 block text-[11px]">ความจุโต๊ะ</span>
                            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-sm"><i className="fa-solid fa-users text-[#064e3b]"></i> {selectedTableData.capMin}-{selectedTableData.capMax} ท่าน</span>
                        </div>
                        {/* เปลี่ยน bg, border และสีตัวหนังสือของกล่องนี้ให้เหมือนกล่องซ้าย */}
                        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col gap-0.5">
                            <span className="text-slate-400 block text-[11px]">อัตราค่าบริการ</span>
                            <span className="font-bold text-[#064e3b] flex items-baseline gap-1 text-sm">฿120 <span className="font-normal text-[10px] text-slate-500">/ คน / ชม.</span></span>
                        </div>
                    </div>

                    {/* Date Selection */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-heading">1. เลือกวันที่ต้องการเล่น</label>
                        <div className="grid grid-cols-3 gap-2">
                            {DATES.map((date) => {
                                const isSelected = selectedDate === date.id;
                                return (
                                    <button key={date.id} onClick={() => setSelectedDate(date.id)} className={`py-2.5 px-3 rounded-xl border flex flex-col items-center transition ${isSelected ? 'bg-[#064e3b] text-white border-[#064e3b] shadow-xs' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'}`}>
                                        <span className={`text-[10px] uppercase ${isSelected ? 'text-emerald-200 font-normal' : 'text-slate-400'}`}>{date.shortLabel}</span>
                                        <span className="font-bold text-sm">{date.display}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Selector */}
                    <div className="p-4 rounded-2xl flex flex-col gap-3 border-transparent bg-slate-50">
                        <div className="flex flex-col gap-0.5">
                            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider font-heading flex items-center justify-between">
                                <span>2. เลือกรอบเวลา</span>
                                <span className="text-[10px] font-normal text-emerald-800 lowercase bg-emerald-100/70 px-2 py-0.5 rounded-full">เลือกต่อเนื่องได้</span>
                            </label>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {TIME_SLOTS.map(slot => {
                                const key = `${selectedDate}_${slot}`;
                                const isBooked = BOOKING_DATA.some(b => b.tableId === selectedTableId && b.date === selectedDate && b.slots.includes(slot)); const isSelected = selectedSlots.includes(slot);

                                if (isBooked) {
                                    return (
                                        <button key={slot} disabled className="text-[11px] py-2 px-1 rounded-xl border border-slate-200 bg-slate-200 text-slate-400 font-medium flex flex-col items-center justify-center cursor-not-allowed opacity-60">
                                            <span className="line-through">{slot}</span>
                                            <span className="text-[9px] text-rose-500 mt-0.5 font-bold">ไม่ว่าง</span>
                                        </button>
                                    );
                                }

                                return (
                                    <button key={slot} onClick={() => toggleTimeSlot(slot)}
                                        className={`text-xs py-2 px-1 rounded-xl transition-all shadow-xs border text-center font-medium ${isSelected ? 'bg-[#064e3b] text-white border-transparent shadow-md font-semibold' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                                        {slot}
                                    </button>
                                )
                            })}
                        </div>

                        {selectedSlots.length > 0 && (
                            <div className="bg-white border border-emerald-200/90 rounded-xl p-3.5 mt-1 flex flex-col gap-2.5 shadow-xs">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-800 font-heading flex items-center gap-1.5"><i className="fa-regular fa-calendar-check text-[#064e3b]"></i> สรุปรายการที่เลือก</span>
                                    <span className="text-[11px] text-slate-500 font-medium">เลือกแล้ว {selectedSlots.length} รอบ</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {selectedSlots.map(slot => (
                                        <span key={slot} className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-950 text-[11px] font-medium shadow-xs">
                                            {slot}
                                            <button type="button" onClick={() => toggleTimeSlot(slot)} className="ml-0.5 w-4 h-4 hover:bg-emerald-200 rounded-full inline-flex items-center justify-center text-emerald-800 transition">
                                                <i className="fa-solid fa-xmark text-[9px]"></i>
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Player Stepper */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-heading">3. จำนวนผู้เล่น</label>
                        <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                            <div className="pl-2">
                                <span className="text-xs font-semibold text-slate-800 block">จำนวนผู้เล่นทั้งหมด</span>
                                <span className="text-[10px] text-slate-400">โต๊ะนี้รองรับได้สูงสุด {selectedTableData.capMax} ท่าน</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setPlayers(Math.max(1, players - 1))} className="w-8 h-8 rounded-xl bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 active:scale-95 flex items-center justify-center font-bold transition shadow-xs">-</button>
                                <span className="font-heading font-bold text-base text-[#064e3b] w-5 text-center">{players}</span>
                                <button onClick={() => setPlayers(Math.min(selectedTableData.capMax, players + 1))} className="w-8 h-8 rounded-xl bg-[#064e3b] text-white flex items-center justify-center font-bold hover:bg-[#065f46] active:scale-95 transition shadow-xs">+</button>
                            </div>
                        </div>
                    </div>

                    {/* Game Selector Trigger */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 font-heading">4. บอร์ดเกมเตรียมพร้อมล่วงหน้า</label>
                        <div className="flex items-center gap-3 p-3 rounded-2xl border border-slate-200 bg-white shadow-sm">
                            {selectedGame ? (
                                <>
                                    <div className="w-11 h-11 rounded-xl bg-[#064e3b] text-emerald-300 flex items-center justify-center text-lg font-bold shrink-0 shadow-inner">
                                        <i className={`fa-solid ${selectedGame.icon}`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-xs font-bold text-slate-900 truncate">{selectedGame.title}</h5>
                                        <p className="text-[11px] text-slate-500">{selectedGame.publisher || selectedGame.desc}</p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-11 h-11 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 shrink-0">
                                        <i className="fa-solid fa-box-open"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h5 className="text-xs font-bold text-slate-600">ยังไม่เลือกเกม</h5>
                                        <p className="text-[11px] text-slate-500 font-medium">เลือกที่ร้านได้เลย ไม่ต้องระบุล่วงหน้า</p>
                                    </div>
                                </>
                            )}
                            <button onClick={() => setIsGameModalOpen(true)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border text-[#064e3b] hover:bg-emerald-50 active:scale-95 transition shadow-xs border-slate-200">
                                {selectedGame ? 'เปลี่ยนเกม' : 'เลือกเกม'}
                            </button>
                        </div>
                    </div>

                </div>

                {/* Footer CTA */}
                <div className="p-6 pt-3 border-t border-slate-100 bg-white flex flex-col gap-3 mt-auto">
                    <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-500">ยอดรวมทั้งหมด</span>
                        <span className="text-2xl font-heading font-bold text-[#064e3b]">฿{totalCost.toLocaleString()}</span>
                    </div>
                    <button disabled={selectedSlots.length === 0} onClick={handleConfirmBooking} className="w-full py-3.5 px-4 rounded-xl disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed bg-[#064e3b] hover:bg-[#065f46] active:scale-[0.99] text-white font-heading font-bold text-sm tracking-wide shadow-lg shadow-[#064e3b]/20 transition flex items-center justify-center gap-2">
                        
                        <span>ยืนยันการจองโต๊ะ</span>
                    </button>
                    <p className="text-[10px] text-center text-slate-400">ยกเลิกได้ฟรีก่อนถึงเวลาจอง 2 ชั่วโมง • ไม่มีค่ามัดจำล่วงหน้า</p>
                </div>
            </aside>

            {/* 5. Game Selection Modal (For Drawer) */}
            {isGameModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setIsGameModalOpen(false)}></div>
                    <div className="relative bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden z-10">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                            <div>
                                <h3 className="text-base font-heading font-bold text-[#064e3b] flex items-center gap-2">
                                    <i className="fa-solid fa-dice text-emerald-600"></i> เลือกบอร์ดเกมที่ต้องการเล่น
                                </h3>
                                <p className="text-xs text-slate-500">ทางร้านจะจัดเตรียมอุปกรณ์เกมไว้ที่โต๊ะก่อนที่คุณจะมาถึง</p>
                            </div>
                            <button onClick={() => setIsGameModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition">
                                <i className="fa-solid fa-xmark text-sm"></i>
                            </button>
                        </div>

                        <div className="p-4 border-b border-slate-100 flex flex-col gap-2.5 bg-white">
                            <div className="relative">
                                <i className="fa-solid fa-magnifying-glass absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                                <input className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 focus:border-emerald-600 text-xs text-slate-800 bg-slate-50 placeholder-slate-400 outline-none" placeholder="ค้นหาชื่อเกม เช่น Wingspan, Catan..." type="text" />
                            </div>
                        </div>

                        <div className="p-4 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh]">
                            {GAME_DATA.map((game, index) => {
                                const isSelected = selectedGame?.title === game.title;
                                const isDisabled = game.status === 'in-use';

                                if (isDisabled) {
                                    return (
                                        <div key={index} className="border border-slate-200 bg-slate-50 rounded-xl p-3 flex flex-col justify-between opacity-60">
                                            <div className="flex items-start gap-2.5">
                                                <div className={`w-9 h-9 rounded-lg bg-slate-200 text-slate-400 flex items-center justify-center text-sm`}>
                                                    <i className={`fa-solid ${game.icon}`}></i>
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-slate-600">{game.title}</h4>
                                                    <p className="text-[11px] text-slate-400">{game.timeMin}-{game.timeMax}m</p>
                                                </div>
                                            </div>
                                            <button disabled className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-slate-200 text-slate-500 font-semibold text-xs border border-slate-300">กำลังมีผู้เล่นใช้งาน</button>
                                        </div>
                                    );
                                }
                                return (
                                    <div key={index} onClick={() => { setSelectedGame(game); setIsGameModalOpen(false); }} className={`border rounded-xl p-3 flex flex-col justify-between transition cursor-pointer ${isSelected ? 'border-2 border-emerald-500 bg-emerald-50/40' : 'border-slate-200 bg-white hover:border-emerald-500'}`}>
                                        <div className="flex items-start gap-2.5">
                                            <div className={`w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-sm`}>
                                                <i className={`fa-solid ${game.icon}`}></i>
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-slate-900">{game.title}</h4>
                                                <p className="text-[11px] text-slate-500">{game.timeMin}-{game.timeMax}m</p>
                                            </div>
                                        </div>
                                        {isSelected ? (
                                            <button className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-emerald-600 text-white font-semibold text-xs">เลือกแล้ว</button>
                                        ) : (
                                            <button className="mt-2.5 w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-[#064e3b] hover:text-white text-slate-700 font-semibold text-xs transition">เลือก</button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
                            <button onClick={() => setIsGameModalOpen(false)} className="px-4 py-1.5 rounded-xl border border-slate-300 font-medium text-slate-600 hover:bg-slate-100 text-xs transition">
                                ปิดหน้าต่าง
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}