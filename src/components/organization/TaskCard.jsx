import React from 'react';
import { motion } from 'framer-motion';
import { Check, Calendar, MoreVertical, Edit2, Trash2, User, RefreshCw } from 'lucide-react';
import { format, parseISO, isPast, isToday } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const priorityColors = {
  baja: 'bg-blue-100 text-blue-700',
  media: 'bg-amber-100 text-amber-700',
  alta: 'bg-red-100 text-red-700',
};

export default function TaskCard({ task, onComplete, onEdit, onDelete, customAssignees = [], customCategories = [] }) {
  const isCompleted = task.status === 'completada';
  const dueDate = task.due_date ? parseISO(task.due_date) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate) && !isCompleted;
  const isDueToday = dueDate && isToday(dueDate);

  // Get assignee info
  const getAssigneeInfo = () => {
    const custom = customAssignees.find(c => c.name === task.assigned_to);
    if (custom) return { icon: custom.icon, name: custom.name };
    return null;
  };

  // Get category info
  const getCategoryInfo = () => {
    const custom = customCategories.find(c => c.name === task.category);
    if (custom) return { icon: custom.icon, name: custom.name };
    return null;
  };

  const assigneeInfo = getAssigneeInfo();
  const categoryInfo = getCategoryInfo();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`rounded-2xl border shadow-sm overflow-hidden ${
        isCompleted ? 'opacity-60' : isOverdue ? 'border-red-200' : ''
      }`}
      style={{ 
        backgroundColor: 'var(--theme-card)', 
        borderColor: isOverdue ? undefined : 'var(--theme-border)' 
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => onComplete(task)}
            className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
              isCompleted 
                ? 'border-emerald-500 bg-emerald-500' 
                : 'border-stone-300 hover:border-stone-400'
            }`}
          >
            {isCompleted && <Check className="w-3.5 h-3.5 text-white" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 
                  className={`font-medium ${isCompleted ? 'line-through' : ''}`}
                  style={{ color: isCompleted ? 'var(--theme-muted)' : 'var(--theme-text)' }}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-stone-500 mt-0.5 line-clamp-1">
                    {task.description}
                  </p>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 hover:bg-stone-100 rounded-lg flex-shrink-0">
                    <MoreVertical className="w-4 h-4 text-stone-400" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(task)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {categoryInfo && (
                <span className="text-lg">{categoryInfo.icon}</span>
              )}
              
              <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColors[task.priority]}`}>
                {task.priority}
              </span>

              {assigneeInfo && (
                <span className="text-xs text-stone-500 flex items-center gap-1 bg-stone-100 px-2 py-0.5 rounded-full">
                  {assigneeInfo.icon} {assigneeInfo.name}
                </span>
              )}

              {dueDate && (
                <span className={`text-xs flex items-center gap-1 ${
                  isOverdue ? 'text-red-600' : isDueToday ? 'text-amber-600' : 'text-stone-500'
                }`}>
                  <Calendar className="w-3 h-3" />
                  {isDueToday ? 'Hoy' : format(dueDate, "d MMM", { locale: es })}
                </span>
              )}

              {task.is_recurring && (
                <span className="text-xs text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <RefreshCw className="w-3 h-3" />
                  {task.recurrence}
                </span>
              )}

              {task.day_of_week && (
                <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">
                  📅 {task.day_of_week}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}