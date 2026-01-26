import React from 'react';
import { Check, X, Crown, Zap, BookOpen, BrainCircuit, Shield, Sparkles, ArrowRight, Calendar } from 'lucide-react';

interface SubscriptionViewProps {
  onBack: () => void;
  onSubscribe: () => void;
  isPro: boolean;
}

const SubscriptionView: React.FC<SubscriptionViewProps> = ({ onBack, onSubscribe, isPro }) => {
  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 animate-fade-in pb-20">
      <div className="mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-6"
        >
          <ArrowRight size={20} />
          <span>חזרה לאפליקציה</span>
        </button>
        
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-1.5 rounded-full text-sm font-bold mb-4">
             <Crown size={16} fill="currentColor" />
             <span>שדרג את הלמידה שלך</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">בחר את המסלול המתאים לך</h2>
          <p className="text-xl text-gray-500 leading-relaxed">
            הצטרף לאלפי תלמידים שכבר לומדים חכם יותר עם Lomdim AI Pro.
            קבל גישה לכלים מתקדמים שיעזרו לך להצליח בלימודים ובמבחנים.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mt-12 items-start">
        {/* Free Plan */}
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm relative overflow-hidden">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">לומד מתחיל</h3>
            <p className="text-gray-500">הבסיס ללמידה ותרגול יומיומי</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-4xl font-bold text-gray-900">0₪</span>
              <span className="text-gray-500 mr-2">/ לחודש</span>
            </div>
          </div>

          <ul className="space-y-4 mb-8">
            <li className="flex items-center gap-3 text-gray-700">
              <div className="bg-green-100 p-1 rounded-full text-green-600"><Check size={14} strokeWidth={3} /></div>
              <span>תרגול שאלות בסיסי בכל המקצועות</span>
            </li>
            <li className="flex items-center gap-3 text-gray-700">
              <div className="bg-green-100 p-1 rounded-full text-green-600"><Check size={14} strokeWidth={3} /></div>
              <span>סיכומים קצרים (עד 300 מילים)</span>
            </li>
            <li className="flex items-center gap-3 text-gray-700">
              <div className="bg-green-100 p-1 rounded-full text-green-600"><Check size={14} strokeWidth={3} /></div>
              <span>צ'אט בסיסי עם המורה הפרטי</span>
            </li>
            <li className="flex items-center gap-3 text-gray-400">
              <div className="bg-gray-100 p-1 rounded-full text-gray-400"><X size={14} strokeWidth={3} /></div>
              <span>כולל פרסומות</span>
            </li>
            <li className="flex items-center gap-3 text-gray-400">
              <div className="bg-gray-100 p-1 rounded-full text-gray-400"><X size={14} strokeWidth={3} /></div>
              <span>ללא הכנה אישית למבחנים</span>
            </li>
          </ul>

          <button 
             onClick={onBack}
             className="w-full py-4 rounded-xl border-2 border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-colors"
          >
            המשך בחינם
          </button>
        </div>

        {/* Pro Plan */}
        <div className="bg-gray-900 rounded-3xl p-8 border border-gray-800 shadow-2xl relative overflow-hidden transform md:-translate-y-4">
          {/* Decorative gradients */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
          
          <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 to-orange-500 py-1.5 text-center text-xs font-black text-white uppercase tracking-widest">
            הכי משתלם
          </div>

          <div className="mb-8 relative z-10 pt-4">
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              Lomdim Pro <Crown className="text-yellow-400" fill="currentColor" size={24} />
            </h3>
            <p className="text-gray-400">חווית למידה מושלמת ללא גבולות</p>
            <div className="mt-6 flex items-baseline">
              <span className="text-5xl font-bold text-white">10$</span>
              <span className="text-gray-400 mr-2">/ לחודש</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">מתחדש אוטומטית. ניתן לביטול בכל עת.</p>
          </div>

          <ul className="space-y-5 mb-10 relative z-10">
            <li className="flex items-center gap-3 text-white">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded-full text-white shadow-lg"><Calendar size={14} strokeWidth={3} /></div>
              <span className="font-medium underline decoration-yellow-400/30">מערכת הכנה אישית למבחנים (AI)</span>
            </li>
            <li className="flex items-center gap-3 text-white">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded-full text-white shadow-lg"><BrainCircuit size={14} strokeWidth={3} /></div>
              <span className="font-medium">למידה חכמה המבוססת על ההיסטוריה שלך</span>
            </li>
            <li className="flex items-center gap-3 text-white">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded-full text-white shadow-lg"><Zap size={14} strokeWidth={3} /></div>
              <span className="font-medium">חוויה נקייה לחלוטין מפרסומות</span>
            </li>
             <li className="flex items-center gap-3 text-white">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-1 rounded-full text-white shadow-lg"><Sparkles size={14} strokeWidth={3} /></div>
              <span className="font-medium">כמות בלתי מוגבלת של סיכומים ומבחנים</span>
            </li>
          </ul>

          <button 
             onClick={onSubscribe}
             disabled={isPro}
             className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold text-lg hover:shadow-lg hover:shadow-orange-500/30 transition-all transform hover:-translate-y-1 relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPro ? 'אתה כבר מנוי Pro!' : 'שדרג ל-Pro עכשיו'}
          </button>
        </div>
      </div>
      
      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mt-16">
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
               <Calendar size={32} />
            </div>
            <h4 className="font-bold text-lg text-gray-800 mb-2">הכנה למבחנים</h4>
            <p className="text-sm text-gray-500">בנה תוכנית לימודים אישית לכמה ימים לפני המבחן, כולל העלאת סיכומי המורה וניתוחם.</p>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-purple-600">
               <BrainCircuit size={32} />
            </div>
            <h4 className="font-bold text-lg text-gray-800 mb-2">AI מותאם אישית</h4>
            <p className="text-sm text-gray-500">המערכת מנתחת את הטעויות שלך בהיסטוריה ובונה לך מבחנים מותאמים אישית לשיפור נקודות החולשה.</p>
         </div>
         <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
            <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
               <Shield size={32} />
            </div>
            <h4 className="font-bold text-lg text-gray-800 mb-2">ללא הסחות דעת</h4>
            <p className="text-sm text-gray-500">למידה רציפה ונקייה ללא באנרים, פרסומות קופצות או המתנות מיותרות.</p>
         </div>
      </div>
    </div>
  );
};

export default SubscriptionView;