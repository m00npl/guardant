// GuardAnt UI Components
// Shared React components for the GuardAnt platform

import React from 'react';

export const AntButton = ({ children, ...props }: any) => {
  return React.createElement('button', props, children);
};

export const AntCard = ({ children, ...props }: any) => {
  return React.createElement('div', { className: 'ant-card', ...props }, children);
};

// Export all components
export * from './components/AntButton';
export * from './components/AntCard';