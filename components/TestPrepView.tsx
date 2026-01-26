
import React, { useState, useEffect, useRef } from 'react';
import { Subject, Grade, TestPrepPlan, Flashcard, ConceptLink } from '../types.ts';
import { generateTestPrepPlan } from '../services/geminiService.ts';
import LatexRenderer from './LatexRenderer.tsx';
import { 
  Calendar, Sparkles, Play, CheckCircle, 
  ArrowRight, Youtube, Clock, 
  ChevronLeft, BookOpen, Paperclip, X, FileText, 
  Layers, Map as MapIcon, Rotate3d, Lightbulb, 
  Hash, ArrowDown, RotateCcw, Plus
} from 'lucide-react';

interface TestPrepViewProps {
  subject: Subject | string;
  grade: Grade;
  initialSharedData?: { topic: string, days: number, attachment?: any } | null;
  onClearInitialData?: () => void;
  isTeacher?: boolean;
}

const FlashcardComp: React.FC<{ card: Flashcard, index: number }> = ({ card, index }) => {
    const [isFlipped, setIsFlipped] = useState(false);
    return (
        <div 
            onClick={() => setIsFlipped(!isFlipped)}
            className="group h-56 w-full perspective-1000 cursor-pointer animate-fade-in"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            <div className={`relative h-full w-full transition-all duration-700 preserve-3d shadow-xl rounded-[2rem] ${isFlipped ? 'rotate-y-180' : ''}`}>
                <div className="absolute inset-0 backface-hidden bg-white rounded-[2rem] border-2 border-blue-50 flex flex-col items-center justify-center p-8 text-center shadow-sm group-hover:shadow-blue-100 transition-all">
                    <div className="absolute top-4 left-4 bg-blue-50 text-blue-500 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black">{index + 1}</div>
                    <div className="bg-blue-50/50 p-3 rounded-2xl mb-4 text-blue-500 group-hover:scale-110 transition-transform"><Hash size={20} /></div>
                    <div className="text-xl font-black text-gray-800 leading-tight"><LatexRenderer text={card.front} /></div>
                    <div className="mt-6 text-gray-400 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full"><Rotate3d size={12} /> לחץ להפיכה</div>
                </div>
                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex flex-col items-center justify-center p-8 text-center shadow-2xl text-white overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                    <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl"></div>
                    <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-4 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm">הסבר מפורט</span>
                    <div className="text-lg font-medium leading-relaxed"><LatexRenderer text={card.back} /></div>
                </div>
            </div>
        </div>
    );
};

const ConceptMapVisual: React.FC<{ links: ConceptLink[] }> = ({ links }) => {
    return (
        <div className="relative space-y-12 py-10">
            {links.map((link, idx) => (
                <div key={idx} className="flex flex-col items-center animate-fade-in" style={{ animationDelay: `${idx * 0.2}s` }}>
                    <div className="flex flex-col md:flex-row items-center gap-6 w-full max-w-2xl">
                        <div className="flex-1 w-full md:w-auto">
                            <div className="bg-white p-5 rounded-3xl border-2 border-emerald-100 shadow-md text-center hover:border-emerald-400 transition-all transform hover:-translate-y-1">
                                <span className="block text-[10px] text-emerald-500 font-bold uppercase mb-1">נושא</span>
                                <span className="text-lg font-black text-gray-800"><LatexRenderer text={link.from} /></span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center gap-1 shrink-0 px-4">
                            <div className="bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg shadow-emerald-200/50 z-10 whitespace-nowrap">{link.relation}</div>
                            <div className="h-10 w-1 bg-gradient-to-b from-emerald-100 via-emerald-400 to-indigo-100 rounded-full my-1"></div>
                        </div>
                        <div className="flex-1 w-full md:w-auto">
                            <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-3xl border-2 border-indigo-100 shadow-md text-center hover:border-indigo-400 transition-all transform hover:-translate-y-1">
                                <span className="block text-[10px] text-indigo-500 font-bold uppercase mb-1">תוצאה / קשר</span>
                                <span className="text-lg font-black text-gray-800"><LatexRenderer text={link.to} /></span>
                            </div>
                        </div>
                    </div>
                    {idx < links.length - 1 && (
                        <div className="mt-8 flex flex-col items-center">
                            <div className="w-1 h-12 border-l-2 border-dashed border-gray-200"></div>
                            <ArrowDown size={16} className="text-gray-300 -mt-1" />
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

const TestPrepView: React.FC<TestPrepViewProps> = ({ subject, grade, initialSharedData, onClearInitialData, isTeacher }) => {
  const [topicInput, setTopicInput] = useState('');
  const [daysCount, setDaysCount] = useState(3);
  const [activePlan, setActivePlan] = useState<TestPrepPlan | null>(null);
  const [activeDay, setActiveDay] = useState<number | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'CONTENT' | 'INTERACTIVE' | 'QUIZ'>('CONTENT');
  const [loading, setLoading] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<{file: File, name: string, data: string, mimeType: string} | null>(null);

  const savePlan = (plan: TestPrepPlan | null) => {
    const storageKey = `test_prep_${subject}`;
    if (plan) {
      setActivePlan(plan);
      localStorage.setItem(storageKey, JSON.stringify(plan));
    } else {
      localStorage.removeItem(storageKey);
      setActivePlan(null);
      setActiveDay(null);
      setTopicInput('');
      setDaysCount(3);
      setAttachment(null);
      setQuizFinished(false);
      setQuizAnswers({});
      setActiveSubTab('CONTENT');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreatePlan = async (overrideTopic?: string, overrideDays?: number, overrideAttachment?: any) => {
    const finalTopic = overrideTopic || topicInput;
    const finalDays = overrideDays || daysCount;
    if (!finalTopic.trim() && !attachment && !overrideAttachment) return;
    
    setLoading(true);
    const attachmentData = overrideAttachment || (attachment ? { mimeType: attachment.mimeType, data: attachment.data } : undefined);
    
    try {
        const plan = await generateTestPrepPlan(subject, grade, finalTopic, finalDays, attachmentData);
        if (plan) {
          savePlan(plan);
        } else {
          alert("מצטערים, חלה שגיאה בבניית התוכנית. נסה שוב עם נושא אחר.");
        }
    } catch (e) {
        console.error("Error creating plan", e);
        alert("מצטערים, חלה שגיאה בלתי צפויה.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(`test_prep_${subject}`);
    if (saved) {
      try {
        setActivePlan(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load plan", e);
      }
    } else {
      setActivePlan(null);
    }
  }, [subject]);

  useEffect(() => {
    if (initialSharedData) {
        setTopicInput(initialSharedData.topic);
        setDaysCount(initialSharedData.days);
        handleCreatePlan(initialSharedData.topic, initialSharedData.days, initialSharedData.attachment);
        if (onClearInitialData) onClearInitialData();
    }
  }, [initialSharedData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setAttachment({ file: file, name: file.name, data: base64Data, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCompleteDay = (dayNum: number) => {
    if (!activePlan) return;
    const newCompleted = activePlan.completedDays.includes(dayNum) ? activePlan.completedDays : [...activePlan.completedDays, dayNum];
    
    // Check if everything is finished
    if (newCompleted.length === activePlan.totalDays) {
      alert(isTeacher ? "מערך ההכנה הכיתתי הושלם ונמחק!" : "כל הכבוד! סיימת את כל תוכנית ההכנה למבחן. התוכנית תושלם ותימחק כעת.");
      savePlan(null); // Clear plan and return to home
    } else {
      const updated = { ...activePlan, completedDays: newCompleted };
      savePlan(updated);
      setActiveDay(null);
      setQuizFinished(false);
      setQuizAnswers({});
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] shadow-sm min-h-[400px] text-center border border-gray-100">
        <div className="relative mb-8">
          <div className="absolute inset-0 rounded-full bg-blue-100 animate-ping opacity-25"></div>
          <div className="relative p-8 bg-blue-50 rounded-full shadow-inner"><Sparkles className="text-primary animate-pulse" size={64} /></div>
        </div>
        <h3 className="text-3xl font-black text-gray-900 mb-2">{isTeacher ? 'בונה תוכנית למידה כיתתית...' : 'בונה לך תוכנית אישית...'}</h3>
        <p className="text-gray-700 font-bold mb-4 text-xl">מעבד נתונים פדגוגיים...</p>
        <p className="text-gray-400 text-sm max-w-xs mx-auto">
            {isTeacher ? 'הבינה המלאכותית מכינה מערך הכנה כיתתי מקיף הכולל סיכומים, תרגול ומושגים.' : 'הבינה המלאכותית מכינה לך מערך הכנה מקיף הכולל סיכומים, תרגול ומושגים.'}
        </p>
      </div>
    );
  }

  if (activeDay !== null && activePlan) {
    const day = activePlan.days.find(d => d.dayNumber === activeDay);
    if (!day) return null;

    return (
      <div className="animate-fade-in space-y-8 pb-20 max-w-6xl mx-auto">
        <button onClick={() => {setActiveDay(null); setActiveSubTab('CONTENT');}} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-all font-bold group"><div className="bg-white p-2 rounded-full border border-gray-200 group-hover:border-primary group-hover:text-primary transition-all"><ArrowRight size={20} /></div>חזרה לתוכנית {isTeacher ? 'הכיתתית' : 'האישית'}</button>
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100 flex flex-col">
          <div className="bg-gray-900 text-white p-10 md:p-14 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div><span className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block shadow-lg">יחידת למידה {day.dayNumber} מתוך {activePlan.totalDays}</span><h2 className="text-4xl md:text-5xl font-black">{day.title}</h2></div>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                    <button onClick={() => setActiveSubTab('CONTENT')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-3 shrink-0 ${activeSubTab === 'CONTENT' ? 'bg-white text-gray-900 shadow-xl' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}><BookOpen size={20} /><span>תוכן היחידה</span></button>
                    <button onClick={() => setActiveSubTab('INTERACTIVE')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-3 shrink-0 ${activeSubTab === 'INTERACTIVE' ? 'bg-white text-gray-900 shadow-xl' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}><Layers size={20} /><span>עזרים ויזואליים</span></button>
                    <button onClick={() => setActiveSubTab('QUIZ')} className={`px-8 py-3 rounded-2xl text-sm font-black transition-all flex items-center gap-3 shrink-0 ${activeSubTab === 'QUIZ' ? 'bg-white text-gray-900 shadow-xl' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}><FileText size={20} /><span>מבחן בדיקה</span></button>
                </div>
            </div>
          </div>
          <div className="p-8 md:p-14 bg-gray-50/30">
            {activeSubTab === 'CONTENT' && (
              <section className="animate-fade-in space-y-10">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-4"><div className="flex items-center gap-4"><div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shadow-sm"><BookOpen size={28} /></div><div><h3 className="text-2xl font-black text-gray-900">{isTeacher ? 'סקירת תוכן פדגוגי' : 'סיכום החומר'}</h3><p className="text-sm text-gray-500">{isTeacher ? 'עבור על הסיכום שהוכן עבור התלמידים' : 'קרא בעיון את הדגשים החשובים ליום זה'}</p></div></div></div>
                <div className="bg-white p-10 md:p-16 rounded-[3rem] shadow-xl border border-gray-100 leading-relaxed text-lg text-gray-800"><LatexRenderer text={day.summary} /></div>
              </section>
            )}
            {activeSubTab === 'INTERACTIVE' && (
              <section className="animate-fade-in space-y-16">
                <div><div className="flex items-center gap-4 mb-10"><div className="bg-orange-100 p-3 rounded-2xl text-orange-600 shadow-sm"><Layers size={28} /></div><div><h3 className="text-2xl font-black text-gray-900">כרטיסיות מושגים</h3><p className="text-sm text-gray-500">{isTeacher ? 'עזר זיכרון עבור תלמידי הכיתה' : 'עזר זיכרון עבורך'}</p></div></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">{day.flashcards.map((card, idx) => <FlashcardComp key={idx} index={idx} card={card} />)}</div></div>
                <div className="pt-16 border-t border-gray-100"><div className="flex items-center gap-4 mb-10"><div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 shadow-sm"><MapIcon size={28} /></div><div><h3 className="text-2xl font-black text-gray-900">{isTeacher ? 'מפת מושגים פדגוגית' : 'מפת מושגים'}</h3><p className="text-sm text-gray-500">{isTeacher ? 'הקשרים לוגיים בתוכנית הלימודים' : 'הבנת הקשרים בין הנושאים'}</p></div></div><div className="bg-white rounded-[3rem] p-10 md:p-16 border border-gray-100 shadow-lg relative overflow-hidden"><div className="relative z-10"><ConceptMapVisual links={day.conceptMap} /></div></div></div>
              </section>
            )}
            {activeSubTab === 'QUIZ' && (
              <section className="animate-fade-in space-y-12 max-w-4xl mx-auto"><div className="flex items-center gap-4 mb-8"><div className="bg-purple-100 p-3 rounded-2xl text-purple-600 shadow-sm"><FileText size={28} /></div><div><h3 className="text-2xl font-black text-gray-900">בקרת למידה</h3><p className="text-sm text-gray-500">שאלות לבדיקת הבנה בתום יחידת הלימוד</p></div></div><div className="space-y-8">{day.quiz.map((q, qIdx) => (
                    <div key={qIdx} className="bg-white p-8 md:p-10 rounded-[2.5rem] border-2 border-gray-100 shadow-sm hover:border-purple-200 transition-all"><div className="flex items-start gap-4 mb-6"><div className="bg-purple-50 text-purple-600 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm">{qIdx + 1}</div><h4 className="font-bold text-gray-900 text-xl leading-tight pt-1"><LatexRenderer text={q.text} /></h4></div><div className="grid gap-4">{q.options.map((opt, oIdx) => {
                          const isSelected = quizAnswers[q.id] === oIdx;
                          const isCorrect = oIdx === q.correctIndex;
                          let btnClass = "border-gray-100 hover:bg-gray-50 hover:border-purple-100";
                          if (quizFinished) { if (isCorrect) btnClass = "bg-green-50 border-green-500 text-green-900 shadow-green-100 shadow-lg"; else if (isSelected) btnClass = "bg-red-50 border-red-500 text-red-900 shadow-red-100 shadow-lg"; else btnClass = "opacity-40 border-gray-50 grayscale pointer-events-none"; } else if (isSelected) { btnClass = "border-purple-500 bg-purple-50 text-purple-900 shadow-purple-100 shadow-lg"; }
                          return ( <button key={oIdx} onClick={() => !quizFinished && setQuizAnswers(prev => ({...prev, [q.id]: oIdx}))} className={`w-full p-5 rounded-[1.5rem] border-2 text-right transition-all font-bold flex justify-between items-center group ${btnClass}`}><div className="flex items-center gap-4"><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-current bg-current' : 'border-gray-300'}`}>{isSelected && <div className="w-2 h-2 rounded-full bg-white"></div>}</div><LatexRenderer text={opt} /></div>{quizFinished && isCorrect && <CheckCircle size={22} className="text-green-600 animate-bounce" />}</button> );
                        })}</div>{quizFinished && (<div className="mt-8 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4 animate-fade-in"><Lightbulb className="text-blue-500 shrink-0" size={24} /><div className="text-sm text-blue-900 leading-relaxed"><strong className="block mb-1 text-base">{isTeacher ? 'הסבר הפתרון הפדגוגי:' : 'למה זו התשובה הנכונה?'}</strong><LatexRenderer text={q.explanation} /></div></div>)}</div>
                  ))}</div>
                {!quizFinished ? ( <button disabled={Object.keys(quizAnswers).length < day.quiz.length} onClick={() => setQuizFinished(true)} className="w-full mt-10 bg-gray-900 text-white py-6 rounded-3xl font-black text-xl shadow-2xl hover:shadow-gray-400 hover:-translate-y-1 transition-all disabled:opacity-30 disabled:cursor-not-allowed">{isTeacher ? 'בדוק איכות שאלות' : 'בדוק את התשובות שלי'}</button> ) : ( <button onClick={() => handleCompleteDay(day.dayNumber)} className="w-full mt-10 bg-green-600 text-white py-6 rounded-3xl font-black text-xl shadow-2xl hover:bg-green-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-3"><CheckCircle size={28} /><span>{isTeacher ? 'אישור יחידת הלימוד לכיתה' : 'סיום יחידת הלימוד!'}</span></button> )}
              </section>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (activePlan) {
    const progress = Math.round((activePlan.completedDays.length / activePlan.totalDays) * 100);
    return (
      <div className="animate-fade-in space-y-8 pb-20 max-w-5xl mx-auto">
        <div className="bg-white rounded-[3rem] p-10 md:p-14 shadow-xl border border-gray-100 flex flex-col md:flex-row justify-between gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[4rem] -z-0"></div>
          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-3 text-blue-500 font-black text-xs uppercase tracking-widest mb-4"><Sparkles size={16} /><span>מערך הכנה {isTeacher ? 'כיתתי' : 'אישי'} פעיל</span></div>
            <h2 className="text-4xl font-black text-gray-900 mb-2">{activePlan.targetTopic}</h2>
            <p className="text-gray-500 font-medium">תוכנית הכנה מובנית ל{activePlan.subject} ב{activePlan.totalDays} ימי למידה</p>
            <div className="mt-8"><div className="flex justify-between items-center mb-3"><span className="text-sm font-black text-gray-600">סטטוס הכנה</span><span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{progress}%</span></div><div className="h-4 bg-gray-100 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 shadow-lg" style={{ width: `${progress}%` }}></div></div></div>
          </div>
        </div>
        <div className="grid gap-6">
          {activePlan.days.map((day) => {
            const isCompleted = activePlan.completedDays.includes(day.dayNumber);
            const isUnlocked = day.dayNumber === 1 || activePlan.completedDays.includes(day.dayNumber - 1);
            return ( <div key={day.dayNumber} className={`group flex items-center gap-6 p-8 rounded-[2.5rem] border-2 transition-all ${isCompleted ? 'bg-green-50 border-green-100' : isUnlocked ? 'bg-white border-blue-500 shadow-xl transform hover:scale-[1.01]' : 'bg-gray-50 border-gray-100 opacity-60'}`}><div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-2xl font-black shrink-0 shadow-lg ${isCompleted ? 'bg-green-500 text-white' : isUnlocked ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>{isCompleted ? <CheckCircle size={32} /> : day.dayNumber}</div><div className="flex-1"><h4 className={`text-xl font-black mb-1 ${!isUnlocked ? 'text-gray-400' : 'text-gray-900'}`}>{day.title}</h4><div className="flex items-center gap-4"><span className="text-xs text-gray-400 font-bold flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full"><Clock size={12} /> יחידת תוכן שלמה</span>{isCompleted && <span className="text-xs text-green-600 font-black uppercase tracking-widest bg-green-100 px-3 py-1 rounded-full">{isTeacher ? 'מוכן לכיתה!' : 'הושלם!'}</span>}</div></div><button onClick={() => isUnlocked && setActiveDay(day.dayNumber)} disabled={!isUnlocked} className={`px-8 py-3 rounded-[1.25rem] font-black flex items-center gap-2 transition-all ${isCompleted ? 'text-green-700 hover:bg-green-100' : isUnlocked ? 'bg-blue-600 text-white shadow-lg hover:bg-blue-700' : 'text-gray-400'}`}>{isCompleted ? 'ערוך שוב' : isUnlocked ? 'סקירה' : 'נעול'}{isUnlocked && <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />}</button></div> );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="bg-white rounded-[3rem] p-12 md:p-16 shadow-2xl border border-gray-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-bl-[4rem] -z-0"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-6 mb-12"><div className="bg-blue-100 p-5 rounded-[2rem] text-blue-600 shadow-inner"><Calendar size={40} /></div><div><h2 className="text-4xl font-black text-gray-900 mb-1">{isTeacher ? 'תכנון הכנה למבחן כיתתי' : 'הכנה למבחן'}</h2><p className="text-gray-500 text-lg font-medium">{isTeacher ? 'בוא נבנה לכיתה תוכנית הכנה מנצחת' : 'בוא נבנה לך תוכנית למידה מנצחת'}</p></div></div>
          <div className="space-y-8">
            <div><label className="block text-sm font-black text-gray-700 mb-3 uppercase tracking-widest">{isTeacher ? 'מהו נושא המבחן הכיתתי?' : 'על מה המבחן שלך?'}</label><textarea value={topicInput} onChange={(e) => setTopicInput(e.target.value)} placeholder="לדוגמה: משוואות ריבועיות, המהפכה התעשייתית..." className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10 outline-none transition-all h-32 resize-none mb-4 font-medium text-lg" />
                <div className="flex flex-col gap-3"><div className="flex items-center gap-4"><button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-3 px-6 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-2xl transition-all font-black text-sm border-2 border-gray-100 shadow-sm group"><Paperclip size={20} className="group-hover:rotate-12 transition-transform" /><span>העלה קובץ (דפי חזרה / סיכומי שיעור)</span></button><input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,application/pdf" className="hidden" /></div>{attachment && (<div className="flex items-center gap-3 bg-blue-600 text-white px-5 py-3 rounded-2xl w-fit animate-fade-in shadow-lg"><FileText size={18} /><span className="text-sm font-black max-w-[200px] truncate">{attachment.name}</span><button onClick={removeAttachment} className="hover:bg-white/20 p-1.5 rounded-full transition-colors ml-1"><X size={16} /></button></div>)}</div>
            </div>
            <div className="grid md:grid-cols-2 gap-8"><div><label className="block text-sm font-black text-gray-700 mb-3 uppercase tracking-widest">{isTeacher ? 'לכמה ימי למידה נתכנן?' : 'כמה ימים נשארו למבחן?'}</label><div className="flex items-center gap-6 bg-gray-50 p-3 rounded-[1.5rem] border-2 border-gray-100"><button onClick={() => setDaysCount(Math.max(1, daysCount - 1))} className="w-12 h-12 bg-white rounded-2xl shadow-sm font-black text-2xl hover:bg-gray-100 transition-all">-</button><span className="flex-1 text-center font-black text-3xl text-gray-800">{daysCount}</span><button onClick={() => setDaysCount(Math.min(14, daysCount + 1))} className="w-12 h-12 bg-white rounded-2xl shadow-sm font-black text-2xl hover:bg-gray-100 transition-all">+</button></div></div></div>
            <button onClick={() => handleCreatePlan()} disabled={(!topicInput.trim() && !attachment) || loading} className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-4 mt-6 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed">
                <Sparkles size={32} />
                {isTeacher ? 'ייצר תוכנית הכנה כיתתית' : 'ייצר תוכנית הכנה אישית'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPrepView;
