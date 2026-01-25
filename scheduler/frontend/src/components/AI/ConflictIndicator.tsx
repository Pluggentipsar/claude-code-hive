/**
 * Conflict indicator component - shows warning badge
 */

interface ConflictIndicatorProps {
  count: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  onClick?: () => void;
}

export function ConflictIndicator({
  count,
  severity = 'medium',
  onClick,
}: ConflictIndicatorProps) {
  if (count === 0) return null;

  const getSeverityColor = () => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600 text-white';
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-white';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium
        ${getSeverityColor()}
        hover:opacity-90 transition-opacity
        ${onClick ? 'cursor-pointer' : 'cursor-default'}
      `}
    >
      <span>⚠️</span>
      <span>
        {count} konflikt{count !== 1 ? 'er' : ''}
      </span>
    </button>
  );
}
