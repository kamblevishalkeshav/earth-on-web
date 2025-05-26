
SATELLITE_MODELS_BASE_URL = "satellites/";
TEXTURES_BASE_URL_MODULE = "textures/";

// --- Satellite Model Loader Module (Integrated) ---
const satelliteModelLoader = {
    currentSatModel: null,
    currentLabels: [],

    generateFoilTexture: (repeat = 4) => {
        const size = 512, canvas = document.createElement('canvas');
        canvas.width = canvas.height = size;
        const ctx = canvas.getContext('2d');
        const img = ctx.createImageData(size, size);
        for (let i = 0; i < img.data.length; i += 4) {
            const v = Math.random() * 150 + 80;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
            img.data[i + 3] = 255;
        }
        ctx.putImageData(img, 0, 0);
        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeat, repeat);
        if (renderer) tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); // Use main renderer
        return tex;
    },

    loadSolarTexture: (repeat = 3) => {
        const solarPanelTexturePath = getFullGitHubUrl('textures/solar_panel_cells.png');
        if (!solarPanelTexturePath) {
            console.warn("Solar panel texture path is null, using placeholder.");
            // Create a simple placeholder texture if path is null
            const canvas = document.createElement('canvas');
            canvas.width = canvas.height = 64;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#2222AA'; // Dark blue
            ctx.fillRect(0,0,64,64);
            ctx.strokeStyle = '#5555FF';
            for(let i=0; i<64; i+=8) { ctx.strokeRect(i,0,8,64); ctx.strokeRect(0,i,64,8); }
            const tex = new THREE.CanvasTexture(canvas);
            return tex;
        }
        const tex = new THREE.TextureLoader().load(solarPanelTexturePath, undefined, undefined, (err) => {
            console.error("Error loading solar panel texture:", solarPanelTexturePath, err);
        });
        tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeat, repeat);
        if (renderer) tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        return tex;
    },

    orient: (o, dir, axisY = true) => {
        const R = Math.PI / 2;
        switch (dir) {
            case 'west': axisY ? o.rotateZ(R) : o.rotateY(R); break;
            case 'east': axisY ? o.rotateZ(-R) : o.rotateY(-R); break;
            case 'north': axisY ? o.rotateX(R) : null; break;
            case 'south': axisY ? o.rotateX(-R) : o.rotateY(Math.PI); break;
            case 'down': axisY && o.rotateX(Math.PI); break;
        }
    },

    buildBus: (bus, tex) => new THREE.Mesh(
        new THREE.BoxGeometry(
            bus.width_m * METERS_TO_SCENE_UNITS,
            bus.height_m * METERS_TO_SCENE_UNITS,
            bus.depth_m * METERS_TO_SCENE_UNITS
        ),
        new THREE.MeshPhongMaterial({map: tex.foil, color: 0xffffff, shininess: 80})
    ),

    buildPanels: (list, tex) => {
        const g = new THREE.Group(), mat = new THREE.MeshBasicMaterial({map: tex.panel, side: THREE.DoubleSide});
        list.forEach(p => {
            const m = new THREE.Mesh(
                new THREE.PlaneGeometry(
                    p.length_m * METERS_TO_SCENE_UNITS,
                    p.width_m * METERS_TO_SCENE_UNITS
                ), mat);
            m.position.set(...p.position_m.map(coord => coord * METERS_TO_SCENE_UNITS));
            satelliteModelLoader.orient(m, p.orientation, false);
            g.add(m);
        });
        return g;
    },

    buildAntennas: (list, labelsRef) => {
        const g = new THREE.Group(),
            dishMat = new THREE.MeshPhongMaterial({color: 0xd8a65d, side: THREE.DoubleSide, shininess: 35}),
            ttMat = new THREE.MeshPhongMaterial({color: 0xcccccc});
        list.forEach(a => {
            let m;
            const scaledRadius = a.radius_m * METERS_TO_SCENE_UNITS;
            if (a.type === 'dish') {
                const scaledDepth = a.depth_m * METERS_TO_SCENE_UNITS;
                const prof = [
                    new THREE.Vector2(scaledRadius, 0),
                    new THREE.Vector2(0.8 * scaledRadius, 0.5 * scaledDepth),
                    new THREE.Vector2(0.3 * scaledRadius, 0.8 * scaledDepth),
                    new THREE.Vector2(0, scaledDepth)
                ];
                m = new THREE.Mesh(new THREE.LatheGeometry(prof, 32), dishMat);
            } else {
                m = new THREE.Mesh(new THREE.SphereGeometry(scaledRadius, 16, 8), ttMat);
            }
            m.position.set(...a.position_m.map(coord => coord * METERS_TO_SCENE_UNITS));
            if (a.orientation) satelliteModelLoader.orient(m, a.orientation, true);
            if (a.tilt_deg) m.rotateZ(THREE.MathUtils.degToRad(a.tilt_deg) * (a.orientation === 'west' ? 1 : -1));

            const div = document.createElement('div');
            div.className = 'label';
            div.textContent = a.band === 'TT&C' ? 'TT&C' : `${a.band}-band`;
            const lbl = new CSS2DObject(div);
            lbl.position.set(0, scaledRadius * 1.2, 0);
            m.add(lbl);
            labelsRef.push(lbl);
            g.add(m);
        });
        return g;
    },

    buildThrusters: (list) => {
        const g = new THREE.Group(), mat = new THREE.MeshPhongMaterial({color: 0x444444});
        list.forEach(t => {
            let m;
            const scaledHeight = t.height_m * METERS_TO_SCENE_UNITS;
            if (t.type === 'cylinder') {
                const scaledRadius = t.radius_m * METERS_TO_SCENE_UNITS;
                m = new THREE.Mesh(new THREE.CylinderGeometry(scaledRadius, scaledRadius, scaledHeight, 16), mat);
            } else {
                const scaledBottomRadius = t.radius_bottom_m * METERS_TO_SCENE_UNITS;
                m = new THREE.Mesh(new THREE.ConeGeometry(scaledBottomRadius, scaledHeight, 16), mat);
                m.rotateX(Math.PI);
            }
            m.position.set(...t.position_m.map(coord => coord * METERS_TO_SCENE_UNITS));
            if (t.orientation) satelliteModelLoader.orient(m, t.orientation, true);
            g.add(m);
        });
        return g;
    },

    buildSatellite: (geom, textures, labelsRef) => {
        const sat = new THREE.Group();
        if (geom.bus) sat.add(satelliteModelLoader.buildBus(geom.bus, textures));
        if (geom.solar_panels) sat.add(satelliteModelLoader.buildPanels(geom.solar_panels, textures));
        if (geom.antennas) sat.add(satelliteModelLoader.buildAntennas(geom.antennas, labelsRef));
        if (geom.thrusters) sat.add(satelliteModelLoader.buildThrusters(geom.thrusters));
        return sat;
    },

    async showSatellite(noradId, mainScene) {
        if (this.currentSatModel) {
            mainScene.remove(this.currentSatModel);
            this.currentLabels.forEach(label => {
                if (label.parent) label.parent.remove(label);
            });
            this.currentLabels.length = 0;
        }
        this.currentSatModel = null;

        const modelJsonUrl = SATELLITE_MODELS_BASE_URL + `${noradId}.json`;
        console.log("Fetching satellite model geometry from:", modelJsonUrl);
        try {
            const data = await fetchJSON(modelJsonUrl);
            if (!data || !data[noradId] || !data[noradId].geometry) {
                console.warn('No geometry entry for NORAD ID:', noradId, "from", modelJsonUrl);
                return null;
            }
            const geom = data[noradId].geometry;
            const textures = {foil: this.generateFoilTexture(4), panel: this.loadSolarTexture(3)};

            this.currentSatModel = this.buildSatellite(geom, textures, this.currentLabels);
            this.currentSatModel.userData = {noradId: noradId, sourceData: data[noradId]};
            mainScene.add(this.currentSatModel);
            return this.currentSatModel;
        } catch (error) {
            console.error("Error loading or building satellite model for NORAD ID:", noradId, error);
            return null;
        }
    },
    clearCurrentDetailedSat(mainScene) {
        if (this.currentSatModel) {
            mainScene.remove(this.currentSatModel);
            this.currentLabels.forEach(label => {
                if (label.parent) label.parent.remove(label);
            });
            this.currentLabels.length = 0;
            this.currentSatModel = null;
        }
    }
};
