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
      const res = await api('/api/signup', {
        method: 'POST',
        body: JSON.stringify({name, email, password})
      });
      localStorage.setItem('token', res.token);
      onLogin(res.user);
    } catch (e) {
      setErr(e.error || e.message || 'Signup failed. Please try again.');
    }
  }

  return (
    <div className="auth-container">
      <h2>Sign Up</h2>
      <form onSubmit={submit} className="card">
        <div>
          <label>Name</label>
          <input 
            type="text"
            value={name} 
            onChange={e=>setName(e.target.value)} 
            placeholder="Enter your full name"
            required
          />
        </div>
        <div>
          <label>Email</label>
          <input 
            type="email"
            value={email} 
            onChange={e=>setEmail(e.target.value)} 
            placeholder="Enter your email"
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={e=>setPassword(e.target.value)} 
            placeholder="Enter your password"
            required
          />
        </div>
        <div className="button-group">
          <button type="submit" className="btn btn-primary">Sign up</button>
          <button type="button" className="btn btn-secondary" onClick={goLogin}>Have account?</button>
        </div>
        {err && <div className="error-message">{err}</div>}
      </form>
    </div>
  );
}
