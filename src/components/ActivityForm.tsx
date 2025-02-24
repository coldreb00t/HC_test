import React, { useState } from 'react';
import { Activity, Heart, Moon, Droplets, Smile, Clock, Plus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { SidebarLayout } from './SidebarLayout';
import { useClientNavigation } from '../lib/navigation';

interface ActivityEntry {
  activity_type: string;
  duration_minutes: number;
}

interface DailyStatsData {
  sleep_hours: number;
  water_ml: number;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  stress_level: number;
  notes: string;
}

const ACTIVITY_TYPES = [
  'Уборка',
  'Прогулка',
  'Поход в магазин',
  'Работа по дому',
  'Игры с детьми',
  'Садоводство',
  'Другое'
];

export function ActivityForm() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityEntry[]>([{
    activity_type: '',
    duration_minutes: 30
  }]);
  const [dailyStats, setDailyStats] = useState<DailyStatsData>({
    sleep_hours: 0,
    water_ml: 0,
    mood: 'neutral',
    stress_level: 5,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        toast.error('Пожалуйста, войдите в систему');
        navigate('/login');
        return;
      }

      // Get client profile
      const { data: clients, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user?.id);

      if (clientError) throw clientError;

      if (!clients || clients.length === 0) {
        toast.error('Профиль клиента не найден');
        return;
      }

      const clientId = clients[0].id;
      const today = new Date().toISOString().split('T')[0];

      // First, delete any existing activities for today
      const { error: deleteError } = await supabase
        .from('client_activities')
        .delete()
        .eq('client_id', clientId)
        .eq('date', today);

      if (deleteError) throw deleteError;

      // Insert or update daily stats using upsert
      const { error: statsError } = await supabase
        .from('client_daily_stats')
        .upsert({
          client_id: clientId,
          date: today,
          ...dailyStats
        });

      if (statsError) throw statsError;

      // Insert new activities
      const activitiesData = activities
        .filter(a => a.activity_type && a.duration_minutes > 0)
        .map(activity => ({
          client_id: clientId,
          date: today,
          ...activity
        }));

      if (activitiesData.length > 0) {
        const { error: activitiesError } = await supabase
          .from('client_activities')
          .insert(activitiesData);

        if (activitiesError) throw activitiesError;
      }

      toast.success('Активность сохранена');
      
      // Reset form
      setActivities([{ activity_type: '', duration_minutes: 30 }]);
      setDailyStats({
        sleep_hours: 0,
        water_ml: 0,
        mood: 'neutral',
        stress_level: 5,
        notes: ''
      });
    } catch (error: any) {
      console.error('Error saving activity:', error);
      toast.error('Ошибка при сохранении активности');
    } finally {
      setLoading(false);
    }
  };

  const addActivity = () => {
    setActivities([...activities, { activity_type: '', duration_minutes: 30 }]);
  };

  const removeActivity = (index: number) => {
    if (activities.length > 1) {
      setActivities(activities.filter((_, i) => i !== index));
    }
  };

  const updateActivity = (index: number, field: keyof ActivityEntry, value: string | number) => {
    const newActivities = [...activities];
    newActivities[index] = {
      ...newActivities[index],
      [field]: value
    };
    setActivities(newActivities);
  };

  const moodEmojis = {
    great: '😄',
    good: '🙂',
    neutral: '😐',
    bad: '🙁',
    terrible: '😢'
  };

  const getStressLevelLabel = (level: number) => {
    if (level <= 2) return 'Минимальный';
    if (level <= 4) return 'Низкий';
    if (level <= 6) return 'Средний';
    if (level <= 8) return 'Высокий';
    return 'Максимальный';
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

  return (
    <SidebarLayout
      menuItems={menuItems}
      variant="bottom"
      backTo="/client"
    >
      <div className="p-2 md:p-4">
        <div className="bg-white rounded-xl shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl font-semibold">Добавить активность</h2>
            <Activity className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
            {/* Activities Section */}
            <div className="space-y-3 md:space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base md:text-lg font-medium text-gray-700">Активности</h3>
                <button
                  type="button"
                  onClick={addActivity}
                  className="text-orange-500 hover:text-orange-600 flex items-center text-sm md:text-base"
                >
                  <Plus className="w-4 h-4 md:w-5 md:h-5 mr-1" />
                  Добавить активность
                </button>
              </div>

              {activities.map((activity, index) => (
                <div key={index} className="relative bg-gray-50 p-3 md:p-4 rounded-lg">
                  {activities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeActivity(index)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                  )}
                  
                  <div className="grid grid-cols-1 gap-3 md:gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Вид активности
                      </label>
                      <div className="relative">
                        <Activity className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                        <select
                          value={activity.activity_type}
                          onChange={(e) => updateActivity(index, 'activity_type', e.target.value)}
                          className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        >
                          <option value="">Выберите вид активности</option>
                          {ACTIVITY_TYPES.map(type => (
                            <option key={type} value={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Продолжительность (минут)
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={activity.duration_minutes}
                          onChange={(e) => updateActivity(index, 'duration_minutes', parseInt(e.target.value) || 0)}
                          className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Daily Stats Section */}
            <div className="border-t pt-4 md:pt-6">
              <h3 className="text-base md:text-lg font-medium text-gray-700 mb-4">Дневная статистика</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Часы сна
                  </label>
                  <div className="relative">
                    <Moon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                    <input
                      type="number"
                      min="0"
                      max="24"
                      step="0.5"
                      value={dailyStats.sleep_hours}
                      onChange={(e) => setDailyStats({ ...dailyStats, sleep_hours: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="8"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество воды (мл)
                  </label>
                  <div className="relative">
                    <Droplets className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" />
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={dailyStats.water_ml}
                      onChange={(e) => setDailyStats({ ...dailyStats, water_ml: parseInt(e.target.value) || 0 })}
                      className="w-full pl-9 md:pl-10 pr-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="2000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Настроение
                  </label>
                  <div className="grid grid-cols-5 gap-1 md:gap-2">
                    {(Object.keys(moodEmojis) as Array<keyof typeof moodEmojis>).map((mood) => (
                      <button
                        key={mood}
                        type="button"
                        onClick={() => setDailyStats({ ...dailyStats, mood })}
                        className={`p-2 md:p-3 rounded-lg text-center ${
                          dailyStats.mood === mood
                            ? 'bg-orange-100 border-2 border-orange-500'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-xl md:text-2xl">{moodEmojis[mood]}</span>
                        <span className="block text-[10px] md:text-xs mt-1 capitalize">{mood}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Уровень стресса (1-10)
                  </label>
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 md:w-5 md:h-5 text-green-500" />
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={dailyStats.stress_level}
                      onChange={(e) => setDailyStats({ ...dailyStats, stress_level: parseInt(e.target.value) })}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <Heart className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                  </div>
                  <div className="text-center mt-1 text-xs md:text-sm text-gray-500">
                    {getStressLevelLabel(dailyStats.stress_level)} ({dailyStats.stress_level}/10)
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Заметки
                  </label>
                  <textarea
                    value={dailyStats.notes}
                    onChange={(e) => setDailyStats({ ...dailyStats, notes: e.target.value })}
                    rows={3}
                    className="w-full p-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Дополнительные комментарии..."
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 text-sm md:text-base"
            >
              {loading ? 'Сохранение...' : 'Сохранить активность'}
            </button>
          </form>
        </div>
      </div>
    </SidebarLayout>
  );
}