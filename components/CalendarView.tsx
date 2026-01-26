
import React, { useMemo } from 'react';
import { Calendar, Clock, AlertCircle, CheckCircle2, ChevronLeft, Bell, BookOpen, ListChecks, ClipboardList, ArrowRight } from 'lucide-react';
import { Classroom, User, ClassroomMaterial, MaterialType } from '../types.ts';

interface CalendarViewProps {
  user: User;
  onBack: () => void;
  onOpenClassroom: (classId: string) => void;
}

const DB_KEY = 'lumdim_global_database_v1';

const CalendarView: React.FC<CalendarViewProps> = ({ user, onBack, onOpenClassroom }) => {
  const events = useMemo(() => {
    try {
      const data = localStorage.getItem(DB_KEY);
      if (!data) return [];
      const allClassrooms = JSON.parse(data) as Classroom[];
      
      // Filter only classrooms the student is in
      const myClassrooms = allClassrooms.filter(c => c.studentIds?.includes(user.id));
      
      const allEvents: any[] = [];
      const now = Date.now();

      myClassrooms.forEach(classroom => {
        classroom.materials.forEach(material => {
          // Check if it's a date-related item
          const eventDateStr = material.dueDate || material.testDate;
          if (eventDateStr) {
            const eventTime = new Date(eventDateStr).getTime();
            const isCompleted = material.submissions?.some(s => s.studentId === user.id);
            const isOverdue = !isCompleted && eventTime < now;

            allEvents.push({
              ...material,
              eventTime,
              classroomName: classroom.name,
              classId: classroom.id,
              subject: classroom.subject,
              isCompleted,
              isOverdue
            });
          }
        });
      });

      // Sort by date (ascending) using descriptive parameter names to prevent ReferenceErrors
      return allEvents.sort((itemA, itemB) => itemA.eventTime - itemB.eventTime);
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [user.id]);

  const groupedEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
      today: events.filter(e => e.eventTime >= today.getTime() && e.eventTime < tomorrow.getTime()),
      upcoming: events.filter(e => e.eventTime >= tomorrow.getTime() && e.eventTime < nextWeek.getTime()),
      later: events.filter(e => e.eventTime >= nextWeek.getTime()),
      overdue: events.filter(e => e.isOverdue)
    };
  }, [events]);

  const getIcon = (type: MaterialType) => {
    switch(type) {
      case 'TEST': return <ListChecks size={20} />;
      case 'ASSIGNMENT': return <ClipboardList size={20} />;
      case 'UPCOMING_TEST': return <Bell size={20} />;
      default: return <BookOpen size={20} />;
    }
  };

  const getStatusColor = (e: any) => {
    if (e.isCompleted) return 'bg-green-50 text-green-600 border-green-100';
    if (e.isOverdue) return 'bg-red-50 text-red-600 border-red-100';
    return 'bg-blue-50 text-blue-600 border-blue-100';
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in pb-20 text-right" dir="rtl">
      <div className="flex items-center gap-4 mb-10">
        <button onClick={onBack} className="p-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-colors">
          <ArrowRight size={20} className="text-gray-600" />
        </button>
        <div>
          <h2 className="text-3xl font-black text-gray-900">היומן שלי</h2>
          <p className="text-gray-500 font-bold">כל המטלות והמבחנים מכל הכיתות במקום אחד</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100 flex flex-col items-center">
            <Calendar size={64} className="text-gray-200 mb-6" />
            <h3 className="text-2xl font-black text-gray-800 mb-2">אין אירועים קרובים</h3>
            <p className="text-gray-400 font-bold max-w-sm">היומן שלך ריק כרגע. ברגע שהמורים שלך יפרסמו מטלות או מבחנים בכיתה, הם יופיעו כאן אוטומטית.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Overdue Section */}
          {groupedEvents.overdue.length > 0 && (
            <section className="animate-slide-up">
              <div className="flex items-center gap-2 mb-6 text-red-600">
                <AlertCircle size={24} />
                <h3 className="text-xl font-black uppercase tracking-tight">באיחור (חובה להגיש!)</h3>
              </div>
              <div className="grid gap-4">
                {groupedEvents.overdue.map((e, i) => (
                  <EventCard key={i} event={e} onAction={() => onOpenClassroom(e.classId)} getIcon={getIcon} getStatusColor={getStatusColor} />
                ))}
              </div>
            </section>
          )}

          {/* Today Section */}
          <section className="animate-slide-up">
            <div className="flex items-center gap-2 mb-6 text-blue-600">
              <Clock size={24} />
              <h3 className="text-xl font-black uppercase tracking-tight">היום</h3>
            </div>
            {groupedEvents.today.length > 0 ? (
              <div className="grid gap-4">
                {groupedEvents.today.map((e, i) => (
                  <EventCard key={i} event={e} onAction={() => onOpenClassroom(e.classId)} getIcon={getIcon} getStatusColor={getStatusColor} />
                ))}
              </div>
            ) : (
              <p className="text-gray-400 font-bold pr-2">אין משימות להיום. זמן טוב לחזור על חומרים!</p>
            )}
          </section>

          {/* This Week Section */}
          {groupedEvents.upcoming.length > 0 && (
            <section className="animate-slide-up">
              <div className="flex items-center gap-2 mb-6 text-indigo-600">
                <Calendar size={24} />
                <h3 className="text-xl font-black uppercase tracking-tight">השבוע הקרוב</h3>
              </div>
              <div className="grid gap-4">
                {groupedEvents.upcoming.map((e, i) => (
                  <EventCard key={i} event={e} onAction={() => onOpenClassroom(e.classId)} getIcon={getIcon} getStatusColor={getStatusColor} />
                ))}
              </div>
            </section>
          )}

          {/* Later Section */}
          {groupedEvents.later.length > 0 && (
            <section className="animate-slide-up">
              <div className="flex items-center gap-2 mb-6 text-gray-400">
                <ChevronLeft size={24} />
                <h3 className="text-xl font-black uppercase tracking-tight">בהמשך</h3>
              </div>
              <div className="grid gap-4">
                {groupedEvents.later.map((e, i) => (
                  <EventCard key={i} event={e} onAction={() => onOpenClassroom(e.classId)} getIcon={getIcon} getStatusColor={getStatusColor} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

const EventCard = ({ event, onAction, getIcon, getStatusColor }: any) => {
  const date = new Date(event.eventTime);
  const formattedDate = date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
  const formattedTime = date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`group bg-white p-6 rounded-[2rem] border-2 transition-all hover:shadow-lg ${event.isCompleted ? 'border-gray-50 opacity-70' : 'border-gray-100 hover:border-blue-200'}`}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-2xl ${getStatusColor(event)}`}>
            {getIcon(event.type)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-black text-primary bg-blue-50 px-2 py-0.5 rounded uppercase tracking-widest">{event.subject}</span>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">• {event.classroomName}</span>
            </div>
            <h4 className="text-xl font-black text-gray-900 group-hover:text-primary transition-colors">{event.title}</h4>
            <div className="flex items-center gap-4 mt-2 text-sm font-bold text-gray-500">
              <div className="flex items-center gap-1.5"><Calendar size={14}/><span>{formattedDate}</span></div>
              <div className="flex items-center gap-1.5"><Clock size={14}/><span>{formattedTime}</span></div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {event.isCompleted ? (
            <div className="flex items-center gap-2 text-green-600 font-black text-sm bg-green-50 px-4 py-2 rounded-xl">
              <CheckCircle2 size={18} />
              <span>הוגש</span>
            </div>
          ) : (
            <button 
              onClick={onAction}
              className="w-full md:w-auto bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-100 group-hover:-translate-y-1"
            >
              <span>עבור לכיתה</span>
              <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;
