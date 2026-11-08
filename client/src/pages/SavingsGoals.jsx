import React, { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import { formatVND, formatDate, getCurrentDateISO } from '../utils/formatters.js';
import {
  PiggyBank,
  PlusCircle,
  ArrowRightLeft,
  ArrowDownToLine,
  Trash2,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import { Modal, Button, Alert } from 'react-bootstrap';

export function SavingsGoals() {
  const [goals, setGoals] = useState([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({ name: '', targetAmount: '', targetDate: '' });
  const [depositForm, setDepositForm] = useState({ walletId: '', amount: '', note: '' });
  const [transferForm, setTransferForm] = useState({ fromGoalId: '', toGoalId: '', amount: '', note: '' });
  const [refundWalletId, setRefundWalletId] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [gRes, wRes] = await Promise.all([
        api.get('/savings-goals'),
        api.get('/wallets')
      ]);
      setGoals(gRes.data.goals || []);
      setTotalSaved(gRes.data.totalSaved || 0);
      setWallets(wRes.data.wallets || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/savings-goals', {
        name: createForm.name,
        targetAmount: Number(createForm.targetAmount),
        targetDate: createForm.targetDate
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', targetAmount: '', targetDate: '' });
      setSuccessMsg('Thiết lập mục tiêu thành công');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenDeposit = (goal) => {
    setSelectedGoal(goal);
    setDepositForm({ walletId: wallets[0]?.id || '', amount: '', note: '' });
    setShowDepositModal(true);
  };

  const handleDeposit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post(`/savings-goals/${selectedGoal.id}/deposit`, {
        walletId: Number(depositForm.walletId),
        amount: Number(depositForm.amount),
        note: depositForm.note
      });
      setShowDepositModal(false);
      setSuccessMsg('Nạp tiền vào mục tiêu tiết kiệm thành công');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenTransfer = (defaultFromId = '') => {
    const firstOther = goals.find((g) => g.id !== defaultFromId)?.id || '';
    setTransferForm({
      fromGoalId: defaultFromId || (goals[0]?.id || ''),
      toGoalId: firstOther,
      amount: '',
      note: ''
    });
    setShowTransferModal(true);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/savings-goals/transfer', {
        fromGoalId: Number(transferForm.fromGoalId),
        toGoalId: Number(transferForm.toGoalId),
        amount: Number(transferForm.amount),
        note: transferForm.note
      });
      setShowTransferModal(false);
      setSuccessMsg('Chuyển tiền giữa các mục tiêu thành công');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenDelete = (goal) => {
    setSelectedGoal(goal);
    setRefundWalletId(wallets[0]?.id || '');
    setShowDeleteModal(true);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.delete(`/savings-goals/${selectedGoal.id}?refundWalletId=${refundWalletId}`);
      setShowDeleteModal(false);
      setSuccessMsg('Xóa mục tiêu thành công');
      loadData();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="container-fluid p-0">
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

      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">Mục tiêu tiết kiệm</h3>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Quản lý kế hoạch tích lũy tiền cho các dự định tương lai
          </p>
        </div>
        <div className="d-flex gap-2">
          {goals.length >= 2 && (
            <button onClick={() => handleOpenTransfer()} className="btn btn-billet-outline d-flex align-items-center gap-2">
              <ArrowRightLeft size={18} />
              <span>Chuyển tiền giữa mục tiêu</span>
            </button>
          )}
          <button onClick={() => setShowCreateModal(true)} className="btn btn-billet d-flex align-items-center gap-2">
            <PlusCircle size={18} />
            <span>Thêm mới</span>
          </button>
        </div>
      </div>

      {/* Total Saved Card (Figure 4.15) */}
      <div className="card-billet-dark p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="text-white-50 fw-medium" style={{ fontSize: '0.9rem' }}>Tổng tiền đã tiết kiệm</span>
          <span className="badge bg-light text-dark px-3 py-1">{goals.length} mục tiêu</span>
        </div>
        <h1 className="fw-bold text-white mb-0">{formatVND(totalSaved)}</h1>
      </div>

      {/* Goals List */}
      <div className="row g-3">
        {goals.length === 0 && !loading ? (
          <div className="col-12">
            <div className="card-billet p-5 text-center text-muted">
              <PiggyBank size={48} className="mx-auto mb-3 text-secondary opacity-50" />
              <h5>Bạn chưa có mục tiêu tiết kiệm nào</h5>
              <p style={{ fontSize: '0.9rem' }}>Hãy đặt mục tiêu để bắt đầu tích lũy từng ngày!</p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-billet mt-2">
                Thiết lập mục tiêu mới
              </button>
            </div>
          </div>
        ) : (
          goals.map((g) => {
            const percent = Math.min(100, Math.round((Number(g.currentAmount) / Number(g.targetAmount)) * 100));
            const isCompleted = percent >= 100 || g.status === 'completed';

            return (
              <div key={g.id} className="col-12 col-md-6 col-lg-4">
                <div className="card-billet p-4 h-100 d-flex flex-column justify-content-between">
                  <div>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h5 className="fw-bold text-dark mb-1">{g.name}</h5>
                      <button
                        onClick={() => handleOpenDelete(g)}
                        className="btn btn-sm btn-link text-danger p-1"
                        title="Xóa mục tiêu"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="d-flex align-items-center gap-1 text-muted mb-3" style={{ fontSize: '0.8rem' }}>
                      <Calendar size={14} /> Thời hạn: {formatDate(g.targetDate)}
                    </div>

                    <div className="d-flex justify-content-between align-items-baseline mb-2">
                      <span className="fs-4 fw-bold text-success">{formatVND(g.currentAmount)}</span>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                        / {formatVND(g.targetAmount)}
                      </span>
                    </div>

                    <div className="progress mb-2" style={{ height: 8 }}>
                      <div
                        className={`progress-bar ${isCompleted ? 'bg-success' : 'bg-primary'}`}
                        role="progressbar"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="d-flex justify-content-between text-muted" style={{ fontSize: '0.75rem' }}>
                      <span>Tiến độ:</span>
                      <span className="fw-bold">{percent}%</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                    <button
                      onClick={() => handleOpenDeposit(g)}
                      className="btn btn-sm btn-billet d-flex align-items-center gap-1"
                    >
                      <ArrowDownToLine size={14} /> Nạp tiền
                    </button>
                    {goals.length >= 2 && (
                      <button
                        onClick={() => handleOpenTransfer(g.id)}
                        className="btn btn-sm btn-link text-success text-decoration-none fw-semibold p-0"
                        style={{ fontSize: '0.85rem' }}
                      >
                        Chuyển quỹ <ArrowRightLeft size={14} className="ms-1" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Thiết lập mục tiêu mới */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Thiết lập mục tiêu tiết kiệm</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreate}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên mục tiêu <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Ví dụ: Mua laptop, Du lịch..."
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Số tiền cần đạt (VND) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                className="form-control"
                placeholder="0 đ"
                value={createForm.targetAmount}
                onChange={(e) => setCreateForm({ ...createForm, targetAmount: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ngày kết thúc <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                required
                className="form-control"
                value={createForm.targetDate}
                onChange={(e) => setCreateForm({ ...createForm, targetDate: e.target.value })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Lưu mục tiêu</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Nạp tiền từ ví vào mục tiêu */}
      <Modal show={showDepositModal} onHide={() => setShowDepositModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Nạp tiền vào mục tiêu: {selectedGoal?.name}</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleDeposit}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Chọn ví nguồn <span className="text-danger">*</span>
              </label>
              <select
                required
                className="form-select"
                value={depositForm.walletId}
                onChange={(e) => setDepositForm({ ...depositForm, walletId: e.target.value })}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({formatVND(w.balance)})</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Số tiền nạp (VND) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                className="form-control"
                placeholder="0 đ"
                value={depositForm.amount}
                onChange={(e) => setDepositForm({ ...depositForm, amount: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ghi chú
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Tích lũy định kỳ..."
                value={depositForm.note}
                onChange={(e) => setDepositForm({ ...depositForm, note: e.target.value })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDepositModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Nạp tiền</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Chuyển tiền giữa các quỹ tiết kiệm (Figure 4.16) */}
      <Modal show={showTransferModal} onHide={() => setShowTransferModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Chuyển tiền giữa các mục tiêu</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleTransfer}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Quỹ mục tiêu nguồn <span className="text-danger">*</span>
              </label>
              <select
                required
                className="form-select"
                value={transferForm.fromGoalId}
                onChange={(e) => setTransferForm({ ...transferForm, fromGoalId: e.target.value })}
              >
                <option value="">-- Chọn quỹ nguồn --</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id} disabled={g.id === Number(transferForm.toGoalId)}>
                    {g.name} ({formatVND(g.currentAmount)})
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Quỹ mục tiêu đích <span className="text-danger">*</span>
              </label>
              <select
                required
                className="form-select"
                value={transferForm.toGoalId}
                onChange={(e) => setTransferForm({ ...transferForm, toGoalId: e.target.value })}
              >
                <option value="">-- Chọn quỹ đích --</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id} disabled={g.id === Number(transferForm.fromGoalId)}>
                    {g.name} ({formatVND(g.currentAmount)})
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Số tiền chuyển (VND) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                className="form-control"
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTransferModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Chuyển tiền</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Xóa mục tiêu & chọn ví hoàn trả */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Xác nhận xóa mục tiêu</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleDelete}>
          <Modal.Body>
            <p className="text-muted">
              Mục tiêu "{selectedGoal?.name}" hiện đang có{' '}
              <b className="text-success">{formatVND(selectedGoal?.currentAmount || 0)}</b>.
            </p>
            {Number(selectedGoal?.currentAmount || 0) > 0 && (
              <div className="mb-3">
                <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                  Chọn ví để hoàn trả số tiền trên: <span className="text-danger">*</span>
                </label>
                <select
                  required
                  className="form-select"
                  value={refundWalletId}
                  onChange={(e) => setRefundWalletId(e.target.value)}
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name} (Số dư hiện tại: {formatVND(w.balance)})</option>
                  ))}
                </select>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-danger">Đồng ý xóa</button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
