import React, { useEffect, useState } from 'react';
import Signup from './components/Signup';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Marketplace from './components/Marketplace';
import Requests from './components/Requests';
import { api } from './api';
import './styles.css';

function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState('login');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // attempt to fetch me
      api('/api/me').then(u => { setUser(u); setPage('dashboard'); }).catch(()=>{ localStorage.removeItem('token'); });
    }
  }, []);

  function onLogin(user) {
    setUser(user);
    setPage('dashboard');
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
    setPage('login');
  }

  if (!user) {
    if (page === 'signup') return <Signup onLogin={onLogin} goLogin={() => setPage('login')} />;
    return <Login onLogin={onLogin} goSignup={() => setPage('signup')} />;
  }

  return (
    <div className="app">
      <header>
        <h1>SlotSwapper</h1>
        <div>
          <button onClick={() => setPage('dashboard')}>Dashboard</button>
          <button onClick={() => setPage('marketplace')}>Marketplace</button>
          <button onClick={() => setPage('requests')}>Requests</button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      <main>
        {page === 'dashboard' && <Dashboard />}
        {page === 'marketplace' && <Marketplace />}
        {page === 'requests' && <Requests />}
      </main>
    </div>
  );
}

export default App;
