// js/satelliteMenu.js
// -------------------------------------------------------------------
// Returns HTML markup for the satellite‑control sidebar.
// Clean template‑literal version (easier to read / edit than string +).
// -------------------------------------------------------------------

export function satelliteLoadMenu() {
    return /* html */ `
  <div id="controlsContainer">
    <div id="versionDisplay"></div>

    <div class="control-group">
      <h3 data-collapsible-target="filtersContent">Filters <span class="toggle-icon">▾</span></h3>
      <div id="filtersContent" class="collapsible-content">
        <label for="orbitTypeFilter">Orbit Type:</label>
        <select id="orbitTypeFilter">
          <option value="ALL">ALL</option>
          <option value="LEO">LEO</option>
          <option value="MEO">MEO</option>
          <option value="GEO">GEO</option>
        </select>

        <label for="companyFilter">Company:</label>
        <select id="companyFilter">
          <option value="ALL COMPANY">ALL COMPANY</option>
        </select>

        <p>Satellites Found: <span id="satelliteCountDisplay">0</span></p>
      </div>
    </div>

    <div class="control-group">
      <h3 data-collapsible-target="viewContent">View <span class="toggle-icon">▾</span></h3>
      <div id="viewContent" class="collapsible-content">
        <input type="checkbox" id="view3DToggle" checked>
        <label for="view3DToggle" class="checkbox-label">3D Globe</label><br>

        <input type="checkbox" id="viewMercatorToggle">
        <label for="viewMercatorToggle" class="checkbox-label">2D Mercator</label><br>

        <input type="checkbox" id="highDefToggle">
        <label for="highDefToggle" class="checkbox-label">High Definition</label><br>

        <input type="checkbox" id="showECEFAxesToggle">
        <label for="showECEFAxesToggle" class="checkbox-label">Show ECEF Axes</label>
      </div>
    </div>

    <div class="control-group">
      <h3 data-collapsible-target="orbitExtrasContent">Orbit/Extras <span class="toggle-icon">▾</span></h3>
      <div id="orbitExtrasContent" class="collapsible-content">
        <input type="checkbox" id="showOrbitToggle">
        <label for="showOrbitToggle" class="checkbox-label">Show Orbit</label>
      </div>
    </div>

    <div class="control-group">
      <h3>Satellite Selection</h3>
      <div>
        <label for="satelliteSelect">Select Satellite:</label>
        <select id="satelliteSelect">
          <option value="None">None</option>
        </select>

        <div id="satelliteInfo">
          <div style="font-weight:bold;">No satellite selected</div>
        </div>
      </div>
    </div>
  </div>`;
}

export function updateSatelliteInfo(satelliteInfoDiv, satData) { // satData is the TLE object
    if (!satelliteInfoDiv) return;
    if (!satData) {
        satelliteInfoDiv.innerHTML = `<div style="font-weight:bold;">No satellite selected</div>`;
        return;
    }
    satelliteInfoDiv.innerHTML = `
            <div style="font-weight:bold; margin-bottom:3px; color: #00aaff;">Selected: ${satData.satellite_name}</div>
            <div>Company: ${satData.company}</div><div>Type: ${satData.orbitType}</div>
            <div>Launch: ${satData.launch_date || "N/A"}</div><div>NORAD: ${satData.norad_id}</div>
            <div style="color:#aaa; margin-top:5px; font-size:10px;">TLE1: ${satData.tle_line1}</div>
            <div style="color:#aaa; font-size:10px;">TLE2: ${satData.tle_line2}</div>`;
}
