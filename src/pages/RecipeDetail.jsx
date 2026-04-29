import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Users, Heart, Edit2, Trash2, Check, ShoppingCart, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import AddRecipeModal from '@/components/food/AddRecipeModal';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function RecipeDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const recipeId = urlParams.get('id');
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showCookModal, setShowCookModal] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState([]);
  const [cooking, setCooking] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: recipe, isLoading } = useQuery({
    queryKey: ['recipe', recipeId],
    queryFn: async () => {
      const recipes = await api.entities.Recipe.filter({ id: recipeId });
      return recipes[0];
    },
    enabled: !!recipeId,
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => api.entities.InventoryItem.list(),
  });

  const { data: shoppingLists = [] } = useQuery({
    queryKey: ['shopping-lists'],
    queryFn: () => api.entities.ShoppingList.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => api.entities.Recipe.update(recipeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe', recipeId] });
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.entities.Recipe.delete(recipeId),
    onSuccess: () => {
      window.location.href = createPageUrl('Food') + '?tab=recipes';
    },
  });

  const createListMutation = useMutation({
    mutationFn: (data) => api.entities.ShoppingList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.ShoppingList.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
    },
  });

  const updateInventoryMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.InventoryItem.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: (id) => api.entities.InventoryItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const toggleIngredient = (idx) => {
    setCheckedIngredients(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const addToShoppingList = async () => {
    const uncheckedIngredients = recipe.ingredients
      .filter((_, idx) => !checkedIngredients.includes(idx))
      .map(ing => {
        // Parse quantity - extract number from string like "200g" or "2 cups"
        let qty = 1;
        let unit = '';
        const qtyStr = ing.quantity || '';
        const numMatch = qtyStr.match(/[\d.]+/);
        if (numMatch) {
          qty = parseFloat(numMatch[0]) || 1;
        }
        // Extract unit from quantity string or use ing.unit
        const unitMatch = qtyStr.match(/[a-zA-Z]+/);
        if (unitMatch) {
          unit = unitMatch[0].toLowerCase();
        } else if (ing.unit) {
          unit = ing.unit;
        }
        
        return {
          id: `${Date.now()}-${Math.random()}`,
          name: ing.name,
          quantity: qty,
          unit: unit,
          checked: false,
          sources: [`Receta: ${recipe.name}`]
        };
      });

    if (uncheckedIngredients.length > 0) {
      const activeList = shoppingLists.find(l => l.is_active);
      
      if (activeList) {
        const existingItems = activeList.items || [];
        const mergedItems = [...existingItems];
        
        uncheckedIngredients.forEach(newItem => {
          const existingIdx = mergedItems.findIndex(
            item => item.name.toLowerCase() === newItem.name.toLowerCase()
          );
          
          if (existingIdx >= 0) {
            const existing = mergedItems[existingIdx];
            mergedItems[existingIdx] = {
              ...existing,
              quantity: (existing.quantity || 1) + (newItem.quantity || 1),
              sources: [...(existing.sources || ['Manual']), ...newItem.sources]
            };
          } else {
            mergedItems.push(newItem);
          }
        });
        
        await updateListMutation.mutateAsync({
          id: activeList.id,
          data: { items: mergedItems }
        });
      } else {
        await createListMutation.mutateAsync({
          name: `Ingredientes: ${recipe.name}`,
          items: uncheckedIngredients,
          is_active: true,
        });
      }
      toast.success(`${uncheckedIngredients.length} ingredientes agregados a la lista`);
    }
  };

  const handleCookRecipe = async () => {
    if (cooking) return;
    setCooking(true);
    
    for (const ing of recipe.ingredients || []) {
      const inventoryItem = inventory.find(
        item => item.name.toLowerCase().includes(ing.name.toLowerCase()) ||
               ing.name.toLowerCase().includes(item.name.toLowerCase())
      );
      
      if (inventoryItem) {
        const usedQty = parseFloat(ing.quantity) || 1;
        const newQty = (inventoryItem.quantity || 0) - usedQty;
        
        if (newQty <= 0) {
          await deleteInventoryMutation.mutateAsync(inventoryItem.id);
        } else {
          await updateInventoryMutation.mutateAsync({
            id: inventoryItem.id,
            data: { quantity: newQty }
          });
        }
      }
    }
    
    setCooking(false);
    setShowCookModal(false);
  };

  const goBack = () => {
    window.location.href = createPageUrl('Food') + '?tab=recipes';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pt-safe">
        <div className="h-64 bg-stone-100 animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="h-8 w-2/3 bg-stone-100 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-stone-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-stone-500">Receta no encontrada</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen -mx-4 -mt-4"
    >
      {/* Back + Favorite buttons - always visible, above everything */}
      <button
        onClick={goBack}
        className="fixed top-4 left-4 p-2 bg-white rounded-full shadow-lg border border-stone-200 flex items-center justify-center"
        style={{ zIndex: 50 }}
      >
        <ArrowLeft className="w-5 h-5 text-stone-800" />
      </button>

      {/* Header Image */}
      <div className="relative h-64">
        {/* Favorite button - absolute inside image, same top as fixed back button */}
        <button
          onClick={() => updateMutation.mutate({ is_favorite: !recipe.is_favorite })}
          className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg border border-stone-200"
          style={{ zIndex: 20 }}
        >
          <Heart className={`w-5 h-5 ${recipe.is_favorite ? 'fill-red-500 text-red-500' : ''}`} />
        </button>
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-200 to-stone-300 flex items-center justify-center">
            <span className="text-6xl">🍽️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        


        {/* Title overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h1 className="text-2xl font-bold text-white mb-2">{recipe.name}</h1>
          <div className="flex gap-4 text-white/90 text-sm">
            {(recipe.prep_time || recipe.cook_time) && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{recipe.servings} porciones</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="px-4 py-3 border-b border-stone-100 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEdit(true)}
            className="rounded-xl"
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDelete(true)}
            className="rounded-xl text-red-500 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar
          </Button>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCookModal(true)}
          className="rounded-xl bg-emerald-600 hover:bg-emerald-700"
        >
          <ChefHat className="w-4 h-4 mr-1" />
          Cocinar
        </Button>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Ingredients */}
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-stone-900">Ingredientes</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={addToShoppingList}
                className="rounded-xl text-xs"
              >
                <ShoppingCart className="w-3.5 h-3.5 mr-1" />
                Agregar a lista
              </Button>
            </div>
            <div className="space-y-2">
              {recipe.ingredients.map((ing, idx) => (
                <motion.div
                  key={idx}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleIngredient(idx)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                    checkedIngredients.includes(idx) 
                      ? 'bg-emerald-50 border border-emerald-200' 
                      : 'bg-white border border-stone-100'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    checkedIngredients.includes(idx) 
                      ? 'border-emerald-500 bg-emerald-500' 
                      : 'border-stone-300'
                  }`}>
                    {checkedIngredients.includes(idx) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className={`flex-1 ${checkedIngredients.includes(idx) ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                    {ing.name}
                  </span>
                  {ing.quantity && (
                    <span className="text-stone-500 text-sm">{ing.quantity}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Instructions */}
        {recipe.instructions && (
          <section>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Preparación</h2>
            <div className="bg-white rounded-2xl p-4 border border-stone-100">
              <p className="text-stone-700 whitespace-pre-line leading-relaxed">
                {recipe.instructions}
              </p>
            </div>
          </section>
        )}

        {/* Notes */}
        {recipe.notes && (
          <section>
            <h2 className="text-lg font-semibold text-stone-900 mb-4">Notas</h2>
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
              <p className="text-amber-800 text-sm">{recipe.notes}</p>
            </div>
          </section>
        )}
      </div>

      {/* Edit Modal */}
      <AddRecipeModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={(data) => {
          updateMutation.mutate(data);
          setShowEdit(false);
        }}
        editRecipe={recipe}
      />

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar receta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La receta se eliminará permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-red-500 hover:bg-red-600"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cook Modal */}
      <Dialog open={showCookModal} onOpenChange={setShowCookModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Cocinaste esta receta?</DialogTitle>
          </DialogHeader>
          <p className="text-stone-600 text-sm">
            Al confirmar, se descontarán los ingredientes de tu almacén automáticamente.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCookModal(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCookRecipe} 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={cooking}
            >
              <ChefHat className="w-4 h-4 mr-2" />
              {cooking ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}