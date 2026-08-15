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
/**
 * Helper to fetch YouTube video ID for a track.
 * Queries public search scraper (e.g. https://pipedapi.kavin.rocks/search?q=${query}&filter=music_songs),
 * Invidious, and fetchYouTubePublic.
 */
export const getYoutubeTrack = async (title, artist) => {
  const query = artist ? `${artist} - ${title} official audio` : `${title} official audio`;
  const pipedEndpoints = [
    `https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=music_songs`,
    `https://pipedapi.tokhmi.xyz/search?q=${encodeURIComponent(query)}&filter=music_songs`,
    `https://api.piped.privacydev.net/search?q=${encodeURIComponent(query)}&filter=music_songs`,
  ];

  for (const url of pipedEndpoints) {
    try {
      const res = await fetchWithTimeout(url, 4000);
      if (res.ok) {
        const data = await res.json();
        const items = data.items || (Array.isArray(data) ? data : []);
        if (items.length > 0) {
          const first = items[0];
          let vid = first.url ? first.url.replace('/watch?v=', '').split('&')[0] : first.id || first.videoId;
          if (vid) {
            return {
              videoId: vid,
              youtubeId: vid,
              duration: parseInt(first.duration || first.lengthSeconds || 210, 10),
              title: first.title || title,
              artist: first.uploaderName || artist,
            };
          }
        }
      }
    } catch (e) {}
  }

  // Fallback to fetchYouTubePublic
  try {
    const tracks = await fetchYouTubePublic(query, 5);
    if (tracks && tracks.length > 0) {
      const best = tracks[0];
      const vid = best.id ? String(best.id).replace('yt_', '') : null;
      if (vid) {
        return {
          videoId: vid,
          youtubeId: vid,
          duration: best.duration || 210,
          title: best.title || title,
          artist: best.artist || artist,
        };
      }
    }
  } catch (e) {}

  return null;
};

export const resolveFullAudioTrack = async (track) => {
  if (!track) return track;

  let existingUrl = track.audio_url || track.audioUrl;
  let existingYtId =
    track.videoId ||
    track.youtubeId ||
    (track.id && String(track.id).startsWith('yt_') ? String(track.id).replace('yt_', '') : null);

  // Remove 30-Second Previews: completely purge iTunes previewUrl
  if (existingUrl && isPreviewUrl(existingUrl, track.duration)) {
    existingUrl = '';
  }

  const fullDuration =
    track.duration && track.duration > 35
      ? track.duration
      : track.trackTimeMillis
      ? Math.floor(track.trackTimeMillis / 1000)
      : 210;

  const artistName = (track.artist_name || track.artist || '').trim();
  const trackTitle = (track.title || '').trim();

  // If we don't have a videoId yet, resolve it via getYoutubeTrack
  if (!existingYtId && (trackTitle || artistName)) {
    const ytResolved = await getYoutubeTrack(trackTitle, artistName);
    if (ytResolved && ytResolved.videoId) {
      existingYtId = ytResolved.videoId;
    }
  }

  if (existingUrl) {
    return {
      ...track,
      videoId: existingYtId,
      youtubeId: existingYtId,
      audio_url: existingUrl,
      audioUrl: existingUrl,
      duration: fullDuration,
    };
  }

  // Format query as `${track.artist} - ${track.title} official audio`
  const searchQuery = artistName ? `${artistName} - ${trackTitle}` : `${trackTitle}`;
  const ytSearchQuery = `${searchQuery} official audio`;

  // 1. YouTube Search
  try {
    const ytTracks = await fetchYouTubePublic(ytSearchQuery, 10);
    const rankedYt = filterAndRankAudioCandidates(ytTracks, trackTitle, artistName);
    const bestYt = rankedYt.find(
      (t) => t && (t.audio_url || t.stream_url) && !isPreviewUrl(t.audio_url || t.stream_url, t.duration) && t.duration >= 60
    );

    if (bestYt) {
      const streamUrl = bestYt.audio_url || bestYt.stream_url;
      const resolvedDur = bestYt.duration && bestYt.duration >= 60 ? bestYt.duration : fullDuration;
      const ytId = bestYt.id ? String(bestYt.id).replace('yt_', '') : existingYtId;
      return {
        ...track,
        videoId: ytId || existingYtId,
        youtubeId: ytId || existingYtId,
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

  // 2. JioSaavn CDN Search
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
          videoId: existingYtId,
          youtubeId: existingYtId,
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

  // 3. Fallback to Backend YouTube Stream Resolver
  const backendStreamUrl = `${API_BASE_URL}/youtube/stream-by-query?q=${encodeURIComponent(ytSearchQuery)}`;
  return {
    ...track,
    videoId: existingYtId,
    youtubeId: existingYtId,
    audio_url: backendStreamUrl,
    audioUrl: backendStreamUrl,
    duration: fullDuration,
    source: 'youtube_backend_stream',
  };
};

