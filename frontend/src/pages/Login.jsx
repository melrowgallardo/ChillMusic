import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password states
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e) => {
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

  const handleOpenResetDialog = () => {
    setResetEmail(email || '');
    setResetError('');
    setResetSuccess('');
    setResetDialogOpen(true);
  };

  const handleSendResetEmail = async (e) => {
    if (e) e.preventDefault();
    if (!resetEmail.trim()) {
      setResetError('Please enter your email address.');
      return;
    }
    setResetError('');
    setResetSuccess('');
    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess(`Password reset email sent to ${resetEmail.trim()}. Please check your inbox.`);
    } catch (err) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setResetError('No account found with this email address.');
      } else if (err.code === 'auth/invalid-email') {
        setResetError('Please enter a valid email address format.');
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
            backgroundColor: 'rgba(124, 58, 237, 0.2)',
            color: 'var(--accent-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LockOutlinedIcon />
        </Box>

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

        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
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
                  onClick={handleOpenResetDialog}
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
      </Paper>

      {/* Forgot Password Dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        PaperProps={{
          className: 'glass-panel',
          sx: { p: 3, maxWidth: 400, width: '100%', borderRadius: 'var(--radius-lg)' },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)', px: 0, pt: 0 }}>
          Reset Password
        </DialogTitle>
        <DialogContent sx={{ px: 0, py: 1 }}>
          <Typography variant="body2" sx={{ color: 'var(--text-muted)', mb: 2 }}>
            Enter your account email address and we'll send you a password reset link.
          </Typography>
          {resetError && <Alert severity="error" sx={{ mb: 2 }}>{resetError}</Alert>}
          {resetSuccess && <Alert severity="success" sx={{ mb: 2 }}>{resetSuccess}</Alert>}
          <TextField
            label="Email Address"
            type="email"
            fullWidth
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            sx={{ mb: 1 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 0, pb: 0, gap: 1 }}>
          <Button onClick={() => setResetDialogOpen(false)} sx={{ color: 'var(--text-secondary)' }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleSendResetEmail}
            disabled={resetLoading}
            sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700 }}
          >
            {resetLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Login;
