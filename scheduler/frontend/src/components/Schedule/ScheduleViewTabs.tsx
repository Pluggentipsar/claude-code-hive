/**
 * Schedule View Tabs - Multi-view navigation for schedule visualization
 */

import { useState } from 'react';
import type { ScheduleDetail } from '../../types';
import { WeekView } from './WeekView';
import { DayView } from './DayView';
import { OverviewView } from './OverviewView';
import { ClassView } from './ClassView';
import { StaffScheduleView } from './StaffScheduleView';
import { StudentScheduleView } from './StudentScheduleView';

interface ScheduleViewTabsProps {
  schedule: ScheduleDetail | null;
  isLoading?: boolean;
}

type ViewType = 'overview' | 'class' | 'week' | 'day' | 'staff' | 'student';

export function ScheduleViewTabs({ schedule, isLoading }: ScheduleViewTabsProps) {
  const [activeView, setActiveView] = useState<ViewType>('overview');
  const [showSchool, setShowSchool] = useState(true);
  const [showFritids, setShowFritids] = useState(true);
  const [selectedWeekday, setSelectedWeekday] = useState<number>(0);

  const tabs: Array<{ id: ViewType; label: string; icon: string }> = [
    { id: 'overview', label: 'Översikt', icon: '🚁' },
    { id: 'class', label: 'Per klass', icon: '📚' },
    { id: 'week', label: 'Veckokalender', icon: '📅' },
    { id: 'day', label: 'Per dag', icon: '📋' },
    { id: 'staff', label: 'Personal', icon: '👤' },
    { id: 'student', label: 'Elev', icon: '👶' },
  ];

  // Filter for school/fritids
  const filterProps = {
    showSchool,
    showFritids,
    onToggleSchool: () => setShowSchool(!showSchool),
    onToggleFritids: () => setShowFritids(!showFritids),
  };

  return (
    <div className="space-y-4">
      {/* Tab navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {/* Tabs */}
          <div className="flex space-x-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveView(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">Filter:</span>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSchool}
                onChange={filterProps.onToggleSchool}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Skola</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showFritids}
                onChange={filterProps.onToggleFritids}
                className="w-4 h-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Fritids</span>
            </label>
          </div>
        </div>
      </div>

      {/* Day selector for day view */}
      {activeView === 'day' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center space-x-2">
            {['Måndag', 'Tisdag', 'Onsdag', 'Torsdag', 'Fredag'].map((day, index) => (
              <button
                key={day}
                onClick={() => setSelectedWeekday(index)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedWeekday === index
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active view content */}
      <div>
        {activeView === 'overview' && (
          <OverviewView schedule={schedule} isLoading={isLoading} {...filterProps} />
        )}
        {activeView === 'class' && (
          <ClassView schedule={schedule} isLoading={isLoading} {...filterProps} />
        )}
        {activeView === 'week' && (
          <WeekView schedule={schedule} isLoading={isLoading} />
        )}
        {activeView === 'day' && schedule && (
          <DayView
            weekday={selectedWeekday}
            assignments={schedule.assignments}
            onAssignmentClick={(assignment) => {
              console.log('Clicked assignment:', assignment);
            }}
          />
        )}
        {activeView === 'staff' && (
          <StaffScheduleView schedule={schedule} isLoading={isLoading} {...filterProps} />
        )}
        {activeView === 'student' && (
          <StudentScheduleView schedule={schedule} isLoading={isLoading} {...filterProps} />
        )}
      </div>
    </div>
  );
}
