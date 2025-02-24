import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Users, 
  Calendar,
  Activity,
  Dumbbell,
  Heart,
  Home
} from 'lucide-react';
import { ClientsView } from './ClientsView';
import { CalendarView } from './CalendarView';
import { ActivityView } from './ActivityView';
import { StrengthExercisesView } from './StrengthExercisesView';
import { SidebarLayout } from './SidebarLayout';

interface TrainerDashboardProps {
  defaultView?: 'calendar' | 'clients' | 'base' | 'strength' | 'cardio' | 'activity';
}

export function TrainerDashboard({ defaultView = 'base' }: TrainerDashboardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeView, setActiveView] = useState<'calendar' | 'clients' | 'base' | 'strength' | 'cardio' | 'activity'>(defaultView);

  const menuItems = [
    {
      icon: <Users className="w-5 h-5 min-w-[20px]" />,
      label: 'Клиенты',
      onClick: () => {
        setActiveView('clients');
        navigate('/trainer/clients');
      }
    },
    {
      icon: <Calendar className="w-5 h-5 min-w-[20px]" />,
      label: 'Расписание',
      onClick: () => {
        setActiveView('calendar');
        navigate('/trainer/calendar');
      }
    },
    {
      icon: <Activity className="w-5 h-5 min-w-[20px]" />,
      label: 'База',
      onClick: () => {
        setActiveView('base');
        navigate('/trainer');
      }
    }
  ];

  const renderBaseContent = () => (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">База</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Силовые упражнения */}
        <div 
          className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveView('strength')}
        >
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-800">Силовые упражнения</h3>
          </div>
          <p className="text-gray-600 mb-4">
            База силовых упражнений для развития мышечной массы и силы
          </p>
          <button className="text-orange-500 hover:text-orange-600 font-medium">
            Открыть раздел
          </button>
        </div>

        {/* Кардио */}
        <div 
          className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveView('cardio')}
        >
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Heart className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-800">Кардио</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Упражнения для развития выносливости и сердечно-сосудистой системы
          </p>
          <button className="text-orange-500 hover:text-orange-600 font-medium">
            Открыть раздел
          </button>
        </div>

        {/* Бытовая активность */}
        <div 
          className="bg-gray-50 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => setActiveView('activity')}
        >
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-orange-500" />
            </div>
            <h3 className="ml-3 text-lg font-semibold text-gray-800">Бытовая активность</h3>
          </div>
          <p className="text-gray-600 mb-4">
            Отслеживание повседневной физической активности
          </p>
          <button className="text-orange-500 hover:text-orange-600 font-medium">
            Открыть раздел
          </button>
        </div>
      </div>
    </div>
  );

  const getMenuItems = () => {
    if (['strength', 'cardio', 'activity'].includes(activeView)) {
      return [
        {
          icon: <Activity className="w-5 h-5 min-w-[20px]" />,
          label: 'База',
          onClick: () => {
            setActiveView('base');
            navigate('/trainer');
          }
        }
      ];
    }
    return menuItems;
  };

  return (
    <SidebarLayout
      title="HARDCASE"
      menuItems={getMenuItems()}
      onBack={['strength', 'cardio', 'activity'].includes(activeView) ? () => {
        setActiveView('base');
        navigate('/trainer');
      } : undefined}
    >
      {activeView === 'calendar' ? <CalendarView /> : 
       activeView === 'clients' ? <ClientsView /> :
       activeView === 'strength' ? <StrengthExercisesView /> :
       activeView === 'activity' ? <ActivityView /> :
       activeView === 'base' ? renderBaseContent() : 
       <div className="bg-white rounded-xl shadow-md p-6">
         <h2 className="text-2xl font-bold text-gray-800">Раздел в разработке</h2>
       </div>}
    </SidebarLayout>
  );
}