import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGoogleSheets } from '@/hooks/useGoogleSheets';
import CategoryChips from '@/components/common/CategoryChips';

import { format, addMonths, parseISO, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const EMOJI_OPTIONS = ['🍽️', '💡', '🚗', '🎬', '💊', '🏠', '📦', '🎁', '✈️', '🎮', '📚', '🏋️', '🛒', '💰', '🏦', '💳'];

const EMPTY_FORM = {
  description: '', amount: '', category: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  payment_method: '', is_fixed: false,
  recurrence_end: 'indefinido', recurrence_months: 12, recurrence_end_date: '',
  installments: '1'
};

// Fecha del resumen al que se asigna una compra con tarjeta: si el día de compra
// es posterior al día de cierre, cae en el resumen que cierra el mes siguiente.
function firstBillingDate(purchaseDateStr, card) {
  const purchaseDate = parseISO(purchaseDateStr);
  if (card?.is_credit_card && card?.closing_day) {
    let base = new Date(purchaseDate.getFullYear(), purchaseDate.getMonth(), card.closing_day);
    if (purchaseDate.getDate() > card.closing_day) base = addMonths(base, 1);
    return base;
  }
  return purchaseDate;
}

export default function AddExpenseModal({ isOpen, onClose, onSave, initialData = /** @type {any} */ (null), editId = /** @type {string|null} */ (null) }) {
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setFormData(initialData ? {
        description: initialData.description || '',
        amount: initialData.amount ? String(initialData.amount) : '',
        category: initialData.category || '',
        date: initialData.date || format(new Date(), 'yyyy-MM-dd'),
        payment_method: initialData.payment_method || '',
        is_fixed: false,
        recurrence_end: 'indefinido', recurrence_months: 12, recurrence_end_date: '',
        installments: '1'
      } : EMPTY_FORM);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);
  const queryClient = useQueryClient();
  const { isConnected, addExpenseCategoryToSheet } = useGoogleSheets();

  const { data: allCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => api.entities.CustomCategory.list(),
  });
  const selectedCard = allCategories.find(c => c.type === 'payment_method' && c.name === formData.payment_method) || null;
  const installmentsNum = Math.max(1, parseInt(formData.installments) || 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.category) return;

    const baseExpense = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      category: formData.category,
      date: formData.date,
      payment_method: formData.payment_method,
      is_fixed: formData.is_fixed,
      recurrence_end: formData.is_fixed ? formData.recurrence_end : null,
      recurrence_months: formData.is_fixed && formData.recurrence_end === 'meses' ? formData.recurrence_months : null,
      recurrence_end_date: formData.is_fixed && formData.recurrence_end === 'fecha' ? formData.recurrence_end_date : null
    };

    if (editId) {
      const result = await api.entities.Expense.update(editId, baseExpense);
      onSave && onSave(result);
    } else if (installmentsNum > 1) {
      const total = parseFloat(formData.amount);
      const perInstallment = Math.round((total / installmentsNum) * 100) / 100;
      const lastInstallment = Math.round((total - perInstallment * (installmentsNum - 1)) * 100) / 100;
      const startDate = firstBillingDate(formData.date, selectedCard);

      let parentId;
      for (let i = 0; i < installmentsNum; i++) {
        const payload = {
          description: formData.description,
          amount: i === installmentsNum - 1 ? lastInstallment : perInstallment,
          category: formData.category,
          date: format(addMonths(startDate, i), 'yyyy-MM-dd'),
          purchase_date: formData.date,
          payment_method: formData.payment_method,
          is_fixed: false,
          installment_number: i + 1,
          installment_total: installmentsNum,
          ...(i > 0 ? { parent_id: parentId } : {}),
        };
        const created = await api.entities.Expense.create(payload);
        if (i === 0) parentId = created.id;
        onSave && onSave(created);
      }
    } else {
      const billingDate = format(firstBillingDate(formData.date, selectedCard), 'yyyy-MM-dd');
      const result = await api.entities.Expense.create({ ...baseExpense, date: billingDate, purchase_date: formData.date });
      onSave && onSave(result);
      if (formData.is_fixed) {
        const startDate = parseISO(billingDate);
        let endDate;
        if (formData.recurrence_end === 'indefinido') endDate = addMonths(startDate, 24);
        else if (formData.recurrence_end === 'meses') endDate = addMonths(startDate, formData.recurrence_months);
        else if (formData.recurrence_end === 'fecha' && formData.recurrence_end_date) endDate = parseISO(formData.recurrence_end_date);
        if (endDate) {
          let currentDate = addMonths(startDate, 1);
          while (isBefore(currentDate, endDate)) {
            const child = await api.entities.Expense.create({ ...baseExpense, date: format(currentDate, 'yyyy-MM-dd'), parent_id: result.id });
            onSave && onSave(child);
            currentDate = addMonths(currentDate, 1);
          }
        }
      }
    }

    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    setFormData(EMPTY_FORM);
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
              <h2 className="text-lg font-semibold text-stone-900">{editId ? 'Editar gasto' : 'Nuevo gasto'}</h2>
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
                  placeholder="Ej: Supermercado"
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

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label>Categoría *</Label>
                  <CategoryChips
                    categoryType="expense"
                    selected={formData.category}
                    onSelect={(name) => setFormData(d => ({ ...d, category: name }))}
                    emojiOptions={EMOJI_OPTIONS}
                    placeholder="Nombre de categoría"
                    cascadeQueryKeys={[['expenses']]}
                    emptyMessage="Todavía no tenés categorías"
                    emptyButtonLabel="Crear categoría"
                    onAfterCreate={(cat) => {
                      setFormData(d => ({ ...d, category: cat.name }));
                      if (isConnected) addExpenseCategoryToSheet(cat.name).catch(e => console.error(e));
                    }}
                  />
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

                {/* Payment Method */}
                <div className="space-y-2">
                  <Label>Método de pago</Label>
                  <CategoryChips
                    categoryType="payment_method"
                    selected={formData.payment_method}
                    onSelect={(name) => {
                      const card = allCategories.find(c => c.type === 'payment_method' && c.name === name);
                      setFormData(d => ({ ...d, payment_method: name, installments: card?.is_credit_card ? String(card.default_installments || 1) : '1' }));
                    }}
                    emojiOptions={['💵', '💳', '🏦', '📱', '💰']}
                    placeholder="Método de pago"
                    cascadeQueryKeys={[['expenses']]}
                    onAfterCreate={(pm) => setFormData(d => ({ ...d, payment_method: pm.name, installments: pm?.is_credit_card ? String(pm.default_installments || 1) : '1' }))}
                  />
                  {selectedCard?.is_credit_card && formData.date && (
                    <p className="text-xs text-stone-500">
                      {selectedCard.closing_day
                        ? `Se asigna al resumen que cierra el ${format(firstBillingDate(formData.date, selectedCard), "d 'de' MMMM", { locale: es })}`
                        : 'Esta tarjeta todavía no tiene día de cierre configurado (editala con el lápiz para agregarlo).'}
                    </p>
                  )}
                </div>

                {!editId && !formData.is_fixed && (
                  <div className="space-y-2">
                    <Label htmlFor="installments">Cuotas</Label>
                    <Input
                      id="installments"
                      type="number"
                      min="1"
                      value={formData.installments}
                      onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                      className="rounded-xl w-24"
                    />
                    {installmentsNum > 1 && formData.amount && (
                      <p className="text-xs text-stone-500">
                        Se generarán {installmentsNum} gastos de ${(parseFloat(formData.amount) / installmentsNum).toFixed(2)} entre {format(firstBillingDate(formData.date, selectedCard), "MMM yyyy", { locale: es })} y {format(addMonths(firstBillingDate(formData.date, selectedCard), installmentsNum - 1), "MMM yyyy", { locale: es })}.
                      </p>
                    )}
                  </div>
                )}

                {!editId && installmentsNum <= 1 && <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl">
                  <div>
                    <p className="font-medium text-stone-900">Gasto recurrente</p>
                    <p className="text-sm text-stone-500">Se repite cada mes</p>
                  </div>
                  <Switch
                  checked={formData.is_fixed}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_fixed: checked })} />
                </div>}

                {!editId && formData.is_fixed &&
              <div className="space-y-3 p-4 bg-stone-50 rounded-xl">
                    <Label>¿Hasta cuándo se repite?</Label>
                    <div className="flex gap-2">
                      {['indefinido', 'meses', 'fecha'].map((opt) =>
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setFormData({ ...formData, recurrence_end: opt })}
                    className={`flex-1 py-2 rounded-xl text-sm ${
                    formData.recurrence_end === opt ?
                    'bg-stone-900 text-white' :
                    'bg-white text-stone-600 border border-stone-200'}`
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

                        <span className="text-stone-600">meses</span>
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
                className="w-full rounded-xl h-12 bg-stone-900 hover:bg-stone-800"
                disabled={!formData.amount || !formData.category || !formData.date}>

                  {editId ? 'Guardar cambios' : 'Agregar gasto'}
                </Button>
              </form>
            </ScrollArea>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}