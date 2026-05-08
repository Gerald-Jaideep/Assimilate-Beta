import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { Video, Calendar, ArrowRight, MessageSquare, Mic } from 'lucide-react';
import { cn } from '../lib/utils';

export default function SpeakerDashboard() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      try {
        // Fetch sessions
        const qSessions = query(collection(db, 'events'), where('speakers', 'array-contains', user.uid));
        const sessionSnap = await getDocs(qSessions);
        setSessions(sessionSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

        // Fetch submissions
        const qSubmissions = query(collection(db, 'cases'), where('presenterId', '==', user.uid));
        const subSnap = await getDocs(qSubmissions);
        setSubmissions(subSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching speaker data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl font-bold tracking-tight">Expert Console</h1>
        <p className="text-gray-500 font-medium mt-1">Welcome back, your global audience is waiting.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-12">
          {/* Submissions Section */}
          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold italic tracking-tighter uppercase">My Case Submissions</h2>
              <span className="bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                {submissions.length} Active
              </span>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1].map(i => <div key={i} className="h-32 bg-gray-50 animate-pulse rounded-[32px]" />)}
              </div>
            ) : submissions.length === 0 ? (
              <div className="bg-gray-50/50 p-10 rounded-[32px] border border-dashed border-gray-200 text-center space-y-4">
                <p className="text-gray-400 font-bold italic text-sm">No submissions in progress.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map(sub => (
                  <motion.div 
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-[32px] border border-[#E5E5E5] space-y-4 hover:shadow-xl hover:border-indigo-100 transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <h3 className="font-black text-lg uppercase italic tracking-tighter group-hover:text-indigo-600 transition-colors">{sub.title}</h3>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] font-bold text-gray-400 uppercase">{sub.caseType}</span>
                           <span className="text-gray-200">•</span>
                           <span className={cn(
                             "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                             sub.status === 'published' ? "bg-emerald-50 text-emerald-600" :
                             sub.status === 'pending_review' ? "bg-amber-50 text-amber-600" :
                             "bg-gray-100 text-gray-500"
                           )}>
                             {sub.status.replace('_', ' ')}
                           </span>
                        </div>
                      </div>
                      
                      {sub.status === 'pending_review' && sub.reviewQueuePosition && (
                        <div className="text-right">
                           <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest leading-none">Queue pos.</p>
                           <p className="text-2xl font-black italic text-indigo-900">#{sub.reviewQueuePosition}</p>
                        </div>
                      )}
                    </div>

                    {sub.reviewNotes && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 space-y-2">
                        <p className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Reviewer Feedback</p>
                        <p className="text-xs text-amber-900 font-medium leading-relaxed italic">"{sub.reviewNotes}"</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                       <p className="text-[10px] font-bold text-gray-400 uppercase">
                         Last update: {sub.updatedAt ? new Date(sub.updatedAt).toLocaleDateString() : 'N/A'}
                       </p>
                       <button className="text-[10px] font-black uppercase text-indigo-600 hover:underline">
                         View Details
                       </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-8">
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <h2 className="text-2xl font-bold">Your Assigned Sessions</h2>
            <span className="bg-black text-white text-[10px] font-bold px-3 py-1 rounded-full">
              {sessions.length} Found
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-2xl" />)}
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white p-12 rounded-[32px] border border-dashed border-gray-300 text-center space-y-4">
              <Mic className="mx-auto text-gray-300" size={40} />
              <p className="text-gray-500 font-medium">You haven't been assigned to any live sessions yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map(session => (
                <motion.div 
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white p-6 rounded-[32px] border border-[#E5E5E5] flex items-center justify-between group hover:shadow-lg transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
                      <Video size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg leading-tight">{session.title}</h3>
                      <p className="text-sm text-gray-500 font-medium mt-1">{new Date(session.date).toLocaleString()}</p>
                    </div>
                  </div>
                  <a 
                    href={session.googleMeetLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 bg-[#F5F5F3] px-5 py-3 rounded-2xl font-bold hover:bg-black hover:text-white transition-all"
                  >
                    Join Session <ArrowRight size={18} />
                  </a>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-8">
          <h2 className="text-2xl font-bold border-b border-gray-200 pb-4">Speaker Resources</h2>
          <div className="grid grid-cols-1 gap-4">
            {[
              { t: 'Virtual Backgrounds', d: 'Branded Assimilate.one backgrounds', icon: Video },
              { t: 'Engagement Tips', d: 'Interactive Q&A strategies', icon: MessageSquare },
              { t: 'Technical Checklist', d: 'Audio & Visual best practices', icon: Calendar },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-[32px] border border-[#E5E5E5] flex gap-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="p-3 bg-gray-100 rounded-2xl h-fit text-black">
                  <item.icon size={24} />
                </div>
                <div>
                  <h4 className="font-bold">{item.t}</h4>
                  <p className="text-sm text-gray-500">{item.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-orange-500 text-white p-8 rounded-[40px] space-y-4">
            <h3 className="text-2xl font-bold leading-tight">Prepare your CME Script</h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Our automated system can help you structure your session for maximum CPD impact.
            </p>
            <button className="w-full bg-white text-black py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors">
              Open Planner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
