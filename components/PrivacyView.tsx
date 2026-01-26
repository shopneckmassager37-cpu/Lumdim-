
import React from 'react';
import { Shield, ArrowRight, Lock, Eye, FileText, UserCheck, HelpCircle } from 'lucide-react';

interface PrivacyViewProps {
  onBack: () => void;
}

const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack }) => {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-8 group"
      >
        <div className="p-2 bg-white rounded-full border border-gray-200 group-hover:border-primary transition-all">
            <ArrowRight size={20} />
        </div>
        <span className="font-bold">חזרה</span>
      </button>

      <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gray-900 p-10 md:p-16 text-center text-white relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
                <div className="bg-white/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 backdrop-blur-md border border-white/20">
                    <Shield size={40} className="text-primary" />
                </div>
                <h1 className="text-3xl md:text-4xl font-black mb-4">מדיניות פרטיות – Lumdim</h1>
                <p className="text-gray-400 font-medium">עודכן לאחרונה: 30.12.2025</p>
            </div>
        </div>

        <div className="p-8 md:p-16 space-y-12">
            <section className="prose prose-blue max-w-none text-right" dir="rtl">
                <p className="text-lg text-gray-700 leading-relaxed mb-12">
                    ברוכים הבאים ל-Lumdim. הפרטיות שלכם חשובה לנו מאוד. מדיניות זו מסבירה כיצד אנו אוספים, משתמשים ושומרים על המידע שלכם בעת השימוש באתר או באפליקציה שלנו.
                </p>

                <div className="space-y-10">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">1. המידע שאנו אוספים</h2>
                        <p className="mb-4">כדי לספק לכם שירותי עזרה בלימודים מבוססי AI, אנו אוספים את סוגי המידע הבאים:</p>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li><strong>מידע אישי שאתם מספקים:</strong> שם, כתובת אימייל, פרטי התחברות (כגון דרך Google) ופרטי פרופיל.</li>
                            <li><strong>תוכן משתמש:</strong> שאלות, טקסטים, קבצים או נתונים שאתם מעלים ל-AI לצורך קבלת עזרה בלימודים.</li>
                            <li><strong>מידע טכני:</strong> כתובת IP, סוג דפדפן, היסטוריית שימוש באתר ונתוני עוגיות (Cookies) לשיפור חוויית המשתמש.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">2. כיצד אנו משתמשים במידע</h2>
                        <p className="mb-4">אנו משתמשים במידע שנאסף למטרות הבאות:</p>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li><strong>מתן השירות:</strong> עיבוד השאלות שלכם והפקת תשובות מותאמות אישית באמצעות בינה מלאכותית.</li>
                            <li><strong>שיפור המערכת:</strong> למידה מהאינטראקציות (באופן אנונימי ככל הניתן) כדי לשפר את הדיוק של ה-AI.</li>
                            <li><strong>תקשורת:</strong> שליחת עדכונים על השירות, מענה לתמיכה טכנית והודעות מנהלתיות.</li>
                            <li><strong>אבטחה:</strong> מניעת הונאות ושמירה על תקינות הפלטפורמה.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">3. שיתוף מידע עם צדדים שלישיים</h2>
                        <p className="mb-4">אנו לא מוכרים את המידע האישי שלכם לצדדים שלישיים. עם זאת, אנו עשויים לשתף מידע במקרים הבאים:</p>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li><strong>ספקי שירותי AI:</strong> המידע עשוי לעבור עיבוד דרך מודלים של חברות צד ג' (כמו Google). המידע המועבר משמש רק לצורך הפקת התשובה.</li>
                            <li><strong>דרישות חוקיות:</strong> אם נידרש לכך על פי חוק או צו שיפוטי.</li>
                            <li><strong>ספקי שירותים טכניים:</strong> כגון שירותי אחסון ענן (AWS/Google Cloud) או כלי אנליטיקה.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">4. שמירת נתונים ואבטחה</h2>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li>אנו נוקטים באמצעי אבטחה מקובלים כדי להגן על המידע שלכם. עם זאת, זכרו כי אף מערכת אינה חסינה לחלוטין.</li>
                            <li>התוכן שתעלו יישמר כל עוד חשבונכם פעיל או בהתאם לצורך לספק את השירות.</li>
                            <li>ניתן לבקש את מחיקת המידע האישי שלכם בכל עת דרך הגדרות החשבון או פנייה אלינו.</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">5. זכויות המשתמש</h2>
                        <p className="mb-4">זכותכם:</p>
                        <ul className="space-y-2 list-disc list-inside pr-4">
                            <li>לעיין במידע שנשמר עליכם.</li>
                            <li>לבקש תיקון של מידע לא מדויק.</li>
                            <li>לבקש מחיקה של המידע שלכם מהשרתים שלנו.</li>
                            <li>לבטל את הסכמתכם לשימוש בנתונים (דבר שעשוי להשבית חלק מהשירותים).</li>
                        </ul>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">6. שינויים במדיניות הפרטיות</h2>
                        <p>אנו עשויים לעדכן מדיניות זו מעת לעת. במידה ויבוצעו שינויים מהותיים, נעדכן אתכם באמצעות הודעה באתר או באימייל.</p>
                    </div>

                    <div>
                        <h2 className="text-xl font-black text-gray-900 mb-4 border-b pb-2">7. צרו קשר</h2>
                        <p>לכל שאלה בנושא פרטיות, ניתן לפנות אלינו בכתובת המייל המופיעה באתר.</p>
                    </div>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyView;
