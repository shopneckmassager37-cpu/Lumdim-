
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Classroom, ClassroomMaterial, Subject, Grade, User, Question, MaterialType, ClassroomSubmission, ClassroomMessage, HistoryItem } from '../types.ts';
import { generateSummary, generateQuestions, gradeOpenQuestion, generateClassroomAnalytics } from '../services/geminiService.ts';
import { 
  School, Plus, Users, UserPlus, BookOpen, FileText, PlusCircle, ArrowRight, Loader2, Sparkles, 
  Copy, Check, Trash2, X, ChevronLeft, Upload, FileDown, Info, Clock, Edit3, Send, ListChecks, ClipboardList, 
  BellRing, Bot, User as UserIcon, CheckCircle2, Trophy, MessageSquare, Save, Calendar, Paperclip, Maximize2, Minimize2,
  BarChart3, TrendingUp, Target, Star, ClipboardCheck
} from 'lucide-react';
import LatexRenderer from './LatexRenderer.tsx';
import RichEditor from './RichEditor.tsx';

const DB_KEY = 'lumdim_global_database_v1';

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

interface ClassroomViewProps {
  user: User;
  onBack: () => void;
  onStartTestPrep: (subject: Subject, grade: Grade, topic: string, days: number, attachment?: any) => void;
  onAddHistoryItem: (item: HistoryItem) => void;
  initialClassId?: string | null;
  initialMaterialId?: string | null;
}

const ClassroomView: React.FC<ClassroomViewProps> = ({ user, onBack, onStartTestPrep, onAddHistoryItem, initialClassId, initialMaterialId }) => {
  const [allGlobalClassrooms, setAllGlobalClassrooms] = useState<Classroom[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [activeMaterial, setActiveMaterial] = useState<ClassroomMaterial | null>(null);
  const [loading, setLoading] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const [activeTab, setActiveTab] = useState<'MATERIALS' | 'CHAT' | 'STUDENTS' | 'ANALYTICS'>('MATERIALS');
  const [viewingSubmission, setViewingSubmission] = useState<ClassroomSubmission | null>(null);
  const [manualFinalScore, setManualFinalScore] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Dynamic Analytics State
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [classroomAIInsights, setClassroomAIInsights] = useState<{focus: string; strengths: string; recommendations: string} | null>(null);

  const [assignmentAnswer, setAssignmentAnswer] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatRecipient, setChatRecipient] = useState<string>('ALL'); // 'ALL' or user ID
  const [chatAttachment, setChatAttachment] = useState<{name: string, data: string, mimeType: string, preview?: string} | null>(null);
  const lastAutoSelectedMsgId = useRef<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatFileInputRef = useRef<HTMLInputElement>(null);

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [draftMaterial, setDraftMaterial] = useState<Partial<ClassroomMaterial>>({
    type: 'SUMMARY',
    title: '',
    content: '',
    questions: [],
    testDate: '',
    dueDate: '',
    teacherAttachments: [],
    targetStudentIds: [],
    autoGradeByAI: true
  });

  const [expandedOptionMap, setExpandedOptionMap] = useState<Record<string, boolean>>({});

  const [aiMcqCount, setAiMcqCount] = useState(3);
  const [aiOpenCount, setAiOpenCount] = useState(2);
  const [messageRecipientMode, setMessageRecipientMode] = useState<'ALL' | 'SPECIFIC'>('ALL');

  const [activeSubTab, setActiveSubTab] = useState<'SUMMARY' | 'QUIZ' | 'SUBMIT' | 'SUBMISSIONS'>('SUMMARY');
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [newClassSubject, setNewClassSubject] = useState<Subject | 'OTHER'>(Subject.MATH);
  const [customSubject, setCustomSubject] = useState('');
  const [newClassGrade, setNewClassGrade] = useState<Grade>(Grade.GRADE_7);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const encodeToBase64 = (str: string): string => {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const getLatestClassrooms = (): Classroom[] => {
    try {
      const data = localStorage.getItem(DB_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error("Error reading database", e);
      return [];
    }
  };

  const loadFromDB = () => {
    const classrooms = getLatestClassrooms();
    setAllGlobalClassrooms(classrooms);
  };

  useEffect(() => {
    loadFromDB();
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DB_KEY) loadFromDB();
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('lumdim-db-updated', loadFromDB);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('lumdim-db-updated', loadFromDB);
    };
  }, []);

  const activeClass = allGlobalClassrooms.find(c => c.id === activeClassId);
  const isTeacherOfThisClass = activeClass?.teacherId === user.id;

  // Load dynamic analytics when tab is opened - ONLY for teachers
  useEffect(() => {
    if (activeTab === 'ANALYTICS' && activeClass && isTeacherOfThisClass && !classroomAIInsights && !loadingAnalytics) {
        const fetchInsights = async () => {
            setLoadingAnalytics(true);
            try {
                const insights = await generateClassroomAnalytics(activeClass.name, activeClass.subject, activeClass.materials);
                setClassroomAIInsights(insights);
            } catch (e) {
                console.error("Failed to generate classroom insights", e);
            } finally {
                setLoadingAnalytics(false);
            }
        };
        fetchInsights();
    }
  }, [activeTab, activeClass, classroomAIInsights, loadingAnalytics, isTeacherOfThisClass]);

  useEffect(() => {
    if (initialClassId) {
      setActiveClassId(initialClassId);
    }
  }, [initialClassId]);

  useEffect(() => {
    if (activeClassId && initialMaterialId) {
        const targetClass = allGlobalClassrooms.find(c => c.id === activeClassId);
        if (targetClass) {
            const mat = targetClass.materials.find(m => m.id === initialMaterialId);
            if (mat) {
                setActiveMaterial(mat);
                setActiveSubTab(mat.type === 'TEST' ? (targetClass.teacherId === user.id ? 'SUBMISSIONS' : 'QUIZ') : 'SUMMARY');
            }
        }
    }
  }, [activeClassId, initialMaterialId, allGlobalClassrooms, user.id]);

  const isTeacherRole = user.role === 'TEACHER';

  const visibleMessages = activeClass?.messages?.filter(msg => {
    if (!msg.recipientId) return true; // Everyone
    return msg.recipientId === user.id || msg.senderId === user.id;
  }) || [];

  useEffect(() => {
    if (activeTab === 'CHAT' && activeClassId) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      
      const privateMsgsToMe = visibleMessages.filter(m => m.recipientId === user.id);
      if (privateMsgsToMe.length > 0) {
        const lastMsg = privateMsgsToMe[privateMsgsToMe.length - 1];
        if (lastAutoSelectedMsgId.current !== lastMsg.id) {
          setChatRecipient(lastMsg.senderId);
          lastAutoSelectedMsgId.current = lastMsg.id;
        }
      }
    }
  }, [activeTab, allGlobalClassrooms, visibleMessages, activeClassId, user.id]);

  const saveToDB = (updatedList: Classroom[]) => {
    localStorage.setItem(DB_KEY, JSON.stringify(updatedList));
    setAllGlobalClassrooms(updatedList);
    window.dispatchEvent(new Event('lumdim-db-updated'));
  };

  const myClassrooms = allGlobalClassrooms.filter(c => 
    c.teacherId === user.id || c.studentIds?.includes(user.id)
  );

  const handleOpenCreateClass = () => {
    if (!isTeacherRole) return;
    setIsCreating(true);
  };

  const handleCreateClass = () => {
    if (!newClassName.trim()) return;
    
    const finalSubject = newClassSubject === 'OTHER' ? customSubject.trim() : newClassSubject;
    if (!finalSubject) {
      alert("נא להזין שם מקצוע");
      return;
    }

    const currentList = getLatestClassrooms();
    const newClass: Classroom = {
      id: Math.random().toString(36).substring(2, 8).toUpperCase(),
      name: newClassName,
      subject: finalSubject as Subject,
      grade: newClassGrade,
      teacherName: user.name || 'מורה',
      teacherId: user.id,
      materials: [],
      messages: [],
      studentsCount: 0,
      students: [],
      studentIds: []
    };
    saveToDB([newClass, ...currentList]);
    setIsCreating(false);
    setNewClassName('');
    setCustomSubject('');
    setNewClassSubject(Subject.MATH);
    setActiveClassId(newClass.id);
  };

  const handleJoinClass = () => {
    const code = joinCode.toUpperCase().trim();
    if (!code) return;

    const currentList = getLatestClassrooms();
    const classIdx = currentList.findIndex(c => c.id === code);
    
    if (classIdx === -1) {
      alert("קוד כיתה לא תקין. בדוק שוב את הקוד שקיבלת.");
      return;
    }

    const updatedList = [...currentList];
    const targetClass = { ...updatedList[classIdx] };

    if (targetClass.teacherId === user.id || targetClass.studentIds?.includes(user.id)) {
      setActiveClassId(code);
      setIsJoining(false);
      setJoinCode('');
      setAllGlobalClassrooms(currentList);
      return;
    }

    if (!targetClass.studentIds) targetClass.studentIds = [];
    if (!targetClass.students) targetClass.students = [];
    
    targetClass.studentIds.push(user.id);
    targetClass.students.push(user.name || 'תלמיד');
    targetClass.studentsCount = targetClass.studentIds.length;

    updatedList[classIdx] = targetClass;
    saveToDB(updatedList);
    
    setActiveClassId(code);
    setIsJoining(false);
    setJoinCode('');
  };

  const handleSendMessage = () => {
    if ((!chatInput.trim() && !chatAttachment) || !activeClass) return;
    
    const newMessage: ClassroomMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      senderName: user.name || 'תלמיד',
      recipientId: chatRecipient === 'ALL' ? undefined : chatRecipient,
      text: chatInput,
      timestamp: Date.now(),
      attachment: chatAttachment ? { mimeType: chatAttachment.mimeType, data: chatAttachment.data } : undefined
    };

    const updatedList = allGlobalClassrooms.map(c => 
      c.id === activeClass.id ? { ...c, messages: [...(c.messages || []), newMessage] } : c
    );
    
    saveToDB(updatedList);
    setChatInput('');
    setChatAttachment(null);
  };

  const handleChatFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const fullBase64 = reader.result as string;
        const data = fullBase64.split(',')[1];
        
        if (file.type.startsWith('image/')) {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 600;
                let w = img.width;
                let h = img.height;
                if (w > h && w > MAX) { h *= MAX/w; w = MAX; }
                else if (h > w && h > MAX) { w *= MAX/h; h = MAX; }
                canvas.width = w; canvas.height = h;
                const compressed = canvas.toDataURL('image/jpeg', 0.6);
                setChatAttachment({ name: file.name, data: compressed.split(',')[1], mimeType: 'image/jpeg', preview: compressed });
            };
            img.src = fullBase64;
        } else {
            setChatAttachment({ name: file.name, data, mimeType: file.type });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePublish = () => {
    if (!activeClass || (!draftMaterial.title && draftMaterial.type !== 'UPLOADED_FILE')) return;
    
    const needsDueDate = ['TEST', 'ASSIGNMENT', 'UPCOMING_TEST'].includes(draftMaterial.type || '');
    if (needsDueDate && !draftMaterial.dueDate) {
        alert("חייב לסמן תאריך יעד כדי לפרסם תוכן זה לכיתה.");
        return;
    }

    const finalTitle = draftMaterial.title || (draftMaterial.teacherAttachments?.[0]?.name || 'קובץ חדש');

    const newMat: ClassroomMaterial = {
      id: Date.now().toString(),
      title: finalTitle,
      type: draftMaterial.type as MaterialType,
      content: draftMaterial.content || '',
      questions: draftMaterial.questions || [],
      testDate: draftMaterial.testDate,
      dueDate: draftMaterial.dueDate,
      timestamp: Date.now(),
      isPublished: true,
      teacherAttachments: draftMaterial.teacherAttachments || [],
      submissions: [],
      targetStudentIds: messageRecipientMode === 'ALL' ? undefined : draftMaterial.targetStudentIds,
      autoGradeByAI: draftMaterial.autoGradeByAI
    };

    const updatedList = allGlobalClassrooms.map(c => 
      c.id === activeClass.id ? { ...c, materials: [newMat, ...c.materials] } : c
    );
    
    saveToDB(updatedList);
    
    onAddHistoryItem({
        id: newMat.id,
        timestamp: newMat.timestamp,
        subject: activeClass.subject,
        grade: activeClass.grade,
        type: newMat.type === 'SUMMARY' ? 'SUMMARY' : 'PRACTICE',
        title: `העלאת ${newMat.type === 'UPLOADED_FILE' ? 'קובץ' : 'תוכן'}: ${newMat.title}`,
        content: newMat.content,
        isCorrect: true,
        classId: activeClass.id,
        details: newMat
    });

    setWorkspaceOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setDraftMaterial({
            ...draftMaterial,
            teacherAttachments: [{ name: file.name, data: base64Data, mimeType: file.type }]
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAssignmentSubmit = () => {
    if (!activeClass || !activeMaterial || !assignmentAnswer.trim()) return;
    
    const submission: ClassroomSubmission = {
      studentId: user.id,
      studentName: user.name || 'תלמיד',
      timestamp: Date.now(),
      attachment: { 
        name: 'תשובות_מטלה.txt', 
        mimeType: 'text/plain', 
        data: encodeToBase64(assignmentAnswer) 
      },
      assignmentText: assignmentAnswer
    };

    const updatedList = allGlobalClassrooms.map(c => {
      if (c.id === activeClass.id) {
        return {
          ...c,
          materials: c.materials.map(m => 
            m.id === activeMaterial.id ? { ...m, submissions: [...(m.submissions || []), submission] } : m
          )
        };
      }
      return c;
    });

    saveToDB(updatedList);
    setAssignmentAnswer('');
    setActiveMaterial(null);
    alert('המטלה הוגשה בהצלחה!');

    onAddHistoryItem({
      id: `assignment-${Date.now()}`,
      timestamp: Date.now(),
      subject: activeClass.subject,
      grade: activeClass.grade,
      type: 'PRACTICE',
      title: `הגשת מטלה: ${activeMaterial.title}`,
      isCorrect: true,
      classId: activeClass.id
    });
  };

  const handleStudentSubmit = async () => {
    if (!activeClass || !activeMaterial) return;
    
    setIsGrading(true);
    let finalScore = undefined;

    try {
      if (activeMaterial.autoGradeByAI) {
        const gradingTasks = activeMaterial.questions?.map(async (q) => {
          if (q.type === 'OPEN') {
            const res = await gradeOpenQuestion(q.text, q.modelAnswer || "", quizAnswers[q.id] || "");
            return res.score;
          } else {
            return quizAnswers[q.id] === q.correctIndex ? 100 : 0;
          }
        }) || [];
        
        const scores = await Promise.all(gradingTasks);
        if (scores.length > 0) {
          finalScore = Math.round(scores.reduce((sum: number, val: number) => sum + val, 0) / scores.length);
        }
      }

      const base64Data = encodeToBase64(JSON.stringify(quizAnswers));
      const submission: ClassroomSubmission = {
        studentId: user.id,
        studentName: user.name || 'תלמיד',
        timestamp: Date.now(),
        attachment: { name: 'תשובות.json', mimeType: 'application/json', data: base64Data },
        quizResults: quizAnswers,
        aiScore: finalScore
      };

      const updatedList = allGlobalClassrooms.map(c => {
        if (c.id === activeClass.id) {
          return {
            ...c,
            materials: c.materials.map(m => 
              m.id === activeMaterial.id ? { ...m, submissions: [...(m.submissions || []), submission] } : m
            )
          };
        }
        return c;
      });

      saveToDB(updatedList);
      setQuizScore(finalScore ?? null);
      setQuizFinished(true);

      onAddHistoryItem({
        id: `classroom-test-${Date.now()}`,
        timestamp: Date.now(),
        subject: activeClass.subject,
        grade: activeClass.grade,
        type: 'PRACTICE',
        title: `${activeMaterial.title} (כיתתי)`,
        isCorrect: finalScore !== undefined ? finalScore >= 55 : true,
        score: finalScore,
        classId: activeClass.id
      });

    } catch (e) {
      console.error(e);
      alert("אירעה שגיאה בשליחת המבחן. נסה שוב.");
    } finally {
      setIsGrading(false);
    }
  };

  const handleSaveTeacherGrades = () => {
    if (!activeClass || !activeMaterial || !viewingSubmission) return;

    const scoreNum = parseInt(manualFinalScore);
    if (isNaN(scoreNum)) {
      alert("נא להזין ציון תקין");
      return;
    }

    let updatedMaterialObj: ClassroomMaterial | null = null;
    let updatedSubmissionObj: ClassroomSubmission | null = null;

    const updatedList = allGlobalClassrooms.map(c => {
      if (c.id === activeClass.id) {
        const newMaterials = c.materials.map(m => {
          if (m.id === activeMaterial.id) {
            const newSubmissions = m.submissions?.map(s => {
              if (s.studentId === viewingSubmission.studentId) {
                updatedSubmissionObj = { ...s, aiScore: scoreNum, teacherGrades: { manual: scoreNum } };
                return updatedSubmissionObj;
              }
              return s;
            }) || [];
            updatedMaterialObj = { ...m, submissions: newSubmissions };
            return updatedMaterialObj;
          }
          return m;
        });
        return { ...c, materials: newMaterials };
      }
      return c;
    });

    saveToDB(updatedList);
    
    if (updatedMaterialObj) setActiveMaterial(updatedMaterialObj);
    if (updatedSubmissionObj) setViewingSubmission(updatedSubmissionObj);
    
    alert('הציון נשמר בהצלחה!');
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isAllQuestionsAnswered = () => {
    if (!activeMaterial?.questions) return false;
    return activeMaterial.questions.every(q => {
      const ans = quizAnswers[q.id];
      if (q.type === 'OPEN') return ans && ans.toString().trim() !== '';
      return ans !== undefined;
    });
  };

  const filteredMaterials = activeClass?.materials.filter(m => {
    if (isTeacherOfThisClass) return true;
    if (m.type === 'MESSAGE' && m.targetStudentIds) {
      return m.targetStudentIds.includes(user.id);
    }
    return true;
  }) || [];

  const classAnalytics = useMemo(() => {
    if (!activeClass || !isTeacherOfThisClass) return null;
    const materials = activeClass.materials.filter(m => m.type === 'TEST' || m.type === 'ASSIGNMENT');
    const totalStudents = activeClass.studentIds?.length || 0;
    
    if (materials.length === 0 || totalStudents === 0) return null;

    let totalScore = 0;
    let scoreCount = 0;
    let totalSubmissions = 0;

    materials.forEach(m => {
        m.submissions?.forEach(s => {
            totalSubmissions++;
            if (s.aiScore !== undefined) {
                totalScore += s.aiScore;
                scoreCount++;
            }
        });
    });

    const averageScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
    const submissionRate = Math.round((totalSubmissions / (materials.length * totalStudents)) * 100);

    return {
        averageScore,
        submissionRate,
        materialsCount: materials.length,
        studentsCount: totalStudents
    };
  }, [activeClass, isTeacherOfThisClass]);

  const studentPersonalAnalytics = useMemo(() => {
    if (!activeClass || isTeacherOfThisClass) return null;
    const testMaterials = activeClass.materials.filter(m => m.type === 'TEST' || m.type === 'ASSIGNMENT');
    if (testMaterials.length === 0) return null;

    let submittedCount = 0;
    let totalScore = 0;
    let scoreCount = 0;

    testMaterials.forEach(m => {
        const sub = m.submissions?.find(s => s.studentId === user.id);
        if (sub) {
            submittedCount++;
            if (sub.aiScore !== undefined) {
                totalScore += sub.aiScore;
                scoreCount++;
            }
        }
    });

    return {
        averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : null,
        submissionRate: Math.round((submittedCount / testMaterials.length) * 100),
        totalTasks: testMaterials.length,
        completedTasks: submittedCount
    };
  }, [activeClass, isTeacherOfThisClass, user.id]);

  const studentStats = useMemo(() => {
    if (!activeClass || !isTeacherOfThisClass) return [];
    const testMaterials = activeClass.materials.filter(m => m.type === 'TEST' || m.type === 'ASSIGNMENT');
    if (testMaterials.length === 0) return [];

    return activeClass.studentIds?.map((sid, idx) => {
        const sName = activeClass.students?.[idx] || 'תלמיד';
        let submittedCount = 0;
        let totalScore = 0;
        let scoreCount = 0;

        testMaterials.forEach(m => {
            const sub = m.submissions?.find(s => s.studentId === sid);
            if (sub) {
                submittedCount++;
                if (sub.aiScore !== undefined) {
                    totalScore += sub.aiScore;
                    scoreCount++;
                }
            }
        });

        return {
            id: sid,
            name: sName,
            submissionPercent: Math.round((submittedCount / testMaterials.length) * 100),
            averageScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : null
        };
    }) || [];
  }, [activeClass, isTeacherOfThisClass]);

  if (activeMaterial) {
    const isTest = activeMaterial.type === 'TEST';
    const isAssignment = activeMaterial.type === 'ASSIGNMENT';
    const isUpcoming = activeMaterial.type === 'UPCOMING_TEST';
    const isMessage = activeMaterial.type === 'MESSAGE';
    const isFile = activeMaterial.type === 'UPLOADED_FILE';
    const mySubmission = activeMaterial.submissions?.find(s => s.studentId === user.id);

    const calculateMaterialScore = (submission: ClassroomSubmission, questions: Question[]) => {
      if (submission.aiScore !== undefined) return submission.aiScore;
      if (!submission.quizResults || !questions) return 0;
      const mcqs = questions.filter(q => q.type === 'MCQ' || !q.type);
      if (mcqs.length === 0) return 0;
      let correct = 0;
      mcqs.forEach(q => {
        if (submission.quizResults![q.id] === q.correctIndex) correct++;
      });
      return Math.round((correct / mcqs.length) * 100);
    };

    return (
      <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in no-print text-right" dir="rtl">
        <button onClick={() => { setActiveMaterial(null); setViewingSubmission(null); setAssignmentAnswer(''); setQuizFinished(false); setQuizAnswers({}); }} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-bold group">
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          <span>חזרה לכיתה</span>
        </button>

        <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 min-h-[500px] flex flex-col overflow-hidden">
          <div className={`p-8 md:p-12 relative text-white ${isUpcoming ? 'bg-orange-50' : isTest ? 'bg-indigo-600' : isMessage ? 'bg-purple-600' : isFile ? 'bg-blue-600' : isAssignment ? 'bg-emerald-500' : 'bg-gray-900'}`}>
             <h2 className="text-3xl md:text-4xl font-black">{activeMaterial.title}</h2>
             <p className="text-white/70 font-bold mt-2 uppercase tracking-widest text-xs">
                {isTest ? 'מבחן/תרגול כיתתי' : isUpcoming ? 'התראה על מבחן' : isMessage ? 'הודעה מהמורה' : isFile ? 'קובץ' : isAssignment ? 'מטלה' : isFile ? 'קובץ' : 'חומר לימודי'}
             </p>

             {(isTest || isAssignment || isUpcoming) && activeMaterial.dueDate && (
                <div className="mt-4 flex items-center gap-2 bg-black/20 w-fit px-4 py-1 rounded-full text-xs font-bold border border-white/20 animate-pulse">
                   <Clock size={14} />
                   <span>{isUpcoming ? 'תאריך המבחן:' : 'תאריך הגשה אחרון:'} {new Date(activeMaterial.dueDate).toLocaleDateString('he-IL')}</span>
                </div>
             )}
             
             <div className="flex gap-2 mt-8 overflow-x-auto no-scrollbar">
                {!isTest && <button onClick={() => { setActiveSubTab('SUMMARY'); setViewingSubmission(null); }} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${setActiveSubTab === 'SUMMARY' ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}>
                    {isFile ? 'הורדה' : isAssignment ? 'הסבר והוראות' : 'תוכן'}
                </button>}
                {isTest && !isTeacherOfThisClass && <button onClick={() => { setActiveSubTab('QUIZ'); setViewingSubmission(null); }} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'QUIZ' ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}>ביצוע המבחן/תרגול</button>}
                {isTeacherOfThisClass && isTest && <button onClick={() => { setActiveSubTab('SUBMISSIONS'); setViewingSubmission(null); }} className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeSubTab === 'SUBMISSIONS' ? 'bg-white text-gray-900' : 'bg-white/10 text-white'}`}>הגשות ({activeMaterial.submissions?.length || 0})</button>}
             </div>
          </div>

          <div className="p-6 md:p-10 flex-1 bg-gray-50/30 overflow-y-auto">
             {viewingSubmission ? (
                <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
                    <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setViewingSubmission(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all"><ArrowRight size={20} /></button>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">{viewingSubmission.studentName}</h3>
                                <p className="text-xs text-gray-400 font-bold uppercase">{new Date(viewingSubmission.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">ציון סופי</span>
                                <input 
                                  type="number" 
                                  min="0" 
                                  max="100" 
                                  value={manualFinalScore} 
                                  onChange={(e) => setManualFinalScore(e.target.value)} 
                                  className="text-3xl font-black text-indigo-600 bg-gray-50 rounded-xl w-24 text-center border-2 border-indigo-100 outline-none" 
                                  placeholder="---"
                                />
                            </div>
                            <button onClick={handleSaveTeacherGrades} className="bg-primary text-white px-6 py-3 rounded-2xl font-black shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2"><Save size={18} /><span>שמור ציון</span></button>
                        </div>
                    </div>
                    <div className="space-y-6">
                        {isAssignment ? (
                           <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">תשובת התלמיד</h4>
                                <div className="p-6 bg-gray-50 rounded-2xl text-lg leading-relaxed text-gray-800 whitespace-pre-wrap border border-gray-100">{viewingSubmission.assignmentText || "לא הוזן טקסט."}</div>
                           </div>
                        ) : (
                            activeMaterial.questions?.map((q, i) => (
                                <div key={q.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm relative">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <span className="bg-gray-100 text-gray-400 w-8 h-8 rounded-full flex items-center justify-center font-black text-xs">{i+1}</span>
                                            <span className={`font-black text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${q.type === 'OPEN' ? 'text-purple-600 bg-purple-50' : 'text-indigo-50 bg-indigo-50'}`}>{q.type === 'OPEN' ? 'שאלה פתוחה' : 'שאלה אמריקאית'}</span>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold mb-6"><LatexRenderer text={q.text} /></h4>
                                    <div className="p-4 rounded-xl font-bold text-sm bg-gray-50 text-gray-800 border-gray-100 border">
                                        <span className="text-gray-400 ml-2">תשובת התלמיד:</span>
                                        {q.type === 'MCQ' ? (q.options[viewingSubmission.quizResults?.[q.id]] || 'לא ענה') : (viewingSubmission.quizResults?.[q.id] || 'לא ענה')}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
             ) : (
                <>
                    {activeSubTab === 'SUMMARY' && !isTest && (
                        <div className={`max-w-6xl mx-auto gap-8 ${(isAssignment || isFile || isUpcoming) ? 'grid lg:grid-cols-2' : 'flex flex-col'}`}>
                            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-full overflow-hidden">
                                <div className="flex items-center gap-3 mb-6 text-gray-400 border-b border-gray-50 pb-4">
                                    <div className="bg-indigo-50 p-2 rounded-xl text-indigo-500"><Info size={20}/></div>
                                    <h3 className="font-black text-sm uppercase tracking-widest">{isFile ? 'קובץ מצורף' : isUpcoming ? 'מידע על המבחן' : 'הסבר והוראות'}</h3>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 no-scrollbar">
                                    <LatexRenderer text={activeMaterial.content} />
                                    {activeMaterial.teacherAttachments && activeMaterial.teacherAttachments.length > 0 && (
                                        <div className="mt-8 pt-8 border-t border-gray-100 space-y-4">
                                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">קבצים:</span>
                                            <div className="grid gap-3">
                                                {activeMaterial.teacherAttachments.map((f, i) => (
                                                    <a key={i} href={`data:${f.mimeType};base64,${f.data}`} download={f.name} className="flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl border border-blue-100 hover:border-blue-500 transition-all shadow-sm group">
                                                        <span className="text-sm font-bold truncate group-hover:text-blue-700">{f.name}</span>
                                                        <FileDown size={18} className="text-blue-500" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {isFile && (
                                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm text-center">
                                     <div className="bg-blue-50 p-6 rounded-full text-blue-600 mb-6"><FileDown size={48} /></div>
                                     <h4 className="text-2xl font-black text-gray-900 mb-2">מוכן להורדה</h4>
                                     <p className="text-gray-500 font-bold mb-8">המורה העלה קובץ עבורכם. לחצו למטה כדי להוריד אותו.</p>
                                     <a 
                                        href={`data:${activeMaterial.teacherAttachments?.[0]?.mimeType};base64,${activeMaterial.teacherAttachments?.[0]?.data}`} 
                                        download={activeMaterial.teacherAttachments?.[0]?.name}
                                        className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black shadow-lg hover:bg-black transition-all flex items-center gap-3"
                                     >
                                        <FileDown size={20} />
                                        <span>הורד את הקובץ</span>
                                     </a>
                                </div>
                            )}

                            {isUpcoming && !isTeacherOfThisClass && (
                                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-[2.5rem] border-2 border-dashed border-orange-200 shadow-sm text-center animate-fade-in">
                                     <div className="bg-orange-50 p-6 rounded-full text-orange-500 mb-6"><Sparkles size={48} className="animate-pulse" /></div>
                                     <h4 className="text-2xl font-black text-gray-900 mb-2">התכונן למבחן עם AI</h4>
                                     <p className="text-gray-500 font-bold mb-8 leading-relaxed">המורה פרסם את נושאי המבחן. לחץ למטה כדי שה-AI יבנה לך תוכנית למידה מותאמת אישית עד יום המבחן.</p>
                                     <button 
                                        onClick={() => {
                                          const daysLeft = Math.max(1, Math.ceil((new Date(activeMaterial.dueDate || '').getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                                          onStartTestPrep(activeClass!.subject, activeClass!.grade, activeMaterial.title, daysLeft);
                                        }}
                                        className="bg-orange-500 text-white px-10 py-4 rounded-2xl font-black text-xl shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-3"
                                     >
                                        <Calendar size={20} />
                                        <span>בנה תוכנית הכנה אישית</span>
                                     </button>
                                </div>
                            )}

                            {isAssignment && !isTeacherOfThisClass && (
                                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-full animate-fade-in">
                                    <div className="flex items-center gap-3 mb-6 text-primary border-b border-blue-50 pb-4">
                                        <div className="bg-blue-50 p-2 rounded-xl"><Edit3 size={20}/></div>
                                        <h3 className="font-black text-sm uppercase tracking-widest">התשובה שלך</h3>
                                    </div>
                                    {mySubmission ? (
                                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-green-50/50 rounded-3xl border-2 border-dashed border-green-200">
                                            <div className="bg-white p-4 rounded-full shadow-lg text-green-500 mb-6"><CheckCircle2 size={48} /></div>
                                            <h4 className="text-2xl font-black text-green-800 mb-2">המטלה הוגשה בהצלחה!</h4>
                                            <div className="mt-8 p-4 bg-white/80 rounded-2xl text-right w-full text-xs text-gray-500 italic max-h-40 overflow-y-auto">
                                                <p className="font-bold mb-1 border-b pb-1">התשובה שנשלחה:</p>
                                                {mySubmission.assignmentText}
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <textarea value={assignmentAnswer} onChange={(e) => setAssignmentAnswer(e.target.value)} className="w-full flex-1 p-6 bg-gray-50 border-2 border-gray-100 rounded-3xl outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-medium text-right mb-6 resize-none shadow-inner text-lg leading-relaxed" placeholder="הקלד כאן את הפתרון שלך בצורה מפורטת..." />
                                            <button onClick={handleAssignmentSubmit} disabled={!assignmentAnswer.trim()} className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black shadow-lg hover:bg-black transition-all flex items-center justify-center gap-3 disabled:opacity-30 transform hover:-translate-y-1"><Send size={20} /><span>הגש מטלה למורה</span></button>
                                        </>
                                    )}
                                </div>
                            )}

                            {isAssignment && isTeacherOfThisClass && (
                                <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col h-full">
                                    <div className="flex items-center gap-3 mb-6 text-emerald-500 border-b border-emerald-50 pb-4">
                                        <div className="bg-emerald-50 p-2 rounded-xl"><Users size={20}/></div>
                                        <h3 className="font-black text-sm uppercase tracking-widest">רשימת הגשות ({activeMaterial.submissions?.length || 0})</h3>
                                    </div>
                                    <div className="flex-1 space-y-4 overflow-y-auto pr-2 no-scrollbar">
                                        {activeMaterial.submissions && activeMaterial.submissions.length > 0 ? (
                                            activeMaterial.submissions.map((s, idx) => (
                                                <button key={idx} onClick={() => { setViewingSubmission(s); setManualFinalScore(s.aiScore !== undefined ? s.aiScore.toString() : ''); }} className="w-full p-4 bg-gray-50 hover:bg-white hover:shadow-md border border-gray-100 rounded-2xl transition-all text-right flex items-center justify-between group">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm">{s.studentName[0]}</div>
                                                        <div>
                                                            <span className="text-sm font-black block">{s.studentName}</span>
                                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{new Date(s.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {s.aiScore !== undefined && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[10px] font-black">ציון: {s.aiScore}</span>}
                                                        <ChevronLeft size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors" />
                                                    </div>
                                                </button>
                                            ))
                                        ) : (
                                            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-300"><Clock size={48} className="opacity-20 mb-4" /><p className="font-bold">טרם הוגשו תשובות.</p></div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeSubTab === 'QUIZ' && isTest && !isTeacherOfThisClass && (
                        <div className="max-w-3xl mx-auto space-y-8 pb-10">
                        {mySubmission || quizFinished ? (
                            <div className="bg-white p-12 rounded-[3rem] text-center border-2 border-green-500 shadow-xl animate-fade-in">
                                {activeMaterial.autoGradeByAI ? (
                                  <>
                                    <Trophy size={64} className="mx-auto mb-6 text-yellow-400" />
                                    <h3 className="text-3xl font-black mb-4">המבחן הוגש!</h3>
                                    <div className="space-y-4 mb-8">
                                        <p className="text-gray-500 font-bold text-xl">{mySubmission?.teacherGrades ? 'הציון שנתן המורה למבחן:' : 'הציון הסופי שלך:'}</p>
                                        <div className="text-6xl font-black text-indigo-600">{quizScore ?? (calculateMaterialScore(mySubmission!, activeMaterial.questions || []))}</div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <Clock size={64} className="mx-auto mb-6 text-indigo-400" />
                                    <h3 className="text-3xl font-black mb-4">המבחן הוגש בהצלחה!</h3>
                                    <p className="text-gray-500 font-bold text-xl mb-8">המורה בחר לבדוק את המבחן ידנית. הודעה תישלח אליך לאחר קבלת הציון.</p>
                                    {(mySubmission?.aiScore !== undefined) && (
                                       <div className="mt-8 pt-8 border-t border-gray-100">
                                          <p className="text-sm font-bold text-gray-400 uppercase mb-2">ציון סופי מהמורה:</p>
                                          <div className="text-6xl font-black text-emerald-600">{calculateMaterialScore(mySubmission, activeMaterial.questions || [])}</div>
                                       </div>
                                    )}
                                  </>
                                )}
                                <button onClick={() => { setActiveMaterial(null); setQuizFinished(false); }} className="mt-12 bg-gray-900 text-white px-12 py-4 rounded-2xl font-black shadow-lg">חזרה לכיתה</button>
                            </div>
                        ) : (
                            <>
                                {activeMaterial.questions?.map((q, i) => (
                                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                                    <h4 className="text-xl font-bold mb-6 flex gap-3"><span className="text-gray-300">{i+1}.</span><LatexRenderer text={q.text} /></h4>
                                    {q.type === 'OPEN' ? (
                                        <div className="space-y-2">
                                        <textarea value={quizAnswers[q.id] || ''} onChange={(e) => setQuizAnswers({...quizAnswers, [q.id]: e.target.value})} placeholder="כתוב את תשובתך כאן..." className="w-full min-h-[150px] p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white transition-all outline-none font-medium text-right shadow-inner" />
                                        </div>
                                    ) : (
                                        <div className="grid gap-3">
                                        {q.options.map((opt, oi) => (
                                            <button key={oi} onClick={() => setQuizAnswers({...quizAnswers, [q.id]: oi})} className={`p-4 rounded-2xl border-2 text-right transition-all font-bold ${quizAnswers[q.id] === oi ? 'border-primary bg-blue-50 text-primary' : 'border-gray-50 hover:bg-gray-50'}`}><LatexRenderer text={opt} /></button>
                                        ))}
                                        </div>
                                    )}
                                </div>
                                ))}
                                <button disabled={!isAllQuestionsAnswered() || isGrading} onClick={handleStudentSubmit} className="w-full bg-gray-900 text-white py-6 rounded-3xl font-black text-xl shadow-xl hover:bg-black disabled:opacity-30 flex items-center justify-center gap-3 transform hover:-translate-y-1 transition-all">
                                {isGrading ? (<><Loader2 className="animate-spin" size={24} /><span>שולח למורה...</span></>) : 'הגש מבחן למורה'}
                                </button>
                            </>
                        )}
                        </div>
                    )}

                    {activeSubTab === 'SUBMISSIONS' && isTeacherOfThisClass && (
                        <div className="max-w-4xl mx-auto space-y-4">
                        <h3 className="text-2xl font-black mb-6">הגשות תלמידים</h3>
                        {activeMaterial.submissions?.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-gray-200 text-gray-400 font-bold flex flex-col items-center gap-4"><Clock size={48} className="opacity-20" /><p>טרם התקבלו הגשות.</p></div>
                        ) : (
                            <div className="grid gap-4">
                                {activeMaterial.submissions?.map((s, i) => (
                                    <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center font-black text-blue-600 text-xl shadow-sm">{s.studentName[0]}</div>
                                            <div>
                                                <h4 className="font-black text-gray-900">{s.studentName}</h4>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{new Date(s.timestamp).toLocaleString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-left">
                                                <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">ציון {s.teacherGrades ? '(מורה)' : (s.aiScore !== undefined ? '(AI)' : 'טרם נבדק')}</span>
                                                <span className="text-2xl font-black text-indigo-600">{s.aiScore ?? '--'}</span>
                                            </div>
                                            <button onClick={() => { setViewingSubmission(s); setManualFinalScore(s.aiScore !== undefined ? s.aiScore.toString() : ''); }} className="p-4 bg-gray-50 rounded-2xl hover:bg-primary hover:text-white transition-all text-gray-400 group-hover:bg-blue-50 group-hover:text-primary"><Edit3 size={20}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        </div>
                    )}
                </>
             )}
          </div>
        </div>
      </div>
    );
  }

  if (workspaceOpen) {
    const isTest = draftMaterial.type === 'TEST';
    const isSummary = draftMaterial.type === 'SUMMARY';
    const isAssignment = draftMaterial.type === 'ASSIGNMENT';
    const isUpcoming = draftMaterial.type === 'UPCOMING_TEST';
    const isFileOnly = draftMaterial.type === 'UPLOADED_FILE';
    const isMessage = draftMaterial.type === 'MESSAGE';
    const showMathGuide = activeClass?.subject === Subject.MATH;

    return (
      <div className="fixed inset-0 z-[100] bg-gray-50 flex flex-col animate-slide-up overflow-hidden text-right" dir="rtl">
        <div className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-6">
            <button onClick={() => setWorkspaceOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-all"><X size={24} /></button>
            <div className="h-8 w-px bg-gray-200" />
            <div>
              <h2 className="font-black text-xl text-gray-900 leading-none">מרחב יצירת תוכן</h2>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePublish}
              disabled={!draftMaterial.title && !isFileOnly}
              className="bg-primary hover:bg-blue-600 disabled:opacity-30 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-blue-200 transition-all flex items-center gap-2"
            >
              <Send size={18} />
              פרסם לכיתה
            </button>
          </div>
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
                        const baseMat = { ...draftMaterial, type: t.id as MaterialType };
                        if (['TEST', 'ASSIGNMENT', 'UPCOMING_TEST'].includes(t.id) && !baseMat.dueDate) {
                            const d = new Date();
                            d.setDate(d.getDate() + 7);
                            d.setHours(12, 0, 0, 0); 
                            const tzOffset = d.getTimezoneOffset() * 60000;
                            const localISODate = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
                            baseMat.dueDate = localISODate;
                        }
                        setDraftMaterial(baseMat);
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
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">{isUpcoming ? 'תאריך המבחן' : 'תאריך הגשה אחרון'}</label>
                  <input 
                    type="date" 
                    value={draftMaterial.dueDate || ''} 
                    onChange={(e) => setDraftMaterial({...draftMaterial, dueDate: e.target.value})} 
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

                  <div className="space-y-4">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">שיטת בדיקה</label>
                      <div className="grid gap-2">
                          <button onClick={() => setDraftMaterial({...draftMaterial, autoGradeByAI: true})} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${draftMaterial.autoGradeByAI ? 'border-primary bg-blue-50 text-primary font-black' : 'border-gray-50 text-gray-400 font-bold'}`}>
                              <div className="flex items-center gap-2"><Bot size={16}/><span>בדיקת AI</span></div>
                              {draftMaterial.autoGradeByAI && <CheckCircle2 size={16}/>}
                          </button>
                          <button onClick={() => setDraftMaterial({...draftMaterial, autoGradeByAI: false})} className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all ${!draftMaterial.autoGradeByAI ? 'border-primary bg-blue-50 text-primary font-black' : 'border-gray-50 text-gray-400 font-bold'}`}>
                              <div className="flex items-center gap-2"><UserIcon size={16}/><span>בדיקת מורה</span></div>
                              {!draftMaterial.autoGradeByAI && <CheckCircle2 size={16}/>}
                          </button>
                      </div>
                  </div>
              </div>
            )}

            {isFileOnly && (
                <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">העלאת הקובץ</label>
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center gap-2 text-gray-400 hover:border-primary hover:text-primary transition-all"
                    >
                        <Upload size={24} />
                        <span className="text-xs font-bold">לחץ להעלאת קובץ מהמחשב</span>
                        <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    </button>
                </div>
            )}

            {!isFileOnly && !isAssignment && !isUpcoming && !isMessage && (
               <div className="space-y-4 pt-4 border-t border-gray-100">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block pr-2">עזרים חכמים (AI)</label>
                  <button 
                   onClick={async () => {
                     if (!draftMaterial.title) return;
                     setLoading(true);
                     try {
                       if (isTest) {
                         const total = aiMcqCount + aiOpenCount;
                         const qs = await generateQuestions(activeClass?.subject!, activeClass?.grade!, draftMaterial.title, [], total, 'MEDIUM', aiMcqCount, aiOpenCount);
                         setDraftMaterial(prev => ({...prev, questions: qs}));
                       } else {
                         const content = await generateSummary(activeClass?.subject!, activeClass?.grade!, draftMaterial.title);
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
                onChange={e => setDraftMaterial({...draftMaterial, title: e.target.value})}
                placeholder={isFileOnly ? "כותרת לקובץ (אופציונלי)..." : "כותרת התוכן..."}
                className="w-full bg-transparent border-none text-5xl font-black text-gray-900 placeholder:text-gray-200 outline-none"
              />

              {isFileOnly ? (
                  <div className="bg-white p-20 rounded-[3rem] border-4 border-dashed border-gray-100 text-center flex flex-col items-center justify-center space-y-6">
                      <div className="bg-blue-50 p-8 rounded-full text-blue-500"><Upload size={64}/></div>
                      <div>
                          <h3 className="text-3xl font-black text-gray-800">העלאת קובץ</h3>
                          <p className="text-gray-400 font-bold text-lg mt-2">התלמידים יוכלו להוריד ולצפות בקובץ ישירות מהכיתה.</p>
                      </div>
                      <button onClick={() => fileInputRef.current?.click()} className="bg-gray-900 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl hover:bg-black transition-all">בחר קובץ להעלאה</button>
                  </div>
              ) : isTest ? (
                <div className="space-y-8">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="font-black text-gray-500 uppercase tracking-widest text-xs flex items-center gap-2"><ListChecks size={16}/> שאלות המבחן/תרגול</h3>
                    <div className="flex gap-2">
                      <button onClick={() => setDraftMaterial({...draftMaterial, questions: [...(draftMaterial.questions || []), { id: `q-${Date.now()}`, text: '', options: ['', '', '', ''], correctIndex: 0, explanation: '', type: 'MCQ' }]})} className="text-primary font-black text-xs flex items-center gap-1 hover:underline px-3 py-1 bg-blue-50 rounded-lg"><Plus size={14}/> שאלה אמריקאית</button>
                      <button onClick={() => setDraftMaterial({...draftMaterial, questions: [...(draftMaterial.questions || []), { id: `q-${Date.now()}`, text: '', options: [], correctIndex: 0, explanation: '', type: 'OPEN', modelAnswer: '' }]})} className="text-purple-600 font-black text-xs flex items-center gap-1 hover:underline px-3 py-1 bg-purple-50 rounded-lg"><Plus size={14}/> שאלה פתוחה</button>
                    </div>
                  </div>
                  <div className="space-y-6">
                    {draftMaterial.questions?.map((q, i) => {
                      const anyOptionExpanded = q.options.some((_, oi) => expandedOptionMap[`${q.id}-${oi}`]);
                      
                      return (
                        <div key={q.id} className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 relative group animate-fade-in">
                          <button onClick={() => setDraftMaterial({...draftMaterial, questions: draftMaterial.questions?.filter(item => item.id !== q.id)})} className="absolute top-6 left-6 text-gray-200 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20}/></button>
                          <div className="mb-6">
                             <ExpandableField 
                              label={`שאלה ${i+1}`}
                              value={q.text} 
                              onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].text = text; setDraftMaterial({...draftMaterial, questions: newQs}); }} 
                              placeholder="כתוב את השאלה כאן..." 
                              isTextarea
                              subject={activeClass?.subject}
                            />
                          </div>
                          {q.type === 'OPEN' ? (
                            <div className="space-y-2">
                              <ExpandableField 
                                label="תשובת מודל"
                                value={q.modelAnswer || ''} 
                                onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].modelAnswer = text; setDraftMaterial({...draftMaterial, questions: newQs}); }} 
                                placeholder="תשובת מודל..." 
                                isTextarea
                                subject={activeClass?.subject}
                              />
                            </div>
                          ) : (
                            <div className={`grid gap-4 transition-all duration-300 ${anyOptionExpanded ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
                              {q.options.map((opt, oi) => (
                                <div key={oi} className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all ${q.correctIndex === oi ? 'border-green-500 bg-green-50' : 'border-gray-50'} ${expandedOptionMap[`${q.id}-${oi}`] ? 'col-span-full' : ''}`}>
                                  <input type="radio" className="mt-4" checked={q.correctIndex === oi} onChange={() => { const newQs = [...draftMaterial.questions!]; newQs[i].correctIndex = oi; setDraftMaterial({...draftMaterial, questions: newQs}); }} />
                                  <div className="flex-1">
                                     <ExpandableField 
                                      value={opt} 
                                      onToggle={(expanded) => setExpandedOptionMap(prev => ({...prev, [`${q.id}-${oi}`]: expanded}))}
                                      onChange={text => { const newQs = [...draftMaterial.questions!]; newQs[i].options[oi] = text; setDraftMaterial({...draftMaterial, questions: newQs}); }} 
                                      placeholder={`אופציה ${oi+1}`} 
                                      subject={activeClass?.subject}
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
                  onChange={content => setDraftMaterial({...draftMaterial, content})} 
                  placeholder="כתוב כאן את תוכן התוכן שיוצג לתלמידים..." 
                  showGuide={showMathGuide}
                  subject={activeClass?.subject}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in text-right" dir="rtl">
      {activeClass ? (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <button onClick={() => { setActiveClassId(null); setActiveMaterial(null); }} className="p-4 bg-white hover:bg-gray-50 rounded-3xl border border-gray-100 shadow-sm transition-all group"><ArrowRight size={24}/></button>
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900">{activeClass.name}</h2>
                  <div className="flex items-center gap-2 mt-1 text-gray-400 font-bold text-sm">
                    {(isTeacherOfThisClass || user.provider === 'guest' && user.role === 'TEACHER') && <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md text-[10px] font-black uppercase">מצב מורה</span>}
                    <span>{activeClass.subject}</span><span>•</span><span>{activeClass.grade}</span>
                  </div>
                </div>
            </div>
            <div className="flex justify-center">
                <div className="bg-white p-1.5 rounded-3xl shadow-sm border border-gray-100 flex flex-wrap gap-1">
                    <button onClick={() => setActiveTab('MATERIALS')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${activeTab === 'MATERIALS' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}>חומרי למידה</button>
                    <button onClick={() => setActiveTab('CHAT')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${activeTab === 'CHAT' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}>צאט כיתתי</button>
                    {isTeacherOfThisClass && (
                      <button onClick={() => setActiveTab('STUDENTS')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${activeTab === 'STUDENTS' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}>תלמידים</button>
                    )}
                    <button onClick={() => setActiveTab('ANALYTICS')} className={`px-6 py-2.5 rounded-2xl text-xs font-black transition-all ${activeTab === 'ANALYTICS' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-500 hover:bg-gray-50'}`}>אנליטיקה</button>
                </div>
            </div>
            {activeTab === 'MATERIALS' ? (
              <div className="grid lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-xl font-black text-gray-800">חומרי למידה</h3>
                        {isTeacherOfThisClass && (
                           <button onClick={() => { 
                             const d = new Date();
                             d.setDate(d.getDate() + 7);
                             const tzOffset = d.getTimezoneOffset() * 60000;
                             const localISODate = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
                             setDraftMaterial({type:'SUMMARY', title:'', content:'', questions:[], teacherAttachments:[], targetStudentIds: [], autoGradeByAI: true, dueDate: localISODate}); 
                             setWorkspaceOpen(true); 
                           }} className="bg-primary text-white px-6 py-2.5 rounded-2xl text-sm font-black shadow-lg hover:bg-blue-600 transition-all flex items-center gap-2"><PlusCircle size={18}/> הוסף תוכן</button>
                        )}
                    </div>
                    <div className="grid gap-4">
                      {filteredMaterials.length === 0 ? (
                        <div className="bg-white p-20 rounded-[2rem] text-center text-gray-300 font-bold border-2 border-dashed border-gray-100">אין חומרים בכיתה זו עדיין.</div>
                      ) : (
                        filteredMaterials.map(m => (
                          <button key={m.id} onClick={() => { setActiveMaterial(m); setQuizFinished(false); setQuizAnswers({}); setActiveSubTab(m.type === 'TEST' ? (isTeacherOfThisClass ? 'SUBMISSIONS' : 'QUIZ') : 'SUMMARY'); }} className="w-full flex items-center justify-between p-6 bg-white rounded-[2rem] border border-gray-50 shadow-sm hover:shadow-md transition-all text-right">
                            <div className="flex items-center gap-5">
                              <div className={`p-4 rounded-2xl text-white ${m.type === 'TEST' ? 'bg-indigo-500' : m.type === 'UPLOADED_FILE' ? 'bg-blue-600' : m.type === 'UPCOMING_TEST' ? 'bg-orange-500' : m.type === 'MESSAGE' ? 'bg-purple-500' : 'bg-gray-500'}`}>
                                {m.type === 'TEST' ? <ListChecks size={22}/> : m.type === 'UPLOADED_FILE' ? <Upload size={22}/> : m.type === 'UPCOMING_TEST' ? <BellRing size={22}/> : <FileText size={22}/>}
                              </div>
                              <div>
                                <h4 className="font-black text-gray-900 text-lg">{m.title}</h4>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                   {m.type === 'TEST' ? 'מבחן/תרגול' : m.type === 'SUMMARY' ? 'סיכום' : m.type === 'ASSIGNMENT' ? 'מטלה' : m.type === 'UPCOMING_TEST' ? 'מבחן קרוב' : 'קובץ'}
                                   {m.dueDate && ` • ${m.type === 'UPCOMING_TEST' ? 'בתאריך' : 'הגשה עד'} ${new Date(m.dueDate).toLocaleDateString('he-IL')}`}
                                </p>
                              </div>
                            </div>
                            <ChevronLeft size={20} className="text-gray-300" />
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 h-fit">
                        <h3 className="text-lg font-black mb-6 flex items-center gap-3"><Users size={20} className="text-blue-500"/> מידע כיתתי</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm"><span className="text-gray-400 font-bold">מורה</span><span className="font-black">{activeClass.teacherName}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-gray-400 font-bold">תלמידים</span><span className="font-black">{activeClass.studentsCount}</span></div>
                            <div className="pt-4 border-t"><span className="block text-[10px] font-black text-gray-400 uppercase mb-2">קוד כיתה</span><div className="bg-gray-900 p-4 rounded-2xl flex justify-between items-center text-white font-mono font-black" dir="ltr"><span>{activeClass.id}</span><button onClick={() => handleCopyCode(activeClass.id)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">{copiedCode === activeClass.id ? <Check size={18} className="text-green-400" /> : <Copy size={18} className="text-gray-400" />}</button></div></div>
                        </div>
                  </div>
              </div>
            ) : activeTab === 'CHAT' ? (
              <div className="max-w-4xl mx-auto h-[650px] bg-white rounded-[3rem] shadow-2xl border border-gray-100 flex flex-col overflow-hidden animate-fade-in">
                <div className="bg-gray-50 border-b border-gray-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="text-primary" size={24} />
                    <h3 className="font-black text-lg text-gray-800">צאט כיתתי</h3>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase">שלח ל:</label>
                    <select 
                      value={chatRecipient}
                      onChange={(e) => setChatRecipient(e.target.value)}
                      className="bg-white border-2 border-gray-100 rounded-xl px-4 py-2 font-black text-xs text-indigo-600 outline-none focus:border-indigo-300 transition-all shadow-sm"
                    >
                      <option value="ALL">כולם</option>
                      {activeClass.teacherId !== user.id && (
                        <option value={activeClass.teacherId}>{activeClass.teacherName} (מורה)</option>
                      )}
                      {isTeacherOfThisClass && activeClass.studentIds?.map((sid, idx) => {
                        if (sid === user.id) return null;
                        return <option key={sid} value={sid}>{activeClass.students?.[idx] || 'תלמיד'}</option>;
                      })}
                    </select>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar flex flex-col">
                    {visibleMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 animate-fade-in flex-1">
                            <MessageSquare size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-bold">הצאט ריק...</p>
                            <p className="text-sm">תהיו הראשונים לכתוב!</p>
                        </div>
                    ) : (
                        visibleMessages.map((msg) => {
                            const isMine = msg.senderId === user.id;
                            const isPrivate = !!msg.recipientId;
                            return (
                                <div 
                                  key={msg.id} 
                                  className={`flex flex-col max-w-[75%] w-fit mb-2 ${isMine ? 'self-start items-start' : 'self-end items-end'}`}
                                >
                                  <div className="flex items-center gap-2 mb-1 px-1">
                                    {!isMine && isPrivate && <span className="bg-purple-100 text-purple-600 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">פרטי</span>}
                                    <button 
                                      onClick={() => !isMine && setChatRecipient(msg.senderId)}
                                      className="text-[9px] font-bold text-gray-400 hover:text-indigo-600"
                                    >
                                      {msg.senderName}
                                    </button>
                                    {isMine && isPrivate && <span className="bg-blue-100 text-blue-600 text-[8px] font-black px-1.5 py-0.5 rounded-md uppercase">פרטי</span>}
                                  </div>
                                  <div className={`p-4 rounded-2xl shadow-sm text-right flex flex-col gap-2 ${isMine ? 'bg-primary text-white rounded-tr-none' : 'bg-gray-100 text-gray-800 rounded-tl-none'}`}>
                                    {msg.attachment && (
                                        <div className="max-w-[200px] rounded-lg overflow-hidden border-2 border-white shadow-sm">
                                            {msg.attachment.mimeType.startsWith('image/') ? (
                                                <img src={`data:${msg.attachment.mimeType};base64,${msg.attachment.data}`} alt="chat-attachment" className="w-full h-auto" />
                                            ) : (
                                                <div className="bg-white/10 p-3 flex items-center gap-2">
                                                    <FileText size={20} />
                                                    <span className="text-[10px] font-black truncate">קובץ מצורף</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="text-sm">{msg.text}</div>
                                  </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={chatEndRef} />
                </div>

                <div className="p-4 border-t bg-gray-50/50 space-y-3">
                    {chatAttachment && (
                        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-200 shadow-inner w-fit animate-fade-in">
                            {chatAttachment.preview ? (
                                <img src={chatAttachment.preview} className="w-12 h-12 object-cover rounded-xl" />
                            ) : (
                                <div className="w-12 h-12 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center"><FileText size={24}/></div>
                            )}
                            <div className="text-xs font-bold truncate max-w-[150px]">{chatAttachment.name}</div>
                            <button onClick={() => setChatAttachment(null)} className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full"><X size={16}/></button>
                        </div>
                    )}
                    
                    <div className="flex gap-2 bg-white p-2 rounded-[1.5rem] border border-gray-200 shadow-sm focus-within:ring-2 ring-primary/10 transition-all items-center">
                        <button onClick={() => chatFileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-indigo-600 transition-colors">
                            <Paperclip size={20} />
                        </button>
                        <input type="file" ref={chatFileInputRef} onChange={handleChatFileUpload} className="hidden" />
                        
                        <textarea 
                          value={chatInput} 
                          onChange={e => setChatInput(e.target.value)} 
                          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                          placeholder={chatRecipient === 'ALL' ? "שלח הודעה לכולם..." : "שלח הודעה פרטית..."} 
                          className="flex-1 bg-transparent rounded-xl p-3 outline-none resize-none font-medium h-12 no-scrollbar" 
                          rows={1}
                        />
                        <button onClick={handleSendMessage} disabled={!chatInput.trim() && !chatAttachment} className="bg-primary text-white p-4 rounded-2xl shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all disabled:opacity-30">
                            <Send size={20}/>
                        </button>
                    </div>
                </div>
              </div>
            ) : activeTab === 'STUDENTS' && isTeacherOfThisClass ? (
              <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
                  <div className="flex items-center justify-between px-4">
                      <h3 className="text-2xl font-black text-gray-900">רשימת התלמידים בכיתה</h3>
                      <div className="bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm text-sm font-bold text-gray-500">
                          סה"כ {studentStats.length} תלמידים
                      </div>
                  </div>
                  
                  {studentStats.length === 0 ? (
                    <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100 text-gray-300 font-bold">טרם הצטרפו תלמידים לכיתה.</div>
                  ) : (
                    <div className="grid gap-4">
                        {studentStats.map((s) => (
                            <div key={s.id} className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-md transition-all group">
                                <div className="flex items-center gap-5 w-full md:w-auto">
                                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm">{s.name[0]}</div>
                                    <div>
                                        <h4 className="font-black text-gray-900 text-lg">{s.name}</h4>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-gray-400 uppercase">תלמיד פעיל</span>
                                            {s.averageScore !== null && <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-black">ממוצע ציונים: {s.averageScore}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex-1 w-full max-w-md">
                                    <div className="flex justify-between text-xs font-black text-gray-400 mb-2">
                                        <span>התקדמות הגשות</span>
                                        <span className={s.submissionPercent >= 80 ? 'text-emerald-500' : s.submissionPercent >= 40 ? 'text-indigo-500' : 'text-red-500'}>{s.submissionPercent}%</span>
                                    </div>
                                    <div className="h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                        <div className={`h-full transition-all duration-1000 ${s.submissionPercent >= 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : s.submissionPercent >= 40 ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'}`} style={{ width: `${s.submissionPercent}%` }} />
                                    </div>
                                </div>
                                <button onClick={() => { setChatRecipient(s.id); setActiveTab('CHAT'); }} className="p-4 bg-gray-50 text-gray-400 hover:bg-primary hover:text-white rounded-2xl transition-all shadow-sm group-hover:bg-blue-50 group-hover:text-primary" title="שלח הודעה פרטית">
                                    <MessageSquare size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                  )}
              </div>
            ) : activeTab === 'ANALYTICS' ? (
              <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                  {isTeacherOfThisClass ? (
                    <>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 text-right">
                              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600 w-fit mb-4 shadow-sm"><Trophy size={24}/></div>
                              <div className="text-3xl font-black text-gray-900 mb-1">{classAnalytics?.averageScore || '--'}</div>
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ממוצע כיתתי</div>
                          </div>
                          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 text-right">
                              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600 w-fit mb-4 shadow-sm"><TrendingUp size={24}/></div>
                              <div className="text-3xl font-black text-gray-900 mb-1">{classAnalytics?.submissionRate || '--'}%</div>
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">אחוז הגשות כיתתי</div>
                          </div>
                          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-50 text-right">
                              <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 w-fit mb-4 shadow-sm"><ClipboardList size={24}/></div>
                              <div className="text-3xl font-black text-gray-900 mb-1">{classAnalytics?.materialsCount || 0}</div>
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">משימות פעילות</div>
                          </div>
                          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 text-right">
                              <div className="bg-purple-50 p-3 rounded-2xl text-purple-600 w-fit mb-4 shadow-sm"><Users size={24}/></div>
                              <div className="text-3xl font-black text-gray-900 mb-1">{classAnalytics?.studentsCount || 0}</div>
                              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">תלמידים רשומים</div>
                          </div>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-8">
                          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-gray-100 min-h-[450px] flex flex-col">
                              <div className="flex items-center justify-between mb-8">
                                  <h3 className="text-xl font-black text-gray-800 flex items-center gap-3"><Sparkles size={24} className="text-yellow-500"/> תובנות AI והמלצות</h3>
                                  {loadingAnalytics && <Loader2 size={20} className="animate-spin text-primary" />}
                              </div>
                              
                              {loadingAnalytics ? (
                                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-pulse">
                                      <div className="bg-blue-50 p-6 rounded-full mb-4"><Bot size={48} className="text-primary"/></div>
                                      <h4 className="text-lg font-black text-gray-700">ה-AI מנתח את נתוני הכיתה...</h4>
                                      <p className="text-sm text-gray-400 font-bold mt-2">סורק ציונים, אחוזי הגשה ופעילות תלמידים</p>
                                  </div>
                              ) : classroomAIInsights ? (
                                  <div className="space-y-6 animate-fade-in flex-1">
                                      <div className="p-6 bg-blue-50/50 rounded-3xl border border-blue-100 flex items-start gap-4">
                                          <div className="bg-white p-2 rounded-xl text-blue-500 shadow-sm shrink-0"><Target size={20}/></div>
                                          <div>
                                              <h4 className="font-black text-blue-900 mb-2">מיקוד הלמידה</h4>
                                              <p className="text-sm text-blue-800 leading-relaxed font-medium">{classroomAIInsights.focus}</p>
                                          </div>
                                      </div>
                                      <div className="p-6 bg-purple-50/50 rounded-3xl border border-purple-100 flex items-start gap-4">
                                          <div className="bg-white p-2 rounded-xl text-purple-500 shadow-sm shrink-0"><CheckCircle2 size={20}/></div>
                                          <div>
                                              <h4 className="font-black text-purple-900 mb-2">שימור חוזקות</h4>
                                              <p className="text-sm text-purple-800 leading-relaxed font-medium">{classroomAIInsights.strengths}</p>
                                          </div>
                                      </div>
                                      <div className="p-6 bg-orange-50/50 rounded-3xl border border-orange-100 flex items-start gap-4">
                                          <div className="bg-white p-2 rounded-xl text-orange-500 shadow-sm shrink-0"><BellRing size={20}/></div>
                                          <div>
                                              <h4 className="font-black text-orange-900 mb-2">המלצות להמשך</h4>
                                              <p className="text-sm text-orange-800 leading-relaxed font-medium">{classroomAIInsights.recommendations}</p>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="flex-1 flex flex-col items-center justify-center text-center p-10 text-gray-300">
                                      <Info size={48} className="mb-4 opacity-20" />
                                      <p className="font-bold">אין מספיק נתונים להפקת תובנות AI חכמות. הוסף מטלות ומבחנים לכיתה.</p>
                                  </div>
                              )}
                          </div>

                          <div className="bg-white p-8 md:p-10 rounded-[3rem] shadow-xl border border-gray-100">
                              <h3 className="text-xl font-black text-gray-800 mb-8 flex items-center gap-3"><Star size={24} className="text-indigo-500"/> התפלגות ציונים</h3>
                              {classAnalytics ? (
                                  <div className="h-64 flex items-end justify-between gap-4 pt-10 px-4">
                                      {[
                                          { label: '0-55', val: 12, color: 'bg-red-400' },
                                          { label: '56-70', val: 25, color: 'bg-orange-400' },
                                          { label: '71-85', val: 45, color: 'bg-indigo-400' },
                                          { label: '86-100', val: 18, color: 'bg-emerald-400' }
                                      ].map((bar, i) => (
                                          <div key={i} className="flex-1 flex flex-col items-center group">
                                              <div className="mb-2 text-[10px] font-black text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">{bar.val}%</div>
                                              <div className={`w-full ${bar.color} rounded-t-xl transition-all duration-1000 shadow-lg`} style={{ height: `${bar.val}%` }} />
                                              <div className="mt-4 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">{bar.label}</div>
                                          </div>
                                      ))}
                                  </div>
                              ) : (
                                <div className="h-64 flex items-center justify-center text-gray-300 font-bold italic">אין מספיק נתונים להצגת גרף.</div>
                              )}
                              <div className="mt-10 pt-6 border-t border-gray-50 text-center">
                                  <p className="text-xs font-bold text-gray-400">נתונים אלו מבוססים על הגשות שנסרקו על ידי AI וציוני מורה.</p>
                              </div>
                          </div>
                      </div>
                    </>
                  ) : (
                    // STUDENT PERSONAL ANALYTICS
                    <div className="max-w-4xl mx-auto space-y-10">
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 text-center">
                                <div className="bg-indigo-50 p-4 rounded-2xl text-indigo-600 w-fit mx-auto mb-4 shadow-sm"><Trophy size={32}/></div>
                                <div className="text-4xl font-black text-gray-900 mb-1">{studentPersonalAnalytics?.averageScore || '--'}</div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">הממוצע האישי שלי</div>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 text-center">
                                <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 w-fit mx-auto mb-4 shadow-sm"><ClipboardCheck size={32}/></div>
                                <div className="text-4xl font-black text-gray-900 mb-1">{studentPersonalAnalytics?.submissionRate || 0}%</div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">אחוז הגשות אישי</div>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-50 text-center">
                                <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 w-fit mx-auto mb-4 shadow-sm"><BookOpen size={32}/></div>
                                <div className="text-4xl font-black text-gray-900 mb-1">{studentPersonalAnalytics?.completedTasks || 0}/{studentPersonalAnalytics?.totalTasks || 0}</div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">משימות שהושלמו</div>
                            </div>
                        </div>

                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-gray-100">
                            <h3 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3"><Target size={28} className="text-primary"/> התקדמות הלמידה שלי</h3>
                            <div className="space-y-10">
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="font-black text-gray-600">עמידה ביעדי הגשה</span>
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm font-black">{studentPersonalAnalytics?.submissionRate || 0}%</span>
                                    </div>
                                    <div className="h-6 bg-gray-50 rounded-full overflow-hidden border border-gray-100 shadow-inner">
                                        <div className="h-full bg-gradient-to-l from-blue-500 to-indigo-600 transition-all duration-1000 shadow-lg" style={{ width: `${studentPersonalAnalytics?.submissionRate || 0}%` }} />
                                    </div>
                                </div>
                                <div className="p-8 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200 text-center">
                                    <h4 className="text-lg font-black text-gray-800 mb-2">טיפ מהמורה הדיגיטלי 💡</h4>
                                    <p className="text-gray-500 font-bold leading-relaxed">
                                        {studentPersonalAnalytics && studentPersonalAnalytics.submissionRate < 100 
                                            ? "יש לך משימות פתוחות בכיתה. הקפד להגיש אותן בזמן כדי לשפר את הממוצע האישי שלך." 
                                            : "מעולה! הגשת את כל המטלות שלך. המשך כך כדי לשמור על הישגים גבוהים."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                  )}
              </div>
            ) : (
                <div className="text-center py-20 bg-white rounded-[2rem] text-gray-400 font-bold">לא נבחרה כרטיסייה תקינה</div>
            )}
        </div>
      ) : (
        <div className="animate-fade-in pb-20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-16">
                <div className="max-w-2xl">
                  <h2 className="text-4xl md:text-5xl font-black text-gray-900">{isTeacherRole ? 'הכיתות שלי' : 'הכיתות שאני לומד בהן'}</h2>
                  <p className="text-xl text-gray-500">{isTeacherRole ? 'נהלו את הלמידה המשותפת וצפו בחומרי הלימוד.' : 'כאן תוכל לצפות בחומרים שהמורה שלך העלה.'}</p>
                </div>
                <div className="flex gap-4">
                    {isTeacherRole && (
                      <button onClick={handleOpenCreateClass} className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl flex items-center gap-2 hover:bg-black transition-all">
                          <Plus size={18} />
                          <span>יצירת כיתה</span>
                      </button>
                    )}
                    <button onClick={() => setIsJoining(true)} className="bg-white border-2 border-gray-200 text-gray-800 px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-gray-50 transition-all">
                        <Users size={18} />
                        <span>הצטרפות לכיתה</span>
                    </button>
                </div>
            </div>
            {isCreating && isTeacherRole && (
                <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl mb-16 relative animate-slide-up">
                   <button onClick={() => setIsCreating(false)} className="absolute top-8 left-8 text-gray-400 hover:text-gray-900 transition-all"><X size={24}/></button>
                   <h3 className="text-3xl font-black mb-10">הקמת כיתה חדשה</h3>
                   <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                      <div className="lg:col-span-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">שם הכיתה</label>
                        <input value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="למשל: י' 2 מתמטיקה..." className="w-full p-5 bg-gray-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-primary transition-all"/>
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">מקצוע</label>
                        <select value={newClassSubject} onChange={e => setNewClassSubject(e.target.value as any)} className="w-full p-5 bg-gray-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-primary transition-all">
                          {Object.values(Subject).map(s => <option key={s} value={s}>{s}</option>)}
                          <option value="OTHER">אחר...</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">כיתה</label>
                        <select value={newClassGrade} onChange={e => setNewClassGrade(e.target.value as Grade)} className="w-full p-5 bg-gray-50 rounded-3xl font-black outline-none border-2 border-transparent focus:border-primary transition-all">{Object.values(Grade).map(g => <option key={g} value={g}>{g}</option>)}</select>
                      </div>
                   </div>
                   
                   {newClassSubject === 'OTHER' && (
                     <div className="mb-10 animate-fade-in">
                       <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-2 mr-2">שם המקצוע המותאם אישית</label>
                       <input value={customSubject} onChange={e => setCustomSubject(e.target.value)} placeholder="הזן את שם המקצוע..." className="w-full p-5 bg-blue-50 border-2 border-blue-100 rounded-3xl font-black outline-none focus:border-primary transition-all"/>
                     </div>
                   )}

                   <button onClick={handleCreateClass} className="w-full bg-primary text-white py-6 rounded-3xl font-black text-xl shadow-xl hover:bg-blue-600 transition-all">צור כיתה וקבל קוד מורה</button>
                </div>
            )}
            {isJoining && (
                <div className="bg-white p-12 rounded-[4rem] shadow-2xl max-w-2xl mx-auto relative animate-slide-up">
                   <button onClick={() => setIsJoining(false)} className="absolute top-8 left-8 text-gray-400 hover:text-gray-900 transition-all"><X size={24}/></button>
                   <h3 className="text-3xl font-black mb-10 text-center">הצטרפות לכיתה</h3>
                   <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="XXXXXX" className="w-full p-8 bg-gray-50 rounded-[2.5rem] font-mono font-black text-6xl text-center text-primary" maxLength={8} />
                   <button onClick={handleJoinClass} className="w-full bg-gray-900 text-white py-6 rounded-3xl font-black text-2xl mt-8">הצטרף לכיתה עכשיו</button>
                </div>
            )}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                {myClassrooms.map(c => (
                    <button key={c.id} onClick={() => { setActiveClassId(c.id); setActiveMaterial(null); setActiveTab('MATERIALS'); }} className="group bg-white p-10 rounded-[3rem] shadow-sm border border-gray-100 hover:shadow-2xl transition-all duration-500 text-right">
                        <div className="bg-blue-50 p-5 rounded-[1.75rem] text-blue-600 shadow-xl mb-10 w-fit"><School size={32} /></div>
                        <h3 className="text-2xl font-black mb-3">{c.name}</h3>
                        <div className="text-sm font-bold text-gray-400"><span>{c.subject}</span><span> • </span><span>{c.grade}</span></div>
                    </button>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default ClassroomView;
