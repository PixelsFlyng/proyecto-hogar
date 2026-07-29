import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { X, Plus, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const SCHEME = {
  stone: {
    chip: 'bg-stone-100 text-stone-700 hover:bg-stone-200',
    chipSelected: 'bg-stone-900 text-white',
    form: 'bg-stone-50',
    addBorder: 'border-stone-300 text-stone-500 hover:border-stone-400',
    createBtn: 'bg-stone-900 hover:bg-stone-800',
    emojiSelected: 'bg-stone-200 ring-2 ring-stone-400',
    emojiHover: 'hover:bg-stone-200',
  },
  emerald: {
    chip: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
    chipSelected: 'bg-emerald-600 text-white',
    form: 'bg-emerald-50',
    addBorder: 'border-emerald-300 text-emerald-500 hover:border-emerald-400',
    createBtn: 'bg-emerald-600 hover:bg-emerald-700',
    emojiSelected: 'bg-emerald-200 ring-2 ring-emerald-400',
    emojiHover: 'hover:bg-emerald-200',
  },
};

/**
 * Chips de categorías con soporte de crear, renombrar (nombre + icono) y eliminar.
 * El renombrado hace cascade a todos los registros que usen ese label.
 *
 * @param {{
 *   categoryType: string,
 *   selected: string,
 *   onSelect: (name: string) => void,
 *   emojiOptions: string[],
 *   placeholder?: string,
 *   cascadeQueryKeys?: string[][],
 *   onAfterCreate?: (cat: any) => void,
 *   accent?: 'stone' | 'emerald',
 *   emptyMessage?: string,
 *   emptyButtonLabel?: string,
 * }} props
 */
export default function CategoryChips({
  categoryType,
  selected,
  onSelect,
  emojiOptions,
  placeholder = 'Nombre',
  cascadeQueryKeys = [],
  onAfterCreate,
  accent = 'stone',
  emptyMessage,
  emptyButtonLabel = 'Crear',
}) {
  const queryClient = useQueryClient();
  const s = SCHEME[accent] || SCHEME.stone;

  const isPaymentMethod = categoryType === 'payment_method';

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState(emojiOptions?.[0] || '📦');
  const [newIsCard, setNewIsCard] = useState(false);
  const [newClosingDay, setNewClosingDay] = useState('');
  const [newDefaultInstallments, setNewDefaultInstallments] = useState('1');

  const [editingId, setEditingId] = useState(/** @type {string|null} */ (null));
  const [editingName, setEditingName] = useState('');
  const [editingIcon, setEditingIcon] = useState('');
  const [editingIsCard, setEditingIsCard] = useState(false);
  const [editingClosingDay, setEditingClosingDay] = useState('');
  const [editingDefaultInstallments, setEditingDefaultInstallments] = useState('1');

  const { data: allCategories = [] } = useQuery({
    queryKey: ['custom-categories'],
    queryFn: () => api.entities.CustomCategory.list(),
  });
  const categories = allCategories.filter(c => c.type === categoryType);

  const editingCat = categories.find(c => c.id === editingId) || null;

  const createMutation = useMutation({
    mutationFn: (/** @type {any} */ data) => api.entities.CustomCategory.create(data),
    onSuccess: (cat) => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      onAfterCreate?.(cat);
      setShowNew(false);
      setNewName('');
      setNewIcon(emojiOptions?.[0] || '📦');
      setNewIsCard(false);
      setNewClosingDay('');
      setNewDefaultInstallments('1');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (/** @type {string} */ id) => api.entities.CustomCategory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['custom-categories'] }),
  });

  const renameMutation = useMutation({
    mutationFn: async (/** @type {{cat: any, name: string, icon: string, extra?: any}} */ { cat, name, icon, extra }) => {
      await api.entities.CustomCategory.update(cat.id, { name, icon, ...(extra || {}) });
      if (name !== cat.name) await api.renameCategoryLabel(categoryType, cat.name, name);
    },
    onSuccess: (_data, { cat, name }) => {
      queryClient.invalidateQueries({ queryKey: ['custom-categories'] });
      if (name !== cat.name) {
        cascadeQueryKeys.forEach(k => queryClient.invalidateQueries({ queryKey: k }));
        if (selected === cat.name) onSelect(name);
      }
      setEditingId(null);
    },
  });

  const startEdit = (e, cat) => {
    e.stopPropagation();
    setShowNew(false);
    setEditingId(cat.id);
    setEditingName(cat.name);
    setEditingIcon(cat.icon || emojiOptions?.[0] || '📦');
    setEditingIsCard(!!cat.is_credit_card);
    setEditingClosingDay(cat.closing_day ? String(cat.closing_day) : '');
    setEditingDefaultInstallments(cat.default_installments ? String(cat.default_installments) : '1');
  };

  const confirmEdit = () => {
    if (!editingCat) return;
    const trimmed = editingName.trim();
    if (!trimmed) return;
    const extra = isPaymentMethod ? {
      is_credit_card: editingIsCard,
      closing_day: editingIsCard && editingClosingDay ? Math.min(28, Math.max(1, parseInt(editingClosingDay) || 1)) : null,
      default_installments: editingIsCard ? Math.max(1, parseInt(editingDefaultInstallments) || 1) : null,
    } : undefined;
    renameMutation.mutate({ cat: editingCat, name: trimmed, icon: editingIcon, extra });
  };

  if (categories.length === 0 && !showNew && emptyMessage) {
    return (
      <div className={`${s.form} rounded-xl p-4 text-center`}>
        <p className="text-sm text-stone-500 mb-3">{emptyMessage}</p>
        <Button type="button" variant="outline" onClick={() => setShowNew(true)} className="rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> {emptyButtonLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <div key={cat.id} className="relative group">
            <button
              type="button"
              onClick={() => onSelect(cat.name)}
              className={`px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all ${
                editingId === cat.id
                  ? `${s.chip} ring-2 ring-stone-400`
                  : selected === cat.name ? s.chipSelected : s.chip
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
            <button
              type="button"
              onClick={(e) => startEdit(e, cat)}
              className="absolute -top-1 -left-1 w-4 h-4 bg-stone-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <Pencil className="w-2.5 h-2.5" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(cat.id); }}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
        {!showNew && !editingId && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className={`px-3 py-2 rounded-xl text-sm border-2 border-dashed ${s.addBorder}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Panel de edición */}
      {editingCat && (
        <div className={`${s.form} rounded-xl p-4 space-y-3`}>
          <p className="text-xs text-stone-500 font-medium">Editando: {editingCat.icon} {editingCat.name}</p>
          <Input
            placeholder={placeholder}
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); confirmEdit(); } if (e.key === 'Escape') setEditingId(null); }}
            autoFocus
            className="rounded-xl"
          />
          <div className="flex flex-wrap gap-1">
            {emojiOptions?.map((emoji) => (
              <button key={emoji} type="button" onClick={() => setEditingIcon(emoji)}
                className={`p-2 rounded-lg text-lg ${editingIcon === emoji ? s.emojiSelected : s.emojiHover}`}>
                {emoji}
              </button>
            ))}
          </div>
          {isPaymentMethod && (
            <div className="space-y-2 pt-1 border-t border-stone-200">
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={editingIsCard}
                  onChange={(e) => setEditingIsCard(e.target.checked)}
                />
                Es tarjeta de crédito
              </label>
              {editingIsCard && (
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-stone-500">Día de cierre</label>
                    <Input
                      type="number" min="1" max="28"
                      value={editingClosingDay}
                      onChange={(e) => setEditingClosingDay(e.target.value)}
                      placeholder="Ej: 15"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-stone-500">Cuotas predeterminadas</label>
                    <Input
                      type="number" min="1"
                      value={editingDefaultInstallments}
                      onChange={(e) => setEditingDefaultInstallments(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setEditingId(null)} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={confirmEdit}
              disabled={!editingName.trim() || renameMutation.isPending}
              className={`flex-1 rounded-xl ${s.createBtn}`}
            >
              Guardar
            </Button>
          </div>
        </div>
      )}

      {/* Panel de creación */}
      {showNew && (
        <div className={`${s.form} rounded-xl p-4 space-y-3`}>
          <Input
            placeholder={placeholder}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-xl"
          />
          <div className="flex flex-wrap gap-1">
            {emojiOptions?.map((emoji) => (
              <button key={emoji} type="button" onClick={() => setNewIcon(emoji)}
                className={`p-2 rounded-lg text-lg ${newIcon === emoji ? s.emojiSelected : s.emojiHover}`}>
                {emoji}
              </button>
            ))}
          </div>
          {isPaymentMethod && (
            <div className="space-y-2 pt-1 border-t border-stone-200">
              <label className="flex items-center gap-2 text-sm text-stone-700">
                <input
                  type="checkbox"
                  checked={newIsCard}
                  onChange={(e) => setNewIsCard(e.target.checked)}
                />
                Es tarjeta de crédito
              </label>
              {newIsCard && (
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-stone-500">Día de cierre</label>
                    <Input
                      type="number" min="1" max="28"
                      value={newClosingDay}
                      onChange={(e) => setNewClosingDay(e.target.value)}
                      placeholder="Ej: 15"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="text-xs text-stone-500">Cuotas predeterminadas</label>
                    <Input
                      type="number" min="1"
                      value={newDefaultInstallments}
                      onChange={(e) => setNewDefaultInstallments(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setShowNew(false)} className="flex-1 rounded-xl">
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => createMutation.mutate({
                name: newName,
                type: categoryType,
                icon: newIcon,
                ...(isPaymentMethod ? {
                  is_credit_card: newIsCard,
                  closing_day: newIsCard && newClosingDay ? Math.min(28, Math.max(1, parseInt(newClosingDay) || 1)) : null,
                  default_installments: newIsCard ? Math.max(1, parseInt(newDefaultInstallments) || 1) : null,
                } : {}),
              })}
              disabled={!newName.trim()}
              className={`flex-1 rounded-xl ${s.createBtn}`}
            >
              Crear
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
