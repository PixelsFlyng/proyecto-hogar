import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, Heart, ChefHat } from 'lucide-react';

const categoryColors = {
  desayuno: 'bg-amber-100 text-amber-800',
  almuerzo: 'bg-emerald-100 text-emerald-800',
  cena: 'bg-indigo-100 text-indigo-800',
  postre: 'bg-pink-100 text-pink-800',
  snack: 'bg-orange-100 text-orange-800',
  bebida: 'bg-cyan-100 text-cyan-800',
};

export default function RecipeCard({ recipe, onClick, onFavorite, isAvailable = false }) {
  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    onFavorite(recipe);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm cursor-pointer relative"
    >
      {/* Available badge */}
      {isAvailable && (
        <div className="absolute top-2 left-2 z-10 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <ChefHat className="w-3 h-3" />
          Disponible
        </div>
      )}

      {/* Image */}
      <div className="aspect-[4/3] relative">
        {recipe.image_url ? (
          <img 
            src={recipe.image_url} 
            alt={recipe.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center">
            <span className="text-4xl">🍽️</span>
          </div>
        )}
        
        {/* Favorite button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-2 right-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-sm"
        >
          <Heart className={`w-4 h-4 ${recipe.is_favorite ? 'fill-red-500 text-red-500' : 'text-stone-400'}`} />
        </button>

        {/* Category badge */}
        <div className="absolute bottom-2 left-2">
          <span className={`text-xs px-2 py-1 rounded-full ${categoryColors[recipe.category] || 'bg-stone-100 text-stone-600'}`}>
            {recipe.category}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-stone-900 truncate mb-1">{recipe.name}</h3>
        <div className="flex items-center gap-3 text-xs text-stone-500">
          {(recipe.prep_time || recipe.cook_time) && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
            </div>
          )}
          {recipe.servings && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>{recipe.servings}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}