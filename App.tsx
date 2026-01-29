
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Header from './components/Header.tsx';
import SubjectSelector from './components/SubjectSelector.tsx';
import PracticeArea from './components/PracticeArea.tsx';
import ChatBot from './components/ChatBot.tsx';
import ProgressChart from './components/ProgressChart.tsx';
import HistoryView from './components/HistoryView.tsx';
import MaterialRepositoryView from './components/MaterialRepositoryView.tsx';
import ResourcesView from './components/ResourcesView.tsx';
import TestPrepView from './components/TestPrepView.tsx';
import LoginView from './components/LoginView.tsx';
import ProfileModal from './components/ProfileModal.tsx';
import ClassroomView from './components/ClassroomView.tsx';
import TeacherDashboard from './components/TeacherDashboard.tsx';
import GlobalContentEditor from './components/GlobalContentEditor.tsx';
import AchievementView from './components/AchievementView.tsx';
import CalendarView from './components/CalendarView.tsx';
import { Subject, Grade, ViewMode, UserStats, HistoryItem, Question, PracticeConfig, User, Classroom, MaterialType, ClassroomMaterial, LessonPlan, UserSettings } from './types.ts';
import { PenTool, MessageCircle, BookOpen, GraduationCap, Calendar, School, Zap, Bot, ChevronLeft, ArrowRight, Bell, Sparkles, Clock, Trash2 } from 'lucide-react';

const DB_KEY = 'lumdim_global_database_v1';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user_auth');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<Grade | null>(() => {
    if (!user) return null;
    return localStorage.getItem(`user_grade_${user.id}`) as Grade || null;
  });
  
  const [userSubjects, setUserSubjects] = useState<(Subject | string)[]>(Object.values(Subject));
  const [userName, setUserName] = useState<string | null>(user?.name || null);
  const [viewMode, setViewMode] = useState<ViewMode>('DASHBOARD');
  const [previousViewMode, setPreviousViewMode] = useState<ViewMode>('DASHBOARD');
  
  const [activeTab, setActiveTab] = useState<'practice' | 'chat' | 'resources' | 'test-prep'>('practice');
  const [chatContext, setChatContext] = useState<string | null>(null);
  const [practiceConfig, setPracticeConfig] = useState<PracticeConfig | null>(null);
  const [testPrepInitialData, setTestPrepInitialData] = useState<{topic: string, days: number, attachment?: any} | null>(null);
  const [summaryToOpen, setSummaryToOpen] = useState<{title: string, content: string} | null>(null);

  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [initialMaterialId, setInitialMaterialId] = useState<string | null>(null);
  const [initialTeacherTab, setInitialTeacherTab] = useState<'OVERVIEW' | 'PLANNER' | 'EXAM_CHECKER' | undefined>(undefined);
  const [initialLessonPlan, setInitialLessonPlan] = useState<LessonPlan | null>(null);
  const [isGlobalEditorOpen, setIsGlobalEditorOpen] = useState(false);
  const [initialGlobalEditorData, setInitialGlobalEditorData] = useState<ClassroomMaterial | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<UserStats[]>([]);
  const [allClassrooms, setAllClassrooms] = useState<Classroom[]>([]);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const prevClassroomsRef = useRef<Classroom[]>([]);

  const loadClassrooms = () => {
    const data = localStorage.getItem(DB_KEY);
    if (data) {
      setAllClassrooms(JSON.parse(data));
    }
  };

  useEffect(() => {
    loadClassrooms();
    const sync = () => loadClassrooms();
    window.addEventListener('storage', sync);
    window.addEventListener('lumdim-db-updated', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('lumdim-db-updated', sync);
    };
  }, []);

  // Notification Logic for Teachers
  useEffect(() => {
    if (!user || user.role !== 'TEACHER' || allClassrooms.length === 0) {
      prevClassroomsRef.current = allClassrooms;
      return;
    }

    // Don't trigger on first load
    if (prevClassroomsRef.current.length === 0) {
      prevClassroomsRef.current = allClassrooms;
      return;
    }

    const newNotifications: any[] = [];

    allClassrooms.forEach(currClass => {
      if (currClass.teacherId !== user.id) return;
      const prevClass = prevClassroomsRef.current.find(c => c.id === currClass.id);
      if (!prevClass) return;

      // Check for new chat messages
      if ((currClass.messages?.length || 0) > (prevClass.messages?.length || 0)) {
        const lastMsg = currClass.messages![currClass.messages!.length - 1];
        if (lastMsg.senderId !== user.id) {
          newNotifications.push({
            id: `msg-${Date.now()}-${Math.random()}`,
            title: 'הודעה חדשה בכיתה',
            text: `התקבלה הודעה מ${lastMsg.senderName} בכיתה "${currClass.name}"`,
            type: 'CLASS',
            timestamp: Date.now(),
            read: false
          });
        }
      }

      // Check for new submissions
      currClass.materials.forEach(currMat => {
        const prevMat = prevClass.materials.find(m => m.id === currMat.id);
        if (prevMat && (currMat.submissions?.length || 0) > (prevMat.submissions?.length || 0)) {
          const lastSub = currMat.submissions![currMat.submissions!.length - 1];
          newNotifications.push({
            id: `sub-${Date.now()}-${Math.random()}`,
            title: 'הגשה חדשה התקבלה',
            text: `התקבלה הגשה מ${lastSub.studentName} עבור המשימה "${currMat.title}" בכיתה "${currClass.name}"`,
            type: 'CLASS',
            timestamp: Date.now(),
            read: false
          });
        }
      });
    });

    if (newNotifications.length > 0) {
      setNotifications(prev => [...newNotifications, ...prev]);
    }

    prevClassroomsRef.current = allClassrooms;
  }, [allClassrooms, user?.id, user?.role]);

  // Handle Functional Settings: Dark Mode
  useEffect(() => {
    if (user?.settings?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [user?.settings?.darkMode]);

  useEffect(() => {
    if (viewMode === 'DASHBOARD' || viewMode === 'CLASSROOM' || isGlobalEditorOpen) {
      loadClassrooms();
    }
  }, [viewMode, isGlobalEditorOpen]);

  useEffect(() => {
    if (user) {
      const savedHistory = localStorage.getItem(`study_history_${user.id}`);
      setHistory(savedHistory ? JSON.parse(savedHistory) : []);
      
      const savedStats = localStorage.getItem(`user_stats_${user.id}`);
      setStats(savedStats ? JSON.parse(savedStats) : Object.values(Subject).map(s => ({
        subject: s,
        correct: 0,
        total: 0
      })));

      const savedGrade = localStorage.getItem(`user_grade_${user.id}`);
      setSelectedGrade(savedGrade as Grade || null);

      const savedSubjects = localStorage.getItem(`user_subjects_${user.id}`);
      if (savedSubjects) {
        setUserSubjects(JSON.parse(savedSubjects));
      } else {
        setUserSubjects(Object.values(Subject));
      }
      
      setUserName(user.name);
      updateStreak(user);
    } else {
      setHistory([]);
      setStats([]);
      setSelectedGrade(null);
      setUserSubjects(Object.values(Subject));
    }
  }, [user?.id]);

  const updateStreak = (currentUser: User) => {
    if (currentUser.role === 'TEACHER') return;

    const lastDate = currentUser.lastActivityDate;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const today = now.getTime();

    let newStreak = currentUser.streak || 0;
    
    if (!lastDate) {
      newStreak = 1;
    } else {
      const last = new Date(lastDate);
      last.setHours(0, 0, 0, 0);
      const lastTime = last.getTime();
      const diffDays = (today - lastTime) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    }

    if (newStreak !== currentUser.streak || today !== currentUser.lastActivityDate) {
      const updatedUser = { ...currentUser, streak: newStreak, lastActivityDate: today };
      setUser(updatedUser);
      localStorage.setItem('user_auth', JSON.stringify(updatedUser));
      
      const usersRaw = localStorage.getItem('lumdim_users_database');
      if (usersRaw) {
        const users = JSON.parse(usersRaw);
        const updatedUsers = users.map((u: User) => u.id === currentUser.id ? updatedUser : u);
        localStorage.setItem('lumdim_users_database', JSON.stringify(updatedUsers));
      }
    }
  };

  useEffect(() => {
    if (!user) return;
    
    localStorage.setItem('user_auth', JSON.stringify(user));
    if (selectedGrade) localStorage.setItem(`user_grade_${user.id}`, selectedGrade);
    localStorage.setItem(`study_history_${user.id}`, JSON.stringify(history));
    localStorage.setItem(`user_stats_${user.id}`, JSON.stringify(stats));
    localStorage.setItem(`user_subjects_${user.id}`, JSON.stringify(userSubjects));
  }, [selectedGrade, history, stats, user, userSubjects]);

  const recentMistakes = useMemo(() => {
    if (!selectedSubject) return [];
    return history
      .filter(item => item.subject === selectedSubject && item.type === 'PRACTICE' && !item.isCorrect)
      .slice(-5)
      .map(item => item.title);
  }, [history, selectedSubject]);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    setUserName(newUser.name);
    localStorage.setItem('user_auth', JSON.stringify(newUser));
    setViewMode('DASHBOARD');
  };

  const handleLogout = () => {
    localStorage.removeItem('user_auth');
    setUser(null);
    setUserName(null);
    setSelectedGrade(null);
    setSelectedSubject(null);
    setViewMode('DASHBOARD');
    document.documentElement.classList.remove('dark');
  };

  const handleUpdateProfile = (name: string, photoUrl: string, settings: UserSettings) => {
    if (user) {
      const updatedUser: User = { ...user, name, photoUrl, settings };
      setUser(updatedUser);
      setUserName(name);
      localStorage.setItem('user_auth', JSON.stringify(updatedUser));
      
      const usersRaw = localStorage.getItem('lumdim_users_database');
      if (usersRaw) {
        const users = JSON.parse(usersRaw);
        const updatedUsers = users.map((u: User) => u.id === user.id ? updatedUser : u);
        localStorage.setItem('lumdim_users_database', JSON.stringify(updatedUsers));
      }
    }
  };

  const handleGradeSelect = (grade: Grade) => setSelectedGrade(grade);
  const handleChangeGrade = () => {
    setSelectedGrade(null);
    setSelectedSubject(null);
    setViewMode('DASHBOARD');
    setChatContext(null);
    setPracticeConfig(null);
  };

  const handleSubjectSelect = (subject: Subject | string) => {
    setSelectedSubject(subject);
    setViewMode('PRACTICE');
    setActiveTab('practice'); 
    setPracticeConfig(null);
  };

  const handleAddSubject = (subjectName: string) => {
    if (!subjectName.trim() || userSubjects.includes(subjectName)) return;
    const newList = [...userSubjects, subjectName];
    setUserSubjects(newList);
    setStats(prev => [...prev, { subject: subjectName as Subject, correct: 0, total: 0 }]);
  };

  const handleHomeClick = () => {
    setViewMode('DASHBOARD');
    setActiveTab('practice');
    setChatContext(null);
    setSelectedSubject(null); 
    setPracticeConfig(null);
    setSummaryToOpen(null);
    setActiveClassId(null);
    setInitialMaterialId(null);
    setInitialTeacherTab(undefined);
    setInitialLessonPlan(null);
    setInitialGlobalEditorData(null);
  };

  const handleHistoryClick = () => {
    if (viewMode !== 'HISTORY') {
      setPreviousViewMode(viewMode);
      setViewMode('HISTORY');
    }
  };

  const handleClassroomClick = () => {
    if (viewMode !== 'CLASSROOM') {
      setPreviousViewMode(viewMode);
      setViewMode('CLASSROOM');
    }
  };

  const handleAchievementsClick = () => {
    if (viewMode !== 'ACHIEVEMENTS') {
      setPreviousViewMode(viewMode);
      setViewMode('ACHIEVEMENTS');
    }
  };

  const handleCalendarClick = () => {
    if (viewMode !== 'CALENDAR') {
      setPreviousViewMode(viewMode);
      setViewMode('CALENDAR');
    }
  };

  const handleNotificationsClick = () => {
    if (viewMode !== 'NOTIFICATIONS') {
      setPreviousViewMode(viewMode);
      setViewMode('NOTIFICATIONS');
      setNotifications(prev => prev.map(n => ({...n, read: true})));
    }
  };

  const handleBackFromGenericView = () => setViewMode(previousViewMode);

  const handleAddHistoryItem = (item: HistoryItem) => {
    setHistory(prev => [...prev, item]);
  };

  const handleQuestionAnswered = (question: Question, isCorrect: boolean) => {
    if (!selectedSubject || !selectedGrade || !user) return;
    
    setStats(prev => {
        const exists = prev.find(s => s.subject === selectedSubject);
        if (exists) {
            return prev.map(s => s.subject === selectedSubject ? { ...s, correct: s.correct + (isCorrect ? 1 : 0), total: s.total + 1 } : s);
        } else {
            return [...prev, { subject: selectedSubject as Subject, correct: isCorrect ? 1 : 0, total: 1 }];
        }
    });
    
    const newTotal = (user.totalQuestionsSolved || 0) + 1;
    const updatedUser = { ...user, totalQuestionsSolved: newTotal };
    setUser(updatedUser);
    localStorage.setItem('user_auth', JSON.stringify(updatedUser));

    const newItem: HistoryItem = { id: Date.now().toString(), timestamp: Date.now(), subject: selectedSubject as Subject, grade: selectedGrade, type: 'PRACTICE', title: question.text, isCorrect: isCorrect };
    setHistory(prev => [...prev, newItem]);
  };

  const handleGlobalPublish = (material: ClassroomMaterial, targetClassIds: string[]) => {
    const currentClassrooms = JSON.parse(localStorage.getItem(DB_KEY) || '[]');
    
    if (targetClassIds.length > 0) {
        const updatedClassrooms = currentClassrooms.map((c: Classroom) => {
          if (targetClassIds.includes(c.id)) {
            return { ...c, materials: [material, ...c.materials] };
          }
          return c;
        });
        localStorage.setItem(DB_KEY, JSON.stringify(updatedClassrooms));
        window.dispatchEvent(new Event('lumdim-db-updated'));
    }
    
    const refClass = targetClassIds.length > 0 
        ? currentClassrooms.find((c: Classroom) => targetClassIds.includes(c.id))
        : null;

    handleAddHistoryItem({
        id: material.id,
        timestamp: material.timestamp,
        subject: refClass?.subject || Subject.MATH,
        grade: refClass?.grade || Grade.GRADE_10,
        type: material.type === 'SUMMARY' ? 'SUMMARY' : 'PRACTICE',
        title: targetClassIds.length > 0 ? `העלאת תוכן גלובלי: ${material.title}` : `שמירה במאגר: ${material.title}`,
        content: material.content,
        isCorrect: true,
        classId: targetClassIds[0],
        details: material
    });

    setIsGlobalEditorOpen(false);
    setInitialGlobalEditorData(null);
    if (targetClassIds.length > 0) {
        alert(`התוכן פורסם בהצלחה ל-${targetClassIds.length} כיתות!`);
    } else {
        alert(`התוכן נשמר במאגר החומרים שלך!`);
    }
    loadClassrooms();
  };

  const isTeacher = user?.role === 'TEACHER';
  const unreadCount = notifications.filter(n => !n.read).length;

  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

  const isMainToolVisible = viewMode === 'PRACTICE' || (viewMode === 'HISTORY' && previousViewMode === 'PRACTICE') || (viewMode === 'CLASSROOM' && previousViewMode === 'PRACTICE') || (viewMode === 'ACHIEVEMENTS' && previousViewMode === 'PRACTICE') || (viewMode === 'CALENDAR' && previousViewMode === 'PRACTICE');

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col font-sans transition-colors ${user?.settings?.darkMode ? 'dark' : ''}`} dir="rtl">
      <Header 
        onHomeClick={handleHomeClick} 
        onHistoryClick={handleHistoryClick} 
        onClassroomClick={handleClassroomClick}
        onAchievementsClick={handleAchievementsClick}
        onCalendarClick={handleCalendarClick}
        onNotificationsClick={handleNotificationsClick}
        onLogout={handleLogout}
        onProfileClick={() => setIsProfileModalOpen(true)}
        selectedGrade={selectedGrade}
        onChangeGrade={handleChangeGrade}
        userName={userName}
        userPhoto={user?.photoUrl}
        userEmail={user?.email}
        userRole={user?.role}
        userSettings={user?.settings}
        unreadCount={unreadCount}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        {viewMode === 'DASHBOARD' && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {isTeacher ? (
              <TeacherDashboard 
                user={user} 
                onSelectClass={(id) => {
                  setActiveClassId(id);
                  setInitialMaterialId(null);
                  setViewMode('CLASSROOM');
                }} 
                onOpenTool={(tool) => {
                  if (tool === 'CHAT') {
                    setSelectedSubject(null);
                    setSelectedGrade(null);
                    setViewMode('CHAT');
                  } else if (tool === 'MATERIALS') {
                    setInitialGlobalEditorData(null);
                    setIsGlobalEditorOpen(true);
                  } else {
                    setActiveClassId(null);
                    setViewMode('CLASSROOM');
                  }
                }} 
                onAddHistoryItem={handleAddHistoryItem}
                initialTeacherTab={initialTeacherTab}
                initialLessonPlan={initialLessonPlan}
              />
            ) : (
              <>
                {!selectedGrade ? (
                  <SubjectSelector
                    mode="GRADE_SELECTION"
                    selectedSubject={selectedSubject as Subject}
                    selectedGrade={selectedGrade}
                    userName={userName}
                    onSelectSubject={handleSubjectSelect}
                    onSelectGrade={handleGradeSelect}
                    userSubjects={userSubjects}
                    onAddSubject={handleAddSubject}
                  />
                ) : (
                  <>
                    <SubjectSelector
                      mode="SUBJECT_SELECTION"
                      selectedSubject={selectedSubject as Subject}
                      selectedGrade={selectedGrade}
                      userName={userName}
                      onSelectSubject={handleSubjectSelect}
                      onSelectGrade={handleGradeSelect}
                      isTeacher={false}
                      userSubjects={userSubjects}
                      onAddSubject={handleAddSubject}
                    />

                    {user.settings?.showProgressStats !== false && stats.some(s => s.total > 0) && (
                      <div className="max-w-4xl mx-auto w-full mt-8">
                        <ProgressChart stats={stats} />
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {viewMode === 'HISTORY' && (
          isTeacher ? (
            <MaterialRepositoryView 
              history={history} 
              onBack={handleBackFromGenericView} 
              onCreateNew={() => {
                setInitialGlobalEditorData(null);
                setIsGlobalEditorOpen(true);
              }}
              onOpenItem={(item) => {
                  if (item.type === 'LESSON_PLAN') {
                      setInitialLessonPlan(item.details);
                      setInitialTeacherTab('PLANNER');
                      setViewMode('DASHBOARD');
                  } else if (item.details) {
                      // CRITICAL FIX: Any summary/test/file from repository MUST open in GlobalContentEditor
                      setInitialGlobalEditorData(item.details);
                      setIsGlobalEditorOpen(true);
                  } else if (item.type === 'EXAM_CHECK') {
                      alert("צפייה בדוח בדיקת מבחן תתווסף בגרסה הבאה. בינתיים הפריט נשמר במאגר.");
                  } else {
                      // Legacy or Student view fallback
                      setSelectedSubject(item.subject);
                      setSelectedGrade(item.grade);
                      setActiveTab('resources');
                      setSummaryToOpen({ title: item.title, content: item.content || '' });
                      setViewMode('PRACTICE');
                  }
              }} 
            />
          ) : (
            <HistoryView 
              history={history} 
              onBack={handleBackFromGenericView} 
              onOpenSummary={(item) => {
                  setSelectedSubject(item.subject);
                  setSelectedGrade(item.grade);
                  setActiveTab('resources');
                  setSummaryToOpen({ title: item.title, content: item.content || '' });
                  setViewMode('PRACTICE');
              }} 
              isTeacher={isTeacher}
            />
          )
        )}

        {viewMode === 'ACHIEVEMENTS' && !isTeacher && (
           <AchievementView 
              user={user} 
              history={history} 
              onBack={handleBackFromGenericView} 
           />
        )}

        {viewMode === 'CALENDAR' && !isTeacher && (
           <CalendarView 
              user={user} 
              onBack={handleBackFromGenericView}
              onOpenClassroom={(id) => {
                setActiveClassId(id);
                setInitialMaterialId(null);
                setViewMode('CLASSROOM');
              }}
           />
        )}

        {viewMode === 'NOTIFICATIONS' && (
          <div className="max-w-4xl mx-auto animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-10">
              <button onClick={handleBackFromGenericView} className="p-3 bg-white hover:bg-gray-50 dark:bg-darkcard dark:hover:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-sm transition-colors">
                <ArrowRight size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-white">מרכז התראות</h2>
                <p className="text-gray-500 dark:text-slate-400 font-bold">כל מה שחדש בכיתה וב-Lumdim</p>
              </div>
            </div>

            <div className="space-y-4">
              {notifications.length === 0 ? (
                <div className="bg-white dark:bg-darkcard p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100 dark:border-slate-800 flex flex-col items-center">
                    <Bell size={64} className="text-gray-200 dark:text-slate-700 mb-6" />
                    <h3 className="text-2xl font-black text-gray-800 dark:text-slate-300">אין התראות חדשות</h3>
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="bg-white dark:bg-darkcard p-6 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-sm flex items-start gap-6 hover:shadow-md transition-all">
                    <div className={`p-4 rounded-2xl ${n.type === 'AI' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                       {n.type === 'AI' ? <Sparkles size={24} /> : <School size={24} />}
                    </div>
                    <div className="flex-1">
                       <h4 className="text-lg font-black text-gray-900 dark:text-white mb-1">{n.title}</h4>
                       <p className="text-gray-600 dark:text-slate-400 font-medium mb-3">{n.text}</p>
                       <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                          <Clock size={12}/>
                          <span>{new Date(n.timestamp).toLocaleString('he-IL')}</span>
                       </div>
                    </div>
                    <button onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))} className="text-gray-300 hover:text-red-500 p-2 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {viewMode === 'CHAT' && isTeacher && (
          <div className="max-w-4xl mx-auto animate-fade-in pb-10">
            <button onClick={handleHomeClick} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 font-bold group">
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                <span>חזרה ללוח בקרה</span>
            </button>
            <ChatBot 
                subject={selectedSubject as Subject} 
                grade={selectedGrade} 
                userName={userName} 
                isTeacher={isTeacher} 
            />
          </div>
        )}
        
        {viewMode === 'CLASSROOM' && (
          <ClassroomView 
            user={user} 
            initialClassId={activeClassId}
            initialMaterialId={initialMaterialId}
            onBack={handleHomeClick} 
            onStartTestPrep={(sub, grad, top, days, attach) => {
              setSelectedSubject(sub);
              setSelectedGrade(grad);
              setTestPrepInitialData({ topic: top, days, attachment: attach });
              setActiveTab('test-prep');
              setViewMode('PRACTICE');
            }} 
            onAddHistoryItem={handleAddHistoryItem} 
          />
        )}

        {isMainToolVisible && viewMode === 'PRACTICE' && (
          <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
            <div className="hidden lg:flex lg:w-1/4 flex-col gap-6 no-print">
              <div className="bg-white p-6 rounded-2xl shadow-sm border-l border-gray-100 sticky top-24">
                <div className="mb-6 pb-4 border-b border-gray-100 text-right">
                   <h2 className="text-xl font-bold text-gray-800">{selectedSubject || 'עוזר חכם'}</h2>
                   <p className="text-gray-500">{isTeacher ? 'מרחב עבודה למורה' : (selectedGrade || 'כללי')}</p>
                </div>
                <nav className="flex flex-col gap-3">
                    <button onClick={() => { setActiveTab('practice'); setChatContext(null); }} className={`p-4 rounded-xl flex items-center gap-3 transition-all text-right font-medium ${activeTab === 'practice' ? 'bg-blue-50 text-primary shadow-sm ring-1 ring-blue-100' : 'text-gray-600 hover:bg-gray-50'}`}><PenTool size={22} /><span>תרגול שאלות</span></button>
                    <button onClick={() => { setActiveTab('resources'); setChatContext(null); }} className={`p-4 rounded-xl flex items-center gap-3 transition-all text-right font-medium ${activeTab === 'resources' ? 'bg-green-50 text-green-600 shadow-sm ring-1 ring-green-100' : 'text-gray-600 hover:bg-gray-50'}`}><BookOpen size={22} /><span>חומרי לימוד</span></button>
                    <button onClick={() => { setActiveTab('test-prep'); setChatContext(null); }} className={`p-4 rounded-xl flex items-center gap-3 transition-all text-right font-medium ${activeTab === 'test-prep' ? 'bg-yellow-50 text-yellow-700 shadow-sm ring-1 ring-yellow-200' : 'text-gray-600 hover:bg-gray-50'}`}><div className="flex items-center gap-3"><Calendar size={22} className={activeTab === 'test-prep' ? 'text-yellow-600' : ''} /><span>הכנה למבחן</span></div></button>
                    <button onClick={() => { setViewMode('PRACTICE'); setActiveTab('chat'); }} className={`p-4 rounded-xl flex items-center gap-3 transition-all text-right font-medium ${activeTab === 'chat' ? 'bg-purple-50 text-accent shadow-sm ring-1 ring-purple-100' : 'text-gray-600 hover:bg-purple-50 hover:text-accent'}`}><MessageCircle size={22} /><span>{isTeacher ? 'עוזר הוראה AI' : 'צ\'אט עם מורה'}</span></button>
                </nav>
                <div className="mt-8 pt-6 border-t border-gray-100"><button onClick={handleHomeClick} className="w-full py-2 text-sm text-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2"><span>חזרה לדף הבית</span></button></div>
              </div>
            </div>

            <div className="lg:w-3/4 w-full">
                <div className={activeTab === 'practice' ? 'block' : 'hidden'}><PracticeArea subject={selectedSubject as Subject} grade={selectedGrade!} onQuestionAnswered={handleQuestionAnswered} onAssignToClass={(item) => {
                  handleAddHistoryItem({
                    id: `manual-classroom-${Date.now()}`,
                    timestamp: Date.now(),
                    subject: selectedSubject as Subject,
                    grade: selectedGrade!,
                    type: 'PRACTICE',
                    title: item.title,
                    isCorrect: true,
                    classId: activeClassId || undefined
                  });
                  alert('המערך נשמר במאגר החומרים שלך!');
                }} initialConfig={practiceConfig} recentMistakes={recentMistakes} isTeacher={isTeacher} userSettings={user.settings} /></div>
                <div className={activeTab === 'resources' ? 'block' : 'hidden'}><ResourcesView subject={selectedSubject as Subject} grade={selectedGrade!} onStartTest={(config) => { setPracticeConfig(config); setActiveTab('practice'); }} onSummaryGenerated={(title, content) => {
                    const newItem: HistoryItem = { id: Date.now().toString(), timestamp: Date.now(), subject: selectedSubject as Subject, grade: selectedGrade!, type: 'SUMMARY', title, content };
                    handleAddHistoryItem(newItem);
                }} onAssignToClass={(item) => {
                   handleAddHistoryItem({
                    id: `classroom-summary-${Date.now()}`,
                    timestamp: Date.now(),
                    subject: selectedSubject as Subject,
                    grade: selectedGrade!,
                    type: 'SUMMARY',
                    title: item.title,
                    content: item.content,
                    isCorrect: true,
                    classId: activeClassId || undefined
                  });
                  alert('הסיכום נשמר במאגר החומרים שלך!');
                }} onHelpWithContent={(ctx) => { setChatContext(ctx); setActiveTab('chat'); }} initialSummaryToOpen={summaryToOpen} isTeacher={isTeacher} /></div>
                <div className={activeTab === 'test-prep' ? 'block' : 'hidden'}><TestPrepView subject={selectedSubject as Subject} grade={selectedGrade!} initialSharedData={testPrepInitialData} onClearInitialData={() => setTestPrepInitialData(null)} isTeacher={isTeacher} /></div>
                <div className={activeTab === 'chat' ? 'block' : 'hidden'}><ChatBot subject={selectedSubject as Subject} grade={selectedGrade} userName={userName} initialMessage={chatContext} isTeacher={isTeacher} /></div>
            </div>
          </div>
        )}
      </main>

      {isGlobalEditorOpen && (
        <GlobalContentEditor 
          user={user!} 
          classrooms={allClassrooms.filter(c => c.teacherId === user!.id)}
          onClose={() => {
            setIsGlobalEditorOpen(false);
            setInitialGlobalEditorData(null);
          }} 
          onPublish={handleGlobalPublish}
          initialMaterial={initialGlobalEditorData}
        />
      )}

      <ProfileModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
        userName={userName || ''} 
        userPhoto={user?.photoUrl || ''} 
        userSettings={user?.settings}
        onUpdate={handleUpdateProfile} 
      />
    </div>
  );
};

export default App;
