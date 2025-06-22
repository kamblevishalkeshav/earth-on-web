// js/satelliteMenu.js
// -------------------------------------------------------------------
// Returns HTML markup for the satellite‑control sidebar.
// Clean template‑literal version (easier to read / edit than string +).
// -------------------------------------------------------------------

function createViewToggle(id, label, checked = false) {
    return `
        <label class="toggle-switch" for="${id}">
            <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
            <span class="toggle-label">${label}</span>
            <span class="toggle-slider"></span>
        </label>
    `;
}

export function satelliteMenuLoader() {
    return /* html */ `
  <div id="controlsContainer">
    <div id="versionDisplay"></div>

   <div class="control-group">
  <h3 data-collapsible-target="filtersContent">
    Filters – Satellites Found: <span id="satelliteCountDisplay">36</span>
    <span class="toggle-icon">▾</span>
  </h3>
  <div id="filtersContent" class="collapsible-content">
    <div class="filter-column">
      <label for="orbitTypeFilter">Orbit Type:</label>
      <select id="orbitTypeFilter">
        <option value="ALL">ALL</option>
        <option value="LEO">LEO</option>
        <option value="MEO" selected>MEO</option>
        <option value="GEO">GEO</option>
      </select>
    </div>

    <div class="filter-column">
      <label for="companyFilter">Company:</label>
      <select id="companyFilter">
        <option value="ALL COMPANY">ALL COMPANY</option>
      </select>
    </div>
  </div>
</div>


  <div class="control-group">
  <h3 data-collapsible-target="viewContent">View <span class="toggle-icon">▾</span></h3>
  <div id="viewContent" class="collapsible-content">
    ${createViewToggle('view3DToggle', '3D Globe', true)}
    ${createViewToggle('viewMercatorToggle', '2D Mercator')}
    ${createViewToggle('highDefToggle', 'High Definition')}
    ${createViewToggle('showECEFAxesToggle', 'ECEF Axes')}
    ${createViewToggle('showOrbitFrameToggle', 'Orbit Frame (LVLH)')}
    ${createViewToggle('showYPRToggle', 'Yaw-Pitch-Roll')}
    ${createViewToggle('showDayNightToggle', 'Day/Night Shading', true)}
    ${createViewToggle('showFootprintCheckbox', 'Show Footprint')}
  </div>
</div>

    
    <div class="control-group" id="yprControls" style="display:none;">
      <h3>Body-Frame Bias (deg)</h3>
      <label style="margin-bottom:4px; display:block;">Yaw:
        <input type="range" id="yawSlider"   min="-180" max="180" step="0.1" value="0">
        <span id="yawVal">0</span>
      </label>
      <label style="margin-bottom:4px; display:block;">Pitch:
        <input type="range" id="pitchSlider" min="-180" max="180" step="0.1" value="0">
        <span id="pitchVal">0</span>
      </label>
      <label style="display:block;">Roll:
        <input type="range" id="rollSlider"  min="-180" max="180" step="0.1" value="0">
        <span id="rollVal">0</span>
      </label>
    </div>

    <div class="control-group">
      <h3 data-collapsible-target="orbitExtrasContent">Orbit/Extras <span class="toggle-icon">▾</span></h3>
      <div id="orbitExtrasContent" class="collapsible-content">
        ${createViewToggle('showOrbitToggle', 'Show Orbit')}
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

export function updateSatelliteInfo(infoDiv, sat) {
    if (!infoDiv) return;

    // No satellite selected
    if (!sat) {
        infoDiv.innerHTML =
            '<div style="font-weight:bold;">No satellite selected</div>';
        return;
    }

    // Shortcuts
    const m   = sat.meta ?? {};
    const tle1 = sat.tle_line1 ?? '—';
    const tle2 = sat.tle_line2 ?? '—';

    // Build key‑value rows
    const kv = {
        orbitType       : sat.orbitType          ?? m.orbital_slot?.nominal ?? '—',
        company         : sat.company            ?? m.manufacturer ?? '—',
        satellite_name  : sat.satellite_name     ?? sat.name ?? '—',
        norad_id        : sat.norad_id           ?? m.norad_id ?? '—',
        launch_date     : sat.launch_date          ?? '—',
        tle_line1       : tle1,
        tle_line2       : tle2
    };

    const rows = Object.entries(kv)
        .map(([k,v]) => `<tr><td class="k">${k}</td><td class="v" style="color:#ffd966;">${v}</td></tr>`)
        .join('');

    infoDiv.innerHTML = `
        <table class="meta-table" style="font-size:12px;">
            ${rows}
        </table>`;
}