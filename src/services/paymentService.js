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
  increment
} from 'firebase/firestore';
import { app } from '../Firebase/firebase';

const db = getFirestore(app);

// Payment Service Class
export class PaymentService {
  
  // Get user's payment dashboard data
  static async getUserPaymentData(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();
      
      // Get transactions
      const transactions = await this.getUserTransactions(userId);
      
      // Get bank accounts
      const bankAccounts = await this.getUserBankAccounts(userId);
      
      // Get withdrawal requests
      const withdrawalRequests = await this.getWithdrawalRequests(userId);
      
      // Calculate analytics data
      const analyticsData = await this.calculateAnalytics(userId, transactions);

      return {
        balance: userData.affiliateBalance || 0,
        pending: userData.pendingEarnings || 0,
        lifetimeEarnings: userData.totalEarnings || 0,
        transactions,
        bankAccounts,
        withdrawalRequests,
        analytics: analyticsData
      };
    } catch (error) {
      console.error('Error fetching payment data:', error);
      throw error;
    }
  }

  // Get user transactions
  static async getUserTransactions(userId, limitCount = 50) {
    try {
      const transactionsRef = collection(db, 'payments');
      const q = query(
        transactionsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const transactions = [];
      
      querySnapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.toDate() || new Date()
        });
      });
      
      return transactions;
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  // Get user bank accounts
  static async getUserBankAccounts(userId) {
    try {
      const bankAccountsRef = collection(db, 'bankAccounts');
      const q = query(
        bankAccountsRef,
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const bankAccounts = [];
      
      querySnapshot.forEach((doc) => {
        bankAccounts.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return bankAccounts;
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }
  }

  // Add bank account
  static async addBankAccount(userId, bankAccountData) {
    try {
      const bankAccountsRef = collection(db, 'bankAccounts');
      const docRef = await addDoc(bankAccountsRef, {
        userId,
        ...bankAccountData,
        createdAt: serverTimestamp(),
        isActive: true
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw error;
    }
  }

  // Update bank account
  static async updateBankAccount(accountId, updateData) {
    try {
      const accountRef = doc(db, 'bankAccounts', accountId);
      await updateDoc(accountRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw error;
    }
  }

  // Delete bank account
  static async deleteBankAccount(accountId) {
    try {
      const accountRef = doc(db, 'bankAccounts', accountId);
      await updateDoc(accountRef, {
        isActive: false,
        deletedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw error;
    }
  }

  // Submit withdrawal request
  static async submitWithdrawalRequest(userId, withdrawalData) {
    try {
      // Validate withdrawal amount
      const userDoc = await getDoc(doc(db, 'users', userId));
      const userData = userDoc.data();
      const availableBalance = userData.affiliateBalance || 0;
      
      if (withdrawalData.amount > availableBalance) {
        throw new Error('Insufficient balance');
      }

      if (withdrawalData.amount < 10) {
        throw new Error('Minimum withdrawal amount is $10');
      }

      // Create withdrawal request
      const withdrawalRef = collection(db, 'withdrawalRequests');
      const docRef = await addDoc(withdrawalRef, {
        userId,
        amount: withdrawalData.amount,
        bankAccountId: withdrawalData.bankAccountId,
        status: 'pending',
        requestedAt: serverTimestamp(),
        processedAt: null,
        notes: withdrawalData.notes || ''
      });

      // Update user's pending balance
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        affiliateBalance: increment(-withdrawalData.amount),
        pendingEarnings: increment(withdrawalData.amount)
      });

      // Create transaction record
      await this.createTransaction(userId, {
        type: 'withdrawal_request',
        amount: withdrawalData.amount,
        status: 'pending',
        description: 'Withdrawal request submitted',
        relatedId: docRef.id
      });

      return docRef.id;
    } catch (error) {
      console.error('Error submitting withdrawal request:', error);
      throw error;
    }
  }

  // Get withdrawal requests
  static async getWithdrawalRequests(userId) {
    try {
      const withdrawalRef = collection(db, 'withdrawalRequests');
      const q = query(
        withdrawalRef,
        where('userId', '==', userId),
        orderBy('requestedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const withdrawals = [];
      
      querySnapshot.forEach((doc) => {
        withdrawals.push({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate() || new Date(),
          processedAt: doc.data().processedAt?.toDate() || null
        });
      });
      
      return withdrawals;
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      return [];
    }
  }

  // Create transaction record
  static async createTransaction(userId, transactionData) {
    try {
      const transactionsRef = collection(db, 'payments');
      const docRef = await addDoc(transactionsRef, {
        userId,
        ...transactionData,
        createdAt: serverTimestamp()
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw error;
    }
  }

  // Add commission/earnings
  static async addEarnings(userId, earningsData) {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Update user earnings
      await updateDoc(userRef, {
        affiliateBalance: increment(earningsData.amount),
        totalEarnings: increment(earningsData.amount),
        [`earnings.${earningsData.type}`]: increment(earningsData.amount)
      });

      // Create transaction record
      await this.createTransaction(userId, {
        type: earningsData.type,
        amount: earningsData.amount,
        status: 'completed',
        description: earningsData.description,
        source: earningsData.source || 'system'
      });

    } catch (error) {
      console.error('Error adding earnings:', error);
      throw error;
    }
  }

  // Calculate analytics data
  static async calculateAnalytics(userId, transactions) {
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      
      // Initialize data arrays
      const monthlyData = new Array(12).fill(0);
      const weeklyData = new Array(7).fill(0);
      const yearlyData = new Array(7).fill(0);
      
      // Process transactions for analytics
      transactions.forEach(transaction => {
        if (transaction.status === 'completed' && transaction.amount > 0) {
          const transactionDate = new Date(transaction.date);
          const transactionYear = transactionDate.getFullYear();
          const transactionMonth = transactionDate.getMonth();
          
          // Monthly data (current year)
          if (transactionYear === currentYear) {
            monthlyData[transactionMonth] += transaction.amount;
          }
          
          // Weekly data (last 7 weeks)
          const weeksDiff = Math.floor((now - transactionDate) / (7 * 24 * 60 * 60 * 1000));
          if (weeksDiff >= 0 && weeksDiff < 7) {
            weeklyData[6 - weeksDiff] += transaction.amount;
          }
          
          // Yearly data (last 7 years)
          const yearsDiff = currentYear - transactionYear;
          if (yearsDiff >= 0 && yearsDiff < 7) {
            yearlyData[6 - yearsDiff] += transaction.amount;
          }
        }
      });

      // Calculate earnings breakdown
      const earningsBreakdown = {
        commissions: 0,
        bonuses: 0,
        teamOverrides: 0,
        leadershipBonus: 0
      };

      transactions.forEach(transaction => {
        if (transaction.status === 'completed' && transaction.amount > 0) {
          switch (transaction.type) {
            case 'commission':
              earningsBreakdown.commissions += transaction.amount;
              break;
            case 'bonus':
              earningsBreakdown.bonuses += transaction.amount;
              break;
            case 'team_override':
              earningsBreakdown.teamOverrides += transaction.amount;
              break;
            case 'leadership_bonus':
              earningsBreakdown.leadershipBonus += transaction.amount;
              break;
          }
        }
      });

      return {
        monthlyData,
        weeklyData,
        yearlyData,
        earningsBreakdown
      };
    } catch (error) {
      console.error('Error calculating analytics:', error);
      return {
        monthlyData: new Array(12).fill(0),
        weeklyData: new Array(7).fill(0),
        yearlyData: new Array(7).fill(0),
        earningsBreakdown: {
          commissions: 0,
          bonuses: 0,
          teamOverrides: 0,
          leadershipBonus: 0
        }
      };
    }
  }

  // Real-time payment data listener
  static subscribeToPaymentData(userId, callback) {
    const unsubscribers = [];

    // Subscribe to user data changes
    const userRef = doc(db, 'users', userId);
    const unsubscribeUser = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        callback('user', doc.data());
      }
    });
    unsubscribers.push(unsubscribeUser);

    // Subscribe to transactions
    const transactionsRef = collection(db, 'payments');
    const transactionsQuery = query(
      transactionsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (snapshot) => {
      const transactions = [];
      snapshot.forEach((doc) => {
        transactions.push({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.toDate() || new Date()
        });
      });
      callback('transactions', transactions);
    });
    unsubscribers.push(unsubscribeTransactions);

    // Subscribe to withdrawal requests
    const withdrawalRef = collection(db, 'withdrawalRequests');
    const withdrawalQuery = query(
      withdrawalRef,
      where('userId', '==', userId),
      orderBy('requestedAt', 'desc')
    );
    const unsubscribeWithdrawals = onSnapshot(withdrawalQuery, (snapshot) => {
      const withdrawals = [];
      snapshot.forEach((doc) => {
        withdrawals.push({
          id: doc.id,
          ...doc.data(),
          requestedAt: doc.data().requestedAt?.toDate() || new Date(),
          processedAt: doc.data().processedAt?.toDate() || null
        });
      });
      callback('withdrawals', withdrawals);
    });
    unsubscribers.push(unsubscribeWithdrawals);

    // Return cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }
}

export default PaymentService;
