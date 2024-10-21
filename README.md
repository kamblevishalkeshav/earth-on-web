# Three.js Earth with Satellite Simulation

This project is a Three.js-based simulation that visualizes Earth with orbiting satellites. The simulation includes three types of satellite orbits: Low Earth Orbit (LEO), Medium Earth Orbit (MEO), and Geostationary Orbit (GEO). Users can interactively adjust the number of satellites in each orbit, as well as modify camera settings like Field of View (FOV) and Zoom.

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

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Edge, Safari) that supports WebGL.
- A local server to serve the HTML file (e.g., VS Code Live Server extension, Python HTTP server).

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/threejs-earth-satellite-simulation.git
   
2. Navigate to the project directory:
   ```bash
   cd threejs-earth-satellite-simulation

3. Run a local server to view the project (e.g., using Python):
   ```bash
   python3 -m http.server

4. Open your web browser and go to http://localhost:8000 to see the simulation:


5. File Structure
   ```bash
   ├── index.html                # Main HTML file containing the Three.js simulation
   ├── images/
   │   ├── openbexi_earth_orbit_ex1.png # Example screenshot of the simulation
   │   └── openbexi_earth_orbit_ex2.png # Another example screenshot
   ├── textures/
   │   └── 1_earth_16k.jpg       # High-resolution texture for the Earth
   ├── icons/
   │   └── ob_satellite.png      # Custom icon used for the satellite sprites
   ├── README.md                 # Project documentation

6. Usage
   1. Open index.html in a web browser using a local server.
   2. Use the dat.GUI interface to adjust the satellite count and camera settings.
   - LEO Satellites: Adjust the number of Low Earth Orbit satellites.
   - GEO Satellites: Adjust the number of Geostationary Orbit satellites.
   - MEO Satellites: Adjust the number of Medium Earth Orbit satellites.
   - Camera FOV: Change the camera's field of view.
   - Camera Zoom: Adjust the camera zoom level.
   3. Resize the browser window to see the simulation adjust accordingly.


7. Configuration

   The following parameters can be modified in the code to adjust the simulation settings:

   - Camera Position: The initial position of the camera can be changed in the init() function.
   - Satellite Size: Modify the scale of the satellite sprites in the setupSatellites() function.
   - Orbit Radius: Each satellite type's orbit radius can be adjusted in the corresponding setup function.

8. License

   This project is licensed under the MIT License - see the LICENSE file for details.


9. Acknowledgements
   - Satellite texture is represented using a custom icon under the icons directory.
   - Earth texture (1_earth_16k.jpg) is used for realistic Earth visualization.


11. Contributing
    Contributions are welcome! Please feel free to submit a Pull Request or open an issue to discuss changes.