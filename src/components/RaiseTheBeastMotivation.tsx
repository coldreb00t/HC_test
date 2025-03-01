// RaiseTheBeastMotivation.tsx
import React, { useState } from 'react';
import { Dumbbell, Share2 } from 'lucide-react';
import buffaloImg from '@/assets/beasts/buffalo.png';
import rhinoImg from '@/assets/beasts/rhino.png';
import hippoImg from '@/assets/beasts/hippo.png';
import elephantImg from '@/assets/beasts/elephant.png';
import whaleImg from '@/assets/beasts/whale.png';
import { ShareAchievementModal } from './ShareAchievementModal';

interface BeastLevel {
  name: string;
  threshold: number; // в кг
  image: string;
  description: string;
}

interface RaiseTheBeastMotivationProps {
  totalVolume: number;
  userName: string;
}

const BEAST_LEVELS: BeastLevel[] = [
  {
    name: 'Буйвол',
    threshold: 1500,
    image: buffaloImg,
    description: 'Сила дикой природы пробуждается!'
  },
  {
    name: 'Носорог',
    threshold: 2000,
    image: rhinoImg,
    description: 'Мощь бронированного гиганта!'
  },
  {
    name: 'Бегемот',
    threshold: 3000,
    image: hippoImg,
    description: 'Несокрушимая мощь реки!'
  },
  {
    name: 'Слон',
    threshold: 5000,
    image: elephantImg,
    description: 'Король силы джунглей!'
  },
  {
    name: 'Кит',
    threshold: 10000,
    image: whaleImg,
    description: 'Легенда морей и вершина силы!'
  }
];

export function RaiseTheBeastMotivation({ totalVolume, userName }: RaiseTheBeastMotivationProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const currentBeast = BEAST_LEVELS.reduce((prev, curr) => 
    totalVolume >= prev.threshold && totalVolume < curr.threshold ? prev : 
    totalVolume >= curr.threshold ? curr : prev, 
    { name: 'Новичок', threshold: 0, image: '', description: 'Начни свой путь!' } as BeastLevel
  );

  const nextBeast = BEAST_LEVELS.find(beast => beast.threshold > totalVolume) || 
    BEAST_LEVELS[BEAST_LEVELS.length - 1];

  const volumeToNext = nextBeast.threshold - totalVolume;
  const progressPercentage = Math.min(
    ((totalVolume - currentBeast.threshold) / (nextBeast.threshold - currentBeast.threshold)) * 100, 
    100
  );

  const handleShare = () => {
    setShowShareModal(true);
  };

  const achievement = {
    title: `Подними зверя: ${currentBeast.name}`,
    description: currentBeast.description,
    icon: <Dumbbell className="w-5 h-5 text-orange-500" />,
    value: `${totalVolume} кг`
  };

  return (
    <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-6 text-white shadow-md relative overflow-hidden">
      {currentBeast.image && (
        <div 
          className="absolute inset-0 opacity-20 bg-center bg-no-repeat bg-contain pointer-events-none"
          style={{ backgroundImage: `url(${currentBeast.image})` }}
        />
      )}

      <div className="flex items-center mb-4">
        <Dumbbell className="w-8 h-8 mr-3" />
        <h2 className="text-xl font-bold">Подними зверя!</h2>
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-2xl font-bold text-orange-400">{currentBeast.name}</h3>
            <p className="text-sm text-gray-300">{currentBeast.description}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{totalVolume} кг</p>
            <p className="text-sm text-gray-400">Твой общий объём</p>
          </div>
        </div>

        {currentBeast.name !== nextBeast.name && (
          <div className="mb-4">
            <div className="flex justify-between items-center text-sm mb-2">
              <span>До {nextBeast.name}</span>
              <span>{volumeToNext} кг осталось</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-orange-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-orange-500/20 p-4 rounded-lg mb-4">
          <p className="text-center text-sm">
            {currentBeast.name === 'Новичок' 
              ? 'Начни тренироваться и пробуди своего первого зверя!' 
              : currentBeast.name === nextBeast.name 
              ? 'Ты достиг вершины! Ты настоящий монстр силы!' 
              : `Продолжай в том же духе, чтобы пробудить ${nextBeast.name}!`}
          </p>
        </div>

        {currentBeast.name !== 'Новичок' && (
          <button
            onClick={handleShare}
            className="w-full flex items-center justify-center gap-2 p-3 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
          >
            <Share2 className="w-5 h-5" />
            <span>Поделиться в соцсетях</span>
          </button>
        )}
      </div>

      {showShareModal && (
        <ShareAchievementModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          achievement={achievement}
          userName={userName}
        />
      )}
    </div>
  );
}