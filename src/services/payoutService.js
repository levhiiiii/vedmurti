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

export class PayoutService {
  
  // Process scheduled payouts (1st, 11th, 21st of each month)
  static async processScheduledPayouts() {
    try {
      const today = new Date();
      const dayOfMonth = today.getDate();
      
      // Check if today is a payout day
      if (![1, 11, 21].includes(dayOfMonth)) {
        console.log('Not a payout day');
        return;
      }

      console.log(`Processing payouts for ${today.toDateString()}`);
      
      // Get all users with pending earnings
      const usersQuery = query(
        collection(db, 'users'),
        where('affiliateBalance', '>', 0)
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      const batch = writeBatch(db);
      let totalPayouts = 0;
      let totalAmount = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const pendingAmount = userData.affiliateBalance || 0;
        
        if (pendingAmount >= 100) { // Minimum payout threshold
          // Apply 5% deduction
          const deductionAmount = pendingAmount * 0.05;
          const payoutAmount = pendingAmount - deductionAmount;
          
          // Create payout record
          const payoutData = {
            userId,
            amount: payoutAmount,
            originalAmount: pendingAmount,
            deductionAmount,
            deductionPercentage: 5,
            status: 'pending',
            payoutDate: serverTimestamp(),
            processedDate: null,
            payoutMethod: 'bank_transfer',
            payoutCycle: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`,
            createdAt: serverTimestamp()
          };

          const payoutRef = doc(collection(db, 'payouts'));
          batch.set(payoutRef, payoutData);

          // Update user balance
          batch.update(userDoc.ref, {
            affiliateBalance: 0,
            pendingPayout: payoutAmount,
            lastPayoutDate: serverTimestamp(),
            totalPayoutsReceived: increment(payoutAmount)
          });

          // Create transaction record
          const transactionData = {
            userId,
            type: 'payout',
            amount: payoutAmount,
            status: 'pending',
            description: `Scheduled payout with 5% deduction (₹${deductionAmount.toFixed(2)})`,
            payoutId: payoutRef.id,
            createdAt: serverTimestamp()
          };

          const transactionRef = doc(collection(db, 'payments'));
          batch.set(transactionRef, transactionData);

          totalPayouts++;
          totalAmount += payoutAmount;
        }
      }

      await batch.commit();

      // Create payout summary
      const payoutSummary = {
        date: serverTimestamp(),
        totalPayouts,
        totalAmount,
        totalDeductions: totalAmount * 0.05 / 0.95, // Calculate original deductions
        payoutCycle: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`,
        status: 'completed'
      };

      await addDoc(collection(db, 'payoutSummaries'), payoutSummary);

      console.log(`Processed ${totalPayouts} payouts totaling ₹${totalAmount.toFixed(2)}`);
      return { totalPayouts, totalAmount };
    } catch (error) {
      console.error('Error processing scheduled payouts:', error);
      throw error;
    }
  }

  // Get user's payout history
  static async getUserPayoutHistory(userId, limitCount = 50) {
    try {
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('userId', '==', userId),
        orderBy('payoutDate', 'desc'),
        limit(limitCount)
      );

      const payoutsSnapshot = await getDocs(payoutsQuery);
      const payoutHistory = [];

      payoutsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        payoutHistory.push({
          id: doc.id,
          ...data,
          payoutDate: data.payoutDate?.toDate() || new Date(),
          processedDate: data.processedDate?.toDate() || null
        });
      });

      return payoutHistory;
    } catch (error) {
      console.error('Error getting payout history:', error);
      return [];
    }
  }

  // Approve payout (admin function)
  static async approvePayout(payoutId, adminId, notes = '') {
    try {
      return await runTransaction(db, async (transaction) => {
        const payoutRef = doc(db, 'payouts', payoutId);
        const payoutDoc = await transaction.get(payoutRef);
        
        if (!payoutDoc.exists()) {
          throw new Error('Payout not found');
        }

        const payoutData = payoutDoc.data();
        
        if (payoutData.status !== 'pending') {
          throw new Error('Payout is not in pending status');
        }

        // Update payout status
        transaction.update(payoutRef, {
          status: 'approved',
          processedDate: serverTimestamp(),
          approvedBy: adminId,
          adminNotes: notes
        });

        // Update user's payout status
        const userRef = doc(db, 'users', payoutData.userId);
        transaction.update(userRef, {
          pendingPayout: 0,
          lastApprovedPayout: serverTimestamp()
        });

        // Update transaction status
        const transactionQuery = query(
          collection(db, 'payments'),
          where('payoutId', '==', payoutId)
        );
        const transactionSnapshot = await getDocs(transactionQuery);
        
        transactionSnapshot.docs.forEach((transactionDoc) => {
          transaction.update(transactionDoc.ref, {
            status: 'approved',
            processedDate: serverTimestamp()
          });
        });

        return { success: true, payoutId, amount: payoutData.amount };
      });
    } catch (error) {
      console.error('Error approving payout:', error);
      throw error;
    }
  }

  // Reject payout (admin function)
  static async rejectPayout(payoutId, adminId, reason) {
    try {
      return await runTransaction(db, async (transaction) => {
        const payoutRef = doc(db, 'payouts', payoutId);
        const payoutDoc = await transaction.get(payoutRef);
        
        if (!payoutDoc.exists()) {
          throw new Error('Payout not found');
        }

        const payoutData = payoutDoc.data();
        
        if (payoutData.status !== 'pending') {
          throw new Error('Payout is not in pending status');
        }

        // Update payout status
        transaction.update(payoutRef, {
          status: 'rejected',
          processedDate: serverTimestamp(),
          rejectedBy: adminId,
          rejectionReason: reason
        });

        // Restore user's balance
        const userRef = doc(db, 'users', payoutData.userId);
        transaction.update(userRef, {
          affiliateBalance: payoutData.originalAmount,
          pendingPayout: 0
        });

        // Update transaction status
        const transactionQuery = query(
          collection(db, 'payments'),
          where('payoutId', '==', payoutId)
        );
        const transactionSnapshot = await getDocs(transactionQuery);
        
        transactionSnapshot.docs.forEach((transactionDoc) => {
          transaction.update(transactionDoc.ref, {
            status: 'rejected',
            processedDate: serverTimestamp()
          });
        });

        return { success: true, payoutId, restoredAmount: payoutData.originalAmount };
      });
    } catch (error) {
      console.error('Error rejecting payout:', error);
      throw error;
    }
  }

  // Get pending payouts for admin
  static async getPendingPayouts(limitCount = 100) {
    try {
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('status', '==', 'pending'),
        orderBy('payoutDate', 'desc'),
        limit(limitCount)
      );

      const payoutsSnapshot = await getDocs(payoutsQuery);
      const pendingPayouts = [];

      for (const doc of payoutsSnapshot.docs) {
        const payoutData = doc.data();
        
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', payoutData.userId));
        const userData = userDoc.exists() ? userDoc.data() : {};

        pendingPayouts.push({
          id: doc.id,
          ...payoutData,
          payoutDate: payoutData.payoutDate?.toDate() || new Date(),
          userName: userData.name || 'Unknown',
          userEmail: userData.email || 'Unknown',
          userPhone: userData.phone || 'Unknown'
        });
      }

      return pendingPayouts;
    } catch (error) {
      console.error('Error getting pending payouts:', error);
      return [];
    }
  }

  // Get payout statistics
  static async getPayoutStatistics() {
    try {
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      // Get all payouts
      const allPayoutsSnapshot = await getDocs(collection(db, 'payouts'));
      
      let totalPayouts = 0;
      let totalAmount = 0;
      let pendingPayouts = 0;
      let pendingAmount = 0;
      let approvedPayouts = 0;
      let approvedAmount = 0;
      let monthlyPayouts = 0;
      let monthlyAmount = 0;

      allPayoutsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const payoutDate = data.payoutDate?.toDate();
        
        totalPayouts++;
        totalAmount += data.amount || 0;
        
        if (data.status === 'pending') {
          pendingPayouts++;
          pendingAmount += data.amount || 0;
        } else if (data.status === 'approved') {
          approvedPayouts++;
          approvedAmount += data.amount || 0;
        }
        
        // Monthly statistics
        if (payoutDate && 
            payoutDate.getMonth() === currentMonth && 
            payoutDate.getFullYear() === currentYear) {
          monthlyPayouts++;
          monthlyAmount += data.amount || 0;
        }
      });

      return {
        totalPayouts,
        totalAmount,
        pendingPayouts,
        pendingAmount,
        approvedPayouts,
        approvedAmount,
        monthlyPayouts,
        monthlyAmount,
        averagePayoutAmount: totalPayouts > 0 ? totalAmount / totalPayouts : 0
      };
    } catch (error) {
      console.error('Error getting payout statistics:', error);
      return {
        totalPayouts: 0,
        totalAmount: 0,
        pendingPayouts: 0,
        pendingAmount: 0,
        approvedPayouts: 0,
        approvedAmount: 0,
        monthlyPayouts: 0,
        monthlyAmount: 0,
        averagePayoutAmount: 0
      };
    }
  }

  // Get next payout date
  static getNextPayoutDate() {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let nextPayoutDate;
    
    if (currentDay < 1) {
      nextPayoutDate = new Date(currentYear, currentMonth, 1);
    } else if (currentDay < 11) {
      nextPayoutDate = new Date(currentYear, currentMonth, 11);
    } else if (currentDay < 21) {
      nextPayoutDate = new Date(currentYear, currentMonth, 21);
    } else {
      // Next month's 1st
      nextPayoutDate = new Date(currentYear, currentMonth + 1, 1);
    }
    
    return nextPayoutDate;
  }

  // Calculate days until next payout
  static getDaysUntilNextPayout() {
    const today = new Date();
    const nextPayout = this.getNextPayoutDate();
    const diffTime = nextPayout - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  // Get payout calendar for the year
  static getPayoutCalendar(year = new Date().getFullYear()) {
    const payoutDates = [];
    
    for (let month = 0; month < 12; month++) {
      // 1st of each month
      payoutDates.push(new Date(year, month, 1));
      // 11th of each month
      payoutDates.push(new Date(year, month, 11));
      // 21st of each month
      payoutDates.push(new Date(year, month, 21));
    }
    
    return payoutDates;
  }

  // Subscribe to payout updates
  static subscribeToPayoutUpdates(userId, callback) {
    const payoutsQuery = query(
      collection(db, 'payouts'),
      where('userId', '==', userId),
      orderBy('payoutDate', 'desc'),
      limit(20)
    );

    return onSnapshot(payoutsQuery, (snapshot) => {
      const payouts = [];
      snapshot.forEach((doc) => {
        payouts.push({
          id: doc.id,
          ...doc.data(),
          payoutDate: doc.data().payoutDate?.toDate() || new Date(),
          processedDate: doc.data().processedDate?.toDate() || null
        });
      });
      callback(payouts);
    });
  }

  // Bulk approve payouts (admin function)
  static async bulkApprovePayouts(payoutIds, adminId, notes = '') {
    try {
      const batch = writeBatch(db);
      const results = [];

      for (const payoutId of payoutIds) {
        const payoutRef = doc(db, 'payouts', payoutId);
        const payoutDoc = await getDoc(payoutRef);
        
        if (payoutDoc.exists() && payoutDoc.data().status === 'pending') {
          const payoutData = payoutDoc.data();
          
          // Update payout status
          batch.update(payoutRef, {
            status: 'approved',
            processedDate: serverTimestamp(),
            approvedBy: adminId,
            adminNotes: notes
          });

          // Update user's payout status
          const userRef = doc(db, 'users', payoutData.userId);
          batch.update(userRef, {
            pendingPayout: 0,
            lastApprovedPayout: serverTimestamp()
          });

          results.push({ payoutId, amount: payoutData.amount, status: 'approved' });
        } else {
          results.push({ payoutId, status: 'skipped', reason: 'Not found or not pending' });
        }
      }

      await batch.commit();
      return results;
    } catch (error) {
      console.error('Error bulk approving payouts:', error);
      throw error;
    }
  }

  // Generate payout report
  static async generatePayoutReport(startDate, endDate) {
    try {
      const payoutsQuery = query(
        collection(db, 'payouts'),
        where('payoutDate', '>=', startDate),
        where('payoutDate', '<=', endDate),
        orderBy('payoutDate', 'desc')
      );

      const payoutsSnapshot = await getDocs(payoutsQuery);
      const reportData = [];
      let totalAmount = 0;
      let totalDeductions = 0;

      for (const doc of payoutsSnapshot.docs) {
        const payoutData = doc.data();
        
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', payoutData.userId));
        const userData = userDoc.exists() ? userDoc.data() : {};

        const record = {
          payoutId: doc.id,
          userId: payoutData.userId,
          userName: userData.name || 'Unknown',
          userEmail: userData.email || 'Unknown',
          amount: payoutData.amount || 0,
          originalAmount: payoutData.originalAmount || 0,
          deductionAmount: payoutData.deductionAmount || 0,
          status: payoutData.status,
          payoutDate: payoutData.payoutDate?.toDate() || new Date(),
          processedDate: payoutData.processedDate?.toDate() || null,
          payoutCycle: payoutData.payoutCycle
        };

        reportData.push(record);
        totalAmount += record.amount;
        totalDeductions += record.deductionAmount;
      }

      return {
        reportData,
        summary: {
          totalPayouts: reportData.length,
          totalAmount,
          totalDeductions,
          totalOriginalAmount: totalAmount + totalDeductions,
          averagePayoutAmount: reportData.length > 0 ? totalAmount / reportData.length : 0,
          period: {
            startDate,
            endDate
          }
        }
      };
    } catch (error) {
      console.error('Error generating payout report:', error);
      throw error;
    }
  }
}

export default PayoutService;
