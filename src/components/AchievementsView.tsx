import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trophy, 
  TrendingUp, 
  Activity, 
  Scale, 
  Calendar,
  Target, 
  Dumbbell, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  Camera,
  LineChart,
  Share2
} from 'lucide-react';
import { ShareAchievementModal } from './ShareAchievementModal';
import { SidebarLayout } from './SidebarLayout';
import { useClientNavigation } from '../lib/navigation';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  LineChart as RechartsLineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart
} from 'recharts';
import  BodyCompositionTab  from './BodyCompositionTab';

interface ClientData {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
}

interface Measurement {
  id: string;
  date: string;
  weight: number;
  height: number;
  chest: number;
  waist: number;
  hips: number;
  biceps: number;
  [key: string]: any;
}

interface WorkoutStats {
  totalWorkouts: number;
  completedWorkouts: number;
  totalExercises: number;
  totalSets: number;
  totalVolume: number;
  favoriteExercises: {name: string, count: number}[];
  workoutsPerMonth: {month: string, count: number}[];
  completionRate: number;
  streakDays: number;
}

interface ProgressPhoto {
  url: string;
  date: string;
}

interface ActivityStats {
  totalActivities: number;
  totalDuration: number;
  typesDistribution: {type: string, duration: number}[];
  averageSleep: number;
  averageStress: number;
  moodDistribution: {mood: string, count: number}[];
}

interface NutritionStats {
  entriesCount: number;
  averageProteins: number;
  averageFats: number;
  averageCarbs: number;
  averageCalories: number;
  averageWater: number;
}

interface BodyMeasurement {
  measurement_id: number;
  user_id: string;
  client_id: string;
  measurement_date: string;
  age: number | null;
  gender: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  body_fat_percent: number | null;
  fat_mass_kg: number | null;
  skeletal_muscle_mass_kg: number | null;
  visceral_fat_level: number | null;
  basal_metabolic_rate_kcal: number | null;
  inbody_score: number | null;
  notes: string | null;
  file_id: number | null;
}

// Новые интерфейсы для типизации данных из Supabase
interface StrengthExercise {
  id: string;
  name: string;
}

interface ExerciseSet {
  set_number: number;
  reps: number;
  weight: number;
}

interface ProgramExercise {
  id: string;
  exercise_id: string;
  strength_exercises?: StrengthExercise | StrengthExercise[];
  exercise_sets: ExerciseSet[];
}

export function AchievementsView() {
  const navigate = useNavigate();
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [nutritionStats, setNutritionStats] = useState<NutritionStats | null>(null);
  const [firstPhoto, setFirstPhoto] = useState<ProgressPhoto[] | null>(null);
  const [lastPhoto, setLastPhoto] = useState<ProgressPhoto[] | null>(null);
  const [achievements, setAchievements] = useState<{title: string, description: string, icon: React.ReactNode, achieved: boolean, value?: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'measurements' | 'activity' | 'nutrition' | 'bodyComposition'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<{title: string, description: string, icon: React.ReactNode, value: string} | null>(null);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[] | null>(null);

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      
      setClientData(clientData);
      
      await Promise.all([
        fetchMeasurements(clientData.id),
        fetchWorkoutStats(clientData.id),
        fetchActivityStats(clientData.id),
        fetchNutritionStats(clientData.id),
        fetchProgressPhotos(clientData.id),
        fetchBodyMeasurements(clientData.id)
      ]);
      
      generateAchievements();
      
    } catch (error: any) {
      console.error('Error fetching client data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchBodyMeasurements = async (clientId: string) => {
    try {
      console.log('Загружаем данные о составе тела для клиента:', clientId);
      const { data, error } = await supabase
        .from('body_measurements')
        .select('*')
        .eq('client_id', clientId)
        .order('measurement_date', { ascending: true });

      if (error) throw error;
      console.log('Получены данные о составе тела:', data);
      setBodyMeasurements(data || []);
    } catch (error) {
      console.error('Ошибка при загрузке данных о составе тела:', error);
    }
  };

  const fetchMeasurements = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('client_measurements')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: true });

      if (error) throw error;
      setMeasurements(data || []);
    } catch (error) {
      console.error('Error fetching measurements:', error);
    }
  };

  const fetchWorkoutStats = async (clientId: string) => {
    try {
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, start_time, title, training_program_id')
        .eq('client_id', clientId);
  
      if (workoutsError) throw workoutsError;
  
      const { data: completions, error: completionsError } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('client_id', clientId);
  
      if (completionsError) throw completionsError;
  
      const { data: exerciseCompletions, error: exerciseError } = await supabase
        .from('exercise_completions')
        .select('*')
        .eq('client_id', clientId);
  
      if (exerciseError) throw exerciseError;
      
      const totalWorkouts = workouts?.length || 0;
      const completedWorkouts = completions?.filter(c => c.completed).length || 0;
      const completionRate = totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;
  
      const workoutsByMonth: {[key: string]: number} = {};
      workouts?.forEach(workout => {
        const date = new Date(workout.start_time);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        workoutsByMonth[monthKey] = (workoutsByMonth[monthKey] || 0) + 1;
      });
  
      const workoutsPerMonth = Object.entries(workoutsByMonth).map(([month, count]) => ({
        month,
        count
      })).sort((a, b) => a.month.localeCompare(b.month));
      
      let totalSets = 0;
      let totalVolume = 0;
      const exerciseFrequency: {[key: string]: {count: number, name: string}} = {};
      
      if (exerciseCompletions && exerciseCompletions.length > 0) {
        const completedWorkoutIds = completions
          ?.filter(c => c.completed)
          .map(c => c.workout_id) || [];
        
        const { data: workoutDetails } = await supabase
          .from('workouts')
          .select('id, training_program_id')
          .in('id', completedWorkoutIds);
        
        const programIds = workoutDetails
          ?.map(w => w.training_program_id)
          .filter(Boolean) || [];
        
        const { data: programExercises, error: programExercisesError } = await supabase
          .from('program_exercises')
          .select(`
            id,
            exercise_id,
            strength_exercises (id, name),
            exercise_sets (set_number, reps, weight)
          `)
          .in('program_id', programIds) as { data: ProgramExercise[] | null; error: any };
        
        if (programExercisesError) throw programExercisesError;

        if (programExercises) {
          exerciseCompletions.forEach(completion => {
            const exercise = programExercises.find(pe => {
              if (!pe.strength_exercises) return false;

              const strengthExercise = Array.isArray(pe.strength_exercises)
                ? pe.strength_exercises[0]
                : pe.strength_exercises;

              return strengthExercise && strengthExercise.id === completion.exercise_id;
            });

            if (exercise && exercise.strength_exercises) {
              const strengthExercise = Array.isArray(exercise.strength_exercises)
                ? exercise.strength_exercises[0]
                : exercise.strength_exercises;

              const exerciseName = strengthExercise.name;

              if (!exerciseFrequency[completion.exercise_id]) {
                exerciseFrequency[completion.exercise_id] = {
                  count: 0,
                  name: exerciseName,
                };
              }
              exerciseFrequency[completion.exercise_id].count++;

              if (exercise.exercise_sets && exercise.exercise_sets.length > 0) {
                totalSets += exercise.exercise_sets.length;
                totalVolume += exercise.exercise_sets.reduce(
                  (acc, set) => acc + (set.reps * (set.weight || 0)),
                  0
                );
              }
            }
          });
        }
      }
      
      const uniqueExerciseIds = Object.keys(exerciseFrequency);
      const totalExercises = uniqueExerciseIds.length;
      
      const favoriteExercises = Object.values(exerciseFrequency)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(({ name, count }) => ({ name, count }));
      
      const stats: WorkoutStats = {
        totalWorkouts,
        completedWorkouts,
        totalExercises,
        totalSets,
        totalVolume: Math.round(totalVolume),
        favoriteExercises,
        workoutsPerMonth,
        completionRate,
        streakDays: 0
      };
  
      setWorkoutStats(stats);
    } catch (error) {
      console.error('Error fetching workout stats:', error);
    }
  };

  const fetchActivityStats = async (clientId: string) => {
    try {
      const { data: dailyStats, error: dailyStatsError } = await supabase
        .from('client_daily_stats')
        .select('*')
        .eq('client_id', clientId);

      if (dailyStatsError) throw dailyStatsError;

      const { data: activities, error: activitiesError } = await supabase
        .from('client_activities')
        .select('*')
        .eq('client_id', clientId);

      if (activitiesError) throw activitiesError;

      const activityTypes: {[key: string]: number} = {};
      activities?.forEach(activity => {
        activityTypes[activity.activity_type] = (activityTypes[activity.activity_type] || 0) + activity.duration_minutes;
      });

      const typesDistribution = Object.entries(activityTypes).map(([type, duration]) => ({
        type,
        duration
      })).sort((a, b) => b.duration - a.duration);

      const moods: {[key: string]: number} = {};
      dailyStats?.forEach(stat => {
        moods[stat.mood] = (moods[stat.mood] || 0) + 1;
      });

      const moodDistribution = Object.entries(moods).map(([mood, count]) => ({
        mood,
        count
      }));

      const totalSleep = dailyStats?.reduce((acc, stat) => acc + stat.sleep_hours, 0) || 0;
      const totalStress = dailyStats?.reduce((acc, stat) => acc + stat.stress_level, 0) || 0;
      const entriesCount = dailyStats?.length || 0;

      const stats: ActivityStats = {
        totalActivities: activities?.length || 0,
        totalDuration: activities?.reduce((acc, act) => acc + act.duration_minutes, 0) || 0,
        typesDistribution,
        averageSleep: entriesCount > 0 ? totalSleep / entriesCount : 0,
        averageStress: entriesCount > 0 ? totalStress / entriesCount : 0,
        moodDistribution
      };

      setActivityStats(stats);
    } catch (error) {
      console.error('Error fetching activity stats:', error);
    }
  };

  const fetchNutritionStats = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from('client_nutrition')
        .select('*')
        .eq('client_id', clientId);

      if (error) throw error;

      const entriesCount = data?.length || 0;
      const totalProteins = data?.reduce((acc, entry) => acc + (entry.proteins || 0), 0) || 0;
      const totalFats = data?.reduce((acc, entry) => acc + (entry.fats || 0), 0) || 0;
      const totalCarbs = data?.reduce((acc, entry) => acc + (entry.carbs || 0), 0) || 0;
      const totalCalories = data?.reduce((acc, entry) => acc + (entry.calories || 0), 0) || 0;
      const totalWater = data?.reduce((acc, entry) => acc + (entry.water || 0), 0) || 0;

      const stats: NutritionStats = {
        entriesCount,
        averageProteins: entriesCount > 0 ? totalProteins / entriesCount : 0,
        averageFats: entriesCount > 0 ? totalFats / entriesCount : 0,
        averageCarbs: entriesCount > 0 ? totalCarbs / entriesCount : 0,
        averageCalories: entriesCount > 0 ? totalCalories / entriesCount : 0,
        averageWater: entriesCount > 0 ? totalWater / entriesCount : 0
      };

      setNutritionStats(stats);
    } catch (error) {
      console.error('Error fetching nutrition stats:', error);
    }
  };

  const fetchProgressPhotos = async (clientId: string) => {
    try {
      const { data: files, error: storageError } = await supabase.storage
        .from('client-photos')
        .list('progress-photos');

      if (storageError) throw storageError;

      const clientIdRegex = new RegExp(`^${clientId}-`);
      const clientFiles = files?.filter(file => clientIdRegex.test(file.name)) || [];

      if (clientFiles.length === 0) return;

      console.log('Client files:', clientFiles);

      const photosWithDates = clientFiles.map(file => {
        let date: Date;
        const parts = file.name.split('-');

        if (file.created_at) {
          date = new Date(file.created_at);
          console.log(`Using created_at for ${file.name}: ${date.toISOString()}`);
        } else {
          const timestamp = parts.length >= 2 ? parseInt(parts[1]) : Date.now();
          date = !isNaN(timestamp) ? new Date(timestamp) : new Date();
          console.log(`Using timestamp for ${file.name}: ${timestamp}, Parsed Date: ${date.toISOString()}`);
        }

        if (isNaN(date.getTime())) {
          console.warn(`Invalid date for ${file.name}, using current date`);
          date = new Date();
        }

        const { data: { publicUrl } } = supabase.storage
          .from('client-photos')
          .getPublicUrl(`progress-photos/${file.name}`);
        return { url: publicUrl, date: date.toLocaleDateString('ru-RU') };
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const photosByDate: { [key: string]: ProgressPhoto[] } = {};
      photosWithDates.forEach(photo => {
        if (!photosByDate[photo.date]) {
          photosByDate[photo.date] = [];
        }
        photosByDate[photo.date].push({ url: photo.url, date: photo.date });
      });

      const dates = Object.keys(photosByDate).sort(
        (a, b) => new Date(a.split('.').reverse().join('-')).getTime() - new Date(b.split('.').reverse().join('-')).getTime()
      );

      if (dates.length > 0) {
        setFirstPhoto(photosByDate[dates[0]]);
        setLastPhoto(photosByDate[dates[dates.length - 1]]);
        console.log('First photos:', photosByDate[dates[0]]);
        console.log('Last photos:', photosByDate[dates[dates.length - 1]]);
      }
    } catch (error) {
      console.error('Error fetching progress photos:', error);
    }
  };

  const generateAchievements = () => {
    const achievementsList = [
      {
        title: "Первые шаги",
        description: "Завершена первая тренировка",
        icon: <Dumbbell className="w-5 h-5 text-orange-500" />,
        achieved: true,
        value: "Достигнуто!"
      },
      {
        title: "Регулярность",
        description: "10 тренировок посещено",
        icon: <Calendar className="w-5 h-5 text-orange-500" />,
        achieved: workoutStats ? workoutStats.totalWorkouts >= 10 : false,
        value: workoutStats ? `${workoutStats.totalWorkouts}/10 тренировок` : "0/10 тренировок"
      },
      {
        title: "Прогресс",
        description: "Первое измерение тела",
        icon: <Scale className="w-5 h-5 text-orange-500" />,
        achieved: measurements.length > 0,
        value: measurements.length > 0 ? "Достигнуто!" : "Не выполнено"
      },
      {
        title: "Активность",
        description: "Регулярная ежедневная активность в течение недели",
        icon: <Activity className="w-5 h-5 text-orange-500" />,
        achieved: activityStats ? activityStats.totalActivities >= 7 : false,
        value: activityStats ? `${activityStats.totalActivities}/7 дней` : "0/7 дней"
      },
      {
        title: "Питание",
        description: "Ведение дневника питания в течение недели",
        icon: <LineChart className="w-5 h-5 text-orange-500" />,
        achieved: nutritionStats ? nutritionStats.entriesCount >= 7 : false,
        value: nutritionStats ? `${nutritionStats.entriesCount}/7 дней` : "0/7 дней"
      }
    ];

    setAchievements(achievementsList);
  };
  
  const handleShareAchievement = (achievement: {title: string, description: string, icon: React.ReactNode, achieved: boolean, value?: string}) => {
    if (!achievement.achieved) {
      toast.error('Вы еще не достигли этой цели');
      return;
    }
    
    setSelectedAchievement({
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      value: achievement.value || 'Достигнуто!'
    });
    setShowShareModal(true);
  };

  const getMeasurementChange = (field: string): { value: number, percent: number, direction: 'up' | 'down' | 'none' } => {
    if (measurements.length < 2) {
      return { value: 0, percent: 0, direction: 'none' };
    }

    const first = measurements[0][field] || 0;
    const last = measurements[measurements.length - 1][field] || 0;
    
    const difference = last - first;
    const percentChange = first !== 0 ? (difference / first) * 100 : 0;
    
    const goodDirection = field === 'weight' || field === 'waist' ? 'down' : 'up';
    const direction = difference > 0 ? 'up' : difference < 0 ? 'down' : 'none';
    
    return {
      value: Math.abs(difference),
      percent: Math.abs(percentChange),
      direction
    };
  };

  const handleMenuItemClick = (action: string) => {
    setShowFabMenu(false);
    switch (action) {
      case 'activity':
        navigate('/client/activity/new');
        break;
      case 'photo':
        navigate('/client/progress-photo/new');
        break;
      case 'measurements':
        navigate('/client/measurements/new');
        break;
      case 'nutrition':
        navigate('/client/nutrition/new');
        break;
    }
  };

  const menuItems = useClientNavigation(showFabMenu, setShowFabMenu, handleMenuItemClick);

  const hasEnoughData = 
    measurements.length > 0 || 
    (workoutStats && workoutStats.totalWorkouts > 0) || 
    (activityStats && activityStats.totalActivities > 0) || 
    (nutritionStats && nutritionStats.entriesCount > 0);

  const renderAchievementCards = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.map((achievement, index) => (
        <div 
          key={index} 
          className={`p-4 rounded-lg border ${achievement.achieved ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
        >
          <div className="flex items-center mb-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${achievement.achieved ? 'bg-orange-100' : 'bg-gray-100'}`}>
              {achievement.icon}
            </div>
            <div className="ml-3">
              <h3 className={`font-medium ${achievement.achieved ? 'text-orange-700' : 'text-gray-700'}`}>
                {achievement.title}
              </h3>
              <p className={`text-sm ${achievement.achieved ? 'text-orange-600' : 'text-gray-500'}`}>
                {achievement.description}
              </p>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2">
            <div className={`text-xs font-medium ${achievement.achieved ? 'text-orange-500' : 'text-gray-400'}`}>
              {achievement.achieved ? 'Достигнуто' : 'В процессе'}
            </div>
            {achievement.achieved && (
              <button
                onClick={() => handleShareAchievement(achievement)}
                className="p-1.5 bg-orange-100 rounded-full hover:bg-orange-200 transition-colors"
                title="Поделиться достижением"
              >
                <Share2 className="w-4 h-4 text-orange-500" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderOverviewTab = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg p-6 text-white shadow-md">
        <div className="flex items-center mb-4">
          <Trophy className="w-8 h-8 mr-3" />
          <h2 className="text-xl font-bold">Сводка достижений</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-lg font-semibold">{workoutStats?.totalWorkouts || 0}</div>
            <div className="text-sm">Тренировок</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-lg font-semibold">{activityStats?.totalDuration ? Math.round(activityStats.totalDuration / 60) : 0}</div>
            <div className="text-sm">Часов активности</div>
          </div>
          <div className="bg-white/20 rounded-lg p-4">
            <div className="text-lg font-semibold">{achievements.filter(a => a.achieved).length}</div>
            <div className="text-sm">Достижений</div>
          </div>
        </div>
      </div>
      
      {renderAchievementCards()}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {measurements.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center mb-4">
              <Scale className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="font-semibold">Изменения тела</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Вес</span>
                <div className="flex items-center">
                  {getMeasurementChange('weight').direction === 'down' ? (
                    <ArrowDown className="w-4 h-4 text-green-500 mr-1" />
                  ) : getMeasurementChange('weight').direction === 'up' ? (
                    <ArrowUp className="w-4 h-4 text-red-500 mr-1" />
                  ) : (
                    <Minus className="w-4 h-4 text-gray-500 mr-1" />
                  )}
                  <span className={`font-medium ${getMeasurementChange('weight').direction === 'down' ? 'text-green-500' : getMeasurementChange('weight').direction === 'up' ? 'text-red-500' : 'text-gray-500'}`}>
                    {getMeasurementChange('weight').value.toFixed(1)} кг ({getMeasurementChange('weight').percent.toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Талия</span>
                <div className="flex items-center">
                  {getMeasurementChange('waist').direction === 'down' ? (
                    <ArrowDown className="w-4 h-4 text-green-500 mr-1" />
                  ) : getMeasurementChange('waist').direction === 'up' ? (
                    <ArrowUp className="w-4 h-4 text-red-500 mr-1" />
                  ) : (
                    <Minus className="w-4 h-4 text-gray-500 mr-1" />
                  )}
                  <span className={`font-medium ${getMeasurementChange('waist').direction === 'down' ? 'text-green-500' : getMeasurementChange('waist').direction === 'up' ? 'text-red-500' : 'text-gray-500'}`}>
                    {getMeasurementChange('waist').value.toFixed(1)} см ({getMeasurementChange('waist').percent.toFixed(1)}%)
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Бицепс</span>
                <div className="flex items-center">
                  {getMeasurementChange('biceps').direction === 'up' ? (
                    <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : getMeasurementChange('biceps').direction === 'down' ? (
                    <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                  ) : (
                    <Minus className="w-4 h-4 text-gray-500 mr-1" />
                  )}
                  <span className={`font-medium ${getMeasurementChange('biceps').direction === 'up' ? 'text-green-500' : getMeasurementChange('biceps').direction === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                    {getMeasurementChange('biceps').value.toFixed(1)} см ({getMeasurementChange('biceps').percent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {firstPhoto && lastPhoto && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center mb-4">
              <Camera className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="font-semibold">Прогресс</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Начало ({firstPhoto[0].date})</p>
                <div className="grid grid-cols-2 gap-2">
                  {firstPhoto.map((photo, index) => (
                    <img
                      key={index}
                      src={photo.url}
                      alt={`Фото начала ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Сейчас ({lastPhoto[0].date})</p>
                <div className="grid grid-cols-2 gap-2">
                  {lastPhoto.map((photo, index) => (
                    <img
                      key={index}
                      src={photo.url}
                      alt={`Фото сейчас ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkoutsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center mb-4">
          <Dumbbell className="w-5 h-5 text-gray-500 mr-2" />
          <h3 className="font-semibold">Тренировки</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-orange-500">{workoutStats?.totalWorkouts || 0}</div>
            <div className="text-sm text-gray-600">Всего тренировок</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-500">{workoutStats?.completedWorkouts || 0}</div>
            <div className="text-sm text-gray-600">Завершено</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-500">{workoutStats?.completionRate.toFixed(0) || 0}%</div>
            <div className="text-sm text-gray-600">Процент завершения</div>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-purple-500">{workoutStats?.totalExercises || 0}</div>
            <div className="text-sm text-gray-600">Уникальных упражнений</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-indigo-500">{workoutStats?.totalSets || 0}</div>
            <div className="text-sm text-gray-600">Всего подходов</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-pink-500">{workoutStats?.totalVolume || 0} кг</div>
            <div className="text-sm text-gray-600">Общий объём</div>
          </div>
        </div>
        
        {workoutStats?.favoriteExercises && workoutStats.favoriteExercises.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Любимые упражнения</h4>
            <div className="space-y-2">
              {workoutStats.favoriteExercises.map((exercise, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Dumbbell className="w-4 h-4 text-orange-500 mr-2" />
                    <span className="font-medium">{exercise.name}</span>
                  </div>
                  <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                    {exercise.count} {exercise.count === 1 ? 'раз' : 'раза'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {workoutStats?.workoutsPerMonth && workoutStats.workoutsPerMonth.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Тренировки по месяцам</h4>
            <div className="h-40 mt-2 flex items-end">
              {workoutStats.workoutsPerMonth.map((item, index) => {
                const monthNames = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                const [year, month] = item.month.split('-');
                const monthIndex = parseInt(month) - 1;
                const monthName = monthNames[monthIndex];
                const maxCount = Math.max(...workoutStats.workoutsPerMonth.map(x => x.count));
                const height = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-orange-400 rounded-t-sm" 
                      style={{ height: `${height}%` }}
                    ></div>
                    <div className="text-xs text-gray-500 mt-1">{monthName}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderMeasurementsTab = () => {
    const chartData = measurements.map(measurement => ({
      date: new Date(measurement.date).toLocaleDateString('ru-RU'),
      weight: measurement.weight || null,
      waist: measurement.waist || null,
      chest: measurement.chest || null,
      hips: measurement.hips || null,
      biceps: measurement.biceps || null,
    }));
  
    const renderLineChart = (field: string, title: string, unit: string, color: string) => {
      const validData = chartData.filter(d => d[field] !== null);
      if (validData.length === 0) return null;
  
      const gradientId = `color${field}`;
  
      return (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
          <ResponsiveContainer width="100%" height={200}>
            <RechartsLineChart data={validData}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis unit={` ${unit}`} />
              <Tooltip formatter={(value: number) => `${value} ${unit}`} />
              <Legend />
              <Area
                type="monotone"
                dataKey={field}
                stroke={color}
                name={title.split(' ')[1]}
                activeDot={{ r: 8 }}
                fillOpacity={1}
                fill={`url(#${gradientId})`}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      );
    };
  
    return (
      <div className="space-y-6">
        {measurements.length > 0 ? (
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center mb-4">
              <Scale className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="font-semibold">Измерения тела</h3>
            </div>
  
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Дата</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Вес (кг)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Талия (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Грудь (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Бедра (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Бицепс (см)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {measurements.map((measurement, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-2 px-3 text-sm">{new Date(measurement.date).toLocaleDateString('ru-RU')}</td>
                      <td className="py-2 px-3 text-sm">{measurement.weight || '-'}</td>
                      <td className="py-2 px-3 text-sm">{measurement.waist || '-'}</td>
                      <td className="py-2 px-3 text-sm">{measurement.chest || '-'}</td>
                      <td className="py-2 px-3 text-sm">{measurement.hips || '-'}</td>
                      <td className="py-2 px-3 text-sm">{measurement.biceps || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
  
            {renderLineChart('weight', 'Динамика веса', 'кг', '#ff7300')}
            {renderLineChart('waist', 'Динамика талии', 'см', '#387908')}
            {renderLineChart('chest', 'Динамика груди', 'см', '#8884d8')}
            {renderLineChart('hips', 'Динамика бедер', 'см', '#ff0000')}
            {renderLineChart('biceps', 'Динамика бицепса', 'см', '#00c49f')}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Нет данных об измерениях</p>
            <button
              onClick={() => navigate('/client/measurements/new')}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              Добавить измерения
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderActivityTab = () => (
    <div className="space-y-6">
      {activityStats ? (
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-4">
            <Activity className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Бытовая активность</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-500">{activityStats.totalActivities}</div>
              <div className="text-sm text-gray-600">Всего активностей</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-500">
                {Math.floor(activityStats.totalDuration / 60)} ч {activityStats.totalDuration % 60} мин
              </div>
              <div className="text-sm text-gray-600">Общая длительность</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-500">{activityStats.averageSleep.toFixed(1)}</div>
              <div className="text-sm text-gray-600">Средний сон (часов)</div>
            </div>
          </div>
          
          {activityStats.typesDistribution.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Распределение по типам активности</h4>
              <div className="space-y-2 mt-3">
                {activityStats.typesDistribution.map((item, index) => {
                  const totalDuration = activityStats.typesDistribution.reduce((acc, curr) => acc + curr.duration, 0);
                  const percentage = (item.duration / totalDuration) * 100;
                  
                  return (
                    <div key={index}>
                      <div className="flex justify-between text-xs mb-1">
                        <span>{item.type}</span>
                        <span>{Math.floor(item.duration / 60)} ч {item.duration % 60} мин ({percentage.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Нет данных об активности</p>
          <button
            onClick={() => navigate('/client/activity/new')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Добавить активность
          </button>
        </div>
      )}
    </div>
  );

  const renderNutritionTab = () => (
    <div className="space-y-6">
      {nutritionStats && nutritionStats.entriesCount > 0 ? (
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center mb-4">
            <LineChart className="w-5 h-5 text-gray-500 mr-2" />
            <h3 className="font-semibold">Питание</h3>
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
              <div className="text-sm text-gray-600">Средние углеводы</div>
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
              ></div>
              <div 
                className="bg-yellow-500 h-full" 
                style={{ width: `${nutritionStats.averageFats * 9 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100}%` }}
              ></div>
              <div 
                className="bg-green-500 h-full" 
                style={{ width: `${nutritionStats.averageCarbs * 4 / (nutritionStats.averageProteins * 4 + nutritionStats.averageFats * 9 + nutritionStats.averageCarbs * 4) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
                <span>Белки</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
                <span>Жиры</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
                <span>Углеводы</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-6 text-center">
          <LineChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Нет данных о питании</p>
          <button
            onClick={() => navigate('/client/nutrition')}
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Добавить запись о питании
          </button>
        </div>
      )}
    </div>
  );

  const renderBodyCompositionTab = () => (
    <BodyCompositionTab
      clientId={clientData?.id || ''}
      measurements={measurements}
      bodyMeasurements={bodyMeasurements}
    />
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab();
      case 'workouts':
        return renderWorkoutsTab();
      case 'measurements':
        return renderMeasurementsTab();
      case 'activity':
        return renderActivityTab();
      case 'nutrition':
        return renderNutritionTab();
      case 'bodyComposition':
        return renderBodyCompositionTab();
      default:
        return renderOverviewTab();
    }
  };

  return (
    <SidebarLayout
      menuItems={menuItems}
      variant="bottom"
      backTo="/client"
    >
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
              <h2 className="text-xl font-semibold">Достижения и прогресс</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
          ) : !hasEnoughData ? (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Недостаточно данных</h3>
              <p className="text-gray-500 mb-4">
                Для анализа прогресса и достижений необходимо больше данных. Продолжайте отслеживать свои тренировки, 
                питание и активность.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
                <button
                  onClick={() => navigate('/client/workouts')}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Тренировки
                </button>
                <button
                  onClick={() => navigate('/client/measurements/new')}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Замеры
                </button>
                <button
                  onClick={() => navigate('/client/nutrition')}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Питание
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-6 overflow-x-auto scrollbar-hide">
                <div className="flex space-x-1 min-w-max border-b">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'overview'
                        ? 'text-orange-500 border-b-2 border-orange-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Обзор
                  </button>
                  <button
                    onClick={() => setActiveTab('workouts')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'workouts'
                        ? 'text-orange-500 border-b-2 border-orange-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Тренировки
                  </button>
                  <button
                    onClick={() => setActiveTab('measurements')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'measurements'
                        ? 'text-orange-500 border-b-2 border-orange-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Замеры
                  </button>
                  <button
                    onClick={() => setActiveTab('activity')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'activity'
                        ? 'text-orange-500 border-b-2 border-orange-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Активность
                  </button>
                  <button
                    onClick={() => setActiveTab('nutrition')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'nutrition'
                        ? 'text-orange-500 border-b-2 border-orange-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Питание
                  </button>
                  <button
                    onClick={() => setActiveTab('bodyComposition')}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                      activeTab === 'bodyComposition'
                        ? 'text-orange-500 border-b-2 border-orange-500'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Состав тела
                  </button>
                </div>
              </div>
              
              {renderTabContent()}
            </>
          )}
        </div>
      </div>
      
      {showShareModal && selectedAchievement && (
        <ShareAchievementModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          achievement={selectedAchievement}
          userName={clientData ? `${clientData.first_name} ${clientData.last_name}` : 'Пользователь HARDCASE'}
        />
      )}
    </SidebarLayout>
  );
}