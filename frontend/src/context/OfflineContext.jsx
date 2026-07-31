import React, { createContext, useContext, useState, useEffect } from 'react';
import { getOfflineQueue, clearOfflineQueue } from '../services/offlineSync';
import { toggleFavorite, createPlaylist } from '../services/firestoreService';

const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage('You are offline. Offline mode active.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineData = async () => {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    setSyncMessage(`Syncing ${queue.length} offline changes...`);

    try {
      for (const item of queue) {
        const { actionType, payload } = item;
        if (actionType === 'ADD_FAVORITE' || actionType === 'REMOVE_FAVORITE') {
          await toggleFavorite({
            id: payload.item_id,
            title: payload.title,
            artist_name: payload.subtitle || payload.artist_name,
            image_url: payload.image_url,
            audio_url: payload.audio_url,
          }).catch(() => {});
        } else if (actionType === 'CREATE_PLAYLIST') {
          await createPlaylist(payload.title, payload.description || '', payload.is_public).catch(() => {});
        }
      }
      await clearOfflineQueue();
      setSyncMessage('Offline data successfully synchronized!');
      setTimeout(() => setSyncMessage(''), 4000);
    } catch (err) {
      console.error('Failed to sync offline queue:', err);
      setSyncMessage('Sync partially failed. Will retry later.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        syncing,
        syncMessage,
        syncOfflineData,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};

export const useOffline = () => useContext(OfflineContext);
