import React, { useState } from 'react';
import { apiFetch } from '../apiClient';

export const AdminLogin: React.FC<{ onClose: () => void; onLogin: (token: string) => void }> = ({ onClose, onLogin }) => {
  const [username, setUsername] = useState('TVK');
  const [password, setPassword] = useState('TVKACK');
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || 'Login failed');
        return;
      }
      const data = await res.json();
      onLogin(data.token);
      onClose();
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Admin Login</h3>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-sm font-medium">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full mt-1 p-2 border rounded" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full mt-1 p-2 border rounded" />
          </div>
          {error && <div className="text-sm text-red-600">{error}</div>}
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-[#4a0000] text-white">Login</button>
          </div>
          <div className="text-xs text-neutral-500 mt-2">
            Use default admin credentials: <strong>TVK</strong> / <strong>TVKACK</strong>
          </div>

        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
