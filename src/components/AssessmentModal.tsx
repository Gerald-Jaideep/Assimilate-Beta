import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Clock, X, ChevronRight, Check } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import confetti from 'canvas-confetti';

interface Question {
  id: string;
  text: string;
  options: string[];
  correctOptionIndex: number;
  difficulty: "Simple" | "Moderate" | "Difficult";
}

interface Assessment {
  caseId: string;
  questions: Question[];
  timeLimitMinutes: number;
  maxAttempts: number;
  passPercentage: number;
}

interface AssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onCertificateUnlocked: () => void;
}

export function AssessmentModal({ isOpen, onClose, caseId, onCertificateUnlocked }: AssessmentModalProps) {
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [attemptCount, setAttemptCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (!isOpen || !user) return;
    
    const fetchAssessment = async () => {
      try {
        setLoading(true);
        // Assuming we store one assessment per case as the document `caseId` in a subcollection or just `case_assessments/caseId`. We'll just mock or fetch.
        // Wait, the path is `cases/{caseId}/assessments/{assessmentId}`. Often assessmentId can just be 'default'.
        const docRef = doc(db, 'cases', caseId, 'assessments', 'default');
        const docSnap = await getDoc(docRef);
        
        let fetchedAssessment = docSnap.exists() ? docSnap.data() as Assessment : null;
        
        // If no assessment exists in DB yet, let's create a mock one for the demo, or just show "no assessment".
        if (!fetchedAssessment) {
          fetchedAssessment = {
            caseId,
            timeLimitMinutes: 5,
            maxAttempts: 5,
            passPercentage: 70,
            questions: [
              { id: 'q1', text: 'What was the primary symptom presented in this case?', options: ['Fever', 'Headache', 'Chest Pain', 'Fatigue'], correctOptionIndex: 2, difficulty: 'Simple' },
              { id: 'q2', text: 'Which diagnostic test confirmed the condition?', options: ['MRI', 'X-Ray', 'CT Scan', 'Blood Test'], correctOptionIndex: 0, difficulty: 'Moderate' },
              { id: 'q3', text: 'What was the first line of treatment administered?', options: ['Antibiotics', 'Surgery', 'Rest', 'Beta-blockers'], correctOptionIndex: 3, difficulty: 'Moderate' },
              { id: 'q4', text: 'What complication arised during the procedure?', options: ['None', 'Bleeding', 'Infection', 'Arrhythmia'], correctOptionIndex: 1, difficulty: 'Difficult' },
              { id: 'q5', text: 'What is the recommended follow-up period?', options: ['1 week', '1 month', '3 months', '6 months'], correctOptionIndex: 2, difficulty: 'Simple' },
            ]
          };
          // Try saving to DB (requires admin rules, might fail if user is not admin, so catch error)
          try {
             // await setDoc(docRef, fetchedAssessment); 
          } catch(e) {}
        }
        
        setAssessment(fetchedAssessment);
        setTimeLeft(fetchedAssessment.timeLimitMinutes * 60);

        // Fetch attempt count
        const attemptRef = doc(db, 'users', user.uid, 'assessment_attempts', `${caseId}_latest`);
        const attemptSnap = await getDoc(attemptRef);
        if (attemptSnap.exists()) {
           // update attemptCount based on history if tracked. 
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssessment();
  }, [isOpen, caseId, user]);

  useEffect(() => {
    if (!assessment || isFinished) return;
    
    if (timeLeft <= 0) {
      handleFinish();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, assessment, isFinished]);

  const handleOptionSelect = (optionIndex: number) => {
    if (assessment) {
      const currentQuestion = assessment.questions[currentQuestionIndex];
      setAnswers(prev => ({ ...prev, [currentQuestion.id]: optionIndex }));
      
      if (optionIndex === currentQuestion.correctOptionIndex) {
         confetti({
           particleCount: 50,
           spread: 60,
           origin: { y: 0.8 },
           colors: ['#4ade80', '#22c55e']
         });
      }
    }
  };

  const handleNext = () => {
    if (assessment && currentQuestionIndex < assessment.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    if (!assessment || !user) return;
    
    setIsFinished(true);
    let correctCount = 0;
    assessment.questions.forEach(q => {
      if (answers[q.id] === q.correctOptionIndex) correctCount++;
    });
    const finalScore = (correctCount / assessment.questions.length) * 100;
    setScore(finalScore);
    const passed = finalScore >= assessment.passPercentage;

    const attemptId = `${caseId}_${Date.now()}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'assessment_attempts', attemptId), {
        userId: user.uid,
        caseId,
        assessmentId: 'default',
        score: finalScore,
        passed,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        answers: Object.entries(answers).map(([qId, index]) => ({
          questionId: qId,
          selectedOptionIndex: index,
          isCorrect: assessment.questions.find(q => q.id === qId)?.correctOptionIndex === index
        }))
      });

      if (passed) {
        // Unlock certificate
        confetti({
           particleCount: 150,
           spread: 100,
           origin: { y: 0.6 }
        });
        
        await setDoc(doc(db, 'users', user.uid, 'certificates', attemptId), {
          userId: user.uid,
          caseId,
          attemptId,
          certificateTemplateId: 'default',
          issuedAt: new Date().toISOString(),
          qrCodeData: `https://app.assimilate.one/verify/${attemptId}`, // placeholder link
        });
        
        setTimeout(() => {
           onCertificateUnlocked();
           onClose();
        }, 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const currentQuestion = assessment?.questions[currentQuestionIndex];
  
  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden relative"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <X className="w-6 h-6" />
        </button>

        {loading ? (
          <div className="p-12 text-center">Loading assessment...</div>
        ) : isFinished && assessment ? (
          <div className="p-12 text-center">
             <h2 className="text-3xl font-bold mb-4">{score >= assessment.passPercentage ? 'Congratulations!' : 'Almost there!'}</h2>
             <p className="text-xl mb-8">You scored {score}%</p>
             {score >= assessment.passPercentage ? (
               <div className="text-green-500 flex flex-col items-center">
                 <CheckCircle2 className="w-16 h-16 mb-4" />
                 <p>You've passed the assessment and unlocked your certificate!</p>
               </div>
             ) : (
               <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">You need {assessment.passPercentage}% to pass. You can try again.</p>
                  <button onClick={() => {
                      setIsFinished(false);
                      setCurrentQuestionIndex(0);
                      setAnswers({});
                      setTimeLeft(assessment.timeLimitMinutes * 60);
                  }} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                    Retry Assessment
                  </button>
               </div>
             )}
          </div>
        ) : assessment && currentQuestion ? (
          <div className="p-8">
            <div className="flex justify-between items-center mb-8 border-b dark:border-gray-800 pb-4">
              <div>
                 <h2 className="text-2xl font-bold">Assessment</h2>
                 <p className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {assessment.questions.length}</p>
              </div>
              <div className="flex items-center text-orange-500 font-mono text-lg font-medium">
                <Clock className="w-5 h-5 mr-2" />
                {formatTime(timeLeft)}
              </div>
            </div>

            <div className="mb-8">
              <div className="flex items-center mb-4">
                 <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                   currentQuestion.difficulty === 'Simple' ? 'bg-green-100 text-green-700' :
                   currentQuestion.difficulty === 'Moderate' ? 'bg-yellow-100 text-yellow-700' :
                   'bg-red-100 text-red-700'
                 }`}>
                   {currentQuestion.difficulty}
                 </span>
              </div>
              <h3 className="text-xl font-medium mb-6">{currentQuestion.text}</h3>
              
              <div className="space-y-3">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleOptionSelect(idx)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center ${
                      answers[currentQuestion.id] === idx 
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20' 
                        : 'border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <span>{option}</span>
                    {answers[currentQuestion.id] === idx && <Check className="w-5 h-5 text-indigo-600" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between mt-8">
              <button
                onClick={handleNext}
                className="text-gray-500 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                Skip Question
              </button>
              
              <button
                onClick={handleNext}
                className="flex items-center px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
              >
                {currentQuestionIndex === assessment.questions.length - 1 ? 'Finish' : 'Next Question'}
                <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            </div>
          </div>
        ) : null}
      </motion.div>
    </div>
  );
}
