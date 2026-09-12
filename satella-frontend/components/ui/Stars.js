'use client';

import { useTheme } from '../../context/ThemeContext';

export default function Stars() {
  const { theme } = useTheme();

  return (
    <div
      className="fixed inset-0 pointer-events-none transition-opacity duration-300 z-0"
      style={{
        opacity: theme === 'dark' ? 0.55 : 0,
        backgroundImage: `
          radial-gradient(1.2px 1.2px at 8% 15%, #E4C25E, transparent),
          radial-gradient(1px 1px at 22% 70%, #E4C25E, transparent),
          radial-gradient(1.4px 1.4px at 38% 28%, #E4C25E, transparent),
          radial-gradient(1px 1px at 57% 82%, #E4C25E, transparent),
          radial-gradient(1.2px 1.2px at 76% 19%, #E4C25E, transparent),
          radial-gradient(1px 1px at 91% 61%, #E4C25E, transparent)
        `,
      }}
    />
  );
}
