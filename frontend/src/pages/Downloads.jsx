import React from 'react';
import { Navigate } from 'react-router-dom';

const Downloads = () => {
  return <Navigate to="/library?tab=downloads" replace />;
};

export default Downloads;
