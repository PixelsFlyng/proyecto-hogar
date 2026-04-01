import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isSameDay, parseISO, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

const eventColors = {
  coral: 'bg-coral-500',
  sage: 'bg-emerald-500',
  terracotta: 'bg-amber-600',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

export default function CalendarView({ events, tasks = [], onAddEvent, onDeleteEvent, onCompleteTask }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    time: '',
    color: 'coral',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const getEventsForDate = (date) => {
    return events.filter(event => {
      if (!event.date) return false;
      return isSameDay(parseISO(event.date), date);
    });
  };

  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      return isSameDay(parseISO(task.due_date), date);
    });
  };

  const renderDays = () => {
    const days = [];
    let day = startDate;

    while (day <= endDate) {
      const currentDay = day;
      const dayEvents = getEventsForDate(currentDay);
      const dayTasks = getTasksForDate(currentDay);
      const isCurrentMonth = isSameMonth(currentDay, monthStart);
      const isSelected = selectedDate && isSameDay(currentDay, selectedDate);
      const isTodayDate = isToday(currentDay);

      days.push(
        <button
          key={day.toISOString()}
          onClick={() => setSelectedDate(currentDay)}
          className={`aspect-square p-1 rounded-xl flex flex-col items-center justify-start transition-all ${
            !isCurrentMonth ? 'opacity-30' : ''
          } ${isSelected ? 'bg-stone-900 text-white' : isTodayDate ? 'bg-stone-100' : 'hover:bg-stone-50'}`}
        >
          <span className={`text-sm font-medium ${isSelected ? 'text-white' : ''}`}>
            {format(currentDay, 'd')}
          </span>
          {(dayEvents.length > 0 || dayTasks.length > 0) && (
            <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
              {dayEvents.slice(0, 2).map((event, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : eventColors[event.color] || 'bg-coral-500'}`}
                />
              ))}
              {dayTasks.slice(0, 2).map((task, idx) => (
                <div
                  key={`task-${idx}`}
                  className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/60' : 'bg-stone-400'}`}
                />
              ))}
            </div>
          )}
        </button>
      );
      day = addDays(day, 1);
    }

    return days;
  };

  const handleAddEvent = () => {
    if (newEvent.title && selectedDate) {
      onAddEvent({
        ...newEvent,
        date: format(selectedDate, 'yyyy-MM-dd'),
      });
      setNewEvent({ title: '', time: '', color: 'coral' });
      setShowAddEvent(false);
    }
  };

  const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];
  const selectedTasks = selectedDate ? getTasksForDate(selectedDate) : [];

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-2 hover:bg-stone-100 rounded-xl"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="font-semibold text-lg capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: es })}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-2 hover:bg-stone-100 rounded-xl"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl p-4 border border-stone-100">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-stone-400 py-2">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days */}
        <div className="grid grid-cols-7 gap-1">
          {renderDays()}
        </div>
      </div>

      {/* Selected Date Details */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white rounded-2xl border border-stone-100 overflow-hidden"
          >
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-900 capitalize">
                {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
              </h3>
              <Button
                size="sm"
                onClick={() => setShowAddEvent(true)}
                className="rounded-xl bg-stone-900"
              >
                <Plus className="w-4 h-4 mr-1" />
                Evento
              </Button>
            </div>

            {/* Events */}
            <div className="p-4 space-y-2">
              {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-4">
                  Sin eventos ni tareas para este día
                </p>
              ) : (
                <>
                  {selectedEvents.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-3 bg-stone-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${eventColors[event.color] || 'bg-coral-500'}`} />
                        <div>
                          <p className="font-medium text-stone-700">{event.title}</p>
                          {event.time && (
                            <p className="text-xs text-stone-500">{event.time}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => onDeleteEvent(event.id)}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  
                  {selectedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 bg-stone-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-stone-400" />
                        <div>
                          <p className="font-medium text-stone-700">{task.title}</p>
                          <p className="text-xs text-stone-500">Tarea</p>
                        </div>
                      </div>
                      <button
                        onClick={() => onCompleteTask(task)}
                        className="p-2 text-stone-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>

            {/* Add Event Form */}
            <AnimatePresence>
              {showAddEvent && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-stone-100"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Nuevo evento</Label>
                      <button onClick={() => setShowAddEvent(false)} className="p-1 hover:bg-stone-100 rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input
                      placeholder="Título del evento"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                      className="rounded-xl"
                    />
                    <Input
                      type="time"
                      value={newEvent.time}
                      onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                      className="rounded-xl"
                    />
                    <div className="flex gap-2">
                      {Object.keys(eventColors).map((color) => (
                        <button
                          key={color}
                          onClick={() => setNewEvent({ ...newEvent, color })}
                          className={`w-8 h-8 rounded-full ${eventColors[color]} ${
                            newEvent.color === color ? 'ring-2 ring-offset-2 ring-stone-400' : ''
                          }`}
                        />
                      ))}
                    </div>
                    <Button
                      onClick={handleAddEvent}
                      disabled={!newEvent.title}
                      className="w-full rounded-xl bg-stone-900"
                    >
                      Agregar evento
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}