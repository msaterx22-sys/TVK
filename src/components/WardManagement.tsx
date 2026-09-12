import React, { useState } from 'react';
import { WardInfo } from '../types';
import { apiFetch } from '../apiClient';

interface WardManagementProps {
  wards: WardInfo[];
  token: string | null;
  onChange: (wards: WardInfo[]) => void;
}

type WardForm = {
  wardNo: string;
  name: string;
  keyStreets: string;
  inchargeName: string;
  inchargePhone: string;
};

const emptyForm: WardForm = {
  wardNo: '',
  name: '',
  keyStreets: '',
  inchargeName: '',
  inchargePhone: '',
};

export const WardManagement: React.FC<WardManagementProps> = ({ wards, token, onChange }) => {
  const [form, setForm] = useState<WardForm>(emptyForm);
  const [editingWardNo, setEditingWardNo] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const headers = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };

  const startEdit = (ward: WardInfo) => {
    setEditingWardNo(ward.wardNo);
    setForm({
      wardNo: String(ward.wardNo),
      name: ward.name,
      keyStreets: ward.keyStreets.join(', '),
      inchargeName: ward.inchargeName,
      inchargePhone: ward.inchargePhone,
    });
    setError(null);
  };

  const reset = () => {
    setEditingWardNo(null);
    setForm(emptyForm);
    setError(null);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        wardNo: Number(form.wardNo),
        name: form.name,
        keyStreets: form.keyStreets.split(',').map(street => street.trim()).filter(Boolean),
        inchargeName: form.inchargeName,
        inchargePhone: form.inchargePhone,
      };
      const path = editingWardNo === null ? '/api/admin/wards' : `/api/admin/wards/${editingWardNo}`;
      const response = await apiFetch(path, {
        method: editingWardNo === null ? 'POST' : 'PUT',
        headers,
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to save ward');

      const next = editingWardNo === null
        ? [...wards, body as WardInfo]
        : wards.map(ward => ward.wardNo === editingWardNo ? body as WardInfo : ward);
      onChange(next.sort((a, b) => a.wardNo - b.wardNo));
      reset();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save ward');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (ward: WardInfo) => {
    if (!window.confirm(`வார்டு ${ward.wardNo} நீக்கவா?`)) return;
    setError(null);
    try {
      const response = await apiFetch(`/api/admin/wards/${ward.wardNo}`, { method: 'DELETE', headers });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to delete ward');
      onChange(wards.filter(item => item.wardNo !== ward.wardNo));
      if (editingWardNo === ward.wardNo) reset();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete ward');
    }
  };

  return (
    <section className="mt-8 border-t pt-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-xl font-bold text-[#4a0000]">வார்டுகள் நிர்வாகம்</h3>
        <button type="button" onClick={reset} className="px-3 py-2 rounded bg-[#ffcc00] text-[#4a0000] font-bold">
          + புதிய வார்டு
        </button>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4 bg-neutral-50 border rounded-lg">
        <input required type="number" min="1" value={form.wardNo} onChange={e => setForm({ ...form, wardNo: e.target.value })} placeholder="வார்டு எண்" className="p-2 border rounded" />
        <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="வார்டு பெயர்" className="p-2 border rounded" />
        <input required value={form.keyStreets} onChange={e => setForm({ ...form, keyStreets: e.target.value })} placeholder="முக்கிய வீதிகள் (கமாவால் பிரிக்கவும்)" className="p-2 border rounded md:col-span-2" />
        <input required value={form.inchargeName} onChange={e => setForm({ ...form, inchargeName: e.target.value })} placeholder="பொறுப்பாளர் பெயர்" className="p-2 border rounded" />
        <input required value={form.inchargePhone} onChange={e => setForm({ ...form, inchargePhone: e.target.value })} placeholder="பொறுப்பாளர் தொலைபேசி" className="p-2 border rounded" />
        <div className="flex gap-2 md:col-span-2">
          <button disabled={saving} type="submit" className="px-4 py-2 rounded bg-[#4a0000] text-white font-bold">
            {saving ? 'சேமிக்கிறது...' : editingWardNo === null ? 'சேர்' : 'புதுப்பி'}
          </button>
          {editingWardNo !== null && <button type="button" onClick={reset} className="px-4 py-2 rounded border">ரத்து</button>}
        </div>
        {error && <div className="text-sm text-red-600 md:col-span-2">{error}</div>}
      </form>

      <div className="mt-4 space-y-2">
        {wards.map(ward => (
          <div key={ward.wardNo} className="flex flex-wrap items-center justify-between gap-3 p-3 border rounded-lg">
            <div>
              <div className="font-bold">வார்டு {ward.wardNo} — {ward.name}</div>
              <div className="text-sm text-neutral-600">{ward.inchargeName} · {ward.inchargePhone}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => startEdit(ward)} className="px-3 py-1 rounded border border-[#4a0000] text-[#4a0000]">திருத்து</button>
              <button type="button" onClick={() => remove(ward)} className="px-3 py-1 rounded bg-red-600 text-white">நீக்கு</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
