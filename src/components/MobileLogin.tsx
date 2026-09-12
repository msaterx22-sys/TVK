import React, { useState } from 'react';
import { apiFetch } from '../apiClient';

export const MobileLogin: React.FC<{
  onClose: () => void;
  onLogin: (token: string, profile?: { phone?: string; name?: string }) => void;
}> = ({ onClose, onLogin }) => {
  const [mode, setMode] = useState<'otp' | 'credentials'>('otp');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const resetState = () => {
    setPhone('');
    setOtp('');
    setStep('send');
    setUsername('');
    setPassword('');
    setError(null);
    setInfo(null);
  };

  const sendOtp = async () => {
    setError(null);
    setInfo(null);
    try {
      const res = await apiFetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || 'Failed to send OTP');
        return;
      }
      const body = await res.json();
      setStep('verify');
      setInfo(body.otp ? `OTP sent: ${body.otp}` : 'OTP sent to your phone');
    } catch (err) {
      setError('Network error');
    }
  };

  const verify = async () => {
    setError(null);
    try {
      const res = await apiFetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || 'Verify failed');
        return;
      }
      const data = await res.json();
      onLogin(data.token, { phone });
      onClose();
      resetState();
    } catch (err) {
      setError('Network error');
    }
  };

  const submitCredentials = async () => {
    setError(null);
    try {
      const res = await apiFetch('/api/login', {
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
      onLogin(data.token, { name: username || 'பயனர்' });
      onClose();
      resetState();
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white dark:bg-[#1f1f1f] p-6 rounded-lg w-full max-w-md">
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              setMode('otp');
              setError(null);
              setInfo(null);
              setStep('send');
            }}
            className={`px-3 py-2 rounded ${mode === 'otp' ? 'bg-[#4a0000] text-white' : 'bg-neutral-100 text-neutral-700'}`}
          >
            OTP Login
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('credentials');
              setError(null);
              setInfo(null);
            }}
            className={`px-3 py-2 rounded ${mode === 'credentials' ? 'bg-[#4a0000] text-white' : 'bg-neutral-100 text-neutral-700'}`}
          >
            Account Login
          </button>
        </div>

        <h3 className="text-lg font-bold mb-3">
          {mode === 'otp' ? 'Mobile login via OTP' : 'Create account / login'}
        </h3>

        {mode === 'otp' ? (
          <div className="space-y-3">
            <label className="text-sm font-semibold">Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} className="w-full mt-1 p-2 border rounded" placeholder="98401 23456" />
            {info && <div className="text-sm text-emerald-700">{info}</div>}
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-between gap-2 mt-4">
              <button onClick={() => { onClose(); resetState(); }} className="px-4 py-2 rounded border">Cancel</button>
              {step === 'send' ? (
                <button onClick={sendOtp} className="px-4 py-2 rounded bg-[#4a0000] text-white">Send OTP</button>
              ) : (
                <>
                  <button onClick={() => { setStep('send'); setOtp(''); setError(null); setInfo(null); }} className="px-4 py-2 rounded border">Back</button>
                  <button onClick={verify} className="px-4 py-2 rounded bg-[#4a0000] text-white">Verify</button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-sm font-semibold">Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} className="w-full mt-1 p-2 border rounded" placeholder="Enter username" />

            <label className="text-sm font-semibold">Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)} type="password" className="w-full mt-1 p-2 border rounded" placeholder="Enter password" />

            <p className="text-xs text-neutral-500">Use any username/password to create or login to your citizen account.</p>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => { onClose(); resetState(); }} className="px-4 py-2 rounded border">Cancel</button>
              <button onClick={submitCredentials} className="px-4 py-2 rounded bg-[#4a0000] text-white">Submit</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileLogin;
