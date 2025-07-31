// Enhanced Affilate Affiliate Dashboard
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { app } from '../../../Firebase/firebase';
import { 
  FaUsers, FaRupeeSign, FaChartLine, FaCopy, FaShareAlt, FaRegClock, 
  FaBullhorn, FaUserTie, FaGift, FaFire, FaTrophy, FaCalendarCheck,
  FaArrowUp, FaArrowDown, FaEye, FaDownload, FaCrown, FaStar,
  FaNetworkWired, FaHandHoldingUsd, FaMedal, FaChartBar, FaCoins,
  FaCalendarAlt, FaClock, FaCheckCircle, FaExclamationTriangle, FaLink,
  FaCheck
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
import RewardsService from '../../../services/rewardsService';

// Helper to recursively fetch all downlines for a user - Only approved users
const fetchAllDownlines = async (db, referralCode) => {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef, 
    where('referredBy', '==', referralCode),
    where('affiliateStatus', '==', true),
    where('paymentRequestStatus', '==', 'approved')
  );
  const querySnapshot = await getDocs(q);
  let allDownlines = [];
  for (const docSnap of querySnapshot.docs) {
    const downline = docSnap.data();
    allDownlines.push(downline);
    // Recursively fetch this downline's downlines
    const subDownlines = await fetchAllDownlines(db, downline.referralCode);
    allDownlines = allDownlines.concat(subDownlines);
  }
  return allDownlines;
};

export default function AffiliateDashboard({ userId }) {
  // State Management
  const [user, setUser] = useState(null);
  const [mlmData, setMlmData] = useState(null);
  const [incomeData, setIncomeData] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [incomeHistory, setIncomeHistory] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [rewardHistory, setRewardHistory] = useState([]);
  const [rankInfo, setRankInfo] = useState(null);
  const [dailyLimits, setDailyLimits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeIncomeTab, setActiveIncomeTab] = useState('all');
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sellCount, setSellCount] = useState(0);
  // Add state for total and direct downlines
  const [totalDownlines, setTotalDownlines] = useState([]);
  const [totalDownlineCount, setTotalDownlineCount] = useState(0);
  const [directDownlineCount, setDirectDownlineCount] = useState(0);
  const [todayReferrals, setTodayReferrals] = useState(0);
  // State for calculated incomes (same as MyNetwork)
  const [calculatedPromotionalIncome, setCalculatedPromotionalIncome] = useState(0);
  const [calculatedLeadershipIncome, setCalculatedLeadershipIncome] = useState(0);
  const [calculatedRewards, setCalculatedRewards] = useState({ total: 0, pairs: 0, slab: '' });
  const [totalPairs, setTotalPairs] = useState(0);
  const [directReferralCount, setDirectReferralCount] = useState(0);
  const [treeData, setTreeData] = useState(null);
  // State for bank accounts
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankAccountsLoading, setBankAccountsLoading] = useState(true);
  // State for total income
  const [totalIncome, setTotalIncome] = useState(0);

  // Recursive function to build tree from 'users' collection (same as MyNetwork)
  const buildTree = async (referralCode, level = 0, maxLevel = 3) => {
    if (level >= maxLevel) return null;
    const db = getFirestore(app);
    const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
    const userSnapshot = await getDocs(userQuery);
    if (userSnapshot.empty) return null;
    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data();
    
    // Only include users with approved payment requests for pair matching
    const isPaymentApproved = userData.affiliateStatus === true && userData.paymentRequestStatus === 'approved';
    
    let leftNode = null, rightNode = null;
    if (userData.leftDownLine) leftNode = await buildTree(userData.leftDownLine, level + 1, maxLevel);
    if (userData.rightDownLine) rightNode = await buildTree(userData.rightDownLine, level + 1, maxLevel);
    
    return {
      id: userDoc.id,
      name: userData.name || 'Unknown',
      referralCode: userData.referralCode,
      email: userData.email,
      joinDate: userData.joinDate,
      affiliateStatus: userData.affiliateStatus,
      paymentRequestStatus: userData.paymentRequestStatus,
      isPaymentApproved,
      leftNode,
      rightNode,
      level
    };
  };

  // Build tree for income calculations
  useEffect(() => {
    const fetchTree = async () => {
      if (!user?.referralCode) {
        console.log('No user referral code available');
        return;
      }
      console.log('Building tree for referral code:', user.referralCode);
      const tree = await buildTree(user.referralCode);
      console.log('Tree built:', tree);
      setTreeData(tree);
    };
    fetchTree();
  }, [user]);

  // Count matched pairs (same as MyNetwork) - Only count pairs for approved payment requests
  useEffect(() => {
    const countPairs = (node) => {
      if (!node) return 0;
      // Only count as a pair if both left and right nodes exist AND both have approved payment requests
      const isPair = node.leftNode && node.rightNode && 
                     node.leftNode.isPaymentApproved && node.rightNode.isPaymentApproved ? 1 : 0;
      return isPair + countPairs(node.leftNode) + countPairs(node.rightNode);
    };
    setTotalPairs(countPairs(treeData));
  }, [treeData]);

  // Calculate promotional income (same as MyNetwork) - Only count approved users
  useEffect(() => {
    if (!treeData) {
      console.log('No tree data available for promotional income calculation');
      setCalculatedPromotionalIncome(0);
      return;
    }
    console.log('Calculating promotional income for tree:', treeData);
    const root = treeData;
    // Only count legs from users with approved payment requests
    const countLeg = (node) => {
      if (!node) return 0;
      const currentUserCount = node.isPaymentApproved ? 1 : 0;
      return currentUserCount + countLeg(node.leftNode) + countLeg(node.rightNode);
    };
    let l = root.leftNode ? countLeg(root.leftNode) : 0;
    let r = root.rightNode ? countLeg(root.rightNode) : 0;
    console.log('Left leg count (approved only):', l, 'Right leg count (approved only):', r);
    let pairs = 0;
    while ((l >= 2 && r >= 1) || (l >= 1 && r >= 2)) {
      if (l > r) {
        l -= 2;
        r -= 1;
      } else {
        l -= 1;
        r -= 2;
      }
      pairs += 1;
    }
    console.log('Calculated pairs (approved only):', pairs, 'Promotional income:', pairs * 400);
    setCalculatedPromotionalIncome(pairs * 400);
  }, [treeData]);

  // Calculate leadership income (same as MyNetwork) - Only count approved users
  useEffect(() => {
    if (!treeData || !user?.referralCode) {
      setCalculatedLeadershipIncome(0);
      return;
    }
    
    const calculateLeadershipIncome = async () => {
      // Fetch direct referrals count (only approved users)
      const db = getFirestore(app);
      const q = query(
        collection(db, 'users'), 
        where('referredBy', '==', user.referralCode),
        where('affiliateStatus', '==', true),
        where('paymentRequestStatus', '==', 'approved')
      );
      const snapshot = await getDocs(q);
      const directCount = snapshot.size;
      setDirectReferralCount(directCount);
      
      if (directCount >= 10) {
        const sumDownlinePromotionalIncome = (node) => {
          if (!node) return 0;
          // Only count legs from users with approved payment requests
          const countLeg = (n) => {
            if (!n) return 0;
            const currentUserCount = n.isPaymentApproved ? 1 : 0;
            return currentUserCount + countLeg(n.leftNode) + countLeg(n.rightNode);
          };
          let l = node.leftNode ? countLeg(node.leftNode) : 0;
          let r = node.rightNode ? countLeg(node.rightNode) : 0;
          let pairs = 0;
          while ((l >= 2 && r >= 1) || (l >= 1 && r >= 2)) {
            if (l > r) {
              l -= 2;
              r -= 1;
            } else {
              l -= 1;
              r -= 2;
            }
            pairs += 1;
          }
          return (pairs * 400) + sumDownlinePromotionalIncome(node.leftNode) + sumDownlinePromotionalIncome(node.rightNode);
        };
        
        let totalDownlineIncome = 0;
        if (treeData.leftNode) totalDownlineIncome += sumDownlinePromotionalIncome(treeData.leftNode);
        if (treeData.rightNode) totalDownlineIncome += sumDownlinePromotionalIncome(treeData.rightNode);
        setCalculatedLeadershipIncome(Math.floor(totalDownlineIncome * 0.10));
      } else {
        setCalculatedLeadershipIncome(0);
      }
    };
    
    calculateLeadershipIncome();
  }, [treeData, user]);

  // Calculate rewards (same as MyNetwork) - Only count approved users
  useEffect(() => {
    if (!treeData) {
      setCalculatedRewards({ total: 0, pairs: 0, slab: '' });
      return;
    }
    const root = treeData;
    // Only count legs from users with approved payment requests
    const countLeg = (node) => {
      if (!node) return 0;
      const currentUserCount = node.isPaymentApproved ? 1 : 0;
      return currentUserCount + countLeg(node.leftNode) + countLeg(node.rightNode);
    };
    let l = root.leftNode ? countLeg(root.leftNode) : 0;
    let r = root.rightNode ? countLeg(root.rightNode) : 0;
    let pairs = 0;
    while ((l >= 2 && r >= 1) || (l >= 1 && r >= 2)) {
      if (l > r) {
        l -= 2;
        r -= 1;
      } else {
        l -= 1;
        r -= 2;
      }
      pairs += 1;
    }
    let total = 0;
    let slab = '';
    if (pairs >= 500) {
      total += 25000;
      slab = 'First 500 pairs: ₹25,000 bonus';
      if (pairs >= 600) {
        total += 5000;
        slab = 'Next 100 pairs: ₹5,000 bonus';
      }
    } else if (pairs > 0) {
      slab = 'No reward yet (need 500 pairs)';
    }
    setCalculatedRewards({ total, pairs, slab });
  }, [treeData]);

  // Calculate total income from all sources
  useEffect(() => {
    const total = calculatedPromotionalIncome + calculatedLeadershipIncome + calculatedRewards.total;
    setTotalIncome(total);
  }, [calculatedPromotionalIncome, calculatedLeadershipIncome, calculatedRewards.total]);

  // Fetch bank accounts for payout verification
  useEffect(() => {
    if (!userId) {
      setBankAccountsLoading(false);
      return;
    }

    const db = getFirestore(app);
    const bankAccountsRef = collection(db, 'bankAccounts');
    const q = query(
      bankAccountsRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const accounts = [];
      snapshot.forEach((doc) => {
        accounts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      setBankAccounts(accounts);
      setBankAccountsLoading(false);
    }, (error) => {
      console.error('Error fetching bank accounts:', error);
      
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        console.log('Index not available, trying without orderBy');
        const simpleQuery = query(
          bankAccountsRef, 
          where('userId', '==', userId)
        );
        
        const simpleUnsubscribe = onSnapshot(simpleQuery, (snapshot) => {
          const accounts = [];
          snapshot.forEach((doc) => {
            accounts.push({
              id: doc.id,
              ...doc.data()
            });
          });
          setBankAccounts(accounts);
          setBankAccountsLoading(false);
        }, (simpleError) => {
          console.error('Error with simple query:', simpleError);
          setBankAccountsLoading(false);
        });
        
        return () => simpleUnsubscribe();
      } else {
        setBankAccountsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

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
          
          // Calculate daily limits
          if (mlmUserData) {
            const limits = {
              dailyPairs: mlmUserData.dailyPairs || 0,
              dailyIncome: mlmUserData.dailyIncome || 0,
              maxDailyPairs: 400,
              maxDailyIncome: 2000,
              remainingPairs: Math.max(0, 400 - (mlmUserData.dailyPairs || 0)),
              remainingIncome: Math.max(0, 2000 - (mlmUserData.dailyIncome || 0))
            };
            setDailyLimits(limits);
          }
        } catch (mlmError) {
          console.log('MLM data not found, user may not be registered in MLM system');
        }

        // Fetch income data
        try {
          const incomeSummary = await IncomeService.getUserIncomeSummary(userId);
          console.log('Income summary received:', incomeSummary);
          console.log('Today income from summary:', incomeSummary?.todayIncome);
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

        // Fetch reward history
        try {
          const rewards = await RewardsService.getUserRewardHistory(userId, 20);
          setRewardHistory(rewards);
        } catch (rewardError) {
          console.log('Reward history not found');
        }

        // Fetch rank information
        try {
          const rank = await IncomeService.getUserRank(userId);
          setRankInfo(rank);
        } catch (rankError) {
          console.log('Rank info not found');
        }

        // Fetch referrals (direct downlines) - Only approved users
        let referralsData = [];
        if (userData.referralCode) {
          const q = query(
            collection(db, 'users'),
            where('referredBy', '==', userData.referralCode),
            where('affiliateStatus', '==', true),
            where('paymentRequestStatus', '==', 'approved')
          );
          const querySnapshot = await getDocs(q);
          referralsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setReferrals(referralsData);
          
          // Calculate today's referrals
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const todayReferralsCount = referralsData.filter(ref => {
            const joinDate = ref.joinDate?.toDate() || ref.createdAt?.toDate() || new Date(0);
            return joinDate >= todayStart;
          }).length;
          setTodayReferrals(todayReferralsCount);
          
          // Calculate sell count through downlines (placeholder)
          setSellCount(referralsData.filter(ref => ref.affiliateStatus).length * 2);
        }
        // Fetch all downlines recursively - Only approved users
        let totalDownlines = [];
        if (userData.referralCode) {
          totalDownlines = await fetchAllDownlines(db, userData.referralCode);
        }
        setTotalDownlines(totalDownlines);
        setTotalDownlineCount(totalDownlines.length);
        setDirectDownlineCount(referralsData.length);

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
        title: 'Join Vedmurti Affilate Network!',
        text: `Use my referral code ${user.referralCode} to start earning with our Affilate system.`,
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

  // Loading and Error States
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <LeafLoader />
          <p className="mt-4 text-gray-600">Loading your Affilate dashboard...</p>
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
  const currentRankInfo = rankInfo || { rank: 'Starter', level: 1, color: 'from-gray-500 to-gray-600' };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-white to-purple-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Bank Account Alert Ribbon */}
        {!bankAccountsLoading && bankAccounts.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-lg shadow-lg border-l-4 border-red-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FaExclamationTriangle className="text-2xl animate-pulse" />
                <div>
                  <h3 className="font-bold text-lg">⚠️ Bank Account Required</h3>
                  <p className="text-red-100 text-sm">
                    No bank account found. Payouts will not be generated until you add your bank details.
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/affilate-dashboard/kyc'}
                className="px-4 py-2 bg-white text-red-600 rounded-md hover:bg-red-50 transition-colors font-semibold text-sm"
              >
                Add Bank Account
              </button>
            </div>
          </motion.div>
        )}

        {/* Enhanced Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Affilate Dashboard
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
            <p className="text-gray-600">Welcome back, {user.name}! Track your Affilate performance and earnings.</p>
          </div>
          
          <div className="flex items-center gap-4 mt-4 lg:mt-0 flex-wrap">
            {/* Rank Badge */}
            <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${currentRankInfo.color} text-white shadow-lg`}>
              <div className="flex items-center gap-2">
                <FaCrown className="text-sm" />
                <span className="font-semibold text-sm">{currentRankInfo.rank}</span>
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

        {/* Total Income Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 p-6 rounded-2xl shadow-xl text-white"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <FaRupeeSign className="text-3xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Total Income</h2>
                <p className="text-purple-100 text-sm">Combined earnings from all sources</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold mb-1">₹{totalIncome.toFixed(2)}</div>
              <div className="text-purple-200 text-sm">Real-time calculated</div>
            </div>
          </div>
          
          {/* Income Breakdown */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-100 text-sm">Promotional</span>
                <span className="font-semibold">₹{calculatedPromotionalIncome.toFixed(2)}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-green-400 rounded-full h-2 transition-all duration-300"
                  style={{ width: `${totalIncome > 0 ? (calculatedPromotionalIncome / totalIncome) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-100 text-sm">Leadership</span>
                <span className="font-semibold">₹{calculatedLeadershipIncome.toFixed(2)}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-blue-400 rounded-full h-2 transition-all duration-300"
                  style={{ width: `${totalIncome > 0 ? (calculatedLeadershipIncome / totalIncome) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
            
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-purple-100 text-sm">Rewards</span>
                <span className="font-semibold">₹{calculatedRewards.total.toFixed(2)}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-pink-400 rounded-full h-2 transition-all duration-300"
                  style={{ width: `${totalIncome > 0 ? (calculatedRewards.total / totalIncome) * 100 : 0}%` }}
                ></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Income Plan Overview Section */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Promotional Income */}
          <div className="bg-gradient-to-br from-green-400 to-green-600 p-5 rounded-2xl shadow-lg text-white flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <FaBullhorn className="text-2xl" />
              <span className="font-bold text-lg">Promotional Income</span>
            </div>
            <p className="text-sm">Binary plan (Left & Right legs). Pair matching allowed: <b>2:1</b> or <b>1:2</b>. <br/> <b>₹400 per pair</b>. Daily cap: <b>400 pairs</b> (₹2000/day).<br/>Payouts: <b>2nd, 12th, 22nd</b> monthly.</p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="bg-white/20 px-2 py-1 rounded">Pair: L+R</span>
              <span className="bg-white/20 px-2 py-1 rounded">₹400/pair</span>
              <span className="bg-white/20 px-2 py-1 rounded">Max 400 pairs/day</span>
            </div>
          </div>
          {/* Leadership Income */}
          <div className="bg-gradient-to-br from-indigo-400 to-indigo-600 p-5 rounded-2xl shadow-lg text-white flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <FaUserTie className="text-2xl" />
              <span className="font-bold text-lg">Leadership Income</span>
            </div>
            <p className="text-sm">Earn based on company turnover. <br/>Qualify with <b>10 active direct referrals</b>.<br/>Team earns, you earn too!<br/>Example: 500 × 10 = <b>₹5000/month</b> (see plan for details).</p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="bg-white/20 px-2 py-1 rounded">10 Directs Required</span>
              <span className="bg-white/20 px-2 py-1 rounded">Team Turnover</span>
            </div>
          </div>
          {/* Rewards */}
          <div className="bg-gradient-to-br from-pink-400 to-pink-600 p-5 rounded-2xl shadow-lg text-white flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-2">
              <FaGift className="text-2xl" />
              <span className="font-bold text-lg">Rewards</span>
            </div>
            <p className="text-sm">Earn company awards for performance.<br/>Business volume: <b>₹1L–₹30L</b>.<br/>First 500 pairs: <b>₹25,000</b> bonus.<br/>Next 100 pairs: <b>₹5,000</b> bonus.<br/>Festival rewards monthly.</p>
            <div className="flex flex-wrap gap-2 mt-2 text-xs">
              <span className="bg-white/20 px-2 py-1 rounded">Volume: ₹1L–₹30L</span>
              <span className="bg-white/20 px-2 py-1 rounded">Bonuses & Gifts</span>
            </div>
          </div>
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
                    <div className="bg-white rounded-lg px-4 py-2 flex items-center gap-2 shadow-inner overflow-x-auto w-full max-w-full">
                      <span className="text-gray-700 text-sm break-all min-w-0 flex-1" style={{wordBreak: 'break-all'}} title={`${window.location.origin}/register?ref=${user.referralCode}`}>
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
              
              {/* Key Metrics Cards - Vedmurti Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <BsCurrencyRupee className="text-2xl" />
                    </div>
                                      <div className="text-right">
                    <p className="text-green-100 text-sm">Today's Referrals</p>
                    <p className="text-2xl font-bold">{todayReferrals}</p>
                    <p className="text-xs text-green-200">Direct referrals today</p>
                  </div>
                  </div>
                  <div className="flex items-center gap-2 text-green-100">
                    <BsLightning className="text-sm" />
                    <span className="text-xs">Direct Referrals</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <RiTeamFill className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-purple-100 text-sm">Network Size</p>
                      <p className="text-2xl font-bold">{totalDownlineCount}</p>
                      <p className="text-xs text-purple-200 mt-1">Direct: {directDownlineCount} | Indirect: {totalDownlineCount - directDownlineCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-purple-100">
                    <BsPersonCheck className="text-sm" />
                    <span className="text-xs">Total Network</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <FaHandHoldingUsd className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-orange-100 text-sm">Sell Count</p>
                      <p className="text-2xl font-bold">{sellCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-orange-100">
                    <FaChartLine className="text-sm" />
                    <span className="text-xs">Via Downlines</span>
                  </div>
                </motion.div>
              </div>

              {/* Vedmurti Plan Income Breakdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <FaNetworkWired className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-100 text-sm">Promotional Income</p>
                      <p className="text-2xl font-bold">₹{calculatedPromotionalIncome.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-emerald-100 text-sm">
                    <span>Pairs: {totalPairs}</span>
                    <span>₹400/pair</span>
                  </div>
                  <div className="mt-2 bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${Math.min((totalPairs || 0) / 400 * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-emerald-100 mt-1">
                    <span>Daily: {totalPairs || 0}/400</span>
                    <span>₹{(calculatedPromotionalIncome || 0).toFixed(0)}/₹2000</span>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <FaUserTie className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-100 text-sm">Leadership Income</p>
                      <p className="text-2xl font-bold">₹{calculatedLeadershipIncome.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-indigo-100 text-sm">
                    <span>Qualified: {directReferralCount}/10</span>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      directReferralCount >= 10 ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {directReferralCount >= 10 ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </div>
                  <div className="mt-2 bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${Math.min((directReferralCount || 0) / 10 * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-indigo-100 mt-1">
                    Team Turnover: ₹{(calculatedLeadershipIncome * 10).toLocaleString()}
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="bg-gradient-to-br from-pink-500 to-pink-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <FaGift className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-pink-100 text-sm">Rewards Income</p>
                      <p className="text-2xl font-bold">₹{calculatedRewards.total.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-pink-100 text-sm">
                    <span>Rank: {calculatedRewards.pairs >= 500 ? 'Achiever' : 'Starter'}</span>
                    <span>Level {Math.floor(calculatedRewards.pairs / 100)}</span>
                  </div>
                  <div className="mt-2 bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${Math.min((calculatedRewards.pairs || 0) / 500 * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-pink-100 mt-1">
                    Business Volume: ₹{(calculatedRewards.pairs * 400).toLocaleString()}
                  </div>
                </motion.div>
              </div>

                      {/* Vedmurti Plan Payout Info */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg mb-8 overflow-x-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold mb-2">Next Payout - Vedmurti Plan</h3>
              <p className="text-indigo-100">Automatic payouts on 2nd, 12th & 22nd of every month</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{payoutInfo.daysUntil}</div>
              <div className="text-indigo-200 text-sm">Days Left</div>
            </div>
          </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Balance Information</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-indigo-100">Available Balance:</span>
                        <span className="font-semibold">₹{(user.affiliateBalance || 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-indigo-100">After 5% Deduction:</span>
                        <span className="font-semibold">₹{((user.affiliateBalance || 0) * 0.95).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-indigo-100">KYC Status:</span>
                        <span className={`font-semibold ${incomeData?.kycCompleted ? 'text-green-300' : 'text-red-300'}`}>
                          {incomeData?.kycCompleted ? 'Completed' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Daily Limits (Vedmurti Plan)</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-indigo-100">Daily Pairs:</span>
                        <span className="font-semibold">{incomeData?.dailyPairs || 0}/400</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-indigo-100">Daily Income:</span>
                        <span className="font-semibold">₹{(incomeData?.dailyIncome || 0).toFixed(0)}/₹2000</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-indigo-100">Remaining Capacity:</span>
                        <span className="font-semibold">{incomeData?.availableDailyPairs || 400} pairs</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-indigo-400 flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                  <div className="flex justify-between items-center">
                    <span className="text-indigo-100">Next Payout Date:</span>
                    <span className="font-semibold">{payoutInfo.nextDate}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-indigo-100">Payout Schedule:</span>
                    <span className="font-semibold">2nd, 12th, 22nd (Monthly)</span>
                  </div>
                  <div className="mt-3 p-3 bg-green-500/20 rounded-lg border border-green-400">
                    <div className="flex items-center gap-2">
                      <FaCheck className="text-green-300" />
                      <span className="text-green-100 text-sm">
                        Payouts are automatically generated on scheduled dates. Your income will be reset after each payout.
                      </span>
                    </div>
                  </div>
                  {!incomeData?.kycCompleted && (
                    <div className="mt-3 p-3 bg-red-500/20 rounded-lg border border-red-400">
                      <div className="flex items-center gap-2">
                        <FaExclamationTriangle className="text-red-300" />
                        <span className="text-red-100 text-sm">
                          Complete KYC to receive payouts. Your balance will be held until KYC is completed.
                        </span>
                      </div>
                    </div>
                  )}
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-2"
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
