import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { addHistory } from '../services/firestoreService';
import { getAutoQueueRecommendations } from '../services/gemini_service';
import { searchUnified, getRecommendations } from '../services/jamendo';
import { useAuth } from './AuthContext';
import { getLocalDownloadById } from '../services/offlineSync';
import { resolveFullAudioTrack } from '../services/audioResolver';

const PlayerContext = createContext();

export const PlayerProvider = ({ children }) => {
  const audioRef = useRef(new Audio());
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

  // Auto-Queue Gemini & Expansion Integration
  const [isFetchingAutoQueue, setIsFetchingAutoQueue] = useState(false);
  const [isSmartShuffling, setIsSmartShuffling] = useState(false);
  const lastAutoQueueIndex = useRef(-1);

  // Helper to auto-populate queue to 20+ tracks based on seed artist/genre/track
  const autoExpandQueue = async (seedTrack, baseQueue) => {
    try {
      const seedTerm = seedTrack?.artist_name || seedTrack?.genre || seedTrack?.title || 'Chill Hits';
      const searchRes = await searchUnified(seedTerm, 25);
      let candidates = (searchRes && searchRes.songs && searchRes.songs.length > 0)
        ? searchRes.songs
        : await getRecommendations('chill', 25);

      if (candidates && candidates.length > 0) {
        const existingIds = new Set((baseQueue || []).map((t) => String(t.id)));
        const uniqueCandidates = candidates.filter((t) => t && t.id && !existingIds.has(String(t.id)));
        return [...(baseQueue || []), ...uniqueCandidates].slice(0, 30);
      }
    } catch (e) {
      console.warn('Queue auto-expansion failed:', e);
    }
    return baseQueue;
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
          const historySlice = queue.slice(Math.max(0, currentIndex - 10), currentIndex + 1);
          let newTracks = await getAutoQueueRecommendations(currentTrack, historySlice);

          if (!newTracks || newTracks.length === 0) {
            const queryTerm = currentTrack?.artist_name || currentTrack?.genre || 'Chill';
            const searchRes = await searchUnified(queryTerm, 20);
            newTracks = searchRes?.songs || [];
          }
          
          if (newTracks && newTracks.length > 0) {
            setQueue(prev => {
              const existingIds = new Set(prev.map(t => String(t.id)));
              const uniqueNew = newTracks.filter(t => t && t.id && !existingIds.has(String(t.id)));
              return [...prev, ...uniqueNew];
            });
          }
        } catch (error) {
          console.error("Auto-Queue Error:", error);
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
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => handleTrackEnd();
    const handleError = (e) => {
      console.error('Audio playback error:', e);
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
  }, [queue, currentIndex, isShuffle, repeatMode]);

  const getFullAudioUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const cleanUrl = url.startsWith('/api') ? url.substring(4) : url;
    return `${API_BASE_URL}${cleanUrl}`;
  };

  const playTrack = async (track, newQueue = null, index = 0) => {
    if (!track) return;

    let targetQueue = newQueue ? [...newQueue] : [...queue];
    let targetIndex = index;

    if (!newQueue) {
      const existingIdx = targetQueue.findIndex((t) => String(t.id) === String(track.id));
      if (existingIdx !== -1) {
        targetIndex = existingIdx;
      } else {
        targetQueue.push(track);
        targetIndex = targetQueue.length - 1;
      }
    }

    setQueue(targetQueue);
    setCurrentIndex(targetIndex);
    setCurrentTrack(track);

    // Auto-populate queue to 20-30 tracks if short
    if (targetQueue.length < 20) {
      autoExpandQueue(track, targetQueue).then((expanded) => {
        if (expanded && expanded.length > targetQueue.length) {
          setQueue(expanded);
        }
      });
    }

    // Resolve full-length song stream if track is a 30s preview clip
    const targetTrack = await resolveFullAudioTrack(track);
    if (targetTrack && targetTrack.audio_url) {
      setCurrentTrack(targetTrack);
    }

    const audio = audioRef.current;
    const defaultUrl = getFullAudioUrl(targetTrack.audio_url);

    const startPlay = (urlToPlay) => {
      if (urlToPlay && audio.src !== urlToPlay) {
        audio.src = urlToPlay;
      }
      if (urlToPlay) {
        audio.play().then(() => {
          setIsPlaying(true);
          recordHistory(targetTrack);
        }).catch((err) => {
          console.warn('Auto-play error:', err);
          setIsPlaying(false);
        });
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
      audioRef.current.currentTime = 0;
      audioRef.current.play();
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
      audioRef.current.currentTime = 0;
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
    if (audioRef.current) {
      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const handleVolumeChange = (newVol) => {
    setVolume(newVol);
    audioRef.current.volume = newVol;
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
      const remaining = queue.filter((t) => String(t.id) !== String(active.id));

      // Rearrange remaining tracks based on harmonic flow and matching artist
      const sortedRemaining = [...remaining].sort((a, b) => {
        const artistMatchA = (a.artist_name || '').toLowerCase() === (active.artist_name || '').toLowerCase() ? -1 : 1;
        const artistMatchB = (b.artist_name || '').toLowerCase() === (active.artist_name || '').toLowerCase() ? -1 : 1;
        if (artistMatchA !== artistMatchB) return artistMatchA - artistMatchB;

        const durA = a.duration || 180;
        const durB = b.duration || 180;
        return (durA % 60) - (durB % 60);
      });

      // Fetch fresh AI recommendations to expand smart mix
      let freshAiTracks = [];
      try {
        const geminiRecs = await getAutoQueueRecommendations(active, queue.slice(0, 5));
        if (geminiRecs && geminiRecs.length > 0) {
          freshAiTracks = geminiRecs;
        }
      } catch (e) {
        console.warn('Gemini recommendation error in smart shuffle:', e);
      }

      if (freshAiTracks.length === 0) {
        try {
          const recRes = await searchUnified(active.artist_name || active.genre || 'Chill', 20);
          if (recRes && recRes.songs && recRes.songs.length > 0) {
            freshAiTracks = recRes.songs;
          }
        } catch (e) {}
      }

      const existingIds = new Set([String(active.id), ...sortedRemaining.map((t) => String(t.id))]);
      const uniqueFresh = freshAiTracks.filter((t) => t && t.id && !existingIds.has(String(t.id)));

      // Active track first -> harmonic flow -> fresh AI tracks
      const smartQueue = [active, ...sortedRemaining, ...uniqueFresh].slice(0, 30);

      setQueue(smartQueue);
      setCurrentIndex(0);
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
        currentTrack,
        isPlaying,
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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);

