import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../Firebase/firebase';
import MLMService from './mlmService';

export class AuthService {
  
  // Register new user with MLM system
  static async registerUser(userData) {
    try {
      const { 
        email, 
        password, 
        name, 
        phone, 
        profilePic, 
        sponsorReferralCode,
        paymentProof 
      } = userData;

      // Validate payment proof (₹1500 requirement)
      if (!paymentProof || !paymentProof.amount || paymentProof.amount < 1500) {
        throw new Error('Payment proof of ₹1500 is required for registration');
      }

      // Validate sponsor referral code if provided
      if (sponsorReferralCode) {
        const sponsorExists = await this.validateSponsorCode(sponsorReferralCode);
        if (!sponsorExists) {
          throw new Error('Invalid sponsor referral code');
        }
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Upload profile picture if provided
      let profilePicUrl = '';
      if (profilePic) {
        const storageRef = ref(storage, `profilePics/${user.uid}/${profilePic.name}`);
        await uploadBytes(storageRef, profilePic);
        profilePicUrl = await getDownloadURL(storageRef);
      }

      // Generate unique MLM ID and referral code
      const mlmId = await this.generateMLMId();
      const referralCode = await this.generateReferralCode(name);

      // Create user document in Firestore
      const userDocData = {
        uid: user.uid,
        email,
        name,
        phone,
        profilePic: profilePicUrl,
        mlmId,
        referralCode,
        sponsorReferralCode: sponsorReferralCode || null,
        affiliateStatus: true, // Automatically active after payment
        affiliateBalance: 0,
        totalEarnings: 0,
        referralCount: 0,
        role: 'user',
        isActive: true,
        registrationDate: serverTimestamp(),
        paymentProof: {
          amount: paymentProof.amount,
          transactionId: paymentProof.transactionId || '',
          paymentMethod: paymentProof.paymentMethod || 'bank_transfer',
          screenshot: paymentProof.screenshot || '',
          verificationStatus: 'pending',
          submittedAt: serverTimestamp()
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', user.uid), userDocData);

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: name,
        photoURL: profilePicUrl
      });

      // Register user in MLM system if sponsor code provided
      if (sponsorReferralCode) {
        await MLMService.registerUserInMLM(user.uid, sponsorReferralCode, paymentProof);
      }

      return {
        uid: user.uid,
        ...userDocData
      };
    } catch (error) {
      throw error;
    }
  }

  // Login user
  static async loginUser(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Get user data from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        throw new Error('User data not found');
      }

      const userData = userDoc.data();

      // Update last login
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      return {
        uid: user.uid,
        ...userData
      };
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  static async logoutUser() {
    try {
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  }

  // Reset password
  static async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw error;
    }
  }

  // Generate unique MLM ID
  static async generateMLMId() {
    let mlmId;
    let exists = true;
    
    while (exists) {
      // Format: VED + 6 digit number
      mlmId = 'VED' + Math.floor(100000 + Math.random() * 900000);
      
      const mlmQuery = query(
        collection(db, 'users'),
        where('mlmId', '==', mlmId)
      );
      const snapshot = await getDocs(mlmQuery);
      exists = !snapshot.empty;
    }
    
    return mlmId;
  }

  // Generate unique referral code
  static async generateReferralCode(name) {
    let referralCode;
    let exists = true;
    
    while (exists) {
      // Format: First 3 letters of name + 3 random digits
      const namePart = name.substring(0, 3).toUpperCase();
      const numberPart = Math.floor(100 + Math.random() * 900);
      referralCode = `${namePart}${numberPart}`;
      
      const refQuery = query(
        collection(db, 'users'),
        where('referralCode', '==', referralCode)
      );
      const snapshot = await getDocs(refQuery);
      exists = !snapshot.empty;
    }
    
    return referralCode;
  }

  // Validate sponsor referral code
  static async validateSponsorCode(sponsorCode) {
    try {
      const sponsorQuery = query(
        collection(db, 'users'),
        where('referralCode', '==', sponsorCode),
        where('affiliateStatus', '==', true)
      );
      const snapshot = await getDocs(sponsorQuery);
      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }

  // Get user by referral code
  static async getUserByReferralCode(referralCode) {
    try {
      const userQuery = query(
        collection(db, 'users'),
        where('referralCode', '==', referralCode)
      );
      const snapshot = await getDocs(userQuery);
      
      if (snapshot.empty) {
        return null;
      }
      
      const userDoc = snapshot.docs[0];
      return {
        id: userDoc.id,
        ...userDoc.data()
      };
    } catch (error) {
      return null;
    }
  }

  // Update user profile
  static async updateUserProfile(userId, updateData) {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Handle profile picture upload if provided
      if (updateData.profilePic && typeof updateData.profilePic !== 'string') {
        const storageRef = ref(storage, `profilePics/${userId}/${updateData.profilePic.name}`);
        await uploadBytes(storageRef, updateData.profilePic);
        updateData.profilePic = await getDownloadURL(storageRef);
      }

      const updatePayload = {
        ...updateData,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updatePayload);

      // Update Firebase Auth profile if name or photo changed
      const user = auth.currentUser;
      if (user && (updateData.name || updateData.profilePic)) {
        await updateProfile(user, {
          displayName: updateData.name || user.displayName,
          photoURL: updateData.profilePic || user.photoURL
        });
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  // Get current user data
  static async getCurrentUserData() {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) return null;

      return {
        uid: user.uid,
        ...userDoc.data()
      };
    } catch (error) {
      return null;
    }
  }

  // Verify payment proof (admin function)
  static async verifyPaymentProof(userId, verificationStatus, adminNotes = '') {
    try {
      return await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }

        const userData = userDoc.data();
        
        // Update payment verification status
        transaction.update(userRef, {
          'paymentProof.verificationStatus': verificationStatus,
          'paymentProof.verifiedAt': serverTimestamp(),
          'paymentProof.adminNotes': adminNotes,
          affiliateStatus: verificationStatus === 'approved',
          updatedAt: serverTimestamp()
        });

        // If approved and has sponsor, register in MLM system
        if (verificationStatus === 'approved' && userData.sponsorReferralCode) {
          await MLMService.registerUserInMLM(
            userId, 
            userData.sponsorReferralCode, 
            userData.paymentProof
          );
        }

        return true;
      });
    } catch (error) {
      throw error;
    }
  }

  // Get pending payment verifications (admin function)
  static async getPendingVerifications() {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('paymentProof.verificationStatus', '==', 'pending')
      );
      
      const snapshot = await getDocs(usersQuery);
      const pendingUsers = [];
      
      snapshot.forEach((doc) => {
        pendingUsers.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return pendingUsers;
    } catch (error) {
      return [];
    }
  }

  // Auth state listener
  static onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userData = await this.getCurrentUserData();
        callback(userData);
      } else {
        callback(null);
      }
    });
  }

  // Generate secure password for user
  static generateSecurePassword() {
    const length = 8;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  // Check if email exists
  static async checkEmailExists(email) {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email)
      );
      const snapshot = await getDocs(usersQuery);
      return !snapshot.empty;
    } catch (error) {
      return false;
    }
  }

  // Get user statistics
  static async getUserStatistics() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      let totalUsers = 0;
      let activeAffiliates = 0;
      let pendingVerifications = 0;
      let totalEarnings = 0;

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        totalUsers++;
        
        if (userData.affiliateStatus) {
          activeAffiliates++;
        }
        
        if (userData.paymentProof?.verificationStatus === 'pending') {
          pendingVerifications++;
        }
        
        totalEarnings += userData.totalEarnings || 0;
      });

      return {
        totalUsers,
        activeAffiliates,
        pendingVerifications,
        totalEarnings,
        conversionRate: totalUsers > 0 ? (activeAffiliates / totalUsers) * 100 : 0
      };
    } catch (error) {
      return {
        totalUsers: 0,
        activeAffiliates: 0,
        pendingVerifications: 0,
        totalEarnings: 0,
        conversionRate: 0
      };
    }
  }
}

export default AuthService;
