import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { User, Briefcase, GraduationCap, Award, FileText, Rocket, MapPin, Globe, ChevronRight, Loader2, Star, Clock, Eye, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { COUNTRIES } from '../constants/countries';

export default function SpeakerProfile() {
  const { id } = useParams();
  const [speaker, setSpeaker] = useState<any>(null);
  const [speakerCases, setSpeakerCases] = useState<any[]>([]);
  const [countryCases, setCountryCases] = useState<any[]>([]);
  const [specialtyCases, setSpecialtyCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ sessions: 0, totalHypes: 0, totalViews: 0, totalShares: 0 });

  useEffect(() => {
    async function fetchSpeakerData() {
      if (!id) return;
      setLoading(true);
      try {
        const userDoc = await getDoc(doc(db, 'users', id));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setSpeaker({ uid: userDoc.id, ...data });

          // Fetch speaker's cases
          // Note: Simple query first to avoid index requirements if possible, or handle all
          const casesQuery = query(
            collection(db, 'cases'),
            where('presenterId', '==', userDoc.id)
          );
          const casesSnap = await getDocs(casesQuery);
          let cData = casesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Sort manually if needed to avoid index issues during dev
          cData.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          
          setSpeakerCases(cData);

          // Calculate stats
          const totalHypes = cData.reduce((acc, curr: any) => acc + (curr.hypes || 0), 0);
          const totalViews = cData.reduce((acc, curr: any) => acc + (curr.views || 0), 0);
          const totalShares = cData.reduce((acc, curr: any) => acc + (curr.shares || 0), 0);
          
          setStats({ 
            sessions: cData.length, 
            totalHypes,
            totalViews,
            totalShares
          });

          // Fetch other cases from same country
          if (data.region) {
            const countryQuery = query(
              collection(db, 'cases'),
              where('presenterCountry', '==', data.region),
              where('presenterId', '!=', userDoc.id),
              limit(4)
            );
            const countrySnap = await getDocs(countryQuery);
            setCountryCases(countrySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }

          // Fetch other cases from same specialty (if cases exist)
          if (cData.length > 0 && (cData[0] as any).specialty) {
            const specialtyQuery = query(
              collection(db, 'cases'),
              where('specialty', '==', (cData[0] as any).specialty),
              where('presenterId', '!=', userDoc.id),
              limit(4)
            );
            const specialtySnap = await getDocs(specialtyQuery);
            setSpecialtyCases(specialtySnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          }
        }
      } catch (error) {
        console.error("Error fetching speaker profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSpeakerData();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
        <p className="text-sm font-black tracking-widest text-gray-400">Archiving Expertise...</p>
      </div>
    );
  }

  if (!speaker) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black italic">Speaker Not Found</h2>
        <Link to="/" className="text-indigo-600 font-bold hover:underline">Back to Feed</Link>
      </div>
    );
  }

  const countryName = COUNTRIES.find(c => c.code === speaker.region)?.name || speaker.region;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-12"
    >
      {/* Header Profile Section */}
      <div className="relative overflow-hidden bg-white dark:bg-white/5 rounded-[40px] shadow-sm border border-gray-100 dark:border-white/10 p-8 md:p-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl opacity-50" />
        
        <div className="relative flex flex-col md:flex-row gap-8 items-start">
          <div className="w-32 h-32 md:w-48 md:h-48 rounded-[40px] overflow-hidden bg-gray-50 dark:bg-white/10 flex-shrink-0 shadow-xl border-4 border-white dark:border-white/20">
            {speaker.photoURL ? (
              <img src={speaker.photoURL} alt={speaker.displayName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 dark:text-gray-600">
                <User size={64} />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black tracking-widest">
                  Verified Speaker
                </span>
                {speaker.region && (
                  <div className="flex items-center gap-1 px-3 py-1 bg-gray-50 dark:bg-white/10 text-gray-500 dark:text-gray-400 rounded-full text-[10px] font-black tracking-widest">
                    <img src={`https://flagsapi.com/${speaker.region}/flat/64.png`} className="w-3 h-3 object-contain" />
                    {countryName}
                  </div>
                )}
              </div>
              <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter leading-none dark:text-white">
                {speaker.displayName}
              </h1>
              <p className="text-lg md:text-xl font-bold text-gray-500 dark:text-gray-400 italic max-w-2xl">
                {speaker.qualifications}
              </p>
            </div>

            <div className="flex flex-wrap gap-4 md:gap-6 border-t border-gray-100 dark:border-white/10 pt-8">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-gray-50 dark:bg-white/10 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Briefcase size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500">Presentations</p>
                  <p className="text-lg font-black dark:text-white">{stats.sessions}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 dark:bg-white/10 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <Rocket size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500">Total Hypes</p>
                  <p className="text-lg font-black dark:text-white">{stats.totalHypes}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 dark:bg-white/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Eye size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500">Total Views</p>
                  <p className="text-lg font-black dark:text-white">{stats.totalViews}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 dark:bg-white/10 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Globe size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500">Total Shares</p>
                  <p className="text-lg font-black dark:text-white">{stats.totalShares}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 dark:bg-white/10 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Star size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest text-gray-400 dark:text-gray-500">Accreditations</p>
                  <p className="text-lg font-black dark:text-white">AMA PRA Category 1</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Detailed Bio & Info */}
        <div className="lg:col-span-2 space-y-12">
          {speaker.bio && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <GraduationCap size={20} />
                </div>
                <h2 className="text-xl font-black italic tracking-tight dark:text-white">Professional Bio</h2>
              </div>
              <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-gray-100 dark:border-white/10 shadow-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {speaker.bio}
              </div>
            </section>
          )}

          {speaker.publications && (
            <section className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <FileText size={20} />
                </div>
                <h2 className="text-xl font-black italic tracking-tight dark:text-white">Selected Publications</h2>
              </div>
              <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-gray-100 dark:border-white/10 shadow-sm space-y-4">
                {speaker.publications.split('\n').filter((p: string) => !!p.trim()).map((pub: string, idx: number) => (
                  <div key={idx} className="flex gap-4 group cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <span className="text-indigo-200 dark:text-indigo-900 font-black text-xl italic">{String(idx + 1).padStart(2, '0')}</span>
                    <p className="text-sm font-bold leading-tight dark:text-gray-300">{pub}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {speaker.disclosures && (
            <section className="space-y-4 opacity-75 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                  <AlertCircle size={20} />
                </div>
                <h2 className="text-xl font-black italic tracking-tight dark:text-white">Conflict of Interest Disclosures</h2>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-[32px] p-8 border border-gray-100 dark:border-white/10 leading-relaxed text-xs font-bold text-gray-500 dark:text-gray-400 tracking-widest">
                {speaker.disclosures}
              </div>
            </section>
          )}

          {/* Cases by this Speaker */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-black italic tracking-tighter dark:text-white">Sessions Presented</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {(speakerCases.length > 0 ? speakerCases : Array(2).fill(null)).map((c, i) => (
                 c ? (
                   <Link key={c.id} to={`/case/${c.id}`}>
                     <motion.div 
                       whileHover={{ y: -5 }}
                       className="group bg-white dark:bg-white/5 rounded-[32px] overflow-hidden border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-xl transition-all"
                     >
                       <div className="aspect-video relative overflow-hidden">
                         <img src={c.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                         <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 dark:bg-black/90 backdrop-blur-md rounded-full text-[10px] font-black tracking-widest dark:text-white">
                           {c.specialty}
                         </div>
                       </div>
                       <div className="p-6">
                         <h3 className="font-black text-lg leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors dark:text-white">
                            {c.title}
                          </h3>
                         <div className="flex items-center gap-4 mt-4 text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-widest">
                           <span className="flex items-center gap-1"><Eye size={12} /> {c.views || 0}</span>
                           <span className="flex items-center gap-1"><Star size={12} fill="currentColor" className="text-amber-400 border-none" /> {c.accreditation?.points} Points</span>
                         </div>
                       </div>
                     </motion.div>
                   </Link>
                 ) : (
                   <div key={i} className="bg-gray-50 dark:bg-white/5 rounded-[32px] h-64 animate-pulse" />
                 )
               ))}
            </div>
          </section>
        </div>

        {/* Right Column: Other Recommendations */}
        <div className="space-y-12">
          {countryCases.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <MapPin size={20} className="text-gray-400 dark:text-gray-500" />
                <h3 className="font-black uppercase tracking-tighter text-sm italic dark:text-white">Also from {countryName}</h3>
              </div>
              <div className="space-y-4">
                {countryCases.map(c => (
                  <Link key={c.id} to={`/case/${c.id}`} className="block group">
                    <div className="flex gap-4 p-4 rounded-[24px] bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-indigo-100 dark:hover:border-indigo-500/30 hover:bg-gray-50/50 dark:hover:bg-white/10 transition-all">
                      <div className="w-20 h-20 rounded-[18px] overflow-hidden flex-shrink-0 border border-gray-100 dark:border-white/10">
                         <img src={c.thumbnailUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-[8px] font-black tracking-tighter text-indigo-500 dark:text-indigo-400">{c.specialty}</p>
                        <h4 className="font-bold text-xs leading-tight line-clamp-2 dark:text-white">
                          {c.title}
                        </h4>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500">{c.presenterName}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {specialtyCases.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <Globe size={20} className="text-gray-400 dark:text-gray-500" />
                <h3 className="font-black uppercase tracking-tighter text-sm italic dark:text-white">Related Specialties</h3>
              </div>
              <div className="space-y-4">
                {specialtyCases.map(c => (
                  <Link key={c.id} to={`/case/${c.id}`} className="block group">
                    <div className="flex gap-4 p-4 rounded-[24px] bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 hover:border-indigo-100 dark:hover:border-indigo-500/30 hover:bg-gray-50/50 dark:hover:bg-white/10 transition-all">
                      <div className="w-20 h-20 rounded-[18px] overflow-hidden flex-shrink-0 border border-gray-100 dark:border-white/10">
                         <img src={c.thumbnailUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <p className="text-[8px] font-black tracking-tighter text-indigo-500 dark:text-indigo-400">{c.specialty}</p>
                        <h4 className="font-bold text-xs leading-tight line-clamp-2 dark:text-white">
                          {c.title}
                        </h4>
                        <Link to={`/speaker/${c.presenterId}`} className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400">{c.presenterName}</Link>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </motion.div>
  );
}
