import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Trophy, 
  TrendingUp, 
  Activity, 
  Scale, 
  Calendar, 
  Dumbbell, 
  ArrowUp, 
  ArrowDown, 
  Minus,
  Camera,
  LineChart,
  Share2,
  Edit,
  Check,
  X,
  BarChart2,
  CameraOff,
  Plus,
  Edit2,
  Trash2,
  SlidersHorizontal
} from 'lucide-react';
import { ShareAchievementModal } from './ShareAchievementModal'; // Убрали импорт ShareAchievementModalProps
import { SidebarLayout } from './SidebarLayout';
import { useClientNavigation } from '../lib/navigation';
import { useNavigate } from 'react-router-dom';
import { RaiseTheBeastMotivation } from './RaiseTheBeastMotivation';
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
} from 'recharts';
import BodyCompositionTab from './BodyCompositionTab';
import { MeasurementsInputModal } from './MeasurementsInputModal';
import { NutritionStatsView } from './NutritionStatsView';

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
  pelvis: number;
  biceps_right: number;
  biceps_left: number;
  wrist_right: number;
  wrist_left: number;
  stomach: number;
  thigh_right: number;
  thigh_left: number;
  calf_right: number;
  calf_left: number;
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
  type?: string;
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

interface Achievement {
  title: string;
  description: string;
  icon: React.ReactNode;
  value: string;
  bgImage?: string; // Для зверей
  achievementImage?: string; // Для обычных достижений
  motivationalPhrase?: string; // Мотивационная фраза
  achieved?: boolean; // Флаг достижения цели
}

// Определяем тип для вкладок
type AchievementsTab = 'overview' | 'workouts' | 'measurements' | 'activity' | 'nutrition' | 'bodyComposition';

// Добавляем пропсы
interface AchievementsViewProps {
  activeTab?: AchievementsTab;
}

export function AchievementsView({ activeTab = 'overview' }: AchievementsViewProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [bodyMeasurements, setBodyMeasurements] = useState<BodyMeasurement[]>([]);
  const [workoutStats, setWorkoutStats] = useState<WorkoutStats | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [nutritionStats, setNutritionStats] = useState<NutritionStats | null>(null);
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [selectedAchievement, setSelectedAchievement] = useState<Omit<Achievement, 'achieved'> | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);
  const [editingMeasurement, setEditingMeasurement] = useState<Measurement | null>(null);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [currentTab, setCurrentTab] = useState<AchievementsTab>(activeTab);

  useEffect(() => {
    fetchClientData();
  }, []);

  // Обновляем useEffect, чтобы обрабатывать изменения props.activeTab
  useEffect(() => {
    setCurrentTab(activeTab);
  }, [activeTab]);

  // Добавляем новый useEffect для генерации достижений
  useEffect(() => {
    if (!loading) {
      console.log('Running useEffect for achievements generation');
      console.log('Measurements in useEffect:', measurements);
      console.log('Body measurements in useEffect:', bodyMeasurements);
      generateAchievements();
    }
  }, [measurements, bodyMeasurements, loading]);

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
      console.log('Client data fetched:', clientData);
      setClientData(clientData);
  
      await Promise.all([
        fetchMeasurements(clientData.id),
        fetchWorkoutStats(clientData.id),
        fetchActivityStats(clientData.id),
        fetchNutritionStats(clientData.id),
        fetchProgressPhotos(clientData.id),
        fetchBodyMeasurements(clientData.id),
      ]);
  
      // Удаляем вызов generateAchievements из fetchClientData
      // generateAchievements() будет вызван из useEffect
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
      
      // Улучшенное логирование результата
      console.log('Получены данные о составе тела (количество):', data ? data.length : 0);
      if (data && data.length > 0) {
        console.log('Пример первой записи:', data[0]);
      } else {
        console.log('Данные о составе тела не найдены для клиента', clientId);
      }
      
      // Устанавливаем данные в state, конвертируя null в пустой массив
      setBodyMeasurements(data && data.length > 0 ? data : []);
    } catch (error) {
      console.error('Ошибка при загрузке данных о составе тела:', error);
      // В случае ошибки устанавливаем пустой массив вместо null
      setBodyMeasurements([]);
    }
  };

  const fetchMeasurements = async (clientId: string) => {
    try {
      console.log('Fetching measurements for client:', clientId);
      const { data, error } = await supabase
        .from('client_measurements')
        .select('*')
        .eq('client_id', clientId)
        .order('date', { ascending: true });
  
      if (error) {
        console.error('Error fetching measurements:', error);
        throw error;
      }
      console.log('Measurements fetched:', data);
      
      // Преобразование данных к нужному типу с учетом старой и новой структуры
      const typedData = (data || []).map((item: any): Measurement => {
        return {
          id: item.id,
          date: item.date,
          weight: item.weight,
          height: item.height,
          chest: item.chest,
          waist: item.waist,
          pelvis: item.pelvis || item.hips, // Поддержка старых записей с полем hips
          biceps_right: item.biceps_right || item.biceps, // Поддержка старых записей с полем biceps
          biceps_left: item.biceps_left || item.biceps, // Поддержка старых записей
          wrist_right: item.wrist_right || null,
          wrist_left: item.wrist_left || null,
          stomach: item.stomach || null,
          thigh_right: item.thigh_right || item.thigh, // Поддержка старых записей с полем thigh
          thigh_left: item.thigh_left || item.thigh, // Поддержка старых записей
          calf_right: item.calf_right || item.calves, // Поддержка старых записей с полем calves
          calf_left: item.calf_left || item.calves // Поддержка старых записей
        };
      });
      
      setMeasurements(typedData);
    } catch (error) {
      console.error('Error in fetchMeasurements:', error);
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
        // Объединяем первые и последние фотографии, добавляя к ним поле type для различия
        const firstPhotos = photosByDate[dates[0]].map(photo => ({
          ...photo,
          type: 'first'
        }));
        
        const lastPhotos = dates.length > 1 
          ? photosByDate[dates[dates.length - 1]].map(photo => ({
              ...photo,
              type: 'last'
            }))
          : [];
        
        // Устанавливаем массив, содержащий и первые и последние фотографии
        setProgressPhotos([...firstPhotos, ...lastPhotos]);
        console.log('First photos:', photosByDate[dates[0]]);
        console.log('Last photos:', dates.length > 1 ? photosByDate[dates[dates.length - 1]] : 'None');
        console.log('Combined photos:', [...firstPhotos, ...lastPhotos]);
      }
    } catch (error) {
      console.error('Error fetching progress photos:', error);
    }
  };

  const generateAchievements = () => {
    // Добавляю отладочное логирование
    console.log('Generating achievements. Measurements:', measurements);
    console.log('Body measurements:', bodyMeasurements);
    console.log('Check condition:', measurements.length > 0 || (bodyMeasurements != null && bodyMeasurements.length > 0));
    console.log('Measurements length:', measurements.length);
    console.log('Body measurements length:', bodyMeasurements ? bodyMeasurements.length : 'null');
    
    const achievementsList = [
      {
        title: "Первая тренировка",
        description: "Завершена первая тренировка",
        icon: <Dumbbell className="w-5 h-5 text-orange-500" />,
        value: "Достигнуто!",
        bgImage: '',
        achievementImage: '/src/assets/achievements/workout.png',
        motivationalPhrase: 'Первый шаг к большим достижениям!',
        achieved: true
      },
      {
        title: "Регулярность",
        description: "10 тренировок посещено",
        icon: <Calendar className="w-5 h-5 text-orange-500" />,
        value: workoutStats ? `${workoutStats.totalWorkouts}/10 тренировок` : "0/10 тренировок",
        bgImage: '',
        achievementImage: '/src/assets/achievements/streak.png',
        motivationalPhrase: 'Регулярность - ключ к успеху!',
        achieved: workoutStats ? workoutStats.totalWorkouts >= 10 : false
      },
      {
        title: "Прогресс",
        description: "Первое измерение тела",
        icon: <Scale className="w-5 h-5 text-orange-500" />,
        value: (measurements.length > 0 || (bodyMeasurements != null && bodyMeasurements.length > 0)) ? "Достигнуто!" : "Не выполнено",
        bgImage: '',
        achievementImage: '/src/assets/achievements/personal_record.png',
        motivationalPhrase: 'Отслеживай свой прогресс и достигай новых высот!',
        achieved: ((measurements && measurements.length > 0) || (bodyMeasurements && Array.isArray(bodyMeasurements) && bodyMeasurements.length > 0)) ? true : false
      },
      {
        title: "Активность",
        description: "Регулярная ежедневная активность в течение недели",
        icon: <Activity className="w-5 h-5 text-orange-500" />,
        value: activityStats ? `${activityStats.totalActivities}/7 дней` : "0/7 дней",
        bgImage: '',
        achievementImage: '/src/assets/achievements/streak.png',
        motivationalPhrase: 'Движение - это жизнь!',
        achieved: activityStats ? activityStats.totalActivities >= 7 : false
      },
      {
        title: "Питание",
        description: "Ведение дневника питания в течение недели",
        icon: <LineChart className="w-5 h-5 text-orange-500" />,
        value: nutritionStats ? `${nutritionStats.entriesCount}/7 дней` : "0/7 дней",
        bgImage: '',
        achievementImage: '/src/assets/achievements/weight.png',
        motivationalPhrase: 'Правильное питание - основа здорового образа жизни!',
        achieved: nutritionStats ? nutritionStats.entriesCount >= 7 : false
      }
    ];

    setAchievements(achievementsList);

    // Добавляю дополнительное логирование после установки достижений
    console.log('Достижения после генерации:', achievementsList);
    achievementsList.forEach(achievement => {
      console.log(`Достижение "${achievement.title}": ${achievement.achieved ? 'Достигнуто' : 'В процессе'}`);
    });
  };
  
  const handleShareAchievement = (achievement: Achievement) => {
    if (!achievement.achieved) {
      toast.error('Вы еще не достигли этой цели');
      return;
    }
    
    setSelectedAchievement({
      title: achievement.title,
      description: achievement.description,
      icon: achievement.icon,
      value: achievement.value,
      bgImage: achievement.bgImage,
      achievementImage: achievement.achievementImage,
      motivationalPhrase: achievement.motivationalPhrase
    });
    setShowShareModal(true);
  };

  const getMeasurementChange = (field: keyof Measurement): { value: number, percent: number, direction: 'up' | 'down' | 'none' } => {
    if (measurements.length < 2) {
      return { value: 0, percent: 0, direction: 'none' };
    }

    const first = measurements[0][field] || 0;
    const last = measurements[measurements.length - 1][field] || 0;
    
    const difference = last - first;
    const percentChange = first !== 0 ? (difference / first) * 100 : 0;
    
    const direction = difference > 0 ? 'up' : difference < 0 ? 'down' : 'none';
    
    return {
      value: Math.abs(difference),
      percent: Math.abs(percentChange),
      direction
    };
  };

  const handleOpenMeasurementsModal = () => {
    setShowMeasurementsModal(true);
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

  const menuItems = useClientNavigation(showFabMenu, setShowFabMenu, handleMenuItemClick, handleOpenMeasurementsModal);

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
    <div className="space-y-6 pb-4">
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
      {workoutStats && (
      <RaiseTheBeastMotivation 
        totalVolume={workoutStats.totalVolume} 
        userName={clientData ? `${clientData.first_name} ${clientData.last_name}` : 'Пользователь HARDCASE'}
      />
    )}
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
                  {getMeasurementChange('biceps_right').direction === 'up' ? (
                    <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                  ) : getMeasurementChange('biceps_right').direction === 'down' ? (
                    <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                  ) : (
                    <Minus className="w-4 h-4 text-gray-500 mr-1" />
                  )}
                  <span className={`font-medium ${getMeasurementChange('biceps_right').direction === 'up' ? 'text-green-500' : getMeasurementChange('biceps_right').direction === 'down' ? 'text-red-500' : 'text-gray-500'}`}>
                    {getMeasurementChange('biceps_right').value.toFixed(1)} см ({getMeasurementChange('biceps_right').percent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {progressPhotos.length > 0 && (
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex items-center mb-4">
              <Camera className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="font-semibold">Прогресс</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Начало ({progressPhotos.find(p => p.type === 'first')?.date})</p>
                <div className="grid grid-cols-2 gap-2">
                  {progressPhotos.filter(photo => photo.type === 'first').map((photo, index) => (
                    <img
                      key={`first-${index}`}
                      src={photo.url}
                      alt={`Фото начала ${index + 1}`}
                      className="w-full h-40 object-cover rounded-lg"
                    />
                  ))}
                </div>
              </div>
              {progressPhotos.some(p => p.type === 'last') && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Сейчас ({progressPhotos.find(p => p.type === 'last')?.date})</p>
                  <div className="grid grid-cols-2 gap-2">
                    {progressPhotos.filter(photo => photo.type === 'last').map((photo, index) => (
                      <img
                        key={`last-${index}`}
                        src={photo.url}
                        alt={`Фото сейчас ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderWorkoutsTab = () => (
    <div className="space-y-6 pb-4">
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
                const [, month] = item.month.split('-');
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
    const chartData = measurements.map(m => ({
      date: new Date(m.date).toLocaleDateString('ru-RU'),
      weight: m.weight,
      height: m.height,
      chest: m.chest,
      waist: m.waist,
      pelvis: m.pelvis,
      biceps_right: m.biceps_right,
      biceps_left: m.biceps_left,
      wrist_right: m.wrist_right,
      wrist_left: m.wrist_left,
      stomach: m.stomach,
      thigh_right: m.thigh_right,
      thigh_left: m.thigh_left,
      calf_right: m.calf_right,
      calf_left: m.calf_left,
      // Агрегированные значения для графиков
      arm: (m.biceps_right || 0) + (m.biceps_left || 0) / 2, // Среднее значение бицепсов
      thigh: (m.thigh_right || 0) + (m.thigh_left || 0) / 2, // Среднее значение бедер
      calf: (m.calf_right || 0) + (m.calf_left || 0) / 2 // Среднее значение икр
    }));

    console.log('Full chartData:', chartData);

    const handleEditClick = (measurement: Measurement) => {
      setEditingMeasurement(measurement);
    };

    const handleInputChange = (field: keyof Measurement, value: string) => {
      if (editingMeasurement) {
        setEditingMeasurement({
          ...editingMeasurement,
          [field]: field === 'date' ? value : Number(value)
        });
      }
    };

    const handleSaveClick = async (measurement: Measurement) => {
      try {
        const { error } = await supabase
          .from('client_measurements')
          .update({
            weight: editingMeasurement?.weight,
            height: editingMeasurement?.height,
            chest: editingMeasurement?.chest,
            waist: editingMeasurement?.waist,
            pelvis: editingMeasurement?.pelvis,
            biceps_right: editingMeasurement?.biceps_right,
            biceps_left: editingMeasurement?.biceps_left,
            wrist_right: editingMeasurement?.wrist_right,
            wrist_left: editingMeasurement?.wrist_left,
            stomach: editingMeasurement?.stomach,
            thigh_right: editingMeasurement?.thigh_right,
            thigh_left: editingMeasurement?.thigh_left,
            calf_right: editingMeasurement?.calf_right,
            calf_left: editingMeasurement?.calf_left,
            date: editingMeasurement?.date
          })
          .eq('id', measurement.id);

        if (error) throw error;
        
        fetchMeasurements(clientData?.id || '');
        setEditingMeasurement(null);
        toast.success('Замеры обновлены');
      } catch (error) {
        console.error('Error updating measurement:', error);
        toast.error('Ошибка при обновлении замеров');
      }
    };

    const handleDeleteClick = async (measurement: Measurement) => {
      try {
        const { error } = await supabase
          .from('client_measurements')
          .delete()
          .eq('id', measurement.id);

        if (error) throw error;
        
        fetchMeasurements(clientData?.id || '');
        toast.success('Замеры удалены');
      } catch (error) {
        console.error('Error deleting measurement:', error);
        toast.error('Ошибка при удалении замеров');
      }
    };

    const renderLineChart = (field: string, title: string, unit: string, color: string) => {
      const validData = chartData.filter(d => d[field as keyof typeof d] !== null && d[field as keyof typeof d] !== undefined);
      console.log(`Valid data for ${field}:`, validData);
      if (validData.length === 0) return <p className="text-gray-500">Нет данных для {title}</p>;

      const materialColors = {
        weight: '#FF5722',
        waist: '#4CAF50',
        chest: '#3F51B5',
        pelvis: '#F44336',
        arm: '#00BCD4',
        thigh: '#00BCD4',
        calf: '#00BCD4',
      };

      return (
        <div className="mt-6 bg-white rounded-lg shadow-sm p-4" style={{ height: '300px', width: '100%' }}>
          <h4 className="text-md font-medium text-gray-800 mb-4">{title}</h4>
          <ResponsiveContainer width="100%" height="100%">
            <RechartsLineChart data={validData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid stroke="#e0e0e0" strokeDasharray="5 5" vertical={false} />
              <XAxis dataKey="date" type="category" tick={{ fill: '#757575', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
              <YAxis type="number" unit={` ${unit}`} tick={{ fill: '#757575', fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: 'none' }}
                formatter={(value: number) => `${value.toFixed(1)} ${unit}`}
                labelStyle={{ color: '#424242' }}
                labelFormatter={(label) => `Дата: ${label}`}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: 10, fontSize: 12, color: '#757575' }} />
              <Line
                type="monotone"
                dataKey={field}
                stroke={materialColors[field as keyof typeof materialColors] || color}
                strokeWidth={2}
                dot={{ r: 5, fill: materialColors[field as keyof typeof materialColors] || color }}
                activeDot={{ r: 6, fill: materialColors[field as keyof typeof materialColors] || color, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1000}
                name={title.split(' ')[1]}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>
      );
    };

    return (
      <div className="space-y-6 pb-4">
        {measurements.length > 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center mb-4">
              <Scale className="w-5 h-5 text-gray-500 mr-2" />
              <h3 className="font-semibold text-gray-800">Измерения тела</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Дата</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Вес (кг)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Рост (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Грудь (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Талия (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Живот (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Таз (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Бицепс П (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Бицепс Л (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Запястье П (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Запястье Л (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Бедро П (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Бедро Л (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Икра П (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Икра Л (см)</th>
                    <th className="py-2 px-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {measurements.map((measurement, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      {editingMeasurement === measurement ? (
                        <>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="date"
                              value={editingMeasurement?.date.split('T')[0] || ''}
                              onChange={(e) => handleInputChange('date', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.weight ?? ''}
                              onChange={(e) => handleInputChange('weight', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.height ?? ''}
                              onChange={(e) => handleInputChange('height', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.chest ?? ''}
                              onChange={(e) => handleInputChange('chest', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.waist ?? ''}
                              onChange={(e) => handleInputChange('waist', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.stomach ?? ''}
                              onChange={(e) => handleInputChange('stomach', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.pelvis ?? ''}
                              onChange={(e) => handleInputChange('pelvis', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.biceps_right ?? ''}
                              onChange={(e) => handleInputChange('biceps_right', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.biceps_left ?? ''}
                              onChange={(e) => handleInputChange('biceps_left', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.wrist_right ?? ''}
                              onChange={(e) => handleInputChange('wrist_right', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.wrist_left ?? ''}
                              onChange={(e) => handleInputChange('wrist_left', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.thigh_right ?? ''}
                              onChange={(e) => handleInputChange('thigh_right', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.thigh_left ?? ''}
                              onChange={(e) => handleInputChange('thigh_left', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.calf_right ?? ''}
                              onChange={(e) => handleInputChange('calf_right', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <input
                              type="number"
                              value={editingMeasurement?.calf_left ?? ''}
                              onChange={(e) => handleInputChange('calf_left', e.target.value)}
                              className="w-full p-1 border rounded"
                            />
                          </td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <button
                              onClick={() => handleSaveClick(measurement)}
                              className="p-1.5 bg-green-100 rounded-full hover:bg-green-200 transition-colors mr-2"
                              title="Сохранить"
                            >
                              <Check className="w-4 h-4 text-green-500" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(measurement)}
                              className="p-1.5 bg-red-100 rounded-full hover:bg-red-200 transition-colors"
                              title="Удалить"
                            >
                              <X className="w-4 h-4 text-red-500" />
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-2 px-3 text-sm text-gray-700">{new Date(measurement.date).toLocaleDateString('ru-RU')}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.weight || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.height || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.chest || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.waist || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.stomach || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.pelvis || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.biceps_right || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.biceps_left || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.wrist_right || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.wrist_left || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.thigh_right || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.thigh_left || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.calf_right || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">{measurement.calf_left || '-'}</td>
                          <td className="py-2 px-3 text-sm text-gray-700">
                            <button
                              onClick={() => handleEditClick(measurement)}
                              className="p-1.5 bg-orange-100 rounded-full hover:bg-orange-200 transition-colors"
                              title="Редактировать замер"
                            >
                              <Edit className="w-4 h-4 text-orange-500" />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderLineChart('weight', 'Динамика веса', 'кг', '#FF5722')}
            {renderLineChart('height', 'Динамика роста', 'см', '#2196F3')}
            {renderLineChart('chest', 'Динамика груди', 'см', '#3F51B5')}
            {renderLineChart('waist', 'Динамика талии', 'см', '#4CAF50')}
            {renderLineChart('stomach', 'Динамика живота', 'см', '#009688')}
            {renderLineChart('pelvis', 'Динамика таза', 'см', '#F44336')}
            {renderLineChart('biceps_right', 'Динамика правого бицепса', 'см', '#00BCD4')}
            {renderLineChart('biceps_left', 'Динамика левого бицепса', 'см', '#00BCD4')}
            {renderLineChart('wrist_right', 'Динамика правого запястья', 'см', '#795548')}
            {renderLineChart('wrist_left', 'Динамика левого запястья', 'см', '#795548')}
            {renderLineChart('thigh_right', 'Динамика правого бедра', 'см', '#9C27B0')}
            {renderLineChart('thigh_left', 'Динамика левого бедра', 'см', '#9C27B0')}
            {renderLineChart('calf_right', 'Динамика правой икры', 'см', '#607D8B')}
            {renderLineChart('calf_left', 'Динамика левой икры', 'см', '#607D8B')}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center shadow-sm">
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
    <div className="space-y-6 pb-4">
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
              <div className="space-y-2">
                {activityStats.typesDistribution.map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <Activity className="w-4 h-4 text-green-500 mr-2" />
                      <span className="font-medium">{activity.type}</span>
                    </div>
                    <span className="text-sm bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {Math.floor(activity.duration / 60)}ч {activity.duration % 60}мин
                    </span>
                  </div>
                ))}
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
    <div className="space-y-6 pb-4">
      {clientData && clientData.id && (
        <NutritionStatsView clientId={clientData.id} />
      )}
    </div>
  );

  const renderBodyCompositionTab = () => (
    <div className="pb-4">
      <BodyCompositionTab
        clientId={clientData?.id || ''}
        measurements={measurements}
        bodyMeasurements={bodyMeasurements}
      />
    </div>
  );

  const renderTabContent = () => {
    switch (currentTab) {
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
      <div className="bg-white shadow-sm w-full">
        <div className="flex items-center justify-between mb-6 p-4">
          <div className="flex items-center">
            <TrendingUp className="w-6 h-6 text-orange-500 mr-2" />
            <h2 className="text-xl font-semibold">Достижения и прогресс</h2>
          </div>
          {/* Добавляем кнопку для отладки */}
          <button 
            onClick={() => {
              console.log('Принудительное обновление достижений');
              console.log('Текущие measurements:', measurements);
              console.log('Текущие bodyMeasurements:', bodyMeasurements);
              generateAchievements();
            }}
            className="px-3 py-1 bg-orange-500 text-white text-sm rounded hover:bg-orange-600"
          >
            Обновить достижения
          </button>
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
                onClick={() => navigate('/client/nutrition/new')}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Питание
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 overflow-x-auto scrollbar-hide">
              <div className="flex min-w-max border-b">
                <button
                  onClick={() => setCurrentTab('overview')}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentTab === 'overview'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Обзор
                </button>
                <button
                  onClick={() => setCurrentTab('workouts')}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentTab === 'workouts'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Тренировки
                </button>
                <button
                  onClick={() => setCurrentTab('measurements')}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentTab === 'measurements'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Замеры
                </button>
                <button
                  onClick={() => setCurrentTab('activity')}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentTab === 'activity'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Активность
                </button>
                <button
                  onClick={() => setCurrentTab('nutrition')}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentTab === 'nutrition'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Питание
                </button>
                <button
                  onClick={() => setCurrentTab('bodyComposition')}
                  className={`px-4 py-2 text-sm font-medium whitespace-nowrap ${
                    currentTab === 'bodyComposition'
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
      
      {showMeasurementsModal && (
        <MeasurementsInputModal
          isOpen={showMeasurementsModal}
          onClose={() => setShowMeasurementsModal(false)}
          onSave={() => {
            setShowMeasurementsModal(false);
            toast.success('Замеры сохранены');
          }}
        />
      )}
      
      {showShareModal && selectedAchievement && (
        <ShareAchievementModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          beastName={selectedAchievement.title}
          weightPhrase={selectedAchievement.description}
          totalVolume={parseFloat(selectedAchievement.value?.replace(/[^\d.-]/g, '') || '0')}
          nextBeastThreshold={0}
          currentBeastThreshold={0}
          beastImage=""
          achievementImage={selectedAchievement.achievementImage || selectedAchievement.bgImage || ''}
          userName={clientData ? `${clientData.first_name} ${clientData.last_name}` : 'Пользователь HARDCASE'}
          isBeast={false}
          displayValue={selectedAchievement.value}
          unit=""
          motivationalPhrase={selectedAchievement.motivationalPhrase}
        />
      )}
    </SidebarLayout>
  );
}