import React, { useState, useEffect } from 'react';
import { Activity, Moon, Droplets, Heart, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface ActivityEntry {
  id: string;
  activity_type: string;
  duration_minutes: number;
}

interface DailyStats {
  date: string;
  sleep_hours: number;
  water_ml: number;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  stress_level: number;
  notes: string;
  activities: ActivityEntry[];
}

interface ClientActivity {
  client_id: string;
  client_name: string;
  daily_stats: DailyStats[];
}

export function ActivityView() {
  const [clientActivities, setClientActivities] = useState<ClientActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchClientActivities();
  }, []);

  const fetchClientActivities = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, first_name, last_name');

      if (clientsError) throw clientsError;

      // For each client, get their daily stats and activities
      const clientsWithActivity = await Promise.all(
        (clients || []).map(async (client) => {
          // Get daily stats
          const { data: stats, error: statsError } = await supabase
            .from('client_daily_stats')
            .select('*')
            .eq('client_id', client.id)
            .order('date', { ascending: false });

          if (statsError) throw statsError;

          // Get activities
          const { data: activities, error: activitiesError } = await supabase
            .from('client_activities')
            .select('*')
            .eq('client_id', client.id)
            .order('date', { ascending: false });

          if (activitiesError) throw activitiesError;

          // Combine stats and activities
          const dailyStats = (stats || []).map(stat => ({
            ...stat,
            activities: (activities || [])
              .filter(activity => activity.date === stat.date)
              .map(activity => ({
                id: activity.id,
                activity_type: activity.activity_type,
                duration_minutes: activity.duration_minutes
              }))
          }));

          return {
            client_id: client.id,
            client_name: `${client.first_name} ${client.last_name}`,
            daily_stats: dailyStats
          };
        })
      );

      setClientActivities(clientsWithActivity);
    } catch (error: any) {
      console.error('Error fetching client activities:', error);
      toast.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
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

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours === 0) {
      return `${minutes} мин`;
    } else if (remainingMinutes === 0) {
      return `${hours} ч`;
    } else {
      return `${hours} ч ${remainingMinutes} мин`;
    }
  };

  const filteredClients = clientActivities.filter(client =>
    client.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Бытовая активность клиентов</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по имени..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      {filteredClients.length > 0 ? (
        <div className="space-y-8">
          {filteredClients.map((client) => (
            <div key={client.client_id} className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b">
                <h3 className="font-semibold text-lg">{client.client_name}</h3>
              </div>

              {client.daily_stats.length > 0 ? (
                <div className="divide-y">
                  {client.daily_stats.map((stats) => (
                    <div key={stats.date} className="p-4">
                      <h4 className="font-medium text-gray-900 mb-3">
                        {new Date(stats.date).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </h4>

                      {/* Activities */}
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-gray-700 mb-2">Активности:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {stats.activities.map((activity) => (
                            <div key={activity.id} className="bg-gray-50 p-2 rounded">
                              <div className="flex items-center text-sm">
                                <Activity className="w-4 h-4 mr-2 text-gray-400" />
                                <span className="flex-1">{activity.activity_type}</span>
                                <span className="text-gray-500">
                                  {formatDuration(activity.duration_minutes)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Daily Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div className="flex items-center text-sm text-gray-600">
                          <Moon className="w-4 h-4 mr-2 text-gray-400" />
                          {stats.sleep_hours} часов сна
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Droplets className="w-4 h-4 mr-2 text-gray-400" />
                          {stats.water_ml} мл воды
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-2 text-lg">{moodEmojis[stats.mood]}</span>
                          Настроение
                        </div>
                        <div className="flex items-center text-sm text-gray-600">
                          <Heart className="w-4 h-4 mr-2 text-gray-400" />
                          Стресс: {getStressLevelLabel(stats.stress_level)} ({stats.stress_level}/10)
                        </div>
                      </div>

                      {stats.notes && (
                        <p className="mt-4 text-sm text-gray-600 italic">
                          {stats.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  Нет данных об активности
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'Ничего не найдено' : 'Нет данных об активности клиентов'}
          </p>
        </div>
      )}
    </div>
  );
}