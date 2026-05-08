import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, SUPER_ADMIN_EMAILS } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { LogIn, LogOut, LayoutDashboard, Calendar, Users, Briefcase, Sun, Moon, Menu, X as CloseIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export function Nav() {
  const { user, profile, logout, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-white dark:bg-black border-b border-[#E5E5E5] dark:border-white/10 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 group shrink-0">
          <span className="font-bold text-xl tracking-tighter dark:text-white transition-colors group-hover:text-rose-500">
            Assimilate<span className="text-gray-400 dark:text-white/20">.one</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white">Explore Cases</Link>
          {user && <Link to="/profile" className="text-sm font-bold text-indigo-500 hover:text-rose-500 transition-colors">My Credentials</Link>}
          
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-gray-500 transition-colors"
          >
            <AnimatePresence mode="wait">
              {theme === 'light' ? (
                <motion.div key="sun" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Sun size={18} /></motion.div>
              ) : (
                <motion.div key="moon" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Moon size={18} /></motion.div>
              )}
            </AnimatePresence>
          </button>
          
          {user ? (
            <>
              {user.email && SUPER_ADMIN_EMAILS.includes(user.email) && (
                <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-950/20 px-3 py-1.5 rounded-full border border-orange-100 dark:border-orange-500/20">
                  <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400 tracking-tighter">Perspective:</span>
                  <select 
                    value={profile?.role} 
                    onChange={(e) => switchRole(e.target.value)}
                    className="text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer text-orange-700 dark:text-orange-300"
                  >
                  <option value="internal" className="dark:bg-black">Internal (Admin)</option>
                    <option value="speaker" className="dark:bg-black">Speaker</option>
                    <option value="audience" className="dark:bg-black">Audience</option>
                    <option value="sponsor" className="dark:bg-black">Sponsor</option>
                  </select>
                </div>
              )}
              { (profile?.role === 'internal' || (user.email && SUPER_ADMIN_EMAILS.includes(user.email))) && (
                <Link to="/admin" className="flex items-center gap-1.5 text-sm font-medium hover:text-black dark:hover:text-white transition-colors dark:text-gray-300">
                  <LayoutDashboard size={18} />
                  <span>Admin</span>
                </Link>
              )}
              {profile?.role === 'speaker' && (
                <Link to="/speaker" className="flex items-center gap-1.5 text-sm font-medium hover:text-black transition-colors">
                  <Briefcase size={18} />
                  <span>Speaker</span>
                </Link>
              )}
              
              <div className="flex items-center gap-4 border-l pl-6 ml-2 border-[#E5E5E5] dark:border-white/10">
                <Link to="/profile" className="flex items-center gap-3 group">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-[#E5E5E5] dark:border-white/10 transition-transform group-hover:scale-110" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-none dark:text-white transition-colors group-hover:text-rose-500 line-clamp-1 max-w-[120px]">{user.displayName}</span>
                    <span className="text-[10px] tracking-wider text-gray-500 dark:text-gray-400 font-bold mt-1 capitalize">{profile?.role}</span>
                  </div>
                </Link>
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </>
          ) : (
            <Link 
              to="/login"
              className="flex items-center gap-2 bg-black text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <LogIn size={18} />
              <span>Sign In</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-4 md:hidden">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 dark:text-gray-500 transition-colors"
          >
            {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-black dark:text-white transition-colors"
          >
            {isMobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] md:hidden"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white dark:bg-black z-[70] p-6 shadow-2xl md:hidden border-l border-gray-100 dark:border-white/10"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-8">
                  <span className="font-bold text-xl tracking-tighter dark:text-white">Assimilate<span className="text-gray-400">.one</span></span>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full dark:text-white">
                    <CloseIcon size={24} />
                  </button>
                </div>

                <div className="flex flex-col gap-4 flex-1">
                  <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-gray-900 dark:text-white p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl">Explore Cases</Link>
                  {user && (
                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-indigo-600 dark:text-indigo-400 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl">My Credentials</Link>
                  )}
                  
                  {user && user.email && SUPER_ADMIN_EMAILS.includes(user.email) && (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-500/20 mt-4">
                      <span className="text-[10px] uppercase font-black tracking-widest text-orange-600 dark:text-orange-400 block mb-2">Switch Perspective</span>
                      <select 
                        value={profile?.role} 
                        onChange={(e) => {
                          switchRole(e.target.value);
                          setIsMobileMenuOpen(false);
                        }}
                        className="w-full text-sm font-bold bg-white dark:bg-black/40 border border-orange-200 dark:border-orange-500/20 rounded-xl p-2 text-orange-700 dark:text-orange-300 outline-none"
                      >
                        <option value="internal">Internal (Admin)</option>
                        <option value="speaker">Speaker</option>
                        <option value="audience">Audience</option>
                        <option value="sponsor">Sponsor</option>
                      </select>
                    </div>
                  )}

                  {user && (profile?.role === 'internal' || (user.email && SUPER_ADMIN_EMAILS.includes(user.email))) && (
                    <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 text-lg font-bold text-gray-900 dark:text-white p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl">
                      <LayoutDashboard size={24} />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                </div>

                {user ? (
                  <div className="mt-auto pt-6 border-t border-gray-100 dark:border-white/10">
                    <div className="flex items-center gap-4 mb-6">
                      <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt="" className="w-12 h-12 rounded-full border-2 border-gray-100 dark:border-white/10" />
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-900 dark:text-white">{user.displayName}</span>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-tighter">{profile?.role} Role</span>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        logout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-gray-100 dark:bg-white/5 text-gray-900 dark:text-white py-4 rounded-2xl font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 transition-colors"
                    >
                      <LogOut size={20} />
                      <span>Log Out</span>
                    </button>
                  </div>
                ) : (
                  <Link 
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="mt-auto w-full flex items-center justify-center gap-2 bg-black text-white py-4 rounded-2xl font-bold hover:bg-gray-800 transition-colors"
                  >
                    <LogIn size={20} />
                    <span>Sign In to Platform</span>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
}
