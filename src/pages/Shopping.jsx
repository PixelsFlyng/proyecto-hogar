import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, Trash2, MoreVertical, ShoppingCart, Archive, X, Package, Edit2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SourcesModal from '@/components/shopping/SourcesModal';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';

const UNITS = [
  { value: 'none', label: 'Sin unidad' },
  { value: 'unidades', label: 'Unidades' },
  { value: 'kg', label: 'Kg' },
  { value: 'g', label: 'Gramos' },
  { value: 'litros', label: 'Litros' },
  { value: 'ml', label: 'ml' },
  { value: 'paquetes', label: 'Paquetes' },
];

export default function Shopping() {
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedList, setSelectedList] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemUnit, setNewItemUnit] = useState('none');
  const [showArchived, setShowArchived] = useState(false);
  const [showAddToInventory, setShowAddToInventory] = useState(false);
  const [listToComplete, setListToComplete] = useState(null);
  const [itemCategories, setItemCategories] = useState({});
  const [completing, setCompleting] = useState(false);
  const [editingListId, setEditingListId] = useState(null);
  const [editListName, setEditListName] = useState('');
  const [completeAction, setCompleteAction] = useState('archive'); // 'archive' or 'delete'
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  
  const pendingUpdates = useRef({});
  const queryClient = useQueryClient();
  useRealtimeQuery('shopping_lists', 'shopping-lists');

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['shopping-lists'],
    queryFn: () => api.entities.ShoppingList.list('-created_date'),
  });

  const { data: customCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => api.entities.CustomCategory.list(),
  });

  const inventoryCategories = customCategories.filter(c => c.type === 'inventory');

  const activeLists = lists.filter(l => l.is_active);
  const archivedLists = lists.filter(l => !l.is_active);

  const createListMutation = useMutation({
    mutationFn: (data) => api.entities.ShoppingList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      setNewListName('');
      setShowNewList(false);
    },
  });

  const updateListMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.ShoppingList.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shopping-lists'] }),
  });

  const deleteListMutation = useMutation({
    mutationFn: (id) => api.entities.ShoppingList.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shopping-lists'] });
      setSelectedList(null);
    },
  });

  const createInventoryMutation = useMutation({
    mutationFn: (data) => api.entities.InventoryItem.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  const handleCreateList = () => {
    if (newListName.trim()) {
      createListMutation.mutate({
        name: newListName,
        items: [],
        is_active: true,
      });
    }
  };

  const addItem = (list) => {
    if (newItemName.trim()) {
      const newItem = {
        id: `${Date.now()}-${Math.random()}`,
        name: newItemName,
        quantity: newItemQty,
        unit: newItemUnit === 'none' ? '' : newItemUnit,
        checked: false,
        sources: ['Manual']
      };

      const existingItems = list.items || [];
      const existingIdx = existingItems.findIndex(
        item => item.name.toLowerCase() === newItemName.toLowerCase()
      );

      let updatedItems;
      if (existingIdx >= 0) {
        updatedItems = [...existingItems];
        updatedItems[existingIdx] = {
          ...updatedItems[existingIdx],
          quantity: (updatedItems[existingIdx].quantity || 1) + newItemQty,
          sources: [...(updatedItems[existingIdx].sources || ['Manual']), 'Manual']
        };
      } else {
        updatedItems = [...existingItems, newItem];
      }

      updateListMutation.mutate({
        id: list.id,
        data: { items: updatedItems },
      });
      setNewItemName('');
      setNewItemQty(1);
      setNewItemUnit('none');
    }
  };

  const toggleItem = (list, itemIdx) => {
    // Get current state from the actual list data
    const currentList = lists.find(l => l.id === list.id);
    if (!currentList) return;
    
    const updatedItems = currentList.items.map((item, idx) => {
      if (idx === itemIdx) {
        return { ...item, checked: !item.checked };
      }
      return item;
    });
    
    updateListMutation.mutate({ id: list.id, data: { items: updatedItems } });
  };

  const removeItem = (list, itemIdx) => {
    const updatedItems = list.items.filter((_, idx) => idx !== itemIdx);
    updateListMutation.mutate({
      id: list.id,
      data: { items: updatedItems },
    });
  };

  const archiveList = (list) => {
    updateListMutation.mutate({
      id: list.id,
      data: { is_active: false },
    });
  };

  const openCompleteDialog = (list) => {
    setListToComplete(list);
    // Initialize categories for each item
    const cats = {};
    list.items?.filter(i => i.checked).forEach((item, idx) => {
      cats[idx] = inventoryCategories[0]?.name || '';
    });
    setItemCategories(cats);
    setShowAddToInventory(true);
  };

  const completeAndAddToInventory = async () => {
    if (!listToComplete || completing) return;
    setCompleting(true);

    const checkedItems = listToComplete.items?.filter(i => i.checked) || [];
    
    for (let i = 0; i < checkedItems.length; i++) {
      const item = checkedItems[i];
      const category = itemCategories[i];
      if (category && category !== 'skip') {
        await createInventoryMutation.mutateAsync({
          name: item.name,
          category: category,
          quantity: item.quantity || 1,
          unit: item.unit || 'unidades',
        });
      }
    }

    if (completeAction === 'delete') {
      await deleteListMutation.mutateAsync(listToComplete.id);
    } else {
      await updateListMutation.mutateAsync({
        id: listToComplete.id,
        data: { is_active: false },
      });
    }

    setShowAddToInventory(false);
    setListToComplete(null);
    setItemCategories({});
    setCompleting(false);
  };

  const handleRenameList = (list) => {
    setEditingListId(list.id);
    setEditListName(list.name);
  };

  const saveListName = () => {
    if (editListName.trim() && editingListId) {
      updateListMutation.mutate({
        id: editingListId,
        data: { name: editListName },
      });
      setEditingListId(null);
      setEditListName('');
    }
  };

  const getProgress = (items) => {
    if (!items || items.length === 0) return 0;
    return Math.round((items.filter(i => i.checked).length / items.length) * 100);
  };

  const isListComplete = (list) => {
    return list.items?.length > 0 && list.items.every(i => i.checked);
  };

  return (
    <div>
      <PageHeader 
        title="Lista de Compras" 
        subtitle={`${activeLists.length} lista${activeLists.length !== 1 ? 's' : ''} activa${activeLists.length !== 1 ? 's' : ''}`}
        action={
          archivedLists.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived(true)}
              className="text-stone-500"
            >
              <Archive className="w-4 h-4 mr-1" />
              Archivadas
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-32 bg-stone-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : activeLists.length === 0 && !showNewList ? (
        <EmptyState
          icon={ShoppingCart}
          title="Sin listas de compras"
          description="Creá una lista para organizar tus compras"
          action={
            <Button onClick={() => setShowNewList(true)} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              Nueva lista
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {showNewList && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-4 border border-stone-200 shadow-sm"
            >
              <Input
                placeholder="Nombre de la lista..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateList()}
                autoFocus
                className="mb-3 rounded-xl"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleCreateList}
                  className="flex-1 rounded-xl bg-stone-900"
                  disabled={!newListName.trim()}
                >
                  Crear lista
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowNewList(false); setNewListName(''); }}
                  className="rounded-xl"
                >
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}

          <AnimatePresence>
            {activeLists.map((list) => (
              <motion.div
                key={list.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="rounded-2xl border shadow-sm overflow-hidden"
                style={{ backgroundColor: 'var(--theme-card)', borderColor: 'var(--theme-border)' }}
              >
                <div className="p-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
                  <div className="flex items-center justify-between mb-2">
                    {editingListId === list.id ? (
                      <div className="flex gap-2 flex-1 mr-2">
                        <Input
                          value={editListName}
                          onChange={(e) => setEditListName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveListName()}
                          autoFocus
                          className="rounded-xl"
                        />
                        <Button size="sm" onClick={saveListName} className="rounded-lg">
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <h3 className="font-semibold" style={{ color: 'var(--theme-text)' }}>{list.name}</h3>
                    )}
                    <div className="flex items-center gap-2">
                      {isListComplete(list) && (
                        <Button
                          size="sm"
                          onClick={() => openCompleteDialog(list)}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-xs"
                        >
                          <Package className="w-3 h-3 mr-1" />
                          Completar
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 hover:bg-stone-100 rounded-lg">
                            <MoreVertical className="w-4 h-4 text-stone-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleRenameList(list)}>
                            <Edit2 className="w-4 h-4 mr-2" />
                            Renombrar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => archiveList(list)}>
                            <Archive className="w-4 h-4 mr-2" />
                            Archivar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => deleteListMutation.mutate(list.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {list.items && list.items.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${getProgress(list.items)}%` }}
                          className="h-full bg-emerald-500 rounded-full"
                        />
                      </div>
                      <span className="text-xs text-stone-500">
                        {list.items.filter(i => i.checked).length}/{list.items.length}
                      </span>
                    </div>
                  )}
                </div>

                <div className="divide-y divide-stone-50 max-h-64 overflow-y-auto touch-pan-y">
                  {list.items?.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center gap-3 p-3 hover:bg-stone-50"
                    >
                      <button
                        onClick={() => toggleItem(list, idx)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                          item.checked 
                            ? 'border-emerald-500 bg-emerald-500' 
                            : 'border-stone-300 hover:border-stone-400'
                        }`}
                      >
                        {item.checked && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <span className={`block truncate ${item.checked ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                          {item.name}
                        </span>
                        {item.sources && item.sources.length > 1 && (
                          <button
                            onClick={() => { setSelectedItem(item); setShowSourcesModal(true); }}
                            className="text-xs text-blue-500 flex items-center gap-1"
                          >
                            <Info className="w-3 h-3" />
                            {item.sources.length} fuentes
                          </button>
                        )}
                      </div>
                      <span className="text-sm text-stone-400 whitespace-nowrap">
                        {item.quantity || ''} {item.unit || ''}
                      </span>
                      <button
                        onClick={() => removeItem(list, idx)}
                        className="p-1 text-stone-300 hover:text-red-500 flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-stone-50">
                  <div className="flex gap-2 flex-wrap">
                    <Input
                      placeholder="Agregar item..."
                      value={selectedList === list.id ? newItemName : ''}
                      onFocus={() => setSelectedList(list.id)}
                      onChange={(e) => setNewItemName(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addItem(list)}
                      className="flex-1 min-w-[120px] rounded-xl bg-white"
                    />
                    <Input
                      type="number"
                      min="0.1"
                      step="0.1"
                      placeholder="Cant"
                      value={selectedList === list.id ? newItemQty : 1}
                      onFocus={() => setSelectedList(list.id)}
                      onChange={(e) => setNewItemQty(parseFloat(e.target.value) || 1)}
                      className="w-16 rounded-xl bg-white"
                    />
                    <Select
                      value={selectedList === list.id ? newItemUnit : 'none'}
                      onValueChange={(v) => { setSelectedList(list.id); setNewItemUnit(v); }}
                    >
                      <SelectTrigger className="w-24 rounded-xl bg-white">
                        <SelectValue placeholder="Unidad" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map(u => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      onClick={() => addItem(list)}
                      disabled={!newItemName.trim() || selectedList !== list.id}
                      className="rounded-xl bg-stone-900 h-10 w-10"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!showNewList && (
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowNewList(true)}
          className="fixed right-4 w-14 h-14 bg-stone-900 text-white rounded-full shadow-lg flex items-center justify-center z-40"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 20px) + 80px)' }}
        >
          <Plus className="w-6 h-6" />
        </motion.button>
      )}

      <Dialog open={showArchived} onOpenChange={setShowArchived}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Listas archivadas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto touch-pan-y">
            {archivedLists.map((list) => (
              <div
                key={list.id}
                className="flex items-center justify-between p-3 bg-stone-50 rounded-xl"
              >
                <div>
                  <p className="font-medium text-stone-700">{list.name}</p>
                  <p className="text-xs text-stone-500">
                    {list.items?.length || 0} items
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateListMutation.mutate({ id: list.id, data: { is_active: true } })}
                    className="rounded-lg"
                  >
                    Restaurar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteListMutation.mutate(list.id)}
                    className="rounded-lg text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddToInventory} onOpenChange={setShowAddToInventory}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Completar lista</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-stone-600 text-sm">
              Seleccioná la categoría para cada item que quieras agregar al almacén:
            </p>
            
            {listToComplete && (
              <div className="space-y-3 max-h-60 overflow-y-auto touch-pan-y">
                {listToComplete.items?.filter(i => i.checked).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-stone-700">{item.name}</p>
                      <p className="text-xs text-stone-500">
                        {item.quantity || 1} {item.unit || 'unidad(es)'}
                      </p>
                    </div>
                    <Select
                      value={itemCategories[idx] || 'skip'}
                      onValueChange={(v) => setItemCategories({ ...itemCategories, [idx]: v })}
                    >
                      <SelectTrigger className="w-32 rounded-xl">
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">No agregar</SelectItem>
                        {inventoryCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            )}

            {inventoryCategories.length === 0 && (
              <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-xl">
                No tenés categorías en el almacén. Creá algunas desde Comida → Almacén para poder agregar items.
              </p>
            )}

            <div className="space-y-2">
              <Label>¿Qué hacer con la lista?</Label>
              <div className="flex gap-2">
                <button
                  onClick={() => setCompleteAction('archive')}
                  className={`flex-1 p-3 rounded-xl text-sm ${
                    completeAction === 'archive'
                      ? 'bg-stone-900 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Archivar
                </button>
                <button
                  onClick={() => setCompleteAction('delete')}
                  className={`flex-1 p-3 rounded-xl text-sm ${
                    completeAction === 'delete'
                      ? 'bg-red-600 text-white'
                      : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddToInventory(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={completeAndAddToInventory} 
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={completing}
            >
              {completing ? 'Procesando...' : 'Completar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SourcesModal 
        isOpen={showSourcesModal} 
        onClose={() => { setShowSourcesModal(false); setSelectedItem(null); }} 
        item={selectedItem} 
      />
    </div>
  );
}