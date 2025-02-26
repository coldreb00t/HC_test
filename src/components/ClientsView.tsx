import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User, Calendar, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  subscription_status: string;
  next_workout?: {
    id: string;
    start_time: string;
    title: string;
  };
}

export function ClientsView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const { data, error } = await supabase
        .from('client_profiles')
        .select('*')
        .order('first_name');

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast.error(error.message || 'Ошибка при загрузке списка клиентов');
    } finally {
      setLoading(false);
    }
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/trainer/clients/${clientId}`);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Клиенты</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Клиенты</h2>
        <div className="flex flex-col items-center justify-center h-64">
          <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mb-4" />
          <p className="text-gray-500 text-base sm:text-lg">Нет клиентов</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Клиенты</h2>
      <div className="space-y-3 sm:space-y-4">
        {clients.map((client) => (
          <div
            key={client.id}
            onClick={() => handleClientClick(client.id)}
            className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center space-x-3 sm:space-x-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-base sm:text-lg font-medium text-orange-500">
                  {client.first_name[0]}{client.last_name[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm sm:text-base font-medium text-gray-900 truncate">
                    {client.first_name} {client.last_name}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs sm:text-sm rounded-full ${
                      client.subscription_status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {client.subscription_status === 'active' ? 'Активна' : 'Неактивна'}
                  </span>
                </div>
                <div className="flex items-center text-xs sm:text-sm text-gray-600 mt-1">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                  <span className="truncate">
                    {client.next_workout
                      ? new Date(client.next_workout.start_time).toLocaleString('ru-RU', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Нет тренировки'}
                  </span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}