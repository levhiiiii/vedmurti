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

const USER_STORAGE_KEY = 'currentUser';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);



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

  const logout = async () => {
    const auth = getAuth();
    await auth.signOut();
    setCurrentUser(null);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  return (
    <UserContext.Provider value={{ 
      currentUser, 
      loading,
      registerUser,
      updateUserProfile,
      logout
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