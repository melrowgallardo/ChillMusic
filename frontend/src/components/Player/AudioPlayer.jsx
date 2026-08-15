import React, { useEffect } from 'react';
import { usePlayer } from '../../context/PlayerContext';

const AudioPlayer = () => {
  const {
    audioRef,
    currentTrack,
    setIsPlaying,
    setDuration,
    setCurrentTime,
    nextTrack,
  } = usePlayer();

  useEffect(() => {
    const url = currentTrack?.audioUrl || currentTrack?.audio_url;
    if (audioRef?.current && url) {
      if (audioRef.current.src !== url) {
        audioRef.current.src = url;
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        audioRef.current.load();
      }
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Playback error or autoplay blocked:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [currentTrack?.audioUrl, currentTrack?.audio_url, currentTrack?.id, audioRef, setIsPlaying, setCurrentTime]);

  return (
    <audio
      ref={audioRef}
      src={currentTrack?.audioUrl || currentTrack?.audio_url || ''}
      preload="auto"
      onLoadedMetadata={() => {
        if (audioRef?.current?.duration) {
          const dur = audioRef.current.duration;
          if (dur > 35) {
            setDuration(dur);
          } else if (currentTrack?.duration && currentTrack.duration > 35) {
            setDuration(currentTrack.duration);
          }
        }
      }}
      onTimeUpdate={() => {
        if (audioRef?.current) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }}
      onEnded={nextTrack}
      onError={(e) => console.error('Audio Playback Error:', e.currentTarget.error)}
      style={{ display: 'none' }}
    />
  );
};

export default AudioPlayer;
