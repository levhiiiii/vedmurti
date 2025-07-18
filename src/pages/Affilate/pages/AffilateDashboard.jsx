// components/AffiliateDashboard.jsx
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { app } from '../../../Firebase/firebase';
import { FaLink, FaUsers, FaRupeeSign, FaChartLine, FaUser, FaCopy, FaShareAlt, FaRegClock } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';
import { RiUserReceivedFill } from 'react-icons/ri';
import { BsCheckCircleFill, BsClockHistory } from 'react-icons/bs';
import LeafLoader from '../../../components/Loader';
import { motion } from 'framer-motion';

export default function AffiliateDashboard({ userId }) {
  const [user, setUser] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    const fetchUserAndReferrals = async () => {
      try {
        setLoading(true);
        const db = getFirestore(app);

        // Fetch user data
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        setUser(userData);

        // Fetch referrals if user has a referral code
        if (userData.referralCode) {
          const q = query(
            collection(db, 'users'),
            where('referredBy', '==', userData.referralCode)
          );
          
          const querySnapshot = await getDocs(q);
          const referralsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setReferrals(referralsData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUserAndReferrals();
    }
  }, [userId]);

  const copyReferralLink = () => {
    if (!user?.referralCode) return;
    
    navigator.clipboard.writeText(
      `${window.location.origin}/register?ref=${user.referralCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferralLink = async () => {
    try {
      await navigator.share({
        title: 'Join me on this amazing platform!',
        text: `Use my referral code ${user.referralCode} to get started.`,
        url: `${window.location.origin}/register?ref=${user.referralCode}`
      });
    } catch (err) {
      console.log('Sharing failed:', err);
    }
  };

  const filteredReferrals = referrals.filter(ref => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ref.affiliateStatus;
    if (activeTab === 'inactive') return !ref.affiliateStatus;
    return true;
  });

  if (loading) {
    return (
      <div className="p-4 w-full flex h-screen justify-center items-center text-center">
        <LeafLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 text-center">
        <div className="bg-red-50 p-4 rounded-xl max-w-md mx-auto">
          <h3 className="text-lg font-medium mb-2">Error Loading Dashboard</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-100 text-red-600 rounded-md hover:bg-red-200 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 text-center">
        <div className="bg-yellow-50 p-4 rounded-xl max-w-md mx-auto">
          <h3 className="text-lg font-medium mb-2">User Not Found</h3>
          <p>We couldn't find your account information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Affiliate Dashboard</h1>
            <p className="text-gray-600 mt-1">Track your referrals and earnings</p>
          </div>
          <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-full shadow-sm mt-4 md:mt-0">
            {user.profilePic ? (
              <img 
                src={user.profilePic} 
                alt={user.name} 
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
                <span className="text-white font-medium text-sm">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <span className="text-sm font-medium text-gray-700">{user.name}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Referrals</p>
                <p className="text-3xl font-bold mt-1 text-gray-800">{referrals.length || 0}</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-green-600">
                <RiUserReceivedFill className="text-xl" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500 flex items-center">
                <BsClockHistory className="mr-1" />
                Updated just now
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Pending Earnings</p>
                <p className="text-3xl font-bold mt-1 text-gray-800">₹{(user.affiliateBalance || 0).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                <FaRegClock className="text-xl" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Payouts processed weekly
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Earnings</p>
                <p className="text-3xl font-bold mt-1 text-gray-800">₹{(user.totalEarnings || 0).toFixed(2)}</p>
              </div>
              <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                <FaChartLine className="text-xl" />
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                All-time earnings from referrals
              </p>
            </div>
          </motion.div>
        </div>

        {/* Referral Link Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-8"
        >
          <h3 className="text-lg font-semibold mb-3 text-gray-800">Your Referral Link</h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                readOnly
                className="w-full p-3 pr-10 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                value={user.referralCode ? `${window.location.origin}/register?ref=${user.referralCode}` : 'No referral code available'}
              />
              <button
                onClick={copyReferralLink}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-gray-500 hover:text-gray-700"
                title="Copy to clipboard"
              >
                {copied ? (
                  <BsCheckCircleFill className="text-green-500 text-lg" />
                ) : (
                  <FaCopy className="text-lg" />
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyReferralLink}
                className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
                  user.referralCode 
                    ? 'bg-green-600 text-white hover:bg-green-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                } transition-colors`}
                disabled={!user.referralCode}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              {navigator.share && (
                <button
                  onClick={shareReferralLink}
                  className="px-4 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <FaShareAlt /> Share
                </button>
              )}
            </div>
          </div>
          
          {user.referredBy && (
            <p className="text-sm text-gray-500 mt-3">
              You were referred by: <span className="font-medium text-gray-700">{user.referredBy}</span>
            </p>
          )}
          
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-gray-700 mb-2">How it works</h4>
            <ul className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <div className="mt-0.5 text-green-500">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100">1</span>
                </div>
                Share your unique link with friends
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-0.5 text-green-500">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100">2</span>
                </div>
                They sign up using your link
              </li>
              <li className="flex items-start gap-2">
                <div className="mt-0.5 text-green-500">
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-green-100">3</span>
                </div>
                Earn rewards when they make purchases
              </li>
            </ul>
          </div>
        </motion.div>

        {/* Referrals Table Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white p-5 rounded-xl shadow-sm border border-gray-100"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5">
            <h3 className="text-lg font-semibold text-gray-800 mb-3 sm:mb-0">Your Referrals</h3>
            
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'all' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                All ({referrals.length})
              </button>
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'active' ? 'bg-white shadow-sm text-green-600' : 'text-gray-600 hover:text-green-600'
                }`}
              >
                Active ({referrals.filter(r => r.affiliateStatus).length})
              </button>
              <button
                onClick={() => setActiveTab('inactive')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  activeTab === 'inactive' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-600 hover:text-orange-600'
                }`}
              >
                Inactive ({referrals.filter(r => !r.affiliateStatus).length})
              </button>
            </div>
          </div>
          
          {filteredReferrals.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="mx-auto max-w-xs">
                <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                  <FaUsers className="text-2xl" />
                </div>
                <h4 className="text-gray-700 font-medium mb-1">No referrals yet</h4>
                <p className="text-gray-500 text-sm mb-4">Share your referral link to start earning</p>
                <button
                  onClick={copyReferralLink}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-md transition-all"
                >
                  Copy Referral Link
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReferrals.map((referral) => (
                    <tr key={referral.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {referral.profilePic ? (
                            <img 
                              className="h-10 w-10 rounded-full mr-3 object-cover" 
                              src={referral.profilePic} 
                              alt={referral.name} 
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center mr-3">
                              <span className="text-white font-medium">
                                {referral.name?.charAt(0).toUpperCase() || 'U'}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{referral.name}</div>
                            {referral.referralCode && (
                              <div className="text-xs text-gray-500">ID: {referral.referralCode}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{referral.email}</div>
                        <div className="text-sm text-gray-500">{referral.mobile || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {referral.createdAt?.toDate?.().toLocaleDateString('en-IN') || 'Unknown date'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {referral.createdAt?.toDate?.().toLocaleTimeString('en-IN', {hour: '2-digit', minute:'2-digit'}) || ''}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          referral.affiliateStatus 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {referral.affiliateStatus ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                          View
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          <FiExternalLink />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}