import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { addHistory } from '../services/firestoreService';
import { getAutoQueueRecommendations } from '../services/gemini_service';
import { useAuth } from './AuthContext';
import { getLocalDownloadById } from '../services/offlineSync';

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

  // Auto-Queue Gemini Integration
  const [isFetchingAutoQueue, setIsFetchingAutoQueue] = useState(false);
  const lastAutoQueueIndex = useRef(-1);
  
  useEffect(() => {
    const checkAutoQueue = async () => {
      const remaining = queue.length - 1 - currentIndex;
      if (
        queue.length > 0 && 
        remaining <= 2 && 
        !isFetchingAutoQueue && 
        lastAutoQueueIndex.current !== currentIndex
      ) {
        lastAutoQueueIndex.current = currentIndex;
        setIsFetchingAutoQueue(true);
        try {
          const historySlice = queue.slice(Math.max(0, currentIndex - 10), currentIndex + 1);
          const newTracks = await getAutoQueueRecommendations(currentTrack, historySlice);
          
          if (newTracks && newTracks.length > 0) {
            setQueue(prev => {
              const existingIds = new Set(prev.map(t => t.id));
              const uniqueNew = newTracks.filter(t => !existingIds.has(t.id));
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

  const playTrack = (track, newQueue = null, index = 0) => {
    if (!track) return;

    if (newQueue) {
      setQueue(newQueue);
      setCurrentIndex(index);
    } else if (!queue.some((t) => t.id === track.id)) {
      const updatedQueue = [...queue, track];
      setQueue(updatedQueue);
      setCurrentIndex(updatedQueue.length - 1);
    } else {
      const idx = queue.findIndex((t) => t.id === track.id);
      if (idx !== -1) setCurrentIndex(idx);
    }

    setCurrentTrack(track);

    const audio = audioRef.current;
    const defaultUrl = getFullAudioUrl(track.audio_url);

    const startPlay = (urlToPlay) => {
      if (urlToPlay && audio.src !== urlToPlay) {
        audio.src = urlToPlay;
      }
      if (urlToPlay) {
        audio.play().then(() => {
          setIsPlaying(true);
          recordHistory(track);
        }).catch((err) => {
          console.warn('Auto-play error:', err);
          setIsPlaying(false);
        });
      }
    };

    getLocalDownloadById(track.id)
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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => useContext(PlayerContext);
