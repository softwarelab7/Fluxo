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

import { createPortal } from 'react-dom';

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
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleScroll = () => {
            if (isOpen) setIsOpen(false);
        };

        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const toggleOpen = () => {
        if (disabled) return;

        if (!isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
        setIsOpen(!isOpen);
    };

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={toggleOpen}
                disabled={disabled}
                className={`w-full flex items-center justify-between bg-white dark:bg-[#1e1e2e] border transition-colors duration-200 rounded-lg px-3 py-2 text-sm text-left
          ${disabled
                        ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700 text-slate-400'
                        : 'cursor-pointer border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 text-slate-900 dark:text-white shadow-sm'
                    }
          ${isOpen ? 'ring-2 ring-blue-500/20 border-blue-500 dark:border-blue-500' : ''}
        `}
            >
                <span className={`block truncate ${!selectedOption ? 'text-slate-500' : ''}`}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <ChevronDown size={14} className={`ml-2 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && createPortal(
                <div
                    className="fixed z-[9999] bg-white dark:bg-[#1e1e2e] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        top: `${containerRef.current?.getBoundingClientRect().bottom! + 8}px`,
                        left: `${containerRef.current?.getBoundingClientRect().left}px`,
                        width: `${containerRef.current?.getBoundingClientRect().width}px`
                    }}
                >
                    <div className="p-1">
                        {options.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-500 text-center italic">
                                No hay opciones disponibles
                            </div>
                        ) : (
                            options.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => handleSelect(option.value)}
                                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors
                    ${option.value === value
                                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }
                  `}
                                >
                                    <span className="truncate">{option.label}</span>
                                    {option.value === value && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default CustomSelect;

