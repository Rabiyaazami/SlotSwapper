import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function Dashboard() {
  const [events,setEvents]=useState([]);
  const [title,setTitle]=useState('');
  const [start,setStart]=useState('');
  const [end,setEnd]=useState('');
  const [err,setErr]=useState(null);

  async function load() {
    try {
      const data = await api('/api/events');
      setEvents(data);
    } catch (e) {
      setErr(e.error || JSON.stringify(e));
    }
  }

  useEffect(()=>{ load(); }, []);

  async function add(e) {
    e.preventDefault();
    // convert ISO to unix
    const s = Math.floor(new Date(start).getTime()/1000);
    const en = Math.floor(new Date(end).getTime()/1000);
    try {
      await api('/api/events', { method:'POST', body: JSON.stringify({title, startTime: s, endTime: en, status:'BUSY'})});
      setTitle(''); setStart(''); setEnd('');
      load();
    } catch (e) { setErr(e.error || JSON.stringify(e)); }
  }

  async function toggleSwappable(ev) {
    const newStatus = ev.status === 'BUSY' ? 'SWAPPABLE' : 'BUSY';
    await api('/api/events/' + ev.id, { method:'PUT', body: JSON.stringify({ status: newStatus })});
    load();
  }

  function getStatusClass(status) {
    const statusMap = {
      'BUSY': 'status-busy',
      'SWAPPABLE': 'status-swappable',
      'SWAP_PENDING': 'status-pending'
    };
    return statusMap[status] || 'status-busy';
  }

  return (
    <div>
      <h2>Your Events</h2>
      <form onSubmit={add} className="card">
        <div>
          <input 
            placeholder="Event Title" 
            value={title} 
            onChange={e=>setTitle(e.target.value)}
            required
          />
        </div>
        <div>
          <input 
            type="datetime-local" 
            value={start} 
            onChange={e=>setStart(e.target.value)}
            required
          />
        </div>
        <div>
          <input 
            type="datetime-local" 
            value={end} 
            onChange={e=>setEnd(e.target.value)}
            required
          />
        </div>
        <div>
          <button type="submit" className="btn btn-primary">Add Event</button>
        </div>
      </form>

      {events.map(ev => (
        <div className="card" key={ev.id}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px'}}>
            <strong style={{fontSize: '18px'}}>{ev.title}</strong>
            <span className={`status-badge ${getStatusClass(ev.status)}`}>{ev.status}</span>
          </div>
          <div className="small" style={{marginBottom: '8px'}}>
            <strong>From:</strong> {new Date(ev.start_time*1000).toLocaleString()}
          </div>
          <div className="small" style={{marginBottom: '12px'}}>
            <strong>To:</strong> {new Date(ev.end_time*1000).toLocaleString()}
          </div>
          <div>
            <button 
              className={`btn ${ev.status === 'SWAPPABLE' ? 'btn-secondary' : 'btn-success'}`}
              onClick={()=>toggleSwappable(ev)}
            >
              {ev.status === 'SWAPPABLE' ? 'Make Busy' : 'Make Swappable'}
            </button>
          </div>
        </div>
      ))}
      {err && <div className="error-message">{err}</div>}
    </div>
  );
}
