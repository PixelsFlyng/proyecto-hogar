import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import CategoryChips from '@/components/common/CategoryChips';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

const UNITS = [
{ value: 'unidades', label: 'Unidades' },
{ value: 'kg', label: 'Kg' },
{ value: 'g', label: 'Gramos' },
{ value: 'litros', label: 'Litros' },
{ value: 'ml', label: 'ml' },
{ value: 'paquetes', label: 'Paquetes' }];


const EMOJI_OPTIONS = ['📦', '🥬', '🥩', '🥛', '🧊', '🥤', '🧹', '🍞', '🧀', '🥚', '🍎', '🥕', '🍗', '🐟', '🍝', '🥫'];

export default function AddInventoryModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    quantity: 1,
    unit: 'unidades',
    expiration_date: ''
  });
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category) return;
    const dataToSave = { ...formData };
    if (!dataToSave.expiration_date) delete dataToSave.expiration_date;
    onSave(dataToSave);
    setFormData({ name: '', category: '', quantity: 1, unit: 'unidades', expiration_date: '' });
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
              <h2 className="text-lg font-semibold text-stone-900">Agregar producto</h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <ScrollArea className="flex-1 overflow-auto" style={{ overscrollBehavior: 'contain' }}>
              <form onSubmit={handleSubmit} className="px-6 py-3 space-y-4 pb-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Leche descremada"
                  required
                  className="rounded-xl" />

                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                  <Label>Categoría *</Label>
                  <CategoryChips
                    categoryType="inventory"
                    selected={formData.category}
                    onSelect={(name) => setFormData(d => ({ ...d, category: name }))}
                    emojiOptions={EMOJI_OPTIONS}
                    placeholder="Nombre de categoría"
                    cascadeQueryKeys={[['inventory']]}
                    emptyMessage="Todavía no tenés categorías"
                    emptyButtonLabel="Crear categoría"
                    onAfterCreate={(cat) => setFormData(d => ({ ...d, category: cat.name }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad *</Label>
                    <Input
                    id="quantity"
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                    className="rounded-xl" />

                  </div>
                  <div className="space-y-2">
                    <Label>Unidad *</Label>
                    <div className="flex flex-wrap gap-1">
                      {UNITS.map((unit) =>
                    <button
                      key={unit.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, unit: unit.value })}
                      className={`px-2 py-1 rounded-lg text-xs ${
                      formData.unit === unit.value ?
                      'bg-stone-900 text-white' :
                      'bg-stone-100 text-stone-600'}`
                      }>

                          {unit.label}
                        </button>
                    )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiration">Vencimiento (opcional)</Label>
                  <Input
                  id="expiration"
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  className="rounded-xl" />

                </div>

                <Button
                type="submit"
                className="w-full rounded-xl h-12 bg-stone-900 hover:bg-stone-800"
                disabled={!formData.category}>

                  Agregar al almacén
                </Button>
              </form>
            </ScrollArea>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}