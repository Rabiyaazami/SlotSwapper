import React, { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin, goSignup }) {
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState(null);

  async function submit(e) {
    e.preventDefault();
    try {
      const res = await api('/api/login', {
        method: 'POST',
        body: JSON.stringify({email, password})
      });
      localStorage.setItem('token', res.token);
      onLogin(res.user);
    } catch (e) {
      setErr(e.error || e.message || 'Login failed. Please check your credentials.');
    }
  }

  return (
    <div className="auth-container">
      <h2>Log In</h2>
      <form onSubmit={submit} className="card">
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
          <button type="submit" className="btn btn-primary">Login</button>
          <button type="button" className="btn btn-secondary" onClick={goSignup}>Sign up</button>
        </div>
        {err && <div className="error-message">{err}</div>}
      </form>
    </div>
  );
}
