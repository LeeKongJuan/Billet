import React, { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import { formatVND, formatDate } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Users,
  PlusCircle,
  Copy,
  Check,
  Crown,
  UserCheck,
  ArrowDownToLine,
  CheckCircle,
  Settings,
  LogOut,
  AlertTriangle,
  History,
  Target
} from 'lucide-react';
import { Modal, Button, Alert, Nav } from 'react-bootstrap';

export function GroupFunds() {
  const { user } = useAuth();
  const [funds, setFunds] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [selectedFundId, setSelectedFundId] = useState(null);
  const [fundDetail, setFundDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history'

  // Modals
  const [showCreateFundModal, setShowCreateFundModal] = useState(false);
  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Forms
  const [createFundForm, setCreateFundForm] = useState({ name: '', description: '' });
  const [contributeForm, setContributeForm] = useState({ walletId: '', amount: '', note: '' });
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', targetDate: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedInviteUserIds, setSelectedInviteUserIds] = useState([]);
  const [inviteLink, setInviteLink] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [transferOwnerUserId, setTransferOwnerUserId] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchFunds = async () => {
    try {
      setLoading(true);
      const res = await api.get('/group-funds');
      setFunds(res.data || []);
      if (!selectedFundId && res.data?.length > 0) {
        setSelectedFundId(res.data[0].id);
      }
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFundDetail = async (fundId) => {
    if (!fundId) return;
    try {
      const res = await api.get(`/group-funds/${fundId}`);
      setFundDetail(res.data);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    fetchFunds();
    api.get('/wallets')
      .then((res) => setWallets(res.data.wallets || []))
      .catch(() => setWallets([]));
  }, []);

  useEffect(() => {
    if (selectedFundId) {
      fetchFundDetail(selectedFundId);
    }
  }, [selectedFundId]);

  // Create Fund
  const handleCreateFund = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      const res = await api.post('/group-funds', createFundForm);
      setShowCreateFundModal(false);
      setCreateFundForm({ name: '', description: '' });
      setSuccessMsg('Tạo quỹ nhóm thành công');
      await fetchFunds();
      setSelectedFundId(res.data.id);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Contribute
  const handleContribute = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post(`/group-funds/${selectedFundId}/contribute`, {
        walletId: Number(contributeForm.walletId),
        amount: Number(contributeForm.amount),
        note: contributeForm.note
      });
      setShowContributeModal(false);
      setContributeForm({ walletId: '', amount: '', note: '' });
      setSuccessMsg('Đóng góp thành công');
      await Promise.all([
        fetchFunds(),
        fetchFundDetail(selectedFundId),
        api.get('/wallets').then((res) => setWallets(res.data.wallets || []))
      ]);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenContribute = () => {
    setContributeForm({
      walletId: String(wallets[0]?.id || ''),
      amount: '',
      note: ''
    });
    setShowContributeModal(true);
  };

  // Create Goal
  const handleCreateGoal = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post(`/group-funds/${selectedFundId}/goals`, {
        name: goalForm.name,
        targetAmount: Number(goalForm.targetAmount),
        targetDate: goalForm.targetDate || null
      });
      setShowGoalModal(false);
      setGoalForm({ name: '', targetAmount: '', targetDate: '' });
      setSuccessMsg('Thiết lập mục tiêu thành công');
      fetchFundDetail(selectedFundId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Complete Goal (BR01)
  const handleCompleteGoal = async (goal) => {
    if (!window.confirm(`Xác nhận hoàn thành mục tiêu "${goal.name}"? Số dư quỹ sẽ bị trừ ${formatVND(goal.targetAmount)}.`)) return;

    try {
      await api.post(`/group-funds/${selectedFundId}/goals/${goal.id}/complete`);
      setSuccessMsg('Hoàn thành mục tiêu thành công');
      await Promise.all([fetchFunds(), fetchFundDetail(selectedFundId)]);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Search users for invite
  const handleSearchUsers = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data || []);
    } catch {
      // ignore
    }
  };

  // Open Invite Modal
  const handleOpenInvite = async () => {
    setSelectedInviteUserIds([]);
    setSearchQuery('');
    setSearchResults([]);
    setCopiedLink(false);
    try {
      const res = await api.get(`/group-funds/${selectedFundId}/invite-link`);
      const origin = window.location.origin;
      setInviteLink(`${origin}/join-fund/${res.data.token}`);
      setShowInviteModal(true);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Send Direct Invites
  const handleSendInvites = async () => {
    if (selectedInviteUserIds.length === 0) return;
    try {
      await api.post(`/group-funds/${selectedFundId}/invite`, {
        userIds: selectedInviteUserIds
      });
      setShowInviteModal(false);
      setSuccessMsg('Đã gửi lời mời thành công');
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Leave fund
  const handleLeaveFund = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn rời khỏi quỹ? Các khoản bạn đã đóng góp sẽ không được hoàn lại.')) return;
    try {
      await api.post(`/group-funds/${selectedFundId}/leave`);
      setShowSettingsModal(false);
      setSuccessMsg('Rời quỹ nhóm thành công');
      setSelectedFundId(null);
      fetchFunds();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Dissolve fund
  const handleDissolveFund = async () => {
    if (!window.confirm(`Bạn không thể khôi phục quỹ sau khi giải tán. Tổng số tiền hiện có trong quỹ là ${formatVND(fundDetail.fund.balance)}. Xác nhận giải tán?`)) return;
    try {
      await api.post(`/group-funds/${selectedFundId}/dissolve`);
      setShowSettingsModal(false);
      setSuccessMsg('Giải tán quỹ nhóm thành công');
      setSelectedFundId(null);
      fetchFunds();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Transfer owner
  const handleTransferOwner = async () => {
    if (!transferOwnerUserId) return;
    try {
      await api.post(`/group-funds/${selectedFundId}/transfer-owner`, {
        newOwnerUserId: Number(transferOwnerUserId)
      });
      setShowSettingsModal(false);
      setSuccessMsg('Chuyển quyền Chủ quỹ thành công');
      fetchFundDetail(selectedFundId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const isOwner = fundDetail?.fund?.userRole === 'owner';
  const otherMembers = (fundDetail?.members || []).filter((m) => m.userId !== user?.id);
  const selectedContributionWallet = wallets.find((wallet) => wallet.id === Number(contributeForm.walletId));

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
          <h3 className="fw-bold text-dark mb-1">Quỹ nhóm</h3>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Tích lũy tiền chung, quản lý thành viên và theo dõi tiến độ mục tiêu
          </p>
        </div>
        <button onClick={() => setShowCreateFundModal(true)} className="btn btn-billet d-flex align-items-center gap-2">
          <PlusCircle size={18} />
          <span>Tạo quỹ nhóm mới</span>
        </button>
      </div>

      {funds.length === 0 && !loading ? (
        <div className="card-billet p-5 text-center text-muted">
          <Users size={48} className="mx-auto mb-3 text-secondary opacity-50" />
          <h5>Bạn chưa tham gia quỹ nhóm nào</h5>
          <p style={{ fontSize: '0.9rem' }}>Hãy tạo quỹ chung để cùng bạn bè, người thân tích lũy cho các dự định chung!</p>
          <button onClick={() => setShowCreateFundModal(true)} className="btn btn-billet mt-2">
            Tạo quỹ nhóm
          </button>
        </div>
      ) : (
        <div className="row g-4">
          {/* Funds Sidebar / Selector */}
          <div className="col-12 col-lg-3">
            <div className="card-billet p-3">
              <div className="fw-bold text-dark mb-3 px-2">Danh sách quỹ ({funds.length})</div>
              <div className="d-flex flex-column gap-2">
                {funds.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFundId(f.id);
                      setActiveTab('overview');
                    }}
                    className={`btn text-start p-3 rounded border text-decoration-none d-flex justify-content-between align-items-center ${
                      selectedFundId === f.id ? 'border-success bg-light' : 'bg-white'
                    }`}
                  >
                    <div>
                      <div className="fw-bold text-dark">{f.name}</div>
                      <div className="text-success fw-semibold" style={{ fontSize: '0.85rem' }}>
                        {formatVND(f.balance)}
                      </div>
                    </div>
                    {f.role === 'owner' && (
                      <span className="badge bg-warning text-dark" style={{ fontSize: '0.7rem' }}>
                        Chủ quỹ
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fund Details (Figure 4.18) */}
          {fundDetail && (
            <div className="col-12 col-lg-9">
              {/* Fund Header Card */}
              <div className="card-billet p-4 mb-4">
                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-3">
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <h3 className="fw-bold text-dark mb-0">{fundDetail.fund.name}</h3>
                      {isOwner && (
                        <span className="badge bg-warning text-dark d-flex align-items-center gap-1">
                          <Crown size={12} /> Chủ quỹ
                        </span>
                      )}
                    </div>
                    {fundDetail.fund.description && (
                      <p className="text-muted mt-1 mb-0" style={{ fontSize: '0.875rem' }}>
                        {fundDetail.fund.description}
                      </p>
                    )}
                  </div>

                  <div className="d-flex gap-2">
                    <button onClick={handleOpenContribute} className="btn btn-billet btn-sm d-flex align-items-center gap-1">
                      <ArrowDownToLine size={14} /> Đóng góp
                    </button>
                    <button onClick={handleOpenInvite} className="btn btn-billet-outline btn-sm d-flex align-items-center gap-1">
                      <Users size={14} /> Mời thành viên
                    </button>
                    <button onClick={() => setShowSettingsModal(true)} className="btn btn-outline-secondary btn-sm p-2" title="Cài đặt quỹ">
                      <Settings size={16} />
                    </button>
                  </div>
                </div>

                {/* Big Balance & Overall Progress (Figure 4.18) */}
                <div className="card-billet-dark p-4 my-3">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="text-white-50" style={{ fontSize: '0.85rem' }}>Số dư quỹ hiện có</span>
                    <span className="text-white-50" style={{ fontSize: '0.85rem' }}>
                      Tiến độ mục tiêu: {fundDetail.fund.overallProgress}%
                    </span>
                  </div>
                  <h1 className="fw-bold text-white mb-3">{formatVND(fundDetail.fund.balance)}</h1>

                  <div className="progress" style={{ height: 10, borderRadius: 5 }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${fundDetail.fund.overallProgress}%` }}
                    />
                  </div>
                </div>

                {/* Tabs: Tổng quan & Lịch sử giao dịch (Figure 4.18 vs 4.20) */}
                <Nav variant="tabs" activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mt-4">
                  <Nav.Item>
                    <Nav.Link eventKey="overview" className="fw-semibold">
                      Mục tiêu & Thành viên
                    </Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="history" className="fw-semibold">
                      Lịch sử giao dịch ({fundDetail.transactions?.length || 0})
                    </Nav.Link>
                  </Nav.Item>
                </Nav>
              </div>

              {/* Tab 1: Overview */}
              {activeTab === 'overview' && (
                <div className="row g-4">
                  {/* Goals */}
                  <div className="col-12 col-md-7">
                    <div className="card-billet p-4 h-100">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold mb-0 text-dark">Mục tiêu chung</h5>
                        <button onClick={() => setShowGoalModal(true)} className="btn btn-sm btn-billet-outline">
                          + Đặt mục tiêu
                        </button>
                      </div>

                      {fundDetail.goals.length === 0 ? (
                        <div className="text-center py-4 text-muted" style={{ fontSize: '0.875rem' }}>
                          Chưa có mục tiêu chung. Bấm "Đặt mục tiêu" để cùng nhau tích lũy!
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {fundDetail.goals.map((g) => (
                            <div key={g.id} className="p-3 border rounded bg-light">
                              <div className="d-flex justify-content-between align-items-start">
                                <div>
                                  <div className="fw-bold text-dark">{g.name}</div>
                                  <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    Hạn: {g.targetDate ? formatDate(g.targetDate) : 'Không thời hạn'}
                                  </div>
                                </div>
                                <span className={`badge ${g.status === 'completed' ? 'badge-active' : 'badge-inactive'}`}>
                                  {g.status === 'completed' ? 'Đã hoàn thành' : 'Đang tích lũy'}
                                </span>
                              </div>

                              <div className="d-flex justify-content-between align-items-center mt-3">
                                <span className="fs-5 fw-bold text-success">{formatVND(g.targetAmount)}</span>
                                {g.status !== 'completed' && Number(fundDetail.fund.balance) > Number(g.targetAmount) && (
                                  <button
                                    onClick={() => handleCompleteGoal(g)}
                                    className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                                    title="Hoàn thành và trừ đúng số tiền mục tiêu khỏi quỹ"
                                  >
                                    <CheckCircle size={14} /> Hoàn thành
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Members */}
                  <div className="col-12 col-md-5">
                    <div className="card-billet p-4 h-100">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold mb-0 text-dark">Thành viên ({fundDetail.members.length})</h5>
                        <button onClick={handleOpenInvite} className="btn btn-sm btn-link text-success text-decoration-none p-0 fw-semibold">
                          + Mời
                        </button>
                      </div>

                      <div className="d-flex flex-column gap-2">
                        {fundDetail.members.map((m) => (
                          <div key={m.userId} className="p-2 rounded border d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-2">
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: '50%',
                                  backgroundColor: m.role === 'owner' ? '#fef3c7' : '#dcfce7',
                                  color: m.role === 'owner' ? '#b45309' : '#15803d',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.8rem',
                                  fontWeight: 'bold'
                                }}
                              >
                                {m.displayName.charAt(0)}
                              </div>
                              <div>
                                <div className="fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                                  {m.displayName}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                  {m.email}
                                </div>
                              </div>
                            </div>
                            <span className={`badge ${m.role === 'owner' ? 'bg-warning text-dark' : 'bg-light text-muted border'}`} style={{ fontSize: '0.7rem' }}>
                              {m.role === 'owner' ? 'Chủ quỹ' : 'Thành viên'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Transaction History (Figure 4.20) */}
              {activeTab === 'history' && (
                <div className="card-billet p-4">
                  <h5 className="fw-bold text-dark mb-3">Lịch sử thu / chi của quỹ</h5>
                  {fundDetail.transactions.length === 0 ? (
                    <div className="text-center py-4 text-muted" style={{ fontSize: '0.875rem' }}>
                      Chưa có giao dịch đóng góp hay chi tiêu nào trong quỹ
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light" style={{ fontSize: '0.85rem' }}>
                          <tr>
                            <th>Ngày</th>
                            <th>Người thực hiện</th>
                            <th>Ví</th>
                            <th>Loại</th>
                            <th>Ghi chú</th>
                            <th className="text-end">Số tiền</th>
                          </tr>
                        </thead>
                        <tbody style={{ fontSize: '0.875rem' }}>
                          {fundDetail.transactions.map((t) => (
                            <tr key={t.id}>
                              <td className="text-muted">{formatDate(t.occurredOn)}</td>
                              <td className="fw-semibold text-dark">{t.userDisplayName}</td>
                              <td>{t.walletName || '—'}</td>
                              <td>
                                <span className={`badge ${t.type === 'contribution' ? 'badge-active' : 'badge-danger-custom'}`}>
                                  {t.type === 'contribution' ? 'Đóng góp (+)' : 'Chi mục tiêu (-)'}
                                </span>
                              </td>
                              <td className="text-secondary">{t.note || '—'}</td>
                              <td className={`text-end fw-bold ${t.type === 'contribution' ? 'text-success' : 'text-danger'}`}>
                                {t.type === 'contribution' ? '+' : '-'}{formatVND(t.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal: Tạo quỹ nhóm mới */}
      <Modal show={showCreateFundModal} onHide={() => setShowCreateFundModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Tạo quỹ nhóm mới</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreateFund}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên quỹ <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Ví dụ: Du lịch Phú Quốc, Quỹ trọ..."
                value={createFundForm.name}
                onChange={(e) => setCreateFundForm({ ...createFundForm, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Mô tả
              </label>
              <textarea
                className="form-control"
                rows="2"
                placeholder="Mô tả mục tiêu của quỹ..."
                value={createFundForm.description}
                onChange={(e) => setCreateFundForm({ ...createFundForm, description: e.target.value })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateFundModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Tạo quỹ</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Đóng góp tiền */}
      <Modal show={showContributeModal} onHide={() => setShowContributeModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Đóng góp vào quỹ: {fundDetail?.fund?.name}</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleContribute}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ví đóng góp <span className="text-danger">*</span>
              </label>
              <select
                required
                className="form-select"
                value={contributeForm.walletId}
                onChange={(e) => setContributeForm({ ...contributeForm, walletId: e.target.value })}
              >
                <option value="">-- Chọn ví --</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.name} ({formatVND(wallet.balance)})
                  </option>
                ))}
              </select>
              {wallets.length === 0 && (
                <small className="text-danger">Bạn cần tạo ví đang hoạt động trước khi đóng góp.</small>
              )}
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Số tiền đóng góp (VND) <span className="text-danger">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max={selectedContributionWallet?.balance}
                step="1"
                className="form-control form-control-lg"
                placeholder="0 đ"
                value={contributeForm.amount}
                onChange={(e) => setContributeForm({ ...contributeForm, amount: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ghi chú
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="Ví dụ: Đóng đợt 1, tiền ăn..."
                value={contributeForm.note}
                onChange={(e) => setContributeForm({ ...contributeForm, note: e.target.value })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowContributeModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet" disabled={!selectedContributionWallet}>Xác nhận đóng góp</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Đặt mục tiêu chung */}
      <Modal show={showGoalModal} onHide={() => setShowGoalModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Đặt mục tiêu chung cho quỹ</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreateGoal}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên mục tiêu <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Ví dụ: Vé máy bay, Thuê xe..."
                value={goalForm.name}
                onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })}
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
                value={goalForm.targetAmount}
                onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Ngày dự kiến hoàn thành
              </label>
              <input
                type="date"
                className="form-control"
                value={goalForm.targetDate}
                onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
              />
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowGoalModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Lưu mục tiêu</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Mời thành viên */}
      <Modal show={showInviteModal} onHide={() => setShowInviteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Mời thành viên vào quỹ</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Link Invite Option */}
          <div className="mb-4 p-3 bg-light rounded border">
            <label className="form-label fw-bold text-dark mb-1" style={{ fontSize: '0.85rem' }}>
              Chia sẻ liên kết mời:
            </label>
            <div className="input-group">
              <input type="text" readOnly className="form-control bg-white" value={inviteLink} />
              <button onClick={copyToClipboard} className="btn btn-billet d-flex align-items-center gap-1">
                {copiedLink ? <Check size={16} /> : <Copy size={16} />}
                <span>{copiedLink ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
            <small className="text-muted d-block mt-1">Liên kết có hiệu lực trong vòng 7 ngày.</small>
          </div>

          {/* Search Users Option */}
          <div>
            <label className="form-label fw-bold text-dark mb-1" style={{ fontSize: '0.85rem' }}>
              Hoặc tìm kiếm theo Email / Tên:
            </label>
            <input
              type="text"
              className="form-control mb-2"
              placeholder="Nhập tên hoặc email..."
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
            />

            {searchResults.length > 0 && (
              <div className="border rounded p-2 mb-3" style={{ maxHeight: 150, overflowY: 'auto' }}>
                {searchResults.map((u) => {
                  const isChecked = selectedInviteUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      className="d-flex align-items-center justify-content-between p-2 border-bottom hover-bg"
                    >
                      <div>
                        <div className="fw-semibold" style={{ fontSize: '0.85rem' }}>{u.displayName}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>{u.email}</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setSelectedInviteUserIds((prev) =>
                            isChecked ? prev.filter((id) => id !== u.id) : [...prev, u.id]
                          )
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {selectedInviteUserIds.length > 0 && (
              <button onClick={handleSendInvites} className="btn btn-billet w-100 py-2">
                Gửi lời mời ({selectedInviteUserIds.length} người đã chọn)
              </button>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInviteModal(false)}>Đóng</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal: Cài đặt quỹ nhóm (Figure 4.19) */}
      <Modal show={showSettingsModal} onHide={() => setShowSettingsModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Cài đặt quỹ: {fundDetail?.fund?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Transfer Owner */}
          {isOwner && otherMembers.length > 0 && (
            <div className="mb-4 pb-3 border-bottom">
              <label className="form-label fw-semibold text-dark" style={{ fontSize: '0.85rem' }}>
                Chuyển quyền Chủ quỹ:
              </label>
              <div className="input-group">
                <select
                  className="form-select"
                  value={transferOwnerUserId}
                  onChange={(e) => setTransferOwnerUserId(e.target.value)}
                >
                  <option value="">-- Chọn thành viên mới --</option>
                  {otherMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>{m.displayName} ({m.email})</option>
                  ))}
                </select>
                <button onClick={handleTransferOwner} disabled={!transferOwnerUserId} className="btn btn-outline-warning text-dark">
                  Chuyển quyền
                </button>
              </div>
            </div>
          )}

          {/* Rời quỹ */}
          <div className="mb-3">
            <h6 className="fw-bold text-dark">Rời quỹ nhóm</h6>
            <p className="text-muted" style={{ fontSize: '0.8rem' }}>
              Các khoản bạn đã đóng góp sẽ không được hoàn lại sau khi rời nhóm.
            </p>
            <button onClick={handleLeaveFund} className="btn btn-outline-danger btn-sm">
              <LogOut size={14} className="me-1" /> Xác nhận rời quỹ
            </button>
          </div>

          {/* Giải tán quỹ (Chỉ Chủ quỹ) */}
          {isOwner && (
            <div className="pt-3 border-top">
              <h6 className="fw-bold text-danger">Giải tán quỹ nhóm</h6>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>
                Thao tác này sẽ chấm dứt hoạt động của quỹ và không thể hoàn tác.
              </p>
              <button onClick={handleDissolveFund} className="btn btn-danger btn-sm">
                <AlertTriangle size={14} className="me-1" /> Giải tán quỹ nhóm
              </button>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSettingsModal(false)}>Đóng</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
