import React, { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import { formatVND, formatDate, getCurrentDateISO } from '../utils/formatters.js';
import {
  PlusCircle,
  Search,
  Filter,
  Trash2,
  Edit2,
  CheckSquare,
  Square,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { Modal, Button, Alert } from 'react-bootstrap';

export function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [selectedWalletId, setSelectedWalletId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Selected for batch delete
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  // Forms
  const [formData, setFormData] = useState({
    name: '',
    walletId: '',
    categoryId: '',
    type: 'expense',
    amount: '',
    occurredOn: getCurrentDateISO(),
    note: ''
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch initial wallets and categories
  useEffect(() => {
    async function loadMeta() {
      try {
        const [wRes, cRes] = await Promise.all([
          api.get('/wallets'),
          api.get('/categories')
        ]);
        setWallets(wRes.data.wallets || []);
        setCategories(cRes.data || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadMeta();
  }, []);

  // Fetch transactions with filters
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (keyword) params.append('keyword', keyword);
      if (selectedWalletId) params.append('walletId', selectedWalletId);
      if (selectedCategoryId) params.append('categoryId', selectedCategoryId);
      if (selectedType) params.append('type', selectedType);
      if (fromDate) params.append('fromDate', fromDate);
      if (toDate) params.append('toDate', toDate);

      const res = await api.get(`/transactions?${params.toString()}`);
      setTransactions(res.data || []);
      setSelectedIds([]);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedWalletId, selectedCategoryId, selectedType, fromDate, toDate]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormData({
      name: '',
      walletId: wallets[0]?.id || '',
      categoryId: categories.find((c) => c.type === 'expense')?.id || '',
      type: 'expense',
      amount: '',
      occurredOn: getCurrentDateISO(),
      note: ''
    });
    setShowAddModal(true);
  };

  // Submit Add
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/transactions', {
        name: formData.name,
        walletId: Number(formData.walletId),
        categoryId: Number(formData.categoryId),
        type: formData.type,
        amount: Number(formData.amount),
        occurredOn: formData.occurredOn,
        note: formData.note
      });
      setShowAddModal(false);
      setSuccessMsg('Thêm giao dịch thành công');
      fetchTransactions();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (tx) => {
    setEditingTx(tx);
    setFormData({
      name: tx.name || '',
      walletId: tx.walletId,
      categoryId: tx.categoryId,
      type: tx.type,
      amount: tx.amount,
      occurredOn: tx.occurredOn,
      note: tx.note || ''
    });
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.put(`/transactions/${editingTx.id}`, {
        name: formData.name,
        walletId: Number(formData.walletId),
        categoryId: Number(formData.categoryId),
        type: formData.type,
        amount: Number(formData.amount),
        occurredOn: formData.occurredOn,
        note: formData.note
      });
      setShowEditModal(false);
      setSuccessMsg('Cập nhật giao dịch thành công');
      fetchTransactions();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Single Delete
  const handleDeleteSingle = async (txId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) return;
    try {
      await api.delete(`/transactions/${txId}`);
      setSuccessMsg('Xóa giao dịch thành công');
      fetchTransactions();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} giao dịch đã chọn?`)) return;
    try {
      await api.post('/transactions/batch-delete', { ids: selectedIds });
      setSuccessMsg('Xóa các giao dịch đã chọn thành công');
      fetchTransactions();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Checkbox handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((t) => t.id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const filteredCategories = categories.filter((c) => c.type === formData.type);
  const noteWordCount = formData.note.trim() ? formData.note.trim().split(/\s+/).length : 0;
  const noteTooLong = noteWordCount > 100;

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
          <h3 className="fw-bold text-dark mb-1">Lịch sử giao dịch</h3>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Theo dõi, tìm kiếm và phân loại mọi thu chi
          </p>
        </div>
        <div className="d-flex gap-2">
          {selectedIds.length > 0 && (
            <button onClick={handleBatchDelete} className="btn btn-outline-danger d-flex align-items-center gap-2">
              <Trash2 size={16} />
              <span>Xóa ({selectedIds.length})</span>
            </button>
          )}
          <button onClick={handleOpenAdd} className="btn btn-billet d-flex align-items-center gap-2">
            <PlusCircle size={18} />
            <span>Thêm giao dịch</span>
          </button>
        </div>
      </div>

      {/* Filter Bar (Figure 4.9) */}
      <div className="card-billet p-3 mb-4">
        <form onSubmit={handleSearchSubmit} className="row g-2 align-items-center">
          <div className="col-12 col-md-3">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0">
                <Search size={16} className="text-muted" />
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Tìm theo tên hoặc ghi chú..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">Tất cả loại</option>
              <option value="expense">Chi tiêu</option>
              <option value="income">Thu nhập</option>
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(e.target.value)}
            >
              <option value="">Tất cả ví</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <select
              className="form-select"
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
            >
              <option value="">Tất cả danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="col-6 col-md-2">
            <input
              type="date"
              className="form-control"
              placeholder="Từ ngày"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div className="col-12 col-md-1">
            <button type="submit" className="btn btn-billet w-100">
              Lọc
            </button>
          </div>
        </form>
      </div>

      {/* Transactions Table (Figure 4.9) */}
      <div className="card-billet p-4">
        {transactions.length === 0 && !loading ? (
          <div className="text-center py-5 text-muted">
            <p className="mb-3" style={{ fontSize: '0.95rem' }}>
              Bạn chưa có giao dịch nào phù hợp với bộ lọc.
            </p>
            <button onClick={handleOpenAdd} className="btn btn-sm btn-billet">
              Thêm giao dịch mới
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light" style={{ fontSize: '0.85rem' }}>
                <tr>
                  <th style={{ width: 40 }}>
                    <span onClick={toggleSelectAll} style={{ cursor: 'pointer' }}>
                      {selectedIds.length > 0 && selectedIds.length === transactions.length ? (
                        <CheckSquare size={18} className="text-success" />
                      ) : (
                        <Square size={18} className="text-muted" />
                      )}
                    </span>
                  </th>
                  <th>Tên giao dịch</th>
                  <th>Danh mục</th>
                  <th>Ngày</th>
                  <th>Ghi chú</th>
                  <th>Ví</th>
                  <th className="text-end">Số tiền</th>
                  <th className="text-end" style={{ width: 80 }}>Thao tác</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {transactions.map((tx) => {
                  const isSelected = selectedIds.includes(tx.id);
                  return (
                    <tr key={tx.id} className={isSelected ? 'table-active' : ''}>
                      <td>
                        <span onClick={() => toggleSelectOne(tx.id)} style={{ cursor: 'pointer' }}>
                          {isSelected ? (
                            <CheckSquare size={18} className="text-success" />
                          ) : (
                            <Square size={18} className="text-muted" />
                          )}
                        </span>
                      </td>
                      <td className="fw-semibold text-dark">{tx.name}</td>
                      <td>
                        <span className="fw-semibold text-dark">{tx.categoryName}</span>
                      </td>
                      <td className="text-muted">{formatDate(tx.occurredOn)}</td>
                      <td className="text-secondary">{tx.note || '—'}</td>
                      <td>
                        <span className="badge bg-light text-dark border">{tx.walletName}</span>
                      </td>
                      <td className={`text-end fw-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                        {tx.type === 'income' ? '+' : '-'}{formatVND(tx.amount)}
                      </td>
                      <td className="text-end">
                        <div className="d-flex justify-content-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(tx)}
                            className="btn btn-sm btn-link text-muted p-1"
                            title="Sửa giao dịch"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteSingle(tx.id)}
                            className="btn btn-sm btn-link text-danger p-1"
                            title="Xóa giao dịch"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Thêm giao dịch (Figure 4.9) */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Thêm giao dịch mới</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleAddSubmit}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên giao dịch <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                className="form-control"
                placeholder="Ví dụ: Ăn trưa, tiền điện tháng 11..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            {/* Type Selector (Chi tiêu / Thu nhập) */}
            <div className="d-flex gap-2 mb-3">
              <button
                type="button"
                className={`btn flex-grow-1 ${formData.type === 'expense' ? 'btn-danger' : 'btn-outline-secondary'}`}
                onClick={() => setFormData({ ...formData, type: 'expense', categoryId: '' })}
              >
                <ArrowDownCircle size={16} className="me-1" /> Chi tiêu
              </button>
              <button
                type="button"
                className={`btn flex-grow-1 ${formData.type === 'income' ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => setFormData({ ...formData, type: 'income', categoryId: '' })}
              >
                <ArrowUpCircle size={16} className="me-1" /> Thu nhập
              </button>
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Số tiền (VND) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                className="form-control form-control-lg"
                placeholder="0 đ"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ví tiền <span className="text-danger">*</span>
              </label>
              <select
                required
                className="form-select"
                value={formData.walletId}
                onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
              >
                <option value="">-- Chọn ví --</option>
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name} ({formatVND(w.balance)})</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Danh mục <span className="text-danger">*</span>
              </label>
              <select
                required
                className="form-select"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                <option value="">-- Chọn danh mục --</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ngày giao dịch
              </label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.occurredOn}
                onChange={(e) => setFormData({ ...formData, occurredOn: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ghi chú
              </label>
              <textarea
                rows={2}
                maxLength={2000}
                className="form-control"
                placeholder="Ví dụ: Ăn trưa, đổ xăng..."
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
              <small className={noteTooLong ? 'text-danger' : 'text-muted'}>
                {noteWordCount}/100 từ
              </small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet" disabled={noteTooLong}>Lưu giao dịch</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Sửa giao dịch (Figure 4.10) */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Sửa giao dịch</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleEditSubmit}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên giao dịch <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={100}
                className="form-control"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="d-flex gap-2 mb-3">
              <button
                type="button"
                className={`btn flex-grow-1 ${formData.type === 'expense' ? 'btn-danger' : 'btn-outline-secondary'}`}
                onClick={() => setFormData({ ...formData, type: 'expense' })}
              >
                <ArrowDownCircle size={16} className="me-1" /> Chi tiêu
              </button>
              <button
                type="button"
                className={`btn flex-grow-1 ${formData.type === 'income' ? 'btn-success' : 'btn-outline-secondary'}`}
                onClick={() => setFormData({ ...formData, type: 'income' })}
              >
                <ArrowUpCircle size={16} className="me-1" /> Thu nhập
              </button>
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Số tiền (VND)
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                className="form-control form-control-lg"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ví tiền
              </label>
              <select
                required
                className="form-select"
                value={formData.walletId}
                onChange={(e) => setFormData({ ...formData, walletId: e.target.value })}
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Danh mục
              </label>
              <select
                required
                className="form-select"
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              >
                {categories.filter((c) => c.type === formData.type).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ngày giao dịch
              </label>
              <input
                type="date"
                required
                className="form-control"
                value={formData.occurredOn}
                onChange={(e) => setFormData({ ...formData, occurredOn: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ghi chú
              </label>
              <textarea
                rows={2}
                maxLength={2000}
                className="form-control"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
              <small className={noteTooLong ? 'text-danger' : 'text-muted'}>
                {noteWordCount}/100 từ
              </small>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet" disabled={noteTooLong}>Cập nhật</button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
