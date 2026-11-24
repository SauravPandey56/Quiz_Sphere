import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldCheck } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login(email, password);
      if (data.role !== 'admin') {
        throw new Error('Not authorized to access Admin Portal');
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--bg)] text-[var(--text)] transition-colors duration-300">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl w-full max-w-md p-8 relative overflow-hidden shadow-[var(--shadow)]">
        
        <div className="relative z-10 flex flex-col items-center">
          <ShieldCheck size={48} className="text-[var(--primary)] mb-4" />
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[var(--text)] mb-2 font-heading">Admin Portal</h1>
            <p className="text-[var(--muted)] text-sm">Secure Authentication Area</p>
          </div>

          {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 px-4 py-3 rounded-xl mb-4 w-full text-center text-sm font-semibold">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5 w-full">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">Admin Email/Username</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 outline-none transition-all text-sm text-[var(--text)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted)] mb-1.5">Secret Password</label>
              <input
                type="password"
                className="w-full px-4 py-2.5 bg-[var(--surface-2)] border border-[var(--border)] rounded-xl focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 outline-none transition-all text-sm text-[var(--text)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-[var(--primary)]/20 transition-all tracking-wider text-sm mt-2"
            >
              AUTHENTICATE
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
