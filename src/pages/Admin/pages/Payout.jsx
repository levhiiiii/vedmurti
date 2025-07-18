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

const PayoutPage = () => {
  // Mock data for pending payouts
  const [payouts, setPayouts] = useState([
    {
      id: 1001,
      marketerId: 'MKT001',
      name: 'Sarah Johnson',
      level: 'Diamond',
      amount: 1250.00,
      paymentMethod: 'Bank Transfer',
      account: 'Chase ••••3456',
      status: 'pending',
      dueDate: '2023-07-25'
    },
    {
      id: 1002,
      marketerId: 'MKT002',
      name: 'Michael Chen',
      level: 'Gold',
      amount: 850.00,
      paymentMethod: 'Bank Transfer',
      account: 'Bank of America ••••7890',
      status: 'pending',
      dueDate: '2023-07-25'
    },
    {
      id: 1003,
      marketerId: 'MKT003',
      name: 'Emily Rodriguez',
      level: 'Silver',
      amount: 450.00,
      paymentMethod: 'PayPal',
      account: 'emily.rodriguez@example.com',
      status: 'pending',
      dueDate: '2023-07-25'
    },
    {
      id: 1004,
      marketerId: 'MKT004',
      name: 'David Kim',
      level: 'Silver',
      amount: 380.00,
      paymentMethod: 'Bank Transfer',
      account: 'Wells Fargo ••••5678',
      status: 'pending',
      dueDate: '2023-07-25'
    },
    {
      id: 1005,
      marketerId: 'MKT005',
      name: 'Jessica Williams',
      level: 'Diamond',
      amount: 1500.00,
      paymentMethod: 'Bank Transfer',
      account: 'Citibank ••••9012',
      status: 'pending',
      dueDate: '2023-07-25'
    }
  ]);

  const [processedPayouts, setProcessedPayouts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bulkAction, setBulkAction] = useState('process');
  const [selectedPayouts, setSelectedPayouts] = useState([]);

  // Filter payouts based on search and level filter
  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = payout.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         payout.marketerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = selectedLevel === 'all' || payout.level === selectedLevel;
    return matchesSearch && matchesLevel;
  });

  // Process single payout
  const processPayout = (id) => {
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      const payoutToProcess = payouts.find(p => p.id === id);
      setPayouts(payouts.filter(p => p.id !== id));
      setProcessedPayouts([...processedPayouts, { ...payoutToProcess, status: 'processed', processedDate: new Date().toISOString().split('T')[0] }]);
      setIsProcessing(false);
    }, 1000);
  };

  // Process all selected payouts
  const processSelectedPayouts = () => {
    if (selectedPayouts.length === 0) return;
    
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      const payoutsToProcess = payouts.filter(p => selectedPayouts.includes(p.id));
      setPayouts(payouts.filter(p => !selectedPayouts.includes(p.id)));
      setProcessedPayouts([
        ...processedPayouts,
        ...payoutsToProcess.map(p => ({ 
          ...p, 
          status: 'processed', 
          processedDate: new Date().toISOString().split('T')[0] 
        }))
      ]);
      setSelectedPayouts([]);
      setIsProcessing(false);
    }, 1500);
  };

  // Reject selected payouts
  const rejectSelectedPayouts = () => {
    if (selectedPayouts.length === 0) return;
    
    setIsProcessing(true);
    // Simulate API call
    setTimeout(() => {
      const payoutsToReject = payouts.filter(p => selectedPayouts.includes(p.id));
      setPayouts(payouts.filter(p => !selectedPayouts.includes(p.id)));
      setProcessedPayouts([
        ...processedPayouts,
        ...payoutsToReject.map(p => ({ 
          ...p, 
          status: 'rejected', 
          processedDate: new Date().toISOString().split('T')[0] 
        }))
      ]);
      setSelectedPayouts([]);
      setIsProcessing(false);
    }, 1500);
  };

  // Toggle payout selection
  const togglePayoutSelection = (id) => {
    setSelectedPayouts(prev =>
      prev.includes(id)
        ? prev.filter(p => p !== id)
        : [...prev, id]
    );
  };

  // Select all payouts on current page
  const selectAllPayouts = () => {
    if (selectedPayouts.length === filteredPayouts.length) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(filteredPayouts.map(p => p.id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Payout Management</h1>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center">
              <FaSync className="mr-2" /> Refresh
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center">
              <FaDownload className="mr-2" /> Export
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Marketers</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name or ID..."
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="Diamond">Diamond</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Bronze">Bronze</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                defaultValue="2023-07-25"
              />
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={selectedPayouts.length > 0 && selectedPayouts.length === filteredPayouts.length}
                onChange={selectAllPayouts}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                {selectedPayouts.length > 0 
                  ? `${selectedPayouts.length} selected` 
                  : 'Select all'}
              </span>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
              >
                <option value="process">Process Selected</option>
                <option value="reject">Reject Selected</option>
              </select>
              
              <button
                onClick={bulkAction === 'process' ? processSelectedPayouts : rejectSelectedPayouts}
                disabled={selectedPayouts.length === 0 || isProcessing}
                className={`px-4 py-2 rounded-lg flex items-center ${
                  selectedPayouts.length === 0 || isProcessing
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : bulkAction === 'process'
                      ? 'bg-green-600 text-white hover:bg-green-700'
                      : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  <>
                    {bulkAction === 'process' ? (
                      <FaMoneyBillWave className="mr-2" />
                    ) : (
                      <FaTimesCircle className="mr-2" />
                    )}
                    {bulkAction === 'process' ? 'Process' : 'Reject'} Selected
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Pending Payouts */}
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
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marketer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
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
                              {payout.name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{payout.name}</div>
                            <div className="text-sm text-gray-500">{payout.marketerId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payout.level === 'Diamond' ? 'bg-purple-100 text-purple-800' :
                          payout.level === 'Gold' ? 'bg-yellow-100 text-yellow-800' :
                          payout.level === 'Silver' ? 'bg-gray-100 text-gray-800' :
                          'bg-orange-100 text-orange-800'
                        }`}>
                          {payout.level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${payout.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payout.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payout.account}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payout.dueDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => processPayout(payout.id)}
                          disabled={isProcessing}
                          className="text-green-600 hover:text-green-900 mr-4 flex items-center"
                        >
                          <FaCheckCircle className="mr-1" /> Process
                        </button>
                        <button
                          onClick={() => {
                            setPayouts(payouts.filter(p => p.id !== payout.id));
                            setProcessedPayouts([
                              ...processedPayouts,
                              { ...payout, status: 'rejected', processedDate: new Date().toISOString().split('T')[0] }
                            ]);
                          }}
                          className="text-red-600 hover:text-red-900 flex items-center"
                        >
                          <FaTimesCircle className="mr-1" /> Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Processed Payouts */}
        {processedPayouts.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Processed Payouts</h2>
              <p className="text-sm text-gray-500">Recently processed payouts</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marketer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Processed Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processedPayouts.slice(0, 5).map((payout) => (
                    <tr key={`processed-${payout.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-medium">
                              {payout.name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{payout.name}</div>
                            <div className="text-sm text-gray-500">{payout.marketerId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${payout.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          payout.status === 'processed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {payout.status === 'processed' ? 'Processed' : 'Rejected'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payout.processedDate}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payout.paymentMethod}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {processedPayouts.length > 5 && (
              <div className="px-6 py-4 border-t border-gray-200 text-center">
                <button className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                  View all {processedPayouts.length} processed payouts
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutPage;