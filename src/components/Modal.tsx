import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, maxWidth = 'sm:max-w-2xl' }) => {
    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-black/40 dark:bg-black/60 transition-opacity backdrop-blur-md"
                    aria-hidden="true"
                    onClick={onClose}
                />

                {/* Content */}
                <div className={`relative transform bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl text-left shadow-2xl ring-1 ring-black/5 dark:ring-white/10 transition-all sm:my-8 sm:w-full ${maxWidth} rounded-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]`}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100/50 dark:border-slate-700/50 shrink-0">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white" id="modal-title">{title}</h3>
                        <button
                            onClick={onClose}
                            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100/50 dark:hover:bg-slate-700/50 transition-all"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="p-4 text-slate-600 dark:text-slate-300 overflow-y-auto flex-1 custom-scrollbar">
                        {children}
                    </div>

                    {/* Footer */}
                    {footer && (
                        <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100/50 dark:border-slate-700/50 flex justify-end gap-3 rounded-b-2xl shrink-0">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
