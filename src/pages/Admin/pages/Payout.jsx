import React, { useState, useEffect } from 'react';
import { 
  FaMoneyBillWave, 
  FaCheckCircle, 
  FaTimesCircle, 
  FaSearch,
  FaFilter,
  FaDownload,
  FaSync,
  FaExclamationTriangle
} from 'react-icons/fa';
import { PayoutService } from '../../../services/payoutService';

const PayoutPage = () => {
  const [payouts, setPayouts] = useState([]);
  const [processedPayouts, setProcessedPayouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkAction, setBulkAction] = useState('process');
  const [selectedPayouts, setSelectedPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch real pending payouts from Firestore
  useEffect(() => {
    const fetchPayouts = async () => {
      setLoading(true);
      try {
        const pendingPayouts = await PayoutService.getPendingPayouts(100);
        setPayouts(pendingPayouts);
      } catch (error) {
        console.error('Error fetching payouts:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayouts();
  }, []);

  // Filter payouts based on search and level filter
  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = (payout.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
                         (payout.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || payout.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  // Process single payout (placeholder)
  const processPayout = (id) => {
    // Implement payout processing logic here
  };

  // Process all selected payouts (placeholder)
  const processSelectedPayouts = () => {
    // Implement bulk payout processing logic here
  };

  // Reject selected payouts (placeholder)
  const rejectSelectedPayouts = () => {
    // Implement bulk payout rejection logic here
  };

  const togglePayoutSelection = (id) => {
    setSelectedPayouts(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSync className="animate-spin text-4xl text-indigo-600" />
        <span className="ml-2 text-lg">Loading payouts...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800">Pending Payouts</h2>
        <p className="text-sm text-gray-500">Approve or reject payouts for marketers</p>
      </div>
      {filteredPayouts.length === 0 ? (
        <div className="p-8 text-center">
          <FaMoneyBillWave className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pending payouts</h3>
          <p className="mt-1 text-sm text-gray-500">
            All current payouts have been processed.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payout Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayouts.map((payout) => (
                <tr key={payout.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedPayouts.includes(payout.id)}
                      onChange={() => togglePayoutSelection(payout.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 font-medium">
                          {payout.userName?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{payout.userName || 'Unknown'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{payout.userEmail || 'Unknown'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ₹{payout.amount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${payout.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payout.payoutDate ? new Date(payout.payoutDate).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PayoutPage;