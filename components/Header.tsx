
import React from 'react';
import type { View } from '../types';
import { SettingsIcon } from './Icons';

interface HeaderProps {
  currentView: View;
  setView: (view: View) => void;
  serverUrlSet: boolean;
}

const Header: React.FC<HeaderProps> = ({ currentView, setView, serverUrlSet }) => {
  return (
    <header className="bg-gray-800 p-3 flex justify-between items-center shadow-md flex-shrink-0">
      <h1 className="text-lg font-bold text-indigo-400">TuDuDi Quick Add</h1>
      {serverUrlSet && (
         <button
            onClick={() => setView(currentView === 'main' ? 'settings' : 'main')}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle Settings"
        >
            <SettingsIcon className="w-6 h-6 text-gray-400" />
        </button>
      )}
    </header>
  );
};

export default Header;
