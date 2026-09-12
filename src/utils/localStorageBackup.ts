export const BACKUP_TIMESTAMP_KEY = 'tvk_backup_last_at';

export const BACKUP_KEYS = [
  'tvk_user_profile',
  'tvk_user_token',
  'tvk_admin_token',
  'tvk_subscribed_wards',
  'tvk_civic_events',
  'tvk_my_petition_ids',
  'tvk_user_phone',
  'tvk_ai_petition_draft',
  'tvk_offline_petitions_queue'
] as const;

export type LocalStorageBackup = {
  version: 1;
  createdAt: string;
  keys: Record<string, unknown>;
};

const safeParse = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const getLocalStorageBackup = (): LocalStorageBackup => {
  const keys: Record<string, unknown> = {};

  BACKUP_KEYS.forEach((storageKey) => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw !== null) {
        keys[storageKey] = safeParse(raw);
      }
    } catch (err) {
      console.warn(`Error reading ${storageKey} for backup:`, err);
    }
  });

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    keys
  };
};

export const saveBackupTimestamp = () => {
  try {
    window.localStorage.setItem(BACKUP_TIMESTAMP_KEY, new Date().toISOString());
  } catch (err) {
    console.warn('Error saving backup timestamp:', err);
  }
};

export const getBackupTimestamp = (): string | null => {
  try {
    return window.localStorage.getItem(BACKUP_TIMESTAMP_KEY);
  } catch {
    return null;
  }
};

export const restoreLocalStorageBackup = (backup: LocalStorageBackup): void => {
  if (!backup || typeof backup !== 'object' || backup.version !== 1 || typeof backup.keys !== 'object') {
    throw new Error('Invalid backup file format');
  }

  Object.entries(backup.keys).forEach(([storageKey, value]) => {
    if (!BACKUP_KEYS.includes(storageKey as typeof BACKUP_KEYS[number])) {
      return;
    }

    try {
      if (typeof value === 'string') {
        window.localStorage.setItem(storageKey, value);
      } else {
        window.localStorage.setItem(storageKey, JSON.stringify(value));
      }
    } catch (err) {
      console.warn(`Error restoring ${storageKey}:`, err);
    }
  });
};

export const downloadBackupFile = (backup: LocalStorageBackup) => {
  const fileName = `tvk-local-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const parseBackupFile = (text: string): LocalStorageBackup => {
  const parsed = JSON.parse(text);
  if (!parsed || parsed.version !== 1 || typeof parsed.keys !== 'object') {
    throw new Error('Invalid backup file format');
  }
  return parsed as LocalStorageBackup;
};
