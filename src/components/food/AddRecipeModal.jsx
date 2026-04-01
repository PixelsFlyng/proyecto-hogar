import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';

const categories = [
{ value: 'desayuno', label: 'Desayuno' },
{ value: 'almuerzo', label: 'Almuerzo' },
{ value: 'cena', label: 'Cena' },
{ value: 'postre', label: 'Postre' },
{ value: 'snack', label: 'Snack' },
{ value: 'bebida', label: 'Bebida' }];


const UNITS = [
{ value: 'none', label: 'Sin unidad' },
{ value: 'unidades', label: 'Unidades' },
{ value: 'kg', label: 'Kg' },
{ value: 'g', label: 'Gramos' },
{ value: 'litros', label: 'Litros' },
{ value: 'ml', label: 'ml' },
{ value: 'tazas', label: 'Tazas' },
{ value: 'cdas', label: 'Cucharadas' },
{ value: 'cdtas', label: 'Cucharaditas' }];


export default function AddRecipeModal({ isOpen, onClose, onSave, editRecipe = null }) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'almuerzo',
    prep_time: '',
    cook_time: '',
    servings: '',
    ingredients: [{ name: '', quantity: '', unit: 'none' }],
    instructions: '',
    image_url: '',
    notes: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (editRecipe) {
      setFormData({
        ...editRecipe,
        ingredients: editRecipe.ingredients?.map((ing) => ({
          name: ing.name || '',
          quantity: ing.quantity?.toString().replace(/[^\d.]/g, '') || '',
          unit: ing.unit || 'none'
        })) || [{ name: '', quantity: '', unit: 'none' }]
      });
    } else {
      setFormData({
        name: '',
        category: 'almuerzo',
        prep_time: '',
        cook_time: '',
        servings: '',
        ingredients: [{ name: '', quantity: '', unit: 'none' }],
        instructions: '',
        image_url: '',
        notes: ''
      });
    }
  }, [editRecipe, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      prep_time: formData.prep_time ? parseInt(formData.prep_time) : null,
      cook_time: formData.cook_time ? parseInt(formData.cook_time) : null,
      servings: formData.servings ? parseInt(formData.servings) : null,
      ingredients: formData.ingredients.
      filter((i) => i.name.trim()).
      map((i) => ({
        name: i.name,
        quantity: i.quantity + (i.unit !== 'none' ? ` ${i.unit}` : ''),
        unit: i.unit
      }))
    });
    onClose();
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, { name: '', quantity: '', unit: 'none' }]
    });
  };

  const updateIngredient = (index, field, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index][field] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeIngredient = (index) => {
    setFormData({
      ...formData,
      ingredients: formData.ingredients.filter((_, i) => i !== index)
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData({ ...formData, image_url: file_url });
    setUploading(false);
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
          className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-50 max-h-[90vh] overflow-y-auto touch-pan-y">

            <div className="sticky top-0 bg-white px-6 py-4 border-b border-stone-100 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-stone-900">
                {editRecipe ? 'Editar receta' : 'Nueva receta'}
              </h2>
              <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="mb-16 px-6 py-3 space-y-5">
              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Imagen (opcional)</Label>
                {formData.image_url ?
              <div className="relative rounded-xl overflow-hidden">
                    <img src={formData.image_url} alt="Preview" className="w-full h-40 object-cover" />
                    <button
                  type="button"
                  onClick={() => setFormData({ ...formData, image_url: '' })}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white">

                      <X className="w-4 h-4" />
                    </button>
                  </div> :

              <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-stone-200 rounded-xl cursor-pointer hover:bg-stone-50 transition-colors">
                    <Upload className="w-6 h-6 text-stone-400 mb-2" />
                    <span className="text-sm text-stone-500">
                      {uploading ? 'Subiendo...' : 'Subir imagen'}
                    </span>
                    <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading} />

                  </label>
              }
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la receta</Label>
                <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Milanesas con puré"
                required
                className="rounded-xl" />

              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}>

                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) =>
                  <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                  )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="prep">Prep (min)</Label>
                  <Input
                  id="prep"
                  type="number"
                  value={formData.prep_time}
                  onChange={(e) => setFormData({ ...formData, prep_time: e.target.value })}
                  className="rounded-xl" />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="cook">Cocción (min)</Label>
                  <Input
                  id="cook"
                  type="number"
                  value={formData.cook_time}
                  onChange={(e) => setFormData({ ...formData, cook_time: e.target.value })}
                  className="rounded-xl" />

                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings">Porciones</Label>
                  <Input
                  id="servings"
                  type="number"
                  value={formData.servings}
                  onChange={(e) => setFormData({ ...formData, servings: e.target.value })}
                  className="rounded-xl" />

                </div>
              </div>

              {/* Ingredients */}
              <div className="space-y-3">
                <Label>Ingredientes</Label>
                {formData.ingredients.map((ing, idx) =>
              <div key={idx} className="flex gap-2 items-start">
                    <Input
                  placeholder="Ingrediente"
                  value={ing.name}
                  onChange={(e) => updateIngredient(idx, 'name', e.target.value)}
                  className="flex-1 rounded-xl" />

                    <Input
                  placeholder="Cant"
                  type="number"
                  step="0.1"
                  value={ing.quantity}
                  onChange={(e) => updateIngredient(idx, 'quantity', e.target.value)}
                  className="w-16 rounded-xl" />

                    <Select
                  value={ing.unit || 'none'}
                  onValueChange={(v) => updateIngredient(idx, 'unit', v)}>

                      <SelectTrigger className="w-24 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) =>
                    <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                    )}
                      </SelectContent>
                    </Select>
                    {formData.ingredients.length > 1 &&
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  className="p-2 text-stone-400 hover:text-red-500">

                        <Trash2 className="w-4 h-4" />
                      </button>
                }
                  </div>
              )}
                <Button
                type="button"
                variant="outline"
                onClick={addIngredient}
                className="w-full rounded-xl">

                  <Plus className="w-4 h-4 mr-2" />
                  Agregar ingrediente
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Instrucciones</Label>
                <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Escribí los pasos de preparación..."
                rows={4}
                className="rounded-xl resize-none" />

              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej: Receta de la abuela"
                className="rounded-xl" />

              </div>

              <Button
              type="submit"
              className="w-full rounded-xl h-12 bg-stone-900 hover:bg-stone-800">

                {editRecipe ? 'Guardar cambios' : 'Crear receta'}
              </Button>
            </form>
          </motion.div>
        </>
      }
    </AnimatePresence>);

}