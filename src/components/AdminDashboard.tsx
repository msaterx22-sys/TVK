import React, { useEffect, useState } from 'react';
import { Petition, WardInfo } from '../types';
import { apiFetch } from '../apiClient';
import { WardManagement } from './WardManagement';

const statuses = ['pending', 'in_progress', 'action_taken', 'resolved', 'rejected'];

export const AdminDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [wards, setWards] = useState<WardInfo[]>([]);
  const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
  const token = (() => {
    try { return localStorage.getItem('tvk_admin_token'); } catch { return null; }
  })();

  const fetchList = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/petitions', { headers: { Authorization: token ? `Bearer ${token}` : '' } });
      if (res.ok) {
        const data = await res.json();
        setPetitions(data);
      }
      const wardsRes = await apiFetch('/api/wards');
      if (wardsRes.ok) setWards(await wardsRes.json());
    } catch (err) {
      console.error('Admin fetch error', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchList(); }, []);

  const updateStatus = async (id: string, status: string, note?: string) => {
    try {
      const res = await apiFetch(`/api/admin/petitions/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ status, note })
      });
      if (res.ok) {
        const updated = await res.json();
        setPetitions(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
    } catch (err) { console.error(err); }
  };

  const sendMessage = async (id: string, message?: string) => {
    try {
      const res = await apiFetch(`/api/admin/petitions/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ message })
      });
      if (res.ok) {
        alert('Message sent (simulated)');
      }
    } catch (err) { console.error(err); }
  };

    const filtered = petitions.filter(p => {
      if (!searchTerm) return true;
      const s = searchTerm.toLowerCase();
      return (
        p.title.toLowerCase().includes(s) ||
        (p.citizenName || '').toLowerCase().includes(s) ||
        p.trackingNo.toLowerCase().includes(s)
      );
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const paged = filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);

    const exportCsv = () => {
      const rows = filtered.map(p => ({
        id: p.id,
        trackingNo: p.trackingNo,
        title: p.title,
        citizenName: p.citizenName,
        wardNo: p.wardNo,
        status: p.status
      }));
      const header = Object.keys(rows[0] || {}).join(',');
      const csv = [header, ...rows.map(r => Object.values(r).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `petitions_export_${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-6 bg-black/50">
      <div className="bg-white w-full max-w-4xl rounded shadow-lg p-4 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Admin Dashboard - All Petitions</h2>
          <div className="flex gap-2">
            <button onClick={fetchList} className="px-3 py-1 rounded border">Refresh</button>
            <button onClick={onClose} className="px-3 py-1 rounded bg-[#4a0000] text-white">Close</button>
          </div>
        </div>

        {loading ? (
          <div className="py-6">Loading...</div>
        ) : (
          <>
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <input value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(1); }} placeholder="Search title, name or tracking#" className="p-2 border rounded w-64" />
                  <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="p-2 border rounded">
                    {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s} / page</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={exportCsv} className="px-3 py-1 rounded border">Export CSV</button>
                  <button onClick={fetchList} className="px-3 py-1 rounded border">Refresh</button>
                  <button onClick={onClose} className="px-3 py-1 rounded bg-[#4a0000] text-white">Close</button>
                </div>
              </div>

              <div className="space-y-3">
                {paged.length === 0 ? (
                  <div className="p-4 border rounded text-neutral-600">No petitions match the current filter.</div>
                ) : (
                  paged.map(p => (
                    <div key={p.id} className="p-3 border rounded">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold">{p.title} <span className="text-xs text-neutral-500">({p.trackingNo})</span></div>
                          <div className="text-sm text-neutral-600">By: {p.citizenName} — Ward {p.wardNo}</div>
                          <div className="mt-2 text-sm">{p.description}</div>
                        </div>
                        <div className="w-48 flex-shrink-0">
                          <label className="text-xs font-medium">Status</label>
                          <select defaultValue={p.status} onChange={(e) => updateStatus(p.id, e.target.value)} className="w-full mt-1 p-2 border rounded">
                            {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => sendMessage(p.id, `Status updated to ${p.status}`)} className="px-3 py-1 rounded border">Send</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-neutral-600">Showing {filtered.length} results — page {page} of {totalPages}</div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPage(1)} disabled={page === 1} className="px-2 py-1 border rounded">First</button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border rounded">Prev</button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 border rounded">Next</button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-2 py-1 border rounded">Last</button>
                </div>
              </div>
            </div>

            <WardManagement wards={wards} token={token} onChange={setWards} />
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
