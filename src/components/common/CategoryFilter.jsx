import React from 'react';

export default function CategoryFilter({ 
  categories, 
  selected, 
  onChange, 
  labels = {},
  showAll = true 
}) {
  const allCategories = showAll ? ['all', ...categories] : categories;

  return (
    <div className="mb-4 -mx-4 px-4">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide touch-pan-x">
        {allCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-all flex-shrink-0 ${
              selected === cat
                ? 'bg-stone-900 text-white'
                : 'bg-white text-stone-600 border border-stone-200'
            }`}
          >
            {labels[cat] || cat}
          </button>
        ))}
      </div>
    </div>
  );
}