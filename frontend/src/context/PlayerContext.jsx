import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { addHistory } from '../services/firestoreService';
import { getAutoQueueRecommendations } from '../services/gemini_service';
import { searchUnified, getRecommendations } from '../services/jamendo';
import { useAuth } from './AuthContext';
import { getLocalDownloadById } from '../services/offlineSync';
import { resolveFullAudioTrack, isPreviewUrl } from '../services/audioResolver';
import { getFullAudioStream, fetchYouTubeVideoId } from '../services/musicApi';

import { normalizeTrack } from '../utils/trackUtils';
import { getSafeStorageItem } from '../utils/storage';

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const { user } = useAuth();
  const audioRef = useRef(new Audio());
  const ytPlayerRef = useRef(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('off'); // 'off' | 'all' | 'one'
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [isFullPlayerOpen, setIsFullPlayerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    const userKey = `recently_played_${user?.uid || user?.id || 'guest'}`;
    const res = getSafeStorageItem(userKey, null) || getSafeStorageItem('chillmusic_recently_played', []);
    return Array.isArray(res) ? res : [];
  });

  const addToRecentlyPlayed = (track) => {
    if (!track || (!track.id && !track.videoId && !track.title && !track.name)) return;
    const norm = normalizeTrack(track);
    setRecentlyPlayed((prevList) => {
      const trackId = norm.id || norm.videoId;
      const safeList = Array.isArray(prevList) ? prevList : [];
      const filtered = safeList.filter(
        (t) =>
          (t.id || t.videoId) !== trackId &&
          !(t.title === norm.title && (t.artist === norm.artist || t.artist_name === norm.artist_name))
      );
      const updated = [norm, ...filtered].slice(0, 20);
      try {
        const userKey = `recently_played_${user?.uid || user?.id || user?.email || 'guest'}`;
        localStorage.setItem(userKey, JSON.stringify(updated));
        localStorage.setItem('chillmusic_recently_played', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  useEffect(() => {
    if (currentTrack && isPlaying) {
      addToRecentlyPlayed(currentTrack);
    }
  }, [currentTrack?.id, currentTrack?.videoId, isPlaying]);

  const [favorites, setFavorites] = useState(() => {
    const res = getSafeStorageItem('chillmusic_favorites', []);
    return Array.isArray(res) ? res : [];
  });

  const [playlists, setPlaylists] = useState(() => {
    const userKey = `custom_playlists_${user?.uid || user?.id || 'guest'}`;
    const res = getSafeStorageItem(userKey, []);
    return Array.isArray(res) ? res : [];
  });


  const toggleFavorite = (track) => {
    if (!track || (!track.id && !track.song_id)) return;
    const norm = normalizeTrack(track);
    setFavorites((prev) => {
      const exists = prev.some(
        (fav) =>
          String(fav.id || fav.song_id) === String(norm.id) ||
          (fav.title === norm.title && (fav.artist === norm.artist || fav.artist_name === norm.artist_name))
      );
      let updated;
      if (exists) {
        updated = prev.filter(
          (fav) => String(fav.id || fav.song_id) !== String(norm.id) && fav.title !== norm.title
        );
      } else {
        updated = [norm, ...prev];
      }
      try {
        localStorage.setItem('chillmusic_favorites', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const isFavorite = (trackId, title) => {
    if (!trackId && !title) return false;
    return favorites.some(
      (fav) => String(fav.id || fav.song_id) === String(trackId) || (title && fav.title === title)
    );
  };

  // Auto-Queue Gemini & Expansion Integration
  const [isFetchingAutoQueue, setIsFetchingAutoQueue] = useState(false);
  const [isSmartShuffling, setIsSmartShuffling] = useState(false);
  const lastAutoQueueIndex = useRef(-1);

  // Context-Aware Recommendation Helper
  const fetchContextAwareRecommendations = async (activeTrack, currentQueueList = []) => {
    if (!activeTrack) return [];

    const artist = (activeTrack.artist_name || activeTrack.artist || '').trim();
    const title = (activeTrack.title || '').trim();
    const genre = (activeTrack.genre || activeTrack.album_name || '').trim();

    // Determine if user is playing an ambient/nature/sleep session
    const isAmbientSession = /rain|thunder|nature|white noise|sleep|meditation|relaxing sounds|binaural/i.test(
      `${artist} ${title} ${genre}`
    );

    const existingIds = new Set(currentQueueList.map((t) => String(t.id)));
    const candidateTracks = [];

    // 1. Fetch related songs from the active artist
    if (artist && artist.toLowerCase() !== 'unknown' && artist.toLowerCase() !== 'featured artist') {
      try {
        const artistRes = await searchUnified(artist, 20);
        if (artistRes && artistRes.songs && artistRes.songs.length > 0) {
          candidateTracks.push(...artistRes.songs);
        }
      } catch (e) {}
    }

    // 2. Fetch related songs matching active genre or style
    const secondaryQuery = genre && genre !== 'Single' ? `${genre} hits` : `${artist} hits`;
    try {
      const genreRes = await searchUnified(secondaryQuery, 20);
      if (genreRes && genreRes.songs && genreRes.songs.length > 0) {
        candidateTracks.push(...genreRes.songs);
      }
    } catch (e) {}

    // 3. Fallback recommendations matching active genre
    if (candidateTracks.length < 15) {
      try {
        const fallbackQuery = genre || title.split(' ')[0] || 'Pop';
        const popRes = await getRecommendations(fallbackQuery, 20);
        if (popRes && popRes.length > 0) {
          candidateTracks.push(...popRes);
        }
      } catch (e) {}
    }

    // Deduplicate and filter out ambient noise if not an ambient session
    const filtered = [];
    const seen = new Set();

    for (const track of candidateTracks) {
      if (!track || !track.id) continue;
      const trackIdStr = String(track.id);

      if (existingIds.has(trackIdStr) || seen.has(trackIdStr)) continue;

      if (!isAmbientSession) {
        const text = `${track.title || ''} ${track.artist_name || ''} ${track.album_name || ''}`.toLowerCase();
        const isNoise = /rain|thunder|nature sounds|white noise|sleep sounds|binaural|meditation|ocean waves/i.test(text);
        if (isNoise) continue;
      }

      seen.add(trackIdStr);
      filtered.push(track);
    }

    return filtered;
  };

  useEffect(() => {
    const checkAutoQueue = async () => {
      const remaining = queue.length - 1 - currentIndex;
      if (
        queue.length > 0 &&
        remaining <= 4 &&
        !isFetchingAutoQueue &&
        lastAutoQueueIndex.current !== currentIndex
      ) {
        lastAutoQueueIndex.current = currentIndex;
        setIsFetchingAutoQueue(true);
        try {
          let newTracks = await getAutoQueueRecommendations(currentTrack, queue.slice(0, 10));

          if (!newTracks || newTracks.length === 0) {
            newTracks = await fetchContextAwareRecommendations(currentTrack, queue);
          }

          if (newTracks && newTracks.length > 0) {
            setQueue((prev) => {
              const existingIds = new Set(prev.map((t) => String(t.id)));
              const uniqueNew = newTracks.filter((t) => t && t.id && !existingIds.has(String(t.id)));
              return [...prev, ...uniqueNew];
            });
          }
        } catch (error) {
          console.error('Auto-Queue Error:', error);
        } finally {
          setIsFetchingAutoQueue(false);
        }
      }
    };

    checkAutoQueue();
  }, [queue.length, currentIndex, currentTrack, isFetchingAutoQueue, queue]);

  // Initialize audio listeners
  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = volume;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      const realDur = audio.duration;
      if (realDur && !isNaN(realDur) && isFinite(realDur) && realDur > 35) {
        setDuration(realDur);
      } else if (currentTrack?.duration && currentTrack.duration > 35) {
        setDuration(currentTrack.duration);
      }
    };
    const handleEnded = () => handleTrackEnd();
    const handleError = (e) => {
      console.error('Audio Tag Error:', e?.target?.error || e);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [queue, currentIndex, isShuffle, repeatMode, currentTrack]);

  const getFullAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url;
    }
    const cleanUrl = url.startsWith('/api') ? url.substring(4) : url;
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const playTrack = async (song, newQueue = null, index = 0) => {
    if (!song) return;

    const normalizedSong = normalizeTrack(song);
    addToRecentlyPlayed(normalizedSong);

    let targetQueue = newQueue ? newQueue.map(normalizeTrack) : [...queue];

    // Find if track is already in targetQueue
    const existingIdx = targetQueue.findIndex(
      (t) =>
        String(t.id) === String(normalizedSong.id) ||
        (t.title === normalizedSong.title && t.artist_name === normalizedSong.artist_name)
    );

    if (existingIdx !== -1) {
      // Move active track to index 0 so it stays at the top of the queue drawer
      const [item] = targetQueue.splice(existingIdx, 1);
      targetQueue.unshift(item);
    } else {
      targetQueue.unshift(normalizedSong);
    }

    setCurrentIndex(0);
    setQueue(targetQueue);
    setCurrentTrack(normalizedSong);
    setCurrentTime(0);

    const fullDur =
      normalizedSong.duration && normalizedSong.duration > 35
        ? normalizedSong.duration
        : normalizedSong.trackTimeMillis
        ? Math.floor(normalizedSong.trackTimeMillis / 1000)
        : 210;
    setDuration(fullDur);

    // Auto-populate queue to 20-30 context-aware tracks if short
    if (targetQueue.length < 20) {
      fetchContextAwareRecommendations(normalizedSong, targetQueue).then((expanded) => {
        if (expanded && expanded.length > 0) {
          setQueue((prev) => {
            const currentIds = new Set(prev.map((t) => String(t.id)));
            const uniqueNew = expanded.filter((t) => !currentIds.has(String(t.id)));
            return [...prev, ...uniqueNew].slice(0, 30);
          });
        }
      });
    }

    // 1. Try to fetch direct stream from public Saavn API
    let streamUrl = normalizedSong.audioUrl || normalizedSong.audio_url || '';
    let streamDuration = fullDur;

    const titleToSearch = normalizedSong.title || normalizedSong.name || '';
    const artistToSearch = normalizedSong.artist || normalizedSong.artist_name || '';

    try {
      const query = encodeURIComponent(`${titleToSearch} ${artistToSearch}`.trim());
      const res = await fetch(`https://saavn.dev/api/search/songs?query=${query}&page=1&limit=1`);
      const data = await res.json();
      const songData = data?.data?.results?.[0];
      if (songData?.downloadUrl) {
        const downloadLinks = songData.downloadUrl;
        streamUrl = downloadLinks[downloadLinks.length - 1]?.url || downloadLinks[0]?.url;
        if (songData.duration) {
          streamDuration = Number(songData.duration);
        }
      }
    } catch (e) {
      console.warn('Full stream search failed, using default preview:', e);
    }

    // Fallback to track.previewUrl if resolver fails
    if (!streamUrl && normalizedSong.previewUrl) {
      streamUrl = normalizedSong.previewUrl;
    }

    // Fallback to YouTube Video ID if no direct stream URL found
    let videoId = normalizedSong.videoId || normalizedSong.youtubeId;
    if (!streamUrl && !videoId) {
      if (titleToSearch || artistToSearch) {
        videoId = await fetchYouTubeVideoId(titleToSearch, artistToSearch);
      }
      if (!videoId) {
        const resolvedTarget = await resolveFullAudioTrack({
          ...normalizedSong,
          duration: fullDur,
        });
        if (resolvedTarget?.audioUrl) streamUrl = resolvedTarget.audioUrl;
        if (resolvedTarget?.videoId || resolvedTarget?.youtubeId) {
          videoId = resolvedTarget.videoId || resolvedTarget.youtubeId;
        }
      }
    }

    if (!streamUrl && !videoId) {
      console.error('No playable audio source found for track:', normalizedSong);
      setIsLoading(false);
      setIsPlaying(false);
      return;
    }

    const realDur = streamDuration && streamDuration > 35 ? streamDuration : fullDur;
    setDuration(realDur);

    const updatedTrack = normalizeTrack({
      ...normalizedSong,
      audioUrl: streamUrl || '',
      audio_url: streamUrl || '',
      videoId: videoId || normalizedSong.videoId,
      youtubeId: videoId || normalizedSong.youtubeId,
      duration: realDur,
    });

    setCurrentTrack(updatedTrack);
    setIsLoading(false);
    recordHistory(updatedTrack);
  };

  const togglePlayPause = () => {
    if (!currentTrack) return;
    if (ytPlayerRef.current && typeof ytPlayerRef.current.getPlayerState === 'function') {
      try {
        const state = ytPlayerRef.current.getPlayerState();
        if (isPlaying || state === 1) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
        return;
      } catch (e) {}
    }
    const audio = audioRef.current;
    if (audio && audio.src) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play().then(() => setIsPlaying(true)).catch((err) => {
          console.warn('Playback error:', err);
          setIsPlaying(false);
        });
      }
    }
  };

  const handleTrackEnd = () => {
    if (repeatMode === 'one') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        try {
          ytPlayerRef.current.seekTo(0, true);
          ytPlayerRef.current.playVideo();
        } catch (e) {}
      } else if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    } else if (repeatMode === 'all' && currentIndex === queue.length - 1) {
      nextTrack(true);
    } else {
      nextTrack();
    }
  };

  const nextTrack = (forceLoop = false) => {
    if (queue.length === 0) return;

    let nextIdx;
    if (isShuffle) {
      nextIdx = Math.floor(Math.random() * queue.length);
    } else {
      nextIdx = currentIndex + 1;
      if (nextIdx >= queue.length) {
        if (repeatMode === 'all' || forceLoop) {
          nextIdx = 0;
        } else {
          setIsPlaying(false);
          return;
        }
      }
    }

    const nextTrk = queue[nextIdx];
    if (nextTrk) {
      setCurrentIndex(nextIdx);
      playTrack(nextTrk);
    }
  };

  const prevTrack = () => {
    if (queue.length === 0) return;

    if (currentTime > 3) {
      seekTo(0);
      return;
    }

    let prevIdx = currentIndex - 1;
    if (prevIdx < 0) prevIdx = queue.length - 1;
    const prevTrk = queue[prevIdx];
    if (prevTrk) {
      setCurrentIndex(prevIdx);
      playTrack(prevTrk);
    }
  };

  const seekTo = (seconds) => {
    setCurrentTime(seconds);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
      try {
        ytPlayerRef.current.seekTo(seconds, true);
      } catch (e) {}
    }
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
    }
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
      try {
        ytPlayerRef.current.setVolume(newVol * 100);
      } catch (e) {}
    }
    if (audioRef.current) {
      audioRef.current.volume = newVol;
    }
    if (newVol > 0 && isMuted) setIsMuted(false);
  };

  const toggleMute = () => {
    if (isMuted) {
      if (audioRef.current) audioRef.current.volume = volume;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        try {
          ytPlayerRef.current.setVolume(volume * 100);
        } catch (e) {}
      }
      setIsMuted(false);
    } else {
      if (audioRef.current) audioRef.current.volume = 0;
      if (ytPlayerRef.current && typeof ytPlayerRef.current.setVolume === 'function') {
        try {
          ytPlayerRef.current.setVolume(0);
        } catch (e) {}
      }
      setIsMuted(true);
    }
  };

  const toggleShuffle = () => setIsShuffle(!isShuffle);

  const cycleRepeatMode = () => {
    if (repeatMode === 'off') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('off');
  };

  const addToQueue = (track) => {
    setQueue((prev) => [...prev, track]);
  };

  const removeFromQueue = (index) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
    if (index === currentIndex) {
      nextTrack();
    } else if (index < currentIndex) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const clearQueue = () => {
    setQueue([]);
    setCurrentIndex(-1);
    setCurrentTrack(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setIsQueueOpen(false);
    setIsFullPlayerOpen(false);
  };

  const geminiSmartShuffle = async () => {
    if (queue.length === 0) return false;

    setIsSmartShuffling(true);

    try {
      const active = currentTrack || queue[currentIndex] || queue[0];
      const remaining = queue.filter(
        (t) =>
          String(t.id) !== String(active.id) &&
          !(t.title === active.title && t.artist_name === active.artist_name)
      );

      // Rearrange remaining tracks based on matching artist and genre alignment
      const sortedRemaining = [...remaining].sort((a, b) => {
        const artistMatchA =
          (a.artist_name || '').toLowerCase() === (active.artist_name || '').toLowerCase() ? -1 : 1;
        const artistMatchB =
          (b.artist_name || '').toLowerCase() === (active.artist_name || '').toLowerCase() ? -1 : 1;
        if (artistMatchA !== artistMatchB) return artistMatchA - artistMatchB;

        return 0;
      });

      // Fetch fresh context-aware recommendations matching active artist/genre
      const freshContextTracks = await fetchContextAwareRecommendations(active, [
        active,
        ...sortedRemaining,
      ]);

      // Active track first at index 0 -> matching artist/genre tracks -> fresh context recommendations
      const smartQueue = [active, ...sortedRemaining, ...freshContextTracks].slice(0, 30);

      setQueue(smartQueue);
      setCurrentIndex(0);
      setCurrentTrack(active);
      return true;
    } catch (err) {
      console.error('Gemini Smart Shuffle error:', err);
      return false;
    } finally {
      setIsSmartShuffling(false);
    }
  };

  const prevUserRef = useRef(user);

  useEffect(() => {
    if (prevUserRef.current && !user) {
      clearQueue();
    }
    prevUserRef.current = user;
  }, [user]);

  const recordHistory = async (track) => {
    try {
      if (user && track) {
        await addHistory(track);
      }
    } catch (err) {
      console.warn('Failed to record track history:', err);
    }
  };

  return (
    <PlayerContext.Provider
      value={{
        audioRef,
        ytPlayerRef,
        currentTrack,
        isPlaying,
        setIsPlaying,
        setDuration,
        setCurrentTime,
        queue: Array.isArray(queue) ? queue : [],
        currentIndex,

        volume,
        isMuted,
        currentTime,
        duration,
        isShuffle,
        repeatMode,
        isQueueOpen,
        isFullPlayerOpen,
        isSmartShuffling,
        isLoading,
        setIsLoading,
        setIsQueueOpen,
        setIsFullPlayerOpen,
        playTrack,
        togglePlayPause,
        nextTrack,
        prevTrack,
        seekTo,
        handleVolumeChange,
        toggleMute,
        toggleShuffle,
        cycleRepeatMode,
        addToQueue,
        removeFromQueue,
        clearQueue,
        geminiSmartShuffle,
        recentlyPlayed: Array.isArray(recentlyPlayed) ? recentlyPlayed : [],
        addToRecentlyPlayed,
        favorites: Array.isArray(favorites) ? favorites : [],
        toggleFavorite,
        isFavorite,
        playlists: Array.isArray(playlists) ? playlists : [],
        setPlaylists,
      }}
    >

      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
export const useMusicContext = () => useContext(PlayerContext);

