import React, { useState } from 'react';
import Categories from './Categories';
import Brands from './Brands';
import { Layers, Bookmark } from 'lucide-react';

const Classification = () => {
    const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Tabs Header */}
            <div className="flex p-1 space-x-1 bg-slate-100 dark:bg-[#1e293b] rounded-xl w-fit border border-slate-200 dark:border-[#334155]">
                <button
                    onClick={() => setActiveTab('categories')}
                    className={`
            flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all
            ${activeTab === 'categories'
                            ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
          `}
                >
                    <Layers size={16} className="mr-2" />
                    Categorías
                </button>
                <button
                    onClick={() => setActiveTab('brands')}
                    className={`
            flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all
            ${activeTab === 'brands'
                            ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
          `}
                >
                    <Bookmark size={16} className="mr-2" />
                    Marcas
                </button>
            </div>

            {/* Content */}
            <div key={activeTab} className="animate-in slide-in-from-left-4 duration-300">
                {activeTab === 'categories' ? <Categories /> : <Brands />}
            </div>

        </div>
    );
};

export default Classification;
