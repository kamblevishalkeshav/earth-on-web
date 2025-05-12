# Three.js Earth with Satellite Simulation from TLE data

This project uses Three.js and dat.GUI to simulate Earth with orbiting satellites using TLE data from [CelesTrak](https://celestrak.org/NORAD) and https://github.com/shashwatak/satellite-js (License: MIT). It visualizes satellites in LEO, MEO, and GEO with realistic 3D positioning and interactive controls.

## Live Demo

[Live Demo](https://arcazj.github.io/openbexi_earth_orbit/index.html)


# Three.js Earth with Random Satellite Simulation
The next project is a Three.js-based simulation that visualizes Earth with orbiting satellites. The simulation includes three types of satellite orbits: Low Earth Orbit (LEO), Medium Earth Orbit (MEO), and Geostationary Orbit (GEO). Users can interactively adjust the number of satellites in each orbit, as well as modify camera settings like Field of View (FOV) and Zoom.

# Constellation Examples
Below are visualizations of OneWeb and Starlink satellite constellations:  

![Earth with Satellite Simulation](images/openbexi_earth_orbit_ONEWEB.PNG)
![Earth with Satellite Simulation](images/openbexi_earth_orbit_STARLINK.PNG)

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
   - Earth texture (textures/earthmap1k.jpg) is used for realistic Earth visualization.


Contributing
    Contributions are welcome! Please feel free to submit a Pull Request or open an issue to discuss changes.