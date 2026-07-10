import { X } from "lucide-react";
import { ScheduleFormPage } from "./ScheduleFormPage";
import type { Channel, Partner, ScheduleView, User } from "../types/domain";
import { useEffect, useState } from "react";

interface ScheduleEditSlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  channels: Channel[];
  partners: Partner[];
  user: User | null;
  editingSchedule: ScheduleView | null;
  onCreated: () => Promise<void>;
}

export function ScheduleEditSlideOver({
  isOpen,
  onClose,
  channels,
  partners,
  user,
  editingSchedule,
  onCreated
}: ScheduleEditSlideOverProps) {
  const [renderForm, setRenderForm] = useState(false);

  // We only mount the form when opened to ensure fresh state, and unmount on close
  useEffect(() => {
    if (isOpen) {
      setRenderForm(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => setRenderForm(false), 300); // Wait for transition
      document.body.style.overflow = "unset";
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = "unset"; }
  }, [isOpen]);

  if (!isOpen && !renderForm) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 bg-black/40 transition-opacity duration-300 pointer-events-auto ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      
      {/* Slide-over panel */}
      <div 
        className={`relative w-full max-w-4xl bg-surface h-full overflow-y-auto shadow-2xl transition-transform duration-300 ease-in-out pointer-events-auto ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-8 py-4 bg-surface border-b border-border-subtle">
          <h2 className="text-xl font-bold">일정 수정</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container-low transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="pb-8">
          {renderForm && (
            <ScheduleFormPage
              channels={channels}
              partners={partners}
              user={user}
              editingSchedule={editingSchedule}
              onCreated={async () => {
                await onCreated();
                onClose();
              }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
