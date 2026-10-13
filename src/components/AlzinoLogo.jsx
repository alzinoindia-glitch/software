import React from 'react';

/**
 * Official ALZINO Brand Identity Logo
 * Features the signature stylized 'A' with the energetic golden swoosh,
 * followed by the bold modern 'LZINO' typography.
 */
export default function AlzinoLogo({ 
  height = 26, 
  textColor = '#FFFFFF', 
  swooshColor = '#FACC15',
  style = {},
  className = ''
}) {
  const iconHeight = height;
  const iconWidth = Math.round(height * 0.96); // aspect ratio for 'A'
  // The SVG mark includes transparent viewBox padding. Slightly enlarge the
  // wordmark so its visible capital height aligns with the visible A mark.
  const fontSize = Math.round(height * 1.14);

  return (
    <div 
      className={`alzino-brand-logo ${className}`}
      style={{ 
        display: 'inline-flex', 
        alignItems: 'center', 
        gap: '1px',
        userSelect: 'none',
        lineHeight: 1,
        ...style 
      }}
    >
      {/* Signature Stylized 'A' with Golden Swoosh */}
      <svg 
        width={iconWidth} 
        height={iconHeight} 
        viewBox="0 0 32 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', flexShrink: 0 }}
      >
        {/* The White Triangular A Structure */}
        <path 
          d="M15.8 2.2L2.5 28.5H8.2L12.1 20.8H19.5L23.4 28.5H29.1L15.8 2.2ZM15.8 11.2L18.1 16.5H13.5L15.8 11.2Z" 
          fill={textColor} 
        />
        
        {/* The Signature Golden/Yellow Dynamic Curved Swoosh */}
        <path 
          d="M4.2 24.2C8.6 20.8 15.2 13.8 29.8 9.2C21.4 13.2 14.8 19.4 6.8 26.5C5.8 27.4 4.8 26.2 4.2 24.2Z" 
          fill={swooshColor} 
        />
        {/* Subtle accent highlight on the swoosh for premium sheen */}
        <path 
          d="M7.5 22.8C12.8 18.2 18.6 13.2 29.8 9.2C23.5 12.2 17.5 16.8 9.2 24.2C8.2 24.8 7.4 23.9 7.5 22.8Z" 
          fill="#FEF08A" 
          opacity="0.8"
        />
      </svg>

      {/* Modern Bold 'LZINO' Lettering */}
      <span 
        style={{
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
          fontWeight: 900,
          fontSize: `${fontSize}px`,
          letterSpacing: '-0.02em',
          color: textColor,
          textTransform: 'uppercase',
          display: 'inline-block',
          marginLeft: '0.5px',
          lineHeight: 1
        }}
      >
        LZINO
      </span>
    </div>
  );
}
