import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Grid, Skeleton } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ShuffleIcon from '@mui/icons-material/Shuffle';
import HistoryIcon from '@mui/icons-material/History';
import { getTrendingSongs, getNewReleases, getRecommendations, searchPlaylists, searchArtists } from '../services/jamendo';
import { getYouTubeTrending } from '../services/youtube';
import TrackCard from '../components/Track/TrackCard';
import PlaylistCard from '../components/Playlist/PlaylistCard';
import ArtistCard from '../components/Artist/ArtistCard';
import { usePlayer } from '../context/PlayerContext';
import { cacheSongsLocally } from '../services/offlineSync';
import { getHistory } from '../services/firestoreService';
import { FALLBACK_TRACKS, FALLBACK_PLAYLISTS, FALLBACK_ARTISTS } from '../services/mockData';

const Home = () => {
  const { playTrack, currentTrack } = usePlayer();
  const [recentTracks, setRecentTracks] = useState([]);
  const [trending, setTrending] = useState(FALLBACK_TRACKS);
  const [youtubeHits, setYoutubeHits] = useState(FALLBACK_TRACKS);
  const [newReleases, setNewReleases] = useState(FALLBACK_TRACKS);
  const [recommendations, setRecommendations] = useState(FALLBACK_TRACKS);
  const [playlists, setPlaylists] = useState(FALLBACK_PLAYLISTS);
  const [artists, setArtists] = useState(FALLBACK_ARTISTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadAllData = async () => {
      // 1. Fetch Recently Played History
      try {
        const historyData = await getHistory(15);
        if (isMounted && historyData && historyData.length > 0) {
          const uniqueHistory = [];
          const seenIds = new Set();
          for (const item of historyData) {
            if (!seenIds.has(item.song_id || item.id)) {
              seenIds.add(item.song_id || item.id);
              uniqueHistory.push({
                id: item.song_id || item.id,
                title: item.song_title || item.title,
                artist_name: item.artist_name || item.artist,
                album_name: item.album_name || item.album || 'Single',
                audio_url: item.audio_url,
                image_url: item.image_url || item.cover_url,
                duration: item.duration || 180,
              });
            }
          }
          setRecentTracks(uniqueHistory.slice(0, 6));
        }
      } catch (err) {
        console.warn('Could not fetch online history:', err);
      }

      // 2. Fetch YouTube Hits (fast)
      try {
        const ytData = await getYouTubeTrending(6);
        if (isMounted) {
          if (ytData && ytData.length > 0) {
            setYoutubeHits(ytData);
          }
          setLoading(false); // Remove main loading spinner early!
        }
      } catch (err) {
        console.warn('YouTube trending fetch error:', err);
      }

      // 3. Fetch Jamendo Trending
      try {
        const trData = await getTrendingSongs(10);
        if (isMounted) {
          if (trData && trData.length > 0) {
            setTrending(trData);
            cacheSongsLocally(trData);
          }
          setLoading(false);
        }
      } catch (err) {
        console.warn('Trending fetch error:', err);
      }

      // 4. Fetch remainder progressively
      try {
        const [nrData, recData, plData, artData] = await Promise.all([
          getNewReleases(10).catch(() => FALLBACK_TRACKS),
          getRecommendations('chill', 10).catch(() => FALLBACK_TRACKS),
          searchPlaylists('chill', 6).catch(() => FALLBACK_PLAYLISTS),
          searchArtists('lofi', 6).catch(() => FALLBACK_ARTISTS),
        ]);

        if (isMounted) {
          if (nrData && nrData.length > 0) setNewReleases(nrData);
          if (recData && recData.length > 0) setRecommendations(recData);
          if (plData && plData.length > 0) setPlaylists(plData);
          if (artData && artData.length > 0) setArtists(artData);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Progressive data load error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadAllData();

    return () => {
      isMounted = false;
    };
  }, []);

  const heroTrack = currentTrack || (trending && trending.length > 0 ? trending[0] : null) || (youtubeHits && youtubeHits.length > 0 ? youtubeHits[0] : null) || FALLBACK_TRACKS[0];

  const trackPool = (trending && trending.length > 0) ? trending : ((youtubeHits && youtubeHits.length > 0) ? youtubeHits : FALLBACK_TRACKS);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {/* Hero Banner */}
      {heroTrack ? (
        <Box
          className="glass-panel"
          sx={{
            p: { xs: 3, md: 4 },
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.4) 0%, rgba(6, 182, 212, 0.2) 100%)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 3,
            flexDirection: { xs: 'column-reverse', md: 'row' },
          }}
        >
          <Box sx={{ flex: 1, zIndex: 1 }}>
            <Typography variant="overline" sx={{ letterSpacing: 3, color: 'var(--accent-secondary)', fontWeight: 700 }}>
              {currentTrack && heroTrack.id === currentTrack.id ? 'NOW PLAYING' : 'FEATURED TRACK'}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, my: 1, fontFamily: 'var(--font-heading)' }}>
              {heroTrack.title}
            </Typography>
            <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
              By {heroTrack.artist_name || heroTrack.artist || 'Featured Artist'}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<PlayArrowIcon />}
                onClick={() => playTrack(heroTrack, trackPool, 0)}
                sx={{
                  backgroundColor: 'var(--accent-primary)',
                  borderRadius: 'var(--radius-full)',
                  px: 3.5,
                  py: 1,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  '&:hover': { backgroundColor: '#6d28d9' },
                }}
              >
                Play Now
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShuffleIcon />}
                onClick={() => {
                  const randomIdx = Math.floor(Math.random() * trackPool.length);
                  playTrack(trackPool[randomIdx], trackPool, randomIdx);
                }}
                sx={{
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-full)',
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                }}
              >
                Shuffle
              </Button>
            </Box>
          </Box>

          <Box
            component="img"
            src={heroTrack.image_url || heroTrack.cover_url || heroTrack.image || heroTrack.artwork || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80'}
            alt={heroTrack.title}
            sx={{
              width: { xs: 180, sm: 220 },
              height: { xs: 180, sm: 220 },
              borderRadius: 'var(--radius-md)',
              objectFit: 'cover',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5)',
            }}
          />
        </Box>
      ) : loading ? (
        <Skeleton variant="rounded" height={220} sx={{ borderRadius: 'var(--radius-lg)', backgroundColor: 'var(--bg-glass-card)' }} />
      ) : null}

      {/* Recently Played Section */}
      {recentTracks.length > 0 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <HistoryIcon sx={{ color: 'var(--accent-secondary)' }} />
            <Typography variant="h5" sx={{ fontWeight: 800, fontFamily: 'var(--font-heading)' }}>
              Recently Played
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2.5, overflowX: 'auto', pb: 2, scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { display: 'none' }, WebkitOverflowScrolling: 'touch', mx: -2, px: 2 }}>
            {recentTracks.map((track) => (
              <Box key={`recent-${track.id}`} sx={{ minWidth: { xs: 150, sm: 180, md: 200 }, scrollSnapAlign: 'start' }}>
                <TrackCard track={track} queue={recentTracks} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* YouTube Music Hits Section */}
      {youtubeHits.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            📺 YouTube Music Hits
          </Typography>
          <Box sx={{ display: 'flex', gap: 2.5, overflowX: 'auto', pb: 2, scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { display: 'none' }, WebkitOverflowScrolling: 'touch', mx: -2, px: 2 }}>
            {youtubeHits.slice(0, 6).map((track) => (
              <Box key={`yt-${track.id}`} sx={{ minWidth: { xs: 150, sm: 180, md: 200 }, scrollSnapAlign: 'start' }}>
                <TrackCard track={track} queue={youtubeHits} />
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Trending Section */}
      {trending.length > 0 ? (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            🔥 Trending Songs
          </Typography>
          <Box sx={{ display: 'flex', gap: 2.5, overflowX: 'auto', pb: 2, scrollSnapType: 'x mandatory', '&::-webkit-scrollbar': { display: 'none' }, WebkitOverflowScrolling: 'touch', mx: -2, px: 2 }}>
            {trending.slice(0, 6).map((track) => (
              <Box key={`tr-${track.id}`} sx={{ minWidth: { xs: 150, sm: 180, md: 200 }, scrollSnapAlign: 'start' }}>
                <TrackCard track={track} queue={trending} />
              </Box>
            ))}
          </Box>
        </Box>
      ) : null}

      {/* New Releases Section */}
      {newReleases.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            ✨ New Releases
          </Typography>
          <Grid container spacing={2.5}>
            {newReleases.slice(0, 6).map((track) => (
              <Grid item xs={6} sm={4} md={2} key={`nr-${track.id}`}>
                <TrackCard track={track} queue={newReleases} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            🎧 Recommended Chill Vibes
          </Typography>
          <Grid container spacing={2.5}>
            {recommendations.slice(0, 6).map((track) => (
              <Grid item xs={6} sm={4} md={2} key={`rec-${track.id}`}>
                <TrackCard track={track} queue={recommendations} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Featured Playlists */}
      {playlists.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            🎶 Featured Playlists
          </Typography>
          <Grid container spacing={2.5}>
            {playlists.map((playlist) => (
              <Grid item xs={6} sm={4} md={2} key={`pl-${playlist.id}`}>
                <PlaylistCard playlist={playlist} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Top Artists */}
      {artists.length > 0 && (
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 2, fontFamily: 'var(--font-heading)' }}>
            🌟 Popular Artists
          </Typography>
          <Grid container spacing={2.5}>
            {artists.map((artist) => (
              <Grid item xs={6} sm={4} md={2} key={`art-${artist.id}`}>
                <ArtistCard artist={artist} />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default Home;
