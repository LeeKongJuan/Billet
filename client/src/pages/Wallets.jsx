import React, { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import { formatVND, getCurrentDateISO } from '../utils/formatters.js';
import {
  Wallet as WalletIcon,
  PlusCircle,
  ArrowRightLeft,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Modal, Button, Alert } from 'react-bootstrap';

export function Wallets() {
  const [wallets, setWallets] = useState([]);
  const [totalAssets, setTotalAssets] = useState(0);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({ name: '', description: '', initialBalance: 0 });
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [transferForm, setTransferForm] = useState({
    fromWalletId: '',
    toWalletId: '',
    amount: '',
    note: '',
    transferredOn: getCurrentDateISO()
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/wallets');
      setWallets(res.data.wallets || []);
      setTotalAssets(res.data.totalAssets || 0);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  // Handle Create Wallet
  const handleCreateWallet = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/wallets', {
        name: createForm.name,
        description: createForm.description,
        initialBalance: Number(createForm.initialBalance) || 0
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '', initialBalance: 0 });
      setSuccessMsg('Tạo ví thành công');
      fetchWallets();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Handle Edit Wallet
  const handleOpenEdit = (wallet) => {
    setSelectedWallet(wallet);
    setEditForm({ name: wallet.name, description: wallet.description || '' });
    setShowEditModal(true);
  };

  const handleUpdateWallet = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.put(`/wallets/${selectedWallet.id}`, editForm);
      setShowEditModal(false);
      setSuccessMsg('Cập nhật ví thành công');
      fetchWallets();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Handle Delete / Inactivate Wallet
  const handleDeleteWallet = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ví "${selectedWallet.name}"?`)) return;
    try {
      const res = await api.delete(`/wallets/${selectedWallet.id}`);
      setShowEditModal(false);
      setSuccessMsg(res.data.message || 'Xóa ví thành công');
      fetchWallets();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Handle Transfer
  const handleOpenTransfer = (defaultFromId = '') => {
    setErrorMsg('');
    const firstOther = wallets.find((w) => w.id !== defaultFromId)?.id || '';
    setTransferForm({
      fromWalletId: defaultFromId || (wallets[0]?.id || ''),
      toWalletId: firstOther,
      amount: '',
      note: '',
      transferredOn: getCurrentDateISO()
    });
    setShowTransferModal(true);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/wallet-transfers', {
        fromWalletId: Number(transferForm.fromWalletId),
        toWalletId: Number(transferForm.toWalletId),
        amount: Number(transferForm.amount),
        note: transferForm.note,
        transferredOn: transferForm.transferredOn
      });
      setShowTransferModal(false);
      setSuccessMsg('Chuyển tiền thành công');
      fetchWallets();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Transfer preview calculation
  const fromW = wallets.find((w) => w.id === Number(transferForm.fromWalletId));
  const toW = wallets.find((w) => w.id === Number(transferForm.toWalletId));
  const transferAmt = Number(transferForm.amount) || 0;
  const fromNewBal = fromW ? fromW.balance - transferAmt : null;
  const toNewBal = toW ? toW.balance + transferAmt : null;

  return (
    <div className="container-fluid p-0">
      {/* Messages */}
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
          <h3 className="fw-bold text-dark mb-1">Ví tiền</h3>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Quản lý các nguồn tiền và phân bổ ngân sách
          </p>
        </div>
        <div className="d-flex gap-2">
          <button onClick={() => setShowCreateModal(true)} className="btn btn-billet d-flex align-items-center gap-2">
            <PlusCircle size={18} />
            <span>Tạo ví mới</span>
          </button>
          {wallets.length >= 2 && (
            <button onClick={() => handleOpenTransfer()} className="btn btn-billet-outline d-flex align-items-center gap-2">
              <ArrowRightLeft size={18} />
              <span>Chuyển tiền</span>
            </button>
          )}
        </div>
      </div>

      {/* Total Asset Card (Figure 4.5) */}
      <div className="card-billet-dark p-4 mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span className="text-white-50 fw-medium" style={{ fontSize: '0.9rem' }}>Tổng tài sản hiện có</span>
          <span className="badge bg-light text-dark px-3 py-1">{wallets.length} ví hoạt động</span>
        </div>
        <h1 className="fw-bold text-white mb-0">{formatVND(totalAssets)}</h1>
      </div>

      {/* Wallets List */}
      <div className="row g-3">
        {wallets.length === 0 && !loading ? (
          <div className="col-12">
            <div className="card-billet p-5 text-center text-muted">
              <WalletIcon size={48} className="mx-auto mb-3 text-secondary opacity-50" />
              <h5>Bạn chưa có ví tiền nào</h5>
              <p style={{ fontSize: '0.9rem' }}>Hãy tạo ví tiền đầu tiên để bắt đầu ghi chép các khoản thu chi!</p>
              <button onClick={() => setShowCreateModal(true)} className="btn btn-billet mt-2">
                Tạo ví mới
              </button>
            </div>
          </div>
        ) : (
          wallets.map((wallet) => (
            <div key={wallet.id} className="col-12 col-md-6 col-lg-4">
              <div className="card-billet p-4 h-100 d-flex flex-column justify-content-between">
                <div>
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="fw-bold text-dark mb-1">{wallet.name}</h5>
                    <button
                      onClick={() => handleOpenEdit(wallet)}
                      className="btn btn-sm btn-link text-muted p-1"
                      title="Chỉnh sửa ví"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                  {wallet.description && (
                    <p className="text-muted mb-3" style={{ fontSize: '0.85rem' }}>
                      {wallet.description}
                    </p>
                  )}
                  <h3 className="fw-bold text-success mb-0">{formatVND(wallet.balance)}</h3>
                </div>

                <div className="mt-4 pt-3 border-top d-flex justify-content-between align-items-center">
                  <span className="badge badge-active" style={{ fontSize: '0.75rem' }}>Đang hoạt động</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal: Tạo ví mới (Figure 4.6) */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Tạo ví mới</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreateWallet}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên ví <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Ví dụ: Tiền mặt, Thẻ tín dụng..."
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Mô tả
              </label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Mô tả mục đích sử dụng ví này..."
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Số dư ban đầu (VND)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                className="form-control"
                placeholder="0"
                value={createForm.initialBalance}
                onChange={(e) => setCreateForm({ ...createForm, initialBalance: e.target.value })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Hủy
            </Button>
            <button type="submit" className="btn btn-billet">
              Tạo ví
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Chuyển tiền giữa các ví (Figure 4.7) */}
      <Modal show={showTransferModal} onHide={() => setShowTransferModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Chuyển tiền giữa các ví</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleTransfer}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ví nguồn <span className="text-danger">*</span>
              </label>
              <select
                required
                className="form-select"
                value={transferForm.fromWalletId}
                onChange={(e) => setTransferForm({ ...transferForm, fromWalletId: e.target.value })}
              >
                <option value="">-- Chọn ví nguồn --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} disabled={w.id === Number(transferForm.toWalletId)}>
                    {w.name} ({formatVND(w.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ví đích <span className="text-danger">*</span>
              </label>
              <select
                required
                className="form-select"
                value={transferForm.toWalletId}
                onChange={(e) => setTransferForm({ ...transferForm, toWalletId: e.target.value })}
              >
                <option value="">-- Chọn ví đích --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} disabled={w.id === Number(transferForm.fromWalletId)}>
                    {w.name} ({formatVND(w.balance)})
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
                placeholder="Nhập số tiền..."
                value={transferForm.amount}
                onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ngày chuyển
              </label>
              <input
                type="date"
                required
                className="form-control"
                value={transferForm.transferredOn}
                onChange={(e) => setTransferForm({ ...transferForm, transferredOn: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Nội dung chuyển
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Rút tiền ATM, nạp tiền vào ví..."
                value={transferForm.note}
                onChange={(e) => setTransferForm({ ...transferForm, note: e.target.value })}
              />
            </div>

            {/* Preview số dư sau chuyển (Figure 4.7) */}
            {fromW && toW && transferAmt > 0 && (
              <div className="p-3 rounded bg-light border mb-2" style={{ fontSize: '0.85rem' }}>
                <div className="fw-semibold text-secondary mb-2">Xem trước số dư sau khi chuyển:</div>
                <div className="d-flex justify-content-between mb-1">
                  <span>{fromW.name}:</span>
                  <span className={`fw-bold ${fromNewBal < 0 ? 'text-danger' : 'text-dark'}`}>
                    {formatVND(fromNewBal)}
                  </span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>{toW.name}:</span>
                  <span className="fw-bold text-success">{formatVND(toNewBal)}</span>
                </div>
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowTransferModal(false)}>
              Hủy
            </Button>
            <button type="submit" className="btn btn-billet">
              Xác nhận chuyển
            </button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Sửa ví tiền (Figure 4.8) */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Sửa ví tiền</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleUpdateWallet}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên ví <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Mô tả
              </label>
              <textarea
                className="form-control"
                rows="2"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </div>

            <div className="mb-3 p-3 bg-light rounded border text-muted" style={{ fontSize: '0.85rem' }}>
              <div className="d-flex align-items-center gap-2 text-secondary mb-1">
                <AlertCircle size={16} />
                <span className="fw-semibold">Số dư hiện tại: {formatVND(selectedWallet?.balance || 0)}</span>
              </div>
              <small>Số dư ví không thể chỉnh sửa trực tiếp. Hãy dùng tính năng Giao dịch hoặc Chuyển tiền.</small>
            </div>

            <div className="pt-2 border-top">
              <button
                type="button"
                onClick={handleDeleteWallet}
                className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1"
              >
                <Trash2 size={14} /> Xóa hoặc vô hiệu hóa ví này
              </button>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Hủy
            </Button>
            <button type="submit" className="btn btn-billet">
              Cập nhật
            </button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
