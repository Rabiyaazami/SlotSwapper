import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Requests() {
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [msg, setMsg] = useState(null);

  async function load() {
    const data = await api('/api/swap-requests');
    setIncoming(data.incoming);
    setOutgoing(data.outgoing);
  }

  useEffect(()=>{ load(); }, []);

  async function respond(id, accept) {
    try {
      await api(`/api/swap-response/${id}`, { method: 'POST', body: JSON.stringify({ accept })});
      setMsg(accept ? 'Accepted' : 'Rejected');
      load();
    } catch (e) {
      setMsg(e.error || 'Error');
    }
  }

  function getStatusClass(status) {
    const statusMap = {
      'PENDING': 'status-pending',
      'ACCEPTED': 'status-accepted',
      'REJECTED': 'status-rejected'
    };
    return statusMap[status] || 'status-pending';
  }

  return (
    <div>
      <h2>Swap Requests</h2>
      
      <div className="card">
        <h3>Incoming Requests</h3>
        {incoming.length === 0 && (
          <div className="small" style={{padding: '16px', background: '#f0f0f0', borderRadius: '8px', color: '#666', textAlign: 'center'}}>
            No incoming requests
          </div>
        )}
        {incoming.map(r => (
          <div key={r.id} className="card" style={{marginTop: '12px', background: r.status === 'PENDING' ? '#fff9e5' : '#f9f9f9'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px'}}>
              <div>
                <strong style={{fontSize: '18px'}}>From: {r.requester_name}</strong>
              </div>
              <span className={`status-badge ${getStatusClass(r.status)}`}>{r.status}</span>
            </div>
            <div style={{background: 'white', padding: '12px', borderRadius: '8px', marginBottom: '12px'}}>
              <div className="small" style={{marginBottom: '8px'}}>
                <strong style={{color: '#667eea'}}>They offer:</strong><br/>
                {r.my_slot_title} - {r.my_slot_start ? new Date(r.my_slot_start*1000).toLocaleString() : 'N/A'}
              </div>
              <div className="small">
                <strong style={{color: '#764ba2'}}>For your:</strong><br/>
                {r.their_slot_title} - {r.their_slot_start ? new Date(r.their_slot_start*1000).toLocaleString() : 'N/A'}
              </div>
            </div>
            {r.status === 'PENDING' && (
              <div style={{display: 'flex', gap: '12px', marginTop: '12px'}}>
                <button className="btn btn-success" onClick={()=>respond(r.id, true)}>✓ Accept</button>
                <button className="btn btn-danger" onClick={()=>respond(r.id, false)}>✗ Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="card" style={{marginTop: '24px'}}>
        <h3>Outgoing Requests</h3>
        {outgoing.length === 0 && (
          <div className="small" style={{padding: '16px', background: '#f0f0f0', borderRadius: '8px', color: '#666', textAlign: 'center'}}>
            No outgoing requests
          </div>
        )}
        {outgoing.map(r => (
          <div key={r.id} className="card" style={{marginTop: '12px'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px'}}>
              <div>
                <strong style={{fontSize: '18px'}}>To: {r.requestee_name}</strong>
              </div>
              <span className={`status-badge ${getStatusClass(r.status)}`}>{r.status}</span>
            </div>
            <div style={{background: '#f9f9f9', padding: '12px', borderRadius: '8px'}}>
              <div className="small" style={{marginBottom: '8px'}}>
                <strong style={{color: '#667eea'}}>You offer:</strong><br/>
                {r.my_slot_title} - {r.my_slot_start ? new Date(r.my_slot_start*1000).toLocaleString() : 'N/A'}
              </div>
              <div className="small">
                <strong style={{color: '#764ba2'}}>For their:</strong><br/>
                {r.their_slot_title} - {r.their_slot_start ? new Date(r.their_slot_start*1000).toLocaleString() : 'N/A'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {msg && (
        <div className={msg.includes('Error') || msg.includes('Rejected') ? 'error-message' : 'success-message'} style={{marginTop: '16px'}}>
          {msg}
        </div>
      )}
    </div>
  );
}
