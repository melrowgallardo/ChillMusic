import React from 'react';
import { Navigate } from 'react-router-dom';

const RecentlyPlayed = () => {
  return <Navigate to="/library?tab=history" replace />;
};

export default RecentlyPlayed;
