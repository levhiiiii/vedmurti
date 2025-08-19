import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  writeBatch,
  serverTimestamp,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { app } from '../Firebase/firebase';
import MLMService from './mlmService';
import IncomeService from './incomeService';
import PayoutService from './payoutService';

const db = getFirestore(app);

export class ScheduledService {
  
  // Main scheduler that runs all scheduled tasks
  static async runScheduledTasks() {
    try {
  
      
      const now = new Date();
      const hour = now.getHours();
      const dayOfMonth = now.getDate();
      
      // Reset daily cycles every 12 hours (12am and 12pm)
      if (hour === 0 || hour === 12) {
        await this.resetDailyCycles();
      }
      
      // Process performance rewards daily at 1 AM
      if (hour === 1) {
        await this.processPerformanceRewards();
      }
      
      // Process scheduled payouts on 2nd, 12th, 22nd at 9 AM
      if (hour === 9 && [2, 12, 22].includes(dayOfMonth)) {
        await PayoutService.generateAutomaticPayouts();
      }
      
      // Update user ranks daily at 2 AM
      if (hour === 2) {
        await this.updateUserRanks();
      }
      
      // Clean up old records monthly on 1st at 3 AM
      if (hour === 3 && dayOfMonth === 1) {
        await this.cleanupOldRecords();
      }
      

    } catch (error) {
      throw error;
    }
  }
  
  // Reset daily cycles for all users
  static async resetDailyCycles() {
    try {
  
      
      const mlmUsersSnapshot = await getDocs(collection(db, 'mlmUsers'));
      const batch = writeBatch(db);
      let resetCount = 0;
      
      mlmUsersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const lastReset = data.lastCycleReset?.toDate() || new Date(0);
        const now = new Date();
        const hoursDiff = (now - lastReset) / (1000 * 60 * 60);
        
        // Reset if more than 12 hours have passed
        if (hoursDiff >= 12) {
          batch.update(doc.ref, {
            dailyCycles: 0,
            currentCycleIncome: 0,
            currentCycleMentorshipIncome: 0,
            lastCycleReset: serverTimestamp()
          });
          resetCount++;
        }
      });
      
      if (resetCount > 0) {
        await batch.commit();

      }
      
      return resetCount;
    } catch (error) {
      throw error;
    }
  }
  
  // Process performance rewards for eligible users
  static async processPerformanceRewards() {
    try {

      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const mlmUsersSnapshot = await getDocs(collection(db, 'mlmUsers'));
      const batch = writeBatch(db);
      let rewardsProcessed = 0;
      let totalRewardAmount = 0;
      
      for (const userDoc of mlmUsersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Skip if user already received reward in last 30 days
        const lastReward = userData.lastPerformanceReward?.toDate();
        if (lastReward && (new Date() - lastReward) < (30 * 24 * 60 * 60 * 1000)) {
          continue;
        }
        
        // Calculate pairs in last 30 days
        const pairsIn30Days = await IncomeService.getPairsInPeriod(userId, thirtyDaysAgo, new Date());
        const rewardAmount = IncomeService.getPerformanceReward(pairsIn30Days);
        
        if (rewardAmount > 0) {
          // Update MLM user
          batch.update(userDoc.ref, {
            performanceRewards: (userData.performanceRewards || 0) + rewardAmount,
            totalIncome: (userData.totalIncome || 0) + rewardAmount,
            lastPerformanceReward: serverTimestamp(),
            pairsLast30Days: pairsIn30Days
          });
          
          // Update main user balance
          const mainUserRef = doc(db, 'users', userId);
          batch.update(mainUserRef, {
            affiliateBalance: (userData.affiliateBalance || 0) + rewardAmount,
            totalEarnings: (userData.totalEarnings || 0) + rewardAmount,
            performanceRewards: (userData.performanceRewards || 0) + rewardAmount
          });
          
          // Create income record
          const incomeRecord = {
            userId,
            type: 'performance_reward',
            amount: rewardAmount,
            pairs: pairsIn30Days,
            description: `Performance reward for ${pairsIn30Days} pairs in 30 days`,
            createdAt: serverTimestamp(),
            status: 'completed',
            period: '30_days',
            isScheduled: true
          };
          
          const incomeRef = doc(collection(db, 'incomeRecords'));
          batch.set(incomeRef, incomeRecord);
          
          rewardsProcessed++;
          totalRewardAmount += rewardAmount;
        }
      }
      
      if (rewardsProcessed > 0) {
        await batch.commit();

      }
      
      return { rewardsProcessed, totalRewardAmount };
    } catch (error) {
      throw error;
    }
  }
  
  // Update user ranks based on current performance
  static async updateUserRanks() {
    try {

      
      const mlmUsersSnapshot = await getDocs(collection(db, 'mlmUsers'));
      const batch = writeBatch(db);
      let ranksUpdated = 0;
      
      for (const userDoc of mlmUsersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        // Calculate current rank
        const rank = await IncomeService.getUserRank(userId);
        const currentRank = userData.currentRank || 'Starter';
        
        // Update if rank changed
        if (rank.rank !== currentRank) {
          batch.update(userDoc.ref, {
            currentRank: rank.rank,
            rankLevel: rank.level,
            rankBenefits: rank.benefits,
            rankUpdatedAt: serverTimestamp()
          });
          
          // Update main user record
          const mainUserRef = doc(db, 'users', userId);
          batch.update(mainUserRef, {
            currentRank: rank.rank,
            rankLevel: rank.level
          });
          
          ranksUpdated++;
        }
      }
      
      if (ranksUpdated > 0) {
        await batch.commit();

      }
      
      return ranksUpdated;
    } catch (error) {
      throw error;
    }
  }
  
  // Clean up old records to maintain database performance
  static async cleanupOldRecords() {
    try {

      
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      // Clean up old income records (keep only last 6 months)
      const oldIncomeQuery = query(
        collection(db, 'incomeRecords'),
        where('createdAt', '<', sixMonthsAgo),
        orderBy('createdAt', 'asc')
      );
      
      const oldIncomeSnapshot = await getDocs(oldIncomeQuery);
      const batch = writeBatch(db);
      let deletedRecords = 0;
      
      oldIncomeSnapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
        deletedRecords++;
      });
      
      if (deletedRecords > 0) {
        await batch.commit();

      }
      
      return deletedRecords;
    } catch (error) {
      throw error;
    }
  }
  
  // Manual trigger for specific scheduled task
  static async triggerTask(taskName) {
    try {
      switch (taskName) {
        case 'resetCycles':
          return await this.resetDailyCycles();
        case 'performanceRewards':
          return await this.processPerformanceRewards();
        case 'payouts':
          return await PayoutService.generateAutomaticPayouts();
        case 'updateRanks':
          return await this.updateUserRanks();
        case 'cleanup':
          return await this.cleanupOldRecords();
        default:
          throw new Error(`Unknown task: ${taskName}`);
      }
    } catch (error) {
      throw error;
    }
  }
  
  // Get scheduler status and next run times
  static getSchedulerStatus() {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDate();
    
    // Calculate next cycle reset (every 12 hours)
    let nextCycleReset;
    if (currentHour < 12) {
      nextCycleReset = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    } else {
      nextCycleReset = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    }
    
    // Calculate next payout date
    let nextPayout;
    if (currentDay < 2) {
      nextPayout = new Date(now.getFullYear(), now.getMonth(), 2, 9, 0, 0);
    } else if (currentDay < 12) {
      nextPayout = new Date(now.getFullYear(), now.getMonth(), 12, 9, 0, 0);
    } else if (currentDay < 22) {
      nextPayout = new Date(now.getFullYear(), now.getMonth(), 22, 9, 0, 0);
    } else {
      nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 2, 9, 0, 0);
    }
    
    // Calculate next performance reward processing (daily at 1 AM)
    let nextPerformanceReward;
    if (currentHour < 1) {
      nextPerformanceReward = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0);
    } else {
      nextPerformanceReward = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 1, 0, 0);
    }
    
    return {
      currentTime: now,
      nextCycleReset,
      nextPayout,
      nextPerformanceReward,
      hoursUntilCycleReset: Math.ceil((nextCycleReset - now) / (1000 * 60 * 60)),
      hoursUntilPayout: Math.ceil((nextPayout - now) / (1000 * 60 * 60)),
      hoursUntilPerformanceReward: Math.ceil((nextPerformanceReward - now) / (1000 * 60 * 60))
    };
  }
  
  // Initialize scheduler (call this when app starts)
  static initializeScheduler() {

    
    // Run scheduled tasks every hour
    const schedulerInterval = setInterval(async () => {
      try {
        await this.runScheduledTasks();
          } catch (error) {
      // Scheduler error
    }
    }, 60 * 60 * 1000); // Every hour
    
    // Run initial check
    setTimeout(() => {
      this.runScheduledTasks().catch(() => {
        // Error running scheduled tasks
      });
    }, 5000); // After 5 seconds
    
    return schedulerInterval;
  }
  
  // Get system statistics
  static async getSystemStatistics() {
    try {
      const mlmStats = await MLMService.getMLMStatistics();
      const payoutStats = await PayoutService.getPayoutStatistics();
      const schedulerStatus = this.getSchedulerStatus();
      
      return {
        mlm: mlmStats,
        payouts: payoutStats,
        scheduler: schedulerStatus,
        lastUpdated: new Date()
      };
    } catch (error) {
      throw error;
    }
  }
}

export default ScheduledService;
