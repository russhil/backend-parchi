"use client";

import { useEffect, useState } from "react";

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

/**
 * Icon component that displays Material Symbols icons.
 * If the font fails to load, the icon is hidden instead of showing text.
 */
export default function Icon({ name, className = "", size }: IconProps) {
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    // Check if the font has loaded properly
    const checkFont = async () => {
      try {
        // Wait for fonts to be ready
        await document.fonts.ready;
        
        // Check if Material Symbols font is available
        const hasMaterialFont = document.fonts.check('400 24px "Material Symbols Outlined"');
        
        if (!hasMaterialFont) {
          // Font not available, hide the icon
          setIsHidden(true);
        }
      } catch {
        // If font check fails, hide the icon
        setIsHidden(true);
      }
    };

    // Give fonts a moment to load, then check
    const timer = setTimeout(checkFont, 200);
    return () => clearTimeout(timer);
  }, []);

  if (isHidden) {
    // Don't render anything if font is unavailable
    return null;
  }

  const style = size ? { fontSize: `${size}px` } : undefined;

  return (
    <span 
      className={`material-symbols-outlined ${className}`}
      style={style}
      aria-hidden="true"
      suppressHydrationWarning
    >
      {name}
    </span>
  );
}
