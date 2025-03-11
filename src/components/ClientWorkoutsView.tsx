import React, { useState } from 'react';
import { SidebarLayout } from './SidebarLayout';
import { WorkoutsCalendarView } from './WorkoutsCalendarView';
import { useNavigate } from 'react-router-dom';
import { useClientNavigation } from '../lib/navigation';
import { MeasurementsInputModal } from './MeasurementsInputModal';
import toast from 'react-hot-toast';

export function ClientWorkoutsView() {
  const navigate = useNavigate();
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showMeasurementsModal, setShowMeasurementsModal] = useState(false);

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

  const handleOpenMeasurementsModal = () => {
    setShowMeasurementsModal(true);
  };

  const menuItems = useClientNavigation(showFabMenu, setShowFabMenu, handleMenuItemClick, handleOpenMeasurementsModal);

  return (
    <SidebarLayout
      menuItems={menuItems}
      variant="bottom"
      backTo="/client"
    >
      <WorkoutsCalendarView />
      
      {/* Measurements Input Modal */}
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
    </SidebarLayout>
  );
}