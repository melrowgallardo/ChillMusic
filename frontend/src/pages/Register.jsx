import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      // 1. Create User with Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Trigger Email Verification
      try {
        await sendEmailVerification(user);
      } catch (verr) {
        console.warn('Email verification dispatch error:', verr);
      }

      // 3. Save user profile metadata in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        email: email.trim(),
        createdAt: new Date(),
      });

      setVerificationSent(true);
    } catch (err) {
      console.error('Registration error detail:', err);
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
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          username: user.displayName || user.email.split('@')[0],
          email: user.email,
          photoURL: user.photoURL || '',
          createdAt: new Date(),
        });
      }
      navigate('/');
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
          <Alert severity="error" sx={{ width: '100%', borderRadius: 'var(--radius-sm)' }}>
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

            <TextField
              label="Email Address"
              type="email"
              required
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

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
              {loading ? 'Creating Account...' : 'Create Account'}
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

      {/* Verification Notification Dialog */}
      <Dialog
        open={verificationSent}
        onClose={() => {
          setVerificationSent(false);
          navigate('/');
        }}
        PaperProps={{
          className: 'glass-panel',
          sx: { p: 3, maxWidth: 400, width: '100%', borderRadius: 'var(--radius-lg)' },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)', px: 0, pt: 0 }}>
          Verify Your Email
        </DialogTitle>
        <DialogContent sx={{ px: 0, py: 1 }}>
          <Alert severity="info" sx={{ mb: 2, borderRadius: 'var(--radius-sm)' }}>
            A verification link has been sent to <strong>{email}</strong>.
          </Alert>
          <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
            Please check your email inbox or spam folder and verify your account to unlock all features.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 0, pb: 0, pt: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              setVerificationSent(false);
              navigate('/');
            }}
            sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700, width: '100%' }}
          >
            Continue to ChillMusic
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Register;
