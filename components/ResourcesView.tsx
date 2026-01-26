import React, { useEffect, useState } from 'react';
import { Subject, Grade, StudyTopic, PracticeConfig, MaterialType } from '../types.ts';
import { getStudyTopics, generateSummary } from '../services/geminiService.ts';
import LatexRenderer from './LatexRenderer.tsx';
import { FileText, ChevronLeft, X, Printer, ArrowLeft, Search, Sparkles, UserPlus, BookOpen, MessageCircleQuestion } from 'lucide-react';

interface ResourcesViewProps {
  subject: Subject;
  grade: Grade;
  onStartTest: (config: PracticeConfig) => void;
  onSummaryGenerated: (title: string, content: string) => void;
  onAssignToClass?: (item: { title: string, content: string, type: MaterialType }) => void;
  onHelpWithContent?: (context: string) => void;
  initialSummaryToOpen?: {title: string, content: string} | null;
  isTeacher?: boolean;
}

const LOADING_MESSAGES_TEACHER = [
    "מנתח את הנושא הפדגוגי...",
    "מסכם עבור הכיתה את הנקודות החשובות...",
    "מנסח הסברים ברורים לתלמידים...",
    "מרכז מקורות מידע מקצועיים...",
    "בונה מערך תוכן מובנה...",
    "מכין דף סיכום מעולה להוראה..."
];

const LOADING_MESSAGES_STUDENT = [
    "קורא את כל החומר הלימודי...",
    "מסכם עבורך את הנקודות החשובות...",
    "מנסח הסברים ברורים...",
    "בודק עובדות היסטוריות...",
    "מארגן את המידע בצורה נוחה...",
    "מכין לך סיכום מעולה..."
];

const ResourcesView: React.FC<ResourcesViewProps> = ({ 
  subject, 
  grade, 
  onStartTest, 
  onSummaryGenerated,
  onAssignToClass,
  onHelpWithContent,
  initialSummaryToOpen,
  isTeacher
}) => {
  const [topics, setTopics] = useState<{summaries: StudyTopic[], tests: StudyTopic[]}>({ summaries: [], tests: [] });
  const [selectedContent, setSelectedContent] = useState<{title: string, content: string, type: 'SUMMARY'} | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [hasSelection, setHasSelection] = useState(false);

  const loadingMessages = isTeacher ? LOADING_MESSAGES_TEACHER : LOADING_MESSAGES_STUDENT;

  useEffect(() => {
    let interval: any;
    if (loadingContent) {
      setLoadingMsgIndex(0);
      interval = setInterval(() => {
         setLoadingMsgIndex((prev) => (prev + 1) % loadingMessages.length);
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [loadingContent, loadingMessages.length]);

  // Listen for text selection to enable/disable help button
  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection()?.toString().trim();
      setHasSelection(!!selection);
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const data = await getStudyTopics(subject, grade);
        setTopics(data);
      } catch (err) {
        console.error("Failed to fetch topics:", err);
      }
    };
    fetchTopics();
  }, [subject, grade]);

  useEffect(() => {
    if (initialSummaryToOpen) {
      setSelectedContent({
        title: initialSummaryToOpen.title,
        content: initialSummaryToOpen.content,
        type: 'SUMMARY'
      });
    }
  }, [initialSummaryToOpen]);

  const handleSummaryClick = async (topicTitle: string) => {
    if (!topicTitle.trim()) return;
    
    const cacheKey = `cached_summary_${subject}_${grade}_${topicTitle.trim().toLowerCase()}`;
    const cached = localStorage.getItem(cacheKey);

    if (cached) {
      const parsed = cached;
      setSelectedContent({ title: topicTitle, content: parsed, type: 'SUMMARY' });
      onSummaryGenerated(topicTitle, parsed);
      return;
    }

    setLoadingContent(true);
    setSelectedContent({ title: topicTitle, content: '', type: 'SUMMARY' });
    
    try {
      const content = await generateSummary(subject, grade, topicTitle);
      localStorage.setItem(cacheKey, content);
      onSummaryGenerated(topicTitle, content);
      setSelectedContent({ title: topicTitle, content, type: 'SUMMARY' });
    } catch (err) {
      console.error(err);
      setSelectedContent(null);
      alert("מצטערים, אירעה שגיאה בייצור הסיכום.");
    } finally {
      setLoadingContent(false);
      setCustomTopic('');
    }
  };

  const handleStartTestClick = (topic: string) => {
    onStartTest({
        count: 10,
        mode: 'TEST',
        difficulty: 'MEDIUM',
        topic: topic
    });
  };

  const handleCloseContent = () => {
    setSelectedContent(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleHelpClick = () => {
    const selection = window.getSelection()?.toString().trim();
    
    if (!selection) {
      alert("נא לסמן קטע מהטקסט שתרצה עזרה לגביו קודם לכן.");
      return;
    }

    if (selectedContent && onHelpWithContent) {
      const context = `אני לומד על "${selectedContent.title}" וצריך עזרה עם הקטע הבא שסימנתי: "${selection}"`;
      onHelpWithContent(context);
    }
  };

  const handleAssignCurrent = () => {
    if (selectedContent && onAssignToClass) {
        onAssignToClass({
            title: selectedContent.title,
            content: selectedContent.content,
            type: 'SUMMARY'
        });
    }
  };

  if (selectedContent) {
    return (
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 h-[calc(100vh-140px)] flex flex-col animate-fade-in relative">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center rounded-t-3xl sticky top-0 z-10 bg-gray-50 text-gray-800 no-print">
           <div className="flex items-center gap-3">
             <button onClick={handleCloseContent} className="lg:hidden p-2 -mr-2 text-gray-500"><ArrowLeft size={24} /></button>
             <h3 className="font-bold text-xl md:text-2xl line-clamp-1">{selectedContent.title}</h3>
           </div>
           <div className="flex gap-2 items-center">
             {isTeacher ? (
                 <button 
                    onClick={handleAssignCurrent} 
                    className="p-3 rounded-full shadow-sm transition-all bg-white text-primary border border-gray-200 hover:bg-blue-50 flex items-center gap-2" 
                    title="שייך לכיתה"
                 >
                    <UserPlus size={20} />
                    <span className="hidden md:inline font-bold text-xs">שייך לכיתה</span>
                 </button>
             ) : (
                <button 
                    onClick={handleHelpClick}
                    className={`flex flex-col items-end ml-2 transition-all text-right group ${hasSelection ? 'opacity-100' : 'opacity-40 grayscale cursor-default'}`}
                >
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl border-2 transition-all ${hasSelection ? 'bg-purple-600 border-purple-500 text-white shadow-lg animate-pulse scale-105' : 'bg-gray-100 border-gray-200 text-gray-400'}`}>
                        <MessageCircleQuestion size={18} />
                        <span className="text-xs font-black">
                            {hasSelection ? 'לחץ כאן לעזרה במה שסימנת' : 'סמן טקסט לעזרה'}
                        </span>
                    </div>
                </button>
             )}
             
             <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 px-6 py-3 rounded-2xl shadow-sm transition-all font-bold text-sm bg-gray-900 text-white border-gray-900 hover:bg-black"
                title="הדפס סיכום זה"
             >
                <Printer size={18} />
                <span>הדפס סיכום</span>
             </button>

             <button onClick={handleCloseContent} className="hidden lg:block p-3 rounded-full shadow-sm transition-all bg-white text-gray-500 border border-gray-200 hover:bg-red-50 hover:text-red-500"><X size={20} /></button>
           </div>
        </div>
        <div className="p-8 md:p-12 overflow-y-auto flex-1 leading-loose text-lg text-gray-700 relative summary-print-container" id="summary-to-print">
           {loadingContent ? (
             <div className="flex flex-col items-center justify-center h-full gap-8 min-h-[300px] no-print">
                <div className="relative p-6 rounded-full bg-blue-50"><FileText className="animate-pulse text-primary" size={64} /></div>
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">{isTeacher ? 'מכין מערך תוכן...' : 'כותב את הסיכום...'}</h3>
                    <p className="text-gray-500 font-medium animate-fade-in text-lg">{loadingMessages[loadingMsgIndex]}</p>
                </div>
             </div>
           ) : (
             <div className="font-sans max-w-3xl mx-auto">
                <div className="hidden print:block mb-8 pb-4 border-b">
                 <h1 className="text-3xl font-black">{selectedContent.title}</h1>
                 <p className="text-gray-500">{isTeacher ? 'נוצר עבור הכיתה באמצעות AI' : `נוצר ע"י Lumdim AI עבור ${grade} ב${subject}`}</p>
               </div>
               <LatexRenderer text={selectedContent.content} />
               <div className="hidden print:block mt-12 pt-6 border-t border-gray-100 text-center text-xs text-gray-400 font-bold">
                 נוצר באמצעות Lumdim AI - המורה הפרטי החכם שלך
               </div>
             </div>
           )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-20">
      <div className="bg-white rounded-3xl p-10 md:p-16 shadow-2xl border border-gray-100 flex flex-col items-center justify-center text-center space-y-10">
        <div className="bg-primary/10 w-24 h-24 rounded-[2rem] flex items-center justify-center text-primary rotate-3">
          <FileText size={48} />
        </div>
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">{isTeacher ? 'מרכז הכנת תוכן לימודי' : 'מרחב התוכן החכם'}</h2>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {isTeacher 
              ? 'הזן נושא לימוד, וה-AI יסייע לך לייצר דף סיכום מקצועי או מערך שאלות כיתתי מותאם אישית תוך שניות.'
              : 'הזן נושא לימוד, וה-AI ייצר עבורך סיכום מעמיק ומותאם אישית תוך שניות.'}
          </p>
        </div>

        <div className="w-full max-w-xl space-y-6">
          <div className="relative">
            <input 
              type="text" 
              value={customTopic} 
              onChange={(e) => setCustomTopic(e.target.value)} 
              placeholder={isTeacher ? "איזה תוכן נכין לכיתה היום? (למשל: חוקי ניוטון...)" : "הקלד נושא (למשל: חוקי ניוטון, המהפכה התעשייתית...)"} 
              className="w-full pl-6 pr-14 py-6 rounded-3xl bg-gray-50 border-2 border-gray-100 text-xl font-bold outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all shadow-inner text-right"
              dir="rtl"
              onKeyDown={(e) => { if (e.key === 'Enter' && customTopic.trim()) handleSummaryClick(customTopic); }}
            />
            <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400" size={28} />
          </div>
          
          <div className="flex justify-center">
            <button 
              onClick={() => handleSummaryClick(customTopic)} 
              disabled={!customTopic.trim()} 
              className="px-12 py-6 rounded-3xl bg-blue-50 text-primary hover:bg-primary hover:text-white font-black text-xl transition-all disabled:opacity-30 flex items-center justify-center gap-3 shadow-sm border-2 border-blue-100 w-full"
            >
              <FileText size={24}/>
              <span>ייצר סיכום לימודי</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3 mb-2 px-2">
          <div className="bg-blue-100 p-1.5 rounded-lg text-primary"><BookOpen size={20} /></div>
          <h3 className="text-xl font-bold text-gray-800">סיכומים מומלצים ל{grade}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {topics.summaries.length > 0 ? (
            topics.summaries.map((topic, i) => (
              <button key={i} onClick={() => handleSummaryClick(topic.title)} className="p-6 text-right bg-white rounded-3xl shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/30 transition-all group flex items-center justify-between">
                <div>
                  <h4 className="font-black text-gray-900 group-hover:text-primary transition-colors">{topic.title}</h4>
                  <p className="text-xs text-gray-400 font-bold">{topic.description}</p>
                </div>
                <ChevronLeft size={20} className="text-gray-300 group-hover:text-primary" />
              </button>
            ))
          ) : (
            <div className="col-span-full p-10 text-center bg-white rounded-[2rem] text-gray-400 border-2 border-dashed border-gray-100">
              <Sparkles className="mx-auto mb-4 opacity-20" size={40} />
              <p className="font-bold">לא נמצאו סיכומים מוכנים לרמה זו כרגע. נסה להשתמש בחיפוש למעלה.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourcesView;