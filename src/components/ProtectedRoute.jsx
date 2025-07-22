import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { FaSpinner, FaLock, FaMoneyBillWave } from 'react-icons/fa';

const ProtectedRoute = ({ children, requireAffiliate = false }) => {
  const { currentUser, loading } = useUser();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FaSpinner className="animate-spin text-4xl text-indigo-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If affiliate access is required, check affiliate status
  if (requireAffiliate) {
    // Check if user has submitted payment request but not approved yet
    if (currentUser.paymentRequestStatus === 'pending') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <FaSpinner className="animate-spin text-4xl text-yellow-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Under Review</h2>
            <p className="text-gray-600 mb-6">
              Your payment request is being reviewed by our admin team. 
              This usually takes 24-48 hours during business days.
            </p>
            <div className="space-y-3">
              <a
                href="/payment-request"
                className="block w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Check Status
              </a>
              <a
                href="/"
                className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Check if user's payment was rejected
    if (currentUser.paymentRequestStatus === 'rejected') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <FaLock className="text-4xl text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Rejected</h2>
            <p className="text-gray-600 mb-6">
              Your payment request was rejected. Please submit a new payment request to access the affiliate dashboard.
            </p>
            <div className="space-y-3">
              <a
                href="/payment-request"
                className="block w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Submit New Request
              </a>
              <a
                href="/"
                className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Check if user hasn't submitted payment request yet
    if (!currentUser.affiliateStatus && !currentUser.paymentRequestStatus) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <FaMoneyBillWave className="text-4xl text-indigo-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Affiliate Program</h2>
            <p className="text-gray-600 mb-6">
              To access the affiliate dashboard, you need to join our affiliate program by paying the joining amount of ₹1500.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-blue-900 mb-2">Benefits:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Earn ₹400 per pair</li>
                <li>• Daily earning up to ₹4000</li>
                <li>• Mentorship bonuses</li>
                <li>• Performance rewards</li>
                <li>• Regular payouts</li>
              </ul>
            </div>

            <div className="space-y-3">
              <a
                href="/payment-request"
                className="block w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Submit Payment Request
              </a>
              <a
                href="/"
                className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    // Check if user is not an active affiliate
    if (!currentUser.affiliateStatus) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <FaLock className="text-4xl text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have access to the affiliate dashboard. Please contact support if you believe this is an error.
            </p>
            <div className="space-y-3">
              <a
                href="/payment-request"
                className="block w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Check Payment Status
              </a>
              <a
                href="/"
                className="block w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </a>
            </div>
          </div>
        </div>
      );
    }
  }

  // If all checks pass, render the protected component
  return children;
};

export default ProtectedRoute;
