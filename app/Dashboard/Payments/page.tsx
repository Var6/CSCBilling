'use client';
import React, { useEffect, useState } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Car, Users, Wrench, Calendar, Filter, Download, Eye, ChevronDown, ArrowUpRight, ArrowDownRight, CreditCard, Wallet } from 'lucide-react';

export default function PaymentsPage() {
  const [timeFilter, setTimeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [driverFilter, setDriverFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(false);

  // Mock data - Replace with actual API calls
  const [financialData, setFinancialData] = useState({
    summary: {
      totalIncome: 125430.50,
      totalExpenses: 68920.30,
      netProfit: 56510.20,
      tripRevenue: 98450.00,
      otherIncome: 26980.50
    },
    expenses: {
      salaries: 35000,
      servicing: 12500,
      fuel: 8920,
      maintenance: 6800,
      insurance: 3200,
      other: 2500.30
    }
  });

  const [transactions, setTransactions] = useState([
    {
      id: 'TXN001',
      date: '2025-01-22',
      type: 'income',
      category: 'Trip Revenue',
      description: 'Trip #12345 - Airport Transfer',
      driver: 'John Doe',
      vehicle: 'Toyota Camry - ABC123',
      amount: 450.00,
      status: 'completed'
    },
    {
      id: 'TXN002',
      date: '2025-01-22',
      type: 'expense',
      category: 'Fuel',
      description: 'Fuel refill - Shell Station',
      driver: 'Mike Smith',
      vehicle: 'Honda Accord - XYZ789',
      amount: 85.50,
      status: 'paid'
    },
    {
      id: 'TXN003',
      date: '2025-01-21',
      type: 'expense',
      category: 'Salary',
      description: 'Weekly salary - Driver',
      driver: 'John Doe',
      vehicle: '-',
      amount: 800.00,
      status: 'paid'
    },
    {
      id: 'TXN004',
      date: '2025-01-21',
      type: 'income',
      category: 'Trip Revenue',
      description: 'Trip #12346 - City Tour',
      driver: 'Sarah Johnson',
      vehicle: 'BMW 5 Series - DEF456',
      amount: 680.00,
      status: 'completed'
    },
    {
      id: 'TXN005',
      date: '2025-01-20',
      type: 'expense',
      category: 'Servicing',
      description: 'Oil change & tire rotation',
      driver: '-',
      vehicle: 'Toyota Camry - ABC123',
      amount: 320.00,
      status: 'paid'
    },
    {
      id: 'TXN006',
      date: '2025-01-20',
      type: 'expense',
      category: 'Maintenance',
      description: 'Brake pad replacement',
      driver: '-',
      vehicle: 'Honda Accord - XYZ789',
      amount: 450.00,
      status: 'paid'
    },
    {
      id: 'TXN007',
      date: '2025-01-19',
      type: 'income',
      category: 'Trip Revenue',
      description: 'Trip #12347 - Business Meeting',
      driver: 'Mike Smith',
      vehicle: 'Honda Accord - XYZ789',
      amount: 290.00,
      status: 'completed'
    },
    {
      id: 'TXN008',
      date: '2025-01-18',
      type: 'expense',
      category: 'Insurance',
      description: 'Monthly insurance premium',
      driver: '-',
      vehicle: 'All Vehicles',
      amount: 1200.00,
      status: 'paid'
    }
  ]);

  const [driverEarnings, setDriverEarnings] = useState([
    { name: 'John Doe', trips: 45, revenue: 12450.00, salary: 3200.00, net: 9250.00 },
    { name: 'Mike Smith', trips: 38, revenue: 10890.00, salary: 3200.00, net: 7690.00 },
    { name: 'Sarah Johnson', trips: 52, revenue: 15670.00, salary: 3200.00, net: 12470.00 },
    { name: 'David Lee', trips: 31, revenue: 8920.00, salary: 3200.00, net: 5720.00 }
  ]);

  const [vehicleExpenses, setVehicleExpenses] = useState([
    { vehicle: 'Toyota Camry - ABC123', fuel: 2450.00, servicing: 850.00, maintenance: 1200.00, total: 4500.00 },
    { vehicle: 'Honda Accord - XYZ789', fuel: 2180.00, servicing: 920.00, maintenance: 450.00, total: 3550.00 },
    { vehicle: 'BMW 5 Series - DEF456', fuel: 3120.00, servicing: 1450.00, maintenance: 2100.00, total: 6670.00 },
    { vehicle: 'Mercedes E-Class - GHI789', fuel: 2890.00, servicing: 1180.00, maintenance: 890.00, total: 4960.00 }
  ]);

  const getTimeFilterLabel = () => {
    switch(timeFilter) {
      case '6months': return 'Last 6 Months';
      case '1year': return 'Last 1 Year';
      case 'financial': return 'Financial Year (Apr 2024 - Mar 2025)';
      default: return 'All Time';
    }
  };

  const profitMargin = ((financialData.summary.netProfit / financialData.summary.totalIncome) * 100).toFixed(1);

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: '#F8F9FA' }}>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: '#1A2332' }}>Payments & Financial Overview</h1>
          <p style={{ color: '#5A6C7D' }}>Track income, expenses, and financial performance</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium border hover:bg-gray-50 transition-all" style={{ borderColor: '#E5E7EB', color: '#5A6C7D' }}>
            <Download className="w-5 h-5" />
            Export Report
          </button>
        </div>
      </div>

      {/* Time Filter */}
      <div className="mb-6 flex items-center gap-4">
        <span className="font-medium" style={{ color: '#5A6C7D' }}>Time Period:</span>
        <div className="flex gap-2">
          {['all', '6months', '1year', 'financial'].map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${timeFilter === filter ? 'text-white' : ''}`}
              style={{
                background: timeFilter === filter ? 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' : 'white',
                border: '1px solid #E5E7EB',
                color: timeFilter === filter ? '#FFFFFF' : '#5A6C7D'
              }}
            >
              {filter === 'all' ? 'All Time' : filter === '6months' ? '6 Months' : filter === '1year' ? '1 Year' : 'Financial Year'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Income */}
        <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#DBEAFE' }}>
              <TrendingUp className="w-6 h-6" style={{ color: '#2563EB' }} />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium" style={{ color: '#10B981' }}>
              <ArrowUpRight className="w-4 h-4" />
              12.5%
            </div>
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: '#1A2332' }}>
            ${financialData.summary.totalIncome.toLocaleString()}
          </div>
          <div className="text-sm" style={{ color: '#5A6C7D' }}>Total Income</div>
        </div>

        {/* Total Expenses */}
        <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
              <TrendingDown className="w-6 h-6" style={{ color: '#EF4444' }} />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium" style={{ color: '#EF4444' }}>
              <ArrowDownRight className="w-4 h-4" />
              8.3%
            </div>
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: '#1A2332' }}>
            ${financialData.summary.totalExpenses.toLocaleString()}
          </div>
          <div className="text-sm" style={{ color: '#5A6C7D' }}>Total Expenses</div>
        </div>

        {/* Net Profit */}
        <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#D1FAE5' }}>
              <DollarSign className="w-6 h-6" style={{ color: '#10B981' }} />
            </div>
            <div className="flex items-center gap-1 text-sm font-medium" style={{ color: '#10B981' }}>
              <ArrowUpRight className="w-4 h-4" />
              18.2%
            </div>
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: '#1A2332' }}>
            ${financialData.summary.netProfit.toLocaleString()}
          </div>
          <div className="text-sm" style={{ color: '#5A6C7D' }}>Net Profit</div>
        </div>

        {/* Profit Margin */}
        <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
              <Wallet className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
            <div className="text-sm font-medium" style={{ color: '#5A6C7D' }}>Margin</div>
          </div>
          <div className="text-2xl font-bold mb-1" style={{ color: '#1A2332' }}>
            {profitMargin}%
          </div>
          <div className="text-sm" style={{ color: '#5A6C7D' }}>Profit Margin</div>
        </div>
      </div>

      {/* Income vs Expenses Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Income Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Income Breakdown</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#2563EB' }}></div>
                <span style={{ color: '#5A6C7D' }}>Trip Revenue</span>
              </div>
              <span className="font-semibold" style={{ color: '#1A2332' }}>
                ${financialData.summary.tripRevenue.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }}></div>
                <span style={{ color: '#5A6C7D' }}>Other Income</span>
              </div>
              <span className="font-semibold" style={{ color: '#1A2332' }}>
                ${financialData.summary.otherIncome.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Expenses Breakdown */}
        <div className="bg-white rounded-xl shadow-sm p-6" style={{ border: '1px solid #E5E7EB' }}>
          <h3 className="text-lg font-bold mb-4" style={{ color: '#1A2332' }}>Expense Breakdown</h3>
          <div className="space-y-3">
            {Object.entries(financialData.expenses).map(([key, value], idx) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#F8F9FA' }}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#6B7280'][idx] }}></div>
                  <span style={{ color: '#5A6C7D' }}>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                </div>
                <span className="font-semibold" style={{ color: '#1A2332' }}>
                  ${value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Driver Earnings Table */}
      <div className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-lg font-bold" style={{ color: '#1A2332' }}>Driver Earnings & Payments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F8F9FA' }}>
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Driver Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Total Trips</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Revenue Generated</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Salary Paid</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Net Contribution</th>
              </tr>
            </thead>
            <tbody>
              {driverEarnings.map((driver, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-6 py-4 font-medium" style={{ color: '#1A2332' }}>{driver.name}</td>
                  <td className="px-6 py-4" style={{ color: '#5A6C7D' }}>{driver.trips}</td>
                  <td className="px-6 py-4 font-semibold" style={{ color: '#10B981' }}>
                    ${driver.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-semibold" style={{ color: '#EF4444' }}>
                    ${driver.salary.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-bold" style={{ color: '#2563EB' }}>
                    ${driver.net.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vehicle Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm mb-8 overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
        <div className="p-6 border-b" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-lg font-bold" style={{ color: '#1A2332' }}>Vehicle Expenses</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F8F9FA' }}>
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Vehicle</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Fuel Costs</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Servicing</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Maintenance</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Total Expenses</th>
              </tr>
            </thead>
            <tbody>
              {vehicleExpenses.map((vehicle, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-6 py-4 font-medium" style={{ color: '#1A2332' }}>{vehicle.vehicle}</td>
                  <td className="px-6 py-4" style={{ color: '#5A6C7D' }}>${vehicle.fuel.toLocaleString()}</td>
                  <td className="px-6 py-4" style={{ color: '#5A6C7D' }}>${vehicle.servicing.toLocaleString()}</td>
                  <td className="px-6 py-4" style={{ color: '#5A6C7D' }}>${vehicle.maintenance.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold" style={{ color: '#EF4444' }}>
                    ${vehicle.total.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: '#E5E7EB' }}>
          <h3 className="text-lg font-bold" style={{ color: '#1A2332' }}>Recent Transactions</h3>
          <div className="flex gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ border: '1px solid #E5E7EB', color: '#5A6C7D' }}
            >
              <option value="all">All Categories</option>
              <option value="Trip Revenue">Trip Revenue</option>
              <option value="Fuel">Fuel</option>
              <option value="Salary">Salary</option>
              <option value="Servicing">Servicing</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: '#F8F9FA' }}>
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Transaction ID</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Category</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Description</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Driver/Vehicle</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Amount</th>
                <th className="text-left px-6 py-4 text-sm font-semibold" style={{ color: '#5A6C7D' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((txn, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: '#E5E7EB' }}>
                  <td className="px-6 py-4 font-medium" style={{ color: '#2563EB' }}>{txn.id}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#5A6C7D' }}>{txn.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${txn.type === 'income' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {txn.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#5A6C7D' }}>{txn.description}</td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#5A6C7D' }}>
                    <div>{txn.driver}</div>
                    {txn.vehicle !== '-' && <div className="text-xs" style={{ color: '#9CA3AF' }}>{txn.vehicle}</div>}
                  </td>
                  <td className={`px-6 py-4 font-bold ${txn.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {txn.type === 'income' ? '+' : '-'}${txn.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}