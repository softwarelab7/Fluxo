import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
    value: string;
    label: string;
}

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = "Seleccionar...",
    disabled = false,
    className = ""
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                className={`w-full flex items-center justify-between bg-slate-100 dark:bg-[#1e1e2e] border-0 rounded-xl px-4 py-2 text-sm text-left transition-all duration-200
          ${disabled ? 'opacity-50 cursor-not-allowed text-slate-400' : 'hover:bg-slate-200 dark:hover:bg-[#27273a] cursor-pointer text-slate-700 dark:text-slate-200 shadow-sm hover:shadow-md'}
          ${isOpen ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : ''}
        `}
            >
                <span className={`block truncate ${!selectedOption ? 'text-slate-500' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#1e1e2e] border-0 rounded-2xl shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-1 space-y-0.5">
                        {options.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-500 text-center italic">
                                No hay opciones disponible
                            </div>
                        ) : (
                            options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-md transition-colors
                    ${option.value === value
                                            ? 'bg-blue-600 text-white font-medium'
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-white'
                                        }
                  `}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {option.value === value && <Check size={12} />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;

