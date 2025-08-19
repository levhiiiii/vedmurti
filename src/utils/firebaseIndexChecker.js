import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { app } from '../Firebase/firebase';

const db = getFirestore(app);

export class FirebaseIndexChecker {
  static async checkIndexStatus() {
    const results = {
      bankAccounts: false,
      payments: false,
      withdrawalRequests: false,
      paymentRequests: false,
      incomeRecords: false
    };

    try {
      // Test bank accounts index
      try {
        const bankAccountsRef = collection(db, 'bankAccounts');
        const bankQuery = query(
          bankAccountsRef,
          where('userId', '==', 'test'),
          orderBy('createdAt', 'desc')
        );
        await getDocs(bankQuery);
        results.bankAccounts = true;
      } catch (error) {
        // Bank accounts index not ready
      }

      // Test payments index
      try {
        const paymentsRef = collection(db, 'payments');
        const paymentsQuery = query(
          paymentsRef,
          where('userId', '==', 'test'),
          orderBy('createdAt', 'desc')
        );
        await getDocs(paymentsQuery);
        results.payments = true;
      } catch (error) {
        // Payments index not ready
      }

      // Test withdrawal requests index
      try {
        const withdrawalRef = collection(db, 'withdrawalRequests');
        const withdrawalQuery = query(
          withdrawalRef,
          where('userId', '==', 'test'),
          orderBy('requestedAt', 'desc')
        );
        await getDocs(withdrawalQuery);
        results.withdrawalRequests = true;
      } catch (error) {
        // Withdrawal requests index not ready
      }

      // Test payment requests index
      try {
        const paymentRequestsRef = collection(db, 'paymentRequests');
        const paymentRequestsQuery = query(
          paymentRequestsRef,
          where('status', '==', 'pending'),
          orderBy('submittedAt', 'desc')
        );
        await getDocs(paymentRequestsQuery);
        results.paymentRequests = true;
      } catch (error) {
        // Payment requests index not ready
      }

      // Test income records index
      try {
        const incomeRecordsRef = collection(db, 'incomeRecords');
        const incomeRecordsQuery = query(
          incomeRecordsRef,
          where('userId', '==', 'test'),
          orderBy('createdAt', 'desc')
        );
        await getDocs(incomeRecordsQuery);
        results.incomeRecords = true;
      } catch (error) {
        // Income records index not ready
      }

      return results;
    } catch (error) {
      return results;
    }
  }

  static getIndexStatusMessage(results) {
    const readyIndexes = Object.values(results).filter(Boolean).length;
    const totalIndexes = Object.keys(results).length;
    
    if (readyIndexes === totalIndexes) {
      return {
        status: 'success',
        message: 'All Firebase indexes are ready! 🎉',
        details: 'Your application should work optimally now.'
      };
    } else if (readyIndexes > 0) {
      return {
        status: 'warning',
        message: `${readyIndexes}/${totalIndexes} indexes are ready`,
        details: 'Some features may have degraded performance. Check the console for specific index errors.'
      };
    } else {
      return {
        status: 'error',
        message: 'No Firebase indexes are ready',
        details: 'Please create the required indexes. Check FIREBASE_INDEX_SETUP.md for instructions.'
      };
    }
  }

  static logIndexStatus() {
    // Index status logging disabled
  }
} 