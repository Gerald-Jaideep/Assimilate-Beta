import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, increment, collection, query, where, getDocs, limit, orderBy, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  ThumbsUp, 
  Share2, 
  Bookmark, 
  Download, 
  Star, 
  ChevronRight, 
  LayoutDashboard, 
  Globe,
  Clock,
  CheckCircle2,
  Lock,
  ChevronDown,
  ExternalLink,
  PlayCircle,
  ShieldCheck,
  Users,
  Rocket,
  Loader2,
  Calendar,
  Volume2,
  VolumeX,
  Eye,
  MessageSquare,
  BookOpen,
  FileText
} from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { Celebration } from '../components/Celebration';
import { useTheme } from '../hooks/useTheme';

import { generateICSFile } from '../lib/calendarUtils';

export default function CaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isHyping, setIsHyping] = useState(false);
  const [hasHyped, setHasHyped] = useState(false);
  const [hasLiked, setHasLiked] = useState(false);
  const [hasBookmarked, setHasBookmarked] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'summary' | 'transcript'>('description');
  const [watchProgress, setWatchProgress] = useState(0);
  const [watchCompleted, setWatchCompleted] = useState(false);
  const [hasEarnedCredits, setHasEarnedCredits] = useState(false);
  const [isReminderSet, setIsReminderSet] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'confetti' | 'fireworks'>('confetti');
  const [presenterCases, setPresenterCases] = useState<any[]>([]);
  const [relatedCases, setRelatedCases] = useState<any[]>([]);
  const [sponsorData, setSponsorData] = useState<any>(null);
  const [sponsorCases, setSponsorCases] = useState<any[]>([]);
  const [activeSponsorship, setActiveSponsorship] = useState<any>(null);
  const [isSponsorshipExpired, setIsSponsorshipExpired] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showVideoOptions, setShowVideoOptions] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('English (Original)');
  const [transcriptsActive, setTranscriptsActive] = useState(true);
  const [showControls, setShowControls] = useState(true);

  const videoRef = React.useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying && !showVideoOptions) setShowControls(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    } else {
      handleMouseMove();
    }
  }, [isPlaying, showVideoOptions]);

  useEffect(() => {
    if (caseData?.scheduledAt && caseData?.status === 'scheduled') {
      const timer = setInterval(() => {
        const now = new Date().getTime();
        const target = new Date(caseData.scheduledAt).getTime();
        const diff = target - now;

        if (diff <= 0) {
          setTimeLeft(null);
          clearInterval(timer);
          return;
        }

        setTimeLeft({
          d: Math.floor(diff / (1000 * 60 * 60 * 24)),
          h: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [caseData]);

  useEffect(() => {
    async function saveProgress() {
      if (!user || !id || watchProgress === 0) return;
      try {
        const progressId = `${user.uid}_${id}`;
        await setDoc(doc(db, 'user_progress', progressId), {
          userId: user.uid,
          caseId: id,
          progress: watchProgress,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error("Error saving progress:", err);
      }
    }

    // Save progress periodically if playing
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        saveProgress();
      }, 10000); // Save every 10 seconds while playing
    }

    const handleUnload = () => {
      saveProgress();
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [isPlaying, watchProgress, user, id]);

  // Initial progress restore logic moved here to ensure ref availability
  useEffect(() => {
    if (watchProgress > 0 && videoRef.current && videoRef.current.duration) {
      // Only set if significantly different to avoid loops
      const targetTime = (watchProgress / 100) * videoRef.current.duration;
      if (Math.abs(videoRef.current.currentTime - targetTime) > 2) {
        videoRef.current.currentTime = targetTime;
      }
    }
  }, [duration]); // Run when duration is first loaded

  useEffect(() => {
    async function fetchCase() {
      if (!id) return;
      try {
        // Increment views (Non-blocking)
        updateDoc(doc(db, 'cases', id), { views: increment(1) }).catch(vErr => console.warn("View tracker bypass", vErr));

        const docRef = doc(db, 'cases', id);
        const snapshot = await getDoc(docRef);
        
        if (snapshot.exists()) {
          const data = { id: snapshot.id, ...snapshot.data() } as any;
          setCaseData(data);
          setLoading(false); // Immediate interactivity

          // Fetch auxiliary data in background
          const auxPromises: Promise<void>[] = [];

          // 1. Sponsor Details & Active Sponsorship
          if (data.isSponsored && data.sponsorId) {
            auxPromises.push((async () => {
              try {
                const sDoc = await getDoc(doc(db, 'sponsors', data.sponsorId));
                if (sDoc.exists()) {
                  const sponsorInfo = { id: sDoc.id, ...sDoc.data() };
                  setSponsorData(sponsorInfo);
                  
                  // Fetch potential active sponsorships for this sponsor
                  const shipSnap = await getDocs(query(
                    collection(db, 'sponsorships'), 
                    where('sponsorId', '==', data.sponsorId),
                    where('status', '==', 'active')
                  ));
                  
                  const now = new Date();
                  const ship = shipSnap.docs.find(d => {
                    const sData = d.data();
                    return new Date(sData.startDate) <= now && new Date(sData.endDate) >= now;
                  });

                  if (ship) {
                    setActiveSponsorship({ id: ship.id, ...ship.data() });
                    setIsSponsorshipExpired(false);
                  } else {
                    // Check if there was one that expired
                    const expiredShip = shipSnap.docs.find(d => new Date(d.data().endDate) < now);
                    if (expiredShip) setIsSponsorshipExpired(true);
                  }

                  const sQ = query(collection(db, 'cases'), where('sponsorId', '==', data.sponsorId), limit(6));
                  const sSnap = await getDocs(sQ);
                  setSponsorCases(sSnap.docs.filter(d => d.id !== id).map(d => ({ id: d.id, ...d.data() })));
                }
              } catch (err) { console.error("Sponsor fetch error", err); }
            })());
          }

          // 2. Presenter Cases
          if (data.presenterId) {
            auxPromises.push((async () => {
              try {
                const pQ = query(collection(db, 'cases'), where('presenterId', '==', data.presenterId), limit(5));
                const pSnap = await getDocs(pQ);
                setPresenterCases(pSnap.docs.filter(d => d.id !== id).map(d => ({ id: d.id, ...d.data() })).slice(0, 3));
              } catch (err) { console.error("Presenter cases fetch error", err); }
            })());
          }

          // 3. Related Cases
          if (data.specialty) {
            auxPromises.push((async () => {
              try {
                const rQ = query(collection(db, 'cases'), where('specialty', '==', data.specialty), limit(5));
                const rSnap = await getDocs(rQ);
                const related = rSnap.docs.filter(d => d.id !== id).map(d => ({ id: d.id, ...d.data() }));
                if (related.length > 0) {
                  setRelatedCases(related.slice(0, 3));
                } else {
                  const newsQ = query(collection(db, 'cases'), where('status', '==', 'published'), limit(4));
                  const newsSnap = await getDocs(newsQ);
                  setRelatedCases(newsSnap.docs.filter(d => d.id !== id).map(d => ({ id: d.id, ...d.data() })).slice(0, 3));
                }
              } catch (err) { console.error("Related cases fetch error", err); }
            })());
          }

          // 4. User Interaction (Hype, Interactions, Progress)
          if (user) {
            auxPromises.push((async () => {
              try {
                // Hype
                const hypeQ = query(collection(db, 'hypes'), where('caseId', '==', id), where('userId', '==', user.uid));
                const hypeSnap = await getDocs(hypeQ);
                setHasHyped(!hypeSnap.empty);

                // Interactions (Likes/Bookmarks)
                const interactQ = query(
                  collection(db, 'user_interactions'),
                  where('caseId', '==', id),
                  where('userId', '==', user.uid)
                );
                const interactSnap = await getDocs(interactQ);
                interactSnap.forEach(d => {
                  const interactionData = d.data();
                  if (interactionData.type === 'like') setHasLiked(true);
                  if (interactionData.type === 'bookmark') setHasBookmarked(true);
                });

                // Stored progress
                const progressId = `${user.uid}_${id}`;
                const progressDoc = await getDoc(doc(db, 'user_progress', progressId));
                if (progressDoc.exists()) {
                  const pData = progressDoc.data();
                  setWatchProgress(pData.progress || 0);
                  if (pData.progress >= 95) setWatchCompleted(true);
                  setHasEarnedCredits(pData.hasEarnedCredits || false);
                }
              } catch (err) { console.error("Interactions fetch error", err); }
            })());
          }

          // Use Promise.allSettled to ensure background data doesn't block if one fails
          await Promise.allSettled(auxPromises);
        } else {
          setLoading(false);
          toast.error("Case not found");
          navigate('/cases');
        }
      } catch (err) {
        console.error("Error fetching case:", err);
        setLoading(false);
      }
    }

    fetchCase();
  }, [id, user]);

  const handleHype = async () => {
    if (!user) {
      toast.info("Admission Required", {
        description: "Please log in to boost clinical cases and earn performance points."
      });
      navigate('/login');
      return;
    }
    if (isHyping || hasHyped) return;
    setIsHyping(true);
    try {
      const hypeId = `${user.uid}_${id}`;
      await setDoc(doc(db, 'hypes', hypeId), {
        userId: user.uid,
        caseId: id,
        createdAt: new Date().toISOString()
      });

      // Boost case hypes
      await updateDoc(doc(db, 'cases', id!), {
        hypes: increment(1)
      });

      // Boost user profile rank
      await updateDoc(doc(db, 'users', user.uid), {
        "stats.hypePoints": increment(50) // Hype gives more boost than just watching
      });

      setHasHyped(true);
      setCaseData((prev: any) => ({ ...prev, hypes: (prev.hypes || 0) + 1 }));
      refreshProfile();
      setCelebrationType('confetti');
      setShowCelebration(true);
      
      // Auto-turn off celebration
      setTimeout(() => setShowCelebration(false), 5000);

      toast.success("Hype recorded!", {
        description: "You've boosted this case on the leaderboard and increased your own ranking points.",
        duration: 5000,
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'hypes');
    } finally {
      setIsHyping(false);
    }
  };

  const handleInteraction = async (type: 'like' | 'bookmark' | 'share') => {
    if (!user) {
      toast.info("Admission Required", {
        description: `Please log in to ${type} this clinical session.`
      });
      navigate('/login');
      return;
    }

    if (isInteracting) return;
    
    // For share, we just increment or show a toast
    if (type === 'share') {
      try {
        await updateDoc(doc(db, 'cases', id!), { shares: increment(1) });
        // Track the interaction record too
        await setDoc(doc(db, 'user_interactions', `${user.uid}_share_${id}`), {
          userId: user.uid,
          caseId: id,
          type: 'share',
          createdAt: new Date().toISOString()
        });
        
        const shareData = {
          title: caseData.title,
          text: caseData.subtitle || `Check out this medical case: ${caseData.title}`,
          url: window.location.href
        };

        if (navigator.share) {
          try {
            await navigator.share(shareData);
          } catch (shareErr) {
            // User likely cancelled share sheet
            console.log("Share cancelled or failed", shareErr);
          }
        } else {
          await navigator.clipboard.writeText(window.location.href);
          toast.success("Link copied to clipboard!");
        }
        setCaseData((prev: any) => ({ ...prev, shares: (prev.shares || 0) + 1 }));
      } catch (err) {
        console.error("Error sharing:", err);
        handleFirestoreError(err, OperationType.WRITE, 'user_interactions');
      }
      return;
    }

    setIsInteracting(true);
    try {
      const interactionId = `${user.uid}_${type}_${id}`;
      const isRemoving = type === 'like' ? hasLiked : hasBookmarked;
      
      if (isRemoving) {
        await deleteDoc(doc(db, 'user_interactions', interactionId));
        await updateDoc(doc(db, 'cases', id!), {
          [type === 'like' ? 'likes' : 'bookmarks']: increment(-1)
        });
        if (type === 'like') setHasLiked(false);
        if (type === 'bookmark') setHasBookmarked(false);
      } else {
        await setDoc(doc(db, 'user_interactions', interactionId), {
          userId: user.uid,
          caseId: id,
          type,
          createdAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'cases', id!), {
          [type === 'like' ? 'likes' : 'bookmarks']: increment(1)
        });
        if (type === 'like') {
          setHasLiked(true);
          toast.success("Case liked!");
        }
        if (type === 'bookmark') {
          setHasBookmarked(true);
          toast.success("Case bookmarked!");
        }
      }
      
      setCaseData((prev: any) => ({ 
        ...prev, 
        [type === 'like' ? 'likes' : 'bookmarks']: (prev[type === 'like' ? 'likes' : 'bookmarks'] || 0) + (isRemoving ? -1 : 1) 
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'user_interactions');
    } finally {
      setIsInteracting(false);
    }
  };

  const handleEarnCredits = async () => {
    if (!user || hasEarnedCredits) return;
    
    try {
      const creditId = `${user.uid}_${id}`;
      const points = caseData.accreditation?.points || 0;
      
      await setDoc(doc(db, 'user_credits', creditId), {
        userId: user.uid,
        caseId: id,
        points,
        specialty: caseData.specialty,
        createdAt: new Date().toISOString()
      });
      
      await updateDoc(doc(db, 'users', user.uid), {
        "stats.creditPoints": increment(points),
        "stats.sessionsWatched": increment(1)
      });
      
      setHasEarnedCredits(true);
      setCelebrationType('fireworks');
      setShowCelebration(true);
      refreshProfile();
      
      toast.success("Certification Achieved!", {
        description: `Congratulations! You've successfully completed the case and earned ${points} CME points.`,
        duration: 8000
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'user_credits');
    }
  };

  const handleBrochureDownload = async (brochureUrl: string) => {
    if (!user) {
      toast.info("Admission Required", { description: "Log in to access clinical materials." });
      return;
    }
    
    // In a real app, we follow the link or open it
    window.open(brochureUrl, '_blank');
    
    // Track metric
    if (activeSponsorship?.id) {
       updateDoc(doc(db, 'sponsorships', activeSponsorship.id), {
          "metrics.brochureDownloads": increment(1)
       }).catch(e => console.error("Metric fail", e));
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#F5F5F3] dark:bg-[#0A0A0A] text-gray-400 dark:text-white/50 font-bold tracking-widest animate-pulse">Synchronizing Medical Data...</div>;
  if (!caseData) return <div className="p-12 text-center text-gray-500 dark:text-white/50">Case not found.</div>;

  return (
    <div className="min-h-screen bg-[#F5F5F3] dark:bg-[#0A0A0A] p-4 md:p-8 space-y-8 animate-in fade-in duration-500 transition-colors">
      <Celebration active={showCelebration} onComplete={() => setShowCelebration(false)} type={celebrationType} />
      
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-10 gap-8">
        
        {/* Main Content Area */}
        <div className="lg:col-span-7 space-y-8 min-w-0 order-1">
          
          {/* Header Section */}
          <div className="space-y-4">
            {caseData.isSponsored && sponsorData && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative w-full rounded-[32px] overflow-hidden group mb-8"
              >
                {/* Sponsor Banner Image or Glass Background */}
                <div className="absolute inset-0 z-0">
                  {sponsorData.bannerImageUrl ? (
                    <img src={sponsorData.bannerImageUrl} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105" alt="Grant Banner" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-rose-500 opacity-20" />
                  )}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] group-hover:bg-black/30 transition-colors" />
                </div>
                
                <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white p-2 flex items-center justify-center shadow-2xl border border-white/20">
                      <img 
                        src={sponsorData.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${sponsorData.name}`} 
                        className="w-full h-full object-contain" 
                        alt={sponsorData.name} 
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Unrestricted Educational Grant</p>
                      <h3 className="text-xl md:text-2xl font-black text-white tracking-tighter">
                        Education grant by {sponsorData.name}
                      </h3>
                      {sponsorData.disclaimer && (
                        <p className="text-[9px] font-bold text-white/40 max-w-md line-clamp-1">{sponsorData.disclaimer}</p>
                      )}
                    </div>
                  </div>
                  
                  {sponsorData.website && (
                    <a 
                      href={sponsorData.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-6 py-2.5 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                    >
                      visit partner site
                    </a>
                  )}
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-2">
              <span className="bg-rose-600/10 text-rose-600 dark:bg-rose-600/20 dark:text-rose-500 text-[10px] font-bold px-2 py-0.5 rounded tracking-widest border border-rose-500/20 dark:border-rose-500/30">Case Discussion</span>
              <span className="text-gray-500 dark:text-white/40 text-[10px] font-bold tracking-widest">Presented by {caseData.presenterName}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.1] max-w-4xl text-gray-900 dark:text-white">
              {caseData.title}
            </h1>
          </div>

          {/* Video Player */}
          <div 
            className="relative aspect-video rounded-[40px] overflow-hidden bg-black border border-gray-200 dark:border-white/5 group shadow-2xl transition-all"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => isPlaying && !showVideoOptions && setShowControls(false)}
            onClick={handleMouseMove}
          >
            {!user ? (
               <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md p-12 text-center">
                  <Lock size={48} className="text-rose-500 mb-4 animate-bounce" />
                  <h3 className="text-2xl font-bold mb-2 tracking-tighter">Intellectual barrier active</h3>
                  <p className="text-white/60 mb-8 max-w-md font-medium leading-relaxed">
                    Full access to medical case presentations, live Q&A, and accredited CME certifications requires specialized admission.
                  </p>
                  <Link to="/login" className="bg-white text-black px-8 py-3 rounded-2xl font-black text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
                    Log in to authenticate
                  </Link>
               </div>
            ) : timeLeft && caseData.status === 'scheduled' ? (
               <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-12 text-center bg-transparent group">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/60 transition-all duration-700" />
                  <div className="relative z-10 space-y-6">
                    <div className="bg-emerald-500 text-white text-[10px] font-black px-4 py-1.5 rounded-full tracking-[0.2em] shadow-lg shadow-emerald-500/20 border border-emerald-400">
                      Broadcasting Live Soon
                    </div>
                    <div className="flex gap-4">
                      {[
                        { v: timeLeft.d, l: 'Days' },
                        { v: timeLeft.h, l: 'Hrs' },
                        { v: timeLeft.m, l: 'Mins' },
                        { v: timeLeft.s, l: 'Secs' }
                      ].map((t, i) => (
                        <div key={i} className="flex flex-col items-center">
                           <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/10 flex items-center justify-center mb-1">
                             <span className="text-3xl font-black text-white">{t.v.toString().padStart(2, '0')}</span>
                           </div>
                           <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">{t.l}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3 pt-4">
                       <button 
                        onClick={() => generateICSFile({
                          title: caseData.title,
                          description: caseData.description,
                          location: user.uid === caseData.presenterId ? caseData.speakerJoinLink : caseData.googleMeetLink,
                          startTime: caseData.scheduledAt
                        })}
                        className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-xs tracking-widest flex items-center gap-2 hover:bg-gray-100 transition-all shadow-xl"
                      >
                        <Calendar size={14} />
                        Export to Calendar
                      </button>
                      <button 
                        onClick={() => setIsReminderSet(!isReminderSet)}
                        className={cn(
                          "px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all",
                          isReminderSet ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/30" : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                        )}
                      >
                        {isReminderSet ? <CheckCircle2 size={16} /> : <Rocket size={16} />}
                        {isReminderSet ? 'Reminder Set' : 'Set Dashboard Reminder'}
                      </button>
                    </div>
                    {user.uid === caseData.presenterId && (
                      <div className="mt-8 p-6 bg-indigo-600/90 rounded-3xl border border-indigo-400 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
                        <p className="text-[10px] font-black tracking-[0.2em] mb-2 uppercase">Private Speaker Admission</p>
                        <p className="text-xs font-medium mb-4 opacity-80">You are the scheduled specialist for this session.</p>
                        <a href={caseData.speakerJoinLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-6 py-2 rounded-xl font-bold text-xs tracking-tighter hover:scale-105 transition-all">
                          Enter Speaker Session Hub <ExternalLink size={14} />
                        </a>
                      </div>
                    )}
                  </div>
               </div>
            ) : null}
            
            <video 
              ref={videoRef}
              onTimeUpdate={(e) => {
                const video = e.currentTarget;
                const progress = (video.currentTime / video.duration) * 100;
                setWatchProgress(progress);
                setCurrentTime(video.currentTime);
              }}
              onLoadedMetadata={(e) => {
                setDuration(e.currentTarget.duration);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              src={caseData.videoUrl} 
              className={cn("w-full h-full object-cover", (!user || (timeLeft && caseData.status === 'scheduled')) && "blur-2xl opacity-50")}
              poster={caseData.thumbnailUrl}
              muted={isMuted}
              onClick={() => {
                if (videoRef.current?.paused) videoRef.current.play();
                else videoRef.current?.pause();
              }}
            />

            {/* Play Button Overlay - Enhanced Glassmorphism */}
            <AnimatePresence>
              {user && !isPlaying && !(timeLeft && caseData.status === 'scheduled') && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 flex items-center justify-center backdrop-blur-[3px] bg-black/20 group-hover:bg-black/40 transition-all cursor-pointer z-20"
                  onClick={(e) => {
                    e.stopPropagation();
                    videoRef.current?.play();
                  }}
                >
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    whileHover={{ scale: 1.1 }}
                    className="w-24 h-24 bg-white/10 backdrop-blur-2xl border border-white/30 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500 hover:bg-rose-600 hover:border-rose-400 group/icon"
                  >
                    <Play size={40} fill="white" className="text-white ml-2 transition-transform group-hover/icon:scale-110" />
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Custom Video Controls - Glassmorphic */}
            {user && !(timeLeft && caseData.status === 'scheduled') && (
              <>
                {/* Permanent Progress Bar (Thin) - Only when controls are hidden */}
                <div className={cn(
                  "absolute inset-x-0 bottom-0 h-1 bg-white/10 z-10 overflow-hidden transition-opacity duration-500",
                  showControls ? "opacity-0" : "opacity-100"
                )}>
                   <div 
                     className="h-full bg-rose-500 transition-all duration-100" 
                     style={{ width: `${watchProgress}%` }}
                   />
                </div>

                <div className={cn(
                  "absolute inset-x-4 bottom-4 p-4 rounded-[28px] bg-white/10 backdrop-blur-3xl border border-white/20 transition-all duration-500 z-30 flex flex-col gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.3)]",
                  showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
                )}>
                   {/* Interaction Slider */}
                   <div className="relative group/progress h-2 flex items-center">
                      <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden cursor-pointer relative">
                         <div 
                           className="h-full bg-rose-500 transition-all duration-100" 
                           style={{ width: `${watchProgress}%` }}
                         />
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max={duration || 100} 
                        value={currentTime}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (videoRef.current) videoRef.current.currentTime = val;
                        }}
                        className="absolute -inset-y-2 inset-x-0 w-full h-8 opacity-0 cursor-pointer z-10"
                      />
                   </div>

                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-6">
                         <button onClick={() => isPlaying ? videoRef.current?.pause() : videoRef.current?.play()} className="text-white hover:scale-110 transition-transform">
                            {!isPlaying ? <Play size={20} fill="currentColor" /> : <div className="w-4 h-4 flex gap-1"><div className="w-1.5 h-full bg-white rounded-full"/><div className="w-1.5 h-full bg-white rounded-full"/></div>}
                         </button>
                         
                         <div className="flex items-center gap-4">
                            <button onClick={() => setIsMuted(!isMuted)} className="text-white/70 hover:text-white transition-colors">
                              {isMuted ? <VolumeX size={18} className="text-rose-500" /> : <Volume2 size={18} />}
                            </button>
                            <span className="text-[10px] font-mono text-white/60 tracking-wider">
                              {Math.floor(currentTime / 60)}:{Math.floor(currentTime % 60).toString().padStart(2, '0')} / {Math.floor(duration / 60)}:{Math.floor(duration % 60).toString().padStart(2, '0')}
                            </span>
                         </div>
                      </div>

                      <div className="flex items-center gap-4 relative">
                         <button 
                           onClick={() => setTranscriptsActive(!transcriptsActive)} 
                           className={cn("text-[9px] font-black px-2 py-0.5 rounded border transition-all uppercase", transcriptsActive ? "bg-white text-black border-white" : "text-white/40 border-white/20")}
                         >
                           CC
                         </button>

                         <div className="relative">
                            <button 
                              onClick={() => setShowVideoOptions(!showVideoOptions)}
                              className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/70 hover:text-white"
                            >
                               <ChevronDown size={18} className={cn("transition-transform", showVideoOptions && "rotate-180")} />
                            </button>

                            <AnimatePresence>
                              {showVideoOptions && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute bottom-full right-0 mb-4 w-56 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 shadow-2xl z-50 overflow-hidden"
                                >
                                   <div className="space-y-4">
                                      <div>
                                         <p className="text-[8px] font-black lowercase tracking-widest text-white/40 mb-2">audio language</p>
                                         {['English (Original)', 'Spanish', 'French', 'Hindi'].map(lang => (
                                            <button 
                                              key={lang}
                                              onClick={() => {
                                                setSelectedLanguage(lang);
                                                setShowVideoOptions(false);
                                              }}
                                              className={cn("w-full text-left px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all lowercase", selectedLanguage === lang ? "bg-rose-500 text-white" : "text-white/60 hover:bg-white/5")}
                                            >
                                               {lang.toLowerCase()}
                                            </button>
                                         ))}
                                      </div>
                                      <div className="pt-4 border-t border-white/10">
                                         <p className="text-[8px] font-black lowercase tracking-widest text-white/40 mb-2">playback speed</p>
                                         <div className="grid grid-cols-4 gap-2">
                                            {[1, 1.25, 1.5, 2].map(speed => (
                                               <button 
                                                 key={speed}
                                                 onClick={() => {
                                                   if (videoRef.current) videoRef.current.playbackRate = speed;
                                                   setShowVideoOptions(false);
                                                 }}
                                                 className="bg-white/5 hover:bg-white/10 rounded px-1 py-1 text-[9px] font-black"
                                               >
                                                  {speed}x
                                               </button>
                                            ))}
                                         </div>
                                      </div>
                                   </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                         </div>
                      </div>
                   </div>
                </div>
              </>
            )}
          </div>

          {/* Social Interaction Bar */}
          <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/5">
            <div className="flex items-center gap-8">
              <div className="space-y-1">
                <p className="text-gray-400 dark:text-white/40 text-[10px] font-bold uppercase tracking-widest">Views</p>
                <p className="text-2xl font-bold tracking-tighter text-gray-900 dark:text-white">{(caseData.views || 0).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleInteraction('like')}
                  disabled={isInteracting}
                  className="flex flex-col items-center gap-1 group"
                >
                   <div className={cn(
                     "p-2.5 rounded-2xl transition-all",
                     hasLiked 
                       ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" 
                       : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 group-hover:text-gray-900 dark:group-hover:text-white"
                   )}>
                      <ThumbsUp size={18} fill={hasLiked ? "currentColor" : "none"} />
                   </div>
                   <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">{(caseData.likes || 0).toLocaleString()} Likes</span>
                </button>
                <button 
                  onClick={() => handleInteraction('share')}
                  className="flex flex-col items-center gap-1 group"
                >
                   <div className="p-2.5 rounded-2xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-400 dark:text-white/60 group-hover:text-gray-900 dark:group-hover:text-white transition-all">
                       <Share2 size={18} />
                   </div>
                   <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">{(caseData.shares || 0).toLocaleString()} Shares</span>
                </button>
                <button 
                  onClick={() => handleInteraction('bookmark')}
                  disabled={isInteracting}
                  className="flex flex-col items-center gap-1 group"
                >
                   <div className={cn(
                     "p-2.5 rounded-2xl transition-all",
                     hasBookmarked 
                       ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20" 
                       : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 group-hover:text-gray-900 dark:group-hover:text-white"
                   )}>
                      <Bookmark size={18} fill={hasBookmarked ? "currentColor" : "none"} />
                   </div>
                   <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">{(caseData.bookmarks || 0).toLocaleString()} Bookmarks</span>
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => handleInteraction('share')}
                 className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-white/10 transition-all text-gray-900 dark:text-white"
               >
                 <Share2 size={16} />
                 Share Snippet
               </button>
               <button 
                 onClick={handleHype}
                 disabled={isHyping || hasHyped}
                 className={cn(
                   "px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg",
                   hasHyped 
                     ? "bg-emerald-500 text-white cursor-default" 
                     : "bg-orange-500 text-black hover:bg-orange-400 active:scale-95 shadow-[0_0_20px_rgba(249,115,22,0.3)] disabled:opacity-50"
                 )}
               >
                 {isHyping ? <Loader2 size={16} className="animate-spin" /> : hasHyped ? <CheckCircle2 size={16} /> : <Rocket size={16} />}
                 {hasHyped ? 'Hyped!' : `Hype this case (+${caseData.hypes || 0})`}
               </button>
            </div>
          </div>

          {/* Detailed Content Tabs */}
          <div className="space-y-6">
            <div className="flex gap-8 border-b border-gray-100 dark:border-white/5">
              {[
                { id: 'description', label: 'Case Description' },
                { id: 'summary', label: 'Case Summary' },
                { id: 'transcript', label: 'Case Transcript' }
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={cn(
                    "pb-4 text-xs font-bold uppercase tracking-widest transition-all relative",
                    activeTab === tab.id ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/60"
                  )}
                >
                  {tab.label}
                  {activeTab === tab.id && <motion.div layoutId="tab-underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500" />}
                </button>
              ))}
            </div>

            <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-gray-100 dark:border-white/5 min-h-[200px] shadow-sm">
               <AnimatePresence mode="wait">
                  <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    {activeTab === 'description' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-indigo-400">
                          <LayoutDashboard size={20} />
                          <h3 className="font-bold uppercase tracking-widest text-sm">Background & Presentation</h3>
                        </div>
                        <p className="text-gray-600 dark:text-white/70 leading-relaxed font-medium">{caseData.description}</p>
                        <button className="text-rose-500 font-bold text-xs flex items-center gap-1 hover:gap-2 transition-all">Read More <ChevronRight size={14}/></button>
                      </div>
                    )}
                    {activeTab === 'summary' && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 text-emerald-400">
                          <CheckCircle2 size={20} />
                          <h3 className="font-bold uppercase tracking-widest text-sm">Clinical Takeaways</h3>
                        </div>
                        <p className="text-gray-600 dark:text-white/70 leading-relaxed font-medium">{caseData.summary}</p>
                      </div>
                    )}
                    {activeTab === 'transcript' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3 text-amber-400">
                             <Play size={20} />
                             <h3 className="font-bold uppercase tracking-widest text-sm">Dialogue & Insights</h3>
                           </div>
                           <div className="flex items-center gap-2">
                             {!transcriptsActive && <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mr-4 italic">Transcripts Disabled</span>}
                             <button className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-lg text-xs font-bold hover:bg-white/10 transition-colors">
                                <Download size={14} />
                                Download Transcript
                             </button>
                           </div>
                        </div>
                        {transcriptsActive ? (
                          <pre className="text-gray-600 dark:text-white/40 font-mono text-sm leading-relaxed whitespace-pre-wrap bg-gray-50 dark:bg-black/40 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                            {caseData.transcript}
                          </pre>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-gray-50 dark:bg-black/20 rounded-xl border border-gray-100 dark:border-white/5">
                             <Lock size={32} className="text-gray-300 dark:text-white/10" />
                             <p className="text-gray-400 dark:text-white/30 text-sm font-bold uppercase tracking-widest">Transcript display was disabled in video settings</p>
                             <button onClick={() => setTranscriptsActive(true)} className="text-rose-500 text-xs font-black uppercase underline underline-offset-4">Re-enable Transcripts</button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
               </AnimatePresence>
            </div>
          </div>

          {/* Speaker Profile Section */}
          <div className="bg-white dark:bg-white/5 rounded-[32px] p-8 border border-gray-100 dark:border-white/5 space-y-6">
            <div className="flex items-center gap-3 text-rose-500">
               <Users size={20} />
               <h3 className="font-bold uppercase tracking-widest text-sm text-rose-500">Presenter Profile</h3>
            </div>
            <Link to={`/speaker/${caseData.presenterId}`} className="block group">
              <div className="flex items-center gap-6 p-6 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 group-hover:bg-gray-100 dark:group-hover:bg-white/10 transition-all">
                <div className="relative">
                  <img 
                    src={caseData.presenterPhotoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${caseData.presenterName}`} 
                    className="w-20 h-20 rounded-2xl bg-gray-200 dark:bg-white/10 object-cover" 
                    alt={caseData.presenterName} 
                  />
                  {caseData.presenterCountry && (
                    <div className="absolute -bottom-2 -right-2 bg-white dark:bg-black p-1 rounded-lg border border-gray-100 dark:border-white/10 shadow-xl">
                      <img src={`https://flagsapi.com/${caseData.presenterCountry}/flat/32.png`} className="w-5 h-4 object-cover rounded-sm" />
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold group-hover:text-rose-500 transition-colors tracking-tighter text-gray-900 dark:text-white">{caseData.presenterName}</h4>
                  <p className="text-gray-500 dark:text-white/60 text-sm font-medium leading-relaxed max-w-xl line-clamp-2">{caseData.presenterBio}</p>
                </div>
              </div>
            </Link>
          </div>

        </div>

        {/* Sidebar / Stats Panel */}
        <aside className="lg:col-span-3 space-y-4 lg:space-y-6 min-w-0 order-2">
          
          {/* My Stats Widget */}
          <div className="bg-white dark:bg-white/5 rounded-[32px] p-5 lg:p-6 border border-gray-100 dark:border-white/5 space-y-5 shadow-xl text-gray-900 dark:text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-white/40 tracking-widest">My Dashboard</h3>
              <LayoutDashboard size={14} className="text-gray-300 dark:text-white/20" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Credits', value: profile?.stats?.creditPoints || 0, icon: Star, color: 'text-amber-500' },
                { label: 'Hours', value: profile?.stats?.learningHours || 0, icon: Clock, color: 'text-indigo-500' },
                { label: 'CME/CPD', value: profile?.stats?.cmePoints || 0, icon: ShieldCheck, color: 'text-emerald-500' },
                { label: 'Completed', value: profile?.stats?.casesCompleted || 0, icon: PlayCircle, color: 'text-rose-500' }
              ].map((stat, i) => (
                <div key={i} className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100/50 dark:border-white/5">
                  <div className={cn("p-1.5 rounded-lg w-fit mb-2 bg-white dark:bg-white/10", stat.color)}>
                    <stat.icon size={14} />
                  </div>
                  <p className="text-base font-black tracking-tight">{stat.value}</p>
                  <p className="text-[8px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
            <div className="pt-2">
              <Link to="/profile" className="w-full bg-gray-50 dark:bg-white/5 py-2.5 rounded-xl flex items-center justify-center font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 dark:hover:bg-white/10 transition-colors text-gray-900 dark:text-white">
                View Credentials
              </Link>
            </div>
          </div>

          {/* Quiz / Assessment Widget */}
          <div className={cn(
            "rounded-[32px] p-5 lg:p-6 space-y-4 shadow-2xl relative overflow-hidden transition-all duration-700",
            watchProgress < (caseData.completionThreshold || 70) ? "bg-gray-900 border border-white/5" : "bg-indigo-600 font-bold"
          )}>
             {watchProgress < (caseData.completionThreshold || 70) ? (
               <>
                 <div className="flex items-center justify-between mb-2">
                   <h3 className="text-xl font-bold leading-tight relative z-10 text-white/40">Assessment Locked</h3>
                   <Lock size={18} className="text-white/20" />
                 </div>
                 <div className="space-y-4 relative z-10">
                   <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-rose-500 transition-all duration-1000" 
                       style={{ width: `${(watchProgress / (caseData.completionThreshold || 70)) * 100}%` }}
                     />
                   </div>
                   <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                     Consume {caseData.completionThreshold || 70}% of the case to unlock credits. Current: {Math.floor(watchProgress)}%
                   </p>
                   <button disabled className="w-full bg-white/5 text-white/20 py-3 rounded-xl font-bold text-xs uppercase tracking-widest cursor-not-allowed">
                     Quiz Gated
                   </button>
                 </div>
               </>
             ) : (
               <>
                 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                 <h3 className="text-xl font-bold leading-tight relative z-10">Earn Your Certificate</h3>
                 <p className="text-indigo-100/70 text-xs font-medium leading-relaxed relative z-10">
                   Master the clinical outcomes of this case. Complete the assessment to earn your accredited credits.
                 </p>
                 <div className="space-y-3 relative z-10">
                   <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-100/50 uppercase tracking-widest bg-black/20 p-2 rounded-lg">
                      <Star size={12} fill="currentColor" />
                      {caseData.accreditation?.points} CME Points Available
                   </div>
                    <button 
                      onClick={handleEarnCredits}
                      disabled={hasEarnedCredits}
                      className={cn(
                        "w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg",
                        hasEarnedCredits 
                          ? "bg-emerald-500 text-white shadow-emerald-500/20" 
                          : "bg-white text-indigo-600 hover:bg-indigo-50"
                      )}
                    >
                      {hasEarnedCredits ? 'Certification Achieved' : 'Take Quiz Now'}
                    </button>
                 </div>
               </>
             )}
          </div>

          {/* Educational Grant Resources */}
          {caseData.isSponsored && sponsorData && (
            <div className="bg-white dark:bg-white/5 rounded-[32px] p-6 border border-gray-100 dark:border-white/5 space-y-6 shadow-sm overflow-hidden relative group">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">Institutional Grant Resources</h3>
                <ShieldCheck size={14} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
              
              <div className="space-y-4">
                 {isSponsorshipExpired ? (
                   <div className="p-6 bg-gray-50 dark:bg-black/20 rounded-2xl border border-dashed border-gray-200 dark:border-white/5 text-center space-y-2">
                      <Lock size={20} className="mx-auto text-gray-300" />
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resources Deactivated</p>
                      <p className="text-[8px] font-medium text-gray-400 italic">Access to this sponsor's clinical brochures has expired with the grant period.</p>
                   </div>
                 ) : sponsorData.assets?.filter((a: any) => a.type === 'brochure').length > 0 ? (
                   sponsorData.assets.filter((a: any) => a.type === 'brochure').map((a: any, i: number) => (
                     <button 
                       key={i} 
                       onClick={() => handleBrochureDownload(a.url)}
                       className="w-full p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center justify-between group/item hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:border-indigo-100 transition-all"
                     >
                       <div className="flex items-center gap-3">
                          <div className="p-2 bg-white dark:bg-black rounded-lg border border-gray-100 dark:border-white/5">
                             <FileText size={16} className="text-indigo-500" />
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] font-black text-gray-900 dark:text-white line-clamp-1 mb-0.5">{a.name}</p>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Clinical Brochure • PDF</p>
                          </div>
                       </div>
                       <Download size={14} className="text-gray-300 group-hover/item:text-indigo-500" />
                     </button>
                   ))
                 ) : (
                   <div className="p-6 bg-gray-50 dark:bg-black/20 rounded-2xl border border-dashed border-gray-200 dark:border-white/5 text-center">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No Electronic Materials</p>
                   </div>
                 )}
              </div>

              {sponsorData.website && !isSponsorshipExpired && (
                <a 
                  href={sponsorData.website} 
                  target="_blank" 
                  rel="noreferrer"
                  onClick={() => {
                    if (activeSponsorship?.id) {
                      updateDoc(doc(db, 'sponsorships', activeSponsorship.id), {
                         "metrics.websiteClicks": increment(1)
                      }).catch(e => console.error(e));
                    }
                  }}
                  className="w-full bg-indigo-600 text-white py-3 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20"
                >
                  Explore Advanced Hub <ExternalLink size={12} />
                </a>
              )}
            </div>
          )}

          {/* ICD10 Related Specialities */}
          <div className="bg-white dark:bg-white/5 rounded-[32px] p-5 lg:p-6 border border-gray-100 dark:border-white/5 space-y-3">
            <h3 className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest mb-2">Clinical Code Mapping (ICD-10)</h3>
            <div className="flex flex-wrap gap-2">
              {caseData.specialty === 'Cardiology' && ['I10', 'I25.1', 'I50.9', 'I48.0'].map(code => (
                <div key={code} className="px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-lg text-[10px] font-black text-rose-500 dark:text-rose-400 border border-rose-500/10 uppercase tracking-widest" title={`Mapped to ${caseData.specialty}`}>{code}</div>
              ))}
              {caseData.specialty === 'Neurology' && ['G40.9', 'G30.9', 'I63.9', 'G35'].map(code => (
                <div key={code} className="px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-lg text-[10px] font-black text-indigo-500 dark:text-indigo-400 border border-indigo-500/10 uppercase tracking-widest" title={`Mapped to ${caseData.specialty}`}>{code}</div>
              ))}
              {caseData.specialty === 'Endocrinology' && ['E11.9', 'E03.9', 'E66.9', 'E05.9'].map(code => (
                <div key={code} className="px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-lg text-[10px] font-black text-emerald-500 dark:text-emerald-400 border border-emerald-500/10 uppercase tracking-widest" title={`Mapped to ${caseData.specialty}`}>{code}</div>
              ))}
              {!['Cardiology', 'Neurology', 'Endocrinology'].includes(caseData.specialty) && ['R69', 'Z00.0', 'Z01.89', 'M79.60'].map(code => (
                <div key={code} className="px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-lg text-[10px] font-black text-amber-500 dark:text-amber-400 border border-amber-500/10 uppercase tracking-widest" title="General Clinical Reference">{code}</div>
              ))}
            </div>
            <p className="text-[8px] font-bold text-gray-300 dark:text-white/20 italic uppercase tracking-tighter">AI-Derived Diagnosis Codes for Billing & Research</p>
          </div>

          {/* More from Presenter */}
          {presenterCases.length > 0 && (
            <div className="bg-white dark:bg-white/5 rounded-[32px] p-5 lg:p-6 border border-gray-100 dark:border-white/5 space-y-4 shadow-sm">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest mb-2">More from {caseData.presenterName.split(',')[0]}</h3>
              <div className="space-y-3">
                {presenterCases.map((pc) => (
                  <Link key={pc.id} to={`/case/${pc.id}`} className="block group">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 dark:border-white/5">
                        <img src={pc.thumbnailUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[10px] font-black leading-tight text-gray-900 dark:text-white group-hover:text-rose-500 transition-colors line-clamp-2">
                          {pc.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] font-bold text-gray-400 dark:text-white/30 uppercase tracking-tighter italic">{pc.specialty}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sponsor Portfolio / Other Cases by Sponsor */}
          {caseData.isSponsored && sponsorCases.length > 0 && (
            <div className="bg-indigo-600 dark:bg-indigo-900/40 rounded-[32px] p-6 border border-indigo-400/30 space-y-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform duration-1000" />
              <div className="relative z-10">
                <h3 className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest mb-4">Partner Grant Portfolio</h3>
                <div className="space-y-4">
                  {sponsorCases.map((sc) => (
                    <Link key={sc.id} to={`/case/${sc.id}`} className="block group/item">
                       <div className="flex gap-4 items-center">
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-white/10 group-hover/item:border-white/30 transition-all">
                             <img src={sc.thumbnailUrl} className="w-full h-full object-cover" alt={sc.title} />
                          </div>
                          <div className="flex-1 min-w-0">
                             <h4 className="text-[10px] font-black leading-tight text-white group-hover/item:text-rose-400 transition-colors line-clamp-2">
                                {sc.title}
                             </h4>
                             <div className="flex items-center gap-2 mt-1">
                                <span className="text-[8px] font-bold text-indigo-200/50 uppercase tracking-widest">{sc.specialty}</span>
                             </div>
                          </div>
                       </div>
                    </Link>
                  ))}
                </div>
                <div className="pt-6 border-t border-white/10 mt-6">
                   <p className="text-[9px] font-bold text-indigo-200/40 leading-relaxed capitalize">
                      These clinical sessions are made available free of technical barriers through educational support from {sponsorData?.name}.
                   </p>
                </div>
              </div>
            </div>
          )}

          {/* Related Global Cases */}
          {relatedCases.length > 0 && (
            <div className="bg-white dark:bg-white/5 rounded-[32px] p-5 lg:p-6 border border-gray-100 dark:border-white/5 space-y-4 shadow-sm">
              <h3 className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">Global {caseData.specialty} Feed</h3>
              <div className="space-y-3">
                {relatedCases.map((rc) => (
                  <Link key={rc.id} to={`/case/${rc.id}`} className="block group">
                    <div className="relative aspect-video rounded-2xl overflow-hidden bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                       <img src={rc.thumbnailUrl} className="w-full h-full object-cover grayscale opacity-40 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700" />
                       <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end p-4">
                          <div className="flex items-center gap-2 mb-1">
                             <img src={`https://flagsapi.com/${rc.presenterCountry}/flat/32.png`} className="w-3 h-2 object-cover rounded-sm" />
                             <p className="text-[8px] font-black text-rose-500 uppercase tracking-[0.2em]">International Hub</p>
                          </div>
                          <h4 className="text-xs font-black leading-tight group-hover:text-rose-400 transition-colors tracking-tighter line-clamp-2">
                            {rc.title}
                          </h4>
                       </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </aside>

      </div>
    </div>
  );
}

