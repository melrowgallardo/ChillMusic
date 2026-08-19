import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Snackbar,
  Divider,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockResetIcon from '@mui/icons-material/LockReset';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { parseSafeJson } from '../utils/storage';

const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: 10 }}>
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
    />
  </svg>
);

const formatErrorMessage = (err) => {
  if (!err) return 'Login failed. Please check your credentials.';

  switch (err.code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password.';
    case 'auth/invalid-email':
      return 'Invalid email address format.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return err.message || 'Login failed. Please try again.';
  }
};

const Login = () => {
  const navigate = useNavigate();

  const [isResetMode, setIsResetMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password states
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  // Toast feedback state
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      navigate('/');
    } catch (err) {
      console.error('Login error detail:', err);
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const authContext = useAuth() || {};
  const setUser = authContext.setUser;
  const setIsAuthenticated = authContext.setIsAuthenticated;

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;
      const email = googleUser.email;
      const idToken = await googleUser.getIdToken();

      // Check registration
      const apiUrl = import.meta.env.VITE_API_URL || '';
      let isRegistered = false;

      const userDocRef = doc(db, 'users', googleUser.uid);
      const userSnap = await getDoc(userDocRef);

      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl}/api/auth/check-email?email=${encodeURIComponent(email)}`);
          const data = await parseSafeJson(res);
          isRegistered = (res.ok && Boolean(data.exists)) || userSnap.exists();
        } catch (err) {
          console.warn('Backend verification error:', err);
          isRegistered = userSnap.exists();
        }
      } else {
        const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
        isRegistered = userSnap.exists() || registered.some((u) => u.email?.toLowerCase() === email?.toLowerCase());
      }

      if (!isRegistered) {
        await signOut(auth).catch(() => {});
        const errMsg = 'This email is not registered. Please sign up first.';
        setError(errMsg);
        setToast({ open: true, message: errMsg, severity: 'error' });
        setLoading(false);
        return;
      }

      // Complete Login
      const userProfile = {
        id: googleUser.uid,
        uid: googleUser.uid,
        username: googleUser.displayName || email.split('@')[0],
        email: email,
        avatar: googleUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        avatar_url: googleUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        ...(userSnap.exists() ? userSnap.data() : {}),
      };

      localStorage.setItem('user', JSON.stringify(userProfile));
      localStorage.setItem('access_token', idToken);
      if (setUser) setUser(userProfile);
      if (setIsAuthenticated) setIsAuthenticated(true);
      window.location.replace('/');
    } catch (err) {
      console.error('Google Login Error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setError('');
      } else {
        const errMsg = err.message?.includes('JSON')
          ? 'This email is not registered. Please sign up first.'
          : (err.message || 'Login failed.');
        setError(errMsg);
        setToast({ open: true, message: errMsg, severity: 'error' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchToReset = () => {
    setResetEmail(email || '');
    setResetError('');
    setResetSuccess('');
    setIsResetMode(true);
  };

  const handleSwitchToLogin = () => {
    setIsResetMode(false);
    setError('');
    setResetError('');
    setResetSuccess('');
  };

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      const errMsg = 'Please enter your email address.';
      setResetError(errMsg);
      setToast({ open: true, message: errMsg, severity: 'error' });
      return;
    }
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      const succMsg = 'A password reset link has been sent to your email. Please check your inbox or spam folder.';
      setResetSuccess(succMsg);
      setToast({ open: true, message: 'Password reset link sent to your inbox!', severity: 'success' });
    } catch (err) {
      console.error('Password reset error:', err);
      let errMsg = 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        errMsg = 'No user found with this email address.';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Invalid email address format.';
      } else if (err.message) {
        errMsg = err.message;
      }
      setResetError(errMsg);
      setToast({ open: true, message: errMsg, severity: 'error' });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Paper
        className="glass-panel"
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        <Box
          sx={{
            width: 50,
            height: 50,
            borderRadius: 'var(--radius-full)',
            backgroundColor: isResetMode ? 'rgba(236, 72, 153, 0.2)' : 'rgba(124, 58, 237, 0.2)',
            color: isResetMode ? 'var(--accent-pink)' : 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isResetMode ? <LockResetIcon /> : <LockOutlinedIcon />}
        </Box>

        {!isResetMode ? (
          /* LOGIN SCREEN */
          <>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                Welcome to ChillMusic
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 0.5 }}>
                Log in to access your ChillMusic library & playlists
              </Typography>
            </Box>

            {error && (
              <Alert
                severity="error"
                sx={{
                  width: '100%',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  color: '#f87171',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              variant="outlined"
              onClick={handleGoogleAuth}
              disabled={loading}
              startIcon={<GoogleIcon />}
              sx={{
                py: 1.2,
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
                fontWeight: 600,
                fontSize: '0.95rem',
                borderRadius: 'var(--radius-md)',
                textTransform: 'none',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                '&:hover': {
                  borderColor: 'var(--accent-primary)',
                  backgroundColor: 'rgba(124, 58, 237, 0.08)',
                },
              }}
            >
              Continue with Google
            </Button>

            <Divider sx={{ width: '100%', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
              OR
            </Divider>

            <form onSubmit={handleSubmitLogin} style={{ width: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Email Address"
                  type="email"
                  required
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <TextField
                    label="Password"
                    type="password"
                    required
                    fullWidth
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Typography
                      variant="caption"
                      onClick={handleSwitchToReset}
                      sx={{
                        color: 'var(--accent-primary)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        '&:hover': { textDecoration: 'underline', color: 'var(--accent-secondary)' },
                      }}
                    >
                      Forgot Password?
                    </Typography>
                  </Box>
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  sx={{
                    py: 1.4,
                    backgroundColor: 'var(--accent-primary)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    borderRadius: 'var(--radius-md)',
                    '&:hover': { backgroundColor: '#6d28d9' },
                  }}
                >
                  {loading ? 'Logging in...' : 'Sign In'}
                </Button>
              </Box>
            </form>

            <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
              Don't have an account?{' '}
              <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
                Sign Up
              </Link>
            </Typography>
          </>
        ) : (
          /* RESET PASSWORD SCREEN */
          <>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
                Reset Password
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 0.5 }}>
                Enter your email address to receive a secure password reset link.
              </Typography>
            </Box>

            {resetError && (
              <Alert severity="error" sx={{ width: '100%', borderRadius: 'var(--radius-sm)' }}>
                {resetError}
              </Alert>
            )}

            {resetSuccess && (
              <Alert severity="success" sx={{ width: '100%', borderRadius: 'var(--radius-sm)' }}>
                {resetSuccess}
              </Alert>
            )}

            <form onSubmit={handleSendResetEmail} style={{ width: '100%' }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                  label="Email Address"
                  type="email"
                  required
                  fullWidth
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={resetLoading}
                  sx={{
                    py: 1.4,
                    backgroundColor: 'var(--accent-primary)',
                    fontWeight: 700,
                    fontSize: '1rem',
                    borderRadius: 'var(--radius-md)',
                    '&:hover': { backgroundColor: '#6d28d9' },
                  }}
                >
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </Button>

                <Button
                  variant="text"
                  startIcon={<ArrowBackIcon />}
                  onClick={handleSwitchToLogin}
                  sx={{
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    '&:hover': { color: 'var(--text-primary)' },
                  }}
                >
                  Back to Sign In
                </Button>
              </Box>
            </form>
          </>
        )}
      </Paper>

      {/* Snackbar Toast Feedback */}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 600, borderRadius: 'var(--radius-md)' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Login;
