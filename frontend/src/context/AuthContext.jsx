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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          setIsAuthenticated(true);
          localStorage.setItem('access_token', idToken);

          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            const userData = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              ...docSnap.data(),
            };
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            const fallbackUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            };
            setUser(fallbackUser);
            localStorage.setItem('user', JSON.stringify(fallbackUser));
          }
        } catch (err) {
          console.error('Error fetching user data from Firestore:', err);
          const fallbackUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          };
          setUser(fallbackUser);
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
    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/delete-account`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }).catch((e) => console.warn('Backend delete-account completed with fallback:', e));
      }

      const uid = user?.uid || user?.id || auth.currentUser?.uid;
      if (uid) {
        try {
          await deleteDoc(doc(db, 'users', uid));
        } catch (e) {
          console.warn('Could not delete user doc in Firestore:', e);
        }
      }
      if (auth.currentUser) {
        try {
          await deleteUser(auth.currentUser);
        } catch (e) {
          console.warn('Firebase delete user warning:', e);
        }
      }
    } catch (err) {
      console.error('Failed to delete user account on backend:', err);
    } finally {
      // Clear all stored credentials and sessions
      localStorage.clear();
      sessionStorage.clear();
      setUser(null);
      setIsAuthenticated(false);
      window.location.replace('/login');
    }
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
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


