
import React, { useState, useRef } from 'react';
import { X, User, Save, Camera, Trash2, Settings, UserCircle, Bell, Moon, Sun, Database, History, ShieldCheck } from 'lucide-react';
import { UserSettings } from '../types.ts';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  userName: string;
  userPhoto: string;
  userSettings?: UserSettings;
  onUpdate: (name: string, photoUrl: string, settings: UserSettings) => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, userName, userPhoto, userSettings, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SETTINGS'>('PROFILE');
  const [name, setName] = useState(userName);
  const [photo, setPhoto] = useState(userPhoto);
  
  const [settings, setSettings] = useState<UserSettings>(userSettings || {
    darkMode: false,
    notificationsEnabled: true,
    autoSaveDrafts: true,
    dataSaverMode: false
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    onUpdate(name, photo, settings);
    onClose();
  };

  const removePhoto = () => {
    setPhoto('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleSetting = (key: keyof UserSettings) => {
    if (typeof settings[key] === 'boolean') {
      setSettings({ ...settings, [key]: !settings[key] });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header Tabs */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex gap-1 p-1 bg-gray-200/50 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('PROFILE')}
                  className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activeTab === 'PROFILE' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <UserCircle size={18} />
                    <span>פרופיל</span>
                </button>
                <button 
                  onClick={() => setActiveTab('SETTINGS')}
                  className={`px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all ${activeTab === 'SETTINGS' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Settings size={18} />
                    <span>הגדרות</span>
                </button>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <X size={20} />
            </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 md:p-10 no-scrollbar">
            {activeTab === 'PROFILE' ? (
                <div className="animate-fade-in">
                    <div className="flex flex-col items-center mb-10">
                        <div className="relative group">
                            <div className="w-32 h-32 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-4xl font-black border-4 border-white shadow-xl overflow-hidden transition-transform group-hover:scale-105">
                                {photo ? (
                                  <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                  <span>{name ? name[0] : <User size={48} />}</span>
                                )}
                            </div>
                            <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="absolute bottom-0 right-0 p-3 bg-primary text-white rounded-full shadow-lg hover:bg-blue-600 transition-all transform hover:scale-110 border-4 border-white"
                              title="החלף תמונה"
                            >
                              <Camera size={20} />
                            </button>
                            {photo && (
                              <button 
                                onClick={removePhoto}
                                className="absolute top-0 left-0 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 border-2 border-white"
                                title="הסר תמונה"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handlePhotoUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />
                        <p className="mt-4 text-xs font-bold text-gray-400 uppercase tracking-widest">לחץ להחלפת תמונה</p>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-black text-gray-500 mb-3 text-right pr-2 uppercase tracking-tighter">שם מלא</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full p-5 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-primary focus:bg-white outline-none transition-all text-right font-bold text-lg shadow-inner"
                                placeholder="הקלד את השם שלך..."
                            />
                        </div>
                        
                        <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100">
                             <h4 className="font-black text-blue-900 mb-2 text-sm flex items-center gap-2"><ShieldCheck size={16}/> סטטוס חשבון</h4>
                             <p className="text-blue-700/70 text-xs font-bold leading-relaxed">החשבון שלך מאובטח ומחובר לסנכרון ענן אוטומטי. כל ההתקדמות שלך נשמרת.</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="animate-fade-in space-y-8">
                    <div className="space-y-6">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pr-1">העדפות ממשק ותפעול</h4>
                        
                        <div className="grid gap-4">
                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm">
                                        {settings.darkMode ? <Moon size={18}/> : <Sun size={18}/>}
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-800 text-sm">מצב כהה (Dark Mode)</h5>
                                        <p className="text-[10px] text-gray-400 font-bold">התאמת הממשק לשעות הלילה</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('darkMode')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.darkMode ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.darkMode ? 'left-1' : 'left-7'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm">
                                        <Bell size={18}/>
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-800 text-sm">התראות פעילות</h5>
                                        <p className="text-[10px] text-gray-400 font-bold">קבלת עדכונים על משימות ומבחנים</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('notificationsEnabled')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.notificationsEnabled ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notificationsEnabled ? 'left-1' : 'left-7'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm">
                                        <History size={18}/>
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-800 text-sm">שמירה אוטומטית של טיוטות</h5>
                                        <p className="text-[10px] text-gray-400 font-bold">שמירת שינויים בעורך תוך כדי עבודה</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('autoSaveDrafts')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.autoSaveDrafts ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.autoSaveDrafts ? 'left-1' : 'left-7'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-white rounded-lg text-gray-500 shadow-sm">
                                        <Database size={18}/>
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-800 text-sm">מצב חיסכון בנתונים</h5>
                                        <p className="text-[10px] text-gray-400 font-bold">צמצום תעבורת רשת בחיבורים איטיים</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => toggleSetting('dataSaverMode')}
                                    className={`w-12 h-6 rounded-full transition-all relative ${settings.dataSaverMode ? 'bg-primary' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.dataSaverMode ? 'left-1' : 'left-7'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-100 p-6 rounded-[2rem] text-center border border-gray-200">
                        <p className="text-gray-500 text-xs font-bold">גרסה: 1.1.2 (System Utility Update)</p>
                    </div>
                </div>
            )}
        </div>

        <div className="p-8 bg-gray-50/80 border-t border-gray-100 flex gap-4">
            <button 
                onClick={handleSave}
                className="flex-1 bg-gray-900 text-white py-5 rounded-2xl font-black text-xl shadow-xl hover:bg-black transition-all flex items-center justify-center gap-3 transform hover:-translate-y-1"
            >
                <Save size={24} />
                <span>שמור שינויים</span>
            </button>
            <button 
                onClick={onClose}
                className="px-8 bg-white border border-gray-200 text-gray-500 font-bold py-5 rounded-2xl hover:bg-gray-100 transition-all"
            >
                ביטול
            </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
