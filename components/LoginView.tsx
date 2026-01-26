
import React, { useState, useEffect } from 'react';
import { GraduationCap, User, ArrowRight, BookOpen, Presentation, Mail, Lock, UserPlus, LogIn, AlertCircle, UserCircle, Loader2 } from 'lucide-react';
import { User as UserType, UserRole } from '../types';

const USERS_DB_KEY = 'lumdim_users_database';
// הערה: יש להחליף את זה ב-Client ID האמיתי שלך מ-Google Cloud Console
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";

interface LoginViewProps {
  onLogin: (user: UserType) => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('STUDENT');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // פונקציה לפענוח ה-JWT שגוגל מחזירה ללא ספריות חיצוניות
  const parseJwt = (token: string) => {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (e) {
      return null;
    }
  };

  const handleCallbackResponse = (response: any) => {
    setIsLoading(true);
    const userObject = parseJwt(response.credential);
    
    if (userObject) {
      const googleUser: UserType = {
        id: 'google-' + userObject.sub,
        name: userObject.name,
        email: userObject.email,
        role: 'STUDENT', // ברירת מחדל למתחברים חברתית
        provider: 'google',
        photoUrl: userObject.picture
      };
      
      // שמירה במאגר המשתמשים המקומי אם לא קיים
      const users = getUsers();
      if (!users.some(u => u.email === googleUser.email)) {
        localStorage.setItem(USERS_DB_KEY, JSON.stringify([...users, googleUser]));
      }

      setTimeout(() => {
        onLogin(googleUser);
        setIsLoading(false);
      }, 500);
    } else {
      setError("שגיאה בהתחברות עם Google");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    /* global google */
    if (typeof window !== 'undefined' && (window as any).google) {
      const google = (window as any).google;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCallbackResponse,
        cancel_on_tap_outside: false
      });

      google.accounts.id.renderButton(
        document.getElementById("googleSignInDiv"),
        { 
          theme: "outline", 
          size: "large", 
          width: "100%",
          text: "continue_with",
          shape: "pill",
          locale: "he"
        }
      );
    }
  }, []);

  const getUsers = (): UserType[] => {
    const data = localStorage.getItem(USERS_DB_KEY);
    return data ? JSON.parse(data) : [];
  };

  const saveUser = (user: UserType) => {
    const users = getUsers();
    localStorage.setItem(USERS_DB_KEY, JSON.stringify([...users, user]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const users = getUsers();

    if (mode === 'REGISTER') {
      if (!name.trim() || !email.trim() || !password.trim()) {
        setError('נא למלא את כל השדות');
        return;
      }

      if (users.some(u => u.email === email.toLowerCase())) {
        setError('האימייל הזה כבר רשום במערכת');
        return;
      }

      const newUser: UserType = {
        id: 'u-' + Math.random().toString(36).substr(2, 9),
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password,
        role: role,
        provider: 'email'
      };

      saveUser(newUser);
      onLogin(newUser);
    } else {
      const user = users.find(u => u.email === email.toLowerCase() && u.password === password);
      
      if (user) {
        onLogin(user);
      } else {
        setError('אימייל או סיסמה שגויים');
      }
    }
  };

  const handleGuestLogin = (guestRole: UserRole) => {
    const guestUser: UserType = {
      id: 'guest-' + Math.random().toString(36).substr(2, 9),
      name: guestRole === 'TEACHER' ? 'מורה אורח' : 'תלמיד אורח',
      email: `guest_${guestRole.toLowerCase()}@lumdim.ai`,
      role: guestRole,
      provider: 'guest'
    };
    onLogin(guestUser);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-blue-50 via-white to-purple-50 font-sans">
      <div className="max-w-xl w-full bg-white rounded-[3rem] shadow-2xl p-10 md:p-14 border border-gray-100 relative overflow-hidden animate-fade-in">
        
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-100 rounded-full opacity-50 blur-3xl"></div>
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-100 rounded-full opacity-50 blur-3xl"></div>

        <div className="relative z-10 text-center">
          <div className="bg-primary w-20 h-20 rounded-[1.75rem] flex items-center justify-center mx-auto mb-6 text-white shadow-lg rotate-3">
            < GraduationCap size={44} />
          </div>
          
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Lumdim AI</h1>
          <p className="text-lg text-gray-500 mb-8 font-medium">
            {mode === 'LOGIN' ? 'ברוך השב ללמידה חכמה' : 'הצטרף לקהילת הלומדים שלנו'}
          </p>

          {/* Real Google Login Button Container */}
          <div className="mb-6 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center rounded-2xl">
                 <Loader2 className="animate-spin text-primary" size={24} />
              </div>
            )}
            <div id="googleSignInDiv" className="w-full"></div>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-100"></div>
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">או באמצעות אימייל</span>
            <div className="flex-1 h-px bg-gray-100"></div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold animate-shake">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'REGISTER' && (
              <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-4">
                <button
                  type="button"
                  onClick={() => setRole('STUDENT')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${role === 'STUDENT' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <BookOpen size={18} />
                  <span className="text-sm">אני תלמיד</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('TEACHER')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black transition-all ${role === 'TEACHER' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <Presentation size={18} />
                  <span className="text-sm">אני מורה</span>
                </button>
              </div>
            )}

            {mode === 'REGISTER' && (
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="שם מלא"
                  className="w-full p-4 pr-12 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white outline-none transition-all font-bold text-right"
                  required
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              </div>
            )}

            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="כתובת אימייל"
                className="w-full p-4 pr-12 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white outline-none transition-all font-bold text-right"
                required
              />
              <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="סיסמה"
                className="w-full p-4 pr-12 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white outline-none transition-all font-bold text-right"
                required
              />
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 hover:bg-black text-white font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 text-xl shadow-xl hover:-translate-y-1"
            >
              <span>{mode === 'LOGIN' ? 'התחבר עכשיו' : 'צור חשבון'}</span>
              {mode === 'LOGIN' ? <LogIn size={24} className="rotate-180" /> : <UserPlus size={24} />}
            </button>
          </form>

          <div className="mt-8 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleGuestLogin('STUDENT')}
                className="bg-blue-50 text-blue-600 hover:bg-blue-100 font-black py-3 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 border border-blue-100 shadow-sm"
              >
                <BookOpen size={20} />
                <span className="text-[10px] uppercase tracking-widest">אורח תלמיד</span>
              </button>
              <button 
                onClick={() => handleGuestLogin('TEACHER')}
                className="bg-purple-50 text-purple-600 hover:bg-purple-100 font-black py-3 rounded-2xl transition-all flex flex-col items-center justify-center gap-1 border border-purple-100 shadow-sm"
              >
                <Presentation size={20} />
                <span className="text-[10px] uppercase tracking-widest">אורח מורה</span>
              </button>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <p className="text-gray-500 font-bold text-sm">
                {mode === 'LOGIN' ? 'עדיין אין לך חשבון?' : 'כבר יש לך חשבון?'}
                <button 
                  onClick={() => { setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN'); setError(null); }}
                  className="text-primary font-black mr-2 hover:underline"
                >
                  {mode === 'LOGIN' ? 'הירשם כאן' : 'התחבר כאן'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
