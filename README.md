# 3D Earth with Real-Time Sun Position

An interactive 3D Earth visualization that displays real-time day/night cycles based on accurate astronomical calculations and your geographic location.

## Features

- **Real-Time Sun Positioning**: Uses NOAA equations for precise sun position calculation
- **City Lights**: Realistic illuminated cities visible on the dark side of Earth
- **Geolocation Integration**: Centers your longitude in the view for personalized lighting
- **Intuitive Time Control**: Clean slider interface to explore different times of day
- **Realistic Earth Rendering**: High-quality textures with surface maps, normal maps, and specular reflectance
- **Cloud Layer**: Semi-transparent global cloud coverage
- **Interactive Controls**: Mouse drag to rotate, scroll to zoom, with zoom limits to prevent going inside Earth
- **User-Friendly Interface**: Clear time display and interaction instructions

## Technical Implementation

### Sun Position Calculation

The sun's position is calculated using standard astronomical formulas:

1. **Day of Year Calculation**: Determines the fractional day of the year
2. **Solar Declination**: Uses NOAA equations to calculate the sun's latitude
3. **Equation of Time**: Accounts for Earth's elliptical orbit and axial tilt
4. **Subsolar Longitude**: Calculates where the sun is directly overhead

```javascript
// Core formula for subsolar longitude (moves west as time progresses)
let subsolarLon = -(utcMinutes - 720 + eqTime) * 0.25;
// Use directly without offset for correct positioning
let sunLon = subsolarLon;
```

### City Lights Implementation

City lights are rendered using a custom shader that blends day and night textures:

```javascript
// Custom shader blends textures based on sun position
const earthMaterial = new THREE.ShaderMaterial({
    uniforms: {
        dayTexture: { value: dayTexture },
        nightTexture: { value: nightTexture },
        sunDirection: { value: new THREE.Vector3() }
    },
    // Shader calculates lighting in object space for proper rotation
    fragmentShader: `
        float sunDot = dot(objectNormal, normalize(sunDirection));
        float mixFactor = smoothstep(-0.1, 0.1, sunDot);
        vec4 finalColor = mix(nightColor, dayColor, mixFactor);
    `
});
```

### Coordinate System

The project uses object-space coordinates for lighting to ensure proper rotation:

- **Geographic coordinates**: Standard longitude/latitude for sun calculations  
- **Object-space lighting**: Ensures day/night patterns rotate with Earth
- **OrbitControls integration**: Lighting stays fixed to Earth's surface during user interaction

Key coordinate conversion:
```javascript
const x = Math.cos(lat) * Math.cos(lon);
const y = Math.sin(lat);
const z = -Math.cos(lat) * Math.sin(lon);  // Inverted for correct Three.js movement
```

### User Interface

Clean, intuitive interface with:
- **Single time display**: Shows local time with UTC in parentheses
- **Direct time control**: Slider immediately updates sun position
- **Interaction guidance**: Clear instructions for mouse controls
- **Zoom limits**: Prevents camera from going inside Earth geometry

## User Controls

- **Mouse Drag**: Rotate the Earth in any direction
- **Mouse Scroll**: Zoom in for surface detail or zoom out for global view
- **Time Slider**: Adjust time to see how lighting changes throughout the day

## Display Information

- **Time Display**: Shows your local time with UTC time in parentheses
- **City Lights**: Illuminated cities automatically appear in nighttime regions
- **Realistic Lighting**: Smooth day/night transitions with accurate sun positioning

## Technical Challenges Solved

### Sun Movement and Positioning
- **East/West Direction**: Corrected sun movement to properly move west as time progresses
- **Timing Accuracy**: Fixed sun position to correctly illuminate regions at appropriate times
- **Coordinate System**: Implemented object-space lighting to ensure day/night patterns rotate with Earth

### User Experience Improvements
- **Interface Simplification**: Removed confusing controls and technical jargon for intuitive use
- **City Lights Integration**: Added realistic nighttime illumination using custom shaders
- **Zoom Controls**: Implemented distance limits to prevent camera from going inside Earth
- **Visual Polish**: Changed to black space background and added clear user instructions

## Dependencies

- **Three.js r128**: 3D graphics library
- **OrbitControls**: Camera movement controls
- **Earth Textures**: High-resolution surface, normal, and specular maps from threejs.org

## Usage

Simply open `index.html` in a web browser. The application will:

1. Request your location for accurate positioning
2. Display the Earth with real-time lighting and city lights
3. Center your longitude in the view
4. Show current time with intuitive controls

**Interactions:**
- **Drag** to rotate the Earth and explore different regions
- **Scroll** to zoom in for surface details or zoom out for global view  
- **Use the time slider** to see how lighting changes throughout the day
- **Watch city lights** appear automatically in nighttime areas

## Astronomical Data Sources

- NOAA Solar Position Calculator equations for equation of time and solar declination
- Standard astronomical formulas for day-of-year and subsolar point calculations
- Geographic coordinate system for accurate Earth positioning