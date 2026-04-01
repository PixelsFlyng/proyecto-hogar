import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { AnimatePresence } from 'framer-motion';
import { Plus, Package, BookOpen, Search, Heart, ChefHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import CategoryFilter from '@/components/common/CategoryFilter';
import InventoryCard from '@/components/food/InventoryCard';
import RecipeCard from '@/components/food/RecipeCard';
import AddInventoryModal from '@/components/food/AddInventoryModal';
import AddRecipeModal from '@/components/food/AddRecipeModal';
import { createPageUrl } from '@/utils';

const RECIPE_CATEGORIES = [
  { value: 'all', label: 'Todas' },
  { value: 'favoritos', label: '❤️ Favoritos' },
  { value: 'disponibles', label: '🍳 Disponibles' },
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'cena', label: 'Cena' },
  { value: 'postre', label: 'Postre' },
  { value: 'snack', label: 'Snack' },
  { value: 'bebida', label: 'Bebida' },
];

export default function Food() {
  // Check URL for tab parameter
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get('tab') || 'inventory';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showAddInventory, setShowAddInventory] = useState(false);
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading: loadingInventory } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list('-created_date'),
  });

  const { data: recipes = [], isLoading: loadingRecipes } = useQuery({
    queryKey: ['recipes'],
    queryFn: () => base44.entities.Recipe.list('-created_date'),
  });

  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => base44.entities.CustomCategory.list(),
  });

  const inventoryCustomCats = customCategories.filter(c => c.type === 'inventory');

  const createInventoryMutation = useMutation({
    mutationFn: (data) => base44.entities.InventoryItem.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const createRecipeMutation = useMutation({
    mutationFn: (data) => base44.entities.Recipe.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  });

  const updateRecipeMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Recipe.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recipes'] }),
  });

  const handleFavoriteRecipe = (recipe) => {
    updateRecipeMutation.mutate({
      id: recipe.id,
      data: { is_favorite: !recipe.is_favorite },
    });
  };

  // Check which recipes can be made with current inventory
  const availableRecipes = useMemo(() => {
    const inventoryNames = inventory.map(i => i.name.toLowerCase());
    
    return recipes.filter(recipe => {
      if (!recipe.ingredients || recipe.ingredients.length === 0) return false;
      
      const hasAllIngredients = recipe.ingredients.every(ing => {
        const ingName = ing.name.toLowerCase();
        return inventoryNames.some(invName => 
          invName.includes(ingName) || ingName.includes(invName)
        );
      });
      
      return hasAllIngredients;
    });
  }, [recipes, inventory]);

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (categoryFilter === 'favoritos') {
        return matchesSearch && recipe.is_favorite;
      }
      if (categoryFilter === 'disponibles') {
        return matchesSearch && availableRecipes.some(r => r.id === recipe.id);
      }
      const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [recipes, searchQuery, categoryFilter, availableRecipes]);

  // Build inventory category list from custom categories
  const inventoryCategoryLabels = {
    all: 'Todos',
    ...Object.fromEntries(inventoryCustomCats.map(c => [c.name, `${c.icon} ${c.name}`]))
  };

  const recipeCategoryLabels = Object.fromEntries(RECIPE_CATEGORIES.map(c => [c.value, c.label]));

  return (
    <div>
      <PageHeader 
        title="Comida" 
        subtitle={activeTab === 'inventory' ? 'Tu almacén virtual' : 'Tus recetas favoritas'}
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCategoryFilter('all'); setSearchQuery(''); }} className="mb-6">
        <TabsList className="w-full p-1 rounded-2xl" style={{ backgroundColor: 'var(--theme-accent)' }}>
          <TabsTrigger 
            value="inventory" 
            className="flex-1 rounded-xl data-[state=active]:shadow-sm"
            style={{ '--tw-bg-opacity': 1 }}
          >
            <Package className="w-4 h-4 mr-2" />
            Almacén
          </TabsTrigger>
          <TabsTrigger 
            value="recipes"
            className="flex-1 rounded-xl data-[state=active]:shadow-sm"
          >
            <BookOpen className="w-4 h-4 mr-2" />
            Recetario
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder={activeTab === 'inventory' ? 'Buscar productos...' : 'Buscar recetas...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl bg-white border-stone-200"
          />
        </div>
        
        <CategoryFilter
          categories={activeTab === 'inventory' 
            ? inventoryCustomCats.map(c => c.name) 
            : RECIPE_CATEGORIES.slice(1).map(c => c.value)
          }
          selected={categoryFilter}
          onChange={setCategoryFilter}
          labels={activeTab === 'inventory' ? inventoryCategoryLabels : recipeCategoryLabels}
        />
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'inventory' ? (
          <div key="inventory">
            {loadingInventory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-stone-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredInventory.length === 0 ? (
              <EmptyState
                icon={Package}
                title={categoryFilter !== 'all' ? 'Sin productos en esta categoría' : 'Almacén vacío'}
                description={categoryFilter !== 'all' 
                  ? 'Agregá productos a esta categoría' 
                  : 'Agregá productos para llevar un registro de lo que tenés en casa'}
                action={
                  <Button onClick={() => setShowAddInventory(true)} className="rounded-xl">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar producto
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredInventory.map((item) => (
                    <InventoryCard
                      key={item.id}
                      item={item}
                      onDelete={(id) => deleteInventoryMutation.mutate(id)}
                      customCategories={inventoryCustomCats}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        ) : (
          <div key="recipes">
            {loadingRecipes ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="aspect-[4/5] bg-stone-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : filteredRecipes.length === 0 ? (
              <EmptyState
                icon={categoryFilter === 'favoritos' ? Heart : categoryFilter === 'disponibles' ? ChefHat : BookOpen}
                title={
                  categoryFilter === 'favoritos' ? 'Sin favoritos' : 
                  categoryFilter === 'disponibles' ? 'Sin recetas disponibles' : 
                  'Sin recetas'
                }
                description={
                  categoryFilter === 'favoritos' ? 'Marcá recetas con el corazón para verlas acá' :
                  categoryFilter === 'disponibles' ? 'No tenés ingredientes suficientes para ninguna receta' :
                  'Creá tu primera receta para tenerla siempre a mano'
                }
                action={
                  categoryFilter !== 'favoritos' && categoryFilter !== 'disponibles' && (
                    <Button onClick={() => setShowAddRecipe(true)} className="rounded-xl">
                      <Plus className="w-4 h-4 mr-2" />
                      Crear receta
                    </Button>
                  )
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {filteredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    onClick={() => window.location.href = createPageUrl(`RecipeDetail?id=${recipe.id}`)}
                    onFavorite={handleFavoriteRecipe}
                    isAvailable={availableRecipes.some(r => r.id === recipe.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => activeTab === 'inventory' ? setShowAddInventory(true) : setShowAddRecipe(true)}
        className="fixed right-4 w-14 h-14 bg-stone-900 text-white rounded-full shadow-lg flex items-center justify-center z-40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)' }}
      >
        <Plus className="w-6 h-6" />
      </motion.button>

      <AddInventoryModal
        isOpen={showAddInventory}
        onClose={() => setShowAddInventory(false)}
        onSave={(data) => createInventoryMutation.mutate(data)}
      />
      <AddRecipeModal
        isOpen={showAddRecipe}
        onClose={() => setShowAddRecipe(false)}
        onSave={(data) => createRecipeMutation.mutate(data)}
      />
    </div>
  );
}