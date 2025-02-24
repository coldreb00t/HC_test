import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Edit2, Trash2, Plus, Calendar as CalendarIcon, List } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');

  useEffect(() => {
    fetchWorkouts();
  }, [currentDate, viewMode]);

  const fetchWorkouts = async () => {
    let startDate, endDate;

    if (viewMode === 'month') {
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    } else {
      const curr = new Date(currentDate);
      const first = curr.getDate() - curr.getDay() + 1;
      const last = first + 6;
      startDate = new Date(curr.setDate(first));
      endDate = new Date(curr.setDate(last));
    }

    try {
      console.log('Fetching workouts for range:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('workout_details')
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time');

      if (error) {
        console.error('Error fetching workouts:', error);
        throw error;
      }

      console.log('Raw workout data:', data);
      
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

      console.log('Transformed workouts:', transformedWorkouts);
      
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
        return `${weekStart.getDate()} ${new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(weekStart)} - ${weekEnd.getDate()} ${new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(weekEnd)}`;
      }
    }
    return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
  };

  const changeDate = (increment: number) => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + increment, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + (increment * 7));
      setCurrentDate(newDate);
    }
  };

  const getMonthDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    const firstDayOfWeek = firstDay.getDay() || 7;
    
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
    setSelectedWorkout(null);
    setSelectedDate(date);
    setIsModalOpen(true);
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

  const renderWorkoutCard = (workout: Workout) => (
    <div
      key={workout.id}
      className="relative text-xs p-1 bg-orange-100 rounded truncate group"
      title={`${workout.title} - ${workout.client.first_name} ${workout.client.last_name}`}
    >
      <div className="font-medium">
        {new Date(workout.start_time).toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit'
        })}
      </div>
      <div className="truncate">
        {workout.client.first_name} {workout.client.last_name}
      </div>
      <div className="absolute right-1 top-1 hidden group-hover:flex space-x-1">
        <button
          onClick={(e) => handleEditWorkout(workout, e)}
          className="p-1 rounded hover:bg-orange-200"
        >
          <Edit2 className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => handleDeleteWorkout(workout.id, e)}
          className="p-1 rounded hover:bg-orange-200"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );

  const renderWeekView = () => {
    const weekDays = getWeekDays();
    const hours = Array.from({ length: 13 }, (_, i) => i + 8); // 8:00 - 20:00

    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-8 border-b">
          <div className="p-2 text-center text-sm font-medium text-gray-700 border-r">
            Время
          </div>
          {weekDays.map(day => (
            <div
              key={day.toISOString()}
              className={`p-2 text-center border-r last:border-r-0 ${
                isToday(day) ? 'bg-orange-50' : ''
              }`}
            >
              <div className="text-sm font-medium text-gray-700">
                {new Intl.DateTimeFormat('ru-RU', { weekday: 'short' }).format(day)}
              </div>
              <div className={`text-sm ${isToday(day) ? 'text-orange-500 font-bold' : 'text-gray-500'}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-8">
          {hours.map(hour => (
            <React.Fragment key={hour}>
              <div className="p-2 text-xs text-gray-500 border-r border-b text-center">
                {`${hour}:00`}
              </div>
              {weekDays.map(day => {
                const dayWorkouts = getDayWorkouts(day).filter(workout => {
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
                    className={`p-1 border-r border-b last:border-r-0 min-h-[60px] ${
                      isToday(day) ? 'bg-orange-50' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      {dayWorkouts.map(workout => renderWorkoutCard(workout))}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Расписание тренировок</h2>
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('month')}
              className={`p-2 rounded-lg ${
                viewMode === 'month'
                  ? 'bg-white shadow text-orange-500'
                  : 'hover:bg-white hover:text-orange-500'
              }`}
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`p-2 rounded-lg ${
                viewMode === 'week'
                  ? 'bg-white shadow text-orange-500'
                  : 'hover:bg-white hover:text-orange-500'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changeDate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-medium min-w-[200px] text-center">
              {formatDate(currentDate)}
            </span>
            <button
              onClick={() => changeDate(1)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <>
          {viewMode === 'month' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="grid grid-cols-7 border-b">
                {weekDays.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {getMonthDays().map(({ date, isCurrentMonth }, index) => {
                  const dayWorkouts = getDayWorkouts(date);
                  return (
                    <div
                      key={date.toISOString()}
                      onClick={() => handleDayClick(date)}
                      className={`min-h-[120px] p-2 border-b border-r relative
                        ${!isCurrentMonth ? 'bg-gray-50' : 'hover:bg-gray-50'}
                        ${isToday(date) ? 'bg-orange-50 hover:bg-orange-100' : ''}
                        ${index % 7 === 6 ? 'border-r-0' : ''}`}
                    >
                      <div className={`text-right mb-2 ${
                        isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                      }`}>
                        {date.getDate()}
                      </div>
                      <div className="space-y-1 overflow-y-auto max-h-[80px]">
                        {dayWorkouts.map(workout => renderWorkoutCard(workout))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {viewMode === 'week' && renderWeekView()}
        </>
      )}

      {/* Фиксированная кнопка добавления тренировки */}
      <button
        onClick={() => {
          setSelectedWorkout(null);
          setSelectedDate(new Date());
          setIsModalOpen(true);
        }}
        className="fixed bottom-8 right-8 flex items-center justify-center w-14 h-14 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition-colors shadow-lg hover:shadow-xl z-50"
        title="Добавить тренировку"
      >
        <Plus className="w-8 h-8" />
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