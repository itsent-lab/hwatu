import type { GameState } from '../engine/types';
import type { UserProfile } from './types';

const DB_NAME = 'nsrnb-hwatu-local';
const DB_VERSION = 1;
const PROFILE_STORE = 'profiles';
const GAME_STORE = 'games';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(PROFILE_STORE)) database.createObjectStore(PROFILE_STORE, { keyPath: 'key' });
      if (!database.objectStoreNames.contains(GAME_STORE)) database.createObjectStore(GAME_STORE, { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact<T>(storeName: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    const request = operation(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function saveProfile(profile: UserProfile) {
  await transact(PROFILE_STORE, 'readwrite', store => store.put({ key: 'active-profile', profile, updatedAt: new Date().toISOString() }));
}

export async function loadProfile(): Promise<UserProfile | null> {
  const record = await transact<{ profile: UserProfile }>(PROFILE_STORE, 'readonly', store => store.get('active-profile'));
  return record?.profile ?? null;
}

export async function clearProfile() {
  await transact(PROFILE_STORE, 'readwrite', store => store.delete('active-profile'));
}

export interface LocalGameRecord {
  key: string;
  userId: number;
  state: GameState;
  pendingSync: boolean;
  updatedAt: string;
}

export async function saveLocalGame(userId: number, state: GameState, pendingSync = true) {
  const record: LocalGameRecord = {
    key: `${userId}:matgo-main`, userId, state, pendingSync, updatedAt: new Date().toISOString()
  };
  await transact(GAME_STORE, 'readwrite', store => store.put(record));
  return record;
}

export async function loadLocalGame(userId: number): Promise<LocalGameRecord | null> {
  return transact<LocalGameRecord>(GAME_STORE, 'readonly', store => store.get(`${userId}:matgo-main`));
}
