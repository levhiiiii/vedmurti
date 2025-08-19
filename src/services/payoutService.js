import { getFirestore, collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { app } from '../Firebase/firebase';

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
          
          // Calculate total income from all sources
          const totalIncome = await this.calculateUserTotalIncome(userId);
          
          
          if (totalIncome > 0) {
            // Create payout record
            const payoutData = {
              userId: userId,
              userEmail: userData.email,
              userName: userData.name,
              userReferralCode: userData.referralCode,
              totalIncome: totalIncome,
              payoutAmount: totalIncome * 0.95, // 5% deduction
              deduction: totalIncome * 0.05,
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

  // Calculate user's total income from all sources
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
      
      // Build tree for income calculation (same logic as AffiliateDashboard) - Only approved users
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
      
      const treeData = await buildTree(userData.referralCode);
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
      // Simple 1:1 ratio - match one left with one right
      let pairs = Math.min(l, r);
      const promotionalIncome = pairs * 400;
      
      // Calculate mentorship income - ₹100 per pair when downlines match pairs
      let mentorshipIncome = 0;
      const countDownlinePairs = (node) => {
        if (!node) return 0;
        
        // Count pairs for this node (if it has both left and right approved downlines)
        let nodePairs = 0;
        if (node.leftNode && node.rightNode && 
            node.leftNode.isPaymentApproved && node.rightNode.isPaymentApproved) {
          nodePairs = 1;
        }
        
        // Recursively count pairs from all downlines
        const leftPairs = countDownlinePairs(node.leftNode);
        const rightPairs = countDownlinePairs(node.rightNode);
        
        return nodePairs + leftPairs + rightPairs;
      };
      
      // Calculate pairs from left and right downlines (excluding root)
      let totalDownlinePairs = 0;
      if (treeData.leftNode) {
        totalDownlinePairs += countDownlinePairs(treeData.leftNode);
      }
      if (treeData.rightNode) {
        totalDownlinePairs += countDownlinePairs(treeData.rightNode);
      }
      
      mentorshipIncome = totalDownlinePairs * 100; // ₹100 per pair
      
      // Calculate rewards
      let rewardsIncome = 0;
      if (pairs >= 500) {
        rewardsIncome += 25000;
        if (pairs >= 600) {
          rewardsIncome += 5000;
        }
      }
      
      const totalIncome = promotionalIncome + mentorshipIncome + rewardsIncome;
      
      return totalIncome;
    } catch (error) {
      return 0;
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
            collection(db, 'payouts')
          );
          
          const snapshot = await getDocs(payoutsQuery);
          const payouts = [];
          
          snapshot.forEach((doc) => {
            payouts.push({
              id: doc.id,
              ...doc.data()
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
            payouts.push({
              id: doc.id,
              ...doc.data()
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
