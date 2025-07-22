import React, { useState, useEffect } from 'react';
import { 
  FaCheckCircle, 
  FaTimesCircle, 
  FaClock, 
  FaMoneyBillWave,
  FaCalendarAlt,
  FaFileImage,
  FaUser,
  FaSpinner
} from 'react-icons/fa';
import { useUser } from '../context/UserContext';
import PaymentRequestForm from './PaymentRequestForm';

const PaymentStatus = () => {
  const { currentUser, getUserPaymentRequest } = useUser();
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadPaymentRequest();
  }, [currentUser]);

  const loadPaymentRequest = async () => {
    try {
      setLoading(true);
      const request = await getUserPaymentRequest();
      setPaymentRequest(request);
    } catch (error) {
      console.error('Error loading payment request:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = (requestId) => {
    setShowForm(false);
    loadPaymentRequest(); // Reload to show the new request
  };

  const getStatusConfig = (status) => {
    const configs = {
      pending: {
        icon: FaClock,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200',
        title: 'Payment Under Review',
        description: 'Your payment request is being reviewed by our admin team. This usually takes 24-48 hours.'
      },
      approved: {
        icon: FaCheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        title: 'Payment Approved',
        description: 'Congratulations! Your payment has been approved and you now have access to the affiliate dashboard.'
      },
      rejected: {
        icon: FaTimesCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        title: 'Payment Rejected',
        description: 'Your payment request was rejected. Please check the reason below and submit a new request if needed.'
      }
    };
    return configs[status] || configs.pending;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-4xl text-indigo-600" />
        <span className="ml-2 text-lg">Loading payment status...</span>
      </div>
    );
  }

  // Show form if no payment request exists
  if (!paymentRequest && !showForm) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <FaMoneyBillWave className="mx-auto h-16 w-16 text-indigo-600 mb-6" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Affiliate Program</h2>
          <p className="text-gray-600 mb-6">
            To access the affiliate dashboard and start earning, you need to pay the joining amount of ₹1500.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">Benefits of Joining:</h3>
            <ul className="text-sm text-blue-800 text-left space-y-1">
              <li>• Earn ₹400 per pair (Left: ₹400, Right: ₹800)</li>
              <li>• Daily earning limit: ₹2000 (1 cycle) to ₹4000 (2 cycles)</li>
              <li>• Mentorship incentives up to ₹2000 per day</li>
              <li>• Performance rewards: ₹2500, ₹5000, ₹12500</li>
              <li>• Regular payouts on 12th, 22nd, and 2nd of every month</li>
            </ul>
          </div>

          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Submit Payment Request
          </button>
        </div>
      </div>
    );
  }

  // Show form
  if (showForm) {
    return (
      <PaymentRequestForm
        onSuccess={handleFormSuccess}
        onCancel={() => setShowForm(false)}
      />
    );
  }

  // Show payment request status
  const statusConfig = getStatusConfig(paymentRequest.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Status Card */}
      <div className={`${statusConfig.bgColor} ${statusConfig.borderColor} border rounded-lg p-6`}>
        <div className="flex items-center">
          <StatusIcon className={`h-8 w-8 ${statusConfig.color} mr-4`} />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900">{statusConfig.title}</h2>
            <p className="text-gray-600 mt-1">{statusConfig.description}</p>
          </div>
        </div>

        {paymentRequest.status === 'rejected' && paymentRequest.adminRemarks && (
          <div className="mt-4 p-4 bg-red-100 border border-red-200 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2">Rejection Reason:</h4>
            <p className="text-red-800">{paymentRequest.adminRemarks}</p>
          </div>
        )}

        {paymentRequest.status === 'approved' && paymentRequest.adminRemarks && (
          <div className="mt-4 p-4 bg-green-100 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Admin Notes:</h4>
            <p className="text-green-800">{paymentRequest.adminRemarks}</p>
          </div>
        )}
      </div>

      {/* Payment Details Card */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Request Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div className="flex items-center">
              <FaMoneyBillWave className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-semibold text-green-600">₹{paymentRequest.amount}</p>
              </div>
            </div>

            <div className="flex items-center">
              <FaCalendarAlt className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm text-gray-600">Submitted On</p>
                <p className="font-semibold">{formatDate(paymentRequest.submittedAt)}</p>
              </div>
            </div>

            {paymentRequest.processedAt && (
              <div className="flex items-center">
                <FaCalendarAlt className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Processed On</p>
                  <p className="font-semibold">{formatDate(paymentRequest.processedAt)}</p>
                </div>
              </div>
            )}

            {paymentRequest.transactionId && (
              <div className="flex items-center">
                <FaUser className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Transaction ID</p>
                  <p className="font-semibold">{paymentRequest.transactionId}</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {paymentRequest.paymentDate && (
              <div className="flex items-center">
                <FaCalendarAlt className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Payment Date</p>
                  <p className="font-semibold">{formatDate(paymentRequest.paymentDate)}</p>
                </div>
              </div>
            )}

            {paymentRequest.bankDetails && (
              <div className="flex items-center">
                <FaUser className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Bank Details</p>
                  <p className="font-semibold">{paymentRequest.bankDetails}</p>
                </div>
              </div>
            )}

            {paymentRequest.paymentProof && (
              <div className="flex items-center">
                <FaFileImage className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Payment Proof</p>
                  <button
                    onClick={() => window.open(paymentRequest.paymentProof, '_blank')}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    View Document
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {paymentRequest.remarks && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Your Remarks:</h4>
            <p className="text-gray-700">{paymentRequest.remarks}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {paymentRequest.status === 'rejected' && (
        <div className="text-center">
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-8 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
          >
            Submit New Request
          </button>
        </div>
      )}

      {paymentRequest.status === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <FaCheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
          <h3 className="text-lg font-semibold text-green-900 mb-2">Welcome to the Affiliate Program!</h3>
          <p className="text-green-800 mb-4">
            Your payment has been approved. You can now access your affiliate dashboard and start earning.
          </p>
          <a
            href="/affilate-dashboard"
            className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold inline-block"
          >
            Go to Dashboard
          </a>
        </div>
      )}

      {paymentRequest.status === 'pending' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <FaClock className="mx-auto h-12 w-12 text-yellow-600 mb-4" />
          <h3 className="text-lg font-semibold text-yellow-900 mb-2">Please Wait</h3>
          <p className="text-yellow-800">
            Your payment request is under review. We'll notify you via email once it's processed.
            This usually takes 24-48 hours during business days.
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentStatus;
