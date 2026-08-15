import { fetchYouTubePublic } from './youtube';
import { API_BASE_URL } from './api';

// Helper to detect 30s preview URLs or short preview tracks
export const isPreviewUrl = (url, duration) => {
  if (!url) return true;
  const lower = url.toLowerCase();
  if (
    lower.includes('dzcdn.net') ||
    lower.includes('cdns-preview') ||
    lower.includes('preview') ||
    lower.includes('apple.com') ||
    lower.includes('itunes') ||
    lower.includes('sample')
  ) {
    return true;
  }
  if (duration > 0 && duration <= 35 && !lower.includes('soundhelix')) {
    return true;
  }
  return false;
};

// Fast helper to fetch with timeout
const fetchWithTimeout = async (url, timeoutMs = 3000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
};

const containsKeyword = (text, keyword) => {
  if (!text) return false;
  return new RegExp(`\\b${keyword}\\b`, 'i').test(text);
};

/**
 * Ranks and filters candidate audio tracks to avoid unwanted remixes, covers, or live tracks,
 * prioritizing official audio and topic channels.
 */
export const filterAndRankAudioCandidates = (candidates, originalTitle, originalArtist) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const titleLower = (originalTitle || '').toLowerCase();
  const artistLower = (originalArtist || '').toLowerCase();

  const wantsRemix = containsKeyword(titleLower, 'remix') || containsKeyword(titleLower, 'rework');
  const wantsCover =
    containsKeyword(titleLower, 'cover') ||
    containsKeyword(titleLower, 'instrumental') ||
    containsKeyword(titleLower, 'karaoke');
  const wantsLive = containsKeyword(titleLower, 'live');

  return candidates
    .map((candidate) => {
      if (!candidate || (!candidate.audio_url && !candidate.stream_url && !candidate.audioUrl && !candidate.previewUrl)) return null;

      const candidateTitle = (candidate.title || '').toLowerCase();
      const candidateArtist = (
        candidate.artist_name ||
        candidate.artist ||
        candidate.uploader ||
        ''
      ).toLowerCase();
      let score = 0;

      // Penalty for undesired Remix / Rework
      if (
        !wantsRemix &&
        (candidateTitle.includes('remix') ||
          candidateTitle.includes('rework') ||
          candidateTitle.includes('bootleg'))
      ) {
        score -= 50;
      }

      // Penalty for undesired Cover / Instrumental / Karaoke
      if (
        !wantsCover &&
        (candidateTitle.includes('cover') ||
          candidateTitle.includes('instrumental') ||
          candidateTitle.includes('piano cover') ||
          candidateTitle.includes('guitar cover') ||
          candidateTitle.includes('karaoke') ||
          candidateTitle.includes('tribute'))
      ) {
        score -= 50;
      }

      // Penalty for undesired Live performance
      if (
        !wantsLive &&
        (candidateTitle.includes('live at') ||
          candidateTitle.includes('live in') ||
          candidateTitle.includes('live 20') ||
          candidateTitle.includes('live performance'))
      ) {
        score -= 30;
      }

      // Priority boost for Official Audio / Topic / VEVO Channel
      if (
        candidateTitle.includes('official audio') ||
        candidateTitle.includes('official music video') ||
        candidateTitle.includes('official video') ||
        candidateArtist.includes('topic') ||
        candidateArtist.includes('vevo')
      ) {
        score += 30;
      }

      // Priority boost if uploader matches artist name
      if (artistLower && candidateArtist.includes(artistLower)) {
        score += 25;
      }

      // Priority boost if title matches original title
      if (titleLower && candidateTitle.includes(titleLower)) {
        score += 20;
      }

      return { candidate, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.candidate);
};

/**
 * Resolves full-length audio stream for a track strictly matching artist and title.
 * Formats query as: `${track.artist} - ${track.title} official audio`
 * Uses YouTube Audio Stream Resolvers / Piped / Invidious / Backend yt_dlp stream / JioSaavn CDN / Audius
 * Completely replaces 30-second iTunes preview URLs with full-length streaming.
 */
export const resolveFullAudioTrack = async (track) => {
  if (!track) return track;

  const existingUrl = track.audio_url || track.audioUrl;

  // Determine full target duration (e.g. from trackTimeMillis or track.duration if > 35, else default 210s)
  const fullDuration =
    track.duration && track.duration > 35
      ? track.duration
      : track.trackTimeMillis
      ? Math.floor(track.trackTimeMillis / 1000)
      : 210;

  // If track already has a valid full audio stream (not a 30s previewUrl), return as-is
  if (existingUrl && !isPreviewUrl(existingUrl, track.duration)) {
    return {
      ...track,
      audio_url: existingUrl,
      audioUrl: existingUrl,
      duration: fullDuration,
    };
  }

  const artistName = (track.artist_name || track.artist || '').trim();
  const trackTitle = (track.title || '').trim();

  // Prompt requirement: format query as `${track.artist} - ${track.title} official audio`
  const searchQuery = artistName ? `${artistName} - ${trackTitle}` : `${trackTitle}`;
  const ytSearchQuery = `${searchQuery} official audio`;

  console.log(`Resolving full audio stream for: "${ytSearchQuery}"...`);

  // 1. YouTube Public Search (Piped / Invidious API mirrors)
  try {
    const ytTracks = await fetchYouTubePublic(ytSearchQuery, 10);
    const rankedYt = filterAndRankAudioCandidates(ytTracks, trackTitle, artistName);
    const bestYt = rankedYt.find(
      (t) => t && (t.audio_url || t.stream_url) && !isPreviewUrl(t.audio_url || t.stream_url, t.duration) && t.duration >= 60
    );

    if (bestYt) {
      const streamUrl = bestYt.audio_url || bestYt.stream_url;
      const resolvedDur = bestYt.duration && bestYt.duration >= 60 ? bestYt.duration : fullDuration;
      return {
        ...track,
        audio_url: streamUrl,
        audioUrl: streamUrl,
        duration: resolvedDur,
        source: bestYt.source || 'youtube',
        image_url: track.image_url || bestYt.image_url,
      };
    }
  } catch (err) {
    console.warn('YouTube exact stream resolution error:', err);
  }

  // 2. JioSaavn CDN Search (Full Studio Audio Streams)
  try {
    const res = await fetchWithTimeout(
      `https://saavn.dev/api/search/songs?query=${encodeURIComponent(searchQuery)}&limit=10`,
      2500
    );
    if (res.ok) {
      const json = await res.json();
      const results = json.data?.results || [];
      const saavnCandidates = results.map((item) => {
        const audioList = item.downloadUrl || item.url || [];
        let url = '';
        if (Array.isArray(audioList) && audioList.length > 0) {
          url = audioList[audioList.length - 1].url || audioList[audioList.length - 1].link || '';
        }
        return {
          title: item.name || item.title,
          artist_name: item.primaryArtists || item.artist,
          audio_url: url,
          duration: parseInt(item.duration || 210, 10),
        };
      });

      const rankedSaavn = filterAndRankAudioCandidates(saavnCandidates, trackTitle, artistName);
      const bestSaavn = rankedSaavn.find((t) => t && t.audio_url && !isPreviewUrl(t.audio_url, t.duration) && t.duration >= 60);

      if (bestSaavn) {
        return {
          ...track,
          audio_url: bestSaavn.audio_url,
          audioUrl: bestSaavn.audio_url,
          duration: bestSaavn.duration || fullDuration,
          source: 'saavn',
        };
      }
    }
  } catch (err) {
    console.warn('Saavn exact stream resolution error:', err);
  }

  // 3. Audius Open API Stream Search
  try {
    const res = await fetchWithTimeout(
      `https://api.audius.co/v1/tracks/search?query=${encodeURIComponent(searchQuery)}&limit=5`,
      2500
    );
    if (res.ok) {
      const json = await res.json();
      const items = json.data || [];
      const audiusCandidates = items.map((i) => ({
        title: i.title,
        artist_name: i.user?.name || i.artist_name,
        audio_url: `https://api.audius.co/v1/tracks/${i.id}/stream`,
        duration: i.duration,
      }));
      const rankedAudius = filterAndRankAudioCandidates(audiusCandidates, trackTitle, artistName);
      const bestAudius = rankedAudius.find((t) => t && t.audio_url && t.duration >= 60);
      if (bestAudius) {
        return {
          ...track,
          audio_url: bestAudius.audio_url,
          audioUrl: bestAudius.audio_url,
          duration: bestAudius.duration || fullDuration,
          source: 'audius',
        };
      }
    }
  } catch (err) {}

  // 4. Backend YouTube Stream Resolver using yt_dlp Endpoint (/api/youtube/stream-by-query)
  const backendStreamUrl = `${API_BASE_URL}/youtube/stream-by-query?q=${encodeURIComponent(ytSearchQuery)}`;
  return {
    ...track,
    audio_url: backendStreamUrl,
    audioUrl: backendStreamUrl,
    duration: fullDuration,
    source: 'youtube_backend_stream',
  };
};

