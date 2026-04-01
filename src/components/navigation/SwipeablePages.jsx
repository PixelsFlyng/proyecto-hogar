import React, { useState, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';

const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY_THRESHOLD = 500;

export default function SwipeablePages({ 
  children, 
  currentIndex, 
  onIndexChange,
  pages = []
}) {
  const containerRef = useRef(null);
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnd = (event, info) => {
    setIsDragging(false);
    const { offset, velocity } = info;
    
    if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD) {
      if (offset.x > 0 && currentIndex > 0) {
        onIndexChange(currentIndex - 1);
      } else if (offset.x < 0 && currentIndex < pages.length - 1) {
        onIndexChange(currentIndex + 1);
      }
    }
  };

  return (
    <div ref={containerRef} className="overflow-hidden touch-pan-y">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="cursor-grab active:cursor-grabbing"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}