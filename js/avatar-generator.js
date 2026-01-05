/**
 * Avatar Generator - Creates unique geometric/gradient avatars
 * Supports multiple styles: gradient, geometric, pixel, abstract
 */

const AVATAR_PRESETS = [
    { type: 'gradient', colors: ['#6366f1', '#8b5cf6'], name: 'Purple Dream' },
    { type: 'gradient', colors: ['#ec4899', '#f43f5e'], name: 'Rose Fire' },
    { type: 'gradient', colors: ['#10b981', '#3b82f6'], name: 'Ocean Breeze' },
    { type: 'gradient', colors: ['#f59e0b', '#d97706'], name: 'Golden Hour' },
    { type: 'gradient', colors: ['#06b6d4', '#8b5cf6'], name: 'Cyber Wave' },
    { type: 'gradient', colors: ['#ef4444', '#ec4899'], name: 'Sunset Blaze' },
    { type: 'gradient', colors: ['#14b8a6', '#22d3ee'], name: 'Mint Fresh' },
    { type: 'gradient', colors: ['#a855f7', '#6366f1'], name: 'Violet Storm' },
    { type: 'geometric', colors: ['#6366f1', '#1e1b4b'], name: 'Geo Indigo' },
    { type: 'geometric', colors: ['#f43f5e', '#450a0a'], name: 'Geo Ruby' },
    { type: 'geometric', colors: ['#10b981', '#022c22'], name: 'Geo Emerald' },
    { type: 'geometric', colors: ['#f59e0b', '#451a03'], name: 'Geo Amber' }
];

/**
 * Generate a hash from a string for consistent randomization
 */
function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

/**
 * Generate a seeded random number
 */
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

/**
 * Generate gradient avatar SVG
 */
function generateGradientAvatar(seed, colors, initials = '') {
    const hash = hashString(seed);
    const angle = (hash % 360);

    return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad-${hash}" x1="0%" y1="0%" x2="100%" y2="100%" gradientTransform="rotate(${angle})">
          <stop offset="0%" style="stop-color:${colors[0]};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${colors[1]};stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#grad-${hash})" />
      ${initials ? `<text x="50" y="50" dy="0.35em" text-anchor="middle" fill="white" font-family="Inter, sans-serif" font-weight="700" font-size="32">${initials}</text>` : ''}
    </svg>
  `;
}

/**
 * Generate geometric avatar SVG
 */
function generateGeometricAvatar(seed, colors) {
    const hash = hashString(seed);
    const shapes = [];

    // Generate 4-6 random shapes
    const numShapes = 4 + (hash % 3);

    for (let i = 0; i < numShapes; i++) {
        const shapeSeed = hash + i * 1000;
        const shapeType = shapeSeed % 3; // 0: circle, 1: triangle, 2: rectangle
        const x = (seededRandom(shapeSeed) * 80) + 10;
        const y = (seededRandom(shapeSeed + 1) * 80) + 10;
        const size = 15 + seededRandom(shapeSeed + 2) * 25;
        const opacity = 0.3 + seededRandom(shapeSeed + 3) * 0.5;
        const colorIndex = Math.floor(seededRandom(shapeSeed + 4) * colors.length);

        if (shapeType === 0) {
            shapes.push(`<circle cx="${x}" cy="${y}" r="${size / 2}" fill="${colors[colorIndex]}" opacity="${opacity}" />`);
        } else if (shapeType === 1) {
            const points = `${x},${y - size / 2} ${x - size / 2},${y + size / 2} ${x + size / 2},${y + size / 2}`;
            shapes.push(`<polygon points="${points}" fill="${colors[colorIndex]}" opacity="${opacity}" />`);
        } else {
            shapes.push(`<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" fill="${colors[colorIndex]}" opacity="${opacity}" rx="4" />`);
        }
    }

    return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="clip-${hash}">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill="${colors[1]}" />
      <g clip-path="url(#clip-${hash})">
        ${shapes.join('\n')}
      </g>
    </svg>
  `;
}

/**
 * Generate pixel avatar SVG
 */
function generatePixelAvatar(seed, colors) {
    const hash = hashString(seed);
    const pixels = [];
    const size = 10; // 10x10 grid
    const pixelSize = 100 / size;

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            const pixelSeed = hash + x * 100 + y;
            if (seededRandom(pixelSeed) > 0.4) {
                const colorIndex = Math.floor(seededRandom(pixelSeed + 50) * colors.length);
                pixels.push(`<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${colors[colorIndex]}" />`);
            }
        }
    }

    return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="pclip-${hash}">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <rect width="100" height="100" fill="${colors[1]}" />
      <g clip-path="url(#pclip-${hash})">
        ${pixels.join('\n')}
      </g>
    </svg>
  `;
}

/**
 * Generate abstract wave avatar
 */
function generateAbstractAvatar(seed, colors) {
    const hash = hashString(seed);
    const waves = [];

    for (let i = 0; i < 3; i++) {
        const waveSeed = hash + i * 500;
        const y1 = 30 + i * 20;
        const y2 = 40 + i * 20;
        const curve = seededRandom(waveSeed) * 30;
        const opacity = 0.5 + seededRandom(waveSeed + 1) * 0.5;

        waves.push(`
      <path d="M0,${y1} Q25,${y1 - curve} 50,${y1} T100,${y1} L100,100 L0,100 Z" 
            fill="${colors[i % colors.length]}" opacity="${opacity}" />
    `);
    }

    return `
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id="aclip-${hash}">
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="50" fill="${colors[0]}" />
      <g clip-path="url(#aclip-${hash})">
        ${waves.join('\n')}
      </g>
    </svg>
  `;
}

/**
 * Main function to generate avatar
 */
function generateAvatar(type, seed, colors, initials = '') {
    switch (type) {
        case 'gradient':
            return generateGradientAvatar(seed, colors, initials);
        case 'geometric':
            return generateGeometricAvatar(seed, colors);
        case 'pixel':
            return generatePixelAvatar(seed, colors);
        case 'abstract':
            return generateAbstractAvatar(seed, colors);
        default:
            return generateGradientAvatar(seed, colors, initials);
    }
}

/**
 * Get initials from name
 */
function getInitials(name) {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Create avatar element
 */
function createAvatarElement(type, seed, colors, initials = '', size = 100) {
    const svg = generateAvatar(type, seed, colors, initials);
    const container = document.createElement('div');
    container.innerHTML = svg;
    container.style.width = `${size}px`;
    container.style.height = `${size}px`;
    container.style.borderRadius = '50%';
    container.style.overflow = 'hidden';
    return container;
}

/**
 * Convert SVG to data URL
 */
function avatarToDataURL(type, seed, colors, initials = '') {
    const svg = generateAvatar(type, seed, colors, initials);
    return 'data:image/svg+xml;base64,' + btoa(svg);
}

// Export for use
export {
    generateAvatar,
    generateGradientAvatar,
    generateGeometricAvatar,
    generatePixelAvatar,
    generateAbstractAvatar,
    createAvatarElement,
    avatarToDataURL,
    getInitials,
    AVATAR_PRESETS
};
