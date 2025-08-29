import React, { useState, useEffect } from 'react';
import { 
  FaDownload, 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaSpinner,
  FaFilter,
  FaSearch,
  FaRupeeSign,
  FaUsers,
  FaCalendarAlt,
  FaFileExport,
  FaExclamationTriangle,
  FaNetworkWired,
  FaUndo
} from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import PayoutService from '../../../services/payoutService';

const PayoutManagement = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filteredPayouts, setFilteredPayouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [generatingPayouts, setGeneratingPayouts] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [statistics, setStatistics] = useState({
    totalPayouts: 0,
    totalAmount: 0,
    pendingPayouts: 0,
    completedPayouts: 0,
    averagePayout: 0
  });
  const [excludedUsers, setExcludedUsers] = useState([]);
  const [payoutSummary, setPayoutSummary] = useState(null);
  const [showExcludedUsers, setShowExcludedUsers] = useState(false);
  const [resettingNetwork, setResettingNetwork] = useState(false);
  const [showResetNetworkDialog, setShowResetNetworkDialog] = useState(false);

  // Fetch payouts on component mount
  useEffect(() => {
    fetchPayouts();
  }, []);

  // Filter payouts based on search and status
  useEffect(() => {
    let filtered = payouts;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payout => payout.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(payout => 
        payout.userName?.toLowerCase().includes(term) ||
        payout.userEmail?.toLowerCase().includes(term) ||
        payout.userReferralCode?.toLowerCase().includes(term) ||
        payout.id?.toLowerCase().includes(term)
      );
    }

    setFilteredPayouts(filtered);
  }, [payouts, searchTerm, statusFilter]);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const payoutsData = await PayoutService.getAllPayouts();
      setPayouts(payoutsData);
      
      // Calculate statistics
      const stats = await PayoutService.getPayoutStatistics();
      setStatistics(stats);
      
      // Get excluded users and payout summary
      const excludedUsersData = await PayoutService.getExcludedUsers();
      setExcludedUsers(excludedUsersData);
      
      const summaryData = await PayoutService.getPayoutGenerationSummary();
      setPayoutSummary(summaryData);
    } catch (err) {
      console.error('Error fetching payouts:', err);
      setError('Failed to load payouts');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (payoutId, newStatus) => {
    try {
      setUpdatingStatus(true);
      await PayoutService.updatePayoutStatus(payoutId, newStatus);
      
      // Update local state
      setPayouts(prev => prev.map(payout => 
        payout.id === payoutId 
          ? { ...payout, status: newStatus, updatedAt: new Date() }
          : payout
      ));
      
      // Refresh statistics
      const stats = await PayoutService.getPayoutStatistics();
      setStatistics(stats);
    } catch (err) {
      console.error('Error updating payout status:', err);
      setError('Failed to update payout status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportPayouts = () => {
    try {
      // Only export completed payouts, exclude rejected ones
      const completedPayouts = payouts.filter(payout => payout.status === 'completed');
      
      if (completedPayouts.length === 0) {
        setError('No completed payouts to export');
        return;
      }
      
      PayoutService.exportPayoutsToCSV(completedPayouts);
      setSuccessMessage(`✅ Successfully exported ${completedPayouts.length} completed payouts!`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      console.error('Error exporting payouts:', err);
      setError('Failed to export payouts');
    }
  };

  const handleGeneratePayouts = async () => {
    try {
      setGeneratingPayouts(true);
      setError(null);
      setSuccessMessage('');
      setShowConfirmDialog(false);
      
      const result = await PayoutService.generateAutomaticPayouts();
      
      if (result.payouts && result.payouts.length > 0) {
        // Refresh payouts list
        await fetchPayouts();
        setSuccessMessage(`✅ Successfully deleted existing payouts and generated ${result.payouts.length} new payouts! Total amount: ${formatCurrency(result.payouts.reduce((sum, payout) => sum + payout.payoutAmount, 0))}`);
        
        // Show excluded users info if any
        if (result.excludedUsers && result.excludedUsers.length > 0) {
          setSuccessMessage(prev => prev + ` | ${result.excludedUsers.length} users excluded (see details below)`);
        }
        
        // Clear success message after 8 seconds
        setTimeout(() => {
          setSuccessMessage('');
        }, 8000);
      } else {
        setError('No eligible payouts to generate. Make sure users have KYC completed and positive income.');
      }
    } catch (err) {
      console.error('Error generating payouts:', err);
      setError('Failed to generate payouts');
    } finally {
      setGeneratingPayouts(false);
    }
  };

  const handleResetNetwork = async () => {
    try {
      setResettingNetwork(true);
      setError(null);
      setSuccessMessage('');
      setShowResetNetworkDialog(false);
      
      // Call the reset network service
      const result = await PayoutService.resetNetworkStructure();
      
      setSuccessMessage(`✅ Successfully reset network structure! ${result.resetCount} users' network data has been cleared.`);
      
      // Refresh data
      await fetchPayouts();
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    } catch (err) {
      console.error('Error resetting network:', err);
      setError('Failed to reset network structure');
    } finally {
      setResettingNetwork(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-IN');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading payouts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payout Management</h1>
          <p className="text-gray-600">Manage and track all user payouts with bank details</p>
        </div>

        {/* Manual Payout Generation Alert */}
        <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FaCalendarAlt className="text-blue-600 text-xl" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Manual Payout Generation</h3>
              <p className="text-blue-700 mb-3">
                Generate payouts manually for all eligible users based on Total Income calculation. This will:
              </p>
              <ul className="text-blue-600 text-sm space-y-1 mb-4">
                <li>• Calculate Total Income = Promotional Income + Mentorship Income + Rewards</li>
                <li>• Promotional Income: Team pairs × ₹400 (from left/right team balance) - <strong>Daily Cap: ₹2000</strong></li>
                <li>• Mentorship Income: Direct referrals' pairs × ₹100 (from their networks)</li>
                <li>• Rewards: Performance bonuses (₹25,000 for 500 pairs, ₹5,000 for 600 pairs)</li>
                <li>• <strong>Delete all existing payouts</strong> for the current cycle</li>
                <li>• Apply 5% deduction and calculate payout amounts</li>
                <li>• Reset user incomes after payout generation</li>
                <li>• Create payout records with bank details</li>
                <li>• <strong>Daily Cap System:</strong> Users can only earn up to ₹2000 per day from promotional income (5 pairs maximum)</li>
              </ul>
              <p className="text-blue-600 text-xs">
                <strong>Note:</strong> Automatic payouts are scheduled for 2nd, 12th, and 22nd of each month.
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FaUsers className="text-blue-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Payouts</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.totalPayouts}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FaRupeeSign className="text-green-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.totalAmount)}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <FaCalendarAlt className="text-yellow-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.pendingPayouts}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FaCheck className="text-purple-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{statistics.completedPayouts}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <FaRupeeSign className="text-indigo-600 text-xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Average</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(statistics.averagePayout)}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Payout Generation Summary */}
        {payoutSummary && (
          <div className="mb-6 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FaUsers className="text-purple-600 text-xl" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-purple-900 mb-2">Payout Generation Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-purple-600">{payoutSummary.totalEligibleUsers}</p>
                    <p className="text-sm text-purple-700">Total Eligible Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{payoutSummary.payoutsGenerated}</p>
                    <p className="text-sm text-green-700">Payouts Generated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600">{payoutSummary.usersExcluded}</p>
                    <p className="text-sm text-orange-700">Users Excluded</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-600">{payoutSummary.currentCycle}</p>
                    <p className="text-xs text-gray-500">Current Cycle</p>
                  </div>
                </div>
                
                {/* Excluded Reasons Breakdown */}
                {Object.keys(payoutSummary.excludedReasons).length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Exclusion Reasons:</h4>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(payoutSummary.excludedReasons).map(([reason, count]) => (
                        <span key={reason} className="px-3 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          {reason.replace(/_/g, ' ')}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <button
                  onClick={() => setShowExcludedUsers(!showExcludedUsers)}
                  className="text-purple-600 hover:text-purple-800 text-sm font-medium flex items-center gap-2"
                >
                  {showExcludedUsers ? 'Hide' : 'View'} Excluded Users Details
                  <FaEye className="text-sm" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Excluded Users Section */}
        {showExcludedUsers && excludedUsers.length > 0 && (
          <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Excluded Users - Payout Not Generated</h3>
              <p className="text-sm text-gray-600">Users who were excluded from payout generation and their reasons</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {excludedUsers.map((user, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.userName}</div>
                          <div className="text-sm text-gray-500">{user.userEmail}</div>
                          <div className="text-xs text-gray-400">ID: {user.userReferralCode}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.category === 'kyc_incomplete' ? 'bg-red-100 text-red-800' :
                          user.category === 'payment_request_not_approved' ? 'bg-yellow-100 text-yellow-800' :
                          user.category === 'bank_account_missing' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {user.reason}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{user.details}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {user.category.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <button
            onClick={() => setShowConfirmDialog(true)}
            disabled={generatingPayouts}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center gap-3 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            {generatingPayouts ? (
              <>
                <FaSpinner className="animate-spin text-xl" />
                Generating Payouts...
              </>
            ) : (
              <>
                <FaCalendarAlt className="text-xl" />
                Generate Payouts Now
              </>
            )}
          </button>
          
          <button
            onClick={() => setShowResetNetworkDialog(true)}
            disabled={resettingNetwork}
            className="px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 disabled:opacity-50 flex items-center gap-3 font-semibold shadow-lg transform hover:scale-105 transition-all duration-200"
            title="Reset network structure for all users"
          >
            {resettingNetwork ? (
              <>
                <FaSpinner className="animate-spin text-xl" />
                Resetting Network...
              </>
            ) : (
              <>
                <FaNetworkWired className="text-xl" />
                Reset Network
              </>
            )}
          </button>
          
          <button
            onClick={handleExportPayouts}
            disabled={payouts.filter(p => p.status === 'completed').length === 0}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            title="Export only completed payouts to Excel"
          >
            <FaFileExport />
            Export Completed Payouts
          </button>
        </div>
        
        {/* Export Info */}
        <div className="mt-2 text-sm text-gray-600">
          <p>💡 <strong>Export Note:</strong> Only completed payouts are exported. Rejected and pending payouts are excluded from the Excel file.</p>
        </div>
        
        {/* Data Deletion Info */}
        <div className="mt-2 text-sm text-blue-600">
          <p>ℹ️ <strong>Note:</strong> When generating new payouts, all existing payouts for the current cycle are permanently deleted and replaced with new calculations.</p>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or referral code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            
            <div className="md:w-48">
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <FaCheck className="text-green-600" />
              <span className="font-medium">{successMessage}</span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <FaExclamationTriangle className="text-red-600" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Payouts Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bank Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Network
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPayouts.map((payout) => (
                  <motion.tr
                    key={payout.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{payout.userName}</div>
                        <div className="text-sm text-gray-500">{payout.userEmail}</div>
                        <div className="text-xs text-gray-400">ID: {payout.userReferralCode}</div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payout.bankAccount?.accountHolderName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {payout.bankAccount?.bankName}
                        </div>
                        <div className="text-xs text-gray-400">
                          ****{payout.bankAccount?.accountNumber?.slice(-4)}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {payout.payoutSummary?.networkInfo?.totalNetworkSize || 0} members
                        </div>
                        <div className="text-xs text-gray-500">
                          Direct: {payout.payoutSummary?.networkInfo?.directReferrals || 0}
                        </div>
                        <div className="text-xs text-gray-400">
                          L: {payout.payoutSummary?.networkInfo?.leftLegStructure?.count || 0} | R: {payout.payoutSummary?.networkInfo?.rightLegStructure?.count || 0}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(payout.payoutAmount)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Total: {formatCurrency(payout.totalIncome)}
                        </div>
                        <div className="text-xs text-red-500">
                          Deduction: {formatCurrency(payout.deduction)}
                        </div>
                        {(payout.payoutSummary?.promotionalDetails?.capApplied || payout.payoutSummary?.mentorshipDetails?.capApplied) && (
                          <div className="text-xs text-orange-600 font-medium mt-1">
                            ⚠️ Daily caps applied
                          </div>
                        )}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payout.status)}`}>
                        {payout.status}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(payout.generatedAt)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedPayout(payout);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                        
                        {payout.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleStatusUpdate(payout.id, 'completed')}
                              disabled={updatingStatus}
                              className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              title="Mark as Completed"
                            >
                              <FaCheck />
                            </button>
                            
                            <button
                              onClick={() => handleStatusUpdate(payout.id, 'rejected')}
                              disabled={updatingStatus}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title="Reject Payout"
                            >
                              <FaTimes />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPayouts.length === 0 && (
            <div className="text-center py-12">
              <FaRupeeSign className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No payouts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No payouts have been generated yet.'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Payout Details Modal */}
      <AnimatePresence>
        {showModal && selectedPayout && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900">Payout Details</h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="text-xl" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* User Information */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">User Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Name</label>
                        <p className="text-sm text-gray-900">{selectedPayout.userName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="text-sm text-gray-900">{selectedPayout.userEmail}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Referral Code</label>
                        <p className="text-sm text-gray-900">{selectedPayout.userReferralCode}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payout ID</label>
                        <p className="text-sm text-gray-900">{selectedPayout.id}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Bank Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Bank Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Holder</label>
                        <p className="text-sm text-gray-900">{selectedPayout.bankAccount?.accountHolderName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                        <p className="text-sm text-gray-900">{selectedPayout.bankAccount?.bankName}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Account Number</label>
                        <p className="text-sm text-gray-900">{selectedPayout.bankAccount?.accountNumber}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                        <p className="text-sm text-gray-900">{selectedPayout.bankAccount?.ifscCode}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Branch</label>
                        <p className="text-sm text-gray-900">{selectedPayout.bankAccount?.branch}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Amount Details */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Amount Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total Income</label>
                        <p className="text-lg font-bold text-gray-900">{formatCurrency(selectedPayout.totalIncome)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Deduction (5%)</label>
                        <p className="text-lg font-bold text-red-600">{formatCurrency(selectedPayout.deduction)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payout Amount</label>
                        <p className="text-lg font-bold text-green-600">{formatCurrency(selectedPayout.payoutAmount)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Income Breakdown */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Income Breakdown</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Promotional Income</label>
                          <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedPayout.incomeBreakdown?.promotionalIncome || 0)}</p>
                          <p className="text-xs text-gray-500">
                            {selectedPayout.incomeBreakdown?.referralPairs || 0} pairs × ₹400
                          </p>
                          {selectedPayout.payoutSummary?.promotionalDetails?.capApplied && (
                            <p className="text-xs text-orange-600 font-medium">⚠️ Daily cap applied (₹2000 max)</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Mentorship Income</label>
                          <p className="text-lg font-bold text-teal-600">{formatCurrency(selectedPayout.incomeBreakdown?.mentorshipIncome || 0)}</p>
                          <p className="text-xs text-gray-500">
                            {selectedPayout.incomeBreakdown?.directReferrals || 0} referrals' pairs × ₹100
                          </p>
                          {selectedPayout.payoutSummary?.mentorshipDetails?.capApplied && (
                            <p className="text-xs text-orange-600 font-medium">⚠️ Daily cap applied (₹500 max)</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Rewards Income</label>
                          <p className="text-lg font-bold text-purple-600">{formatCurrency(selectedPayout.incomeBreakdown?.rewardsIncome || 0)}</p>
                          <p className="text-xs text-gray-500">
                            Performance bonuses
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Team Structure</label>
                          <p className="text-sm text-gray-900">
                            Left: {selectedPayout.incomeBreakdown?.leftTeamCount || 0} | Right: {selectedPayout.incomeBreakdown?.rightTeamCount || 0}
                          </p>
                          <p className="text-xs text-gray-500">
                            Total: {selectedPayout.incomeBreakdown?.leftTeamCount + selectedPayout.incomeBreakdown?.rightTeamCount || 0} members
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Payout Summary */}
                  {selectedPayout.payoutSummary && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Payout Summary & Reasoning</h3>
                      <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                        {/* Overview */}
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">Overview</h4>
                          <p className="text-sm text-blue-800">{selectedPayout.payoutSummary.overview}</p>
                        </div>

                        {/* Promotional Details */}
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">Promotional Income Details</h4>
                          <div className="bg-white rounded p-3">
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Pairs:</span> {selectedPayout.payoutSummary.promotionalDetails.pairs} | 
                              <span className="font-medium"> Rate:</span> {selectedPayout.payoutSummary.promotionalDetails.rate}
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Potential:</span> ₹{selectedPayout.payoutSummary.promotionalDetails.potential.toFixed(2)} | 
                              <span className="font-medium"> Actual:</span> ₹{selectedPayout.payoutSummary.promotionalDetails.actual.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-600">{selectedPayout.payoutSummary.promotionalDetails.explanation}</p>
                          </div>
                        </div>

                        {/* Mentorship Details */}
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">Mentorship Income Details</h4>
                          <div className="bg-white rounded p-3">
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Direct Referrals:</span> {selectedPayout.payoutSummary.mentorshipDetails.directReferrals} | 
                              <span className="font-medium"> Referral Pairs:</span> {selectedPayout.payoutSummary.mentorshipDetails.referralPairs}
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Rate:</span> {selectedPayout.payoutSummary.mentorshipDetails.rate} | 
                              <span className="font-medium"> Actual:</span> ₹{selectedPayout.payoutSummary.mentorshipDetails.actual.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-600">{selectedPayout.payoutSummary.mentorshipDetails.explanation}</p>
                          </div>
                        </div>

                        {/* Calculation Method */}
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">Calculation Method</h4>
                          <div className="bg-white rounded p-3">
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Method:</span> {selectedPayout.payoutSummary.calculationMethod.method}
                            </p>
                            <p className="text-xs text-gray-600 mb-1">
                              Promotional Cap: {selectedPayout.payoutSummary.calculationMethod.promotionalCap}
                            </p>
                            <p className="text-xs text-gray-600 mb-1">
                              Mentorship Cap: {selectedPayout.payoutSummary.calculationMethod.mentorshipCap}
                            </p>
                            <p className="text-xs text-gray-600 font-medium">
                              {selectedPayout.payoutSummary.calculationMethod.totalFormula}
                            </p>
                          </div>
                        </div>

                        {/* Payout Calculation */}
                        <div>
                          <h4 className="text-sm font-semibold text-blue-900 mb-2">Final Payout Calculation</h4>
                          <div className="bg-white rounded p-3">
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Gross Income:</span> ₹{selectedPayout.payoutSummary.payoutCalculation.grossIncome.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-700 mb-1">
                              <span className="font-medium">Platform Fee (5%):</span> ₹{selectedPayout.payoutSummary.payoutCalculation.deduction.toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-700 font-medium">
                              <span className="font-medium">Net Payout:</span> ₹{selectedPayout.payoutSummary.payoutCalculation.netPayout.toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-600 mt-2">{selectedPayout.payoutSummary.payoutCalculation.explanation}</p>
                          </div>
                        </div>

                        {/* Network Information */}
                        {selectedPayout.payoutSummary.networkInfo && (
                          <div>
                            <h4 className="text-sm font-semibold text-blue-900 mb-2">Network Information</h4>
                            <div className="bg-white rounded p-3 space-y-3">
                              {/* Network Overview */}
                              <div>
                                <p className="text-sm text-gray-700 mb-1">
                                  <span className="font-medium">Total Network Size:</span> {selectedPayout.payoutSummary.networkInfo.totalNetworkSize} members
                                </p>
                                <p className="text-sm text-gray-700 mb-1">
                                  <span className="font-medium">Direct Referrals:</span> {selectedPayout.payoutSummary.networkInfo.directReferrals}
                                </p>
                                <p className="text-xs text-gray-600">{selectedPayout.payoutSummary.networkInfo.explanation}</p>
                              </div>

                              {/* Network Levels */}
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Network Levels:</p>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="bg-gray-100 p-2 rounded">
                                    <span className="font-medium">Level 1:</span> {selectedPayout.payoutSummary.networkInfo.level1Downlines}
                                  </div>
                                  <div className="bg-gray-100 p-2 rounded">
                                    <span className="font-medium">Level 2:</span> {selectedPayout.payoutSummary.networkInfo.level2Downlines}
                                  </div>
                                  <div className="bg-gray-100 p-2 rounded">
                                    <span className="font-medium">Level 3:</span> {selectedPayout.payoutSummary.networkInfo.level3Downlines}
                                  </div>
                                </div>
                              </div>

                              {/* Team Structure */}
                              <div>
                                <p className="text-sm font-medium text-gray-700 mb-1">Team Structure:</p>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-blue-100 p-2 rounded">
                                    <span className="font-medium">Left Leg:</span> {selectedPayout.payoutSummary.networkInfo.leftLegStructure.count} members
                                  </div>
                                  <div className="bg-green-100 p-2 rounded">
                                    <span className="font-medium">Right Leg:</span> {selectedPayout.payoutSummary.networkInfo.rightLegStructure.count} members
                                  </div>
                                </div>
                              </div>

                              {/* Direct Referral Details */}
                              {selectedPayout.payoutSummary.networkInfo.directReferralDetails.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2">Direct Referral Details:</p>
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {selectedPayout.payoutSummary.networkInfo.directReferralDetails.map((referral, index) => (
                                      <div key={index} className="bg-gray-50 p-2 rounded text-xs">
                                        <p className="font-medium">{referral.name} ({referral.referralCode})</p>
                                        <p className="text-gray-600">Downlines: {referral.downlinesCount} | Left: {referral.leftDownline || 'None'} | Right: {referral.rightDownline || 'None'}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Status and Dates */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Status & Dates</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPayout.status)}`}>
                          {selectedPayout.status}
                        </span>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payout Cycle</label>
                        <p className="text-sm text-gray-900">{selectedPayout.payoutCycle}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Generated Date</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedPayout.generatedAt)}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Payout Date</label>
                        <p className="text-sm text-gray-900">{formatDate(selectedPayout.payoutDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FaCalendarAlt className="text-blue-600 text-xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Payout Generation</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                  Are you sure you want to generate payouts for all eligible users? This action will:
                </p>
                
                <ul className="text-sm text-gray-600 mb-6 space-y-2">
                  <li>• <strong>Delete all existing payouts</strong> for the current cycle</li>
                  <li>• Process payouts for users with KYC completed</li>
                  <li>• Apply 5% deduction to all payouts</li>
                  <li>• Reset user incomes after payout generation</li>
                  <li>• Create payout records with bank details</li>
                </ul>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FaExclamationTriangle className="text-red-600" />
                    <span className="text-sm font-medium text-red-800">⚠️ Data Deletion Warning</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    <strong>This action will permanently delete all existing payouts</strong> for the current cycle and generate new ones based on updated income calculations. This action cannot be undone.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowConfirmDialog(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGeneratePayouts}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Generate Payouts
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset Network Confirmation Dialog */}
      <AnimatePresence>
        {showResetNetworkDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <FaNetworkWired className="text-orange-600 text-xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Confirm Network Reset</h3>
                </div>
                
                <p className="text-gray-600 mb-4">
                  Are you sure you want to reset the network structure for all users? This action will:
                </p>
                
                <ul className="text-sm text-gray-600 mb-6 space-y-2">
                  <li>• <strong>Clear all left/right downline assignments</strong></li>
                  <li>• Reset team structure for all affiliate users</li>
                  <li>• Remove all network connections</li>
                  <li>• Allow users to rebuild their networks from scratch</li>
                  <li>• Reset all income calculations to zero</li>
                </ul>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-2">
                    <FaExclamationTriangle className="text-red-600" />
                    <span className="text-sm font-medium text-red-800">⚠️ Critical Action Warning</span>
                  </div>
                  <p className="text-xs text-red-700 mt-1">
                    <strong>This action will permanently reset all network structures</strong> and cannot be undone. All users will need to rebuild their networks and income calculations will start from zero.
                  </p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowResetNetworkDialog(false)}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetNetwork}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Reset Network
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PayoutManagement; 