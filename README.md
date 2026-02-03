# 3D Earth

An interactive 3D Earth visualization with real-time day/night cycles, astronomical features, and geolocation integration.

## Features

### Core Visualization
- **Real-Time Day/Night Cycle**: Accurate sun positioning using NOAA solar equations
- **City Lights**: Illuminated cities visible on the dark side of Earth
- **Cloud Layer**: Animated semi-transparent cloud coverage with drift effect
- **Atmospheric Glow**: Realistic Fresnel-based atmosphere effect
- **High-Quality Textures**: Surface maps, normal maps, and specular reflectance

### Astronomical Features
- **Moon**: Position updates based on date and sun direction
- **Solar Eclipse Detection**: Eclipse shadow paths with quick-jump to upcoming eclipses
- **Aurora Borealis/Australis**: Animated aurora effects around polar regions
- **Satellite Orbits**: ISS and other satellite orbit visualization
- **Sunrise/Sunset Calculator**: Display times for selected locations
- **Day/Night Terminator**: Visual boundary line between day and night

### Navigation & Interaction
- **Geolocation Integration**: Centers view on user's location at startup
- **City Search**: Autocomplete search with smooth fly-to animations
- **Custom Markers**: Place up to 50 custom markers with labels (persisted to localStorage)
- **Mouse Controls**: Drag to rotate, scroll to zoom
- **Keyboard Navigation**: Space for play/pause, arrow keys for time stepping

### Time Controls
- **Time Slider**: 15-minute increment control
- **Date Picker**: With seasonal preset buttons (equinoxes and solstices)
- **Playback Animation**: Adjustable speed (1x, 10x, 60x, 360x)
- **UTC & Local Time Display**: Real-time clock display

### Visual Overlays
- **Timezone Boundaries**: Interactive lines with hover tooltips
- **Reference Grid**: Equator, meridians, and geographic grid lines
- **Level-of-Detail**: Geometry detail adjusts based on camera distance

### Technical Features
- **Progressive Web App**: Installable with offline support
- **WebGPU Support**: With automatic WebGL fallback
- **Texture Compression**: KTX2/Basis Universal with JPEG fallback
- **GPU Instancing**: Optimized rendering for stars and markers

## Tech Stack

- **[Astro](https://astro.build/)** - Static site framework
- **[Three.js](https://threejs.org/)** - 3D graphics library
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Deployment target
- **[Vitest](https://vitest.dev/)** - Unit testing

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run unit tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm docs` | Generate API documentation |

## Project Structure

```
src/
├── pages/
│   └── index.astro          # Main page with UI markup
├── scripts/
│   ├── main.ts              # Application entry point
│   └── earth/               # Core visualization modules
│       ├── scene.ts         # Scene, camera, renderer setup
│       ├── earth.ts         # Earth mesh and shader material
│       ├── astronomy.ts     # NOAA solar position calculations
│       ├── moon.ts          # Moon rendering
│       ├── aurora.ts        # Aurora effect
│       ├── eclipse.ts       # Eclipse shadow projection
│       ├── satellites.ts    # Satellite orbit visualization
│       ├── markers.ts       # City markers
│       ├── flyTo.ts         # Camera animation system
│       └── ...              # Additional modules
└── styles/
    └── global.css           # Application styles

public/
├── textures/                # Earth textures (JPG + KTX2)
├── icons/                   # PWA icons
└── manifest.webmanifest     # PWA manifest
```

## Controls

| Input | Action |
|-------|--------|
| Mouse drag | Rotate the globe |
| Mouse scroll | Zoom in/out |
| Space | Play/pause time animation |
| Left/Right arrows | Step time backward/forward |
| Click on city | Fly to location |

## Deployment

The project is configured for deployment to Cloudflare Workers:

```bash
pnpm build
npx wrangler deploy
```

## Astronomical Calculations

Sun positioning uses NOAA Solar Position Calculator equations:
- Day-of-year fractional calculations
- Solar declination with axial tilt (23.4°)
- Equation of time for Earth's elliptical orbit
- Subsolar point for accurate shadow placement

## License

MIT
