import React, { useState, useEffect } from 'react';
import { 
  FaUsers, 
  FaTrash, 
  FaSearch, 
  FaFilter,
  FaSpinner,
  FaUser,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaShieldAlt,
  FaCheck,
  FaTimes,
  FaEye
} from 'react-icons/fa';
import { db } from '../../../Firebase/firebase';
import { collection, getDocs, doc, deleteDoc, getDoc, query, where, orderBy } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { auth } from '../../../Firebase/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { MLMService } from '../../../services/mlmService';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  const [statistics, setStatistics] = useState({
    totalUsers: 0,
    activeUsers: 0,
    affiliateUsers: 0,
    adminUsers: 0
  });

  // Load users
  useEffect(() => {
    loadUsers();
  }, []);

  // Filter users based on status and search
  useEffect(() => {
    let filtered = users;

    if (statusFilter !== 'all') {
      if (statusFilter === 'affiliate') {
        filtered = filtered.filter(user => user.affiliateStatus === true);
      } else if (statusFilter === 'admin') {
        filtered = filtered.filter(user => user.role === 'admin');
      } else if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.isActive !== false);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.referralCode?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  }, [users, statusFilter, searchTerm]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersData = [];
      querySnapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        });
      });

      setUsers(usersData);
      
      // Calculate statistics
      const stats = {
        totalUsers: usersData.length,
        activeUsers: usersData.filter(user => user.isActive !== false).length,
        affiliateUsers: usersData.filter(user => user.affiliateStatus === true).length,
        adminUsers: usersData.filter(user => user.role === 'admin').length
      };
      setStatistics(stats);
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    try {
      setProcessing(true);
      
      // First, get the user document to check if it has a uid
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        alert('User not found');
        return;
      }

      const userData = userDoc.data();
      const userReferralCode = userData.referralCode;
      
      if (!userData.uid) {
        // If no UID, just delete from Firestore
        await deleteDoc(doc(db, 'users', userId));
        
        // Clean up downline references if user had a referral code
        if (userReferralCode) {
          try {
            await MLMService.cleanupDownlineReferences(userReferralCode);
          } catch (cleanupError) {
            console.error('Error cleaning up downline references:', cleanupError);
          }
        }
        
        alert('User deleted from database successfully!');
        await loadUsers();
        return;
      }

      // Try to use Cloud Function for complete deletion
      try {
        const functions = getFunctions();
        const deleteUserFunction = httpsCallable(functions, 'deleteUser');
        
        await deleteUserFunction({ userId, userUid: userData.uid });
        
        // Clean up downline references if user had a referral code
        if (userReferralCode) {
          try {
            await MLMService.cleanupDownlineReferences(userReferralCode);
          } catch (cleanupError) {
            console.error('Error cleaning up downline references:', cleanupError);
          }
        }
        
        alert('User deleted successfully from both database and authentication!');
        await loadUsers();
      } catch (cloudFunctionError) {
        console.error('Cloud Function error:', cloudFunctionError);
        
        // Fallback: delete from Firestore only
        await deleteDoc(doc(db, 'users', userId));
        
        // Clean up downline references if user had a referral code
        if (userReferralCode) {
          try {
            await MLMService.cleanupDownlineReferences(userReferralCode);
          } catch (cleanupError) {
            console.error('Error cleaning up downline references:', cleanupError);
          }
        }
        
        const message = `User deleted from database successfully!\n\nUser UID: ${userData.uid}\n\nNote: To completely remove the user, you may need to delete them from Firebase Authentication console as well.`;
        alert(message);
        
        await loadUsers();
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const openUserModal = (user) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const getStatusBadge = (user) => {
    if (user.role === 'admin') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Admin</span>;
    }
    if (user.affiliateStatus === true) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Affiliate</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">User</span>;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const StatCard = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color}`}>
          {icon}
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="mb-4">
          <FaSpinner className="animate-spin text-4xl text-indigo-600" />
        </div>
        <p className="text-gray-600">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">User Management</h1>
        <p className="text-gray-600">Manage all users in the system</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={statistics.totalUsers}
          icon={<FaUsers className="text-2xl text-blue-600" />}
          color="bg-blue-100"
        />
        <StatCard
          title="Active Users"
          value={statistics.activeUsers}
          icon={<FaCheck className="text-2xl text-green-600" />}
          color="bg-green-100"
        />
        <StatCard
          title="Affiliate Users"
          value={statistics.affiliateUsers}
          icon={<FaShieldAlt className="text-2xl text-purple-600" />}
          color="bg-purple-100"
        />
        <StatCard
          title="Admin Users"
          value={statistics.adminUsers}
          icon={<FaUser className="text-2xl text-red-600" />}
          color="bg-red-100"
        />
      </div>

      {/* Filters and Search */}
      <div className="bg-white shadow-xl rounded-xl overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Users</h3>
              <p className="text-sm text-gray-500">
                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">All Users</option>
                <option value="affiliate">Affiliates</option>
                <option value="admin">Admins</option>
                <option value="active">Active Users</option>
              </select>
              
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="text-center py-12 bg-red-50 text-red-600 rounded-b-xl">
            <FaTimes className="mx-auto text-3xl mb-3" />
            <p className="font-medium">{error}</p>
            <button 
              onClick={loadUsers}
              className="mt-3 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Retry
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <FaUsers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No users found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' ? 
                'Try adjusting your search or filter criteria' : 
                'There are currently no users to display'}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredUsers.map((user) => (
              <li 
                key={user.id} 
                className="p-6 hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0 h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      {user.profilePicture ? (
                        <img 
                          src={user.profilePicture} 
                          alt={user.name} 
                          className="h-full w-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xl font-bold text-indigo-600">
                          {user.name?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-base font-semibold text-gray-900 truncate">
                          {user.name || 'Unnamed User'}
                        </span>
                        {getStatusBadge(user)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <FaEnvelope className="text-xs" />
                          <span>{user.email || 'No email'}</span>
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-1">
                            <FaPhone className="text-xs" />
                            <span>{user.phone}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <FaCalendarAlt className="text-xs" />
                          <span>{formatDate(user.createdAt)}</span>
                        </div>
                      </div>
                      
                      {user.referralCode && (
                        <div className="text-xs text-gray-400 mt-1">
                          Referral: {user.referralCode}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openUserModal(user)}
                      className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors duration-200"
                      title="View User Details"
                    >
                      <FaEye />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      disabled={processing}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                      title="Delete User"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* User Details Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full transform transition-all duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">User Details</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0 h-16 w-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    {selectedUser.profilePicture ? (
                      <img 
                        src={selectedUser.profilePicture} 
                        alt={selectedUser.name} 
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-indigo-600">
                        {selectedUser.name?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {selectedUser.name || 'Unnamed User'}
                    </h4>
                    {getStatusBadge(selectedUser)}
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="text-sm text-gray-900">{selectedUser.email || 'No email'}</p>
                  </div>
                  
                  {selectedUser.phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-sm text-gray-900">{selectedUser.phone}</p>
                    </div>
                  )}
                  
                                     {selectedUser.referralCode && (
                     <div>
                       <label className="text-sm font-medium text-gray-500">Referral Code</label>
                       <p className="text-sm text-gray-900">{selectedUser.referralCode}</p>
                     </div>
                   )}
                   
                   {selectedUser.uid && (
                     <div>
                       <label className="text-sm font-medium text-gray-500">Firebase UID</label>
                       <p className="text-sm text-gray-900 font-mono">{selectedUser.uid}</p>
                     </div>
                   )}
                   
                   <div>
                     <label className="text-sm font-medium text-gray-500">Joined</label>
                     <p className="text-sm text-gray-900">{formatDate(selectedUser.createdAt)}</p>
                   </div>
                   
                   <div>
                     <label className="text-sm font-medium text-gray-500">Status</label>
                     <p className="text-sm text-gray-900">
                       {selectedUser.isActive !== false ? 'Active' : 'Inactive'}
                     </p>
                   </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleDelete(selectedUser.id);
                    setShowModal(false);
                  }}
                  disabled={processing}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors duration-200"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageUsers; 