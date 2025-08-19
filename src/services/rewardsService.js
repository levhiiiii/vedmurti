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

export class RewardsService {
  
  // Vedmurti Plan Reward System Implementation
  static async calculateAndDistributeRewards() {
    try {
      const mlmUsersSnapshot = await getDocs(collection(db, 'mlmUsers'));
      const batch = writeBatch(db);
      let totalRewardsDistributed = 0;

      for (const userDoc of mlmUsersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        
        const pairsCount = userData.pairsCount || 0;
        const businessVolume = userData.teamTurnover || 0;
        
        // Calculate rewards based on Vedmurti Plan
        const rewardCalculation = await this.calculateUserRewards(userId, pairsCount, businessVolume);
        
        if (rewardCalculation.totalReward > 0) {
          // Update user's reward income
          batch.update(userDoc.ref, {
            rewardsIncome: increment(rewardCalculation.totalReward),
            totalIncome: increment(rewardCalculation.totalReward),
            lastRewardCalculation: serverTimestamp(),
            currentRewardLevel: rewardCalculation.currentLevel
          });

          // Update main user balance
          const mainUserRef = doc(db, 'users', userId);
          batch.update(mainUserRef, {
            affiliateBalance: increment(rewardCalculation.totalReward),
            totalEarnings: increment(rewardCalculation.totalReward),
            rewardsIncome: increment(rewardCalculation.totalReward)
          });

          // Create reward records
          for (const reward of rewardCalculation.rewards) {
            const rewardRecord = {
              userId,
              type: 'reward',
              subType: reward.type,
              amount: reward.amount,
              description: reward.description,
              pairs: reward.pairs || 0,
              volume: reward.volume || 0,
              level: reward.level || 0,
              createdAt: serverTimestamp(),
              status: 'completed',
              payoutEligible: true
            };

            const rewardRef = doc(collection(db, 'rewardRecords'));
            batch.set(rewardRef, rewardRecord);
          }

          totalRewardsDistributed += rewardCalculation.totalReward;
        }
      }

      await batch.commit();

      
      return {
        success: true,
        totalRewardsDistributed,
        usersProcessed: mlmUsersSnapshot.size
      };
    } catch (error) {
      throw error;
    }
  }

  // Calculate individual user rewards based on Vedmurti Plan
  static async calculateUserRewards(userId, pairsCount, businessVolume) {
    try {
      const rewards = [];
      let totalReward = 0;
      let currentLevel = 'Starter';

      // Pair-based Achievement Rewards
      const pairRewards = this.getPairBasedRewards(pairsCount);
      if (pairRewards.length > 0) {
        rewards.push(...pairRewards);
        totalReward += pairRewards.reduce((sum, reward) => sum + reward.amount, 0);
      }

      // Volume-based Achievement Rewards (₹1 lakh to ₹30 lakh)
      const volumeRewards = this.getVolumeBasedRewards(businessVolume);
      if (volumeRewards.length > 0) {
        rewards.push(...volumeRewards);
        totalReward += volumeRewards.reduce((sum, reward) => sum + reward.amount, 0);
      }

      // Festival Rewards
      const festivalRewards = await this.getFestivalRewards(userId, pairsCount, businessVolume);
      if (festivalRewards.length > 0) {
        rewards.push(...festivalRewards);
        totalReward += festivalRewards.reduce((sum, reward) => sum + reward.amount, 0);
      }

      // Determine current level
      currentLevel = this.determineUserLevel(pairsCount, businessVolume);

      return {
        totalReward,
        rewards,
        currentLevel,
        nextMilestone: this.getNextMilestone(pairsCount, businessVolume)
      };
    } catch (error) {
      throw error;
    }
  }

  // Get pair-based rewards according to Vedmurti Plan
  static getPairBasedRewards(pairsCount) {
    const rewards = [];
    
    // Vedmurti Plan Pair Achievement Slabs
    const pairSlabs = [
      { threshold: 50, reward: 2500, description: "First 50 pairs achievement bonus" },
      { threshold: 100, reward: 5000, description: "100 pairs milestone bonus" },
      { threshold: 200, reward: 7500, description: "200 pairs excellence bonus" },
      { threshold: 300, reward: 10000, description: "300 pairs leadership bonus" },
      { threshold: 400, reward: 12500, description: "400 pairs mastery bonus" },
      { threshold: 500, reward: 25000, description: "500 pairs champion bonus" },
      { threshold: 1000, reward: 50000, description: "1000 pairs diamond achievement" },
      { threshold: 1500, reward: 75000, description: "1500 pairs platinum achievement" },
      { threshold: 2000, reward: 100000, description: "2000 pairs crown achievement" },
      { threshold: 3000, reward: 150000, description: "3000 pairs royal achievement" },
      { threshold: 5000, reward: 250000, description: "5000 pairs ambassador achievement" }
    ];

    // Find the highest achieved slab
    for (let i = pairSlabs.length - 1; i >= 0; i--) {
      const slab = pairSlabs[i];
      if (pairsCount >= slab.threshold) {
        rewards.push({
          type: 'pair_achievement',
          amount: slab.reward,
          description: slab.description,
          pairs: pairsCount,
          threshold: slab.threshold,
          level: i + 1
        });
        break;
      }
    }

    return rewards;
  }

  // Get volume-based rewards (₹1 lakh to ₹30 lakh business volume)
  static getVolumeBasedRewards(businessVolume) {
    const rewards = [];
    
    // Vedmurti Plan Volume Achievement Slabs
    const volumeSlabs = [
      { threshold: 100000, reward: 5000, description: "₹1 lakh business volume achievement" },
      { threshold: 200000, reward: 10000, description: "₹2 lakh business volume achievement" },
      { threshold: 300000, reward: 15000, description: "₹3 lakh business volume achievement" },
      { threshold: 500000, reward: 25000, description: "₹5 lakh business volume achievement" },
      { threshold: 1000000, reward: 50000, description: "₹10 lakh business volume achievement" },
      { threshold: 1500000, reward: 75000, description: "₹15 lakh business volume achievement" },
      { threshold: 2000000, reward: 100000, description: "₹20 lakh business volume achievement" },
      { threshold: 2500000, reward: 125000, description: "₹25 lakh business volume achievement" },
      { threshold: 3000000, reward: 150000, description: "₹30 lakh business volume achievement" }
    ];

    // Find the highest achieved slab
    for (let i = volumeSlabs.length - 1; i >= 0; i--) {
      const slab = volumeSlabs[i];
      if (businessVolume >= slab.threshold) {
        rewards.push({
          type: 'volume_achievement',
          amount: slab.reward,
          description: slab.description,
          volume: businessVolume,
          threshold: slab.threshold,
          level: i + 1
        });
        break;
      }
    }

    return rewards;
  }

  // Get festival rewards based on current month and performance
  static async getFestivalRewards(userId, pairsCount, businessVolume) {
    try {
      const today = new Date();
      const month = today.getMonth() + 1;
      const rewards = [];

      // Check if user already received festival reward this month
      const existingRewardQuery = query(
        collection(db, 'rewardRecords'),
        where('userId', '==', userId),
        where('subType', '==', 'festival_reward'),
        where('month', '==', month)
      );
      
      const existingRewards = await getDocs(existingRewardQuery);
      if (!existingRewards.empty) {
        return rewards; // Already received this month
      }

      // Vedmurti Plan Festival Calendar with multipliers
      const festivalCalendar = {
        1: { name: "New Year Mega Bonus", multiplier: 1.5, minPairs: 10 },
        2: { name: "Republic Day Special", multiplier: 1.2, minPairs: 15 },
        3: { name: "Holi Celebration Bonus", multiplier: 1.8, minPairs: 20 },
        4: { name: "Spring Festival Reward", multiplier: 1.3, minPairs: 15 },
        5: { name: "Summer Achievement Bonus", multiplier: 1.4, minPairs: 25 },
        6: { name: "Monsoon Special Reward", multiplier: 1.2, minPairs: 20 },
        7: { name: "Independence Day Bonus", multiplier: 2.0, minPairs: 30 },
        8: { name: "Raksha Bandhan Gift", multiplier: 1.6, minPairs: 25 },
        9: { name: "Ganesh Festival Bonus", multiplier: 1.7, minPairs: 35 },
        10: { name: "Dussehra Victory Bonus", multiplier: 2.2, minPairs: 40 },
        11: { name: "Diwali Mega Celebration", multiplier: 3.0, minPairs: 50 },
        12: { name: "Christmas & Year End Bonus", multiplier: 2.5, minPairs: 45 }
      };

      const festival = festivalCalendar[month];
      
      if (festival && pairsCount >= festival.minPairs) {
        // Calculate base festival reward
        const baseReward = Math.min(pairsCount * 20, 10000); // Base calculation
        const volumeBonus = Math.min(businessVolume * 0.001, 5000); // Volume bonus
        const totalBase = baseReward + volumeBonus;
        
        const festivalAmount = Math.floor(totalBase * festival.multiplier);
        
        rewards.push({
          type: 'festival_reward',
          amount: festivalAmount,
          description: `${festival.name} - ${festival.multiplier}x multiplier`,
          pairs: pairsCount,
          volume: businessVolume,
          month: month,
          multiplier: festival.multiplier,
          baseAmount: totalBase
        });
      }

      return rewards;
    } catch (error) {
      return [];
    }
  }

  // Determine user level based on performance
  static determineUserLevel(pairsCount, businessVolume) {
    if (pairsCount >= 5000 && businessVolume >= 3000000) return 'Ambassador';
    if (pairsCount >= 3000 && businessVolume >= 2000000) return 'Royal';
    if (pairsCount >= 2000 && businessVolume >= 1500000) return 'Crown';
    if (pairsCount >= 1500 && businessVolume >= 1000000) return 'Platinum';
    if (pairsCount >= 1000 && businessVolume >= 500000) return 'Diamond';
    if (pairsCount >= 500 && businessVolume >= 300000) return 'Champion';
    if (pairsCount >= 400 && businessVolume >= 200000) return 'Master';
    if (pairsCount >= 300 && businessVolume >= 150000) return 'Leader';
    if (pairsCount >= 200 && businessVolume >= 100000) return 'Expert';
    if (pairsCount >= 100 && businessVolume >= 50000) return 'Professional';
    if (pairsCount >= 50 && businessVolume >= 25000) return 'Associate';
    return 'Starter';
  }

  // Get next milestone information
  static getNextMilestone(currentPairs, currentVolume) {
    const milestones = [
      { pairs: 50, volume: 25000, level: 'Associate' },
      { pairs: 100, volume: 50000, level: 'Professional' },
      { pairs: 200, volume: 100000, level: 'Expert' },
      { pairs: 300, volume: 150000, level: 'Leader' },
      { pairs: 400, volume: 200000, level: 'Master' },
      { pairs: 500, volume: 300000, level: 'Champion' },
      { pairs: 1000, volume: 500000, level: 'Diamond' },
      { pairs: 1500, volume: 1000000, level: 'Platinum' },
      { pairs: 2000, volume: 1500000, level: 'Crown' },
      { pairs: 3000, volume: 2000000, level: 'Royal' },
      { pairs: 5000, volume: 3000000, level: 'Ambassador' }
    ];

    const nextMilestone = milestones.find(m => m.pairs > currentPairs || m.volume > currentVolume);
    
    if (nextMilestone) {
      return {
        level: nextMilestone.level,
        pairsNeeded: Math.max(0, nextMilestone.pairs - currentPairs),
        volumeNeeded: Math.max(0, nextMilestone.volume - currentVolume),
        targetPairs: nextMilestone.pairs,
        targetVolume: nextMilestone.volume
      };
    }

    return null; // Already at highest level
  }

  // Get user's reward history
  static async getUserRewardHistory(userId, limitCount = 50) {
    try {
      const rewardsQuery = query(
        collection(db, 'rewardRecords'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const rewardsSnapshot = await getDocs(rewardsQuery);
      const rewardHistory = [];

      rewardsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        rewardHistory.push({
          id: doc.id,
          ...data,
          date: data.createdAt?.toDate() || new Date()
        });
      });

      return rewardHistory;
    } catch (error) {
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        try {
          const rewardsQuery = query(
            collection(db, 'rewardRecords'),
            where('userId', '==', userId),
            limit(limitCount)
          );

          const rewardsSnapshot = await getDocs(rewardsQuery);
          const rewardHistory = [];

          rewardsSnapshot.docs.forEach((doc) => {
            const data = doc.data();
            rewardHistory.push({
              id: doc.id,
              ...data,
              date: data.createdAt?.toDate() || new Date()
            });
          });

          // Sort manually since we can't use orderBy
          rewardHistory.sort((a, b) => {
            const dateA = a.date || new Date(0);
            const dateB = b.date || new Date(0);
            return dateB - dateA;
          });

          return rewardHistory;
        } catch (simpleError) {
          return [];
        }
      }
      
      return [];
    }
  }

  // Get reward statistics for admin
  static async getRewardStatistics() {
    try {
      const rewardsSnapshot = await getDocs(collection(db, 'rewardRecords'));
      
      let totalRewards = 0;
      let totalAmount = 0;
      const rewardTypes = {};
      const monthlyDistribution = {};

      rewardsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const amount = data.amount || 0;
        const type = data.subType || 'unknown';
        const date = data.createdAt?.toDate();
        
        totalRewards++;
        totalAmount += amount;
        
        // Count by type
        rewardTypes[type] = (rewardTypes[type] || 0) + amount;
        
        // Monthly distribution
        if (date) {
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          monthlyDistribution[monthKey] = (monthlyDistribution[monthKey] || 0) + amount;
        }
      });

      return {
        totalRewards,
        totalAmount,
        averageReward: totalRewards > 0 ? totalAmount / totalRewards : 0,
        rewardTypes,
        monthlyDistribution
      };
    } catch (error) {
      throw error;
    }
  }

  // Manual reward adjustment (admin only)
  static async adjustUserReward(userId, adjustment, reason, adminId) {
    try {
      return await runTransaction(db, async (transaction) => {
        const mlmUserRef = doc(db, 'mlmUsers', userId);
        const mlmUserDoc = await transaction.get(mlmUserRef);
        
        if (!mlmUserDoc.exists()) {
          throw new Error('MLM user not found');
        }

        // Update MLM user rewards
        transaction.update(mlmUserRef, {
          rewardsIncome: increment(adjustment.amount),
          totalIncome: increment(adjustment.amount)
        });

        // Update main user balance
        const mainUserRef = doc(db, 'users', userId);
        transaction.update(mainUserRef, {
          affiliateBalance: increment(adjustment.amount),
          totalEarnings: increment(adjustment.amount),
          rewardsIncome: increment(adjustment.amount)
        });

        // Create reward record
        const rewardRecord = {
          userId,
          type: 'reward',
          subType: 'manual_adjustment',
          amount: adjustment.amount,
          description: `Manual adjustment: ${reason}`,
          adjustedBy: adminId,
          createdAt: serverTimestamp(),
          status: 'completed',
          isManualAdjustment: true
        };

        const rewardRef = doc(collection(db, 'rewardRecords'));
        transaction.set(rewardRef, rewardRecord);

        return rewardRecord;
      });
    } catch (error) {
      throw error;
    }
  }
}

export default RewardsService;
