import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
  getAuth,
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { getSafeStorageItem } from '../utils/storage';

export { getSafeStorageItem };

export const getInitialUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch (e) {
    localStorage.removeItem('user');
    return null;
  }
};

export const getInitialToken = () => {
  const token = localStorage.getItem('access_token') || localStorage.getItem('token');
  return token && token !== 'undefined' && token !== 'null' ? token : null;
};

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getInitialUser());
  const [token, setToken] = useState(() => getInitialToken());
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!getInitialUser() || !!getInitialToken());
  const [loading, setLoading] = useState(true);




  useEffect(() => {
    const authInstance = getAuth();
    const unsubscribe = onAuthStateChanged(authInstance, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.email) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || '';
          let exists = false;

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (apiUrl) {
            try {
              const res = await fetch(`${apiUrl}/api/auth/check-email?email=${encodeURIComponent(firebaseUser.email)}`);
              if (res.ok) {
                const data = await res.json();
                exists = Boolean(data.exists) || userSnap.exists();
              } else {
                exists = userSnap.exists();
              }
            } catch (e) {
              exists = userSnap.exists();
            }
          } else {
            const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
            exists = userSnap.exists() || registered.some((u) => u.email?.toLowerCase() === firebaseUser.email.toLowerCase());
          }

          if (!exists) {
            // Account was deleted or not registered: Force Firebase SignOut & Clear State
            await signOut(authInstance).catch(() => {});
            localStorage.removeItem('access_token');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            return;
          }

          const idToken = await firebaseUser.getIdToken().catch(() => null);
          if (idToken) {
            setToken(idToken);
            localStorage.setItem('access_token', idToken);
          }

          const userProfile = {
            uid: firebaseUser.uid,
            id: firebaseUser.uid,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.email}`,
            avatar_url: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.email}`,
            ...(userSnap.exists() ? userSnap.data() : {}),
          };
          setUser(userProfile);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(userProfile));
        } catch (err) {
          console.error('Session validation error:', err);
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setToken(null);
        setIsAuthenticated(false);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (username, email, password) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    const userData = {
      username,
      email,
      createdAt: new Date(),
    };
    await setDoc(doc(db, 'users', firebaseUser.uid), userData);
    return firebaseUser;
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      setToken(null);
      setIsAuthenticated(false);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  };

  const updateUserProfile = async (updates) => {
    const mergedUser = { ...user, ...updates };
    setUser(mergedUser);
    localStorage.setItem('user', JSON.stringify(mergedUser));

    if (auth.currentUser && updates.email && updates.email !== auth.currentUser.email) {
      try {
        await updateEmail(auth.currentUser, updates.email);
      } catch (err) {
        console.warn('Firebase email update warning:', err);
      }
    }

    const uid = user?.uid || user?.id || auth.currentUser?.uid;
    if (uid) {
      try {
        await setDoc(doc(db, 'users', uid), updates, { merge: true });
      } catch (err) {
        console.error('Failed to update profile in Firestore:', err);
      }
    }
    return mergedUser;
  };

  const changePassword = async (currentPassword, newPassword) => {
    if (!auth.currentUser) {
      throw new Error('No active user session found.');
    }
    if (currentPassword && auth.currentUser.email) {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
    }
    await updatePassword(auth.currentUser, newPassword);
  };

  const deleteAccount = async () => {
    const authInstance = getAuth();
    const currentUser = authInstance.currentUser || auth.currentUser;
    const currentUserId = user?.id || user?._id || user?.email || user?.uid;

    try {
      // 1. Delete user directly from Firebase Authentication Console
      if (currentUser) {
        await deleteUser(currentUser);
        console.log('User successfully deleted from Firebase Auth');
      }

      const uid = user?.uid || user?.id || currentUser?.uid;
      if (uid) {
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (e) {
          console.warn('Could not delete user doc in Firestore:', e);
        }
      }

      // 2. Call backend DB delete if applicable
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || '';
      if (token && apiUrl) {
        await fetch(`${apiUrl}/api/auth/delete-account`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch((e) => console.warn(e));
      }
    } catch (err) {
      console.error('Error deleting user from Firebase:', err);
      if (err.code === 'auth/requires-recent-login') {
        alert('Please re-login first before deleting your account for security verification.');
        return;
      }
    } finally {
      // Force SignOut from Firebase
      await signOut(authInstance).catch(() => {});

      // 3. Remove user from registered users array if stored locally
      try {
        const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
        const updatedUsers = registered.filter(
          (u) => u.id !== currentUserId && u.email !== user?.email
        );
        localStorage.setItem('registered_users', JSON.stringify(updatedUsers));
      } catch (e) {
        console.warn(e);
      }

      // Clear all local storage and session data
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setIsAuthenticated(false);

      // 4. Redirect to login
      window.location.replace('/login');
    }
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        token,
        setToken,
        loading,
        isAuthenticated: isAuthenticated || !!user,
        setIsAuthenticated,
        login,
        register,
        logout,
        updateUserProfile,
        changePassword,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


