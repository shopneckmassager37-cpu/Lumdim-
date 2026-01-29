
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Subject, Grade, Question, StudyTopic, TestPrepPlan, 
  HistoryItem, HistoryAnalysis, DailyLesson, LessonPlan,
  InfographicData, PresentationData, ExamCheckResult 
} from "../types.ts";

const MODEL_NAME = 'gemini-3-flash-preview';

const TEACHER_SYSTEM_INSTRUCTION = `אתה מורה פרטי מומחה במערכת החינוך הישראלית. 
תפקידך לעזור לתלמידים להבין חומר לימודי בצורה מעמיקה.

חוקי פורמט קריטיים (איסור Markdown):
1. חל איסור מוחלט להשתמש בכוכביות (*) או קווים תחתונים (_) עבור עיצוב טקסט.
2. עבור כותרות, השתמש אך ורק בתגיות HTML: <h2>כותרת ראשית</h2> או <h3>כותרת משנה</h3>.
3. עבור הדגשות, השתמש אך ורק ב-<b>טקסט מודגש</b>.
4. עבור נוסחאות מתמטיות, השתמש בסימון LaTeX בתוך דולרים: $נוסחה$ או $$נוסחה$$.

דוגמה למבנה רצוי:
<h2>נושא השיעור</h2>
<b>הגדרה:</b> הסבר קצר...
$$E = mc^2$$

שרטוטים ויזואליים:
השתמש בתגיות <div data-type="geometry-node" data-shapes='[...]'></div> במידת הצורך.

דגש לסיכומים: 
התחל ישירות בתוכן. אל תשתמש במשפטי פתיחה כמו "הנה הסיכום".`;

export const checkExamWithRubric = async (
  studentImageData: string,
  studentMime: string,
  rubricImageData: string | null,
  rubricMime: string | null,
  rubricText: string | null
): Promise<ExamCheckResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [
    { inlineData: { mimeType: studentMime, data: studentImageData } },
    { text: `נתח את המבחן ב-JSON.` }
  ];
  if (rubricImageData && rubricMime) {
    parts.push({ inlineData: { mimeType: rubricMime, data: rubricImageData } });
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts },
    config: {
      systemInstruction: "אתה בודק מבחנים מקצועי. החזר JSON בלבד.",
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "{}");
};

export const generateSummary = async (subject: Subject | string, grade: Grade, topic: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `כתוב סיכום מקיף ב${subject} עבור ${grade} על הנושא: ${topic}. 
    זכור: השתמש ב-<b> וב-<h2>. אסור להשתמש ב-*!`,
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION
    }
  });
  return response.text || "";
};

export const generateQuestions = async (
  subject: Subject | string, 
  grade: Grade, 
  topic?: string, 
  previousMistakes?: string[], 
  count: number = 5, 
  difficulty: 'MEDIUM' | 'HARD' = 'MEDIUM',
  mcqCount?: number,
  openCount?: number
): Promise<Question[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `ייצר ${count} שאלות תרגול ב${subject} לכיתה ${grade} בנושא ${topic || 'כללי'}. החזר JSON.`;
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "[]");
};

export const gradeOpenQuestion = async (
  questionText: string,
  modelAnswer: string,
  studentAnswer: string
): Promise<{ score: number; feedback: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `השאלה: ${questionText}. תשובת מודל: ${modelAnswer}. תשובת תלמיד: ${studentAnswer}.`,
    config: {
      systemInstruction: "תן ציון ומשוב ב-JSON.",
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "{}");
};

export const generateLessonPlan = async (
  topic: string,
  grade: string,
  additionalInfo: string,
  includeHomework: boolean = false,
  includeGroupActivity: boolean = true
): Promise<LessonPlan> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `צור מערך שיעור על: ${topic} עבור ${grade}.`,
    config: {
      systemInstruction: "החזר JSON של מערך שיעור.",
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "{}");
};

export const generateLessonVisuals = async (
  lessonPlan: LessonPlan,
  type: 'INFOGRAPHIC' | 'PRESENTATION'
): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `צור ${type} עבור המערך.`,
    config: {
      systemInstruction: "החזר JSON בלבד.",
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "{}");
};

export const generateTestPrepPlan = async (
  subject: Subject | string,
  grade: Grade,
  topic: string,
  daysCount: number,
  attachment?: { mimeType: string; data: string }
): Promise<TestPrepPlan | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{ text: `צור תוכנית למידה למבחן ב${subject} לכיתה ${grade} בנושא ${topic}.` }];
  if (attachment) { parts.push({ inlineData: attachment }); }
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts },
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "null");
};

export const analyzeHistory = async (history: HistoryItem[]): Promise<HistoryAnalysis | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `נתח היסטוריה.`,
    config: {
      systemInstruction: "החזר JSON של ניתוח למידה.",
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "null");
};

export const getChatResponseStream = async (history: any[], message: string, subject?: Subject | string, grade?: Grade, attachment?: any) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{ text: message }];
  if (attachment) { parts.push({ inlineData: attachment }); }
  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: { systemInstruction: TEACHER_SYSTEM_INSTRUCTION },
    history: history
  });
  return await chat.sendMessageStream({ message: parts });
};

export const generateLessonContent = async (subject: Subject | string, grade: Grade, courseTitle: string, day: number): Promise<DailyLesson> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `שיעור יום ${day} לקורס ${courseTitle} ב${subject}.`,
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "{}");
};

export const getCourseTopics = async (subject: Subject | string, grade: Grade): Promise<StudyTopic[]> => {
  const { COURSES_DB } = await import("./courseData.ts");
  const courses = (COURSES_DB as any)[subject] || [];
  return courses.map((course: any) => ({ title: course.title, description: course.description, type: 'SUMMARY' }));
};

export const getStudyTopics = async (subject: Subject | string, grade: Grade): Promise<{summaries: StudyTopic[], tests: StudyTopic[]}> => {
  const { STATIC_RESOURCES } = await import("./resourcesData.ts");
  const subjectResources = (STATIC_RESOURCES as any)[subject] || [];
  const filtered = subjectResources.filter((res: any) => res.grades.includes(grade));
  return {
    summaries: filtered.map((res: any) => ({ title: res.title, description: res.description, type: 'SUMMARY' })),
    tests: filtered.map((res: any) => ({ title: res.title, description: res.description, type: 'TEST' }))
  };
};

export const checkWorkForErrors = async (base64Data: string, mimeType: string): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: `זהה שגיאות. החזר JSON.` }
      ]
    },
    config: { systemInstruction: "זהה שגיאות כתיב וחשבון. החזר JSON.", responseMimeType: "application/json" }
  });
  return JSON.parse(response.text || "{}");
};
