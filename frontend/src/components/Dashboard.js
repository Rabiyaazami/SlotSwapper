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

  return (
    <div>
      <h2>Your Events</h2>
      <form onSubmit={add} className="card">
        <div><input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} /></div>
        <div><input type="datetime-local" value={start} onChange={e=>setStart(e.target.value)} /></div>
        <div><input type="datetime-local" value={end} onChange={e=>setEnd(e.target.value)} /></div>
        <div style={{marginTop:8}}><button className="btn">Add Event</button></div>
      </form>

      {events.map(ev => (
        <div className="card" key={ev.id}>
          <strong>{ev.title}</strong>
          <div className="small">From: {new Date(ev.start_time*1000).toLocaleString()} - To: {new Date(ev.end_time*1000).toLocaleString()}</div>
          <div className="small">Status: {ev.status}</div>
          <div style={{marginTop:8}}>
            <button className="btn" onClick={()=>toggleSwappable(ev)}>{ev.status === 'SWAPPABLE' ? 'Make Busy' : 'Make Swappable'}</button>
          </div>
        </div>
      ))}
      {err && <div className="small" style={{color:'red'}}>{err}</div>}
    </div>
  );
}
