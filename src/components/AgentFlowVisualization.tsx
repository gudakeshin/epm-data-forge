import React from 'react';
import { useStatusStore } from '@/stores/statusStore';

const AGENT_STEPS = [
  { key: 'Coordinator', label: 'Coordinator', desc: 'Orchestrates all agent activities' },
  { key: 'Model Definition', label: 'Model Definition', desc: 'Defines structure and parameters' },
  { key: 'Expert Modeler', label: 'Expert Modeler', desc: 'Analyzes and optimizes models' },
  { key: 'Dependency', label: 'Dependency', desc: 'Manages relationships between elements' },
  { key: 'Data Generation', label: 'Data Generation', desc: 'Creates synthetic data sets' },
  { key: 'Validation', label: 'Validation', desc: 'Verifies data model integrity' },
];

function getActiveAgent(latestStatus: string): string | null {
  // Try to match agent name in the status string
  for (const step of AGENT_STEPS) {
    if (
      latestStatus.toLowerCase().includes(step.key.toLowerCase()) ||
      latestStatus.toLowerCase().includes(step.label.toLowerCase())
    ) {
      return step.key;
    }
  }
  return null;
}

const Arrow: React.FC<{ active?: boolean }> = ({ active }) => (
  <svg height="28" width="24" className="mx-auto block" style={{ minHeight: 28 }}>
    <line x1="12" y1="0" x2="12" y2="20" stroke={active ? '#2563eb' : '#cbd5e1'} strokeWidth="2" strokeDasharray={active ? '4,2' : '2,4'}>
      <animate attributeName="stroke-dashoffset" values="0;6" dur="0.7s" repeatCount="indefinite" />
    </line>
    <polygon points="6,20 18,20 12,28" fill={active ? '#2563eb' : '#cbd5e1'}>
      {active && <animate attributeName="fill" values="#2563eb;#60a5fa;#2563eb" dur="1s" repeatCount="indefinite" />}
    </polygon>
  </svg>
);

const AgentFlowVisualization: React.FC = () => {
  const latestStatus = useStatusStore((state) => state.latestStatus);
  const activeAgent = latestStatus ? getActiveAgent(latestStatus) : null;

  return (
    <div className="bg-white rounded-lg shadow p-3 w-full max-w-[220px] mx-auto mt-4 border border-border">
      <h2 className="text-base font-semibold mb-3 text-gray-800 text-center">Agent Flow</h2>
      <div className="flex flex-col items-center gap-0.5">
        {AGENT_STEPS.map((step, idx) => {
          const isActive = activeAgent === step.key;
          return (
            <div key={step.key} className="w-full">
              <div
                className={`flex items-center gap-2 rounded-md px-2 py-1 w-full transition-colors text-xs ${
                  isActive
                    ? 'bg-primary/10 border border-primary text-primary'
                    : 'bg-gray-100 text-gray-500 border border-transparent'
                }`}
              >
                <div
                  className={`flex items-center justify-center rounded-full w-6 h-6 font-bold text-xs mr-1 ${
                    isActive ? 'bg-primary text-white' : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {idx + 1}
                </div>
                <div>
                  <div className={`font-semibold leading-tight ${isActive ? 'text-primary' : 'text-gray-700'}`}>{step.label}</div>
                  <div className="text-[10px] leading-tight">{step.desc}</div>
                </div>
              </div>
              {idx < AGENT_STEPS.length - 1 && <Arrow active={activeAgent === AGENT_STEPS[idx + 1].key} />}
            </div>
          );
        })}
      </div>
      <div className="mt-3 text-xs text-gray-400 text-center">
        {activeAgent ? null : 'No agent currently active'}
      </div>
    </div>
  );
};

export default AgentFlowVisualization; 