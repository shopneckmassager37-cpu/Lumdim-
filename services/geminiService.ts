import { GoogleGenAI, Type } from "@google/genai";
import { 
  Subject, Grade, Question, StudyTopic, TestPrepPlan, 
  HistoryItem, HistoryAnalysis, DailyLesson, LessonPlan,
  InfographicData, PresentationData, ExamCheckResult 
} from "../types.ts";

// Fix: Removed global ai instance to comply with guidelines (new instance per call)
const MODEL_NAME = 'gemini-3-flash-preview';

const TEACHER_SYSTEM_INSTRUCTION = `אתה מורה פרטי מומחה, סבלני ומעודד במערכת החינוך הישראלית. 
תפקידך לעזור לתלמידים להבין חומר לימודי בצורה מעמיקה. 
השתמש בעברית תקנית אך נגישה. 
במתמטיקה ומדעים, השתמש בסימון LaTeX עבור נוסחאות (למשל $x^2$).
חשוב מאוד: במקצועות שאינם אנגלית או מתמטיקה, השתמש בעברית בלבד! אל תשלב מילים באנגלית בתוך הסיכומים או ההסברים אלא אם כן מדובר במונח טכני שאין לו חלופה עברית מקובלת בכלל.
תמיד התאם את רמת התוכן לכיתה המבוקשת.

דגש קריטי לסיכומים: 
כתוב את תוכן הלימוד בלבד בצורה נקייה ומאורגנת. 
חל איסור מוחלט להשתמש במילות פתיחה, ברכות או פניות אישיות (כמו "שלום תלמיד/ה יקר/ה!", "אני שמח לעזור לך להתכונן", "הכנתי עבורך סיכום מסודר"). 
חל איסור מוחלט להשתמש במילות סיום, איחולים או עידוד בסוף הטקסט (כמו "בהצלחה רבה בלימודים!", "אני בטוח שתצליח/י במבחן!"). 
התחל ישירות בכותרת הראשונה של הנושא וסיים בנקודה האחרונה של החומר הלימודי ללא שום תוספת מילולית מעבר לחומר הלימודי עצמו.`;

export const checkExamWithRubric = async (
  studentImageData: string,
  studentMime: string,
  rubricImageData: string | null,
  rubricMime: string | null,
  rubricText: string | null
): Promise<ExamCheckResult> => {
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [
    {
      inlineData: {
        mimeType: studentMime,
        data: studentImageData,
      },
    },
    {
      text: `נתח את המבחן של התלמיד המצורף בתמונה. 
      השתמש במחוון (rubric) המצורף כדי לתת ציון ומשוב. 
      ${rubricText ? `מחוון טקסטואלי: ${rubricText}` : 'המחוון מצורף כתמונה שנייה.'}
      החזר תוצאה במבנה JSON הבא בעברית:
      - finalScore: ציון סופי משוער (0-100).
      - overallFeedback: משוב כללי למורה ולתלמיד.
      - questionsAnalysis: מערך של אובייקטים לכל שאלה שזוהתה:
        - questionNumber: מספר השאלה.
        - status: CORRECT/PARTIAL/WRONG.
        - pointsEarned: נקודות שהתלמיד קיבל.
        - totalPoints: נקודות מקסימליות לשאלה.
        - explanation: הסבר למה ניתן הציון.
        - studentAnswer: מה התלמיד ענה.
        - correctAnswer: מה הייתה התשובה הנכונה לפי המחוון.`
    }
  ];

  if (rubricImageData && rubricMime) {
    parts.push({
      inlineData: {
        mimeType: rubricMime,
        data: rubricImageData,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: { parts },
    config: {
      systemInstruction: "אתה בודק מבחנים מקצועי. נתח דפי מבחן בכתב יד או מודפסים והשווה אותם למחוון. היה מדויק והוגן.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          finalScore: { type: Type.NUMBER },
          overallFeedback: { type: Type.STRING },
          questionsAnalysis: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                questionNumber: { type: Type.STRING },
                status: { type: Type.STRING },
                pointsEarned: { type: Type.NUMBER },
                totalPoints: { type: Type.NUMBER },
                explanation: { type: Type.STRING },
                studentAnswer: { type: Type.STRING },
                correctAnswer: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const checkWorkForErrors = async (
  base64Data: string,
  mimeType: string
): Promise<{
  spellingErrors: Array<{ original: string; corrected: string; explanation: string }>;
  mathErrors: Array<{ problem: string; error: string; correction: string }>;
  generalFeedback: string;
}> => {
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Data,
          },
        },
        {
          text: `נתח את התמונה המצורפת של שיעורי בית או מבחן בעברית.
          זהה שגיאות כתיב ושגיאות חישוביות (חשבון).
          החזר את התוצאה במבנה JSON הבא בעברית.`,
        },
      ],
    },
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          spellingErrors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                original: { type: Type.STRING },
                corrected: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ["original", "corrected", "explanation"]
            }
          },
          mathErrors: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                problem: { type: Type.STRING },
                error: { type: Type.STRING },
                correction: { type: Type.STRING }
              },
              required: ["problem", "error", "correction"]
            }
          },
          generalFeedback: { type: Type.STRING }
        },
        required: ["spellingErrors", "mathErrors", "generalFeedback"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const gradeOpenQuestion = async (
  questionText: string,
  modelAnswer: string,
  studentAnswer: string
): Promise<{ score: number; feedback: string }> => {
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `בדוק את התשובה של התלמיד לשאלה הבאה.
    השאלה: ${questionText}
    תשובת המודל האידיאלית: ${modelAnswer}
    תשובת התלמיד: ${studentAnswer}
    
    החזר ציון בין 0 ל-100 ומשוב בונה בעברית.`,
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING }
        },
        required: ["score", "feedback"]
      }
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
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const subjectsStr = Object.values(Subject).join(", ");
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `צור מערך שיעור מפורט למורה על הנושא: ${topic} עבור ${grade}.
    סווג את השיעור לאחד מהמקצועות הבאים בלבד: ${subjectsStr}.
    מידע נוסף: ${additionalInfo}
    ${includeHomework ? "כלול בסוף המערך הצעות לשיעורי בית." : "אל תכלול שיעורי בית."}
    ${includeGroupActivity ? "כלול פעילות קבוצתית אינטראקטיבית." : "אל תכלול פעילות קבוצתית."}
    `,
    config: {
      systemInstruction: "אתה עוזר הוראה דיגיטלי למורים. צור מערכי שיעור יצירתיים, אינטראקטיביים ומקיפים. סווג אוטומטית את נושא השיעור למקצוע מתוך הרשימה הנתונה. השתמש בעברית בלבד (למעט בשיעורי אנגלית).",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          subject: { type: Type.STRING, description: "הסיווג האוטומטי של המקצוע מתוך הרשימה" },
          objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          introduction: { type: Type.STRING },
          mainContent: { type: Type.STRING },
          activity: { type: Type.STRING, description: "השאר ריק אם לא התבקשה פעילות קבוצתית" },
          summary: { type: Type.STRING },
          resourcesNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
          homework: { type: Type.STRING, description: "השאר ריק אם לא התבקשו שיעורי בית" }
        },
        required: ["title", "subject", "objectives", "introduction", "mainContent", "summary", "resourcesNeeded"]
      }
    }
  });
  
  return JSON.parse(response.text || "{}");
};

export const generateLessonVisuals = async (
  lessonPlan: LessonPlan,
  type: 'INFOGRAPHIC' | 'PRESENTATION'
): Promise<any> => {
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = type === 'INFOGRAPHIC' 
    ? `הפוך את מערך השיעור הבא לנתונים עבור אינפוגרפיקה לימודית מעוצבת. 
       כלול כותרת, סיכום קצר, 4 נקודות מפתח עם אייקונים (brain, star, rocket, award), ונתונים סטטיסטיים מעניינים (אפשר להמציא נתונים הגיוניים לנושא).
       תוכן המערך: ${JSON.stringify(lessonPlan)}`
    : `צור מצגת לימודית מקצועית המבוססת על מערך השיעור המצורף.
       על המצגת לכלול בדיוק 6-8 שקופיות.
       לכל שקופית בחר "layout" מתוך: TITLE (כותרת גדולה), BULLETS (רשימה), SPLIT (שני עמודות), QUOTE (ציטוט/משפט מרכזי).
       גוון במבנה השקופיות! אל תשתמש באותו Layout לכל המצגת.
       אל תכלול תסריטים או הערות למורה ב-JSON.
       תוכן המערך: ${JSON.stringify(lessonPlan)}`;

  const schema = type === 'INFOGRAPHIC' 
    ? {
        type: Type.OBJECT,
        properties: {
          mainTitle: { type: Type.STRING },
          summaryLine: { type: Type.STRING },
          keyPoints: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                iconType: { type: Type.STRING }
              }
            }
          },
          statistics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                value: { type: Type.STRING },
                label: { type: Type.STRING }
              }
            }
          },
          takeaway: { type: Type.STRING }
        },
        required: ["mainTitle", "summaryLine", "keyPoints", "statistics", "takeaway"]
      }
    : {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                content: { type: Type.ARRAY, items: { type: Type.STRING } },
                layout: { type: Type.STRING, enum: ["TITLE", "BULLETS", "SPLIT", "QUOTE"] }
              },
              required: ["title", "content", "layout"]
            }
          }
        },
        required: ["title", "slides"]
      };

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: "אתה עוזר ויזואלי למורים במערכת החינוך הישראלית. הפוך טקסט לימודי לנתונים מובנים ומרתקים. השתמש בעברית בלבד.",
      responseMimeType: "application/json",
      responseSchema: schema,
      thinkingConfig: { thinkingBudget: 0 }
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
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const promptText = `צור תוכנית למידה מקיפה למבחן ב${subject} לכיתה ${grade} בנושא ${topic} למשך ${daysCount} ימים.
    עבור כל יום (מ-1 עד ${daysCount}) צור: 
    1. כותרת מתאימה ליום הלימודים.
    2. סיכום מפורט, מעמיק ומאורגן של החומר לאותו יום (לפחות 3 פסקאות).
    3. מונח לחיפוש סרטון העשרה ביוטיוב.
    4. 3 שאלות תרגול (quiz) עם מסיחים והסבר מפורט לכל שאלה.
    5. 4 כרטיסיות מושגים (front, back).
    6. מפת מושגים פשוטה (3 קשרים לוגיים לפחות).
    
    חשוב מאוד: החזר תוצאה בפורמט JSON בלבד התואם בדיוק לסכימה המבוקשת. השתמש בעברית בלבד בכל התוכן הלימודי.`;

  const parts: any[] = [{ text: promptText }];

  if (attachment) {
    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: { type: Type.STRING },
            targetTopic: { type: Type.STRING },
            totalDays: { type: Type.NUMBER },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.NUMBER },
                  title: { type: Type.STRING },
                  summary: { type: Type.STRING },
                  videoSearchTerm: { type: Type.STRING },
                  quiz: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.STRING },
                        text: { type: Type.STRING },
                        options: { type: Type.ARRAY, items: { type: Type.STRING } },
                        correctIndex: { type: Type.NUMBER },
                        explanation: { type: Type.STRING }
                      },
                      required: ["id", "text", "options", "correctIndex", "explanation"]
                    }
                  },
                  flashcards: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        front: { type: Type.STRING },
                        back: { type: Type.STRING }
                      },
                      required: ["front", "back"]
                    }
                  },
                  conceptMap: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        from: { type: Type.STRING },
                        to: { type: Type.STRING },
                        relation: { type: Type.STRING }
                      },
                      required: ["from", "to", "relation"]
                    }
                  }
                },
                required: ["dayNumber", "title", "summary", "videoSearchTerm", "quiz", "flashcards", "conceptMap"]
              }
            }
          },
          required: ["subject", "targetTopic", "totalDays", "days"]
        }
      }
    });

    const cleanJson = (response.text || "").replace(/```json/g, '').replace(/```/g, '').trim();
    if (!cleanJson) return null;
    const plan = JSON.parse(cleanJson);
    return {
      ...plan,
      id: `plan-${Date.now()}`,
      createdAt: Date.now(),
      completedDays: []
    };
  } catch (error) {
    console.error("Failed to generate test prep plan:", error);
    return null;
  }
};

export const generateSummary = async (subject: Subject | string, grade: Grade, topic: string): Promise<string> => {
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const isEnglishOrMath = subject === Subject.ENGLISH || subject === Subject.MATH;
  const englishConstraint = isEnglishOrMath ? "" : "אל תשתמש במילים באנגלית כלל, כתוב בעברית בלבד.";

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `כתוב סיכום מקיף ומאורגן היטב ב${subject} עבור ${grade} על הנושא: ${topic}. ${englishConstraint}
    השתמש בכותרות, בולטים ונוסחאות LaTeX אם צריך. סכם את נקודות המפתח החשובות ביותר למבחן.`,
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION
    }
  });
  return response.text || "לא ניתן היה ליצור סיכום כרגע.";
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
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `ייצר ${count} שאלות תרגול ב${subject} לכיתה ${grade} ברמת קושי ${difficulty}.
  נושא: ${topic || 'כללי'}.
  ${previousMistakes && previousMistakes.length > 0 ? `שים דגש על נושאים אלו בהם התלמיד טעה בעבר: ${previousMistakes.join(', ')}` : ''}
  אנא החזר ${mcqCount || count} שאלות אמריקאיות ו-${openCount || 0} שאלות פתוחות. השתמש בעברית בלבד (למעט בשיעורי אנגלית/מתמטיקה).`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            text: { type: Type.STRING },
            type: { type: Type.STRING, enum: ["MCQ", "OPEN"] },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctIndex: { type: Type.NUMBER },
            modelAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            difficulty: { type: Type.STRING }
          },
          required: ["id", "text", "type", "explanation"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const analyzeHistory = async (history: HistoryItem[]): Promise<HistoryAnalysis | null> => {
  if (history.length === 0) return null;
  
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const historyData = history.map(h => ({
    type: h.type,
    subject: h.subject,
    title: h.title,
    isCorrect: h.isCorrect,
    score: h.score
  }));

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `נתח את היסטוריית הלמידה הבאה של התלמיד והפק תובנות פדגוגיות: ${JSON.stringify(historyData)}`,
    config: {
      systemInstruction: "אתה יועץ פדגוגי חכם. זהה דפוסים, חוזקות וחולשות והמלץ על המשך למידה. השתמש בעברית בלבד.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          insight: { type: Type.STRING },
          strength: { type: Type.STRING },
          weakness: { type: Type.STRING },
          recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["insight", "strength", "weakness", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const getChatResponseStream = async (history: any[], message: string, subject?: Subject | string, grade?: Grade, attachment?: any) => {
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const parts: any[] = [{ text: message }];
  if (attachment) {
    parts.push({
      inlineData: {
        mimeType: attachment.mimeType,
        data: attachment.data
      }
    });
  }

  const contextStr = subject && grade ? `כרגע אתה עוזר לתלמיד ב${subject} לכיתה ${grade}.` : "אתה עוזר הוראה כללי.";

  const chat = ai.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction: `${TEACHER_SYSTEM_INSTRUCTION} ${contextStr} השתמש בעברית בלבד בתשובותיך (למעט באנגלית/מתמטיקה).`
    },
    history: history
  });

  const result = await chat.sendMessageStream({ message: parts });
  return result;
};

export const generateLessonContent = async (subject: Subject | string, grade: Grade, courseTitle: string, day: number): Promise<DailyLesson> => {
  // Fix: Create new GoogleGenAI instance right before API call
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `צור תוכן שיעור עבור היום ה-${day} של הקורס "${courseTitle}" ב${subject} לכיתה ${grade}. השתמש בעברית בלבד (למעט באנגלית/מתמטיקה).`,
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          content: { type: Type.STRING },
          videoSearchTerm: { type: Type.STRING },
          funFact: { type: Type.STRING },
          quiz: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              correctIndex: { type: Type.NUMBER }
            }
          }
        }
      }
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
  
  if (filtered.length > 0) {
    return {
      summaries: filtered.map((res: any) => ({ title: res.title, description: res.description, type: 'SUMMARY' })),
      tests: filtered.map((res: any) => ({ title: res.title, description: res.description, type: 'TEST' }))
    };
  }

  // If no static resources, generate suggestions using AI
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `הצע 4 נושאי לימוד עיקריים וחשובים עבור המקצוע "${subject}" לרמת ${grade} בישראל. החזר רשימה בפורמט JSON בלבד המכילה כותרת ותיאור קצר לכל נושא.`,
      config: {
        systemInstruction: "אתה יועץ פדגוגי. הצע נושאי לימוד רלוונטיים ומעניינים. החזר JSON בלבד.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING }
            },
            required: ["title", "description"]
          }
        }
      }
    });
    
    const aiTopics = JSON.parse(response.text || "[]");
    return {
      summaries: aiTopics.map((t: any) => ({ ...t, type: 'SUMMARY' })),
      tests: aiTopics.map((t: any) => ({ ...t, type: 'TEST' }))
    };
  } catch (error) {
    console.error("AI Suggestion error:", error);
    return { summaries: [], tests: [] };
  }
};