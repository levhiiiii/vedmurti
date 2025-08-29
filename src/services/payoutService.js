import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, deleteDoc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { app } from '../Firebase/firebase';

/**
 * PayoutService - Handles all payout generation and management
 * 
 * IMPORTANT: This service ONLY uses the NEW income calculation method that matches
 * the AffiliateDashboard logic. It does NOT use any old income calculation methods.
 * 
 * New Income Calculation Formula:
 * Total Income = Promotional Income + Mentorship Income + Rewards
 * 
 * - Promotional Income: Math.min(leftTeamCount, rightTeamCount) × ₹400 (Daily Cap: ₹2000)
 * - Mentorship Income: Sum of direct referrals' pairs × ₹100 (Daily Cap: ₹500)
 * - Rewards: Performance bonuses (₹25,000 for 500 pairs, ₹5,000 for 600 pairs)
 * 
 * DAILY CAP SYSTEM:
 * - Promotional Income: Users can only earn up to ₹2000 per day (5 pairs maximum per day)
 * - Mentorship Income: Users can only earn up to ₹500 per day (5 pairs maximum per day)
 * This ensures fair distribution and prevents excessive daily earnings.
 */

class PayoutService {
  // Get next payout date (2nd, 12th, 22nd of each month)
  getNextPayoutDate() {
    const today = new Date();
    const currentDay = today.getDate();
    
    // Define payout dates
    const payoutDates = [2, 12, 22];
    
    // Find the next payout date
    let nextPayoutDate = new Date(today);
    
    if (currentDay < 2) {
      nextPayoutDate.setDate(2);
    } else if (currentDay < 12) {
      nextPayoutDate.setDate(12);
    } else if (currentDay < 22) {
      nextPayoutDate.setDate(22);
    } else {
      // Next month's 2nd
      nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);
      nextPayoutDate.setDate(2);
    }
    
    return nextPayoutDate;
  }

  // Get days until next payout
  getDaysUntilNextPayout() {
    const nextPayout = this.getNextPayoutDate();
    const today = new Date();
    const timeDiff = nextPayout.getTime() - today.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Check if today is a payout date
  isPayoutDate() {
    const today = new Date();
    const currentDay = today.getDate();
    return [2, 12, 22].includes(currentDay);
  }

  // Generate automatic payouts for all eligible users
  async generateAutomaticPayouts() {
    const db = getFirestore(app);
    
    try {
      // First, remove all existing payouts for the current cycle
      await this.removeExistingPayouts();
      
      // Get all users with KYC completed, approved payment requests, and positive income
      const usersQuery = query(
        collection(db, 'users'),
        where('kycCompleted', '==', true),
        where('affiliateStatus', '==', true),
        where('paymentRequestStatus', '==', 'approved')
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      
      const payouts = [];
      const excludedUsers = [];
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Get user's verified bank accounts
        const bankAccountsQuery = query(
          collection(db, 'bankAccounts'),
          where('userId', '==', userId),
          where('isPrimary', '==', true),
          where('verified', '==', true)
        );
        
        const bankAccountsSnapshot = await getDocs(bankAccountsQuery);
        
        if (bankAccountsSnapshot.empty) {
          // No verified bank account
          excludedUsers.push({
            userId: userId,
            userName: userData.name || 'Unknown',
            userEmail: userData.email || '',
            userReferralCode: userData.referralCode || '',
            reason: 'No verified primary bank account found',
            details: 'User must have a verified primary bank account to receive payouts',
            category: 'bank_account_missing'
          });
          continue;
        }
        
        const primaryAccount = bankAccountsSnapshot.docs[0].data();
        
        // Calculate total income from all sources using NEW method only
        const totalIncome = await this.calculateUserTotalIncome(userId);
        
        // Validate that income calculation is working correctly
        if (totalIncome < 0) {
          console.error(`Invalid income calculation for user ${userId}: ${totalIncome}`);
          excludedUsers.push({
            userId: userId,
            userName: userData.name || 'Unknown',
            userEmail: userData.email || '',
            userReferralCode: userData.referralCode || '',
            reason: 'Invalid income calculation',
            details: `Income calculation returned negative value: ${totalIncome}`,
            category: 'calculation_error'
          });
          continue; // Skip this user if calculation is invalid
        }
        
        if (totalIncome > 0) {
          // Get detailed income breakdown
          const incomeBreakdown = await this.getUserIncomeBreakdown(userId);
          
          // Generate detailed payout summary with error handling
          let payoutSummary;
          try {
            payoutSummary = await this.generatePayoutSummary(incomeBreakdown, userData);
          } catch (summaryError) {
            console.error('Error generating payout summary for user:', userId, summaryError);
            // Use default summary if generation fails
            payoutSummary = {
              overview: `Payout generated for ${userData.name || 'Unknown'} (${userData.referralCode || 'N/A'}) with total income of ₹${totalIncome.toFixed(2)}`,
              promotionalDetails: { pairs: Math.min(incomeBreakdown.leftTeamCount, incomeBreakdown.rightTeamCount), rate: '₹400 per pair', potential: Math.min(incomeBreakdown.leftTeamCount, incomeBreakdown.rightTeamCount) * 400, actual: incomeBreakdown.promotionalIncome, capApplied: false, explanation: 'Income calculation completed' },
              mentorshipDetails: { directReferrals: incomeBreakdown.directReferrals, referralPairs: incomeBreakdown.referralPairs, rate: '₹100 per referral pair', potential: incomeBreakdown.referralPairs * 100, actual: incomeBreakdown.mentorshipIncome, capApplied: false, explanation: 'Mentorship income calculated' },
              rewardsDetails: { amount: incomeBreakdown.rewardsIncome, explanation: incomeBreakdown.rewardsIncome > 0 ? 'Performance bonus earned' : 'No performance rewards' },
              teamStructure: { leftTeam: incomeBreakdown.leftTeamCount, rightTeam: incomeBreakdown.rightTeamCount, explanation: `Team structure: ${incomeBreakdown.leftTeamCount} left team members, ${incomeBreakdown.rightTeamCount} right team members` },
              networkInfo: { totalNetworkSize: 0, directReferrals: incomeBreakdown.directReferrals, level1Downlines: 0, level2Downlines: 0, level3Downlines: 0, leftLegStructure: { count: 0, structure: [] }, rightLegStructure: { count: 0, structure: [] }, directReferralDetails: [], explanation: 'Network analysis completed' },
              calculationMethod: { method: 'Daily Capped Income Calculation', promotionalCap: '₹2000/day maximum (5 pairs)', mentorshipCap: '₹500/day maximum (5 pairs)', totalFormula: `Total = Capped Promotional (₹${incomeBreakdown.promotionalIncome}) + Capped Mentorship (₹${incomeBreakdown.mentorshipIncome}) + Rewards (₹${incomeBreakdown.rewardsIncome})` },
              payoutCalculation: { grossIncome: totalIncome, deduction: totalIncome * 0.05, netPayout: totalIncome * 0.95, explanation: `5% platform fee deducted: ₹${totalIncome.toFixed(2)} → ₹${(totalIncome * 0.95).toFixed(2)}` },
              timestamp: new Date().toISOString(),
              cycle: this.getCurrentPayoutCycle()
            };
          }
          
          // Create payout record with validation and default values
          const payoutData = {
            userId: userId || '',
            userEmail: userData.email || '',
            userName: userData.name || 'Unknown User',
            userReferralCode: userData.referralCode || '',
            totalIncome: totalIncome || 0,
            payoutAmount: (totalIncome || 0) * 0.95, // 5% deduction
            deduction: (totalIncome || 0) * 0.05,
            incomeBreakdown: incomeBreakdown || {
              promotionalIncome: 0,
              mentorshipIncome: 0,
              rewardsIncome: 0,
              totalIncome: 0,
              leftTeamCount: 0,
              rightTeamCount: 0,
              directReferrals: 0,
              referralPairs: 0
            },
            payoutSummary: payoutSummary || {
              overview: 'Payout generated with default values',
              promotionalDetails: { pairs: 0, rate: '₹400 per pair', potential: 0, actual: 0, capApplied: false, explanation: 'No pairs matched' },
              mentorshipDetails: { directReferrals: 0, referralPairs: 0, rate: '₹100 per referral pair', potential: 0, actual: 0, capApplied: false, explanation: 'No referral pairs' },
              rewardsDetails: { amount: 0, explanation: 'No performance rewards' },
              teamStructure: { leftTeam: 0, rightTeam: 0, explanation: 'No team structure' },
              networkInfo: { totalNetworkSize: 0, directReferrals: 0, level1Downlines: 0, level2Downlines: 0, level3Downlines: 0, leftLegStructure: { count: 0, structure: [] }, rightLegStructure: { count: 0, structure: [] }, directReferralDetails: [], explanation: 'No network data' },
              calculationMethod: { method: 'Default Calculation', promotionalCap: '₹2000/day maximum', mentorshipCap: '₹500/day maximum', totalFormula: 'Total = 0' },
              payoutCalculation: { grossIncome: 0, deduction: 0, netPayout: 0, explanation: 'No payout calculation' },
              timestamp: new Date().toISOString(),
              cycle: this.getCurrentPayoutCycle()
            },
            bankAccount: {
              accountHolderName: primaryAccount.accountHolderName || '',
              accountNumber: primaryAccount.accountNumber || '',
              bankName: primaryAccount.bankName || '',
              ifscCode: primaryAccount.ifscCode || '',
              branch: primaryAccount.branch || ''
            },
            status: 'pending',
            payoutDate: new Date(),
            generatedAt: new Date(),
            payoutCycle: this.getCurrentPayoutCycle()
          };
          
          // Save payout record
          const payoutRef = doc(collection(db, 'payouts'));
          await setDoc(payoutRef, payoutData);
          
          payouts.push({
            id: payoutRef.id,
            ...payoutData
          });
          
          // Reset user's income after payout generation
          await this.resetUserIncome(userId);
        } else {
          // Zero income - exclude from payouts
          excludedUsers.push({
            userId: userId,
            userName: userData.name || 'Unknown',
            userEmail: userData.email || '',
            userReferralCode: userData.referralCode || '',
            reason: 'No income earned',
            details: `User has no income to payout (₹${totalIncome.toFixed(2)})`,
            category: 'no_income'
          });
        }
      }
      
      return {
        payouts,
        excludedUsers,
        summary: {
          totalUsersProcessed: usersSnapshot.size,
          payoutsGenerated: payouts.length,
          usersExcluded: excludedUsers.length,
          excludedReasons: excludedUsers.reduce((acc, user) => {
            acc[user.category] = (acc[user.category] || 0) + 1;
            return acc;
          }, {})
        }
      };
    } catch (error) {
      throw error;
    }
  }

  // Calculate user's total income from all sources (Updated to match AffiliateDashboard logic)
  async calculateUserTotalIncome(userId) {
    const db = getFirestore(app);
    
    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return 0;
      }
      
      const userData = userDoc.data();
      if (!userData.referralCode) {
        return 0;
      }
      
      // Calculate left and right team counts (same logic as AffiliateDashboard)
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

      // Count left and right team members
      let leftTeamCount = 0;
      let rightTeamCount = 0;
      
      if (userData.leftDownLine) {
        leftTeamCount = await countRecursive(userData.leftDownLine, 'left');
      }
      if (userData.rightDownLine) {
        rightTeamCount = await countRecursive(userData.rightDownLine, 'right');
      }

      // Calculate promotional income from team pairs with daily cap of ₹2000
      const potentialPromotionalIncome = Math.min(leftTeamCount, rightTeamCount) * 400; // ₹400 per pair
      const promotionalIncome = Math.min(potentialPromotionalIncome, 2000); // Daily cap of ₹2000
      
      // Calculate mentorship income from direct referrals' networks with daily cap of ₹500
      let mentorshipIncome = 0;
      
      // Get all direct referrals
      const referralsQuery = query(
        collection(db, 'users'),
        where('referredBy', '==', userData.referralCode),
        where('affiliateStatus', '==', true),
        where('paymentRequestStatus', '==', 'approved')
      );
      const referralsSnapshot = await getDocs(referralsQuery);
      
      // Calculate pairs for each direct referral
      for (const referralDoc of referralsSnapshot.docs) {
        const referralData = referralDoc.data();
        
        // Count left and right teams for this referral
        let referralLeftCount = 0;
        let referralRightCount = 0;
        
        if (referralData.leftDownLine) {
          referralLeftCount = await countRecursive(referralData.leftDownLine, 'left');
        }
        if (referralData.rightDownLine) {
          referralRightCount = await countRecursive(referralData.rightDownLine, 'right');
        }
        
        // Add pairs from this referral
        const referralPairs = Math.min(referralLeftCount, referralRightCount);
        mentorshipIncome += referralPairs * 100; // ₹100 per pair
      }
      
      // Apply daily cap of ₹500 for mentorship income
      mentorshipIncome = Math.min(mentorshipIncome, 500);
      
      // Calculate rewards
      let rewardsIncome = 0;
      const totalPairs = Math.min(leftTeamCount, rightTeamCount);
      
      if (totalPairs >= 500) {
        rewardsIncome += 25000;
        if (totalPairs >= 600) {
          rewardsIncome += 5000;
        }
      }
      
      const totalIncome = promotionalIncome + mentorshipIncome + rewardsIncome;
      
      // Log the calculation for verification (NEW METHOD ONLY)
      console.log(`NEW METHOD - User ${userId} Income Calculation:`, {
        userId,
        referralCode: userData.referralCode,
        leftTeamCount,
        rightTeamCount,
        promotionalIncome,
        mentorshipIncome,
        rewardsIncome,
        totalIncome,
        calculationMethod: 'NEW_AFFILIATE_DASHBOARD_METHOD'
      });
      
      return totalIncome;
    } catch (error) {
      console.error('Error calculating user total income:', error);
      return 0;
    }
  }

  // Remove existing payouts for the current cycle
  async removeExistingPayouts() {
    const db = getFirestore(app);
    
    try {
      const currentCycle = this.getCurrentPayoutCycle();
      
      // Get all existing payouts for the current cycle
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('payoutCycle', '==', currentCycle)
      );
      
      const payoutsSnapshot = await getDocs(payoutsQuery);
      
      // Actually delete all existing payouts for this cycle
      const deletePromises = payoutsSnapshot.docs.map(doc => 
        deleteDoc(doc.ref)
      );
      
      await Promise.all(deletePromises);
      
      console.log(`Deleted ${payoutsSnapshot.size} existing payouts for cycle ${currentCycle}`);
      
      return payoutsSnapshot.size;
    } catch (error) {
      console.error('Error deleting existing payouts:', error);
      throw error;
    }
  }

  // Get detailed income breakdown for a user (for admin display)
  async getUserIncomeBreakdown(userId) {
    const db = getFirestore(app);
    
    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return {
          promotionalIncome: 0,
          mentorshipIncome: 0,
          rewardsIncome: 0,
          totalIncome: 0,
          leftTeamCount: 0,
          rightTeamCount: 0,
          directReferrals: 0,
          referralPairs: 0
        };
      }
      
      const userData = userDoc.data();
      if (!userData.referralCode) {
        return {
          promotionalIncome: 0,
          mentorshipIncome: 0,
          rewardsIncome: 0,
          totalIncome: 0,
          leftTeamCount: 0,
          rightTeamCount: 0,
          directReferrals: 0,
          referralPairs: 0
        };
      }
      
      // Calculate left and right team counts
      const countRecursive = async (referralCode, side) => {
        if (!referralCode) return 0;

        const q = query(
          collection(db, 'users'),
          where('referralCode', '==', referralCode)
        );
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) return 0;

        const user = snapshot.docs[0].data();
        let count = 1;

        if (user.leftDownLine) {
          count += await countRecursive(user.leftDownLine, side);
        }
        if (user.rightDownLine) {
          count += await countRecursive(user.rightDownLine, side);
        }

        return count;
      };

      // Count left and right team members
      let leftTeamCount = 0;
      let rightTeamCount = 0;
      
      if (userData.leftDownLine) {
        leftTeamCount = await countRecursive(userData.leftDownLine, 'left');
      }
      if (userData.rightDownLine) {
        rightTeamCount = await countRecursive(userData.rightDownLine, 'right');
      }

      // Calculate promotional income with daily cap of ₹2000
      const potentialPromotionalIncome = Math.min(leftTeamCount, rightTeamCount) * 400;
      const promotionalIncome = Math.min(potentialPromotionalIncome, 2000); // Daily cap of ₹2000
      
      // Calculate mentorship income from direct referrals with daily cap of ₹500
      let mentorshipIncome = 0;
      let referralPairs = 0;
      
      const referralsQuery = query(
        collection(db, 'users'),
        where('referredBy', '==', userData.referralCode),
        where('affiliateStatus', '==', true),
        where('paymentRequestStatus', '==', 'approved')
      );
      const referralsSnapshot = await getDocs(referralsQuery);
      const directReferrals = referralsSnapshot.size;
      
      for (const referralDoc of referralsSnapshot.docs) {
        const referralData = referralDoc.data();
        
        let referralLeftCount = 0;
        let referralRightCount = 0;
        
        if (referralData.leftDownLine) {
          referralLeftCount = await countRecursive(referralData.leftDownLine, 'left');
        }
        if (referralData.rightDownLine) {
          referralRightCount = await countRecursive(referralData.rightDownLine, 'right');
        }
        
        const referralPairs = Math.min(referralLeftCount, referralRightCount);
        mentorshipIncome += referralPairs * 100;
      }
      
      // Apply daily cap of ₹500 for mentorship income
      mentorshipIncome = Math.min(mentorshipIncome, 500);
      
      // Calculate rewards
      let rewardsIncome = 0;
      const totalPairs = Math.min(leftTeamCount, rightTeamCount);
      
      if (totalPairs >= 500) {
        rewardsIncome += 25000;
        if (totalPairs >= 600) {
          rewardsIncome += 5000;
        }
      }
      
      const totalIncome = promotionalIncome + mentorshipIncome + rewardsIncome;
      
      return {
        promotionalIncome,
        mentorshipIncome,
        rewardsIncome,
        totalIncome,
        leftTeamCount,
        rightTeamCount,
        directReferrals,
        referralPairs: Math.min(leftTeamCount, rightTeamCount)
      };
    } catch (error) {
      console.error('Error getting user income breakdown:', error);
      return {
        promotionalIncome: 0,
        mentorshipIncome: 0,
        rewardsIncome: 0,
        totalIncome: 0,
        leftTeamCount: 0,
        rightTeamCount: 0,
        directReferrals: 0,
        referralPairs: 0
      };
    }
  }

  // Reset user's income after payout (track payout history)
  async resetUserIncome(userId) {
    const db = getFirestore(app);
    
    try {
      // Since income is calculated in real-time, we just track the payout
      // Update user document to track last payout
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const totalIncome = await this.calculateUserTotalIncome(userId);
        
        await updateDoc(doc(db, 'users', userId), {
          lastPayoutDate: new Date(),
          lastPayoutAmount: totalIncome,
          lastPayoutCycle: this.getCurrentPayoutCycle()
        });
      }
    } catch (error) {
      throw error;
    }
  }

  // Get current payout cycle
  getCurrentPayoutCycle() {
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();
    const day = today.getDate();
    
    if (day <= 2) return `${year}-${month.toString().padStart(2, '0')}-01`;
    if (day <= 12) return `${year}-${month.toString().padStart(2, '0')}-02`;
    if (day <= 22) return `${year}-${month.toString().padStart(2, '0')}-03`;
    
    // If after 22nd, it's the next month's first cycle
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    return `${nextYear}-${nextMonth.toString().padStart(2, '0')}-01`;
  }

  // Get all payouts for admin
  async getAllPayouts() {
    const db = getFirestore(app);
    
    try {
      const payoutsQuery = query(
        collection(db, 'payouts'),
        orderBy('generatedAt', 'desc')
      );
      
      const snapshot = await getDocs(payoutsQuery);
      const payouts = [];
      
      snapshot.forEach((doc) => {
        const payoutData = doc.data();
        payouts.push({
          id: doc.id,
          ...payoutData
        });
      });
      
      return payouts;
    } catch (error) {
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        try {
          const payoutsQuery = query(
            collection(db, 'payouts')
          );
          
          const snapshot = await getDocs(payoutsQuery);
          const payouts = [];
          
          snapshot.forEach((doc) => {
            const payoutData = doc.data();
            payouts.push({
              id: doc.id,
              ...payoutData
            });
          });
          
          // Sort manually since we can't use orderBy
          payouts.sort((a, b) => {
            const dateA = a.generatedAt?.toDate?.() || new Date(a.generatedAt) || new Date(0);
            const dateB = b.generatedAt?.toDate?.() || new Date(b.generatedAt) || new Date(0);
            return dateB - dateA;
          });
          
          return payouts;
        } catch (simpleError) {
          throw simpleError;
        }
      }
      
      throw error;
    }
  }

  // Update payout status
  async updatePayoutStatus(payoutId, status) {
    const db = getFirestore(app);
    
    try {
      const payoutRef = doc(db, 'payouts', payoutId);
      await updateDoc(payoutRef, {
        status: status,
        updatedAt: new Date()
      });
    } catch (error) {
      throw error;
    }
  }

  // Get payouts by status
  async getPayoutsByStatus(status) {
    const db = getFirestore(app);
    
    try {
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('status', '==', status),
        orderBy('generatedAt', 'desc')
      );
      
      const snapshot = await getDocs(payoutsQuery);
      const payouts = [];
      
      snapshot.forEach((doc) => {
        payouts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return payouts;
    } catch (error) {
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        try {
          const payoutsQuery = query(
            collection(db, 'payouts'),
            where('status', '==', status)
          );
          
          const snapshot = await getDocs(payoutsQuery);
          const payouts = [];
          
          snapshot.forEach((doc) => {
            const payoutData = doc.data();
            payouts.push({
              id: doc.id,
              ...payoutData
            });
          });
          
          // Sort manually since we can't use orderBy
          payouts.sort((a, b) => {
            const dateA = a.generatedAt?.toDate?.() || new Date(a.generatedAt) || new Date(0);
            const dateB = b.generatedAt?.toDate?.() || new Date(b.generatedAt) || new Date(0);
            return dateB - dateA;
          });
          
          return payouts;
        } catch (simpleError) {
          throw simpleError;
        }
      }
      
      throw error;
    }
  }

  // Get payout statistics
  async getPayoutStatistics() {
    const db = getFirestore(app);
    
    try {
      const payoutsQuery = query(collection(db, 'payouts'));
      const snapshot = await getDocs(payoutsQuery);
      
      let totalPayouts = 0;
      let totalAmount = 0;
      let pendingPayouts = 0;
      let completedPayouts = 0;
      
      snapshot.forEach((doc) => {
        const payout = doc.data();
        totalPayouts++;
        totalAmount += payout.payoutAmount || 0;
        
        if (payout.status === 'pending') {
          pendingPayouts++;
        } else if (payout.status === 'completed') {
          completedPayouts++;
        }
      });
      
      return {
        totalPayouts,
        totalAmount,
        pendingPayouts,
        completedPayouts,
        averagePayout: totalPayouts > 0 ? totalAmount / totalPayouts : 0
      };
    } catch (error) {
      throw error;
    }
  }

  // Generate detailed payout summary with explanations
  async generatePayoutSummary(incomeBreakdown, userData) {
    const {
      promotionalIncome,
      mentorshipIncome,
      rewardsIncome,
      totalIncome,
      leftTeamCount,
      rightTeamCount,
      directReferrals,
      referralPairs
    } = incomeBreakdown;

    // Get detailed network information
    const networkInfo = await this.getUserNetworkInfo(userData.referralCode);

    const totalPairs = Math.min(leftTeamCount, rightTeamCount);
    const potentialPromotionalIncome = totalPairs * 400;
    const potentialMentorshipIncome = referralPairs * 100;

    // Calculate caps applied
    const promotionalCapApplied = potentialPromotionalIncome > 2000;
    const mentorshipCapApplied = potentialMentorshipIncome > 500;

    // Generate detailed summary
    const summary = {
      overview: `Payout generated for ${userData.name} (${userData.referralCode}) with total income of ₹${totalIncome.toFixed(2)}`,
      
      promotionalDetails: {
        title: "Promotional Income Breakdown",
        pairs: totalPairs,
        rate: "₹400 per pair",
        potential: potentialPromotionalIncome,
        actual: promotionalIncome,
        capApplied: promotionalCapApplied,
        explanation: promotionalCapApplied 
          ? `Earned from ${totalPairs} matched pairs (₹${potentialPromotionalIncome.toFixed(2)}) but capped at ₹2000/day maximum`
          : `Earned from ${totalPairs} matched pairs at ₹400 each`
      },

      mentorshipDetails: {
        title: "Mentorship Income Breakdown", 
        directReferrals: directReferrals,
        referralPairs: referralPairs,
        rate: "₹100 per referral pair",
        potential: potentialMentorshipIncome,
        actual: mentorshipIncome,
        capApplied: mentorshipCapApplied,
        explanation: mentorshipCapApplied
          ? `Earned from ${referralPairs} referral pairs (₹${potentialMentorshipIncome.toFixed(2)}) but capped at ₹500/day maximum`
          : `Earned from ${referralPairs} referral pairs at ₹100 each`
      },

      rewardsDetails: {
        title: "Performance Rewards",
        amount: rewardsIncome,
        explanation: rewardsIncome > 0 
          ? `Performance bonus for achieving ${totalPairs} pairs milestone`
          : "No performance rewards earned yet"
      },

      teamStructure: {
        leftTeam: leftTeamCount,
        rightTeam: rightTeamCount,
        explanation: `Team structure: ${leftTeamCount} left team members, ${rightTeamCount} right team members`
      },

      networkInfo: {
        title: "Network Information",
        totalNetworkSize: networkInfo.totalNetworkSize,
        directReferrals: networkInfo.directReferrals,
        level1Downlines: networkInfo.level1Downlines,
        level2Downlines: networkInfo.level2Downlines,
        level3Downlines: networkInfo.level3Downlines,
        leftLegStructure: networkInfo.leftLegStructure,
        rightLegStructure: networkInfo.rightLegStructure,
        directReferralDetails: networkInfo.directReferralDetails,
        explanation: `Complete network analysis: ${networkInfo.totalNetworkSize} total members across ${networkInfo.directReferrals} direct referrals`
      },

      calculationMethod: {
        method: "Daily Capped Income Calculation",
        promotionalCap: "₹2000/day maximum (5 pairs)",
        mentorshipCap: "₹500/day maximum (5 pairs)",
        totalFormula: `Total = Capped Promotional (₹${promotionalIncome}) + Capped Mentorship (₹${mentorshipIncome}) + Rewards (₹${rewardsIncome})`
      },

      payoutCalculation: {
        grossIncome: totalIncome,
        deduction: totalIncome * 0.05,
        netPayout: totalIncome * 0.95,
        explanation: `5% platform fee deducted: ₹${totalIncome.toFixed(2)} → ₹${(totalIncome * 0.95).toFixed(2)}`
      },

      timestamp: new Date().toISOString(),
      cycle: this.getCurrentPayoutCycle()
    };

    return summary;
  }

  // Get detailed network information for a user
  async getUserNetworkInfo(referralCode) {
    const db = getFirestore(app);
    
    try {
      // Get direct referrals
      const directReferralsQuery = query(
        collection(db, 'users'),
        where('referredBy', '==', referralCode),
        where('affiliateStatus', '==', true),
        where('paymentRequestStatus', '==', 'approved')
      );
      const directReferralsSnapshot = await getDocs(directReferralsQuery);
      const directReferrals = directReferralsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Get all downlines recursively (up to 3 levels)
      const getAllDownlines = async (referralCode, level = 0, maxLevel = 3) => {
        if (level >= maxLevel) return [];
        
        const downlinesQuery = query(
          collection(db, 'users'),
          where('referredBy', '==', referralCode),
          where('affiliateStatus', '==', true),
          where('paymentRequestStatus', '==', 'approved')
        );
        const downlinesSnapshot = await getDocs(downlinesQuery);
        
        let allDownlines = [];
        for (const doc of downlinesSnapshot.docs) {
          const downline = { id: doc.id, ...doc.data() };
          allDownlines.push({ ...downline, level });
          
          // Get sub-downlines
          const subDownlines = await getAllDownlines(downline.referralCode, level + 1, maxLevel);
          allDownlines = allDownlines.concat(subDownlines);
        }
        
        return allDownlines;
      };

      // Get all downlines
      const allDownlines = await getAllDownlines(referralCode);
      
      // Categorize by level
      const level1Downlines = allDownlines.filter(d => d.level === 0);
      const level2Downlines = allDownlines.filter(d => d.level === 1);
      const level3Downlines = allDownlines.filter(d => d.level === 2);

      // Get left and right leg structure
      const getLegStructure = async (referralCode, side) => {
        if (!referralCode) return { count: 0, structure: [] };
        
        const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
        const userSnapshot = await getDocs(userQuery);
        if (userSnapshot.empty) return { count: 0, structure: [] };
        
        const userData = userSnapshot.docs[0].data();
        const downlineCode = side === 'left' ? userData.leftDownLine : userData.rightDownLine;
        
        if (!downlineCode) return { count: 0, structure: [] };
        
        const downlines = await getAllDownlines(downlineCode, 0, 3);
        return {
          count: downlines.length + 1, // +1 for the direct downline
          structure: downlines.map(d => ({ name: d.name, referralCode: d.referralCode, level: d.level }))
        };
      };

      const leftLegStructure = await getLegStructure(referralCode, 'left');
      const rightLegStructure = await getLegStructure(referralCode, 'right');

      // Get detailed direct referral information
      const directReferralDetails = await Promise.all(
        directReferrals.map(async (referral) => {
          const referralDownlines = await getAllDownlines(referral.referralCode, 0, 3);
          return {
            name: referral.name || 'Unknown',
            referralCode: referral.referralCode || '',
            email: referral.email || '',
            joinDate: referral.joinDate || new Date(),
            downlinesCount: referralDownlines.length || 0,
            leftDownline: referral.leftDownLine || null,
            rightDownline: referral.rightDownLine || null
          };
        })
      );

      return {
        totalNetworkSize: allDownlines.length + directReferrals.length,
        directReferrals: directReferrals.length,
        level1Downlines: level1Downlines.length,
        level2Downlines: level2Downlines.length,
        level3Downlines: level3Downlines.length,
        leftLegStructure,
        rightLegStructure,
        directReferralDetails
      };
    } catch (error) {
      console.error('Error getting user network info:', error);
      return {
        totalNetworkSize: 0,
        directReferrals: 0,
        level1Downlines: 0,
        level2Downlines: 0,
        level3Downlines: 0,
        leftLegStructure: { count: 0, structure: [] },
        rightLegStructure: { count: 0, structure: [] },
        directReferralDetails: []
      };
    }
  }

  // Export payouts to Excel format (CSV)
  exportPayoutsToCSV(payouts) {
    const headers = [
      'Payout ID',
      'User Name',
      'User Email',
      'Referral Code',
      'Total Income',
      'Payout Amount',
      'Deduction',
      'Promotional Income',
      'Mentorship Income',
      'Rewards Income',
      'Left Team Count',
      'Right Team Count',
      'Matched Pairs',
      'Direct Referrals',
      'Referral Pairs',
      'Promotional Cap Applied',
      'Mentorship Cap Applied',
      'Total Network Size',
      'Direct Referrals',
      'Level 1 Downlines',
      'Level 2 Downlines',
      'Level 3 Downlines',
      'Left Leg Count',
      'Right Leg Count',
      'Bank Account Holder',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Branch',
      'Status',
      'Payout Date',
      'Generated At',
      'Payout Summary'
    ];
    
    const csvData = payouts.map(payout => [
      payout.id,
      payout.userName,
      payout.userEmail,
      payout.userReferralCode,
      payout.totalIncome,
      payout.payoutAmount,
      payout.deduction,
      payout.incomeBreakdown?.promotionalIncome || 0,
      payout.incomeBreakdown?.mentorshipIncome || 0,
      payout.incomeBreakdown?.rewardsIncome || 0,
      payout.incomeBreakdown?.leftTeamCount || 0,
      payout.incomeBreakdown?.rightTeamCount || 0,
      payout.incomeBreakdown?.referralPairs || 0,
      payout.incomeBreakdown?.directReferrals || 0,
      payout.incomeBreakdown?.referralPairs || 0,
      payout.payoutSummary?.promotionalDetails?.capApplied ? 'Yes' : 'No',
      payout.payoutSummary?.mentorshipDetails?.capApplied ? 'Yes' : 'No',
      payout.payoutSummary?.networkInfo?.totalNetworkSize || 0,
      payout.payoutSummary?.networkInfo?.directReferrals || 0,
      payout.payoutSummary?.networkInfo?.level1Downlines || 0,
      payout.payoutSummary?.networkInfo?.level2Downlines || 0,
      payout.payoutSummary?.networkInfo?.level3Downlines || 0,
      payout.payoutSummary?.networkInfo?.leftLegStructure?.count || 0,
      payout.payoutSummary?.networkInfo?.rightLegStructure?.count || 0,
      payout.bankAccount.accountHolderName,
      payout.bankAccount.bankName,
      payout.bankAccount.accountNumber,
      payout.bankAccount.ifscCode,
      payout.bankAccount.branch,
      payout.status,
      payout.payoutDate?.toDate?.()?.toLocaleDateString() || '',
      payout.generatedAt?.toDate?.()?.toLocaleDateString() || '',
      payout.payoutSummary?.overview || 'No summary available'
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // Get excluded users and their reasons for not getting payouts
  async getExcludedUsers() {
    const db = getFirestore(app);
    
    try {
      const excludedUsers = [];
      
      // Get all affiliate users
      const allUsersQuery = query(
        collection(db, 'users'),
        where('affiliateStatus', '==', true)
      );
      const allUsersSnapshot = await getDocs(allUsersQuery);
      
      for (const userDoc of allUsersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        
        // Check KYC status
        if (!userData.kycCompleted) {
          excludedUsers.push({
            userId: userId,
            userName: userData.name || 'Unknown',
            userEmail: userData.email || '',
            userReferralCode: userData.referralCode || '',
            reason: 'KYC not completed',
            details: 'User must complete KYC verification to be eligible for payouts',
            category: 'kyc_incomplete'
          });
          continue;
        }
        
        // Check payment request status
        if (userData.paymentRequestStatus !== 'approved') {
          excludedUsers.push({
            userId: userId,
            userName: userData.name || 'Unknown',
            userEmail: userData.email || '',
            userReferralCode: userData.referralCode || '',
            reason: 'Payment request not approved',
            details: `Payment request status: ${userData.paymentRequestStatus || 'not submitted'}`,
            category: 'payment_request_not_approved'
          });
          continue;
        }
        
        // Check bank account
        const bankAccountsQuery = query(
          collection(db, 'bankAccounts'),
          where('userId', '==', userId),
          where('isPrimary', '==', true),
          where('verified', '==', true)
        );
        const bankAccountsSnapshot = await getDocs(bankAccountsQuery);
        
        if (bankAccountsSnapshot.empty) {
          excludedUsers.push({
            userId: userId,
            userName: userData.name || 'Unknown',
            userEmail: userData.email || '',
            userReferralCode: userData.referralCode || '',
            reason: 'No verified primary bank account',
            details: 'User must have a verified primary bank account to receive payouts',
            category: 'bank_account_missing'
          });
          continue;
        }
        
        // Check income
        const totalIncome = await this.calculateUserTotalIncome(userId);
        if (totalIncome <= 0) {
          excludedUsers.push({
            userId: userId,
            userName: userData.name || 'Unknown',
            userEmail: userData.email || '',
            userReferralCode: userData.referralCode || '',
            reason: 'No income earned',
            details: `User has no income to payout (₹${totalIncome.toFixed(2)})`,
            category: 'no_income',
            incomeDetails: {
              leftTeamCount: 0,
              rightTeamCount: 0,
              directReferrals: 0,
              potentialIncome: 0
            }
          });
        }
      }
      
      return excludedUsers;
    } catch (error) {
      console.error('Error getting excluded users:', error);
      return [];
    }
  }

  // Get payout generation summary
  async getPayoutGenerationSummary() {
    const db = getFirestore(app);
    
    try {
      // Get all eligible users
      const eligibleUsersQuery = query(
        collection(db, 'users'),
        where('kycCompleted', '==', true),
        where('affiliateStatus', '==', true),
        where('paymentRequestStatus', '==', 'approved')
      );
      const eligibleUsersSnapshot = await getDocs(eligibleUsersQuery);
      
      // Get current payouts
      const currentCycle = this.getCurrentPayoutCycle();
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('payoutCycle', '==', currentCycle)
      );
      const payoutsSnapshot = await getDocs(payoutsQuery);
      
      // Get excluded users
      const excludedUsers = await this.getExcludedUsers();
      
      return {
        totalEligibleUsers: eligibleUsersSnapshot.size,
        payoutsGenerated: payoutsSnapshot.size,
        usersExcluded: excludedUsers.length,
        excludedReasons: excludedUsers.reduce((acc, user) => {
          acc[user.category] = (acc[user.category] || 0) + 1;
          return acc;
        }, {}),
        currentCycle: currentCycle
      };
    } catch (error) {
      console.error('Error getting payout generation summary:', error);
      return {
        totalEligibleUsers: 0,
        payoutsGenerated: 0,
        usersExcluded: 0,
        excludedReasons: {},
        currentCycle: this.getCurrentPayoutCycle()
      };
    }
  }

  // Reset network structure for all users
  async resetNetworkStructure() {
    const db = getFirestore(app);
    
    try {
      // Get all affiliate users
      const usersQuery = query(
        collection(db, 'users'),
        where('affiliateStatus', '==', true)
      );
      const usersSnapshot = await getDocs(usersQuery);
      
      let resetCount = 0;
      
      // Reset network structure for each user
      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        
        try {
          // Clear network-related fields
          await updateDoc(doc(db, 'users', userId), {
            leftDownLine: null,
            rightDownLine: null,
            leftTeamCount: 0,
            rightTeamCount: 0,
            directDownlineCount: 0,
            totalDownlineCount: 0,
            promotionalIncome: 0,
            mentorshipIncome: 0,
            totalIncome: 0,
            networkResetAt: new Date(),
            networkResetBy: 'admin'
          });
          
          resetCount++;
        } catch (error) {
          console.error(`Error resetting network for user ${userId}:`, error);
        }
      }
      
      // Also clear any existing payouts for the current cycle
      const currentCycle = this.getCurrentPayoutCycle();
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('payoutCycle', '==', currentCycle)
      );
      const payoutsSnapshot = await getDocs(payoutsQuery);
      
      // Delete existing payouts
      const deletePromises = payoutsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log(`Network reset completed. ${resetCount} users reset, ${payoutsSnapshot.size} payouts deleted.`);
      
      return {
        resetCount,
        payoutsDeleted: payoutsSnapshot.size,
        message: `Successfully reset network structure for ${resetCount} users and deleted ${payoutsSnapshot.size} payouts.`
      };
    } catch (error) {
      console.error('Error resetting network structure:', error);
      throw new Error('Failed to reset network structure');
    }
  }
}

export default new PayoutService();
