import React, { useState, useMemo } from 'react';
import TaskItem from './TaskItem';
import { InboxIcon, TodayIcon, UpcomingIcon, SearchIcon, SortIcon } from './Icons';
import type { useTuDuDi } from '../hooks/useTuDuDi';
import type { Task } from '../types';

interface MainViewProps {
  tududi: ReturnType<typeof useTuDuDi>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  selectedTaskIds: Set<string>;
  onToggleSelection: (taskId: string) => void;
}

type SortKey = 'dueDate' | 'creationDate' | 'content';

const MainView: React.FC<MainViewProps> = ({ tududi, onEditTask, onDeleteTask, selectedTaskIds, onToggleSelection }) => {
  const { inboxTasks, todayTasks, upcomingTasks, loading, error, settings } = tududi;
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('dueDate');

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg">
        <p className="font-bold">An error occurred:</p>
        <p>{error}</p>
      </div>
    );
  }
  
  const sortedAndFilteredTasks = useMemo(() => {
    const lowercasedQuery = searchQuery.toLowerCase();

    const sortFn = (a: Task, b: Task): number => {
      switch (sortBy) {
        case 'creationDate':
          // Newest first
          return parseInt(b.id) - parseInt(a.id);
        case 'content': {
          const contentCompare = a.content.localeCompare(b.content);
          if (contentCompare !== 0) return contentCompare;
          // Fallback to creation date (newest first)
          return parseInt(b.id) - parseInt(a.id);
        }
        case 'dueDate':
        default: {
          const aHasDate = !!a.dueDate;
          const bHasDate = !!b.dueDate;

          if (aHasDate && !bHasDate) return -1;
          if (!aHasDate && bHasDate) return 1;
          if (!aHasDate && !bHasDate) {
            // Both have no due date, sort by creation date (newest first)
            return parseInt(b.id) - parseInt(a.id);
          }
          
          // We can assert non-null because of the checks above
          const timeA = new Date(a.dueDate!).getTime();
          const timeB = new Date(b.dueDate!).getTime();
          
          if (timeA !== timeB) return timeA - timeB;
          
          // Due dates are the same, sort by creation date as a tie-breaker (newest first)
          return parseInt(b.id) - parseInt(a.id);
        }
      }
    };

    const filterAndSort = (tasks: Task[]) => {
      return tasks
        .filter(t => t.content.toLowerCase().includes(lowercasedQuery))
        .sort(sortFn);
    };
    
    return {
      inbox: filterAndSort(inboxTasks),
      today: filterAndSort(todayTasks),
      upcoming: filterAndSort(upcomingTasks),
    };

  }, [searchQuery, sortBy, inboxTasks, todayTasks, upcomingTasks]);


  // FIX: Replaced any[] with Task[] for improved type safety.
  const renderTaskList = (title: string, tasks: Task[], icon: React.ReactNode) => (
    <div className="mb-6">
      <h2 className="text-xl font-semibold mb-3 text-gray-300 flex items-center">
        {icon}
        <span className="ml-2">{title}</span>
      </h2>
      <div className="space-y-2">
        {tasks.length > 0 ? (
          tasks.map(task => 
            <TaskItem 
                key={task.id} 
                task={task} 
                serverUrl={settings.serverUrl!} 
                onEdit={onEditTask} 
                onDelete={onDeleteTask}
                isSelected={selectedTaskIds.has(task.id)}
                onToggleSelection={onToggleSelection}
            />
          )
        ) : (
          <p className="text-gray-500 italic px-2">
            {searchQuery ? 'No matching tasks found.' : 'No tasks here. Enjoy the quiet!'}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in pb-16">
       <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-grow">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <SearchIcon className="w-5 h-5 text-gray-500" />
            </span>
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 pl-10 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="relative">
             <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="appearance-none w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 pl-3 pr-8 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                aria-label="Sort tasks by"
              >
                <option value="dueDate">Due Date</option>
                <option value="creationDate">Creation Date</option>
                <option value="content">Content</option>
              </select>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <SortIcon className="w-5 h-5 text-gray-400" />
              </span>
          </div>
        </div>

      {renderTaskList('Inbox', sortedAndFilteredTasks.inbox, <InboxIcon className="w-6 h-6 text-indigo-400" />)}
      {renderTaskList('Today', sortedAndFilteredTasks.today, <TodayIcon className="w-6 h-6 text-green-400" />)}
      {renderTaskList('Upcoming', sortedAndFilteredTasks.upcoming, <UpcomingIcon className="w-6 h-6 text-amber-400" />)}
    </div>
  );
};

export default MainView;