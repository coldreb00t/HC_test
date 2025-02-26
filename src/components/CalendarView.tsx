import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Plus, Calendar as CalendarIcon, List, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { WorkoutModal } from './WorkoutModal';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
}

interface Workout {
  id: string;
  client_id: string;
  start_time: string;
  end_time: string;
  title: string;
  client: Client;
}

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Определяем размер экрана и обновляем при изменении
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchWorkouts();
  }, [currentDate, viewMode]);

  const fetchWorkouts = async () => {
    let startDate, endDate;

    if (viewMode === 'month') {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else if (viewMode === 'week') {
      const curr = new Date(currentDate);
      const first = curr.getDate() - curr.getDay() + 1;
      const last = first + 6;
      startDate = new Date(curr.setDate(first));
      endDate = new Date(curr.setDate(last));
    } else { // день
      startDate = new Date(currentDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(currentDate);
      endDate.setHours(23, 59, 59, 999);
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('workout_details')
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time');

      if (error) throw error;
      
      const transformedWorkouts = data?.map(workout => ({
        id: workout.id,
        client_id: workout.client_id,
        start_time: workout.start_time,
        end_time: workout.end_time,
        title: workout.title,
        client: {
          id: workout.client_id,
          first_name: workout.client_first_name,
          last_name: workout.client_last_name
        }
      })) || [];
      
      setWorkouts(transformedWorkouts);
    } catch (error: any) {
      console.error('Error fetching workouts:', error);
      toast.error('Ошибка при загрузке расписания');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWorkout = async (workoutId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    if (!window.confirm('Вы уверены, что хотите удалить эту тренировку?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw error;

      toast.success('Тренировка удалена');
      fetchWorkouts();
    } catch (error: any) {
      console.error('Error deleting workout:', error);
      toast.error('Ошибка при удалении тренировки');
    }
  };

  const handleEditWorkout = (workout: Workout, event: React.MouseEvent) => {
    event.stopPropagation();
    setSelectedWorkout(workout);
    setSelectedDate(new Date(workout.start_time));
    setIsModalOpen(true);
  };

  const formatDate = (date: Date) => {
    if (viewMode === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      
      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${weekStart.getDate()} - ${weekEnd.getDate()} ${new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(weekStart)}`;
      } else {
        return `${weekStart.getDate()} ${new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(weekStart)} - ${weekEnd.getDate()} ${new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(weekEnd)}`;
      }
    } else if (viewMode === 'day') {
      return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' }).format(date);
    }
    return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
  };

  const changeDate = (increment: number) => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1));
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + (increment * 7));
      setCurrentDate(newDate);
    } else { // день
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + increment);
      setCurrentDate(newDate);
    }
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const firstDayOfWeek = firstDay.getDay() || 7; // Convert Sunday (0) to 7
    
    // Add days from previous month
    const prevMonth = new Date(year, month, 0);
    for (let i = firstDayOfWeek - 1; i > 0; i--) {
      days.push({
        date: new Date(year, month - 1, prevMonth.getDate() - i + 1),
        isCurrentMonth: false
      });
    }
    
    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Add days from next month
    const remainingDays = 42 - days.length; // 6 weeks * 7 days = 42
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getWeekDays = () => {
    const days = [];
    const curr = new Date(currentDate);
    const first = curr.getDate() - curr.getDay() + 1;
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(curr.setDate(first + i));
      days.push(new Date(day));
    }
    
    return days;
  };

  const getDayWorkouts = (date: Date) => {
    return workouts.filter(workout => {
      const workoutDate = new Date(workout.start_time);
      return workoutDate.getDate() === date.getDate() &&
             workoutDate.getMonth() === date.getMonth() &&
             workoutDate.getFullYear() === date.getFullYear();
    });
  };

  const handleDayClick = (date: Date) => {
    if (isMobile) {
      setCurrentDate(date);
      setViewMode('day');
    } else {
      setSelectedWorkout(null);
      setSelectedDate(date);
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedWorkout(null);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Универсальная карточка тренировки
  const renderWorkoutCard = (workout: Workout, isCompact = false) => {
    const workoutDate = new Date(workout.start_time);
    const firstName = workout.client.first_name;
    const lastName = workout.client.last_name;
    
    return (
      <div 
        key={workout.id}
        onClick={(e) => e.stopPropagation()}
        className={`group relative rounded overflow-hidden shadow-sm transition-all hover:shadow-md
          ${isCompact ? 'h-8 text-xs' : 'text-sm'}`}
        style={{
          backgroundColor: '#FFF5EB',  // Светло-оранжевый фон
          borderLeft: '3px solid #FF8A00' // Оранжевая полоса слева
        }}
      >
        <div className="flex items-center p-1">
          <div className="flex-1 font-medium truncate">
            <span className="mr-1">{formatTime(workout.start_time)}</span>
            {!isCompact && (
              <span className="text-gray-500 text-xs ml-1">
                ({Math.floor((new Date(workout.end_time).getTime() - workoutDate.getTime()) / 1000 / 60)} мин)
              </span>
            )}
          </div>
          <div className={`flex ${isCompact ? 'opacity-0 group-hover:opacity-100' : ''} transition-opacity`}>
            <button
              onClick={(e) => handleEditWorkout(workout, e)}
              className="p-1 rounded-full hover:bg-orange-100 text-gray-600"
            >
              <Edit2 className="w-3 h-3" />
            </button>
            <button
              onClick={(e) => handleDeleteWorkout(workout.id, e)}
              className="p-1 rounded-full hover:bg-orange-100 text-gray-600"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
        
        {!isCompact && (
          <div className="px-2 py-1">
            <div className="font-medium text-xs">
              {firstName} {lastName}
            </div>
            <div className="text-xs text-gray-500 truncate">
              {workout.title}
            </div>
          </div>
        )}
        
        {isCompact && (
          <div className="font-medium text-xs pl-1 truncate pb-1">
            {firstName} {lastName}
          </div>
        )}
      </div>
    );
  };
  
  // Универсальная ячейка дня календаря
  const renderDayCell = (date: Date, isCurrentMonth = true) => {
    const dayWorkouts = getDayWorkouts(date);
    const today = isToday(date);
    const workoutCount = dayWorkouts.length;
    
    // Определение текущего дня недели (0 = воскресенье)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    return (
      <div 
        onClick={() => handleDayClick(date)}
        className={`relative h-full p-1 transition-colors cursor-pointer
          ${isCurrentMonth ? 'bg-white' : 'bg-gray-50'} 
          ${today ? 'ring-2 ring-orange-500 ring-inset z-10' : ''}
          ${isWeekend && isCurrentMonth ? 'bg-gray-50' : ''}
          hover:bg-orange-50`}
        style={{ minHeight: isMobile ? '70px' : '110px' }}
      >
        <div className="flex justify-between items-center mb-1">
          <div 
            className={`rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium
              ${today ? 'bg-orange-500 text-white' : isCurrentMonth ? 'text-gray-700' : 'text-gray-400'}`}
          >
            {date.getDate()}
          </div>
          {workoutCount > 0 && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600">
              {workoutCount}
            </span>
          )}
        </div>
        
        <div className="space-y-1 max-h-full overflow-hidden">
          {isMobile ? (
            // Мобильное представление - только первая тренировка
            <>
              {workoutCount > 0 && renderWorkoutCard(dayWorkouts[0], true)}
              {workoutCount > 1 && (
                <div className="text-xs text-center text-orange-500 font-medium">
                  +{workoutCount - 1} ещё
                </div>
              )}
            </>
          ) : (
            // Десктопное представление - до 3 тренировок
            <>
              {dayWorkouts.slice(0, 3).map(workout => (
                <div key={workout.id} className="mb-1 last:mb-0">
                  {renderWorkoutCard(workout, true)}
                </div>
              ))}
              {workoutCount > 3 && (
                <div className="text-xs text-center text-orange-500 font-medium">
                  +{workoutCount - 3} ещё
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Единый месячный вид
  const renderMonthView = () => {
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    
    return (
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-white">
        {/* Дни недели */}
        <div className="grid grid-cols-7 bg-gray-50 border-b">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>
        
        {/* Дни месяца */}
        <div className="grid grid-cols-7 divide-x divide-y">
          {getMonthDays().map(({ date, isCurrentMonth }) => (
            <div key={date.toISOString()}>
              {renderDayCell(date, isCurrentMonth)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Недельное представление - адаптивное
  const renderWeekView = () => {
    const weekDays = getWeekDays();
    
    if (isMobile) {
      // Вертикальное представление для мобильных устройств
      return (
        <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
          {weekDays.map(day => (
            <div key={day.toISOString()} className="border-b last:border-b-0">
              <div 
                className={`px-3 py-2 flex justify-between items-center
                  ${isToday(day) ? 'bg-orange-50' : 'bg-gray-50'}`}
              >
                <div className="flex items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-medium
                      ${isToday(day) ? 'bg-orange-500 text-white' : 'text-gray-700'}`}
                  >
                    {day.getDate()}
                  </div>
                  <div className="ml-2 text-sm">
                    {new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(day)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedWorkout(null);
                    setSelectedDate(day);
                    setIsModalOpen(true);
                  }}
                  className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600 font-medium"
                >
                  Добавить
                </button>
              </div>
              
              <div className="p-2 space-y-2">
                {getDayWorkouts(day).length > 0 ? (
                  getDayWorkouts(day).map(workout => (
                    <div key={workout.id}>
                      {renderWorkoutCard(workout)}
                    </div>
                  ))
                ) : (
                  <div className="py-3 text-center text-sm text-gray-400">
                    Нет тренировок
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    // Для десктопов - вид с часами по горизонтали
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00
    
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-8 bg-gray-50 divide-x">
            <div className="p-2 text-sm font-medium text-gray-700 text-center">
              Время
            </div>
            {weekDays.map(day => (
              <div
                key={day.toISOString()}
                className={`p-2 text-center ${isToday(day) ? 'bg-orange-50' : ''}`}
              >
                <div className="font-medium text-sm text-gray-700">
                  {new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(day)}
                </div>
                <div 
                  className={`inline-block rounded-full w-6 h-6 flex items-center justify-center text-xs mt-1
                    ${isToday(day) ? 'bg-orange-500 text-white' : 'text-gray-500'}`}
                  style={{ display: 'inline-flex' }}
                >
                  {day.getDate()}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-8 divide-x divide-y">
            {hours.map(hour => (
              <React.Fragment key={hour}>
                <div className="p-2 text-xs text-gray-500 text-center">
                  {`${hour}:00`}
                </div>
                {weekDays.map(day => {
                  const hourWorkouts = getDayWorkouts(day).filter(workout => {
                    const workoutHour = new Date(workout.start_time).getHours();
                    return workoutHour === hour;
                  });

                  return (
                    <div
                      key={`${day.toISOString()}-${hour}`}
                      onClick={() => {
                        const date = new Date(day);
                        date.setHours(hour);
                        handleDayClick(date);
                      }}
                      className={`p-1 min-h-[60px] relative
                        ${isToday(day) ? 'bg-orange-50/30' : ''} 
                        hover:bg-orange-50`}
                    >
                      <div className="space-y-1">
                        {hourWorkouts.map(workout => (
                          <div key={workout.id}>
                            {renderWorkoutCard(workout, true)}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Представление дня - одинаковое для всех устройств
  const renderDayView = () => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00
    const dayWorkouts = getDayWorkouts(currentDate);

    return (
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <div className={`p-3 text-center border-b ${isToday(currentDate) ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <div 
            className={`inline-block rounded-full w-8 h-8 flex items-center justify-center text-sm font-medium
              ${isToday(currentDate) ? 'bg-orange-500 text-white' : 'text-gray-700'}`}
            style={{ display: 'inline-flex' }}
          >
            {currentDate.getDate()}
          </div>
          <span className="ml-2 text-sm font-medium">
            {new Intl.DateTimeFormat('ru-RU', { weekday: 'long', month: 'long' }).format(currentDate)}
          </span>
        </div>
        
        <div className="overflow-y-auto max-h-[500px] divide-y">
          {hours.map(hour => {
            const hourWorkouts = dayWorkouts.filter(workout => {
              const workoutHour = new Date(workout.start_time).getHours();
              return workoutHour === hour;
            });

            return (
              <div key={hour} className="hover:bg-gray-50">
                <div className="p-2 sticky top-0 z-10 bg-white border-b flex justify-between items-center">
                  <div className="flex items-center text-sm font-medium text-gray-700">
                    <Clock className="w-4 h-4 mr-1 text-gray-400" />
                    {`${hour}:00`}
                  </div>
                  <button 
                    onClick={() => {
                      const date = new Date(currentDate);
                      date.setHours(hour);
                      setSelectedDate(date);
                      setSelectedWorkout(null);
                      setIsModalOpen(true);
                    }}
                    className="text-xs px-2 py-1 rounded-full bg-orange-100 text-orange-600 font-medium"
                  >
                    Добавить
                  </button>
                </div>
                
                <div className="p-2">
                  {hourWorkouts.length > 0 ? (
                    <div className="space-y-2">
                      {hourWorkouts.map(workout => (
                        <div key={workout.id}>
                          {renderWorkoutCard(workout)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-3 text-center text-sm text-gray-400">
                      Нет тренировок
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-gray-100 p-3 md:p-6 rounded-xl">
      {/* Улучшенная шапка для всех устройств */}
      <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between space-y-3 md:space-y-0">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Расписание</h2>
          
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-2 w-full md:w-auto">
            {/* Переключатель режимов просмотра */}
            <div className="bg-gray-100 rounded-lg p-1 flex">
              <button
                onClick={() => setViewMode('month')}
                className={`rounded-md px-3 py-1.5 flex items-center justify-center transition-colors
                  ${viewMode === 'month'
                    ? 'bg-white shadow-sm text-orange-500 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'}`}
                aria-label="Месяц"
              >
                <CalendarIcon className="w-4 h-4 mr-1" />
                {!isMobile && <span className="text-sm">Месяц</span>}
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`rounded-md px-3 py-1.5 flex items-center justify-center transition-colors
                  ${viewMode === 'week'
                    ? 'bg-white shadow-sm text-orange-500 font-medium' 
                    : 'text-gray-600 hover:bg-gray-50'}`}
                aria-label="Неделя"
              >
                <List className="w-4 h-4 mr-1" />
                {!isMobile && <span className="text-sm">Неделя</span>}
              </button>
            </div>

            {/* Навигация по датам */}
            <div className="bg-gray-100 rounded-lg p-1 flex items-center">
              <button
                onClick={() => changeDate(-1)}
                className="p-1.5 rounded-md hover:bg-gray-50"
                aria-label="Предыдущий период"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <div className="text-sm md:text-base font-medium px-3 text-gray-700">
                {formatDate(currentDate)}
              </div>
              <button
                onClick={() => changeDate(1)}
                className="p-1.5 rounded-md hover:bg-gray-50"
                aria-label="Следующий период"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg p-10 flex justify-center items-center shadow-sm">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-1 shadow-sm">
          {viewMode === 'month' && renderMonthView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'day' && renderDayView()}
        </div>
      )}

      {/* Кнопка добавления тренировки */}
      <button
        onClick={() => {
          setSelectedWorkout(null);
          setSelectedDate(new Date());
          setIsModalOpen(true);
        }}
        className="fixed bottom-16 md:bottom-6 right-6 flex items-center justify-center w-14 h-14 bg-orange-500 text-white rounded-full shadow-lg z-40 hover:bg-orange-600 transition-colors"
        title="Добавить тренировку"
      >
        <Plus className="w-6 h-6" />
      </button>

      <WorkoutModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        selectedDate={selectedDate}
        onWorkoutCreated={fetchWorkouts}
        workout={selectedWorkout}
      />
    </div>
  );
}