// GuardAnt UI Components
// Shared React components for the GuardAnt platform

export const AntButton = ({ children, ...props }: any) => {
  return <button {...props}>{children}</button>;
};

export const AntCard = ({ children, ...props }: any) => {
  return <div className="ant-card" {...props}>{children}</div>;
};

// Export all components
export * from './components/AntButton';
export * from './components/AntCard';