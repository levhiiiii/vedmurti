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
  
  // Register user in MLM system with binary tree placement
  static async registerUserInMLM(userId, sponsorReferralCode, paymentProof) {
    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Validate payment (₹1500)
        if (!paymentProof || paymentProof.amount < 1500) {
          throw new Error('Payment proof of ₹1500 required');
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

        // 3. Generate unique MLM ID
        const mlmId = await this.generateMLMId();

        // 4. Find placement position in binary tree
        const placement = await this.findOptimalPlacement(sponsorReferralCode);

        // 5. Create MLM user record
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
          promotionalIncome: 0,
          mentorshipIncome: 0,
          performanceRewards: 0,
          totalIncome: 0,
          dailyCycles: 0,
          currentCycleIncome: 0,
          currentCycleMentorshipIncome: 0,
          maxDailyIncome: 4000, // ₹4000 per day max
          maxDailyMentorshipIncome: 2000, // ₹2000 per day max
          lastCycleReset: serverTimestamp(),
          joinDate: serverTimestamp(),
          isActive: true,
          currentRank: 'Starter',
          rankLevel: 1,
          paymentProof: paymentProof
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
          rankLevel: 1
        });

        // 9. Update upline counts and trigger income calculations
        await this.updateUplineCounts(userId, transaction);

        return mlmUserData;
      });
    } catch (error) {
      console.error('Error registering user in MLM:', error);
      throw error;
    }
  }

  // Generate unique MLM ID
  static async generateMLMId() {
    let mlmId;
    let exists = true;
    
    while (exists) {
      mlmId = 'MLM' + Math.floor(100000 + Math.random() * 900000);
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

  // Process promotional income (₹400 per pair with daily capping)
  static async processPromotionalIncome(userId, newPairs, transaction) {
    try {
      const userRef = doc(db, 'mlmUsers', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data();
      const today = new Date();
      const lastReset = userData.lastCycleReset?.toDate() || new Date(0);
      
      // Check if daily cycle needs reset (every 12 hours: 12am-12pm & 12pm-12am)
      const currentHour = today.getHours();
      const lastResetHour = lastReset.getHours();
      const shouldReset = (
        (currentHour >= 12 && lastResetHour < 12) || // Crossed noon
        (currentHour < 12 && lastResetHour >= 12) || // Crossed midnight
        (today.getDate() !== lastReset.getDate()) // Different day
      );
      
      let dailyCycles = shouldReset ? 0 : (userData.dailyCycles || 0);
      let currentCycleIncome = shouldReset ? 0 : (userData.currentCycleIncome || 0);
      
      // Calculate income with daily capping (max 2 cycles = ₹4000/day)
      const maxCycles = 2;
      const incomePerPair = 400;
      const maxDailyIncome = 4000;
      const availableCycles = maxCycles - dailyCycles;
      const remainingDailyIncome = maxDailyIncome - currentCycleIncome;
      
      if (availableCycles > 0 && remainingDailyIncome > 0) {
        const processablePairs = Math.min(newPairs, availableCycles);
        const potentialIncome = processablePairs * incomePerPair;
        const finalIncome = Math.min(potentialIncome, remainingDailyIncome);
        const actualPairs = Math.floor(finalIncome / incomePerPair);
        
        if (actualPairs > 0 && finalIncome > 0) {
          // Update user income
          transaction.update(userRef, {
            promotionalIncome: increment(finalIncome),
            totalIncome: increment(finalIncome),
            pairsCount: increment(newPairs), // Count all pairs, even if not all generate income
            dailyCycles: dailyCycles + actualPairs,
            currentCycleIncome: shouldReset ? finalIncome : increment(finalIncome),
            lastCycleReset: shouldReset ? serverTimestamp() : userData.lastCycleReset
          });

          // Update user's affiliate balance
          const mainUserRef = doc(db, 'users', userId);
          transaction.update(mainUserRef, {
            affiliateBalance: increment(finalIncome),
            totalEarnings: increment(finalIncome),
            promotionalIncome: increment(finalIncome)
          });

          // Create income record
          const incomeRecord = {
            userId,
            type: 'promotional',
            amount: finalIncome,
            pairs: actualPairs,
            totalPairs: newPairs,
            description: `Promotional Incentive: ₹400 × ${actualPairs} pairs (${newPairs} total pairs)`,
            cycle: dailyCycles + 1,
            maxCycles: maxCycles,
            dailyLimit: maxDailyIncome,
            remainingLimit: remainingDailyIncome - finalIncome,
            createdAt: serverTimestamp(),
            status: 'completed'
          };

          const incomeRef = doc(collection(db, 'incomeRecords'));
          transaction.set(incomeRef, incomeRecord);

          // Trigger mentorship income for uplines
          await this.calculateMentorshipIncome(userId, finalIncome);
        }
      }
    } catch (error) {
      console.error('Error processing promotional income:', error);
      throw error;
    }
  }

  // Calculate mentorship income based on Vedmurti Plan
  static async calculateMentorshipIncome(userId, triggerAmount = 400) {
    try {
      const userDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!userDoc.exists()) return;

      const userData = userDoc.data();
      let currentUserId = userData.sponsorId;
      let level = 1;
      
      const batch = writeBatch(db);

      // Enhanced mentorship income structure
      const mentorshipRates = {
        1: { amount: 300, maxPerCycle: 500, levelName: 'A' }, // Direct Sponsor
        2: { amount: 1200, maxPerCycle: 500, levelName: 'B' }, // Sponsor's Sponsor
        3: { amount: 500, maxPerCycle: 500, levelName: 'C' },
        4: { amount: 400, maxPerCycle: 500, levelName: 'C' },
        5: { amount: 300, maxPerCycle: 500, levelName: 'C' },
        6: { amount: 200, maxPerCycle: 500, levelName: 'C' },
        7: { amount: 150, maxPerCycle: 500, levelName: 'C' },
        8: { amount: 100, maxPerCycle: 500, levelName: 'C' },
        9: { amount: 75, maxPerCycle: 500, levelName: 'C' },
        10: { amount: 50, maxPerCycle: 500, levelName: 'C' }
      };

      while (currentUserId && level <= 10) {
        const uplineDoc = await getDoc(doc(db, 'mlmUsers', currentUserId));
        if (!uplineDoc.exists()) break;

        const uplineData = uplineDoc.data();
        
        // Skip if upline is not active
        if (!uplineData.isActive) {
          currentUserId = uplineData.sponsorId;
          level++;
          continue;
        }

        const rateInfo = mentorshipRates[level];
        if (!rateInfo) break;

        // Check daily cycle limits
        const today = new Date();
        const lastReset = uplineData.lastCycleReset?.toDate() || new Date(0);
        const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
        const shouldReset = hoursDiff >= 12;

        let currentCycleMentorshipIncome = shouldReset ? 0 : (uplineData.currentCycleMentorshipIncome || 0);
        const maxPerCycle = rateInfo.maxPerCycle;
        const dailyLimit = 2000; // ₹2000 per day max
        
        // Check if user can receive more mentorship income
        const remainingCycleLimit = Math.max(0, maxPerCycle - currentCycleMentorshipIncome);
        const remainingDailyLimit = Math.max(0, dailyLimit - currentCycleMentorshipIncome);
        const finalIncome = Math.min(rateInfo.amount, remainingCycleLimit, remainingDailyLimit);

        if (finalIncome > 0) {
          // Update upline income
          const uplineRef = doc(db, 'mlmUsers', currentUserId);
          batch.update(uplineRef, {
            mentorshipIncome: increment(finalIncome),
            totalIncome: increment(finalIncome),
            currentCycleMentorshipIncome: shouldReset ? finalIncome : increment(finalIncome),
            lastCycleReset: shouldReset ? serverTimestamp() : uplineData.lastCycleReset
          });

          // Update user's affiliate balance
          const mainUserRef = doc(db, 'users', currentUserId);
          batch.update(mainUserRef, {
            affiliateBalance: increment(finalIncome),
            totalEarnings: increment(finalIncome),
            mentorshipIncome: increment(finalIncome)
          });

          // Create income record
          const incomeRecord = {
            userId: currentUserId,
            type: 'mentorship',
            amount: finalIncome,
            level: level,
            levelType: rateInfo.levelName,
            fromUserId: userId,
            triggerAmount: triggerAmount,
            description: `Mentorship Level ${level} (${rateInfo.levelName}): ₹${finalIncome}`,
            maxPerCycle: maxPerCycle,
            remainingCycleLimit: remainingCycleLimit - finalIncome,
            remainingDailyLimit: remainingDailyLimit - finalIncome,
            createdAt: serverTimestamp(),
            status: 'completed'
          };

          const incomeRef = doc(collection(db, 'incomeRecords'));
          batch.set(incomeRef, incomeRecord);
        }

        currentUserId = uplineData.sponsorId;
        level++;
      }

      await batch.commit();
    } catch (error) {
      console.error('Error calculating mentorship income:', error);
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
}

export default MLMService;
