import React, { useState, useEffect } from 'react';
import { 
  Dumbbell, 
  FileText, 
  Calendar,
  Users,
  Apple,
  Activity,
  LineChart,
  Edit2,
  Trash2,
  Plus,
  Camera,
  X,
  Moon,
  Droplets,
  Heart,
  Home
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useParams, useNavigate } from 'react-router-dom';
import { ProgramBuilder } from './ProgramBuilder';
import { WorkoutModal } from './WorkoutModal';
import { SidebarLayout } from './SidebarLayout';

type TabType = 'program' | 'nutrition' | 'activity' | 'progress' | 'analysis';

interface NutritionEntry {
  id: string;
  date: string;
  proteins: number;
  fats: number;
  carbs: number;
  water: number;
  photos: string[];
}

interface DailyStats {
  date: string;
  sleep_hours: number;
  water_ml: number;
  mood: 'great' | 'good' | 'neutral' | 'bad' | 'terrible';
  stress_level: number;
  notes: string;
  activities: {
    id: string;
    activity_type: string;
    duration_minutes: number;
  }[];
}

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  subscription_status: string;
  photo_url?: string;
  programs: Program[];
  daily_stats: DailyStats[];
  nutrition: NutritionEntry[];
}

interface Program {
  id: string;
  title: string;
  description: string;
  created_at: string;
  status: string;
  exercises: Exercise[];
}

interface Exercise {
  id: string;
  name: string;
  description: string;
  video_url?: string;
  exercise_order: number;
  notes?: string;
  sets: {
    set_number: number;
    reps: string;
    weight?: string;
  }[];
}

interface ProgressPhoto {
  url: string;
  filename: string;
  date: string;
}

const tabs = [
  { id: 'program', label: 'Программа', icon: Dumbbell },
  { id: 'nutrition', label: 'Питание', icon: Apple },
  { id: 'activity', label: 'Бытовая активность', icon: Activity },
  { id: 'progress', label: 'Прогресс', icon: LineChart },
  { id: 'analysis', label: 'Анализы', icon: FileText }
] as const;

export function ClientProfile() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('program');
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [showProgramBuilder, setShowProgramBuilder] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);

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

  useEffect(() => {
    if (clientId) {
      fetchClientData();
      if (activeTab === 'progress') {
        fetchPhotos();
      }
    }
  }, [clientId, activeTab]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const { data: clientData, error: clientError } = await supabase
        .from('client_profiles')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);
    } catch (error: any) {
      console.error('Error fetching client data:', error);
      toast.error('Ошибка при загрузке данных клиента');
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotos = async () => {
    if (!clientId) return;

    try {
      setLoadingPhotos(true);

      const { data: files, error: storageError } = await supabase.storage
        .from('client-photos')
        .list('progress-photos', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'desc' }
        });

      if (storageError) throw storageError;

      const photos = await Promise.all(
        (files || [])
          .filter(file => file.name.startsWith(clientId))
          .map(async file => {
            const parts = file.name.split('-');
            if (parts.length >= 2) {
              const timestamp = parseInt(parts[1]);
              if (!isNaN(timestamp)) {
                const date = new Date(timestamp);
                const { data: { publicUrl } } = supabase.storage
                  .from('client-photos')
                  .getPublicUrl(`progress-photos/${file.name}`);
                
                return {
                  url: publicUrl,
                  filename: file.name,
                  date: date.toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                };
              }
            }
            return null;
          })
      );

      setProgressPhotos(
        photos
          .filter((photo): photo is ProgressPhoto => photo !== null)
          .sort((a, b) => {
            const dateA = new Date(a.date.split(',')[0].split('.').reverse().join('-'));
            const dateB = new Date(b.date.split(',')[0].split('.').reverse().join('-'));
            return dateB.getTime() - dateA.getTime();
          })
      );
    } catch (error: any) {
      console.error('Error fetching photos:', error);
      toast.error('Ошибка при загрузке фотографий');
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handleDeletePhoto = async (filename: string) => {
    if (!window.confirm('Вы уверены, что хотите удалить это фото?')) {
      return;
    }

    try {
      const { error } = await supabase.storage
        .from('client-photos')
        .remove([`progress-photos/${filename}`]);

      if (error) throw error;

      setProgressPhotos(photos => photos.filter(photo => photo.filename !== filename));
      toast.success('Фото удалено');
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error('Ошибка при удалении фото');
    }
  };

  const menuItems = [
    {
      icon: <Users className="w-5 h-5 min-w-[20px]" />,
      label: 'Клиенты',
      onClick: () => navigate('/trainer/clients')
    },
    {
      icon: <Calendar className="w-5 h-5 min-w-[20px]" />,
      label: 'Расписание',
      onClick: () => navigate('/trainer/calendar')
    }
  ];

  const renderProgramContent = () => {
    if (showProgramBuilder) {
      return (
        <ProgramBuilder
          clientId={clientId!}
          programId={editingProgram?.id}
          onSave={() => {
            setShowProgramBuilder(false);
            setEditingProgram(null);
            fetchClientData();
          }}
          onCancel={() => {
            setShowProgramBuilder(false);
            setEditingProgram(null);
          }}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-gray-800">Программы тренировок</h3>
          <button
            onClick={() => {
              setEditingProgram(null);
              setShowProgramBuilder(true);
            }}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            <Plus className="w-5 h-5 mr-2 inline-block" />
            Создать программу
          </button>
        </div>

        {client?.programs?.length > 0 ? (
          <div className="space-y-6">
            {client.programs.map((program) => (
              <div key={program.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-800">{program.title}</h3>
                      <p className="text-gray-600 mt-1">{program.description}</p>
                      <div className="flex items-center mt-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4 mr-2" />
                        {new Date(program.created_at).toLocaleDateString('ru-RU')}
                        <span className={`ml-4 px-2 py-1 rounded-full ${
                          program.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {program.status === 'active' ? 'Активна' : 'Завершена'}
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingProgram(program);
                          setShowProgramBuilder(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Редактировать программу"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProgram(program);
                          setShowWorkoutModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Запланировать тренировку"
                      >
                        <Calendar className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            №
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Упражнение
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Подходы
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {program.exercises.map((exercise, index) => (
                          <tr key={exercise.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {exercise.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <div className="space-y-1">
                                {exercise.sets.map((set, setIndex) => (
                                  <div key={setIndex} className="flex items-center space-x-2">
                                    <span>Подход {set.set_number}:</span>
                                    <span>{set.reps} повторений</span>
                                    {set.weight && (
                                      <span className="text-gray-500">× {set.weight} кг</span>
                                    )}
                                  </div>
                                ))}
                                {exercise.notes && (
                                  <div className="text-gray-500 italic">{exercise.notes}</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Dumbbell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">У клиента пока нет программ тренировок</p>
          </div>
        )}
      </div>
    );
  };

  const renderNutritionContent = () => {
    if (!client?.nutrition?.length) {
      return (
        <div className="text-center py-12">
          <Apple className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Нет записей о питании</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {client.nutrition.map((entry) => (
          <div key={entry.id} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 p-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">{new Date(entry.date).toLocaleDateString('ru-RU')}</h3>
                <div className="mt-1 text-sm text-gray-500 space-x-4">
                  <span>Б: {entry.proteins}г</span>
                  <span>Ж: {entry.fats}г</span>
                  <span>У: {entry.carbs}г</span>
                  <span>Вода: {entry.water}л</span>
                </div>
              </div>
            </div>
            {entry.photos && entry.photos.length > 0 && (
              <div className="p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {entry.photos.map((photo, index) => {
                  const { data: { publicUrl } } = supabase.storage
                    .from('client-photos')
                    .getPublicUrl(photo);
                    
                  return (
                    <a
                      key={index}
                      href={publicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block aspect-square rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={publicUrl}
                        alt={`Фото еды ${new Date(entry.date).toLocaleDateString('ru-RU')} #${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderActivityContent = () => {
    if (!client?.daily_stats?.length) {
      return (
        <div className="text-center py-12">
          <Home className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Нет данных о бытовой активности</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {client.daily_stats.map((stats) => (
          <div key={stats.date} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b">
              <h3 className="font-medium">
                {new Date(stats.date).toLocaleDateString('ru-RU', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric'
                })}
              </h3>
            </div>

            <div className="p-4">
              {/* Activities */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Активности:</h4>
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
          </div>
        ))}
      </div>
    );
  };

  const renderProgressContent = () => {
    if (loadingPhotos) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      );
    }

    if (progressPhotos.length === 0) {
      return (
        <div className="text-center py-12">
          <Camera className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">У клиента пока нет фотографий прогресса</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {progressPhotos.map((photo, index) => (
          <div key={index} className="border rounded-lg overflow-hidden">
            <div className="p-3 bg-gray-50 border-b">
              <div className="flex items-center justify-between">
                <span className="font-medium">{photo.date}</span>
                <button
                  onClick={() => handleDeletePhoto(photo.filename)}
                  className="p-1 text-red-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors"
                  title="Удалить фото"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="p-3">
              <img
                src={photo.url}
                alt={`Progress photo ${photo.date}`}
                className="w-full max-h-[300px] rounded-lg object-contain"
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      );
    }

    if (!client) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Клиент не найден</p>
        </div>
      );
    }

    switch (activeTab) {
      case 'program':
        return renderProgramContent();
      case 'nutrition':
        return renderNutritionContent();
      case 'activity':
        return renderActivityContent();
      case 'progress':
        return renderProgressContent();
      case 'analysis':
        return (
          <div className="text-center py-8">
            <p className="text-gray-600">Раздел в разработке</p>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Клиент не найден</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarLayout
      title="HARDCASE"
      menuItems={menuItems}
      backTo="/trainer/clients"
    >
      {/* Client Header */}
      <div className="bg-white shadow-md p-4 md:p-6 mb-4 md:mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl md:text-2xl font-bold text-orange-500">
              {client.first_name[0]}{client.last_name[0]}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 truncate">
              {client.first_name} {client.last_name}
            </h2>
            <p className="text-gray-600 truncate">{client.email}</p>
          </div>
          <div className="flex-shrink-0">
            <span className={`px-3 py-1 rounded-full text-sm ${
              client.subscription_status === 'active'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {client.subscription_status === 'active' ? 'Активная подписка' : 'Подписка неактивна'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-md mb-4 md:mb-6 sticky top-0 z-10">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex p-2 md:p-3 space-x-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 md:px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-2 flex-shrink-0" />
                  <span className="text-sm md:text-base">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="px-4 md:px-6 pb-6">
        {renderTabContent()}
      </div>

      {/* Workout Modal */}
      {showWorkoutModal && (
        <WorkoutModal
          isOpen={showWorkoutModal}
          onClose={() => {
            setShowWorkoutModal(false);
            setSelectedProgram(null);
          }}
          selectedDate={selectedDate}
          onWorkoutCreated={fetchClientData}
          workout={null}
          program={selectedProgram}
          clientId={clientId}
        />
      )}
    </SidebarLayout>
  );
}