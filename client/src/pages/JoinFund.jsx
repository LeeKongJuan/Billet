import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/http.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Users, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert } from 'react-bootstrap';

export function JoinFund() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    async function loadPreview() {
      try {
        setLoading(true);
        const res = await api.get(`/group-funds/join-preview/${token}`);
        setPreview(res.data.fund);
      } catch (err) {
        setErrorMsg(err.message || 'Liên kết mời không còn hiệu lực');
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, [token]);

  const handleJoin = async () => {
    if (!user) {
      navigate(`/login?redirect=/join-fund/${token}`);
      return;
    }

    try {
      await api.post(`/group-funds/join/${token}`);
      setSuccessMsg('Tham gia quỹ thành công!');
      setTimeout(() => navigate('/group-funds'), 1500);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  if (loading) {
    return <div className="p-5 text-center text-muted">Đang kiểm tra liên kết mời...</div>;
  }

  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light p-3">
      <div className="card-billet p-5 text-center" style={{ width: '100%', maxWidth: 460 }}>
        {errorMsg ? (
          <div>
            <AlertTriangle size={48} className="text-danger mx-auto mb-3" />
            <h4 className="fw-bold text-dark">Liên kết không hợp lệ</h4>
            <p className="text-muted mb-4">{errorMsg}</p>
            <Link to="/" className="btn btn-billet">Quay về trang chủ</Link>
          </div>
        ) : (
          <div>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#d1fae5',
                color: '#065f46',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.5rem'
              }}
            >
              <Users size={32} />
            </div>

            <span className="badge bg-light text-muted border mb-2">Lời mời tham gia quỹ</span>
            <h3 className="fw-bold text-dark mb-2">{preview?.name}</h3>
            {preview?.description && (
              <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                {preview.description}
              </p>
            )}

            <div className="p-3 bg-light rounded border text-muted mb-4" style={{ fontSize: '0.85rem' }}>
              Hiện có <b>{preview?.membersCount}</b> thành viên đang tham gia
            </div>

            {successMsg ? (
              <Alert variant="success" className="d-flex align-items-center justify-content-center gap-2">
                <CheckCircle size={18} /> {successMsg}
              </Alert>
            ) : (
              <button onClick={handleJoin} className="btn btn-billet w-100 py-2">
                {user ? 'Tham gia quỹ nhóm' : 'Đăng nhập để tham gia'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
