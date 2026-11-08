import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert } from 'react-bootstrap';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Email hoặc mật khẩu không chính xác');
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
        <h4 className="fw-bold text-dark mt-2">Chào bạn trở lại!</h4>
        <p className="text-muted" style={{ fontSize: '0.9rem' }}>
          Đăng nhập vào tài khoản Billet của bạn
        </p>
      </div>

      <div className="card-billet p-4 p-md-5" style={{ width: '100%', maxWidth: 440 }}>
        {error && <Alert variant="danger" className="py-2 mb-4" style={{ fontSize: '0.875rem' }}>{error}</Alert>}

        <form onSubmit={handleSubmit}>
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

          <div className="mb-4">
            <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
              Mật khẩu
            </label>
            <input
              type="password"
              required
              className="form-control py-2"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-billet w-100 py-2 mb-3"
          >
            {loading ? 'Đang xử lý...' : 'Đăng nhập'}
          </button>
        </form>

        <div className="text-center mt-3 pt-3 border-top" style={{ fontSize: '0.875rem' }}>
          <span className="text-muted">Chưa có tài khoản? </span>
          <Link to="/register" className="text-success text-decoration-none fw-semibold">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
