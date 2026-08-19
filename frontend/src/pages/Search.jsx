import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { FiSearch, FiPlay, FiPause, FiMoreVertical } from 'react-icons/fi';

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState([]);
  const [artistsCount, setArtistsCount] = useState(0);
  const [albumsCount, setAlbumsCount] = useState(0);
  const [playlistsCount, setPlaylistsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { currentTrack, isPlaying, playTrack, setIsPlaying } = useMusic();

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsLoading(true);
    let results = [];

    // Strategy 1: YouTube Data API v3 (if Key is present)
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (apiKey) {
      try {
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=50&q=${encodeURIComponent(
            searchQuery.trim()
          )}&type=video&key=${apiKey}`
        );
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const videoIds = data.items.map((i) => i.id.videoId).filter(Boolean).join(',');

          // Fetch content details for accurate durations
          const detailsRes = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`
          );
          const detailsData = await detailsRes.json();

          results = (detailsData.items || data.items).map((item) => {
            const dur = item.contentDetails?.duration || '';
            const match = dur.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            const mins = parseInt(match?.[2] || 0, 10);
            const secs = parseInt(match?.[3] || 0, 10);
            const formattedDur = `${mins}:${secs.toString().padStart(2, '0')}`;

            return {
              id: item.id?.videoId || item.id,
              youtubeId: item.id?.videoId || item.id,
              title: item.snippet?.title?.replace(/(&quot;|&#39;|&amp;)/g, '').trim(),
              artist: item.snippet?.channelTitle || 'Artist',
              album: item.snippet?.channelTitle || 'Single',
              thumbnail:
                item.snippet?.thumbnails?.medium?.url ||
                item.snippet?.thumbnails?.high?.url ||
                `https://i.ytimg.com/vi/${item.id?.videoId || item.id}/hqdefault.jpg`,
              duration: formattedDur !== '0:00' ? formattedDur : '3:30',
              durationRaw: mins * 60 + secs || 210,
            };
          });
        }
      } catch (err) {
        console.warn('YouTube API call failed, falling back to public mirrors:', err);
      }
    }

    // Strategy 2: High Reliability Public Music Metadata Mirror (Always works)
    if (results.length === 0) {
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(searchQuery)}&entity=song&limit=50`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          results = data.results.map((track) => {
            const totalSeconds = Math.floor(track.trackTimeMillis / 1000);
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            return {
              id: track.trackId.toString(),
              youtubeId: track.trackId.toString(),
              title: track.trackName,
              artist: track.artistName,
              album: track.collectionName || 'Single',
              thumbnail: track.artworkUrl100?.replace('100x100bb', '400x400bb'),
              duration: `${mins}:${secs.toString().padStart(2, '0')}`,
              durationRaw: totalSeconds,
            };
          });
        }
      } catch (err) {
        console.error('All search strategies failed:', err);
      }
    }

    const uniqueArtists = new Set(results.map((r) => r.artist).filter(Boolean));
    const uniqueAlbums = new Set(results.map((r) => r.album || r.title).filter(Boolean));

    setSongs(results);
    setArtistsCount(uniqueArtists.size);
    setAlbumsCount(uniqueAlbums.size);
    setPlaylistsCount(results.length > 0 ? 2 : 0);
    setIsLoading(false);
  };

  const handleRowClick = (track) => {
    if (currentTrack?.id === track.id) {
      setIsPlaying(!isPlaying);
    } else {
      playTrack(track);
    }
  };

  return (
    <div style={{ padding: '32px 40px', color: '#fff', maxWidth: '1400px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '-0.02em', marginBottom: '28px', color: '#ffffff' }}>
        Search & Discover
      </h1>

      {/* Search Form */}
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'stretch', gap: '14px', marginBottom: '32px', width: '100%' }}>
        <div style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#205c96',
          borderRadius: '12px',
          padding: '0 20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <FiSearch style={{ color: '#9bc4e8', fontSize: '20px', marginRight: '14px', flexShrink: 0 }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            style={{
              width: '100%',
              height: '56px',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '16px',
              fontWeight: '500'
            }}
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            backgroundColor: '#7c3aed',
            color: '#ffffff',
            fontWeight: '800',
            fontSize: '14px',
            letterSpacing: '0.05em',
            borderRadius: '12px',
            padding: '0 36px',
            border: 'none',
            cursor: 'pointer',
            height: '56px',
            boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)',
            transition: 'opacity 0.2s',
            opacity: isLoading ? 0.6 : 1
          }}
        >
          {isLoading ? 'SEARCHING...' : 'SEARCH'}
        </button>
      </form>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '28px', borderBottom: '1px solid #1e202f', paddingBottom: '14px', marginBottom: '20px', fontSize: '13px', fontWeight: '800', letterSpacing: '0.05em' }}>
        <span style={{ color: '#a855f7', borderBottom: '2px solid #a855f7', paddingBottom: '14px', cursor: 'pointer' }}>
          SONGS ({songs.length})
        </span>
        <span style={{ color: '#64748b', cursor: 'pointer' }}>ARTISTS ({artistsCount})</span>
        <span style={{ color: '#64748b', cursor: 'pointer' }}>ALBUMS ({albumsCount})</span>
        <span style={{ color: '#64748b', cursor: 'pointer' }}>PLAYLISTS ({playlistsCount})</span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: '#94a3b8' }}>Loading tracks...</div>
      ) : songs.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center', color: '#64748b', fontSize: '15px' }}>
          No tracks available. Type a keyword and click Search.
        </div>
      ) : (
        <div style={{ width: '100%', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#64748b', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #1e202f' }}>
                <th style={{ padding: '14px 16px', width: '50px' }}># TITLE</th>
                <th style={{ padding: '14px 16px' }}></th>
                <th style={{ padding: '14px 16px' }}>ALBUM</th>
                <th style={{ padding: '14px 16px', textAlign: 'right' }}>DURATION</th>
                <th style={{ padding: '14px 16px', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {songs.map((track, idx) => {
                const isCurrent = currentTrack?.id === track.id;
                return (
                  <tr
                    key={track.id || idx}
                    onClick={() => handleRowClick(track)}
                    style={{
                      borderBottom: '1px solid #13141f',
                      cursor: 'pointer',
                      backgroundColor: isCurrent ? '#19182a' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '14px 16px', color: '#64748b', width: '40px', fontSize: '14px' }}>
                      {isCurrent && isPlaying ? <FiPause style={{ color: '#a855f7' }} /> : idx + 1}
                    </td>
                    <td style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <img src={track.thumbnail} alt={track.title} style={{ width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div>
                        <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', color: isCurrent ? '#a855f7' : '#ffffff' }}>{track.title}</p>
                        <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#64748b' }}>{track.artist}</p>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '14px' }}>{track.album}</td>
                    <td style={{ padding: '14px 16px', color: '#94a3b8', fontSize: '13px', textAlign: 'right', fontFamily: 'monospace' }}>{track.duration}</td>
                    <td style={{ padding: '14px 16px', textAlign: 'right', color: '#64748b' }}>
                      <FiMoreVertical size={16} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
