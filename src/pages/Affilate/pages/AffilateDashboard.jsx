// Enhanced MLM Affiliate Dashboard
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot } from 'firebase/firestore';
import { app } from '../../../Firebase/firebase';
import { 
  FaUsers, FaRupeeSign, FaChartLine, FaCopy, FaShareAlt, FaRegClock, 
  FaBullhorn, FaUserTie, FaGift, FaFire, FaTrophy, FaCalendarCheck,
  FaArrowUp, FaArrowDown, FaEye, FaDownload, FaCrown, FaStar,
  FaNetworkWired, FaHandHoldingUsd, FaMedal, FaChartBar, FaCoins,
  FaCalendarAlt, FaClock, FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';
import { 
  MdTrendingUp, MdTrendingDown, MdAccountBalance, MdTimeline,
  MdDashboard, MdPeople, MdAttachMoney, MdShowChart
} from 'react-icons/md';
import { 
  BsCheckCircleFill, BsClockHistory, BsStarFill, BsGraphUp,
  BsPersonCheck, BsAward, BsLightning, BsCurrencyRupee
} from 'react-icons/bs';
import { RiUserReceivedFill, RiTeamFill, RiMoneyRupeeCircleFill } from 'react-icons/ri';
import { HiOutlineTrendingUp, HiOutlineTrendingDown } from 'react-icons/hi';
import LeafLoader from '../../../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import MLMService from '../../../services/mlmService';
import IncomeService from '../../../services/incomeService';
import PayoutService from '../../../services/payoutService';

export default function AffiliateDashboard({ userId }) {
  // State Management
  const [user, setUser] = useState(null);
  const [mlmData, setMlmData] = useState(null);
  const [incomeData, setIncomeData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [incomeHistory, setIncomeHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeIncomeTab, setActiveIncomeTab] = useState('all');
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Comprehensive Data Fetching
  useEffect(() => {
    const fetchAllData = async () => {
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

        // Fetch MLM data
        try {
          const mlmUserData = await MLMService.getUserMLMData(userId);
          setMlmData(mlmUserData);
        } catch (mlmError) {
          console.log('MLM data not found, user may not be registered in MLM system');
        }

        // Fetch income data
        try {
          const incomeSummary = await IncomeService.getUserIncomeSummary(userId);
          setIncomeData(incomeSummary);
        } catch (incomeError) {
          console.log('Income data not found');
        }

        // Fetch income history
        try {
          const history = await IncomeService.getIncomeHistory(userId, 50);
          setIncomeHistory(history);
        } catch (historyError) {
          console.log('Income history not found');
        }

        // Fetch analytics
        try {
          const analyticsData = await IncomeService.getIncomeAnalytics(userId);
          setAnalytics(analyticsData);
        } catch (analyticsError) {
          console.log('Analytics data not found');
        }

        // Fetch team statistics
        try {
          const teamData = await IncomeService.calculateTeamVolume(userId);
          setTeamStats(teamData);
        } catch (teamError) {
          console.log('Team stats not found');
        }

        // Fetch referrals
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
      fetchAllData();
    }
  }, [userId]);

  // Real-time updates
  useEffect(() => {
    if (!userId) return;

    const unsubscribers = [];

    // Subscribe to income updates
    try {
      const unsubscribeIncome = IncomeService.subscribeToIncomeUpdates(
        userId,
        (dataType, data) => {
          if (dataType === 'mlm_data') {
            setMlmData(data);
          } else if (dataType === 'income_records') {
            setIncomeHistory(data);
          }
        }
      );
      unsubscribers.push(unsubscribeIncome);
    } catch (error) {
      console.log('Real-time updates not available');
    }

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [userId]);

  // Utility Functions
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
        title: 'Join Vedmurti MLM Network!',
        text: `Use my referral code ${user.referralCode} to start earning with our MLM system.`,
        url: `${window.location.origin}/register?ref=${user.referralCode}`
      });
    } catch (err) {
      console.log('Sharing failed:', err);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      // Refresh all data
      const incomeSummary = await IncomeService.getUserIncomeSummary(userId);
      setIncomeData(incomeSummary);
      
      const history = await IncomeService.getIncomeHistory(userId, 50);
      setIncomeHistory(history);
      
      const analyticsData = await IncomeService.getIncomeAnalytics(userId);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const filteredReferrals = referrals.filter(ref => {
    if (activeIncomeTab === 'all') return true;
    if (activeIncomeTab === 'active') return ref.affiliateStatus;
    if (activeIncomeTab === 'inactive') return !ref.affiliateStatus;
    return true;
  });

  const filteredIncomeHistory = incomeHistory.filter(income => {
    if (activeIncomeTab === 'all') return true;
    if (activeIncomeTab === 'promotional') return income.type === 'promotional';
    if (activeIncomeTab === 'mentorship') return income.type === 'mentorship';
    if (activeIncomeTab === 'performance') return income.type === 'performance_reward';
    return true;
  });

  // Calculate performance metrics
  const getPerformanceMetrics = () => {
    if (!incomeData || !mlmData) return null;
    
    const totalPairs = incomeData.pairsCount || 0;
    const leftCount = incomeData.totalLeftCount || 0;
    const rightCount = incomeData.totalRightCount || 0;
    const balanceRatio = Math.min(leftCount, rightCount) / Math.max(leftCount, rightCount, 1);
    
    return {
      totalPairs,
      leftCount,
      rightCount,
      balanceRatio,
      availableCycles: incomeData.availableCycles || 0,
      dailyCycles: incomeData.dailyCycles || 0
    };
  };

  const getNextPayoutInfo = () => {
    const nextDate = PayoutService.getNextPayoutDate();
    const daysUntil = PayoutService.getDaysUntilNextPayout();
    
    return {
      nextDate: nextDate.toLocaleDateString('en-IN'),
      daysUntil
    };
  };

  const claimDailyReward = async () => {
    try {
      const today = new Date();
      const lastLogin = user.lastLoginDate?.toDate?.() || new Date(0);
      const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
      
      let newStreak = 1;
      let rewardAmount = 10; // Base reward
      
      if (daysDiff === 1) {
        newStreak = (user.loginStreak || 0) + 1;
      } else if (daysDiff > 1) {
        newStreak = 1;
      } else {
        return;
      }
      
      // Calculate reward based on streak
      if (newStreak >= 7) rewardAmount = 50;
      else if (newStreak >= 3) rewardAmount = 25;
      
      const updatedUser = {
        ...user,
        loginStreak: newStreak,
        lastLoginDate: today,
        availableRewards: (user.availableRewards || 0) + rewardAmount,
        totalRewards: (user.totalRewards || 0) + rewardAmount,
      };
      
      setUser(updatedUser);
      setRewardClaimed(true);
      setShowRewardModal(true);
      
      setTimeout(() => {
        setShowRewardModal(false);
        setRewardClaimed(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error claiming reward:', error);
    }
  };

  const canClaimReward = () => {
    if (!user?.lastLoginDate) return true;
    const today = new Date();
    const lastLogin = user.lastLoginDate.toDate?.() || new Date(user.lastLoginDate);
    const daysDiff = Math.floor((today - lastLogin) / (1000 * 60 * 60 * 24));
    return daysDiff >= 1;
  };

  // Get rank information
  const getRankInfo = () => {
    if (!incomeData) return { rank: 'Starter', level: 1, progress: 0 };
    
    const totalIncome = incomeData.totalIncome || 0;
    const pairsCount = incomeData.pairsCount || 0;
    
    if (totalIncome >= 500000 && pairsCount >= 1000) {
      return { rank: 'Diamond', level: 7, progress: 100, color: 'from-purple-500 to-pink-500' };
    } else if (totalIncome >= 250000 && pairsCount >= 500) {
      return { rank: 'Platinum', level: 6, progress: 85, color: 'from-gray-400 to-gray-600' };
    } else if (totalIncome >= 100000 && pairsCount >= 250) {
      return { rank: 'Gold', level: 5, progress: 70, color: 'from-yellow-400 to-yellow-600' };
    } else if (totalIncome >= 50000 && pairsCount >= 100) {
      return { rank: 'Silver', level: 4, progress: 55, color: 'from-gray-300 to-gray-500' };
    } else if (totalIncome >= 25000 && pairsCount >= 50) {
      return { rank: 'Bronze', level: 3, progress: 40, color: 'from-orange-400 to-orange-600' };
    } else if (totalIncome >= 10000 && pairsCount >= 20) {
      return { rank: 'Associate', level: 2, progress: 25, color: 'from-blue-400 to-blue-600' };
    } else {
      return { rank: 'Starter', level: 1, progress: 10, color: 'from-green-400 to-green-600' };
    }
  };

  // Loading and Error States
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <LeafLoader />
          <p className="mt-4 text-gray-600">Loading your MLM dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-red-500 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error Loading Dashboard</h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FaExclamationTriangle className="text-yellow-500 text-2xl" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">User Not Found</h3>
          <p className="text-gray-600">We couldn't find your account information.</p>
        </div>
      </div>
    );
  }

  const performanceMetrics = getPerformanceMetrics();
  const payoutInfo = getNextPayoutInfo();
  const rankInfo = getRankInfo();

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Enhanced Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MLM Dashboard
              </h1>
              <button
                onClick={refreshData}
                disabled={refreshing}
                className={`p-2 rounded-lg transition-all ${
                  refreshing 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                }`}
                title="Refresh Data"
              >
                <MdTimeline className={`text-lg ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-gray-600">Welcome back, {user.name}! Track your MLM performance and earnings.</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0">
            {/* Rank Badge */}
            <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${rankInfo.color} text-white shadow-lg`}>
              <div className="flex items-center gap-2">
                <FaCrown className="text-sm" />
                <span className="font-semibold text-sm">{rankInfo.rank}</span>
              </div>
            </div>
            
            {/* User Profile */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm">
              {user.profilePic ? (
                <img 
                  src={user.profilePic} 
                  alt={user.name} 
                  className="h-10 w-10 rounded-full object-cover border-2 border-blue-200"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div>
                <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                <p className="text-xs text-gray-500">ID: {user.referralCode || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 bg-white p-2 rounded-xl shadow-sm">
          {[
            { id: 'overview', label: 'Overview', icon: MdDashboard },
            { id: 'income', label: 'Income', icon: MdAttachMoney },
            { id: 'team', label: 'Team', icon: MdPeople },
            { id: 'analytics', label: 'Analytics', icon: MdShowChart }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon className="text-lg" />
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Referral Sharing Card */}
              <div className="mb-8">
                <div className="bg-gradient-to-r from-green-400 to-blue-500 p-6 rounded-2xl shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                      <FaShareAlt className="inline-block" />
                      Share your referral link
                    </h2>
                    <p className="text-white/90 text-sm mb-2">Invite friends and earn rewards! Share your unique referral link below:</p>
                    <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-inner">
                      <span className="truncate text-gray-700 text-sm" title={`${window.location.origin}/register?ref=${user.referralCode}`}>
                        {`${window.location.origin}/register?ref=${user.referralCode}`}
                      </span>
                      <button
                        onClick={copyReferralLink}
                        className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs flex items-center gap-1"
                        title="Copy referral link"
                      >
                        <FaCopy />
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                      {navigator.share && (
                        <button
                          onClick={shareReferralLink}
                          className="ml-2 px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs flex items-center gap-1"
                          title="Share via..."
                        >
                          <FaShareAlt />
                          Share
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Key Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <MdAccountBalance className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-blue-100 text-sm">Total Balance</p>
                      <p className="text-2xl font-bold">₹{((user.affiliateBalance || 0) + (user.totalEarnings || 0)).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-blue-100">
                    <HiOutlineTrendingUp className="text-sm" />
                    <span className="text-xs">Available + Earned</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <BsCurrencyRupee className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-green-100 text-sm">Today's Income</p>
                      <p className="text-2xl font-bold">₹{(incomeData?.todayIncome || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-100">
                    <BsLightning className="text-sm" />
                    <span className="text-xs">Daily Earnings</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <RiTeamFill className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-purple-100 text-sm">Team Size</p>
                      <p className="text-2xl font-bold">{referrals.length || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-purple-100">
                    <BsPersonCheck className="text-sm" />
                    <span className="text-xs">Direct Referrals</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <BsAward className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-orange-100 text-sm">Total Pairs</p>
                      <p className="text-2xl font-bold">{incomeData?.pairsCount || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-orange-100">
                    <FaNetworkWired className="text-sm" />
                    <span className="text-xs">Binary Pairs</span>
                  </div>
                </motion.div>
              </div>

              {/* Next Payout Info */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg mb-8"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Next Payout</h3>
                    <p className="text-indigo-100">Scheduled payout information</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{payoutInfo.daysUntil}</div>
                    <div className="text-indigo-200 text-sm">Days Left</div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-indigo-400">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-100">Payout Date</span>
                    <span className="font-semibold">{payoutInfo.nextDate}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-indigo-100">Available Balance</span>
                    <span className="font-semibold">₹{(user.affiliateBalance || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-indigo-100">After 5% Deduction</span>
                    <span className="font-semibold">₹{((user.affiliateBalance || 0) * 0.95).toFixed(2)}</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reward Modal */}
        {showRewardModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md mx-4 text-center">
              <div className="mb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
                  <FaGift className="text-white text-2xl" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Congratulations!</h3>
                <p className="text-gray-600 mb-4">You've claimed your daily reward!</p>
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg">
                  <p className="text-lg font-semibold text-gray-800">
                    Reward: ₹{user.loginStreak >= 7 ? '50' : user.loginStreak >= 3 ? '25' : '10'}
                  </p>
                  <p className="text-sm text-gray-600">
                    Current Streak: {user.loginStreak} days
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
