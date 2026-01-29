
export enum Subject {
  MATH = 'מתמטיקה',
  HEBREW = 'עברית (לשון)',
  ENGLISH = 'אנגלית',
  SCIENCE = 'מדעים',
  HISTORY = 'היסטוריה',
  GEOGRAPHY = 'גיאוגרפיה',
  BIBLE = 'תנ״ך',
  CIVICS = 'אזרחות'
}

export enum Grade {
  GRADE_1 = 'כיתה א׳',
  GRADE_2 = 'כיתה ב׳',
  GRADE_3 = 'כיתה ג׳',
  GRADE_4 = 'כיתה ד׳',
  GRADE_5 = 'כיתה ה׳',
  GRADE_6 = 'כיתה ו׳',
  GRADE_7 = 'כיתה ז׳',
  GRADE_8 = 'כיתה ח׳',
  GRADE_9 = 'כיתה ט׳',
  GRADE_10 = 'כיתה י׳',
  GRADE_11 = 'כיתה י״א',
  GRADE_12 = 'כיתה י״ב'
}

export type UserRole = 'STUDENT' | 'TEACHER';

export interface UserSettings {
  darkMode: boolean;
  notificationsEnabled: boolean;
  autoSaveDrafts: boolean;
  dataSaverMode: boolean;
  // Fix: Added missing properties to resolve type errors in components/PracticeArea.tsx and App.tsx
  soundEffects?: boolean;
  showProgressStats?: boolean;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number; // 0-100
  targetValue: number;
  currentValue: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  password?: string; 
  photoUrl?: string;
  provider: 'google' | 'email' | 'guest';
  role: UserRole;
  streak?: number;
  lastActivityDate?: number;
  totalQuestionsSolved?: number;
  settings?: UserSettings;
}

export interface ExamCheckResult {
  finalScore: number;
  overallFeedback: string;
  questionsAnalysis: Array<{
    questionNumber: string;
    status: 'CORRECT' | 'PARTIAL' | 'WRONG';
    pointsEarned: number;
    totalPoints: number;
    explanation: string;
    studentAnswer: string;
    correctAnswer: string;
  }>;
}

export interface LessonPlan {
  title: string;
  subject: Subject;
  objectives: string[];
  introduction: string;
  mainContent: string;
  activity?: string;
  summary: string;
  resourcesNeeded: string[];
  homework?: string;
}

export interface InfographicData {
  mainTitle: string;
  summaryLine: string;
  keyPoints: Array<{ title: string; description: string; iconType: string }>;
  statistics: Array<{ value: string; label: string }>;
  takeaway: string;
  teacherScript?: string;
}

export type SlideLayout = 'TITLE' | 'BULLETS' | 'SPLIT' | 'QUOTE' | 'IMAGE_TEXT';

export interface SlideData {
  title: string;
  content: string[];
  layout: SlideLayout;
}

export interface PresentationData {
  title: string;
  slides: SlideData[];
}

export interface Question {
  id: string;
  text: string;
  type?: 'MCQ' | 'OPEN';
  options: string[];
  correctIndex: number;
  modelAnswer?: string; 
  explanation: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachment?: {
    mimeType: string;
    data: string; 
  };
}

export interface UserStats {
  subject: Subject;
  correct: number;
  total: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  subject: Subject;
  grade: Grade;
  type: 'PRACTICE' | 'SUMMARY' | 'LESSON_PLAN' | 'EXAM_CHECK';
  title: string;
  isCorrect?: boolean; 
  content?: string;    
  score?: number;      
  details?: any;
  classId?: string;
}

export interface StudyTopic {
  title: string;
  description: string;
  type: 'SUMMARY' | 'TEST' | 'TEST_PREP';
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface ConceptLink {
  from: string;
  to: string;
  relation: string;
}

export interface TestPrepDay {
  dayNumber: number;
  title: string;
  summary: string;
  videoSearchTerm: string;
  quiz: Question[];
  flashcards: Flashcard[];
  conceptMap: ConceptLink[];
}

export interface TestPrepPlan {
  id: string;
  subject: Subject;
  targetTopic: string;
  totalDays: number;
  days: TestPrepDay[];
  createdAt: number;
  completedDays: number[];
}

export interface HistoryAnalysis {
  insight: string;
  recommendations: string[];
  strength: string;
  weakness: string;
}

export interface PracticeConfig {
  count: number;
  mode: 'PRACTICE' | 'TEST';
  difficulty: 'MEDIUM' | 'HARD';
  topic?: string | null;
}

export type MaterialType = 'SUMMARY' | 'TEST' | 'ASSIGNMENT' | 'UPCOMING_TEST' | 'MESSAGE' | 'UPLOADED_FILE';

export interface ClassroomSubmission {
  studentId: string;
  studentName: string;
  timestamp: number;
  attachment: {
    name: string;
    mimeType: string;
    data: string;
  };
  quizResults?: Record<string, any>;
  teacherGrades?: Record<string, number>; 
  aiScore?: number;
  aiFeedback?: string;
  assignmentText?: string; 
}

export interface ClassroomMaterial {
  id: string;
  title: string;
  type: MaterialType;
  content: string; 
  questions?: Question[];
  flashcards?: Flashcard[];
  conceptMap?: ConceptLink[];
  testDate?: string; 
  dueDate?: string;  
  timestamp: number;
  isPublished: boolean;
  teacherAttachments?: Array<{
    name: string;
    mimeType: string;
    data: string;
  }>;
  submissions?: ClassroomSubmission[];
  targetStudentIds?: string[]; 
  autoGradeByAI?: boolean; 
}

export interface ClassroomMessage {
  id: string;
  senderId: string;
  senderName: string;
  recipientId?: string;
  text: string;
  timestamp: number;
  attachment?: {
    mimeType: string;
    data: string;
  };
}

export interface Classroom {
  id: string;
  name: string;
  subject: Subject;
  grade: Grade;
  teacherName: string;
  teacherId: string;
  materials: ClassroomMaterial[];
  messages?: ClassroomMessage[];
  studentsCount: number;
  students?: string[]; 
  studentIds?: string[]; 
}

export type ViewMode = 'DASHBOARD' | 'PRACTICE' | 'CHAT' | 'HISTORY' | 'CLASSROOM' | 'ACHIEVEMENTS' | 'CALENDAR' | 'NOTIFICATIONS';

export interface EnrolledCourse {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  totalDays: number;
  completedDays: number[];
  currentDay: number;
  lastAccessed: number;
}

export interface DailyLesson {
  title: string;
  content: string;
  videoSearchTerm: string;
  funFact: string;
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
  };
}
