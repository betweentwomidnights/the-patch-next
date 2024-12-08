import React from 'react';
import useBackendStatus from './hooks/useBackendStatus';

interface StatusIndicatorProps {
  statusUrl: string;
  label: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ statusUrl, label }) => {
  const status = useBackendStatus(statusUrl);

  const getStatusColor = () => {
    if (status === 'live') {
      return 'bg-green-500';
    } else if (status === 'down') {
      return 'bg-red-500';
    } else {
      return 'bg-yellow-500'; // Indicate checking or unknown status with yellow
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <div className={`w-4 h-4 rounded-full ${getStatusColor()}`} />
      <span className="text-white">{label}</span>
    </div>
  );
};

export default StatusIndicator;
