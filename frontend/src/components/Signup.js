import React, { useState } from 'react';
import { api } from '../api';

export default function Signup({ onLogin, goLogin }) {
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState(null);

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:4000') + '/api/signup', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name,email,password})
      });
      const json = await res.json();
      if (!res.ok) throw json;
      localStorage.setItem('token', json.token);
      onLogin(json.user);
    } catch (e) {
      setErr(e.error || JSON.stringify(e));
    }
  }

  return (
    <div style={{maxWidth:420, margin:'40px auto'}}>
      <h2>Sign Up</h2>
      <form onSubmit={submit} className="card">
        <div><label>Name</label><br/><input value={name} onChange={e=>setName(e.target.value)} /></div>
        <div><label>Email</label><br/><input value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div><label>Password</label><br/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        <div style={{marginTop:8}}><button className="btn">Sign up</button> <button type="button" className="btn" onClick={goLogin}>Have account?</button></div>
        {err && <div className="small" style={{color:'red'}}>{err}</div>}
      </form>
    </div>
  );
}
