import React, { useState, useEffect } from 'react';
import { BsBank } from 'react-icons/bs';
import { 
  FaCreditCard, 
  FaPlus, 
  FaTrash, 
  FaCheck, 
  FaEdit,
  FaArrowUp,
  FaArrowDown,
  FaSpinner
} from 'react-icons/fa';
import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { app } from '../../../Firebase/firebase';
import { useUser } from '../../../context/UserContext';

const KYCPage = () => {
  const { currentUser } = useUser();
  const [bankAccounts, setBankAccounts] = useState([]);
  
  // Debug current user
  console.log('KYC Page - Current user:', currentUser);
  console.log('KYC Page - Current user UID:', currentUser?.uid);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editMode, setEditMode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    accountNumber: '',
    bankName: '',
    branch: '',
    ifscCode: '',
    accountType: 'Checking'
  });

  // Fetch bank accounts in real-time
  useEffect(() => {
    if (!currentUser?.uid) {
      console.log('No current user UID available');
      setLoading(false);
      return;
    }

    console.log('Fetching bank accounts for user:', currentUser.uid);
    const db = getFirestore(app);
    const bankAccountsRef = collection(db, 'bankAccounts');
    const q = query(
      bankAccountsRef, 
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accounts = [];
      console.log('Bank accounts snapshot received, size:', snapshot.size);
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Bank account data:', { id: doc.id, ...data });
        accounts.push({
          id: doc.id,
          ...data
        });
      });
      console.log('Setting bank accounts:', accounts);
      setBankAccounts(accounts);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching bank accounts:', error);
      
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        console.log('Index not available, trying without orderBy');
        const simpleQuery = query(
          bankAccountsRef, 
          where('userId', '==', currentUser.uid)
        );
        
        const simpleUnsubscribe = onSnapshot(simpleQuery, (snapshot) => {
          const accounts = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Bank account data (simple query):', { id: doc.id, ...data });
            accounts.push({
              id: doc.id,
              ...data
            });
          });
          console.log('Setting bank accounts (simple query):', accounts);
          setBankAccounts(accounts);
          setLoading(false);
        }, (simpleError) => {
          console.error('Error with simple query:', simpleError);
          setError('Failed to load bank accounts: ' + simpleError.message);
          setLoading(false);
        });
        
        return () => simpleUnsubscribe();
      } else {
        setError('Failed to load bank accounts: ' + error.message);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddAccount = async () => {
    if (!currentUser?.uid) {
      setError('User not authenticated');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      console.log('Adding bank account for user:', currentUser.uid);
      console.log('Form data:', formData);
      
      const db = getFirestore(app);
      const bankAccountsRef = collection(db, 'bankAccounts');
      
      const newAccount = {
        userId: currentUser.uid,
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        bankName: formData.bankName,
        branch: formData.branch,
        ifscCode: formData.ifscCode,
        accountType: formData.accountType,
        isPrimary: bankAccounts.length === 0,
        verified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      console.log('New account data:', newAccount);
      const docRef = await addDoc(bankAccountsRef, newAccount);
      console.log('Bank account added successfully with ID:', docRef.id);
      
      // Mark user as KYC completed when they add their first bank account
      if (bankAccounts.length === 0) {
        console.log('Marking user as KYC completed');
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          kycCompleted: true,
          kycCompletedAt: new Date()
        });
        console.log('User marked as KYC completed');
      }
      
      setFormData({
        accountHolderName: '',
        accountNumber: '',
        bankName: '',
        branch: '',
        ifscCode: '',
        accountType: 'Checking'
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error adding bank account:', error);
      setError('Failed to add bank account: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditAccount = (account) => {
    setFormData({
      accountHolderName: account.accountHolderName,
      accountNumber: account.accountNumber,
      bankName: account.bankName,
      branch: account.branch,
      ifscCode: account.ifscCode,
      accountType: account.accountType
    });
    setEditMode(account.id);
    setShowAddForm(true);
  };

  const handleUpdateAccount = async () => {
    if (!editMode) return;

    try {
      setSaving(true);
      setError(null);
      
      const db = getFirestore(app);
      const accountRef = doc(db, 'bankAccounts', editMode);
      
      await updateDoc(accountRef, {
        accountHolderName: formData.accountHolderName,
        accountNumber: formData.accountNumber,
        bankName: formData.bankName,
        branch: formData.branch,
        ifscCode: formData.ifscCode,
        accountType: formData.accountType,
        updatedAt: new Date()
      });

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
    } catch (error) {
      console.error('Error updating bank account:', error);
      setError('Failed to update bank account');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async (id) => {
    const accountToDelete = bankAccounts.find(account => account.id === id);
    if (accountToDelete?.isPrimary) {
      setError('Please set another account as primary before deleting this one.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    try {
      setError(null);
      const db = getFirestore(app);
      const accountRef = doc(db, 'bankAccounts', id);
      await deleteDoc(accountRef);
    } catch (error) {
      console.error('Error deleting bank account:', error);
      setError('Failed to delete bank account');
    }
  };

  const handleSetPrimary = async (id) => {
    try {
      setError(null);
      const db = getFirestore(app);
      
      // First, set all accounts as non-primary
      const batch = [];
      bankAccounts.forEach(account => {
        const accountRef = doc(db, 'bankAccounts', account.id);
        batch.push(updateDoc(accountRef, { isPrimary: false }));
      });
      
      // Then set the selected account as primary
      const primaryAccountRef = doc(db, 'bankAccounts', id);
      batch.push(updateDoc(primaryAccountRef, { isPrimary: true }));
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Error setting primary account:', error);
      setError('Failed to set primary account');
    }
  };

  const handleMoveUp = async (id) => {
    const index = bankAccounts.findIndex(account => account.id === id);
    if (index > 0) {
      try {
        setError(null);
        const db = getFirestore(app);
        
        // Swap the order by updating createdAt timestamps
        const currentAccount = bankAccounts[index];
        const previousAccount = bankAccounts[index - 1];
        
        const currentRef = doc(db, 'bankAccounts', currentAccount.id);
        const previousRef = doc(db, 'bankAccounts', previousAccount.id);
        
        await Promise.all([
          updateDoc(currentRef, { createdAt: previousAccount.createdAt }),
          updateDoc(previousRef, { createdAt: currentAccount.createdAt })
        ]);
      } catch (error) {
        console.error('Error moving account:', error);
        setError('Failed to reorder accounts');
      }
    }
  };

  const handleMoveDown = async (id) => {
    const index = bankAccounts.findIndex(account => account.id === id);
    if (index < bankAccounts.length - 1) {
      try {
        setError(null);
        const db = getFirestore(app);
        
        // Swap the order by updating createdAt timestamps
        const currentAccount = bankAccounts[index];
        const nextAccount = bankAccounts[index + 1];
        
        const currentRef = doc(db, 'bankAccounts', currentAccount.id);
        const nextRef = doc(db, 'bankAccounts', nextAccount.id);
        
        await Promise.all([
          updateDoc(currentRef, { createdAt: nextAccount.createdAt }),
          updateDoc(nextRef, { createdAt: currentAccount.createdAt })
        ]);
      } catch (error) {
        console.error('Error moving account:', error);
        setError('Failed to reorder accounts');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-2 lg:px-2">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white shadow rounded-lg p-8">
            <div className="flex items-center justify-center">
              <FaSpinner className="animate-spin text-4xl text-indigo-600" />
              <span className="ml-3 text-lg text-gray-600">Loading bank accounts...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2 sm:px-2 lg:px-2">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Bank Account Management</h2>
              <div className="flex items-center gap-2">
                {/* Debug info */}
                <div className="text-xs text-gray-500">
                  User: {currentUser?.uid ? 'Logged in' : 'Not logged in'}
                  <br />
                  Accounts: {bankAccounts.length}
                </div>
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
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Manage your bank accounts for salary payments. You can add multiple accounts and set one as primary.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="px-6 py-3 bg-red-50 border-b border-red-200">
              <div className="flex items-center">
                <FaCheck className="text-red-400 mr-2" />
                <span className="text-red-700">{error}</span>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-400 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            </div>
          )}

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
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={editMode ? handleUpdateAccount : handleAddAccount}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                >
                  {saving && <FaSpinner className="animate-spin mr-2" />}
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
                          onClick={() => handleEditAccount(account)}
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