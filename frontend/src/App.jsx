import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { PlayerProvider } from './context/PlayerContext';
import { OfflineProvider } from './context/OfflineContext';
import MainLayout from './components/Layout/MainLayout';
import Home from './pages/Home';
import Search from './pages/Search';
import Explore from './pages/Explore';
import Library from './pages/Library';
import PlaylistDetail from './pages/PlaylistDetail';
import ArtistDetail from './pages/ArtistDetail';
import AlbumDetail from './pages/AlbumDetail';
import Favorites from './pages/Favorites';
import RecentlyPlayed from './pages/RecentlyPlayed';
import Downloads from './pages/Downloads';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PlayerProvider>
          <OfflineProvider>
            <Router>
              <Routes>
                <Route path="/" element={<MainLayout />}>
                  <Route index element={<Home />} />
                  <Route path="search" element={<Search />} />
                  <Route path="explore" element={<Explore />} />
                  <Route path="library" element={<Library />} />
                  <Route path="favorites" element={<Favorites />} />
                  <Route path="recently-played" element={<RecentlyPlayed />} />
                  <Route path="downloads" element={<Downloads />} />
                  <Route path="playlist/:id" element={<PlaylistDetail />} />
                  <Route path="artist/:id" element={<ArtistDetail />} />
                  <Route path="album/:id" element={<AlbumDetail />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="login" element={<Login />} />
                  <Route path="register" element={<Register />} />
                </Route>
              </Routes>
            </Router>
          </OfflineProvider>
        </PlayerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
