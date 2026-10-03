import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  // State หน้าต่าง Pop-up เพิ่มผู้ใช้
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
  });

  // State หน้าต่าง Pop-up แก้ไขสิทธิ์
  const [editRoleModal, setEditRoleModal] = useState({ show: false, user: null, newRole: 'user' });

  // ดึงข้อมูลผู้ใช้จาก API
  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const usersData = Array.isArray(data) ? data : data.items || data.data || [];

      // แอบใส่ status: 'active' ให้ทุกคนเป็นค่าเริ่มต้น (เพราะ API ไม่มีส่งมา)
      const safeData = usersData.map((u) => ({ ...u, status: u.status || 'active' }));
      setUsers(safeData);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
      return;
    }
    fetchUsers();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleSaveNewUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
        }),
      });
      if (response.ok) {
        setShowAddModal(false);
        setNewUser({ username: '', email: '', phone: '', password: '', role: 'user' });
        fetchUsers();
        alert('✅ เพิ่มผู้ใช้งานใหม่สำเร็จ!');
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`❌ ไม่สามารถเพิ่มผู้ใช้ได้: ${err.error || 'ข้อมูลซ้ำ หรือกรอกผิด'}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveRole = async () => {
    const { user, newRole } = editRoleModal;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${user._id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        // อัปเดตข้อมูลบนหน้าเว็บทันที
        setUsers(users.map((u) => (u._id === user._id ? { ...u, role: newRole } : u)));
        setEditRoleModal({ show: false, user: null, newRole: 'user' });
        alert('✅ อัปเดตสิทธิ์สำเร็จ!');
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`❌ อัปเดตสิทธิ์ไม่สำเร็จ: ${err.error || err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 🌟 ฟังก์ชันลบผู้ใช้แบบถาวร (ยิง API DELETE)
  const handleDeleteUser = async (userId, username) => {
    if (
      !window.confirm(`🚨 ยืนยันการ "ลบ" บัญชี "${username}" ถาวรใช่หรือไม่?\n(ไม่สามารถกู้คืนได้)`)
    )
      return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        alert('✅ ลบบัญชีเรียบร้อยแล้ว');
        // ลบออกจาก State เลย ไม่ต้อง fetch ใหม่ เพื่อป้องกัน status ระงับจำลองหาย
        setUsers((prevUsers) => prevUsers.filter((u) => u._id !== userId));
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`❌ ลบบัญชีไม่สำเร็จ: ${err.error || err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // 🌟 ฟังก์ชันระงับผู้ใช้ (จำลองเปลี่ยน State ให้หน้าจอเปลี่ยนสี)
  const handleSuspendUser = (userId, username) => {
    if (!window.confirm(`⚠️ ยืนยันการ "ระงับ" บัญชี "${username}" ใช่หรือไม่?`)) return;
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u._id === userId ? { ...u, status: 'suspended' } : u)),
    );
  };

  // 🌟 ฟังก์ชันปลดระงับผู้ใช้
  const handleUnsuspendUser = (userId, username) => {
    if (!window.confirm(`🔓 ต้องการปลดระงับบัญชี "${username}" ใช่หรือไม่?`)) return;
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u._id === userId ? { ...u, status: 'active' } : u)),
    );
  };

  const filteredUsers = users.filter((user) => {
    const matchSearch =
      (user.username?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchRole = roleFilter === 'all' || user.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === 'admin').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;
  const activeCount = totalUsers - suspendedCount;

  const getAvatarColor = (name) => {
    const colors = ['#0f766e', '#0369a1', '#b45309', '#be123c', '#6d28d9'];
    const charCode = name ? name.charCodeAt(0) : 0;
    return colors[charCode % colors.length];
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: '260px',
          backgroundColor: '#064e3b',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.5rem',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '2.5rem',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                backgroundColor: '#10b981',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: '#064e3b',
              }}
            >
              %
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem' }}>SomeDay</h2>
              <span style={{ fontSize: '0.7rem', color: '#6ee7b7' }}>BOARDGAME CAFE</span>
            </div>
            <span
              style={{
                marginLeft: 'auto',
                backgroundColor: '#065f46',
                fontSize: '0.65rem',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              ADMIN
            </span>
          </div>
          <div
            style={{
              fontSize: '0.7rem',
              color: '#9ca3af',
              marginBottom: '0.75rem',
              fontWeight: 'bold',
            }}
          >
            MAIN MODULES / เมนูหลัก
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <Link
              to="/inventory"
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
              }}
            >
              📦 คลังเกม (Inventory)
            </Link>
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                color: '#d1d5db',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              🪑 จัดการโต๊ะ / ตารางจอง
            </div>
            <Link
              to="/users"
              style={{
                backgroundColor: '#065f46',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                color: 'white',
                textDecoration: 'none',
              }}
            >
              👥 จัดการผู้ใช้ (Users)
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '2rem 2.5rem', overflowY: 'auto' }}>
        {/* Header */}
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                marginBottom: '0.25rem',
              }}
            >
              <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#111827', fontWeight: '800' }}>
                จัดการผู้ใช้งานและสิทธิ์ (User & Member Management)
              </h1>
              <span
                style={{
                  backgroundColor: '#dcfce7',
                  color: '#166534',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold',
                }}
              >
                ● LIVE SYSTEM DB
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#6b7280' }}>
              สมาชิกทั้งหมด <b>{totalUsers}</b> คน • ผู้ดูแลระบบ <b>{adminCount}</b> คน
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                backgroundColor: '#064e3b',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              + เพิ่มผู้ใช้งานใหม่ (Add User)
            </button>
            <button
              onClick={handleLogout}
              style={{
                backgroundColor: '#ef4444',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: '600',
              }}
            >
              ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Dashboard Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              background: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>
                  TOTAL ACCOUNTS
                </div>
                <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '600' }}>
                  บัญชีผู้ใช้ทั้งหมด
                </div>
              </div>
              <div style={{ backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
                👥
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', fontWeight: '800' }}>
                {totalUsers}
              </h2>
            </div>
            <div
              style={{
                height: '4px',
                backgroundColor: '#e2e8f0',
                marginTop: '1rem',
                borderRadius: '2px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: '#064e3b',
                  borderRadius: '2px',
                }}
              ></div>
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>
                  ACTIVE RATIO
                </div>
                <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '600' }}>
                  Active สัปดาห์นี้
                </div>
              </div>
              <div style={{ backgroundColor: '#dcfce7', padding: '6px', borderRadius: '6px' }}>
                📈
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', fontWeight: '800' }}>
                {activeCount}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>(บัญชีปกติ)</span>
            </div>
            <div
              style={{ fontSize: '0.7rem', color: '#059669', marginTop: 'auto', fontWeight: '600' }}
            >
              ● พร้อมเข้าสู่ระบบ
            </div>
          </div>

          <div
            style={{
              background: 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>
                  PRIVILEGED ACCESS
                </div>
                <div style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: '600' }}>
                  สิทธิ์ Admin
                </div>
              </div>
              <div style={{ backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '6px' }}>
                🛡️
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#0f172a', fontWeight: '800' }}>
                {adminCount}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Admin</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 'auto' }}>
              🔑 พร้อมระบบยืนยันตัวตน 2FA ครบทุกบัญชี
            </div>
          </div>

          <div
            style={{
              background: suspendedCount > 0 ? '#fef2f2' : 'white',
              padding: '1.25rem',
              borderRadius: '12px',
              border: `1px solid ${suspendedCount > 0 ? '#fee2e2' : '#e2e8f0'}`,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: suspendedCount > 0 ? '#991b1b' : '#64748b',
                    fontWeight: 'bold',
                  }}
                >
                  SAFETY & COMPLIANCE
                </div>
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: suspendedCount > 0 ? '#991b1b' : '#0f172a',
                    fontWeight: '600',
                  }}
                >
                  บัญชีถูกระงับ (Suspended)
                </div>
              </div>
              <div
                style={{
                  backgroundColor: suspendedCount > 0 ? '#fecaca' : '#f1f5f9',
                  padding: '6px',
                  borderRadius: '6px',
                }}
              >
                ⚠️
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: '1.8rem',
                  color: suspendedCount > 0 ? '#991b1b' : '#0f172a',
                  fontWeight: '800',
                }}
              >
                {suspendedCount}
              </h2>
              {suspendedCount > 0 && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    backgroundColor: '#991b1b',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                  }}
                >
                  Action Needed (ต้องตรวจสอบ)
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '0.7rem',
                color: suspendedCount > 0 ? '#991b1b' : '#64748b',
                marginTop: 'auto',
              }}
            >
              ระงับจากกรณี No-show หรือละเมิดระเบียบห้อง Vault
            </div>
          </div>
        </div>

        {/* Filters */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
            padding: '12px 16px',
            backgroundColor: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ flex: 1, maxWidth: '400px' }}>
            <input
              type="text"
              placeholder="🔍 ค้นหาด้วยชื่อ, อีเมล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '999px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                backgroundColor: '#f8fafc',
                outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              onClick={() => setRoleFilter('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: roleFilter === 'all' ? '#064e3b' : 'transparent',
                color: roleFilter === 'all' ? 'white' : '#475569',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ทั้งหมด (All)
            </button>
            <button
              onClick={() => setRoleFilter('user')}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: roleFilter === 'user' ? '#064e3b' : 'transparent',
                color: roleFilter === 'user' ? 'white' : '#475569',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              สมาชิก (Members)
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              style={{
                padding: '6px 12px',
                borderRadius: '999px',
                border: 'none',
                backgroundColor: roleFilter === 'admin' ? '#064e3b' : 'transparent',
                color: roleFilter === 'admin' ? 'white' : '#475569',
                fontSize: '0.75rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ผู้ดูแล (Admin)
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div
          style={{
            background: 'white',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            marginBottom: '1.5rem',
            overflowX: 'auto',
          }}
        >
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              ⏳ กำลังโหลดข้อมูล...
            </div>
          ) : (
            <table
              style={{
                width: '100%',
                minWidth: '950px',
                borderCollapse: 'collapse',
                textAlign: 'left',
              }}
            >
              <thead style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <tr>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ข้อมูลสมาชิก (MEMBER INFO)
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ข้อมูล & การติดต่อ (CONTACT INFO)
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    วันที่สมัคร / ACTIVE ล่าสุด
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    ประวัติเล่น & การจอง
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      textAlign: 'center',
                    }}
                  >
                    ระดับสิทธิ์ (ROLE)
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                    }}
                  >
                    สถานะบัญชี
                  </th>
                  <th
                    style={{
                      padding: '12px 16px',
                      color: '#64748b',
                      fontSize: '0.7rem',
                      fontWeight: 'bold',
                      textAlign: 'right',
                    }}
                  >
                    การจัดการ
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const avatarColor = getAvatarColor(user.username);
                    const shortName = (user.username || 'U').substring(0, 2).toUpperCase();

                    let timeStr = '00:00 น.';
                    let dateStr = 'ไม่ระบุ';
                    if (user.createdAt) {
                      const dateObj = new Date(user.createdAt);
                      if (!isNaN(dateObj.getTime())) {
                        timeStr = `${dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })} น.`;
                        dateStr = dateObj.toLocaleDateString('th-TH');
                      }
                    }

                    return (
                      <tr
                        key={user._id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: user.status === 'suspended' ? '#fff1f2' : 'transparent',
                        }}
                      >
                        {/* 1. Member Info */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: avatarColor,
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                              }}
                            >
                              {shortName}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span
                                  style={{
                                    fontWeight: 'bold',
                                    color: '#0f172a',
                                    fontSize: '0.9rem',
                                  }}
                                >
                                  {user.username}
                                </span>
                                {user.role === 'admin' && (
                                  <span
                                    style={{
                                      backgroundColor: '#dcfce7',
                                      color: '#166534',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: 'bold',
                                    }}
                                  >
                                    Owner
                                  </span>
                                )}
                              </div>
                              <div
                                style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}
                              >
                                ID: #{user._id?.slice(-6).toUpperCase() || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contact Info */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '500' }}>
                            {user.email || 'N/A'}
                          </div>
                          <div
                            style={{
                              fontSize: '0.7rem',
                              color: '#64748b',
                              marginTop: '2px',
                              display: 'flex',
                              gap: '8px',
                            }}
                          >
                            <span>📱 {user.phone || 'ไม่ระบุเบอร์โทร'}</span>
                          </div>
                        </td>

                        {/* 3. Date */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#334155', fontWeight: '500' }}>
                            {timeStr}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            สมัครเมื่อ {dateStr}
                          </div>
                        </td>

                        {/* 🌟 4. Play History (ช่องที่เคยหายไป ได้กลับมาเกิดใหม่แล้ว!) */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '600' }}>
                            🔄 0 ครั้ง
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                            ล่าสุด: -
                          </div>
                        </td>

                        {/* 5. Role */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span
                            style={{ color: '#475569', fontSize: '0.85rem', fontWeight: 'bold' }}
                          >
                            {user.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </td>

                        {/* 6. Status */}
                        <td style={{ padding: '12px 16px' }}>
                          {user.status === 'suspended' ? (
                            <span
                              style={{
                                backgroundColor: '#dc2626',
                                color: 'white',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  backgroundColor: 'white',
                                  borderRadius: '50%',
                                }}
                              ></span>{' '}
                              ระงับ (Suspended)
                            </span>
                          ) : (
                            <span
                              style={{
                                backgroundColor: '#dcfce7',
                                color: '#166534',
                                padding: '4px 10px',
                                borderRadius: '999px',
                                fontSize: '0.7rem',
                                fontWeight: 'bold',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  backgroundColor: '#166534',
                                  borderRadius: '50%',
                                }}
                              ></span>{' '}
                              ปกติ (Active)
                            </span>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '12px',
                            }}
                          >
                            {user.status === 'suspended' ? (
                              <>
                                <button
                                  onClick={() => handleUnsuspendUser(user._id, user.username)}
                                  style={{
                                    backgroundColor: '#0f766e',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                  }}
                                >
                                  🔓 ปลดระงับ
                                </button>
                                <span
                                  onClick={() => handleDeleteUser(user._id, user.username)}
                                  style={{
                                    color: '#dc2626',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ลบ
                                </span>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => alert('รอ API: ดูสถิติลูกค้า')}
                                  style={{
                                    backgroundColor: '#f1f5f9',
                                    border: 'none',
                                    color: '#475569',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                  }}
                                >
                                  ดูประวัติ
                                </button>

                                <button
                                  onClick={() =>
                                    setEditRoleModal({
                                      show: true,
                                      user: user,
                                      newRole: user.role || 'user',
                                    })
                                  }
                                  style={{
                                    backgroundColor: '#f1f5f9',
                                    border: 'none',
                                    color: '#475569',
                                    padding: '6px 12px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                  }}
                                >
                                  แก้ไขสิทธิ์
                                </button>

                                {user.role !== 'admin' && (
                                  <>
                                    <span
                                      onClick={() => handleSuspendUser(user._id, user.username)}
                                      style={{
                                        color: '#d97706',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      ระงับ
                                    </span>
                                    <span style={{ color: '#cbd5e1' }}>|</span>
                                    <span
                                      onClick={() => handleDeleteUser(user._id, user.username)}
                                      style={{
                                        color: '#dc2626',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                      }}
                                    >
                                      ลบ
                                    </span>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}
                    >
                      ไม่พบข้อมูลผู้ใช้งาน
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal แก้ไขสิทธิ์ */}
        {editRoleModal.show && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '12px',
                width: '350px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>
                  🛡️ แก้ไขสิทธิ์การใช้งาน
                </h2>
                <button
                  onClick={() => setEditRoleModal({ show: false, user: null, newRole: 'user' })}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    color: '#94a3b8',
                  }}
                >
                  ✖
                </button>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>บัญชีผู้ใช้:</div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#0f172a' }}>
                  {editRoleModal.user?.username}
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                  เลือกระดับสิทธิ์ใหม่:
                </label>
                <select
                  value={editRoleModal.newRole}
                  onChange={(e) => setEditRoleModal({ ...editRoleModal, newRole: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    marginTop: '4px',
                    outline: 'none',
                  }}
                >
                  <option value="user">Member (สมาชิก)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button
                  onClick={() => setEditRoleModal({ show: false, user: null, newRole: 'user' })}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: 'white',
                    color: '#475569',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleSaveRole}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#064e3b',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: '600',
                  }}
                >
                  บันทึกสิทธิ์
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal เพิ่มผู้ใช้ */}
        {showAddModal && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
            }}
          >
            <div
              style={{
                background: 'white',
                padding: '2rem',
                borderRadius: '12px',
                width: '400px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1.5rem',
                }}
              >
                <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.25rem' }}>
                  ✨ เพิ่มผู้ใช้งานใหม่
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.25rem',
                    cursor: 'pointer',
                    color: '#94a3b8',
                  }}
                >
                  ✖
                </button>
              </div>
              <form
                onSubmit={handleSaveNewUser}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                    Username (ชื่อบัญชี):
                  </label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                    อีเมล:
                  </label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                    เบอร์โทรศัพท์ (ถ้ามี):
                  </label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="08X-XXX-XXXX"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                    รหัสผ่าน:
                  </label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569' }}>
                    ระดับสิทธิ์ (Role):
                  </label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      marginTop: '4px',
                      boxSizing: 'border-box',
                      outline: 'none',
                    }}
                  >
                    <option value="user">Member (สมาชิก)</option>
                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '0.5rem',
                    marginTop: '1rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: 'white',
                      color: '#475569',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    style={{
                      padding: '8px 16px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#064e3b',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: '600',
                    }}
                  >
                    บันทึกข้อมูล
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
