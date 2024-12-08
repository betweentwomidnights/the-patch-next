import { openDB } from 'idb';

const dbPromise = openDB('audioDB', 2, {
    upgrade(db, oldVersion) {
        if (oldVersion < 2) {
            const store = db.createObjectStore('audioData', { keyPath: 'taskId' });
            store.createIndex('timestamp', 'timestamp');
            store.createIndex('cropped', 'cropped');
            store.createIndex('uncropped', 'uncropped'); // Added index for uncropped data
        }
    },
});

export const getDB = () => dbPromise;