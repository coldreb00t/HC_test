import { Dumbbell, Activity, Plus, X, Camera, Apple, Scale } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const useClientNavigation = (showFabMenu: boolean, setShowFabMenu: (show: boolean) => void, handleMenuItemClick: (action: string) => void) => {
  const navigate = useNavigate();

  return [
    {
      icon: <Dumbbell className="w-7.5 h-7.5" />,
      label: 'Тренировки',
      onClick: () => navigate('/client/workouts')
    },
    {
      icon: <Activity className="w-7.5 h-7.5" />,
      label: 'Активность',
      onClick: () => navigate('/client/activity')
    },
    {
      icon: (
        <div className="relative -mt-8">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setShowFabMenu(!showFabMenu);
            }}
            className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-orange-600 transition-colors cursor-pointer"
          >
            {showFabMenu ? (
              <X className="w-7.5 h-7.5" />
            ) : (
              <Plus className="w-7.5 h-7.5" />
            )}
          </div>
          {showFabMenu && (
            <div className="absolute bottom-16 -left-24 bg-white rounded-lg shadow-lg overflow-hidden w-48">
              <div className="py-2">
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuItemClick('activity');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
                >
                  <Activity className="w-5 h-5 text-green-500" />
                  <span>Активность</span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuItemClick('photo');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-purple-500" />
                  <span>Фото прогресса</span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuItemClick('measurements');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
                >
                  <Scale className="w-5 h-5 text-blue-500" />
                  <span>Замеры</span>
                </div>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMenuItemClick('nutrition');
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2 cursor-pointer"
                >
                  <Apple className="w-5 h-5 text-red-500" />
                  <span>Питание</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ),
      label: 'Добавить',
      onClick: () => {}
    },
    {
      icon: <Camera className="w-7.5 h-7.5" />,
      label: 'Прогресс',
      onClick: () => navigate('/client/progress')
    },
    {
      icon: <Apple className="w-7.5 h-7.5" />,
      label: 'Питание',
      onClick: () => navigate('/client/nutrition')
    }
  ];
};