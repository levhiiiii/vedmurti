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
  FaFileImage,
  FaInfoCircle,
  FaChevronDown,
  FaChevronUp,
  FaTrash
} from 'react-icons/fa';
import PaymentService from '../../../services/paymentService';

const PaymentRequests = () => {
  const [paymentRequests, setPaymentRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedRequests, setSelectedRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending'); // Default to show only pending requests
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [actionType, setActionType] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [expandedRequest, setExpandedRequest] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [requestsError, setRequestsError] = useState(null);

  const [statistics, setStatistics] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    approvedRequests: 0,
    rejectedRequests: 0,
    totalAmount: 0,
    approvedAmount: 0
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load payment requests
  useEffect(() => {
    loadPaymentRequests();
    loadStatistics();
  }, []);

  // Filter requests based on status and search
  useEffect(() => {
    let filtered = paymentRequests;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.referralCode && request.referralCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (request.transactionId && request.transactionId.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredRequests(filtered);
  }, [paymentRequests, statusFilter, searchTerm]);

  const loadPaymentRequests = async () => {
    try {
      setLoading(true);
      setRequestsError(null);
      const requests = await PaymentService.getAllPaymentRequests('all', 100);
      setPaymentRequests(requests);
    } catch (error) {
      console.error('Error loading payment requests:', error);
      setRequestsError('Failed to load payment requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      const stats = await PaymentService.getPaymentRequestStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading statistics:', error);
      setStatsError('Failed to load statistics. Please try again.');
    } finally {
      setStatsLoading(false);
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
      
      // Show success message
      setSuccessMessage('Payment request rejected and removed from the table.');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async (requestId) => {
    try {
      setProcessing(true);
      await PaymentService.deletePaymentRequest(requestId);
      await loadPaymentRequests();
      await loadStatistics();
    } catch (error) {
      console.error('Error deleting payment request:', error);
      alert('Failed to delete payment request. Please try again.');
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
      
      // Show success message
      setSuccessMessage(`${selectedRequests.length} payment request(s) rejected and removed from the table.`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
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
      
    if (selectedRequests.length === pendingRequestIds.length) {
      setSelectedRequests([]);
    } else {
    setSelectedRequests(pendingRequestIds);
    }
  };

  const openModal = (request, action) => {
    setSelectedRequest(request);
    setActionType(action);
    setShowModal(true);
    setAdminRemarks('');
  };

  const toggleExpandRequest = (requestId) => {
    setExpandedRequest(expandedRequest === requestId ? null : requestId);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { 
        color: 'bg-yellow-100 text-yellow-800', 
        text: 'Pending',
        icon: <FaSpinner className="animate-spin mr-1" />
      },
      approved: { 
        color: 'bg-green-100 text-green-800', 
        text: 'Approved',
        icon: <FaCheck className="mr-1" />
      },
      rejected: { 
        color: 'bg-red-100 text-red-800', 
        text: 'Rejected',
        icon: <FaTimes className="mr-1" />
      }
    };

    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${config.color}`}>
        {config.icon}
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen-3/4 py-20">
        <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4" />
        <span className="text-lg text-gray-700">Loading payment requests...</span>
        <p className="text-sm text-gray-500 mt-2">Please wait while we fetch the latest data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-xl rounded-xl p-6 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Payment Requests</h1>
            <p className="text-indigo-100 mt-1">Manage affiliate joining payment requests</p>
          </div>
          <button
            onClick={loadPaymentRequests}
            className="bg-white text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 flex items-center shadow-md transition-all duration-200 hover:shadow-lg"
          >
            <FaDownload className="mr-2" />
            Refresh Data
          </button>
        </div>
      </div>

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <div className="flex items-center">
            <FaCheck className="mr-2" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="text-green-600 hover:text-green-800"
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statsLoading ? (
          <div className="col-span-4 flex justify-center py-10">
            <FaSpinner className="animate-spin text-2xl text-indigo-600" />
          </div>
        ) : statsError ? (
          <div className="col-span-4 text-center text-red-500 bg-red-50 p-4 rounded-lg">
            {statsError}
          </div>
        ) : (
          <>
            <StatCard 
              title="Total Requests" 
              value={statistics.totalRequests} 
              icon={<FaMoneyBillWave className="text-indigo-500" />}
              trend="up"
              trendValue="12%"
              color="indigo"
            />
            <StatCard 
              title="Pending" 
              value={statistics.pendingRequests} 
              icon={<FaSpinner className="text-yellow-500" />}
              trend="down"
              trendValue="5%"
              color="yellow"
            />
            <StatCard 
              title="Approved" 
              value={statistics.approvedRequests} 
              icon={<FaCheck className="text-green-500" />}
              trend="up"
              trendValue="18%"
              color="green"
            />
            <StatCard 
              title="Rejected" 
              value={statistics.rejectedRequests} 
              icon={<FaTimes className="text-red-500" />}
              trend="down"
              trendValue="3%"
              color="red"
            />
          </>
        )}
      </div>

      {/* Filters and Actions */}
      <div className="bg-white shadow-lg rounded-xl p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 w-full sm:w-auto"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <FaChevronDown className="text-gray-400" />
              </div>
            </div>
          </div>

          {/* Filter Info */}
          {statusFilter === 'pending' && (
            <div className="w-full lg:w-auto">
              <p className="text-xs text-gray-500 italic">
                💡 Showing only pending requests by default. Use the filter above to view approved or rejected requests.
              </p>
            </div>
          )}

          {/* Bulk Actions */}
          {selectedRequests.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full lg:w-auto">
              <button
                onClick={handleBulkApprove}
                disabled={processing}
                className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-200 shadow hover:shadow-md"
              >
                <FaCheck className="mr-2" />
                Approve ({selectedRequests.length})
              </button>
              <button
                onClick={handleBulkReject}
                disabled={processing}
                className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-200 shadow hover:shadow-md"
              >
                <FaTimes className="mr-2" />
                Reject ({selectedRequests.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Payment Requests Table */}
      <div className="bg-white shadow-xl rounded-xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Payment Requests
            </h3>
            <p className="text-sm text-gray-500">
              {filteredRequests.length} request{filteredRequests.length !== 1 ? 's' : ''} found
            </p>
          </div>
          
          {filteredRequests.some(r => r.status === 'pending') && (
              <button
                onClick={selectAllRequests}
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors duration-200 flex items-center"
              >
              {selectedRequests.length === filteredRequests.filter(r => r.status === 'pending').length ? 
                'Deselect All' : 'Select All Pending'}
              </button>
            )}
        </div>

        {requestsError ? (
          <div className="text-center py-12 bg-red-50 text-red-600 rounded-b-xl">
            <FaTimes className="mx-auto text-3xl mb-3" />
            <p className="font-medium">{requestsError}</p>
            <button 
              onClick={loadPaymentRequests}
              className="mt-3 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Retry
            </button>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <FaMoneyBillWave className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No payment requests found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' ? 
                'Try adjusting your search or filter criteria' : 
                'There are currently no payment requests to display'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredRequests.map((request) => (
              <li 
                key={request.id} 
                className={`my-3 rounded-2xl shadow-md border border-gray-100 bg-gradient-to-br from-white to-gray-50 px-4 py-4 transition-all duration-200 ${expandedRequest === request.id ? 'ring-2 ring-indigo-200 bg-indigo-50' : 'hover:shadow-lg hover:bg-gray-50'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {request.status === 'pending' && (
                      <input
                        type="checkbox"
                        checked={selectedRequests.includes(request.id)}
                        onChange={() => toggleRequestSelection(request.id)}
                        className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded shadow-sm"
                      />
                    )}
                    <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center shadow-sm">
                      {request.userImage ? (
                        <img 
                          src={request.userImage} 
                          alt={request.userName} 
                          className="h-full w-full rounded-xl object-cover"
                        />
                      ) : (
                        <span className="text-2xl font-bold text-indigo-600">
                          {request.userName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="ml-3 min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-semibold text-gray-900 truncate">{request.userName}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FaCalendarAlt className="inline-block" />
                        <span>{formatDate(request.submittedAt)}</span>
                      </div>
                      <div className="text-xs text-gray-400 truncate">{request.userEmail}</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 min-w-[100px]">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-900">{formatCurrency(request.amount)}</span>
                      {request.paymentProof && (
                        <button
                          onClick={() => window.open(request.paymentProof, '_blank')}
                          className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                          title="View Payment Proof"
                        >
                          <FaFileImage />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(request.id)}
                        disabled={processing}
                        className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200"
                        title="Delete Payment Request"
                      >
                        <FaTrash />
                      </button>
                      <button
                        onClick={() => toggleExpandRequest(request.id)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        aria-label={expandedRequest === request.id ? 'Collapse details' : 'Expand details'}
                      >
                        {expandedRequest === request.id ? <FaChevronUp /> : <FaChevronDown />}
                      </button>
                    </div>
                  </div>
                </div>
                  
                  {/* Expanded Details */}
                  {expandedRequest === request.id && (
                    <div className="mt-4 pl-0 sm:pl-16 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-2">User Details</h5>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium text-gray-700">Name:</span> {request.userName}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium text-gray-700">Email:</span> {request.userEmail}
                            </p>
                            {request.phone && (
                              <p className="text-sm">
                                <span className="font-medium text-gray-700">Phone:</span> {request.phone}
                              </p>
                            )}
                            {request.referralCode && (
                              <p className="text-sm">
                                <span className="font-medium text-gray-700">Referral Code:</span> {request.referralCode}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="text-sm font-medium text-gray-500 mb-2">Payment Details</h5>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="font-medium text-gray-700">Amount:</span> {formatCurrency(request.amount)}
                            </p>
                            {request.transactionId && (
                              <p className="text-sm">
                                <span className="font-medium text-gray-700">Transaction ID:</span> {request.transactionId}
                              </p>
                            )}
                            {request.paymentMethod && (
                              <p className="text-sm">
                                <span className="font-medium text-gray-700">Method:</span> {request.paymentMethod}
                              </p>
                            )}
                            {request.remarks && (
                              <p className="text-sm">
                                <span className="font-medium text-gray-700">User Remarks:</span> {request.remarks}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Action Buttons */}
                      <div className="mt-4 flex flex-wrap gap-3">
                        {request.status === 'pending' && (
                          <>
                            <button
                              onClick={() => openModal(request, 'approve')}
                              disabled={processing}
                              className="flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-200 text-sm"
                            >
                              <FaCheck className="mr-2" />
                              Approve Request
                            </button>
                            <button
                              onClick={() => openModal(request, 'reject')}
                              disabled={processing}
                              className="flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-200 text-sm"
                            >
                              <FaTimes className="mr-2" />
                              Reject Request
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(request.id)}
                          disabled={processing}
                          className="flex items-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all duration-200 text-sm"
                          title="Delete Payment Request"
                        >
                          <FaTrash className="mr-2" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </li>
            ))}
          </ul>
        )}
      </div>

      {/* Action Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-200">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {actionType === 'approve' ? 'Approve Payment Request' : 'Reject Payment Request'}
              </h3>
              
              <div className="mb-6 space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <FaUser className="text-indigo-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{selectedRequest.userName}</p>
                    <p className="text-sm text-gray-500">{selectedRequest.userEmail}</p>
                    <p className="text-sm font-semibold text-indigo-600 mt-1">
                      {formatCurrency(selectedRequest.amount)}
                    </p>
                  </div>
                </div>
                
                {selectedRequest.paymentProof && (
                  <div className="mt-4">
                    <button
                      onClick={() => window.open(selectedRequest.paymentProof, '_blank')}
                      className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                    >
                      <FaFileImage className="mr-2" />
                      View Payment Proof
                    </button>
                  </div>
                )}
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {actionType === 'approve' ? 'Admin Remarks (Optional)' : 'Rejection Reason (Required)'}
                  <span className="text-red-500">{actionType === 'reject' && ' *'}</span>
                </label>
                <textarea
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                  placeholder={actionType === 'approve' ? 'Enter any remarks...' : 'Enter rejection reason...'}
                  required={actionType === 'reject'}
                />
                {actionType === 'reject' && (
                  <p className="mt-1 text-xs text-gray-500">
                    Please provide a clear reason for rejection that can be shared with the user.
                  </p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
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
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors duration-200 flex items-center ${
                    actionType === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {processing ? (
                    <>
                      <FaSpinner className="animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {actionType === 'approve' ? (
                        <FaCheck className="mr-2" />
                      ) : (
                        <FaTimes className="mr-2" />
                      )}
                      {actionType === 'approve' ? 'Approve' : 'Reject'}
                    </>
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

// StatCard Component
const StatCard = ({ title, value, icon, trend, trendValue, color }) => {
  const colorClasses = {
    indigo: 'bg-indigo-50 text-indigo-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600'
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-5">
        <div className="flex items-center">
          <div className={`flex-shrink-0 h-12 w-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}>
            {React.cloneElement(icon, { className: "h-6 w-6" })}
          </div>
          <div className="ml-5">
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
          </div>
        </div>
        {trend && (
          <div className="mt-2">
            <span className={`inline-flex items-center text-xs font-medium ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <svg className="h-3 w-3 text-green-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="h-3 w-3 text-red-500 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {trendValue} from last week
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentRequests;