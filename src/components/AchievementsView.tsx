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
  totalVolume: number; // в кг
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
  totalDuration: number; // в минутах
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
  averageCalories: number; // Добавлено поле для среднего значения калорий
  averageWater: number;
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
  const [firstPhoto, setFirstPhoto] = useState<ProgressPhoto | null>(null);
  const [lastPhoto, setLastPhoto] = useState<ProgressPhoto | null>(null);
  const [achievements, setAchievements] = useState<{title: string, description: string, icon: React.ReactNode, achieved: boolean, value?: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'workouts' | 'measurements' | 'activity' | 'nutrition'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedAchievement, setSelectedAchievement] = useState<{title: string, description: string, icon: React.ReactNode, value: string} | null>(null);

  useEffect(() => {
    fetchClientData();
  }, []);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      
      // Get user data
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get client profile
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (clientError) throw clientError;
      
      setClientData(clientData);
      
      // Load data in parallel
      await Promise.all([
        fetchMeasurements(clientData.id),
        fetchWorkoutStats(clientData.id),
        fetchActivityStats(clientData.id),
        fetchNutritionStats(clientData.id),
        fetchProgressPhotos(clientData.id)
      ]);
      
      // Generate achievements
      generateAchievements();
      
    } catch (error: any) {
      console.error('Error fetching client data:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
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
      // Get all workouts for the client
      const { data: workouts, error: workoutsError } = await supabase
        .from('workouts')
        .select('id, start_time, title, training_program_id')
        .eq('client_id', clientId);
  
      if (workoutsError) throw workoutsError;
  
      // Get workout completions
      const { data: completions, error: completionsError } = await supabase
        .from('workout_completions')
        .select('*')
        .eq('client_id', clientId);
  
      if (completionsError) throw completionsError;
  
      // Get exercise completions with their workout IDs
      const { data: exerciseCompletions, error: exerciseError } = await supabase
        .from('exercise_completions')
        .select('*')
        .eq('client_id', clientId);
  
      if (exerciseError) throw exerciseError;
      
      // Calculate basic stats
      const totalWorkouts = workouts?.length || 0;
      const completedWorkouts = completions?.filter(c => c.completed).length || 0;
      const completionRate = totalWorkouts > 0 ? (completedWorkouts / totalWorkouts) * 100 : 0;
  
      // Group workouts by month
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
      
      // For advanced stats: collect all relevant exercise and workout data
      let totalSets = 0;
      let totalVolume = 0;
      const exerciseFrequency: {[key: string]: {count: number, name: string}} = {};
      
      if (exerciseCompletions && exerciseCompletions.length > 0) {
        // Get all workout IDs from completed workouts
        const completedWorkoutIds = completions
          ?.filter(c => c.completed)
          .map(c => c.workout_id) || [];
        
        // Get training program IDs from these workouts
        const { data: workoutDetails } = await supabase
          .from('workouts')
          .select('id, training_program_id')
          .in('id', completedWorkoutIds);
        
        const programIds = workoutDetails
          ?.map(w => w.training_program_id)
          .filter(Boolean) || [];
        
        // Get exercise information for these programs
        const { data: programExercises } = await supabase
          .from('program_exercises')
          .select(`
            id,
            exercise_id,
            strength_exercises (id, name),
            exercise_sets (set_number, reps, weight)
          `)
          .in('program_id', programIds);
        
        // Process each exercise completion
        exerciseCompletions.forEach(completion => {
          // Find exercise data
          const exercise = programExercises?.find(pe => 
            pe.strength_exercises && pe.strength_exercises.id === completion.exercise_id
          );
          
          if (exercise && exercise.strength_exercises) {
            // Add to frequency counter
            const exerciseName = exercise.strength_exercises.name;
            if (!exerciseFrequency[completion.exercise_id]) {
              exerciseFrequency[completion.exercise_id] = {
                count: 0,
                name: exerciseName
              };
            }
            exerciseFrequency[completion.exercise_id].count++;
            
            // Count completed sets and calculate volume
            if (completion.completed_sets && Array.isArray(completion.completed_sets)) {
              completion.completed_sets.forEach((isCompleted, setIndex) => {
                if (isCompleted) {
                  // Increment total sets
                  totalSets++;
                  
                  // Calculate volume if we have set data
                  if (exercise.exercise_sets && exercise.exercise_sets[setIndex]) {
                    const set = exercise.exercise_sets[setIndex];
                    
                    // Parse reps (handle ranges like "8-12")
                    let reps = 0;
                    if (set.reps) {
                      const repsStr = set.reps.toString();
                      if (repsStr.includes('-')) {
                        // For ranges like "8-12", take average
                        const [min, max] = repsStr.split('-').map(Number);
                        reps = Math.round((min + max) / 2);
                      } else {
                        reps = parseInt(repsStr) || 0;
                      }
                    }
                    
                    // Parse weight
                    const weight = parseFloat(set.weight || '0') || 0;
                    
                    // Add to total volume
                    totalVolume += reps * weight;
                  }
                }
              });
            }
          }
        });
      }
      
      // Get total unique exercises
      const uniqueExerciseIds = Object.keys(exerciseFrequency);
      const totalExercises = uniqueExerciseIds.length;
      
      // Get top 5 favorite exercises
      const favoriteExercises = Object.values(exerciseFrequency)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(({ name, count }) => ({ name, count }));
      
      // Create workout stats object with real data
      const stats: WorkoutStats = {
        totalWorkouts,
        completedWorkouts,
        totalExercises,
        totalSets,
        totalVolume: Math.round(totalVolume), // Round to nearest kg
        favoriteExercises,
        workoutsPerMonth,
        completionRate,
        streakDays: 0 // For now we'll keep this as 0 (could be implemented separately)
      };
  
      setWorkoutStats(stats);
    } catch (error) {
      console.error('Error fetching workout stats:', error);
    }
  };

  const fetchActivityStats = async (clientId: string) => {
    try {
      // Get daily stats
      const { data: dailyStats, error: dailyStatsError } = await supabase
        .from('client_daily_stats')
        .select('*')
        .eq('client_id', clientId);

      if (dailyStatsError) throw dailyStatsError;

      // Get activities
      const { data: activities, error: activitiesError } = await supabase
        .from('client_activities')
        .select('*')
        .eq('client_id', clientId);

      if (activitiesError) throw activitiesError;

      // Group activities by type
      const activityTypes: {[key: string]: number} = {};
      activities?.forEach(activity => {
        activityTypes[activity.activity_type] = (activityTypes[activity.activity_type] || 0) + activity.duration_minutes;
      });

      const typesDistribution = Object.entries(activityTypes).map(([type, duration]) => ({
        type,
        duration
      })).sort((a, b) => b.duration - a.duration);

      // Count moods
      const moods: {[key: string]: number} = {};
      dailyStats?.forEach(stat => {
        moods[stat.mood] = (moods[stat.mood] || 0) + 1;
      });

      const moodDistribution = Object.entries(moods).map(([mood, count]) => ({
        mood,
        count
      }));

      // Calculate averages
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
      const totalCalories = data?.reduce((acc, entry) => acc + (entry.calories || 0), 0) || 0; // Добавлено для суммы калорий
      const totalWater = data?.reduce((acc, entry) => acc + (entry.water || 0), 0) || 0;

      const stats: NutritionStats = {
        entriesCount,
        averageProteins: entriesCount > 0 ? totalProteins / entriesCount : 0,
        averageFats: entriesCount > 0 ? totalFats / entriesCount : 0,
        averageCarbs: entriesCount > 0 ? totalCarbs / entriesCount : 0,
        averageCalories: entriesCount > 0 ? totalCalories / entriesCount : 0, // Добавлено среднее значение калорий
        averageWater: entriesCount > 0 ? totalWater / entriesCount : 0
      };

      setNutritionStats(stats);
    } catch (error) {
      console.error('Error fetching nutrition stats:', error);
    }
  };

  const fetchProgressPhotos = async (clientId: string) => {
    try {
      // List files from storage
      const { data: files, error: storageError } = await supabase.storage
        .from('client-photos')
        .list('progress-photos');

      if (storageError) throw storageError;

      // Filter files for this client
      const clientIdRegex = new RegExp(`^${clientId}-`);
      const clientFiles = files?.filter(file => clientIdRegex.test(file.name)) || [];

      if (clientFiles.length === 0) return;

      // Sort by date (filename format: clientId-timestamp-uuid.ext)
      clientFiles.sort((a, b) => {
        const getTimestamp = (filename: string) => {
          const parts = filename.split('-');
          return parts.length >= 2 ? parseInt(parts[1]) : 0;
        };
        return getTimestamp(a.name) - getTimestamp(b.name);
      });

      // Get the first and last photo
      if (clientFiles.length > 0) {
        const firstFile = clientFiles[0];
        const lastFile = clientFiles[clientFiles.length - 1];

        const getPhotoDetails = async (file: any): Promise<ProgressPhoto> => {
          const { data: { publicUrl } } = supabase.storage
            .from('client-photos')
            .getPublicUrl(`progress-photos/${file.name}`);

          const parts = file.name.split('-');
          let photoDate = new Date();
          if (parts.length >= 2) {
            const timestamp = parseInt(parts[1]);
            photoDate = !isNaN(timestamp) ? new Date(timestamp) : new Date();
          }

          return {
            url: publicUrl,
            date: photoDate.toLocaleDateString('ru-RU')
          };
        };

        setFirstPhoto(await getPhotoDetails(firstFile));
        setLastPhoto(await getPhotoDetails(lastFile));
      }
    } catch (error) {
      console.error('Error fetching progress photos:', error);
    }
  };

  const generateAchievements = () => {
    // This would be better with actual logic based on the user's data
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
    
    // For weight and waist, down is good. For others, up is good.
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

  // Determine if there's enough data for meaningful statistics
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
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Начало ({firstPhoto.date})</p>
                <img 
                  src={firstPhoto.url} 
                  alt="Первое фото" 
                  className="w-full h-40 object-cover rounded-lg" 
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Сейчас ({lastPhoto.date})</p>
                <img 
                  src={lastPhoto.url} 
                  alt="Последнее фото" 
                  className="w-full h-40 object-cover rounded-lg" 
                />
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
        
        {/* Новый блок с расширенной статистикой */}
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
        
        {/* Блок с любимыми упражнениями */}
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

  const renderMeasurementsTab = () => (
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
          
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Динамика веса</h4>
            <div className="h-40 border-b border-l relative">
              {measurements.map((measurement, index) => {
                if (!measurement.weight) return null;
                
                const maxWeight = Math.max(...measurements.filter(m => m.weight).map(m => m.weight));
                const minWeight = Math.min(...measurements.filter(m => m.weight).map(m => m.weight));
                const range = maxWeight - minWeight;
                const height = range > 0 ? ((measurement.weight - minWeight) / range) * 100 : 50;
                const position = (index / (measurements.length - 1)) * 100;
                
                return (
                  <div 
                    key={index}
                    className="absolute w-3 h-3 bg-orange-500 rounded-full -translate-x-1.5 -translate-y-1.5"
                    style={{ 
                      left: `${position}%`, 
                      bottom: `${height}%` 
                    }}
                    title={`${new Date(measurement.date).toLocaleDateString('ru-RU')}: ${measurement.weight} кг`}
                  ></div>
                );
              })}
            </div>
          </div>
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
              <div className="text-2xl font-bold text-purple-500">{nutritionStats.averageCalories.toFixed(0)} ккал</div> {/* Добавлено отображение калорий */}
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
              {/* Tabs */}
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
                </div>
              </div>
              
              {/* Tab Content */}
              {renderTabContent()}
            </>
          )}
        </div>
      </div>
      
      {/* Модальное окно для шеринга достижений */}
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