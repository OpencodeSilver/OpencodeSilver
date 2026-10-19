import React from 'react';

/** While a category is picked, Escape clears it and focus moves to its heading. */
export function useActiveCategoryFocus(category: string | null, clear: () => void) {
  const headingRef = React.useRef<HTMLHeadingElement | null>(null);
  React.useEffect(() => {
    if (!category) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') clear();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [category, clear]);
  React.useEffect(() => {
    if (category) headingRef.current?.focus();
  }, [category]);
  return headingRef;
}
