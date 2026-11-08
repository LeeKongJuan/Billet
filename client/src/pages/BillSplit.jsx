import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/http.js';
import { formatVND, formatDate } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  FileText,
  PlusCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  UserPlus,
  Trash2,
  CheckSquare,
  Square,
  ArrowRightLeft
} from 'lucide-react';
import { Modal, Button, Alert, Badge } from 'react-bootstrap';

export function BillSplit() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlBillId = searchParams.get('billId');

  const [bills, setBills] = useState([]);
  const [selectedBillId, setSelectedBillId] = useState(urlBillId ? Number(urlBillId) : null);
  const [billDetail, setBillDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateBillModal, setShowCreateBillModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);

  // Create Bill Form
  const [billName, setBillName] = useState('');
  const [participants, setParticipants] = useState([{ displayName: user?.displayName || 'Tôi', userId: user?.id }]);
  const [newPartName, setNewPartName] = useState('');

  // Add Activity Form (Figure 4.24)
  const [activityForm, setActivityForm] = useState({
    name: '',
    totalAmount: '',
    paidByParticipantId: '',
    splitType: 'equal',
    participantIds: [],
    customShares: {}
  });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchBills = async () => {
    try {
      setLoading(true);
      const res = await api.get('/bills');
      setBills(res.data || []);
      if (!selectedBillId && res.data?.length > 0) {
        setSelectedBillId(res.data[0].id);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillDetail = async (billId) => {
    if (!billId) return;
    try {
      const res = await api.get(`/bills/${billId}`);
      setBillDetail(res.data);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    fetchBills();
  }, []);

  useEffect(() => {
    if (selectedBillId) {
      fetchBillDetail(selectedBillId);
      setSearchParams({ billId: selectedBillId });
    }
  }, [selectedBillId]);

  // Create Bill
  const handleAddParticipant = () => {
    if (!newPartName.trim()) return;
    setParticipants([...participants, { displayName: newPartName.trim() }]);
    setNewPartName('');
  };

  const handleRemoveParticipant = (index) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await api.post('/bills', {
        name: billName,
        participants
      });
      setShowCreateBillModal(false);
      setBillName('');
      setParticipants([{ displayName: user?.displayName || 'Tôi', userId: user?.id }]);
      setSuccessMsg('Tạo hóa đơn thành công');
      await fetchBills();
      setSelectedBillId(res.data.id);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Open Add Activity Modal
  const handleOpenAddActivity = () => {
    const defaultPayer = billDetail?.participants[0]?.id || '';
    const allPIds = billDetail?.participants.map((p) => p.id) || [];
    setActivityForm({
      name: '',
      totalAmount: '',
      paidByParticipantId: defaultPayer,
      splitType: 'equal',
      participantIds: allPIds,
      customShares: {}
    });
    setShowAddActivityModal(true);
  };

  // Add Activity
  const handleAddActivity = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post(`/bills/${selectedBillId}/activities`, {
        name: activityForm.name,
        totalAmount: Number(activityForm.totalAmount),
        paidByParticipantId: Number(activityForm.paidByParticipantId),
        splitType: activityForm.splitType,
        participantIds: activityForm.participantIds,
        customShares: activityForm.splitType === 'custom' ? activityForm.customShares : undefined
      });
      setShowAddActivityModal(false);
      setSuccessMsg('Thêm hoạt động thành công');
      fetchBillDetail(selectedBillId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Close Bill
  const handleCloseBill = async () => {
    if (!window.confirm('Xác nhận kết thúc hóa đơn? Sau khi kết thúc, hóa đơn sẽ được khóa và chốt bảng nợ rút gọn để đánh dấu thanh toán.')) return;
    try {
      await api.post(`/bills/${selectedBillId}/close`);
      setSuccessMsg('Kết thúc hóa đơn thành công');
      await fetchBills();
      fetchBillDetail(selectedBillId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Toggle Settlement is_paid
  const handleToggleSettlement = async (settlementId, currentStatus) => {
    try {
      await api.patch(`/bills/${selectedBillId}/settlements/${settlementId}`, {
        isPaid: !currentStatus
      });
      fetchBillDetail(selectedBillId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const isClosed = billDetail?.bill?.status === 'closed';

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
          <h3 className="fw-bold text-dark mb-1">Chia hóa đơn (Bill Split)</h3>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Chia đều hoặc chia linh hoạt, tự động rút gọn công nợ không cần tính toán thủ công
          </p>
        </div>
        <button onClick={() => setShowCreateBillModal(true)} className="btn btn-billet d-flex align-items-center gap-2">
          <PlusCircle size={18} />
          <span>Tạo hóa đơn mới</span>
        </button>
      </div>

      {bills.length === 0 && !loading ? (
        <div className="card-billet p-5 text-center text-muted">
          <FileText size={48} className="mx-auto mb-3 text-secondary opacity-50" />
          <h5>Bạn chưa có hóa đơn chia tiền nào</h5>
          <p style={{ fontSize: '0.9rem' }}>Hãy tạo hóa đơn cho chuyến đi chơi hoặc liên hoan nhóm để chia tiền tự động!</p>
          <button onClick={() => setShowCreateBillModal(true)} className="btn btn-billet mt-2">
            Tạo hóa đơn
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {/* Bill List Sidebar */}
          <div className="col-12 col-lg-3">
            <div className="card-billet p-3">
              <div className="fw-bold text-dark mb-3 px-2">Danh sách hóa đơn ({bills.length})</div>
              <div className="d-flex flex-column gap-2">
                {bills.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBillId(b.id)}
                    className={`btn text-start p-3 rounded border text-decoration-none d-flex justify-content-between align-items-center ${
                      selectedBillId === b.id ? 'border-success bg-light' : 'bg-white'
                    }`}
                  >
                    <div>
                      <div className="fw-bold text-dark">{b.name}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {formatDate(b.createdAt)}
                      </div>
                    </div>
                    <span className={`badge ${b.status === 'open' ? 'badge-active' : 'badge-inactive'}`}>
                      {b.status === 'open' ? 'Đang chia' : 'Đã kết thúc'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bill Details */}
          {billDetail && (
            <div className="col-12 col-lg-9">
              {/* Bill Header (Figure 4.23 & 4.25) */}
              <div className="card-billet p-4 mb-4">
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h3 className="fw-bold text-dark mb-0">{billDetail.bill.name}</h3>
                      <span className={`badge ${isClosed ? 'badge-inactive' : 'badge-active'}`}>
                        {isClosed ? 'Đã kết thúc' : 'Đang diễn ra'}
                      </span>
                    </div>
                    <div className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>
                      Thành viên tham gia ({billDetail.participants.length}):{' '}
                      {billDetail.participants.map((p) => p.displayName).join(', ')}
                    </div>
                  </div>

                  <div className="d-flex gap-2">
                    {!isClosed && (
                      <>
                        <button onClick={handleOpenAddActivity} className="btn btn-billet btn-sm d-flex align-items-center gap-1">
                          <PlusCircle size={14} /> Thêm hoạt động
                        </button>
                        <button onClick={handleCloseBill} className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1">
                          <Lock size={14} /> Kết thúc hóa đơn
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Total Bill Amount */}
                <div className="card-billet-dark p-3 mt-3 d-flex justify-content-between align-items-center">
                  <span className="text-white-50">Tổng số tiền tất cả hoạt động:</span>
                  <h3 className="fw-bold text-white mb-0">{formatVND(billDetail.bill.totalAmount)}</h3>
                </div>
              </div>

              {/* Bảng nợ rút gọn (Figure 4.23 & 4.25) */}
              <div className="card-billet p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0 text-dark">
                    {isClosed ? 'Các khoản nợ cần thanh toán' : 'Bảng nợ rút gọn (Tính tự động tối ưu)'}
                  </h5>
                  {isClosed && (
                    <span className="badge bg-light text-muted border">Tích chọn để đánh dấu đã trả</span>
                  )}
                </div>

                {billDetail.settlements.length === 0 ? (
                  <div className="text-center py-4 text-muted" style={{ fontSize: '0.875rem' }}>
                    Chưa có quan hệ nợ nào. Tất cả đều đã cân bằng hoặc chưa có hoạt động chi tiêu!
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2">
                    {billDetail.settlements.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        className={`p-3 border rounded d-flex justify-content-between align-items-center ${
                          s.isPaid ? 'bg-light text-muted' : 'bg-white'
                        }`}
                      >
                        <div className="d-flex align-items-center gap-3">
                          {isClosed && (
                            <span
                              onClick={() => handleToggleSettlement(s.id, s.isPaid)}
                              style={{ cursor: 'pointer' }}
                            >
                              {s.isPaid ? (
                                <CheckSquare size={20} className="text-success" />
                              ) : (
                                <Square size={20} className="text-muted" />
                              )}
                            </span>
                          )}
                          <div className={s.isPaid ? 'text-decoration-line-through' : ''}>
                            <span className="fw-bold text-danger">{s.fromDisplayName}</span>
                            <span className="text-muted mx-2">cần trả cho</span>
                            <span className="fw-bold text-success">{s.toDisplayName}</span>
                          </div>
                        </div>

                        <div className="d-flex align-items-center gap-3">
                          <span className={`fw-bold fs-5 ${s.isPaid ? 'text-muted' : 'text-dark'}`}>
                            {formatVND(s.amount)}
                          </span>
                          {isClosed && (
                            <span className={`badge ${s.isPaid ? 'badge-active' : 'badge-danger-custom'}`}>
                              {s.isPaid ? 'Đã trả' : 'Chưa trả'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Danh sách các hoạt động (Figure 4.23) */}
              <div className="card-billet p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="fw-bold mb-0 text-dark">Các hoạt động chi tiêu ({billDetail.activities.length})</h5>
                  {!isClosed && (
                    <button onClick={handleOpenAddActivity} className="btn btn-sm btn-billet-outline">
                      + Thêm hoạt động
                    </button>
                  )}
                </div>

                {billDetail.activities.length === 0 ? (
                  <div className="text-center py-4 text-muted" style={{ fontSize: '0.875rem' }}>
                    Chưa có hoạt động nào trong hóa đơn này. Hãy thêm hoạt động để hệ thống bắt đầu chia tiền!
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {billDetail.activities.map((act) => (
                      <div key={act.id} className="p-3 border rounded bg-light">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="fw-bold text-dark fs-6">{act.name}</div>
                            <div className="text-muted" style={{ fontSize: '0.8rem' }}>
                              Người ứng trước: <b className="text-dark">{act.paidByDisplayName}</b> • Cách chia: {act.splitType === 'equal' ? 'Chia đều' : 'Chia không đều'}
                            </div>
                          </div>
                          <span className="fw-bold fs-5 text-success">{formatVND(act.totalAmount)}</span>
                        </div>

                        {/* Breakdown shares */}
                        <div className="mt-2 pt-2 border-top d-flex flex-wrap gap-2" style={{ fontSize: '0.8rem' }}>
                          <span className="text-muted">Phần chia:</span>
                          {act.shares?.map((share) => (
                            <span key={share.participantId} className="badge bg-white text-dark border">
                              {share.displayName}: {formatVND(share.amount)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: Tạo hóa đơn mới (Figure 4.22) */}
      <Modal show={showCreateBillModal} onHide={() => setShowCreateBillModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Tạo hóa đơn nhóm mới</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreateBill}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên hóa đơn <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Ví dụ: Chuyến đi Đà Lạt, Ăn lẩu cuối tuần..."
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Những người tham gia chia tiền:
              </label>

              <div className="d-flex flex-column gap-2 mb-3">
                {participants.map((p, idx) => (
                  <div key={idx} className="p-2 border rounded d-flex justify-content-between align-items-center bg-light">
                    <span className="fw-medium text-dark">{p.displayName} {p.userId === user?.id ? '(Tôi)' : ''}</span>
                    {idx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveParticipant(idx)}
                        className="btn btn-sm btn-link text-danger p-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Thêm tên bạn bè hoặc khách..."
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddParticipant();
                    }
                  }}
                />
                <button type="button" onClick={handleAddParticipant} className="btn btn-outline-success">
                  + Thêm
                </button>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateBillModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Tạo hóa đơn</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Thêm hoạt động (Figure 4.24) */}
      <Modal show={showAddActivityModal} onHide={() => setShowAddActivityModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Thêm hoạt động chi tiêu</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleAddActivity}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên hoạt động <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Ví dụ: Tiền ăn tối, Vé tham quan..."
                value={activityForm.name}
                onChange={(e) => setActivityForm({ ...activityForm, name: e.target.value })}
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6">
                <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                  Tổng số tiền (VND) <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  className="form-control form-control-lg"
                  placeholder="0 đ"
                  value={activityForm.totalAmount}
                  onChange={(e) => setActivityForm({ ...activityForm, totalAmount: e.target.value })}
                />
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                  Người ứng trước tiền <span className="text-danger">*</span>
                </label>
                <select
                  required
                  className="form-select form-select-lg"
                  value={activityForm.paidByParticipantId}
                  onChange={(e) => setActivityForm({ ...activityForm, paidByParticipantId: e.target.value })}
                >
                  {billDetail?.participants.map((p) => (
                    <option key={p.id} value={p.id}>{p.displayName}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Cách chia tiền:
              </label>
              <div className="d-flex gap-3">
                <label className="form-check-label d-flex align-items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="splitType"
                    checked={activityForm.splitType === 'equal'}
                    onChange={() => setActivityForm({ ...activityForm, splitType: 'equal' })}
                  />
                  <span>Chia đều (Billet tự tính đến từng đồng)</span>
                </label>
                <label className="form-check-label d-flex align-items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="splitType"
                    checked={activityForm.splitType === 'custom'}
                    onChange={() => setActivityForm({ ...activityForm, splitType: 'custom' })}
                  />
                  <span>Chia không đều (Tự nhập số tiền)</span>
                </label>
              </div>
            </div>

            {/* Select participants in activity */}
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Những người tham gia hoạt động này:
              </label>
              <div className="d-flex flex-column gap-2 border rounded p-3 bg-light">
                {billDetail?.participants.map((p) => {
                  const isChecked = activityForm.participantIds.includes(p.id);
                  return (
                    <div key={p.id} className="d-flex justify-content-between align-items-center">
                      <label className="d-flex align-items-center gap-2 mb-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setActivityForm((prev) => ({
                              ...prev,
                              participantIds: isChecked
                                ? prev.participantIds.filter((id) => id !== p.id)
                                : [...prev.participantIds, p.id]
                            }));
                          }}
                        />
                        <span className="fw-medium">{p.displayName}</span>
                      </label>

                      {activityForm.splitType === 'custom' && isChecked && (
                        <div style={{ width: 150 }}>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            className="form-control form-control-sm text-end"
                            placeholder="Số tiền..."
                            value={activityForm.customShares[p.id] || ''}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              setActivityForm((prev) => ({
                                ...prev,
                                customShares: { ...prev.customShares, [p.id]: val }
                              }));
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAddActivityModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Lưu hoạt động</button>
          </Modal.Footer>
        </form>
      </Modal>
    </div>
  );
}
