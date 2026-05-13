import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, doc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { Edit3, Plus, Trash2, CheckCircle2, UploadCloud, Loader2 } from 'lucide-react';
import { Certificate, CertificateLayoutData } from './Certificate';
import { toast } from 'sonner';

export function CertificateDesigner() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingBrand, setUploadingBrand] = useState(false);
  const [uploadingSponsor, setUploadingSponsor] = useState(false);

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'default',
    sponsorId: '',
    layoutData: {
      brandLogoUrl: '',
      brandLogoPos: { x: 50, y: 50 },
      sponsorLogoUrl: '',
      sponsorLogoPos: { x: 150, y: 50 },
      customText: '',
      customTextPos: { x: 200, y: 200 },
      customTextFontSize: 18
    } as CertificateLayoutData
  });

  const fetchTemplates = async () => {
    try {
      const snap = await getDocs(collection(db, 'certificate_templates'));
      setTemplates(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
       console.error(e);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await addDoc(collection(db, 'certificate_templates'), {
        ...newTemplate,
        createdAt: new Date().toISOString()
      });
      toast.success('Template saved successfully!');
      setIsCreating(false);
      fetchTemplates();
    } catch (e) {
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'certificate_templates', id));
      toast.success('Deleted');
      fetchTemplates();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'brand' | 'sponsor') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'brand') setUploadingBrand(true);
    else setUploadingSponsor(true);

    try {
      const storageRef = ref(storage, `certificates/logos/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      
      setNewTemplate(prev => ({
        ...prev,
        layoutData: {
          ...prev.layoutData,
          [type === 'brand' ? 'brandLogoUrl' : 'sponsorLogoUrl']: url
        }
      }));
      toast.success('Logo uploaded!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to upload image. Ensure storage is reachable.');
    } finally {
      if (type === 'brand') setUploadingBrand(false);
      else setUploadingSponsor(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[32px] border border-[#E5E5E5] overflow-hidden shadow-sm">
        <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
          <h2 className="font-bold text-lg">Certificate Templates</h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="px-6 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2"
          >
            <Plus size={16} />
            Create Template
          </button>
        </div>

        {isCreating ? (
          <form onSubmit={handleSave} className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Template Name</label>
                  <input type="text" required value={newTemplate.name} onChange={e => setNewTemplate({...newTemplate, name: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
               </div>
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Type</label>
                  <select value={newTemplate.type} onChange={e => setNewTemplate({...newTemplate, type: e.target.value})} className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all">
                     <option value="default">Default</option>
                     <option value="custom">Custom</option>
                     <option value="sponsor">Sponsored</option>
                  </select>
               </div>
               
               <div className="col-span-2">
                  <h4 className="font-bold text-sm text-gray-700 mb-2 border-b pb-2">Layout Configuration (Drag elements below to position)</h4>
               </div>

               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                     <span>Brand Logo URL (optional)</span>
                     <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                       {uploadingBrand ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                       <span className="group-hover:underline">Upload</span>
                       <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'brand')} />
                     </label>
                  </label>
                  <input type="url" placeholder="https://.../logo.png" value={newTemplate.layoutData.brandLogoUrl || ''} onChange={e => setNewTemplate({...newTemplate, layoutData: { ...newTemplate.layoutData, brandLogoUrl: e.target.value }})} className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
               </div>

               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                     <span>Sponsor Logo URL (optional)</span>
                     <label className="cursor-pointer text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
                       {uploadingSponsor ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                       <span className="group-hover:underline">Upload</span>
                       <input type="file" accept="image/*" className="hidden" onChange={e => handleFileUpload(e, 'sponsor')} />
                     </label>
                  </label>
                  <input type="url" placeholder="https://.../sponsor.png" value={newTemplate.layoutData.sponsorLogoUrl || ''} onChange={e => setNewTemplate({...newTemplate, layoutData: { ...newTemplate.layoutData, sponsorLogoUrl: e.target.value }})} className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
               </div>

               <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Custom Text (optional)</label>
                  <input type="text" placeholder="e.g. In partnership with..." value={newTemplate.layoutData.customText || ''} onChange={e => setNewTemplate({...newTemplate, layoutData: { ...newTemplate.layoutData, customText: e.target.value }})} className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
               </div>
               
               <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Custom Text Font Size</label>
                  <input type="number" min="10" max="60" value={newTemplate.layoutData.customTextFontSize || 18} onChange={e => setNewTemplate({...newTemplate, layoutData: { ...newTemplate.layoutData, customTextFontSize: Number(e.target.value) }})} className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
               </div>
            </div>

            <div className="mt-8 border border-gray-200 rounded-2xl overflow-hidden p-8 bg-gray-50">
               <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Preview & Edit Layout</h3>
               <p className="text-xs text-gray-500 mb-4 bg-white p-3 rounded-lg border border-gray-200">Drag any added logos or custom text below to adjust their placement on the certificate template.</p>
               <div className="flex justify-center scale-75 origin-top relative z-10 isolate">
                 <Certificate 
                   studentName="John Doe"
                   caseTitle="Sample Case Discussion"
                   cmeCredits={1.5}
                   date="MAY 12, 2026"
                   qrCodeUrl="https://assimilate.one"
                   layoutData={newTemplate.layoutData}
                   onLayoutUpdate={(data) => setNewTemplate({ ...newTemplate, layoutData: data })}
                   mode="preview"
                 />
               </div>
            </div>

            <div className="flex justify-end gap-3 pt-6">
               <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 rounded-xl font-bold text-xs bg-gray-100 hover:bg-gray-200">Cancel</button>
               <button type="submit" disabled={loading} className="px-6 py-3 rounded-xl font-bold text-xs bg-indigo-600 text-white hover:bg-indigo-700">{loading ? 'Saving...' : 'Save Template'}</button>
            </div>
          </form>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map(t => (
                <div key={t.id} className="border border-gray-200 rounded-2xl p-6 relative group">
                   <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleDelete(t.id)} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100"><Trash2 size={16} /></button>
                   </div>
                   <div className="flex items-center gap-2 mb-2">
                     <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${t.type === 'default' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>{t.type}</span>
                   </div>
                   <h3 className="font-bold text-lg">{t.name}</h3>
                   {t.layoutData?.sponsorLogoUrl && (
                      <div className="mt-4"><img src={t.layoutData.sponsorLogoUrl} className="h-8 object-contain" alt="Sponsor" /></div>
                   )}
                </div>
              ))}
              {templates.length === 0 && <div className="col-span-full py-12 text-center text-gray-500">No templates found</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
