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
  FaChevronUp,
  FaSpinner,
  FaExclamationTriangle,
  FaPlus,
  FaEdit,
  FaTrash
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
import { useUser } from '../../../context/UserContext';
import { 
  formatCurrency, 
  formatDate, 
  getTransactionStatusColor, 
  getTransactionTypeLabel,
  validateWithdrawalAmount,
  validateBankAccount,
  getEarningsGrowth,
  maskAccountNumber
} from '../../../utils/paymentUtils';

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
  const { currentUser, paymentData, paymentLoading, submitWithdrawalRequest, addBankAccount, updateBankAccount, deleteBankAccount } = useUser();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [timeframe, setTimeframe] = useState('monthly');
  const [showFilters, setShowFilters] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showBankForm, setShowBankForm] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [withdrawalError, setWithdrawalError] = useState('');
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [bankFormData, setBankFormData] = useState({
    accountName: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    accountType: 'checking'
  });
  const [bankFormErrors, setBankFormErrors] = useState({});
  const [filterOptions, setFilterOptions] = useState({
    dateRange: 'all',
    type: 'all',
    status: 'all'
  });

  // Reset form when closing
  useEffect(() => {
    if (!showWithdrawForm) {
      setWithdrawAmount('');
      setSelectedBank('');
      setWithdrawalError('');
    }
  }, [showWithdrawForm]);

  useEffect(() => {
    if (!showBankForm) {
      setBankFormData({
        accountName: '',
        bankName: '',
        accountNumber: '',
        routingNumber: '',
        accountType: 'checking'
      });
      setBankFormErrors({});
      setEditingBank(null);
    }
  }, [showBankForm]);

  // Generate chart data from real payment data
  const getChartData = () => {
    if (!paymentData?.analytics) {
      return {
        monthly: { labels: [], datasets: [] },
        weekly: { labels: [], datasets: [] },
        yearly: { labels: [], datasets: [] }
      };
    }

    const { monthlyData, weeklyData, yearlyData } = paymentData.analytics;

    return {
      monthly: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        datasets: [
          {
            label: 'Monthly Earnings',
            data: monthlyData,
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
            data: weeklyData,
            borderColor: 'rgba(16, 185, 129, 1)',
            backgroundColor: 'rgba(16, 185, 129, 0.2)',
            tension: 0.3,
            fill: true
          }
        ]
      },
      yearly: {
        labels: ['2018', '2019', '2020', '2021', '2022', '2023', '2024'],
        datasets: [
          {
            label: 'Yearly Earnings',
            data: yearlyData,
            borderColor: 'rgba(245, 158, 11, 1)',
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            tension: 0.3,
            fill: true
          }
        ]
      }
    };
  };

  const getBarChartData = () => {
    if (!paymentData?.analytics?.earningsBreakdown) {
      return { labels: [], datasets: [] };
    }

    const { earningsBreakdown } = paymentData.analytics;

    return {
      labels: ['Commissions', 'Bonuses', 'Team Overrides', 'Leadership Bonus'],
      datasets: [
        {
          label: 'Earnings Breakdown',
          data: [
            earningsBreakdown.commissions,
            earningsBreakdown.bonuses,
            earningsBreakdown.teamOverrides,
            earningsBreakdown.leadershipBonus
          ],
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
  };

  const chartData = getChartData();
  const barChartData = getBarChartData();

  const handleWithdraw = async (e) => {
    e.preventDefault();
    setWithdrawalError('');
    
    // Validate withdrawal amount
    const validation = validateWithdrawalAmount(withdrawAmount, paymentData?.balance || 0);
    if (!validation.isValid) {
      setWithdrawalError(validation.error);
      return;
    }

    if (!selectedBank) {
      setWithdrawalError('Please select a bank account');
      return;
    }

    setWithdrawalLoading(true);
    try {
      await submitWithdrawalRequest({
        amount: parseFloat(withdrawAmount),
        bankAccountId: selectedBank
      });
      
      setWithdrawAmount('');
      setSelectedBank('');
      setShowWithdrawForm(false);
      alert('Withdrawal request submitted successfully!');
    } catch (error) {
      setWithdrawalError(error.message || 'Failed to submit withdrawal request');
    } finally {
      setWithdrawalLoading(false);
    }
  };

  const handleBankAccountSubmit = async (e) => {
    e.preventDefault();
    
    // Validate form data
    const validation = validateBankAccount(bankFormData);
    if (!validation.isValid) {
      setBankFormErrors(validation.errors);
      return;
    }

    try {
      if (editingBank) {
        await updateBankAccount(editingBank.id, bankFormData);
        alert('Bank account updated successfully!');
      } else {
        await addBankAccount(bankFormData);
        alert('Bank account added successfully!');
      }
      setShowBankForm(false);
    } catch (error) {
      alert(error.message || 'Failed to save bank account');
    }
  };

  const handleDeleteBankAccount = async (accountId) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      try {
        await deleteBankAccount(accountId);
        alert('Bank account deleted successfully!');
      } catch (error) {
        alert(error.message || 'Failed to delete bank account');
      }
    }
  };

  const handleEditBankAccount = (account) => {
    setEditingBank(account);
    setBankFormData({
      accountName: account.accountName || '',
      bankName: account.bankName || '',
      accountNumber: account.accountNumber || '',
      routingNumber: account.routingNumber || '',
      accountType: account.accountType || 'checking'
    });
    setShowBankForm(true);
  };

  const getFilteredTransactions = () => {
    if (!paymentData?.transactions) return [];
    
    return paymentData.transactions.filter(transaction => {
      // Date filter
      if (filterOptions.dateRange !== 'all') {
        const transactionDate = new Date(transaction.date);
        const now = new Date();
        
        switch (filterOptions.dateRange) {
          case 'thisMonth':
            if (transactionDate.getMonth() !== now.getMonth() || 
                transactionDate.getFullYear() !== now.getFullYear()) return false;
            break;
          case 'lastMonth':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            if (transactionDate.getMonth() !== lastMonth.getMonth() || 
                transactionDate.getFullYear() !== lastMonth.getFullYear()) return false;
            break;
        }
      }
      
      // Type filter
      if (filterOptions.type !== 'all' && transaction.type !== filterOptions.type) {
        return false;
      }
      
      // Status filter
      if (filterOptions.status !== 'all' && transaction.status !== filterOptions.status) {
        return false;
      }
      
      return true;
    });
  };

  // Show loading state
  if (paymentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payment data...</p>
        </div>
      </div>
    );
  }

  // Show error state if no payment data and user is not an affiliate
  if (!currentUser?.affiliateStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaExclamationTriangle className="text-4xl text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Affiliate Access Required</h2>
          <p className="text-gray-600">You need to be an active affiliate to access the payment dashboard.</p>
        </div>
      </div>
    );
  }

  // Default values if no payment data
  const balance = paymentData?.balance || 0;
  const pending = paymentData?.pending || 0;
  const lifetimeEarnings = paymentData?.lifetimeEarnings || 0;
  const transactions = getFilteredTransactions();
  const bankAccounts = paymentData?.bankAccounts || [];
  const withdrawalRequests = paymentData?.withdrawalRequests || [];

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
            {withdrawalError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {withdrawalError}
              </div>
            )}
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
                      max={balance}
                      step="0.01"
                      required
                      disabled={withdrawalLoading}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Available balance: {formatCurrency(balance)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bank Account</label>
                  <select
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={selectedBank}
                    onChange={(e) => setSelectedBank(e.target.value)}
                    required
                    disabled={withdrawalLoading}
                  >
                    <option value="">Select Bank Account</option>
                    {bankAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.accountName} ({account.bankName} ••••{maskAccountNumber(account.accountNumber, 4)})
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
                  disabled={withdrawalLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                  disabled={withdrawalLoading}
                >
                  {withdrawalLoading && <FaSpinner className="animate-spin mr-2" />}
                  Submit Withdrawal
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Bank Account Form */}
        {showBankForm && (
          <div className="bg-white p-6 rounded-xl shadow-md mb-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingBank ? 'Edit Bank Account' : 'Add Bank Account'}
            </h2>
            <form onSubmit={handleBankAccountSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Account Name</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      bankFormErrors.accountName ? 'border-red-500' : ''
                    }`}
                    placeholder="Primary Checking"
                    value={bankFormData.accountName}
                    onChange={(e) => setBankFormData({...bankFormData, accountName: e.target.value})}
                    required
                  />
                  {bankFormErrors.accountName && (
                    <p className="text-red-500 text-xs mt-1">{bankFormErrors.accountName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Bank Name</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      bankFormErrors.bankName ? 'border-red-500' : ''
                    }`}
                    placeholder="Chase Bank"
                    value={bankFormData.bankName}
                    onChange={(e) => setBankFormData({...bankFormData, bankName: e.target.value})}
                    required
                  />
                  {bankFormErrors.bankName && (
                    <p className="text-red-500 text-xs mt-1">{bankFormErrors.bankName}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Account Number</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      bankFormErrors.accountNumber ? 'border-red-500' : ''
                    }`}
                    placeholder="123456789"
                    value={bankFormData.accountNumber}
                    onChange={(e) => setBankFormData({...bankFormData, accountNumber: e.target.value})}
                    required
                  />
                  {bankFormErrors.accountNumber && (
                    <p className="text-red-500 text-xs mt-1">{bankFormErrors.accountNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Routing Number</label>
                  <input
                    type="text"
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      bankFormErrors.routingNumber ? 'border-red-500' : ''
                    }`}
                    placeholder="021000021"
                    value={bankFormData.routingNumber}
                    onChange={(e) => setBankFormData({...bankFormData, routingNumber: e.target.value})}
                    required
                  />
                  {bankFormErrors.routingNumber && (
                    <p className="text-red-500 text-xs mt-1">{bankFormErrors.routingNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Account Type</label>
                  <select
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={bankFormData.accountType}
                    onChange={(e) => setBankFormData({...bankFormData, accountType: e.target.value})}
                  >
                    <option value="checking">Checking</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                  onClick={() => setShowBankForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  {editingBank ? 'Update Account' : 'Add Account'}
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
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(balance)}</h3>
                <p className="text-green-500 text-sm mt-1">Ready for withdrawal</p>
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
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(pending)}</h3>
                <p className="text-blue-500 text-sm mt-1">Processing</p>
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
                <h3 className="text-2xl font-bold mt-1">{formatCurrency(lifetimeEarnings)}</h3>
                <p className="text-purple-500 text-sm mt-1">Total earned</p>
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
                {transactions.length > 0 ? (
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
                      {transactions.slice(0, 5).map(transaction => (
                        <tr key={transaction.id} className="border-b last:border-0">
                          <td className="py-3">{formatDate(transaction.date, 'short')}</td>
                          <td className="py-3">{getTransactionTypeLabel(transaction.type)}</td>
                          <td className="py-3 font-medium">{formatCurrency(transaction.amount)}</td>
                          <td className="py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${getTransactionStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaHistory className="mx-auto text-3xl mb-2" />
                    <p>No transactions yet</p>
                  </div>
                )}
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
                    <select 
                      className="w-full px-3 py-2 border rounded-lg"
                      value={filterOptions.dateRange}
                      onChange={(e) => setFilterOptions({...filterOptions, dateRange: e.target.value})}
                    >
                      <option value="all">All Time</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Type</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-lg"
                      value={filterOptions.type}
                      onChange={(e) => setFilterOptions({...filterOptions, type: e.target.value})}
                    >
                      <option value="all">All Types</option>
                      <option value="commission">Commission</option>
                      <option value="bonus">Bonus</option>
                      <option value="team_override">Team Override</option>
                      <option value="leadership_bonus">Leadership Bonus</option>
                      <option value="withdrawal_request">Withdrawal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Status</label>
                    <select 
                      className="w-full px-3 py-2 border rounded-lg"
                      value={filterOptions.status}
                      onChange={(e) => setFilterOptions({...filterOptions, status: e.target.value})}
                    >
                      <option value="all">All Statuses</option>
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="failed">Failed</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button 
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 w-full"
                      onClick={() => {/* Filters are applied automatically */}}
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              {transactions.length > 0 ? (
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
                    {transactions.map(transaction => (
                      <tr key={transaction.id} className="border-b hover:bg-gray-50 last:border-0">
                        <td className="py-3">{formatDate(transaction.date, 'short')}</td>
                        <td className="py-3 text-gray-500">#{transaction.id.substring(0, 8)}</td>
                        <td className="py-3">{getTransactionTypeLabel(transaction.type)}</td>
                        <td className="py-3 font-medium">{formatCurrency(transaction.amount)}</td>
                        <td className="py-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${getTransactionStatusColor(transaction.status)}`}>
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
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FaHistory className="mx-auto text-3xl mb-2" />
                  <p>No transactions found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'bankAccounts' && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-semibold">Bank Accounts</h3>
                <button 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
                  onClick={() => setShowBankForm(true)}
                >
                  <FaPlus className="mr-2" />
                  Add New Account
                </button>
              </div>

              {bankAccounts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {bankAccounts.map((account, index) => (
                    <div key={account.id} className="border rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h4 className="font-medium">{account.accountName}</h4>
                          <p className="text-gray-500">{account.bankName}</p>
                        </div>
                        <div className="bg-indigo-100 p-2 rounded-lg">
                          <FaCreditCard className="text-indigo-600" />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Account Number</span>
                          <span>{maskAccountNumber(account.accountNumber)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Account Type</span>
                          <span className="capitalize">{account.accountType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Added On</span>
                          <span>{formatDate(account.createdAt, 'short')}</span>
                        </div>
                      </div>
                      <div className="flex space-x-3 mt-6">
                        <button 
                          className="px-3 py-1 border rounded-lg hover:bg-gray-100 flex items-center"
                          onClick={() => handleEditBankAccount(account)}
                        >
                          <FaEdit className="mr-1" />
                          Edit
                        </button>
                        <button 
                          className="px-3 py-1 border rounded-lg hover:bg-gray-100 text-red-600 flex items-center"
                          onClick={() => handleDeleteBankAccount(account.id)}
                        >
                          <FaTrash className="mr-1" />
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BsBank className="mx-auto text-3xl mb-2" />
                  <p>No bank accounts added yet</p>
                  <button 
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    onClick={() => setShowBankForm(true)}
                  >
                    Add Your First Account
                  </button>
                </div>
              )}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="font-semibold mb-4">Withdrawal History</h3>
              <div className="overflow-x-auto">
                {withdrawalRequests.length > 0 ? (
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3">Date</th>
                        <th className="text-left py-3">Amount</th>
                        <th className="text-left py-3">Bank Account</th>
                        <th className="text-left py-3">Status</th>
                        <th className="text-left py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {withdrawalRequests.map(withdrawal => {
                        const bankAccount = bankAccounts.find(acc => acc.id === withdrawal.bankAccountId);
                        return (
                          <tr key={withdrawal.id} className="border-b hover:bg-gray-50 last:border-0">
                            <td className="py-3">{formatDate(withdrawal.requestedAt, 'short')}</td>
                            <td className="py-3 font-medium">{formatCurrency(withdrawal.amount)}</td>
                            <td className="py-3">
                              {bankAccount ? 
                                `${bankAccount.accountName} (${maskAccountNumber(bankAccount.accountNumber)})` : 
                                'Account Removed'
                              }
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${getTransactionStatusColor(withdrawal.status)}`}>
                                {withdrawal.status}
                              </span>
                            </td>
                            <td className="py-3">
                              <button className="text-indigo-600 hover:text-indigo-800">
                                View Details
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FaHistory className="mx-auto text-3xl mb-2" />
                    <p>No withdrawal history yet</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentDashboard;