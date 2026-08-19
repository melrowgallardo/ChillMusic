import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, Tabs, Tab, Grid, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams } from 'react-router-dom';
import { searchYouTubeTracks, searchYouTubePlaylists } from '../services/youtubeApi';
import TrackList from '../components/Track/TrackList';
import ArtistCard from '../components/Artist/ArtistCard';
import AlbumCard from '../components/Album/AlbumCard';
import PlaylistCard from '../components/Playlist/PlaylistCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const extractArtists = (songsList = []) => {
  const artistMap = new Map();
  songsList.forEach((item) => {
    if (!item) return;
    const artistName = (item.artist || item.artist_name || '').trim();
    if (artistName && artistName !== 'Various Artists' && artistName !== 'Unknown Artist') {
      const artKey = artistName.toLowerCase();
      const cover = item.cover || item.cover_url || item.image_url || item.image;
      if (!artistMap.has(artKey)) {
        artistMap.set(artKey, {
          id: `art_${artKey.replace(/[^a-z0-9]/g, '_')}`,
          name: artistName,
          artist_name: artistName,
          imageUrl: cover || '',
          image_url: cover || '',
          cover_url: cover || '',
          image: cover || '',
          type: 'Artist',
        });
      }
    }
  });
  return Array.from(artistMap.values());
};

const extractAlbums = (songsList = []) => {
  const albumMap = new Map();
  songsList.forEach((item) => {
    if (!item) return;
    const albumName = (item.album || item.album_name || 'Official Single').trim();
    const artistName = (item.artist || item.artist_name || 'YouTube Artist').trim();
    const albKey = `${albumName}_${artistName}`.toLowerCase();
    const cover = item.cover || item.cover_url || item.image_url || item.image;
    if (!albumMap.has(albKey)) {
      albumMap.set(albKey, {
        id: `alb_${albKey.replace(/[^a-z0-9]/g, '_')}`,
        name: albumName,
        title: albumName,
        artist_name: artistName,
        artist: artistName,
        cover_url: cover || '',
        image_url: cover || '',
        cover: cover || '',
        image: cover || '',
      });
    }
  });
  return Array.from(albumMap.values());
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(0); // 0: Songs, 1: Artists, 2: Albums, 3: Playlists
  const [songs, setSongs] = useState([]);
  const [artists, setArtists] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchReqId = useRef(0);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    } else if (query.trim()) {
      performSearch(query);
    }
  }, [searchParams]);

  // Debounced live typing search (500ms optimal typing balance)
  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => {
      setSearchParams({ q: query.trim() }, { replace: true });
      performSearch(query.trim());
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchTerm) => {
    const term = searchTerm?.trim();
    if (!term) {
      setSongs([]);
      setArtists([]);
      setAlbums([]);
      setPlaylists([]);
      setLoading(false);
      return;
    }

    const currentReq = ++searchReqId.current;
    setLoading(true);

    try {
      const [tracksRes, playlistsRes] = await Promise.all([
        searchYouTubeTracks(term).catch(() => []),
        searchYouTubePlaylists(term).catch(() => []),
      ]);

      let results = tracksRes || [];
      if (results.length === 0) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || '';
          const res = await fetch(`${apiUrl}/api/search?q=${encodeURIComponent(term)}`);
          if (res.ok) {
            const data = await res.json();
            results = Array.isArray(data) ? data : (data.results || data.tracks || data.items || []);
          }
        } catch (apiErr) {
          console.error('API search error:', apiErr);
        }
      }

      if (currentReq === searchReqId.current) {
        const safeResults = Array.isArray(results) ? results : [];
        setSongs(safeResults);
        setArtists(extractArtists(safeResults));
        setAlbums(extractAlbums(safeResults));
        setPlaylists(Array.isArray(playlistsRes) ? playlistsRes : []);
      }
    } catch (err) {
      console.error('Search execution error:', err);
      if (currentReq === searchReqId.current) {
        setSongs([]);
        setArtists([]);
        setAlbums([]);
        setPlaylists([]);
      }
    } finally {
      if (currentReq === searchReqId.current) {
        setLoading(false);
      }
    }
  };

  const handleQuerySubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setSearchParams({ q: query.trim() });
      performSearch(query.trim());
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Search Header */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
          Search & Discover
        </Typography>

        <form onSubmit={handleQuerySubmit}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              placeholder="Search songs, artists, albums, or playlists..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ color: 'var(--text-muted)', mr: 1.5 }} />,
              }}
              sx={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                '& .MuiOutlinedInput-root': {
                  color: 'var(--text-primary)',
                  '& fieldset': { borderColor: 'var(--border-color)' },
                  '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              onClick={() => {
                if (query.trim()) performSearch(query.trim());
              }}
              sx={{ backgroundColor: 'var(--accent-primary)', fontWeight: 700, px: 3 }}
            >
              Search
            </Button>
          </Box>
        </form>
      </Box>

      {/* Result Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, val) => setActiveTab(val)}
        textColor="inherit"
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          borderBottom: '1px solid var(--border-color)',
          '& .MuiTabs-indicator': { backgroundColor: 'var(--accent-primary)', height: 3 },
        }}
      >
        <Tab label={`Songs (${(Array.isArray(songs) ? songs : []).length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Artists (${(Array.isArray(artists) ? artists : []).length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Albums (${(Array.isArray(albums) ? albums : []).length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Playlists (${(Array.isArray(playlists) ? playlists : []).length})`} sx={{ fontWeight: 700 }} />
      </Tabs>

      {loading ? (
        <LoadingSpinner message="Searching YouTube music catalog..." />
      ) : (
        <Box sx={{ mt: 1 }}>
          {activeTab === 0 && <TrackList tracks={Array.isArray(songs) ? songs : []} />}

          {activeTab === 1 && (
            <Grid container spacing={2.5}>
              {(Array.isArray(artists) ? artists : []).map((artist) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={artist.id}>
                  <ArtistCard artist={artist} />
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={2.5}>
              {(Array.isArray(albums) ? albums : []).map((album) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={album.id}>
                  <AlbumCard album={album} />
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 3 && (
            <Grid container spacing={2.5}>
              {(Array.isArray(playlists) ? playlists : []).map((playlist) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={playlist.id}>
                  <PlaylistCard playlist={playlist} />
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

    </Box>
  );
};

export default Search;

