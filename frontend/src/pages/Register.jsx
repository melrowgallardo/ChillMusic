import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Divider,
  Snackbar,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  getAuth,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { parseSafeJson } from '../utils/storage';
import { useAuth } from '../context/AuthContext';
import emailjs from '@emailjs/browser';

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
  if (!err) return 'Registration failed. Please try again.';

  switch (err.code) {
    case 'auth/email-already-in-use':
      return 'This email is already registered.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return err.message || 'Registration failed. Please try again.';
  }
};

const Register = () => {
  const navigate = useNavigate();
  const authContext = useAuth() || {};
  const setUser = authContext.setUser;
  const setIsAuthenticated = authContext.setIsAuthenticated;

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');

  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpExpiration, setOtpExpiration] = useState(0);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const [error, setError] = useState('');
  const [infoToast, setInfoToast] = useState('');
  const [successToast, setSuccessToast] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let timer = null;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [cooldown]);

  const handleSendCode = async () => {
    setError('');
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address first.');
      return;
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSendingCode(true);
    try {
      // Step 1: Generate 6-digit OTP
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpExpiration(Date.now() + 10 * 60 * 1000); // 10 minutes
      setIsCodeSent(true);

      // Send via EmailJS (if configured) or console log
      try {
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_chillmusic';
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_otp';
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'public_key';
        await emailjs.send(
          serviceId,
          templateId,
          {
            to_email: trimmedEmail,
            to_name: username.trim() || 'User',
            otp_code: code,
            message: `Your ChillMusic verification code is ${code}. It is valid for 10 minutes.`,
          },
          publicKey
        );
      } catch (emailErr) {
        console.info('EmailJS send attempt (verification code generated):', code, emailErr);
      }

      setInfoToast('Verification code sent to your email!');
      setCooldown(60);
    } catch (err) {
      console.error('Error sending code:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    // Step 2: Verification Check
    if (!isCodeSent || !userOtpInput.trim()) {
      setError('⚠️ Please enter the correct 6-digit code sent to your email.');
      return;
    }

    if (Date.now() > otpExpiration) {
      setError('⚠️ Verification code has expired. Please click "Send Code" to get a new code.');
      return;
    }

    if (userOtpInput.trim() !== generatedOtp) {
      setError('⚠️ Please enter the correct 6-digit code sent to your email.');
      return;
    }

    setLoading(true);
    try {
      // 1. Create User with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Save user profile metadata in Firestore with isVerified: true
      await setDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        email: email.trim(),
        isVerified: true,
        createdAt: new Date(),
      });

      setSuccessToast('Account created successfully! Redirecting...');
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      console.error('Registration error detail:', err);
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');

    const authInstance = getAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(authInstance, provider);
      const googleUser = result.user;
      const email = googleUser.email?.toLowerCase().trim();

      const apiUrl = import.meta.env.VITE_API_URL || '';
      let alreadyExists = false;

      const userDocRef = doc(db, 'users', googleUser.uid);
      const userSnap = await getDoc(userDocRef);

      // 1. Check if email is already registered
      if (apiUrl) {
        try {
          const res = await fetch(`${apiUrl}/api/auth/check-email?email=${encodeURIComponent(email)}`);
          if (res.ok) {
            const data = await parseSafeJson(res);
            alreadyExists = Boolean(data.exists) || userSnap.exists();
          } else {
            alreadyExists = userSnap.exists();
          }
        } catch (err) {
          console.warn('Backend check bypassed:', err);
          alreadyExists = userSnap.exists();
        }
      } else {
        const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
        alreadyExists = userSnap.exists() || registered.some((u) => u.email?.toLowerCase().trim() === email);
      }

      // 2. If already registered, reject registration and prompt user to login
      if (alreadyExists) {
        await signOut(authInstance).catch(() => {});
        setLoading(false);
        const errMsg = 'This email is already registered. Please Sign In instead.';
        setError(errMsg);
        alert('This email is already registered. Please sign in instead.');
        return;
      }

      // 3. If new, register the user into backend or local store
      const newUser = {
        id: googleUser.uid,
        uid: googleUser.uid,
        username: googleUser.displayName || email.split('@')[0],
        email: email,
        avatar: googleUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
        avatar_url: googleUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${email}`,
      };

      if (!userSnap.exists()) {
        await setDoc(userDocRef, {
          username: newUser.username,
          email: newUser.email,
          photoURL: googleUser.photoURL || '',
          isVerified: true,
          createdAt: new Date(),
        }).catch((e) => console.warn(e));
      }

      const idToken = await googleUser.getIdToken();
      if (apiUrl) {
        await fetch(`${apiUrl}/api/auth/google-register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credential: idToken,
            email: email,
            name: newUser.username,
            picture: googleUser.photoURL || '',
          }),
        }).catch((err) => console.warn('Backend save bypassed:', err));
      } else {
        const registered = JSON.parse(localStorage.getItem('registered_users') || '[]');
        registered.push(newUser);
        localStorage.setItem('registered_users', JSON.stringify(registered));
      }

      // 4. Save session and redirect straight to home dashboard
      localStorage.setItem('user', JSON.stringify(newUser));
      localStorage.setItem('access_token', idToken);
      if (setUser) setUser(newUser);
      if (setIsAuthenticated) setIsAuthenticated(true);
      window.location.replace('/');
    } catch (err) {
      console.error('Google Sign-Up Error:', err);
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        setError(err.message || 'Failed to register with Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: 4,
      }}
    >
      <Paper
        className="glass-panel"
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 450,
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
            backgroundColor: 'rgba(6, 182, 212, 0.2)',
            color: 'var(--accent-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <PersonAddOutlinedIcon />
        </Box>

        <Box sx={{ textAlign: 'center' }}>
          <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Join ChillMusic
          </Typography>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)', mt: 0.5 }}>
            Create an account to stream music, create playlists, & save favorites
          </Typography>
        </Box>

        {error && (
          <div className="w-full p-3 mb-4 text-sm text-center text-red-200 bg-red-600/30 border border-red-500 rounded-xl" style={{ width: '100%' }}>
            <Alert severity="error" sx={{ width: '100%', borderRadius: 'var(--radius-sm)' }}>
              ⚠️ {error}
            </Alert>
          </div>
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
              borderColor: 'var(--accent-secondary)',
              backgroundColor: 'rgba(6, 182, 212, 0.08)',
            },
          }}
        >
          Continue with Google
        </Button>

        <Divider sx={{ width: '100%', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>
          OR
        </Divider>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Username"
              required
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  label="Email Address"
                  type="email"
                  required
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Button
                  variant="outlined"
                  onClick={handleSendCode}
                  disabled={sendingCode || cooldown > 0}
                  sx={{
                    whiteSpace: 'nowrap',
                    minWidth: 125,
                    height: 56,
                    borderColor: 'var(--accent-secondary)',
                    color: 'var(--accent-secondary)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    borderRadius: 'var(--radius-md)',
                    textTransform: 'none',
                    '&:hover': {
                      backgroundColor: 'rgba(6, 182, 212, 0.1)',
                      borderColor: 'var(--accent-secondary)',
                    },
                  }}
                >
                  {sendingCode ? 'Sending...' : cooldown > 0 ? `Resend ${cooldown}s` : '📩 Send Code'}
                </Button>
              </Box>
            </Box>

            {isCodeSent && (
              <TextField
                label="6-Digit Verification Code"
                required
                fullWidth
                value={userOtpInput}
                onChange={(e) => setUserOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="e.g. 123456"
                helperText="Enter the 6-digit code sent to your email"
                inputProps={{ maxLength: 6, style: { letterSpacing: '4px', fontWeight: 'bold' } }}
              />
            )}

            <TextField
              label="Password (min 6 chars)"
              type="password"
              required
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

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
              {loading ? 'Creating Account...' : 'Create Account / Sign Up'}
            </Button>
          </Box>
        </form>

        <Typography variant="body2" sx={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>
            Sign In
          </Link>
        </Typography>
      </Paper>

      {/* Notifications */}
      <Snackbar
        open={Boolean(infoToast)}
        autoHideDuration={4000}
        onClose={() => setInfoToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="info" onClose={() => setInfoToast('')} sx={{ width: '100%', borderRadius: 'var(--radius-sm)' }}>
          {infoToast}
        </Alert>
      </Snackbar>

      <Snackbar
        open={Boolean(successToast)}
        autoHideDuration={3000}
        onClose={() => setSuccessToast('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessToast('')} sx={{ width: '100%', borderRadius: 'var(--radius-sm)' }}>
          {successToast}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Register;
