// FIX: Added type declarations for the chrome extension API to resolve TS errors.
declare namespace chrome {
  namespace runtime {
    const onInstalled: {
      addListener(callback: () => void): void;
    };
  }
  namespace alarms {
    function create(name: string, alarmInfo: { periodInMinutes: number }): void;
    const onAlarm: {
      addListener(callback: (alarm: { name: string }) => void): void;
    };
  }
  namespace storage {
    namespace local {
      function get(keys: string[]): Promise<{ [key: string]: any }>;
      function set(items: { [key: string]: any }): Promise<void>;
    }
  }
  namespace notifications {
    function create(notificationId: string, options: any): void;
    function clear(notificationId: string): void;
    const onClicked: {
      addListener(callback: (notificationId: string) => void): void;
    };
    const onClosed: {
      addListener(callback: (notificationId: string, byUser: boolean) => void): void;
    };
  }
  namespace tabs {
    function create(createProperties: { url: string }): void;
  }
}

// This would be compiled to background.js
import type { Settings, Task } from './types';
import { fetchTasks } from './services/tududiApi';
import { setupLoggingFromStorage } from './utils/logging';

const activeNotificationPollers: { [notificationId: string]: number } = {};

// Create an alarm to check for tasks every 5 minutes
chrome.runtime.onInstalled.addListener(async () => {
  await setupLoggingFromStorage();
  chrome.alarms.create('taskChecker', {
    periodInMinutes: 5,
  });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  await setupLoggingFromStorage();
  if (alarm.name === 'taskChecker') {
    const settingsResult = await chrome.storage.local.get(['settings']);
    const settings: Settings = settingsResult.settings || {};

    if (!settings.notificationsEnabled || !settings.serverUrl || !settings.username || !settings.password) {
      console.log('Notifications disabled or settings incomplete. Skipping check.');
      return;
    }
    
    try {
      const allTasks = await fetchTasks(settings);
      const now = new Date();
      // The check interval is 5 minutes, so we look for reminders that should have fired in the last 5 minutes.
      const checkIntervalStart = new Date(now.getTime() - 5 * 60 * 1000); 
      
      const dueTasks = allTasks.filter(task => {
        if (!task.dueDate || task.reminderValue === null || !task.reminderUnit) {
          return false;
        }

        const dueDate = new Date(task.dueDate);
        let reminderMillis = 0;
        switch (task.reminderUnit) {
          case 'minutes':
            reminderMillis = task.reminderValue * 60 * 1000;
            break;
          case 'hours':
            reminderMillis = task.reminderValue * 60 * 60 * 1000;
            break;
          case 'days':
            reminderMillis = task.reminderValue * 24 * 60 * 60 * 1000;
            break;
        }
        const reminderTime = new Date(dueDate.getTime() - reminderMillis);
        return reminderTime > checkIntervalStart && reminderTime <= now;
      });

      const notifiedTasksResult = await chrome.storage.local.get(['notifiedTasks']);
      const notifiedTasks: { [taskId: string]: string | null } = notifiedTasksResult.notifiedTasks || {};

      for (const task of dueTasks) {
        if (notifiedTasks[task.id] !== task.dueDate) {
          // FINAL CHECK: Before notifying, fetch the latest task status from the server.
          const freshTasks = await fetchTasks(settings);
          const currentTaskState = freshTasks.find(t => t.id === task.id);

          // If the task is gone or its due date has changed, it's stale. Don't notify.
          if (!currentTaskState || currentTaskState.dueDate !== task.dueDate) {
            console.log(`Task ${task.id} is stale. Aborting notification.`);
            notifiedTasks[task.id] = currentTaskState ? currentTaskState.dueDate : null;
            continue;
          }

          const dueDate = new Date(task.dueDate!);
          const dueTime = dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          const message = task.project
            ? `[${task.project.name}] ${task.content} (due at ${dueTime})`
            : `${task.content} (due at ${dueTime})`;
            
          chrome.notifications.create(task.id, {
            type: 'basic',
            iconUrl: 'logo.png',
            title: 'TuDuDi Task Reminder',
            message: message,
            priority: 2,
          });
          
          notifiedTasks[task.id] = task.dueDate;

          // Start polling to clear notification if task changes on server.
          if (activeNotificationPollers[task.id]) {
            clearInterval(activeNotificationPollers[task.id]);
          }

          const intervalId = setInterval(async () => {
            console.log(`Polling for notification status of task: ${task.id}`);
            try {
                const pollerSettingsResult = await chrome.storage.local.get(['settings']);
                const pollerSettings = pollerSettingsResult.settings || {};

                if (!pollerSettings.serverUrl) {
                    chrome.notifications.clear(task.id);
                    return; // onClosed will handle cleanup
                }
                
                const allCurrentTasks = await fetchTasks(pollerSettings);
                const taskAfterPoll = allCurrentTasks.find(t => t.id === task.id);

                if (!taskAfterPoll || taskAfterPoll.dueDate !== task.dueDate) {
                    console.log(`Task ${task.id} is outdated. Clearing notification via poll.`);
                    chrome.notifications.clear(task.id); // onClosed will handle cleanup
                }
            } catch (error) {
                console.error(`Error during poll for task ${task.id}. Clearing notification.`, error);
                chrome.notifications.clear(task.id); // onClosed will handle cleanup
            }
          }, 30 * 1000);

          activeNotificationPollers[task.id] = intervalId as unknown as number;
        }
      }
      
      const existingTaskIds = new Set(allTasks.map(t => t.id));
      const cleanedNotifiedTasks: { [taskId: string]: string | null } = {};
      for (const taskId in notifiedTasks) {
        if (existingTaskIds.has(taskId)) {
          cleanedNotifiedTasks[taskId] = notifiedTasks[taskId];
        }
      }
      await chrome.storage.local.set({ notifiedTasks: cleanedNotifiedTasks });

    } catch (error) {
      console.error('Error fetching tasks for notifications:', error);
    }
  }
});

// Handle notification click
chrome.notifications.onClicked.addListener(async (notificationId) => {
  await setupLoggingFromStorage();
  const settingsResult = await chrome.storage.local.get(['settings']);
  const settings: Settings = settingsResult.settings || {};

  if (settings.serverUrl) {
    const taskUrl = `${settings.serverUrl.replace(/\/$/, '')}/task/${notificationId}`;
    chrome.tabs.create({ url: taskUrl });
    chrome.notifications.clear(notificationId);
  }
});

// Handle notification close (either by user or programmatically) to stop polling
chrome.notifications.onClosed.addListener(async (notificationId) => {
    await setupLoggingFromStorage();
    if (activeNotificationPollers[notificationId]) {
        clearInterval(activeNotificationPollers[notificationId]);
        delete activeNotificationPollers[notificationId];
        console.log(`Polling stopped for closed notification: ${notificationId}`);
    }
});