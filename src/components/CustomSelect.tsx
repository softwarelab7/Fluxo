import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { createPortal } from 'react-dom';

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
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Find selected option to sync input text
    const selectedOption = options.find(opt => opt.value === value);

    // Sync search term with selected value when it changes externally or on selection
    useEffect(() => {
        if (selectedOption) {
            setSearchTerm(selectedOption.label);
        } else {
            setSearchTerm('');
        }
    }, [value, options]); // Sync when value changes

    // Filter options based on user input
    // If the search term exactly matches the selected option label, we show all options (user likely just clicked to open)
    // Or we can just filter normally. A common pattern is: click -> select all text -> show all. 
    // Simpler approach: Filter always based on searchTerm.
    const filteredOptions = options.filter(option =>
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const clickedInsideContainer = containerRef.current && containerRef.current.contains(target);
            const clickedInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);

            if (!clickedInsideContainer && !clickedInsideDropdown) {
                setIsOpen(false);
                // On blur/close, if the text doesn't match a selection, revert or clear logic could go here.
                // For now, we rely on the Effect [value] to reset text if needed, but if user typed junk and clicked away?
                // We should probably reset to the valid value.
                if (selectedOption) {
                    setSearchTerm(selectedOption.label);
                } else {
                    setSearchTerm('');
                }
            }
        };

        const handleScroll = (event: Event) => {
            // Don't close if scrolling inside the dropdown options
            if (dropdownRef.current && dropdownRef.current.contains(event.target as Node)) {
                return;
            }
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
    }, [isOpen, selectedOption]);

    const handleInputClick = () => {
        if (disabled) return;
        setIsOpen(true);
        // Optional: Select all text on click to make replacing easier
        // (e.target as HTMLInputElement).select(); 
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsOpen(true);

        // If user clears input, clear selection
        if (e.target.value === '') {
            onChange('');
        }
    };

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
        // SearchTerm update is handled by the Effect on [value]
    };

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={handleInputChange}
                    onClick={handleInputClick}
                    onFocus={handleInputClick}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full bg-white dark:bg-[#1e1e2e] border transition-colors duration-200 rounded-lg pl-3 pr-8 py-2 text-sm
                    ${disabled
                            ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-slate-700 text-slate-400'
                            : 'cursor-text border-slate-200 dark:border-slate-700 focus:border-blue-400 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none text-slate-900 dark:text-white shadow-sm'
                        }
                    `}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    {searchTerm && !disabled && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange('');
                                setSearchTerm('');
                                // Keep focus? Maybe.
                            }}
                            className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    className="fixed z-[9999] bg-white dark:bg-[#1e1e2e] border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl max-h-60 overflow-hidden animate-in fade-in zoom-in-95 duration-100 flex flex-col"
                    style={{
                        top: `${containerRef.current?.getBoundingClientRect().bottom! + 8}px`,
                        left: `${containerRef.current?.getBoundingClientRect().left}px`,
                        width: `${containerRef.current?.getBoundingClientRect().width}px`
                    }}
                >
                    <div className="p-1 overflow-y-auto">
                        {filteredOptions.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-500 text-center italic">
                                {searchTerm ? 'Sin coincidencias' : 'Escribe para buscar...'}
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
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
                                    {option.value === value && <Check size={14} className="text-blue-600 dark:text-blue-400 flex-shrink-0 ml-2" />}
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
