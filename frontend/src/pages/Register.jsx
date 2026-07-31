import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Paper, Alert } from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const formatErrorMessage = (err) => {
  if (!err) return 'Registration failed. Please try again.';

  // Firebase Auth specific error codes
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

      // 2. Save user profile metadata in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        username: username.trim(),
        email: email.trim(),
        createdAt: new Date(),
      });

      navigate('/');
    } catch (err) {
      console.error('Registration error detail:', err);
      setError(formatErrorMessage(err));
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
    </Box>
  );
};

export default Register;
