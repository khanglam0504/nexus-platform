'use client';

import { useMemo } from 'react';
import { minidenticon } from 'minidenticons';

interface IdenticonProps {
  /** String to generate identicon from (typically name or id) */
  name: string;
  /** Size in pixels (default: 40) */
  size?: number;
  /** Saturation percentage 0-100 (default: 50) */
  saturation?: number;
  /** Lightness percentage 0-100 (default: 50) */
  lightness?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Generates a unique, deterministic SVG identicon from a string.
 * Same input always produces the same output.
 */
export function Identicon({
  name,
  size = 40,
  saturation = 50,
  lightness = 50,
  className,
}: IdenticonProps) {
  const svgUri = useMemo(() => {
    const svg = minidenticon(name, saturation, lightness);
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, [name, saturation, lightness]);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Data URI not compatible with next/image
    <img
      src={svgUri}
      alt={name}
      width={size}
      height={size}
      className={className}
      style={{ borderRadius: '50%' }}
    />
  );
}
