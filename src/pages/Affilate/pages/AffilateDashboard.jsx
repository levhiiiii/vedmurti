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
  FaCheck, FaChalkboardTeacher
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
  const [refreshSuccess, setRefreshSuccess] = useState(false);
  const [sellCount, setSellCount] = useState(0);
  // Add state for total and direct downlines
  const [totalDownlines, setTotalDownlines] = useState([]);
  const [totalDownlineCount, setTotalDownlineCount] = useState(0);
  const [directDownlineCount, setDirectDownlineCount] = useState(0);
  const [todayReferrals, setTodayReferrals] = useState(0);
  // Add state for left and right team counts
  const [leftTeamCount, setLeftTeamCount] = useState(0);
  const [rightTeamCount, setRightTeamCount] = useState(0);
  // State for calculated incomes (same as MyNetwork)
  const [calculatedPromotionalIncome, setCalculatedPromotionalIncome] = useState(0);
  const [calculatedMentorshipIncome, setCalculatedMentorshipIncome] = useState(0);
  const [calculatedRewards, setCalculatedRewards] = useState({ total: 0, pairs: 0, slab: '' });
  const [totalPairs, setTotalPairs] = useState(0);
  const [downlinePairs, setDownlinePairs] = useState(0);
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

    const userData = userSnapshot.docs[0].data();
    
    // Only include users with approved payment requests for pair matching
    // Temporarily count all users for debugging
    const isPaymentApproved = true; // userData.affiliateStatus === true && userData.paymentRequestStatus === 'approved';
    
    const node = {
      name: userData.name || 'Unknown',
      referralCode: userData.referralCode,
      isPaymentApproved: isPaymentApproved,
      affiliateStatus: userData.affiliateStatus,
      paymentRequestStatus: userData.paymentRequestStatus,
      leftNode: null,
      rightNode: null
    };

    // Fetch left and right downlines
    if (userData.leftDownLine) {
      node.leftNode = await buildTree(userData.leftDownLine, level + 1, maxLevel);
    }
    if (userData.rightDownLine) {
      node.rightNode = await buildTree(userData.rightDownLine, level + 1, maxLevel);
    }

    return node;
  };

  // Comprehensive Data Fetching Function - Moved outside useEffect
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
  
      }

      // Fetch income data
      try {
        const incomeSummary = await IncomeService.getUserIncomeSummary(userId);
        
        setIncomeData(incomeSummary);
      } catch (incomeError) {
  
      }

      // Fetch income history
      try {
        const history = await IncomeService.getIncomeHistory(userId, 50);
        setIncomeHistory(history);
      } catch (historyError) {
  
      }

      // Fetch analytics
      try {
        const analyticsData = await IncomeService.getIncomeAnalytics(userId);
        setAnalytics(analyticsData);
      } catch (analyticsError) {
  
      }

      // Fetch team statistics
      try {
        const teamData = await IncomeService.calculateTeamVolume(userId);
        setTeamStats(teamData);
      } catch (teamError) {
  
      }

      // Fetch reward history
      try {
        const rewards = await RewardsService.getUserRewardHistory(userId, 20);
        setRewardHistory(rewards);
      } catch (rewardError) {
  
      }

      // Fetch rank information
      try {
        const rank = await IncomeService.getUserRank(userId);
        setRankInfo(rank);
      } catch (rankError) {
  
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

      // Count left and right team members recursively (same logic as MyNetwork)
      if (userData.referralCode) {
        // Recursive function to count downlines
        const countRecursive = async (referralCode, side) => {
          if (!referralCode) return 0;

          // Get the user document
          const q = query(
            collection(db, 'users'),
            where('referralCode', '==', referralCode)
          );
          const snapshot = await getDocs(q);
          
          if (snapshot.empty) return 0;

          const user = snapshot.docs[0].data();
          let count = 1; // Count this user

          // Count left and right downlines recursively
          if (user.leftDownLine) {
            count += await countRecursive(user.leftDownLine, side);
          }
          if (user.rightDownLine) {
            count += await countRecursive(user.rightDownLine, side);
          }

          return count;
        };

        // Count left and right downlines
        if (userData.leftDownLine) {
          const leftTotal = await countRecursive(userData.leftDownLine, 'left');
          setLeftTeamCount(leftTotal);
        }

        if (userData.rightDownLine) {
          const rightTotal = await countRecursive(userData.rightDownLine, 'right');
          setRightTeamCount(rightTotal);
        }
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Build tree for income calculations
  useEffect(() => {
    const fetchTree = async () => {
      if (!user?.referralCode) {
  
        return;
      }
      const tree = await buildTree(user.referralCode);
      setTreeData(tree);
    };
    fetchTree();
  }, [user]);

  // Calculate promotional income using comprehensive network calculation
  useEffect(() => {
    const calculatePromotionalIncomeFromNetwork = async () => {
      if (!user?.referralCode) {
        setCalculatedPromotionalIncome(0);
        setTotalPairs(0);
        return;
      }

      try {
        // Use MLMService's comprehensive network pair calculation
        const networkPairs = await MLMService.calculateNetworkPairs(user.uid);
        
        const promotionalIncome = networkPairs.pairs * 400; // ₹400 per pair
        
        setCalculatedPromotionalIncome(promotionalIncome);
        setTotalPairs(networkPairs.pairs);
        
        // Log for debugging
        console.log('Network pairs calculation:', {
          userId: user.uid,
          referralCode: user.referralCode,
          pairs: networkPairs.pairs,
          leftCount: networkPairs.leftCount,
          rightCount: networkPairs.rightCount,
          income: promotionalIncome
        });

        // Also log detailed network structure
        console.log('Detailed network structure:', {
          leftDownline: user.leftDownLine,
          rightDownline: user.rightDownLine,
          affiliateStatus: user.affiliateStatus,
          totalPairs: networkPairs.pairs
        });
      } catch (error) {
        console.log('Error calculating network pairs:', error);
        setCalculatedPromotionalIncome(0);
        setTotalPairs(0);
      }
    };

    calculatePromotionalIncomeFromNetwork();
  }, [user]);

  // Alternative simple pair calculation
  useEffect(() => {
    const calculateSimplePairs = async () => {
      if (!user?.referralCode) {
        return;
      }

      try {
        const db = getFirestore(app);
        
        // Get user's left and right downlines
        const leftDownlineCode = user.leftDownLine;
        const rightDownlineCode = user.rightDownLine;
        
        let leftCount = 0;
        let rightCount = 0;
        
        // Count left downline network
        if (leftDownlineCode) {
          const leftQuery = query(
            collection(db, 'users'), 
            where('referredBy', '==', leftDownlineCode),
            where('affiliateStatus', '==', true)
          );
          const leftSnapshot = await getDocs(leftQuery);
          leftCount = leftSnapshot.size;
        }
        
        // Count right downline network
        if (rightDownlineCode) {
          const rightQuery = query(
            collection(db, 'users'), 
            where('referredBy', '==', rightDownlineCode),
            where('affiliateStatus', '==', true)
          );
          const rightSnapshot = await getDocs(rightQuery);
          rightCount = rightSnapshot.size;
        }
        
        // Calculate pairs using simple logic
        const pairs = Math.min(leftCount, rightCount);
        const income = pairs * 400;
        
        // Update state if the complex calculation didn't work
        if (totalPairs === 0 && pairs > 0) {
          setTotalPairs(pairs);
          setCalculatedPromotionalIncome(income);
        }
        
        console.log('Simple pair calculation:', {
          leftCount,
          rightCount,
          pairs,
          income
        });
      } catch (error) {
        console.log('Error in simple pair calculation:', error);
      }
    };

    calculateSimplePairs();
  }, [user, totalPairs]);

  // Manual pair counting function using MLMNetwork logic
  const countAllPairsManually = async () => {
    if (!user?.referralCode) return;

    try {
      const db = getFirestore(app);
      
      // Get complete network members recursively (same as MLMNetwork)
      const getAllNetworkMembers = async (rootReferralCode) => {
        const allMembers = [];
        const processedCodes = new Set();
        
        // Function to recursively get all downlines
        const getDownlines = async (referralCode, level = 0) => {
          if (processedCodes.has(referralCode)) return;
          processedCodes.add(referralCode);
          
          // Get user data
          const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
          const userSnapshot = await getDocs(userQuery);
          
          if (userSnapshot.empty) {
            console.warn('User not found:', referralCode);
            return;
          }
          
          const userData = userSnapshot.docs[0].data();
          
          // Check payment status - exclude pending and rejected users from pair calculations
          const paymentStatus = userData.paymentStatus || userData.paymentRequestStatus || 'pending';
          if (paymentStatus === 'pending' || paymentStatus === 'rejected') {
            console.log(`Excluding ${paymentStatus} user from pair calculation: ${referralCode}`);
            return;
          }
          
          // Add current user to members (only approved users)
          allMembers.push({
            id: userSnapshot.docs[0].id,
            name: userData.name || 'Unknown',
            referralCode: userData.referralCode,
            email: userData.email,
            joinDate: userData.joinDate,
            leftDownLine: userData.leftDownLine,
            rightDownLine: userData.rightDownLine,
            level: level,
            isRoot: level === 0,
            hasLeftDownline: !!userData.leftDownLine,
            hasRightDownline: !!userData.rightDownLine,
            leftDownlineExists: false, // Will be updated later
            rightDownlineExists: false, // Will be updated later
            isMissing: false,
            paymentStatus: paymentStatus
          });
          
          // Recursively get left downline
          if (userData.leftDownLine) {
            await getDownlines(userData.leftDownLine, level + 1);
          }
          
          // Recursively get right downline
          if (userData.rightDownLine) {
            await getDownlines(userData.rightDownLine, level + 1);
          }
        };
        
        // Start from root
        await getDownlines(rootReferralCode);
        
        // Update existence flags (same as MLMNetwork)
        allMembers.forEach(member => {
          const leftExists = allMembers.some(m => m.referralCode === member.leftDownLine);
          const rightExists = allMembers.some(m => m.referralCode === member.rightDownLine);
          
          member.leftDownlineExists = leftExists;
          member.rightDownlineExists = rightExists;
        });
        
        return allMembers;
      };
      
      const usersData = await getAllNetworkMembers(user.referralCode);
      
      // Calculate pairs using MLMNetwork logic
      const completePairs = usersData.filter(u => u.leftDownlineExists && u.rightDownlineExists).length;
      
      console.log('=== MLMNETWORK PAIR ANALYSIS ===');
      console.log('All network members:', usersData);
      console.log('Users with existing left downlines:', usersData.filter(u => u.leftDownlineExists));
      console.log('Users with existing right downlines:', usersData.filter(u => u.rightDownlineExists));
      console.log('Complete pairs (both downlines exist):', usersData.filter(u => u.leftDownlineExists && u.rightDownlineExists));
      console.log('Total complete pairs found:', completePairs);
      console.log('Total users in network:', usersData.length);
      console.log('=== END MLMNETWORK ANALYSIS ===');
      
      // Update state with MLMNetwork pair count
      if (completePairs > 0) {
        console.log('Updating pair count from MLMNetwork logic:', completePairs);
        setTotalPairs(completePairs);
        setCalculatedPromotionalIncome(completePairs * 400);
      }
      
    } catch (error) {
      console.log('Error in MLMNetwork pair counting:', error);
    }
  };

  // Enhanced pair counting that counts all possible pairs
  const countAllPossiblePairs = async () => {
    if (!user?.referralCode) return;

    try {
      const db = getFirestore(app);
      
      // Get all users in the network with more specific filtering
      const allUsersQuery = query(
        collection(db, 'users'), 
        where('affiliateStatus', '==', true),
        where('paymentStatus', '==', 'approved')
      );
      const allUsersSnapshot = await getDocs(allUsersQuery);
      const allUsers = allUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let totalPairs = 0;
      const pairDetails = [];
      const allUserDetails = [];
      
      // Count only actual matched pairs (users with both left and right downlines)
      allUsers.forEach(userData => {
        // Log all users for debugging
        allUserDetails.push({
          name: userData.name,
          referralCode: userData.referralCode,
          leftDownline: userData.leftDownLine || 'None',
          rightDownline: userData.rightDownLine || 'None',
          hasBoth: !!(userData.leftDownLine && userData.rightDownLine),
          affiliateStatus: userData.affiliateStatus,
          paymentStatus: userData.paymentStatus
        });
        
        // Only count if user has both left and right downlines AND is approved
        if (userData.leftDownLine && userData.rightDownLine && userData.paymentStatus === 'approved') {
          totalPairs += 1;
          pairDetails.push({
            user: userData.name,
            referralCode: userData.referralCode,
            leftDownline: userData.leftDownLine,
            rightDownline: userData.rightDownLine,
            paymentStatus: userData.paymentStatus
          });
        }
      });
      
      console.log('=== FILTERED PAIR ANALYSIS ===');
      console.log('All approved users in network:', allUserDetails);
      console.log('Approved users with both downlines:', pairDetails);
      console.log('Total approved pairs found:', totalPairs);
      console.log('Total approved users in network:', allUsers.length);
      console.log('=== END FILTERED ANALYSIS ===');
      
      // Update state with the accurate count
      if (totalPairs > 0) {
        console.log('Updating pair count from filtered calculation:', totalPairs);
        setTotalPairs(totalPairs);
        setCalculatedPromotionalIncome(totalPairs * 400);
      }
      
    } catch (error) {
      console.log('Error in filtered pair counting:', error);
    }
  };

  // Call manual counting after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      countAllPairsManually();
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [user]);

  // Calculate mentorship income using comprehensive network calculation
  useEffect(() => {
    const calculateMentorshipIncomeFromNetwork = async () => {
      if (!user?.referralCode) {
        setCalculatedMentorshipIncome(0);
        setDownlinePairs(0);
        return;
      }

      try {
        // Use the same MLMNetwork logic to get total pairs in the network
        const db = getFirestore(app);
        
        // Get complete network members recursively (same as MLMNetwork)
        const getAllNetworkMembers = async (rootReferralCode) => {
          const allMembers = [];
          const processedCodes = new Set();
          
          // Function to recursively get all downlines
          const getDownlines = async (referralCode, level = 0) => {
            if (processedCodes.has(referralCode)) return;
            processedCodes.add(referralCode);
            
            // Get user data
            const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
            const userSnapshot = await getDocs(userQuery);
            
            if (userSnapshot.empty) {
              return;
            }
            
            const userData = userSnapshot.docs[0].data();
            
            // Check payment status - exclude pending and rejected users from pair calculations
            const paymentStatus = userData.paymentStatus || userData.paymentRequestStatus || 'pending';
            if (paymentStatus === 'pending' || paymentStatus === 'rejected') {
              console.log(`Excluding ${paymentStatus} user from mentorship calculation: ${referralCode}`);
              return;
            }
            
            // Add current user to members (only approved users)
            allMembers.push({
              id: userSnapshot.docs[0].id,
              name: userData.name || 'Unknown',
              referralCode: userData.referralCode,
              leftDownLine: userData.leftDownLine,
              rightDownLine: userData.rightDownLine,
              level: level,
              hasLeftDownline: !!userData.leftDownLine,
              hasRightDownline: !!userData.rightDownLine,
              leftDownlineExists: false, // Will be updated later
              rightDownlineExists: false, // Will be updated later
              paymentStatus: paymentStatus
            });
            
            // Recursively get left downline
            if (userData.leftDownLine) {
              await getDownlines(userData.leftDownLine, level + 1);
            }
            
            // Recursively get right downline
            if (userData.rightDownLine) {
              await getDownlines(userData.rightDownLine, level + 1);
            }
          };
          
          // Start from root
          await getDownlines(rootReferralCode);
          
          // Update existence flags (same as MLMNetwork)
          allMembers.forEach(member => {
            const leftExists = allMembers.some(m => m.referralCode === member.leftDownLine);
            const rightExists = allMembers.some(m => m.referralCode === member.rightDownLine);
            
            member.leftDownlineExists = leftExists;
            member.rightDownlineExists = rightExists;
          });
          
          return allMembers;
        };
        
        const usersData = await getAllNetworkMembers(user.referralCode);
        
        // Calculate total pairs using MLMNetwork logic
        const totalPairs = usersData.filter(u => u.leftDownlineExists && u.rightDownlineExists).length;
        
        // Mentorship income: If more than 1 pair, calculate for (totalPairs - 1) pairs
        let mentorshipPairs = 0;
        if (totalPairs > 1) {
          mentorshipPairs = totalPairs - 1; // Exclude 1 pair
        }
        
        const mentorshipIncome = mentorshipPairs * 100; // ₹100 per pair
        
        console.log('=== MENTORSHIP INCOME CALCULATION ===');
        console.log('Total pairs in network:', totalPairs);
        console.log('Mentorship pairs (total - 1):', mentorshipPairs);
        console.log('Mentorship income:', mentorshipIncome);
        console.log('=== END MENTORSHIP CALCULATION ===');
        
        setDownlinePairs(mentorshipPairs);
        setCalculatedMentorshipIncome(mentorshipIncome);
      } catch (error) {
        console.log('Error in mentorship income calculation:', error);
        setCalculatedMentorshipIncome(0);
        setDownlinePairs(0);
      }
    };

    calculateMentorshipIncomeFromNetwork();
  }, [user]);

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
    const total = calculatedPromotionalIncome + calculatedMentorshipIncome + calculatedRewards.total;
    setTotalIncome(total);
  }, [calculatedPromotionalIncome, calculatedMentorshipIncome, calculatedRewards.total]);

  // Debug: Monitor income changes
  useEffect(() => {
    
  }, [calculatedMentorshipIncome, downlinePairs, directReferralCount]);

  // Fetch bank accounts for payout verification
  useEffect(() => {
    if (!userId) {
      setBankAccountsLoading(false);
      return;
    }

    const db = getFirestore(app);
    const bankAccountsRef = collection(db, 'bankAccounts');
    
    // Try with orderBy first
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
          // Sort manually since we can't use orderBy
          accounts.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
            return dateB - dateA;
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
  }, [userId]);

  // Comprehensive Data Fetching
  useEffect(() => {
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

    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      // Refresh all data comprehensively
      await fetchAllData();
      
      // Refresh tree data and recalculate incomes
      if (user?.referralCode) {
        const newTreeData = await buildTree(user.referralCode);
        setTreeData(newTreeData);
        
        // Recalculate all incomes
        await calculateMentorshipIncome();
      }
      
      // Refresh bank accounts
      if (userId) {
        const bankAccountsRef = collection(getFirestore(app), 'bankAccounts');
        const bankQuery = query(bankAccountsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
        const bankSnapshot = await getDocs(bankQuery);
        const accounts = [];
        bankSnapshot.forEach((doc) => {
          accounts.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setBankAccounts(accounts);
      }
      
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
      setRefreshSuccess(true);
      setTimeout(() => setRefreshSuccess(false), 2000);
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

        {/* Refresh Success Notification */}
        <AnimatePresence>
          {refreshSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center gap-2"
            >
              <FaCheck className="text-green-600" />
              <span className="font-medium">Dashboard data refreshed successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                  refreshing 
                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed' 
                    : refreshSuccess
                    ? 'bg-green-100 text-green-600 border-green-200'
                    : 'bg-white text-blue-600 hover:bg-blue-50 hover:shadow-md shadow-sm border border-blue-200'
                }`}
                title="Refresh Dashboard Data"
              >
                {refreshSuccess ? (
                  <FaCheck className="text-lg" />
                ) : (
                  <MdTimeline className={`text-lg ${refreshing ? 'animate-spin' : ''}`} />
                )}
                <span className="font-medium text-sm">
                  {refreshing ? 'Refreshing...' : refreshSuccess ? 'Refreshed!' : 'Refresh'}
                </span>
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

        {/* Income Plan Overview Section - Improved Layout */}
        <div className="mb-8">
          {/* Total Income Summary Card - Large and Prominent */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-purple-500 to-blue-600 p-8 rounded-3xl shadow-xl text-white mb-8"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-3 bg-white/20 rounded-xl">
                    <BsCurrencyRupee className="text-3xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Total Income</h2>
                    <p className="text-purple-100">Combined earnings from all sources</p>
                  </div>
                </div>
                
                {/* Income Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-purple-100 text-sm">Promotional</span>
                      <span className="font-semibold">₹{calculatedPromotionalIncome.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 mb-1">
                      <div 
                        className="bg-green-400 rounded-full h-2 transition-all duration-300"
                        style={{ width: `${totalIncome > 0 ? (calculatedPromotionalIncome / totalIncome) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-purple-100 text-sm">Mentorship</span>
                      <span className="font-semibold">₹{calculatedMentorshipIncome.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 mb-1">
                      <div 
                        className="bg-teal-400 rounded-full h-2 transition-all duration-300"
                        style={{ width: `${totalIncome > 0 ? (calculatedMentorshipIncome / totalIncome) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-purple-100 text-sm">Rewards</span>
                      <span className="font-semibold">₹{calculatedRewards.total.toFixed(2)}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2 mb-1">
                      <div 
                        className="bg-pink-400 rounded-full h-2 transition-all duration-300"
                        style={{ width: `${totalIncome > 0 ? (calculatedRewards.total / totalIncome) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center md:text-right">
                <div className="text-4xl font-bold mb-2">₹{totalIncome.toFixed(2)}</div>
                <div className="text-purple-200 text-sm">Real-time calculated</div>
              </div>
            </div>
          </motion.div>

          {/* Income Type Cards - Horizontal Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Promotional Income Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-green-400 to-green-600 p-6 rounded-2xl shadow-lg text-white flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FaBullhorn className="text-xl" />
                </div>
                <h3 className="font-bold text-lg">Promotional Income</h3>
              </div>
              
              <div className="flex-1">
                <p className="text-sm mb-4 leading-relaxed">
                  Binary plan (Left & Right legs). Pair matching: <b>1:1 ratio</b>.<br/>
                  <b>₹400 per pair</b>. Daily cap: <b>400 pairs</b> (₹2000/day).<br/>
                  Payouts: <b>2nd, 12th, 22nd</b> monthly.
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="bg-white/20 px-2 py-1 rounded">Pair: L+R</span>
                    <span className="bg-white/20 px-2 py-1 rounded">₹400/pair</span>
                  </div>
                  <div className="text-center">
                    <span className="bg-white/20 px-3 py-1 rounded text-xs font-medium">Max 400 pairs/day</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Mentorship Income Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-br from-teal-400 to-teal-600 p-6 rounded-2xl shadow-lg text-white flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FaChalkboardTeacher className="text-xl" />
                </div>
                <h3 className="font-bold text-lg">Mentorship Income</h3>
              </div>
              
              <div className="flex-1">
                <p className="text-sm mb-4 leading-relaxed">
                  Earn when your downlines match pairs.<br/>
                  <b>₹100 per pair</b> when downlines complete binary legs.<br/>
                  No limit on mentorship earnings.<br/>
                  Example: 10 downline pairs = <b>₹1,000</b>.
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="bg-white/20 px-2 py-1 rounded">Downline Pairs</span>
                    <span className="bg-white/20 px-2 py-1 rounded">₹100/pair</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Rewards Card */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-gradient-to-br from-pink-400 to-pink-600 p-6 rounded-2xl shadow-lg text-white flex flex-col h-full"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FaGift className="text-xl" />
                </div>
                <h3 className="font-bold text-lg">Rewards</h3>
              </div>
              
              <div className="flex-1">
                <p className="text-sm mb-4 leading-relaxed">
                  Earn company awards for performance.<br/>
                  Business volume: <b>₹1L–₹30L</b>.<br/>
                  First 500 pairs: <b>₹25,000</b> bonus.<br/>
                  Next 100 pairs: <b>₹5,000</b> bonus.<br/>
                  Festival rewards monthly.
                </p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="bg-white/20 px-2 py-1 rounded">Volume: ₹1L–₹30L</span>
                    <span className="bg-white/20 px-2 py-1 rounded">Bonuses & Gifts</span>
                  </div>
                </div>
              </div>
            </motion.div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
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
                      <p className="text-xs text-purple-200 mt-1">Left Team: {leftTeamCount} | Right Team: {rightTeamCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-purple-100">
                    <BsPersonCheck className="text-sm" />
                    <span className="text-xs">Total Network</span>
                  </div>
                  {/* Team Balance Indicator */}
                  <div className="mt-3 bg-white/10 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ 
                        width: `${leftTeamCount + rightTeamCount > 0 ? Math.min((Math.min(leftTeamCount, rightTeamCount) / Math.max(leftTeamCount, rightTeamCount, 1)) * 100, 100) : 0}%` 
                      }}
                    ></div>
                  </div>
                  <div className="text-xs text-purple-200 mt-1 text-center">
                    {leftTeamCount + rightTeamCount > 0 ? (
                      `Balance: ${Math.min(leftTeamCount, rightTeamCount)}:${Math.max(leftTeamCount, rightTeamCount)}`
                    ) : (
                      'No team members yet'
                    )}
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

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <FaNetworkWired className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-100 text-sm">Network Pairs</p>
                      <p className="text-2xl font-bold">{totalPairs || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-indigo-100">
                    <FaNetworkWired className="text-sm" />
                    <span className="text-xs">Total Pairs Matched</span>
                  </div>
                  <div className="mt-2 bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${Math.min((totalPairs || 0) / 100 * 100, 100)}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-indigo-100 mt-1">
                    {totalPairs > 0 ? `${totalPairs} pairs matched` : 'No pairs matched yet'}
                  </div>
                  <button 
                    onClick={() => {
                      countAllPairsManually();
                      countAllPossiblePairs();
                    }}
                    className="mt-2 px-3 py-1 bg-indigo-400 text-white rounded text-xs hover:bg-indigo-500"
                  >
                    Recalculate Pairs
                  </button>
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
                  className="bg-gradient-to-br from-teal-500 to-teal-600 p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <FaChalkboardTeacher className="text-2xl" />
                    </div>
                    <div className="text-right">
                      <p className="text-teal-100 text-sm">Mentorship Income</p>
                      <p className="text-2xl font-bold">₹{calculatedMentorshipIncome.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-teal-100 text-sm">
                    <span>Mentorship Pairs: {downlinePairs}</span>
                    <span>₹100/pair</span>
                  </div>
                  <div className="mt-2 bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${downlinePairs > 0 ? Math.min((downlinePairs / 10) * 100, 100) : 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-teal-100 mt-1">
                    {downlinePairs > 0 ? (
                      `Mentorship income for ${downlinePairs} pairs (total - 1)`
                    ) : (
                      'No mentorship pairs (need more than 1 pair)'
                    )}
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

              {/* Team Breakdown Section */}
              <div className="mb-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <RiTeamFill className="text-2xl" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Team Breakdown</h3>
                        <p className="text-indigo-100 text-sm">Left vs Right team distribution</p>
                        
                        {/* Priority Indicator */}
                        {leftTeamCount + rightTeamCount > 0 && leftTeamCount !== rightTeamCount && (
                          <div className="mt-2 flex items-center gap-2">
                            {leftTeamCount < rightTeamCount ? (
                              <>
                                <span className="px-2 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full animate-pulse">
                                  ⬅️ Build LEFT Team
                                </span>
                                <span className="text-yellow-200 text-xs">
                                  Need {rightTeamCount - leftTeamCount} more to balance
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="px-2 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full animate-pulse">
                                  ➡️ Build RIGHT Team
                                </span>
                                <span className="text-yellow-200 text-xs">
                                  Need {leftTeamCount - rightTeamCount} more to balance
                                </span>
                              </>
                            )}
                          </div>
                        )}
                        
                        {leftTeamCount + rightTeamCount > 0 && leftTeamCount === rightTeamCount && (
                          <div className="mt-2">
                            <span className="px-2 py-1 bg-green-500 text-green-900 text-xs font-bold rounded-full">
                              🎯 Teams are Balanced!
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{leftTeamCount + rightTeamCount}</div>
                      <div className="text-indigo-200 text-sm">Total Team</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left Team */}
                    <div className={`bg-white/10 rounded-xl p-4 border-2 transition-all duration-300 ${
                      leftTeamCount < rightTeamCount && leftTeamCount + rightTeamCount > 0 
                        ? 'border-yellow-400 bg-yellow-500/20' 
                        : leftTeamCount === rightTeamCount && leftTeamCount > 0 
                        ? 'border-green-400 bg-green-500/20'
                        : 'border-transparent'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">Left Team</h4>
                          {leftTeamCount < rightTeamCount && leftTeamCount + rightTeamCount > 0 && (
                            <span className="px-2 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full animate-pulse">
                              ⚠️ Smaller Team
                            </span>
                          )}
                          {leftTeamCount === rightTeamCount && leftTeamCount > 0 && (
                            <span className="px-2 py-1 bg-green-500 text-green-900 text-xs font-bold rounded-full">
                              🎯 Balanced
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-bold">{leftTeamCount}</div>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                        <div 
                          className="bg-blue-400 rounded-full h-3 transition-all duration-300"
                          style={{ 
                            width: `${leftTeamCount + rightTeamCount > 0 ? (leftTeamCount / (leftTeamCount + rightTeamCount)) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-indigo-200">
                        {leftTeamCount + rightTeamCount > 0 ? 
                          `${((leftTeamCount / (leftTeamCount + rightTeamCount)) * 100).toFixed(1)}% of total team` : 
                          'No team members yet'
                        }
                      </div>
                      {leftTeamCount < rightTeamCount && leftTeamCount + rightTeamCount > 0 && (
                        <div className="mt-2 text-xs text-yellow-200 bg-yellow-500/20 p-2 rounded">
                          <strong>Focus Area:</strong> Build your left team to balance with right team ({rightTeamCount - leftTeamCount} more needed)
                        </div>
                      )}
                    </div>
                    
                    {/* Right Team */}
                    <div className={`bg-white/10 rounded-xl p-4 border-2 transition-all duration-300 ${
                      rightTeamCount < leftTeamCount && leftTeamCount + rightTeamCount > 0 
                        ? 'border-yellow-400 bg-yellow-500/20' 
                        : rightTeamCount === leftTeamCount && leftTeamCount > 0 
                        ? 'border-green-400 bg-green-500/20'
                        : 'border-transparent'
                    }`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">Right Team</h4>
                          {rightTeamCount < leftTeamCount && leftTeamCount + rightTeamCount > 0 && (
                            <span className="px-2 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded-full animate-pulse">
                              ⚠️ Smaller Team
                            </span>
                          )}
                          {rightTeamCount === leftTeamCount && leftTeamCount > 0 && (
                            <span className="px-2 py-1 bg-green-500 text-green-900 text-xs font-bold rounded-full">
                              🎯 Balanced
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-bold">{rightTeamCount}</div>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-3 mb-2">
                        <div 
                          className="bg-green-400 rounded-full h-3 transition-all duration-300"
                          style={{ 
                            width: `${leftTeamCount + rightTeamCount > 0 ? (rightTeamCount / (leftTeamCount + rightTeamCount)) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-indigo-200">
                        {leftTeamCount + rightTeamCount > 0 ? 
                          `${((rightTeamCount / (leftTeamCount + rightTeamCount)) * 100).toFixed(1)}% of total team` : 
                          'No team members yet'
                        }
                      </div>
                      {rightTeamCount < leftTeamCount && leftTeamCount + rightTeamCount > 0 && (
                        <div className="mt-2 text-xs text-yellow-200 bg-yellow-500/20 p-2 rounded">
                          <strong>Focus Area:</strong> Build your right team to balance with left team ({leftTeamCount - rightTeamCount} more needed)
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Team Balance Summary */}
                  <div className="mt-6 pt-4 border-t border-indigo-400">
                    <div className="flex items-center justify-between">
                      <div className="text-indigo-100">
                        <span className="font-semibold">Team Balance:</span>
                        <span className="ml-2">
                          {leftTeamCount + rightTeamCount > 0 ? 
                            `${Math.min(leftTeamCount, rightTeamCount)}:${Math.max(leftTeamCount, rightTeamCount)}` : 
                            '0:0'
                          }
                        </span>
                      </div>
                      <div className="text-indigo-100">
                        <span className="font-semibold">Balance Ratio:</span>
                        <span className="ml-2">
                          {leftTeamCount + rightTeamCount > 0 ? 
                            `${((Math.min(leftTeamCount, rightTeamCount) / Math.max(leftTeamCount, rightTeamCount, 1)) * 100).toFixed(1)}%` : 
                            '0%'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {/* Priority Action Section */}
                    {leftTeamCount + rightTeamCount > 0 && (
                      <div className="mt-4 p-3 rounded-lg border-2 transition-all duration-300 ${
                        leftTeamCount === rightTeamCount 
                          ? 'bg-green-500/20 border-green-400' 
                          : 'bg-yellow-500/20 border-yellow-400'
                      }">
                        <div className="flex items-center gap-2 mb-2">
                          {leftTeamCount === rightTeamCount ? (
                            <>
                              <span className="text-green-300 text-lg">🎯</span>
                              <span className="font-semibold text-green-100">Perfect Balance Achieved!</span>
                            </>
                          ) : (
                            <>
                              <span className="text-yellow-300 text-lg">⚖️</span>
                              <span className="font-semibold text-yellow-100">Action Required</span>
                            </>
                          )}
                        </div>
                        
                        {leftTeamCount === rightTeamCount ? (
                          <p className="text-green-200 text-sm">
                            Your teams are perfectly balanced! Focus on maintaining this balance and growing both teams equally.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {leftTeamCount < rightTeamCount ? (
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-200">⬅️</span>
                                <span className="text-yellow-100 text-sm">
                                  <strong>Priority:</strong> Build your LEFT team - you need {rightTeamCount - leftTeamCount} more members to balance with your right team ({rightTeamCount} members)
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-yellow-200">➡️</span>
                                <span className="text-yellow-100 text-sm">
                                  <strong>Priority:</strong> Build your RIGHT team - you need {leftTeamCount - rightTeamCount} more members to balance with your left team ({leftTeamCount} members)
                                </span>
                              </div>
                            )}
                            <p className="text-yellow-200 text-xs">
                              💡 Tip: Balanced teams maximize your pair matching and income potential in the binary MLM structure.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="mt-2 text-xs text-indigo-200">
                      {leftTeamCount === rightTeamCount && leftTeamCount > 0 ? 
                        '🎯 Perfectly balanced teams!' : 
                        leftTeamCount > 0 && rightTeamCount > 0 ? 
                        '⚖️ Teams are imbalanced - focus on building the smaller team' : 
                        '📈 Start building your teams to earn income'
                      }
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Pairs Matching Analysis Section */}
              <div className="mb-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-lg"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-white/20 rounded-xl">
                        <FaNetworkWired className="text-2xl" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold">Pairs Matching Analysis</h3>
                        <p className="text-emerald-100 text-sm">Binary MLM pair formation and income potential</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{Math.min(leftTeamCount, rightTeamCount)}</div>
                      <div className="text-emerald-200 text-sm">Formed Pairs</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    {/* Left Team Stats */}
                    <div className="bg-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">Left Team</h4>
                        <div className="text-2xl font-bold">{leftTeamCount}</div>
                      </div>
                      <div className="text-emerald-100 text-sm">
                        <div className="flex justify-between mb-1">
                          <span>Available for pairs:</span>
                          <span className="font-semibold">{leftTeamCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Used in pairs:</span>
                          <span className="font-semibold">{Math.min(leftTeamCount, rightTeamCount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unused:</span>
                          <span className="font-semibold">{Math.max(0, leftTeamCount - Math.min(leftTeamCount, rightTeamCount))}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Team Stats */}
                    <div className="bg-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">Right Team</h4>
                        <div className="text-2xl font-bold">{rightTeamCount}</div>
                      </div>
                      <div className="text-emerald-100 text-sm">
                        <div className="flex justify-between mb-1">
                          <span>Available for pairs:</span>
                          <span className="font-semibold">{rightTeamCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Used in pairs:</span>
                          <span className="font-semibold">{Math.min(leftTeamCount, rightTeamCount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Unused:</span>
                          <span className="font-semibold">{Math.max(0, rightTeamCount - Math.min(leftTeamCount, rightTeamCount))}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pairs Summary */}
                    <div className="bg-white/10 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">Pairs Summary</h4>
                        <div className="text-2xl font-bold">{Math.min(leftTeamCount, rightTeamCount)}</div>
                      </div>
                      <div className="text-emerald-100 text-sm">
                        <div className="flex justify-between mb-1">
                          <span>Total pairs:</span>
                          <span className="font-semibold">{Math.min(leftTeamCount, rightTeamCount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Income per pair:</span>
                          <span className="font-semibold">₹400</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total income:</span>
                          <span className="font-semibold">₹{(Math.min(leftTeamCount, rightTeamCount) * 400).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pair Formation Visualization */}
                  <div className="bg-white/10 rounded-xl p-4 mb-4">
                    <h4 className="font-semibold text-lg mb-3 text-center">Pair Formation Process</h4>
                    <div className="flex items-center justify-center gap-4 mb-4">
                      {/* Left Team */}
                      <div className="text-center">
                        <div className="bg-blue-400 rounded-lg p-3 mb-2">
                          <div className="text-lg font-bold text-blue-900">{leftTeamCount}</div>
                          <div className="text-xs text-blue-800">Left Team</div>
                        </div>
                        <div className="text-xs text-emerald-200">
                          {leftTeamCount > rightTeamCount ? 'Excess: ' + (leftTeamCount - rightTeamCount) : 'All used'}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="text-2xl text-emerald-300">→</div>
                      
                      {/* Pairs */}
                      <div className="text-center">
                        <div className="bg-emerald-400 rounded-lg p-3 mb-2">
                          <div className="text-lg font-bold text-emerald-900">{Math.min(leftTeamCount, rightTeamCount)}</div>
                          <div className="text-xs text-emerald-800">Pairs Formed</div>
                        </div>
                        <div className="text-xs text-emerald-200">
                          ₹{Math.min(leftTeamCount, rightTeamCount) * 400}
                        </div>
                      </div>
                      
                      {/* Arrow */}
                      <div className="text-2xl text-emerald-300">→</div>
                      
                      {/* Right Team */}
                      <div className="text-center">
                        <div className="bg-green-400 rounded-lg p-3 mb-2">
                          <div className="text-lg font-bold text-green-900">{rightTeamCount}</div>
                          <div className="text-xs text-green-800">Right Team</div>
                        </div>
                        <div className="text-xs text-emerald-200">
                          {rightTeamCount > leftTeamCount ? 'Excess: ' + (rightTeamCount - leftTeamCount) : 'All used'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Pair Formation Logic */}
                    <div className="text-center text-sm text-emerald-200">
                      <p>
                        <strong>Pair Formation Rule:</strong> 1 member from Left Team + 1 member from Right Team = 1 Pair
                      </p>
                      <p className="mt-1">
                        <strong>Maximum Pairs:</strong> {Math.min(leftTeamCount, rightTeamCount)} (limited by the smaller team)
                      </p>
                    </div>
                  </div>
                  
                  {/* Optimization Recommendations */}
                  <div className="bg-white/10 rounded-xl p-4">
                    <h4 className="font-semibold text-lg mb-3">Optimization Recommendations</h4>
                    <div className="space-y-3">
                      {leftTeamCount === rightTeamCount && leftTeamCount > 0 ? (
                        <div className="flex items-center gap-2 text-green-200">
                          <span className="text-lg">🎯</span>
                          <span>Perfect balance achieved! Focus on growing both teams equally to increase total pairs.</span>
                        </div>
                      ) : leftTeamCount > 0 && rightTeamCount > 0 ? (
                        <>
                          {leftTeamCount < rightTeamCount ? (
                            <div className="flex items-center gap-2 text-yellow-200">
                              <span className="text-lg">⬅️</span>
                              <span><strong>Priority:</strong> Build your LEFT team. Adding {rightTeamCount - leftTeamCount} more members will create {rightTeamCount - leftTeamCount} additional pairs worth ₹{(rightTeamCount - leftTeamCount) * 400}.</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-yellow-200">
                              <span className="text-lg">➡️</span>
                              <span><strong>Priority:</strong> Build your RIGHT team. Adding {leftTeamCount - rightTeamCount} more members will create {leftTeamCount - rightTeamCount} additional pairs worth ₹{(leftTeamCount - rightTeamCount) * 400}.</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-blue-200">
                            <span className="text-lg">💡</span>
                            <span>Current pairs: {Math.min(leftTeamCount, rightTeamCount)} | Potential pairs: {Math.max(leftTeamCount, rightTeamCount)} | Income difference: ₹{Math.abs(leftTeamCount - rightTeamCount) * 400}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-blue-200">
                          <span className="text-lg">📈</span>
                          <span>Start building both teams to create your first pairs and start earning income.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Debug Network Information */}
              <div className="mb-8">
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-gradient-to-br from-gray-500 to-gray-600 p-6 rounded-2xl text-white shadow-lg"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <FaNetworkWired className="text-2xl" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Network Debug Info</h3>
                      <p className="text-gray-200 text-sm">Current network structure and pair calculation</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-white/10 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">User Info</h4>
                      <div className="space-y-1">
                        <div>Referral Code: {user?.referralCode || 'N/A'}</div>
                        <div>Left Downline: {user?.leftDownLine || 'None'}</div>
                        <div>Right Downline: {user?.rightDownLine || 'None'}</div>
                        <div>Affiliate Status: {user?.affiliateStatus ? 'Active' : 'Inactive'}</div>
                        <div>Payment Status: {user?.paymentStatus || 'N/A'}</div>
                        <div>Has Both Downlines: {user?.leftDownLine && user?.rightDownLine ? 'Yes' : 'No'}</div>
                      </div>
                    </div>
                    
                    <div className="bg-white/10 rounded-lg p-4">
                      <h4 className="font-semibold mb-2">Pair Calculation</h4>
                      <div className="space-y-1">
                        <div>Total Pairs: {totalPairs}</div>
                        <div>Downline Pairs: {downlinePairs}</div>
                        <div>Promotional Income: ₹{calculatedPromotionalIncome.toFixed(2)}</div>
                        <div>Mentorship Income: ₹{calculatedMentorshipIncome.toFixed(2)}</div>
                        <div>Expected Income: ₹{(totalPairs * 400).toFixed(2)}</div>
                        <div>Calculation Status: {totalPairs > 0 ? 'Active' : 'No pairs found'}</div>
                      </div>
                      <button 
                        onClick={() => {
                          countAllPairsManually();
                          countAllPossiblePairs();
                        }}
                        className="mt-2 px-3 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                      >
                        Force Recalculate
                      </button>
                    </div>
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
