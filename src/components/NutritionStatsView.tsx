import React, { useEffect, useState } from 'react';
import { 
  LineChart as LucideLineChart, 
  BarChart2 as LucideBarChart, 
  Droplet as LucideDroplet, 
  Calendar as LucideCalendar, 
  Activity as LucideActivity, 
  Clock as LucideClock, 
  FileText as LucideFileText 
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Area,
  AreaChart,
  Cell,
  PieChart,
  Pie
} from 'recharts';

// Определяем интерфейс статистики питания
interface NutritionStats {
  entriesCount: number;
  averageProteins: number;
  averageFats: number;
  averageCarbs: number;
  averageCalories: number;
  averageWater: number;
  // Данные для расширенной статистики
  dailyEntries: {
    date: string;
    proteins: number;
    fats: number;
    carbs: number;
    calories: number;
    water: number;
    entryTime?: string;
  }[];
  workoutDays: string[]; // Даты с тренировками
  measurementDays: string[]; // Даты с измерениями
}

// Интерфейс пропсов компонента
interface NutritionStatsViewProps {
  clientId: string;
}

export const NutritionStatsView: React.FC<NutritionStatsViewProps> = ({ clientId }) => {
  const [loading, setLoading] = useState(true);
  const [nutritionStats, setNutritionStats] = useState<NutritionStats | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7days' | '14days' | '30days'>('7days');
  const [showSection, setShowSection] = useState<{
    dynamics: boolean;
    heatmap: boolean;
    waterBalance: boolean;
    macrosByDayOfWeek: boolean;
    patterns: boolean;
    correlations: boolean;
  }>({
    dynamics: true,
    heatmap: true,
    waterBalance: true,
    macrosByDayOfWeek: true,
    patterns: true,
    correlations: true,
  });

  useEffect(() => {
    if (clientId) {
      fetchNutritionData(clientId);
    }
  }, [clientId, selectedPeriod]);

  // Функция для получения данных о питании
  const fetchNutritionData = async (clientId: string) => {
    try {
      setLoading(true);
      
      // Получаем записи о питании
      const { data: nutritionData, error: nutritionError } = await supabase
        .from('client_nutrition')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: false });

      if (nutritionError) throw nutritionError;

      // Получаем данные о тренировках для корреляции
      const { data: workoutData, error: workoutError } = await supabase
        .from('workouts')
        .select('start_time')
        .eq('client_id', clientId);

      if (workoutError) throw workoutError;

      // Получаем данные об измерениях для корреляции
      const { data: measurementData, error: measurementError } = await supabase
        .from('client_measurements')
        .select('date')
        .eq('client_id', clientId);

      if (measurementError) throw measurementError;

      // Обрабатываем данные
      if (nutritionData && nutritionData.length > 0) {
        // Фильтруем данные по выбранному периоду
        const now = new Date();
        const periodStartDate = new Date(now);
        
        if (selectedPeriod === '7days') {
          periodStartDate.setDate(now.getDate() - 7);
        } else if (selectedPeriod === '14days') {
          periodStartDate.setDate(now.getDate() - 14);
        } else {
          periodStartDate.setDate(now.getDate() - 30);
        }

        // Используем только actual_date, если оно есть, или базовую часть date
        const filteredData = nutritionData.filter(entry => {
          const entryDate = new Date(entry.actual_date || entry.date.split('_')[0]);
          return entryDate >= periodStartDate;
        });

        // Собираем даты тренировок
        const workoutDays = workoutData?.map(workout => {
          const date = new Date(workout.start_time);
          return date.toISOString().split('T')[0];
        }) || [];

        // Собираем даты измерений
        const measurementDays = measurementData?.map(measurement => {
          return measurement.date.split('T')[0];
        }) || [];

        // Подготавливаем данные для графиков
        const dailyEntries = filteredData.map(entry => {
          // Извлекаем базовую дату и время
          const baseDate = entry.actual_date || entry.date.split('_')[0];
          const entryTime = entry.entry_time ? new Date(entry.entry_time).toTimeString().slice(0, 5) : undefined;
          
          return {
            date: baseDate,
            proteins: entry.proteins || 0,
            fats: entry.fats || 0,
            carbs: entry.carbs || 0,
            calories: entry.calories || 0,
            water: entry.water || 0,
            entryTime
          };
        });

        // Вычисляем общую статистику
        const entriesCount = nutritionData.length;
        const totalProteins = nutritionData.reduce((acc, entry) => acc + (entry.proteins || 0), 0);
        const totalFats = nutritionData.reduce((acc, entry) => acc + (entry.fats || 0), 0);
        const totalCarbs = nutritionData.reduce((acc, entry) => acc + (entry.carbs || 0), 0);
        const totalCalories = nutritionData.reduce((acc, entry) => acc + (entry.calories || 0), 0);
        const totalWater = nutritionData.reduce((acc, entry) => acc + (entry.water || 0), 0);

        setNutritionStats({
          entriesCount,
          averageProteins: entriesCount > 0 ? totalProteins / entriesCount : 0,
          averageFats: entriesCount > 0 ? totalFats / entriesCount : 0,
          averageCarbs: entriesCount > 0 ? totalCarbs / entriesCount : 0,
          averageCalories: entriesCount > 0 ? totalCalories / entriesCount : 0,
          averageWater: entriesCount > 0 ? totalWater / entriesCount : 0,
          dailyEntries,
          workoutDays,
          measurementDays
        });
      } else {
        setNutritionStats(null);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных о питании:', error);
      toast.error('Не удалось загрузить данные о питании');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: keyof typeof showSection) => {
    setShowSection({
      ...showSection,
      [section]: !showSection[section]
    });
  };

  // Функция для вычисления наиболее и наименее дисциплинированного дня недели
  const getDisciplineDays = () => {
    if (!nutritionStats || !nutritionStats.dailyEntries.length) return { mostDisciplined: '', leastDisciplined: '' };

    const daysOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const entriesByDay = [0, 0, 0, 0, 0, 0, 0]; // Счетчик для каждого дня недели
    
    nutritionStats.dailyEntries.forEach(entry => {
      const date = new Date(entry.date);
      const dayOfWeek = date.getDay();
      entriesByDay[dayOfWeek]++;
    });

    const maxEntries = Math.max(...entriesByDay);
    const minEntries = Math.min(...entriesByDay.filter(count => count > 0));
    
    const mostDisciplinedIndex = entriesByDay.indexOf(maxEntries);
    const leastDisciplinedIndex = entriesByDay.indexOf(minEntries);
    
    return {
      mostDisciplined: daysOfWeek[mostDisciplinedIndex],
      leastDisciplined: entriesByDay.some(count => count === 0) 
        ? daysOfWeek[entriesByDay.findIndex(count => count === 0)]
        : daysOfWeek[leastDisciplinedIndex]
    };
  };

  // Функция для вычисления дней с максимальным и минимальным потреблением калорий
  const getCalorieExtremes = () => {
    if (!nutritionStats || !nutritionStats.dailyEntries.length) return { maxDay: '', minDay: '', maxCal: 0, minCal: 0 };

    // Группируем записи по датам и суммируем калории за каждый день
    const caloriesByDate: Record<string, number> = {};
    nutritionStats.dailyEntries.forEach(entry => {
      if (!caloriesByDate[entry.date]) {
        caloriesByDate[entry.date] = 0;
      }
      caloriesByDate[entry.date] += entry.calories;
    });

    // Находим минимум и максимум
    let maxCal = 0;
    let minCal = Infinity;
    let maxDay = '';
    let minDay = '';

    Object.entries(caloriesByDate).forEach(([date, calories]) => {
      if (calories > maxCal) {
        maxCal = calories;
        maxDay = date;
      }
      if (calories < minCal) {
        minCal = calories;
        minDay = date;
      }
    });

    return {
      maxDay: formatDate(maxDay),
      minDay: formatDate(minDay),
      maxCal,
      minCal: minCal === Infinity ? 0 : minCal
    };
  };

  // Функция для форматирования даты
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  };

  // Анализ корреляции с тренировками
  const getWorkoutCorrelation = () => {
    if (!nutritionStats || !nutritionStats.dailyEntries.length) return { withWorkout: 0, withoutWorkout: 0 };

    const entriesOnWorkoutDays = nutritionStats.dailyEntries.filter(entry => 
      nutritionStats.workoutDays.includes(entry.date)
    );
    
    const entriesNotOnWorkoutDays = nutritionStats.dailyEntries.filter(entry => 
      !nutritionStats.workoutDays.includes(entry.date)
    );

    const avgCaloriesWithWorkout = entriesOnWorkoutDays.length > 0 
      ? entriesOnWorkoutDays.reduce((sum, entry) => sum + entry.calories, 0) / entriesOnWorkoutDays.length 
      : 0;
    
    const avgCaloriesWithoutWorkout = entriesNotOnWorkoutDays.length > 0 
      ? entriesNotOnWorkoutDays.reduce((sum, entry) => sum + entry.calories, 0) / entriesNotOnWorkoutDays.length 
      : 0;

    return {
      withWorkout: Math.round(avgCaloriesWithWorkout),
      withoutWorkout: Math.round(avgCaloriesWithoutWorkout)
    };
  };

  // Анализ распределения приемов пищи по времени суток
  const getMealTimeDistribution = () => {
    if (!nutritionStats || !nutritionStats.dailyEntries.length) return {};

    const mealTimes: Record<string, number> = {
      'Утро (6-10)': 0,
      'День (11-15)': 0,
      'Вечер (16-20)': 0,
      'Ночь (21-5)': 0
    };

    let totalEntries = 0;

    nutritionStats.dailyEntries.forEach(entry => {
      if (entry.entryTime) {
        totalEntries++;
        const hour = parseInt(entry.entryTime.split(':')[0]);
        
        if (hour >= 6 && hour <= 10) {
          mealTimes['Утро (6-10)']++;
        } else if (hour >= 11 && hour <= 15) {
          mealTimes['День (11-15)']++;
        } else if (hour >= 16 && hour <= 20) {
          mealTimes['Вечер (16-20)']++;
        } else {
          mealTimes['Ночь (21-5)']++;
        }
      }
    });

    // Преобразуем в проценты
    Object.keys(mealTimes).forEach(key => {
      mealTimes[key] = totalEntries > 0 ? Math.round((mealTimes[key] / totalEntries) * 100) : 0;
    });

    return mealTimes;
  };

  // Преобразуем данные для графиков динамики показателей
  const prepareNutritionDataForChart = () => {
    if (!nutritionStats) return [];
    
    // Группируем записи по датам и суммируем показатели
    const dailyTotals: Record<string, {
      date: string;
      proteins: number;
      fats: number;
      carbs: number;
      calories: number;
      water: number;
      formattedDate: string;
    }> = {};

    nutritionStats.dailyEntries.forEach(entry => {
      if (!dailyTotals[entry.date]) {
        dailyTotals[entry.date] = {
          date: entry.date,
          proteins: 0,
          fats: 0,
          carbs: 0,
          calories: 0,
          water: 0,
          formattedDate: formatDate(entry.date)
        };
      }
      
      dailyTotals[entry.date].proteins += entry.proteins;
      dailyTotals[entry.date].fats += entry.fats;
      dailyTotals[entry.date].carbs += entry.carbs;
      dailyTotals[entry.date].calories += entry.calories;
      dailyTotals[entry.date].water += entry.water;
    });
    
    // Преобразуем в массив и сортируем по дате
    return Object.values(dailyTotals).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  };

  // Функция для подготовки данных о распределении приемов пищи по дням недели
  const prepareMealDistributionData = () => {
    if (!nutritionStats) return [];
    
    const daysOfWeek = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    const mealsByHour: Record<string, Record<string, number>> = {};
    
    // Инициализация структуры данных
    daysOfWeek.forEach(day => {
      mealsByHour[day] = {};
      for (let hour = 0; hour < 24; hour++) {
        mealsByHour[day][hour] = 0;
      }
    });
    
    // Заполнение данными
    nutritionStats.dailyEntries.forEach(entry => {
      if (entry.entryTime) {
        const date = new Date(entry.date);
        const day = daysOfWeek[date.getDay() === 0 ? 6 : date.getDay() - 1]; // Преобразуем день недели (0-вс, 1-пн) в индекс массива
        const hour = parseInt(entry.entryTime.split(':')[0]);
        
        mealsByHour[day][hour] += 1;
      }
    });
    
    // Преобразуем в формат для тепловой карты
    const heatmapData: { name: string, hour: number, value: number }[] = [];
    daysOfWeek.forEach((day, dayIndex) => {
      for (let hour = 0; hour < 24; hour++) {
        heatmapData.push({
          name: day,
          hour,
          value: mealsByHour[day][hour]
        });
      }
    });
    
    return heatmapData;
  };

  // Функция для создания компонента тепловой карты
  const HeatmapCell = ({ value, hour, day }: { value: number, hour: number, day: string }) => {
    // Определяем цвет в зависимости от значения
    const getColor = (value: number) => {
      if (value === 0) return '#f7f7f7';
      if (value === 1) return '#ffe0b2';
      if (value === 2) return '#ffb74d';
      if (value >= 3) return '#ff9800';
    };
    
    return (
      <div 
        title={`${day}, ${hour}:00: ${value} приемов пищи`}
        className="border border-gray-100 cursor-pointer hover:opacity-80 flex items-center justify-center text-xs"
        style={{ 
          backgroundColor: getColor(value),
          width: '100%',
          height: '20px'
        }}
      >
        {value > 0 && value}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!nutritionStats || nutritionStats.entriesCount === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <LucideLineChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Нет данных о питании</p>
        <button
          onClick={() => window.location.href = '/client/nutrition/new'} 
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Добавить запись о питании
        </button>
      </div>
    );
  }

  // Получаем данные для анализа
  const { mostDisciplined, leastDisciplined } = getDisciplineDays();
  const { maxDay, minDay, maxCal, minCal } = getCalorieExtremes();
  const { withWorkout, withoutWorkout } = getWorkoutCorrelation();
  const mealTimeDistribution = getMealTimeDistribution();

  return (
    <div className="space-y-6 pb-4">
      {/* Период анализа */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Статистика питания</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setSelectedPeriod('7days')}
            className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === '7days' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            7 дней
          </button>
          <button 
            onClick={() => setSelectedPeriod('14days')}
            className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === '14days' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            14 дней
          </button>
          <button 
            onClick={() => setSelectedPeriod('30days')}
            className={`px-3 py-1 rounded-md text-sm ${selectedPeriod === '30days' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            30 дней
          </button>
        </div>
      </div>

      {/* Основные показатели */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center mb-4">
          <LucideLineChart className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="font-semibold">Основные показатели</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-500">{nutritionStats.entriesCount}</div>
            <div className="text-sm text-gray-600">Записей о питании</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-500">{nutritionStats.averageProteins.toFixed(0)} г</div>
            <div className="text-sm text-gray-600">Среднее белков</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-yellow-500">{nutritionStats.averageFats.toFixed(0)} г</div>
            <div className="text-sm text-gray-600">Среднее жиров</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">{nutritionStats.averageCarbs.toFixed(0)} г</div>
            <div className="text-sm text-gray-600">Среднее углеводов</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-500">{nutritionStats.averageCalories.toFixed(0)} ккал</div>
            <div className="text-sm text-gray-600">Средние калории</div>
          </div>
        </div>
        
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Распределение макронутриентов</h4>
          <div className="w-full h-6 bg-gray-200 rounded-full overflow-hidden flex">
            <div 
              className="bg-red-500 h-full" 
              style={{ width: `${nutritionStats.averageProteins * 4 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100}%` }}
              title={`Белки: ${(nutritionStats.averageProteins * 4 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100).toFixed(1)}%`}
            ></div>
            <div 
              className="bg-yellow-500 h-full" 
              style={{ width: `${nutritionStats.averageFats * 9 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100}%` }}
              title={`Жиры: ${(nutritionStats.averageFats * 9 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100).toFixed(1)}%`}
            ></div>
            <div 
              className="bg-green-500 h-full" 
              style={{ width: `${nutritionStats.averageCarbs * 4 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100}%` }}
              title={`Углеводы: ${(nutritionStats.averageCarbs * 4 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100).toFixed(1)}%`}
            ></div>
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
              <span>Белки ({(nutritionStats.averageProteins * 4 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
              <span>Жиры ({(nutritionStats.averageFats * 9 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100).toFixed(1)}%)</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
              <span>Углеводы ({(nutritionStats.averageCarbs * 4 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100).toFixed(1)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Динамика показателей */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => toggleSection('dynamics')}>
          <div className="flex items-center">
            <LucideBarChart className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Динамика показателей</h3>
          </div>
          <div className={`transition-transform ${showSection.dynamics ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        
        {showSection.dynamics && (
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-4">
              Этот график показывает, как менялись основные показатели питания за выбранный период.
            </p>
            <div className="relative w-full h-64 bg-gray-100 rounded-lg p-4 flex flex-col justify-between">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={prepareNutritionDataForChart()}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="formattedDate" />
                  <YAxis yAxisId="left" orientation="left" stroke="#FF0000" />
                  <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="proteins"
                    name="Белки (г)"
                    stroke="#FF0000"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="fats"
                    name="Жиры (г)"
                    stroke="#FFB200"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="carbs"
                    name="Углеводы (г)"
                    stroke="#00C853"
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="calories"
                    name="Калории (ккал)"
                    stroke="#9C27B0"
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Калории по дням</h4>
              <div className="relative w-full h-48 bg-gray-100 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={prepareNutritionDataForChart()}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="formattedDate" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="calories" name="Калории (ккал)" fill="#9C27B0" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Водный баланс */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => toggleSection('waterBalance')}>
          <div className="flex items-center">
            <LucideDroplet className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="font-semibold">Водный баланс</h3>
          </div>
          <div className={`transition-transform ${showSection.waterBalance ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        
        {showSection.waterBalance && (
          <div className="mt-2">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="bg-blue-50 rounded-lg p-4 flex-1">
                <div className="text-3xl font-bold text-blue-500">{nutritionStats.averageWater.toFixed(0)} мл</div>
                <div className="text-sm text-gray-600">Среднее потребление воды</div>
                <div className="mt-2 text-xs text-gray-500">
                  Рекомендуемая норма: 30-40 мл на кг веса в день
                </div>
              </div>
              <div className="relative flex-1 h-48 bg-gray-100 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={prepareNutritionDataForChart()}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 0,
                      bottom: 0,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="formattedDate" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="water" name="Вода (мл)" stroke="#2196F3" fill="#BBDEFB" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Анализ регулярности и привычек */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => toggleSection('patterns')}>
          <div className="flex items-center">
            <LucideCalendar className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Анализ регулярности и привычек</h3>
          </div>
          <div className={`transition-transform ${showSection.patterns ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        
        {showSection.patterns && (
          <div className="mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Регулярность питания</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Самый дисциплинированный день:</span>
                    <span className="font-medium">{mostDisciplined || 'Н/Д'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Самый проблемный день:</span>
                    <span className="font-medium">{leastDisciplined || 'Н/Д'}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Экстремумы калорийности</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Максимум калорий:</span>
                    <span className="font-medium">{maxCal} ккал ({maxDay})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Минимум калорий:</span>
                    <span className="font-medium">{minCal} ккал ({minDay})</span>
                  </div>
                </div>
              </div>
            </div>
            
            <h4 className="text-sm font-medium text-gray-700 mb-2">Распределение приемов пищи по времени суток</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(mealTimeDistribution).map(([timeSlot, percentage]) => (
                  <div key={timeSlot} className="text-center">
                    <div className="relative h-20 bg-gray-200 rounded-lg overflow-hidden">
                      <div 
                        className="absolute bottom-0 left-0 right-0 bg-orange-400"
                        style={{ height: `${percentage}%` }}
                      ></div>
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-lg font-bold">
                        {percentage}%
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-600">{timeSlot}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Новая секция - тепловая карта */}
            <h4 className="text-sm font-medium text-gray-700 mt-4 mb-2">Тепловая карта приемов пищи</h4>
            <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
              <div className="min-w-full">
                <div className="flex">
                  <div className="w-8"></div> {/* Пустая ячейка для заголовка */}
                  {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                    <div key={day} className="flex-1 text-center text-xs font-medium text-gray-700">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Генерируем строки для каждого часа */}
                {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(hour => {
                  const hourData = prepareMealDistributionData().filter(item => item.hour === hour);
                  
                  return (
                    <div key={hour} className="flex items-center">
                      <div className="w-8 text-xs text-right pr-1 text-gray-500">
                        {hour}:00
                      </div>
                      {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => {
                        const cellData = hourData.find(d => d.name === day);
                        return (
                          <div key={`${day}-${hour}`} className="flex-1">
                            <HeatmapCell 
                              value={cellData?.value || 0} 
                              hour={hour} 
                              day={day} 
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                
                <div className="flex items-center mt-2">
                  <div className="text-xs text-gray-500 mr-2">Интенсивность:</div>
                  <div className="flex items-center">
                    <div style={{ backgroundColor: '#f7f7f7' }} className="w-4 h-4 border border-gray-200"></div>
                    <span className="text-xs ml-1 mr-2">0</span>
                    <div style={{ backgroundColor: '#ffe0b2' }} className="w-4 h-4"></div>
                    <span className="text-xs ml-1 mr-2">1</span>
                    <div style={{ backgroundColor: '#ffb74d' }} className="w-4 h-4"></div>
                    <span className="text-xs ml-1 mr-2">2</span>
                    <div style={{ backgroundColor: '#ff9800' }} className="w-4 h-4"></div>
                    <span className="text-xs ml-1">3+</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Корреляции с другими показателями */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => toggleSection('correlations')}>
          <div className="flex items-center">
            <LucideActivity className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Корреляции с другими показателями</h3>
          </div>
          <div className={`transition-transform ${showSection.correlations ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        
        {showSection.correlations && (
          <div className="mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Питание и тренировки</h4>
                <div className="space-y-4">
                  <div className="flex flex-col">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">В дни тренировок:</span>
                      <span className="font-medium">{withWorkout} ккал</span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500"
                        style={{ width: `${withWorkout > 0 ? (withWorkout / Math.max(withWorkout, withoutWorkout) * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="flex flex-col">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600">В дни без тренировок:</span>
                      <span className="font-medium">{withoutWorkout} ккал</span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: `${withoutWorkout > 0 ? (withoutWorkout / Math.max(withWorkout, withoutWorkout) * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {withWorkout > withoutWorkout ? 
                    'В дни тренировок вы потребляете больше калорий, что помогает поддерживать энергию и восстановление.' : 
                    withWorkout < withoutWorkout ? 
                    'В дни без тренировок вы потребляете больше калорий. Рекомендуется увеличить потребление в тренировочные дни.' :
                    'Ваше потребление калорий примерно одинаково в дни с тренировками и без них.'}
                </p>
                
                {/* Добавляем визуализацию макронутриентов в тренировочные дни */}
                <h4 className="text-sm font-medium text-gray-700 mt-4 mb-2">Сравнение нутриентов</h4>
                <div className="mt-2">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      layout="vertical"
                      data={[
                        {
                          name: 'Белки',
                          withWorkout: nutritionStats.dailyEntries.filter(e => nutritionStats.workoutDays.includes(e.date))
                            .reduce((sum, e) => sum + e.proteins, 0) / 
                            Math.max(1, nutritionStats.dailyEntries.filter(e => nutritionStats.workoutDays.includes(e.date)).length),
                          withoutWorkout: nutritionStats.dailyEntries.filter(e => !nutritionStats.workoutDays.includes(e.date))
                            .reduce((sum, e) => sum + e.proteins, 0) / 
                            Math.max(1, nutritionStats.dailyEntries.filter(e => !nutritionStats.workoutDays.includes(e.date)).length),
                        },
                        {
                          name: 'Жиры',
                          withWorkout: nutritionStats.dailyEntries.filter(e => nutritionStats.workoutDays.includes(e.date))
                            .reduce((sum, e) => sum + e.fats, 0) / 
                            Math.max(1, nutritionStats.dailyEntries.filter(e => nutritionStats.workoutDays.includes(e.date)).length),
                          withoutWorkout: nutritionStats.dailyEntries.filter(e => !nutritionStats.workoutDays.includes(e.date))
                            .reduce((sum, e) => sum + e.fats, 0) / 
                            Math.max(1, nutritionStats.dailyEntries.filter(e => !nutritionStats.workoutDays.includes(e.date)).length),
                        },
                        {
                          name: 'Углеводы',
                          withWorkout: nutritionStats.dailyEntries.filter(e => nutritionStats.workoutDays.includes(e.date))
                            .reduce((sum, e) => sum + e.carbs, 0) / 
                            Math.max(1, nutritionStats.dailyEntries.filter(e => nutritionStats.workoutDays.includes(e.date)).length),
                          withoutWorkout: nutritionStats.dailyEntries.filter(e => !nutritionStats.workoutDays.includes(e.date))
                            .reduce((sum, e) => sum + e.carbs, 0) / 
                            Math.max(1, nutritionStats.dailyEntries.filter(e => !nutritionStats.workoutDays.includes(e.date)).length),
                        }
                      ]}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip formatter={(value) => Math.round(value as number) + ' г'} />
                      <Legend />
                      <Bar dataKey="withWorkout" name="В дни тренировок" fill="#4CAF50" />
                      <Bar dataKey="withoutWorkout" name="В обычные дни" fill="#2196F3" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Недельная статистика</h4>
                <div className="mt-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={Array.from({ length: 7 }).map((_, i) => {
                        const day = new Date();
                        day.setDate(day.getDate() - 6 + i);
                        const dayStr = day.toISOString().split('T')[0];
                        
                        const entries = nutritionStats.dailyEntries.filter(e => e.date === dayStr);
                        const calories = entries.reduce((sum, e) => sum + e.calories, 0);
                        const proteins = entries.reduce((sum, e) => sum + e.proteins, 0);
                        const water = entries.reduce((sum, e) => sum + e.water, 0);
                        
                        return {
                          name: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][day.getDay()],
                          calories,
                          proteins,
                          water
                        };
                      })}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis yAxisId="left" orientation="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="left" type="monotone" dataKey="calories" name="Калории (ккал)" stroke="#9C27B0" activeDot={{ r: 8 }} />
                      <Line yAxisId="left" type="monotone" dataKey="proteins" name="Белки (г)" stroke="#FF0000" />
                      <Line yAxisId="right" type="monotone" dataKey="water" name="Вода (мл)" stroke="#2196F3" />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Недельная динамика ключевых показателей питания
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 