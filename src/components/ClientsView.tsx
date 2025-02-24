import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Mail, Phone, Calendar } from 'lucide-react';
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
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Клиенты</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Клиенты</h2>
        <div className="flex flex-col items-center justify-center h-64">
          <User className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-500 text-lg">Нет клиентов</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Клиенты</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {clients.map((client) => (
          <div
            key={client.id}
            className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => handleClientClick(client.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-orange-500" />
                </div>
                <div className="ml-3">
                  <h3 className="font-semibold text-gray-800">
                    {client.first_name} {client.last_name}
                  </h3>
                  <span className={`text-sm px-2 py-1 rounded ${
                    client.subscription_status === 'active' 
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {client.subscription_status === 'active' ? 'Активная подписка' : 'Подписка неактивна'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                {client.email || 'Не указан'}
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2" />
                {client.phone || 'Не указан'}
              </div>
              <div className="flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                {client.next_workout 
                  ? `Следующая тренировка: ${new Date(client.next_workout.start_time).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}`
                  : 'Нет запланированных тренировок'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}