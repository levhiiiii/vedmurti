import React, { useState, useEffect } from 'react';
import { 
  FaMoneyBillWave, 
  FaCheck, 
  FaTimes, 
  FaEye, 
  FaFilter,
  FaDownload,
  FaSpinner,
  FaSearch,
  FaCalendarAlt,
  FaUser,
  FaFileImage
} from 'react-icons/fa';
import PaymentService from '../../../services/paymentService';

const PaymentRequests = () => {
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
  const [adminRemarks, setAdminRemarks] = useState('');
  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalAmount: 0,
    approvedAmount: 0
  });

  // Load payment requests
  useEffect(() => {
    loadPaymentRequests();
    loadStatistics();
  }, []);

  // Filter requests based on status and search
  useEffect(() => {
    let filtered = paymentRequests;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.referralCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.transactionId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRequests(filtered);
  }, [paymentRequests, statusFilter, searchTerm]);

  const loadPaymentRequests = async () => {
    try {
      setLoading(true);
      const requests = await PaymentService.getAllPaymentRequests('all', 100);
      setPaymentRequests(requests);
    } catch (error) {
      console.error('Error loading payment requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await PaymentService.getPaymentRequestStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const handleApprove = async (requestId, remarks = '') => {
    try {
      setProcessing(true);
      const adminId = 'admin'; // Get from auth context
      await PaymentService.approvePaymentRequest(requestId, adminId, remarks);
      await loadPaymentRequests();
      await loadStatistics();
      setShowModal(false);
      setSelectedRequest(null);
      setAdminRemarks('');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (requestId, reason) => {
    try {
      setProcessing(true);
      const adminId = 'admin'; // Get from auth context
      await PaymentService.rejectPaymentRequest(requestId, adminId, reason);
      await loadPaymentRequests();
      await loadStatistics();
      setShowModal(false);
      setSelectedRequest(null);
      setAdminRemarks('');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedRequests.length === 0) {
      alert('Please select requests to approve');
      return;
    }

    if (!confirm(`Are you sure you want to approve ${selectedRequests.length} requests?`)) {
      return;
    }

    try {
      setProcessing(true);
      const adminId = 'admin'; // Get from auth context
      await PaymentService.bulkApprovePaymentRequests(selectedRequests, adminId, 'Bulk approval');
      await loadPaymentRequests();
      await loadStatistics();
      setSelectedRequests([]);
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert('Error bulk approving: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (selectedRequests.length === 0) {
      alert('Please select requests to reject');
      return;
    }

    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    if (!confirm(`Are you sure you want to reject ${selectedRequests.length} requests?`)) {
      return;
    }

    try {
      setProcessing(true);
      const adminId = 'admin'; // Get from auth context
      await PaymentService.bulkRejectPaymentRequests(selectedRequests, adminId, reason);
      await loadPaymentRequests();
      await loadStatistics();
      setSelectedRequests([]);
    } catch (error) {
      console.error('Error bulk rejecting:', error);
      alert('Error bulk rejecting: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const toggleRequestSelection = (requestId) => {
    setSelectedRequests(prev =>
      prev.includes(requestId)
        ? prev.filter(id => id !== requestId)
        : [...prev, requestId]
    );
  };

  const selectAllRequests = () => {
    const pendingRequestIds = filteredRequests
      .filter(request => request.status === 'pending')
      .map(request => request.id);
    setSelectedRequests(pendingRequestIds);
  };

  const openModal = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setShowModal(true);
    setAdminRemarks('');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      approved: { color: 'bg-green-100 text-green-800', text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', text: 'Rejected' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-4xl text-indigo-600" />
        <span className="ml-2 text-lg">Loading payment requests...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Payment Requests</h2>
            <p className="text-sm text-gray-500">Manage affiliate joining payment requests</p>
          </div>
          <button
            onClick={loadPaymentRequests}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
          >
            <FaDownload className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaMoneyBillWave className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Requests</dt>
                  <dd className="text-lg font-medium text-gray-900">{statistics.totalRequests}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaSpinner className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                  <dd className="text-lg font-medium text-gray-900">{statistics.pendingRequests}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FaCheck className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Approved</dt>
                  <dd className="text-lg font-medium text-gray-900">{statistics.approvedRequests}</dd>
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
                  <dd className="text-lg font-medium text-gray-900">{statistics.rejectedRequests}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, referral code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Bulk Actions */}
          {selectedRequests.length > 0 && (
            <div className="flex space-x-2">
              <button
                onClick={handleBulkApprove}
                disabled={processing}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                <FaCheck className="mr-2" />
                Approve ({selectedRequests.length})
              </button>
              <button
                onClick={handleBulkReject}
                disabled={processing}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
              >
                <FaTimes className="mr-2" />
                Reject ({selectedRequests.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Requests Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Payment Requests ({filteredRequests.length})
            </h3>
            {filteredRequests.filter(r => r.status === 'pending').length > 0 && (
              <button
                onClick={selectAllRequests}
                className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
              >
                Select All Pending
              </button>
            )}
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <FaMoneyBillWave className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payment requests</h3>
            <p className="mt-1 text-sm text-gray-500">
              No payment requests found matching your criteria.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <li key={request.id} className="px-4 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {request.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedRequests.includes(request.id)}
                        onChange={() => toggleRequestSelection(request.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-4"
                      />
                    )}
                    
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {request.userName.charAt(0)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{request.userName}</p>
                          <p className="text-sm text-gray-500">{request.userEmail}</p>
                          <p className="text-xs text-gray-400">Referral: {request.referralCode}</p>
                        </div>
                        
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">₹{request.amount}</p>
                          <p className="text-xs text-gray-500">{formatDate(request.submittedAt)}</p>
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                      
                      {request.transactionId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Transaction ID: {request.transactionId}
                        </p>
                      )}
                      
                      {request.remarks && (
                        <p className="text-xs text-gray-600 mt-1">
                          Remarks: {request.remarks}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {request.paymentProof && (
                      <button
                        onClick={() => window.open(request.paymentProof, '_blank')}
                        className="text-blue-600 hover:text-blue-900"
                        title="View Payment Proof"
                      >
                        <FaFileImage />
                      </button>
                    )}
                    
                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => openModal(request, 'approve')}
                          disabled={processing}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                        >
                          <FaCheck />
                        </button>
                        <button
                          onClick={() => openModal(request, 'reject')}
                          disabled={processing}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 disabled:opacity-50"
                        >
                          <FaTimes />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {actionType === 'approve' ? 'Approve' : 'Reject'} Payment Request
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">User: {selectedRequest.userName}</p>
                <p className="text-sm text-gray-600">Amount: ₹{selectedRequest.amount}</p>
                <p className="text-sm text-gray-600">Email: {selectedRequest.userEmail}</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {actionType === 'approve' ? 'Admin Remarks (Optional)' : 'Rejection Reason (Required)'}
                </label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={actionType === 'approve' ? 'Enter any remarks...' : 'Enter rejection reason...'}
                  required={actionType === 'reject'}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (actionType === 'approve') {
                      handleApprove(selectedRequest.id, adminRemarks);
                    } else {
                      if (!adminRemarks.trim()) {
                        alert('Please enter a rejection reason');
                        return;
                      }
                      handleReject(selectedRequest.id, adminRemarks);
                    }
                  }}
                  disabled={processing}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                    actionType === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processing ? (
                    <FaSpinner className="animate-spin" />
                  ) : (
                    actionType === 'approve' ? 'Approve' : 'Reject'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentRequests;
