import React, { useEffect, useState } from 'react';
import { api } from '../api/http.js';
import { formatVND } from '../utils/formatters.js';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  PieChart as PieIcon,
  BarChart3,
  Calendar
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Alert } from 'react-bootstrap';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#64748b'];

export function Reports() {
  const [period, setPeriod] = useState('this_month');
  const [walletId, setWalletId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [wallets, setWallets] = useState([]);
  const [overview, setOverview] = useState(null);
  const [categoriesData, setCategoriesData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadWallets() {
      try {
        const res = await api.get('/wallets');
        setWallets(res.data.wallets || []);
      } catch {
        // ignore
      }
    }
    loadWallets();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      const params = new URLSearchParams();
      params.append('period', period);
      if (walletId) params.append('walletId', walletId);
      if (period === 'custom' && fromDate && toDate) {
        params.append('fromDate', fromDate);
        params.append('toDate', toDate);
      }

      const q = params.toString();

      const [overviewRes, catRes, trendRes, compRes] = await Promise.all([
        api.get(`/reports/overview?${q}`),
        api.get(`/reports/expense-categories?${q}`),
        api.get(`/reports/trend?${q}`),
        api.get(`/reports/compare?${q}`)
      ]);

      setOverview(overviewRes.data);
      setCategoriesData(catRes.data.categories || []);
      setTrendData(trendRes.data.data || []);
      setComparison(compRes.data);
    } catch (err) {
      setErrorMsg('Không thể tải dữ liệu báo cáo, vui lòng thử lại sau');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [period, walletId]);

  return (
    <div className="container-fluid p-0">
      {errorMsg && (
        <Alert variant="danger" dismissible onClose={() => setErrorMsg('')} className="py-2 mb-3">
          {errorMsg}
        </Alert>
      )}

      {/* Header & Filter Controls (Figure 4.26) */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h3 className="fw-bold text-dark mb-1">Báo cáo tài chính</h3>
          <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
            Phân tích chi tiết cơ cấu chi tiêu, xu hướng dòng tiền và so sánh các kỳ
          </p>
        </div>

        {/* Filters */}
        <div className="d-flex flex-wrap gap-2 align-items-center">
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="this_week">Tuần này</option>
            <option value="this_month">Tháng này</option>
            <option value="last_month">Tháng trước</option>
            <option value="this_year">Năm nay</option>
            <option value="custom">Tùy chọn ngày...</option>
          </select>

          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
          >
            <option value="">Tất cả các ví</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          {period === 'custom' && (
            <div className="d-flex gap-1 align-items-center">
              <input
                type="date"
                className="form-control form-control-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
              <span className="text-muted">-</span>
              <input
                type="date"
                className="form-control form-control-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
              <button onClick={fetchReports} className="btn btn-sm btn-billet">Xem</button>
            </div>
          )}
        </div>
      </div>

      {/* 4 Overview Stat Cards (Figure 4.26) */}
      <div className="row g-3 mb-4">
        {/* Total Assets */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card-billet-dark p-4 h-100 d-flex flex-column justify-content-between">
            <div className="text-white-50 fw-medium mb-1" style={{ fontSize: '0.85rem' }}>Tổng tài sản</div>
            <h3 className="fw-bold text-white mb-0">{formatVND(overview?.totalAssets || 0)}</h3>
          </div>
        </div>

        {/* Total Income */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card-billet p-4 h-100 d-flex flex-column justify-content-between">
            <div className="text-muted fw-medium mb-1" style={{ fontSize: '0.85rem' }}>Tổng thu nhập</div>
            <h3 className="fw-bold text-success mb-0">{formatVND(overview?.totalIncome || 0)}</h3>
          </div>
        </div>

        {/* Total Expense */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card-billet p-4 h-100 d-flex flex-column justify-content-between">
            <div className="text-muted fw-medium mb-1" style={{ fontSize: '0.85rem' }}>Tổng chi tiêu</div>
            <h3 className="fw-bold text-danger mb-0">{formatVND(overview?.totalExpense || 0)}</h3>
          </div>
        </div>

        {/* Net Cashflow */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div className="card-billet p-4 h-100 d-flex flex-column justify-content-between">
            <div className="text-muted fw-medium mb-1" style={{ fontSize: '0.85rem' }}>Chênh lệch thu - chi</div>
            <h3 className={`fw-bold mb-0 ${(overview?.netAmount || 0) >= 0 ? 'text-primary' : 'text-danger'}`}>
              {(overview?.netAmount || 0) >= 0 ? '+' : ''}{formatVND(overview?.netAmount || 0)}
            </h3>
          </div>
        </div>
      </div>

      {/* Charts Row (Figure 4.26) */}
      <div className="row g-4 mb-4">
        {/* Pie / Donut Chart: Expense Breakdown */}
        <div className="col-12 col-lg-5">
          <div className="card-billet p-4 h-100">
            <h5 className="fw-bold text-dark mb-3">Cơ cấu chi tiêu</h5>
            {categoriesData.length === 0 ? (
              <div className="text-center py-5 text-muted" style={{ fontSize: '0.875rem' }}>
                Chưa có dữ liệu chi tiêu trong khoảng thời gian này
              </div>
            ) : (
              <div>
                <div style={{ height: 260, width: '100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoriesData}
                        dataKey="amount"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={categoriesData.length > 1 ? 3 : 0}
                      >
                        {categoriesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatVND(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend list */}
                <div className="d-flex flex-column gap-2 mt-3" style={{ fontSize: '0.85rem' }}>
                  {categoriesData.map((c, i) => (
                    <div key={c.id} className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: COLORS[i % COLORS.length]
                          }}
                        />
                        <span className="fw-medium text-dark">{c.name}</span>
                      </div>
                      <div>
                        <span className="fw-bold text-dark me-2">{formatVND(c.amount)}</span>
                        <span className="text-muted">({c.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bar Chart: Income vs Expense Trend */}
        <div className="col-12 col-lg-7">
          <div className="card-billet p-4 h-100">
            <h5 className="fw-bold text-dark mb-3">Xu hướng thu & chi</h5>
            {trendData.length === 0 ? (
              <div className="text-center py-5 text-muted" style={{ fontSize: '0.875rem' }}>
                Chưa có dữ liệu ghi chép thu chi trong khoảng thời gian này
              </div>
            ) : (
              <div style={{ height: 320, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trendData} margin={{ top: 20, right: 20, left: -10, bottom: 0 }}>
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `${val / 1000}k`} />
                    <Tooltip formatter={(val) => formatVND(val)} />
                    <Legend />
                    <Bar dataKey="income" name="Thu nhập" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Chi tiêu" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison with previous period (Figure 4.26) */}
      {comparison && (
        <div className="card-billet p-4">
          <h5 className="fw-bold text-dark mb-3">So sánh với kỳ liền trước</h5>
          <div className="row g-3 text-center">
            <div className="col-12 col-md-4">
              <div className="p-3 border rounded bg-light">
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>Thu nhập kỳ này vs kỳ trước</div>
                <div className="fs-5 fw-bold text-success my-1">
                  {formatVND(comparison.current.totalIncome)}
                  <small className="text-muted fw-normal fs-6"> vs {formatVND(comparison.previous.totalIncome)}</small>
                </div>
                <div className={`fw-semibold ${comparison.changes.incomeChange >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontSize: '0.85rem' }}>
                  {comparison.changes.incomeChange >= 0 ? '▲ Tăng' : '▼ Giảm'} {Math.abs(comparison.changes.incomeChange)}%
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 border rounded bg-light">
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>Chi tiêu kỳ này vs kỳ trước</div>
                <div className="fs-5 fw-bold text-danger my-1">
                  {formatVND(comparison.current.totalExpense)}
                  <small className="text-muted fw-normal fs-6"> vs {formatVND(comparison.previous.totalExpense)}</small>
                </div>
                <div className={`fw-semibold ${comparison.changes.expenseChange >= 0 ? 'text-danger' : 'text-success'}`} style={{ fontSize: '0.85rem' }}>
                  {comparison.changes.expenseChange >= 0 ? '▲ Tăng' : '▼ Giảm'} {Math.abs(comparison.changes.expenseChange)}%
                </div>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className="p-3 border rounded bg-light">
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>Chênh lệch ròng (Thu - Chi)</div>
                <div className="fs-5 fw-bold text-primary my-1">
                  {formatVND(comparison.current.netAmount)}
                </div>
                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                  Kỳ trước: {formatVND(comparison.previous.netAmount)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
