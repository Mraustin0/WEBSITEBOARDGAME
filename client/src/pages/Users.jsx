import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Users.css';

export default function Users() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    email: '',
    phone: '',
    password: '',
    role: 'user',
  });

  const [editRoleModal, setEditRoleModal] = useState({ show: false, user: null, newRole: 'user' });

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      const usersData = Array.isArray(data) ? data : data.items || data.data || [];

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
        setUsers((prevUsers) => prevUsers.filter((u) => u._id !== userId));
      } else {
        const err = await response.json().catch(() => ({}));
        alert(`❌ ลบบัญชีไม่สำเร็จ: ${err.error || err.message}`);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleSuspendUser = (userId, username) => {
    if (!window.confirm(`⚠️ ยืนยันการ "ระงับ" บัญชี "${username}" ใช่หรือไม่?`)) return;
    setUsers((prevUsers) =>
      prevUsers.map((u) => (u._id === userId ? { ...u, status: 'suspended' } : u)),
    );
  };

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
    <div className="users-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="sidebar-logo-icon">%</div>
            <div className="sidebar-logo-text">
              <h2>SomeDay</h2>
              <span>BOARDGAME CAFE</span>
            </div>
            <span className="sidebar-badge">ADMIN</span>
          </div>
          <div className="sidebar-menu-title">MAIN MODULES / เมนูหลัก</div>
          <div className="sidebar-menu">
            <Link to="/inventory" className="menu-item">
              <span>📦</span> คลังเกม (Inventory)
            </Link>
            <div className="menu-item">
              <span>🪑</span> จัดการโต๊ะ / ตารางจอง
            </div>
            <Link to="/users" className="menu-item active">
              <span>👥</span> จัดการผู้ใช้ (Users)
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="page-header">
          <div>
            <div className="header-title-group">
              <h1 className="header-title">จัดการผู้ใช้งานและสิทธิ์ (User & Member Management)</h1>
              <span className="badge-live-db">● LIVE SYSTEM DB</span>
            </div>
            <p className="header-subtitle">
              สมาชิกทั้งหมด <b>{totalUsers}</b> คน • ผู้ดูแลระบบ <b>{adminCount}</b> คน
            </p>
          </div>
          <div className="header-actions">
            <button onClick={() => setShowAddModal(true)} className="btn-add-user">
              + เพิ่มผู้ใช้งานใหม่ (Add User)
            </button>
            <button onClick={handleLogout} className="btn-logout">
              ออกจากระบบ
            </button>
          </div>
        </header>

        {/* Dashboard Cards */}
        <div className="dashboard-grid">
          <div className="dash-card">
            <div className="card-header-row">
              <div>
                <div className="card-label-top text-gray">TOTAL ACCOUNTS</div>
                <div className="card-label-bottom text-dark">บัญชีผู้ใช้ทั้งหมด</div>
              </div>
              <div className="card-icon bg-gray-light">👥</div>
            </div>
            <div className="card-value-row">
              <h2 className="card-value text-dark">{totalUsers}</h2>
            </div>
            <div className="card-progress-bg">
              <div className="card-progress-fill"></div>
            </div>
          </div>

          <div className="dash-card">
            <div className="card-header-row">
              <div>
                <div className="card-label-top text-gray">ACTIVE RATIO</div>
                <div className="card-label-bottom text-dark">Active สัปดาห์นี้</div>
              </div>
              <div className="card-icon bg-green-light">📈</div>
            </div>
            <div className="card-value-row">
              <h2 className="card-value text-dark">{activeCount}</h2>
              <span className="card-sub-value">(บัญชีปกติ)</span>
            </div>
            <div className="card-footer-text text-green-dark">● พร้อมเข้าสู่ระบบ</div>
          </div>

          <div className="dash-card">
            <div className="card-header-row">
              <div>
                <div className="card-label-top text-gray">PRIVILEGED ACCESS</div>
                <div className="card-label-bottom text-dark">สิทธิ์ Admin</div>
              </div>
              <div className="card-icon bg-gray-light">🛡️</div>
            </div>
            <div className="card-value-row">
              <h2 className="card-value text-dark">{adminCount}</h2>
              <span className="card-sub-value">Admin</span>
            </div>
            <div className="card-footer-text text-gray">
              🔑 พร้อมระบบยืนยันตัวตน 2FA ครบทุกบัญชี
            </div>
          </div>

          <div className={`dash-card ${suspendedCount > 0 ? 'alert' : ''}`}>
            <div className="card-header-row">
              <div>
                <div
                  className={`card-label-top ${suspendedCount > 0 ? 'text-red-dark' : 'text-gray'}`}
                >
                  SAFETY & COMPLIANCE
                </div>
                <div
                  className={`card-label-bottom ${suspendedCount > 0 ? 'text-red-dark' : 'text-dark'}`}
                >
                  บัญชีถูกระงับ (Suspended)
                </div>
              </div>
              <div className={`card-icon ${suspendedCount > 0 ? 'bg-red-light' : 'bg-gray-light'}`}>
                ⚠️
              </div>
            </div>
            <div className="card-value-row" style={{ marginBottom: '8px' }}>
              <h2 className={`card-value ${suspendedCount > 0 ? 'text-red-dark' : 'text-dark'}`}>
                {suspendedCount}
              </h2>
              {suspendedCount > 0 && (
                <span className="badge-action-needed">Action Needed (ต้องตรวจสอบ)</span>
              )}
            </div>
            <div
              className={`card-footer-text ${suspendedCount > 0 ? 'text-red-dark' : 'text-gray'}`}
            >
              ระงับจากกรณี No-show หรือละเมิดระเบียบห้อง Vault
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="🔍 ค้นหาด้วยชื่อ, อีเมล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input-round"
            />
          </div>
          <div className="filter-buttons">
            <button
              onClick={() => setRoleFilter('all')}
              className={`btn-filter ${roleFilter === 'all' ? 'active' : ''}`}
            >
              ทั้งหมด (All)
            </button>
            <button
              onClick={() => setRoleFilter('user')}
              className={`btn-filter ${roleFilter === 'user' ? 'active' : ''}`}
            >
              สมาชิก (Members)
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`btn-filter ${roleFilter === 'admin' ? 'active' : ''}`}
            >
              ผู้ดูแล (Admin)
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="table-container">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
              ⏳ กำลังโหลดข้อมูล...
            </div>
          ) : (
            <table className="users-table">
              <thead>
                <tr>
                  <th>ข้อมูลสมาชิก (MEMBER INFO)</th>
                  <th>ข้อมูล & การติดต่อ (CONTACT INFO)</th>
                  <th>วันที่สมัคร / ACTIVE ล่าสุด</th>
                  <th>ประวัติเล่น & การจอง</th>
                  <th style={{ textAlign: 'center' }}>ระดับสิทธิ์ (ROLE)</th>
                  <th>สถานะบัญชี</th>
                  <th style={{ textAlign: 'right' }}>การจัดการ</th>
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
                        className={user.status === 'suspended' ? 'row-suspended' : ''}
                      >
                        {/* 1. Member Info */}
                        <td>
                          <div className="user-info-cell">
                            <div className="avatar-circle" style={{ backgroundColor: avatarColor }}>
                              {shortName}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="user-name-text">{user.username}</span>
                                {user.role === 'admin' && (
                                  <span className="badge-owner">Owner</span>
                                )}
                              </div>
                              <div className="user-id-text">
                                ID: #{user._id?.slice(-6).toUpperCase() || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Contact Info */}
                        <td>
                          <div className="contact-main">{user.email || 'N/A'}</div>
                          <div className="contact-sub">
                            <span>📱 {user.phone || 'ไม่ระบุเบอร์โทร'}</span>
                          </div>
                        </td>

                        {/* 3. Date */}
                        <td>
                          <div className="contact-main">{timeStr}</div>
                          <div className="contact-sub">สมัครเมื่อ {dateStr}</div>
                        </td>

                        {/* 4. Play History */}
                        <td>
                          <div className="history-main">🔄 0 ครั้ง</div>
                          <div className="contact-sub">ล่าสุด: -</div>
                        </td>

                        {/* 5. Role */}
                        <td style={{ textAlign: 'center' }}>
                          <span className="role-text">
                            {user.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        </td>

                        {/* 6. Status */}
                        <td>
                          {user.status === 'suspended' ? (
                            <span className="status-badge status-suspended">
                              <span className="status-dot"></span> ระงับ (Suspended)
                            </span>
                          ) : (
                            <span className="status-badge status-active">
                              <span className="status-dot"></span> ปกติ (Active)
                            </span>
                          )}
                        </td>

                        {/* 7. Actions */}
                        <td>
                          <div className="action-buttons">
                            {user.status === 'suspended' ? (
                              <>
                                <button
                                  onClick={() => handleUnsuspendUser(user._id, user.username)}
                                  className="btn-action-solid"
                                >
                                  🔓 ปลดระงับ
                                </button>
                                <span
                                  onClick={() => handleDeleteUser(user._id, user.username)}
                                  className="btn-action-text-red"
                                >
                                  ลบ
                                </span>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => alert('รอ API: ดูสถิติลูกค้า')}
                                  className="btn-action-outline"
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
                                  className="btn-action-outline"
                                >
                                  แก้ไขสิทธิ์
                                </button>
                                {user.role !== 'admin' && (
                                  <>
                                    <span
                                      onClick={() => handleSuspendUser(user._id, user.username)}
                                      className="btn-action-text-red"
                                      style={{ color: '#d97706' }}
                                    >
                                      ระงับ
                                    </span>
                                    <span style={{ color: '#cbd5e1' }}>|</span>
                                    <span
                                      onClick={() => handleDeleteUser(user._id, user.username)}
                                      className="btn-action-text-red"
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
                    <td colSpan="7" className="empty-table">
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
          <div className="modal-overlay">
            <div className="modal-content modal-sm">
              <div className="modal-header">
                <h2 className="modal-title">🛡️ แก้ไขสิทธิ์การใช้งาน</h2>
                <button
                  onClick={() => setEditRoleModal({ show: false, user: null, newRole: 'user' })}
                  className="btn-close"
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
                <label className="modal-label">เลือกระดับสิทธิ์ใหม่:</label>
                <select
                  value={editRoleModal.newRole}
                  onChange={(e) => setEditRoleModal({ ...editRoleModal, newRole: e.target.value })}
                  className="modal-select"
                >
                  <option value="user">Member (สมาชิก)</option>
                  <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                </select>
              </div>
              <div className="modal-actions">
                <button
                  onClick={() => setEditRoleModal({ show: false, user: null, newRole: 'user' })}
                  className="btn-cancel"
                >
                  ยกเลิก
                </button>
                <button onClick={handleSaveRole} className="btn-save">
                  บันทึกสิทธิ์
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal เพิ่มผู้ใช้ */}
        {showAddModal && (
          <div className="modal-overlay">
            <div className="modal-content modal-md">
              <div className="modal-header">
                <h2 className="modal-title">✨ เพิ่มผู้ใช้งานใหม่</h2>
                <button onClick={() => setShowAddModal(false)} className="btn-close">
                  ✖
                </button>
              </div>
              <form onSubmit={handleSaveNewUser} className="modal-form">
                <div>
                  <label className="modal-label">Username (ชื่อบัญชี):</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="modal-label">อีเมล:</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="modal-label">เบอร์โทรศัพท์ (ถ้ามี):</label>
                  <input
                    type="tel"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="08X-XXX-XXXX"
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="modal-label">รหัสผ่าน:</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="modal-input"
                  />
                </div>
                <div>
                  <label className="modal-label">ระดับสิทธิ์ (Role):</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="modal-select"
                  >
                    <option value="user">Member (สมาชิก)</option>
                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="btn-cancel"
                  >
                    ยกเลิก
                  </button>
                  <button type="submit" className="btn-save">
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
