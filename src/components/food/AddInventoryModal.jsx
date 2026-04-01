import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus } from 'lucide-react';
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
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📦');

  const queryClient = useQueryClient();

  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => base44.entities.CustomCategory.list()
  });

  const inventoryCategories = customCategories.filter((c) => c.type === 'inventory');

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomCategory.create(data),
    onSuccess: (newCat) => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      setFormData({ ...formData, category: newCat.name });
      setShowNewCategory(false);
      setNewCatName('');
      setNewCatIcon('📦');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-categories'] })
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.category) return;
    onSave(formData);
    setFormData({
      name: '',
      category: '',
      quantity: 1,
      unit: 'unidades',
      expiration_date: ''
    });
    onClose();
  };

  const handleCreateCategory = () => {
    if (newCatName.trim()) {
      createCategoryMutation.mutate({
        name: newCatName,
        type: 'inventory',
        icon: newCatIcon
      });
    }
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
              <h2 className="text-lg font-semibold text-stone-900">Agregar producto</h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <ScrollArea className="flex-1 overflow-auto">
              <form onSubmit={handleSubmit} className="mb-16 px-6 py-3 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
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
                  <Label>Categoría</Label>
                  {inventoryCategories.length === 0 && !showNewCategory ?
                <div className="bg-stone-50 rounded-xl p-4 text-center">
                      <p className="text-sm text-stone-500 mb-3">Todavía no tenés categorías</p>
                      <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNewCategory(true)}
                    className="rounded-xl">

                        <Plus className="w-4 h-4 mr-2" />
                        Crear categoría
                      </Button>
                    </div> :

                <>
                      <div className="flex flex-wrap gap-2">
                        {inventoryCategories.map((cat) =>
                    <div key={cat.id} className="relative group">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.name })}
                        className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all ${
                        formData.category === cat.name ?
                        'bg-stone-900 text-white' :
                        'bg-stone-100 text-stone-700 hover:bg-stone-200'}`
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
                      className="px-3 py-2 rounded-xl text-sm border-2 border-dashed border-stone-300 text-stone-500 hover:border-stone-400">

                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Edit categories - X button on hover like other modals */}
                    </>
                }

                  {/* New category form */}
                  {showNewCategory &&
                <div className="bg-stone-50 rounded-xl p-4 space-y-3">
                      <div className="flex gap-2">
                        <Input
                      placeholder="Nombre de categoría"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="flex-1 rounded-xl" />

                      </div>
                      <div className="flex flex-wrap gap-1">
                        {EMOJI_OPTIONS.map((emoji) =>
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setNewCatIcon(emoji)}
                      className={`p-2 rounded-lg text-lg ${
                      newCatIcon === emoji ? 'bg-stone-200 ring-2 ring-stone-400' : 'hover:bg-stone-200'}`
                      }>

                            {emoji}
                          </button>
                    )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowNewCategory(false)}
                      className="flex-1 rounded-xl">

                          Cancelar
                        </Button>
                        <Button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={!newCatName.trim()}
                      className="flex-1 rounded-xl bg-stone-900">

                          Crear
                        </Button>
                      </div>
                    </div>
                }
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Cantidad</Label>
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
                    <Label>Unidad</Label>
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