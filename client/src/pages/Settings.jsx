import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api/http.js';
import { User, Lock, LogOut } from 'lucide-react';
import { Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

export function Settings() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('Mật khẩu mới xác nhận không trùng khớp');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/password', {
        currentPassword,
        newPassword,
        confirmNewPassword
      });
      setSuccessMsg('Đổi mật khẩu thành công');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setErrorMsg(err.message || 'Đổi mật khẩu thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="container-fluid p-0" style={{ maxWidth: 720 }}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="fw-bold text-dark mb-1">Cài đặt tài khoản</h3>
        <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
          Quản lý thông tin cá nhân và bảo mật tài khoản
        </p>
      </div>

      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="py-2 mb-3">
          {errorMsg}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" dismissible onClose={() => setSuccessMsg('')} className="py-2 mb-3">
          {successMsg}
        </Alert>
      )}

      {/* Profile info (Figure 4.3) */}
      <div className="card-billet p-4 mb-4">
        <div className="d-flex align-items-center gap-3 mb-4">
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              backgroundColor: '#d1fae5',
              color: '#065f46',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold',
              fontSize: '1.4rem'
            }}
          >
            {user?.displayName?.charAt(0) || 'U'}
          </div>
          <div>
            <h5 className="fw-bold text-dark mb-0">{user?.displayName}</h5>
            <span className="text-muted" style={{ fontSize: '0.875rem' }}>{user?.email}</span>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Tên hiển thị
            </label>
            <input type="text" readOnly className="form-control bg-light" value={user?.displayName || ''} />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Địa chỉ Email
            </label>
            <input type="text" readOnly className="form-control bg-light" value={user?.email || ''} />
          </div>
        </div>
      </div>

      {/* Change Password Card (Figure 4.3) */}
      <div className="card-billet p-4 mb-4">
        <h5 className="fw-bold text-dark mb-3">Đổi mật khẩu</h5>
        <form onSubmit={handleChangePassword}>
          <div className="mb-3">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Mật khẩu hiện tại <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              required
              className="form-control"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Mật khẩu mới <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              required
              className="form-control"
              placeholder="Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Xác nhận mật khẩu mới <span className="text-danger">*</span>
            </label>
            <input
              type="password"
              required
              className="form-control"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="btn btn-billet px-4">
            {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </div>

      {/* Logout button */}
      <div className="card-billet p-4 d-flex justify-content-between align-items-center">
        <div>
          <div className="fw-bold text-dark">Đăng xuất khỏi thiết bị</div>
          <small className="text-muted">Phiên làm việc hiện tại của bạn sẽ kết thúc</small>
        </div>
        <button onClick={handleLogout} className="btn btn-outline-danger d-flex align-items-center gap-2">
          <LogOut size={16} />
          <span>Đăng xuất</span>
        </button>
      </div>
    </div>
  );
}
