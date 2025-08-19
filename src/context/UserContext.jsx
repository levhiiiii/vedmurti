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

    const { email, password, name, profilePic, referralCode, upline, position, ...otherData } = userData;
    
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

      // Handle network placement - manual upline placement or automatic placement
      if (upline && position) {
        // Manual upline placement - user specified upline and position
        try {
          const uplineQuery = query(collection(db, 'users'), where('referralCode', '==', upline));
          const uplineSnapshot = await getDocs(uplineQuery);
          
          if (!uplineSnapshot.empty) {
            const uplineUser = uplineSnapshot.docs[0];
            const uplineData = uplineUser.data();
            
            // Check if the selected position is actually available
            const positionField = position === 'left' ? 'leftDownLine' : 'rightDownLine';
            if (!uplineData[positionField] || uplineData[positionField] === '') {
              // Update upline's downline field with new user's referral code
              await updateDoc(uplineUser.ref, {
                [positionField]: userReferralCode
              });
              
      
              
              // Update upline counts and trigger income calculations
              await updateUplineCountsForRegistration(userCredential.user.uid, uplineUser.id, position);
            } else {
              console.warn(`Position ${position} is not available under upline ${upline}`);
            }
          }
        } catch (error) {
          console.error('Error placing user under upline:', error);
        }
      } else {
        // Automatic network placement - only when no upline ID is provided
        if (referredBy) {
          await updateReferralCount(db, referredBy);
          // Recursively set downline slot for the referrer or their downlines
          const slotResult = await findAvailableDownlineSlot(db, referredBy);
          if (slotResult) {
            await updateDoc(slotResult.docRef, { [slotResult.slot]: userReferralCode });
            
            // Update upline counts for automatic placement
            await updateUplineCountsForRegistration(userCredential.user.uid, slotResult.docRef.id, slotResult.slot === 'leftDownLine' ? 'left' : 'right');
          }
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
    const userIdPart = userId.substring(userId.length - 3);
    return `${namePart}${userIdPart}`;
  };

  // Update upline counts for registration (simplified version of MLMService.updateUplineCounts)
  const updateUplineCountsForRegistration = async (newUserId, uplineId, position) => {
    try {
      
      
      // Get the new user's referral code
      const newUserDoc = await getDoc(doc(db, 'users', newUserId));
      if (!newUserDoc.exists()) return;
      
      const newUserData = newUserDoc.data();
      const userReferralCode = newUserData.referralCode;
      
      let currentUserId = uplineId;
      let currentPosition = position;

      // Traverse up the tree and update counts
      while (currentUserId) {
        const currentUserRef = doc(db, 'users', currentUserId);
        const currentUserDoc = await getDoc(currentUserRef);
        
        if (!currentUserDoc.exists()) break;
        
        const currentUserData = currentUserDoc.data();
        
        // Update count based on position
        const countField = currentPosition === 'left' ? 'totalLeftCount' : 'totalRightCount';
        await updateDoc(currentUserRef, {
          [countField]: increment(1)
        });

        // Calculate pairs from complete network structure
        const networkPairs = await calculateNetworkPairsForRegistration(currentUserId);
        const totalPairs = networkPairs.pairs;
        const newPairs = totalPairs - (currentUserData.pairsCount || 0);
        

        
        if (newPairs > 0) {
          // Calculate promotional income (₹400 per pair)
          const newIncome = newPairs * 400;
          
          await updateDoc(currentUserRef, {
            pairsCount: totalPairs,
            promotionalIncome: increment(newIncome),
            totalIncome: increment(newIncome)
          });
          

        }

        // Move to next upline
        const nextUplineId = currentUserData.upline;
        if (nextUplineId) {
          const nextUplineQuery = query(collection(db, 'users'), where('referralCode', '==', nextUplineId));
          const nextUplineSnapshot = await getDocs(nextUplineQuery);
          if (!nextUplineSnapshot.empty) {
            const nextUplineData = nextUplineSnapshot.docs[0].data();
            // Determine position relative to next upline
            if (nextUplineData.leftDownLine === currentUserData.referralCode) {
              currentPosition = 'left';
            } else if (nextUplineData.rightDownLine === currentUserData.referralCode) {
              currentPosition = 'right';
            }
            currentUserId = nextUplineSnapshot.docs[0].id;
          } else {
            break;
          }
        } else {
          break;
        }
      }
    } catch (error) {
      console.error('Error updating upline counts for registration:', error);
    }
  };

  // Calculate pairs from complete network structure for registration
  const calculateNetworkPairsForRegistration = async (userId) => {
    try {
      // Get user's referral code
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) return { leftCount: 0, rightCount: 0, pairs: 0 };
      
      const userData = userDoc.data();
      const referralCode = userData.referralCode;
      
      if (!referralCode) return { leftCount: 0, rightCount: 0, pairs: 0 };
      
      // Build complete network tree
      const buildNetworkTree = async (referralCode, level = 0, maxLevel = 10) => {
        if (level >= maxLevel) return null;
        
        const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
        const userSnapshot = await getDocs(userQuery);
        if (userSnapshot.empty) return null;
        
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        
        let leftNode = null, rightNode = null;
        
        // Build left subtree
        if (userData.leftDownLine) {
          leftNode = await buildNetworkTree(userData.leftDownLine, level + 1, maxLevel);
        }
        
        // Build right subtree
        if (userData.rightDownLine) {
          rightNode = await buildNetworkTree(userData.rightDownLine, level + 1, maxLevel);
        }
        
        return {
          referralCode: userData.referralCode,
          leftNode,
          rightNode,
          level
        };
      };
      
      // Count all members in a subtree
      const countSubtree = (node) => {
        if (!node) return 0;
        return 1 + countSubtree(node.leftNode) + countSubtree(node.rightNode);
      };
      
      // Build the complete network tree
      const networkTree = await buildNetworkTree(referralCode);
      if (!networkTree) return { leftCount: 0, rightCount: 0, pairs: 0 };
      
      // Count left and right legs
      const leftCount = countSubtree(networkTree.leftNode);
      const rightCount = countSubtree(networkTree.rightNode);
      
      // Calculate pairs using simple 1:1 ratio
      const pairs = Math.min(leftCount, rightCount);
      

      
      return { leftCount, rightCount, pairs };
    } catch (error) {
      console.error('Error calculating network pairs for registration:', error);
      return { leftCount: 0, rightCount: 0, pairs: 0 };
    }
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