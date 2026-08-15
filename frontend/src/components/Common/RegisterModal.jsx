import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  IconButton,
  Snackbar,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { auth, db } from '../../firebase';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
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

const RegisterModal = ({ open, onClose, onSuccess }) => {
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
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setOtpExpiration(Date.now() + 10 * 60 * 1000);
      setIsCodeSent(true);

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
        console.info('EmailJS send attempt:', code, emailErr);
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
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        email: email.trim(),
        isVerified: true,
        createdAt: new Date(),
      });

      setSuccessToast('Account created successfully!');
      setTimeout(() => {
        if (onSuccess) onSuccess(user);
        if (onClose) onClose();
      }, 1000);
    } catch (err) {
      console.error('Registration error:', err);
      setError(formatErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          username: user.displayName || user.email.split('@')[0],
          email: user.email,
          photoURL: user.photoURL || '',
          isVerified: true,
          createdAt: new Date(),
        });
      }
      if (onSuccess) onSuccess(user);
      if (onClose) onClose();
    } catch (err) {
      console.error('Google Auth error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(formatErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        className: 'glass-panel',
        sx: { p: 3, maxWidth: 440, width: '100%', borderRadius: 'var(--radius-lg)' },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 0, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonAddOutlinedIcon sx={{ color: 'var(--accent-secondary)' }} />
          <Typography variant="h6" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
            Sign Up for ChillMusic
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}

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
            fontSize: '0.9rem',
            borderRadius: 'var(--radius-md)',
            textTransform: 'none',
          }}
        >
          Continue with Google
        </Button>

        <Divider sx={{ my: 1, fontSize: '0.8rem' }}>OR</Divider>

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Username"
              required
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

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
                  minWidth: 120,
                  height: 56,
                  borderColor: 'var(--accent-secondary)',
                  color: 'var(--accent-secondary)',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  textTransform: 'none',
                }}
              >
                {sendingCode ? 'Sending...' : cooldown > 0 ? `Resend ${cooldown}s` : '📩 Send Code'}
              </Button>
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
      </DialogContent>

      <Snackbar open={Boolean(infoToast)} autoHideDuration={4000} onClose={() => setInfoToast('')}>
        <Alert severity="info" onClose={() => setInfoToast('')}>{infoToast}</Alert>
      </Snackbar>

      <Snackbar open={Boolean(successToast)} autoHideDuration={3000} onClose={() => setSuccessToast('')}>
        <Alert severity="success" onClose={() => setSuccessToast('')}>{successToast}</Alert>
      </Snackbar>
    </Dialog>
  );
};

export default RegisterModal;
