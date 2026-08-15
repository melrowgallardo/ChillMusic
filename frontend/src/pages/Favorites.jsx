import React from 'react';
import { Navigate } from 'react-router-dom';

const Favorites = () => {
  return <Navigate to="/library?tab=favorites" replace />;
};

export default Favorites;
