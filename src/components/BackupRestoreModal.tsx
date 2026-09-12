import React, { useState, useEffect, useCallback } from 'react';
import { DownloadCloud, UploadCloud, X, Clock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { getLocalStorageBackup, downloadBackupFile, parseBackupFile, restoreLocalStorageBackup, getBackupTimestamp, saveBackupTimestamp } from '../utils/localStorageBackup';

interface BackupRestoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete?: () => void;
}

export const BackupRestoreModal: React.FC<BackupRestoreModalProps> = ({ isOpen, onClose, onRestoreComplete }) => {
  const [backupPreview, setBackupPreview] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [loadedBackup, setLoadedBackup] = useState<any>(null);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<string>(new Date().toLocaleString('ta-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setCurrentTime(new Date().toLocaleString('ta-IN', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));

    const timestamp = getBackupTimestamp();
    setLastBackupAt(timestamp);
  }, [isOpen]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date().toLocaleString('ta-IN', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    try {
      const backup = getLocalStorageBackup();
      downloadBackupFile(backup);
      saveBackupTimestamp();
      setLastBackupAt(new Date().toISOString());
      setRestoreError(null);
    } catch (err) {
      setRestoreError('Backup export failed. உங்கள் தரவு தயவுசெய்து மீண்டும் முயற்சிக்கவும்.');
      console.warn(err);
    }
  };

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setBackupPreview(null);
    setLoadedBackup(null);

    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseBackupFile(text);
      setLoadedBackup(parsed);
      setBackupPreview(JSON.stringify(parsed, null, 2));
    } catch (err: any) {
      setRestoreError(err?.message || 'Invalid backup file');
    }
  }, []);

  const handleRestore = () => {
    if (!loadedBackup) {
      setRestoreError('உங்கள் தரவை மீட்டெடுக்க செல்ல முதலில் கோப்பை தேர்ந்தெடுக்கவும்.');
      return;
    }
    try {
      restoreLocalStorageBackup(loadedBackup);
      saveBackupTimestamp();
      setRestoreError(null);
      setBackupPreview(null);
      setLoadedBackup(null);
      onClose();
      if (onRestoreComplete) {
        onRestoreComplete();
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      setRestoreError(err?.message || 'Restore failed');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-neutral-200 w-full max-w-3xl overflow-hidden">
        <div className="flex items-center justify-between bg-[#4a0000] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <DownloadCloud className="w-5 h-5" />
            <div>
              <h2 className="text-lg font-bold">Local Data Backup & Restore</h2>
              <p className="text-xs text-[#f9d77e]">உங்கள் LocalStorage தரவை ஏற்றவும், பதிவிறக்கவும் மற்றும் மீட்டெடுக்கவும்.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/10 hover:bg-white/20">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-neutral-200 p-4 bg-neutral-50">
              <p className="text-xs uppercase text-neutral-500 font-bold tracking-[0.18em]">Local Time</p>
              <p className="mt-3 text-sm font-semibold text-neutral-900">{currentTime}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4 bg-neutral-50">
              <p className="text-xs uppercase text-neutral-500 font-bold tracking-[0.18em]">Last Backup</p>
              <p className="mt-3 text-sm font-semibold text-neutral-900">
                {lastBackupAt ? new Date(lastBackupAt).toLocaleString('ta-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'No backup yet'}
              </p>
            </div>
            <div className="rounded-2xl border border-neutral-200 p-4 bg-neutral-50">
              <p className="text-xs uppercase text-neutral-500 font-bold tracking-[0.18em]">அறிவு</p>
              <p className="mt-3 text-sm text-neutral-800 leading-relaxed">
                Export a JSON snapshot of your saved app state. Import the same file later to restore your profile, petition draft, offline queue and subscriptions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-neutral-200 p-5 space-y-4 bg-white">
              <div className="flex items-center gap-3">
                <DownloadCloud className="w-5 h-5 text-[#4a0000]" />
                <h3 className="text-sm font-bold text-[#4a0000]">Export Backup</h3>
              </div>
              <p className="text-sm text-neutral-600">Download the current persisted LocalStorage state.</p>
              <button
                onClick={handleExport}
                className="inline-flex items-center gap-2 rounded-full bg-[#4a0000] px-4 py-2 text-sm font-bold text-white hover:bg-[#380000] transition-all"
              >
                <DownloadCloud className="w-4 h-4" />
                Export JSON
              </button>
            </div>

            <div className="rounded-2xl border border-neutral-200 p-5 space-y-4 bg-white">
              <div className="flex items-center gap-3">
                <UploadCloud className="w-5 h-5 text-[#4a0000]" />
                <h3 className="text-sm font-bold text-[#4a0000]">Restore Backup</h3>
              </div>
              <p className="text-sm text-neutral-600">Choose a previously exported JSON backup file to restore persisted values.</p>
              <input
                type="file"
                accept="application/json"
                onChange={handleFileChange}
                className="w-full text-sm text-neutral-700 file:mr-3 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#f4f4f5] file:text-[#4a0000] hover:file:bg-[#e2e8f0]"
              />
              {loadedBackup && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  Loaded <strong>{Object.keys(loadedBackup.keys || {}).length}</strong> keys from backup.
                </div>
              )}
              <button
                onClick={handleRestore}
                className="inline-flex items-center gap-2 rounded-full bg-[#ffcc00] px-4 py-2 text-sm font-bold text-[#4a0000] hover:bg-[#ffd84d] transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                Restore & Reload
              </button>
            </div>
          </div>

          {restoreError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 mt-1" />
              <div>{restoreError}</div>
            </div>
          )}

          {backupPreview && (
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs font-mono overflow-x-auto max-h-64">
              <div className="mb-3 text-sm font-semibold text-neutral-800">Backup preview</div>
              <pre className="whitespace-pre-wrap">{backupPreview}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BackupRestoreModal;
