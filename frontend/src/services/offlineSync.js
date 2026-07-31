import { openDB } from 'idb';

const DB_NAME = 'chillmusic_offline_db';
const DB_VERSION = 2;

export const initOfflineDB = async () => {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('cached_songs')) {
        db.createObjectStore('cached_songs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline_queue')) {
        db.createObjectStore('offline_queue', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('local_favorites')) {
        db.createObjectStore('local_favorites', { keyPath: 'item_id' });
      }
      if (!db.objectStoreNames.contains('local_downloads')) {
        db.createObjectStore('local_downloads', { keyPath: 'song_id' });
      }
    },
  });
};

export const cacheSongsLocally = async (songs) => {
  try {
    const db = await initOfflineDB();
    const tx = db.transaction('cached_songs', 'readwrite');
    for (const song of songs) {
      if (song && song.id) {
        await tx.store.put(song);
      }
    }
    await tx.done;
  } catch (err) {
    console.error('Failed to cache songs offline:', err);
  }
};

export const getCachedSongs = async () => {
  try {
    const db = await initOfflineDB();
    return await db.getAll('cached_songs');
  } catch (err) {
    console.error('Failed to read cached songs:', err);
    return [];
  }
};

export const enqueueOfflineAction = async (actionType, payload) => {
  try {
    const db = await initOfflineDB();
    await db.add('offline_queue', {
      actionType,
      payload,
      timestamp: new Date().toISOString(),
    });
    console.log(`[OfflineQueue] Enqueued action: ${actionType}`);
  } catch (err) {
    console.error('Failed to enqueue offline action:', err);
  }
};

export const getOfflineQueue = async () => {
  try {
    const db = await initOfflineDB();
    return await db.getAll('offline_queue');
  } catch (err) {
    return [];
  }
};

export const clearOfflineQueue = async () => {
  try {
    const db = await initOfflineDB();
    await db.clear('offline_queue');
  } catch (err) {
    console.error('Failed to clear offline queue:', err);
  }
};

export const saveDownloadLocally = async (track) => {
  if (!track || !track.id) return null;
  try {
    let audioBlob = null;
    try {
      if (track.audio_url) {
        const res = await fetch(track.audio_url, { mode: 'cors' });
        if (res.ok) {
          audioBlob = await res.blob();
        }
      }
    } catch (err) {
      console.warn('Could not fetch offline audio blob:', err);
    }

    try {
      if ('caches' in window && track.audio_url) {
        const cache = await caches.open('chillmusic-offline-audio');
        await cache.add(track.audio_url);
      }
    } catch (cacheErr) {
      console.warn('CacheStorage cache error:', cacheErr);
    }

    const db = await initOfflineDB();
    const downloadItem = {
      song_id: track.id,
      id: track.id,
      song_title: track.title,
      title: track.title,
      artist_name: track.artist_name,
      album_name: track.album_name || 'Single',
      audio_url: track.audio_url,
      image_url: track.image_url || '',
      duration: track.duration || 180,
      audioBlob: audioBlob,
      downloaded_at: new Date().toISOString(),
    };
    await db.put('local_downloads', downloadItem);
    await cacheSongsLocally([track]);
    return downloadItem;
  } catch (err) {
    console.error('Failed to save download locally:', err);
    return null;
  }
};

export const getLocalDownloads = async () => {
  try {
    const db = await initOfflineDB();
    const items = await db.getAll('local_downloads');
    return items.sort((a, b) => new Date(b.downloaded_at) - new Date(a.downloaded_at));
  } catch (err) {
    console.error('Failed to read local downloads:', err);
    return [];
  }
};

export const getLocalDownloadById = async (songId) => {
  try {
    const db = await initOfflineDB();
    return await db.get('local_downloads', songId);
  } catch (err) {
    return null;
  }
};

export const removeLocalDownload = async (songId) => {
  try {
    const db = await initOfflineDB();
    await db.delete('local_downloads', songId);
  } catch (err) {
    console.error('Failed to remove local download:', err);
  }
};
