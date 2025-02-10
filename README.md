# Three.js Earth with Satellite Simulation from TLE data

This project uses Three.js and dat.GUI to simulate Earth with orbiting satellites using TLE data from [CelesTrak](https://celestrak.org/NORAD). It visualizes satellites in LEO, MEO, and GEO with realistic 3D positioning and interactive controls.

## Live Demo

[Live Demo](https://arcazj.github.io/openbexi_earth_orbit/index.html)

## Code Details

- **init()**: Sets up the Three.js scene (camera, renderer, lights, Earth mesh) and loads TLE data.
- **loadConfigs()**: Loads JSON configuration files and computes scaling.
- **setupTLESatellites()**: Loads TLE data, parses satellite parameters, and creates satellite sprites.
- **calculateOrbitParameters()**: Parses TLE lines to extract orbital parameters.
   - *LEO*: Extracts RAAN and argument of perigee for full ECI transformation.
   - *GEO/MEO*: Uses a simpler calculation.
- **computeECIPosition()**: Converts orbital parameters to 3D Earth-Centered Inertial (ECI) coordinates.
- **updateVisibilityCone()**: Draws a cone representing the satellite’s line-of-sight.
- **updateCoverageArea()**: Draws a spherical footprint on Earth matching the base of the visibility cone.
- **selectSatellite()**: Highlights a selected satellite (increases scale, changes color to red, applies pulsing) and updates satellite info.
- **createGUI()**: Builds the dat.GUI interface with filters, orbit options, separators, and version info.
- **animate()**: Updates satellite positions and visual effects continuously.


# Three.js Earth with Random Satellite Simulation
The next project is a Three.js-based simulation that visualizes Earth with orbiting satellites. The simulation includes three types of satellite orbits: Low Earth Orbit (LEO), Medium Earth Orbit (MEO), and Geostationary Orbit (GEO). Users can interactively adjust the number of satellites in each orbit, as well as modify camera settings like Field of View (FOV) and Zoom.

The project leverages `dat.GUI` for an intuitive interface to control simulation parameters in real-time. The satellites are represented using sprite images (`ob_satellite.png`), which provide a realistic appearance and improved rendering performance.

![Earth with Satellite Simulation](images/openbexi_earth_orbit_ex1.png)
![Earth with Satellite Simulation](images/openbexi_earth_orbit_ex2.png)

## Features

- 3D Earth model rendered using Three.js.
- Visualization of three types of satellite orbits: Low Earth Orbit (LEO), Medium Earth Orbit (MEO), and Geostationary Orbit (GEO).
- Interactive controls using `dat.GUI` to adjust:
    - Number of satellites for each orbit type (LEO, MEO, GEO).
    - Camera settings such as Field of View (FOV) and Zoom.
- Dynamic positioning of satellites to simulate realistic orbit patterns.
- Satellites are displayed as sprites for better performance and realistic visualization.
- Adjustable inclination and rotation effects for LEO and MEO satellites.

License

   This project is licensed under the MIT License - see the LICENSE file for details.


Acknowledgements
   - Satellite texture is represented using a custom icon under the icons directory.
   - Earth texture (1_earth_16k.jpg) is used for realistic Earth visualization.


Contributing
    Contributions are welcome! Please feel free to submit a Pull Request or open an issue to discuss changes.