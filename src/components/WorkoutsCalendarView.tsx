import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface Workout {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
}

interface NutritionEntry {
  date: string;
}

export function WorkoutsCalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [nutritionDates, setNutritionDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get client ID
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;

      // Get start and end dates for the current month
      const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      // Fetch workouts for the current month
      const { data: workoutsData, error: workoutsError } = await supabase
        .from('workouts')
        .select('*')
        .eq('client_id', clientData.id)
        .gte('start_time', startDate.toISOString())
        .lte('start_time', endDate.toISOString())
        .order('start_time');

      if (workoutsError) throw workoutsError;

      // Fetch nutrition entries for the current month
      const { data: nutritionData, error: nutritionError } = await supabase
        .from('client_nutrition')
        .select('date')
        .eq('client_id', clientData.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      if (nutritionError) throw nutritionError;

      setWorkouts(workoutsData || []);
      setNutritionDates((nutritionData || []).map(entry => entry.date));
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
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

  const getDayWorkouts = (date: Date) => {
    return workouts.filter(workout => {
      const workoutDate = new Date(workout.start_time);
      return workoutDate.getDate() === date.getDate() &&
             workoutDate.getMonth() === date.getMonth() &&
             workoutDate.getFullYear() === date.getFullYear();
    });
  };

  const hasNutritionEntry = (date: Date) => {
    // Convert date to YYYY-MM-DD format
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    return nutritionDates.includes(dateString);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  const formatWorkoutTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle click on a workout to view details
  const handleWorkoutClick = (workoutId: string) => {
    navigate(`/client/workouts/${workoutId}`);
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="bg-white rounded-xl shadow-md p-2 md:p-4">
      {/* Calendar Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 space-y-2 md:space-y-0">
        <div className="flex items-center">
          <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-500 mr-2" />
          <h2 className="text-lg md:text-xl font-semibold">Мои тренировки</h2>
        </div>
        <div className="flex items-center justify-between md:justify-end space-x-2 md:space-x-4">
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
            className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <span className="text-base md:text-lg font-medium min-w-[150px] md:min-w-[200px] text-center">
            {new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(currentDate)}
          </span>
          <button
            onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
            className="p-1.5 md:p-2 hover:bg-gray-100 rounded-full"
          >
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7">
            {/* Weekday Headers */}
            {weekDays.map(day => (
              <div key={day} className="p-1 md:p-2 text-center text-xs md:text-sm font-medium text-gray-700 border-b">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {getMonthDays().map(({ date, isCurrentMonth }, index) => {
              const dayWorkouts = getDayWorkouts(date);
              const hasNutrition = hasNutritionEntry(date);
              const isCurrentDay = isToday(date);
              const hasWorkouts = dayWorkouts.length > 0;

              return (
                <div
                  key={date.toISOString()}
                  className={`min-h-[60px] md:min-h-[70px] p-1 border-b border-r relative
                    ${!isCurrentMonth ? 'bg-gray-50' : ''}
                    ${isCurrentDay ? 'bg-orange-50' : ''}
                    ${hasWorkouts && isCurrentMonth ? 'bg-orange-50/20' : ''}
                    ${index % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  <div className={`flex items-center justify-end gap-1
                    ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}
                  >
                    <span className="text-xs md:text-sm">{date.getDate()}</span>
                    <div className="flex gap-0.5">
                      {hasWorkouts && isCurrentMonth && (
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-orange-500"></div>
                      )}
                      {hasNutrition && isCurrentMonth && (
                        <div className="w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-green-500"></div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-0.5 md:space-y-1">
                    {dayWorkouts.map(workout => (
                      <div
                        key={workout.id}
                        className="text-center p-0.5 md:p-1 bg-orange-100 text-orange-700 rounded text-xs md:text-sm cursor-pointer hover:bg-orange-200 transition-colors"
                        title={workout.title}
                        onClick={() => handleWorkoutClick(workout.id)}
                      >
                        <span className="font-medium">
                          {formatWorkoutTime(workout.start_time)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}