import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, deleteDoc, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { Celebration } from '../components/Celebration';
import { Plus, Settings, Video, FileText, BarChart3, ChevronRight, ChevronLeft, Sparkles, Loader2, PlayCircle, Globe, ShieldCheck, Users, X, Search, Image, CheckCircle2, Rocket, Calendar, Flag, Filter, RefreshCw, User, Trash2, Edit3, Mail, DollarSign } from 'lucide-react';
import { cn } from '../lib/utils';
import { generateDummyCases, generateCaseImage, generateCalendarEvents } from '../services/geminiService';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay, addDays, subDays, startOfWeek, endOfWeek, isToday as isDateToday, startOfQuarter, endOfQuarter, startOfYear, endOfYear, addYears, subYears, addQuarters, subQuarters } from 'date-fns';

import { MEDICAL_SPECIALIZATIONS, Specialization } from '../constants/specializations';
import { COUNTRIES } from '../constants/countries';

export default function InternalDashboard() {
  const { user } = useAuth();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const userPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [cases, setCases] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [speakerSearch, setSpeakerSearch] = useState('');
  const [showSpeakerResults, setShowSpeakerResults] = useState(false);
  const [specSearch, setSpecSearch] = useState('');
  const [showSpecResults, setShowSpecResults] = useState(false);
  const [isAddingSponsor, setIsAddingSponsor] = useState(false);
  const [activeTab, setActiveTab] = useState<'cases' | 'sponsors' | 'live' | 'users' | 'calendar'>('cases');
  const [wizardStep, setWizardStep] = useState(0); // 0 for type selection
  const [caseType, setCaseType] = useState<'live' | 'recorded' | 'structured' | null>(null);
  const [reviewerSearch, setReviewerSearch] = useState('');
  const [showReviewerResults, setShowReviewerResults] = useState(false);
  const [calendarView, setCalendarView] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [calendarDate, setCalendarDate] = useState(new Date(2026, 4, 1)); // Start at May 2026
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['IN', 'US', 'AE', 'AU']);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);
  const [editingCase, setEditingCase] = useState<any>(null);
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'confetti' | 'fireworks'>('confetti');
  const [userLoading, setUserLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');

  // Sponsors Form State
  const [newSponsor, setNewSponsor] = useState({
    name: '',
    logoUrl: '',
    bannerImageUrl: '',
    profile: '',
    website: '',
    disclaimer: '',
    preRollVideo: '',
    postRollVideo: ''
  });

  const [sponsorshipPackages, setSponsorshipPackages] = useState<any[]>([]);
  const [isAddingPackage, setIsAddingPackage] = useState(false);
  const [editingPackage, setEditingPackage] = useState<any>(null);
  const [activeSponsorships, setActiveSponsorships] = useState<any[]>([]);

  // Sponsorship Package Form State
  const [newPackage, setNewPackage] = useState({
    name: '',
    description: '',
    durationMonths: 3,
    cost: 5000,
    category: 'Standard',
    benefits: [] as string[]
  });

  useEffect(() => {
    async function fetchSponsors() {
      if (!user) return;
      try {
        const q = query(collection(db, 'sponsors'));
        const snapshot = await getDocs(q);
        setSponsors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching sponsors:", err);
      }
    }
    fetchSponsors();
  }, [user]);

  useEffect(() => {
    async function fetchSponsorshipData() {
      if (!user || activeTab !== 'sponsorships') return;
      try {
        const pkgSnap = await getDocs(collection(db, 'sponsorship_packages'));
        setSponsorshipPackages(pkgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        
        const shipSnap = await getDocs(collection(db, 'sponsorships'));
        setActiveSponsorships(shipSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching sponsorship data:", err);
      }
    }
    fetchSponsorshipData();
  }, [user, activeTab]);

  // Form State
  const [newCase, setNewCase] = useState({
    title: '',
    description: '',
    status: 'draft',
    accreditationPoints: 1.0,
    videoUrl: '',
    thumbnailUrl: '',
    specialty: 'Internal Medicine',
    presenterId: '',
    presenterName: '',
    presenterPhotoURL: '',
    presenterBio: '',
    presenterQualifications: '',
    presenterPublications: '',
    presenterDisclosures: '',
    presenterEmail: '',
    presenterPhone: '',
    presenterCountry: 'IN', // Use ISO code
    scheduledAt: '',
    googleMeetLink: '',
    speakerJoinLink: '',
    completionThreshold: 70, // Basic 70% requirement
    isSponsored: false,
    sponsorId: '',
    expiryDate: '',
    // Structured Clinical Data (CRF)
    clinicalData: {
      presentation: '',
      history: '',
      examination: '',
      investigations: [] as any[],
      differentialDiagnosis: [] as string[],
      management: '',
      outcome: '',
      observations: '',
    },
    reviewerId: '',
    reviewerName: '',
    reviewerPhotoURL: '',
    reviewerCredentials: '',
    reviewStatus: 'pending',
    clinicalPolicyAccepted: false
  });

  useEffect(() => {
    async function fetchSpeakers() {
      if (!user) return;
      try {
        const q = query(collection(db, 'users'));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        // Filter speakers in-memory to handle the array roles
        setSpeakers(data.filter((u: any) => 
          u.roles?.includes('speaker') || u.roles?.includes('internal') || u.role === 'speaker' || u.role === 'internal'
        ));
      } catch (err: any) {
        console.error("Error fetching speakers:", err);
      }
    }
    fetchSpeakers();
  }, [user]);

  useEffect(() => {
    async function fetchCalendarEvents() {
      if (!user) return;
      try {
        const snapshot = await getDocs(collection(db, 'calendar_events'));
        setCalendarEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error("Error fetching calendar events:", err);
      }
    }
    fetchCalendarEvents();
  }, [user]);

  const syncCalendarData = async () => {
    setIsSyncingCalendar(true);
    try {
      const events = await generateCalendarEvents();
      if (!events || events.length === 0) {
        throw new Error("No events returned from AI source.");
      }

      // Fetch fresh set of events to prevent duplication during a long sync
      const currentSnap = await getDocs(collection(db, 'calendar_events'));
      const currentEvents = currentSnap.docs.map(doc => doc.data());

      const writePromises = [];
      
      for (const event of events) {
        const isDuplicate = currentEvents.some(e => 
          e.name === event.name && 
          e.date === event.date && 
          e.country === event.country
        );

        if (!isDuplicate) {
          writePromises.push(addDoc(collection(db, 'calendar_events'), {
            ...event,
            syncedAt: new Date().toISOString()
          }));
        }
      }

      if (writePromises.length > 0) {
        await Promise.all(writePromises);
      }
      
      const finalizeSnap = await getDocs(collection(db, 'calendar_events'));
      setCalendarEvents(finalizeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      toast.success(`Synchronized ${writePromises.length} new events successfully!`);
    } catch (err) {
      console.error("Sync error details:", err);
      toast.error(`Failed to sync: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  const navigateCalendar = (direction: 'next' | 'prev') => {
    setCalendarDate(prev => {
      switch (calendarView) {
        case 'week': return direction === 'next' ? addDays(prev, 7) : subDays(prev, 7);
        case 'month': return direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1);
        case 'quarter': return direction === 'next' ? addQuarters(prev, 1) : subQuarters(prev, 1);
        case 'year': return direction === 'next' ? addYears(prev, 1) : subYears(prev, 1);
        default: return prev;
      }
    });
  };

  const toggleCountry = (code: string) => {
    setSelectedCountries(prev => 
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };
  useEffect(() => {
    async function fetchAllUsers() {
      if (activeTab !== 'users') return;
      setUserLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const data = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        // Sort by rank (hypothetically) - credits + watched
        data.sort((a: any, b: any) => {
          const scoreA = (a.stats?.creditPoints || 0) * 10 + (a.stats?.sessionsWatched || 0) + (a.stats?.hypePoints || 0);
          const scoreB = (b.stats?.creditPoints || 0) * 10 + (b.stats?.sessionsWatched || 0) + (b.stats?.hypePoints || 0);
          return scoreB - scoreA;
        });
        setAllUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      } finally {
        setUserLoading(false);
      }
    }
    fetchAllUsers();
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File is too large. Max 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setNewCase(prev => ({ ...prev, thumbnailUrl: base64 }));
      toast.success("Image uploaded successfully");
    };
    reader.readAsDataURL(file);
  };

  const handleUserPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("File is too large. Max 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      setEditingUser((prev: any) => ({ ...prev, photoURL: base64 }));
      toast.success("Profile photo updated");
    };
    reader.readAsDataURL(file);
  };

  const filteredSpeakers = speakers.filter(s => 
    s.displayName?.toLowerCase().includes(speakerSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(speakerSearch.toLowerCase())
  );

  const handleSpeakerSelect = (speaker: any) => {
    setNewCase(prev => ({
      ...prev,
      presenterId: speaker.uid,
      presenterName: speaker.displayName || '',
      presenterEmail: speaker.email || '',
      presenterPhone: speaker.phone || '',
      presenterPhotoURL: speaker.photoURL || '',
      presenterBio: speaker.bio || '',
      presenterQualifications: speaker.qualifications || '',
      presenterPublications: speaker.publications || '',
      presenterDisclosures: speaker.disclosures || '',
      presenterCountry: speaker.region || 'IN'
    }));
    setSpeakerSearch(speaker.displayName || '');
    setShowSpeakerResults(false);
  };

  const handleReviewerSelect = (reviewer: any) => {
    setNewCase(prev => ({
      ...prev,
      reviewerId: reviewer.uid,
      reviewerName: reviewer.displayName || '',
      reviewerPhotoURL: reviewer.photoURL || '',
      reviewerCredentials: `${reviewer.qualifications || ''} • Peer Reviewer`
    }));
    setReviewerSearch(reviewer.displayName || '');
    setShowReviewerResults(false);
  };

  const handleGenerateThumbnail = async () => {
    if (!newCase.title || !newCase.description) {
      setError("Please provide a title and narrative first to generate an accurate image.");
      return;
    }
    setIsGeneratingImage(true);
    try {
      const url = await generateCaseImage(newCase.title, newCase.description, newCase.specialty);
      if (url) {
        setNewCase(prev => ({ ...prev, thumbnailUrl: url }));
      } else {
        setError("AI Image generation failed. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate thumbnail.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  useEffect(() => {
    async function fetchCases() {
      if (!user) return;
      try {
        const userEmailLower = (user.email || '').toLowerCase();
        const isSuperAdmin = ['jaideep@assimilate.one', 'jaideep@medvarsity.com'].includes(userEmailLower);
        const q = isSuperAdmin 
          ? query(collection(db, 'cases'))
          : query(collection(db, 'cases'), where('presenterId', '==', user.uid));
          
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort in-memory to avoid index requirement
        data.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        setCases(data);
      } catch (err: any) {
        console.error("Error fetching cases:", err);
        setError(err.message || "Failed to load cases. Check permissions.");
      } finally {
        setLoading(false);
      }
    }
    fetchCases();
  }, [user]);

  const handleSeedData = async () => {
    if (!user || isSeeding) return;
    setIsSeeding(true);
    setError(null);
    try {
      const mockCases = await generateDummyCases(8);
      const addedCases: any[] = [];
      const { uploadBase64Image } = await import('../services/storageService');
      
      for (const caseData of mockCases) {
        // Generate a random speaker for each seeded case
        const speakerId = `speaker_${Math.random().toString(36).substr(2, 9)}`;
        const speakerData = {
          displayName: caseData.speakerName || 'Expert Clinician',
          email: `${caseData.speakerName?.toLowerCase().replace(/\s+/g, '.')}@medical-expert.com`,
          role: 'speaker',
          roles: ['speaker'],
          region: caseData.presenterCountry || 'US',
          bio: caseData.presenterBio || 'Renowned expert in their clinical field.',
          qualifications: caseData.presenterQualifications || 'MD, PhD',
          profileCompletion: 85,
          updatedAt: new Date().toISOString()
        };

        // Persist speaker
        await setDoc(doc(db, 'users', speakerId), speakerData);

        // Upload AI thumbnail if needed
        let finalThumb = 'https://images.unsplash.com/photo-1576091160550-217359f4ecf8?auto=format&fit=crop&q=80&w=2000';
        if (caseData.thumbnailUrl && caseData.thumbnailUrl.startsWith('data:image')) {
          try {
            finalThumb = await uploadBase64Image(caseData.thumbnailUrl, `cases/thumbs/seed_${Date.now()}.png`);
          } catch (e) {
            console.warn("Seeding image upload failed", e);
          }
        } else if (caseData.thumbnailUrl) {
          finalThumb = caseData.thumbnailUrl;
        }

        const payload = {
          ...caseData,
          presenterId: speakerId,
          thumbnailUrl: finalThumb,
          status: 'published',
          accreditation: { points: Number((Math.random() * 2 + 1).toFixed(1)), type: 'ACCME' },
          views: Math.floor(Math.random() * 8000),
          likes: Math.floor(Math.random() * 800),
          shares: Math.floor(Math.random() * 150),
          bookmarks: Math.floor(Math.random() * 300),
          createdAt: new Date().toISOString(),
        };

        const docRef = await addDoc(collection(db, 'cases'), payload);
        addedCases.push({ id: docRef.id, ...payload });
      }
      
      setCases(prev => [...addedCases, ...prev]);
      toast.success(`Successfully generated ${addedCases.length} realistic medical cases!`);
    } catch (err) {
      console.error("Seeding error:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSeeding(false);
    }
  };

  const handleClearAll = async () => {
    if (!user || isClearing) return;
    if (!confirm('Are you sure you want to delete ALL cases? This cannot be undone.')) return;
    
    setIsClearing(true);
    try {
      const q = query(collection(db, 'cases'));
      const snapshot = await getDocs(q);
      await Promise.all(snapshot.docs.map(d => deleteDoc(doc(db, 'cases', d.id))));
      setCases([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'cases');
    } finally {
      setIsClearing(false);
    }
  };

  const STANDARD_DISCLOSURE = "The speaker has not disclosed any relevant financial relationships with ineligible companies related to the content of this presentation. In accordance with AIRH’s commitment to transparency, accountability, and ethical integrity, all speakers are requested to disclose any financial relationships that could influence, or be perceived to influence, the content of their contributions. Where no disclosure information is provided, it is indicated as such.";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    setError(null);
    try {
      const finalPresenterId = newCase.presenterId || `speaker_${Date.now()}`;
      const finalPresenterName = newCase.presenterName || user.displayName || 'Anonymous Expert';

      // 1. Upload/Process Speaker Photo if it's base64 (omitted for brevity, assume URL for now or add input)
      // 2. Persist Speaker Details to 'users' collection for the Expert Pool
      const { uploadBase64Image } = await import('../services/storageService');
      
      // Handle AI Thumbnail Upload to Storage
      let finalThumbnail = newCase.thumbnailUrl;
      if (newCase.thumbnailUrl && newCase.thumbnailUrl.startsWith('data:image')) {
        const thumbPath = `cases/thumbs/${Date.now()}.png`;
        finalThumbnail = await uploadBase64Image(newCase.thumbnailUrl, thumbPath);
      }

      const finalDisclosures = (newCase as any).presenterDisclosures || STANDARD_DISCLOSURE;

      await setDoc(doc(db, 'users', finalPresenterId), {
        displayName: finalPresenterName || 'Anonymous Expert',
        email: newCase.presenterEmail || '',
        phone: newCase.presenterPhone || '',
        photoURL: newCase.presenterPhotoURL || '',
        bio: newCase.presenterBio || '',
        qualifications: newCase.presenterQualifications || '',
        publications: newCase.presenterPublications || '',
        disclosures: finalDisclosures || STANDARD_DISCLOSURE,
        region: newCase.presenterCountry || 'IN',
        role: 'speaker',
        roles: ['speaker'],
        profileCompletion: calculateProfileCompletion(newCase),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Find sponsor info if sponsored
      let sponsorDetails: any = {};
      if (newCase.isSponsored && newCase.sponsorId) {
        const sponsor = sponsors.find(s => s.id === newCase.sponsorId);
        if (sponsor) {
          sponsorDetails = {
            sponsorName: sponsor.name || '',
            sponsorLogo: sponsor.logoUrl || '',
            sponsorDisclaimer: sponsor.disclaimer || 'This educational session is supported by an unrestricted educational grant.'
          };
        }
      }

      const { accreditationPoints: _, ...rawCleanCase } = newCase;
      
      // Sanitizing cleanCase to remove undefined values
      const cleanCase: any = {};
      Object.keys(rawCleanCase).forEach(key => {
        const val = (rawCleanCase as any)[key];
        if (val !== undefined) {
          cleanCase[key] = val;
        } else {
          // If clinicalData, preserve structure
          if (key === 'clinicalData') {
             cleanCase[key] = val;
          } else {
             cleanCase[key] = ''; // Fallback to empty string for safety
          }
        }
      });

      const payload: any = {
        ...cleanCase,
        ...sponsorDetails,
        presenterDisclosures: finalDisclosures || STANDARD_DISCLOSURE,
        presenterId: finalPresenterId,
        presenterName: finalPresenterName,
        createdAt: editingCase ? editingCase.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        views: editingCase ? editingCase.views : 0,
        likes: editingCase ? editingCase.likes : 0,
        shares: editingCase ? editingCase.shares : 0,
        bookmarks: editingCase ? editingCase.bookmarks : 0,
        languages: ['English'],
        status: newCase.scheduledAt ? 'scheduled' : newCase.status,
        caseType: caseType || (newCase.scheduledAt ? 'live' : 'recorded'),
        accreditation: { 
          points: Number(newCase.accreditationPoints) || 1.0, 
          type: 'ACCME' 
        },
        thumbnailUrl: finalThumbnail || 'https://images.unsplash.com/photo-1576091160550-217359f4ecf8?auto=format&fit=crop&q=80&w=2000'
      };

      if (editingCase) {
        await setDoc(doc(db, 'cases', editingCase.id), payload);
        setCases(prev => prev.map(c => c.id === editingCase.id ? { id: c.id, ...payload } : c));
      } else {
        const docRef = await addDoc(collection(db, 'cases'), payload);
        setCases(prev => [{ id: docRef.id, ...payload }, ...prev]);
      }

      setIsCreating(false);
      setWizardStep(0);
      setCaseType(null);
      setEditingCase(null);
      resetForm();
      if (!editingCase) {
        setCelebrationType('confetti');
        setShowCelebration(true);
      }
      toast.success(editingCase ? "Case updated successfully!" : "Case published successfully!");
    } catch (err) {
      console.error("Submission error:", err);
      setError(err instanceof Error ? err.message : "Failed to save case. Please check your permissions.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setNewCase({ 
      title: '', 
      description: '', 
      status: 'published', 
      accreditationPoints: 1.0, 
      videoUrl: '', 
      thumbnailUrl: '', 
      specialty: 'Internal Medicine',
      presenterId: '',
      presenterName: '',
      presenterEmail: '',
      presenterPhone: '',
      presenterPhotoURL: '',
      presenterBio: '',
      presenterQualifications: '',
      presenterPublications: '',
      presenterDisclosures: '',
      presenterCountry: 'IN',
      scheduledAt: '',
      googleMeetLink: '',
      speakerJoinLink: '',
      completionThreshold: 70,
      isSponsored: false,
      sponsorId: '',
      expiryDate: '',
      clinicalData: {
        presentation: '',
        history: '',
        examination: '',
        investigations: [] as any[],
        differentialDiagnosis: [] as string[],
        management: '',
        outcome: '',
        observations: '',
      },
      reviewerId: '',
      reviewerName: '',
      reviewerPhotoURL: '',
      reviewerCredentials: '',
      reviewStatus: 'pending',
      clinicalPolicyAccepted: false
    });
    setSpeakerSearch('');
    setReviewerSearch('');
  };

  const calculateProfileCompletion = (data: any) => {
    const fields = [
      data.presenterName, data.presenterEmail, data.presenterPhotoURL, 
      data.presenterBio, data.presenterQualifications, data.presenterCountry
    ];
    const filled = fields.filter(f => !!f).length;
    return Math.round((filled / fields.length) * 100);
  };

  const toggleUserRole = async (userId: string, targetRole: string) => {
    try {
      const userToUpdate = allUsers.find(u => u.uid === userId);
      if (!userToUpdate) return;

      const currentRoles = userToUpdate.roles || [userToUpdate.role || 'audience'];
      let newRoles;
      if (currentRoles.includes(targetRole)) {
        newRoles = currentRoles.filter((r: string) => r !== targetRole);
      } else {
        newRoles = [...currentRoles, targetRole];
      }

      if (newRoles.length === 0) newRoles = ['audience']; // Fallback
      
      const primaryRole = newRoles.includes('internal') ? 'internal' : 
                         newRoles.includes('speaker') ? 'speaker' : 
                         newRoles.includes('sponsor') ? 'sponsor' : 'audience';

      await updateDoc(doc(db, 'users', userId), { 
        roles: newRoles,
        role: primaryRole // Sync for security rules
      });
      setAllUsers(prev => prev.map(u => u.uid === userId ? { ...u, roles: newRoles, role: primaryRole } : u));
    } catch (err) {
      console.error("Error updating user role:", err);
    }
  };

  const handleEdit = (c: any) => {
    setEditingCase(c);
    setNewCase(prev => ({
      ...prev,
      ...c,
      accreditationPoints: c.accreditation?.points || c.accreditationPoints || 1.0
    }));
    setSpeakerSearch(c.presenterName || '');
    setIsCreating(true);
  };

  const handleDeleteCase = async (caseId: string) => {
    if (!confirm('Are you sure you want to delete this case presentation?')) return;
    try {
      await deleteDoc(doc(db, 'cases', caseId));
      setCases(prev => prev.filter(c => c.id !== caseId));
      toast.success("Case deleted successfully");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cases/${caseId}`);
    }
  };

  const [editingSponsor, setEditingSponsor] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isEditingUserModal, setIsEditingUserModal] = useState(false);

  const handleEditSponsor = (s: any) => {
    setEditingSponsor(s);
    setNewSponsor({
      name: s.name || '',
      logoUrl: s.logoUrl || '',
      bannerImageUrl: s.bannerImageUrl || '',
      profile: s.profile || '',
      website: s.website || '',
      disclaimer: s.disclaimer || '',
      preRollVideo: s.preRollVideo || '',
      postRollVideo: s.postRollVideo || ''
    });
    setIsAddingSponsor(true);
  };

  const handleDeleteSponsor = async (sponsorId: string) => {
    if (!confirm('Are you sure you want to remove this sponsor partner?')) return;
    try {
      await deleteDoc(doc(db, 'sponsors', sponsorId));
      setSponsors(prev => prev.filter(s => s.id !== sponsorId));
      toast.success("Sponsor removed successfully");
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `sponsors/${sponsorId}`);
    }
  };

  const handleSponsorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sponsorData = {
        ...newSponsor,
        updatedAt: new Date().toISOString(),
        createdAt: editingSponsor ? editingSponsor.createdAt : new Date().toISOString()
      };

      if (editingSponsor) {
        await updateDoc(doc(db, 'sponsors', editingSponsor.id), sponsorData);
        setSponsors(prev => prev.map(s => s.id === editingSponsor.id ? { id: s.id, ...sponsorData } : s));
        toast.success("Sponsor updated successfully!");
      } else {
        const docRef = await addDoc(collection(db, 'sponsors'), sponsorData);
        setSponsors(prev => [...prev, { id: docRef.id, ...sponsorData }]);
        toast.success("Sponsor onboarded successfully!");
      }
      
      setIsAddingSponsor(false);
      setEditingSponsor(null);
      setNewSponsor({
        name: '', logoUrl: '', bannerImageUrl: '', profile: '', website: '', disclaimer: '', preRollVideo: '', postRollVideo: ''
      });
    } catch (err) {
      console.error("Error saving sponsor:", err);
      setError("Failed to save sponsor partner details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePackageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const data = {
        ...newPackage,
        createdAt: editingPackage ? editingPackage.createdAt : new Date().toISOString()
      };
      if (editingPackage) {
        await setDoc(doc(db, 'sponsorship_packages', editingPackage.id), data);
      } else {
        await addDoc(collection(db, 'sponsorship_packages'), data);
      }
      toast.success("Package saved successfully");
      setIsAddingPackage(false);
      setEditingPackage(null);
      // Refresh
      const pkgSnap = await getDocs(collection(db, 'sponsorship_packages'));
      setSponsorshipPackages(pkgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
      toast.error("Failed to save package");
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateROI = (sponsorship: any) => {
    const cost = sponsorship.costPaid || 0;
    const views = sponsorship.metrics?.views || 0;
    const downloads = sponsorship.metrics?.brochureDownloads || 0;
    const clicks = sponsorship.metrics?.websiteClicks || 0;
    
    // Abstract weighting for ROI score
    const score = (views * 0.1) + (downloads * 5) + (clicks * 2);
    if (cost === 0) return score;
    return (score / cost) * 100;
  };

  return (
    <div className="space-y-8">
      <Celebration active={showCelebration} onComplete={() => setShowCelebration(false)} type={celebrationType} />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Case Presentation Manager</h1>
          <p className="text-gray-500 font-medium mt-1">Manage expert medical case presentations and series.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl mr-4">
            <button 
              onClick={() => setActiveTab('cases')}
              className={cn("px-4 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'cases' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Cases
            </button>
            <button 
              onClick={() => setActiveTab('sponsors')}
              className={cn("px-4 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'sponsors' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Sponsor Partners
            </button>
            <button 
              onClick={() => setActiveTab('sponsorships')}
              className={cn("px-4 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'sponsorships' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Sponsorship CMS
            </button>
            <button 
              onClick={() => setActiveTab('users')}
              className={cn("px-4 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'users' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Users & Ranking
            </button>
            <button 
              onClick={() => setActiveTab('calendar')}
              className={cn("px-4 py-2 text-sm font-bold rounded-lg transition-all", activeTab === 'calendar' ? "bg-white text-black shadow-sm" : "text-gray-500 hover:text-black")}
            >
              Event Calendar
            </button>
          </div>
          {activeTab === 'cases' && (
            <div className="flex items-center gap-4">
              {user?.email && ['jaideep@assimilate.one', 'jaideep@medvarsity.com'].includes(user.email) && (
                <>
                  <button 
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-xl font-bold hover:bg-red-100 transition-all disabled:opacity-50"
                  >
                    {isClearing ? <Loader2 size={18} className="animate-spin" /> : <span>Clear All</span>}
                  </button>
                  <button 
                    onClick={handleSeedData}
                    disabled={isSeeding}
                    className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-100 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSeeding ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
                    <span>Generate Expert Cases</span>
                  </button>
                </>
              )}
              <button 
                onClick={() => {
                  setEditingCase(null);
                  resetForm();
                  setIsCreating(true);
                }}
                className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-bold hover:bg-gray-800 transition-all active:scale-95"
              >
                <Plus size={20} />
                <span>Upload New Case</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {error && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] w-full max-w-2xl animate-in slide-in-from-top duration-300 px-6">
          <div className="bg-red-600/95 backdrop-blur-xl border border-red-500 text-white p-5 rounded-2xl font-bold text-sm flex items-center justify-between shadow-2xl shadow-red-600/40">
            <span className="flex items-center gap-3">
              <ShieldCheck size={20} className="text-red-200" />
              {error}
            </span>
            <button onClick={() => setError(null)} className="ml-6 bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {activeTab === 'cases' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Published Cases', value: cases.length, icon: PlayCircle, color: 'text-indigo-500' },
          { label: 'Total Learning Views', value: '18.4K', icon: Users, color: 'text-emerald-500' },
          { label: 'CME Credits Issued', value: '2,840', icon: ShieldCheck, color: 'text-amber-500' },
          { label: 'Avg Assessment Score', value: '84%', icon: BarChart3, color: 'text-rose-500' },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white p-6 rounded-2xl border border-[#E5E5E5] space-y-2 shadow-sm"
          >
            <div className={cn("p-2 rounded-lg w-fit bg-gray-50", stat.color)}>
              <stat.icon size={20} />
            </div>
            <p className="text-xs font-bold text-gray-400 tracking-widest">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[32px] border border-[#E5E5E5] overflow-hidden shadow-sm">
          <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
            <h2 className="font-bold text-lg">Case Library</h2>
            <div className="flex gap-4">
              <button className="text-xs font-bold tracking-wider text-indigo-600 border-b-2 border-indigo-600 pb-1">All Cases</button>
              <button className="text-xs font-bold tracking-wider text-gray-400 hover:text-black">Sponsored</button>
              <button className="text-xs font-bold tracking-wider text-gray-400 hover:text-black hover:underline underline-offset-4">Series</button>
            </div>
          </div>
          <div className="divide-y divide-[#E5E5E5]">
            {loading ? (
              <div className="p-12 text-center text-gray-400 font-medium flex items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" /> Loading library...
              </div>
            ) : cases.length === 0 ? (
              <div className="p-12 text-center text-gray-400 font-medium font-mono text-sm tracking-tighter">No cases found in library.</div>
            ) : (
              cases.map((c) => (
                <div key={c.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between group cursor-pointer border-l-4 border-l-transparent hover:border-l-indigo-600">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-12 bg-gray-100 rounded-lg overflow-hidden relative border border-gray-100">
                      {c.thumbnailUrl ? (
                         <img src={c.thumbnailUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Video size={20} />
                        </div>
                      )}
                      {c.isSponsored && <div className="absolute top-0 right-0 bg-amber-400 text-[8px] font-bold px-1 py-0.5 rounded-bl">AD</div>}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base leading-tight group-hover:text-indigo-600 transition-colors">{c.title}</h3>
                        {c.presenterCountry && (
                          <img 
                            src={`https://flagsapi.com/${c.presenterCountry}/flat/32.png`} 
                            alt={c.presenterCountry} 
                            className="w-4 h-4 rounded-sm"
                            title={c.presenterCountry}
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 font-medium mt-0.5">{c.presenterName} • {c.caseType === 'live' ? 'LIVE' : 'RECORDED'} • {c.accreditation?.points} pt</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-wrap gap-1">
                       {c.languages?.slice(0,2).map((l: string) => <Globe key={l} size={14} className="text-gray-300" />)}
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(c);
                        }}
                        className="p-2 text-gray-400 hover:text-indigo-600 transition-colors rounded-lg hover:bg-white"
                        title="Edit Case"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCase(c.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-white"
                        title="Delete Case"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <ChevronRight size={18} className="text-gray-300" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-indigo-600 text-white p-8 rounded-[32px] space-y-4 shadow-xl">
            <h3 className="text-2xl font-bold leading-tight tracking-tight">Accreditation Simplified</h3>
            <p className="text-indigo-100 text-sm leading-relaxed font-medium">
              Upload your case videos and set up assessments. Upon completion, we automatically issue certificates and ACCME credits.
            </p>
            <button className="w-full bg-white text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all hover:scale-[1.02] active:scale-95">
              Request Peer Review
            </button>
          </div>
          
          <div className="bg-white p-6 rounded-[32px] border border-[#E5E5E5] space-y-4 shadow-sm">
            <h3 className="font-bold text-gray-900">Platform Readiness</h3>
            <div className="space-y-3">
              {[
                { t: 'Multi-language Engine', c: true },
                { t: 'Video Transcoding', c: true },
                { t: 'ACCME API Sync', c: false },
                { t: 'Sponsor Ad Integration', c: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm font-medium">
                  <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center", item.c ? "bg-green-500 border-green-600 text-white" : "border-gray-200")}>
                    {item.c && <Plus size={12} className="rotate-45" />}
                  </div>
                  <span className={item.c ? "text-gray-400 line-through" : "text-gray-700"}>{item.t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
      ) : activeTab === 'users' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-[#E5E5E5] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[#E5E5E5] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg">User Management & Leaderboard</h2>
                <p className="text-xs text-gray-500 font-medium italic">Ranked by activity: (Credits * 10) + Views + Hypes</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <select 
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-sm focus:outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="audience">Audience</option>
                  <option value="speaker">Speakers</option>
                  <option value="sponsor">Sponsors</option>
                  <option value="internal">Team</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 tracking-widest">Rank</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 tracking-widest">User</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 tracking-widest">Profile</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 tracking-widest">Activity Score</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 tracking-widest">Access Roles</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {userLoading ? (
                    <tr><td colSpan={5} className="p-12 text-center text-gray-400">Loading users...</td></tr>
                  ) : allUsers
                      .filter(u => {
                        const search = userSearch.toLowerCase();
                        const name = (u.displayName || '').toLowerCase();
                        const email = (u.email || '').toLowerCase();
                        return search === '' || name.includes(search) || email.includes(search);
                      })
                      .filter(u => userRoleFilter === 'all' || (u.roles || [u.role]).includes(userRoleFilter))
                      .map((u, i) => {
                        const score = (u.stats?.creditPoints || 0) * 10 + (u.stats?.sessionsWatched || 0) + (u.stats?.hypePoints || 0);
                        const roles = u.roles || [u.role || 'audience'];
                        
                        return (
                          <tr key={u.uid} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4">
                              <span className={cn(
                                "w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold",
                                i === 0 ? "bg-amber-100 text-amber-700" : 
                                i === 1 ? "bg-gray-100 text-gray-700" :
                                i === 2 ? "bg-orange-100 text-orange-700" : "text-gray-400"
                              )}>
                                {i + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                                  <img src={u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`} alt="" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-bold text-gray-900 truncate">{u.displayName || 'Anonymous User'}</p>
                                  <p className="text-[10px] font-medium text-gray-400 truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="h-1 w-20 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                      "h-full transition-all duration-1000",
                                      (u.profileCompletion || 0) > 80 ? "bg-emerald-500" :
                                      (u.profileCompletion || 0) > 40 ? "bg-amber-500" : "bg-rose-500"
                                    )}
                                    style={{ width: `${u.profileCompletion || 0}%` }}
                                  />
                                </div>
                                <span className="text-[10px] font-bold text-gray-500">{u.profileCompletion || 0}% Complete</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-indigo-500 rounded-full" 
                                    style={{ width: `${Math.min(100, (score / 100) * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-indigo-600">{score.toLocaleString()}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {['audience', 'speaker', 'sponsor', 'internal', 'admin'].map(role => (
                                  <button 
                                    key={role}
                                    onClick={() => toggleUserRole(u.uid, role)}
                                    className={cn(
                                      "px-2 py-0.5 rounded text-[8px] font-bold transition-all tracking-tighter",
                                      roles.includes(role) 
                                        ? "bg-indigo-600 text-white shadow-sm" 
                                        : "bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100"
                                    )}
                                  >
                                    {role === 'internal' ? 'Team' : role.charAt(0).toUpperCase() + role.slice(1)}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={() => {
                                    toast.success(`Welcome email triggered to ${u.email}`);
                                  }}
                                  className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                  title="Send Welcome Email"
                                >
                                  <Mail size={14} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setEditingUser(u);
                                    setIsEditingUserModal(true);
                                  }}
                                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-all"
                                  title="Edit User Details"
                                >
                                  <Edit3 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === 'calendar' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-[#E5E5E5] overflow-hidden shadow-sm flex flex-col md:flex-row h-[800px]">
             {/* Calendar Sidebar: Filters & Stats */}
             <div className="w-full md:w-72 border-r border-[#E5E5E5] p-6 bg-gray-50/50 space-y-8 overflow-y-auto">
                <div>
                   <h2 className="font-bold text-lg tracking-tight">Schedule Planner</h2>
                   <p className="text-xs text-gray-500 font-medium">Coordinate live medical events</p>
                </div>

                <div className="space-y-4">
                   <p className="text-[10px] font-black tracking-widest text-gray-400">View Range</p>
                   <div className="grid grid-cols-2 gap-2">
                      {['week', 'month', 'quarter', 'year'].map(v => (
                        <button 
                          key={v}
                          onClick={() => setCalendarView(v as any)}
                          className={cn(
                            "px-3 py-3 rounded-xl text-[10px] font-bold tracking-wider transition-all border",
                            calendarView === v ? "bg-black text-white border-black shadow-lg shadow-black/10" : "bg-white text-gray-500 border-gray-100 hover:border-gray-300"
                          )}
                        >
                          {v}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <p className="text-[10px] font-black tracking-widest text-gray-400">Regional Holidays</p>
                     <button onClick={syncCalendarData} disabled={isSyncingCalendar} className="p-1.5 hover:bg-white rounded-lg transition-colors text-indigo-600">
                        <RefreshCw size={12} className={cn(isSyncingCalendar && "animate-spin")} />
                     </button>
                   </div>
                   <div className="space-y-2">
                     {[
                       { name: 'India', code: 'IN' },
                       { name: 'USA', code: 'US' },
                       { name: 'UAE', code: 'AE' },
                       { name: 'Australia', code: 'AU' }
                     ].map(c => (
                       <button 
                        key={c.code} 
                        onClick={() => toggleCountry(c.code)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                          selectedCountries.includes(c.code) ? "bg-white border-indigo-100 shadow-sm" : "bg-transparent border-transparent opacity-40 hover:opacity-100"
                        )}
                       >
                          <div className="flex items-center gap-2">
                             <img src={`https://flagsapi.com/${c.code}/flat/32.png`} alt="" className="w-4 h-4 rounded-sm" />
                             <span className="text-[11px] font-bold">{c.name}</span>
                          </div>
                          <div className={cn("w-2 h-2 rounded-full", selectedCountries.includes(c.code) ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-gray-300")} />
                       </button>
                     ))}
                   </div>
                </div>

                <div className="p-6 bg-indigo-600 rounded-[32px] text-white space-y-4 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 transition-transform group-hover:scale-150 duration-700" />
                   <p className="text-[10px] font-black tracking-widest opacity-60">Total Sessions</p>
                   <div className="text-3xl font-black">{cases.filter(c => c.status === 'scheduled').length} <span className="text-sm font-medium opacity-60 tracking-normal italic ml-1">Live Slots</span></div>
                   <button 
                    onClick={() => { setIsCreating(true); setWizardStep(0); }}
                    className="w-full bg-white text-indigo-600 py-3 rounded-xl font-black text-[10px] tracking-widest hover:bg-gray-50 transition-all active:scale-95"
                   >
                    Submit Live Session
                   </button>
                </div>
             </div>

             {/* Main Calendar Grid */}
             <div className="flex-1 flex flex-col bg-white">
                <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-20">
                   <div className="flex items-center gap-6">
                      <h3 className="font-black text-2xl tracking-tighter italic text-gray-900">
                        {calendarView === 'month' ? format(calendarDate, 'MMMM yyyy') : 
                         calendarView === 'week' ? `Week of ${format(startOfWeek(calendarDate), 'MMM dd')}` :
                         calendarView === 'quarter' ? `Q${Math.floor(calendarDate.getMonth() / 3) + 1} ${calendarDate.getFullYear()}` :
                         calendarDate.getFullYear()}
                      </h3>
                      <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100">
                         <button onClick={() => navigateCalendar('prev')} className="p-2 hover:bg-white rounded-lg transition-all hover:shadow-sm"><ChevronLeft size={16} /></button>
                         <button onClick={() => setCalendarDate(new Date())} className="text-[10px] font-black tracking-widest px-3 hover:text-indigo-600 transition-colors">Today</button>
                         <button onClick={() => navigateCalendar('next')} className="p-2 hover:bg-white rounded-lg transition-all hover:shadow-sm"><ChevronRight size={16} /></button>
                         <div className="w-px h-4 bg-gray-200 mx-1" />
                         <button 
                           onClick={syncCalendarData} 
                           disabled={isSyncingCalendar} 
                           className="p-2 hover:bg-white rounded-lg transition-all hover:shadow-sm text-indigo-600 disabled:opacity-30"
                           title="Sync with medical calendar source"
                         >
                            <RefreshCw size={14} className={cn(isSyncingCalendar && "animate-spin")} />
                         </button>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
                         <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                         <span className="text-[10px] font-black tracking-widest text-indigo-600">Global Sync Active</span>
                      </div>
                      <button 
                        onClick={() => { setIsCreating(true); setWizardStep(0); }}
                        className="bg-black text-white px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/10"
                      >
                        <Plus size={16} />
                        New Case Slot
                      </button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                   <div className={cn(
                     "grid gap-px bg-gray-100 rounded-3xl overflow-hidden border border-gray-100 shadow-inner",
                     calendarView === 'month' ? "grid-cols-7" : 
                     calendarView === 'week' ? "grid-cols-7" :
                     calendarView === 'quarter' ? "grid-cols-3" : "grid-cols-4"
                   )}>
                      {calendarView === 'month' || calendarView === 'week' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="bg-gray-50/50 p-4 text-center text-[10px] font-black tracking-widest text-gray-400 border-b border-gray-100">
                          {d}
                        </div>
                      )) : calendarView === 'quarter' ? ['Month 1', 'Month 2', 'Month 3'].map(m => (
                        <div key={m} className="bg-gray-50/50 p-4 text-center text-[10px] font-black tracking-widest text-gray-400 border-b border-gray-100">
                          {m}
                        </div>
                      )) : ['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
                        <div key={q} className="bg-gray-50/50 p-4 text-center text-[10px] font-black tracking-widest text-gray-400 border-b border-gray-100">
                          {q}
                        </div>
                      ))}
                      
                      {(() => {
                        let daysToRender: Date[] = [];
                        if (calendarView === 'month') {
                          const start = startOfWeek(startOfMonth(calendarDate));
                          const end = endOfWeek(endOfMonth(calendarDate));
                          daysToRender = eachDayOfInterval({ start, end });
                        } else if (calendarView === 'week') {
                          const start = startOfWeek(calendarDate);
                          const end = endOfWeek(calendarDate);
                          daysToRender = eachDayOfInterval({ start, end });
                        } else if (calendarView === 'quarter') {
                           // Render monthly summaries for quarter
                           return Array.from({ length: 3 }).map((_, i) => {
                             const monthDate = addMonths(startOfQuarter(calendarDate), i);
                             const monthEvents = calendarEvents.filter(e => {
                               const eDate = new Date(e.date);
                               return eDate.getMonth() === monthDate.getMonth() && eDate.getFullYear() === monthDate.getFullYear();
                             });
                             const monthCases = cases.filter(c => {
                               if (!c.scheduledAt) return false;
                               const cDate = new Date(c.scheduledAt);
                               return cDate.getMonth() === monthDate.getMonth() && cDate.getFullYear() === monthDate.getFullYear();
                             });

                             return (
                               <div key={i} className="bg-white p-6 min-h-[400px] border-r border-gray-100 last:border-0 hover:bg-indigo-50/5 transition-colors group">
                                  <div className="flex items-center justify-between mb-6">
                                    <h4 className="font-black text-xl text-gray-900 uppercase italic tracking-tighter group-hover:text-indigo-600 transition-colors">
                                      {format(monthDate, 'MMMM')}
                                    </h4>
                                    <div className="flex -space-x-2">
                                      {Array.from(new Set(monthEvents.map(e => e.country))).slice(0, 3).map(country => (
                                        country !== 'Global' && <img key={country} src={`https://flagsapi.com/${country}/flat/32.png`} className="w-5 h-5 rounded-full ring-2 ring-white" />
                                      ))}
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-4">
                                     <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                                        <p className="text-[10px] font-black uppercase text-gray-400">Monthly Outlook</p>
                                        <div className="flex justify-between items-end">
                                           <div>
                                              <p className="text-2xl font-black text-indigo-600">{monthEvents.length}</p>
                                              <p className="text-[10px] font-bold text-gray-500 uppercase">Holidays</p>
                                           </div>
                                           <div>
                                              <p className="text-2xl font-black text-emerald-600 text-right">{monthCases.length}</p>
                                              <p className="text-[10px] font-bold text-gray-500 uppercase text-right">Sessions</p>
                                           </div>
                                        </div>
                                     </div>

                                     <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-2 scrollbar-hide">
                                        {monthEvents.slice(0, 8).map(e => (
                                          <div key={e.id} className="flex items-center gap-2 p-2 bg-white border border-gray-50 rounded-xl hover:shadow-sm transition-all">
                                             <span className="text-xs">{e.icon}</span>
                                             <div className="flex-1 min-w-0">
                                                <p className="text-[9px] font-black uppercase text-gray-900 truncate tracking-tight">{e.name}</p>
                                                <p className="text-[8px] font-bold text-gray-400">{format(new Date(e.date), 'MMM dd')}</p>
                                             </div>
                                          </div>
                                        ))}
                                        {monthEvents.length > 8 && <p className="text-[9px] text-center font-bold text-indigo-600/60 pt-2 italic">+{monthEvents.length - 8} more events</p>}
                                     </div>
                                  </div>
                               </div>
                             );
                           });
                        } else if (calendarView === 'year') {
                           return Array.from({ length: 4 }).map((_, i) => {
                             const qDate = addQuarters(startOfYear(calendarDate), i);
                             const qEvents = calendarEvents.filter(e => {
                               const eDate = new Date(e.date);
                               const quarter = Math.floor(eDate.getMonth() / 3);
                               return quarter === i && eDate.getFullYear() === calendarDate.getFullYear();
                             });

                             return (
                               <div key={i} className="bg-white p-6 min-h-[400px] border-r border-gray-100 last:border-0 hover:bg-amber-50/5 transition-colors group">
                                  <h4 className="font-black text-xl text-gray-900 uppercase italic tracking-tighter mb-4 group-hover:text-amber-600 transition-colors">Q{i + 1}</h4>
                                  <div className="space-y-4">
                                     <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        {Array.from(new Set(qEvents.map(e => e.country))).map(country => (
                                          country !== 'Global' && <img key={country} src={`https://flagsapi.com/${country}/flat/32.png`} className="w-4 h-4 rounded-sm flex-shrink-0" />
                                        ))}
                                     </div>
                                     <div className="space-y-2">
                                        {qEvents.slice(0, 10).map(e => (
                                           <div key={e.id} className="flex items-center justify-between p-2 bg-gray-50/50 rounded-lg">
                                              <span className="text-[10px] font-bold text-gray-600 truncate mr-2">{e.name}</span>
                                              <span className="text-[8px] font-black text-gray-400 whitespace-nowrap">{format(new Date(e.date), 'MM/dd')}</span>
                                           </div>
                                        ))}
                                     </div>
                                  </div>
                               </div>
                             );
                           });
                        }

                        return daysToRender.map((date, i) => {
                          const isCurrentMonth = date.getMonth() === calendarDate.getMonth();
                          const isCurrentToday = isDateToday(date);
                          
                          const dayEvents = calendarEvents.filter(e => 
                            isSameDay(new Date(e.date), date) && 
                            (e.country === 'Global' || selectedCountries.includes(e.country))
                          );

                          const dayCases = cases.filter(c => {
                             if (!c.scheduledAt) return false;
                             return isSameDay(new Date(c.scheduledAt), date);
                          });

                          return (
                            <div 
                              key={i} 
                              className={cn(
                                "bg-white p-4 min-h-[140px] transition-all hover:ring-2 hover:ring-indigo-600/20 hover:z-10 group relative",
                                !isCurrentMonth && calendarView === 'month' && "bg-gray-50/30 grayscale opacity-40",
                                isCurrentToday && "ring-2 ring-indigo-600 ring-inset"
                              )}
                            >
                              <div className="flex items-center justify-between mb-3">
                                 <div className={cn(
                                   "text-[11px] font-black w-7 h-7 flex items-center justify-center rounded-xl transition-all",
                                   isCurrentToday ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-110" : "text-gray-900 group-hover:text-indigo-600"
                                 )}>
                                   {format(date, 'd')}
                                 </div>
                                 <div className="flex -space-x-1.5">
                                   {dayEvents.filter(e => e.type === 'holiday').map(e => (
                                     <img key={e.country + e.name} src={`https://flagsapi.com/${e.country === 'Global' ? 'UN' : e.country}/flat/32.png`} className="w-3.5 h-3.5 rounded-full ring-2 ring-white shadow-sm" title={e.name} />
                                   ))}
                                 </div>
                              </div>

                              <div className="space-y-1.5">
                                 {dayEvents.map(e => (
                                   <div 
                                    key={e.id} 
                                    className={cn(
                                      "p-1.5 rounded-lg border flex items-center gap-1.5 transition-transform hover:scale-[1.02]",
                                      e.type === 'medical' ? "bg-amber-50 border-amber-100 text-amber-700" : "bg-blue-50 border-blue-100 text-blue-700"
                                    )}
                                   >
                                      <span className="text-[10px]">{e.icon}</span>
                                      <span className="text-[8px] font-black uppercase leading-tight truncate">{e.name}</span>
                                   </div>
                                 ))}
                                 {dayCases.map(e => (
                                   <div key={e.id} className="bg-emerald-50 rounded-lg p-1.5 border border-emerald-100 group/item cursor-pointer hover:bg-emerald-100 transition-colors shadow-sm">
                                      <p className="text-[8px] font-black uppercase text-emerald-700 leading-tight line-clamp-2">{e.title}</p>
                                      <div className="flex items-center gap-1 mt-1">
                                         <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                         <span className="text-[7px] font-bold text-emerald-500">LIVE: {format(new Date(e.scheduledAt), 'HH:mm')}</span>
                                      </div>
                                   </div>
                                 ))}
                              </div>
                            </div>
                          );
                        });
                      })()}
                   </div>
                </div>
             </div>
          </div>
        </div>
      ) : activeTab === 'sponsors' ? (
        <div className="space-y-6">
          <div className="bg-white rounded-[32px] border border-[#E5E5E5] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-[#E5E5E5] flex items-center justify-between">
              <h2 className="font-bold text-lg">{editingSponsor ? `Edit ${editingSponsor.name}` : 'Industry Sponsors'}</h2>
              <button 
                onClick={() => {
                  setEditingSponsor(null);
                  setNewSponsor({ name: '', logoUrl: '', bannerImageUrl: '', profile: '', website: '', disclaimer: '', preRollVideo: '', postRollVideo: '' });
                  setIsAddingSponsor(true);
                }}
                className="px-6 py-2.5 bg-black text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10 flex items-center gap-2"
              >
                <Plus size={16} />
                Partner Onboarding
              </button>
            </div>
            
            {isAddingSponsor ? (
              <form onSubmit={handleSponsorSubmit} className="p-10 space-y-8 animate-in fade-in duration-500">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black uppercase italic tracking-tighter text-indigo-900">
                      {editingSponsor ? 'Modify Partner Profile' : 'Onboard New Partner'}
                    </h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Step 1: Partner Details</p>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Corporate Identity (Name)</label>
                          <input required type="text" value={newSponsor.name} onChange={(e) => setNewSponsor({...newSponsor, name: e.target.value})} className="w-full bg-gray-50 border-gray-100 border rounded-2xl p-4 font-bold outline-none" placeholder="e.g. Pfizer Pharmaceuticals" />
                       </div>

                       <div className="flex items-center gap-6">
                          <div className="w-32 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden">
                             {newSponsor.bannerImageUrl ? <img src={newSponsor.bannerImageUrl} className="w-full h-full object-cover" /> : <Image className="text-gray-200" />}
                          </div>
                          <div className="flex-1 space-y-2">
                             <p className="text-xs font-bold text-gray-500">Educational Grant Banner (Optional)</p>
                             <input 
                              type="file" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const { uploadFile } = await import('../services/storageService');
                                  const url = await uploadFile(file, `sponsors/banners/${Date.now()}_${file.name}`);
                                  setNewSponsor({...newSponsor, bannerImageUrl: url});
                                }
                              }}
                              className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100" 
                             />
                          </div>
                       </div>
                       
                       <div className="flex items-center gap-6">
                          <div className="w-24 h-24 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center relative overflow-hidden">
                             {newSponsor.logoUrl ? <img src={newSponsor.logoUrl} className="w-full h-full object-contain" /> : <Image className="text-gray-200" />}
                          </div>
                          <div className="flex-1 space-y-2">
                             <p className="text-xs font-bold text-gray-500">Sponsor Logo</p>
                             <input 
                              type="file" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const { uploadFile } = await import('../services/storageService');
                                  const url = await uploadFile(file, `sponsors/logos/${Date.now()}_${file.name}`);
                                  setNewSponsor({...newSponsor, logoUrl: url});
                                }
                              }}
                              className="text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                             />
                          </div>
                       </div>

                       <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Industry Profile</label>
                          <textarea value={newSponsor.profile} onChange={(e) => setNewSponsor({...newSponsor, profile: e.target.value})} className="w-full bg-gray-50 border-gray-100 border rounded-2xl p-4 font-medium outline-none h-32 resize-none" placeholder="Corporate mission and therapeutic area focus..." />
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="p-6 rounded-3xl bg-amber-50/50 border border-amber-100 space-y-4">
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-amber-600">Marketing Assets</h3>
                          
                          <div className="space-y-3">
                             <label className="text-[9px] font-bold text-amber-500 uppercase">Pre-Roll Brand Video</label>
                             <div className="flex items-center gap-3">
                                <input type="text" value={newSponsor.preRollVideo} onChange={(e) => setNewSponsor({...newSponsor, preRollVideo: e.target.value})} placeholder="URL or upload..." className="flex-1 bg-white border-amber-100 rounded-xl p-3 text-xs font-bold outline-none" />
                                <label className="p-2 bg-amber-500 text-white rounded-xl cursor-pointer hover:bg-amber-600 transition-all">
                                   <Plus size={14} />
                                   <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="video/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const { uploadFile } = await import('../services/storageService');
                                          const url = await uploadFile(file, `sponsors/videos/${Date.now()}_${file.name}`);
                                          setNewSponsor({...newSponsor, preRollVideo: url});
                                        }
                                      }}
                                   />
                                </label>
                             </div>
                          </div>

                          <div className="space-y-3">
                             <label className="text-[9px] font-bold text-amber-500 uppercase">Post-Roll Awareness Video</label>
                             <div className="flex items-center gap-3">
                                <input type="text" value={newSponsor.postRollVideo} onChange={(e) => setNewSponsor({...newSponsor, postRollVideo: e.target.value})} placeholder="URL or upload..." className="flex-1 bg-white border-amber-100 rounded-xl p-3 text-xs font-bold outline-none" />
                                <label className="p-2 bg-amber-500 text-white rounded-xl cursor-pointer hover:bg-amber-600 transition-all">
                                   <Plus size={14} />
                                   <input 
                                      type="file" 
                                      className="hidden" 
                                      accept="video/*"
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          const { uploadFile } = await import('../services/storageService');
                                          const url = await uploadFile(file, `sponsors/videos/${Date.now()}_${file.name}`);
                                          setNewSponsor({...newSponsor, postRollVideo: url});
                                        }
                                      }}
                                   />
                                </label>
                             </div>
                          </div>

                          <div className="space-y-3">
                             <label className="text-[9px] font-bold text-amber-500 uppercase">Mandatory Disclaimer</label>
                             <textarea value={newSponsor.disclaimer} onChange={(e) => setNewSponsor({...newSponsor, disclaimer: e.target.value})} className="w-full bg-white border-amber-100 rounded-xl p-3 text-[10px] font-medium outline-none h-20 resize-none" placeholder="Standard legal disclaimer for educational grants..." />
                          </div>
                       </div>

                       <div className="flex gap-4">
                          <button type="submit" disabled={isSubmitting} className="flex-1 bg-black text-white py-4 rounded-[20px] font-bold hover:bg-gray-800 transition-all shadow-xl disabled:opacity-50">
                            {isSubmitting ? "Onboarding Partner..." : "Finalize Partnership"}
                          </button>
                          <button type="button" onClick={() => {
                            setIsAddingSponsor(false);
                            setEditingSponsor(null);
                            setNewSponsor({
                              name: '', logoUrl: '', profile: '', website: '', disclaimer: '', preRollVideo: '', postRollVideo: ''
                            });
                          }} className="px-8 bg-gray-50 text-gray-400 py-4 rounded-[20px] font-bold hover:bg-gray-100 transition-all">Cancel</button>
                       </div>
                    </div>
                 </div>
              </form>
            ) : (
              <div className="p-8">
                {sponsors.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-[40px]">
                    <div className="p-5 bg-gray-50 rounded-full w-fit mx-auto mb-4 text-gray-300">
                      <Globe size={40} />
                    </div>
                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Awaiting Industry Integration</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {sponsors.map(s => (
                      <div key={s.id} className="group p-8 border border-gray-100 rounded-[40px] text-left space-y-6 hover:shadow-2xl hover:shadow-indigo-500/10 hover:border-indigo-100 transition-all bg-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-bl-full -mr-16 -mt-16 group-hover:scale-150 transition-all duration-700" />
                        
                        <div className="w-20 h-20 bg-gray-50 rounded-3xl flex items-center justify-center p-4 relative z-10">
                          {s.logoUrl ? <img src={s.logoUrl} className="w-full h-full object-contain" alt={s.name} /> : <span className="font-black text-2xl text-gray-300">{s.name.charAt(0)}</span>}
                        </div>
                        
                        <div className="relative z-10">
                          <h4 className="font-black text-xl tracking-tighter uppercase italic">{s.name}</h4>
                          <p className="text-xs text-gray-500 font-medium line-clamp-2 mt-2 leading-relaxed">{s.profile || 'Partner details pending submission.'}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t border-gray-50 relative z-10">
                           <div className="flex gap-2">
                             {s.preRollVideo && <div className="w-2 h-2 rounded-full bg-indigo-500" title="Pre-roll active" />}
                             {s.postRollVideo && <div className="w-2 h-2 rounded-full bg-emerald-500" title="Post-roll active" />}
                           </div>
                           <div className="flex items-center gap-1">
                             <button 
                               onClick={() => handleEditSponsor(s)}
                               className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors rounded-md hover:bg-indigo-50"
                               title="Edit Sponsor"
                             >
                               <Edit3 size={14} />
                             </button>
                             <button 
                               onClick={() => handleDeleteSponsor(s.id)}
                               className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                               title="Delete Sponsor"
                             >
                               <Trash2 size={14} />
                             </button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'sponsorships' ? (
        <div className="space-y-8 animate-in fade-in duration-500">
           {/* ROI Overview */}
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Total Funding Received', value: `$${activeSponsorships.reduce((acc, curr) => acc + (curr.costPaid || 0), 0).toLocaleString()}`, icon: DollarSign, color: 'text-indigo-600' },
                { label: 'Active Sponsorships', value: activeSponsorships.filter(s => s.status === 'active').length, icon: ShieldCheck, color: 'text-emerald-500' },
                { label: 'Avg Network ROI', value: `${(activeSponsorships.reduce((acc, curr) => acc + calculateROI(curr), 0) / (activeSponsorships.length || 1)).toFixed(1)}%`, icon: Rocket, color: 'text-amber-500' },
              ].map((stat, i) => (
                <div key={i} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm space-y-4">
                   <div className={cn("p-4 rounded-3xl w-fit bg-gray-50", stat.color)}>
                     <stat.icon size={24} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{stat.label}</p>
                     <p className="text-4xl font-black italic tracking-tighter">{stat.value}</p>
                   </div>
                </div>
              ))}
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                 <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                       <h2 className="font-black text-xl italic tracking-tighter uppercase">Available Packages</h2>
                       <button 
                         onClick={() => {
                           setEditingPackage(null);
                           setNewPackage({ name: '', description: '', durationMonths: 3, cost: 5000, category: 'Standard', benefits: [] });
                           setIsAddingPackage(true);
                         }}
                         className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all text-xs"
                       >
                         <Plus size={16} /> Create New Package
                       </button>
                    </div>
                    
                    <div className="p-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {sponsorshipPackages.map(pkg => (
                            <div key={pkg.id} className="p-6 rounded-[32px] border-2 border-gray-50 hover:border-indigo-100 transition-all space-y-4 group">
                               <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <h3 className="font-black text-lg uppercase italic tracking-tighter">{pkg.name}</h3>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase">{pkg.category}</span>
                                  </div>
                                  <p className="text-2xl font-black text-indigo-600">${pkg.cost.toLocaleString()}</p>
                               </div>
                               <p className="text-xs text-gray-500 font-medium line-clamp-2">{pkg.description}</p>
                               <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                  <span className="text-[10px] font-black uppercase text-gray-400">{pkg.durationMonths} Month Duration</span>
                                  <div className="flex gap-2">
                                     <button onClick={() => {
                                       setEditingPackage(pkg);
                                       setNewPackage(pkg);
                                       setIsAddingPackage(true);
                                     }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors">
                                       <Edit3 size={14} />
                                     </button>
                                     <button className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                                       <Trash2 size={14} />
                                     </button>
                                  </div>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-50">
                       <h2 className="font-black text-xl italic tracking-tighter uppercase">Theme & Marketing Generator</h2>
                    </div>
                    <div className="p-8 space-y-6">
                       <div className="p-6 rounded-3xl bg-indigo-50/30 border border-indigo-100 space-y-4">
                          <p className="text-xs text-indigo-600 font-bold leading-relaxed">
                            Generate persuasive marketing content for specific sponsorship themes to attract new partners.
                          </p>
                          <button className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg">
                             <Sparkles size={18} /> Generate Marketing Pitch
                          </button>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="bg-white rounded-[40px] border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-gray-50">
                       <h2 className="font-black text-xl italic tracking-tighter uppercase">Current ROI Performance</h2>
                    </div>
                    <div className="p-6 space-y-4">
                       {activeSponsorships.map(ship => (
                         <div key={ship.id} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                            <div className="flex justify-between items-start">
                               <div>
                                  <p className="font-black text-sm uppercase italic tracking-tighter text-indigo-600">{ship.sponsorName}</p>
                                  <p className="text-[10px] font-bold text-gray-400">{ship.packageName}</p>
                               </div>
                               <div className="text-right">
                                  <p className="text-xs font-black text-emerald-600">{calculateROI(ship).toFixed(1)}% ROI</p>
                                  <p className="text-[9px] font-bold text-gray-400 uppercase">{ship.status}</p>
                               </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                               <div className="bg-white p-2 rounded-xl text-center">
                                  <p className="text-[8px] font-black uppercase text-gray-400">Views</p>
                                  <p className="font-black text-xs">{ship.metrics?.views || 0}</p>
                               </div>
                               <div className="bg-white p-2 rounded-xl text-center">
                                  <p className="text-[8px] font-black uppercase text-gray-400">Downloads</p>
                                  <p className="font-black text-xs">{ship.metrics?.brochureDownloads || 0}</p>
                               </div>
                               <div className="bg-white p-2 rounded-xl text-center">
                                  <p className="text-[8px] font-black uppercase text-gray-400">Clicks</p>
                                  <p className="font-black text-xs">{ship.metrics?.websiteClicks || 0}</p>
                               </div>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>

           {isAddingPackage && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-[40px] w-full max-w-xl p-10 space-y-8 shadow-2xl"
                >
                   <div className="flex justify-between items-center">
                      <h2 className="font-black text-2xl uppercase italic tracking-tighter">Configure Package</h2>
                      <button onClick={() => setIsAddingPackage(false)}><X size={24} /></button>
                   </div>
                   
                   <form onSubmit={handlePackageSubmit} className="space-y-6">
                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Package Name</label>
                         <input type="text" required value={newPackage.name} onChange={(e) => setNewPackage({...newPackage, name: e.target.value})} className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold outline-none" placeholder="Elite Multi-Session Grant" />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Cost ($)</label>
                            <input type="number" required value={newPackage.cost} onChange={(e) => setNewPackage({...newPackage, cost: parseInt(e.target.value)})} className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold outline-none" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Duration</label>
                            <select value={newPackage.durationMonths} onChange={(e) => setNewPackage({...newPackage, durationMonths: parseInt(e.target.value)})} className="w-full bg-gray-50 border-gray-100 rounded-2xl p-4 font-bold outline-none">
                               <option value={1}>1 Month</option>
                               <option value={3}>3 Months</option>
                               <option value={6}>6 Months</option>
                               <option value={12}>12 Months</option>
                            </select>
                         </div>
                      </div>

                      <div className="space-y-2">
                         <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Tier Category</label>
                         <div className="flex gap-2">
                            {['Standard', 'Premium', 'Elite'].map(cat => (
                              <button 
                                key={cat}
                                type="button"
                                onClick={() => setNewPackage({...newPackage, category: cat})}
                                className={cn("flex-1 py-3 rounded-xl font-bold transition-all text-xs border", newPackage.category === cat ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-400 border-gray-100 hover:border-indigo-100")}
                              >
                                {cat}
                              </button>
                            ))}
                         </div>
                      </div>

                      <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase italic tracking-tighter hover:bg-gray-800 transition-all disabled:opacity-50">
                        {isSubmitting ? "Saving Config..." : "Activate Package Offering"}
                      </button>
                   </form>
                </motion.div>
             </div>
           )}
        </div>
      ) : null}

      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-[#111111] rounded-[40px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-transparent dark:border-white/5"
          >
            {/* Wizard Header */}
            <div className="p-8 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/30 dark:bg-white/[0.02]">
              <div>
                <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tighter uppercase italic">
                  Case Submission Wizard
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {[1, 2, 3, 4, 5].map(step => (
                    <div 
                      key={step} 
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        wizardStep >= step ? "bg-indigo-600 w-12" : "bg-gray-200 dark:bg-white/10 w-6"
                      )}
                    />
                  ))}
                  <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest ml-3">Phase {wizardStep} of {caseType === 'structured' ? '5' : '4'}</span>
                </div>
              </div>
              <button onClick={() => { setIsCreating(false); setWizardStep(1); }} className="p-3 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors text-gray-400 hover:text-black dark:hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="flex-1 overflow-y-auto p-10">
              {wizardStep === 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 py-10">
                   <button 
                    type="button"
                    onClick={() => {
                      setCaseType('live');
                      setNewCase(prev => ({ ...prev, status: 'scheduled' }));
                      setWizardStep(1);
                    }}
                    className="group relative p-10 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-indigo-600 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-500/5 transition-all text-left flex flex-col items-center justify-center gap-6"
                   >
                      <div className="p-6 bg-indigo-100 dark:bg-indigo-500/20 rounded-3xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                        <Video size={48} strokeWidth={1.5} />
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">Live Session</h3>
                        <p className="text-sm text-gray-400 dark:text-white/40 mt-2 font-medium max-w-[200px]">Broadcast a real-time clinical presentation with Q&A.</p>
                      </div>
                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ChevronRight className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                   </button>
                   <button 
                    type="button"
                    onClick={() => {
                      setCaseType('recorded');
                      setNewCase(prev => ({ ...prev, status: 'published' }));
                      setWizardStep(1);
                    }}
                    className="group relative p-10 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-emerald-600 dark:hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-500/5 transition-all text-left flex flex-col items-center justify-center gap-6"
                   >
                      <div className="p-6 bg-emerald-100 dark:bg-emerald-500/20 rounded-3xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                        <PlayCircle size={48} strokeWidth={1.5} />
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">Recorded Case</h3>
                        <p className="text-sm text-gray-400 dark:text-white/40 mt-2 font-medium max-w-[200px]">Upload a peer-reviewed video for the knowledge library.</p>
                      </div>
                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ChevronRight className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                   </button>

                   <button 
                    type="button"
                    onClick={() => {
                      setCaseType('structured');
                      setNewCase(prev => ({ ...prev, status: 'published' }));
                      setWizardStep(1);
                    }}
                    className="group relative p-10 rounded-[40px] border-2 border-dashed border-gray-200 dark:border-white/10 hover:border-amber-600 dark:hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-500/5 transition-all text-left flex flex-col items-center justify-center gap-6"
                   >
                      <div className="p-6 bg-amber-100 dark:bg-amber-500/20 rounded-3xl text-amber-600 dark:text-amber-400 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all duration-500">
                        <FileText size={48} strokeWidth={1.5} />
                      </div>
                      <div className="text-center">
                        <h3 className="text-xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">Structured CRF</h3>
                        <p className="text-sm text-gray-400 dark:text-white/40 mt-2 font-medium max-w-[200px]">Detailed clinical case with peer review & structured data.</p>
                      </div>
                      <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ChevronRight className="text-amber-600 dark:text-amber-400" />
                      </div>
                   </button>
                </div>
              )}

              {wizardStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Case Title</label>
                      <input 
                        required 
                        type="text" 
                        value={newCase.title} 
                        onChange={(e) => setNewCase({...newCase, title: e.target.value})} 
                        placeholder="e.g. Rare Manifestation of Cardiac Myxoma" 
                        className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-5 font-bold text-lg focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 outline-none transition-all text-gray-900 dark:text-white" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 relative">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Primary Specialty (ICD-10)</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            placeholder="Search specialty or code..."
                            value={specSearch || newCase.specialty}
                            onFocus={() => setShowSpecResults(true)}
                            onChange={(e) => {
                              setSpecSearch(e.target.value);
                              setShowSpecResults(true);
                            }}
                            className="w-full bg-gray-50 dark:bg-[#1A1A1A] border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none text-gray-900 dark:text-white"
                          />
                          {showSpecResults && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-2xl shadow-xl z-[60] max-h-48 overflow-y-auto p-1">
                               {MEDICAL_SPECIALIZATIONS
                                 .filter(s => 
                                    s.name.toLowerCase().includes(specSearch.toLowerCase()) || 
                                    s.code.toLowerCase().includes(specSearch.toLowerCase())
                                 )
                                 .map(s => (
                                   <button 
                                     key={s.code}
                                     type="button"
                                     onClick={() => {
                                       setNewCase(prev => ({ ...prev, specialty: s.name }));
                                       setSpecSearch(s.name);
                                       setShowSpecResults(false);
                                     }}
                                     className="w-full text-left p-3 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-xl transition-colors flex items-center justify-between text-gray-900 dark:text-gray-100"
                                   >
                                      <span className="text-sm font-bold">{s.name}</span>
                                      <span className="text-[10px] font-mono text-gray-400 dark:text-white/40">{s.code}</span>
                                   </button>
                                 ))
                               }
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Submission Status</label>
                        <select value={newCase.status} onChange={(e) => setNewCase({...newCase, status: e.target.value as any})} className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none text-gray-900 dark:text-white">
                          <option value="draft">Internal Draft</option>
                          <option value="scheduled">Scheduled Live</option>
                          <option value="published">Final (Live)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {caseType === 'live' ? (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Session Scheduling</label>
                        <input type="datetime-local" value={newCase.scheduledAt} onChange={(e) => setNewCase({...newCase, scheduledAt: e.target.value})} className="w-full bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10 border rounded-2xl p-4 font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none text-emerald-900 dark:text-emerald-100" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Audience Join Link (Public)</label>
                        <input type="url" value={newCase.googleMeetLink} onChange={(e) => setNewCase({...newCase, googleMeetLink: e.target.value})} placeholder="https://meet.google.com/..." className="w-full bg-emerald-50/50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/10 border rounded-2xl p-4 font-medium focus:ring-4 focus:ring-emerald-500/10 outline-none text-gray-900 dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 font-black">Private Speaker Link (Sent to Presenter)</label>
                        <input type="url" value={newCase.speakerJoinLink} onChange={(e) => setNewCase({...newCase, speakerJoinLink: e.target.value})} placeholder="Host-only admission URL..." className="w-full bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/10 border rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-600/10 outline-none text-gray-900 dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Intended Duration</label>
                        <input type="text" value={newCase.duration || ''} onChange={(e) => setNewCase({...newCase, duration: e.target.value})} placeholder="e.g. 60 mins" className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold outline-none font-mono text-gray-900 dark:text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Video Integration URL</label>
                        <input type="url" value={newCase.videoUrl} onChange={(e) => setNewCase({...newCase, videoUrl: e.target.value})} placeholder="Vimeo/YouTube/External URL" className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none text-gray-900 dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 font-bold">Assessment Pass Threshold (%)</label>
                        <div className="flex items-center gap-4">
                           <input type="range" min="30" max="100" step="1" value={newCase.completionThreshold} onChange={(e) => setNewCase({...newCase, completionThreshold: parseInt(e.target.value)})} className="flex-1 accent-emerald-600" />
                           <span className="text-xl font-black text-emerald-600 w-12">{newCase.completionThreshold}%</span>
                        </div>
                      </div>
                      <div className="p-5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-bold text-gray-400 dark:text-white/40 leading-relaxed italic">Recorded cases are optimized for asynchronous consumption. Assessments will be gated until viewer hits {newCase.completionThreshold}% watch-time.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {wizardStep === 2 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <div className="flex items-start gap-8">
                     <div className="relative group">
                        <div className="w-32 h-32 rounded-[32px] bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 overflow-hidden flex items-center justify-center transition-all group-hover:border-indigo-500">
                           {newCase.presenterPhotoURL ? (
                             <img src={newCase.presenterPhotoURL} className="w-full h-full object-cover" alt="" />
                           ) : (
                             <div className="text-center p-2">
                               <Users size={24} className="mx-auto text-gray-200 dark:text-white/20 mb-1" />
                               <span className="text-[8px] font-black uppercase text-gray-300 dark:text-white/20">Photo</span>
                             </div>
                           )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 bg-black text-white p-2 rounded-xl cursor-pointer hover:bg-gray-800 transition-all shadow-xl">
                           <Plus size={14} />
                           <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    const { uploadFile } = await import('../services/storageService');
                                    const path = `presenters/${Date.now()}_${file.name}`;
                                    const url = await uploadFile(file, path);
                                    setNewCase(prev => ({ ...prev, presenterPhotoURL: url }));
                                  } catch (err) {
                                    setError("Speaker photo upload failed. Please try again.");
                                    console.error(err);
                                  }
                                }
                              }}
                           />
                        </label>
                     </div>
                     <div className="flex-1 space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2 block">Associate Expert Presenter</label>
                        <div className="relative">
                          <input 
                            type="text" 
                            value={speakerSearch}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSpeakerSearch(val);
                              setNewCase(prev => ({ ...prev, presenterName: val, presenterId: '' }));
                              setShowSpeakerResults(true);
                            }}
                            placeholder="Search existing experts pool..." 
                            className="w-full bg-indigo-50/30 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/10 border rounded-2xl p-5 font-bold focus:ring-4 focus:ring-indigo-600/10 outline-none pl-14 text-gray-900 dark:text-white" 
                          />
                          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-indigo-300 dark:text-indigo-500/50" size={20} />
                          {showSpeakerResults && speakerSearch && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-3xl shadow-2xl z-50 max-h-60 overflow-y-auto overflow-x-hidden p-2">
                              {speakers.filter(s => s.displayName?.toLowerCase().includes(speakerSearch.toLowerCase())).map(s => (
                                <button key={s.uid} type="button" onClick={() => handleSpeakerSelect(s)} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-4 transition-all rounded-2xl group border-b border-gray-50 dark:border-white/5 last:border-0">
                                  <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover:ring-indigo-500 transition-all">
                                    <img src={s.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.uid}`} alt="" />
                                  </div>
                                  <div>
                                     <p className="font-bold text-gray-900 dark:text-white">{s.displayName}</p>
                                     <p className="text-[10px] text-gray-400 dark:text-white/40 font-medium uppercase tracking-tight">{s.qualifications} • {s.specialties?.slice(0, 2).join(', ')}</p>
                                  </div>
                                  <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                    <CheckCircle2 size={20} className="text-indigo-500" />
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                     </div>
                  </div>

                  {caseType === 'structured' && (
                    <div className="flex items-start gap-8 mt-10">
                       <div className="relative group">
                          <div className="w-32 h-32 rounded-[32px] bg-amber-50 dark:bg-white/5 border-2 border-dashed border-amber-200 dark:border-white/10 overflow-hidden flex items-center justify-center transition-all group-hover:border-amber-500">
                             {newCase.reviewerPhotoURL ? (
                               <img src={newCase.reviewerPhotoURL} className="w-full h-full object-cover" alt="" />
                             ) : (
                               <div className="text-center p-2">
                                 <ShieldCheck size={24} className="mx-auto text-amber-200 dark:text-white/20 mb-1" />
                                 <span className="text-[8px] font-black uppercase text-amber-300 dark:text-white/20">Reviewer</span>
                               </div>
                             )}
                          </div>
                       </div>
                       <div className="flex-1 space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2 block">Assign Peer Reviewer</label>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={reviewerSearch}
                              onChange={(e) => {
                                setReviewerSearch(e.target.value);
                                setShowReviewerResults(true);
                              }}
                              placeholder="Find available peer reviewer..." 
                              className="w-full bg-amber-50/30 dark:bg-amber-500/5 border-amber-100 dark:border-white/10 border rounded-2xl p-5 font-bold focus:ring-4 focus:ring-amber-600/10 outline-none pl-14 text-gray-900 dark:text-white" 
                            />
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-amber-300 dark:text-amber-500/50" size={20} />
                            {showReviewerResults && reviewerSearch && (
                              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1A1A1A] border border-gray-100 dark:border-white/10 rounded-3xl shadow-2xl z-50 max-h-60 overflow-y-auto overflow-x-hidden p-2">
                                {speakers.filter(s => s.displayName?.toLowerCase().includes(reviewerSearch.toLowerCase())).map(s => (
                                  <button key={s.uid} type="button" onClick={() => handleReviewerSelect(s)} className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-4 transition-all rounded-2xl group border-b border-gray-50 dark:border-white/5 last:border-0">
                                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-transparent group-hover:ring-amber-500 transition-all">
                                      <img src={s.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.uid}`} alt="" />
                                    </div>
                                    <div>
                                       <p className="font-bold text-gray-900 dark:text-white">{s.displayName}</p>
                                       <p className="text-[10px] text-gray-400 dark:text-white/40 font-medium uppercase tracking-tight">{s.qualifications} • Peer Reviewer</p>
                                    </div>
                                    <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                      <CheckCircle2 size={20} className="text-amber-500" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Expert Name</label>
                        <input type="text" value={newCase.presenterName} onChange={(e) => setNewCase({...newCase, presenterName: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold outline-none text-gray-900 dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Expert Photo</label>
                        <div className="flex items-center gap-4">
                           <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 overflow-hidden flex items-center justify-center">
                              {newCase.presenterPhotoURL ? <img src={newCase.presenterPhotoURL} className="w-full h-full object-cover" /> : <Users size={24} className="text-gray-200 dark:text-white/20" />}
                           </div>
                           <label className="flex-1">
                              <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl px-4 py-3 text-[10px] font-black uppercase tracking-widest text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition-colors text-gray-900 dark:text-white font-bold">
                                 Upload Photo
                              </div>
                              <input 
                                 type="file" 
                                 className="hidden" 
                                 accept="image/*"
                                 onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                       try {
                                          const { uploadFile } = await import('../services/storageService');
                                          const url = await uploadFile(file, `presenters/${Date.now()}_${file.name}`);
                                          setNewCase(prev => ({ ...prev, presenterPhotoURL: url }));
                                       } catch (err) {
                                          setError("Expert photo upload failed.");
                                          console.error(err);
                                       }
                                    }
                                 }}
                              />
                           </label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400">Origin Country</label>
                        <div className="flex gap-4">
                           <select 
                             value={newCase.presenterCountry} 
                             onChange={(e) => setNewCase({...newCase, presenterCountry: e.target.value})}
                             className="flex-1 bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold outline-none text-gray-900 dark:text-white"
                           >
                             {COUNTRIES.map(c => <option key={c.code} value={c.code} className="dark:bg-[#111111]">{c.name}</option>)}
                           </select>
                           <div className="w-14 h-14 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl flex items-center justify-center">
                              <img src={`https://flagsapi.com/${newCase.presenterCountry}/flat/64.png`} className="w-8 h-8 object-contain" />
                           </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Email Address</label>
                          <input type="email" value={newCase.presenterEmail || ''} onChange={(e) => setNewCase({...newCase, presenterEmail: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold outline-none text-gray-900 dark:text-white" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Phone Member</label>
                          <input type="tel" value={newCase.presenterPhone || ''} onChange={(e) => setNewCase({...newCase, presenterPhone: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold outline-none text-gray-900 dark:text-white" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Credentials & Qualifications</label>
                        <input type="text" value={newCase.presenterQualifications} onChange={(e) => setNewCase({...newCase, presenterQualifications: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold outline-none text-gray-900 dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Relevant Publications</label>
                        <textarea value={newCase.presenterPublications} onChange={(e) => setNewCase({...newCase, presenterPublications: e.target.value})} placeholder="Peer reviewed papers..." className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-medium outline-none h-24 resize-none text-gray-900 dark:text-white" />
                      </div>
                    </div>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Professional Narrative (Bio)</label>
                        <textarea value={newCase.presenterBio} onChange={(e) => setNewCase({...newCase, presenterBio: e.target.value})} className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-medium outline-none h-32 resize-none text-gray-900 dark:text-white" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400">Industry Disclosures</label>
                        <textarea value={newCase.presenterDisclosures} onChange={(e) => setNewCase({...newCase, presenterDisclosures: e.target.value})} placeholder="Potential conflicts of interest..." className="w-full bg-rose-50/30 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 border rounded-2xl p-4 font-medium outline-none h-24 resize-none text-gray-900 dark:text-white" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 3 && caseType === 'structured' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                         <h3 className="text-lg font-black uppercase italic tracking-tighter text-indigo-900 dark:text-white mb-2">Clinical Presentation (CRF Part 1)</h3>
                         <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Chief Complaint & History</label>
                               <textarea 
                                 value={newCase.clinicalData.history} 
                                 onChange={(e) => setNewCase({...newCase, clinicalData: {...newCase.clinicalData, history: e.target.value}})} 
                                 className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 h-32 resize-none text-sm leading-relaxed text-gray-900 dark:text-white" 
                                 placeholder="Patient chief complaint, history of present illness..."
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Physical Examination</label>
                               <textarea 
                                 value={newCase.clinicalData.examination} 
                                 onChange={(e) => setNewCase({...newCase, clinicalData: {...newCase.clinicalData, examination: e.target.value}})} 
                                 className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 h-32 resize-none text-sm leading-relaxed text-gray-900 dark:text-white" 
                                 placeholder="Key clinical findings, vitals, systemic exam..."
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Initial Presentation</label>
                               <textarea 
                                 value={newCase.clinicalData.presentation} 
                                 onChange={(e) => setNewCase({...newCase, clinicalData: {...newCase.clinicalData, presentation: e.target.value}})} 
                                 className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 h-32 resize-none text-sm leading-relaxed text-gray-900 dark:text-white" 
                                 placeholder="Detailed presenting symptoms..."
                               />
                            </div>
                         </div>
                      </div>

                      <div className="space-y-6">
                         <h3 className="text-lg font-black uppercase italic tracking-tighter text-indigo-900 dark:text-white mb-2">Management & Differential</h3>
                         <div className="space-y-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Differential Diagnosis</label>
                               <textarea 
                                 value={newCase.clinicalData.differentialDiagnosis.join('\n')} 
                                 onChange={(e) => setNewCase({...newCase, clinicalData: {...newCase.clinicalData, differentialDiagnosis: e.target.value.split('\n')}})} 
                                 className="w-full bg-emerald-50/30 dark:bg-emerald-500/5 border-emerald-100 dark:border-white/10 border rounded-2xl p-4 h-32 resize-none text-sm leading-relaxed text-gray-900 dark:text-white" 
                                 placeholder="List possible diagnoses (one per line)..."
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Management & Protocol</label>
                               <textarea 
                                 value={newCase.clinicalData.management} 
                                 onChange={(e) => setNewCase({...newCase, clinicalData: {...newCase.clinicalData, management: e.target.value}})} 
                                 className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 h-32 resize-none text-sm leading-relaxed text-gray-900 dark:text-white" 
                                 placeholder="Clinical management steps, surgery details, medications..."
                               />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Outcome & Observations</label>
                               <textarea 
                                 value={newCase.clinicalData.outcome} 
                                 onChange={(e) => setNewCase({...newCase, clinicalData: {...newCase.clinicalData, outcome: e.target.value}})} 
                                 className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 h-32 resize-none text-sm leading-relaxed text-gray-900 dark:text-white" 
                                 placeholder="Final outcome, patient status, key expert observations..."
                               />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {wizardStep === 3 && caseType !== 'structured' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="p-8 rounded-[40px] bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20 space-y-6">
                        <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 mb-2">
                          <div className="p-2 bg-white dark:bg-white/10 rounded-xl shadow-sm"><ShieldCheck size={20} /></div>
                          <h3 className="font-black uppercase text-xs tracking-widest">Accreditation Gateway</h3>
                        </div>
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400 dark:text-indigo-300">CPD/CME Points Value</label>
                           <input type="number" step="0.1" value={newCase.accreditationPoints} onChange={(e) => setNewCase({...newCase, accreditationPoints: parseFloat(e.target.value)})} className="w-full bg-white dark:bg-white/5 border-indigo-100 dark:border-white/10 border rounded-2xl p-5 font-black text-3xl text-indigo-600 dark:text-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none" />
                        </div>
                        <p className="text-[10px] text-indigo-400 dark:text-white/40 font-bold leading-relaxed italic opacity-80">
                          Assign rewards to incentivise higher engagement from the global audience pool. 
                        </p>
                      </div>

                      <div className="p-8 rounded-[40px] bg-amber-50/50 dark:bg-amber-500/5 border border-amber-100/50 dark:border-amber-500/20 space-y-6">
                        <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-2">
                          <div className="p-2 bg-white dark:bg-white/10 rounded-xl shadow-sm"><Users size={20} /></div>
                          <h3 className="font-black uppercase text-xs tracking-widest">Education Sponsorship</h3>
                        </div>
                        <div className="flex items-center gap-3 p-4 bg-white dark:bg-white/10 rounded-2xl border border-amber-100 dark:border-white/5">
                          <input 
                            type="checkbox" 
                            id="isSponsoredWizard"
                            checked={newCase.isSponsored} 
                            onChange={(e) => setNewCase({...newCase, isSponsored: e.target.checked})}
                            className="w-5 h-5 rounded-lg border-amber-200 text-amber-600 focus:ring-amber-500 ring-offset-2" 
                          />
                          <label htmlFor="isSponsoredWizard" className="text-sm font-bold text-amber-900 dark:text-amber-100">Education Grant Provided</label>
                        </div>
                        {newCase.isSponsored && (
                          <div className="space-y-4 animate-in fade-in duration-300">
                             <div className="space-y-1">
                               <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 dark:text-white/40">Corporate Identity</label>
                               <select 
                                  value={newCase.sponsorId} 
                                  onChange={(e) => setNewCase({...newCase, sponsorId: e.target.value})}
                                  className="w-full bg-white dark:bg-white/5 border border-amber-100 dark:border-white/10 rounded-xl p-3 font-bold text-amber-900 dark:text-amber-100 outline-none"
                               >
                                  <option value="" className="dark:bg-[#111111]">Select Partner...</option>
                                  {sponsors.map(s => <option key={s.id} value={s.id} className="dark:bg-[#111111]">{s.name}</option>)}
                               </select>
                             </div>
                             <div className="space-y-1">
                               <label className="text-[10px] font-black uppercase tracking-widest text-amber-500 dark:text-white/40">Sponsorship Expiry</label>
                               <input type="date" value={newCase.expiryDate} onChange={(e) => setNewCase({...newCase, expiryDate: e.target.value})} className="w-full bg-white dark:bg-white/5 border-amber-100 dark:border-white/10 rounded-xl p-3 font-bold text-amber-900 dark:text-amber-100 outline-none" />
                             </div>
                          </div>
                        )}
                      </div>
                   </div>
                </div>
              )}
               {wizardStep === 4 && caseType === 'structured' && (
                 <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                       <div className="space-y-6">
                          <h3 className="text-lg font-black uppercase italic tracking-tighter text-indigo-900 dark:text-white mb-2">Clinical Evidence & Reference Material</h3>
                          <div className="space-y-4">
                             <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Clinical Case Thumbnail (Representative Visual)</label>
                                <div className="flex flex-col gap-4">
                                   <div className="w-full aspect-video rounded-3xl bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden group relative">
                                      {newCase.thumbnailUrl ? (
                                        <img src={newCase.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                      ) : (
                                        <div className="text-center">
                                           <Image size={32} className="mx-auto text-gray-200 dark:text-white/20 mb-2" />
                                           <p className="text-xs font-bold text-gray-300 dark:text-white/30">Select Case Visual</p>
                                        </div>
                                      )}
                                   </div>
                                   <div className="flex gap-4">
                                      <button 
                                        type="button" 
                                        disabled={isGeneratingImage || !newCase.title || !newCase.description}
                                        onClick={handleGenerateThumbnail}
                                        className="flex-1 bg-black text-white p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all disabled:opacity-30 flex items-center justify-center gap-2 shadow-xl"
                                      >
                                        {isGeneratingImage ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                        Generate AI
                                      </button>
                                      <button 
                                        type="button" 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 bg-white text-gray-900 border border-gray-100 p-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                      >
                                        <Image size={14} className="text-gray-400" />
                                        Upload
                                      </button>
                                   </div>
                                </div>
                             </div>
                             <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Supporting Reference Link (Evidence/DICOM/Video)</label>
                               <input type="url" value={newCase.videoUrl} onChange={(e) => setNewCase({...newCase, videoUrl: e.target.value})} placeholder="URL for investigative scans, audio logs, or video evidence..." className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-4 font-bold outline-none text-gray-900 dark:text-white" />
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <h3 className="text-lg font-black uppercase italic tracking-tighter text-indigo-900 dark:text-white mb-2">Case Narrative & Learning</h3>
                          <div className="space-y-4">
                             <div className="space-y-2">
                               <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Clinical Discussion & Key Learning Points</label>
                               <textarea 
                                 required 
                                 value={newCase.description} 
                                 onChange={(e) => setNewCase({...newCase, description: e.target.value})} 
                                 placeholder="In-depth clinical narrative. Discuss the complexities of this specific case and key takeaways for the medical community..."
                                 className="w-full bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/10 border rounded-2xl p-5 font-medium outline-none h-48 resize-none leading-relaxed text-gray-900 dark:text-white" 
                               />
                             </div>
                             <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/10">
                               <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 mb-1">
                                  <ShieldCheck size={16} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Integrity Check</span>
                                </div>
                               <p className="text-[10px] text-indigo-400 dark:text-white/40 font-bold leading-relaxed italic opacity-80">
                                 Structured Clinical Reports are indexed for global clinical research. Ensure all management protocols cited are supported by peer-reviewed evidence.
                               </p>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
              )}

              {wizardStep === 4 && caseType !== 'structured' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-6">
                        <div className="space-y-2">
                           <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/40">Case Thumbnail</label>
                           <div className="flex flex-col gap-4">
                              <div className="w-full aspect-video rounded-3xl bg-gray-50 dark:bg-white/5 border-2 border-dashed border-gray-200 dark:border-white/10 flex items-center justify-center overflow-hidden group relative">
                                 {newCase.thumbnailUrl ? (
                                   <>
                                     <img src={newCase.thumbnailUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="" />
                                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Sparkles size={32} className="text-white animate-pulse" />
                                     </div>
                                   </>
                                 ) : (
                                   <div className="text-center">
                                      <Image size={32} className="mx-auto text-gray-200 dark:text-white/20 mb-2" />
                                      <p className="text-xs font-bold text-gray-300 dark:text-white/30">Thumbnail Preview</p>
                                   </div>
                                 )}
                              </div>
                              <button 
                                type="button" 
                                disabled={isGeneratingImage || !newCase.title || !newCase.description}
                                onClick={handleGenerateThumbnail}
                                className="w-full bg-black text-white p-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl"
                              >
                                {isGeneratingImage ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                {newCase.thumbnailUrl ? 'Regenerate Clinical AI Thumbnail' : 'Generate Thumbnail'}
                              </button>
                              <button 
                                type="button" 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-white text-gray-900 border border-gray-100 p-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
                              >
                                <Image size={18} className="text-gray-400" />
                                Upload from Computer
                              </button>
                              <input 
                                ref={fileInputRef}
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={handleFileUpload}
                              />
                           </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500">Google Meet/Zoom Link</label>
                          <input 
                            required={!newCase.scheduledAt}
                            type="url" 
                            value={newCase.videoUrl} 
                            onChange={(e) => setNewCase({...newCase, videoUrl: e.target.value})} 
                            placeholder="https://..." 
                            className="w-full bg-gray-50 border-gray-100 border rounded-2xl p-5 font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none" 
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Detailed Case Narrative</label>
                        <textarea 
                          required 
                          value={newCase.description} 
                          onChange={(e) => setNewCase({...newCase, description: e.target.value})} 
                          placeholder="Provide the comprehensive clinical scenario, investigation findings, and primary learning objectives..."
                          className="w-full bg-gray-50 border-gray-100 border rounded-2xl p-6 font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none h-full min-h-[300px] resize-none leading-relaxed" 
                        />
                      </div>
                   </div>
                </div>
              )}
              {(wizardStep === 5 && caseType === 'structured') && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="p-8 rounded-[40px] bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-100/50 dark:border-emerald-500/20 space-y-6">
                        <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400 mb-2">
                          <div className="p-2 bg-white dark:bg-white/10 rounded-xl shadow-sm"><CheckCircle2 size={20} /></div>
                          <h3 className="font-black uppercase text-xs tracking-widest">Ready for Peer Review</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed font-bold">
                          The case presentation for <span className="text-black dark:text-white italic">"{newCase.title}"</span> is complete and adheres to the structured CRF format. 
                        </p>
                        <div className="p-4 rounded-2xl bg-white dark:bg-white/10 border border-emerald-100 dark:border-white/5 space-y-4">
                           <div className="flex items-center gap-4">
                              <img src={newCase.reviewerPhotoURL} className="w-12 h-12 rounded-full border-2 border-emerald-500" alt="" />
                              <div>
                                 <p className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tighter">Assigned Reviewer</p>
                                 <p className="text-sm font-bold text-emerald-600">{newCase.reviewerName}</p>
                              </div>
                           </div>
                           <p className="text-[10px] text-gray-400 font-medium">
                              Reviewer will receive a secured link to verify the clinical data against institutional standards.
                           </p>
                        </div>
                      </div>

                      <div className="space-y-6">
                         <div className="p-8 rounded-[40px] bg-indigo-50/50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/20">
                            <h3 className="text-lg font-black uppercase italic tracking-tighter text-indigo-900 dark:text-white mb-4">Submission Summary</h3>
                            <div className="space-y-3">
                               <div className="flex justify-between items-center text-xs border-b border-indigo-100 dark:border-white/5 pb-2">
                                  <span className="text-gray-400 font-black uppercase">Format</span>
                                  <span className="font-bold text-indigo-600">STRUCTURED CRF</span>
                               </div>
                               <div className="flex justify-between items-center text-xs border-b border-indigo-100 dark:border-white/5 pb-2">
                                  <span className="text-gray-400 font-black uppercase">Specialty</span>
                                  <span className="font-bold text-gray-900 dark:text-white">{newCase.specialty}</span>
                               </div>
                               <div className="flex justify-between items-center text-xs border-b border-indigo-100 dark:border-white/5 pb-2">
                                  <span className="text-gray-400 font-black uppercase">Accreditation</span>
                                  <span className="font-bold text-emerald-600">+{newCase.accreditationPoints} CME</span>
                               </div>
                            </div>
                         </div>

                         <div className={cn(
                           "p-8 rounded-[40px] border-2 transition-all",
                           newCase.clinicalPolicyAccepted ? "bg-emerald-50/20 border-emerald-500/20" : "bg-rose-50/20 border-rose-500/10"
                         )}>
                            <h3 className="text-sm font-black uppercase tracking-widest text-rose-500 mb-4 flex items-center gap-2">
                               <ShieldAlert size={18} />
                               Clinical Data Policy Sign-off
                            </h3>
                            <label className="flex items-start gap-4 cursor-pointer group">
                               <div className="relative mt-1">
                                  <input 
                                    type="checkbox" 
                                    className="peer sr-only" 
                                    checked={newCase.clinicalPolicyAccepted}
                                    onChange={(e) => setNewCase({...newCase, clinicalPolicyAccepted: e.target.checked})}
                                  />
                                  <div className="w-6 h-6 border-2 border-gray-300 dark:border-white/10 rounded-lg group-hover:border-rose-500 peer-checked:border-emerald-500 peer-checked:bg-emerald-500 transition-all flex items-center justify-center">
                                     <Check size={14} className="text-white scale-0 peer-checked:scale-100 transition-transform" />
                                  </div>
                               </div>
                               <span className="text-[10px] font-bold text-gray-500 dark:text-white/40 leading-relaxed uppercase tracking-tight">
                                 I confirm that all clinical data, images, and investigative findings have been de-identified. All Patient Identifiable Information (PII) has been redacted in compliance with institutional and global data privacy standards.
                               </span>
                            </label>
                         </div>
                      </div>
                   </div>
                </div>
              )}
            </form>

            {/* Wizard Navigation Footer */}
            <div className="p-8 bg-gray-50 dark:bg-[#151515] border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
              <button 
                type="button"
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1))}
                className={cn(
                  "px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-gray-200 dark:border-white/10 text-gray-500 hover:bg-white dark:hover:bg-white/5 flex items-center gap-2",
                  wizardStep === 1 ? "opacity-0 pointer-events-none" : "hover:text-black dark:hover:text-white"
                )}
              >
                ← Back
              </button>
              
              {wizardStep < (caseType === 'structured' ? 5 : 4) ? (
                <button 
                  type="button"
                  onClick={() => setWizardStep(prev => prev + 1)}
                  className="bg-indigo-600 text-white px-12 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/30 active:scale-95 flex items-center gap-2"
                >
                  Proceed to Phase {wizardStep + 1} →
                </button>
              ) : (
                <button 
                  onClick={handleCreate}
                  disabled={isSubmitting || (caseType === 'structured' && !newCase.clinicalPolicyAccepted)}
                  className="bg-black dark:bg-emerald-600 text-white px-16 py-5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-800 dark:hover:bg-emerald-700 transition-all shadow-2xl shadow-black/20 active:scale-95 disabled:opacity-50 flex items-center gap-3"
                >
                  {isSubmitting ? <Loader2 size={20} className="animate-spin" /> : <Rocket size={20} className="text-emerald-400 dark:text-white" />}
                  Submit Case
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
      {isEditingUserModal && editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto pt-20 pb-20">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden p-8 space-y-6 relative"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Edit User Profile</h2>
              <button onClick={() => setIsEditingUserModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const formData = new FormData(e.currentTarget);
                const { uploadBase64Image } = await import('../services/storageService');
                
                let finalPhotoURL = editingUser.photoURL;
                if (editingUser.photoURL?.startsWith('data:image')) {
                  finalPhotoURL = await uploadBase64Image(editingUser.photoURL, `users/photos/${editingUser.uid}_${Date.now()}.png`);
                }

                const updates = {
                  displayName: formData.get('displayName'),
                  email: formData.get('email'),
                  phone: formData.get('phone'),
                  qualifications: formData.get('qualifications'),
                  bio: formData.get('bio'),
                  publications: formData.get('publications'),
                  disclosures: formData.get('disclosures'),
                  region: formData.get('region'),
                  photoURL: finalPhotoURL,
                  profileCompletion: calculateProfileCompletion({
                    presenterName: formData.get('displayName'),
                    presenterEmail: formData.get('email'),
                    presenterPhotoURL: finalPhotoURL,
                    presenterBio: formData.get('bio'),
                    presenterQualifications: formData.get('qualifications'),
                    presenterCountry: formData.get('region')
                  })
                };
                await updateDoc(doc(db, 'users', editingUser.uid), updates);
                setAllUsers(prev => prev.map(u => u.uid === editingUser.uid ? { ...u, ...updates } : u));
                toast.success("User profile updated successfully");
                setIsEditingUserModal(false);
              } catch (err) {
                console.error("Update error:", err);
                toast.error("Failed to update user");
              }
            }} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
              <div className="flex items-center gap-6">
                <div className="relative group cursor-pointer" onClick={() => userPhotoInputRef.current?.click()}>
                   <div className="w-24 h-24 rounded-[30px] overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center group-hover:border-indigo-600 transition-all">
                      {editingUser.photoURL ? (
                        <img src={editingUser.photoURL} className="w-full h-full object-cover" />
                      ) : (
                        <User size={32} className="text-gray-300" />
                      )}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-[30px]">
                        <Plus className="text-white" size={24} />
                      </div>
                   </div>
                   <input 
                     ref={userPhotoInputRef}
                     type="file" 
                     className="hidden" 
                     accept="image/*"
                     onChange={handleUserPhotoUpload}
                   />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Full Name</label>
                  <input name="displayName" defaultValue={editingUser.displayName} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold outline-none" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Email Address</label>
                  <input name="email" type="email" defaultValue={editingUser.email} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Phone</label>
                  <input name="phone" type="tel" defaultValue={editingUser.phone} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Region / Country</label>
                  <select name="region" defaultValue={editingUser.region || 'IN'} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold outline-none appearance-none">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Qualifications</label>
                  <input name="qualifications" defaultValue={editingUser.qualifications} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold outline-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Professional Bio</label>
                <textarea name="bio" defaultValue={editingUser.bio} rows={3} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold outline-none resize-none" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Selected Publications</label>
                <textarea name="publications" defaultValue={editingUser.publications} rows={3} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold outline-none resize-none" placeholder="List key research papers or articles..." />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Conflict of Interest Disclosures</label>
                <textarea name="disclosures" defaultValue={editingUser.disclosures} rows={3} className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 font-bold outline-none resize-none" placeholder="Disclose any financial relationships..." />
              </div>

              <button type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-gray-800 transition-all shadow-xl sticky bottom-0">
                Save Profile Changes
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
