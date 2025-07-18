import React, { useState, useEffect } from 'react';
import { 
  FaMoneyBillWave, 
  FaWallet, 
  FaCalendarAlt, 
  FaChartLine,
  FaHistory,
  FaCreditCard,
  FaDownload,
  FaFilter,
  FaChevronDown,
  FaChevronUp
} from 'react-icons/fa';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { BsBank } from 'react-icons/bs';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const PaymentDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [timeframe, setTimeframe] = useState('monthly');
  const [showFilters, setShowFilters] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  // Mock data
  const paymentData = {
    balance: 4528.50,
    pending: 1250.00,
    lifetimeEarnings: 28750.00,
    bankAccounts: [
      { id: 1, name: 'Primary Account', bank: 'Chase Bank', last4: '3456' },
      { id: 2, name: 'Savings Account', bank: 'Bank of America', last4: '7890' }
    ],
    transactions: [
      { id: 1, date: '2023-07-15', amount: 1250.00, type: 'commission', status: 'completed' },
      { id: 2, date: '2023-07-10', amount: 850.00, type: 'bonus', status: 'completed' },
      { id: 3, date: '2023-07-05', amount: 450.00, type: 'commission', status: 'completed' },
      { id: 4, date: '2023-07-01', amount: 320.00, type: 'commission', status: 'pending' },
      { id: 5, date: '2023-06-28', amount: 680.00, type: 'bonus', status: 'completed' },
    ],
    monthlyData: [1250, 1850, 2200, 1750, 2100, 2400, 2800],
    weeklyData: [450, 680, 520, 750, 620, 890, 950],
    yearlyData: [12500, 18500, 22000, 17500, 21000, 24000, 28000, 32000, 35000, 38000, 42000, 45000]
  };

  // Chart data
  const chartData = {
    monthly: {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
      datasets: [
        {
          label: 'Monthly Earnings',
          data: paymentData.monthlyData,
          borderColor: 'rgba(99, 102, 241, 1)',
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    weekly: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
      datasets: [
        {
          label: 'Weekly Earnings',
          data: paymentData.weeklyData,
          borderColor: 'rgba(16, 185, 129, 1)',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.3,
          fill: true
        }
      ]
    },
    yearly: {
      labels: ['2023', '2024', '2025', '2026', '2027', '2028', '2029'],
      datasets: [
        {
          label: 'Yearly Earnings',
          data: paymentData.yearlyData,
          borderColor: 'rgba(245, 158, 11, 1)',
          backgroundColor: 'rgba(245, 158, 11, 0.2)',
          tension: 0.3,
          fill: true
        }
      ]
    }
  };

  const barChartData = {
    labels: ['Commissions', 'Bonuses', 'Team Overrides', 'Leadership Bonus'],
    datasets: [
      {
        label: 'Earnings Breakdown',
        data: [1850, 750, 620, 1200],
        backgroundColor: [
          'rgba(99, 102, 241, 0.7)',
          'rgba(16, 185, 129, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(239, 68, 68, 0.7)'
        ],
        borderColor: [
          'rgba(99, 102, 241, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(239, 68, 68, 1)'
        ],
        borderWidth: 1
      }
    ]
  };

  const handleWithdraw = (e) => {
    e.preventDefault();
    alert(`Withdrawal request of $${withdrawAmount} submitted to ${selectedBank}`);
    setWithdrawAmount('');
    setSelectedBank('');
    setShowWithdrawForm(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Payment Dashboard</h1>
          <div className="flex space-x-2">
            <button 
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
              onClick={() => setShowWithdrawForm(!showWithdrawForm)}
            >
              <FaMoneyBillWave className="mr-2" />
              {showWithdrawForm ? 'Cancel' : 'Withdraw'}
            </button>
            <button className="p-2 bg-white border rounded-lg hover:bg-gray-100">
              <FaDownload />
            </button>
          </div>
        </div>

        {/* Withdraw Form */}
        {showWithdrawForm && (
          <div className="bg-white p-6 rounded-xl shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">Withdraw Funds</h2>
            <form onSubmit={handleWithdraw}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Amount to Withdraw</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2">$</span>
                    <input
                      type="number"
                      className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="0.00"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      min="10"
                      max={paymentData.balance}
                      step="0.01"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Available balance: ${paymentData.balance.toFixed(2)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bank Account</label>
                  <select
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    required
                  >
                    <option value="">Select Bank Account</option>
                    {paymentData.bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.bank} ••••{account.last4})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  onClick={() => setShowWithdrawForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Submit Withdrawal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Available Balance</p>
                <h3 className="text-2xl font-bold mt-1">${paymentData.balance.toFixed(2)}</h3>
                <p className="text-green-500 text-sm mt-1">+12% from last month</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <FaWallet className="text-indigo-600 text-xl" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Pending Payments</p>
                <h3 className="text-2xl font-bold mt-1">${paymentData.pending.toFixed(2)}</h3>
                <p className="text-blue-500 text-sm mt-1">Clears in 3 days</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <FaMoneyBillWave className="text-blue-600 text-xl" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500">Lifetime Earnings</p>
                <h3 className="text-2xl font-bold mt-1">${paymentData.lifetimeEarnings.toFixed(2)}</h3>
                <p className="text-purple-500 text-sm mt-1">Since 2021</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <FaChartLine className="text-purple-600 text-xl" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b mb-6">
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'overview' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'transactions' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('transactions')}
          >
            Transactions
          </button>
          <button
            className={`px-4 py-2 font-medium ${activeTab === 'bankAccounts' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('bankAccounts')}
          >
            Bank Accounts
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Timeframe Selector */}
            <div className="bg-white p-4 rounded-xl shadow-md flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Earnings Analytics</h3>
                <p className="text-sm text-gray-500">Track your payment history</p>
              </div>
              <div className="flex space-x-2">
                <button
                  className={`px-3 py-1 rounded-lg ${timeframe === 'weekly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  onClick={() => setTimeframe('weekly')}
                >
                  Weekly
                </button>
                <button
                  className={`px-3 py-1 rounded-lg ${timeframe === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  onClick={() => setTimeframe('monthly')}
                >
                  Monthly
                </button>
                <button
                  className={`px-3 py-1 rounded-lg ${timeframe === 'yearly' ? 'bg-indigo-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                  onClick={() => setTimeframe('yearly')}
                >
                  Yearly
                </button>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-semibold mb-4">Earnings Trend</h3>
                <div className="h-64">
                  <Line 
                    data={chartData[timeframe]}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                          }
                        },
                        x: {
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-semibold mb-4">Earnings Breakdown</h3>
                <div className="h-64">
                  <Bar 
                    data={barChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                          }
                        },
                        x: {
                          grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Recent Transactions</h3>
                <button 
                  className="text-indigo-600 hover:text-indigo-800 flex items-center"
                  onClick={() => setActiveTab('transactions')}
                >
                  View All <FaChevronDown className="ml-1" />
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3">Date</th>
                      <th className="text-left py-3">Type</th>
                      <th className="text-left py-3">Amount</th>
                      <th className="text-left py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentData.transactions.slice(0, 5).map(transaction => (
                      <tr key={transaction.id} className="border-b last:border-0">
                        <td className="py-3">{new Date(transaction.date).toLocaleDateString()}</td>
                        <td className="py-3 capitalize">{transaction.type}</td>
                        <td className="py-3 font-medium">${transaction.amount.toFixed(2)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold">Transaction History</h3>
              <div className="flex space-x-3">
                <button 
                  className="px-3 py-1 bg-gray-100 rounded-lg flex items-center hover:bg-gray-200"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <FaFilter className="mr-2" />
                  Filters {showFilters ? <FaChevronUp className="ml-1" /> : <FaChevronDown className="ml-1" />}
                </button>
                <button className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200">
                  <FaDownload />
                </button>
              </div>
            </div>

            {showFilters && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date Range</label>
                    <select className="w-full px-3 py-2 border rounded-lg">
                      <option>All Time</option>
                      <option>This Month</option>
                      <option>Last Month</option>
                      <option>Custom Range</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select className="w-full px-3 py-2 border rounded-lg">
                      <option>All Types</option>
                      <option>Commission</option>
                      <option>Bonus</option>
                      <option>Withdrawal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select className="w-full px-3 py-2 border rounded-lg">
                      <option>All Statuses</option>
                      <option>Completed</option>
                      <option>Pending</option>
                      <option>Failed</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full">
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3">Date</th>
                    <th className="text-left py-3">Transaction ID</th>
                    <th className="text-left py-3">Type</th>
                    <th className="text-left py-3">Amount</th>
                    <th className="text-left py-3">Status</th>
                    <th className="text-left py-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentData.transactions.map(transaction => (
                    <tr key={transaction.id} className="border-b hover:bg-gray-50 last:border-0">
                      <td className="py-3">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className="py-3 text-gray-500">#{transaction.id.toString().padStart(6, '0')}</td>
                      <td className="py-3 capitalize">{transaction.type}</td>
                      <td className="py-3 font-medium">${transaction.amount.toFixed(2)}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="text-indigo-600 hover:text-indigo-800">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'bankAccounts' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold">Bank Accounts</h3>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
                  <BsBank className="mr-2" />
                  Add New Account
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {paymentData.bankAccounts.map(account => (
                  <div key={account.id} className="border rounded-xl p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium">{account.name}</h4>
                        <p className="text-gray-500">{account.bank}</p>
                      </div>
                      <div className="bg-indigo-100 p-2 rounded-lg">
                        <FaCreditCard className="text-indigo-600" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Account Number</span>
                        <span>•••• {account.last4}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Primary</span>
                        <span>{account.id === 1 ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Added On</span>
                        <span>Jan 15, 2023</span>
                      </div>
                    </div>
                    <div className="flex space-x-3 mt-6">
                      <button className="px-3 py-1 border rounded-lg hover:bg-gray-100">
                        Edit
                      </button>
                      <button className="px-3 py-1 border rounded-lg hover:bg-gray-100 text-red-600">
                        Remove
                      </button>
                      {account.id !== 1 && (
                        <button className="px-3 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                          Set as Primary
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="font-semibold mb-4">Withdrawal History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3">Date</th>
                      <th className="text-left py-3">Amount</th>
                      <th className="text-left py-3">Bank Account</th>
                      <th className="text-left py-3">Status</th>
                      <th className="text-left py-3">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3">Jul 10, 2023</td>
                      <td className="py-3 font-medium">$1,250.00</td>
                      <td className="py-3">Primary Account (••••3456)</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="text-indigo-600 hover:text-indigo-800">
                          Download
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3">Jun 15, 2023</td>
                      <td className="py-3 font-medium">$850.00</td>
                      <td className="py-3">Savings Account (••••7890)</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="text-indigo-600 hover:text-indigo-800">
                          Download
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50">
                      <td className="py-3">May 28, 2023</td>
                      <td className="py-3 font-medium">$1,500.00</td>
                      <td className="py-3">Primary Account (••••3456)</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                      <td className="py-3">
                        <button className="text-indigo-600 hover:text-indigo-800">
                          Download
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDashboard;