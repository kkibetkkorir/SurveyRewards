// src/firebase.js
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Collections
const USERS_COLLECTION = "users";
const TRANSACTIONS_COLLECTION = "transactions";
const SURVEYS_COLLECTION = "surveys";
const SURVEY_COMPLETIONS_COLLECTION = "surveyCompletions";
const PACKAGES_COLLECTION = "packages";
const USER_PACKAGES_COLLECTION = "userPackages";
const BONUSES_COLLECTION = "bonuses";
const WITHDRAWALS_COLLECTION = "withdrawals";

// ==================== AUTHENTICATION ====================

/**
 * Register a new user with phone and password
 * @param {string} phone - User's phone number
 * @param {string} password - User's password
 * @param {string} fullName - User's full name
 * @returns {Promise<Object>} - User data
 */
export const registerUser = async (phone, password, fullName) => {
  try {
    // Convert phone to email format for Firebase auth
    const email = `${phone}@surveyrewards.com`;

    // Create user in Firebase Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Update profile with display name
    await updateProfile(user, {
      displayName: fullName,
    });

    // Create user document in Firestore
    const userData = {
      uid: user.uid,
      phone: phone,
      fullName: fullName,
      email: email,
      balance: 0,
      totalEarnings: 0,
      surveysCompleted: 0,
      currentPackage: null,
      availableSurveys: 0,
      packageExpiry: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isActive: true,
      lastLogin: serverTimestamp(),
    };

    await setDoc(doc(db, USERS_COLLECTION, user.uid), userData);

    // Initialize user's bonuses
    await initializeUserBonuses(user.uid);

    return {
      success: true,
      user: userData,
      token: user.accessToken,
    };
  } catch (error) {
    console.error("Registration error:", error);
    let errorMessage = "Registration failed";

    switch (error.code) {
      case "auth/email-already-in-use":
        errorMessage = "Phone number already registered";
        break;
      case "auth/weak-password":
        errorMessage = "Password is too weak";
        break;
      case "auth/invalid-email":
        errorMessage = "Invalid phone number format";
        break;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Login user with phone and password
 * @param {string} phone - User's phone number
 * @param {string} password - User's password
 * @returns {Promise<Object>} - User data
 */
export const loginUser = async (phone, password) => {
  try {
    const email = `${phone}@surveyrewards.com`;
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Get user data from Firestore
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));

    if (!userDoc.exists()) {
      throw new Error("User data not found");
    }

    const userData = userDoc.data();

    // Update last login
    await updateDoc(doc(db, USERS_COLLECTION, user.uid), {
      lastLogin: serverTimestamp(),
    });

    return {
      success: true,
      user: userData,
      token: user.accessToken,
    };
  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = "Login failed";

    switch (error.code) {
      case "auth/user-not-found":
        errorMessage = "Phone number not registered";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many attempts. Try again later";
        break;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Logout current user
 * @returns {Promise<Object>}
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Logout error:", error);
    return {
      success: false,
      error: "Logout failed",
    };
  }
};

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} - Current user or null
 */
export const getCurrentUser = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
        if (userDoc.exists()) {
          resolve(userDoc.data());
        } else {
          resolve(null);
        }
      } else {
        resolve(null);
      }
      unsubscribe();
    });
  });
};

/**
 * Listen to auth state changes
 * @param {Function} callback - Callback function
 * @returns {Function} - Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const userDoc = await getDoc(doc(db, USERS_COLLECTION, user.uid));
      callback(userDoc.exists() ? userDoc.data() : null);
    } else {
      callback(null);
    }
  });
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<Object>}
 */
export const updateUserProfile = async (userId, updates) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });

    // Get updated user data
    const userDoc = await getDoc(userRef);
    return {
      success: true,
      user: userDoc.data(),
    };
  } catch (error) {
    console.error("Update profile error:", error);
    return {
      success: false,
      error: "Failed to update profile",
    };
  }
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>}
 */
export const changeUserPassword = async (
  userId,
  currentPassword,
  newPassword,
) => {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error("No authenticated user");
    }

    // Re-authenticate user
    const email = user.email;
    const credential = EmailAuthProvider.credential(email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);

    return {
      success: true,
      message: "Password updated successfully",
    };
  } catch (error) {
    console.error("Change password error:", error);
    let errorMessage = "Failed to change password";

    switch (error.code) {
      case "auth/wrong-password":
        errorMessage = "Current password is incorrect";
        break;
      case "auth/requires-recent-login":
        errorMessage = "Please login again to change password";
        break;
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
};

// ==================== USER OPERATIONS ====================

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User data or null
 */
export const getUserById = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
};

/**
 * Update user balance
 * @param {string} userId - User ID
 * @param {number} amount - Amount to add/subtract
 * @param {string} type - Transaction type
 * @param {Object} metadata - Additional transaction data
 * @returns {Promise<Object>}
 */
export const updateUserBalance = async (
  userId,
  amount,
  type,
  metadata = {},
) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);

    // Update user balance
    await updateDoc(userRef, {
      balance: increment(amount),
      updatedAt: serverTimestamp(),
      ...(amount > 0 && type === "survey"
        ? {
            totalEarnings: increment(amount),
            surveysCompleted: increment(1),
          }
        : {}),
    });

    // Create transaction record
    const transactionData = {
      userId,
      type,
      amount,
      previousBalance: metadata.previousBalance || 0,
      newBalance: (metadata.previousBalance || 0) + amount,
      status: "completed",
      metadata,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);

    // Get updated user data
    const userDoc = await getDoc(userRef);

    return {
      success: true,
      user: userDoc.data(),
      transaction: transactionData,
    };
  } catch (error) {
    console.error("Update balance error:", error);
    return {
      success: false,
      error: "Failed to update balance",
    };
  }
};

// ==================== PACKAGES ====================

/**
 * Get all available packages
 * @returns {Promise<Array>} - Array of packages
 */
export const getAllPackages = async () => {
  try {
    const packagesQuery = query(
      collection(db, PACKAGES_COLLECTION),
      //where("isActive", "==", true),
      orderBy("price", "asc"),
    );

    const snapshot = await getDocs(packagesQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Get packages error:", error);
    return [];
  }
};

/**
 * Purchase a package for user
 * @param {string} userId - User ID
 * @param {string} packageId - Package ID
 * @param {number} amount - Purchase amount
 * @returns {Promise<Object>}
 */
export const purchasePackage = async (userId, packageId, amount) => {
  try {
    // Get package details
    const packageDoc = await getDoc(doc(db, PACKAGES_COLLECTION, packageId));
    if (!packageDoc.exists()) {
      throw new Error("Package not found");
    }

    const packageData = packageDoc.data();

    // Update user package
    const userRef = doc(db, USERS_COLLECTION, userId);
    const packageExpiry = new Date();
    packageExpiry.setDate(packageExpiry.getDate() + packageData.duration);

    await updateDoc(userRef, {
      currentPackage: packageId,
      availableSurveys: increment(packageData.surveys),
      packageExpiry: packageExpiry.toISOString(),
      updatedAt: serverTimestamp(),
    });

    // Create user package record
    const userPackageData = {
      userId,
      packageId,
      packageName: packageData.name,
      price: amount,
      surveys: packageData.surveys,
      duration: packageData.duration,
      purchasedAt: serverTimestamp(),
      expiresAt: packageExpiry.toISOString(),
      isActive: true,
    };

    await addDoc(collection(db, USER_PACKAGES_COLLECTION), userPackageData);

    // Create transaction for purchase
    const transactionData = {
      userId,
      type: "package_purchase",
      amount: -amount,
      previousBalance: (await getDoc(userRef)).data().balance + amount,
      newBalance: (await getDoc(userRef)).data().balance,
      status: "completed",
      metadata: {
        packageId,
        packageName: packageData.name,
        surveys: packageData.surveys,
        duration: packageData.duration,
      },
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);

    return {
      success: true,
      package: packageData,
      userPackage: userPackageData,
    };
  } catch (error) {
    console.error("Purchase package error:", error);
    return {
      success: false,
      error: "Failed to purchase package",
    };
  }
};

/**
 * Get user's active package
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - Active package or null
 */
export const getUserActivePackage = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    const userData = userDoc.data();

    if (!userData.currentPackage) {
      return null;
    }

    const packageDoc = await getDoc(
      doc(db, PACKAGES_COLLECTION, userData.currentPackage),
    );

    return packageDoc.exists()
      ? {
          id: packageDoc.id,
          ...packageDoc.data(),
          availableSurveys: userData.availableSurveys,
          packageExpiry: userData.packageExpiry,
        }
      : null;
  } catch (error) {
    console.error("Get user package error:", error);
    return null;
  }
};

// ==================== SURVEYS ====================

/**
 * Get all available surveys
 * @param {string} userId - User ID (optional)
 * @returns {Promise<Array>} - Array of surveys
 */
export const getAvailableSurveys = async (userId = null) => {
  try {
    const surveysQuery = query(
      collection(db, SURVEYS_COLLECTION),
      where("isActive", "==", true),
      orderBy("reward", "desc"),
    );

    const snapshot = await getDocs(surveysQuery);
    let surveys = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // If userId is provided, check which surveys are completed
    if (userId) {
      const completedQuery = query(
        collection(db, SURVEY_COMPLETIONS_COLLECTION),
        where("userId", "==", userId),
      );

      const completedSnapshot = await getDocs(completedQuery);
      const completedSurveyIds = completedSnapshot.docs.map(
        (doc) => doc.data().surveyId,
      );

      surveys = surveys.map((survey) => ({
        ...survey,
        completed: completedSurveyIds.includes(survey.id),
      }));
    }

    return surveys;
  } catch (error) {
    console.error("Get surveys error:", error);
    return [];
  }
};

/**
 * Complete a survey
 * @param {string} userId - User ID
 * @param {string} surveyId - Survey ID
 * @returns {Promise<Object>}
 */
export const completeSurvey = async (userId, surveyId) => {
  try {
    // Get survey details
    const surveyDoc = await getDoc(doc(db, SURVEYS_COLLECTION, surveyId));
    if (!surveyDoc.exists()) {
      throw new Error("Survey not found");
    }

    const surveyData = surveyDoc.data();

    // Check if user has already completed this survey
    const completionQuery = query(
      collection(db, SURVEY_COMPLETIONS_COLLECTION),
      where("userId", "==", userId),
      where("surveyId", "==", surveyId),
    );

    const existingCompletions = await getDocs(completionQuery);
    if (!existingCompletions.empty) {
      throw new Error("Survey already completed");
    }

    // Record survey completion
    const completionData = {
      userId,
      surveyId,
      surveyTitle: surveyData.title,
      reward: surveyData.reward,
      completedAt: serverTimestamp(),
    };

    await addDoc(collection(db, SURVEY_COMPLETIONS_COLLECTION), completionData);

    // Update user balance and survey count
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    await updateDoc(userRef, {
      balance: increment(surveyData.reward),
      totalEarnings: increment(surveyData.reward),
      surveysCompleted: increment(1),
      availableSurveys: increment(-1),
      updatedAt: serverTimestamp(),
    });

    // Create transaction for survey completion
    const transactionData = {
      userId,
      type: "survey_earning",
      amount: surveyData.reward,
      previousBalance: userData.balance,
      newBalance: userData.balance + surveyData.reward,
      status: "completed",
      metadata: {
        surveyId,
        surveyTitle: surveyData.title,
        category: surveyData.category,
        duration: surveyData.duration,
      },
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);

    return {
      success: true,
      reward: surveyData.reward,
      survey: surveyData,
      completion: completionData,
    };
  } catch (error) {
    console.error("Complete survey error:", error);
    return {
      success: false,
      error: error.message || "Failed to complete survey",
    };
  }
};

// ==================== TRANSACTIONS ====================

/**
 * Get user transactions
 * @param {string} userId - User ID
 * @param {string} type - Transaction type filter (optional)
 * @param {number} limitCount - Limit results (optional)
 * @returns {Promise<Array>} - Array of transactions
 */
export const getUserTransactions = async (
  userId,
  type = null,
  limitCount = 50,
) => {
  try {
    let transactionsQuery;

    if (type) {
      transactionsQuery = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where("userId", "==", userId),
        where("type", "==", type),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      );
    } else {
      transactionsQuery = query(
        collection(db, TRANSACTIONS_COLLECTION),
        where("userId", "==", userId),
        orderBy("createdAt", "desc"),
        limit(limitCount),
      );
    }

    const snapshot = await getDocs(transactionsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Get transactions error:", error);
    return [];
  }
};

/**
 * Create a deposit transaction
 * @param {string} userId - User ID
 * @param {number} amount - Deposit amount
 * @param {string} method - Payment method
 * @param {Object} metadata - Additional data
 * @returns {Promise<Object>}
 */
export const createDeposit = async (userId, amount, method, metadata = {}) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    // Update user balance
    await updateDoc(userRef, {
      balance: increment(amount),
      updatedAt: serverTimestamp(),
    });

    // Create transaction record
    const transactionData = {
      userId,
      type: "deposit",
      amount,
      previousBalance: userData.balance,
      newBalance: userData.balance + amount,
      status: "completed",
      method,
      metadata,
      createdAt: serverTimestamp(),
    };

    const transactionRef = await addDoc(
      collection(db, TRANSACTIONS_COLLECTION),
      transactionData,
    );

    return {
      success: true,
      transaction: {
        id: transactionRef.id,
        ...transactionData,
      },
      newBalance: userData.balance + amount,
    };
  } catch (error) {
    console.error("Create deposit error:", error);
    return {
      success: false,
      error: "Failed to create deposit",
    };
  }
};

/**
 * Create a withdrawal request
 * @param {string} userId - User ID
 * @param {number} amount - Withdrawal amount
 * @param {string} phone - M-Pesa phone number
 * @returns {Promise<Object>}
 */
export const createWithdrawal = async (userId, amount, phone) => {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    const userData = userDoc.data();

    // Check if user has sufficient balance
    if (userData.balance < amount) {
      throw new Error("Insufficient balance");
    }

    // Calculate service fee (1%)
    const serviceFee = amount * 0.01;
    const netAmount = amount - serviceFee;

    // Update user balance (deduct amount + fee)
    await updateDoc(userRef, {
      balance: increment(-(amount + serviceFee)),
      updatedAt: serverTimestamp(),
    });

    // Create withdrawal record
    const withdrawalData = {
      userId,
      amount,
      serviceFee,
      netAmount,
      phone,
      status: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const withdrawalRef = await addDoc(
      collection(db, WITHDRAWALS_COLLECTION),
      withdrawalData,
    );

    // Create transaction record
    const transactionData = {
      userId,
      type: "withdrawal",
      amount: -(amount + serviceFee),
      previousBalance: userData.balance,
      newBalance: userData.balance - (amount + serviceFee),
      status: "pending",
      method: "mpesa",
      metadata: {
        withdrawalId: withdrawalRef.id,
        phone,
        serviceFee,
        netAmount,
      },
      createdAt: serverTimestamp(),
    };

    const transactionRef = await addDoc(
      collection(db, TRANSACTIONS_COLLECTION),
      transactionData,
    );

    return {
      success: true,
      withdrawal: {
        id: withdrawalRef.id,
        ...withdrawalData,
      },
      transaction: {
        id: transactionRef.id,
        ...transactionData,
      },
      newBalance: userData.balance - (amount + serviceFee),
    };
  } catch (error) {
    console.error("Create withdrawal error:", error);
    return {
      success: false,
      error: error.message || "Failed to create withdrawal",
    };
  }
};

// ==================== BONUSES ====================

/**
 * Initialize user bonuses
 * @param {string} userId - User ID
 */
const initializeUserBonuses = async (userId) => {
  try {
    const bonusesData = {
      userId,
      availableBonuses: [],
      claimedBonuses: [],
      referralCode: generateReferralCode(),
      totalBonusEarned: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(doc(db, "userBonuses", userId), bonusesData);
  } catch (error) {
    console.error("Initialize bonuses error:", error);
  }
};

/**
 * Get user bonuses
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} - User bonuses or null
 */
export const getUserBonuses = async (userId) => {
  try {
    const bonusesDoc = await getDoc(doc(db, "userBonuses", userId));
    return bonusesDoc.exists() ? bonusesDoc.data() : null;
  } catch (error) {
    console.error("Get bonuses error:", error);
    return null;
  }
};

/**
 * Claim a bonus
 * @param {string} userId - User ID
 * @param {string} bonusId - Bonus ID
 * @returns {Promise<Object>}
 */
export const claimBonus = async (userId, bonusId) => {
  try {
    // Get bonus details
    const bonusDoc = await getDoc(doc(db, BONUSES_COLLECTION, bonusId));
    if (!bonusDoc.exists()) {
      throw new Error("Bonus not found");
    }

    const bonusData = bonusDoc.data();

    // Check if bonus is available and user is eligible
    const userBonuses = await getUserBonuses(userId);
    if (userBonuses.claimedBonuses.includes(bonusId)) {
      throw new Error("Bonus already claimed");
    }

    // Update user bonuses
    const bonusesRef = doc(db, "userBonuses", userId);
    await updateDoc(bonusesRef, {
      claimedBonuses: [...userBonuses.claimedBonuses, bonusId],
      availableBonuses: userBonuses.availableBonuses.filter(
        (id) => id !== bonusId,
      ),
      totalBonusEarned: increment(bonusData.amount || 0),
      updatedAt: serverTimestamp(),
    });

    // Update user balance if bonus has amount
    if (bonusData.amount > 0) {
      const userRef = doc(db, USERS_COLLECTION, userId);
      await updateDoc(userRef, {
        balance: increment(bonusData.amount),
        updatedAt: serverTimestamp(),
      });

      // Create transaction for bonus
      const transactionData = {
        userId,
        type: "bonus",
        amount: bonusData.amount,
        previousBalance:
          (await getDoc(userRef)).data().balance - bonusData.amount,
        newBalance: (await getDoc(userRef)).data().balance,
        status: "completed",
        metadata: {
          bonusId,
          bonusName: bonusData.name,
          bonusType: bonusData.type,
        },
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, TRANSACTIONS_COLLECTION), transactionData);
    }

    return {
      success: true,
      bonus: bonusData,
      amount: bonusData.amount || 0,
    };
  } catch (error) {
    console.error("Claim bonus error:", error);
    return {
      success: false,
      error: error.message || "Failed to claim bonus",
    };
  }
};

// ==================== UTILITIES ====================

/**
 * Generate a random referral code
 * @returns {string} - Referral code
 */
const generateReferralCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

/**
 * Upload profile picture
 * @param {string} userId - User ID
 * @param {File} file - Image file
 * @returns {Promise<Object>}
 */
export const uploadProfilePicture = async (userId, file) => {
  try {
    const storageRef = ref(storage, `profile-pictures/${userId}/${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Update user profile with image URL
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      profilePicture: downloadURL,
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      url: downloadURL,
    };
  } catch (error) {
    console.error("Upload profile picture error:", error);
    return {
      success: false,
      error: "Failed to upload profile picture",
    };
  }
};

/**
 * Check if user has active package
 * @param {string} userId - User ID
 * @returns {Promise<boolean>}
 */
export const hasActivePackage = async (userId) => {
  try {
    const userDoc = await getDoc(doc(db, USERS_COLLECTION, userId));
    const userData = userDoc.data();

    if (!userData.currentPackage || !userData.packageExpiry) {
      return false;
    }

    const expiryDate = new Date(userData.packageExpiry);
    const now = new Date();

    return expiryDate > now && userData.availableSurveys > 0;
  } catch (error) {
    console.error("Check active package error:", error);
    return false;
  }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * Add a new survey (Admin only)
 * @param {Object} surveyData - Survey data
 * @returns {Promise<Object>}
 */
export const addSurvey = async (surveyData) => {
  try {
    const surveyRef = await addDoc(collection(db, SURVEYS_COLLECTION), {
      ...surveyData,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      surveyId: surveyRef.id,
    };
  } catch (error) {
    console.error("Add survey error:", error);
    return {
      success: false,
      error: "Failed to add survey",
    };
  }
};

/**
 * Update withdrawal status (Admin only)
 * @param {string} withdrawalId - Withdrawal ID
 * @param {string} status - New status
 * @returns {Promise<Object>}
 */
export const updateWithdrawalStatus = async (withdrawalId, status) => {
  try {
    const withdrawalRef = doc(db, WITHDRAWALS_COLLECTION, withdrawalId);
    await updateDoc(withdrawalRef, {
      status,
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      message: "Withdrawal status updated successfully",
    };
  } catch (error) {
    console.error("Update withdrawal status error:", error);
    return {
      success: false,
      error: "Failed to update withdrawal status",
    };
  }
};

// ==================== ADMIN FUNCTIONS ====================

/**
 * Add a new package (Admin only)
 * @param {Object} packageData - Package data
 * @returns {Promise<Object>}
 */
export const addPackage = async (packageData) => {
  try {
    const packageRef = await addDoc(collection(db, PACKAGES_COLLECTION), {
      ...packageData,
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      packageId: packageRef.id,
    };
  } catch (error) {
    console.error("Add package error:", error);
    return {
      success: false,
      error: "Failed to add package",
    };
  }
};

/**
 * Get all users (Admin only)
 * @returns {Promise<Array>} - Array of users
 */
export const getAllUsers = async () => {
  try {
    const usersQuery = query(
      collection(db, USERS_COLLECTION),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Get all users error:", error);
    return [];
  }
};

/**
 * Update user status (Admin only)
 * @param {string} userId - User ID
 * @param {boolean} isActive - New status
 * @returns {Promise<Object>}
 */
export const updateUserStatus = async (userId, isActive) => {
  try {
    await updateDoc(doc(db, USERS_COLLECTION, userId), {
      isActive,
      updatedAt: serverTimestamp(),
    });

    return {
      success: true,
      message: "User status updated successfully",
    };
  } catch (error) {
    console.error("Update user status error:", error);
    return {
      success: false,
      error: "Failed to update user status",
    };
  }
};

/**
 * Get all withdrawals (Admin only)
 * @returns {Promise<Array>} - Array of withdrawals
 */
export const getAllWithdrawals = async () => {
  try {
    const withdrawalsQuery = query(
      collection(db, WITHDRAWALS_COLLECTION),
      orderBy("createdAt", "desc"),
    );

    const snapshot = await getDocs(withdrawalsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Get all withdrawals error:", error);
    return [];
  }
};

export { auth, db, storage };

export default app;
