import React, { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import { formatVND } from '../utils/formatters.js';
import { PlusCircle, Edit2, Trash2, Tag, Utensils, Car, ShoppingBag, Home, Film, Briefcase, Gift } from 'lucide-react';
import { Modal, Button, Alert, Nav } from 'react-bootstrap';

export function Categories() {
  const [activeTab, setActiveTab] = useState('expense');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);

  // Forms
  const [createForm, setCreateForm] = useState({ name: '', icon: 'tag' });
  const [editForm, setEditForm] = useState({ name: '' });

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/categories?type=${activeTab}`);
      setCategories(res.data || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [activeTab]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.post('/categories', {
        name: createForm.name,
        type: activeTab,
        icon: createForm.icon
      });
      setShowCreateModal(false);
      setCreateForm({ name: '', icon: 'tag' });
      setSuccessMsg('Tạo danh mục thành công');
      fetchCategories();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleOpenEdit = (cat) => {
    setSelectedCat(cat);
    setEditForm({ name: cat.name });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      await api.put(`/categories/${selectedCat.id}`, editForm);
      setShowEditModal(false);
      setSuccessMsg('Đổi tên danh mục thành công');
      fetchCategories();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const handleDelete = async (cat) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.name}"?`)) return;
    try {
      await api.delete('/categories', { ids: [cat.id] });
      setSuccessMsg('Xóa danh mục thành công');
      fetchCategories();
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'utensils': return <Utensils size={18} />;
      case 'car': return <Car size={18} />;
      case 'shopping-bag': return <ShoppingBag size={18} />;
      case 'home': return <Home size={18} />;
      case 'film': return <Film size={18} />;
      case 'briefcase': return <Briefcase size={18} />;
      case 'gift': return <Gift size={18} />;
      default: return <Tag size={18} />;
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
          <h3 className="fw-bold text-dark mb-1">Danh mục thu & chi</h3>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Phân loại rõ ràng mọi nguồn tiền và thói quen tiêu dùng
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-billet d-flex align-items-center gap-2">
          <PlusCircle size={18} />
          <span>Tạo danh mục mới</span>
        </button>
      </div>

      {/* Tabs (Chi tiêu / Thu nhập) (Figure 4.11) */}
      <div className="card-billet p-3 mb-4">
        <Nav variant="pills" activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
          <Nav.Item>
            <Nav.Link eventKey="expense" className="px-4 fw-semibold">
              Chi tiêu
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="income" className="px-4 fw-semibold">
              Thu nhập
            </Nav.Link>
          </Nav.Item>
        </Nav>
      </div>

      {/* Categories List */}
      <div className="card-billet p-4">
        {categories.length === 0 && !loading ? (
          <div className="text-center py-5 text-muted">
            <p className="mb-3">Bạn chưa có danh mục nào. Vui lòng tạo danh mục mới để bắt đầu quản lý chi tiêu.</p>
            <button onClick={() => setShowCreateModal(true)} className="btn btn-sm btn-billet">
              Tạo danh mục ngay
            </button>
          </div>
        ) : (
          <div className="row g-3">
            {categories.map((cat) => (
              <div key={cat.id} className="col-12 col-md-6 col-lg-4">
                <div className="p-3 border rounded d-flex justify-content-between align-items-center bg-white hover-bg">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        backgroundColor: activeTab === 'expense' ? '#fee2e2' : '#dcfce7',
                        color: activeTab === 'expense' ? '#dc2626' : '#16a34a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {getIcon(cat.icon)}
                    </div>
                    <div>
                      <div className="fw-semibold text-dark">{cat.name}</div>
                      <span className="badge bg-light text-muted border" style={{ fontSize: '0.7rem' }}>
                        {cat.type === 'expense' ? 'Khoản chi' : 'Khoản thu'}
                      </span>
                    </div>
                  </div>

                  <div className="d-flex gap-1">
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="btn btn-sm btn-link text-muted p-1"
                      title="Đổi tên"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className="btn btn-sm btn-link text-danger p-1"
                      title="Xóa danh mục"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Tạo danh mục (Figure 4.11) */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">
            Tạo danh mục {activeTab === 'expense' ? 'chi tiêu' : 'thu nhập'}
          </Modal.Title>
        </Modal.Header>
        <form onSubmit={handleCreate}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên danh mục <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                placeholder="Ví dụ: Ăn uống, Tiền điện..."
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              />
            </div>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Biểu tượng
              </label>
              <select
                className="form-select"
                value={createForm.icon}
                onChange={(e) => setCreateForm({ ...createForm, icon: e.target.value })}
              >
                <option value="tag">Thẻ (Tag)</option>
                <option value="utensils">Ăn uống (Utensils)</option>
                <option value="car">Di chuyển (Car)</option>
                <option value="shopping-bag">Mua sắm (Shopping)</option>
                <option value="home">Nhà cửa (Home)</option>
                <option value="film">Giải trí (Film)</option>
                <option value="briefcase">Công việc / Lương (Briefcase)</option>
                <option value="gift">Quà tặng / Thưởng (Gift)</option>
              </select>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>Hủy</Button>
            <button type="submit" className="btn btn-billet">Tạo danh mục</button>
          </Modal.Footer>
        </form>
      </Modal>

      {/* Modal: Đổi tên danh mục */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title className="fs-5 fw-bold">Đổi tên danh mục</Modal.Title>
        </Modal.Header>
        <form onSubmit={handleEdit}>
          <Modal.Body>
            <div className="mb-3">
              <label className="form-label text-secondary fw-semibold" style={{ fontSize: '0.85rem' }}>
                Tên danh mục mới <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                required
                className="form-control"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
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
