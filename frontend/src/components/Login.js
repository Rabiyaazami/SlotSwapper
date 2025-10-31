import React, { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin, goSignup }) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState(null);

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await fetch((process.env.REACT_APP_API_URL || 'http://localhost:4000') + '/api/login', {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({email,password})
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
      <h2>Log In</h2>
      <form onSubmit={submit} className="card">
        <div><label>Email</label><br/><input value={email} onChange={e=>setEmail(e.target.value)} /></div>
        <div><label>Password</label><br/><input type="password" value={password} onChange={e=>setPassword(e.target.value)} /></div>
        <div style={{marginTop:8}}><button className="btn">Login</button> <button type="button" className="btn" onClick={goSignup}>Sign up</button></div>
        {err && <div className="small" style={{color:'red'}}>{err}</div>}
      </form>
    </div>
  );
}
