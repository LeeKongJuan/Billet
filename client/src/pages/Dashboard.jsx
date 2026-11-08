import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/http.js';
import { formatVND, formatDate } from '../utils/formatters.js';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PlusCircle,
  BarChart2,
  FileText,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [budgetData, setBudgetData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentBills, setRecentBills] = useState([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [overviewRes, budgetRes, trendRes, txRes, billsRes] = await Promise.all([
          api.get('/reports/overview?period=this_month'),
          api.get('/budgets/current'),
          api.get('/reports/trend?period=this_month'),
          api.get('/transactions?limit=5'),
          api.get('/bills')
        ]);

        setOverview(overviewRes.data);
        setBudgetData(budgetRes.data);
        setTrendData(trendRes.data.data || []);
        setRecentTransactions(txRes.data || []);
        setRecentBills((billsRes.data || []).slice(0, 3));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  if (loading) {
    return <div className="p-4 text-center text-muted">Đang tải dữ liệu tổng quan...</div>;
  }

  const budget = budgetData?.budget;

  return (
    <div className="container-fluid p-0">
      {/* Page Title & Quick Actions */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">Tổng quan</h3>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Theo dõi tình hình tài chính và dòng tiền của bạn
          </p>
        </div>
        <div className="d-flex gap-2">
          <Link to="/transactions" className="btn btn-billet d-flex align-items-center gap-2">
            <PlusCircle size={18} />
            <span>Thêm giao dịch</span>
          </Link>
          <Link to="/reports" className="btn btn-billet-outline d-flex align-items-center gap-2">
            <BarChart2 size={18} />
            <span>Xem báo cáo</span>
          </Link>
        </div>
      </div>

      {/* 3 Top Stat Cards (Figure 4.4) */}
      <div className="row g-3 mb-4">
        {/* Card 1: Total Assets */}
        <div className="col-12 col-md-4">
          <div className="card-billet-dark p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex align-items-center justify-content-between text-white-50 mb-2">
                <span className="fw-medium" style={{ fontSize: '0.875rem' }}>Tổng tài sản</span>
                <Wallet size={20} className="text-white-50" />
              </div>
              <h2 className="fw-bold mb-0 text-white">
                {formatVND(overview?.totalAssets || 0)}
              </h2>
            </div>
            <div className="mt-3 pt-2 border-top border-secondary border-opacity-25 text-white-50" style={{ fontSize: '0.8rem' }}>
              Từ {overview?.wallets?.length || 0} ví đang hoạt động
            </div>
          </div>
        </div>

        {/* Card 2: Income this month */}
        <div className="col-12 col-md-4">
          <div className="card-billet p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex align-items-center justify-content-between text-muted mb-2">
                <span className="fw-medium" style={{ fontSize: '0.875rem' }}>Thu nhập tháng này</span>
                <TrendingUp size={20} className="text-success" />
              </div>
              <h2 className="fw-bold mb-0 text-success">
                {formatVND(overview?.totalIncome || 0)}
              </h2>
            </div>
            <div className="mt-3 pt-2 border-top text-muted" style={{ fontSize: '0.8rem' }}>
              Khoản thu cá nhân trong tháng
            </div>
          </div>
        </div>

        {/* Card 3: Expense this month */}
        <div className="col-12 col-md-4">
          <div className="card-billet p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex align-items-center justify-content-between text-muted mb-2">
                <span className="fw-medium" style={{ fontSize: '0.875rem' }}>Chi tiêu tháng này</span>
                <TrendingDown size={20} className="text-danger" />
              </div>
              <h2 className="fw-bold mb-0 text-danger">
                {formatVND(overview?.totalExpense || 0)}
              </h2>
            </div>
            <div className="mt-3 pt-2 border-top text-muted" style={{ fontSize: '0.8rem' }}>
              Khoản chi cá nhân trong tháng
            </div>
          </div>
        </div>
      </div>

      {/* Middle Row: Trend chart & Budget card (Figure 4.4) */}
      <div className="row g-3 mb-4">
        {/* Trend Bar Chart */}
        <div className="col-12 col-lg-8">
          <div className="card-billet p-4 h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 text-dark">Dòng tiền tháng này</h5>
              <Link to="/reports" className="text-success text-decoration-none fw-semibold" style={{ fontSize: '0.85rem' }}>
                Chi tiết <ArrowRight size={14} />
              </Link>
            </div>
            <div style={{ height: 220, width: '100%' }}>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip formatter={(val) => formatVND(val)} />
                    <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Chi tiêu" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-100 d-flex align-items-center justify-content-center text-muted" style={{ fontSize: '0.875rem' }}>
                  Chưa có dữ liệu ghi chép thu chi trong tháng này
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Budget Progress Card */}
        <div className="col-12 col-lg-4">
          <div className="card-billet p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 text-dark">Ngân sách tháng</h5>
                <Link to="/budgets" className="text-success text-decoration-none fw-semibold" style={{ fontSize: '0.85rem' }}>
                  Quản lý
                </Link>
              </div>

              {budget ? (
                <div>
                  <div className="d-flex justify-content-between align-items-baseline mb-2">
                    <span className="fs-4 fw-bold text-dark">{formatVND(budget.spent)}</span>
                    <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                      / {formatVND(budget.amount)}
                    </span>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '0.8rem' }}>
                    <span className="text-muted">Đã sử dụng:</span>
                    <span className={`fw-bold ${budget.isWarning ? 'text-danger' : 'text-success'}`}>
                      {budget.percentage}%
                    </span>
                  </div>

                  <div className="progress mb-3" style={{ height: 10 }}>
                    <div
                      className={`progress-bar ${budget.isWarning ? 'bg-danger' : 'bg-success'}`}
                      role="progressbar"
                      style={{ width: `${Math.min(100, budget.percentage)}%` }}
                    />
                  </div>

                  {budget.isWarning && (
                    <div className="alert alert-warning py-2 px-3 d-flex align-items-center gap-2 mb-0" style={{ fontSize: '0.8rem' }}>
                      <AlertTriangle size={16} className="text-warning flex-shrink-0" />
                      <span>Bạn đã sử dụng vượt quá 90% hạn mức tháng này!</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted mb-3" style={{ fontSize: '0.875rem' }}>
                    Bạn chưa thiết lập hạn mức chi tiêu cho tháng này
                  </p>
                  <Link to="/budgets" className="btn btn-sm btn-billet">
                    Thiết lập hạn mức
                  </Link>
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-top text-muted d-flex justify-content-between" style={{ fontSize: '0.8rem' }}>
              <span>Còn lại khả dụng:</span>
              <span className="fw-bold text-dark">
                {budget ? formatVND(budget.remaining) : 'Chưa đặt'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent transactions & Bill split shortcut (Figure 4.4) */}
      <div className="row g-3">
        {/* Recent Transactions */}
        <div className="col-12 col-lg-8">
          <div className="card-billet p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0 text-dark">Giao dịch gần đây</h5>
              <Link to="/transactions" className="text-success text-decoration-none fw-semibold" style={{ fontSize: '0.85rem' }}>
                Xem tất cả <ArrowRight size={14} />
              </Link>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="text-center py-4 text-muted" style={{ fontSize: '0.875rem' }}>
                Chưa có giao dịch nào gần đây. Bấm <b>Thêm giao dịch</b> để bắt đầu.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light" style={{ fontSize: '0.8rem' }}>
                    <tr>
                      <th>Ngày</th>
                      <th>Tên giao dịch</th>
                      <th>Danh mục</th>
                      <th>Ghi chú</th>
                      <th>Ví</th>
                      <th className="text-end">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody style={{ fontSize: '0.875rem' }}>
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id}>
                        <td className="text-muted">{formatDate(tx.occurredOn)}</td>
                        <td className="fw-semibold text-dark">{tx.name}</td>
                        <td>
                          <span className="fw-medium">{tx.categoryName}</span>
                        </td>
                        <td className="text-secondary">{tx.note || '—'}</td>
                        <td className="text-muted" style={{ fontSize: '0.8rem' }}>{tx.walletName}</td>
                        <td className={`text-end fw-semibold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatVND(tx.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Bill Split Shortcut Card */}
        <div className="col-12 col-lg-4">
          <div className="card-billet p-4 h-100 d-flex flex-column justify-content-between">
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0 text-dark">Chia hóa đơn</h5>
                <Link to="/bills" className="btn btn-sm btn-billet">
                  <FileText size={14} className="me-1" /> Tạo mới
                </Link>
              </div>

              {recentBills.length === 0 ? (
                <div className="text-center py-4 text-muted" style={{ fontSize: '0.875rem' }}>
                  Chưa có hóa đơn chia tiền nào. Hãy tạo hóa đơn cho chuyến đi hoặc bữa ăn nhóm!
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {recentBills.map((b) => (
                    <Link
                      key={b.id}
                      to={`/bills?billId=${b.id}`}
                      className="p-3 rounded border text-decoration-none d-flex justify-content-between align-items-center hover-bg"
                    >
                      <div>
                        <div className="fw-semibold text-dark">{b.name}</div>
                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                          Tạo ngày: {formatDate(b.createdAt)}
                        </div>
                      </div>
                      <span className={`badge ${b.status === 'open' ? 'badge-active' : 'badge-inactive'}`}>
                        {b.status === 'open' ? 'Đang diễn ra' : 'Đã kết thúc'}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-3 pt-3 border-top text-center">
              <Link to="/bills" className="text-success text-decoration-none fw-semibold" style={{ fontSize: '0.85rem' }}>
                Xem danh sách hóa đơn <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
