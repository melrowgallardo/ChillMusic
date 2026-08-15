import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import LockResetIcon from '@mui/icons-material/LockReset';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';

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
      setResetError('Please enter your email address.');
      return;
    }
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess('A password reset link has been sent to your email. Please check your inbox or spam folder.');
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setResetError('No user found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setResetError('Invalid email address format.');
      } else {
        setResetError(err.message || 'Failed to send password reset email.');
      }
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
              <Alert severity="error" sx={{ width: '100%', borderRadius: 'var(--radius-sm)' }}>
                {error}
              </Alert>
            )}

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
    </Box>
  );
};

export default Login;
