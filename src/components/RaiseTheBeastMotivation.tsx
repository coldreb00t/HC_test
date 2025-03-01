import { useState, useEffect } from 'react'; // Removed unused React import
import { Share2 } from 'lucide-react';
import { ShareAchievementModal } from './ShareAchievementModal';

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

export function RaiseTheBeastMotivation({ totalVolume, userName }: RaiseTheBeastMotivationProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [cardHeight, setCardHeight] = useState('85vh');

  useEffect(() => {
    const setResponsiveHeight = () => {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      if (viewportWidth < 375) {
        setCardHeight('82vh');
      } else if (viewportHeight < 700) {
        setCardHeight('80vh');
      } else if (viewportHeight > 900) {
        setCardHeight('90vh');
      } else {
        setCardHeight('85vh');
      }
    };

    setResponsiveHeight();
    window.addEventListener('resize', setResponsiveHeight);
    
    return () => {
      window.removeEventListener('resize', setResponsiveHeight);
    };
  }, []);

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
    console.log('Передаваемое изображение зверя:', currentBeast.image, 'Тип:', typeof currentBeast.image);
    setShowShareModal(true);
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
      className="bg-gradient-to-r from-gray-900 to-black rounded-xl p-4 text-white shadow-lg relative overflow-hidden w-full mx-auto flex flex-col"
      style={{ height: cardHeight }}
    >
      {currentBeast.image && (
        <div className="absolute inset-0 bg-center bg-no-repeat bg-cover bg-origin-border pointer-events-none opacity-100" 
          style={{ backgroundImage: `url(${beastImageUrl})` }}
        />
      )}
      
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 right-0 h-28 bg-gradient-to-b from-gray-900/90 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-900/90 to-transparent"></div>
      </div>
      
      <div className="relative z-10 flex flex-row items-center justify-between -mx-4 -mt-4 pt-6 pb-12 px-4 safe-top">
        <div className="text-left backdrop-blur-sm bg-black/40 px-3 py-1 rounded-lg">
          <p className="text-4xl font-bold text-orange-500 drop-shadow-md">
            {totalVolume} <span className="text-xl font-medium">кг</span>
          </p>
          <p className="text-sm text-white drop-shadow-md">Поднятый вес</p>
        </div>
        
        {currentBeast.name !== 'Новичок' && (
          <button
            onClick={handleShare}
            className="p-3 bg-orange-500/30 rounded-full hover:bg-orange-500/50 transition-colors touch-manipulation backdrop-blur-sm"
            aria-label="Поделиться в соцсетях"
          >
            <Share2 className="w-6 h-6 text-white drop-shadow-md" />
          </button>
        )}
      </div>
      
      <div className="flex-grow flex flex-col justify-center">
        {isMaxLevel && (
          <div className="relative z-10 mx-auto text-center px-4 py-2 bg-orange-500/30 backdrop-blur-sm rounded-lg">
            <p className="text-white font-medium text-lg drop-shadow-md">
              Достигнут максимальный уровень!
            </p>
          </div>
        )}
      </div>
      
      {currentBeast.name !== 'Новичок' && !isMaxLevel && (
        <div className="relative z-10 -mx-4 w-[calc(100%+2rem)] mb-3">
          <div className="h-3 w-full bg-gray-700/50">
            <div 
              className="h-full bg-orange-500 transition-all duration-700 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          
          <div className="flex justify-center mt-2">
            <div className="text-sm text-white font-medium px-4 py-1 rounded-full bg-black/70 backdrop-blur-sm">
              До следующего уровня <span className="text-orange-400 font-bold">осталось {volumeToNext} кг</span>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 mt-auto -mx-4 -mb-4 bg-gradient-to-t from-gray-900/90 to-transparent px-0 pt-16 pb-6 w-[calc(100%+2rem)] safe-bottom">
        <h3 className="text-3xl font-bold text-orange-400 text-center drop-shadow-lg">{currentBeast.name}</h3>
        <p className="text-lg text-white mt-2 text-center px-6 max-w-md mx-auto drop-shadow-md">{currentBeast.weightPhrase}</p>
      </div>
      
      {showShareModal && (
        <ShareAchievementModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          achievement={{
            title: `Подними зверя: ${currentBeast.name}`,
            description: currentBeast.weightPhrase,
            icon: null,
            value: `${totalVolume} кг`
          }}
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