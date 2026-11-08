import React, { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import { formatVND, formatDate } from '../utils/formatters.js';
import { PlusCircle, Edit2, Trash2, AlertTriangle, PieChart, CheckCircle2 } from 'lucide-react';
import { Modal, Button, Alert } from 'react-bootstrap';

export function Budgets() {
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Forms
  const [amountInput, setAmountInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchBudget = async () => {
    try {
      setLoading(true);
      const res = await api.get('/budgets/current');
      setBudgetData(res.data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/budgets', { amount: Number(amountInput) });
      setShowCreateModal(false);
      setAmountInput('');
      setSuccessMsg('Tạo hạn mức thành công');
      fetchBudget();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.put(`/budgets/${budgetData.budget.id}`, { amount: Number(amountInput) });
      setShowEditModal(false);
      setSuccessMsg('Cập nhật hạn mức thành công');
      fetchBudget();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hạn mức chi tiêu tháng này?')) return;
    try {
      await api.delete(`/budgets/${budgetData.budget.id}`);
      setSuccessMsg('Xóa hạn mức thành công');
      fetchBudget();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const budget = budgetData?.budget;
  const categories = budgetData?.categories || [];
  const transactions = budgetData?.transactions || [];

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
          <h3 className="fw-bold text-dark mb-1">Hạn mức & Ngân sách</h3>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Kiểm soát chi tiêu tháng và nhận cảnh báo sớm khi chạm ngưỡng 90%
          </p>
        </div>
        {budget ? (
          <div className="d-flex gap-2">
            <button
              onClick={() => {
                setAmountInput(budget.amount);
                setShowEditModal(true);
              }}
              className="btn btn-billet-outline d-flex align-items-center gap-1"
            >
              <Edit2 size={16} /> Điều chỉnh
            </button>
            <button onClick={handleDelete} className="btn btn-outline-danger d-flex align-items-center gap-1">
              <Trash2 size={16} /> Xóa hạn mức
            </button>
          </div>
        ) : (
          <button onClick={() => setShowCreateModal(true)} className="btn btn-billet d-flex align-items-center gap-2">
            <PlusCircle size={18} />
            <span>Tạo hạn mức mới</span>
          </button>
        )}
      </div>

      {/* Case 1: Chưa có hạn mức (Figure 4.13) */}
      {!budget && !loading && (
        <div className="card-billet p-5 mb-4 text-center">
          <PieChart size={48} className="mx-auto mb-3 text-secondary opacity-50" />
          <h5 className="fw-bold text-dark">Bạn chưa có hạn mức chi tiêu cho tháng này</h5>
          <p className="text-muted mb-4" style={{ fontSize: '0.9rem', maxWidth: 460, margin: '0 auto' }}>
            Thiết lập hạn mức giúp bạn theo dõi chi tiêu và tự động nhận cảnh báo khi chi vượt quá 90% ngân sách đã đặt.
          </p>
          <div>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-billet px-4 py-2">
              <PlusCircle size={18} className="me-2" />
              Tạo hạn mức mới
            </button>
          </div>
        </div>
      )}

      {/* Case 2: Đã có hạn mức (Figure 4.12) */}
      {budget && (
        <div className="card-billet p-4 mb-4">
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2">
            <div>
              <span className="text-muted fw-semibold" style={{ fontSize: '0.85rem' }}>
                Hạn mức chi tiêu tháng {budget.month}
              </span>
              <div className="d-flex align-items-baseline gap-2 mt-1">
                <h1 className="fw-bold text-dark mb-0">{formatVND(budget.spent)}</h1>
                <span className="text-muted fs-5">/ {formatVND(budget.amount)}</span>
              </div>
            </div>

            <div className="text-end">
              <span className={`fs-2 fw-bold ${budget.isWarning ? 'text-danger' : 'text-success'}`}>
                {budget.percentage}%
              </span>
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>Tỉ lệ sử dụng</div>
            </div>
          </div>

          <div className="progress mb-3" style={{ height: 14, borderRadius: 7 }}>
            <div
              className={`progress-bar ${budget.isWarning ? 'bg-danger' : 'bg-success'}`}
              role="progressbar"
              style={{ width: `${Math.min(100, budget.percentage)}%` }}
            />
          </div>

          {budget.isWarning && (
            <div className="alert alert-danger py-2 px-3 d-flex align-items-center gap-2 mb-3" style={{ fontSize: '0.85rem' }}>
              <AlertTriangle size={18} className="flex-shrink-0" />
              <span>
                <b>Cảnh báo!</b> Bạn đã sử dụng vượt quá 90% hạn mức chi tiêu tháng này ({budget.percentage}%). Hãy cân đối lại chi tiêu!
              </span>
            </div>
          )}

          <div className="row text-center pt-3 border-top g-2">
            <div className="col-6 col-md-3">
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>Hạn mức đặt ra</div>
              <div className="fw-bold text-dark">{formatVND(budget.amount)}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>Đã chi</div>
              <div className="fw-bold text-danger">{formatVND(budget.spent)}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>Còn lại khả dụng</div>
              <div className="fw-bold text-success">{formatVND(budget.remaining)}</div>
            </div>
            <div className="col-6 col-md-3">
              <div className="text-muted" style={{ fontSize: '0.8rem' }}>Trạng thái</div>
              <div>
                {budget.isWarning ? (
                  <span className="badge badge-danger-custom">Vượt 90%</span>
                ) : (
                  <span className="badge badge-active">An toàn</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chi tiêu theo từng danh mục (Figure 4.12 & 4.13) */}
      <div className="card-billet p-4">
        <h5 className="fw-bold text-dark mb-3">Chi tiêu theo danh mục tháng này</h5>
        {categories.length === 0 ? (
          <div className="text-center py-4 text-muted" style={{ fontSize: '0.9rem' }}>
            Chưa có khoản chi tiêu nào trong tháng này
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light" style={{ fontSize: '0.85rem' }}>
                <tr>
                  <th>Danh mục</th>
                  <th className="text-end">Số tiền</th>
                  <th style={{ width: '40%' }}>Tỉ lệ trong tổng chi</th>
                  <th className="text-end" style={{ width: 80 }}>%</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="fw-semibold text-dark">{c.name}</td>
                    <td className="text-end fw-bold text-danger">{formatVND(c.amount)}</td>
                    <td>
                      <div className="progress" style={{ height: 8 }}>
                        <div
                          className="progress-bar bg-success"
                          role="progressbar"
                          style={{ width: `${c.percentage}%` }}
                        />
                      </div>
                    </td>
                    <td className="text-end text-muted fw-semibold">{c.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card-billet p-4 mt-4">
        <h5 className="fw-bold text-dark mb-3">Giao dịch chi tiêu tháng này</h5>
        {transactions.length === 0 ? (
          <div className="text-center py-4 text-muted" style={{ fontSize: '0.9rem' }}>
            Chưa có giao dịch chi tiêu trong tháng này
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light" style={{ fontSize: '0.85rem' }}>
                <tr>
                  <th>Tên giao dịch</th>
                  <th>Danh mục</th>
                  <th>Ngày thực hiện</th>
                  <th>Ghi chú</th>
                  <th className="text-end">Số tiền</th>
                </tr>
              </thead>
              <tbody style={{ fontSize: '0.875rem' }}>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td className="fw-semibold text-dark">{transaction.name}</td>
                    <td>{transaction.categoryName}</td>
                    <td className="text-muted">{formatDate(transaction.occurredOn)}</td>
                    <td className="text-secondary">{transaction.note || '—'}</td>
                    <td className="text-end fw-bold text-danger">{formatVND(transaction.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Tạo hạn mức (Figure 4.14) */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Tạo hạn mức chi tiêu mới</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreate}>
          <Modal.Body>
            <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
              Hạn mức này sẽ áp dụng cho toàn bộ chi tiêu trong tháng hiện tại.
            </p>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Số tiền hạn mức (VND) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                className="form-control form-control-lg"
                placeholder="Ví dụ: 8.000.000 đ"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Lưu hạn mức</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Sửa hạn mức */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Điều chỉnh hạn mức</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleEdit}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Số tiền hạn mức mới (VND) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                step="1"
                className="form-control form-control-lg"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Cập nhật</button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
