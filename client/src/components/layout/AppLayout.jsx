import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../api/http.js';
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Tags,
  PieChart,
  PiggyBank,
  Users,
  FileText,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Check
} from 'lucide-react';
import { Dropdown, Badge } from 'react-bootstrap';

export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      fetchNotifications();
    } catch {
      // ignore
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/wallets', label: 'Ví tiền', icon: Wallet },
    { to: '/transactions', label: 'Giao dịch', icon: ArrowLeftRight },
    { to: '/categories', label: 'Danh mục', icon: Tags },
    { to: '/budgets', label: 'Ngân sách', icon: PieChart },
    { to: '/savings-goals', label: 'Mục tiêu tiết kiệm', icon: PiggyBank },
    { to: '/group-funds', label: 'Quỹ nhóm', icon: Users },
    { to: '/bills', label: 'Chia hóa đơn', icon: FileText },
    { to: '/reports', label: 'Báo cáo', icon: BarChart3 },
    { to: '/settings', label: 'Cài đặt', icon: Settings }
  ];

  return (
    <div className="billet-layout d-flex min-vh-100">
      {/* Sidebar */}
      <aside className={`billet-sidebar ${mobileMenuOpen ? 'open' : ''}`}>
        <div className="brand">
          <div
            style={{
              width: 32,
              height: 32,
              backgroundColor: 'var(--primary)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}
          >
            b
          </div>
          <span>billet</span>
        </div>

        <nav className="flex-grow-1 overflow-auto py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => `nav-item-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-top">
          <button
            onClick={handleLogout}
            className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2"
            style={{ borderRadius: 8, fontSize: '0.9rem' }}
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="billet-main-content flex-grow-1">
        {/* Topbar */}
        <header className="billet-topbar">
          <button
            className="btn btn-link text-dark d-lg-none p-0 me-3"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold text-secondary d-none d-md-inline">Xin chào,</span>
            <span className="fw-bold text-dark">{user?.displayName}</span>
          </div>

          <div className="d-flex align-items-center gap-3">
            {/* Notification Dropdown */}
            <Dropdown align="end">
              <Dropdown.Toggle
                as="div"
                className="position-relative cursor-pointer p-2 rounded-circle hover-bg text-secondary"
                style={{ cursor: 'pointer' }}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <Badge
                    bg="danger"
                    pill
                    className="position-absolute top-0 start-100 translate-middle"
                    style={{ fontSize: '0.65rem' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Dropdown.Toggle>

              <Dropdown.Menu className="shadow-lg border-0 py-2" style={{ width: 340, maxHeight: 420, overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
                  <span className="fw-bold">Thông báo</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="btn btn-sm btn-link text-decoration-none p-0 text-success"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Đánh dấu tất cả đã đọc
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-muted" style={{ fontSize: '0.875rem' }}>
                    Không có thông báo mới
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`px-3 py-2 border-bottom d-flex align-items-start justify-content-between ${
                        n.isRead ? 'bg-light opacity-75' : 'bg-white'
                      }`}
                      style={{ fontSize: '0.85rem' }}
                    >
                      <div className="me-2">
                        <div className="fw-semibold text-dark">{n.title}</div>
                        <div className="text-secondary">{n.content}</div>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={(e) => handleMarkAsRead(n.id, e)}
                          title="Đánh dấu đã đọc"
                          className="btn btn-sm btn-outline-success p-1 rounded-circle"
                          style={{ lineHeight: 1 }}
                        >
                          <Check size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </Dropdown.Menu>
            </Dropdown>

            {/* User Avatar */}
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {user?.displayName?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Page Body */}
        <main className="billet-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
