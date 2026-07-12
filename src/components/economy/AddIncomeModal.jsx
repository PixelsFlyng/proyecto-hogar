import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CategoryChips from '@/components/common/CategoryChips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addMonths, parseISO, isBefore } from 'date-fns';

const EMOJI_OPTIONS = ['💵', '💰', '🏦', '💳', '📈', '🎁', '💼', '🏠'];

const EMPTY_INCOME_FORM = {
  description: '', amount: '', category: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  is_recurring: false, recurrence_end: 'indefinido',
  recurrence_months: 12, recurrence_end_date: ''
};

export default function AddIncomeModal({ isOpen, onClose, onSave, initialData = /** @type {any} */ (null), editId = /** @type {string|null} */ (null) }) {
  const [formData, setFormData] = useState(EMPTY_INCOME_FORM);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFormData(initialData ? {
        description: initialData.description || '',
        amount: initialData.amount ? String(initialData.amount) : '',
        category: initialData.category || '',
        date: initialData.date || format(new Date(), 'yyyy-MM-dd'),
        is_recurring: false,
        recurrence_end: 'indefinido', recurrence_months: 12, recurrence_end_date: ''
      } : EMPTY_INCOME_FORM);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  const queryClient = useQueryClient();

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

    let result;
    if (editId) {
      result = await api.entities.Income.update(editId, baseIncome);
    } else {
      result = await api.entities.Income.create(baseIncome);
      if (formData.is_recurring) {
        const startDate = parseISO(formData.date);
        let endDate;
        if (formData.recurrence_end === 'indefinido') endDate = addMonths(startDate, 24);
        else if (formData.recurrence_end === 'meses') endDate = addMonths(startDate, formData.recurrence_months);
        else if (formData.recurrence_end === 'fecha' && formData.recurrence_end_date) endDate = parseISO(formData.recurrence_end_date);
        if (endDate) {
          let currentDate = addMonths(startDate, 1);
          while (isBefore(currentDate, endDate)) {
            await api.entities.Income.create({ ...baseIncome, date: format(currentDate, 'yyyy-MM-dd'), parent_id: result.id });
            currentDate = addMonths(currentDate, 1);
          }
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['incomes'] });
    onSave && onSave(result);
    setFormData(EMPTY_INCOME_FORM);
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
              <h2 className="text-lg font-semibold text-stone-900">{editId ? 'Editar ingreso' : 'Nuevo ingreso'}</h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <ScrollArea className="flex-1 overflow-auto touch-pan-y" style={{ overscrollBehavior: 'contain' }}>
              <form onSubmit={handleSubmit} className="px-6 py-3 space-y-4 pb-6">
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
                  <CategoryChips
                    categoryType="income"
                    selected={formData.category}
                    onSelect={(name) => setFormData(d => ({ ...d, category: name }))}
                    emojiOptions={EMOJI_OPTIONS}
                    placeholder="Nombre de categoría"
                    cascadeQueryKeys={[['incomes']]}
                    accent="emerald"
                    emptyMessage="Agregá categorías para organizar tus ingresos"
                    emptyButtonLabel="Crear categoría"
                    onAfterCreate={(cat) => setFormData(d => ({ ...d, category: cat.name }))}
                  />
                </div>

                {!editId && <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                  <div>
                    <p className="font-medium text-emerald-900">Ingreso recurrente</p>
                    <p className="text-sm text-emerald-600">Se repite cada mes</p>
                  </div>
                  <Switch
                  checked={formData.is_recurring}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })} />
                </div>}

                {!editId && formData.is_recurring &&
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

                  {editId ? 'Guardar cambios' : 'Agregar ingreso'}
                </Button>
              </form>
            </ScrollArea>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}