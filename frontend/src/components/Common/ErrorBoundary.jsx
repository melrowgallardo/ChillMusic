import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    try {
      localStorage.removeItem('user');
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
            backgroundColor: '#09090b',
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 2, color: '#ef4444' }}>
            Something went wrong
          </Typography>
          <Typography variant="body1" sx={{ color: '#a1a1aa', mb: 4, maxWidth: 500 }}>
            An unexpected error occurred in the application. Click below to refresh session state.
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={this.handleReload}
            sx={{ backgroundColor: '#7c3aed', fontWeight: 700, px: 4, py: 1.5 }}
          >
            Reload Application
          </Button>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
