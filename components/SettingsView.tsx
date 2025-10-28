import React, { useState, useEffect } from 'react';
import type { Settings, View } from '../types';
import type { useTuDuDi } from '../hooks/useTuDuDi';


interface SettingsViewProps {
  tududi: ReturnType<typeof useTuDuDi>;
  setView: (view: View) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ tududi, setView }) => {
  const [localSettings, setLocalSettings] = useState<Settings>(tududi.settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocalSettings(tududi.settings);
  }, [tududi.settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setLocalSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await tududi.saveSettings(localSettings);
    setSaved(true);
    setTimeout(() => {
        setSaved(false);
        if(localSettings.serverUrl) {
            setView('main');
        }
    }, 1500);
  };

  return (
    <div className="p-2 animate-fade-in">
      <h2 className="text-xl font-bold mb-4 text-gray-200">Settings</h2>
      {!tududi.settings.serverUrl && (
          <div className="bg-blue-900/50 border border-blue-700 text-blue-300 px-4 py-3 rounded-lg relative mb-4" role="alert">
            <strong className="font-bold">Welcome!</strong>
            <span className="block sm:inline"> Please configure your TuDuDi server to get started.</span>
        </div>
      )}
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label htmlFor="serverUrl" className="block text-sm font-medium text-gray-400">Server URL</label>
          <input
            type="url"
            name="serverUrl"
            id="serverUrl"
            value={localSettings.serverUrl || ''}
            onChange={handleChange}
            placeholder="https://tududi.example.com"
            className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-400">Username</label>
          <input
            type="text"
            name="username"
            id="username"
            value={localSettings.username || ''}
            onChange={handleChange}
            className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-400">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            value={localSettings.password || ''}
            onChange={handleChange}
            className="mt-1 block w-full bg-gray-800 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="flex items-center justify-between pt-2">
          <span className="text-sm font-medium text-gray-400">Enable Due Date Notifications</span>
           <label htmlFor="notificationsEnabled" className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="notificationsEnabled"
                id="notificationsEnabled"
                checked={localSettings.notificationsEnabled || false}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
        </div>

        <div className="border-t border-gray-700 my-4"></div>

        <h3 className="text-md font-semibold text-gray-300 mb-2">Developer Options</h3>
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium text-gray-400">Developer Mode</span>
                    <p className="text-xs text-gray-500">Use mock data instead of connecting to the server.</p>
                </div>
                <label htmlFor="devModeEnabled" className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        name="devModeEnabled"
                        id="devModeEnabled"
                        checked={localSettings.devModeEnabled || false}
                        onChange={handleChange}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-sm font-medium text-gray-400">Enable Console Logging</span>
                    <p className="text-xs text-gray-500">Show logs in the browser's developer console.</p>
                </div>
                <label htmlFor="consoleLoggingEnabled" className="relative inline-flex items-center cursor-pointer">
                    <input 
                        type="checkbox" 
                        name="consoleLoggingEnabled"
                        id="consoleLoggingEnabled"
                        checked={localSettings.consoleLoggingEnabled !== false}
                        onChange={handleChange}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-4 peer-focus:ring-indigo-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
            </div>
        </div>


        <div className="pt-2">
          <button
            type="submit"
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors ${saved ? 'bg-green-600' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500`}
          >
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsView;