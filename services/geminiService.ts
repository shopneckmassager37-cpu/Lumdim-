
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Subject, Grade, Question, StudyTopic, TestPrepPlan, 
  HistoryItem, HistoryAnalysis, DailyLesson, LessonPlan,
  InfographicData, PresentationData, ExamCheckResult, ClassroomMaterial 
} from "../types.ts";

const MODEL_NAME = 'gemini-3-flash-preview';

const TIPTAP_AI_INSTRUCTION = `
אתה מורה פרטי מומחה ומעצב תוכן לימודי. עליך להחזיר תוכן בפורמט HTML עשיר התואם לעורך Tiptap.

חוקים קריטיים לעיצוב התוכן:
1. נוסחאות מתמטיות: השתמש אך ורק בתגית: <span data-type="math-node" data-latex="LATEX_HERE"></span>. אל תשתמש ב-$$ או $.
2. שרטוטים גיאומטריים: כשאתה מסביר גיאומטריה, הוסף שרטוט אינטראקטיבי בתגית: <div data-type="geometry-node" data-shapes='JSON_ARRAY'></div>.
3. גיאומטריה אנליטית: כשאתה מסביר פונקציות או הנדסה אנליטית, השתמש ב: <div data-type="analytic-geometry-node" data-objects='JSON_ARRAY' data-view-range='{"minX":-10,"maxX":10,"minY":-10,"maxY":10}'></div>.
4. עיצוב כללי: השתמש בתגיות HTML תקניות: <h1>, <h2>, <p>, <ul>, <li>, <strong>, <em>.
5. שפה: עברית בלבד (למעט מונחים טכניים הכרחיים באנגלית/מתמטיקה). 
6. איכות הטקסט: הקפד על עברית תקנית ונקייה. אל תוסיף תווים משובשים, חרטוטים או טקסט אקראי באנגלית/ג'יבריש.
7. ללא ברכות פתיחה או סיום.
`;

const TEACHER_SYSTEM_INSTRUCTION = `אתה מורה פרטי מומחה, סבלני ומעודד במערכת החינוך הישראלית. 
תפקידך לעזור לתלמידים להבין חומר לימודי בצורה מעמיקה. 
השתמש בעברית תקנית אך נגישה. 
${TIPTAP_AI_INSTRUCTION}
תמיד התאם את רמת התוכן לכיתה המבוקשת.`;

export const generateClassroomAnalytics = async (
  className: string,
  subject: string,
  materials: ClassroomMaterial[]
): Promise<{ focus: string; strengths: string; recommendations: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const dataSummary = materials.map(m => ({
    title: m.title,
    type: m.type,
    submissionsCount: m.submissions?.length || 0,
    averageScore: m.submissions && m.submissions.length > 0 
      ? Math.round(m.submissions.reduce((acc, s) => acc + (s.aiScore || 0), 0) / m.submissions.length)
      : 'N/A'
  }));

  const prompt = `נתח את נתוני הכיתה הבאים והפק 3 תובנות פדגוגיות ממוקדות:
  כיתה: ${className}
  מקצוע: ${subject}
  נתוני מטלות ומבחנים: ${JSON.stringify(dataSummary)}
  
  החזר JSON בעברית עם המפתחות:
  - focus: מה הנושא המרכזי שהכיתה מתקשה בו על סמך הציונים?
  - strengths: באילו נושאים או סוגי מטלות הכיתה מצטיינת?
  - recommendations: 2-3 המלצות פרקטיות למורה להמשך (למשל: תגבור נושא מסוים, שליחת מטלת חזרה).
  היה ספציפי לשמות המטלות שסופקו. השתמש בעברית בלבד.`;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      systemInstruction: "אתה יועץ אנליטי למורים. נתח נתוני הישגים בצורה קרה ומדויקת אך הגש אותם בצורה פדגוגית בונה. עברית בלבד.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          focus: { type: Type.STRING },
          strengths: { type: Type.STRING },
          recommendations: { type: Type.STRING }
        },
        required: ["focus", "strengths", "recommendations"]
      }
    }
  });

  return JSON.parse(response.text || "{}");
};

export const checkExamWithRubric = async (
  studentImageData: string,
  studentMime: string,
  rubricImageData: string | null,
  rubricMime: string | null,
  rubricText: string | null
): Promise<ExamCheckResult> => {
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
      החזר תוצאה במבנה JSON הבא בעברית בלבד:
      - finalScore: ציון סופי משוער (0-100).
      - overallFeedback: משוב כללי למורה ולתלמיד.
      - questionsAnalysis: מערך של אובייקטים לכל שאלה שזוהתה.`
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
      systemInstruction: "אתה בודק מבחנים מקצועי. השתמש בעברית בלבד. היה מדויק והוגן.",
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
          החזר את התוצאה במבנה JSON הבא בעברית בלבד. אל תוסיף תווים משובשים או טקסט באנגלית מיותר.`,
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `בדוק את התשובה של התלמיד לשאלה הבאה.
    השאלה: ${questionText}
    תשובת המודל האידיאלית: ${modelAnswer}
    תשובת התלמיד: ${studentAnswer}
    
    החזר ציון בין 0 ל-100 ומשוב בונה בעברית בלבד. השתמש ב-math-node לנוסחאות. אל תוסיף חרטוטים או טקסט באנגלית.`,
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const subjectsStr = Object.values(Subject).join(", ");
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `צור מערך שיעור מפורט למורה על הנושא: ${topic} עבור ${grade}.
    סווג את השיעור לאחד מהמקצועות הבאים בלבד: ${subjectsStr}.
    מידע נוסף: ${additionalInfo}
    ${includeHomework ? "כלול בסוף המערך הצעות לשיעורי בית." : "אל תכלול שיעורי בית."}
    ${includeGroupActivity ? "כלול פעילות קבוצתית אינטראקטיבית." : "אל תכלול פעילות קבוצתית."}
    אנא כלול לפחות שרטוט גיאומטרי או אנליטי אחד אם הנושא מאפשר זאת (באמצעות התגיות המיוחדות שלנו).
    חשוב מאוד: אל תוסיף שום טקסט משובש, חרטוטים באנגלית או סימנים אקראיים. כתוב בעברית נקייה ומקצועית בלבד.
    `,
    config: {
      systemInstruction: TEACHER_SYSTEM_INSTRUCTION,
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = type === 'INFOGRAPHIC' 
    ? `הפוך את מערך השיעור הבא לנתונים עבור אינפוגרפיקה לימודית מעוצבת. 
       כלול כותרת, סיכום קצר, 4 נקודות מפתח עם אייקונים (brain, star, rocket, award), ונתונים סטטיסטיים מעניינים.
       השתמש בעברית נקייה בלבד ללא חרטוטים.
       תוכן המערך: ${JSON.stringify(lessonPlan)}`
    : `צור מצגת לימודית מקצועית המבוססת על מערך השיעור המצורף.
       על המצגת לכלול בדיוק 6-8 שקופיות.
       השתמש בעברית בלבד. גוון במבנה השקופיות! 
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
      systemInstruction: "אתה עוזר ויזואלי למורים. השתמש בעברית בלבד ללא חרטוטים או טקסט באנגלית.",
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const promptText = `צור תוכנית למידה מקיפה למבחן ב${subject} לכיתה ${grade} בנושא ${topic} למשך ${daysCount} ימים.
    עבור כל יום (מ-1 עד ${daysCount}) צור תוכן בעברית נקייה בלבד. 
    חשוב מאוד: אל תוסיף שום חרטוטים, טקסט אקראי באנגלית או סימנים לא קשורים.`;

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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `כתוב סיכום HTML מקיף ב${subject} עבור ${grade} על הנושא: ${topic}. השתמש בעברית נקייה בלבד ללא חרטוטים או טקסט באנגלית.`,
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `ייצר ${count} שאלות תרגול בHTML עבור ${subject} לכיתה ${grade}. נושא: ${topic || 'כללי'}. עברית בלבד ללא חרטוטים.`;

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
    contents: `נתח את היסטוריית הלמידה והפק תובנות בעברית בלבד. ${JSON.stringify(historyData)}`,
    config: {
      systemInstruction: "אתה יועץ פדגוגי. עברית נקייה בלבד.",
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
      systemInstruction: `${TEACHER_SYSTEM_INSTRUCTION} ${contextStr} השתמש בעברית נקייה ללא חרטוטים.`
    },
    history: history
  });

  const result = await chat.sendMessageStream({ message: parts });
  return result;
};

export const generateLessonContent = async (subject: Subject | string, grade: Grade, courseTitle: string, day: number): Promise<DailyLesson> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: `צור תוכן שיעור HTML עבור היום ה-${day} של הקורס "${courseTitle}" ב${subject} לכיתה ${grade}. עברית נקייה ללא חרטוטים.`,
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

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `הצע 4 נושאי לימוד עיקריים עבור המקצוע "${subject}" לרמת ${grade}. החזר JSON בלבד בעברית.`,
      config: {
        systemInstruction: "אתה יועץ פדגוגי. הצע נושאי לימוד רלוונטיים ומעניינים. עברית בלבד.",
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
