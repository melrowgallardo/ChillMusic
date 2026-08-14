import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, TextField, Tabs, Tab, Chip, Grid, Button } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useSearchParams } from 'react-router-dom';
import { searchUnified } from '../services/jamendo';
import TrackList from '../components/Track/TrackList';
import ArtistCard from '../components/Artist/ArtistCard';
import AlbumCard from '../components/Album/AlbumCard';
import PlaylistCard from '../components/Playlist/PlaylistCard';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { FALLBACK_TRACKS, FALLBACK_PLAYLISTS, FALLBACK_ARTISTS } from '../services/mockData';

const GENRE_TAGS = ['Chill', 'Lofi', 'Ambient', 'Electronic', 'Jazz', 'Rock', 'Pop', 'Acoustic', 'Piano', 'Hip Hop'];

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(0); // 0: Songs, 1: Artists, 2: Albums, 3: Playlists
  const [musicSource, setMusicSource] = useState('all'); // 'all' | 'jamendo' | 'youtube' | 'deezer'
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
      performSearch(q, musicSource);
    } else {
      performSearch(query, musicSource);
    }
  }, [searchParams, musicSource]);

  // Debounced live typing search (500ms optimal typing balance)
  useEffect(() => {
    if (!query.trim()) return;
    const timer = setTimeout(() => {
      setSearchParams({ q: query.trim() }, { replace: true });
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (searchTerm, source = 'all') => {
    const term = (!searchTerm || !searchTerm.trim()) ? 'Top Hits' : searchTerm.trim();
    const currentReq = ++searchReqId.current;
    setLoading(true);
    try {
      const timeoutPromise = new Promise((resolve) =>
        setTimeout(() => resolve(null), 4500)
      );

      const data = await Promise.race([
        searchUnified(term, 20, source),
        timeoutPromise,
      ]);

      if (currentReq === searchReqId.current) {
        if (data) {
          setSongs(data.songs && data.songs.length > 0 ? data.songs : FALLBACK_TRACKS);
          setArtists(data.artists && data.artists.length > 0 ? data.artists : FALLBACK_ARTISTS);
          setAlbums(data.albums || []);
          setPlaylists(data.playlists && data.playlists.length > 0 ? data.playlists : FALLBACK_PLAYLISTS);
        } else {
          // Timeout occurred
          const matchedSongs = FALLBACK_TRACKS.filter(t =>
            t.title.toLowerCase().includes(term.toLowerCase()) ||
            t.artist_name.toLowerCase().includes(term.toLowerCase())
          );
          setSongs(matchedSongs.length > 0 ? matchedSongs : FALLBACK_TRACKS);
          setArtists(FALLBACK_ARTISTS);
          setAlbums([]);
          setPlaylists(FALLBACK_PLAYLISTS);
        }
      }
    } catch (err) {
      console.error('Search failed:', err);
      if (currentReq === searchReqId.current) {
        setSongs(FALLBACK_TRACKS);
        setArtists(FALLBACK_ARTISTS);
        setPlaylists(FALLBACK_PLAYLISTS);
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
    }
  };

  const handleChipClick = (tag) => {
    setQuery(tag);
    setSearchParams({ q: tag });
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
        <Tab label={`Songs (${songs.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Artists (${artists.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Albums (${albums.length})`} sx={{ fontWeight: 700 }} />
        <Tab label={`Playlists (${playlists.length})`} sx={{ fontWeight: 700 }} />
      </Tabs>

      {loading ? (
        <LoadingSpinner message="Searching music catalog..." />
      ) : (
        <Box sx={{ mt: 1 }}>
          {activeTab === 0 && <TrackList tracks={songs} />}

          {activeTab === 1 && (
            <Grid container spacing={2.5}>
              {artists.map((artist) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={artist.id}>
                  <ArtistCard artist={artist} />
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 2 && (
            <Grid container spacing={2.5}>
              {albums.map((album) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={album.id}>
                  <AlbumCard album={album} />
                </Grid>
              ))}
            </Grid>
          )}

          {activeTab === 3 && (
            <Grid container spacing={2.5}>
              {playlists.map((playlist) => (
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
