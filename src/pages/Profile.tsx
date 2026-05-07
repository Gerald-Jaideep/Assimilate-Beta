import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  Clock, 
  BookOpen, 
  ThumbsUp, 
  Bookmark, 
  TrendingUp, 
  Target, 
  Award,
  ChevronRight,
  Filter,
  Calendar,
  Grid,
  List as ListIcon,
  ShieldCheck,
  Search,
  MapPin,
  Mail,
  User as UserIcon,
  History
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Cell, PieChart, Pie
} from 'recharts';
import { Link } from 'react-router-dom';

export default function Profile() {
  const { user, profile } = useAuth();
  const [credits, setCredits] = useState<any[]>([]);
  const [interactions, setInteractions] = useState<any[]>([]);
  const [bookmarkedCases, setBookmarkedCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'year' | 'month' | 'week'>('year');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch credits
        const creditsQ = query(
          collection(db, 'user_credits'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const creditsSnap = await getDocs(creditsQ);
        const creditsData = creditsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setCredits(creditsData);

        // Fetch interactions
        const interactQ = query(
          collection(db, 'user_interactions'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const interactSnap = await getDocs(interactQ);
        const interactionsData = interactSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setInteractions(interactionsData);

        // Fetch bookmarked case details
        const bookmarkIds = interactionsData
          .filter((i: any) => i.type === 'bookmark')
          .slice(0, 10)
          .map((i: any) => i.caseId);
          
        if (bookmarkIds.length > 0) {
          const cases = await Promise.all(
            bookmarkIds.map(async (cid) => {
              const d = await getDoc(doc(db, 'cases', cid));
              return d.exists() ? { id: d.id, ...d.data() } : null;
            })
          );
          setBookmarkedCases(cases.filter(Boolean));
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'profile_data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  // Analytics Calculations
  const analytics = useMemo(() => {
    if (credits.length === 0) return { chartData: [], specialtyData: [], totalPoints: 0 };

    const totalPoints = credits.reduce((sum, c) => sum + (c.points || 0), 0);
    
    // Group by Month for Chart
    const months: any = {};
    const specialties: any = {};

    credits.forEach(c => {
      const date = new Date(c.createdAt);
      const m = date.toLocaleString('default', { month: 'short' });
      months[m] = (months[m] || 0) + c.points;
      
      const spec = c.specialty || 'General';
      specialties[spec] = (specialties[spec] || 0) + 1;
    });

    const chartData = Object.entries(months).map(([name, value]) => ({ name, value }));
    const specialtyData = Object.entries(specialties).map(([subject, A]) => ({ subject, A, fullMark: Math.max(...Object.values(specialties) as number[]) }));

    return { chartData, specialtyData, totalPoints };
  }, [credits]);

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#F5F5F3] dark:bg-black font-bold tracking-widest animate-pulse">Aggregating Clinical Performance...</div>;

  return (
    <div className="min-h-screen bg-[#F5F5F3] dark:bg-black space-y-12 pb-20">
      
      {/* Profile Header */}
      <section className="relative overflow-hidden rounded-[48px] bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 p-8 md:p-12 shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
          <div className="relative group">
            <div className="absolute -inset-4 bg-gradient-to-tr from-indigo-500 to-rose-500 rounded-[50px] opacity-20 blur-2xl group-hover:opacity-40 transition-opacity duration-700" />
            <img 
              src={profile?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`}
              className="w-48 h-48 rounded-[40px] bg-gray-100 dark:bg-white/10 object-cover border-4 border-white dark:border-white/10 shadow-2xl relative z-10"
              alt="Profile"
            />
            {profile?.role === 'speaker' && (
               <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-rose-500 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest z-20 shadow-xl border border-rose-400">
                 Accredited Speaker
               </div>
            )}
          </div>
          
          <div className="flex-1 space-y-6 text-center md:text-left">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-gray-900 dark:text-white">
                  {profile?.displayName || 'Clinical User'}
                </h1>
                <div className="flex items-center gap-2 bg-indigo-500/10 text-indigo-500 px-4 py-1.5 rounded-full border border-indigo-500/20">
                   <ShieldCheck size={16} />
                   <span className="text-[10px] font-black uppercase tracking-widest">Verified Professional</span>
                </div>
              </div>
              <p className="text-gray-500 dark:text-white/40 font-medium text-lg max-w-2xl">
                {profile?.bio || 'Medical professional dedicated to continuous clinical excellence.'}
              </p>
            </div>
            
            <div className="flex flex-wrap justify-center md:justify-start gap-8">
              <div className="flex items-center gap-3 text-gray-400">
                <MapPin size={18} className="text-rose-500" />
                <span className="text-sm font-bold tracking-tight">{profile?.country || 'Global'}, {profile?.city || 'Earth'}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <Mail size={18} className="text-indigo-500" />
                <span className="text-sm font-bold tracking-tight">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-400">
                <History size={18} className="text-amber-500" />
                <span className="text-sm font-bold tracking-tight">Joined {new Date(profile?.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analytics Dashboard */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Core Stats Overview */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { label: 'total credits', value: analytics.totalPoints, icon: Star, color: 'indigo' },
              { label: 'cases mastered', value: credits.length, icon: ShieldCheck, color: 'emerald' },
              { label: 'hype ranking', value: profile?.stats?.hypePoints || 0, icon: TrendingUp, color: 'rose' }
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white dark:bg-white/5 rounded-[32px] p-6 border border-gray-100 dark:border-white/5 shadow-xl relative overflow-hidden group"
              >
                <div className={cn("absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 blur-3xl opacity-20", `bg-${stat.color}-500`)} />
                <stat.icon size={24} className={cn(`text-${stat.color}-500`, "mb-4")} />
                <h4 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter">{stat.value.toLocaleString()}</h4>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Credits Velocity Chart */}
          <div className="bg-white dark:bg-white/5 rounded-[40px] p-8 border border-gray-100 dark:border-white/5 shadow-xl space-y-8 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black tracking-tighter">Credit Velocity</h3>
                <p className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">Points earned over time</p>
              </div>
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-white/10 p-1.5 rounded-2xl">
                 {['week', 'month', 'year'].map(f => (
                   <button 
                    key={f}
                    onClick={() => setTimeFilter(f as any)}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                      timeFilter === f ? "bg-white dark:bg-white/20 text-black dark:text-white shadow-sm" : "text-gray-400 hover:text-gray-600"
                    )}
                   >
                     {f}
                   </button>
                 ))}
              </div>
            </div>

            <div className="h-64 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#888888" strokeOpacity={0.1} />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#888888' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#888888' }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', backgroundColor: '#000', border: 'none', color: '#fff' }}
                    itemStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#6366f1" 
                    strokeWidth={4} 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                    animationDuration={2000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Competency Radar & Category Distribution */}
        <div className="space-y-8">
           {/* Top Interests */}
           <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-gray-100 dark:border-white/5 shadow-xl space-y-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-[#888888]">Popular Categories</h3>
              <div className="space-y-4">
                {analytics.specialtyData.slice(0, 3).map((spec, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-sm font-bold tracking-tight">{spec.subject}</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-400">{(spec.A || 0)} Sessions</span>
                  </div>
                ))}
              </div>
           </div>

           <div className="bg-indigo-600 rounded-[40px] p-8 border border-indigo-400 shadow-2xl relative overflow-hidden group flex-1">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform duration-1000" />
              <div className="mb-8 relative z-10">
                <h3 className="text-xl font-black text-white tracking-tighter">Competency Matrix</h3>
                <p className="text-[10px] font-bold text-indigo-100/60 uppercase tracking-widest">Specialty distribution</p>
              </div>
              
              <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={analytics.specialtyData}>
                    <PolarGrid stroke="#fff" strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#fff', fontSize: 9, fontWeight: 800 }} />
                    <PolarRadiusAxis angle={30} domain={[0, analytics.totalPoints / 2 || 10]} axisLine={false} tick={false} />
                    <Radar
                      name="Points"
                      dataKey="A"
                      stroke="#fff"
                      fill="#fff"
                      fillOpacity={0.4}
                      animationDuration={2000}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-8 border-t border-white/10 mt-6 relative z-10">
                 <p className="text-xs font-medium text-indigo-100/80 leading-relaxed">
                   This matrix displays your educational proficiency across global clinical specialities based on your session completions.
                 </p>
              </div>
           </div>
        </div>
      </section>

      {/* Bookmarks and Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Bookmarked Cases */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl border border-rose-500/20">
                <Bookmark size={20} />
              </div>
              <h3 className="text-2xl font-black tracking-tighter">Saved Clinical Evidence</h3>
            </div>
            <button className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:underline">View All</button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {bookmarkedCases.length > 0 ? bookmarkedCases.map((c) => (
              <Link key={c.id} to={`/case/${c.id}`} className="block group">
                <div className="bg-white dark:bg-white/5 rounded-[28px] p-4 border border-gray-100 dark:border-white/5 flex items-center gap-6 group-hover:bg-gray-50 dark:group-hover:bg-white/10 transition-all shadow-sm">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shrink-0 border border-gray-100 dark:border-white/10">
                    <img src={c.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt={c.title} />
                  </div>
                  <div className="space-y-2 flex-1 min-w-0">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest leading-none mb-1 block">{c.specialty}</span>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white leading-tight truncate-2 tracking-tighter">{c.title}</h4>
                    <p className="text-xs font-medium text-gray-400 truncate">{c.presenterName}</p>
                  </div>
                  <ChevronRight className="text-gray-300 group-hover:text-rose-500 group-hover:translate-x-2 transition-all shrink-0" />
                </div>
              </Link>
            )) : (
              <div className="bg-white dark:bg-white/5 rounded-[28px] p-12 border border-dashed border-gray-200 dark:border-white/10 text-center space-y-4">
                 <Bookmark size={48} className="text-gray-200 mx-auto" />
                 <p className="text-gray-400 font-bold tracking-tighter">You haven't saved any cases yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl border border-amber-500/20">
              <History size={20} />
            </div>
            <h3 className="text-2xl font-black tracking-tighter">Learning History</h3>
          </div>

          <div className="space-y-4">
            {credits.slice(0, 5).map((log) => (
              <div key={log.id} className="relative pl-8 before:absolute before:left-[11px] before:top-2 before:bottom-0 before:w-px before:bg-gray-200 dark:before:bg-white/10 last:before:hidden">
                 <div className="absolute left-0 top-2 w-6 h-6 rounded-full bg-white dark:bg-white/10 border-2 border-amber-500/50 flex items-center justify-center p-1">
                    <div className="w-full h-full bg-amber-500 rounded-full" />
                 </div>
                 <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-gray-100 dark:border-white/5 shadow-sm space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{new Date(log.createdAt).toLocaleDateString()}</p>
                    <div className="flex items-center justify-between">
                       <h5 className="text-sm font-bold text-gray-900 dark:text-white truncate pr-4">Mastery achievement in {log.specialty}</h5>
                       <span className="text-emerald-500 font-black text-sm whitespace-nowrap">+{log.points} Cr</span>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
