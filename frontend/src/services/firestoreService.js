import { db, auth } from '../firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

const getUserId = () => {
  if (auth.currentUser && auth.currentUser.uid) {
    return auth.currentUser.uid;
  }
  const savedUser = localStorage.getItem('user');
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      return parsed.uid || null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

// =======================
// FAVORITES
// =======================
export const getUserFavorites = async () => {
  const uid = getUserId();
  if (!uid) return [];
  try {
    const favsRef = collection(db, 'users', uid, 'favorites');
    const snap = await getDocs(favsRef);
    return snap.docs.map((d) => ({ id: d.id, item_id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Error fetching favorites:', err);
    return [];
  }
};

export const toggleFavorite = async (track) => {
  const uid = getUserId();
  if (!uid) throw new Error('User not authenticated');
  const trackId = String(track.id || track.item_id);
  const docRef = doc(db, 'users', uid, 'favorites', trackId);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    await deleteDoc(docRef);
    return false; // Not favorited anymore
  } else {
    await setDoc(docRef, {
      item_id: trackId,
      id: trackId,
      title: track.title || 'Unknown Title',
      subtitle: track.artist_name || track.subtitle || 'Artist',
      artist_name: track.artist_name || track.subtitle || 'Artist',
      image_url: track.image_url || '',
      audio_url: track.audio_url || '',
      createdAt: serverTimestamp(),
    });
    return true; // Favorited
  }
};

export const isFavorite = async (trackId) => {
  const uid = getUserId();
  if (!uid || !trackId) return false;
  try {
    const docRef = doc(db, 'users', uid, 'favorites', String(trackId));
    const snap = await getDoc(docRef);
    return snap.exists();
  } catch (err) {
    return false;
  }
};

// =======================
// PLAYLISTS
// =======================
export const getUserPlaylists = async () => {
  const uid = getUserId();
  if (!uid) return [];
  try {
    const plRef = collection(db, 'users', uid, 'playlists');
    const snap = await getDocs(plRef);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        tracks: data.tracks || [],
        track_count: (data.tracks || []).length,
      };
    });
  } catch (err) {
    console.error('Error fetching playlists:', err);
    return [];
  }
};

export const createPlaylist = async (name, description = '', isPublic = true) => {
  const uid = getUserId();
  if (!uid) throw new Error('User not authenticated');
  const newRef = doc(collection(db, 'users', uid, 'playlists'));
  const newPlaylist = {
    name,
    description,
    is_public: isPublic,
    tracks: [],
    track_count: 0,
    created_at: new Date().toISOString(),
    image_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80',
  };
  await setDoc(newRef, newPlaylist);
  return { id: newRef.id, ...newPlaylist };
};

export const getPlaylistDetail = async (playlistId) => {
  const uid = getUserId();
  if (!uid) return null;
  try {
    const docRef = doc(db, 'users', uid, 'playlists', playlistId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      tracks: data.tracks || [],
      track_count: (data.tracks || []).length,
    };
  } catch (err) {
    console.error('Error fetching playlist detail:', err);
    return null;
  }
};

export const updatePlaylist = async (playlistId, updates) => {
  const uid = getUserId();
  if (!uid) throw new Error('User not authenticated');
  const docRef = doc(db, 'users', uid, 'playlists', playlistId);
  await updateDoc(docRef, updates);
  return { id: playlistId, ...updates };
};

export const deletePlaylist = async (playlistId) => {
  const uid = getUserId();
  if (!uid) throw new Error('User not authenticated');
  const docRef = doc(db, 'users', uid, 'playlists', playlistId);
  await deleteDoc(docRef);
  return true;
};

export const addTrackToPlaylist = async (playlistId, track) => {
  const uid = getUserId();
  if (!uid) throw new Error('User not authenticated');
  const docRef = doc(db, 'users', uid, 'playlists', playlistId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error('Playlist not found');
  const existingTracks = snap.data().tracks || [];
  const trackObj = {
    id: String(track.id || track.song_id),
    title: track.title || track.song_title || 'Unknown Title',
    artist_name: track.artist_name || track.subtitle || 'Artist',
    image_url: track.image_url || '',
    audio_url: track.audio_url || '',
    duration: track.duration || 180,
  };
  if (!existingTracks.some((t) => String(t.id) === trackObj.id)) {
    const newTracks = [...existingTracks, trackObj];
    await updateDoc(docRef, { tracks: newTracks, track_count: newTracks.length });
  }
  return true;
};

export const removeTrackFromPlaylist = async (playlistId, trackId) => {
  const uid = getUserId();
  if (!uid) throw new Error('User not authenticated');
  const docRef = doc(db, 'users', uid, 'playlists', playlistId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return false;
  const existingTracks = snap.data().tracks || [];
  const newTracks = existingTracks.filter((t) => String(t.id) !== String(trackId));
  await updateDoc(docRef, { tracks: newTracks, track_count: newTracks.length });
  return true;
};

// =======================
// HISTORY
// =======================
export const getHistory = async (limitCount = 30) => {
  const uid = getUserId();
  if (!uid) return [];
  try {
    const histRef = collection(db, 'users', uid, 'history');
    const q = query(histRef, limit(limitCount));
    const snap = await getDocs(q);
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    docs.sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0));
    return docs;
  } catch (err) {
    console.error('Error fetching history:', err);
    return [];
  }
};

export const addHistory = async (track) => {
  const uid = getUserId();
  if (!uid || !track || !track.id) return;
  try {
    const trackId = String(track.id);
    const docRef = doc(db, 'users', uid, 'history', trackId);
    await setDoc(docRef, {
      song_id: trackId,
      id: trackId,
      title: track.title || track.song_title || 'Unknown Title',
      song_title: track.title || track.song_title || 'Unknown Title',
      artist_name: track.artist_name || track.subtitle || 'Artist',
      image_url: track.image_url || '',
      audio_url: track.audio_url || '',
      duration: track.duration || 180,
      playedAt: Date.now(),
    });
  } catch (err) {
    console.error('Error recording history:', err);
  }
};

// =======================
// SETTINGS
// =======================
export const getUserSettings = async () => {
  const uid = getUserId();
  if (!uid) return {
    theme: 'dark',
    auto_play: true,
    high_quality: true,
    crossfade: 0,
  };
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().settings) {
      return {
        theme: 'dark',
        auto_play: true,
        high_quality: true,
        crossfade: 0,
        ...snap.data().settings,
      };
    }
  } catch (err) {
    console.error('Error fetching settings:', err);
  }
  return {
    theme: 'dark',
    auto_play: true,
    high_quality: true,
    crossfade: 0,
  };
};

export const updateUserSettings = async (newSettings) => {
  const uid = getUserId();
  if (!uid) return;
  try {
    const docRef = doc(db, 'users', uid);
    await setDoc(docRef, { settings: newSettings }, { merge: true });
  } catch (err) {
    console.error('Error saving settings:', err);
  }
};
