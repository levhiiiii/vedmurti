import React, { useState, useEffect } from 'react';
import { 
  FaCheck, 
  FaTimes, 
  FaEye, 
  FaSearch, 
  FaFilter, 
  FaDownload,
  FaSpinner,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaUser,
  FaCreditCard,
  FaShieldAlt
} from 'react-icons/fa';
import { BsBank } from 'react-icons/bs';
import { 
  MdRefresh
} from 'react-icons/md';
import { getFirestore, collection, query, where, orderBy, onSnapshot, updateDoc, doc, getDocs } from 'firebase/firestore';
import { app } from '../../../Firebase/firebase';

const KYCVerification = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0
  });

  // Fetch all bank accounts and users
  useEffect(() => {
    const db = getFirestore(app);
    
    // Fetch bank accounts
    const bankAccountsRef = collection(db, 'bankAccounts');
    const q = query(bankAccountsRef, orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const accounts = [];
      const userIds = new Set();
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        accounts.push({
          id: doc.id,
          ...data
        });
        userIds.add(data.userId);
      });
      
      setBankAccounts(accounts);
      
      // Fetch user details for all accounts
      const usersRef = collection(db, 'users');
      const userDetails = {};
      
      for (const userId of userIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            userDetails[userId] = userDoc.data();
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      }
      
      setUsers(userDetails);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching bank accounts:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate stats
  useEffect(() => {
    const stats = {
      total: bankAccounts.length,
      pending: bankAccounts.filter(acc => !acc.verified && !acc.rejected).length,
      verified: bankAccounts.filter(acc => acc.verified).length,
      rejected: bankAccounts.filter(acc => acc.rejected).length
    };
    setStats(stats);
  }, [bankAccounts]);

  // Filter accounts based on search and status
  const filteredAccounts = bankAccounts.filter(account => {
    const user = users[account.userId];
    const matchesSearch = !searchTerm || 
      (user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       account.bankName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
       account.accountHolderName?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'pending' && !account.verified && !account.rejected) ||
      (statusFilter === 'verified' && account.verified) ||
      (statusFilter === 'rejected' && account.rejected);
    
    return matchesSearch && matchesStatus;
  });

  const handleVerify = async (accountId, status) => {
    try {
      setVerifying(accountId);
      const db = getFirestore(app);
      const accountRef = doc(db, 'bankAccounts', accountId);
      
      await updateDoc(accountRef, {
        verified: status === 'verified',
        rejected: status === 'rejected',
        verifiedAt: new Date(),
        verifiedBy: 'admin', // You can add actual admin ID here
        verificationNotes: status === 'verified' ? 'Verified by admin' : 'Rejected by admin'
      });
      
      // Update user KYC status if verified
      if (status === 'verified') {
        const account = bankAccounts.find(acc => acc.id === accountId);
        if (account) {
          const userRef = doc(db, 'users', account.userId);
          await updateDoc(userRef, {
            kycCompleted: true,
            kycCompletedAt: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Error updating verification status:', error);
      alert('Failed to update verification status');
    } finally {
      setVerifying(null);
    }
  };

  const handleViewDetails = (account) => {
    setSelectedAccount(account);
    setShowDetails(true);
  };

  const exportToCSV = () => {
    const headers = [
      'User Name',
      'User Email',
      'Account Holder',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Branch',
      'Account Type',
      'Status',
      'Created At',
      'Verified At'
    ];
    
    const csvData = filteredAccounts.map(account => {
      const user = users[account.userId];
      return [
        user?.name || 'N/A',
        user?.email || 'N/A',
        account.accountHolderName,
        account.bankName,
        account.accountNumber,
        account.ifscCode,
        account.branch,
        account.accountType,
        account.verified ? 'Verified' : account.rejected ? 'Rejected' : 'Pending',
        account.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A',
        account.verifiedAt?.toDate?.()?.toLocaleDateString() || 'N/A'
      ];
    });
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kyc_verification_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (account) => {
    if (account.verified) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <FaCheckCircle className="mr-1" />
          Verified
        </span>
      );
    } else if (account.rejected) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <FaTimes className="mr-1" />
          Rejected
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <FaClock className="mr-1" />
          Pending
        </span>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="flex items-center justify-center">
              <FaSpinner className="animate-spin text-4xl text-indigo-600" />
              <span className="ml-3 text-lg text-gray-600">Loading KYC verification data...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">KYC Verification</h1>
              <p className="mt-2 text-gray-600">Review and verify user bank account information</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <FaDownload className="mr-2" />
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BsBank className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Accounts</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.total}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaClock className="h-6 w-6 text-yellow-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.pending}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaCheckCircle className="h-6 w-6 text-green-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Verified</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.verified}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FaTimes className="h-6 w-6 text-red-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Rejected</dt>
                    <dd className="text-lg font-medium text-gray-900">{stats.rejected}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or bank..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center"
              >
                <MdRefresh className="mr-2" />
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Bank Accounts Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              Bank Accounts ({filteredAccounts.length})
            </h3>
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <FaExclamationTriangle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'No bank accounts have been submitted for verification yet.'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bank Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAccounts.map((account) => {
                    const user = users[account.userId];
                    return (
                      <tr key={account.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <FaUser className="h-5 w-5 text-indigo-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user?.name || 'Unknown User'}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user?.email || 'No email'}
                              </div>
                              <div className="text-xs text-gray-400">
                                ID: {account.userId}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {account.accountHolderName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {account.bankName} ••••{account.accountNumber.slice(-4)}
                            </div>
                            <div className="text-xs text-gray-400">
                              {account.branch} • {account.ifscCode}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(account)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {account.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleViewDetails(account)}
                              className="text-indigo-600 hover:text-indigo-900"
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                            
                            {!account.verified && !account.rejected && (
                              <>
                                <button
                                  onClick={() => handleVerify(account.id, 'verified')}
                                  disabled={verifying === account.id}
                                  className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                  title="Verify Account"
                                >
                                  {verifying === account.id ? (
                                    <FaSpinner className="animate-spin" />
                                  ) : (
                                    <FaCheck />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleVerify(account.id, 'rejected')}
                                  disabled={verifying === account.id}
                                  className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                  title="Reject Account"
                                >
                                  {verifying === account.id ? (
                                    <FaSpinner className="animate-spin" />
                                  ) : (
                                    <FaTimes />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Account Details Modal */}
        {showDetails && selectedAccount && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Account Details</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Holder</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.accountHolderName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.bankName}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.accountNumber}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IFSC Code</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.ifscCode}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Branch</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.branch}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Account Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedAccount.accountType}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedAccount)}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {selectedAccount.createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                    </p>
                  </div>
                  
                  {selectedAccount.verifiedAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Verified</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedAccount.verifiedAt?.toDate?.()?.toLocaleString() || 'N/A'}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDetails(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Close
                  </button>
                  {!selectedAccount.verified && !selectedAccount.rejected && (
                    <>
                      <button
                        onClick={() => {
                          handleVerify(selectedAccount.id, 'verified');
                          setShowDetails(false);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        Verify
                      </button>
                      <button
                        onClick={() => {
                          handleVerify(selectedAccount.id, 'rejected');
                          setShowDetails(false);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KYCVerification; 