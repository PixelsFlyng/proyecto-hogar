import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addMonths, parseISO, isBefore } from 'date-fns';

const EMOJI_OPTIONS = ['💵', '💰', '🏦', '💳', '📈', '🎁', '💼', '🏠'];

export default function AddIncomeModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    is_recurring: false,
    recurrence_end: 'indefinido',
    recurrence_months: 12,
    recurrence_end_date: ''
  });
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('💰');

  const queryClient = useQueryClient();

  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => base44.entities.CustomCategory.list()
  });

  const incomeCategories = customCategories.filter((c) => c.type === 'income');

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomCategory.create(data),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      setFormData({ ...formData, category: newCat.name });
      setShowNewCategory(false);
      setNewCatName('');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-categories'] })
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const baseIncome = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date,
      is_recurring: formData.is_recurring,
      recurrence_end: formData.is_recurring ? formData.recurrence_end : null,
      recurrence_months: formData.is_recurring && formData.recurrence_end === 'meses' ? formData.recurrence_months : null,
      recurrence_end_date: formData.is_recurring && formData.recurrence_end === 'fecha' ? formData.recurrence_end_date : null
    };

    // Create main income
    const mainIncome = await base44.entities.Income.create(baseIncome);

    // If recurring, create future incomes
    if (formData.is_recurring) {
      const startDate = parseISO(formData.date);
      let endDate;

      if (formData.recurrence_end === 'indefinido') {
        endDate = addMonths(startDate, 24); // Create 2 years ahead
      } else if (formData.recurrence_end === 'meses') {
        endDate = addMonths(startDate, formData.recurrence_months);
      } else if (formData.recurrence_end === 'fecha' && formData.recurrence_end_date) {
        endDate = parseISO(formData.recurrence_end_date);
      }

      if (endDate) {
        let currentDate = addMonths(startDate, 1);
        while (isBefore(currentDate, endDate)) {
          await base44.entities.Income.create({
            ...baseIncome,
            date: format(currentDate, 'yyyy-MM-dd'),
            parent_id: mainIncome.id
          });
          currentDate = addMonths(currentDate, 1);
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['incomes'] });
    setFormData({
      description: '',
      amount: '',
      category: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      is_recurring: false,
      recurrence_end: 'indefinido',
      recurrence_months: 12,
      recurrence_end_date: ''
    });
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
              <h2 className="text-lg font-semibold text-stone-900">Nuevo ingreso</h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <ScrollArea className="flex-1 overflow-auto touch-pan-y">
              <form onSubmit={handleSubmit} className="mb-16 px-6 py-3 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ej: Sueldo"
                  className="rounded-xl" />

                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Monto *</Label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-500">$</span>
                    <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                    className="rounded-xl pl-8" />

                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Fecha *</Label>
                  <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  className="rounded-xl" />

                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label>Categoría</Label>
                  {incomeCategories.length === 0 && !showNewCategory ?
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-emerald-600 mb-3">Agregá categorías para organizar tus ingresos</p>
                      <Button type="button" variant="outline" onClick={() => setShowNewCategory(true)} className="rounded-xl border-emerald-300 text-emerald-700">
                        <Plus className="w-4 h-4 mr-2" /> Crear categoría
                      </Button>
                    </div> :

                <>
                      <div className="flex flex-wrap gap-2">
                        {incomeCategories.map((cat) =>
                    <div key={cat.id} className="relative group">
                            <button
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.name })}
                        className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all ${
                        formData.category === cat.name ?
                        'bg-emerald-600 text-white' :
                        'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`
                        }>

                              <span>{cat.icon}</span>
                              <span>{cat.name}</span>
                            </button>
                            <button
                        type="button"
                        onClick={(e) => {e.stopPropagation();deleteCategoryMutation.mutate(cat.id);}}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">

                              <X className="w-3 h-3" />
                            </button>
                          </div>
                    )}
                        <button
                      type="button"
                      onClick={() => setShowNewCategory(true)}
                      className="px-3 py-2 rounded-xl text-sm border-2 border-dashed border-emerald-300 text-emerald-500 hover:border-emerald-400">

                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </>
                }

                  {showNewCategory &&
                <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
                      <Input
                    placeholder="Nombre de categoría"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="rounded-xl" />

                      <div className="flex flex-wrap gap-1">
                        {EMOJI_OPTIONS.map((emoji) =>
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCatIcon(emoji)}
                      className={`p-2 rounded-lg text-lg ${
                      newCatIcon === emoji ? 'bg-emerald-200 ring-2 ring-emerald-400' : 'hover:bg-emerald-200'}`
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
                      onClick={() => createCategoryMutation.mutate({ name: newCatName, type: 'income', icon: newCatIcon })}
                      disabled={!newCatName.trim()}
                      className="flex-1 rounded-xl bg-emerald-600">

                          Crear
                        </Button>
                      </div>
                    </div>
                }
                </div>

                <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                  <div>
                    <p className="font-medium text-emerald-900">Ingreso recurrente</p>
                    <p className="text-sm text-emerald-600">Se repite cada mes</p>
                  </div>
                  <Switch
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })} />

                </div>

                {formData.is_recurring &&
              <div className="space-y-3 p-4 bg-emerald-50 rounded-xl">
                    <Label>¿Hasta cuándo se repite?</Label>
                    <div className="flex gap-2">
                      {['indefinido', 'meses', 'fecha'].map((opt) =>
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, recurrence_end: opt })}
                    className={`flex-1 py-2 rounded-xl text-sm ${
                    formData.recurrence_end === opt ?
                    'bg-emerald-600 text-white' :
                    'bg-white text-emerald-700 border border-emerald-200'}`
                    }>

                          {opt === 'indefinido' ? '∞ Siempre' : opt === 'meses' ? '📅 Meses' : '📆 Fecha'}
                        </button>
                  )}
                    </div>
                    
                    {formData.recurrence_end === 'meses' &&
                <div className="flex items-center gap-2">
                        <Input
                    type="number"
                    min="1"
                    value={formData.recurrence_months}
                    onChange={(e) => setFormData({ ...formData, recurrence_months: parseInt(e.target.value) || 1 })}
                    className="w-20 rounded-xl" />

                        <span className="text-emerald-700">meses</span>
                      </div>
                }
                    
                    {formData.recurrence_end === 'fecha' &&
                <Input
                  type="date"
                  value={formData.recurrence_end_date}
                  onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                  className="rounded-xl" />

                }
                  </div>
              }

                <Button
                type="submit"
                className="w-full rounded-xl h-12 bg-emerald-600 hover:bg-emerald-700"
                disabled={!formData.amount || !formData.date}>

                  Agregar ingreso
                </Button>
              </form>
            </ScrollArea>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}