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
      console.log('Performance rewards calculated and distributed');
    } catch (error) {
      console.error('Error calculating performance rewards:', error);
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
      console.error('Error getting pairs in period:', error);
      return 0;
    }
  }

  // Get user's income summary
  static async getUserIncomeSummary(userId) {
    try {
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!mlmDoc.exists()) {
        return {
          promotionalIncome: 0,
          mentorshipIncome: 0,
          performanceRewards: 0,
          totalIncome: 0,
          todayIncome: 0,
          monthlyIncome: 0,
          pairsCount: 0,
          dailyCycles: 0,
          availableCycles: 2
        };
      }

      const mlmData = mlmDoc.data();
      
      // Calculate today's income
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const todayIncomeQuery = query(
        collection(db, 'incomeRecords'),
        where('userId', '==', userId),
        where('createdAt', '>=', todayStart)
      );
      const todayIncomeSnapshot = await getDocs(todayIncomeQuery);
      const todayIncome = todayIncomeSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

      // Calculate monthly income
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyIncomeQuery = query(
        collection(db, 'incomeRecords'),
        where('userId', '==', userId),
        where('createdAt', '>=', monthStart)
      );
      const monthlyIncomeSnapshot = await getDocs(monthlyIncomeQuery);
      const monthlyIncome = monthlyIncomeSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

      // Check if daily cycles need reset
      const lastReset = mlmData.lastCycleReset?.toDate() || new Date(0);
      const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
      const dailyCycles = hoursDiff >= 12 ? 0 : (mlmData.dailyCycles || 0);

      return {
        promotionalIncome: mlmData.promotionalIncome || 0,
        mentorshipIncome: mlmData.mentorshipIncome || 0,
        performanceRewards: mlmData.performanceRewards || 0,
        totalIncome: mlmData.totalIncome || 0,
        todayIncome,
        monthlyIncome,
        pairsCount: mlmData.pairsCount || 0,
        dailyCycles,
        availableCycles: Math.max(0, 2 - dailyCycles),
        totalLeftCount: mlmData.totalLeftCount || 0,
        totalRightCount: mlmData.totalRightCount || 0,
        level: mlmData.level || 0,
        mlmId: mlmData.mlmId
      };
    } catch (error) {
      console.error('Error getting income summary:', error);
      throw error;
    }
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
      console.error('Error getting income history:', error);
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
      
      // Income breakdown by type
      const incomeBreakdown = {
        promotional: 0,
        mentorship: 0,
        performance_reward: 0
      };

      // Process income history
      incomeHistory.forEach(income => {
        const incomeDate = new Date(income.date);
        const incomeYear = incomeDate.getFullYear();
        const incomeMonth = incomeDate.getMonth();
        const incomeDay = incomeDate.getDate();
        
        // Monthly data (current year)
        if (incomeYear === currentYear) {
          monthlyData[incomeMonth] += income.amount;
        }
        
        // Weekly data (last 7 weeks)
        const weeksDiff = Math.floor((now - incomeDate) / (7 * 24 * 60 * 60 * 1000));
        if (weeksDiff >= 0 && weeksDiff < 7) {
          weeklyData[6 - weeksDiff] += income.amount;
        }
        
        // Daily data (last 30 days)
        const daysDiff = Math.floor((now - incomeDate) / (24 * 60 * 60 * 1000));
        if (daysDiff >= 0 && daysDiff < 30) {
          dailyData[29 - daysDiff] += income.amount;
        }
        
        // Income breakdown
        if (incomeBreakdown.hasOwnProperty(income.type)) {
          incomeBreakdown[income.type] += income.amount;
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
      console.error('Error getting income analytics:', error);
      return {
        monthlyData: new Array(12).fill(0),
        weeklyData: new Array(7).fill(0),
        dailyData: new Array(30).fill(0),
        incomeBreakdown: {
          promotional: 0,
          mentorship: 0,
          performance_reward: 0
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
      console.error('Error calculating team volume:', error);
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
      console.error('Error calculating subtree volume:', error);
      return 0;
    }
  }

  // Get rank based on team performance
  static async getUserRank(userId) {
    try {
      const incomeSummary = await this.getUserIncomeSummary(userId);
      const teamVolume = await this.calculateTeamVolume(userId);
      
      const totalIncome = incomeSummary.totalIncome;
      const pairsCount = incomeSummary.pairsCount;
      const teamSize = teamVolume.teamSize;

      // Define rank criteria
      if (totalIncome >= 500000 && pairsCount >= 1000 && teamSize >= 500) {
        return { rank: 'Diamond', level: 7, benefits: ['50% bonus', 'Car fund', 'International trips'] };
      } else if (totalIncome >= 250000 && pairsCount >= 500 && teamSize >= 250) {
        return { rank: 'Platinum', level: 6, benefits: ['40% bonus', 'House fund'] };
      } else if (totalIncome >= 100000 && pairsCount >= 250 && teamSize >= 100) {
        return { rank: 'Gold', level: 5, benefits: ['30% bonus', 'Bike fund'] };
      } else if (totalIncome >= 50000 && pairsCount >= 100 && teamSize >= 50) {
        return { rank: 'Silver', level: 4, benefits: ['25% bonus'] };
      } else if (totalIncome >= 25000 && pairsCount >= 50 && teamSize >= 25) {
        return { rank: 'Bronze', level: 3, benefits: ['20% bonus'] };
      } else if (totalIncome >= 10000 && pairsCount >= 20 && teamSize >= 10) {
        return { rank: 'Associate', level: 2, benefits: ['15% bonus'] };
      } else {
        return { rank: 'Starter', level: 1, benefits: ['10% bonus'] };
      }
    } catch (error) {
      console.error('Error getting user rank:', error);
      return { rank: 'Starter', level: 1, benefits: ['10% bonus'] };
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
      console.error('Error adjusting user income:', error);
      throw error;
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
      console.error('Error getting top earners:', error);
      return [];
    }
  }
}

export default IncomeService;
