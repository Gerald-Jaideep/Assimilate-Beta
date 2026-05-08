import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, BarChart, Users, Star, MessageSquare, ChevronRight, Globe, FileText, Upload, Plus, X, ShieldCheck, Clock, Layers, Filter, CheckCircle, Sparkles, DollarSign, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { cn } from '../lib/utils';

export default function SponsorDashboard() {
  const { user } = useAuth();
  const [sponsorships, setSponsorships] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [sponsorDetails, setSponsorDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'arena' | 'opportunities' | 'assets'>('arena');
  const [isBuying, setIsBuying] = useState<any>(null);

  useEffect(() => {
    async function fetchData() {
      if (!user) return;
      setLoading(true);
      try {
        // Fetch Sponsor Profile
        const sponsorSnap = await getDocs(query(collection(db, 'sponsors'), where('assignedUserIds', 'array-contains', user.uid)));
        if (!sponsorSnap.empty) {
          const sDoc = sponsorSnap.docs[0];
          setSponsorDetails({ id: sDoc.id, ...sDoc.data() });
          
          // Fetch Sponsorships for this sponsor
          const shipSnap = await getDocs(query(collection(db, 'sponsorships'), where('sponsorId', '==', sDoc.id)));
          setSponsorships(shipSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        }

        // Fetch Packages
        const pkgSnap = await getDocs(collection(db, 'sponsorship_packages'));
        setPackages(pkgSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [user]);

  const handleAssetUpload = async (type: 'logo' | 'banner' | 'brochure', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sponsorDetails) return;

    try {
      const { uploadFile } = await import('../services/storageService');
      const url = await uploadFile(file, `sponsors/${sponsorDetails.id}/${type}_${Date.now()}_${file.name}`);
      
      const updates: any = {};
      if (type === 'logo') updates.logoUrl = url;
      if (type === 'banner') updates.bannerImageUrl = url;
      if (type === 'brochure') {
        const currentAssets = sponsorDetails.assets || [];
        updates.assets = [...currentAssets, { name: file.name, url, type: 'brochure', uploadedAt: new Date().toISOString() }];
      }

      await updateDoc(doc(db, 'sponsors', sponsorDetails.id), updates);
      setSponsorDetails((prev: any) => ({ ...prev, ...updates }));
      toast.success(`${type} uploaded successfully`);
    } catch (err) {
      toast.error("Upload failed");
    }
  };

  const purchaseSponsorship = async (pkg: any) => {
    if (!sponsorDetails) {
       toast.error("Sponsor profile not found. Contact administrator.");
       return;
    }
    
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + (pkg.durationMonths || 3));

      const payload = {
        sponsorId: sponsorDetails.id,
        sponsorName: sponsorDetails.name,
        packageId: pkg.id,
        packageName: pkg.name,
        costPaid: pkg.cost,
        status: 'active',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        targetType: 'multiple_sessions', // Default for now
        createdAt: new Date().toISOString(),
        metrics: { views: 0, brochureDownloads: 0, websiteClicks: 0 }
      };

      await addDoc(collection(db, 'sponsorships'), payload);
      toast.success(`Purchased ${pkg.name}! Redirecting to setup...`);
      setIsBuying(null);
      // Refresh
      const shipSnap = await getDocs(query(collection(db, 'sponsorships'), where('sponsorId', '==', sponsorDetails.id)));
      setSponsorships(shipSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      toast.error("Purchase failed");
    }
  };

  return (
    <div className="space-y-12">
      <header className="flex items-end justify-between border-b border-gray-200 pb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic">Sponsor Arena</h1>
          <p className="text-gray-500 font-medium mt-1">Maximize your brand visibility and lead generation.</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="flex bg-gray-100 p-1.5 rounded-2xl">
              <button onClick={() => setActiveTab('arena')} className={cn("px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'arena' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-black")}>Dashboard</button>
              <button onClick={() => setActiveTab('opportunities')} className={cn("px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'opportunities' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-black")}>Inventory</button>
              <button onClick={() => setActiveTab('assets')} className={cn("px-6 py-2 text-xs font-black uppercase tracking-widest rounded-xl transition-all", activeTab === 'assets' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-black")}>Creative Assets</button>
           </div>
          <div className="bg-green-50 text-green-600 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Active Partnerships
          </div>
        </div>
      </header>

      {activeTab === 'arena' ? (
        <>
          {/* Analytics Snapshot */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Booth Visitors', value: '4,821', trend: '+12%', icon: Users, color: 'text-indigo-500' },
              { label: 'Lead Conversions', value: '156', trend: '+8%', icon: BarChart, color: 'text-emerald-500' },
              { label: 'Brand Impressions', value: '12.5k', trend: '+24%', icon: Star, color: 'text-amber-500' },
              { label: 'ROI Efficiency', value: '4.2x', trend: '+5%', icon: Rocket, color: 'text-rose-500' },
            ].map((stat, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white p-6 rounded-[32px] border border-[#E5E5E5] space-y-4"
              >
                <div className="flex justify-between items-start">
                   <div className={cn("p-3 bg-gray-50 rounded-2xl", stat.color)}>
                     <stat.icon size={20} />
                   </div>
                   <span className="text-green-500 font-bold text-[10px] bg-green-50 px-2 py-1 rounded-lg uppercase tracking-widest">{stat.trend}</span>
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">{stat.label}</p>
                  <p className="text-3xl font-black italic tracking-tighter mt-1">{stat.value}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Active Inventory */}
            <div className="lg:col-span-2 space-y-8">
              <h2 className="text-xl font-black uppercase italic tracking-tighter border-b border-gray-100 pb-4">Active & Expiring Inventory</h2>
              
              <div className="space-y-4">
                {loading ? (
                   <div className="h-40 bg-gray-100 animate-pulse rounded-[40px]" />
                ) : sponsorships.length === 0 ? (
                  <div className="bg-white p-12 rounded-[40px] border-2 border-dashed border-gray-200 text-center space-y-6">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                        <Briefcase className="text-gray-300" size={32} />
                    </div>
                    <div>
                       <p className="text-xl font-bold">No Active Sponsorships</p>
                       <p className="text-gray-500 mt-2 font-medium">Browse the opportunities arena to claim upcoming session slots.</p>
                    </div>
                    <button onClick={() => setActiveTab('opportunities')} className="bg-black text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center gap-2 mx-auto">
                      Explore Slotted Opportunities <ChevronRight size={18} />
                    </button>
                  </div>
                ) : (
                    sponsorships.map(ship => {
                      const daysLeft = differenceInDays(new Date(ship.endDate), new Date());
                      return (
                        <div key={ship.id} className="bg-white p-8 rounded-[40px] border border-[#E5E5E5] flex items-center justify-between group hover:shadow-2xl transition-all">
                          <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-indigo-50 rounded-3xl overflow-hidden border border-indigo-100 flex items-center justify-center text-indigo-500">
                               <ShieldCheck size={32} />
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black uppercase italic tracking-tighter leading-tight group-hover:text-indigo-600 transition-colors">{ship.packageName}</h3>
                                {daysLeft < 15 && (
                                  <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-3 py-1 rounded-full animate-pulse border border-rose-100">EXPIRING SOON</span>
                                )}
                              </div>
                              <p className="text-gray-500 font-bold text-sm">Target: {ship.targetType.replace('_', ' ')} • Status: {ship.status}</p>
                              <div className="flex gap-4 mt-3">
                                 <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                   <Clock size={12} /> {daysLeft} Days Remaining
                                 </span>
                                 <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                   <Layers size={12} /> ROI: {((ship.metrics?.views || 0) * 0.5).toFixed(1)}%
                                 </span>
                              </div>
                            </div>
                          </div>
                          <button className="p-4 bg-gray-50 rounded-full text-gray-300 hover:text-black group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-sm">
                            <ChevronRight size={24} />
                          </button>
                        </div>
                      );
                    })
                )}
              </div>
            </div>

            {/* Lead Sidebar */}
            <div className="space-y-8">
               <h2 className="text-xl font-black uppercase italic tracking-tighter border-b border-gray-100 pb-4">Live Engagement Feed</h2>
               <div className="bg-white rounded-[40px] border border-[#E5E5E5] overflow-hidden shadow-sm">
                  <div className="p-8 divide-y divide-gray-100">
                    {[
                      { n: 'Dr. Sarah Jenkins', d: 'Downloaded Brochure', t: '5m ago', icon: FileText },
                      { n: 'Dr. Mark Wilson', d: 'Interacted with Booth', t: '12m ago', icon: MessageSquare },
                      { n: 'Clinical Team X', d: 'Viewed Sponsored Case', t: '1h ago', icon: Star },
                    ].map((lead, i) => (
                      <div key={i} className="py-5 first:pt-0 last:pb-0 flex items-center justify-between group">
                        <div className="flex items-center gap-4">
                           <div className="p-2.5 bg-gray-50 rounded-xl text-gray-400 group-hover:text-indigo-600 transition-colors">
                              <lead.icon size={16} />
                           </div>
                           <div>
                             <p className="font-bold text-sm">{lead.n}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{lead.d}</p>
                           </div>
                        </div>
                        <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">{lead.t}</span>
                      </div>
                    ))}
                  </div>
                  <div className="bg-gray-50 p-6 border-t border-gray-100">
                    <button className="w-full text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:text-indigo-600 transition-all">
                      Export Intent Report <FileText size={16} />
                    </button>
                  </div>
               </div>

               <div className="bg-indigo-600 text-white p-10 rounded-[50px] space-y-6 shadow-2xl shadow-indigo-600/30 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-12 -mt-12" />
                  <div className="p-4 bg-white/20 rounded-3xl w-fit backdrop-blur-xl ring-1 ring-white/30">
                    <MessageSquare size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">Live Chat Inquiries</h3>
                    <p className="text-indigo-100 text-sm mt-2 font-medium opacity-80">
                      Engage directly with 12 Healthcare Professionals currently reviewing your brochures.
                    </p>
                  </div>
                  <button className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-50 transition-all shadow-xl">
                    Open Conversations
                  </button>
               </div>
            </div>
          </div>
        </>
      ) : activeTab === 'opportunities' ? (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black lowercase italic tracking-tighter underline decoration-double decoration-indigo-500 underline-offset-8">Available Sponsorship Slots</h2>
              <div className="flex gap-3">
                 {['Standard', 'Premium', 'Elite'].map(c => (
                   <button key={c} className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-600 transition-all">{c}</button>
                 ))}
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {packages.map(pkg => (
                <div key={pkg.id} className="bg-white p-10 rounded-[50px] border border-gray-100 space-y-8 flex flex-col hover:shadow-2xl transition-all relative overflow-hidden group">
                   {pkg.category === 'Elite' && <div className="absolute top-0 right-0 bg-amber-500 text-white px-8 py-2 font-black text-[9px] uppercase tracking-widest rotate-45 transform translate-x-8 translate-y-2">MOST POPULAR</div>}
                   <div className="space-y-2">
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{pkg.category} Package</p>
                      <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">{pkg.name}</h3>
                      <p className="text-sm text-gray-500 font-medium line-clamp-3">{pkg.description || 'Global visibility across multi-disciplinary CMEs with detailed lead reporting.'}</p>
                   </div>
                   
                   <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
                      <div className="flex justify-between items-end border-b border-gray-200 pb-4">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pricing</p>
                         <p className="text-3xl font-black tracking-tighter underline underline-offset-4 decoration-indigo-200">${pkg.cost.toLocaleString()}</p>
                      </div>
                      <div className="flex justify-between items-center">
                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</p>
                         <p className="font-black italic">{pkg.durationMonths} Months</p>
                      </div>
                   </div>

                   <div className="space-y-4 flex-1">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grant Benefits</p>
                      <ul className="space-y-3">
                         {(pkg.benefits || ['Live Q&A Sponsorship', 'Booth with Interactive Assets', 'Post-Event Lead Export', 'Global ROI Dashboard']).map((b: string, i: number) => (
                           <li key={i} className="flex items-center gap-3 text-xs font-bold text-gray-600">
                             <CheckCircle size={14} className="text-emerald-500 flex-shrink-0" /> {b}
                           </li>
                         ))}
                      </ul>
                   </div>

                   <button 
                     onClick={() => setIsBuying(pkg)}
                     className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-gray-800 transition-all shadow-xl group-hover:scale-[1.02] active:scale-95"
                   >
                     Claim this Slot
                   </button>
                </div>
              ))}
           </div>
        </div>
      ) : (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center justify-between border-b border-gray-100 pb-8">
              <div>
                <h2 className="text-3xl font-black lowercase italic tracking-tighter underline decoration-double decoration-emerald-500 underline-offset-8 leading-tight">Creative Asset Repository</h2>
                <p className="text-gray-400 font-medium text-sm mt-1">Manage standard brand creative and clinical brochures.</p>
              </div>
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                 <div className="bg-white p-10 rounded-[50px] border border-gray-100 space-y-8">
                    <h3 className="font-black text-xl italic tracking-tighter uppercase italic text-indigo-600">Standard Brand Assets</h3>
                    
                    <div className="grid grid-cols-2 gap-8">
                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Brand Logo (SVG/PNG)</p>
                          <div className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group">
                             {sponsorDetails?.logoUrl ? (
                               <img src={sponsorDetails.logoUrl} className="w-full h-full object-contain p-4 transition-transform group-hover:scale-110" />
                             ) : (
                               <Briefcase size={32} className="text-gray-200" />
                             )}
                             <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                                <Plus size={32} className="text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAssetUpload('logo', e)} />
                             </label>
                          </div>
                          <p className="text-[9px] text-gray-400 font-bold italic">Max 512x512px. Used for session identifiers.</p>
                       </div>

                       <div className="space-y-4">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banner Image (16:9)</p>
                          <div className="aspect-square bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden group">
                             {sponsorDetails?.bannerImageUrl ? (
                               <img src={sponsorDetails.bannerImageUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                             ) : (
                               <Upload size={32} className="text-gray-200" />
                             )}
                             <label className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer">
                                <Plus size={32} className="text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAssetUpload('banner', e)} />
                             </label>
                          </div>
                          <p className="text-[9px] text-gray-400 font-bold italic">Landscape orientation. Featured in event banners.</p>
                       </div>
                    </div>
                 </div>

                 <div className="bg-emerald-600 text-white p-12 rounded-[60px] space-y-6 relative overflow-hidden shadow-2xl shadow-emerald-600/30">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-12 -mt-12" />
                    <div className="p-3 bg-white/20 rounded-2xl w-fit ring-1 ring-white/30 backdrop-blur-md">
                       <Sparkles size={24} />
                    </div>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-tight">AI Asset Generator</h3>
                    <p className="text-emerald-100 font-medium leading-relaxed">
                       Unable to find a high-quality clinical visualization? Use our Gemini-powered engine to generate medically accurate illustrations for your booths.
                    </p>
                    <button className="w-full bg-white text-emerald-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-50 transition-all shadow-xl">
                       Open AI Creative Tool
                    </button>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="bg-white p-10 rounded-[50px] border border-gray-100 space-y-8 min-h-[500px] flex flex-col shadow-sm">
                    <div className="flex justify-between items-center border-b border-gray-50 pb-6">
                       <h3 className="font-black text-xl italic tracking-tighter uppercase italic text-gray-900">Clinical Brochures (PDF)</h3>
                       <label className="bg-black text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-gray-800 transition-all">
                          Add PDF
                          <input type="file" className="hidden" accept=".pdf" onChange={(e) => handleAssetUpload('brochure', e)} />
                       </label>
                    </div>

                    <div className="space-y-4 flex-1">
                       {sponsorDetails?.assets?.filter((a: any) => a.type === 'brochure').length > 0 ? (
                         sponsorDetails.assets.filter((a: any) => a.type === 'brochure').map((a: any, i: number) => (
                           <div key={i} className="p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center justify-between group">
                              <div className="flex items-center gap-4">
                                 <div className="p-3 bg-white rounded-2xl border border-gray-100 group-hover:scale-110 transition-transform">
                                    <FileText size={20} className="text-emerald-500" />
                                 </div>
                                 <div>
                                   <p className="font-black text-sm line-clamp-1">{a.name}</p>
                                   <p className="text-[10px] text-gray-400 font-bold uppercase">{format(new Date(a.uploadedAt), 'MMM d, yyyy')}</p>
                                 </div>
                              </div>
                              <a href={a.url} target="_blank" className="p-2.5 text-gray-300 hover:text-black transition-colors"><ChevronRight size={20} /></a>
                           </div>
                         ))
                       ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 text-gray-300">
                             <FileText size={48} className="opacity-20" />
                             <p className="text-xs font-bold uppercase tracking-widest">No Brochures Uploaded</p>
                         </div>
                       )}
                    </div>
                    
                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
                       <ShieldCheck className="text-amber-500 flex-shrink-0" size={20} />
                       <div className="space-y-1">
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Compliance Note</p>
                          <p className="text-[9px] text-amber-600/70 font-medium">Brochures are automatically gated by your sponsorship duration. Expired sponsorships will immediately disable all asset downloads for clinical audience members.</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Purchase Modal */}
      {isBuying && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-500">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[60px] w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-100"
           >
              <div className="p-12 space-y-8">
                 <div className="flex justify-between items-start">
                    <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[32px]">
                       <Briefcase size={40} />
                    </div>
                    <button onClick={() => setIsBuying(null)} className="p-3 hover:bg-gray-100 rounded-full transition-all"><X size={24} /></button>
                 </div>
                 
                 <div className="space-y-2">
                    <h3 className="text-4xl font-black uppercase italic tracking-tighter leading-tight italic">Initiate Educational Grant</h3>
                    <p className="text-gray-500 font-medium">Confirming purchase for <span className="text-black font-black uppercase underline decoration-indigo-200">{isBuying.name}</span></p>
                 </div>

                 <div className="bg-gray-50 rounded-[40px] p-8 space-y-6">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-6">
                       <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Investment</p>
                          <p className="text-4xl font-black tracking-tighter">${isBuying.cost.toLocaleString()}</p>
                       </div>
                       <div className="text-right">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coverage</p>
                          <p className="text-2xl font-black tracking-tighter italic">{isBuying.durationMonths} Months</p>
                       </div>
                    </div>
                    <div className="space-y-4">
                         <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 italic"><Sparkles size={12} className="text-amber-500" /> Package Inclusion</p>
                         <div className="grid grid-cols-2 gap-4">
                            {(isBuying.benefits || ['Interactive Virtual Booth', 'Live Session Hype Access', 'ROI Dashboard Access', 'Lead Export System']).map((b: string, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                 <CheckCircle size={14} className="text-emerald-500" /> {b}
                              </div>
                            ))}
                         </div>
                    </div>
                 </div>

                 <div className="flex gap-4">
                    <button 
                      onClick={() => purchaseSponsorship(isBuying)}
                      className="flex-1 bg-black text-white py-6 rounded-3xl font-black uppercase italic tracking-tighter text-lg hover:bg-gray-800 transition-all shadow-xl shadow-black/20"
                    >
                      Authorize Transaction 
                    </button>
                    <button onClick={() => setIsBuying(null)} className="px-10 bg-gray-100 text-gray-400 py-6 rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-gray-200 transition-all">Decline</button>
                 </div>

                 <p className="text-center text-[10px] text-gray-400 font-bold max-w-sm mx-auto">By authorizing, you agree to provide an unrestricted educational grant for the clinical content. Transaction will be billed to your corporate account on file.</p>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
