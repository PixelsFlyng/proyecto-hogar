import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AnimatePresence } from 'framer-motion';
import { Plus, ListTodo, Calendar, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import CategoryFilter from '@/components/common/CategoryFilter';
import TaskCard from '@/components/organization/TaskCard';
import AddTaskModal from '@/components/organization/AddTaskModal';
import CalendarView from '@/components/organization/CalendarView';
import { format, parseISO, isToday, addDays, addWeeks, addMonths } from 'date-fns';

export default function Organization() {
  const [activeTab, setActiveTab] = useState('tasks');
  const [taskFilter, setTaskFilter] = useState('all');
  const [showAddTask, setShowAddTask] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: () => base44.entities.CalendarEvent.list('-date'),
  });

  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => base44.entities.CustomCategory.list(),
  });

  const customAssignees = customCategories.filter(c => c.type === 'task_assignee');
  const customTaskCategories = customCategories.filter(c => c.type === 'task_category');

  // Build assignee labels (without defaults)
  const allAssignees = customAssignees.map(c => ({ value: c.name, label: `${c.icon} ${c.name}` }));

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calendar-events'] }),
  });

  const handleCompleteTask = async (task) => {
    if (task.status === 'completada') {
      // Uncomplete
      await updateTaskMutation.mutateAsync({ id: task.id, data: { status: 'pendiente' } });
    } else {
      // Complete
      if (task.is_recurring) {
        // Create next occurrence
        const nextDate = getNextRecurrenceDate(task.due_date, task.recurrence);
        await createTaskMutation.mutateAsync({
          ...task,
          id: undefined,
          created_date: undefined,
          updated_date: undefined,
          due_date: nextDate,
          status: 'pendiente',
        });
        // Delete current task (instead of marking complete)
        await deleteTaskMutation.mutateAsync(task.id);
      } else {
        await updateTaskMutation.mutateAsync({ id: task.id, data: { status: 'completada' } });
      }
    }
  };

  const getNextRecurrenceDate = (currentDate, recurrence) => {
    const date = currentDate ? parseISO(currentDate) : new Date();
    switch (recurrence) {
      case 'diaria': return format(addDays(date, 1), 'yyyy-MM-dd');
      case 'semanal': return format(addWeeks(date, 1), 'yyyy-MM-dd');
      case 'quincenal': return format(addWeeks(date, 2), 'yyyy-MM-dd');
      case 'mensual': return format(addMonths(date, 1), 'yyyy-MM-dd');
      default: return format(addWeeks(date, 1), 'yyyy-MM-dd');
    }
  };

  const handleSaveTask = (data) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data });
    } else {
      createTaskMutation.mutate(data);
    }
    setEditingTask(null);
  };

  // Get today's events to show in tasks view
  const todayEvents = events.filter(event => {
    if (!event.date) return false;
    return isToday(parseISO(event.date));
  });

  const filteredTasks = tasks.filter(task => {
    if (taskFilter === 'all') return task.status !== 'completada';
    if (taskFilter === 'completadas') return task.status === 'completada';
    return task.assigned_to === taskFilter && task.status !== 'completada';
  });

  const pendingCount = tasks.filter(t => t.status !== 'completada').length;

  // Build filter labels from custom assignees only
  const filterCategories = ['all', ...allAssignees.map(a => a.value), 'completadas'];
  const filterLabels = {
    all: 'Todas',
    completadas: '✓ Completadas',
    ...Object.fromEntries(allAssignees.map(a => [a.value, a.label]))
  };

  return (
    <div>
      <PageHeader 
        title="Organización" 
        subtitle={activeTab === 'tasks' 
          ? `${pendingCount} tarea${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}` 
          : `${events.length} evento${events.length !== 1 ? 's' : ''}`
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="w-full p-1 rounded-2xl" style={{ backgroundColor: 'var(--theme-accent)' }}>
          <TabsTrigger 
            value="tasks" 
            className="flex-1 rounded-xl data-[state=active]:shadow-sm"
          >
            <ListTodo className="w-4 h-4 mr-2" />
            Tareas
          </TabsTrigger>
          <TabsTrigger 
            value="calendar"
            className="flex-1 rounded-xl data-[state=active]:shadow-sm"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Calendario
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <AnimatePresence mode="wait">
        {activeTab === 'tasks' ? (
          <div key="tasks">
            {/* Task Filters - only show if there are custom assignees */}
            {allAssignees.length > 0 && (
              <CategoryFilter
                categories={filterCategories.slice(1)}
                selected={taskFilter}
                onChange={setTaskFilter}
                labels={filterLabels}
              />
            )}

            {/* Today's Events */}
            {todayEvents.length > 0 && taskFilter === 'all' && (
              <div className="mb-4">
                <p className="text-xs text-stone-500 mb-2">📅 Eventos de hoy</p>
                <div className="space-y-2">
                  {todayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="bg-white rounded-xl p-3 border border-stone-100 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full bg-${event.color || 'coral'}-500`} />
                        <div>
                          <p className="font-medium text-stone-700">{event.title}</p>
                          {event.time && <p className="text-xs text-stone-500">{event.time}</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteEventMutation.mutate(event.id)}
                        className="text-xs text-stone-400 hover:text-emerald-600 px-2 py-1"
                      >
                        ✓ Hecho
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks List */}
            {loadingTasks ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-stone-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                icon={taskFilter === 'completadas' ? CheckCircle2 : ListTodo}
                title={taskFilter === 'completadas' ? 'Sin tareas completadas' : 'Sin tareas pendientes'}
                description={taskFilter === 'completadas' 
                  ? 'Las tareas que completes aparecerán acá'
                  : 'Creá una tarea para empezar a organizarse'}
                action={
                  taskFilter !== 'completadas' && (
                    <Button onClick={() => setShowAddTask(true)} className="rounded-xl">
                      <Plus className="w-4 h-4 mr-2" />
                      Nueva tarea
                    </Button>
                  )
                }
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onComplete={handleCompleteTask}
                      onEdit={(task) => { setEditingTask(task); setShowAddTask(true); }}
                      onDelete={(id) => deleteTaskMutation.mutate(id)}
                      customAssignees={customAssignees}
                      customCategories={customTaskCategories}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : (
          <div key="calendar">
            <CalendarView
              events={events}
              tasks={tasks.filter(t => t.status !== 'completada' && t.due_date)}
              onAddEvent={(data) => createEventMutation.mutate(data)}
              onDeleteEvent={(id) => deleteEventMutation.mutate(id)}
              onCompleteTask={handleCompleteTask}
            />
          </div>
        )}
      </AnimatePresence>

      {activeTab === 'tasks' && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingTask(null); setShowAddTask(true); }}
          className="fixed right-4 w-14 h-14 bg-stone-900 text-white rounded-full shadow-lg flex items-center justify-center z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)' }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      <AddTaskModal
        isOpen={showAddTask}
        onClose={() => { setShowAddTask(false); setEditingTask(null); }}
        onSave={handleSaveTask}
        editTask={editingTask}
        customAssignees={customAssignees}
        customCategories={customTaskCategories}
      />
    </div>
  );
}