export const TABLE_DATA = [
  { id: 'T-01', capMin: 2, capMax: 4, desc: 'มุมทางเข้า' },
  { id: 'T-02', capMin: 4, capMax: 6, desc: 'โต๊ะกลางสไตล์โมเดิร์น' },
  { id: 'T-03', capMin: 6, capMax: 8, desc: 'กิลด์สายวางแผน' },
  { id: 'T-04', capMin: 6, capMax: 8, desc: 'โต๊ะแคมเปญใหญ่' },
  { id: 'T-05', capMin: 6, capMax: 8, desc: 'ลานปาร์ตี้' },
  { id: 'T-06', capMin: 4, capMax: 6, desc: 'มุมสบายริมหน้าต่าง' },
  { id: 'T-07', capMin: 4, capMax: 6, desc: 'มุมส่วนตัว' },
  { id: 'T-08', capMin: 2, capMax: 4, desc: 'โต๊ะขนาดกะทัดรัด' },
  { id: 'T-09', capMin: 2, capMax: 4, desc: 'โต๊ะขนาดเล็ก' },
  { id: 'T-10', capMin: 2, capMax: 4, desc: 'มุมดวลเกมคู่หู' },
];

export const GAME_DATA = [
  {
    id: 'G-01', title: 'Wingspan (Asia Expansion)', publisher: 'Stonemaier Games',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuABF9vg1gZP9sNPBrmxhp1FREpXVoHFnIzyVZNoK5WhHQ-2W_pCW-ehk0pXSxJ-Epeeu6CzT_AACWRqN567Hbz25NQh3dIYj58niMVyX0-8RVamRE7p20Td_UNiQKWVwW1FrhmKpQ99Rhb9q_-EkpvNdQSm75nZ7a6X_EgChQmdecDl_w9-nojlLk-lX62jNXHQp5w9jSM-4pMx8q8e9rxMPxw0zSHegYNetJaKTCmPlTSwWnCJPC1BhA',
    icon: 'fa-dove', tags: ['Engine Building', 'Animals', 'Card Drafting'], categories: ['engine', 'strategy'],
    minPlayers: 1, maxPlayers: 5, timeMin: 40, timeMax: 70, weight: '2.4', rating: '8.1',
    stockCount: 3, inUseTables: [], status: 'available'
  },
  {
    id: 'G-02', title: 'Cascadia', publisher: 'Flatout Games',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCR8aURL4era7pY3OP6qnkSYgWCpcs2T2mcgsBgjC1FsV4py1RA_LcmfYeziJLxxz3wMbhZflFBOm5B-_rYYb-01lPtJPLapb5bh8GJHMLzqAOg9fud05FEozfIhAPOrZsN_gl5PotLYa0bmcf9kSXkR3BuAeXP_M3KtecOH6nyx0QujuiCBtw_3ZEq-ptCdvsKTtzmJknBqLGhaR5Xu8e82PkxwNKhPJUKc3eZY_31OoTlOT5FSwG69Q',
    icon: 'fa-tree', tags: ['Tile Placement', 'Nature', 'Family'], categories: ['family'],
    minPlayers: 1, maxPlayers: 4, timeMin: 30, timeMax: 45, weight: '1.9', rating: '8.0',
    stockCount: 4, inUseTables: [], status: 'available'
  },
  {
    id: 'G-03', title: 'Ark Nova', publisher: 'Feuerland Spiele',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC1Z0QPsw65z-6Z9o3qLaNNFOJCDQE8Qb3UCsdXw9kCgJTXb7kVerruULcghFGlI7nM5-ftVpodq9lHR5yIKMIJ6sfOfDresGo_vhDxk25CNfaF-_dQKPHhaLIRR1cA0405IH0Nil9j1kDNlyvtK6q32evW-PeWKoIeaO5R45BZJdxzIajGOwA393D4oSNpJfdVb6K9a0Pst4kJ6vOm92L7QdNNpht3Xa1dyTEDPNfWQiTI0IumYiaaBQ',
    icon: 'fa-hippo', tags: ['Zoo Building', 'Heavy Euro', 'Hand Mgmt'], categories: ['heavy'],
    minPlayers: 1, maxPlayers: 4, timeMin: 90, timeMax: 150, weight: '3.7', rating: '8.5',
    stockCount: 0, inUseTables: ['T-04', 'T-09'], status: 'waitlist'
  },
  {
    id: 'G-04', title: 'Dune: Imperium', publisher: 'Dire Wolf',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmw4niT7-wZXn9ewlNJEFZ9lGAnONGCwEZuTfWHci3FRDh4qMyBTIVVeBjSY4KqcjJttceg_Uj7FmYMpx6oPukATBHE0UMWdqzLU1aas4B8pH640qVQFsS1hgPfK3IPMugL5-yfiCXrsur4q5r4DK1eEuhIitWnpuFx0d-BEwuZN3dDzokrD2l-SQmL1B0pLV4q0-r3aGDbr7ng28SEhmpeqBOa4neIcIzujMjfE3ZFiM1Tt1Y9iVV4Q',
    icon: 'fa-ring', tags: ['Deck Building', 'Worker Placement', 'Sci-Fi'], categories: ['strategy'],
    minPlayers: 1, maxPlayers: 4, timeMin: 60, timeMax: 120, weight: '3.0', rating: '8.4',
    stockCount: 2, inUseTables: [], status: 'available'
  },
  {
    id: 'G-05', title: 'Catan (5-6 Pax Extension)', publisher: 'KOSMOS',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB80ODLnuaZavKG05GIT-f0fitn8fTx-BEJ-V0UzjRlENnhh2u_jehoYVgs_FYmSwlg7Vem3y3dvzk-b_r7mycV-BTGTlLut9iqeF6rX08bqJNRM9VgPb1vJR97ZURPatv_qt4mWyh043BSGN7NF-YFEZXp6oqd2d9-HwZKjZbteC33op9JbB7yb7et3-mcy496ZFGaA7RHlmSZq3cbT8dpXswQpru2xKAFeOyvkRxPJMKAf-68n9Y72Q',
    icon: 'fa-mountain', tags: ['Trading', 'Resource Mgmt', 'Gateway'], categories: ['family', 'strategy'],
    minPlayers: 3, maxPlayers: 6, timeMin: 60, timeMax: 90, weight: '2.3', rating: '7.2',
    stockCount: 5, inUseTables: [], status: 'available'
  },
  {
    id: 'G-06', title: 'Terraforming Mars', publisher: 'FryxGames',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDkIXX7yWa1dOMWbPw7x0Qqd8oSMmXwHwWar86qc105df2T-jcFtHfTb8Z3D8ltR15yxv_LeQbOs58uCLrbjV7xOvir4KWSfJw48N3qC6A9fEeJavGZZUH1kxFFWp4k7kl6Mjc16k9xaA0G9LkqAxJKN3RDHBDY8wUBBQqEoBIRB2_CmJIyVmEjseUWk5ImTylob72JiDnLg4_l39ekwszMq0so9P5WrCGJY6M18IF4hl8Yi0learlzrA',
    icon: 'fa-globe', tags: ['Sci-Fi', 'Drafting', 'Economy'], categories: ['strategy', 'engine'],
    minPlayers: 1, maxPlayers: 5, timeMin: 90, timeMax: 120, weight: '3.3', rating: '8.4',
    stockCount: 1, inUseTables: [], status: 'available'
  },
  {
    id: 'G-07', title: 'Codenames', publisher: 'Czech Games Edition',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZYTH-lGHu-xn9kRQpJEhbKYmkVTawxGGqNZP6tP9VsiAhYRH0UkDOdz2TsyZIoIFJpf0OyNv2hJd4GQo0r4XVVPWMvb5b23ya72b-fPpY8LxCtCaPGRWoUTVsP6KSxHotX6L_1XvhIp8Ufgd6P8ODzUON-j7kgAZpTirhvera0Oxeko27aSKBa63wkKKChBMOCxSQjTD1qM7iibnJWn_gvYtpxdvf3FpGaKVErolawq25E_FTqProFA',
    icon: 'fa-user-secret', tags: ['Party', 'Deduction', 'Word Game'], categories: ['party'],
    minPlayers: 2, maxPlayers: 8, timeMin: 15, timeMax: 20, weight: '1.3', rating: '7.6',
    stockCount: 6, inUseTables: [], status: 'available'
  },
  {
    id: 'G-08', title: 'Root: Woodland Might', publisher: 'Leder Games',
    cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLM1EPGdCDKNKH83OkawLZUBAzcT4WVb22pRTX3YyzwbSTwSknDfduGZr3h3cg9racRH_THmuhJLOqXp51XjTpLKA5dsmAyS5f6LqLTj9AQQZKjFg1LDuQEMweZNKEL5JdT5sW8Xtb0wCdoMHFhWpkOSFmF9EwiUtv1UK4qteePgpkcgFFhb3aAnImGaAHaE9RY11nnGhw39IAVuGPrEE_YUE5M-hrAdhUWKtP2eF6FGyNXjyQUUnqKA',
    icon: 'fa-paw', tags: ['Asymmetric', 'Wargame', 'Woodland'], categories: ['heavy'],
    minPlayers: 2, maxPlayers: 4, timeMin: 60, timeMax: 90, weight: '3.8', rating: '8.1',
    stockCount: 0, inUseTables: ['T-02'], status: 'in-use'
  }
];

export const BOOKING_DATA = [
  { id: 'B1', tableId: 'T-05', date: '1 ต.ค.', slots: ['13:00 - 14:00', '14:00 - 15:00'], status: 'in-play' },
  { id: 'B2', tableId: 'T-07', date: '1 ต.ค.', slots: ['13:00 - 14:00', '14:00 - 15:00'], status: 'in-play' },
  { id: 'B3', tableId: 'T-09', date: '1 ต.ค.', slots: ['13:00 - 14:00'], status: 'reserved' },
  { id: 'B4', tableId: 'T-08', date: '1 ต.ค.', slots: ['14:00 - 15:00'], status: 'reserved' },
  { id: 'B5', tableId: 'T-01', date: '2 ต.ค.', slots: ['13:00 - 14:00'], status: 'reserved' },
  { id: 'B6', tableId: 'T-02', date: '2 ต.ค.', slots: ['13:00 - 14:00'], status: 'in-play' },
  { id: 'B7', tableId: 'T-03', date: '3 ต.ค.', slots: ['15:00 - 16:00'], status: 'reserved' },
  { id: 'B8', tableId: 'T-10', date: '3 ต.ค.', slots: ['15:00 - 16:00'], status: 'in-play' }
];

export const TIME_SLOTS = [
  "13:00 - 14:00", 
  "14:00 - 15:00", 
  "15:00 - 16:00", 
  "16:00 - 17:00", 
  "17:00 - 18:00", 
  "18:00 - 19:00", 
  "19:00 - 20:00", 
  "20:00 - 21:00", 
  "21:00 - 22:00", 
  "22:00 - 23:00", 
  "23:00 - 00:00"
];

export const DATES = [
  { id: '1 ต.ค.', shortLabel: 'วันนี้', display: '1 ต.ค.' },
  { id: '2 ต.ค.', shortLabel: 'พรุ่งนี้', display: '2 ต.ค.' },
  { id: '3 ต.ค.', shortLabel: 'มะรืนนี้', display: '3 ต.ค.' }
];