import React from 'react';
import { useStatusStore } from '@/stores/statusStore';

const AgentStatusDisplay: React.FC = () => {
  const latestStatus = useStatusStore((state) => state.latestStatus);

  if (!latestStatus) {
    return null; // Don't render anything if there's no status
  }

  return (
    <div style={styles.statusBar}>
      <span style={styles.icon}>⏳</span> {latestStatus}
    </div>
  );
};

// Basic inline styles for simplicity, consider moving to CSS/CSS-in-JS
const styles: { [key: string]: React.CSSProperties } = {
  statusBar: {
    backgroundColor: '#e0f2fe', /* Light blue background */
    color: '#0c4a6e', /* Dark blue text */
    padding: '5px 15px',
    fontSize: '0.85rem',
    textAlign: 'center',
    borderBottom: '1px solid #bae6fd',
    position: 'fixed',
    top: '60px', /* Adjust based on your header/layout */
    left: 0,
    width: '100%',
    zIndex: 50, /* Ensure visibility */
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: '8px',
  },
};

export default AgentStatusDisplay;
