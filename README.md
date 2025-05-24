# Three.js Earth with Satellite Simulation from TLE data

This project uses Three.js and dat.GUI to simulate Earth with orbiting satellites using TLE data from [CelesTrak](https://celestrak.org/NORAD) and https://github.com/shashwatak/satellite-js (License: MIT). It visualizes satellites in LEO, MEO, and GEO with realistic 3D positioning and interactive controls.

## Live Demo

[Live Demo](https://arcazj.github.io/openbexi_earth_orbit/index.html)


# Three.js Earth with Random Satellite Simulation
The  project is a Three.js-based simulation that visualizes Earth with orbiting satellites. The simulation includes three types of satellite orbits: Low Earth Orbit (LEO), Medium Earth Orbit (MEO), and Geostationary Orbit (GEO). Users can interactively adjust the number of satellites in each orbit, as well as modify camera settings like Field of View (FOV) and Zoom.

# Constellation Examples
Below are visualizations of OneWeb and Starlink satellite constellations:  

![Earth with Satellite Simulation](images/openbexi_earth_orbit_ONEWEB.PNG)
![Earth with Satellite Simulation](images/openbexi_earth_orbit_STARLINK.PNG)

# Features

- 3D Earth model rendered using Three.js.
- Visualization of three types of satellite orbits: Low Earth Orbit (LEO), Medium Earth Orbit (MEO), and Geostationary Orbit (GEO).
- Interactive controls using `dat.GUI` to adjust:
    - Number of satellites for each orbit type (LEO, MEO, GEO).
    - Camera settings such as Field of View (FOV) and Zoom.
- Dynamic positioning of satellites to simulate realistic orbit patterns.
- Satellites are displayed as sprites for better performance and realistic visualization.
- Adjustable inclination and rotation effects for LEO and MEO satellites.

# Roadmap
The Mercator view is still a work in progress. I haven’t yet found the right approach or the right prompt—to get helpful guidance from ChatGPT to complete it. I'm currently using the O3 version with deep thinking enabled.

Okay, I can help you craft a comprehensive README.md file for your openbexi_earth_orbit GitHub repository. A good README is crucial for helping others understand, use, and potentially contribute to your project.

Based on the features and structure we've developed, here's a draft for your README.md. You can copy and paste this into a file named README.md at the root of your GitHub repository.

Markdown

# OpenBEXI Earth Orbit Visualizer

**Version 1.0**

A web-based application to visualize satellite orbits in real-time in both 3D and 2D, using Two-Line Element (TLE) data. This project is built with plain HTML, CSS, and JavaScript, leveraging Three.js for 3D rendering and satellite.js for orbital mechanics calculations.

---

**[Link to Live Demo (if you set one up via GitHub Pages or another hosting service)]**

**(Consider adding a screenshot or GIF of the application in action here!)**
`[Screenshot of the application: e.g., 3D Earth view with satellites and orbits]`

---

## Features

* **3D Globe View:**
    * Interactive 3D Earth with texture.
    * Satellites rendered as sprites, positioned dynamically based on real-time TLE data.
    * Option to display the orbital path for any selected satellite.
    * Camera controls (orbit, zoom, pan) via Three.js OrbitControls.
    * Toggleable High-Definition Earth texture.
* **2D Mercator Map View:**
    * 2D Mercator projection of Earth.
    * Real-time plotting of satellite ground tracks.
    * Day/Night terminator overlay.
    * Labels for satellites with leader lines and basic overlap avoidance.
* **Interactive Controls Panel:**
    * **Menu Visibility:** Toggle button (☰/✕) to show/hide the entire controls panel with a sliding animation.
    * **Version Display:** Shows current version and links to this GitHub repository.
    * **Collapsible Sections:** "Filters," "View," and "Orbit/Extras" for organized control access.
    * **Filters:**
        * Filter satellites by orbit type (ALL, LEO, MEO, GEO).
        * Filter satellites by operating company (dynamically populated).
        * Live count of satellites matching current filter criteria.
    * **View Options:**
        * Toggle 3D Globe view.
        * Toggle 2D Mercator map view.
        * **View Modes:**
            * 3D Globe only (fullscreen).
            * 2D Mercator only (fullscreen).
            * Hybrid view (3D Globe with corner 2D Mercator map).
        * Toggle "High Definition" Earth texture for the 3D view.
    * **Orbit Display:** Toggle visibility of the selected satellite's orbit.
    * **Satellite Selection:**
        * Dropdown list of currently visible satellites.
        * Detailed information panel for the selected satellite (Company, Name, Orbit Type, Launch Date, NORAD ID, TLE lines).
* **Data Handling:**
    * Loads TLE data and configuration settings from JSON files.
    * Defaults to fetching assets (configs, TLEs, textures, icons, CSS) directly from this GitHub repository (`master` branch).
    * Includes a fallback mechanism to attempt loading assets from local paths if GitHub fetching fails.
    * Further fallback to hardcoded defaults if both remote and local loading fail.

## Tech Stack

* **HTML5**
* **CSS3**
* **JavaScript (ES Modules)**
* **Three.js (r176):** For 3D rendering and WebGL.
* **satellite.js (v4.0.0):** For TLE parsing and satellite position propagation.
* **No external UI frameworks:** All UI elements are plain HTML styled with CSS.

## File Structure

The project relies on the following directory structure for its assets, whether fetched remotely from this repository or used locally:

openbexi_earth_orbit/
├── index.html              # Main application file
├── css/
│   └── style.css           # External stylesheet
├── config/                 # JSON configuration files
│   ├── earth.json
│   ├── constants.json
│   ├── satellite.json
│   ├── scene.json
│   └── controls.json
├── json/
│   └── tle/                # TLE data files
│       ├── TLE.json
│       └── TLE_backup.json
├── textures/               # Image textures
│   ├── 1_earth_16k.jpg     (HD Earth)
│   ├── earthmap1k.jpg      (Mercator background)
│   └── earthmap1k_light.jpg (Standard Earth)
└── icons/                  # Icons
└── ob_satellite.png    (Satellite icon for 3D and 2D map)


## Setup and Usage

The application is designed to be run directly from a web server.

1.  **Clone the Repository (Optional, if you want to run locally or modify):**
    ```bash
    git clone [https://github.com/arcazj/openbexi_earth_orbit.git](https://github.com/arcazj/openbexi_earth_orbit.git)
    cd openbexi_earth_orbit
    ```

2.  **Running the Application:**
    * **Default Behavior (Fetching from GitHub):** Simply open the `index.html` file through a local web server. The application will attempt to load its configuration, TLE data, textures, icons, and CSS from this GitHub repository (`master` branch) via `raw.githubusercontent.com`. An internet connection is required.
    * **Using a Local Web Server (Recommended for local development):**
        Due to browser security restrictions with ES Modules and `Workspace` API (for local file access fallback), you should serve `index.html` using a local web server. Examples:
        * If you have Python 3: `python -m http.server`
        * If you have Node.js and npm: `npx serve` or `npx live-server`
        Then open `http://localhost:8000` (or the port specified by your server) in your browser.
    * **Local Asset Fallback:** If the application cannot fetch assets from GitHub, it will attempt to load them from local relative paths (e.g., `config/earth.json`, `textures/earthmap1k.jpg`). For this to work, you must have the complete file structure (as shown above) available relative to where `index.html` is served.

3.  **Interacting with the Simulation:**
    * Use the controls panel on the left to filter satellites, change views, and display information.
    * Use your mouse to interact with the 3D globe (orbit, zoom, pan).

## Configuration

The simulation can be customized by modifying the JSON files in the `config/` directory and the TLE data in `json/tle/`:

* **`config/earth.json`:** Earth's diameter, paths to Earth textures (standard and HD).
* **`config/satellite.json`:** Default satellite icon path, scale for 3D sprites, Mercator map icon path.
* **`config/scene.json`:** Initial camera position, field of view, lighting properties.
* **`config/controls.json`:** Settings for the Three.js `OrbitControls`.
* **`config/constants.json`:** For any other general constants you might want to define.
* **`json/tle/TLE.json`:** The primary source for satellite Two-Line Element sets. You can replace this with updated TLEs from sources like Celestrak.
* **`json/tle/TLE_backup.json`:** A fallback TLE file if the primary one fails to load.

Paths for textures and icons within the config files should be relative to the repository root (e.g., `textures/my_texture.jpg`, `icons/my_icon.png`). The application will construct the full URL for fetching from GitHub or use these paths directly for local fallback.

## How to Contribute

Contributions, issues, and feature requests are welcome! Please feel free to:
* Open an issue to discuss a bug or a new feature.
* Fork the repository and submit a pull request.

## License

*(Consider adding a license here, e.g., MIT License. If you choose one, create a `LICENSE` file in your repository root.)*

This project is currently unlicensed. You are free to use, modify, and distribute it, but please consider providing attribution.

## Acknowledgements

* **Three.js:** For the powerful 3D graphics library.
* **satellite.js:** For the robust TLE propagation and orbital mechanics calculations.
* **(If applicable) Data Sources:** e.g., Celestrak for TLE data.
* **(If applicable) Texture Sources:** e.g., NASA Visible Earth for Earth textures.
