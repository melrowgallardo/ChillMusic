import React, { useState, useEffect } from 'react';
import YouTube from 'react-youtube';
import { usePlayer } from '../../context/PlayerContext';

const AudioPlayer = () => {
  const {
    audioRef,
    ytPlayerRef,
    currentTrack,
    isPlaying,
    setIsPlaying,
    setDuration,
    setCurrentTime,
    volume,
    nextTrack,
  } = usePlayer();

  const [ytPlayer, setYtPlayer] = useState(null);

  const videoId =
    currentTrack?.videoId ||
    currentTrack?.youtubeId ||
    (currentTrack?.id && String(currentTrack.id).startsWith('yt_') ? String(currentTrack.id).replace('yt_', '') : null);

  const opts = {
    height: '0',
    width: '0',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      fs: 0,
      rel: 0,
      start: 0, // Force start at 0:00 (Intro)
    },
  };

  const onReady = (event) => {
    const player = event.target;
    setYtPlayer(player);
    ytPlayerRef.current = player;
    try {
      player.seekTo(0, true);
      player.setVolume(volume * 100);
      player.playVideo();
      setIsPlaying(true);
      setCurrentTime(0);
    } catch (e) {}
  };

  const onStateChange = (event) => {
    // YouTube PlayerState: 1 = PLAYING, 2 = PAUSED, 0 = ENDED
    if (event.data === 1) setIsPlaying(true);
    if (event.data === 2) setIsPlaying(false);
    if (event.data === 0) nextTrack();
  };

  // Sync volume with YouTube Player
  useEffect(() => {
    if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
      try {
        ytPlayer.setVolume(volume * 100);
      } catch (e) {}
    }
  }, [volume, ytPlayer]);

  // Sync progress bar & scrubber (500ms Interval)
  useEffect(() => {
    let timer = null;
    if (isPlaying && ytPlayer && typeof ytPlayer.getCurrentTime === 'function') {
      timer = setInterval(() => {
        try {
          const cur = ytPlayer.getCurrentTime();
          const dur = ytPlayer.getDuration();
          if (cur !== undefined && !isNaN(cur)) {
            setCurrentTime(cur);
          }
          if (dur !== undefined && !isNaN(dur) && dur > 35) {
            setDuration(dur);
          }
        } catch (e) {}
      }, 500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, ytPlayer, setCurrentTime, setDuration]);

  // Fallback HTML5 Audio Player for non-YouTube tracks
  const rawAudioUrl = currentTrack?.audioUrl || currentTrack?.audio_url;
  useEffect(() => {
    if (videoId) return; // Managed by react-youtube engine
    if (audioRef?.current && rawAudioUrl) {
      if (audioRef.current.src !== rawAudioUrl) {
        audioRef.current.src = rawAudioUrl;
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        audioRef.current.load();
      }
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn('Fallback audio playback error:', err);
            setIsPlaying(false);
          });
      }
    }
  }, [videoId, rawAudioUrl, currentTrack?.id]);

  return (
    <>
      {/* Hidden YouTube IFrame Audio Engine Wrapper */}
      <div style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}>
        {videoId && (
          <YouTube
            key={videoId}
            videoId={videoId}
            opts={opts}
            onReady={onReady}
            onStateChange={onStateChange}
            onError={(err) => {
              console.warn('react-youtube error:', err);
              nextTrack();
            }}
          />
        )}
      </div>

      {/* Fallback HTML5 Audio Element */}
      <audio
        ref={audioRef}
        src={rawAudioUrl || ''}
        preload="auto"
        onLoadedMetadata={() => {
          if (audioRef?.current?.duration) {
            const dur = audioRef.current.duration;
            if (dur > 35) {
              setDuration(dur);
            }
          }
        }}
        onTimeUpdate={() => {
          if (!videoId && audioRef?.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }}
        onEnded={() => {
          if (!videoId) nextTrack();
        }}
        onError={(e) => console.error('Audio Playback Error:', e.currentTarget.error)}
        style={{ display: 'none' }}
      />
    </>
  );
};

export default AudioPlayer;
