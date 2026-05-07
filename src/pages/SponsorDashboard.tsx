import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { Briefcase, BarChart, Users, Star, MessageSquare, ChevronRight, Globe, FileText } from 'lucide-react';

export default function SponsorDashboard() {
  const { user } = useAuth();
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSponsorships() {
      if (!user) return;
      // In a real app, we check which events this user is a sponsor for
      const q = query(collection(db, 'sponsors'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      setSponsorships(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }
    fetchSponsorships();
  }, [user]);

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Sponsor Arena</h1>
          <p className="text-gray-500 font-medium mt-1">Maximize your brand visibility and lead generation.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-green-50 text-green-600 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Active Partnerships
          </div>
        </div>
      </header>

      {/* Analytics Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { label: 'Booth Visitors', value: '4,821', trend: '+12%', icon: Users },
          { label: 'Lead Conversions', value: '156', trend: '+8%', icon: BarChart },
          { label: 'Brand Impressions', value: '12.5k', trend: '+24%', icon: Star },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[40px] border border-[#E5E5E5] space-y-4"
          >
            <div className="flex justify-between items-start">
               <div className="p-3 bg-gray-50 rounded-2xl">
                 <stat.icon size={24} className="text-black" />
               </div>
               <span className="text-green-500 font-bold text-sm bg-green-50 px-2 py-1 rounded-lg">{stat.trend}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-4xl font-bold">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Managed Assets */}
        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-2xl font-bold border-b border-gray-200 pb-4">Virtual Booths</h2>
          
          <div className="space-y-4">
            {loading ? (
               <div className="h-40 bg-gray-100 animate-pulse rounded-[40px]" />
            ) : sponsorships.length === 0 ? (
              <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-gray-200 text-center space-y-6">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                    <Briefcase className="text-gray-300" size={32} />
                </div>
                <div>
                   <p className="text-xl font-bold">No Active Exhibitions</p>
                   <p className="text-gray-500 mt-2">Connect with the Assimilate.one team to sponsor upcoming CMEs.</p>
                </div>
                <button className="bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition-colors">
                  Browse Opportunities
                </button>
              </div>
            ) : (
                sponsorships.map(sponsoredEvent => (
                  <div key={sponsoredEvent.id} className="bg-white p-8 rounded-[40px] border border-[#E5E5E5] flex items-center justify-between group hover:shadow-xl transition-all">
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-gray-100 rounded-3xl overflow-hidden border border-gray-200 flex items-center justify-center text-gray-300">
                        {sponsoredEvent.logo ? <img src={sponsoredEvent.logo} className="w-full h-full object-cover" /> : <Briefcase size={32} />}
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold leading-tight group-hover:text-blue-600 transition-colors">{sponsoredEvent.name}</h3>
                        <p className="text-gray-500 font-medium">Sponsoring: Cardiology Masterclass 2024</p>
                        <div className="flex gap-4 mt-3">
                           <span className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                             <Globe size={12} /> Website
                           </span>
                           <span className="flex items-center gap-1 text-xs font-bold text-gray-400 uppercase tracking-widest leading-none">
                             <FileText size={12} /> Brochure
                           </span>
                        </div>
                      </div>
                    </div>
                    <button className="p-4 bg-gray-50 rounded-full text-gray-300 hover:text-black group-hover:bg-black group-hover:text-white transition-all">
                      <ChevronRight size={24} />
                    </button>
                  </div>
                ))
            )}
          </div>
        </div>

        {/* Lead Sidebar */}
        <div className="space-y-8">
           <h2 className="text-2xl font-bold border-b border-gray-200 pb-4">Recent Leads</h2>
           <div className="bg-white rounded-[40px] border border-[#E5E5E5] overflow-hidden">
              <div className="p-6 divide-y divide-gray-100">
                {[
                  { n: 'Dr. Sarah Jenkins', d: 'Requested Brochure', t: '5m ago' },
                  { n: 'Dr. Mark Wilson', d: 'Clicked Website', t: '12m ago' },
                  { n: 'Clinical Team X', d: 'Interacted with Booth', t: '1h ago' },
                ].map((lead, i) => (
                  <div key={i} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div>
                      <p className="font-bold">{lead.n}</p>
                      <p className="text-sm text-gray-500 font-medium">{lead.d}</p>
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{lead.t}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 p-4 border-t border-gray-100">
                <button className="w-full text-sm font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:text-blue-600 transition-colors">
                  Export Leads <FileText size={16} />
                </button>
              </div>
           </div>

           <div className="bg-blue-600 text-white p-8 rounded-[40px] space-y-4">
              <div className="p-3 bg-white/10 rounded-2xl w-fit backdrop-blur-md">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-2xl font-bold leading-tight">Live Chat Inquiries</h3>
              <p className="text-blue-100 text-sm leading-relaxed">
                You have 4 unread messages from potential CME partners. Respond now to secure the relationship.
              </p>
              <button className="w-full bg-white text-blue-600 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors">
                View Conversations
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
