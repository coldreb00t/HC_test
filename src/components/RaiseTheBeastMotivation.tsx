// RaiseTheBeastMotivation.tsx
import React, { useState } from 'react';
import { Dumbbell, Share2 } from 'lucide-react';
import buffaloImg from '@/assets/beasts/buffalo.png';
import rhinoImg from '@/assets/beasts/rhino.png';
import sealImg from '@/assets/beasts/seal.png'; // Для Северного морского слона
import hippoImg from '@/assets/beasts/hippo.png';
import walrusImg from '@/assets/beasts/walrus.png'; // Для Моржа
import elephantImg from '@/assets/beasts/elephant.png';
import whaleImg from '@/assets/beasts/whale.png'; // Для Гренландского кита
import seaElephantImg from '@/assets/beasts/sea-elephant.png'; // Для Южного морского слона
import spermWhaleImg from '@/assets/beasts/sperm-whale.png'; // Для Кашалота
import whaleSharkImg from '@/assets/beasts/whale-shark.png'; // Для Китовой акулы
import orcaImg from '@/assets/beasts/orca.png'; // Для Косатки
import { ShareAchievementModal } from './ShareAchievementModal';

interface BeastLevel {
  name: string;
  threshold: number; // в кг
  image: string;
  weightPhrase: string; // Уникальная фраза о весе
  motivationPhrase: string; // Мотивационная фраза
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
    weightPhrase: '1500 кг уже под твоим контролем!',
    motivationPhrase: 'Ты размялся и несёшься, как буйвол! Первая ступень силы покорена — дальше только интереснее.'
  },
  {
    name: 'Носорог',
    threshold: 2000,
    image: rhinoImg,
    weightPhrase: '2000 кг, которые не смогли тебя остановить!',
    motivationPhrase: 'Твой напор сравним с носорогом, сносящим всё на своём пути! Закаляй характер, ведь впереди ещё более мощные соперники.'
  },
  {
    name: 'Северный морской слон',
    threshold: 2500,
    image: sealImg,
    weightPhrase: '2500 кг: словно лёд, треснувший под твоей мощью!',
    motivationPhrase: 'Ты овладел силой, сравнимой с ледяным морским гигантом! Пусть ни холод, ни преграды не остановят твой прогресс.'
  },
  {
    name: 'Бегемот',
    threshold: 3000,
    image: hippoImg,
    weightPhrase: '3000 кг? Ты разогрелся, как будто это было легко!',
    motivationPhrase: 'Мощь твоя велика, как бегемот в полноводной реке! Ты уже входишь в высшую лигу силачей — продолжай в том же духе.'
  },
  {
    name: 'Морж',
    threshold: 3500,
    image: walrusImg,
    weightPhrase: '3500 кг покорились твоей упорной воле!',
    motivationPhrase: 'Ты достиг уровня моржа! Твоя решимость впечатляет, а впереди новые вершины, которые ждут твоей силы.'
  },
  {
    name: 'Африканский слон',
    threshold: 4000,
    image: elephantImg,
    weightPhrase: '4000 кг — теперь это твоя новая норма!',
    motivationPhrase: 'Поднять слона — это уже легенда! Отныне твой рёв слышен, как трубный зов африканского великана.'
  },
  {
    name: 'Гренландский кит (молодой)',
    threshold: 4500,
    image: whaleImg,
    weightPhrase: '4500 кг, и ты погружаешься в неизведанные глубины!',
    motivationPhrase: 'Молодой гренландский кит тебе по силам — а ты продолжаешь плыть дальше! Почувствуй всю глубину своих возможностей.'
  },
  {
    name: 'Южный морской слон',
    threshold: 5000,
    image: seaElephantImg,
    weightPhrase: '5000 кг преодолены: ты на пути к рекордным глубинам!',
    motivationPhrase: 'Ты справился с одним из самых тяжёлых обитателей Земли! Пусть твои усилия несут тебя к новым рекордам.'
  },
  {
    name: 'Кашалот (молодой)',
    threshold: 5500,
    image: spermWhaleImg,
    weightPhrase: '5500 кг: ты уже хозяин океанского безмолвия!',
    motivationPhrase: 'Ты опустился на глубину, где правят кашалоты. Продолжай погружение — там тебя ждут самые редкие трофеи!'
  },
  {
    name: 'Китовая акула (молодая)',
    threshold: 6000,
    image: whaleSharkImg,
    weightPhrase: '6000 кг, а твоя сила растёт, как океанская волна!',
    motivationPhrase: 'Ты достиг веса молодой китовой акулы! Ощути гордость в этом моменте и двигайся дальше, не теряя темпа.'
  },
  {
    name: 'Косатка',
    threshold: 6500,
    image: orcaImg,
    weightPhrase: '6500 кг, и ты вскарабкался на самую вершину океанской пищевой цепи!',
    motivationPhrase: 'Ты покорил косатку, хищника океана, и вошёл в историю собственного прогресса! Теперь за тобой только твоя легенда.'
  }
];

export function RaiseTheBeastMotivation({ totalVolume, userName }: RaiseTheBeastMotivationProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const currentBeast = BEAST_LEVELS.reduce((prev, curr) => 
    totalVolume >= prev.threshold && totalVolume < curr.threshold ? prev : 
    totalVolume >= curr.threshold ? curr : prev, 
    { name: 'Новичок', threshold: 0, image: '', weightPhrase: 'Начни свой путь!', motivationPhrase: 'Начни тренироваться и пробуди своего первого зверя!' } as BeastLevel
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
    description: currentBeast.weightPhrase,
    icon: <Dumbbell className="w-6 h-6 text-orange-500" />,
    value: `${totalVolume} кг`
  };

  return (
    <div className="bg-gradient-to-r from-gray-900 to-black rounded-lg p-3 sm:p-4 md:p-6 text-white shadow-md relative overflow-hidden max-w-md mx-auto">
      {currentBeast.image && (
        <div 
          className="absolute inset-0 bg-center bg-no-repeat bg-cover pointer-events-none"
          style={{ backgroundImage: `url(${currentBeast.image})` }}
        />
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-2 sm:mb-4 bg-gradient-to-t from-black/60 to-transparent p-1 sm:p-2 rounded-t-lg">
        <div className="flex items-center mb-2 sm:mb-0">
          <Dumbbell className="w-5 sm:w-6 h-5 sm:h-6 mr-1 sm:mr-2 text-orange-500" />
          <h2 className="text-lg sm:text-xl font-bold">Подними зверя!</h2>
        </div>
        <div className="text-right flex items-center gap-1 sm:gap-2">
          {currentBeast.name !== 'Новичок' && (
            <button
              onClick={handleShare}
              className="p-1 sm:p-2 bg-brown-800/80 rounded-full hover:bg-brown-700/80 transition-colors"
              aria-label="Поделиться в соцсетях"
            >
              <Share2 className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
            </button>
          )}
          <div>
            <p className="text-lg sm:text-xl md:text-2xl font-bold text-white">{totalVolume} кг</p>
            <p className="text-xs sm:text-sm text-gray-400">Поднятый вес</p>
          </div>
        </div>
      </div>

      <div className="relative z-10">
        <div className="mb-2 sm:mb-4 bg-gradient-to-t from-black/60 to-transparent p-2 sm:p-3 rounded-lg">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-orange-400">{currentBeast.name}</h3>
          <p className="text-sm sm:text-sm md:text-base text-gray-300 line-clamp-2">{currentBeast.weightPhrase}</p>
        </div>

        {currentBeast.name !== nextBeast.name && (
          <div className="mb-2 sm:mb-4 bg-gradient-to-t from-black/60 to-transparent p-2 sm:p-3 rounded-lg">
            <div className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm mb-1 sm:mb-2 text-gray-300">
              <span>До {nextBeast.name}</span>
              <span>{volumeToNext} кг осталось</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-1.5 sm:h-2 overflow-hidden">
              <div 
                className="bg-orange-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        <div className="bg-gradient-to-t from-black/60 to-transparent p-2 sm:p-4 rounded-lg mb-2 sm:mb-4">
          <p className="text-xs sm:text-sm md:text-base text-center line-clamp-3">
            {currentBeast.motivationPhrase}
          </p>
        </div>
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