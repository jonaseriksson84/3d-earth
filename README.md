# 3D Earth with Real-Time Sun Position

An interactive 3D Earth visualization that displays real-time day/night cycles based on accurate astronomical calculations and your geographic location.

## Features

- **Real-Time Sun Positioning**: Uses NOAA equations for precise sun position calculation
- **Geolocation Integration**: Centers your longitude in the view and calculates local lighting
- **Interactive Time Controls**: Manual time slider or real-time mode
- **Realistic Earth Rendering**: High-quality textures with surface maps, normal maps, and specular reflectance
- **Cloud Layer**: Semi-transparent cloud coverage with independent rotation
- **Astronomical Accuracy**: Shows subsolar point coordinates and accounts for equation of time

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
// Account for Earth texture orientation in Three.js
let sunLon = subsolarLon - 90;
```

### Coordinate System

The project uses a hybrid coordinate system:

- **Geographic coordinates**: Standard longitude/latitude for sun calculations  
- **Three.js world coordinates**: 3D Cartesian coordinates for rendering
- **Earth texture mapping**: Accounts for texture orientation with 90° offset

Key coordinate conversion with proper east/west movement:
```javascript
const x = Math.cos(lat) * Math.cos(lon);
const y = Math.sin(lat);
const z = -Math.cos(lat) * Math.sin(lon);  // Inverted for correct Three.js movement
```

### Earth Rotation

The Earth is rotated to center the user's longitude in view:
```javascript
earth.rotation.y = -(Math.PI / 2) - (userLongitude * Math.PI / 180);
```

This rotation accounts for both the Earth texture's default orientation and the user's geographic location.

## Time Controls

- **Real-Time Mode**: Updates sun position continuously based on current time
- **Manual Mode**: Use the time slider to see sun position at any time of day
- **Reset Button**: Returns to current real time

## Display Information

- **Local Time**: Your current local time
- **UTC Time**: Coordinated Universal Time
- **Subsolar Point**: Current latitude and longitude where sun is directly overhead

## Technical Challenges Solved

### East/West Movement Direction
Initially, the sun was moving east as time progressed instead of west. This was solved by:
1. Correcting the longitude calculation formula to use negative time progression
2. Inverting the Z-coordinate in the spherical-to-Cartesian conversion for Three.js

### Day/Night Timing Accuracy
The sun's position was offset by approximately 12 hours from reality. Fixed by:
1. Properly accounting for the Earth texture's orientation in Three.js coordinate system
2. Adding/subtracting the correct 90° offset for texture alignment

### Coordinate System Integration
Reconciled three different coordinate systems:
1. Standard geographic coordinates (longitude/latitude)
2. Three.js world coordinates (x, y, z)
3. Earth texture mapping coordinates

## Dependencies

- **Three.js r128**: 3D graphics library
- **OrbitControls**: Camera movement controls
- **Earth Textures**: High-resolution surface, normal, and specular maps from threejs.org

## Usage

Simply open `index.html` in a web browser. The application will:

1. Request your location for accurate positioning
2. Display the Earth with real-time lighting
3. Center your longitude in the view
4. Update continuously to show current day/night conditions

Use the time slider to explore lighting conditions at different times of day, or toggle real-time mode to see live updates.

## Astronomical Data Sources

- NOAA Solar Position Calculator equations for equation of time and solar declination
- Standard astronomical formulas for day-of-year and subsolar point calculations
- Geographic coordinate system for accurate Earth positioning