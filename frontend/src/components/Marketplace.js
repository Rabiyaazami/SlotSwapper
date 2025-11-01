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
        <h3>Your Swappable Slots</h3>
        <p className="small" style={{marginBottom: '16px'}}>Choose one of your slots to offer in exchange</p>
        {mySwappables.length === 0 && (
          <div className="small" style={{padding: '16px', background: '#f0f0f0', borderRadius: '8px', color: '#666'}}>
            No swappable slots. Make one swappable from Dashboard.
          </div>
        )}
        {mySwappables.map(m => (
          <div key={m.id} style={{marginTop: '12px', padding: '12px', background: selectedOffer === m.id ? '#e5f3ff' : '#f9f9f9', borderRadius: '8px', border: selectedOffer === m.id ? '2px solid #667eea' : '2px solid transparent', transition: 'all 0.2s'}}>
            <label style={{cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px'}}>
              <input 
                type="radio" 
                name="offer" 
                value={m.id} 
                checked={selectedOffer === m.id}
                onChange={()=>setSelectedOffer(m.id)}
                style={{width: '20px', height: '20px', cursor: 'pointer'}}
              />
              <div>
                <strong>{m.title}</strong>
                <div className="small">{new Date(m.start_time*1000).toLocaleString()}</div>
              </div>
            </label>
          </div>
        ))}
      </div>

      <div style={{marginTop: '24px'}}>
        <h3 style={{marginBottom: '16px'}}>Available Slots from Other Users</h3>
        {slots.length === 0 && (
          <div className="card">
            <div className="small" style={{textAlign: 'center', color: '#666'}}>No swappable slots available from other users.</div>
          </div>
        )}
        {slots.map(s => (
          <div className="card" key={s.id} style={{border: selectedTarget === s.id ? '3px solid #667eea' : 'none'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
              <strong style={{fontSize: '18px'}}>{s.title}</strong>
              {selectedTarget === s.id && (
                <span className="status-badge status-swappable">Selected</span>
              )}
            </div>
            <div className="small" style={{marginBottom: '8px'}}>
              <strong>Time:</strong> {new Date(s.start_time*1000).toLocaleString()} - {new Date(s.end_time*1000).toLocaleString()}
            </div>
            <div className="small" style={{marginBottom: '16px'}}>
              <strong>Owner:</strong> {s.owner_name || s.owner_id}
            </div>
            <div>
              <button 
                className={`btn ${selectedTarget === s.id ? 'btn-primary' : 'btn-secondary'}`}
                onClick={()=>setSelectedTarget(s.id)}
              >
                {selectedTarget === s.id ? '✓ Selected' : 'Choose target'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginTop: '24px', textAlign: 'center'}}>
        <button 
          className="btn btn-primary" 
          onClick={requestSwap}
          disabled={!selectedOffer || !selectedTarget}
          style={{opacity: (!selectedOffer || !selectedTarget) ? 0.5 : 1, cursor: (!selectedOffer || !selectedTarget) ? 'not-allowed' : 'pointer'}}
        >
          Request Swap
        </button>
        {msg && (
          <div className={msg.includes('Error') || msg.includes('Choose') ? 'error-message' : 'success-message'} style={{marginTop: '16px'}}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
