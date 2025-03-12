import { useState } from 'react'; // Removed unused React import
import { Share2 } from 'lucide-react';
import { ShareAchievementModal } from './ShareAchievementModal';
import { ReactNode } from 'react';

// Используем import.meta.glob для динамической загрузки изображений
const images = import.meta.glob('/src/assets/beasts/*.png', { eager: true, as: 'url' });

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
  onShare?: (beastInfo: {
    title: string;
    description: string;
    value: string;
    icon: ReactNode;
    color: string;
    bgImage: string;
    motivationalPhrase: string;
    beastComponent: boolean;
  }) => void;
}

const BEAST_LEVELS: BeastLevel[] = [
  {
    name: 'Буйвол',
    threshold: 1500,
    image: '/src/assets/beasts/buffalo.png',
    weightPhrase: '1500 кг уже под твоим контролем!',
    motivationPhrase: 'Ты размялся и несёшься, как буйвол! Первая ступень силы покорена — дальше только интереснее.'
  },
  {
    name: 'Носорог',
    threshold: 2000,
    image: '/src/assets/beasts/rhino.png',
    weightPhrase: '2000 кг, которые не смогли тебя остановить!',
    motivationPhrase: 'Твой напор сравним с носорогом, сносящим всё на своём пути! Закаляй характер, ведь впереди ещё более мощные соперники.'
  },
  {
    name: 'Северный морской слон',
    threshold: 2500,
    image: '/src/assets/beasts/seal.png',
    weightPhrase: '2500 кг: словно лёд, треснувший под твоей мощью!',
    motivationPhrase: 'Ты овладел силой, сравнимой с ледяным морским гигантом! Пусть ни холод, ни преграды не остановят твой прогресс.'
  },
  {
    name: 'Бегемот',
    threshold: 3000,
    image: '/src/assets/beasts/hippo.png',
    weightPhrase: '3000 кг? Ты разогрелся, как будто это было легко!',
    motivationPhrase: 'Мощь твоя велика, как бегемот в полноводной реке! Ты уже входишь в высшую лигу силачей — продолжай в том же духе.'
  },
  {
    name: 'Морж',
    threshold: 3500,
    image: '/src/assets/beasts/walrus.png',
    weightPhrase: '3500 кг покорились твоей упорной воле!',
    motivationPhrase: 'Ты достиг уровня моржа! Твоя решимость впечатляет, а впереди новые вершины, которые ждут твоей силы.'
  },
  {
    name: 'Африканский слон',
    threshold: 4000,
    image: '/src/assets/beasts/elephant.png',
    weightPhrase: '4000 кг — теперь это твоя новая норма!',
    motivationPhrase: 'Поднять слона — это уже легенда! Отныне твой рёв слышен, как трубный зов африканского великана.'
  },
  {
    name: 'Гренландский кит (молодой)',
    threshold: 4500,
    image: '/src/assets/beasts/whale.png',
    weightPhrase: '4500 кг, и ты погружаешься в неизведанные глубины!',
    motivationPhrase: 'Молодой гренландский кит тебе по силам — а ты продолжаешь плыть дальше! Почувствуй всю глубину своих возможностей.'
  },
  {
    name: 'Южный морской слон',
    threshold: 5000,
    image: '/src/assets/beasts/sea-elephant.png',
    weightPhrase: '5000 кг преодолены: ты на пути к рекордным глубинам!',
    motivationPhrase: 'Ты справился с одним из самых тяжёлых обитателей Земли! Пусть твои усилия несут тебя к новым рекордам.'
  },
  {
    name: 'Кашалот (молодой)',
    threshold: 5500,
    image: '/src/assets/beasts/sperm-whale.png',
    weightPhrase: '5500 кг: ты уже хозяин океанского безмолвия!',
    motivationPhrase: 'Ты опустился на глубину, где правят кашалоты. Продолжай погружение — там тебя ждут самые редкие трофеи!'
  },
  {
    name: 'Китовая акула (молодая)',
    threshold: 6000,
    image: '/src/assets/beasts/whale-shark.png',
    weightPhrase: '6000 кг, а твоя сила растёт, как океанская волна!',
    motivationPhrase: 'Ты достиг веса молодой китовой акулы! Ощути гордость в этом моменте и двигайся дальше, не теряя темпа.'
  },
  {
    name: 'Косатка',
    threshold: 6500,
    image: '/src/assets/beasts/orca.png',
    weightPhrase: '6500 кг, и ты вскарабкался на самую вершину океанской пищевой цепи!',
    motivationPhrase: 'Ты покорил косатку, хищника океана, и вошёл в историю собственного прогресса! Теперь за тобой только твоя легенда.'
  }
];

export function RaiseTheBeastMotivation({ totalVolume, userName, onShare }: RaiseTheBeastMotivationProps) {
  const [showShareModal, setShowShareModal] = useState(false);

  const currentBeast = BEAST_LEVELS.reduce((prev, curr) => 
    totalVolume >= prev.threshold && totalVolume < curr.threshold ? prev : 
    totalVolume >= curr.threshold ? curr : prev, 
    { name: 'Новичок', threshold: 0, image: '', weightPhrase: 'Начни свой путь!', motivationPhrase: 'Начни тренироваться и пробуди своего первого зверя!' } as BeastLevel
  );

  const nextBeast = BEAST_LEVELS.find(beast => beast.threshold > totalVolume) || 
    BEAST_LEVELS[BEAST_LEVELS.length - 1];

  const volumeToNext = Math.max(0, nextBeast.threshold - totalVolume);
  const progressPercentage = Math.min(
    ((totalVolume - currentBeast.threshold) / (nextBeast.threshold - currentBeast.threshold)) * 100, 
    100
  );

  const handleShare = () => {
    if (onShare) {
      // Если передана родительская функция, используем её
      const beastImageUrl = currentBeast.image ? getImageUrl(currentBeast.image) : '';
      onShare({
        title: currentBeast.name,
        description: currentBeast.weightPhrase,
        value: `${totalVolume} кг`,
        icon: null,
        color: 'bg-pink-500',
        bgImage: beastImageUrl,
        motivationalPhrase: currentBeast.motivationPhrase,
        beastComponent: true
      });
    } else {
      // В противном случае используем внутреннюю модалку (fallback)
      console.log('Передаваемое изображение зверя:', currentBeast.image, 'Тип:', typeof currentBeast.image);
      setShowShareModal(true);
    }
  };

  const isMaxLevel = currentBeast.name === BEAST_LEVELS[BEAST_LEVELS.length - 1].name;

  // Динамически получаем URL изображения через import.meta.glob
  const getImageUrl = (imagePath: string) => {
    const imageKey = Object.keys(images).find(key => key.endsWith(imagePath.replace(/^\/src/, '')));
    if (imageKey) {
      return images[imageKey] as string; // Возвращаем URL изображения
    }
    console.warn('Изображение не найдено:', imagePath);
    return ''; // Возвращаем пустую строку, если изображение не найдено
  };

  const beastImageUrl = currentBeast.image ? getImageUrl(currentBeast.image) : '';

  return (
    <div 
      className="bg-gradient-to-r from-gray-900 to-black rounded-xl p-3 text-white shadow-lg relative overflow-hidden w-full mx-auto flex flex-col h-full"
    >
      {currentBeast.image && (
        <div className="absolute inset-0 bg-center bg-no-repeat bg-contain bg-origin-border pointer-events-none opacity-100" 
          style={{ backgroundImage: `url(${beastImageUrl})` }}
        />
      )}
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-gray-900/90 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-900/90 to-transparent"></div>
      </div>
      
      <div className="relative z-10 flex flex-row items-center justify-between -mx-3 -mt-3 pt-4 pb-6 px-3">
        <div className="text-left backdrop-blur-sm bg-black/40 px-2 py-1 rounded-lg">
          <p className="text-3xl font-bold text-orange-500 drop-shadow-md">
            {totalVolume} <span className="text-lg font-medium">кг</span>
          </p>
          <p className="text-xs text-white drop-shadow-md">Поднятый вес</p>
        </div>
        
        {currentBeast.name !== 'Новичок' && (
          <button
            onClick={handleShare}
            className="p-2 bg-orange-500/30 rounded-full hover:bg-orange-500/50 transition-colors touch-manipulation backdrop-blur-sm"
            aria-label="Поделиться в соцсетях"
          >
            <Share2 className="w-5 h-5 text-white drop-shadow-md" />
          </button>
        )}
      </div>
      
      <div className="flex-grow flex flex-col justify-center">
        {isMaxLevel && (
          <div className="relative z-10 mx-auto text-center px-3 py-1 bg-orange-500/30 backdrop-blur-sm rounded-lg">
            <p className="text-white font-medium text-base drop-shadow-md">
              Достигнут максимальный уровень!
            </p>
          </div>
        )}
      </div>
      
      {currentBeast.name !== 'Новичок' && !isMaxLevel && (
        <div className="relative z-10 -mx-3 w-[calc(100%+1.5rem)] mb-2">
          <div className="h-2 w-full bg-gray-700/50">
            <div 
              className="h-full bg-orange-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="flex justify-center mt-1">
            <div className="text-xs text-white font-medium px-3 py-0.5 rounded-full bg-black/70 backdrop-blur-sm">
              До следующего уровня <span className="text-orange-400 font-bold">осталось {volumeToNext} кг</span>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 mt-auto -mx-3 -mb-3 bg-gradient-to-t from-gray-900/90 to-transparent px-0 pt-12 pb-4 w-[calc(100%+1.5rem)]">
        <h3 className="text-2xl font-bold text-orange-400 text-center drop-shadow-lg max-w-[90%] mx-auto text-balance" style={{ fontSize: 'clamp(1.25rem, 5vw, 1.5rem)' }}>{currentBeast.name}</h3>
        <p className="text-sm text-white mt-1 text-center px-4 max-w-md mx-auto drop-shadow-md">{currentBeast.weightPhrase}</p>
        <p className="text-xs text-gray-300 mt-1 text-center px-4 max-w-md mx-auto italic">{currentBeast.motivationPhrase}</p>
      </div>
      
      {showShareModal && (
        <ShareAchievementModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          userName={userName}
          beastName={currentBeast.name}
          weightPhrase={currentBeast.weightPhrase}
          totalVolume={totalVolume}
          nextBeastThreshold={nextBeast.threshold}
          currentBeastThreshold={currentBeast.threshold}
          beastImage={beastImageUrl}
        />
      )}
    </div>
  );
}