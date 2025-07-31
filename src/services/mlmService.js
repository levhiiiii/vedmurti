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

export class MLMService {
  
  // Register user in MLM system with binary tree placement - Vedmurti Plan Implementation
  static async registerUserInMLM(userId, sponsorReferralCode, paymentProof) {
    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Validate payment (₹1500 joining amount)
        if (!paymentProof || paymentProof.amount < 1500) {
          throw new Error('Payment proof of ₹1500 required for joining');
        }

        // 2. Find sponsor
        const sponsorQuery = query(
          collection(db, 'users'),
          where('referralCode', '==', sponsorReferralCode)
        );
        const sponsorSnapshot = await getDocs(sponsorQuery);
        
        if (sponsorSnapshot.empty) {
          throw new Error('Invalid sponsor referral code');
        }

        const sponsorData = sponsorSnapshot.docs[0].data();
        const sponsorId = sponsorSnapshot.docs[0].id;

        // 3. Generate unique MLM ID (VED format)
        const mlmId = await this.generateMLMId();

        // 4. Find placement position in binary tree
        const placement = await this.findOptimalPlacement(sponsorReferralCode);

        // 5. Create MLM user record with Vedmurti Plan structure
        const mlmUserData = {
          userId,
          mlmId,
          sponsorId,
          sponsorReferralCode,
          placementParent: placement.parentId,
          position: placement.position, // 'left' or 'right'
          level: placement.level,
          leftChild: null,
          rightChild: null,
          totalLeftCount: 0,
          totalRightCount: 0,
          pairsCount: 0,
          
          // Vedmurti Plan Income Structure
          promotionalIncome: 0,        // ₹400 per pair
          leadershipIncome: 0,         // Based on team turnover
          rewardsIncome: 0,            // Festival & achievement rewards
          totalIncome: 0,
          
          // Daily Capping System
          dailyPairs: 0,               // Max 400 pairs per day
          dailyIncome: 0,              // Max ₹2000 per day from promotional
          lastDailyReset: serverTimestamp(),
          
          // Payout Cycle Management
          currentCycleIncome: 0,
          pendingPayout: 0,
          totalPayoutsReceived: 0,
          lastPayoutDate: null,
          
          // Team Performance Metrics
          teamTurnover: 0,
          leftTeamTurnover: 0,
          rightTeamTurnover: 0,
          qualifiedReferrals: 0,       // For leadership income eligibility
          
          // Rank & Achievement System
          currentRank: 'Starter',
          rankLevel: 1,
          achievementPoints: 0,
          festivalRewards: 0,
          
          // System Fields
          joinDate: serverTimestamp(),
          isActive: true,
          kycCompleted: false,
          paymentProof: paymentProof,
          
          // Vedmurti Plan Specific
          joiningAmount: 1500,
          productPurchaseRequired: true,
          eligibleForLeadership: false  // Requires 10 active referrals
        };

        // 6. Save MLM user data
        const mlmUserRef = doc(db, 'mlmUsers', userId);
        transaction.set(mlmUserRef, mlmUserData);

        // 7. Update parent's child reference
        if (placement.parentId) {
          const parentRef = doc(db, 'mlmUsers', placement.parentId);
          const updateField = placement.position === 'left' ? 'leftChild' : 'rightChild';
          transaction.update(parentRef, {
            [updateField]: userId
          });
        }

        // 8. Update user's affiliate status
        const userRef = doc(db, 'users', userId);
        transaction.update(userRef, {
          affiliateStatus: true,
          mlmId: mlmId,
          mlmJoinDate: serverTimestamp(),
          currentRank: 'Starter',
          rankLevel: 1,
          joiningAmount: 1500
        });

        // 9. Update upline counts and trigger income calculations
        await this.updateUplineCounts(userId, transaction);

        // 10. Check if sponsor becomes eligible for leadership income
        await this.checkLeadershipEligibility(sponsorId, transaction);

        return mlmUserData;
      });
    } catch (error) {
      console.error('Error registering user in MLM:', error);
      throw error;
    }
  }

  // Generate unique MLM ID (VED format as per Vedmurti Plan)
  static async generateMLMId() {
    let mlmId;
    let exists = true;
    
    while (exists) {
      // Format: VED + 6 digit number (as per Vedmurti Plan)
      mlmId = 'VED' + Math.floor(100000 + Math.random() * 900000);
      const mlmUserQuery = query(
        collection(db, 'mlmUsers'),
        where('mlmId', '==', mlmId)
      );
      const snapshot = await getDocs(mlmUserQuery);
      exists = !snapshot.empty;
    }
    
    return mlmId;
  }

  // Find optimal placement in binary tree (balanced approach)
  static async findOptimalPlacement(sponsorReferralCode) {
    try {
      // Find sponsor's MLM record
      const sponsorQuery = query(
        collection(db, 'users'),
        where('referralCode', '==', sponsorReferralCode)
      );
      const sponsorSnapshot = await getDocs(sponsorQuery);
      const sponsorUserId = sponsorSnapshot.docs[0].id;

      const sponsorMLMDoc = await getDoc(doc(db, 'mlmUsers', sponsorUserId));
      
      if (!sponsorMLMDoc.exists()) {
        // Sponsor not in MLM yet, place as direct downline
        return {
          parentId: sponsorUserId,
          position: 'left',
          level: 1
        };
      }

      const sponsorMLMData = sponsorMLMDoc.data();

      // Check if sponsor has available direct positions
      if (!sponsorMLMData.leftChild) {
        return {
          parentId: sponsorUserId,
          position: 'left',
          level: sponsorMLMData.level + 1
        };
      }
      
      if (!sponsorMLMData.rightChild) {
        return {
          parentId: sponsorUserId,
          position: 'right',
          level: sponsorMLMData.level + 1
        };
      }

      // Both positions filled, find the next available position using BFS
      return await this.findNextAvailablePosition(sponsorUserId);
    } catch (error) {
      console.error('Error finding placement:', error);
      throw error;
    }
  }

  // Find next available position using breadth-first search
  static async findNextAvailablePosition(rootUserId) {
    const queue = [rootUserId];
    
    while (queue.length > 0) {
      const currentUserId = queue.shift();
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', currentUserId));
      
      if (!mlmDoc.exists()) continue;
      
      const mlmData = mlmDoc.data();
      
      // Check if current user has available positions
      if (!mlmData.leftChild) {
        return {
          parentId: currentUserId,
          position: 'left',
          level: mlmData.level + 1
        };
      }
      
      if (!mlmData.rightChild) {
        return {
          parentId: currentUserId,
          position: 'right',
          level: mlmData.level + 1
        };
      }
      
      // Add children to queue for next level search
      if (mlmData.leftChild) queue.push(mlmData.leftChild);
      if (mlmData.rightChild) queue.push(mlmData.rightChild);
    }
    
    throw new Error('No available position found');
  }

  // Update upline counts after new user placement
  static async updateUplineCounts(newUserId, transaction) {
    try {
      const newUserDoc = await getDoc(doc(db, 'mlmUsers', newUserId));
      if (!newUserDoc.exists()) return;

      const newUserData = newUserDoc.data();
      let currentUserId = newUserData.placementParent;
      const position = newUserData.position;

      // Traverse up the tree and update counts
      while (currentUserId) {
        const currentUserRef = doc(db, 'mlmUsers', currentUserId);
        const currentUserDoc = await getDoc(currentUserRef);
        
        if (!currentUserDoc.exists()) break;
        
        const currentUserData = currentUserDoc.data();
        
        // Update count based on position
        const countField = position === 'left' ? 'totalLeftCount' : 'totalRightCount';
        transaction.update(currentUserRef, {
          [countField]: increment(1)
        });

        // Check for new pairs and calculate income
        const leftCount = position === 'left' ? 
          (currentUserData.totalLeftCount || 0) + 1 : 
          (currentUserData.totalLeftCount || 0);
        const rightCount = position === 'right' ? 
          (currentUserData.totalRightCount || 0) + 1 : 
          (currentUserData.totalRightCount || 0);

        const newPairs = Math.min(leftCount, rightCount) - (currentUserData.pairsCount || 0);
        
        if (newPairs > 0) {
          await this.processPromotionalIncome(currentUserId, newPairs, transaction);
        }

        // Move to next upline
        currentUserId = currentUserData.placementParent;
      }
    } catch (error) {
      console.error('Error updating upline counts:', error);
      throw error;
    }
  }

  // Process promotional income - Vedmurti Plan Implementation
  static async processPromotionalIncome(userId, newPairs, transaction) {
    try {
      const userRef = doc(db, 'mlmUsers', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data();
      const today = new Date();
      const lastReset = userData.lastDailyReset?.toDate() || new Date(0);
      
      // Check if daily reset is needed (every 24 hours)
      const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
      const shouldReset = hoursDiff >= 24;
      
      let dailyPairs = shouldReset ? 0 : (userData.dailyPairs || 0);
      let dailyIncome = shouldReset ? 0 : (userData.dailyIncome || 0);
      
      // Vedmurti Plan: ₹400 per pair, max 400 pairs/day = ₹2000/day
      const incomePerPair = 400;
      const maxDailyPairs = 400;
      const maxDailyIncome = 2000; // Updated as per plan
      
      const availablePairs = maxDailyPairs - dailyPairs;
      const remainingDailyIncome = maxDailyIncome - dailyIncome;
      
      if (availablePairs > 0 && remainingDailyIncome > 0) {
        // Process pairs with 2:1 or 1:2 ratio matching
        const processablePairs = Math.min(newPairs, availablePairs);
        const potentialIncome = processablePairs * incomePerPair;
        const finalIncome = Math.min(potentialIncome, remainingDailyIncome);
        const actualPairs = Math.floor(finalIncome / incomePerPair);
        
        if (actualPairs > 0 && finalIncome > 0) {
          // Update user income
          transaction.update(userRef, {
            promotionalIncome: increment(finalIncome),
            totalIncome: increment(finalIncome),
            pairsCount: increment(actualPairs),
            dailyPairs: shouldReset ? actualPairs : increment(actualPairs),
            dailyIncome: shouldReset ? finalIncome : increment(finalIncome),
            currentCycleIncome: increment(finalIncome),
            lastDailyReset: shouldReset ? serverTimestamp() : userData.lastDailyReset,
            teamTurnover: increment(finalIncome)
          });

          // Update user's affiliate balance
          const mainUserRef = doc(db, 'users', userId);
          transaction.update(mainUserRef, {
            affiliateBalance: increment(finalIncome),
            totalEarnings: increment(finalIncome),
            promotionalIncome: increment(finalIncome)
          });

          // Create income record with Vedmurti Plan details
          const incomeRecord = {
            userId,
            type: 'promotional',
            amount: finalIncome,
            pairs: actualPairs,
            totalPairs: newPairs,
            description: `Promotional Income: ₹400 × ${actualPairs} pairs (Binary Plan)`,
            dailyPairsUsed: actualPairs,
            remainingDailyPairs: maxDailyPairs - (dailyPairs + actualPairs),
            remainingDailyIncome: remainingDailyIncome - finalIncome,
            pairRatio: '2:1 or 1:2', // Vedmurti Plan specification
            createdAt: serverTimestamp(),
            status: 'completed',
            payoutEligible: true,
            payoutCycle: this.getCurrentPayoutCycle()
          };

          const incomeRef = doc(collection(db, 'incomeRecords'));
          transaction.set(incomeRef, incomeRecord);

          // Trigger leadership income calculation for uplines
          await this.calculateLeadershipIncome(userId, finalIncome, transaction);
          
          // Update team turnover for uplines
          await this.updateTeamTurnover(userId, finalIncome, transaction);
        }
      }
    } catch (error) {
      console.error('Error processing promotional income:', error);
      throw error;
    }
  }

  // Calculate Leadership Income - Vedmurti Plan Implementation
  static async calculateLeadershipIncome(userId, triggerAmount, transaction) {
    try {
      const userDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      let currentUserId = userData.sponsorId;
      let level = 1;
      
      // Leadership income is based on company turnover and requires 10 active referrals
      while (currentUserId && level <= 10) {
        const uplineDoc = await getDoc(doc(db, 'mlmUsers', currentUserId));
        if (!uplineDoc.exists()) break;

        const uplineData = uplineDoc.data();
        
        // Check if upline is eligible for leadership income (10 active referrals)
        if (!uplineData.eligibleForLeadership || uplineData.qualifiedReferrals < 10) {
          currentUserId = uplineData.sponsorId;
          level++;
          continue;
        }

        // Calculate leadership income based on team performance
        const teamTurnover = uplineData.teamTurnover || 0;
        const leadershipRate = this.getLeadershipRate(level, teamTurnover);
        
        if (leadershipRate > 0) {
          const leadershipIncome = Math.min(leadershipRate, triggerAmount * 0.1); // 10% of trigger amount
          
          // Update upline leadership income
          const uplineRef = doc(db, 'mlmUsers', currentUserId);
          transaction.update(uplineRef, {
            leadershipIncome: increment(leadershipIncome),
            totalIncome: increment(leadershipIncome),
            currentCycleIncome: increment(leadershipIncome)
          });

          // Update user's affiliate balance
          const mainUserRef = doc(db, 'users', currentUserId);
          transaction.update(mainUserRef, {
            affiliateBalance: increment(leadershipIncome),
            totalEarnings: increment(leadershipIncome),
            leadershipIncome: increment(leadershipIncome)
          });

          // Create income record
          const incomeRecord = {
            userId: currentUserId,
            type: 'leadership',
            amount: leadershipIncome,
            level: level,
            fromUserId: userId,
            triggerAmount: triggerAmount,
            teamTurnover: teamTurnover,
            description: `Leadership Income Level ${level}: ₹${leadershipIncome}`,
            qualifiedReferrals: uplineData.qualifiedReferrals,
            createdAt: serverTimestamp(),
            status: 'completed',
            payoutEligible: true,
            payoutCycle: this.getCurrentPayoutCycle()
          };

          const incomeRef = doc(collection(db, 'incomeRecords'));
          transaction.set(incomeRef, incomeRecord);
        }

        currentUserId = uplineData.sponsorId;
        level++;
      }
    } catch (error) {
      console.error('Error calculating leadership income:', error);
      throw error;
    }
  }

  // Get leadership income rate based on level and team turnover
  static getLeadershipRate(level, teamTurnover) {
    // Leadership income rates based on Vedmurti Plan
    const rates = {
      1: Math.min(500, teamTurnover * 0.05),  // 5% of team turnover, max ₹500
      2: Math.min(400, teamTurnover * 0.04),  // 4% of team turnover, max ₹400
      3: Math.min(300, teamTurnover * 0.03),  // 3% of team turnover, max ₹300
      4: Math.min(200, teamTurnover * 0.02),  // 2% of team turnover, max ₹200
      5: Math.min(150, teamTurnover * 0.015), // 1.5% of team turnover, max ₹150
      6: Math.min(100, teamTurnover * 0.01),  // 1% of team turnover, max ₹100
      7: Math.min(75, teamTurnover * 0.008),  // 0.8% of team turnover, max ₹75
      8: Math.min(50, teamTurnover * 0.006),  // 0.6% of team turnover, max ₹50
      9: Math.min(40, teamTurnover * 0.004),  // 0.4% of team turnover, max ₹40
      10: Math.min(30, teamTurnover * 0.002)  // 0.2% of team turnover, max ₹30
    };
    
    return rates[level] || 0;
  }

  // Update team turnover for uplines
  static async updateTeamTurnover(userId, amount, transaction) {
    try {
      const userDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      let currentUserId = userData.placementParent;
      
      while (currentUserId) {
        const uplineRef = doc(db, 'mlmUsers', currentUserId);
        const uplineDoc = await getDoc(uplineRef);
        
        if (!uplineDoc.exists()) break;
        
        const uplineData = uplineDoc.data();
        const position = userData.position;
        
        // Update team turnover based on position
        const turnoverField = position === 'left' ? 'leftTeamTurnover' : 'rightTeamTurnover';
        transaction.update(uplineRef, {
          teamTurnover: increment(amount),
          [turnoverField]: increment(amount)
        });
        
        currentUserId = uplineData.placementParent;
      }
    } catch (error) {
      console.error('Error updating team turnover:', error);
      throw error;
    }
  }

  // Check leadership eligibility (requires 10 active referrals)
  static async checkLeadershipEligibility(userId, transaction) {
    try {
      // Count active referrals
      const referralsQuery = query(
        collection(db, 'users'),
        where('referredBy', '==', userId),
        where('affiliateStatus', '==', true)
      );
      
      const referralsSnapshot = await getDocs(referralsQuery);
      const qualifiedReferrals = referralsSnapshot.size;
      
      const userRef = doc(db, 'mlmUsers', userId);
      transaction.update(userRef, {
        qualifiedReferrals: qualifiedReferrals,
        eligibleForLeadership: qualifiedReferrals >= 10
      });
      
    } catch (error) {
      console.error('Error checking leadership eligibility:', error);
      throw error;
    }
  }

  // Get current payout cycle (2nd, 12th, 22nd of month) - Vedmurti Plan
  static getCurrentPayoutCycle() {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    
    let payoutDay;
    if (day <= 2) payoutDay = 2;
    else if (day <= 12) payoutDay = 12;
    else if (day <= 22) payoutDay = 22;
    else {
      // Next month's 2nd
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextYear = month === 12 ? year + 1 : year;
      return `${nextYear}-${String(nextMonth).padStart(2, '0')}-02`;
    }
    
    return `${year}-${String(month).padStart(2, '0')}-${String(payoutDay).padStart(2, '0')}`;
  }

  // Calculate Rewards Income - Vedmurti Plan Implementation
  static async calculateRewardsIncome(userId, pairsCount, businessVolume) {
    try {
      const rewards = [];
      let totalReward = 0;

      // Vedmurti Plan Reward Slabs
      const rewardSlabs = [
        { minPairs: 50, maxPairs: 99, reward: 2500, description: "First 50 pairs achievement" },
        { minPairs: 100, maxPairs: 199, reward: 5000, description: "100 pairs milestone" },
        { minPairs: 200, maxPairs: 299, reward: 7500, description: "200 pairs milestone" },
        { minPairs: 300, maxPairs: 399, reward: 10000, description: "300 pairs milestone" },
        { minPairs: 400, maxPairs: 499, reward: 12500, description: "400 pairs milestone" },
        { minPairs: 500, maxPairs: 999, reward: 25000, description: "500 pairs achievement" },
        { minPairs: 1000, maxPairs: 1499, reward: 50000, description: "1000 pairs diamond achievement" },
        { minPairs: 1500, maxPairs: 1999, reward: 75000, description: "1500 pairs platinum achievement" },
        { minPairs: 2000, maxPairs: 2999, reward: 100000, description: "2000 pairs crown achievement" },
        { minPairs: 3000, maxPairs: 4999, reward: 150000, description: "3000 pairs royal achievement" },
        { minPairs: 5000, maxPairs: 9999, reward: 250000, description: "5000 pairs ambassador achievement" }
      ];

      // Business Volume Based Rewards (₹1 lakh to ₹30 lakh)
      const volumeRewards = [
        { minVolume: 100000, maxVolume: 199999, reward: 5000, description: "₹1 lakh business volume" },
        { minVolume: 200000, maxVolume: 299999, reward: 10000, description: "₹2 lakh business volume" },
        { minVolume: 300000, maxVolume: 499999, reward: 15000, description: "₹3 lakh business volume" },
        { minVolume: 500000, maxVolume: 999999, reward: 25000, description: "₹5 lakh business volume" },
        { minVolume: 1000000, maxVolume: 1999999, reward: 50000, description: "₹10 lakh business volume" },
        { minVolume: 2000000, maxVolume: 2999999, reward: 100000, description: "₹20 lakh business volume" },
        { minVolume: 3000000, maxVolume: 9999999, reward: 150000, description: "₹30 lakh business volume" }
      ];

      // Check pair-based rewards
      for (const slab of rewardSlabs) {
        if (pairsCount >= slab.minPairs && pairsCount <= slab.maxPairs) {
          rewards.push({
            type: 'pair_achievement',
            amount: slab.reward,
            description: slab.description,
            pairs: pairsCount,
            achieved: true
          });
          totalReward += slab.reward;
          break;
        }
      }

      // Check volume-based rewards
      for (const slab of volumeRewards) {
        if (businessVolume >= slab.minVolume && businessVolume <= slab.maxVolume) {
          rewards.push({
            type: 'volume_achievement',
            amount: slab.reward,
            description: slab.description,
            volume: businessVolume,
            achieved: true
          });
          totalReward += slab.reward;
          break;
        }
      }

      // Festival Rewards (Monthly Distribution)
      const today = new Date();
      const month = today.getMonth() + 1;
      const festivalRewards = this.getFestivalRewards(month, pairsCount, businessVolume);
      
      if (festivalRewards.length > 0) {
        rewards.push(...festivalRewards);
        totalReward += festivalRewards.reduce((sum, reward) => sum + reward.amount, 0);
      }

      return {
        totalReward,
        rewards,
        eligibleForNextLevel: this.getNextRewardLevel(pairsCount, businessVolume)
      };
    } catch (error) {
      console.error('Error calculating rewards income:', error);
      throw error;
    }
  }

  // Get festival rewards based on month and performance
  static getFestivalRewards(month, pairsCount, businessVolume) {
    const festivalCalendar = {
      1: { name: "New Year Bonus", multiplier: 1.2 }, // January
      2: { name: "Republic Day Special", multiplier: 1.1 }, // February
      3: { name: "Holi Celebration", multiplier: 1.3 }, // March
      4: { name: "Spring Festival", multiplier: 1.1 }, // April
      5: { name: "Summer Boost", multiplier: 1.2 }, // May
      6: { name: "Monsoon Special", multiplier: 1.1 }, // June
      7: { name: "Independence Bonus", multiplier: 1.4 }, // July
      8: { name: "Raksha Bandhan Gift", multiplier: 1.2 }, // August
      9: { name: "Ganesh Festival", multiplier: 1.3 }, // September
      10: { name: "Dussehra Victory", multiplier: 1.5 }, // October
      11: { name: "Diwali Mega Bonus", multiplier: 2.0 }, // November
      12: { name: "Christmas & Year End", multiplier: 1.8 } // December
    };

    const festival = festivalCalendar[month];
    const rewards = [];

    if (festival && pairsCount >= 10) {
      const baseReward = Math.min(pairsCount * 10, 5000); // Base festival reward
      const festivalAmount = Math.floor(baseReward * festival.multiplier);
      
      rewards.push({
        type: 'festival_reward',
        amount: festivalAmount,
        description: `${festival.name} - ${festival.multiplier}x multiplier`,
        month: month,
        achieved: true
      });
    }

    return rewards;
  }

  // Get next reward level information
  static getNextRewardLevel(currentPairs, currentVolume) {
    const nextPairMilestone = [50, 100, 200, 300, 400, 500, 1000, 1500, 2000, 3000, 5000]
      .find(milestone => milestone > currentPairs);
    
    const nextVolumeMilestone = [100000, 200000, 300000, 500000, 1000000, 2000000, 3000000]
      .find(milestone => milestone > currentVolume);

    return {
      nextPairMilestone,
      pairsNeeded: nextPairMilestone ? nextPairMilestone - currentPairs : 0,
      nextVolumeMilestone,
      volumeNeeded: nextVolumeMilestone ? nextVolumeMilestone - currentVolume : 0
    };
  }

  // Enhanced daily reset with proper Vedmurti Plan limits
  static async resetDailyCycles() {
    try {
      const mlmUsersQuery = query(collection(db, 'mlmUsers'));
      const snapshot = await getDocs(mlmUsersQuery);
      
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          dailyPairs: 0,
          dailyIncome: 0,
          lastDailyReset: serverTimestamp()
        });
      });

      await batch.commit();
      console.log('Daily cycles reset successfully - Vedmurti Plan');
    } catch (error) {
      console.error('Error resetting daily cycles:', error);
      throw error;
    }
  }

  // Process member joining income (₹2000 per new member)
  static async processMemberJoiningIncome(sponsorId, newMemberId, joiningAmount = 1500) {
    try {
      return await runTransaction(db, async (transaction) => {
        // Vedmurti Plan: ₹2000 joining income for sponsor
        const joiningIncome = 2000;
        
        const sponsorRef = doc(db, 'mlmUsers', sponsorId);
        const sponsorDoc = await transaction.get(sponsorRef);
        
        if (!sponsorDoc.exists()) return;

        // Update sponsor's joining income
        transaction.update(sponsorRef, {
          joiningIncome: increment(joiningIncome),
          totalIncome: increment(joiningIncome),
          currentCycleIncome: increment(joiningIncome),
          totalJoinings: increment(1)
        });

        // Update main user balance
        const mainUserRef = doc(db, 'users', sponsorId);
        transaction.update(mainUserRef, {
          affiliateBalance: increment(joiningIncome),
          totalEarnings: increment(joiningIncome),
          joiningIncome: increment(joiningIncome)
        });

        // Create income record
        const incomeRecord = {
          userId: sponsorId,
          type: 'joining_bonus',
          amount: joiningIncome,
          fromUserId: newMemberId,
          description: `Member Joining Bonus: ₹${joiningIncome} for new member`,
          joiningAmount: joiningAmount,
          createdAt: serverTimestamp(),
          status: 'completed',
          payoutEligible: true,
          payoutCycle: this.getCurrentPayoutCycle()
        };

        const incomeRef = doc(collection(db, 'incomeRecords'));
        transaction.set(incomeRef, incomeRecord);

        return { success: true, amount: joiningIncome };
      });
    } catch (error) {
      console.error('Error processing member joining income:', error);
      throw error;
    }
  }

  // Get user's MLM data
  static async getUserMLMData(userId) {
    try {
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!mlmDoc.exists()) {
        return null;
      }

      const mlmData = mlmDoc.data();
      
      // Get downline data
      const leftChild = mlmData.leftChild ? 
        await this.getUserMLMData(mlmData.leftChild) : null;
      const rightChild = mlmData.rightChild ? 
        await this.getUserMLMData(mlmData.rightChild) : null;

      return {
        ...mlmData,
        leftChildData: leftChild,
        rightChildData: rightChild
      };
    } catch (error) {
      console.error('Error getting MLM data:', error);
      throw error;
    }
  }

  // Get user's team structure
  static async getUserTeamStructure(userId, maxDepth = 5) {
    try {
      const buildTeamTree = async (currentUserId, depth = 0) => {
        if (depth >= maxDepth) return null;

        const mlmDoc = await getDoc(doc(db, 'mlmUsers', currentUserId));
        if (!mlmDoc.exists()) return null;

        const mlmData = mlmDoc.data();
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        const userData = userDoc.exists() ? userDoc.data() : {};

        const leftTeam = mlmData.leftChild ? 
          await buildTeamTree(mlmData.leftChild, depth + 1) : null;
        const rightTeam = mlmData.rightChild ? 
          await buildTeamTree(mlmData.rightChild, depth + 1) : null;

        return {
          userId: currentUserId,
          name: userData.name || 'Unknown',
          mlmId: mlmData.mlmId,
          level: mlmData.level,
          totalLeftCount: mlmData.totalLeftCount || 0,
          totalRightCount: mlmData.totalRightCount || 0,
          pairsCount: mlmData.pairsCount || 0,
          totalIncome: mlmData.totalIncome || 0,
          joinDate: mlmData.joinDate,
          leftTeam,
          rightTeam,
          depth
        };
      };

      return await buildTeamTree(userId);
    } catch (error) {
      console.error('Error getting team structure:', error);
      throw error;
    }
  }

  // Reset daily cycles (to be called every 12 hours)
  static async resetDailyCycles() {
    try {
      const mlmUsersQuery = query(collection(db, 'mlmUsers'));
      const snapshot = await getDocs(mlmUsersQuery);
      
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          dailyCycles: 0,
          lastCycleReset: serverTimestamp()
        });
      });

      await batch.commit();
      console.log('Daily cycles reset successfully');
    } catch (error) {
      console.error('Error resetting daily cycles:', error);
      throw error;
    }
  }

  // Get comprehensive MLM statistics
  static async getMLMStatistics() {
    try {
      const mlmUsersSnapshot = await getDocs(collection(db, 'mlmUsers'));
      const incomeRecordsSnapshot = await getDocs(collection(db, 'incomeRecords'));
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      let totalUsers = 0;
      let totalIncome = 0;
      let totalPairs = 0;
      let activeUsers = 0;
      let totalPromotionalIncome = 0;
      let totalMentorshipIncome = 0;
      let totalPerformanceRewards = 0;
      
      const rankDistribution = {
        'Starter': 0,
        'Associate': 0,
        'Bronze': 0,
        'Silver': 0,
        'Gold': 0,
        'Platinum': 0,
        'Diamond': 0
      };

      mlmUsersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalUsers++;
        totalIncome += data.totalIncome || 0;
        totalPairs += data.pairsCount || 0;
        totalPromotionalIncome += data.promotionalIncome || 0;
        totalMentorshipIncome += data.mentorshipIncome || 0;
        totalPerformanceRewards += data.performanceRewards || 0;
        
        if (data.isActive) activeUsers++;
        
        const rank = data.currentRank || 'Starter';
        if (rankDistribution.hasOwnProperty(rank)) {
          rankDistribution[rank]++;
        }
      });

      // Calculate time-based statistics
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let todayIncome = 0;
      let weeklyIncome = 0;
      let monthlyIncome = 0;
      let todayTransactions = 0;
      let weeklyTransactions = 0;
      let monthlyTransactions = 0;

      incomeRecordsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate();
        const amount = data.amount || 0;
        
        if (createdAt) {
          if (createdAt >= todayStart) {
            todayIncome += amount;
            todayTransactions++;
          }
          if (createdAt >= weekStart) {
            weeklyIncome += amount;
            weeklyTransactions++;
          }
          if (createdAt >= monthStart) {
            monthlyIncome += amount;
            monthlyTransactions++;
          }
        }
      });

      // Calculate user registration statistics
      let totalRegistrations = 0;
      let pendingVerifications = 0;
      let approvedUsers = 0;

      usersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalRegistrations++;
        
        if (data.paymentProof?.verificationStatus === 'pending') {
          pendingVerifications++;
        } else if (data.affiliateStatus) {
          approvedUsers++;
        }
      });

      return {
        // User Statistics
        totalUsers,
        activeUsers,
        totalRegistrations,
        pendingVerifications,
        approvedUsers,
        conversionRate: totalRegistrations > 0 ? (approvedUsers / totalRegistrations) * 100 : 0,
        
        // Income Statistics
        totalIncome,
        totalPromotionalIncome,
        totalMentorshipIncome,
        totalPerformanceRewards,
        averageIncomePerUser: totalUsers > 0 ? totalIncome / totalUsers : 0,
        
        // Time-based Statistics
        todayIncome,
        weeklyIncome,
        monthlyIncome,
        todayTransactions,
        weeklyTransactions,
        monthlyTransactions,
        
        // Pair Statistics
        totalPairs,
        averagePairsPerUser: totalUsers > 0 ? totalPairs / totalUsers : 0,
        
        // Rank Distribution
        rankDistribution,
        
        // Growth Metrics
        dailyGrowthRate: todayTransactions,
        weeklyGrowthRate: weeklyTransactions,
        monthlyGrowthRate: monthlyTransactions,
        
        // System Health
        activeUserPercentage: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting MLM statistics:', error);
      throw error;
    }
  }

  // Get user's complete MLM dashboard data
  static async getUserDashboardData(userId) {
    try {
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!mlmDoc.exists()) {
        return null;
      }

      const mlmData = mlmDoc.data();
      
      // Get user's income summary
      const incomeData = await this.getUserIncomeSummary(userId);
      
      // Get team structure
      const teamStructure = await this.getUserTeamStructure(userId);
      
      return {
        ...mlmData,
        incomeData,
        teamStructure
      };
    } catch (error) {
      console.error('Error getting user dashboard data:', error);
      throw error;
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
      let todayIncome = todayIncomeSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
      
      // If no income records for today, use daily income from MLM data
      if (todayIncome === 0) {
        const lastReset = mlmData.lastDailyReset?.toDate() || new Date(0);
        const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
        const shouldReset = hoursDiff >= 24;
        
        if (!shouldReset) {
          // Use the daily income from MLM data if it hasn't been reset today
          todayIncome = mlmData.dailyIncome || 0;
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
}

export default MLMService;
