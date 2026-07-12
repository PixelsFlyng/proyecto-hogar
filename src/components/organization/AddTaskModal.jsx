import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CategoryChips from '@/components/common/CategoryChips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';

const priorities = [
{ value: 'baja', label: 'Baja' },
{ value: 'media', label: 'Media' },
{ value: 'alta', label: 'Alta' }];


const recurrences = [
{ value: 'diaria', label: 'Diaria' },
{ value: 'semanal', label: 'Semanal' },
{ value: 'quincenal', label: 'Quincenal' },
{ value: 'mensual', label: 'Mensual' }];


const EMOJI_OPTIONS = ['👤', '👥', '👩', '👨', '👧', '👦', '🐕', '🐈', '🧹', '🍳', '🛒', '🔧', '🌱', '📋'];

export default function AddTaskModal({
  isOpen,
  onClose,
  onSave,
  editTask = null
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    category: '',
    priority: 'media',
    due_date: '',
    is_recurring: false,
    recurrence: 'semanal',
    day_of_week: ''
  });

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (editTask) {
      setFormData({
        title: editTask.title || '',
        description: editTask.description || '',
        assigned_to: editTask.assigned_to || '',
        category: editTask.category || '',
        priority: editTask.priority || 'media',
        due_date: editTask.due_date || '',
        is_recurring: editTask.is_recurring || false,
        recurrence: editTask.recurrence || 'semanal',
        day_of_week: editTask.day_of_week || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        assigned_to: '',
        category: '',
        priority: 'media',
        due_date: '',
        is_recurring: false,
        recurrence: 'semanal',
        day_of_week: '',
      });
    }
  }, [editTask, isOpen]);

 const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.assigned_to) return;
    const dataToSave = {
      ...formData,
      status: editTask?.status || 'pendiente',
      recurrence: formData.is_recurring ? formData.recurrence : null,
    };
    if (!dataToSave.category) delete dataToSave.category;
    if (!dataToSave.due_date) delete dataToSave.due_date;
    if (!dataToSave.description) delete dataToSave.description;
    if (!dataToSave.day_of_week) delete dataToSave.day_of_week;
    onSave(dataToSave);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen &&
      <>
          <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
          onClick={onClose} />

          <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className="fixed left-0 right-0 bg-white rounded-t-3xl z-50 flex flex-col"
          style={{ bottom: 'calc(50px + env(safe-area-inset-bottom, 0px))', maxHeight: 'calc(85vh - 50px)' }}>

            <div className="flex-shrink-0 px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">
                {editTask ? 'Editar tarea' : 'Nueva tarea'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <ScrollArea className="flex-1 overflow-auto touch-pan-y" style={{ overscrollBehavior: 'contain' }}>
              <form onSubmit={handleSubmit} className="px-6 py-3 space-y-4 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="title">Tarea *</Label>
                  <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Lavar los platos"
                  required
                  className="rounded-xl" />

                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles adicionales..."
                  rows={2}
                  className="rounded-xl resize-none" />

                </div>

                {/* Assignee Selection */}
                <div className="space-y-2">
                  <Label>Asignado a *</Label>
                  <CategoryChips
                    categoryType="task_assignee"
                    selected={formData.assigned_to}
                    onSelect={(name) => setFormData(d => ({ ...d, assigned_to: name }))}
                    emojiOptions={EMOJI_OPTIONS.slice(0, 6)}
                    placeholder="Nombre"
                    cascadeQueryKeys={[['tasks']]}
                    emptyMessage="Agregá personas para asignar tareas"
                    emptyButtonLabel="Agregar persona"
                    onAfterCreate={(cat) => setFormData(d => ({ ...d, assigned_to: cat.name }))}
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <CategoryChips
                    categoryType="task_category"
                    selected={formData.category}
                    onSelect={(name) => setFormData(d => ({ ...d, category: name }))}
                    emojiOptions={EMOJI_OPTIONS.slice(6)}
                    placeholder="Categoría"
                    cascadeQueryKeys={[['tasks']]}
                    onAfterCreate={(cat) => setFormData(d => ({ ...d, category: cat.name }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Prioridad</Label>
                    <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}>

                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorities.map((p) =>
                      <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                      )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due_date">Fecha límite</Label>
                    <Input
                    id="due_date"
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="rounded-xl" />

                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                  <div>
                    <p className="font-medium text-stone-900">Tarea recurrente</p>
                    <p className="text-sm text-stone-500">Se repite automáticamente</p>
                  </div>
                  <Switch
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })} />

                </div>

                {formData.is_recurring &&
              <div className="space-y-2">
                    <Label>Frecuencia</Label>
                    <Select
                  value={formData.recurrence}
                  onValueChange={(value) => setFormData({ ...formData, recurrence: value })}>

                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {recurrences.map((r) =>
                    <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                    )}
                      </SelectContent>
                    </Select>
                  </div>
              }

              {/* Día de la semana */}
              <div className="space-y-2">
                <Label>Día asignado (opcional)</Label>
                <div className="flex flex-wrap gap-2">
                  {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setFormData({ ...formData, day_of_week: formData.day_of_week === day ? '' : day })}
                      className={`px-3 py-2 rounded-xl text-sm transition-all ${
                        formData.day_of_week === day
                          ? 'bg-stone-900 text-white'
                          : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

                <Button
                type="submit"
                disabled={!formData.title.trim() || !formData.assigned_to}
                className="w-full rounded-xl h-12 bg-stone-900 hover:bg-stone-800 disabled:opacity-50">

                  {editTask ? 'Guardar cambios' : 'Crear tarea'}
                </Button>
              </form>
            </ScrollArea>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}