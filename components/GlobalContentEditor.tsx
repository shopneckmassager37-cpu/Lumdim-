
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Classroom, ClassroomMaterial, Subject, Grade, User, Question, MaterialType, HistoryItem } from '../types.ts';
import { generateSummary, generateQuestions } from '../services/geminiService.ts';
import { 
  X, Send, FileText, ListChecks, ClipboardList, Upload, BellRing, Bot, Sparkles, Loader2, 
  Trash2, Plus, CheckCircle2, Search, School, Maximize2, Minimize2, FolderOpen
} from 'lucide-react';
import RichEditor from './RichEditor.tsx';

interface ExpandableFieldProps {
  value: string;
  onChange: (v: string) => void;
  onToggle?: (expanded: boolean) => void;
  placeholder?: string;
  label?: string;
  isTextarea?: boolean;
  subject?: string;
}

const ExpandableField: React.FC<ExpandableFieldProps> = ({ value, onChange, onToggle, placeholder, label, isTextarea = false, subject }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpand = (val: boolean) => {
    setIsExpanded(val);
    if (onToggle) onToggle(val);
  };

  return (
    <div className="space-y-2 relative group">
      {label && <label className="text-[10px] font-black text-gray-400 uppercase block pr-1">{label}</label>}
      <div className="relative">
        {isExpanded ? (
          <div className="animate-fade-in">
             <button 
                onClick={() => toggleExpand(false)}
                className="absolute top-2 left-2 z-10 p-2 bg-white/80 hover:bg-white rounded-lg shadow-sm text-gray-400 hover:text-primary transition-all flex items-center justify-center w-10 h-10"
                title="סגור הרחבה"
             >
                <Minimize2 size={18} />
             </button>
             <RichEditor 
                value={value} 
                onChange={onChange} 
                placeholder={placeholder} 
                minHeight="200px" 
                minimalMode={false}
                subject={subject}
             />
          </div>
        ) : (
          <div className="relative">
             {isTextarea ? (
               <textarea 
                value={value.replace(/<[^>]*>/g, '')} 
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none focus:border-primary transition-all text-right font-medium min-h-[100px] resize-none"
               />
             ) : (
               <input 
                type="text" 
                value={value.replace(/<[^>]*>/g, '')} 
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl outline-none focus:border-primary transition-all text-right font-medium"
               />
             )}
             <button 
                onClick={() => toggleExpand(true)}
                className="absolute left-2 top-2 p-2 text-gray-300 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                title="הרחבה לעיצוב עשיר ומתמטיקה"
             >
                <Maximize2 size={16} />
             </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface GlobalContentEditorProps {
  user: User;
  onClose: () => void;
  onPublish: (material: ClassroomMaterial, targetClassIds: string[]) => void;
  classrooms: Classroom[];
  initialMaterial?: ClassroomMaterial | null;
}

const GlobalContentEditor: React.FC<GlobalContentEditorProps> = ({ user, onClose, onPublish, classrooms, initialMaterial }) => {
  const [loading, setLoading] = useState(false);
  const [showClassSelector, setShowClassSelector] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Track which option in which question is expanded to change layout
  const [expandedOptionMap, setExpandedOptionMap] = useState<Record<string, boolean>>({});

  const [draftMaterial, setDraftMaterial] = useState<Partial<ClassroomMaterial>>({
    type: 'SUMMARY',
    title: '',
    content: '',
    questions: [],
    dueDate: '',
    teacherAttachments: [],
    autoGradeByAI: true
  });

  useEffect(() => {
    if (initialMaterial) {
      setDraftMaterial({
        ...initialMaterial,
        id: Date.now().toString(), // Treat as new draft based on template
      });
    } else {
      // RESET to defaults if creating new
      setDraftMaterial({
        type: 'SUMMARY',
        title: '',
        content: '',
        questions: [],
        dueDate: '',
        teacherAttachments: [],
        autoGradeByAI: true
      });
    }
  }, [initialMaterial]);

  const [aiMcqCount, setAiMcqCount] = useState(3);
  const [aiOpenCount, setAiOpenCount] = useState(2);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // For global editor, we check the first selected class or the first available class
  // Fix: Imported useMemo from react to resolve 'Cannot find name useMemo'
  const currentContextSubject = useMemo(() => {
    if (selectedClassIds.length > 0) {
      return classrooms.find(c => c.id === selectedClassIds[0])?.subject;
    }
    return classrooms[0]?.subject;
  }, [selectedClassIds, classrooms]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setDraftMaterial(prev => ({
            ...prev,
            teacherAttachments: [{ name: file.name, data: base64Data, mimeType: file.type }]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const isFileOnly = draftMaterial.type === 'UPLOADED_FILE';
  const isTest = draftMaterial.type === 'TEST';
  const isUpcoming = draftMaterial.type === 'UPCOMING_TEST';
  const isAssignment = draftMaterial.type === 'ASSIGNMENT';

  const createFinalMaterial = (): ClassroomMaterial => {
    const finalTitle = draftMaterial.title || (draftMaterial.teacherAttachments?.[0]?.name || 'קובץ חדש');
    return {
      id: Date.now().toString(),
      title: finalTitle,
      type: draftMaterial.type as MaterialType,
      content: draftMaterial.content || '',
      questions: draftMaterial.questions || [],
      dueDate: draftMaterial.dueDate,
      timestamp: Date.now(),
      isPublished: true,
      teacherAttachments: draftMaterial.teacherAttachments || [],
      submissions: [],
      autoGradeByAI: draftMaterial.autoGradeByAI
    };
  };

  const handlePrePublish = () => {
    if (!draftMaterial.title && !isFileOnly) {
      alert("נא להזין כותרת לתוכן");
      return;
    }
    
    const needsDueDate = ['TEST', 'ASSIGNMENT', 'UPCOMING_TEST'].includes(draftMaterial.type || '');
    if (needsDueDate && !draftMaterial.dueDate) {
        alert("חייב לסמן תאריך יעד כדי לפרסם תוכן זה לכיתה.");
        return;
    }
    
    setShowClassSelector(true);
  };

  const handleFinalPublish = () => {
    if (selectedClassIds.length === 0) {
        alert("נא לבחור לפחות כיתה אחת לפרסום");
        return;
    }
    onPublish(createFinalMaterial(), selectedClassIds);
  };

  const handleSaveToRepositoryOnly = () => {
    onPublish(createFinalMaterial(), []);
  };

  const filteredClassrooms = classrooms.filter(c => {
    const nameMatch = c.name.toLowerCase().includes(searchTerm.toLowerCase());
    const subjectMatch = c.subject.toLowerCase().includes(searchTerm.toLowerCase());
    return nameMatch || subjectMatch;
  });

  return (
    <div className="fixed inset-0 z-[110] bg-gray-50 flex flex-col animate-slide-up overflow-hidden text-right" dir="rtl">
      <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-6">
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all"><X size={24} /></button>
          <div className="h-8 w-px bg-gray-200" />
          <h2 className="font-black text-xl text-gray-900 leading-none">מרחב יצירת תוכן גלובלי</h2>
        </div>
        <button 
          onClick={handlePrePublish}
          disabled={(!draftMaterial.title && !isFileOnly) || loading}
          className="bg-primary text-white px-8 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-600 disabled:opacity-30 transition-all flex items-center gap-2"
        >
          <Send size={18} />
          בחר כיתות לפרסום
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto p-6 space-y-8 no-scrollbar">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">סוג התוכן</label>
            <div className="grid gap-2">
              {[
                { id: 'SUMMARY', label: 'סיכום לימודי', icon: FileText, color: 'blue' },
                { id: 'TEST', label: 'מבחן/תרגול', icon: ListChecks, color: 'indigo' },
                { id: 'ASSIGNMENT', label: 'מטלה להגשה', icon: ClipboardList, color: 'emerald' },
                { id: 'UPCOMING_TEST', label: 'התראה על מבחן', icon: BellRing, color: 'orange' },
                { id: 'UPLOADED_FILE', label: 'קובץ', icon: Upload, color: 'blue' }
              ].map(t => (
                <button 
                  key={t.id}
                  onClick={() => {
                    const newType = t.id as MaterialType;
                    const needsDate = ['TEST', 'ASSIGNMENT', 'UPCOMING_TEST'].includes(newType);
                    let newDueDate = draftMaterial.dueDate;
                    if (needsDate && !newDueDate) {
                        const d = new Date();
                        d.setDate(d.getDate() + 7);
                        const tzOffset = d.getTimezoneOffset() * 60000;
                        newDueDate = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
                    }
                    setDraftMaterial(prev => ({ ...prev, type: newType, dueDate: newDueDate }))
                  }}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-right ${draftMaterial.type === t.id ? `border-${t.color}-500 bg-${t.color}-50 text-${t.color}-700 shadow-sm` : 'border-gray-50 hover:border-gray-200 text-gray-500'}`}
                >
                  <t.icon size={20} className={draftMaterial.type === t.id ? `text-${t.color}-500` : 'text-gray-300'} />
                  <span className="font-bold text-sm">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {(isTest || isAssignment || isUpcoming) && (
            <div className="space-y-4 pt-4 border-t border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">תאריך יעד / מבחן</label>
                <input 
                  type="date" 
                  value={draftMaterial.dueDate || ''} 
                  onChange={(e) => setDraftMaterial(prev => ({...prev, dueDate: e.target.value}))} 
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-sm outline-none focus:border-primary transition-all"
                />
            </div>
          )}

          {isTest && (
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">הגדרות שאלות (AI)</label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-black text-gray-400 block mb-1">אמריקאיות</span>
                    <input type="number" min="0" max="10" value={aiMcqCount} onChange={(e) => setAiMcqCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-lg text-indigo-600 outline-none" />
                  </div>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                    <span className="text-[10px] font-black text-gray-400 block mb-1">פתוחות</span>
                    <input type="number" min="0" max="10" value={aiOpenCount} onChange={(e) => setAiOpenCount(parseInt(e.target.value))} className="w-full bg-transparent font-black text-lg text-purple-600 outline-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isFileOnly && !isUpcoming && (
             <div className="space-y-4 pt-4 border-t border-gray-100">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">עזרים חכמים (AI)</label>
                <button 
                 onClick={async () => {
                   if (!draftMaterial.title) return;
                   setLoading(true);
                   try {
                     if (isTest) {
                       const total = aiMcqCount + aiOpenCount;
                       const defaultSubject = classrooms[0]?.subject || Subject.MATH;
                       const defaultGrade = classrooms[0]?.grade || Grade.GRADE_10;
                       const qs = await generateQuestions(defaultSubject, defaultGrade, draftMaterial.title, [], total, 'MEDIUM', aiMcqCount, aiOpenCount);
                       setDraftMaterial(prev => ({...prev, questions: qs}));
                     } else {
                       const defaultSubject = classrooms[0]?.subject || Subject.MATH;
                       const defaultGrade = classrooms[0]?.grade || Grade.GRADE_10;
                       const content = await generateSummary(defaultSubject, defaultGrade, draftMaterial.title);
                       setDraftMaterial(prev => ({...prev, content}));
                     }
                   } finally { setLoading(false); }
                 }}
                 disabled={loading || !draftMaterial.title}
                 className="w-full p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-black text-white font-black text-xs flex items-center justify-center gap-2 shadow-xl hover:-translate-y-1 transition-all disabled:opacity-20"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-yellow-400" />}
                  <span>ייצר תוכן עם AI</span>
                </button>
             </div>
          )}
        </div>

        <div className="flex-1 bg-gray-50 overflow-y-auto p-12 md:p-20 relative no-scrollbar">
          <div className="max-w-4xl mx-auto space-y-12 pb-32">
            <input 
              type="text" 
              value={draftMaterial.title}
              onChange={e => setDraftMaterial(prev => ({...prev, title: e.target.value}))}
              placeholder={isFileOnly ? "כותרת לקובץ (אופציונלי)..." : "כותרת התוכן..."}
              className="w-full bg-transparent border-none text-5xl font-black text-gray-900 placeholder:text-gray-200 outline-none"
            />

            {isFileOnly ? (
                <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-gray-100 text-center flex flex-col items-center justify-center space-y-6">
                    <div className="bg-blue-50 p-8 rounded-full text-blue-500"><Upload size={64}/></div>
                    <div>
                        <h3 className="text-3xl font-black text-gray-800">העלאת קובץ גלובלי</h3>
                        <p className="text-gray-400 font-bold text-lg mt-2">תוכל לבחור לאילו כיתות לשייך את הקובץ בסיום.</p>
                    </div>
                    <button onClick={() => fileInputRef.current?.click()} className="bg-gray-900 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl hover:bg-black transition-all">בחר קובץ להעלאה</button>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                </div>
            ) : isTest ? (
              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-black text-gray-500 uppercase tracking-widest text-xs flex items-center gap-2"><ListChecks size={16}/> שאלות המבחן/תרגול</h3>
                  <div className="flex gap-2">
                    <button onClick={() => setDraftMaterial(prev => ({...prev, questions: [...(prev.questions || []), { id: `q-${Date.now()}`, text: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', type: 'MCQ' }]}))} className="text-primary font-black text-xs flex items-center gap-1 hover:underline px-3 py-1 bg-blue-50 rounded-lg"><Plus size={14}/> שאלה אמריקאית</button>
                    <button onClick={() => setDraftMaterial(prev => ({...prev, questions: [...(prev.questions || []), { id: `q-${Date.now()}`, text: '', options: [], correctIndex: 0, explanation: '', type: 'OPEN', modelAnswer: '' }]}))} className="text-purple-600 font-black text-xs flex items-center gap-1 hover:underline px-3 py-1 bg-purple-50 rounded-lg"><Plus size={14}/> שאלה פתוחה</button>
                  </div>
                </div>
                <div className="space-y-6">
                  {draftMaterial.questions?.map((q, i) => {
                    const anyOptionExpanded = q.options.some((_, oi) => expandedOptionMap[`${q.id}-${oi}`]);

                    return (
                      <div key={q.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative group animate-fade-in">
                        <button onClick={() => setDraftMaterial(prev => ({...prev, questions: prev.questions?.filter(item => item.id !== q.id)}))} className="absolute top-6 left-6 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                        <div className="mb-6">
                          <ExpandableField 
                            label={`שאלה ${i+1}`}
                            value={q.text} 
                            onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].text = text; setDraftMaterial(prev => ({...prev, questions: newQs})); }} 
                            placeholder="כתוב את השאלה כאן..." 
                            isTextarea
                            subject={currentContextSubject}
                          />
                        </div>
                        {q.type === 'OPEN' ? (
                          <div className="space-y-2">
                             <ExpandableField 
                              label="תשובת מודל"
                              value={q.modelAnswer || ''} 
                              onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].modelAnswer = text; setDraftMaterial(prev => ({...prev, questions: newQs})); }} 
                              placeholder="תשובת מודל..." 
                              isTextarea
                              subject={currentContextSubject}
                            />
                          </div>
                        ) : (
                          <div className={`grid gap-4 transition-all duration-300 ${anyOptionExpanded ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                            {q.options.map((opt, oi) => (
                              <div key={oi} className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all ${q.correctIndex === oi ? 'border-green-500 bg-green-50' : 'border-gray-50'} ${expandedOptionMap[`${q.id}-${oi}`] ? 'col-span-full' : ''}`}>
                                <input type="radio" className="mt-4" checked={q.correctIndex === oi} onChange={() => { const newQs = [...draftMaterial.questions!]; newQs[i].correctIndex = oi; setDraftMaterial(prev => ({...prev, questions: newQs})); }} />
                                <div className="flex-1">
                                  <ExpandableField 
                                    value={opt} 
                                    onToggle={(expanded) => setExpandedOptionMap(prev => ({...prev, [`${q.id}-${oi}`]: expanded}))}
                                    onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].options[oi] = text; setDraftMaterial(prev => ({...prev, questions: newQs})); }} 
                                    placeholder={`אופציה ${oi+1}`} 
                                    subject={currentContextSubject}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <RichEditor 
                value={draftMaterial.content || ''} 
                onChange={content => setDraftMaterial(prev => ({...prev, content}))} 
                placeholder="כתוב כאן את תוכן התוכן שיוצג לתלמידים..." 
                showGuide={true}
                subject={currentContextSubject}
              />
            )}
          </div>
        </div>
      </div>

      {showClassSelector && (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[85vh]">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
               <div>
                  <h3 className="text-2xl font-black text-gray-900">פרסום לכיתות</h3>
                  <p className="text-sm text-gray-500 font-bold">בחר לאילו מהכיתות שלך לשלוח את החומר הזה</p>
               </div>
               <button onClick={() => setShowClassSelector(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-400"><X size={24}/></button>
            </div>
            
            <div className="p-6 bg-white border-b border-gray-100">
               <div className="relative">
                  <input 
                    type="text" 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="חפש כיתה..." 
                    className="w-full p-4 pr-12 bg-gray-100 border-none rounded-2xl outline-none focus:ring-2 ring-primary/20 font-bold"
                  />
                  <Search size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 no-scrollbar">
               {classrooms.length === 0 ? (
                 <div className="text-center py-20 flex flex-col items-center gap-4">
                   <School size={48} className="text-gray-200" />
                   <p className="text-gray-400 font-bold">לא נמצאו כיתות המשויכות אליך.</p>
                   <p className="text-xs text-gray-400">ודא שהקמת כיתות בדף הבית לפני הפרסום.</p>
                 </div>
               ) : filteredClassrooms.length === 0 ? (
                 <div className="text-center py-10 text-gray-400 font-bold">לא נמצאו כיתות תואמות לחיפוש</div>
               ) : (
                 filteredClassrooms.map(c => {
                   const isSelected = selectedClassIds.includes(c.id);
                   return (
                     <button 
                       key={c.id} 
                       onClick={() => setSelectedClassIds(prev => isSelected ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                       className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all text-right ${isSelected ? 'border-primary bg-blue-50 shadow-md' : 'border-gray-50 hover:border-gray-100 bg-white'}`}
                     >
                       <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${isSelected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'}`}>
                             <School size={20} />
                          </div>
                          <div>
                             <h4 className="font-black text-gray-900">{c.name}</h4>
                             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.subject} • {c.grade}</p>
                          </div>
                       </div>
                       <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-primary bg-primary text-white' : 'border-gray-200'}`}>
                          {isSelected && <CheckCircle2 size={16} />}
                       </div>
                     </button>
                   );
                 })
               )}
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4">
               <button 
                onClick={handleFinalPublish} 
                disabled={selectedClassIds.length === 0}
                className="flex-[2] bg-primary text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-blue-600 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
               >
                 <span>פרסם ל-{selectedClassIds.length} כיתות</span>
                 <Send size={20}/>
               </button>
               
               <button 
                onClick={handleSaveToRepositoryOnly}
                className="flex-1 bg-gray-900 text-white py-5 rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"
               >
                 <FolderOpen size={18} />
                 <span>שמירה במאגר בלבד</span>
               </button>

               <button onClick={() => setShowClassSelector(false)} className="px-6 py-5 bg-white border border-gray-200 rounded-2xl font-black text-gray-500 hover:bg-gray-100 text-sm">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalContentEditor;
