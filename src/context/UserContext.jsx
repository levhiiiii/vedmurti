// context/UserContext.jsx
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateEmail,
  updatePassword,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc,
  updateDoc,
  increment,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createContext, useContext, useState, useEffect } from 'react';
import { app } from '../Firebase/firebase';
import PaymentService from '../services/paymentService';

const USER_STORAGE_KEY = 'currentUser';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState(null);
  const [paymentLoading, setPaymentLoading] = useState(false);



  // Load user from localStorage on initial render
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_STORAGE_KEY);
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse stored user', error);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
    }
  }, []);

  // Main auth state listener
  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore(app);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = {
            uid: user.uid,
            ...userDoc.data()
          };
          setCurrentUser(userData);
          // Save to localStorage including profilePic
          localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
        }
      } else {
        setCurrentUser(null);
        localStorage.removeItem(USER_STORAGE_KEY);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const registerUser = async (userData) => {
    const auth = getAuth();
    const db = getFirestore(app);
    const storage = getStorage(app);

    const { email, password, name, profilePic, referralCode, ...otherData } = userData;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      let profilePicUrl = '';
      if (profilePic) {
        const storageRef = ref(storage, `profilePics/${userCredential.user.uid}/${profilePic.name}`);
        await uploadBytes(storageRef, profilePic);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      const userId = generateUserId();
      const userReferralCode = generateReferralCode(name, userId);

      let referredBy = referralCode;
      if (referredBy) {
        const referringUser = await getUserByReferralCode(db, referredBy);
        if (!referringUser) referredBy = null;
      }

      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocData = {
        userId,
        name,
        email,
        profilePic: profilePicUrl,
        referralCode: userReferralCode,
        referredBy,
        affiliateStatus: false,
        affiliateBalance: 0,
        referralCount: 0,
        totalEarnings: 0,
        affiliateEarnings: [],
        createdAt: new Date(),
        role: 'user',
        ...otherData
      };

      await setDoc(userDocRef, userDocData);

      if (referredBy) {
        await updateReferralCount(db, referredBy);
        // Recursively set downline slot for the referrer or their downlines
        const slotResult = await findAvailableDownlineSlot(db, referredBy);
        if (slotResult) {
          await updateDoc(slotResult.docRef, { [slotResult.slot]: userReferralCode });
        }
      }

      // Update state and localStorage
      const completeUserData = {
        uid: userCredential.user.uid,
        ...userDocData
      };
      setCurrentUser(completeUserData);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(completeUserData));

      return completeUserData;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updateData) => {
    if (!currentUser) throw new Error('No user logged in');
    
    const auth = getAuth();
    const db = getFirestore(app);
    const storage = getStorage(app);
    const user = auth.currentUser;

    try {
      // Handle profile picture update if included
      let profilePicUrl = currentUser.profilePic;
      if (updateData.profilePic) {
        const storageRef = ref(storage, `profilePics/${user.uid}/${updateData.profilePic.name}`);
        await uploadBytes(storageRef, updateData.profilePic);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      // Update email if changed
      if (updateData.email && updateData.email !== currentUser.email) {
        await updateEmail(user, updateData.email);
      }

      // Update password if provided
      if (updateData.newPassword) {
        await updatePassword(user, updateData.newPassword);
      }

      // Prepare update data for Firestore
      const updateDocData = {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.email && { email: updateData.email }),
        ...(updateData.phone && { phone: updateData.phone }),
        ...(profilePicUrl && { profilePic: profilePicUrl }),
        updatedAt: new Date()
      };

      // Update Firestore document
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, updateDocData);

      // Get updated user data
      const userDoc = await getDoc(userDocRef);
      const updatedUser = {
        uid: user.uid,
        ...userDoc.data()
      };

      // Update state and localStorage
      setCurrentUser(updatedUser);
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));

      return updatedUser;
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  // Helper functions
  const generateUserId = () => Math.floor(100000 + Math.random() * 900000).toString();

  const generateReferralCode = (name, userId) => {
    const namePart = name.substring(0, 3).toUpperCase();
    const randomPart = Math.floor(100 + Math.random() * 900);
    return `${namePart}${randomPart}${userId.substring(0, 2)}`;
  };

  const getUserByReferralCode = async (db, referralCode) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referralCode));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs[0]?.data();
  };

  const updateReferralCount = async (db, referralCode) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referralCode));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const docRef = doc(db, 'users', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        referralCount: increment(1),
      });
    }
  };

  // Recursively find the first available downline slot in the tree
  const findAvailableDownlineSlot = async (db, referralCode) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('referralCode', '==', referralCode));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    if (!userData.leftDownLine) {
      return { docRef: doc(db, 'users', userDoc.id), slot: 'leftDownLine' };
    } else if (!userData.rightDownLine) {
      return { docRef: doc(db, 'users', userDoc.id), slot: 'rightDownLine' };
    } else {
      // Recursively check left, then right
      const leftResult = await findAvailableDownlineSlot(db, userData.leftDownLine);
      if (leftResult) return leftResult;
      return await findAvailableDownlineSlot(db, userData.rightDownLine);
    }
  };

  const logout = async () => {
    const auth = getAuth();
    await auth.signOut();
    setCurrentUser(null);
    setPaymentData(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  // Payment-related functions
  const loadPaymentData = async () => {
    if (!currentUser?.uid) return;
    
    setPaymentLoading(true);
    try {
      const data = await PaymentService.getUserPaymentData(currentUser.uid);
      setPaymentData(data);
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setPaymentLoading(false);
    }
  };

  const addBankAccount = async (bankAccountData) => {
    if (!currentUser?.uid) throw new Error('No user logged in');
    
    try {
      const accountId = await PaymentService.addBankAccount(currentUser.uid, bankAccountData);
      await loadPaymentData(); // Refresh payment data
      return accountId;
    } catch (error) {
      console.error('Error adding bank account:', error);
      throw error;
    }
  };

  const updateBankAccount = async (accountId, updateData) => {
    try {
      await PaymentService.updateBankAccount(accountId, updateData);
      await loadPaymentData(); // Refresh payment data
    } catch (error) {
      console.error('Error updating bank account:', error);
      throw error;
    }
  };

  const deleteBankAccount = async (accountId) => {
    try {
      await PaymentService.deleteBankAccount(accountId);
      await loadPaymentData(); // Refresh payment data
    } catch (error) {
      console.error('Error deleting bank account:', error);
      throw error;
    }
  };

  const submitWithdrawalRequest = async (withdrawalData) => {
    if (!currentUser?.uid) throw new Error('No user logged in');
    
    try {
      const requestId = await PaymentService.submitWithdrawalRequest(currentUser.uid, withdrawalData);
      await loadPaymentData(); // Refresh payment data
      return requestId;
    } catch (error) {
      console.error('Error submitting withdrawal request:', error);
      throw error;
    }
  };

  const addEarnings = async (earningsData) => {
    if (!currentUser?.uid) throw new Error('No user logged in');
    
    try {
      await PaymentService.addEarnings(currentUser.uid, earningsData);
      await loadPaymentData(); // Refresh payment data
    } catch (error) {
      console.error('Error adding earnings:', error);
      throw error;
    }
  };

  // Payment Request Functions
  const submitPaymentRequest = async (paymentData) => {
    if (!currentUser?.uid) throw new Error('No user logged in');
    
    try {
      const requestId = await PaymentService.submitOfflinePaymentRequest(currentUser.uid, paymentData);
      
      // Update current user state
      setCurrentUser(prev => ({
        ...prev,
        paymentRequestId: requestId,
        paymentRequestStatus: 'pending',
        paymentRequestSubmittedAt: new Date()
      }));
      
      return requestId;
    } catch (error) {
      console.error('Error submitting payment request:', error);
      throw error;
    }
  };

  const getUserPaymentRequest = async () => {
    if (!currentUser?.uid) return null;
    
    try {
      return await PaymentService.getUserPaymentRequest(currentUser.uid);
    } catch (error) {
      console.error('Error getting payment request:', error);
      return null;
    }
  };

  // Load payment data when user changes
  useEffect(() => {
    if (currentUser?.uid && currentUser.affiliateStatus) {
      loadPaymentData();
    } else {
      setPaymentData(null);
    }
  }, [currentUser?.uid, currentUser?.affiliateStatus]);

  // Set up real-time payment data listener
  useEffect(() => {
    if (!currentUser?.uid || !currentUser.affiliateStatus) return;

    const unsubscribe = PaymentService.subscribeToPaymentData(
      currentUser.uid,
      (dataType, data) => {
        setPaymentData(prevData => {
          if (!prevData) return prevData;
          
          switch (dataType) {
            case 'user':
              return {
                ...prevData,
                balance: data.affiliateBalance || 0,
                pending: data.pendingEarnings || 0,
                lifetimeEarnings: data.totalEarnings || 0
              };
            case 'transactions':
              return {
                ...prevData,
                transactions: data
              };
            case 'withdrawals':
              return {
                ...prevData,
                withdrawalRequests: data
              };
            default:
              return prevData;
          }
        });
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid, currentUser?.affiliateStatus]);

  return (
    <UserContext.Provider value={{ 
      currentUser, 
      loading,
      paymentData,
      paymentLoading,
      registerUser,
      updateUserProfile,
      logout,
      loadPaymentData,
      addBankAccount,
      updateBankAccount,
      deleteBankAccount,
      submitWithdrawalRequest,
      addEarnings,
      submitPaymentRequest,
      getUserPaymentRequest
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};  