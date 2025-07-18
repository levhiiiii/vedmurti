import React, { useState } from 'react';
import { BsBank } from 'react-icons/bs';
import { 
  FaCreditCard, 
  FaPlus, 
  FaTrash, 
  FaCheck, 
  FaEdit,
  FaArrowUp,
  FaArrowDown
} from 'react-icons/fa';

const KYCPage = () => {
  // Initial bank accounts data
  const initialBankAccounts = [
    {
      id: 1,
      accountHolderName: 'John Doe',
      accountNumber: '1234567890',
      bankName: 'Chase Bank',
      branch: 'New York Main Branch',
      ifscCode: 'CHASUS123',
      accountType: 'Checking',
      isPrimary: true,
      verified: true
    },
    {
      id: 2,
      accountHolderName: 'John Doe',
      accountNumber: '9876543210',
      bankName: 'Bank of America',
      branch: 'San Francisco Branch',
      ifscCode: 'BOFAUS456',
      accountType: 'Savings',
      isPrimary: false,
      verified: true
    }
  ];

  const [bankAccounts, setBankAccounts] = useState(initialBankAccounts);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    branch: '',
    ifscCode: '',
    accountType: 'Checking'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddAccount = () => {
    const newAccount = {
      id: Date.now(),
      ...formData,
      isPrimary: bankAccounts.length === 0,
      verified: false
    };
    
    setBankAccounts(prev => [...prev, newAccount]);
    setFormData({
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      branch: '',
      ifscCode: '',
      accountType: 'Checking'
    });
    setShowAddForm(false);
  };

  const handleEditAccount = (id) => {
    const accountToEdit = bankAccounts.find(account => account.id === id);
    if (accountToEdit) {
      setFormData({
        accountHolderName: accountToEdit.accountHolderName,
        accountNumber: accountToEdit.accountNumber,
        bankName: accountToEdit.bankName,
        branch: accountToEdit.branch,
        ifscCode: accountToEdit.ifscCode,
        accountType: accountToEdit.accountType
      });
      setEditMode(id);
      setShowAddForm(true);
    }
  };

  const handleUpdateAccount = () => {
    setBankAccounts(prev =>
      prev.map(account =>
        account.id === editMode
          ? { ...account, ...formData }
          : account
      )
    );
    setEditMode(null);
    setShowAddForm(false);
    setFormData({
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      branch: '',
      ifscCode: '',
      accountType: 'Checking'
    });
  };

  const handleDeleteAccount = (id) => {
    if (bankAccounts.find(account => account.id === id)?.isPrimary) {
      alert('Please set another account as primary before deleting this one.');
      return;
    }
    setBankAccounts(prev => prev.filter(account => account.id !== id));
  };

  const handleSetPrimary = (id) => {
    setBankAccounts(prev =>
      prev.map(account => ({
        ...account,
        isPrimary: account.id === id
      }))
    );
  };

  const handleMoveUp = (id) => {
    const index = bankAccounts.findIndex(account => account.id === id);
    if (index > 0) {
      const newAccounts = [...bankAccounts];
      [newAccounts[index], newAccounts[index - 1]] = [newAccounts[index - 1], newAccounts[index]];
      setBankAccounts(newAccounts);
    }
  };

  const handleMoveDown = (id) => {
    const index = bankAccounts.findIndex(account => account.id === id);
    if (index < bankAccounts.length - 1) {
      const newAccounts = [...bankAccounts];
      [newAccounts[index], newAccounts[index + 1]] = [newAccounts[index + 1], newAccounts[index]];
      setBankAccounts(newAccounts);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-2 lg:px-2">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Bank Account Management</h2>
              {!showAddForm && (
                <button
                  onClick={() => {
                    setShowAddForm(true);
                    setEditMode(null);
                    setFormData({
                      accountHolderName: '',
                      accountNumber: '',
                      bankName: '',
                      branch: '',
                      ifscCode: '',
                      accountType: 'Checking'
                    });
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center"
                >
                  <FaPlus className="mr-2" /> Add Bank Account
                </button>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Manage your bank accounts for salary payments. You can add multiple accounts and set one as primary.
            </p>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                {editMode ? 'Edit Bank Account' : 'Add New Bank Account'}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
                  <input
                    type="text"
                    name="accountHolderName"
                    value={formData.accountHolderName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input
                    type="text"
                    name="branch"
                    value={formData.branch}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                  <select
                    name="accountType"
                    value={formData.accountType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Checking">Checking</option>
                    <option value="Savings">Savings</option>
                    <option value="Salary">Salary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setEditMode(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={editMode ? handleUpdateAccount : handleAddAccount}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {editMode ? 'Update Account' : 'Add Account'}
                </button>
              </div>
            </div>
          )}

          {/* Bank Accounts List */}
          <div className="divide-y divide-gray-200">
            {bankAccounts.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <BsBank className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No bank accounts added</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add your bank account to receive payments.
                </p>
                <div className="mt-6">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <FaPlus className="-ml-1 mr-2 h-5 w-5" />
                    Add Bank Account
                  </button>
                </div>
              </div>
            ) : (
              bankAccounts.map((account, index) => (
                <div key={account.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 pt-1">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        account.isPrimary ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        <BsBank className="h-5 w-5" />
                      </div>
                    </div>
                    
                    <div className="ml-4 flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-base font-medium text-gray-900">
                            {account.bankName} ••••{account.accountNumber.slice(-4)}
                          </h3>
                          <p className={`text-sm ${
                            account.verified ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {account.verified ? (
                              <span className="inline-flex items-center">
                                <FaCheck className="mr-1" /> Verified
                              </span>
                            ) : (
                              <span>Pending Verification</span>
                            )}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {account.isPrimary ? (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Primary
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSetPrimary(account.id)}
                              className="text-xs text-indigo-600 hover:text-indigo-900"
                            >
                              Set as Primary
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-500">
                        <div>
                          <span className="font-medium">Account Holder:</span> {account.accountHolderName}
                        </div>
                        <div>
                          <span className="font-medium">Type:</span> {account.accountType}
                        </div>
                        <div>
                          <span className="font-medium">Branch:</span> {account.branch}
                        </div>
                        <div>
                          <span className="font-medium">IFSC:</span> {account.ifscCode}
                        </div>
                      </div>
                      
                      <div className="mt-3 flex space-x-3">
                        <button
                          onClick={() => handleEditAccount(account.id)}
                          className="text-sm text-indigo-600 hover:text-indigo-900 flex items-center"
                        >
                          <FaEdit className="mr-1" /> Edit
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="text-sm text-red-600 hover:text-red-900 flex items-center"
                        >
                          <FaTrash className="mr-1" /> Delete
                        </button>
                        {index > 0 && (
                          <button
                            onClick={() => handleMoveUp(account.id)}
                            className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
                            title="Move up"
                          >
                            <FaArrowUp className="mr-1" />
                          </button>
                        )}
                        {index < bankAccounts.length - 1 && (
                          <button
                            onClick={() => handleMoveDown(account.id)}
                            className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
                            title="Move down"
                          >
                            <FaArrowDown className="mr-1" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Instructions */}
          {bankAccounts.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">Payment Processing Information</h3>
              <p className="text-sm text-gray-500 mt-1">
                Salary payments will be deposited to your primary bank account. 
                You can change your primary account at any time. 
                Secondary accounts will be used as fallback options if the primary account fails.
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Verification may take 1-2 business days for new accounts. 
                You'll receive a notification once your account is verified.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KYCPage;