import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
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
  runTransaction
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
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        try {
          const transactionsRef = collection(db, 'payments');
          const simpleQuery = query(
            transactionsRef,
            where('userId', '==', userId),
            limit(limitCount)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          const transactions = [];
          
          simpleSnapshot.forEach((doc) => {
            transactions.push({
              id: doc.id,
              ...doc.data(),
              date: doc.data().createdAt?.toDate() || new Date()
            });
          });
          
          // Sort manually since we can't use orderBy
          transactions.sort((a, b) => {
            const dateA = a.date || new Date(0);
            const dateB = b.date || new Date(0);
            return dateB - dateA;
          });
          
          return transactions;
        } catch (simpleError) {
          return [];
        }
      }
      
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
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        try {
          const bankAccountsRef = collection(db, 'bankAccounts');
          const simpleQuery = query(
            bankAccountsRef,
            where('userId', '==', userId)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          const bankAccounts = [];
          
          simpleSnapshot.forEach((doc) => {
            bankAccounts.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          // Sort manually since we can't use orderBy
          bankAccounts.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date(0);
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt) || new Date(0);
            return dateB - dateA;
          });
          
          return bankAccounts;
        } catch (simpleError) {
          return [];
        }
      }
      
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
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        try {
          const withdrawalRef = collection(db, 'withdrawalRequests');
          const simpleQuery = query(
            withdrawalRef,
            where('userId', '==', userId)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          const withdrawals = [];
          
          simpleSnapshot.forEach((doc) => {
            withdrawals.push({
              id: doc.id,
              ...doc.data(),
              requestedAt: doc.data().requestedAt?.toDate() || new Date(),
              processedAt: doc.data().processedAt?.toDate() || null
            });
          });
          
          // Sort manually since we can't use orderBy
          withdrawals.sort((a, b) => {
            const dateA = a.requestedAt?.toDate?.() || new Date(a.requestedAt) || new Date(0);
            const dateB = b.requestedAt?.toDate?.() || new Date(b.requestedAt) || new Date(0);
            return dateB - dateA;
          });
          
          return withdrawals;
        } catch (simpleError) {
          return [];
        }
      }
      
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
    }, (error) => {
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        const simpleQuery = query(
          transactionsRef,
          where('userId', '==', userId),
          limit(50)
        );
        
        const simpleUnsubscribe = onSnapshot(simpleQuery, (snapshot) => {
          const transactions = [];
          snapshot.forEach((doc) => {
            transactions.push({
              id: doc.id,
              ...doc.data(),
              date: doc.data().createdAt?.toDate() || new Date()
            });
          });
          // Sort manually
          transactions.sort((a, b) => {
            const dateA = a.date || new Date(0);
            const dateB = b.date || new Date(0);
            return dateB - dateA;
          });
          callback('transactions', transactions);
        }, (simpleError) => {
          // Error with simple transactions query
        });
        
        unsubscribers.push(simpleUnsubscribe);
      }
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
    }, (error) => {
      // If it's an index error, try without orderBy
      if (error.code === 'failed-precondition') {
        const simpleQuery = query(
          withdrawalRef,
          where('userId', '==', userId)
        );
        
        const simpleUnsubscribe = onSnapshot(simpleQuery, (snapshot) => {
          const withdrawals = [];
          snapshot.forEach((doc) => {
            withdrawals.push({
              id: doc.id,
              ...doc.data(),
              requestedAt: doc.data().requestedAt?.toDate() || new Date(),
              processedAt: doc.data().processedAt?.toDate() || null
            });
          });
          // Sort manually
          withdrawals.sort((a, b) => {
            const dateA = a.requestedAt || new Date(0);
            const dateB = b.requestedAt || new Date(0);
            return dateB - dateA;
          });
          callback('withdrawals', withdrawals);
        }, (simpleError) => {
          // Error with simple withdrawal requests query
        });
        
        unsubscribers.push(simpleUnsubscribe);
      }
    });
    unsubscribers.push(unsubscribeWithdrawals);

    // Return cleanup function
    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }

  // Payment Request Management for Offline Payments

  // Submit offline payment request (₹1500 joining amount)
  static async submitOfflinePaymentRequest(userId, paymentData) {
    try {
      const paymentRequestData = {
        userId,
        amount: 1500, // Fixed joining amount
        paymentMethod: 'offline',
        paymentProof: paymentData.paymentProof, // Image/document URL
        transactionId: paymentData.transactionId || '',
        paymentDate: paymentData.paymentDate || new Date(),
        bankDetails: paymentData.bankDetails || '',
        remarks: paymentData.remarks || '',
        status: 'pending', // pending, approved, rejected
        submittedAt: serverTimestamp(),
        processedAt: null,
        processedBy: null,
        adminRemarks: '',
        type: 'affiliate_joining'
      };

      const docRef = await addDoc(collection(db, 'paymentRequests'), paymentRequestData);

      // Update user's payment request status
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        paymentRequestId: docRef.id,
        paymentRequestStatus: 'pending',
        paymentRequestSubmittedAt: serverTimestamp()
      });

      return docRef.id;
    } catch (error) {
      throw error;
    }
  }

  // Get user's payment request status
  static async getUserPaymentRequest(userId) {
    try {
      const paymentRequestsRef = collection(db, 'paymentRequests');
      const q = query(
        paymentRequestsRef,
        where('userId', '==', userId),
        where('type', '==', 'affiliate_joining'),
        orderBy('submittedAt', 'desc'),
        limit(1)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return null;
      }

      const docSnapshot = querySnapshot.docs[0];
      return {
        id: docSnapshot.id,
        ...docSnapshot.data(),
        submittedAt: docSnapshot.data().submittedAt?.toDate() || new Date(),
        processedAt: docSnapshot.data().processedAt?.toDate() || null
      };
    } catch (error) {
      return null;
    }
  }

  // Admin: Get all pending payment requests
  static async getPendingPaymentRequests(limitCount = 50) {
    try {
      const paymentRequestsRef = collection(db, 'paymentRequests');
      const q = query(
        paymentRequestsRef,
        where('status', '==', 'pending'),
        where('type', '==', 'affiliate_joining'),
        orderBy('submittedAt', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const requests = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const requestData = docSnapshot.data();
        
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', requestData.userId));
        const userData = userDoc.exists() ? userDoc.data() : {};

        requests.push({
          id: docSnapshot.id,
          ...requestData,
          submittedAt: requestData.submittedAt?.toDate() || new Date(),
          userName: userData.name || 'Unknown',
          userEmail: userData.email || 'Unknown',
          userPhone: userData.phone || 'Unknown',
          referralCode: userData.referralCode || 'Unknown'
        });
      }
      
      return requests;
    } catch (error) {
      return [];
    }
  }

  // Admin: Get all payment requests with filters
  static async getAllPaymentRequests(status = 'all', limitCount = 100) {
    try {
      const paymentRequestsRef = collection(db, 'paymentRequests');
      let q;
      
      if (status === 'all') {
        q = query(
          paymentRequestsRef,
          orderBy('submittedAt', 'desc'),
          limit(limitCount)
        );
      } else {
        q = query(
          paymentRequestsRef,
          where('status', '==', status),
          orderBy('submittedAt', 'desc'),
          limit(limitCount)
        );
      }
      
      const querySnapshot = await getDocs(q);
      const requests = [];
      
      for (const docSnapshot of querySnapshot.docs) {
        const requestData = docSnapshot.data();
        
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', requestData.userId));
        const userData = userDoc.exists() ? userDoc.data() : {};

        requests.push({
          id: docSnapshot.id,
          ...requestData,
          submittedAt: requestData.submittedAt?.toDate() || new Date(),
          processedAt: requestData.processedAt?.toDate() || null,
          userName: userData.name || 'Unknown',
          userEmail: userData.email || 'Unknown',
          userPhone: userData.phone || 'Unknown',
          referralCode: userData.referralCode || 'Unknown'
        });
      }
      
      return requests;
    } catch (error) {
      return [];
    }
  }

  // Admin: Approve payment request
  static async approvePaymentRequest(requestId, adminId, adminRemarks = '') {
    try {
      return await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, 'paymentRequests', requestId);
        const requestDoc = await transaction.get(requestRef);
        
        if (!requestDoc.exists()) {
          throw new Error('Payment request not found');
        }

        const requestData = requestDoc.data();
        
        if (requestData.status !== 'pending') {
          throw new Error('Payment request is not in pending status');
        }

        // Update payment request status
        transaction.update(requestRef, {
          status: 'approved',
          processedAt: serverTimestamp(),
          processedBy: adminId,
          adminRemarks: adminRemarks
        });

        // Update user's affiliate status and register in MLM
        const userRef = doc(db, 'users', requestData.userId);
        transaction.update(userRef, {
          affiliateStatus: true,
          paymentRequestStatus: 'approved',
          affiliateJoinDate: serverTimestamp(),
          joiningAmount: 1500,
          paymentApprovedBy: adminId,
          paymentApprovedAt: serverTimestamp()
        });

        // Create transaction record
        const transactionData = {
          userId: requestData.userId,
          type: 'affiliate_joining_payment',
          amount: 1500,
          status: 'approved',
          description: 'Affiliate joining payment approved',
          paymentRequestId: requestId,
          approvedBy: adminId,
          createdAt: serverTimestamp()
        };

        const transactionRef = doc(collection(db, 'payments'));
        transaction.set(transactionRef, transactionData);

        return { 
          success: true, 
          requestId, 
          userId: requestData.userId,
          amount: requestData.amount 
        };
      });
    } catch (error) {
      throw error;
    }
  }

  // Admin: Reject payment request
  static async rejectPaymentRequest(requestId, adminId, rejectionReason) {
    try {
      return await runTransaction(db, async (transaction) => {
        const requestRef = doc(db, 'paymentRequests', requestId);
        const requestDoc = await transaction.get(requestRef);
        
        if (!requestDoc.exists()) {
          throw new Error('Payment request not found');
        }

        const requestData = requestDoc.data();
        
        if (requestData.status !== 'pending') {
          throw new Error('Payment request is not in pending status');
        }

        // Update payment request status
        transaction.update(requestRef, {
          status: 'rejected',
          processedAt: serverTimestamp(),
          processedBy: adminId,
          adminRemarks: rejectionReason
        });

        // Update user's payment request status
        const userRef = doc(db, 'users', requestData.userId);
        transaction.update(userRef, {
          paymentRequestStatus: 'rejected',
          affiliateStatus: false,
          rejectionReason: rejectionReason,
          rejectedBy: adminId,
          rejectedAt: serverTimestamp()
        });

        // Create transaction record
        const transactionData = {
          userId: requestData.userId,
          type: 'affiliate_joining_payment',
          amount: 1500,
          status: 'rejected',
          description: `Affiliate joining payment rejected: ${rejectionReason}`,
          paymentRequestId: requestId,
          rejectedBy: adminId,
          createdAt: serverTimestamp()
        };

        const transactionRef = doc(collection(db, 'payments'));
        transaction.set(transactionRef, transactionData);

        return { 
          success: true, 
          requestId, 
          userId: requestData.userId,
          rejectionReason 
        };
      });
    } catch (error) {
      throw error;
    }
  }

  // Admin: Bulk approve payment requests
  static async bulkApprovePaymentRequests(requestIds, adminId, adminRemarks = '') {
    try {
      const results = [];
      
      for (const requestId of requestIds) {
        try {
          const result = await this.approvePaymentRequest(requestId, adminId, adminRemarks);
          results.push({ ...result, status: 'success' });
        } catch (error) {
          results.push({ 
            requestId, 
            status: 'error', 
            error: error.message 
          });
        }
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Admin: Bulk reject payment requests
  static async bulkRejectPaymentRequests(requestIds, adminId, rejectionReason) {
    try {
      const results = [];
      
      for (const requestId of requestIds) {
        try {
          const result = await this.rejectPaymentRequest(requestId, adminId, rejectionReason);
          results.push({ ...result, status: 'success' });
        } catch (error) {
          results.push({ 
            requestId, 
            status: 'error', 
            error: error.message 
          });
        }
      }
      
      return results;
    } catch (error) {
      throw error;
    }
  }

  // Subscribe to payment request updates
  static subscribeToPaymentRequestUpdates(userId, callback) {
    const paymentRequestsRef = collection(db, 'paymentRequests');
    const q = query(
      paymentRequestsRef,
      where('userId', '==', userId),
      where('type', '==', 'affiliate_joining'),
      orderBy('submittedAt', 'desc'),
      limit(1)
    );

    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnapshot = snapshot.docs[0];
        const data = {
          id: docSnapshot.id,
          ...docSnapshot.data(),
          submittedAt: docSnapshot.data().submittedAt?.toDate() || new Date(),
          processedAt: docSnapshot.data().processedAt?.toDate() || null
        };
        callback(data);
      } else {
        callback(null);
      }
    });
  }

  // Admin: Subscribe to all payment request updates
  static subscribeToAllPaymentRequests(callback) {
    const paymentRequestsRef = collection(db, 'paymentRequests');
    const q = query(
      paymentRequestsRef,
      where('type', '==', 'affiliate_joining'),
      orderBy('submittedAt', 'desc'),
      limit(50)
    );

    return onSnapshot(q, async (snapshot) => {
      const requests = [];
      
      for (const docSnapshot of snapshot.docs) {
        const requestData = docSnapshot.data();
        
        // Get user details
        const userDoc = await getDoc(doc(db, 'users', requestData.userId));
        const userData = userDoc.exists() ? userDoc.data() : {};

        requests.push({
          id: docSnapshot.id,
          ...requestData,
          submittedAt: requestData.submittedAt?.toDate() || new Date(),
          processedAt: requestData.processedAt?.toDate() || null,
          userName: userData.name || 'Unknown',
          userEmail: userData.email || 'Unknown',
          userPhone: userData.phone || 'Unknown',
          referralCode: userData.referralCode || 'Unknown'
        });
      }
      
      callback(requests);
    });
  }

  // Admin: Get payment request statistics
  static async getPaymentRequestStatistics() {
    try {
      const paymentRequestsRef = collection(db, 'paymentRequests');
      const q = query(paymentRequestsRef);
      const querySnapshot = await getDocs(q);
      let totalRequests = 0;
      let pendingRequests = 0;
      let approvedRequests = 0;
      let rejectedRequests = 0;
      let totalAmount = 0;
      let approvedAmount = 0;
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalRequests++;
        totalAmount += data.amount || 0;
        if (data.status === 'pending') pendingRequests++;
        if (data.status === 'approved') {
          approvedRequests++;
          approvedAmount += data.amount || 0;
        }
        if (data.status === 'rejected') rejectedRequests++;
      });
      return {
        totalRequests,
        pendingRequests,
        approvedRequests,
        rejectedRequests,
        totalAmount,
        approvedAmount
      };
    } catch (error) {
      return {
        totalRequests: 0,
        pendingRequests: 0,
        approvedRequests: 0,
        rejectedRequests: 0,
        totalAmount: 0,
        approvedAmount: 0
      };
    }
  }

  // Admin: Delete payment request
  static async deletePaymentRequest(requestId) {
    try {
      const requestRef = doc(db, 'paymentRequests', requestId);
      const requestDoc = await getDoc(requestRef);
      
      if (!requestDoc.exists()) {
        throw new Error('Payment request not found');
      }

      const requestData = requestDoc.data();
      
      // Delete the payment request document
      await deleteDoc(requestRef);
      

      
      return {
        success: true,
        message: 'Payment request deleted successfully'
      };
    } catch (error) {
      throw error;
    }
  }
}

export default PaymentService;
