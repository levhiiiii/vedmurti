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
 * - Mentorship Income: Sum of direct referrals' pairs × ₹100
 * - Rewards: Performance bonuses (₹25,000 for 500 pairs, ₹5,000 for 600 pairs)
 * 
 * DAILY CAP SYSTEM:
 * Users can only earn up to ₹2000 per day from promotional income (5 pairs maximum per day).
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
        
        if (!bankAccountsSnapshot.empty) {
          const primaryAccount = bankAccountsSnapshot.docs[0].data();
          
          // Calculate total income from all sources using NEW method only
          const totalIncome = await this.calculateUserTotalIncome(userId);
          
          // Validate that income calculation is working correctly
          if (totalIncome < 0) {
            console.error(`Invalid income calculation for user ${userId}: ${totalIncome}`);
            continue; // Skip this user if calculation is invalid
          }
          
          if (totalIncome > 0) {
            // Get detailed income breakdown
            const incomeBreakdown = await this.getUserIncomeBreakdown(userId);
            
            // Create payout record
            const payoutData = {
              userId: userId,
              userEmail: userData.email,
              userName: userData.name,
              userReferralCode: userData.referralCode,
              totalIncome: totalIncome,
              payoutAmount: totalIncome * 0.95, // 5% deduction
              deduction: totalIncome * 0.05,
              incomeBreakdown: incomeBreakdown, // Include detailed breakdown
              bankAccount: {
                accountHolderName: primaryAccount.accountHolderName,
                accountNumber: primaryAccount.accountNumber,
                bankName: primaryAccount.bankName,
                ifscCode: primaryAccount.ifscCode,
                branch: primaryAccount.branch
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
          }
        }
      }
      
      return payouts;
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
      
      // Calculate mentorship income from direct referrals' networks
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

      // Calculate promotional income
      const promotionalIncome = Math.min(leftTeamCount, rightTeamCount) * 400;
      
      // Calculate mentorship income from direct referrals
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
      'Bank Account Holder',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'Branch',
      'Status',
      'Payout Date',
      'Generated At'
    ];
    
    const csvData = payouts.map(payout => [
      payout.id,
      payout.userName,
      payout.userEmail,
      payout.userReferralCode,
      payout.totalIncome,
      payout.payoutAmount,
      payout.deduction,
      payout.bankAccount.accountHolderName,
      payout.bankAccount.bankName,
      payout.bankAccount.accountNumber,
      payout.bankAccount.ifscCode,
      payout.bankAccount.branch,
      payout.status,
      payout.payoutDate?.toDate?.()?.toLocaleDateString() || '',
      payout.generatedAt?.toDate?.()?.toLocaleDateString() || ''
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
}

export default new PayoutService();
