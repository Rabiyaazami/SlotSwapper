import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Marketplace() {
  const [slots,setSlots]=useState([]);
  const [mySwappables,setMySwappables]=useState([]);
  const [selectedOffer,setSelectedOffer]=useState('');
  const [selectedTarget,setSelectedTarget]=useState('');
  const [msg,setMsg]=useState(null);

  async function load() {
    const s = await api('/api/swappable-slots');
    setSlots(s);
    const mine = await api('/api/events');
    setMySwappables(mine.filter(m => m.status === 'SWAPPABLE'));
  }

  useEffect(()=>{ load(); }, []);

  async function requestSwap() {
    if (!selectedOffer || !selectedTarget) { setMsg('Choose offer and target'); return; }
    try {
      await api('/api/swap-request', { method: 'POST', body: JSON.stringify({ mySlotId: selectedOffer, theirSlotId: selectedTarget })});
      setMsg('Request sent');
      load();
    } catch (e) {
      setMsg(e.error || 'Error');
    }
  }

  return (
    <div>
      <h2>Marketplace (Swappable Slots)</h2>
      <div className="card">
        <strong>Your swappable slots (choose one as offer)</strong>
        {mySwappables.length === 0 && <div className="small">No swappable slots. Make one swappable from Dashboard.</div>}
        {mySwappables.map(m => (
          <div key={m.id} style={{marginTop:8}}>
            <input type="radio" name="offer" value={m.id} onChange={()=>setSelectedOffer(m.id)} /> {m.title} ({new Date(m.start_time*1000).toLocaleString()})
          </div>
        ))}
      </div>

      <div style={{marginTop:12}}>
        {slots.map(s => (
          <div className="card" key={s.id}>
            <div><strong>{s.title}</strong></div>
            <div className="small">{new Date(s.start_time*1000).toLocaleString()} - {new Date(s.end_time*1000).toLocaleString()}</div>
            <div className="small">Owner: {s.owner_name || s.owner_id}</div>
            <div style={{marginTop:8}}>
              <button className="btn" onClick={()=>setSelectedTarget(s.id)}>Choose target</button>
              {selectedTarget === s.id && <span style={{marginLeft:8}}>Selected</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{marginTop:12}}>
        <button className="btn" onClick={requestSwap}>Request Swap</button>
        {msg && <div className="small" style={{marginTop:8}}>{msg}</div>}
      </div>
    </div>
  );
}
