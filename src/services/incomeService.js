import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs, 
  addDoc, 
  onSnapshot,
  serverTimestamp,
  increment,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { app } from '../Firebase/firebase';
import RewardsService from './rewardsService';

const db = getFirestore(app);

export class IncomeService {
  
  // Calculate and distribute performance rewards
  static async calculatePerformanceRewards() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get all MLM users
      const mlmUsersSnapshot = await getDocs(collection(db, 'mlmUsers'));
      const batch = writeBatch(db);

      for (const userDoc of mlmUsersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();

        // Calculate pairs in last 30 days
        const pairsIn30Days = await this.getPairsInPeriod(userId, thirtyDaysAgo, new Date());
        
        // Determine reward based on pairs
        const reward = this.getPerformanceReward(pairsIn30Days);
        
        if (reward > 0) {
          // Update user's performance rewards
          batch.update(userDoc.ref, {
            performanceRewards: increment(reward),
            totalIncome: increment(reward),
            lastPerformanceReward: serverTimestamp(),
            pairsLast30Days: pairsIn30Days
          });

          // Update main user balance
          const mainUserRef = doc(db, 'users', userId);
          batch.update(mainUserRef, {
            affiliateBalance: increment(reward),
            totalEarnings: increment(reward)
          });

          // Create income record
          const incomeRecord = {
            userId,
            type: 'performance_reward',
            amount: reward,
            pairs: pairsIn30Days,
            description: `Performance reward for ${pairsIn30Days} pairs in 30 days`,
            createdAt: serverTimestamp(),
            status: 'completed',
            period: '30_days'
          };

          const incomeRef = doc(collection(db, 'incomeRecords'));
          batch.set(incomeRef, incomeRecord);
        }
      }

      await batch.commit();

    } catch (error) {
      throw error;
    }
  }

  // Get performance reward amount based on pairs
  static getPerformanceReward(pairs) {
    if (pairs >= 1000) return 50000;
    if (pairs >= 500) return 25000;
    if (pairs >= 250) return 12500;
    if (pairs >= 100) return 5000;
    if (pairs >= 50) return 2500;
    return 0;
  }

  // Get pairs count in a specific period
  static async getPairsInPeriod(userId, startDate, endDate) {
    try {
      // Get income records for promotional income in the period
      const incomeQuery = query(
        collection(db, 'incomeRecords'),
        where('userId', '==', userId),
        where('type', '==', 'promotional'),
        where('createdAt', '>=', startDate),
        where('createdAt', '<=', endDate)
      );

      const incomeSnapshot = await getDocs(incomeQuery);
      let totalPairs = 0;

      incomeSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalPairs += data.pairs || 0;
      });

      return totalPairs;
    } catch (error) {
      return 0;
    }
  }

  // Get user's income summary - Enhanced for Vedmurti Plan
  static async getUserIncomeSummary(userId) {
    try {
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!mlmDoc.exists()) {
        return {
          promotionalIncome: 0,
          leadershipIncome: 0,
          rewardsIncome: 0,
          joiningIncome: 0,
          totalIncome: 0,
          todayIncome: 0,
          monthlyIncome: 0,
          pairsCount: 0,
          dailyPairs: 0,
          dailyIncome: 0,
          availableDailyPairs: 400,
          availableDailyIncome: 2000,
          totalLeftCount: 0,
          totalRightCount: 0,
          level: 0,
          mlmId: null,
          currentRank: 'Starter',
          teamTurnover: 0,
          qualifiedReferrals: 0,
          eligibleForLeadership: false
        };
      }

      const mlmData = mlmDoc.data();
      

      
      // Ensure today's income record exists
      await this.ensureTodayIncomeRecord(userId, mlmData);
      
      // Calculate today's income based on current income calculations
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // First try to get from income records
      const todayIncomeQuery = query(
        collection(db, 'incomeRecords'),
        where('userId', '==', userId),
        where('createdAt', '>=', todayStart)
      );
      const todayIncomeSnapshot = await getDocs(todayIncomeQuery);
      let todayIncome = todayIncomeSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      
      // If no income records for today, calculate based on daily income from MLM data
      if (todayIncome === 0 && mlmData) {
        const lastReset = mlmData.lastDailyReset?.toDate() || new Date(0);
        const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
        const shouldReset = hoursDiff >= 24;
        
        
        
        if (!shouldReset) {
          // Use the daily income from MLM data if it hasn't been reset today
          todayIncome = mlmData.dailyIncome || 0;
  
        }
      }
      
      // If still 0, try to calculate based on current network structure
      if (todayIncome === 0) {

        try {
          // Get user data to find referral code
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.referralCode) {
              // Calculate income based on current network (similar to payout service)
              const calculatedIncome = await this.calculateIncomeFromNetwork(userData.referralCode);
              todayIncome = calculatedIncome;
  
            }
          }
        } catch (error) {
          // Error calculating income from network
        }
      }

      // Calculate monthly income
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyIncomeQuery = query(
        collection(db, 'incomeRecords'),
        where('userId', '==', userId),
        where('createdAt', '>=', monthStart)
      );
      const monthlyIncomeSnapshot = await getDocs(monthlyIncomeQuery);
      const monthlyIncome = monthlyIncomeSnapshot.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

      // Check if daily reset is needed (Vedmurti Plan - daily limits)
      const lastReset = mlmData.lastDailyReset?.toDate() || new Date(0);
      const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
      const shouldReset = hoursDiff >= 24;
      
      const dailyPairs = shouldReset ? 0 : (mlmData.dailyPairs || 0);
      const dailyIncome = shouldReset ? 0 : (mlmData.dailyIncome || 0);

      // Vedmurti Plan daily limits
      const maxDailyPairs = 400;
      const maxDailyIncome = 2000;


      
      return {
        // Vedmurti Plan Income Types
        promotionalIncome: mlmData.promotionalIncome || 0,
        leadershipIncome: mlmData.leadershipIncome || 0,
        rewardsIncome: mlmData.rewardsIncome || 0,
        joiningIncome: mlmData.joiningIncome || 0,
        totalIncome: mlmData.totalIncome || 0,
        
        // Time-based Income
        todayIncome,
        monthlyIncome,
        
        // Pair Information
        pairsCount: mlmData.pairsCount || 0,
        dailyPairs,
        dailyIncome,
        availableDailyPairs: Math.max(0, maxDailyPairs - dailyPairs),
        availableDailyIncome: Math.max(0, maxDailyIncome - dailyIncome),
        
        // Network Information
        totalLeftCount: mlmData.totalLeftCount || 0,
        totalRightCount: mlmData.totalRightCount || 0,
        level: mlmData.level || 0,
        mlmId: mlmData.mlmId,
        
        // Rank and Performance
        currentRank: mlmData.currentRank || 'Starter',
        rankLevel: mlmData.rankLevel || 1,
        teamTurnover: mlmData.teamTurnover || 0,
        leftTeamTurnover: mlmData.leftTeamTurnover || 0,
        rightTeamTurnover: mlmData.rightTeamTurnover || 0,
        
        // Leadership Eligibility
        qualifiedReferrals: mlmData.qualifiedReferrals || 0,
        eligibleForLeadership: mlmData.eligibleForLeadership || false,
        
        // Additional Metrics
        businessVolume: (mlmData.leftTeamTurnover || 0) + (mlmData.rightTeamTurnover || 0),
        balanceRatio: this.calculateBalanceRatio(mlmData.totalLeftCount || 0, mlmData.totalRightCount || 0),
        
        // Payout Information
        currentCycleIncome: mlmData.currentCycleIncome || 0,
        pendingPayout: mlmData.pendingPayout || 0,
        lastPayoutDate: mlmData.lastPayoutDate,
        
        // System Status
        isActive: mlmData.isActive !== false,
        kycCompleted: mlmData.kycCompleted || false,
        joinDate: mlmData.joinDate
      };
    } catch (error) {
      throw error;
    }
  }

  // Calculate balance ratio for binary tree
  static calculateBalanceRatio(leftCount, rightCount) {
    if (leftCount === 0 && rightCount === 0) return 1;
    const total = leftCount + rightCount;
    const smaller = Math.min(leftCount, rightCount);
    return total > 0 ? (smaller * 2) / total : 0;
  }

  // Get detailed income history
  static async getIncomeHistory(userId, limitCount = 50) {
    try {
      const incomeQuery = query(
        collection(db, 'incomeRecords'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const incomeSnapshot = await getDocs(incomeQuery);
      const incomeHistory = [];

      incomeSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        incomeHistory.push({
          id: doc.id,
          ...data,
          date: data.createdAt?.toDate() || new Date()
        });
      });

      return incomeHistory;
    } catch (error) {
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        try {
          const incomeQuery = query(
            collection(db, 'incomeRecords'),
            where('userId', '==', userId),
            limit(limitCount)
          );

          const incomeSnapshot = await getDocs(incomeQuery);
          const incomeHistory = [];

          incomeSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            incomeHistory.push({
              id: doc.id,
              ...data,
              date: data.createdAt?.toDate() || new Date()
            });
          });

          // Sort manually since we can't use orderBy
          incomeHistory.sort((a, b) => {
            const dateA = a.date || new Date(0);
            const dateB = b.date || new Date(0);
            return dateB - dateA;
          });

          return incomeHistory;
        } catch (simpleError) {
          return [];
        }
      }
      
      return [];
    }
  }

  // Get income analytics for charts
  static async getIncomeAnalytics(userId) {
    try {
      const incomeHistory = await this.getIncomeHistory(userId, 365); // Last year
      
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Initialize data arrays
      const monthlyData = new Array(12).fill(0);
      const weeklyData = new Array(7).fill(0);
      const dailyData = new Array(30).fill(0);
      
      // Income breakdown by type - Vedmurti Plan
      const incomeBreakdown = {
        promotional: 0,
        leadership: 0,
        reward: 0,
        joining_bonus: 0,
        festival_reward: 0
      };

      // Process income history
      incomeHistory.forEach(income => {
        const incomeDate = new Date(income.date);
        const incomeYear = incomeDate.getFullYear();
        const incomeMonth = incomeDate.getMonth();
        const incomeDay = incomeDate.getDate();
        const amount = income.amount || 0;
        
        // Monthly data (current year)
        if (incomeYear === currentYear) {
          monthlyData[incomeMonth] += amount;
        }
        
        // Weekly data (last 7 weeks)
        const weeksDiff = Math.floor((now - incomeDate) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff >= 0 && weeksDiff < 7) {
          weeklyData[6 - weeksDiff] += amount;
        }
        
        // Daily data (last 30 days)
        const daysDiff = Math.floor((now - incomeDate) / (24 * 60 * 60 * 1000));
        if (daysDiff >= 0 && daysDiff < 30) {
          dailyData[29 - daysDiff] += amount;
        }
        
        // Income breakdown - Vedmurti Plan types
        const incomeType = income.type || 'other';
        if (incomeBreakdown.hasOwnProperty(incomeType)) {
          incomeBreakdown[incomeType] += amount;
        } else if (incomeType === 'performance_reward') {
          incomeBreakdown.reward += amount;
        } else if (incomeType === 'mentorship') {
          incomeBreakdown.leadership += amount;
        }
      });

      return {
        monthlyData,
        weeklyData,
        dailyData,
        incomeBreakdown,
        totalTransactions: incomeHistory.length
      };
    } catch (error) {
      return {
        monthlyData: new Array(12).fill(0),
        weeklyData: new Array(7).fill(0),
        dailyData: new Array(30).fill(0),
        incomeBreakdown: {
          promotional: 0,
          leadership: 0,
          reward: 0,
          joining_bonus: 0,
          festival_reward: 0
        },
        totalTransactions: 0
      };
    }
  }

  // Calculate team volume and bonuses
  static async calculateTeamVolume(userId) {
    try {
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!mlmDoc.exists()) return { leftVolume: 0, rightVolume: 0, teamSize: 0 };

      const mlmData = mlmDoc.data();
      
      // Calculate left team volume
      const leftVolume = await this.calculateSubtreeVolume(mlmData.leftChild);
      
      // Calculate right team volume
      const rightVolume = await this.calculateSubtreeVolume(mlmData.rightChild);
      
      // Calculate total team size
      const teamSize = (mlmData.totalLeftCount || 0) + (mlmData.totalRightCount || 0);

      return {
        leftVolume,
        rightVolume,
        teamSize,
        balanceRatio: teamSize > 0 ? Math.min(leftVolume, rightVolume) / Math.max(leftVolume, rightVolume) : 0
      };
    } catch (error) {
      return { leftVolume: 0, rightVolume: 0, teamSize: 0, balanceRatio: 0 };
    }
  }

  // Calculate subtree volume recursively
  static async calculateSubtreeVolume(userId) {
    if (!userId) return 0;

    try {
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!mlmDoc.exists()) return 0;

      const mlmData = mlmDoc.data();
      let volume = mlmData.totalIncome || 0;

      // Add left subtree volume
      if (mlmData.leftChild) {
        volume += await this.calculateSubtreeVolume(mlmData.leftChild);
      }

      // Add right subtree volume
      if (mlmData.rightChild) {
        volume += await this.calculateSubtreeVolume(mlmData.rightChild);
      }

      return volume;
    } catch (error) {
      return 0;
    }
  }

  // Get rank based on team performance - Vedmurti Plan
  static async getUserRank(userId) {
    try {
      const incomeSummary = await this.getUserIncomeSummary(userId);
      const teamVolume = await this.calculateTeamVolume(userId);
      
      const totalIncome = incomeSummary.totalIncome;
      const pairsCount = incomeSummary.pairsCount;
      const businessVolume = incomeSummary.businessVolume;
      const teamSize = teamVolume.teamSize;

      // Vedmurti Plan Rank Criteria
      if (pairsCount >= 5000 && businessVolume >= 3000000 && totalIncome >= 1000000) {
        return { 
          rank: 'Ambassador', 
          level: 11, 
          color: 'from-purple-600 to-pink-600',
          benefits: ['₹250,000 reward', 'International trips', 'Car fund', 'House fund', 'Leadership bonus 50%'],
          nextTarget: null
        };
      } else if (pairsCount >= 3000 && businessVolume >= 2000000 && totalIncome >= 750000) {
        return { 
          rank: 'Royal', 
          level: 10, 
          color: 'from-yellow-500 to-orange-500',
          benefits: ['₹150,000 reward', 'Luxury trips', 'Bike fund', 'Leadership bonus 40%'],
          nextTarget: { pairs: 5000, volume: 3000000, income: 1000000 }
        };
      } else if (pairsCount >= 2000 && businessVolume >= 1500000 && totalIncome >= 500000) {
        return { 
          rank: 'Crown', 
          level: 9, 
          color: 'from-purple-500 to-purple-600',
          benefits: ['₹100,000 reward', 'International recognition', 'Leadership bonus 35%'],
          nextTarget: { pairs: 3000, volume: 2000000, income: 750000 }
        };
      } else if (pairsCount >= 1500 && businessVolume >= 1000000 && totalIncome >= 375000) {
        return { 
          rank: 'Platinum', 
          level: 8, 
          color: 'from-gray-400 to-gray-600',
          benefits: ['₹75,000 reward', 'Premium recognition', 'Leadership bonus 30%'],
          nextTarget: { pairs: 2000, volume: 1500000, income: 500000 }
        };
      } else if (pairsCount >= 1000 && businessVolume >= 500000 && totalIncome >= 250000) {
        return { 
          rank: 'Diamond', 
          level: 7, 
          color: 'from-blue-400 to-blue-600',
          benefits: ['₹50,000 reward', 'Diamond club membership', 'Leadership bonus 25%'],
          nextTarget: { pairs: 1500, volume: 1000000, income: 375000 }
        };
      } else if (pairsCount >= 500 && businessVolume >= 300000 && totalIncome >= 125000) {
        return { 
          rank: 'Champion', 
          level: 6, 
          color: 'from-green-500 to-green-600',
          benefits: ['₹25,000 reward', 'Champion recognition', 'Leadership bonus 20%'],
          nextTarget: { pairs: 1000, volume: 500000, income: 250000 }
        };
      } else if (pairsCount >= 400 && businessVolume >= 200000 && totalIncome >= 100000) {
        return { 
          rank: 'Master', 
          level: 5, 
          color: 'from-orange-500 to-orange-600',
          benefits: ['₹12,500 reward', 'Master status', 'Leadership bonus 18%'],
          nextTarget: { pairs: 500, volume: 300000, income: 125000 }
        };
      } else if (pairsCount >= 300 && businessVolume >= 150000 && totalIncome >= 75000) {
        return { 
          rank: 'Leader', 
          level: 4, 
          color: 'from-red-500 to-red-600',
          benefits: ['₹10,000 reward', 'Leadership recognition', 'Leadership bonus 15%'],
          nextTarget: { pairs: 400, volume: 200000, income: 100000 }
        };
      } else if (pairsCount >= 200 && businessVolume >= 100000 && totalIncome >= 50000) {
        return { 
          rank: 'Expert', 
          level: 3, 
          color: 'from-indigo-500 to-indigo-600',
          benefits: ['₹7,500 reward', 'Expert status', 'Leadership bonus 12%'],
          nextTarget: { pairs: 300, volume: 150000, income: 75000 }
        };
      } else if (pairsCount >= 100 && businessVolume >= 50000 && totalIncome >= 25000) {
        return { 
          rank: 'Professional', 
          level: 2, 
          color: 'from-teal-500 to-teal-600',
          benefits: ['₹5,000 reward', 'Professional status', 'Leadership bonus 10%'],
          nextTarget: { pairs: 200, volume: 100000, income: 50000 }
        };
      } else if (pairsCount >= 50 && businessVolume >= 25000 && totalIncome >= 12500) {
        return { 
          rank: 'Associate', 
          level: 1, 
          color: 'from-blue-500 to-blue-600',
          benefits: ['₹2,500 reward', 'Associate status', 'Leadership bonus 8%'],
          nextTarget: { pairs: 100, volume: 50000, income: 25000 }
        };
      } else {
        return { 
          rank: 'Starter', 
          level: 0, 
          color: 'from-gray-500 to-gray-600',
          benefits: ['Basic benefits', 'Training access'],
          nextTarget: { pairs: 50, volume: 25000, income: 12500 }
        };
      }
    } catch (error) {
      return { 
        rank: 'Starter', 
        level: 0, 
        color: 'from-gray-500 to-gray-600',
        benefits: ['Basic benefits'], 
        nextTarget: { pairs: 50, volume: 25000, income: 12500 }
      };
    }
  }

  // Subscribe to real-time income updates
  static subscribeToIncomeUpdates(userId, callback) {
    const unsubscribers = [];

    // Subscribe to MLM user data
    const mlmUserRef = doc(db, 'mlmUsers', userId);
    const unsubscribeMLM = onSnapshot(mlmUserRef, (doc) => {
      if (doc.exists()) {
        callback('mlm_data', doc.data());
      }
    });
    unsubscribers.push(unsubscribeMLM);

    // Subscribe to income records
    const incomeQuery = query(
      collection(db, 'incomeRecords'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribeIncome = onSnapshot(incomeQuery, (snapshot) => {
      const incomeRecords = [];
      snapshot.forEach((doc) => {
        incomeRecords.push({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.toDate() || new Date()
        });
      });
      callback('income_records', incomeRecords);
    }, (error) => {
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        const simpleQuery = query(
          collection(db, 'incomeRecords'),
          where('userId', '==', userId),
          limit(20)
        );
        
        const simpleUnsubscribe = onSnapshot(simpleQuery, (snapshot) => {
          const incomeRecords = [];
          snapshot.forEach((doc) => {
            incomeRecords.push({
              id: doc.id,
              ...doc.data(),
              date: doc.data().createdAt?.toDate() || new Date()
            });
          });
          // Sort manually
          incomeRecords.sort((a, b) => {
            const dateA = a.date || new Date(0);
            const dateB = b.date || new Date(0);
            return dateB - dateA;
          });
          callback('income_records', incomeRecords);
        }, (simpleError) => {
          // Error with simple income records query
        });
        
        unsubscribers.push(simpleUnsubscribe);
      }
    });
    unsubscribers.push(unsubscribeIncome);

    // Return cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  // Manual income adjustment (admin only)
  static async adjustUserIncome(userId, adjustment, reason, adminId) {
    try {
      return await runTransaction(db, async (transaction) => {
        const mlmUserRef = doc(db, 'mlmUsers', userId);
        const mlmUserDoc = await transaction.get(mlmUserRef);
        
        if (!mlmUserDoc.exists()) {
          throw new Error('MLM user not found');
        }

        // Update MLM user income
        transaction.update(mlmUserRef, {
          totalIncome: increment(adjustment.amount),
          [`${adjustment.type}Income`]: increment(adjustment.amount)
        });

        // Update main user balance
        const mainUserRef = doc(db, 'users', userId);
        transaction.update(mainUserRef, {
          affiliateBalance: increment(adjustment.amount),
          totalEarnings: increment(adjustment.amount)
        });

        // Create income record
        const incomeRecord = {
          userId,
          type: adjustment.type,
          amount: adjustment.amount,
          description: `Manual adjustment: ${reason}`,
          adjustedBy: adminId,
          createdAt: serverTimestamp(),
          status: 'completed',
          isManualAdjustment: true
        };

        const incomeRef = doc(collection(db, 'incomeRecords'));
        transaction.set(incomeRef, incomeRecord);

        return incomeRecord;
      });
    } catch (error) {
      throw error;
    }
  }

  // Calculate income from network structure
  static async calculateIncomeFromNetwork(referralCode) {
    try {

      
      // Build tree for income calculation (similar to payout service)
      const buildTree = async (referralCode, level = 0, maxLevel = 3) => {
        if (level >= maxLevel) return null;
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
      
      const treeData = await buildTree(referralCode);
      if (!treeData) {

        return 0;
      }
      
      // Calculate promotional income - Only count approved users
      const countLeg = (node) => {
        if (!node) return 0;
        const currentUserCount = node.isPaymentApproved ? 1 : 0;
        return currentUserCount + countLeg(node.leftNode) + countLeg(node.rightNode);
      };
      let l = treeData.leftNode ? countLeg(treeData.leftNode) : 0;
      let r = treeData.rightNode ? countLeg(treeData.rightNode) : 0;
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
      const promotionalIncome = pairs * 400;
      
      
      return promotionalIncome;
    } catch (error) {
      return 0;
    }
  }

  // Get top earners
  static async getTopEarners(limit = 10) {
    try {
      const mlmUsersQuery = query(
        collection(db, 'mlmUsers'),
        orderBy('totalIncome', 'desc'),
        limit(limit)
      );

      const snapshot = await getDocs(mlmUsersQuery);
      const topEarners = [];

      for (const doc of snapshot.docs) {
        const mlmData = doc.data();
        const userDoc = await getDoc(doc(db, 'users', doc.id));
        const userData = userDoc.exists() ? userDoc.data() : {};

        topEarners.push({
          userId: doc.id,
          name: userData.name || 'Unknown',
          mlmId: mlmData.mlmId,
          totalIncome: mlmData.totalIncome || 0,
          pairsCount: mlmData.pairsCount || 0,
          teamSize: (mlmData.totalLeftCount || 0) + (mlmData.totalRightCount || 0),
          rank: await this.getUserRank(doc.id)
        });
      }

      return topEarners;
    } catch (error) {
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        try {
          const mlmUsersQuery = query(
            collection(db, 'mlmUsers'),
            limit(limit)
          );

          const snapshot = await getDocs(mlmUsersQuery);
          const topEarners = [];

          for (const doc of snapshot.docs) {
            const mlmData = doc.data();
            const userDoc = await getDoc(doc(db, 'users', doc.id));
            const userData = userDoc.exists() ? userDoc.data() : {};

            topEarners.push({
              userId: doc.id,
              name: userData.name || 'Unknown',
              mlmId: mlmData.mlmId,
              totalIncome: mlmData.totalIncome || 0,
              pairsCount: mlmData.pairsCount || 0,
              teamSize: (mlmData.totalLeftCount || 0) + (mlmData.totalRightCount || 0),
              rank: await this.getUserRank(doc.id)
            });
          }

          // Sort manually since we can't use orderBy
          topEarners.sort((a, b) => (b.totalIncome || 0) - (a.totalIncome || 0));

          return topEarners;
        } catch (simpleError) {
          return [];
        }
      }
      
      return [];
    }
  }

  // Ensure today's income record exists
  static async ensureTodayIncomeRecord(userId, mlmData) {
    try {
      
      
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Check if income record already exists for today
      const todayIncomeQuery = query(
        collection(db, 'incomeRecords'),
        where('userId', '==', userId),
        where('createdAt', '>=', todayStart),
        where('type', '==', 'daily_summary')
      );
      const todayIncomeSnapshot = await getDocs(todayIncomeQuery);
      
      
      
      if (todayIncomeSnapshot.empty && mlmData) {
        const lastReset = mlmData.lastDailyReset?.toDate() || new Date(0);
        const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
        const shouldReset = hoursDiff >= 24;
        
        
        
        if (!shouldReset && mlmData.dailyIncome > 0) {
          // Create a daily summary income record
          const incomeRecord = {
            userId,
            type: 'daily_summary',
            amount: mlmData.dailyIncome,
            description: `Daily Income Summary: ₹${mlmData.dailyIncome}`,
            dailyPairs: mlmData.dailyPairs || 0,
            dailyIncome: mlmData.dailyIncome,
            createdAt: serverTimestamp(),
            status: 'completed',
            isDailySummary: true
          };

          const incomeRef = doc(collection(db, 'incomeRecords'));
          await setDoc(incomeRef, incomeRecord);
          
          
        } else {
          
        }
      } else {
        
      }
    } catch (error) {
      // Error ensuring today income record
    }
  }
}

export default IncomeService;
