import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
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
  const [showNewAssignee, setShowNewAssignee] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('👤');

  const queryClient = useQueryClient();

  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => base44.entities.CustomCategory.list()
  });

  const customAssignees = customCategories.filter((c) => c.type === 'task_assignee');
  const customTaskCategories = customCategories.filter((c) => c.type === 'task_category');

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomCategory.create(data),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      if (newCat.type === 'task_assignee') {
        setFormData({ ...formData, assigned_to: newCat.name });
      } else {
        setFormData({ ...formData, category: newCat.name });
      }
      setShowNewAssignee(false);
      setShowNewCategory(false);
      setNewName('');
      setNewIcon('👤');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-categories'] })
  });

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
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[90vh] flex flex-col">

            <div className="flex-shrink-0 px-6 py-4 border-b border-stone-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-900">
                {editTask ? 'Editar tarea' : 'Nueva tarea'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <ScrollArea className="flex-1 overflow-auto touch-pan-y">
              <form onSubmit={handleSubmit} className="mb-16 px-6 py-3 space-y-4">
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
                  {customAssignees.length === 0 && !showNewAssignee ?
                <div className="bg-stone-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-stone-500 mb-3">Agregá personas para asignar tareas</p>
                      <Button type="button" variant="outline" onClick={() => setShowNewAssignee(true)} className="rounded-xl">
                        <Plus className="w-4 h-4 mr-2" /> Agregar persona
                      </Button>
                    </div> :

                <>
                      <div className="flex flex-wrap gap-2">
                        {customAssignees.map((a) =>
                    <div key={a.id} className="relative group">
                            <button
                        type="button"
                        onClick={() => setFormData({ ...formData, assigned_to: a.name })}
                        className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all ${
                        formData.assigned_to === a.name ?
                        'bg-stone-900 text-white' :
                        'bg-stone-100 text-stone-700 hover:bg-stone-200'}`
                        }>

                              <span>{a.icon}</span>
                              <span>{a.name}</span>
                            </button>
                            <button
                        type="button"
                        onClick={(e) => {e.stopPropagation();deleteCategoryMutation.mutate(a.id);}}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">

                              <X className="w-3 h-3" />
                            </button>
                          </div>
                    )}
                        <button
                      type="button"
                      onClick={() => setShowNewAssignee(true)}
                      className="px-3 py-2 rounded-xl text-sm border-2 border-dashed border-stone-300 text-stone-500">

                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                }

                  {showNewAssignee &&
                <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                      <Input
                    placeholder="Nombre"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-xl" />

                      <div className="flex flex-wrap gap-1">
                        {EMOJI_OPTIONS.slice(0, 6).map((emoji) =>
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewIcon(emoji)}
                      className={`p-2 rounded-lg text-lg ${
                      newIcon === emoji ? 'bg-stone-200 ring-2 ring-stone-400' : 'hover:bg-stone-200'}`
                      }>

                            {emoji}
                          </button>
                    )}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowNewAssignee(false)} className="flex-1 rounded-xl">
                          Cancelar
                        </Button>
                        <Button
                      type="button"
                      onClick={() => createCategoryMutation.mutate({ name: newName, type: 'task_assignee', icon: newIcon })}
                      disabled={!newName.trim()}
                      className="flex-1 rounded-xl bg-stone-900">

                          Agregar
                        </Button>
                      </div>
                    </div>
                }
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  <div className="flex flex-wrap gap-2">
                    {customTaskCategories.map((c) =>
                  <div key={c.id} className="relative group">
                        <button
                      type="button"
                      onClick={() => setFormData({ ...formData, category: c.name })}
                      className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all ${
                      formData.category === c.name ?
                      'bg-stone-900 text-white' :
                      'bg-stone-100 text-stone-700 hover:bg-stone-200'}`
                      }>

                          <span>{c.icon}</span>
                          <span>{c.name}</span>
                        </button>
                        <button
                      type="button"
                      onClick={(e) => {e.stopPropagation();deleteCategoryMutation.mutate(c.id);}}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">

                          <X className="w-3 h-3" />
                        </button>
                      </div>
                  )}
                    <button
                    type="button"
                    onClick={() => setShowNewCategory(true)}
                    className="px-3 py-2 rounded-xl text-sm border-2 border-dashed border-stone-300 text-stone-500">

                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {showNewCategory &&
                <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                      <Input
                    placeholder="Categoría"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="rounded-xl" />

                      <div className="flex flex-wrap gap-1">
                        {EMOJI_OPTIONS.slice(6).map((emoji) =>
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewIcon(emoji)}
                      className={`p-2 rounded-lg text-lg ${
                      newIcon === emoji ? 'bg-stone-200 ring-2 ring-stone-400' : 'hover:bg-stone-200'}`
                      }>

                            {emoji}
                          </button>
                    )}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowNewCategory(false)} className="flex-1 rounded-xl">
                          Cancelar
                        </Button>
                        <Button
                      type="button"
                      onClick={() => createCategoryMutation.mutate({ name: newName, type: 'task_category', icon: newIcon })}
                      disabled={!newName.trim()}
                      className="flex-1 rounded-xl bg-stone-900">

                          Crear
                        </Button>
                      </div>
                    </div>
                }
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