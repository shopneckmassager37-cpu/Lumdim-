
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, BookCopy, Sparkles, Users, FileText, 
  ChevronLeft, BarChart3, PlusCircle, ArrowRight, Loader2,
  Clock, CheckCircle2, MessageSquare, ClipboardList, Zap,
  Upload, X, Info, Target, List, Lightbulb, BookOpen, Save,
  Presentation, LayoutTemplate, ChevronRight, Share2, Printer, 
  MonitorPlay, Briefcase, Award, Rocket, Brain, Star, ClipboardCheck,
  FileSearch, Search, AlertTriangle, CheckCircle, HelpCircle, GraduationCap, Home, Maximize2, Download, ExternalLink
} from 'lucide-react';
import { Classroom, Subject, Grade, User, LessonPlan, InfographicData, PresentationData, ExamCheckResult, HistoryItem } from '../types.ts';
import { generateLessonPlan, generateLessonVisuals, checkExamWithRubric } from '../services/geminiService.ts';
import LatexRenderer from './LatexRenderer.tsx';

const DB_KEY = 'lumdim_global_database_v1';

interface TeacherDashboardProps {
  user: User;
  onSelectClass: (id: string) => void;
  onOpenTool: (tool: 'PLANNER' | 'CHAT' | 'MATERIALS' | 'CLASSROOM') => void;
  onAddHistoryItem: (item: HistoryItem) => void;
  initialTeacherTab?: 'OVERVIEW' | 'PLANNER' | 'EXAM_CHECKER';
  initialLessonPlan?: LessonPlan | null;
}

const PLANNER_LOADING_STEPS = [
  "מנתח את נושא השיעור...",
  "בונה את גוף השיעור...",
  "מגדיר מטרות פדגוגיות...",
  "מתכנן פעילות קבוצתית...",
  "מנסח שאלות לסיכום ודיון...",
  "מכין שיעורי בית...",
  "מלטש את מערך השיעור הסופי..."
];

const EXAM_CHECKER_STEPS = [
  "סורק את דף התשובות...",
  "קורא ומנתח את המחוון...",
  "משווה בין תשובות התלמיד לפתרון...",
  "מחשב ניקוד לכל שאלה...",
  "מזהה טעויות נפוצות ונקודות לשיפור...",
  "מכין דוח בדיקה מקיף..."
];

const InfographicIcon = ({ type, size = 24 }: { type: string, size?: number }) => {
  switch (type.toLowerCase()) {
    case 'brain': return <Brain size={size} />;
    case 'star': return <Star size={size} />;
    case 'rocket': return <Rocket size={size} />;
    case 'briefcase': return <Briefcase size={size} />;
    case 'award': return <Award size={size} />;
    default: return <Lightbulb size={size} />;
  }
};

const InfographicViewer = ({ data }: { data: InfographicData }) => {
  const viewerRef = useRef<HTMLDivElement>(null);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <div className="space-y-6">
      <div ref={viewerRef} className="bg-gradient-to-br from-indigo-900 to-blue-900 p-8 md:p-12 rounded-[3rem] text-white shadow-2xl animate-fade-in text-right relative" dir="rtl">
        <div className="absolute top-6 left-6 flex gap-2 no-print">
            <button onClick={toggleFullScreen} className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all text-white/70 hover:text-white shadow-lg"><Maximize2 size={20} /></button>
        </div>
        
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4">{data.mainTitle}</h2>
          <p className="text-blue-200 text-xl font-medium max-w-2xl mx-auto">{data.summaryLine}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {data.keyPoints.map((point, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/10 hover:bg-white/20 transition-all">
              <div className="bg-blue-50 text-white w-12 h-12 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                <InfographicIcon type={point.iconType} />
              </div>
              <h4 className="text-lg font-black mb-2">{point.title}</h4>
              <p className="text-sm text-blue-100 leading-relaxed">{point.description}</p>
            </div>
          ))}
        </div>

        {data.statistics && data.statistics.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 bg-white/5 p-8 rounded-[2rem] border border-white/5">
            {data.statistics.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl font-black text-blue-400 mb-1">{stat.value}</div>
                <div className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">{stat.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-blue-500 p-8 rounded-[2rem] text-center shadow-xl">
          <h3 className="text-2xl font-black mb-2">בשורה התחתונה:</h3>
          <p className="text-xl text-blue-50 font-medium">{data.takeaway}</p>
        </div>
      </div>
    </div>
  );
};

const PresentationViewer = ({ data }: { data: PresentationData }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const viewerRef = useRef<HTMLDivElement>(null);

  const slide = data.slides[currentSlide];

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      viewerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const attemptFullscreen = () => {
        try {
            viewerRef.current?.requestFullscreen();
        } catch (e) {
            console.log("Fullscreen request failed, user interaction needed");
        }
    };
    attemptFullscreen();
  }, []);

  const handleSlideClick = () => {
    if (currentSlide < data.slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-8 no-scrollbar">
      <div ref={viewerRef} className="bg-gray-900 md:rounded-[3rem] shadow-2xl animate-fade-in text-right relative flex flex-col min-h-screen" dir="rtl">
        <div className="absolute top-8 left-8 flex flex-col gap-4 no-print z-50">
            <button 
                onClick={toggleFullScreen} 
                className="group flex items-center justify-center p-5 bg-primary text-white rounded-2xl font-black shadow-[0_10px_30px_rgba(59,130,246,0.4)] hover:bg-blue-600 hover:-translate-y-1 transition-all"
            >
                <Maximize2 size={24} />
            </button>
        </div>

        <div 
          onClick={handleSlideClick}
          className="flex-1 flex flex-col justify-center bg-white md:rounded-[2.5rem] m-2 md:m-12 shadow-inner overflow-hidden border-8 border-gray-800 cursor-pointer"
        >
          <div className="bg-indigo-600 text-white p-6 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
               <Presentation size={24} />
               <span className="font-black text-xl">שקופית {currentSlide + 1} / {data.slides.length}</span>
            </div>
            <span className="font-black text-sm uppercase opacity-60 tracking-widest">{data.title}</span>
          </div>

          <div className="flex-1 p-10 md:p-24 flex flex-col justify-center overflow-y-auto">
            {slide.layout === 'TITLE' && (
               <div className="text-center space-y-12">
                 <h2 className="text-6xl md:text-8xl font-black text-indigo-600 leading-tight drop-shadow-sm">{slide.title}</h2>
                 <div className="w-48 h-2 bg-indigo-600 mx-auto rounded-full" />
                 <p className="text-3xl text-gray-400 font-black">{slide.content[0]}</p>
               </div>
            )}

            {slide.layout === 'BULLETS' && (
              <div className="max-w-5xl mx-auto w-full">
                <h2 className="text-4xl md:text-6xl font-black text-gray-900 mb-16 border-r-[12px] border-indigo-600 pr-8 pb-4 inline-block">{slide.title}</h2>
                <ul className="space-y-8">
                  {slide.content.map((point, i) => (
                    <li key={i} className="flex items-start gap-6 text-2xl md:text-4xl text-gray-700 font-bold leading-relaxed animate-slide-right" style={{animationDelay: `${i*0.1}s`}}>
                       <div className="bg-indigo-600 text-white w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black shrink-0 mt-2 shadow-lg">{i+1}</div>
                       <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {slide.layout === 'SPLIT' && (
               <div className="grid md:grid-cols-2 gap-20 items-center max-w-6xl mx-auto w-full">
                  <div className="space-y-8">
                    <h2 className="text-4xl md:text-6xl font-black text-indigo-600 leading-tight">{slide.title}</h2>
                    <p className="text-2xl md:text-3xl text-gray-600 leading-relaxed font-medium">{slide.content[0]}</p>
                  </div>
                  <div className="bg-indigo-50 p-12 rounded-[3rem] border-4 border-indigo-100 shadow-xl">
                    <ul className="space-y-6">
                       {slide.content.slice(1).map((item, i) => (
                         <li key={i} className="flex items-center gap-5 text-xl md:text-2xl font-black text-gray-800">
                           <div className="w-4 h-4 rounded-full bg-indigo-600 shadow-sm" />
                           {item}
                         </li>
                       ))}
                    </ul>
                  </div>
               </div>
            )}

            {slide.layout === 'QUOTE' && (
               <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                  <div className="text-indigo-600 opacity-20 mb-8"><MessageSquare size={120} fill="currentColor" /></div>
                  <h2 className="text-4xl md:text-6xl font-black text-gray-900 leading-snug italic relative">
                    <span className="absolute -top-12 -right-12 text-9xl text-indigo-100 z-0">"</span>
                    <span className="relative z-10">"{slide.content[0]}"</span>
                  </h2>
                  <div className="mt-12 w-24 h-1.5 bg-indigo-600 rounded-full mb-6" />
                  <p className="text-2xl md:text-3xl font-black text-indigo-600">{slide.title}</p>
               </div>
            )}
          </div>

          <div className="p-10 bg-gray-50 border-t-2 border-gray-100 flex justify-between items-center shrink-0 no-print">
             <button 
              disabled={currentSlide === 0} 
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => prev - 1); }}
              className="flex items-center gap-4 text-gray-400 hover:text-indigo-600 disabled:opacity-20 font-black transition-all p-4 rounded-2xl hover:bg-white"
             >
               <ChevronRight size={40} />
               <span className="text-2xl">שקופית קודמת</span>
             </button>
             <div className="flex gap-4">
               {data.slides.map((_, i) => (
                 <button 
                    key={i} 
                    onClick={(e) => { e.stopPropagation(); setCurrentSlide(i); }}
                    className={`w-4 h-4 rounded-full transition-all duration-500 ${i === currentSlide ? 'bg-indigo-600 w-16' : 'bg-gray-300 hover:bg-gray-400'}`} 
                 />
               ))}
             </div>
             <button 
              disabled={currentSlide === data.slides.length - 1} 
              onClick={(e) => { e.stopPropagation(); setCurrentSlide(prev => prev + 1); }}
              className="flex items-center gap-4 text-indigo-600 hover:text-indigo-800 disabled:opacity-20 font-black transition-all p-4 rounded-2xl hover:bg-white"
             >
               <span className="text-2xl">שקופית הבאה</span>
               <ChevronLeft size={40} />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ user, onSelectClass, onOpenTool, onAddHistoryItem, initialTeacherTab, initialLessonPlan }) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'PLANNER' | 'EXAM_CHECKER'>(initialTeacherTab || 'OVERVIEW');
  
  // Planner State
  const [plannerTopic, setPlannerTopic] = useState('');
  const [plannerGrade, setPlannerGrade] = useState<Grade>(Grade.GRADE_10);
  const [plannerInfo, setPlannerInfo] = useState('');
  const [plannerIncludeHomework, setPlannerIncludeHomework] = useState(false);
  const [plannerIncludeGroupActivity, setPlannerIncludeGroupActivity] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingVisual, setIsGeneratingVisual] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  
  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null);
  const [infographicData, setInfographicData] = useState<InfographicData | null>(null);
  const [presentationData, setPresentationData] = useState<PresentationData | null>(null);
  const [currentView, setCurrentView] = useState<'PLAN' | 'INFOGRAPHIC' | 'PRESENTATION'>('PLAN');

  const [plannerFile, setPlannerFile] = useState<{name: string, data: string} | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Exam Checker State
  const [examSubject, setExamSubject] = useState<Subject>(Subject.MATH);
  const [examFile, setExamFile] = useState<{preview: string, data: string, mime: string} | null>(null);
  const [rubricFile, setRubricFile] = useState<{preview: string, data: string, mime: string} | null>(null);
  const [examResult, setExamResult] = useState<ExamCheckResult | null>(null);
  const examInputRef = useRef<HTMLInputElement>(null);
  const rubricInputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
      const all = JSON.parse(data) as Classroom[];
      setClassrooms(all.filter(c => c.teacherId === user.id));
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener('storage', loadData);
    return () => window.removeEventListener('storage', loadData);
  }, [user.id]);

  useEffect(() => {
    if (initialTeacherTab) {
      setActiveTab(initialTeacherTab);
    }
    if (initialLessonPlan) {
      setGeneratedPlan(initialLessonPlan);
      setCurrentView('PLAN');
    }
  }, [initialTeacherTab, initialLessonPlan]);

  useEffect(() => {
    let interval: any;
    if (isGenerating || isGeneratingVisual) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % (activeTab === 'EXAM_CHECKER' ? EXAM_CHECKER_STEPS.length : PLANNER_LOADING_STEPS.length));
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isGeneratingVisual, activeTab]);

  const stats = React.useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);
    
    let submissionsToday = 0;
    let pendingReview = 0;
    let totalStudents = 0;
    let totalMaterials = 0;

    classrooms.forEach(c => {
      totalStudents += (c.studentsCount || 0);
      totalMaterials += (c.materials?.length || 0);
      
      c.materials?.forEach(m => {
        m.submissions?.forEach(s => {
          if (s.timestamp > oneDayAgo) {
            submissionsToday++;
          }
          if (!s.teacherGrades || Object.keys(s.teacherGrades).length === 0) {
            pendingReview++;
          }
        });
      });
    });

    return {
      totalStudents,
      totalMaterials,
      activeClasses: classrooms.length,
      submissionsToday,
      pendingReview
    };
  }, [classrooms]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPlannerFile({
        name: e.target.files[0].name,
        data: 'dummy_base64_data'
      });
    }
  };

  const handleExamUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        const data = preview.split(',')[1];
        setExamFile({
          preview,
          data: data,
          mime: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRubricUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const preview = reader.result as string;
        const data = preview.split(',')[1];
        setRubricFile({
          preview,
          data: data,
          mime: file.type
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheckExam = async () => {
    if (!examFile || !rubricFile) {
      alert("יש להעלות גם את מבחן התלמיד וגם את המחוון לבדיקה");
      return;
    }
    setIsGenerating(true);
    setLoadingStep(0);
    try {
      const result = await checkExamWithRubric(
        examFile.data, 
        examFile.mime, 
        rubricFile.data, 
        rubricFile.mime, 
        null
      );
      setExamResult(result);
      
      // Save to history repository
      onAddHistoryItem({
        id: `exam-${Date.now()}`,
        timestamp: Date.now(),
        subject: examSubject,
        grade: Grade.GRADE_1, // Default or placeholder
        type: 'EXAM_CHECK',
        title: `בדיקת מבחן: ${examSubject}`,
        details: result
      });

    } catch (e) {
      alert("אירעה שגיאה בבדיקת המבחן. נסה שוב.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePlanner = async () => {
    if (!plannerTopic) return;
    setIsGenerating(true);
    setLoadingStep(0);
    try {
      const plan = await generateLessonPlan(
        plannerTopic, 
        plannerGrade as any, 
        plannerInfo, 
        plannerIncludeHomework, 
        plannerIncludeGroupActivity
      );
      setGeneratedPlan(plan);
      setInfographicData(null);
      setPresentationData(null);
      setCurrentView('PLAN');

      // Save lesson plan to repository
      onAddHistoryItem({
        id: `plan-${Date.now()}`,
        timestamp: Date.now(),
        subject: plan.subject,
        grade: plannerGrade,
        type: 'LESSON_PLAN',
        title: `מערך שיעור: ${plan.title}`,
        content: plan.mainContent,
        details: plan
      });

    } catch (e) {
      alert("אירעה שגיאה בייצור המערך.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateVisual = async (type: 'INFOGRAPHIC' | 'PRESENTATION') => {
    if (!generatedPlan) return;
    
    if (type === 'INFOGRAPHIC' && infographicData) {
      setCurrentView('INFOGRAPHIC');
      return;
    }
    if (type === 'PRESENTATION' && presentationData) {
      setCurrentView('PRESENTATION');
      return;
    }

    setIsGeneratingVisual(true);
    setLoadingStep(0);
    try {
      const visual = await generateLessonVisuals(generatedPlan, type);
      if (type === 'INFOGRAPHIC') {
        setInfographicData(visual);
        setCurrentView('INFOGRAPHIC');
      } else {
        setPresentationData(visual);
        setCurrentView('PRESENTATION');
      }
    } catch (e) {
      alert("אירעה שגיאה ביצירת העזר הויזואלי.");
    } finally {
      setIsGeneratingVisual(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-10 pb-20">
      <div className="bg-gray-900 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                <Sparkles size={14} />
                <span>מרחב עבודה פדגוגי</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black mb-4 tracking-tight">שלום, {user.name} 👋</h1>
              <p className="text-xl text-gray-400 font-medium max-w-xl leading-relaxed">
                ברוך הבא למרכז השליטה שלך. כאן תוכל לנהל את הכיתות, לייצר מערכי שיעור חכמים ולעקוב אחר התקדמות התלמידים.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 text-center min-w-[140px]">
                <div className="text-3xl font-black text-primary mb-1">{stats.activeClasses}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">כיתות פעילות</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 text-center min-w-[140px]">
                <div className="text-3xl font-black text-secondary mb-1">{stats.totalStudents}</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">תלמידים רשומים</div>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-12 bg-white/5 p-1.5 rounded-3xl w-fit border border-white/10 overflow-x-auto no-scrollbar">
            {[
              { id: 'OVERVIEW', label: 'לוח בקרה כיתתי', icon: LayoutDashboard },
              { id: 'PLANNER', label: 'מחולל מערכי שיעור', icon: Zap },
              { id: 'EXAM_CHECKER', label: 'בודק מבחנים חכם', icon: ClipboardCheck }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-sm font-black transition-all shrink-0 ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-xl' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {activeTab === 'OVERVIEW' && (
          <div className="grid lg:grid-cols-3 gap-8 animate-fade-in">
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-2xl font-black text-gray-900 px-4">הכיתות שלי</h3>
              {classrooms.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {classrooms.map(c => (
                    <button
                      key={c.id}
                      onClick={() => onSelectClass(c.id)}
                      className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-right"
                    >
                      <div className="flex justify-between items-start mb-8">
                        <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                          <Users size={24} />
                        </div>
                        <span className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-[10px] font-black">{c.id}</span>
                      </div>
                      <h4 className="text-xl font-black text-gray-800 mb-2">{c.name}</h4>
                      <p className="text-sm text-gray-400 font-bold mb-6">{c.subject} • {c.grade}</p>
                      <div className="flex items-center justify-between pt-6 border-t border-gray-50">
                        <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                          <ClipboardList size={14} />
                          {c.materials?.length || 0} חומרים
                        </span>
                        <div className="flex items-center gap-1 text-primary font-black text-sm group-hover:translate-x-4 transition-transform">
                          <span>ניהול כיתה</span>
                          <ChevronLeft size={18} />
                        </div>
                      </div>
                    </button>
                  ))}
                  <button 
                    onClick={() => onOpenTool('CLASSROOM')}
                    className="bg-gray-50 border-2 border-dashed border-gray-200 p-8 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400 hover:bg-white hover:border-primary hover:text-primary transition-all group"
                  >
                    <PlusCircle size={48} className="mb-4 group-hover:rotate-90 transition-transform duration-500" />
                    <span className="font-black text-lg">פתח כיתה חדשה</span>
                  </button>
                </div>
              ) : (
                <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-200">
                  <Users size={64} className="mx-auto text-gray-200 mb-6" />
                  <h4 className="text-2xl font-black text-gray-800 mb-2">טרם הקמת כיתות</h4>
                  <p className="text-gray-400 mb-8">הקם כיתה כדי להתחיל לשתף חומרים עם התלמידים.</p>
                  <button onClick={() => onOpenTool('CLASSROOM')} className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl hover:bg-black transition-all">הקמת כיתה ראשונה</button>
                </div>
              )}
            </div>
            
            <div className="space-y-8">
              <h3 className="text-2xl font-black text-gray-900 px-4">פעולות מהירות</h3>
              <div className="grid gap-4">
                <button onClick={() => onOpenTool('MATERIALS')} className="w-full flex items-center justify-between p-6 bg-blue-600 text-white rounded-[2rem] shadow-lg hover:bg-blue-700 transition-all text-right group">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl"><PlusCircle size={24} /></div>
                    <div>
                      <h5 className="font-black text-lg leading-tight">העלאת תוכן גלובלי</h5>
                      <p className="text-white/60 text-xs font-bold">יצירת תוכן למספר כיתות</p>
                    </div>
                  </div>
                  <ChevronLeft size={24} className="text-white/40 group-hover:translate-x-4 transition-transform" />
                </button>

                <button onClick={() => onOpenTool('CHAT')} className="w-full flex items-center justify-between p-6 bg-indigo-600 text-white rounded-[2rem] shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-right group">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl"><MessageSquare size={24} /></div>
                    <div>
                      <h5 className="font-black text-lg leading-tight">עוזר הוראה AI</h5>
                      <p className="text-white/60 text-xs font-bold">התייעצות פדגוגית חכמה</p>
                    </div>
                  </div>
                  <ChevronLeft size={24} className="text-white/40 group-hover:translate-x-4 transition-transform" />
                </button>
                
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                  <h4 className="font-black text-gray-800 mb-6 flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-500" />
                    סטטוס כללי
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 font-bold">הגשות היום</span>
                      <span className="font-black text-gray-800">{stats.submissionsToday}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-400 font-bold">מבחנים בבדיקה</span>
                      <span className="font-black text-gray-800">{stats.pendingReview}</span>
                    </div>
                    <div className="pt-4 border-t border-gray-50">
                      <div className="bg-blue-50 p-4 rounded-2xl flex items-center gap-3">
                        <CheckCircle2 size={20} className="text-blue-600" />
                        <span className="text-xs font-bold text-blue-800 leading-tight">
                          {stats.pendingReview > 0 
                            ? `ממתינות לך ${stats.pendingReview} הגשות חדשות לבדיקה.` 
                            : 'כל ההגשות נבדקו! עבודה מצוינת.'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'PLANNER' && (
          <div className="max-w-7xl mx-auto animate-fade-in">
            {isGenerating || isGeneratingVisual ? (
              <div className="bg-white rounded-[3rem] p-20 shadow-xl border border-gray-100 text-center min-h-[500px] flex flex-col items-center justify-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping"></div>
                  <div className="relative bg-primary text-white p-6 rounded-full shadow-lg">
                    <Zap size={48} className="animate-pulse" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4 max-w-lg mx-auto leading-tight">
                  {isGeneratingVisual ? 'מעבד את העזר הויזואלי...' : 'בונה עבורך מערך שיעור חכם...'}
                </h3>
                <div className="text-lg text-gray-500 font-medium h-8">
                  {PLANNER_LOADING_STEPS[loadingStep]}
                </div>
              </div>
            ) : generatedPlan ? (
              <div className="space-y-8 animate-slide-up">
                <div className="flex items-center justify-between px-4">
                  {currentView !== 'PLAN' ? (
                    <button onClick={() => setCurrentView('PLAN')} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
                      <ArrowRight size={20} />
                      <span>חזרה למערך השיעור</span>
                    </button>
                  ) : (
                    <button onClick={() => setGeneratedPlan(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
                      <ArrowRight size={20} />
                      <span>חזרה למחולל</span>
                    </button>
                  )}
                  
                  <div className="flex gap-4">
                    <button 
                      onClick={() => handleCreateVisual('INFOGRAPHIC')} 
                      className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 border shadow-sm ${currentView === 'INFOGRAPHIC' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}
                    >
                      <LayoutTemplate size={18}/> <span>אינפוגרפיקה</span>
                    </button>
                    <button 
                      onClick={() => handleCreateVisual('PRESENTATION')} 
                      className={`px-6 py-2.5 rounded-xl font-black text-sm transition-all flex items-center gap-2 border shadow-sm ${currentView === 'PRESENTATION' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'}`}
                    >
                      <MonitorPlay size={18}/> <span>מצגת שיעור</span>
                    </button>
                    {currentView === 'PLAN' && (
                      <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-lg hover:bg-black transition-all">הדפס מערך</button>
                    )}
                  </div>
                </div>

                {currentView === 'INFOGRAPHIC' && infographicData && (
                  <InfographicViewer data={infographicData} />
                )}
                
                {currentView === 'PRESENTATION' && presentationData && (
                  <PresentationViewer data={presentationData} />
                )}

                {currentView === 'PLAN' && (
                  <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
                    <div className="bg-primary p-10 md:p-14 text-white">
                      <h2 className="text-4xl md:text-5xl font-black mb-4">{generatedPlan.title}</h2>
                      <div className="flex flex-wrap gap-4 text-white/80 font-bold text-sm">
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><Target size={16} /> <span>{plannerGrade}</span></div>
                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg"><Clock size={16} /> <span>45 דקות</span></div>
                      </div>
                    </div>
                    <div className="p-10 md:p-14 space-y-12 bg-gray-50/30 text-right" dir="rtl">
                      <section>
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3"><List className="text-primary" /> מטרות לימודיות</h3>
                        <div className="grid gap-3">
                          {generatedPlan.objectives.map((obj, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm font-bold text-gray-700 flex items-center gap-3">
                              <div className="w-6 h-6 bg-blue-50 text-primary rounded-full flex items-center justify-center text-xs">{i+1}</div>
                              {obj}
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100">
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3"><Lightbulb className="text-yellow-500" /> פתיחה</h3>
                        <div className="text-lg leading-relaxed text-gray-700 italic border-r-4 border-yellow-100 pr-6 py-2">
                          <LatexRenderer text={generatedPlan.introduction} />
                        </div>
                      </section>
                      <section>
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3"><BookOpen className="text-indigo-500" /> גוף השיעור</h3>
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-gray-100 leading-relaxed text-gray-700 text-lg">
                          <LatexRenderer text={generatedPlan.mainContent} />
                        </div>
                      </section>
                      {generatedPlan.activity && (
                        <section className="bg-emerald-50/50 p-8 rounded-[2.5rem] border border-emerald-100">
                          <h3 className="text-xl font-black text-emerald-900 mb-6 flex items-center gap-3"><Users className="text-emerald-600" /> פעילות קבוצתית</h3>
                          <div className="text-lg text-emerald-800 leading-relaxed font-medium">
                            <LatexRenderer text={generatedPlan.activity} />
                          </div>
                        </section>
                      )}
                      <section>
                        <h3 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3"><MessageSquare className="text-purple-500" /> שאלות לסיכום ודיון</h3>
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 text-gray-700 font-medium">
                          <LatexRenderer text={generatedPlan.summary} />
                        </div>
                      </section>
                      {generatedPlan.homework && (
                        <section className="bg-orange-50/50 p-8 rounded-[2.5rem] border border-orange-100">
                           <h3 className="text-xl font-black text-orange-900 mb-6 flex items-center gap-3"><Home className="text-orange-600" /> שיעורי בית</h3>
                           <div className="text-lg text-orange-800 leading-relaxed font-medium">
                             <LatexRenderer text={generatedPlan.homework} />
                           </div>
                        </section>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-2xl border border-gray-100 text-right space-y-12" dir="rtl">
                <div className="text-center">
                  <div className="bg-primary/10 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-primary rotate-3">
                    <Zap size={48} />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">מחולל מערכי שיעור AI</h2>
                  <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                    בנה מערך שיעור שלם בתוך שניות. המערכת תייצר עבורך את גוף השיעור, פעילות קבוצתית ושאלות לסיכום.
                  </p>
                </div>
                <div className="grid gap-8 max-w-3xl mx-auto">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">נושא השיעור והכיתה</label>
                    <div className="flex flex-col md:flex-row gap-4">
                      <input 
                        type="text" 
                        value={plannerTopic}
                        onChange={e => setPlannerTopic(e.target.value)}
                        placeholder="על מה השיעור הבא שלך? (למשל: המהפכה התעשייתית)" 
                        className="flex-[3] p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl font-bold text-lg outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                      />
                      <select 
                        value={plannerGrade}
                        onChange={e => setPlannerGrade(e.target.value as Grade)}
                        className="flex-1 p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl font-bold outline-none cursor-pointer focus:border-primary transition-all"
                      >
                        {Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6 p-6 bg-gray-50 rounded-[2rem] border-2 border-gray-100">
                      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${plannerIncludeGroupActivity ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                  <Users size={20} />
                              </div>
                              <span className={`font-bold ${plannerIncludeGroupActivity ? 'text-gray-900' : 'text-gray-400'}`}>הוסף פעילות קבוצתית</span>
                          </div>
                          <button 
                            onClick={() => setPlannerIncludeGroupActivity(!plannerIncludeGroupActivity)}
                            className={`w-12 h-6 rounded-full transition-all relative ${plannerIncludeGroupActivity ? 'bg-emerald-500' : 'bg-gray-300'}`}
                          >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${plannerIncludeGroupActivity ? 'left-1' : 'left-7'}`} />
                          </button>
                      </div>

                      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                          <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${plannerIncludeHomework ? 'bg-orange-50 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                                  <Home size={20} />
                              </div>
                              <span className={`font-bold ${plannerIncludeHomework ? 'text-gray-900' : 'text-gray-400'}`}>הוסף שיעורי בית</span>
                          </div>
                          <button 
                            onClick={() => setPlannerIncludeHomework(!plannerIncludeHomework)}
                            className={`w-12 h-6 rounded-full transition-all relative ${plannerIncludeHomework ? 'bg-orange-500' : 'bg-gray-300'}`}
                          >
                              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${plannerIncludeHomework ? 'left-1' : 'left-7'}`} />
                          </button>
                      </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">חומרים מקדימים (אופציונלי)</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`cursor-pointer border-2 border-dashed rounded-[2rem] p-8 text-center transition-all ${plannerFile ? 'bg-blue-50 border-primary text-primary' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'}`}
                    >
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                      {plannerFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <FileText size={24} />
                          <span className="font-black truncate max-w-xs">{plannerFile.name}</span>
                          <button onClick={(e) => { e.stopPropagation(); setPlannerFile(null); }} className="p-1 hover:bg-white/50 rounded-lg"><X size={18}/></button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Upload size={32} className="mx-auto mb-2 opacity-50" />
                          <p className="font-bold">גרור קבצים או לחץ להעלאה</p>
                          <p className="text-xs">סרוק סיכומים או דפי עבודה שה-AI יתבסס עליהם</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">דגשים פדגוגיים נוספים</label>
                    <textarea 
                      value={plannerInfo}
                      onChange={e => setPlannerInfo(e.target.value)}
                      placeholder="למשל: דגש על חשיבה ביקורתית, שילוב תלמידים מתקשים, רלוונטיות לימינו..."
                      className="w-full p-6 bg-gray-50 border-2 border-gray-100 rounded-[2rem] font-medium outline-none focus:border-primary focus:bg-white transition-all h-32 resize-none shadow-inner"
                    />
                  </div>
                  <button 
                    onClick={handleGeneratePlanner}
                    disabled={!plannerTopic || isGenerating}
                    className="w-full bg-gray-900 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-black hover:-translate-y-1 transition-all flex items-center justify-center gap-4 mt-6 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Sparkles size={28} className="text-yellow-400" />
                    <span>ייצר מערך שיעור חכם</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'EXAM_CHECKER' && (
          <div className="max-w-7xl mx-auto animate-fade-in">
            {isGenerating ? (
              <div className="bg-white rounded-[3rem] p-20 shadow-xl border border-gray-100 text-center min-h-[500px] flex flex-col items-center justify-center">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-200 rounded-full animate-ping"></div>
                  <div className="relative bg-indigo-600 text-white p-6 rounded-full shadow-lg">
                    <FileSearch size={48} className="animate-pulse" />
                  </div>
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4">בודק את המבחן עבורך...</h3>
                <div className="text-lg text-gray-500 font-medium h-8">
                  {EXAM_CHECKER_STEPS[loadingStep]}
                </div>
              </div>
            ) : examResult ? (
              <div className="space-y-8 animate-slide-up pb-10">
                <div className="flex items-center justify-between px-4">
                  <button onClick={() => setExamResult(null)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 font-bold">
                    <ArrowRight size={20} />
                    <span>חזרה לבדיקה חדשה</span>
                  </button>
                  <button onClick={() => window.print()} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-lg hover:bg-black transition-all">הדפס דוח בדיקה</button>
                </div>

                <div className="bg-white rounded-[3rem] shadow-2xl border border-gray-100 overflow-hidden">
                  <div className="bg-indigo-600 p-10 md:p-14 text-white flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                      <h2 className="text-4xl md:text-5xl font-black mb-4">דוח בדיקת מבחן</h2>
                      <p className="text-indigo-100 text-lg font-medium max-xl">{examResult.overallFeedback}</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md p-8 rounded-[2.5rem] border border-white/20 text-center min-w-[180px]">
                      <div className="text-6xl font-black mb-1">{examResult.finalScore}</div>
                      <div className="text-xs font-black uppercase tracking-widest opacity-60">ציון משוער</div>
                    </div>
                  </div>

                  <div className="p-10 md:p-14 space-y-8 bg-gray-50/30 text-right" dir="rtl">
                    <h3 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-3"><List className="text-indigo-600" /> ניתוח לפי שאלות</h3>
                    <div className="grid gap-6">
                      {examResult.questionsAnalysis.map((q, i) => (
                        <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white ${q.status === 'CORRECT' ? 'bg-green-500' : q.status === 'PARTIAL' ? 'bg-orange-500' : 'bg-red-500'}`}>
                                {q.questionNumber}
                              </div>
                              <h4 className="text-xl font-black text-gray-800">שאלה {q.questionNumber}</h4>
                            </div>
                            <div className="text-left">
                              <div className="text-2xl font-black text-indigo-600">{q.pointsEarned} / {q.totalPoints}</div>
                              <div className="text-[10px] font-black text-gray-400 uppercase">נקודות</div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-8 mb-6">
                            <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                              <div className="text-[10px] font-black text-gray-400 uppercase mb-2">תשובת התלמיד:</div>
                              <div className="text-gray-700 font-medium">{q.studentAnswer}</div>
                            </div>
                            <div className="p-6 bg-green-50/30 rounded-2xl border border-green-100">
                              <div className="text-[10px] font-black text-green-500 uppercase mb-2">תשובה נכונה (מחוון):</div>
                              <div className="text-green-800 font-medium">{q.correctAnswer}</div>
                            </div>
                          </div>

                          <div className="flex items-start gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                             <HelpCircle className="text-indigo-500 shrink-0" size={20} />
                             <div>
                               <div className="text-[10px] font-black text-indigo-400 uppercase mb-1">הסבר הניקוד:</div>
                               <p className="text-sm text-indigo-900 font-bold">{q.explanation}</p>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[3.5rem] p-10 md:p-16 shadow-2xl border border-gray-100 text-right space-y-12" dir="rtl">
                <div className="text-center">
                  <div className="bg-indigo-100 w-24 h-24 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-indigo-600 rotate-3">
                    <ClipboardCheck size={48} />
                  </div>
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">בודק מבחנים אוטומטי</h2>
                  <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
                    העלה צילום של מבחן התלמיד ואת המחוון שלך, וה-AI יבצע בדיקה אוטומטית הכוללת ניקוד, זיהוי טעויות ומתן משוב.
                  </p>
                </div>

                <div className="max-w-xl mx-auto mb-10">
                   <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">בחר מקצוע המבחן</label>
                   <select 
                    value={examSubject} 
                    onChange={e => setExamSubject(e.target.value as Subject)}
                    className="w-full p-5 bg-gray-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-indigo-500 transition-all shadow-inner"
                   >
                     {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
                   </select>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                  {/* Student Exam Upload */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">מבחן התלמיד (צילום/קובץ)</label>
                    <div 
                      onClick={() => examInputRef.current?.click()}
                      className={`cursor-pointer border-2 border-dashed rounded-[2rem] p-10 text-center transition-all min-h-[250px] flex flex-col items-center justify-center ${examFile ? 'bg-indigo-50 border-indigo-400 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'}`}
                    >
                      <input type="file" ref={examInputRef} onChange={handleExamUpload} accept="image/*,application/pdf" className="hidden" />
                      {examFile ? (
                        <div className="space-y-4">
                          <img src={examFile.preview} className="w-20 h-20 object-cover rounded-xl mx-auto shadow-md" alt="Exam preview" />
                          <span className="font-black block text-sm">הקובץ הועלה בהצלחה</span>
                          <button onClick={(e) => { e.stopPropagation(); setExamFile(null); }} className="text-xs text-red-500 hover:underline">הסר קובץ</button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="bg-white p-4 rounded-2xl shadow-sm inline-block"><Upload size={32} className="opacity-50" /></div>
                          <p className="font-black text-lg">העלה את מבחן התלמיד</p>
                          <p className="text-xs opacity-60">תומך בתמונות ובקבצי PDF</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Rubric Upload */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">המחוון / פתרון המבחן (צילום/קובץ)</label>
                    <div className="space-y-4">
                       <div 
                        onClick={() => rubricInputRef.current?.click()}
                        className={`cursor-pointer border-2 border-dashed rounded-[2rem] p-10 text-center transition-all min-h-[250px] flex flex-col items-center justify-center ${rubricFile ? 'bg-green-50 border-green-400 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-400 hover:border-gray-400'}`}
                      >
                        <input type="file" ref={rubricInputRef} onChange={handleRubricUpload} accept="image/*,application/pdf" className="hidden" />
                        {rubricFile ? (
                          <div className="space-y-4">
                            <img src={rubricFile.preview} className="w-20 h-20 object-cover rounded-xl mx-auto shadow-md" alt="Rubric preview" />
                            <span className="font-black block text-sm">המחוון הועלה בהצלחה</span>
                            <button onClick={(e) => { e.stopPropagation(); setRubricFile(null); }} className="text-xs text-red-500 hover:underline">הסר קובץ</button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="bg-white p-4 rounded-2xl shadow-sm inline-block"><Upload size={32} className="opacity-50" /></div>
                            <p className="font-black text-lg">העלה את המחוון</p>
                            <p className="text-xs opacity-60">העלה את הפתרונות או המחוון הרשמי</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="max-w-md mx-auto pt-4">
                  <button 
                    onClick={handleCheckExam}
                    disabled={!examFile || !rubricFile || isGenerating}
                    className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-2xl shadow-2xl hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Search size={28} />
                    <span>בדוק מבחן עכשיו</span>
                  </button>
                  <p className="text-center text-xs text-gray-400 mt-4 flex items-center justify-center gap-1">
                    <AlertTriangle size={12} />
                    התוצאה היא הערכה של ה-AI, מומלץ לעבור עליה לפני מתן ציון סופי
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
