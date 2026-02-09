import { ReactNode } from 'react';

interface RoleCardProps {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  color: 'blue' | 'green' | 'orange';
  selected: boolean;
  onClick: () => void;
}

export default function RoleCard({ id, title, description, icon, color, selected, onClick }: RoleCardProps) {
  const colorClasses = {
    blue: {
      gradient: 'from-blue-600 to-blue-700',
      ring: 'ring-blue-500',
      bg: 'bg-blue-50',
      iconHover: 'group-hover:scale-110 group-hover:rotate-3',
      border: 'border-blue-200',
    },
    green: {
      gradient: 'from-green-600 to-green-700',
      ring: 'ring-green-500',
      bg: 'bg-green-50',
      iconHover: 'group-hover:scale-110 group-hover:rotate-3',
      border: 'border-green-200',
    },
    orange: {
      gradient: 'from-orange-600 to-orange-700',
      ring: 'ring-orange-500',
      bg: 'bg-orange-50',
      iconHover: 'group-hover:scale-110 group-hover:rotate-3',
      border: 'border-orange-200',
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      onClick={onClick}
      onKeyPress={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        group relative p-4 rounded-xl cursor-pointer 
        transition-all duration-300 ease-out
        ${selected 
          ? `ring-2 ${colors.ring} ${colors.bg} shadow-lg scale-[1.02]` 
          : 'border-2 border-gray-200 hover:border-gray-300 hover:shadow-md hover:scale-[1.01]'
        }
      `}
    >
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center animate-[scaleIn_0.3s_ease-out]">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      <div className="flex items-center space-x-3">
        {/* Icon */}
        <div className={`
          w-12 h-12 rounded-lg flex items-center justify-center
          bg-gradient-to-br ${colors.gradient}
          shadow-lg transition-all duration-300
          ${colors.iconHover}
        `}>
          <div className="text-white text-xl">
            {icon}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="text-base font-bold text-gray-900 mb-0.5">
            {title}
          </h3>
          <p className="text-xs text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>

        {/* Arrow indicator */}
        <div className={`
          transition-all duration-300
          ${selected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}
        `}>
          <svg className={`w-5 h-5 ${selected ? 'text-blue-600' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
