import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { LogIn, LogOut, LayoutDashboard, Calendar, Users, Briefcase, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function Nav() {
  const { user, profile, logout, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="bg-white dark:bg-black border-b border-[#E5E5E5] dark:border-white/10 sticky top-0 z-50 transition-colors">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-1.5 group">
          <span className="font-bold text-xl tracking-tighter dark:text-white transition-colors group-hover:text-rose-500">
            Assimilate<span className="text-gray-400 dark:text-white/20">.one</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="flex items-center gap-6">
          <Link to="/" className="text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white">Explore Cases</Link>
          {user && <Link to="/profile" className="text-sm font-bold text-indigo-500 hover:text-rose-500 transition-colors">My Credentials & Analytics</Link>}
          
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
              {user.email && ['jaideep@assimilate.one', 'jaideep@medvarsity.com'].includes(user.email) && (
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
              { (profile?.role === 'internal' || (user.email && ['jaideep@assimilate.one', 'jaideep@medvarsity.com'].includes(user.email))) && (
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
              {profile?.role === 'sponsor' && (
                <Link to="/sponsor" className="flex items-center gap-1.5 text-sm font-medium hover:text-black transition-colors">
                  <Users size={18} />
                  <span>Sponsor</span>
                </Link>
              )}
              
              <div className="flex items-center gap-4 border-l pl-6 ml-2 border-[#E5E5E5] dark:border-white/10">
                <Link to="/profile" className="flex items-center gap-3 group">
                  <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-[#E5E5E5] dark:border-white/10 transition-transform group-hover:scale-110" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium leading-none dark:text-white transition-colors group-hover:text-rose-500">{user.displayName}</span>
                    <span className="text-[10px] tracking-wider text-gray-500 dark:text-gray-400 font-bold mt-1 capitalize">{profile?.role} Profile</span>
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
      </div>
    </nav>
  );
}
