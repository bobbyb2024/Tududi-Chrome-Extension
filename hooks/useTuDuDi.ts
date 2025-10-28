// FIX: Added type declarations for the chrome extension API to resolve TS errors.
declare namespace chrome {
  namespace storage {
    namespace local {
      function get(keys: string[]): Promise<{ [key: string]: any }>;
      function set(items: { [key: string]: any }): Promise<void>;
    }
  }
}

import { useState, useEffect, useCallback } from 'react';
import type { Task, Project, Settings, Tag, ReschedulePayload } from '../types';
import { TaskType } from '../types';
import * as api from '../services/tududiApi';

const isExtensionContext = typeof chrome?.storage?.local !== 'undefined';

export const useTuDuDi = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [inboxTasks, setInboxTasks] = useState<Task[]>([]);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async (): Promise<Settings> => {
    try {
      if (isExtensionContext) {
        const result = await chrome.storage.local.get(['settings']);
        return result.settings || {};
      } else {
        console.warn('Not in a Chrome extension context. Using localStorage.');
        const storedSettings = localStorage.getItem('tududi-settings');
        return storedSettings ? JSON.parse(storedSettings) : {};
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(`Failed to load settings: ${errorMessage}`);
      return {};
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: Settings) => {
    setSettings(newSettings);
    try {
      if (isExtensionContext) {
        await chrome.storage.local.set({ settings: newSettings });
      } else {
        localStorage.setItem('tududi-settings', JSON.stringify(newSettings));
      }
    } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        setError(`Failed to save settings: ${errorMessage}`);
    }
  }, []);

  const fetchData = useCallback(async (isInitialLoad = false) => {
    if (!settings.serverUrl || !settings.username || !settings.password) {
        setLoading(false);
        setInboxTasks([]);
        setTodayTasks([]);
        setUpcomingTasks([]);
        setProjects([]);
        setTags([]);
        return;
    }
    
    if (isInitialLoad) {
      setLoading(true);
    }
    setError(null);

    try {
      const [fetchedTasks, fetchedProjects, fetchedTags] = await Promise.all([
        api.fetchTasks(settings),
        api.fetchProjects(settings),
        api.fetchTags(settings),
      ]);

      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const inbox: Task[] = [];
      const todayList: Task[] = [];
      const upcomingList: Task[] = [];
      
      fetchedTasks.forEach(item => {
        // Inbox items are those without a project
        if (!item.project) {
          inbox.push(item);
        }
        
        // Notes also go to the inbox for visibility, unless they are assigned to a project.
        if (item.type === TaskType.NOTE && !item.project) {
            if (!inbox.find(t => t.id === item.id)) {
                inbox.push(item);
            }
        }
        
        if (item.dueDate) {
          const dueDate = new Date(item.dueDate);
          const taskDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
          
          if (taskDateStart.getTime() === todayStart.getTime()) {
            todayList.push(item);
          } else if (taskDateStart.getTime() > todayStart.getTime()) {
            upcomingList.push(item);
          }
        }
      });
      
      setInboxTasks(inbox);
      setTodayTasks(todayList);
      setUpcomingTasks(upcomingList);
      setProjects(fetchedProjects);
      setTags(fetchedTags);

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [settings]);

  const addItem = useCallback(async (content: string, type: TaskType, projectId?: string, dueDate?: string, reminderValue?: number, reminderUnit?: 'minutes' | 'hours' | 'days') => {
    if (!settings.serverUrl) {
      setError("Cannot add item: Server URL is not configured.");
      throw new Error("Server URL not configured");
    }
    try {
      await api.addItem({ content, type, projectId, dueDate, reminderValue, reminderUnit }, settings);
      await fetchData(); // Refetch data to show the new item
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to add item: ${errorMessage}`);
        throw err;
    }
  }, [settings, fetchData]);

  const editTask = useCallback(async (task: Task) => {
    if (!settings.serverUrl) {
      setError("Cannot edit task: Server URL is not configured.");
      throw new Error("Server URL not configured");
    }
    try {
      await api.editTask(task, settings);
      await fetchData(); // Refetch data to show the update
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to edit task: ${errorMessage}`);
      throw err;
    }
  }, [settings, fetchData]);

  const deleteTask = useCallback(async (taskId: string) => {
    if (!settings.serverUrl) {
      setError("Cannot delete task: Server URL is not configured.");
      throw new Error("Server URL not configured");
    }
    try {
      await api.deleteTask(taskId, settings);
      await fetchData(); // Refetch data to show the update
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete task: ${errorMessage}`);
      throw err;
    }
  }, [settings, fetchData]);
  
  const rescheduleTasks = useCallback(async (taskIds: string[], payload: ReschedulePayload) => {
    if (!settings.serverUrl) {
      const errorMsg = "Cannot reschedule: Server URL is not configured.";
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    const allTasks = [...inboxTasks, ...todayTasks, ...upcomingTasks];
    const uniqueTasks = Array.from(new Map(allTasks.map(t => [t.id, t])).values());
    const tasksToUpdate = uniqueTasks.filter(t => taskIds.includes(t.id));

    const updatePromises = tasksToUpdate.map(task => {
      let newDueDate: Date;
      
      if (payload.mode === 'specific' && payload.date) {
        newDueDate = new Date(payload.date + 'T00:00:00');
      } else if (payload.mode === 'relative' && payload.value !== undefined && payload.unit) {
        const baseDate = task.dueDate ? new Date(task.dueDate) : new Date();
        switch (payload.unit) {
          case 'minutes': baseDate.setMinutes(baseDate.getMinutes() + payload.value); break;
          case 'hours': baseDate.setHours(baseDate.getHours() + payload.value); break;
          case 'days': baseDate.setDate(baseDate.getDate() + payload.value); break;
          case 'months': baseDate.setMonth(baseDate.getMonth() + payload.value); break;
          case 'years': baseDate.setFullYear(baseDate.getFullYear() + payload.value); break;
        }
        newDueDate = baseDate;
      } else {
        return Promise.resolve(); // Skip if payload is invalid
      }

      const updatedTask: Task = {
        ...task,
        dueDate: newDueDate.toISOString(),
      };
      
      return api.editTask(updatedTask, settings);
    });

    try {
      await Promise.all(updatePromises);
      await fetchData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to reschedule tasks: ${errorMessage}`);
      throw err;
    }
  }, [settings, fetchData, inboxTasks, todayTasks, upcomingTasks]);

  // Initial load of settings
  useEffect(() => {
    loadSettings().then(s => {
      setSettings(s);
    });
  }, [loadSettings]);
  
  // Fetch data when settings change (initial fetch)
  useEffect(() => {
    if (settings.serverUrl && settings.username && settings.password) {
      fetchData(true);
    } else {
      setLoading(false);
      setInboxTasks([]);
      setTodayTasks([]);
      setUpcomingTasks([]);
      setProjects([]);
      setTags([]);
    }
  }, [settings.serverUrl, settings.username, settings.password, fetchData]);

  // Set up polling for when the popup is open
  useEffect(() => {
    if (settings.serverUrl && settings.username && settings.password) {
      const intervalId = setInterval(() => {
        fetchData(false); // subsequent fetches are not "initial"
      }, 20000); // 20 seconds

      return () => clearInterval(intervalId);
    }
  }, [settings.serverUrl, settings.username, settings.password, fetchData]);

  return {
    settings,
    inboxTasks,
    todayTasks,
    upcomingTasks,
    projects,
    tags,
    loading,
    error,
    fetchData: () => fetchData(true), // expose a manual refresh that shows loading
    saveSettings,
    addItem,
    editTask,
    deleteTask,
    rescheduleTasks,
  };
};
