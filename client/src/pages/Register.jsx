import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from 'react-bootstrap';

export function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Password strength check
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  const passedCriteria = [hasMinLength, hasUpper, hasLower, hasNumber].filter(Boolean).length;
  let strengthLabel = 'Rất yếu';
  let strengthColor = '#ef4444';
  let strengthWidth = '25%';

  if (passedCriteria === 2) {
    strengthLabel = 'Yếu';
    strengthColor = '#f97316';
    strengthWidth = '50%';
  } else if (passedCriteria === 3) {
    strengthLabel = 'Trung bình';
    strengthColor = '#eab308';
    strengthWidth = '75%';
  } else if (passedCriteria === 4) {
    strengthLabel = 'Mạnh';
    strengthColor = '#10b981';
    strengthWidth = '100%';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp');
      return;
    }

    if (passedCriteria < 4) {
      setError('Mật khẩu bắt buộc phải có ít nhất 8 ký tự, gồm cả chữ hoa, chữ thường và chữ số');
      return;
    }

    setLoading(true);

    try {
      await register({ displayName, email, password, confirmPassword });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Đăng ký không thành công');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light p-3">
      <div className="text-center mb-4">
        <div className="d-inline-flex align-items-center gap-2 mb-2">
          <div
            style={{
              width: 36,
              height: 36,
              backgroundColor: 'var(--primary)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '1.25rem'
            }}
          >
            b
          </div>
          <span className="fs-3 fw-bold text-success">billet</span>
        </div>
        <h4 className="fw-bold text-dark mt-2">Bắt đầu cùng Billet.</h4>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>
          Tạo tài khoản miễn phí để quản lý chi tiêu thông minh
        </p>
      </div>

      <div className="card-billet p-4 p-md-5" style={{ width: '100%', maxWidth: 460 }}>
        {error && <Alert variant="danger" className="py-2 mb-4" style={{ fontSize: '0.875rem' }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Tên hiển thị
            </label>
            <input
              type="text"
              required
              className="form-control py-2"
              placeholder="Nguyễn Văn A"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Email
            </label>
            <input
              type="email"
              required
              className="form-control py-2"
              placeholder="example@billet.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mb-2">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Mật khẩu
            </label>
            <input
              type="password"
              required
              className="form-control py-2"
              placeholder="Ít nhất 8 ký tự, có chữ hoa, chữ thường, số"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {password && (
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.75rem' }}>
                <span className="text-muted">Độ mạnh mật khẩu:</span>
                <span className="fw-semibold" style={{ color: strengthColor }}>{strengthLabel}</span>
              </div>
              <div style={{ height: 4, backgroundColor: '#e2e8f0', borderRadius: 2 }}>
                <div
                  className="password-meter-bar"
                  style={{ width: strengthWidth, backgroundColor: strengthColor }}
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Nhập lại mật khẩu
            </label>
            <input
              type="password"
              required
              className="form-control py-2"
              placeholder="Nhập lại mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-billet w-100 py-2 mb-3"
          >
            {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </form>

        <div className="text-center mt-3 pt-3 border-top" style={{ fontSize: '0.875rem' }}>
          <span className="text-muted">Đã có tài khoản? </span>
          <Link to="/login" className="text-success text-decoration-none fw-semibold">
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
