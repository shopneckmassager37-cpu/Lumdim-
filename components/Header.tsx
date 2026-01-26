import React, { useState } from 'react';
import { GraduationCap, History, ChevronDown, Settings, LayoutGrid, User, School, LogOut, UserCircle, Trophy, CalendarDays, FolderOpen, Bell } from 'lucide-react';
import { Grade, UserRole, UserSettings } from '../types';

interface HeaderProps {
  onHomeClick: () => void;
  onHistoryClick: () => void;
  onClassroomClick: () => void;
  onAchievementsClick: () => void;
  onCalendarClick: () => void;
  onNotificationsClick: () => void;
  onLogout: () => void;
  onProfileClick: () => void;
  selectedGrade: Grade | null;
  onChangeGrade: () => void;
  userName?: string | null;
  userPhoto?: string;
  userEmail?: string;
  userRole?: UserRole;
  userSettings?: UserSettings;
  unreadCount?: number;
}

const Header: React.FC<HeaderProps> = ({ 
  onHomeClick, 
  onHistoryClick, 
  onClassroomClick,
  onAchievementsClick,
  onCalendarClick,
  onNotificationsClick,
  onLogout,
  onProfileClick,
  selectedGrade, 
  onChangeGrade, 
  userName,
  userPhoto,
  userEmail,
  userRole,
  userSettings,
  unreadCount = 0
}) => {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const isTeacher = userRole === 'TEACHER';
  const notificationsEnabled = userSettings?.notificationsEnabled ?? true;

  return (
    <header className="bg-white shadow-md sticky top-0 z-50 no-print transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <button 
            onClick={onHomeClick}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-primary p-2 rounded-lg text-white">
              < GraduationCap size={24} />
            </div>
            <div className="text-right">
              <h1 className="text-xl font-bold text-gray-900 leading-tight">Lumdim</h1>
              <p className="text-[10px] text-gray-500">{isTeacher ? 'מרחב עבודה פדגוגי' : 'המורה החכם שלך'}</p>
            </div>
          </button>
          
          <div className="flex items-center gap-1 md:gap-3">
             {notificationsEnabled && (
                <button
                  onClick={onNotificationsClick}
                  className="relative p-2 text-gray-400 hover:text-primary hover:bg-gray-100 rounded-full transition-all mr-1"
                  title="התראות"
                >
                   <Bell size={22} />
                   {unreadCount > 0 && (
                     <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white">
                        {unreadCount}
                     </span>
                   )}
                </button>
             )}

             {!isTeacher && (
                <>
                  <button
                    onClick={onAchievementsClick}
                    className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 px-2 py-1 rounded-lg transition-colors"
                    title="ההישגים שלי"
                  >
                    <Trophy size={18} className="md:ml-2" />
                    <span className="hidden md:inline">הישגים</span>
                  </button>

                  <button
                    onClick={onCalendarClick}
                    className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-primary hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                    title="היומן שלי"
                  >
                    <CalendarDays size={18} className="md:ml-2" />
                    <span className="hidden md:inline">יומן</span>
                  </button>
                </>
             )}

             <button
               onClick={onClassroomClick}
               className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-primary hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
               title="הכיתה שלי"
             >
                <School size={18} className="md:ml-2" />
                <span className="hidden md:inline">כיתה</span>
             </button>

             <button
               onClick={onHomeClick}
               className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-primary hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
               title={isTeacher ? "לוח בקרה" : "מקצועות"}
             >
                <LayoutGrid size={18} className="md:ml-2" />
                <span className="hidden md:inline">{isTeacher ? 'לוח בקרה' : 'מקצועות'}</span>
             </button>

             <button
               onClick={onHistoryClick}
               className="flex flex-col md:flex-row items-center text-[10px] md:text-sm text-gray-500 hover:text-primary hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors"
               title={isTeacher ? "מאגר חומרים" : "היסטוריית תרגול"}
             >
                {isTeacher ? <FolderOpen size={18} className="md:ml-2" /> : <History size={18} className="md:ml-2" />}
                <span className="hidden md:inline">{isTeacher ? 'מאגר חומרים' : 'היסטוריה'}</span>
             </button>

            {/* Profile Section */}
            <div className="flex items-center border-r border-gray-100 pr-1 md:pr-4 mr-1 md:mr-2 gap-1 md:gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center gap-1 p-1 hover:bg-gray-100 rounded-full transition-all"
                >
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold overflow-hidden">
                    {userPhoto ? (
                      <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      userName ? userName[0] : <User size={16} />
                    )}
                  </div>
                  <ChevronDown size={12} className={`text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
                </button>

                {showProfileMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowProfileMenu(false)}></div>
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20 animate-fade-in text-right">
                      <div className="px-4 py-3 border-b border-gray-50 mb-1">
                        <p className="text-sm font-bold text-gray-900 truncate">{userName || (isTeacher ? 'מורה' : 'תלמיד')}</p>
                        <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                      </div>
                      
                      <button 
                        onClick={() => { onProfileClick(); setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors"
                      >
                        <Settings size={16} />
                        <span>פרופיל והגדרות</span>
                      </button>

                      {!isTeacher && (
                        <button 
                            onClick={() => { onChangeGrade(); setShowProfileMenu(false); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 hover:text-primary transition-colors"
                        >
                            <LayoutGrid size={16} />
                            <span>החלפת כיתה ({selectedGrade || 'לא נבחרה'})</span>
                        </button>
                      )}

                      <div className="border-t border-gray-50 mt-1 pt-1">
                        <button 
                          onClick={() => { onLogout(); setShowProfileMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <LogOut size={16} />
                          <span>התנתק</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
