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

export class MLMService {
  
  // Register user in MLM system with binary tree placement - Vedmurti Plan Implementation
  static async registerUserInMLM(userId, sponsorReferralCode, paymentProof) {
    try {
      return await runTransaction(db, async (transaction) => {
        // 1. Validate payment (₹1500 joining amount)
        if (!paymentProof || paymentProof.amount < 1500) {
          throw new Error('Payment proof of ₹1500 required for joining');
        }

        // 2. Find sponsor
        const sponsorQuery = query(
          collection(db, 'users'),
          where('referralCode', '==', sponsorReferralCode)
        );
        const sponsorSnapshot = await getDocs(sponsorQuery);
        
        if (sponsorSnapshot.empty) {
          throw new Error('Invalid sponsor referral code');
        }

        const sponsorData = sponsorSnapshot.docs[0].data();
        const sponsorId = sponsorSnapshot.docs[0].id;

        // 3. Generate unique MLM ID (VED format)
        const mlmId = await this.generateMLMId();

        // 4. Find placement position in binary tree
        const placement = await this.findOptimalPlacement(sponsorReferralCode);

        // 5. Create MLM user record with Vedmurti Plan structure
        const mlmUserData = {
          userId,
          mlmId,
          sponsorId,
          sponsorReferralCode,
          placementParent: placement.parentId,
          position: placement.position, // 'left' or 'right'
          level: placement.level,
          positionNumber: placement.positionNumber, // Store the position number in the sequence
          leftChild: null,
          rightChild: null,
          totalLeftCount: 0,
          totalRightCount: 0,
          pairsCount: 0,
          
          // Vedmurti Plan Income Structure
          promotionalIncome: 0,        // ₹400 per pair
          leadershipIncome: 0,         // Based on team turnover
          rewardsIncome: 0,            // Festival & achievement rewards
          totalIncome: 0,
          
          // Daily Capping System
          dailyPairs: 0,               // Max 400 pairs per day
          dailyIncome: 0,              // Max ₹2000 per day from promotional
          lastDailyReset: serverTimestamp(),
          
          // Payout Cycle Management
          currentCycleIncome: 0,
          pendingPayout: 0,
          totalPayoutsReceived: 0,
          lastPayoutDate: null,
          
          // Team Performance Metrics
          teamTurnover: 0,
          leftTeamTurnover: 0,
          rightTeamTurnover: 0,
          qualifiedReferrals: 0,       // For leadership income eligibility
          
          // Rank & Achievement System
          currentRank: 'Starter',
          rankLevel: 1,
          achievementPoints: 0,
          festivalRewards: 0,
          
          // System Fields
          joinDate: serverTimestamp(),
          isActive: true,
          kycCompleted: false,
          paymentProof: paymentProof,
          
          // Vedmurti Plan Specific
          joiningAmount: 1500,
          productPurchaseRequired: true,
          eligibleForLeadership: false  // Requires 10 active referrals
        };

        // 6. Save MLM user data
        const mlmUserRef = doc(db, 'mlmUsers', userId);
        transaction.set(mlmUserRef, mlmUserData);

        // 7. Update parent's child reference
        if (placement.parentId) {
          const parentRef = doc(db, 'mlmUsers', placement.parentId);
          const updateField = placement.position === 'left' ? 'leftChild' : 'rightChild';
          transaction.update(parentRef, {
            [updateField]: userId
          });
        }

        // 8. Update user's affiliate status
        const userRef = doc(db, 'users', userId);
        transaction.update(userRef, {
          affiliateStatus: true,
          mlmId: mlmId,
          mlmJoinDate: serverTimestamp(),
          currentRank: 'Starter',
          rankLevel: 1,
          joiningAmount: 1500
        });

        // 9. Update upline counts and trigger income calculations
        await this.updateUplineCounts(userId, transaction);

        // 10. Check if sponsor becomes eligible for leadership income
        await this.checkLeadershipEligibility(sponsorId, transaction);

        return mlmUserData;
      });
    } catch (error) {
      throw error;
    }
  }

  // Generate unique MLM ID (VED format as per Vedmurti Plan)
  static async generateMLMId() {
    let mlmId;
    let exists = true;
    
    while (exists) {
      // Format: VED + 6 digit number (as per Vedmurti Plan)
      mlmId = 'VED' + Math.floor(100000 + Math.random() * 900000);
      const mlmUserQuery = query(
        collection(db, 'mlmUsers'),
        where('mlmId', '==', mlmId)
      );
      const snapshot = await getDocs(mlmUserQuery);
      exists = !snapshot.empty;
    }
    
    return mlmId;
  }

  // Find optimal placement in binary tree (balanced approach)
  static async findOptimalPlacement(sponsorReferralCode) {
    try {
      // Find sponsor's MLM record
      const sponsorQuery = query(
        collection(db, 'users'),
        where('referralCode', '==', sponsorReferralCode)
      );
      const sponsorSnapshot = await getDocs(sponsorQuery);
      const sponsorUserId = sponsorSnapshot.docs[0].id;

      const sponsorMLMDoc = await getDoc(doc(db, 'mlmUsers', sponsorUserId));
      
      if (!sponsorMLMDoc.exists()) {
        // Sponsor not in MLM yet, place as direct downline
        return {
          parentId: sponsorUserId,
          position: 'left',
          level: 1
        };
      }

      const sponsorMLMData = sponsorMLMDoc.data();

      // Check if sponsor has available direct positions
      if (!sponsorMLMData.leftChild) {
        return {
          parentId: sponsorUserId,
          position: 'left',
          level: sponsorMLMData.level + 1
        };
      }
      
      if (!sponsorMLMData.rightChild) {
        return {
          parentId: sponsorUserId,
          position: 'right',
          level: sponsorMLMData.level + 1
        };
      }

      // Both positions filled, find the next available position using the specific pattern
      return await this.findNextPositionByPattern(sponsorUserId);
    } catch (error) {
      throw error;
    }
  }

  // Find next available position using the specific tree pattern
  static async findNextPositionByPattern(rootUserId) {
    try {
      // Get all MLM users to understand the current tree structure
      const mlmUsersSnapshot = await getDocs(collection(db, 'mlmUsers'));
      const allMLMUsers = new Map();
      
      mlmUsersSnapshot.forEach(doc => {
        allMLMUsers.set(doc.id, doc.data());
      });

      // Find the next position number based on the pattern
      const nextPositionNumber = this.getNextPositionNumber(allMLMUsers);
      
      // Find the parent and position for this number
      const placement = this.getPlacementForPosition(nextPositionNumber);
      
      // Find the actual parent user ID
      const parentUserId = await this.findParentUserByPosition(placement.parentPosition, allMLMUsers);
      
      if (!parentUserId) {
        throw new Error('Parent position not found in tree');
      }

        return {
        parentId: parentUserId,
        position: placement.position,
        level: placement.level,
        positionNumber: nextPositionNumber
      };
    } catch (error) {
      throw error;
    }
  }

  // Get the next position number in the sequence
  static getNextPositionNumber(allMLMUsers) {
    // Count existing users to determine next position
    return allMLMUsers.size + 1;
  }

  // Get placement details for a given position number
  static getPlacementForPosition(positionNumber) {
    if (positionNumber === 1) {
      return { parentPosition: null, position: 'root', level: 0 };
    }

    // Define the exact pattern based on your specification
    const positionMap = {
      1: { parentPosition: null, position: 'root', level: 0 },
      2: { parentPosition: 1, position: 'left', level: 1 },
      3: { parentPosition: 1, position: 'right', level: 1 },
      4: { parentPosition: 2, position: 'left', level: 2 },
      5: { parentPosition: 3, position: 'right', level: 2 },
      6: { parentPosition: 2, position: 'right', level: 2 },
      7: { parentPosition: 3, position: 'left', level: 2 },
      8: { parentPosition: 4, position: 'left', level: 3 },
      9: { parentPosition: 5, position: 'right', level: 3 },
      10: { parentPosition: 4, position: 'right', level: 3 },
      11: { parentPosition: 5, position: 'left', level: 3 },
      12: { parentPosition: 6, position: 'left', level: 3 },
      13: { parentPosition: 7, position: 'right', level: 3 },
      14: { parentPosition: 6, position: 'right', level: 3 },
      15: { parentPosition: 7, position: 'left', level: 3 },
      16: { parentPosition: 8, position: 'left', level: 4 },
      17: { parentPosition: 9, position: 'right', level: 4 },
      18: { parentPosition: 8, position: 'right', level: 4 },
      19: { parentPosition: 9, position: 'left', level: 4 },
      20: { parentPosition: 12, position: 'left', level: 4 },
      21: { parentPosition: 11, position: 'right', level: 4 },
      22: { parentPosition: 12, position: 'right', level: 4 },
      23: { parentPosition: 11, position: 'left', level: 4 },
      24: { parentPosition: 12, position: 'left', level: 4 },
      25: { parentPosition: 13, position: 'right', level: 4 },
      26: { parentPosition: 12, position: 'right', level: 4 },
      27: { parentPosition: 13, position: 'left', level: 4 },
      28: { parentPosition: 14, position: 'left', level: 4 },
      29: { parentPosition: 15, position: 'right', level: 4 },
      30: { parentPosition: 14, position: 'right', level: 4 },
      31: { parentPosition: 15, position: 'left', level: 4 }
    };

    // If position is in our predefined map, use it
    if (positionMap[positionNumber]) {
      return positionMap[positionNumber];
    }

    // For positions beyond 31, calculate using the pattern
    // The pattern seems to follow a specific binary tree arrangement
    // Let's calculate based on the level and position within the level
    const level = Math.floor(Math.log2(positionNumber));
    const positionInLevel = positionNumber - Math.pow(2, level);
    const parentPosition = Math.floor(positionNumber / 2);
    const isLeft = positionNumber % 2 === 0;
    const position = isLeft ? 'left' : 'right';

        return {
      parentPosition,
      position,
      level
    };
  }

  // Find the actual user ID for a given position number
  static async findParentUserByPosition(targetPosition, allMLMUsers) {
    if (targetPosition === null) return null;

    // Find user with the target position number
    for (const [userId, userData] of allMLMUsers) {
      if (userData.positionNumber === targetPosition) {
        return userId;
      }
    }

    // If not found by position number, calculate based on tree structure
    return this.findUserByTreePosition(targetPosition, allMLMUsers);
  }

  // Find user by their position in the tree structure
  static findUserByTreePosition(targetPosition, allMLMUsers) {
    // Find user with the target position number
    for (const [userId, userData] of allMLMUsers) {
      if (userData.positionNumber === targetPosition) {
        return userId;
      }
    }
    
    // If not found by position number, try to find by tree structure
    const treeMap = new Map();
    const rootUsers = [];
    
    // First pass: organize users by their parent
    for (const [userId, userData] of allMLMUsers) {
      if (!userData.placementParent) {
        // This is a root user
        rootUsers.push({ userId, userData });
      } else {
        if (!treeMap.has(userData.placementParent)) {
          treeMap.set(userData.placementParent, { left: null, right: null });
        }
        const parent = treeMap.get(userData.placementParent);
        if (userData.position === 'left') {
          parent.left = { userId, userData };
        } else if (userData.position === 'right') {
          parent.right = { userId, userData };
        }
      }
    }
    
    // Find the user at the target position using level-order traversal
    const queue = [...rootUsers];
    let currentPosition = 1;
    
    while (queue.length > 0 && currentPosition <= targetPosition) {
      const current = queue.shift();
      
      if (currentPosition === targetPosition) {
        return current.userId;
      }
      
      // Add children to queue in level-order
      if (treeMap.has(current.userId)) {
        const children = treeMap.get(current.userId);
        if (children.left) queue.push(children.left);
        if (children.right) queue.push(children.right);
      }
      
      currentPosition++;
    }
    
    return null;
  }

  // Utility method to display tree structure in the specified format
  static async displayTreeStructure() {
    try {
      const treeStructure = await this.getTreeStructureInFormat();
      
      
      
      return treeStructure;
    } catch (error) {
      // Error displaying tree structure
      throw error;
    }
  }

  // Test function to verify the tree pattern
  static testTreePattern() {
    for (let i = 1; i <= 31; i++) {
      const placement = this.getPlacementForPosition(i);
      if (i === 1) {
        // Root
      } else {
        const side = placement.position === 'left' ? 'left' : 'right';
        // ${i} ${side} of ${placement.parentPosition}
      }
    }
  }

  // Test function to verify pair calculation
  static testPairCalculation() {
    const testCases = [
      { left: 3, right: 3, expected: 3 }, // Should give 3 pairs
      { left: 4, right: 2, expected: 2 }, // Should give 2 pairs (2:1 ratio)
      { left: 2, right: 4, expected: 2 }, // Should give 2 pairs (1:2 ratio)
      { left: 6, right: 3, expected: 3 }, // Should give 3 pairs
      { left: 3, right: 6, expected: 3 }, // Should give 3 pairs
    ];
    
    testCases.forEach((testCase, index) => {
      const calculatePairs = (left, right) => {
        let pairs = 0;
        let l = left;
        let r = right;
        
        while ((l >= 2 && r >= 1) || (l >= 1 && r >= 2)) {
          if (l > r) {
            l -= 2;
            r -= 1;
          } else {
            l -= 1;
            r -= 2;
          }
          pairs += 1;
        }
        return pairs;
      };
      
      const result = calculatePairs(testCase.left, testCase.right);
      // Test ${index + 1}: Left=${testCase.left}, Right=${testCase.right}, Expected=${testCase.expected}, Got=${result}, ${result === testCase.expected ? 'PASS' : 'FAIL'}
    });
  }

  // Clean up missing downlines from upline's rightDownLine and leftDownLine fields
  static async cleanupMissingDownlines() {
    try {
      let cleanedCount = 0;
      
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Create a map of existing referral codes for quick lookup
      const existingReferralCodes = new Set();
      users.forEach(user => {
        if (user.referralCode) {
          existingReferralCodes.add(user.referralCode);
        }
      });
      
      // Check each user's downlines
      for (const user of users) {
        const updates = {};
        let hasChanges = false;
        
        // Check left downline
        if (user.leftDownLine && !existingReferralCodes.has(user.leftDownLine)) {
          updates.leftDownLine = null;
          hasChanges = true;
        }
        
        // Check right downline
        if (user.rightDownLine && !existingReferralCodes.has(user.rightDownLine)) {
          updates.rightDownLine = null;
          hasChanges = true;
        }
        
        // Update user if there are changes
        if (hasChanges) {
          const userRef = doc(db, 'users', user.id);
          await updateDoc(userRef, updates);
          cleanedCount++;
        }
      }
      return { success: true, cleanedCount, message: `Removed ${cleanedCount} missing downline references.` };
      
    } catch (error) {
      // Error cleaning up missing downlines
      throw error;
    }
  }

  // Clean up missing downlines with batch operations for better performance
  static async cleanupMissingDownlinesBatch() {
    try {
      let cleanedCount = 0;
      const batch = writeBatch(db);
      
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Create a map of existing referral codes for quick lookup
      const existingReferralCodes = new Set();
      users.forEach(user => {
        if (user.referralCode) {
          existingReferralCodes.add(user.referralCode);
        }
      });
      
      // Check each user's downlines
      for (const user of users) {
        const updates = {};
        let hasChanges = false;
        
        // Check left downline
        if (user.leftDownLine && !existingReferralCodes.has(user.leftDownLine)) {
          updates.leftDownLine = null;
          hasChanges = true;
        }
        
        // Check right downline
        if (user.rightDownLine && !existingReferralCodes.has(user.rightDownLine)) {
          updates.rightDownLine = null;
          hasChanges = true;
        }
        
        // Add to batch if there are changes
        if (hasChanges) {
          const userRef = doc(db, 'users', user.id);
          batch.update(userRef, updates);
          cleanedCount++;
        }
      }
      
      // Commit the batch
      if (cleanedCount > 0) {
        await batch.commit();
      }
      
      return { success: true, cleanedCount, message: `Removed ${cleanedCount} missing downline references.` };
      
    } catch (error) {
      // Error in batch cleanup of missing downlines
      throw error;
    }
  }

  // Clean up specific downline references when a user is deleted
  static async cleanupDownlineReferences(deletedUserReferralCode) {
    try {
      let cleanedCount = 0;
      const batch = writeBatch(db);
      
      // Find all users who have this referral code as their downline
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
        const updates = {};
        let hasChanges = false;
        
        // Check if this user has the deleted user as left downline
        if (userData.leftDownLine === deletedUserReferralCode) {
          updates.leftDownLine = null;
          hasChanges = true;
        }
        
        // Check if this user has the deleted user as right downline
        if (userData.rightDownLine === deletedUserReferralCode) {
          updates.rightDownLine = null;
          hasChanges = true;
        }
        
        // Add to batch if there are changes
        if (hasChanges) {
          const userRef = doc(db, 'users', userDoc.id);
          batch.update(userRef, updates);
          cleanedCount++;
        }
      }
      
      // Commit the batch
      if (cleanedCount > 0) {
        await batch.commit();
      }
      
      return { success: true, cleanedCount, message: `Cleaned up ${cleanedCount} references to deleted user.` };
      
    } catch (error) {
      // Error cleaning up downline references
      throw error;
    }
  }

  // Scheduled cleanup function that can be called periodically
  static async scheduledDownlineCleanup() {
    try {
      // First, clean up missing downlines
      const missingDownlinesResult = await this.cleanupMissingDownlinesBatch();
      
      // Then, check for any orphaned references that might have been missed
      const orphanedResult = await this.findAndCleanupOrphanedReferences();
      
      const totalCleaned = missingDownlinesResult.cleanedCount + orphanedResult.cleanedCount;
      
      return {
        success: true,
        totalCleaned,
        missingDownlines: missingDownlinesResult.cleanedCount,
        orphanedReferences: orphanedResult.cleanedCount,
        message: `Scheduled cleanup completed. Total cleaned: ${totalCleaned}`
      };
      
    } catch (error) {
      // Error in scheduled downline cleanup
      throw error;
    }
  }

  // Find and cleanup orphaned references that might have been missed
  static async findAndCleanupOrphanedReferences() {
    try {
      let cleanedCount = 0;
      const batch = writeBatch(db);
      
      // Get all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Create a map of existing referral codes for quick lookup
      const existingReferralCodes = new Set();
      users.forEach(user => {
        if (user.referralCode) {
          existingReferralCodes.add(user.referralCode);
        }
      });
      
      // Check each user's downlines for orphaned references
      for (const user of users) {
        const updates = {};
        let hasChanges = false;
        
        // Check left downline
        if (user.leftDownLine && !existingReferralCodes.has(user.leftDownLine)) {
          updates.leftDownLine = null;
          hasChanges = true;
        }
        
        // Check right downline
        if (user.rightDownLine && !existingReferralCodes.has(user.rightDownLine)) {
          updates.rightDownLine = null;
          hasChanges = true;
        }
        
        // Add to batch if there are changes
        if (hasChanges) {
          const userRef = doc(db, 'users', user.id);
          batch.update(userRef, updates);
          cleanedCount++;
        }
      }
      
      // Commit the batch
      if (cleanedCount > 0) {
        await batch.commit();
      }
      
      return { success: true, cleanedCount, message: `Cleaned up ${cleanedCount} orphaned references.` };
      
    } catch (error) {
      // Error finding orphaned references
      throw error;
    }
  }

  // Get tree structure in the exact format specified by user
  static async getTreeStructureInFormat() {
    try {
      const mlmUsersSnapshot = await getDocs(collection(db, 'mlmUsers'));
      const allMLMUsers = new Map();
      
      mlmUsersSnapshot.forEach(doc => {
        allMLMUsers.set(doc.id, doc.data());
      });

      // Sort users by their position number to ensure correct order
      const sortedUsers = Array.from(allMLMUsers.entries())
        .filter(([_, userData]) => userData.positionNumber)
        .sort((a, b) => a[1].positionNumber - b[1].positionNumber);

      const treeStructure = [];
      
      // Build the tree structure based on position numbers
      for (const [userId, userData] of sortedUsers) {
        const positionNumber = userData.positionNumber;
        
        if (positionNumber === 1) {
          treeStructure.push(`${positionNumber} Root`);
        } else {
          const placement = this.getPlacementForPosition(positionNumber);
          const side = placement.position === 'left' ? 'left' : 'right';
          treeStructure.push(`${positionNumber} ${side} of ${placement.parentPosition}`);
        }
      }
      
      return treeStructure;
    } catch (error) {
      // Error getting tree structure in format
      throw error;
    }
  }

  // Test function to check database for downline data
  static async testDownlineData(userId) {
    try {
      // Get user's referral code
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return;
      }

      const userData = userDoc.data();
      
      // Check MLM data
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      const mlmData = mlmDoc.exists() ? mlmDoc.data() : null;
      
      // Check if left downline exists (check both systems)
      const leftDownlineCode = userData.leftDownLine || (mlmDoc.exists() ? mlmDoc.data().leftChild : null);
      if (leftDownlineCode) {
        const leftQuery = query(collection(db, 'users'), where('referralCode', '==', leftDownlineCode));
        const leftSnapshot = await getDocs(leftQuery);
        if (!leftSnapshot.empty) {
          const leftData = leftSnapshot.docs[0].data();
          
          // Check MLM data for left downline
          const leftMlmDoc = await getDoc(doc(db, 'mlmUsers', leftSnapshot.docs[0].id));
          const leftMlmData = leftMlmDoc.exists() ? leftMlmDoc.data() : null;
        }
      }
      
      // Check if right downline exists (check both systems)
      const rightDownlineCode = userData.rightDownLine || (mlmDoc.exists() ? mlmDoc.data().rightChild : null);
      if (rightDownlineCode) {
        const rightQuery = query(collection(db, 'users'), where('referralCode', '==', rightDownlineCode));
        const rightSnapshot = await getDocs(rightQuery);
        if (!rightSnapshot.empty) {
          const rightData = rightSnapshot.docs[0].data();
          
          // Check MLM data for right downline
          const rightMlmDoc = await getDoc(doc(db, 'mlmUsers', rightSnapshot.docs[0].id));
          const rightMlmData = rightMlmDoc.exists() ? rightMlmDoc.data() : null;
        }
      }
      
    } catch (error) {
      // Silent error handling
    }
  }

  // Calculate pairs from complete network structure
  static async calculateNetworkPairs(userId) {
    try {
      // Get user's referral code
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return { leftCount: 0, rightCount: 0, pairs: 0 };
      }
      
      const userData = userDoc.data();
      const referralCode = userData.referralCode;
      
      if (!referralCode) {
        return { leftCount: 0, rightCount: 0, pairs: 0 };
      }
      
      // Build complete network tree with both systems
      const buildNetworkTree = async (referralCode, level = 0, maxLevel = 10) => {
        if (level >= maxLevel) {
          return null;
        }
        
        const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
        const userSnapshot = await getDocs(userQuery);
        if (userSnapshot.empty) {
          return null;
        }
        
        const userDoc = userSnapshot.docs[0];
        const userData = userDoc.data();
        
        // Also check MLM data
        const mlmDoc = await getDoc(doc(db, 'mlmUsers', userDoc.id));
        const mlmData = mlmDoc.exists() ? mlmDoc.data() : null;
        
        let leftNode = null, rightNode = null;
        
        // Check both systems for left downline
        const leftDownlineCode = userData.leftDownLine || mlmData?.leftChild;
        if (leftDownlineCode) {
          leftNode = await buildNetworkTree(leftDownlineCode, level + 1, maxLevel);
        }
        
        // Check both systems for right downline
        const rightDownlineCode = userData.rightDownLine || mlmData?.rightChild;
        if (rightDownlineCode) {
          rightNode = await buildNetworkTree(rightDownlineCode, level + 1, maxLevel);
        }
        
        return {
          referralCode: userData.referralCode,
          name: userData.name,
          leftNode,
          rightNode,
          level,
          hasLeft: !!(leftDownlineCode),
          hasRight: !!(rightDownlineCode)
        };
      };
      
      // Accurate pair counting logic: count only actual matched pairs
      const countAllPairs = (node) => {
        if (!node) {
          return 0;
        }
        
        let pairs = 0;
        
        // Count pairs at this level (only if user has both left and right downlines)
        if (node.leftNode && node.rightNode) {
          pairs = 1;
        }
        
        // Recursively count pairs from left and right subtrees
        const leftPairs = countAllPairs(node.leftNode);
        const rightPairs = countAllPairs(node.rightNode);
        
        const totalPairs = pairs + leftPairs + rightPairs;
        
        return totalPairs;
      };
      
      // Helper function to count members in a subtree
      const countMembersInSubtree = (node) => {
        if (!node) return 0;
        return 1 + countMembersInSubtree(node.leftNode) + countMembersInSubtree(node.rightNode);
      };

      // Alternative simple pair calculation based on direct downlines
      const calculateSimplePairs = async () => {
        const leftDownlineCode = userData.leftDownLine;
        const rightDownlineCode = userData.rightDownLine;
        
        let leftCount = 0;
        let rightCount = 0;
        
        // Count left downline network
        if (leftDownlineCode) {
          const leftQuery = query(collection(db, 'users'), where('referredBy', '==', leftDownlineCode));
          const leftSnapshot = await getDocs(leftQuery);
          leftCount = leftSnapshot.size;
        }
        
        // Count right downline network
        if (rightDownlineCode) {
          const rightQuery = query(collection(db, 'users'), where('referredBy', '==', rightDownlineCode));
          const rightSnapshot = await getDocs(rightQuery);
          rightCount = rightSnapshot.size;
        }
        
        return Math.min(leftCount, rightCount);
      };

      // Accurate pair calculation using MLMNetwork logic
      const calculateAccuratePairs = async () => {
        // Get complete network members recursively (same as MLMNetwork)
        const getAllNetworkMembers = async (rootReferralCode) => {
          const allMembers = [];
          const processedCodes = new Set();
          
          // Function to recursively get all downlines
          const getDownlines = async (referralCode, level = 0) => {
            if (processedCodes.has(referralCode)) return;
            processedCodes.add(referralCode);
            
            // Get user data
            const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
            const userSnapshot = await getDocs(userQuery);
            
            if (userSnapshot.empty) {
              return;
            }
            
            const userData = userSnapshot.docs[0].data();
            
            // Check payment status - exclude pending and rejected users from pair calculations
            const paymentStatus = userData.paymentStatus || userData.paymentRequestStatus || 'pending';
            if (paymentStatus === 'pending' || paymentStatus === 'rejected') {
              console.log(`Excluding ${paymentStatus} user from MLMService pair calculation: ${referralCode}`);
              return;
            }
            
            // Add current user to members (only approved users)
            allMembers.push({
              id: userSnapshot.docs[0].id,
              name: userData.name || 'Unknown',
              referralCode: userData.referralCode,
              leftDownLine: userData.leftDownLine,
              rightDownLine: userData.rightDownLine,
              level: level,
              hasLeftDownline: !!userData.leftDownLine,
              hasRightDownline: !!userData.rightDownLine,
              leftDownlineExists: false, // Will be updated later
              rightDownlineExists: false, // Will be updated later
              paymentStatus: paymentStatus
            });
            
            // Recursively get left downline
            if (userData.leftDownLine) {
              await getDownlines(userData.leftDownLine, level + 1);
            }
            
            // Recursively get right downline
            if (userData.rightDownLine) {
              await getDownlines(userData.rightDownLine, level + 1);
            }
          };
          
          // Start from root
          await getDownlines(rootReferralCode);
          
          // Update existence flags (same as MLMNetwork)
          allMembers.forEach(member => {
            const leftExists = allMembers.some(m => m.referralCode === member.leftDownLine);
            const rightExists = allMembers.some(m => m.referralCode === member.rightDownLine);
            
            member.leftDownlineExists = leftExists;
            member.rightDownlineExists = rightExists;
          });
          
          return allMembers;
        };
        
        const usersData = await getAllNetworkMembers(referralCode);
        
        // Calculate pairs using MLMNetwork logic
        const completePairs = usersData.filter(u => u.leftDownlineExists && u.rightDownlineExists).length;
        
        return completePairs;
      };
      
      // Helper function to get all network members recursively
      const getAllNetworkMembers = async (startReferralCode) => {
        if (!startReferralCode) return [];
        
        const members = [];
        const visited = new Set();
        
        const traverseNetwork = async (referralCode) => {
          if (visited.has(referralCode)) return;
          visited.add(referralCode);
          
          const userQuery = query(collection(db, 'users'), where('referralCode', '==', referralCode));
          const userSnapshot = await getDocs(userQuery);
          
          if (!userSnapshot.empty) {
            const userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            members.push(userData);
            
            // Traverse left and right downlines
            if (userData.leftDownLine) {
              await traverseNetwork(userData.leftDownLine);
            }
            if (userData.rightDownLine) {
              await traverseNetwork(userData.rightDownLine);
            }
          }
        };
        
        await traverseNetwork(startReferralCode);
        return members;
      };
      
      // Build the complete network tree
      const networkTree = await buildNetworkTree(referralCode);
      if (!networkTree) {
        return { leftCount: 0, rightCount: 0, pairs: 0 };
      }
      
      // Try accurate pair calculation first
      let totalPairs = await calculateAccuratePairs();
      
      // If accurate calculation returns 0, try tree-based calculation
      if (totalPairs === 0) {
        totalPairs = countAllPairs(networkTree);
      }
      
      // If still 0, try simple calculation
      if (totalPairs === 0) {
        totalPairs = await calculateSimplePairs();
      }
      
      // Also count left and right members for reference
      const countMembers = (node) => {
        if (!node) return 0;
        return 1 + countMembers(node.leftNode) + countMembers(node.rightNode);
      };
      
      const leftCount = countMembers(networkTree.leftNode);
      const rightCount = countMembers(networkTree.rightNode);
      
      return { leftCount, rightCount, pairs: totalPairs };
    } catch (error) {
      return { leftCount: 0, rightCount: 0, pairs: 0 };
    }
  }

  static async updateUplineCounts(newUserId, transaction) {
    try {
      const newUserDoc = await getDoc(doc(db, 'mlmUsers', newUserId));
      if (!newUserDoc.exists()) return;

      const newUserData = newUserDoc.data();
      let currentUserId = newUserData.placementParent;
      const position = newUserData.position;

      // Traverse up the tree and update counts
      while (currentUserId) {
        const currentUserRef = doc(db, 'mlmUsers', currentUserId);
        const currentUserDoc = await getDoc(currentUserRef);
        
        if (!currentUserDoc.exists()) break;
        
        const currentUserData = currentUserDoc.data();
        
        // Update count based on position
        const countField = position === 'left' ? 'totalLeftCount' : 'totalRightCount';
        transaction.update(currentUserRef, {
          [countField]: increment(1)
        });

        // Calculate pairs from complete network structure
        const networkPairs = await this.calculateNetworkPairs(currentUserId);
        const totalPairs = networkPairs.pairs;
        const newPairs = totalPairs - (currentUserData.pairsCount || 0);
        

        
        if (newPairs > 0) {
          await this.processPromotionalIncome(currentUserId, newPairs, transaction);
        }

        // Move to next upline
        currentUserId = currentUserData.placementParent;
      }
    } catch (error) {
      throw error;
    }
  }

  // Process promotional income - Vedmurti Plan Implementation
  static async processPromotionalIncome(userId, newPairs, transaction) {
    try {
      const userRef = doc(db, 'mlmUsers', userId);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) return;
      
      const userData = userDoc.data();
    const today = new Date();
      const lastReset = userData.lastDailyReset?.toDate() || new Date(0);
      
      // Check if daily reset is needed (every 24 hours)
      const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
      const shouldReset = hoursDiff >= 24;
      
      let dailyPairs = shouldReset ? 0 : (userData.dailyPairs || 0);
      let dailyIncome = shouldReset ? 0 : (userData.dailyIncome || 0);
      

      
      // Vedmurti Plan: ₹400 per pair, no daily limit
      const incomePerPair = 400;
      const maxDailyPairs = 1000; // Increased limit
      const maxDailyIncome = 400000; // Increased limit (₹400 × 1000 pairs)
      
      const availablePairs = maxDailyPairs - dailyPairs;
      const remainingDailyIncome = maxDailyIncome - dailyIncome;
      
      if (availablePairs > 0 && remainingDailyIncome > 0) {
        // Process pairs with simple 1:1 ratio matching
        const processablePairs = Math.min(newPairs, availablePairs);
        const potentialIncome = processablePairs * incomePerPair;
        const finalIncome = Math.min(potentialIncome, remainingDailyIncome);
        const actualPairs = Math.floor(finalIncome / incomePerPair);
        

        
        if (actualPairs > 0) {
          const newIncome = actualPairs * incomePerPair;
          
          await transaction.update(userRef, {
            promotionalIncome: increment(newIncome),
            totalIncome: increment(newIncome),
            dailyPairs: increment(actualPairs),
            dailyIncome: increment(newIncome),
            pairsCount: increment(actualPairs),
            lastDailyReset: shouldReset ? serverTimestamp() : userData.lastDailyReset
          });
          

        }
      }
    } catch (error) {
      console.error('Error processing promotional income:', error);
      throw error;
    }
  }

  // Calculate Rewards Income - Vedmurti Plan Implementation
  static async calculateRewardsIncome(userId, pairsCount, businessVolume) {
    try {
      const rewards = [];
      let totalReward = 0;

      // Vedmurti Plan Reward Slabs
      const rewardSlabs = [
        { minPairs: 50, maxPairs: 99, reward: 2500, description: "First 50 pairs achievement" },
        { minPairs: 100, maxPairs: 199, reward: 5000, description: "100 pairs milestone" },
        { minPairs: 200, maxPairs: 299, reward: 7500, description: "200 pairs milestone" },
        { minPairs: 300, maxPairs: 399, reward: 10000, description: "300 pairs milestone" },
        { minPairs: 400, maxPairs: 499, reward: 12500, description: "400 pairs milestone" },
        { minPairs: 500, maxPairs: 999, reward: 25000, description: "500 pairs achievement" },
        { minPairs: 1000, maxPairs: 1499, reward: 50000, description: "1000 pairs diamond achievement" },
        { minPairs: 1500, maxPairs: 1999, reward: 75000, description: "1500 pairs platinum achievement" },
        { minPairs: 2000, maxPairs: 2999, reward: 100000, description: "2000 pairs crown achievement" },
        { minPairs: 3000, maxPairs: 4999, reward: 150000, description: "3000 pairs royal achievement" },
        { minPairs: 5000, maxPairs: 9999, reward: 250000, description: "5000 pairs ambassador achievement" }
      ];

      // Business Volume Based Rewards (₹1 lakh to ₹30 lakh)
      const volumeRewards = [
        { minVolume: 100000, maxVolume: 199999, reward: 5000, description: "₹1 lakh business volume" },
        { minVolume: 200000, maxVolume: 299999, reward: 10000, description: "₹2 lakh business volume" },
        { minVolume: 300000, maxVolume: 499999, reward: 15000, description: "₹3 lakh business volume" },
        { minVolume: 500000, maxVolume: 999999, reward: 25000, description: "₹5 lakh business volume" },
        { minVolume: 1000000, maxVolume: 1999999, reward: 50000, description: "₹10 lakh business volume" },
        { minVolume: 2000000, maxVolume: 2999999, reward: 100000, description: "₹20 lakh business volume" },
        { minVolume: 3000000, maxVolume: 9999999, reward: 150000, description: "₹30 lakh business volume" }
      ];

      // Check pair-based rewards
      for (const slab of rewardSlabs) {
        if (pairsCount >= slab.minPairs && pairsCount <= slab.maxPairs) {
          rewards.push({
            type: 'pair_achievement',
            amount: slab.reward,
            description: slab.description,
            pairs: pairsCount,
            achieved: true
          });
          totalReward += slab.reward;
          break;
        }
      }

      // Check volume-based rewards
      for (const slab of volumeRewards) {
        if (businessVolume >= slab.minVolume && businessVolume <= slab.maxVolume) {
          rewards.push({
            type: 'volume_achievement',
            amount: slab.reward,
            description: slab.description,
            volume: businessVolume,
            achieved: true
          });
          totalReward += slab.reward;
          break;
        }
      }

      // Festival Rewards (Monthly Distribution)
      const today = new Date();
      const month = today.getMonth() + 1;
      const festivalRewards = this.getFestivalRewards(month, pairsCount, businessVolume);
      
      if (festivalRewards.length > 0) {
        rewards.push(...festivalRewards);
        totalReward += festivalRewards.reduce((sum, reward) => sum + reward.amount, 0);
      }

      return {
        totalReward,
        rewards,
        eligibleForNextLevel: this.getNextRewardLevel(pairsCount, businessVolume)
      };
    } catch (error) {
      console.error('Error calculating rewards income:', error);
      throw error;
    }
  }

  // Get festival rewards based on month and performance
  static getFestivalRewards(month, pairsCount, businessVolume) {
    const festivalCalendar = {
      1: { name: "New Year Bonus", multiplier: 1.2 }, // January
      2: { name: "Republic Day Special", multiplier: 1.1 }, // February
      3: { name: "Holi Celebration", multiplier: 1.3 }, // March
      4: { name: "Spring Festival", multiplier: 1.1 }, // April
      5: { name: "Summer Boost", multiplier: 1.2 }, // May
      6: { name: "Monsoon Special", multiplier: 1.1 }, // June
      7: { name: "Independence Bonus", multiplier: 1.4 }, // July
      8: { name: "Raksha Bandhan Gift", multiplier: 1.2 }, // August
      9: { name: "Ganesh Festival", multiplier: 1.3 }, // September
      10: { name: "Dussehra Victory", multiplier: 1.5 }, // October
      11: { name: "Diwali Mega Bonus", multiplier: 2.0 }, // November
      12: { name: "Christmas & Year End", multiplier: 1.8 } // December
    };

    const festival = festivalCalendar[month];
    const rewards = [];

    if (festival && pairsCount >= 10) {
      const baseReward = Math.min(pairsCount * 10, 5000); // Base festival reward
      const festivalAmount = Math.floor(baseReward * festival.multiplier);
      
      rewards.push({
        type: 'festival_reward',
        amount: festivalAmount,
        description: `${festival.name} - ${festival.multiplier}x multiplier`,
        month: month,
        achieved: true
      });
    }

    return rewards;
  }

  // Get next reward level information
  static getNextRewardLevel(currentPairs, currentVolume) {
    const nextPairMilestone = [50, 100, 200, 300, 400, 500, 1000, 1500, 2000, 3000, 5000]
      .find(milestone => milestone > currentPairs);
    
    const nextVolumeMilestone = [100000, 200000, 300000, 500000, 1000000, 2000000, 3000000]
      .find(milestone => milestone > currentVolume);

    return {
      nextPairMilestone,
      pairsNeeded: nextPairMilestone ? nextPairMilestone - currentPairs : 0,
      nextVolumeMilestone,
      volumeNeeded: nextVolumeMilestone ? nextVolumeMilestone - currentVolume : 0
    };
  }

  // Enhanced daily reset with proper Vedmurti Plan limits
  static async resetDailyCycles() {
    try {
      const mlmUsersQuery = query(collection(db, 'mlmUsers'));
      const snapshot = await getDocs(mlmUsersQuery);
      
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          dailyPairs: 0,
          dailyIncome: 0,
          lastDailyReset: serverTimestamp()
        });
      });

      await batch.commit();

    } catch (error) {
      console.error('Error resetting daily cycles:', error);
      throw error;
    }
  }

  // Process member joining income (₹2000 per new member)
  static async processMemberJoiningIncome(sponsorId, newMemberId, joiningAmount = 1500) {
    try {
      return await runTransaction(db, async (transaction) => {
        // Vedmurti Plan: ₹2000 joining income for sponsor
        const joiningIncome = 2000;
        
        const sponsorRef = doc(db, 'mlmUsers', sponsorId);
        const sponsorDoc = await transaction.get(sponsorRef);
        
        if (!sponsorDoc.exists()) return;

        // Update sponsor's joining income
        transaction.update(sponsorRef, {
          joiningIncome: increment(joiningIncome),
          totalIncome: increment(joiningIncome),
          currentCycleIncome: increment(joiningIncome),
          totalJoinings: increment(1)
        });

        // Update main user balance
        const mainUserRef = doc(db, 'users', sponsorId);
        transaction.update(mainUserRef, {
          affiliateBalance: increment(joiningIncome),
          totalEarnings: increment(joiningIncome),
          joiningIncome: increment(joiningIncome)
        });

        // Create income record
        const incomeRecord = {
          userId: sponsorId,
          type: 'joining_bonus',
          amount: joiningIncome,
          fromUserId: newMemberId,
          description: `Member Joining Bonus: ₹${joiningIncome} for new member`,
          joiningAmount: joiningAmount,
          createdAt: serverTimestamp(),
          status: 'completed',
          payoutEligible: true,
          payoutCycle: this.getCurrentPayoutCycle()
        };

        const incomeRef = doc(collection(db, 'incomeRecords'));
        transaction.set(incomeRef, incomeRecord);

        return { success: true, amount: joiningIncome };
      });
    } catch (error) {
      console.error('Error processing member joining income:', error);
      throw error;
    }
  }

  // Get user's MLM data
  static async getUserMLMData(userId) {
    try {
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!mlmDoc.exists()) {
        return null;
      }

      const mlmData = mlmDoc.data();
      
      // Get downline data
      const leftChild = mlmData.leftChild ? 
        await this.getUserMLMData(mlmData.leftChild) : null;
      const rightChild = mlmData.rightChild ? 
        await this.getUserMLMData(mlmData.rightChild) : null;

      return {
        ...mlmData,
        leftChildData: leftChild,
        rightChildData: rightChild
      };
    } catch (error) {
      console.error('Error getting MLM data:', error);
      throw error;
    }
  }

  // Get user's team structure
  static async getUserTeamStructure(userId, maxDepth = 5) {
    try {
      const buildTeamTree = async (currentUserId, depth = 0) => {
        if (depth >= maxDepth) return null;

        const mlmDoc = await getDoc(doc(db, 'mlmUsers', currentUserId));
        if (!mlmDoc.exists()) return null;

        const mlmData = mlmDoc.data();
        const userDoc = await getDoc(doc(db, 'users', currentUserId));
        const userData = userDoc.exists() ? userDoc.data() : {};

        const leftTeam = mlmData.leftChild ? 
          await buildTeamTree(mlmData.leftChild, depth + 1) : null;
        const rightTeam = mlmData.rightChild ? 
          await buildTeamTree(mlmData.rightChild, depth + 1) : null;

        return {
          userId: currentUserId,
          name: userData.name || 'Unknown',
          mlmId: mlmData.mlmId,
          level: mlmData.level,
          totalLeftCount: mlmData.totalLeftCount || 0,
          totalRightCount: mlmData.totalRightCount || 0,
          pairsCount: mlmData.pairsCount || 0,
          totalIncome: mlmData.totalIncome || 0,
          joinDate: mlmData.joinDate,
          leftTeam,
          rightTeam,
          depth
        };
      };

      return await buildTeamTree(userId);
    } catch (error) {
      console.error('Error getting team structure:', error);
      throw error;
    }
  }

  // Reset daily cycles (to be called every 12 hours)
  static async resetDailyCycles() {
    try {
      const mlmUsersQuery = query(collection(db, 'mlmUsers'));
      const snapshot = await getDocs(mlmUsersQuery);
      
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          dailyCycles: 0,
          lastCycleReset: serverTimestamp()
        });
      });

      await batch.commit();

    } catch (error) {
      console.error('Error resetting daily cycles:', error);
      throw error;
    }
  }

  // Get comprehensive MLM statistics
  static async getMLMStatistics() {
    try {
      const mlmUsersSnapshot = await getDocs(collection(db, 'mlmUsers'));
      const incomeRecordsSnapshot = await getDocs(collection(db, 'incomeRecords'));
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      let totalUsers = 0;
      let totalIncome = 0;
      let totalPairs = 0;
      let activeUsers = 0;
      let totalPromotionalIncome = 0;
      let totalMentorshipIncome = 0;
      let totalPerformanceRewards = 0;
      
      const rankDistribution = {
        'Starter': 0,
        'Associate': 0,
        'Bronze': 0,
        'Silver': 0,
        'Gold': 0,
        'Platinum': 0,
        'Diamond': 0
      };

      mlmUsersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalUsers++;
        totalIncome += data.totalIncome || 0;
        totalPairs += data.pairsCount || 0;
        totalPromotionalIncome += data.promotionalIncome || 0;
        totalMentorshipIncome += data.mentorshipIncome || 0;
        totalPerformanceRewards += data.performanceRewards || 0;
        
        if (data.isActive) activeUsers++;
        
        const rank = data.currentRank || 'Starter';
        if (rankDistribution.hasOwnProperty(rank)) {
          rankDistribution[rank]++;
        }
      });

      // Calculate time-based statistics
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      
      let todayIncome = 0;
      let weeklyIncome = 0;
      let monthlyIncome = 0;
      let todayTransactions = 0;
      let weeklyTransactions = 0;
      let monthlyTransactions = 0;

      incomeRecordsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate();
        const amount = data.amount || 0;
        
        if (createdAt) {
          if (createdAt >= todayStart) {
            todayIncome += amount;
            todayTransactions++;
          }
          if (createdAt >= weekStart) {
            weeklyIncome += amount;
            weeklyTransactions++;
          }
          if (createdAt >= monthStart) {
            monthlyIncome += amount;
            monthlyTransactions++;
          }
        }
      });

      // Calculate user registration statistics
      let totalRegistrations = 0;
      let pendingVerifications = 0;
      let approvedUsers = 0;

      usersSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        totalRegistrations++;
        
        if (data.paymentProof?.verificationStatus === 'pending') {
          pendingVerifications++;
        } else if (data.affiliateStatus) {
          approvedUsers++;
        }
      });

      return {
        // User Statistics
        totalUsers,
        activeUsers,
        totalRegistrations,
        pendingVerifications,
        approvedUsers,
        conversionRate: totalRegistrations > 0 ? (approvedUsers / totalRegistrations) * 100 : 0,
        
        // Income Statistics
        totalIncome,
        totalPromotionalIncome,
        totalMentorshipIncome,
        totalPerformanceRewards,
        averageIncomePerUser: totalUsers > 0 ? totalIncome / totalUsers : 0,
        
        // Time-based Statistics
        todayIncome,
        weeklyIncome,
        monthlyIncome,
        todayTransactions,
        weeklyTransactions,
        monthlyTransactions,
        
        // Pair Statistics
        totalPairs,
        averagePairsPerUser: totalUsers > 0 ? totalPairs / totalUsers : 0,
        
        // Rank Distribution
        rankDistribution,
        
        // Growth Metrics
        dailyGrowthRate: todayTransactions,
        weeklyGrowthRate: weeklyTransactions,
        monthlyGrowthRate: monthlyTransactions,
        
        // System Health
        activeUserPercentage: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Error getting MLM statistics:', error);
      throw error;
    }
  }

  // Get user's complete MLM dashboard data
  static async getUserDashboardData(userId) {
    try {
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!mlmDoc.exists()) {
        return null;
      }

      const mlmData = mlmDoc.data();
      
      // Get user's income summary
      const incomeData = await this.getUserIncomeSummary(userId);
      
      // Get team structure
      const teamStructure = await this.getUserTeamStructure(userId);
      
      return {
        ...mlmData,
        incomeData,
        teamStructure
      };
    } catch (error) {
      console.error('Error getting user dashboard data:', error);
      throw error;
    }
  }

  // Get user's income summary
  static async getUserIncomeSummary(userId) {
    try {
      const mlmDoc = await getDoc(doc(db, 'mlmUsers', userId));
      if (!mlmDoc.exists()) {
        return {
          promotionalIncome: 0,
          mentorshipIncome: 0,
          performanceRewards: 0,
          totalIncome: 0,
          todayIncome: 0,
          monthlyIncome: 0,
          pairsCount: 0,
          dailyCycles: 0,
          availableCycles: 2
        };
      }

      const mlmData = mlmDoc.data();
      
      // Calculate today's income
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      const todayIncomeQuery = query(
        collection(db, 'incomeRecords'),
        where('userId', '==', userId),
        where('createdAt', '>=', todayStart)
      );
      const todayIncomeSnapshot = await getDocs(todayIncomeQuery);
      let todayIncome = todayIncomeSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
      
      // If no income records for today, use daily income from MLM data
      if (todayIncome === 0) {
        const lastReset = mlmData.lastDailyReset?.toDate() || new Date(0);
        const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
        const shouldReset = hoursDiff >= 24;
        
        if (!shouldReset) {
          // Use the daily income from MLM data if it hasn't been reset today
          todayIncome = mlmData.dailyIncome || 0;
        }
      }

      // Calculate monthly income
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthlyIncomeQuery = query(
        collection(db, 'incomeRecords'),
        where('userId', '==', userId),
        where('createdAt', '>=', monthStart)
      );
      const monthlyIncomeSnapshot = await getDocs(monthlyIncomeQuery);
      const monthlyIncome = monthlyIncomeSnapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

      // Check if daily cycles need reset
      const lastReset = mlmData.lastCycleReset?.toDate() || new Date(0);
      const hoursDiff = (today - lastReset) / (1000 * 60 * 60);
      const dailyCycles = hoursDiff >= 12 ? 0 : (mlmData.dailyCycles || 0);

      return {
        promotionalIncome: mlmData.promotionalIncome || 0,
        mentorshipIncome: mlmData.mentorshipIncome || 0,
        performanceRewards: mlmData.performanceRewards || 0,
        totalIncome: mlmData.totalIncome || 0,
        todayIncome,
        monthlyIncome,
        pairsCount: mlmData.pairsCount || 0,
        dailyCycles,
        availableCycles: Math.max(0, 2 - dailyCycles),
        totalLeftCount: mlmData.totalLeftCount || 0,
        totalRightCount: mlmData.totalRightCount || 0,
        level: mlmData.level || 0,
        mlmId: mlmData.mlmId
      };
    } catch (error) {
      console.error('Error getting income summary:', error);
      throw error;
    }
  }

  // Recalculate and update promotional income for a user
  static async recalculatePromotionalIncome(userId) {
    try {
  
      
      // First check if user exists in MLM collection
      const userRef = doc(db, 'mlmUsers', userId);
      const userDoc = await getDoc(userRef);
      
      let referralCode;
      let userData;
      
      if (!userDoc.exists()) {

        
        // Try to get user data from users collection
        const mainUserRef = doc(db, 'users', userId);
        const mainUserDoc = await getDoc(mainUserRef);
        
        if (!mainUserDoc.exists()) {
          throw new Error('User not found in any collection');
        }
        
        const mainUserData = mainUserDoc.data();
        referralCode = mainUserData.referralCode;
        
        if (!referralCode) {
          throw new Error('No referral code found for user');
        }
        
        
        
        // Create basic MLM data structure for calculation
        userData = {
          referralCode: referralCode,
          promotionalIncome: 0,
          pairsCount: 0,
          totalIncome: 0
        };
      } else {
        userData = userDoc.data();
        referralCode = userData.referralCode;
        
        if (!referralCode) {
  
          return;
        }
      }
      
      // Build tree for income calculation
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
      
      const treeData = await buildTree(referralCode);
      if (!treeData) {

        return;
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
      

      
      // Update the user's promotional income in the database
      if (userDoc.exists()) {
        // User exists in MLM collection, update it
        await updateDoc(userRef, {
          promotionalIncome: promotionalIncome,
          pairsCount: pairs,
          totalIncome: (userData.totalIncome || 0) - (userData.promotionalIncome || 0) + promotionalIncome
        });
      }
      
      // Always update the main user document
      const mainUserRef = doc(db, 'users', userId);
      await updateDoc(mainUserRef, {
        promotionalIncome: promotionalIncome
      });
      

      return promotionalIncome;
    } catch (error) {
      console.error('Error recalculating promotional income:', error);
      throw error;
    }
  }
}

export default MLMService;
