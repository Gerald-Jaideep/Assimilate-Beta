import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { Link, useLocation } from 'react-router-dom';
import { Play, Clock, Star, Globe, TrendingUp, Calendar, Video, Rocket, ChevronRight, LayoutDashboard, Bookmark } from 'lucide-react';
import { cn } from '../lib/utils';
import { getCountryFlag, COUNTRIES } from '../constants';
import { MEDICAL_SPECIALIZATIONS } from '../constants/specializations';

import { heroContent } from '../config/heroContent';

export default function CaseFeed() {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [cases, setCases] = useState<any[]>(() => {
    const cached = localStorage.getItem('assimilate_cases_cache');
    return cached ? JSON.parse(cached) : [];
  });
  const [loading, setLoading] = useState(cases.length === 0);
  const [specialties, setSpecialties] = useState<string[]>(['All Specialties', ...MEDICAL_SPECIALIZATIONS.map(s => s.name)]);
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');
  const [progressData, setProgressData] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      const timeoutId = setTimeout(() => {
        setLoading(false); // Force load even if Firestore is slow
        console.warn("Case feed data fetch timed out");
      }, 10000);

      try {
        const q = query(
          collection(db, 'cases'), 
          where('status', 'in', ['published', 'scheduled']), 
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const caseList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCases(caseList);
        localStorage.setItem('assimilate_cases_cache', JSON.stringify(caseList));
        
        if (user) {
          try {
            const progQ = query(
              collection(db, 'user_progress'),
              where('userId', '==', user.uid)
            );
            const progSnap = await getDocs(progQ);
            const pData = progSnap.docs.map(d => d.data());
            pData.sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
            setProgressData(pData);
          } catch (e) {
            console.warn("Failed to load progress data", e);
          }
        }

        const contentSpecs = new Set<string>();
        caseList.forEach((c: any) => {
          if (c.specialty) contentSpecs.add(c.specialty);
        });
        const availableSpecs = ['All Specialties', ...Array.from(contentSpecs).sort()];
        setSpecialties(availableSpecs);
      } catch (err) {
        console.error("Failed to fetch cases:", err);
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    }
    fetchData();
  }, [profile, user, location.key]);

  const continueLearning = cases.filter(c => {
    const prog = progressData.find(p => p.caseId === c.id);
    return prog && prog.progress > 0 && prog.progress < 95;
  }).map(c => ({
    ...c,
    progress: progressData.find(p => p.caseId === c.id)?.progress
  }));

  const userCountryCode = COUNTRIES.find(c => c.name === profile?.region || c.name === 'India')?.code;
  const recommendedCases = cases.filter(c => c.presenterCountry === userCountryCode).slice(0, 3);
  const upcomingSponsored = cases.filter(c => c.status === 'scheduled' && c.isSponsored === true).slice(0, 4);

  const filteredCases = selectedSpecialty === 'All Specialties' 
    ? cases 
    : cases.filter(c => c.specialty === selectedSpecialty);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400 font-bold tracking-tighter animate-pulse">Scanning global case library...</div>;

  return (
    <div className="space-y-12 transition-colors duration-300">
      {/* Hero Section - Matching Screenshot Layout */}
      <section className="relative h-[400px] md:h-[540px] rounded-[32px] md:rounded-[48px] overflow-hidden group shadow-2xl bg-black mx-2 md:mx-0">
        <img 
          src={heroContent.hero.backgroundImage} 
          className="w-full h-full object-cover opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-80 transition-all duration-1000 scale-105 group-hover:scale-100"
          alt="Medical Hero"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-6 md:p-12 flex flex-col justify-end">
          <div className="flex items-center gap-3 mb-4 md:mb-6">
             <span className="bg-rose-600 text-white text-[8px] md:text-[10px] font-black px-2 md:px-3 py-1 rounded-[4px] tracking-widest shadow-lg shadow-rose-600/20">
               {heroContent.hero.badge}
             </span>
             <span className="text-white/40 text-[8px] md:text-[10px] font-bold tracking-widest">
               {heroContent.hero.badgeDate}
             </span>
          </div>
          <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter leading-[0.9] mb-4 md:mb-8 max-w-4xl">
            {heroContent.hero.headline}
          </h1>
          <p className="text-white/60 text-sm md:text-xl max-w-2xl font-medium leading-relaxed line-clamp-2 md:line-clamp-none">
            {heroContent.hero.subtitle}
          </p>
        </div>
      </section>

      {/* Global Clinical Feed Header */}
      <div className="space-y-6 md:space-y-8 px-4 md:px-0">
        <div className="flex flex-col gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-1.5 h-6 md:w-2 md:h-8 bg-rose-500 rounded-full shrink-0" />
            <h2 className="text-2xl md:text-5xl font-black tracking-tighter text-gray-900 dark:text-white">
              {heroContent.feed.title}
            </h2>
          </div>
          <p className="text-lg md:text-2xl text-gray-500 dark:text-white/40 font-medium max-w-3xl">
            {heroContent.feed.subtitle}
          </p>
        </div>
        
        {/* Specialty Filter - Single line side scrolling */}
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto no-scrollbar pb-2 flex-nowrap scroll-smooth">
          {specialties.map((s, i) => {
            return (
              <button
                key={i}
                id={`spec-${s.replace(/\s+/g, '-')}`}
                onClick={() => setSelectedSpecialty(s)}
                className={cn(
                  "px-6 py-2.5 rounded-2xl text-[11px] font-black tracking-widest transition-all relative shrink-0",
                  selectedSpecialty === s 
                    ? "bg-white text-black shadow-[0_10px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_10px_30px_rgba(255,255,255,0.05)]" 
                    : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 border border-gray-200 dark:border-white/10"
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
      </div>

      {/* Continue Learning Section */}
      {continueLearning.length > 0 && selectedSpecialty === 'All Specialties' && (
        <section className="space-y-8">
          <div className="flex items-center gap-3">
             <Clock className="text-amber-500" size={24} />
             <h2 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white">Continue Learning</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {continueLearning.map((c) => (
              <Link key={c.id} to={`/case/${c.id}`} className="block group">
                <div className="relative aspect-video rounded-3xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 group-hover:scale-[1.02] transition-all">
                  <img src={c.thumbnailUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-4">
                    <h4 className="text-xs font-bold text-white line-clamp-1 mb-2">
                      {c.title}
                    </h4>
                    <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500" 
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                    <span className="text-[8px] font-bold text-white/60 uppercase tracking-widest mt-2">{Math.floor(c.progress)}% Watched</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recommended for User Region */}
      {recommendedCases.length > 0 && selectedSpecialty === 'All Specialties' && (
        <section className="space-y-8">
          <div className="flex items-center gap-3">
             <Globe className="text-indigo-500" size={24} />
             <h2 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white">
                Recommended for you in {profile?.region || 'Your Region'}
             </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
             {recommendedCases.map((c) => (
               <Link key={c.id} to={`/case/${c.id}`} className="block group">
                  <div className="relative aspect-[16/10] rounded-[32px] overflow-hidden">
                     <img src={c.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-duration-700" />
                     <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black via-black/60 to-transparent">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded tracking-widest">Regional Priority</span>
                           <span className="text-white/60 text-[8px] font-black tracking-widest">{c.specialty}</span>
                        </div>
                        <h3 className="text-lg font-bold text-white leading-tight line-clamp-2 tracking-tighter">
                          {c.title}
                        </h3>
                     </div>
                  </div>
               </Link>
             ))}
          </div>
        </section>
      )}

      {/* Upcoming Sponsored Sessions */}
      {upcomingSponsored.length > 0 && selectedSpecialty === 'All Specialties' && (
        <section className="space-y-8">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <Video className="text-rose-500" size={24} />
                 <h2 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white uppercase italic">Upcoming Sponsored Live Hubs</h2>
              </div>
              <span className="text-[10px] font-black text-gray-400 dark:text-white/20 uppercase tracking-[0.2em] animate-pulse">BROADCASTS STARTING SOON</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {upcomingSponsored.map((c) => (
                <Link key={c.id} to={`/case/${c.id}`} className="block group">
                   <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-[40px] overflow-hidden flex flex-col md:flex-row shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-1">
                      <div className="relative md:w-1/3 aspect-video md:aspect-square">
                         <img src={c.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt={c.title} />
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                         <div className="absolute top-4 left-4 bg-rose-500 text-white text-[8px] font-black px-3 py-1.5 rounded-full tracking-widest shadow-xl ring-1 ring-white/20">LIVE</div>
                      </div>
                      <div className="flex-1 p-8 flex flex-col justify-between space-y-4">
                         <div className="space-y-2">
                            <div className="flex items-center gap-2">
                               <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-900/40 px-2 py-0.5 rounded italic">Grant Supported</span>
                               <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{c.specialty}</span>
                            </div>
                            <h3 className="text-xl font-black italic tracking-tighter leading-tight group-hover:text-rose-500 transition-colors uppercase line-clamp-2">
                               {c.title}
                            </h3>
                         </div>
                         <div className="flex items-center justify-between border-t border-gray-50 dark:border-white/5 pt-4">
                            <div className="flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden border border-gray-100 dark:border-white/10">
                                  {c.sponsorLogoUrl ? (
                                    <img src={c.sponsorLogoUrl} className="w-full h-full object-contain p-1" alt="Sponsor" />
                                  ) : (
                                    <Star size={14} className="text-indigo-400" />
                                  )}
                               </div>
                               <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Presenter</span>
                                  <span className="text-[10px] font-bold text-gray-900 dark:text-white leading-none">{c.presenterName}</span>
                               </div>
                            </div>
                            <button className="bg-gray-900 dark:bg-white text-white dark:text-black p-3 rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-xl">
                               <ChevronRight size={18} />
                            </button>
                         </div>
                      </div>
                   </div>
                </Link>
              ))}
           </div>
        </section>
      )}

      {/* Main Grid */}
      <section className="space-y-8">
        {selectedSpecialty === 'All Specialties' && (
          <div className="flex items-center gap-3">
             <TrendingUp className="text-rose-500" size={24} />
             <h2 className="text-2xl font-black tracking-tighter text-gray-900 dark:text-white">Recent Case Discussions</h2>
</div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {filteredCases.map((c, i) => (
            <motion.div 
              key={c.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group cursor-pointer"
            >
              <Link to={`/case/${c.id}`} className="block group">
                <div className="relative aspect-video rounded-[32px] overflow-hidden bg-gray-100 border border-gray-200 dark:border-white/10 shadow-sm transition-all duration-500 group-hover:shadow-2xl group-hover:-translate-y-1">
                  <img src={c.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={c.title} />
                  
                  {/* Sophisticated Glassmorphism Overlay */}
                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                    <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[28px] p-4 flex flex-col gap-3 shadow-2xl relative">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <img 
                              src={c.presenterPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${c.presenterName}`} 
                              className="w-14 h-14 rounded-2xl object-cover bg-white/10 border-2 border-white/30 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative z-10 -mt-10 mb-[-6px] transition-transform group-hover:scale-105" 
                              alt={c.presenterName}
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${c.presenterName}&backgroundColor=rose-500`;
                              }}
                            />
                            <div className="absolute -bottom-2 -right-2 z-20">
                               <img 
                                 src={`https://flagsapi.com/${c.presenterCountry || 'IN'}/flat/64.png`} 
                                 className="w-7 h-7 object-contain drop-shadow-lg" 
                                 alt={c.presenterCountry} 
                               />
                            </div>
                          </div>
                          <div className="flex flex-col min-w-0 pt-1">
                            <span className="text-[13px] font-black text-white leading-tight truncate tracking-tighter italic">
                              {c.presenterName}
                            </span>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <span className="text-[10px] font-bold text-white/50 tracking-widest truncate shrink-0">
                                {c.specialty}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded-lg border border-white/5">
                             <Star size={10} fill="currentColor" className="text-amber-400" />
                             <span className="text-[10px] font-black text-white">{c.accreditation?.points} Cr</span>
                          </div>
                          <div className="flex items-center gap-1 text-white/40 text-[9px] font-bold tracking-widest">
                             <Clock size={10} />
                             {c.duration || '26:39'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status/Badge Overlays */}
                  <div className="absolute top-4 left-4 flex flex-col gap-3">
                    {c.isPartOfSeries && c.seriesId && (
                      <div className="flex items-center gap-2 bg-purple-500/90 backdrop-blur-md border border-purple-400/50 p-1.5 pr-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] w-max">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-white/20 shrink-0">
                          <PlayCircle size={14} className="text-purple-600" />
                        </div>
                        <span className="text-[9px] font-black tracking-widest text-white uppercase italic">
                          Series: {c.seriesName || c.seriesId}
                        </span>
                      </div>
                    )}
                    {c.isSponsored && (
                      <div className="flex items-center gap-2 bg-white/10 backdrop-blur-2xl border border-white/30 p-1.5 pr-4 rounded-full shadow-[0_10px_30px_rgba(0,0,0,0.3)] w-max">
                        <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center overflow-hidden border border-white/20">
                          {c.sponsorLogoUrl ? (
                            <img 
                              src={c.sponsorLogoUrl} 
                              className="w-full h-full object-contain p-1" 
                              alt="Sponsor" 
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-[10px] font-black text-black">S</span>';
                              }}
                            />
                          ) : (
                            <span className="text-[10px] font-black text-black">s</span>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-white tracking-[0.1em]">Sponsored</span>
                      </div>
                    )}
                    {c.status === 'scheduled' && (
                      <div className="bg-rose-500 text-white text-[9px] font-black px-3 py-1.5 rounded-full tracking-widest shadow-lg border border-rose-600 flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        Live Session
                      </div>
                    )}
                  </div>

                  {/* Hype Indicator */}
                  {c.hypes > 0 && (
                    <div className="absolute top-4 right-4 bg-orange-500/90 backdrop-blur-md text-white px-2 py-1 rounded-xl flex items-center gap-1.5 shadow-xl border border-orange-400/50">
                      <Rocket size={12} className="animate-bounce" />
                      <span className="text-[10px] font-black">{c.hypes}</span>
                    </div>
                  )}
                </div>
                
                <div className="pt-4 px-2">
                  <h3 className="text-lg font-bold leading-tight text-gray-900 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors line-clamp-2 tracking-tight transition-all underline-offset-4">
                    {c.title}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
