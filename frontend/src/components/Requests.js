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

  return (
    <div>
      <h2>Requests</h2>
      <div className="card">
        <h3>Incoming</h3>
        {incoming.length === 0 && <div className="small">No incoming requests</div>}
        {incoming.map(r => (
          <div key={r.id} className="card">
            <div><strong>From: {r.requester_name}</strong></div>
            <div className="small" style={{marginTop:4}}>
              <strong>They offer:</strong> {r.my_slot_title} ({r.my_slot_start ? new Date(r.my_slot_start*1000).toLocaleString() : 'N/A'})
            </div>
            <div className="small">
              <strong>For your:</strong> {r.their_slot_title} ({r.their_slot_start ? new Date(r.their_slot_start*1000).toLocaleString() : 'N/A'})
            </div>
            <div className="small" style={{marginTop:4}}>Status: <strong>{r.status}</strong></div>
            <div style={{marginTop:8}}>
              {r.status === 'PENDING' && <>
                <button className="btn" onClick={()=>respond(r.id, true)}>Accept</button>
                <button className="btn" onClick={()=>respond(r.id, false)}>Reject</button>
              </>}
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Outgoing</h3>
        {outgoing.length === 0 && <div className="small">No outgoing requests</div>}
        {outgoing.map(r => (
          <div key={r.id} className="card">
            <div><strong>To: {r.requestee_name}</strong></div>
            <div className="small" style={{marginTop:4}}>
              <strong>You offer:</strong> {r.my_slot_title} ({r.my_slot_start ? new Date(r.my_slot_start*1000).toLocaleString() : 'N/A'})
            </div>
            <div className="small">
              <strong>For their:</strong> {r.their_slot_title} ({r.their_slot_start ? new Date(r.their_slot_start*1000).toLocaleString() : 'N/A'})
            </div>
            <div className="small" style={{marginTop:4}}>Status: <strong>{r.status}</strong></div>
          </div>
        ))}
      </div>

      {msg && <div className="small" style={{color:'green'}}>{msg}</div>}
    </div>
  );
}
