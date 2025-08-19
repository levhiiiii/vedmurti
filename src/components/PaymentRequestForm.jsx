import React, { useState } from 'react';
import { FaUpload, FaSpinner, FaMoneyBillWave, FaCalendarAlt, FaFileImage } from 'react-icons/fa';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useUser } from '../context/UserContext';

const PaymentRequestForm = ({ onSuccess, onCancel }) => {
  const { currentUser, submitPaymentRequest } = useUser();
  const [formData, setFormData] = useState({
    transactionId: '',
    paymentDate: '',
    bankDetails: '',
    remarks: ''
  });
  const [paymentProof, setPaymentProof] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload only JPG, PNG, or PDF files');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      setPaymentProof(file);
      
      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreviewUrl(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreviewUrl('');
      }
    }
  };

  const uploadPaymentProof = async (file) => {
    try {
      const storage = getStorage();
      const fileName = `payment-proofs/${currentUser.uid}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload payment proof');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!paymentProof) {
      alert('Please upload payment proof');
      return;
    }

    if (!formData.transactionId.trim()) {
      alert('Please enter transaction ID');
      return;
    }

    if (!formData.paymentDate) {
      alert('Please select payment date');
      return;
    }

    try {
      setSubmitting(true);
      setUploading(true);

      // Upload payment proof
      const paymentProofUrl = await uploadPaymentProof(paymentProof);
      setUploading(false);

      // Submit payment request
      const requestData = {
        ...formData,
        paymentProof: paymentProofUrl,
        paymentDate: new Date(formData.paymentDate)
      };

      const requestId = await submitPaymentRequest(requestData);
      
      if (onSuccess) {
        onSuccess(requestId);
      }
    } catch (error) {
      console.error('Error submitting payment request:', error);
      alert('Error submitting payment request: ' + error.message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <FaMoneyBillWave className="mx-auto h-12 w-12 text-indigo-600 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">Submit Payment Request</h2>
        <p className="text-gray-600 mt-2">
          Submit your offline payment proof for ₹1500 affiliate joining amount
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Payment Instructions:</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Make payment of exactly ₹1500 to the provided bank account</li>
          <li>• Take a screenshot or photo of the payment confirmation</li>
          <li>• Fill out this form with payment details</li>
          <li>• Admin will review and approve your request within 24-48 hours</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Proof Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Proof <span className="text-red-500">*</span>
          </label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-400 transition-colors">
            <div className="space-y-1 text-center">
              {previewUrl ? (
                <div className="mb-4">
                  <img src={previewUrl} alt="Payment proof preview" className="mx-auto h-32 w-auto rounded-lg" />
                </div>
              ) : (
                <FaFileImage className="mx-auto h-12 w-12 text-gray-400" />
              )}
              <div className="flex text-sm text-gray-600">
                <label className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                  <span>Upload payment proof</span>
                  <input
                    type="file"
                    className="sr-only"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    required
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
              {paymentProof && (
                <p className="text-sm text-green-600 font-medium">
                  Selected: {paymentProof.name}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Transaction ID */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction ID / Reference Number <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="transactionId"
            value={formData.transactionId}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter transaction ID or reference number"
            required
          />
        </div>

        {/* Payment Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Date <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <FaCalendarAlt className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              name="paymentDate"
              value={formData.paymentDate}
              onChange={handleInputChange}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>
        </div>

        {/* Bank Details */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Bank Details (Optional)
          </label>
          <input
            type="text"
            name="bankDetails"
            value={formData.bankDetails}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Bank name, account details used for payment"
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Remarks (Optional)
          </label>
          <textarea
            name="remarks"
            value={formData.remarks}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Any additional information about the payment"
          />
        </div>

        {/* User Information Display */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">Your Information:</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Name:</span>
              <span className="ml-2 font-medium">{currentUser?.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Email:</span>
              <span className="ml-2 font-medium">{currentUser?.email}</span>
            </div>
            <div>
              <span className="text-gray-600">Referral Code:</span>
              <span className="ml-2 font-medium">{currentUser?.referralCode}</span>
            </div>
            <div>
              <span className="text-gray-600">Amount:</span>
              <span className="ml-2 font-medium text-green-600">₹1500</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4 pt-6">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || uploading}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {submitting ? (
              <>
                <FaSpinner className="animate-spin mr-2" />
                {uploading ? 'Uploading...' : 'Submitting...'}
              </>
            ) : (
              <>
                <FaUpload className="mr-2" />
                Submit Request
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center text-sm text-gray-500">
        <p>
          After submission, you will receive a confirmation and admin will review your request.
          You'll be notified via email once your payment is approved.
        </p>
      </div>
    </div>
  );
};

export default PaymentRequestForm;
