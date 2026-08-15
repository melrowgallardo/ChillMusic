import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { addHistory } from '../services/firestoreService';
import { getAutoQueueRecommendations } from '../services/gemini_service';
import { searchUnified, getRecommendations } from '../services/jamendo';
import { useAuth } from './AuthContext';
import { getLocalDownloadById } from '../services/offlineSync';
import { resolveFullAudioTrack } from '../services/audioResolver';

import { normalizeTrack } from '../utils/trackUtils';

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
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

  const [recentlyPlayed, setRecentlyPlayed] = useState(() => {
    try {
      const saved = localStorage.getItem('chillmusic_recently_played');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const addToRecentlyPlayed = (track) => {
    if (!track || (!track.title && !track.name)) return;
    const norm = normalizeTrack(track);
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter(
        (item) => String(item.id) !== String(norm.id) && item.title !== norm.title
      );
      const updated = [norm, ...filtered].slice(0, 20);
      try {
        localStorage.setItem('chillmusic_recently_played', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
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

    // Resolve full-length audio stream via YouTube / Piped / Invidious stream resolver
    // Query format: `${track.artist} - ${track.title} official audio`
    const resolvedTarget = await resolveFullAudioTrack({
      ...normalizedSong,
      duration: fullDur,
    });
    const targetTrack = normalizeTrack(resolvedTarget || normalizedSong);
    if (targetTrack) {
      setCurrentTrack(targetTrack);
      if (targetTrack.duration && targetTrack.duration > 35) {
        setDuration(targetTrack.duration);
      }
    }

    // Clear previous audio buffer when a new song starts to prevent playing stale cached audio
    const audio = audioRef.current;
    audio.pause();
    audio.currentTime = 0;
    audio.removeAttribute('src');
    audio.load();

    const rawUrl = targetTrack?.audioUrl || targetTrack?.audio_url || '';
    const defaultUrl = getFullAudioUrl(rawUrl);

    const startPlay = (urlToPlay) => {
      if (urlToPlay) {
        audio.src = urlToPlay;
        audio.currentTime = 0; // Always begin at 0:00 Intro
        setCurrentTime(0);
        audio.load(); // Dynamically update and reload exact audio URL matching currentTrack.id

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              recordHistory(targetTrack);
            })
            .catch((err) => {
              console.error('Full Stream Playback Error:', err);
              setIsPlaying(false);
            });
        }
      }
    };

    getLocalDownloadById(targetTrack.id)
      .then((downloaded) => {
        if (downloaded && downloaded.audioBlob) {
          const blobUrl = URL.createObjectURL(downloaded.audioBlob);
          startPlay(blobUrl);
        } else {
          startPlay(defaultUrl);
        }
      })
      .catch(() => {
        startPlay(defaultUrl);
      });
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
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTrackEnd = () => {
    if (repeatMode === 'one') {
      if (ytPlayerRef.current && typeof ytPlayerRef.current.seekTo === 'function') {
        try {
          ytPlayerRef.current.seekTo(0, true);
          ytPlayerRef.current.playVideo();
        } catch (e) {}
      } else {
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
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
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

  const { user } = useAuth();
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
        queue,
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
        recentlyPlayed,
        addToRecentlyPlayed,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
