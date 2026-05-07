import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, Check, MapPin, Target, Sparkles, Loader2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';
import { COUNTRIES, SPECIALTIES } from '../../constants';

export default function OnboardingModal() {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    displayName: profile?.displayName || '',
    careerGoal: '',
    region: 'India',
    interests: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  useEffect(() => {
    async function detectLocation() {
      setIsDetectingLocation(true);
      try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        if (data.country_name) {
          // Check if we support this country in our constants
          const match = COUNTRIES.find(c => c.name === data.country_name);
          if (match) {
            setFormData(prev => ({ ...prev, region: match.name }));
          }
        }
      } catch (err) {
        console.error("Location detection failed:", err);
      } finally {
        setIsDetectingLocation(false);
      }
    }
    if (step === 2) {
      detectLocation();
    }
  }, [step]);

  if (!profile || profile.onboardingCompleted) return null;

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const toggleInterest = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest) 
        ? prev.interests.filter(i => i !== interest)
        : prev.interests.length < 3 ? [...prev.interests, interest] : prev.interests
    }));
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName,
        careerGoal: formData.careerGoal,
        region: formData.region,
        specialties: formData.interests,
        onboardingCompleted: true
      });
      await refreshProfile();
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#12141D] w-full max-w-lg rounded-[32px] overflow-hidden shadow-2xl border border-white/10"
      >
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-white/5 flex">
          <motion.div 
            className="h-full bg-blue-600"
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <div className="p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
             <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(249,115,22,0.3)]">
                <div className="text-white text-2xl font-black">+</div>
             </div>
             <h2 className="text-2xl font-bold tracking-tight text-white">Welcome to Assimilate AI</h2>
             <p className="text-sm text-white/40 font-medium tracking-wide">Step {step} of 3</p>
          </div>

          {/* Form Content */}
          <div className="min-h-[280px]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Who are you?</h3>
                    <p className="text-sm text-white/60">Let's start with the basics.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Full Name *</label>
                    <input 
                      type="text"
                      placeholder="e.g., Dr. Jane Doe"
                      value={formData.displayName}
                      onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    />
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">What are your goals?</h3>
                    <p className="text-sm text-white/60">Help us understand your professional journey.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Primary Career Goal *</label>
                      <input 
                        type="text"
                        placeholder="e.g., To excel in Internal Medicine"
                        value={formData.careerGoal}
                        onChange={e => setFormData({ ...formData, careerGoal: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-white/40 uppercase tracking-widest ml-1">Your Region *</label>
                      <div className="relative">
                        <select 
                          value={formData.region}
                          onChange={e => setFormData({ ...formData, region: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none pr-10"
                        >
                          {COUNTRIES.map(c => <option key={c.code} value={c.name} className="bg-[#12141D]">{c.flag} {c.name}</option>)}
                          <option value="Other" className="bg-[#12141D]">🏳️ Other</option>
                        </select>
                        {isDetectingLocation && (
                          <div className="absolute right-3 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="text-blue-500 animate-spin" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white mb-2">What are your interests?</h3>
                    <p className="text-sm text-white/60">Select up to 3 specialties that interest you the most.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-h-48 overflow-y-auto p-2">
                    {Object.values(SPECIALTIES).map(specialty => (
                      <button 
                        key={specialty.name}
                        onClick={() => toggleInterest(specialty.name)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                          formData.interests.includes(specialty.name)
                            ? "bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                            : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                        )}
                      >
                        {specialty.name}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <button 
              onClick={handleBack}
              disabled={step === 1 || loading}
              className={cn(
                "font-bold text-xs uppercase tracking-widest px-6 py-3 rounded-xl transition-all",
                step === 1 ? "opacity-0 pointer-events-none" : "text-white/40 hover:text-white"
              )}
            >
              Back
            </button>
            
            {step < 3 ? (
              <button 
                onClick={handleNext}
                disabled={!formData.displayName && step === 1}
                className="bg-white/10 text-white hover:bg-white/20 px-8 py-3 rounded-xl flex items-center gap-2 font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button 
                onClick={handleSubmit}
                disabled={loading || formData.interests.length === 0}
                className="bg-white text-black px-8 py-3 rounded-xl flex items-center gap-2 font-bold text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-xl"
              >
                {loading ? 'Submitting...' : 'Submit'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
