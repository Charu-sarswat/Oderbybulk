import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSocket } from '../../context/SocketContext';
import { 
  BarChart3, CookingPot, Layers, Bike,
  IndianRupee, LogOut, Menu, User, Shield, FileText,
  ChevronLeft, ChevronRight, Boxes, X, QrCode, Settings,
  Volume2, VolumeX, BellRing
} from 'lucide-react';

// Brand Logos
const logoIcon = '/lok.png';
const logoBanner = '/lok.png';

/** Shared sidebar nav content — renders inside both desktop aside & mobile drawer */
function SidebarContent({ user, navLinks, location, isCollapsed, handleLogout, onLinkClick }) {
  return (
    <>
      {/* Brand Banner */}
      <div className="h-16 border-b border-[#141B20]/10 flex items-center justify-center px-4 shrink-0 overflow-hidden bg-white">
        {isCollapsed ? (
          <img src={logoIcon} alt="BC Icon" className="h-9 w-auto object-contain" />
        ) : (
          <img src={logoBanner} alt="Order By Bulk Logo" className="h-10 w-auto object-contain" />
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {navLinks.map((link) => {
          const LinkIcon = link.icon;
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={onLinkClick}
              className={`flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-extrabold transition-all ${
                isActive
                  ? 'bg-[#F15A25] text-white'
                  : 'text-[#141B20]/70 hover:text-[#141B20] hover:bg-[#141B20]/5'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? link.name : ''}
            >
              <LinkIcon className="w-4 h-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{link.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Card & Logout */}
      <div className="p-4 border-t border-[#141B20]/10 bg-[white] shrink-0 space-y-3">
        <div className={`flex items-center gap-3 px-1 ${isCollapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-xl bg-[#141B20]/5 border border-[#141B20]/10 flex items-center justify-center text-[#141B20] font-black shrink-0 uppercase">
            {user.username[0]}
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="text-xs font-extrabold text-[#141B20] truncate">{user.username}</p>
              <span className="flex items-center gap-1 text-[9px] text-[#F15A25] font-extrabold uppercase tracking-wider">
                <Shield className="w-2.5 h-2.5" />
                {user.role}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={handleLogout}
          className={`w-full flex items-center justify-center gap-2 bg-[#141B20]/5 hover:bg-[#F15A25] group text-[#141B20] hover:text-white py-2.5 rounded-xl text-xs font-bold transition-all border border-[#141B20]/10 hover:border-[#F15A25] cursor-pointer ${
            isCollapsed ? 'px-0' : ''
          }`}
          title={isCollapsed ? 'Sign Out' : ''}
        >
          <LogOut className="w-4 h-4 shrink-0 text-[#F15A25] group-hover:text-white" />
          {!isCollapsed && <span>Sign Out</span>}
        </button>

        {!isCollapsed && (
          <div className="text-center pt-1 border-t border-[#141B20]/10">
            <span className="text-[9px] text-[#141B20]/60 font-black uppercase tracking-widest block">
              Chat Bhandar Control
            </span>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminLayout() {
  const { user, token, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const { socket } = useSocket();

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // Global Buzzer Audio & Pending Received Orders State
  const [unhandledCount, setUnhandledCount] = useState(0);
  const [buzzerMuted, setBuzzerMuted] = useState(false);
  const [buzzerTone, setBuzzerTone] = useState(() => localStorage.getItem('admin_buzzer_tone') || 'delivery_bell');
  const [showSoundPicker, setShowSoundPicker] = useState(false);
  const audioContextRef = useRef(null);
  const buzzerIntervalRef = useRef(null);

  // Sound Profiles for kitchen / order alerts
  const SOUND_TONES = [
    { id: 'delivery_bell', label: '🔔 Delivery Bell (Zomato/Swiggy)', desc: 'Upbeat energetic restaurant triple-chime' },
    { id: 'counter_bell', label: '🛎️ Service Counter Ding-Dong', desc: 'Classic two-tone metallic service chime' },
    { id: 'digital_beep', label: '📟 Digital POS Alarm Beep', desc: 'Crisp high-urgency POS terminal double-beep' },
    { id: 'marimba_melody', label: '🎵 Melodic Marimba Triad', desc: 'Clean, cheerful restaurant chime chord' }
  ];

  // Synthesizes the selected buzzer tone
  const playLoudBuzzer = (toneId = buzzerTone) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;

      if (toneId === 'delivery_bell') {
        // Upbeat delivery chime (G5 784Hz -> C6 1046.5Hz -> E6 1318.5Hz)
        const notes = [
          { freq: 783.99, time: 0, dur: 0.22, vol: 0.45 },
          { freq: 1046.50, time: 0.12, dur: 0.25, vol: 0.55 },
          { freq: 1318.51, time: 0.26, dur: 0.45, vol: 0.70 }
        ];
        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, now + n.time);
          gain.gain.setValueAtTime(n.vol, now + n.time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.time);
          osc.stop(now + n.time + n.dur);
        });

      } else if (toneId === 'counter_bell') {
        // Classic Service Desk Ding-Dong (E5 659Hz -> C5 523Hz with rich harmonics)
        const notes = [
          { freq: 659.25, time: 0, dur: 0.35, vol: 0.65 },
          { freq: 523.25, time: 0.25, dur: 0.60, vol: 0.75 }
        ];
        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(n.freq, now + n.time);
          gain.gain.setValueAtTime(n.vol, now + n.time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.time);
          osc.stop(now + n.time + n.dur);
        });

      } else if (toneId === 'digital_beep') {
        // Digital POS double alarm beep (1046Hz -> 1318Hz crisp square wave)
        const notes = [
          { freq: 1046.50, time: 0, dur: 0.12, vol: 0.40 },
          { freq: 1318.51, time: 0.15, dur: 0.18, vol: 0.50 }
        ];
        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'square';
          osc.frequency.setValueAtTime(n.freq, now + n.time);
          gain.gain.setValueAtTime(n.vol, now + n.time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.time);
          osc.stop(now + n.time + n.dur);
        });

      } else if (toneId === 'marimba_melody') {
        // Warm restaurant marimba chord (F5 698Hz -> A5 880Hz -> C6 1046Hz)
        const notes = [
          { freq: 698.46, time: 0, dur: 0.25, vol: 0.50 },
          { freq: 880.00, time: 0.14, dur: 0.28, vol: 0.55 },
          { freq: 1046.50, time: 0.28, dur: 0.45, vol: 0.65 }
        ];
        notes.forEach(n => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(n.freq, now + n.time);
          gain.gain.setValueAtTime(n.vol, now + n.time);
          gain.gain.exponentialRampToValueAtTime(0.001, now + n.time + n.dur);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + n.time);
          osc.stop(now + n.time + n.dur);
        });
      }

    } catch (e) {
      console.warn('Audio buzzer failed:', e);
    }
  };

  const handleSelectTone = (toneId) => {
    setBuzzerTone(toneId);
    localStorage.setItem('admin_buzzer_tone', toneId);
    playLoudBuzzer(toneId);
    addToast('Sound changed! Playing preview...', 'info');
  };

  // Poll & sync unhandled customer-placed orders in 'received' status
  const fetchUnhandledOrdersCount = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/orders?status=received`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Only buzz for customer-placed incoming orders (exclude orders placed internally from admin/POS)
        const count = Array.isArray(data) 
          ? data.filter(o => o.status === 'received' && !o.admin_created).length 
          : 0;
        setUnhandledCount(count);
      }
    } catch (err) {
      console.error('Failed to check unhandled orders:', err);
    }
  };

  // Browser Autoplay Policy: Unlock AudioContext on first page interaction
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
          audioContextRef.current = new AudioCtx();
        }
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().then(() => {
            if (unhandledCount > 0 && !buzzerMuted) {
              playLoudBuzzer(buzzerTone);
            }
          }).catch(() => {});
        }
      } catch (e) {}
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, [unhandledCount, buzzerMuted, buzzerTone]);

  // Initial load and periodic safety check
  useEffect(() => {
    fetchUnhandledOrdersCount();
    const interval = setInterval(fetchUnhandledOrdersCount, 10000);
    return () => clearInterval(interval);
  }, [token]);

  // Real-time socket events across all management panels (Admin, Staff, Kitchen)
  useEffect(() => {
    if (!socket) return;

    const handleOrderCreated = (newOrder) => {
      // Only buzz if placed by customer (not manual admin created)
      if (!newOrder || !newOrder.admin_created) {
        setUnhandledCount(prev => prev + 1);
        if (!buzzerMuted) playLoudBuzzer(buzzerTone);
      } else {
        fetchUnhandledOrdersCount();
      }
    };

    const handleOrderUpdated = (updatedOrder) => {
      fetchUnhandledOrdersCount();
    };

    socket.on('order_created', handleOrderCreated);
    socket.on('order_status_change', handleOrderUpdated);
    socket.on('order_status_updated', handleOrderUpdated);
    socket.on('order_list_update', handleOrderUpdated);

    return () => {
      socket.off('order_created', handleOrderCreated);
      socket.off('order_status_change', handleOrderUpdated);
      socket.off('order_status_updated', handleOrderUpdated);
      socket.off('order_list_update', handleOrderUpdated);
    };
  }, [socket, buzzerMuted, buzzerTone]);

  // Continuous loop every 2 seconds until staff takes action on all received orders
  useEffect(() => {
    if (unhandledCount > 0 && !buzzerMuted) {
      playLoudBuzzer(buzzerTone);
      buzzerIntervalRef.current = setInterval(() => {
        playLoudBuzzer(buzzerTone);
      }, 2000);
    } else {
      if (buzzerIntervalRef.current) {
        clearInterval(buzzerIntervalRef.current);
        buzzerIntervalRef.current = null;
      }
    }

    return () => {
      if (buzzerIntervalRef.current) {
        clearInterval(buzzerIntervalRef.current);
      }
    };
  }, [unhandledCount, buzzerMuted, buzzerTone]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#141B20]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[white] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#141B20] text-xs font-bold uppercase tracking-wider">Verifying Credentials...</p>
        </div>
      </div>
    );
  }

  // Route guarding
  if (!token || !user) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    logout();
    addToast('Logged out successfully', 'info');
    navigate('/admin/login');
  };

  // RBAC Navigation Links Definition
  let navLinks = [];
  if (user.role === 'admin') {
    navLinks = [
      { path: '/admin', name: 'Dashboard', icon: BarChart3 },
      { path: '/admin/live-orders', name: 'Kitchen Screen', icon: CookingPot },
      { path: '/admin/orders', name: 'Orders', icon: FileText },
      { path: '/admin/inventory', name: 'Inventory & Prep', icon: Boxes },
      { path: '/admin/menu', name: 'Menu Catalog', icon: Layers },
      { path: '/admin/payments', name: 'Payments & Revenue', icon: IndianRupee },
      { path: '/admin/customers', name: 'Customer Directory', icon: User },
      { path: '/admin/users', name: 'System Users', icon: Shield },
      { path: '/admin/qr', name: 'Table QR Codes', icon: QrCode },
      { path: '/admin/settings', name: 'Settings', icon: Settings }
    ];
  } else if (user.role === 'staff') {
    navLinks = [
      { path: '/admin/live-orders', name: 'Kitchen Screen', icon: CookingPot },
      { path: '/admin/orders', name: "Today's Orders", icon: FileText },
      { path: '/admin/inventory', name: 'Inventory & Prep', icon: Boxes },
      { path: '/admin/menu', name: 'Menu Catalog', icon: Layers },
      { path: '/admin/qr', name: 'Table QR Codes', icon: QrCode }
    ];
  } else if (user.role === 'kitchen') {
    navLinks = [
      { path: '/admin/live-orders', name: 'Kitchen Screen', icon: CookingPot }
    ];
  }

  return (
    <div className="h-screen w-screen bg-[white] flex overflow-hidden font-sans">

      {/* ─── Mobile Drawer Backdrop ─────────────────────────────────────── */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* ─── Mobile Sidebar Drawer ──────────────────────────────────────── */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-[white] text-[#141B20] flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg bg-[white]/10 hover:bg-[white]/20 text-[#141B20] transition-colors cursor-pointer"
          aria-label="Close menu"
        >
          <X className="w-4 h-4" />
        </button>

        <SidebarContent
          user={user}
          navLinks={navLinks}
          location={location}
          isCollapsed={false}
          handleLogout={handleLogout}
          onLinkClick={() => setIsMobileOpen(false)}
        />
      </aside>

      {/* ─── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col h-screen bg-[white] text-[#141B20] shrink-0 border-r border-[#141B20]/10 transition-all duration-300 relative ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Toggle Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 z-25 bg-[white] border border-[#141B20]/20 text-[#141B20] rounded-full w-6 h-6 flex items-center justify-center shadow-md hover:bg-[#141B20]/5 transition-colors cursor-pointer"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <SidebarContent
          user={user}
          navLinks={navLinks}
          location={location}
          isCollapsed={isCollapsed}
          handleLogout={handleLogout}
          onLinkClick={() => {}}
        />
      </aside>

      {/* ─── Main Content Area ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Navbar with Global Buzzer Controls */}
        <header className="bg-[white] border-b border-[#141B20]/10 h-16 px-3 sm:px-6 flex items-center justify-between shrink-0 z-10 text-[#141B20] gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            {/* Hamburger - mobile only */}
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 -ml-1 rounded-lg text-[#141B20] hover:bg-[#141B20]/5 md:hidden cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <h2 className="font-serif font-extrabold text-[#141B20] text-xs sm:text-base tracking-wide truncate">
              {navLinks.find(link => link.path === location.pathname)?.name || 'Order By Bulk Control'}
            </h2>
          </div>

          {/* Right Header Status & Buzzer Alert Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
            {unhandledCount > 0 && (
              <button
                onClick={() => navigate('/admin/live-orders')}
                className="bg-[white] border border-[#F15A25] text-[#141B20] hover:bg-[white] px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-black flex items-center gap-1 sm:gap-1.5 animate-pulse cursor-pointer shrink-0"
                title="Click to view unhandled incoming orders"
              >
                <BellRing className="w-3.5 h-3.5 text-[#141B20] shrink-0" />
                <span className="hidden xs:inline sm:inline">{unhandledCount} New Order{unhandledCount > 1 ? 's' : ''}</span>
                <span className="inline xs:hidden sm:hidden font-bold">{unhandledCount}</span>
              </button>
            )}

            {/* Sound Tone Picker Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSoundPicker(!showSoundPicker)}
                className="px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold bg-[white]/10 hover:bg-[white]/20 text-[#141B20] border border-white/20 transition-all flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
                title="Change Alert Tone"
              >
                <span>🎵</span>
                <span className="hidden md:inline">Tone</span>
              </button>

              {showSoundPicker && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSoundPicker(false)}
                  />
                  <div className="absolute right-0 mt-2 w-60 sm:w-64 bg-[#141B20] border border-[white]/40 rounded-2xl shadow-2xl p-2 z-50 divide-y divide-white/10 animate-fadeIn">
                    <div className="px-3 py-2 text-[10px] font-black uppercase text-[white] tracking-wider flex justify-between items-center">
                      <span>Order Alert Tone</span>
                      <button 
                        onClick={() => setShowSoundPicker(false)}
                        className="text-[#141B20] hover:text-white p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="py-1 space-y-1">
                      {SOUND_TONES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            handleSelectTone(t.id);
                            setShowSoundPicker(false);
                          }}
                          className={`w-full text-left p-2 sm:p-2.5 rounded-xl transition-all flex flex-col cursor-pointer ${
                            buzzerTone === t.id
                              ? 'bg-[white] text-[#141B20]'
                              : 'hover:bg-[white]/10 text-white'
                          }`}
                        >
                          <span className="text-xs font-black truncate">{t.label}</span>
                          <span className={`text-[9px] sm:text-[10px] line-clamp-1 ${buzzerTone === t.id ? 'text-[#141B20]/80' : 'text-[#141B20]'}`}>
                            {t.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Mute / Unmute Buzzer Toggle Button */}
            <button
              onClick={() => {
                const nextMuted = !buzzerMuted;
                setBuzzerMuted(nextMuted);
                if (nextMuted) {
                  addToast('Buzzer muted for pending orders.', 'info');
                } else {
                  addToast('Buzzer unmuted - alerts active.', 'success');
                  if (unhandledCount > 0) playLoudBuzzer(buzzerTone);
                }
              }}
              className={`px-2 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 border transition-all cursor-pointer shrink-0 ${
                buzzerMuted
                  ? 'bg-[white]/5 border-white/10 text-[#141B20] hover:text-white'
                  : unhandledCount > 0
                  ? 'bg-[white] text-[#141B20] border-[white] font-black shadow-md animate-bounce'
                  : 'bg-[white] border-[#F15A25] text-[#141B20] hover:bg-[white]'
              }`}
              title={buzzerMuted ? "Unmute Order Alert Sound" : "Mute Order Alert Sound"}
            >
              {buzzerMuted ? (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-[#141B20] shrink-0" />
                  <span className="hidden sm:inline">Muted</span>
                </>
              ) : (
                <>
                  <Volume2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Buzzer {unhandledCount > 0 ? 'Active' : 'On'}</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 bg-[white] overflow-y-auto max-w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
