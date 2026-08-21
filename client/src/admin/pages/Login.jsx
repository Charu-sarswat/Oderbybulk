import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Lock, User, AlertCircle, ShieldCheck } from 'lucide-react';
import { restaurantConfig } from '../../config/restaurant';

// Brand Logo
const logoFull = '/l2.png';

export default function Login() {
  const navigate = useNavigate();
  const { login, error: authError } = useAuth();
  const { addToast } = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      addToast('Please enter both username and password', 'warning');
      return;
    }

    setLoading(true);
    const loggedInUser = await login(username, password);
    setLoading(false);

    if (loggedInUser) {
      addToast('Welcome to Order By Bulk Control Panel!', 'success');
      if (loggedInUser.role === 'staff' || loggedInUser.role === 'kitchen') {
        navigate('/admin/live-orders');
      } else {
        navigate('/admin');
      }
    } else {
      addToast('Authentication failed. Check credentials.', 'error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[#FEFCFF] px-6 relative overflow-hidden font-sans">


      <div className="w-full max-w-md animate-fade-in z-10">
        
        {/* Official Brand Logo Banner */}
        <div className="text-center mb-6 space-y-3">
          <img 
            src={logoFull} 
            alt="Order By Bulk Chat Bhandar" 
            className="h-40 w-auto mx-auto object-contain"
          />
          <div className="inline-flex items-center gap-1.5 bg-[#141B20]/5 border border-[#141B20]/10 px-3 py-1 rounded-full text-[10px] font-extrabold text-[#141B20] uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            Control & Staff Portal
          </div>
        </div>

        {/* Glassmorphic Form Card */}
        <div className="bg-[white] p-8 rounded-3xl border border-[#141B20]/10 backdrop-blur-xl">
          <h2 className="text-lg font-serif font-black text-[#141B20] mb-6">System Authentication</h2>

          {authError && (
            <div className="mb-6 bg-[white] border border-[#A97E16] text-[#141B20] p-4 rounded-2xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#141B20]" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] font-extrabold text-[#141B20] uppercase tracking-widest block mb-2">
                Username
              </label>
              <div className="flex items-center bg-white border border-[#141B20]/20 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#A97E16]/50 focus-within:border-[#A97E16] transition-all">
                <User className="w-4.5 h-4.5 text-[#A97E16] mr-3 shrink-0" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin / staff / kitchen"
                  style={{ color: '#141B20' }}
                  className="w-full bg-transparent text-base !text-[#141B20] font-bold tracking-wide focus:outline-none placeholder:!text-[#141B20]/40 placeholder:font-normal placeholder:text-sm placeholder:italic"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#141B20] uppercase tracking-widest block mb-2">
                Password
              </label>
              <div className="flex items-center bg-white border border-[#141B20]/20 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#A97E16]/50 focus-within:border-[#A97E16] transition-all">
                <Lock className="w-4.5 h-4.5 text-[#A97E16] mr-3 shrink-0" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ color: '#141B20' }}
                  className="w-full bg-transparent text-base !text-[#141B20] font-bold tracking-wide focus:outline-none placeholder:!text-[#141B20]/40 placeholder:font-normal placeholder:text-sm placeholder:italic"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#A97E16] hover:brightness-110 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-[#A97E16]/20 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs uppercase tracking-wider mt-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[white] border-t-transparent rounded-full animate-spin"></div>
                  <span>Authenticating...</span>
                </>
              ) : (
                <span>Sign In to Dashboard</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
