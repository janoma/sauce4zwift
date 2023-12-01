import * as common from './common.mjs';
import * as curves from '/shared/curves.mjs';
import * as locale from '/shared/sauce/locale.mjs';

const H = locale.human;


function createElementSVG(name, attrs={}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
    }
    return el;
}


function createElement(name, attrs={}) {
    const el = document.createElement(name);
    for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value);
    }
    return el;
}


class Transition {

    EPSILON = 1 / 0x800000;

    constructor({duration=1000}={}) {
        this.duration = duration;
        this.disabled = false;
        this._src = undefined;
        this._cur = [];
        this._dst = undefined;
        this._startTime = 0;
        this._endTime = 0;
        this._disabledRefCnt = 0;
        this.disabled = false;
        this.playing = false;
    }

    now() {
        return performance.now();
    }

    incDisabled() {
        this._disabledRefCnt++;
        if (this._disabledRefCnt === 1) {
            this.disabled = true;
            this.playing = false;
            this._dst = Array.from(this._cur);
            this._startTime = this._endTime = 0;
        }
    }

    decDisabled() {
        this._disabledRefCnt--;
        if (this._disabledRefCnt < 0) {
            throw new Error("Transition disabled refcnt < 0");
        }
        if (this._disabledRefCnt === 0) {
            this.disabled = false;
            if (this.playing && this._remainingTime) {
                const now = this.now();
                this._startTime = now;
                this._endTime = now + this._remainingTime;
            }
            this._remainingTime = null;
        }
    }

    setDuration(duration) {
        if (!this.disabled) {
            this._recalcCurrent();
            if (this.playing) {
                // Prevent jitter by forwarding the current transition.
                this._src = Array.from(this._cur);
                this._startTime = this.now();
                this._endTime += duration - this.duration;
            }
        }
        this.duration = duration;
    }

    setValues(values) {
        if (!this.disabled) {
            if (this._dst) {
                const now = this.now();
                if (now < this._endTime) {
                    // Start from current position (and prevent Zeno's paradaox)
                    this._recalcCurrent();
                    this._src = this._cur.map((x, i) =>
                        Math.abs(values[i] - x) < this.EPSILON ? values[i] : x);
                } else {
                    // Start from last position.
                    this._src = this._dst;
                }
                this._startTime = now;
                this._endTime = now + this.duration;
                this.playing = true;
            }
            this._cur.length = values.length;
        } else {
            this._cur = Array.from(values);
        }
        this._dst = Array.from(values);
    }

    getStep() {
        if (this.disabled) {
            // Return the last used position
            return this._cur;
        } else if (this.playing) {
            this._recalcCurrent();
            return this._cur;
        } else if (this._dst) {
            return this._dst;
        }
    }

    getValues() {
        return this._dst ? Array.from(this._dst) : null;
    }

    _recalcCurrent() {
        const now = this.now();
        const progress = (now - this._startTime) / (this._endTime - this._startTime);
        if (progress >= 1 || this.disabled) {
            if (this._dst) {
                this._cur = this._dst;
            }
            this.playing = false;
        } else {
            for (let i = 0; i < this._dst.length; i++) {
                const delta = this._dst[i] - this._src[i];
                this._cur[i] = this._src[i] + (delta * progress);
            }
        }
    }
}


export class MapEntity extends EventTarget {
    constructor(id, type='generic') {
        super();
        this.new = true;
        this.id = id;
        this.type = type;
        this.el = document.createElement('div');
        this.el.classList.add('entity', type);
        this.el.dataset.id = id;
        this.el.dataset.idType = typeof id;
        this.transition = new Transition();
        this.pin = null;
        this._pinContent = null;
        this._pinHTML = null;
        this._position = null;
        this._map = null;
    }

    setMap(map) {
        this._map = map;
        if (this._position) {
            this.transition.incDisabled();
            try {
                this.setPosition(this._position);
            } finally {
                this.transition.decDisabled();
            }
        }
    }

    togglePin(en) {
        if (this.pin) {
            if (en !== true) {
                this.pin.remove();
                this.pin = null;
                this._pinContent = null;
            }
        } else if (en !== false) {
            this.pin = document.createElement('div');
            this.pin.setAttribute('tabindex', 0); // Support click to focus so it can stay higher
            this.pin.classList.add('pin-anchor');
            const pinInner = document.createElement('div');
            pinInner.classList.add('pin-inner');
            this.pin.append(pinInner);
            this._pinContent = document.createElement('div');
            this._pinContent.classList.add('pin-content');
            this._pinContent.addEventListener('click', ev => {
                if (!ev.target.closest('a')) {
                    this.togglePin(false);
                }
            });
            pinInner.append(this._pinContent);
            if (this._pinHTML) {
                this._pinContent.innerHTML = this._pinHTML;
            } else {
                this.pin.classList.add('hidden');
            }
        }
        const ev = new Event('pinned');
        ev.visible = !!this.pin;
        this.dispatchEvent(ev);
        return !!this.pin;
    }

    toggleHidden(en) {
        this.el.classList.toggle('hidden', en);
        if (this.pin) {
            this.pin.classList.toggle('hidden', this.el.classList.contains('hidden'));
        }
    }

    setPinHTML(html) {
        if (this._pinHTML === html) {
            return;
        }
        this._pinHTML = html;
        if (this.pin) {
            this._pinContent.innerHTML = html;
            this.pin.classList.toggle('hidden', !html);
        }
    }

    setPosition([x, y]) {
        if (typeof x !== 'number' || typeof y !== 'number') {
            throw new TypeError('invalid position');
        }
        this._position = [x, y]; // Save non-rotate-hacked position.
        if (this._map?.rotateCoordinates) {
            [x, y] = [y, -x];
        }
        this.transition.setValues([x, y]);
        const ev = new Event('position');
        ev.position = this._position;
        this.dispatchEvent(ev);
    }

    getPosition() {
        return this._position;
    }
}


export class SauceZwiftMap extends EventTarget {
    constructor({el, worldList, zoom=1, zoomMin=0.25, zoomMax=10, autoHeading=true,
                 style='default', opacity=1, tiltShift=null, maxTiltShiftAngle=65,
                 sparkle=false, quality=1, verticalOffset=0, fpsLimit=30,
                 zoomPriorityTilt=true, preferRoute, autoCenter=true}) {
        super();
        el.classList.add('sauce-map-container');
        this.el = el;
        this.worldList = worldList;
        this.preferRoute = preferRoute;
        this.zoomMin = zoomMin;
        this.zoomMax = zoomMax;
        this.maxTiltShiftAngle = maxTiltShiftAngle;
        this.watchingId = null;
        this.athleteId = null;
        this.courseId = null;
        this.portal = null;
        this.roadId = null;
        this.routeId = null;
        this.route = null;
        this.worldMeta = null;
        this.rotateCoordinates = null;
        this._adjHeading = 0;
        this.style = style;
        this.quality = quality;
        this._canvasScale = null;
        this._headingRotations = 0;
        this._heading = 0;
        this.headingOffset = 0;
        this._ents = new Map();
        this._pendingEntityUpdates = new Set();
        this.center = [0, 0];
        this._centerXY = [0, 0];
        this._anchorXY = [0, 0];
        this.dragOffset = [0, 0];
        this._dragXY = [0, 0];
        this._layerScale = null;
        this._pauseRefCnt = 0;
        this._pinned = new Set();
        this._mapScale = null;
        this._lastFrameTime = 0;
        this._perspective = 800;
        this._wheelState = {
            nextAnimFrame: null,
            done: null,
        };
        this._pointerState = {
            nextAnimFrame: null,
            lastDistance: null,
            ev1: null,
            ev2: null,
            lastX: null,
            lastY: null,
        };
        this._transformAnimationLoopBound = this._transformAnimationLoop.bind(this);
        this._onPointerMoveBound = this._onPointerMove.bind(this);
        this._onPointerDoneBound = this._onPointerDone.bind(this);
        this._mapTransition = new Transition({duration: 500});
        this._elements = {
            map: createElement('div', {class: 'sauce-map'}),
            mapCanvas: createElement('canvas', {class: 'map-background'}),
            ents: createElement('div', {class: 'entities'}),
            pins: createElement('div', {class: 'pins'}),
            paths: createElementSVG('svg', {class: 'paths'}),
            roadDefs: createElementSVG('defs'),
            pathLayersGroup: createElementSVG('g', {class: 'path-layers'}),
            roadLayers: {
                gutters: createElementSVG('g', {class: 'gutters'}),
                surfacesLow: createElementSVG('g', {class: 'surfaces low'}),
                surfacesMid: createElementSVG('g', {class: 'surfaces mid'}),
                surfacesHigh: createElementSVG('g', {class: 'surfaces high'}),
            },
            userLayers: {
                surfacesLow: createElementSVG('g', {class: 'surfaces low'}),
                surfacesMid: createElementSVG('g', {class: 'surfaces mid'}),
                surfacesHigh: createElementSVG('g', {class: 'surfaces high'}),
            }
        };
        this._elements.paths.append(this._elements.roadDefs, this._elements.pathLayersGroup);
        this._elements.pathLayersGroup.append(...Object.values(this._elements.roadLayers));
        this._elements.pathLayersGroup.append(...Object.values(this._elements.userLayers));
        this._elements.map.append(this._elements.mapCanvas, this._elements.paths, this._elements.ents);
        this.el.addEventListener('wheel', this._onWheelZoom.bind(this));
        this.el.addEventListener('pointerdown', this._onPointerDown.bind(this));
        this._elements.ents.addEventListener('click', this._onEntsClick.bind(this));
        this.incPause();
        this.setZoom(zoom);
        this.setAutoHeading(autoHeading);
        this.setAutoCenter(autoCenter);
        this.setOpacity(opacity);
        this.setTiltShift(tiltShift);
        this.setZoomPriorityTilt(zoomPriorityTilt);
        this.setSparkle(sparkle);
        this.setVerticalOffset(verticalOffset);
        this.setFPSLimit(fpsLimit);
        this.el.append(this._elements.map, this._elements.pins);
        this._resizeObserver = new ResizeObserver(() => this._updateContainerLayout());
        this._resizeObserver.observe(this.el);
        this._updateContainerLayout();
        this.decPause();
        this._gcLoop();
        requestAnimationFrame(this._transformAnimationLoopBound);
    }

    _updateContainerLayout() {
        this._elRect = this.el.getBoundingClientRect();
        this._fullUpdateAsNeeded();
    }

    setFPSLimit(fps) {
        this.fpsLimit = fps;
        this._msPerFrame = 1000 / fps | 0;
    }

    async setStyle(style='default') {
        if (style === this.style) {
            return;
        }
        this.style = style;
        await this._updateMapBackground();
    }

    setOpacity(v) {
        this._elements.map.style.setProperty('--opacity', isNaN(v) ? 1 : v);
    }

    _fullUpdateAsNeeded() {
        const takeAction = !this.isPaused();
        if (takeAction) {
            if (!this._adjustLayerScale()) {
                this._updateGlobalTransform();
                this._renderFrame();
            }
        }
        return takeAction;
    }

    setTiltShift(v) {
        v = v || null;
        this.tiltShift = v;
        this._fullUpdateAsNeeded();
    }

    setZoomPriorityTilt(en) {
        this._zoomPrioTilt = en;
        this._fullUpdateAsNeeded();
    }

    setSparkle(en) {
        this.el.classList.toggle('sparkle', !!en);
    }

    _qualityToCanvasScale(quality) {
        const cd = this._elements.mapCanvas.dataset;
        const pixels = Number(cd.naturalWidth) * Number(cd.naturalHeight);
        if (!pixels) {
            console.warn("Using naive canvas scale method");
            return quality < 0.5 ? 0.25 : quality < 0.85 ? 0.5 : 1;
        }
        const pixelMegabyte = 1024 * 1024 / 4; // RGBA 8 bits per channel, 4 channels
        const lowBudget = 4 * pixelMegabyte; // ~1024^2
        const highBudget = 192 * pixelMegabyte; // ~7094^2
        const ratio = Math.sqrt(((highBudget - lowBudget) * quality + lowBudget) / pixels);
        const q = 15;
        const quantizedRatio = Math.round(ratio * q) / q;
        return Math.min(1, quantizedRatio);
    }

    async setQuality(q) {
        this.quality = q;
        const cs = this._qualityToCanvasScale(q);
        if (cs !== this._canvasScale) {
            this._canvasScale = cs;
            await this._updateMapBackground();
        }
        this._fullUpdateAsNeeded();
    }

    setVerticalOffset(v) {
        this.verticalOffset = v;
        this._fullUpdateAsNeeded();
    }

    setZoom(zoom, options) {
        this.zoom = Math.max(this.zoomMin, Math.min(this.zoomMax, zoom));
        this._applyZoom(options);
    }

    setBounds(tl, br, pad=0.12) {
        let width = br[0] - tl[0];
        let height = tl[1] - br[1];
        const center = [tl[0] + width / 2, br[1] + height / 2];
        // As strange as this seems, every world is rotated by -90deg when other
        // correction factors are applied, so width and height are swapped for
        // purposes of finding our ideal bounding box sizes.
        [width, height] = [height, width];
        const boundsRatio = width / height;
        const viewRatio = this._elRect.width / this._elRect.height;
        const zoom = viewRatio > boundsRatio ?
            this._elRect.height / (height * (1 + pad) * this._mapScale) :
            this._elRect.width / (width * (1 + pad) * this._mapScale);
        this._setCenter(center);
        this.setZoom(zoom, {disableEvent: true});
    }

    _adjustZoom(adj) {
        this.zoom = Math.max(this.zoomMin, Math.min(this.zoomMax, this.zoom + adj));
    }

    _applyZoom(options={}) {
        this._elements.map.style.setProperty('--zoom', this.zoom);
        if (this._fullUpdateAsNeeded() && !options.disableEvent) {
            const ev = new Event('zoom');
            ev.zoom = this.zoom;
            this.dispatchEvent(ev);
        }
    }

    _onWheelZoom(ev) {
        if (!ev.deltaY) {
            return;
        }
        ev.preventDefault();
        this.trackingPaused = true;
        this._adjustZoom(-ev.deltaY / 2000 * this.zoom);
        cancelAnimationFrame(this._wheelState.nextAnimFrame);
        this._wheelState.nextAnimFrame = requestAnimationFrame(() => {
            if (this._wheelState.done) {
                clearTimeout(this._wheelState.done);
            } else {
                this._mapTransition.incDisabled();
            }
            this._applyZoom();
            // Lazy re-enable of animations to avoid need for forced paint
            this._wheelState.done = setTimeout(() => {
                this.trackingPaused = false;
                this._wheelState.done = null;
                this._mapTransition.decDisabled();
            }, 100);
        });
    }

    _onPointerDown(ev) {
        const state = this._pointerState;
        if (ev.button !== 0 || (state.ev1 && state.ev2)) {
            return;
        }
        if (state.ev1) {
            state.ev2 = ev;
            this.el.classList.remove('moving');
            state.lastDistance = Math.sqrt(
                (ev.pageX - state.ev1.pageX) ** 2 +
                (ev.pageY - state.ev1.pageY) ** 2);
            return;
        } else {
            state.ev1 = ev;
        }
        state.active = false;
        state.lastX  = ev.pageX;
        state.lastY = ev.pageY;
        document.addEventListener('pointermove', this._onPointerMoveBound);
        document.addEventListener('pointerup', this._onPointerDoneBound, {once: true});
        document.addEventListener('pointercancel', this._onPointerDoneBound, {once: true});
    }

    setDragOffset(pos) {
        if (arguments.length === 2 && typeof pos === 'number') {
            pos = Array.from(arguments);
        }
        this.dragOffset = pos;
        this._dragXY = this._rotateWorldPos(pos);
        this._fullUpdateAsNeeded();
    }

    setAutoHeading(en) {
        this.autoHeading = en;
        if (!this.trackingPaused) {
            this.setHeading(en ? this._autoHeadingSaved || 0 : 0);
        }
    }

    setAutoCenter(en) {
        this.autoCenter = en;
        if (en && this._autoCenterSaved) {
            this.setCenter(this._autoCenterSaved);
        }
    }

    _onPointerMove(ev) {
        const state = this._pointerState;
        if (!state.active) {
            state.active = true;
            this.trackingPaused = true;
            this.el.classList.add('moving');
            this._mapTransition.incDisabled();
        }
        if (!state.ev2) {
            this._handlePointerDragEvent(ev, state);
        } else {
            this._handlePointerPinchEvent(ev, state);
        }
    }

    _handlePointerDragEvent(ev, state) {
        cancelAnimationFrame(state.nextAnimFrame);
        state.nextAnimFrame = requestAnimationFrame(() => {
            const dragEv = new Event('drag');
            const dx = ev.pageX - state.lastX;
            const dy =  ev.pageY - state.lastY;
            state.lastX = ev.pageX;
            state.lastY = ev.pageY;
            if (ev.ctrlKey) {
                const heading = this.headingOffset - dx * 0.1;
                this.setHeadingOffset(heading);
                dragEv.heading = heading;
                const tiltShift = this.tiltShift - dy * 0.001;
                this.setTiltShift(tiltShift);
                dragEv.tiltShift = tiltShift;
            } else {
                const [tx, ty] = this._unrotateWorldPos([dx, dy]);
                const l = Math.sqrt(tx * tx + ty * ty);
                const a = Math.atan2(ty, tx) - (this._rotate / 180 * Math.PI);
                const adjX = Math.cos(a) * l;
                const adjY = Math.sin(a) * l;
                const f = 1 / (this.zoom * this._mapScale / this._canvasScale);
                const pos = [this.dragOffset[0] + adjX * f, this.dragOffset[1] + adjY * f];
                this.setDragOffset(pos);
                dragEv.drag = pos;
            }
            this.dispatchEvent(dragEv);
        });
    }

    _handlePointerPinchEvent(ev, state) {
        let otherEvent;
        if (ev.pointerId === state.ev1.pointerId) {
            otherEvent = state.ev2;
            state.ev1 = ev;
        } else if (ev.pointerId === state.ev2.pointerId) {
            otherEvent = state.ev1;
            state.ev2 = ev;
        } else {
            // third finger, ignore
            return;
        }
        const distance = Math.sqrt(
            (ev.pageX - otherEvent.pageX) ** 2 +
            (ev.pageY - otherEvent.pageY) ** 2);
        const deltaDistance = distance - state.lastDistance;
        state.lastDistance = distance;
        this._adjustZoom(deltaDistance / 600);
        requestAnimationFrame(() => this._applyZoom());
    }

    _onPointerDone(ev) {
        const state = this._pointerState;
        if (state.active) {
            this.el.classList.remove('moving');
            this._mapTransition.decDisabled();
            state.active = false;
        }
        document.removeEventListener('pointermove', this._onPointerMoveBound);
        document.removeEventListener('pointerup', this._onPointerDoneBound, {once: true});
        document.removeEventListener('pointercancel', this._onPointerDoneBound, {once: true});
        this._pointerState.ev1 = this._pointerState.ev2 = null;
        this.trackingPaused = false;
    }

    _updateMapBackground = common.asyncSerialize(async function() {
        const m = this.worldMeta;
        const canvas = this._elements.mapCanvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.classList.toggle('hidden', !!this.portal);
        const img = new Image();
        const suffix = {
            default: '',
            neon: '-neon',
        }[this.style];
        try {
            await new Promise((resolve, reject) => {
                img.addEventListener('load', resolve);
                img.addEventListener('error', ev => {
                    console.warn('image load error:', ev);
                    reject(new Error('Image load error'));
                });
                const version = this.worldMeta.mapVersion ? `-v${this.worldMeta.mapVersion}` : '';
                img.src = `https://www.sauce.llc/products/sauce4zwift/maps/world` +
                    `${this.worldMeta.worldId}${version}${suffix || ''}.webp`;
            });
        } catch(e) {
            console.warn("Image decode interrupted/failed", e);
            return;
        }
        canvas.dataset.naturalWidth = img.naturalWidth;
        canvas.dataset.naturalHeight = img.naturalHeight;
        this._canvasScale = this._qualityToCanvasScale(this.quality);
        canvas.width = img.naturalWidth * this._canvasScale;
        canvas.height = img.naturalHeight * this._canvasScale;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        this._mapScale = 1 / (m.tileScale / m.mapScale / this._canvasScale);
        this._adjustLayerScale({force: true});
    });

    incPause() {
        this._pauseRefCnt++;
        if (this._pauseRefCnt === 1) {
            this._mapTransition.incDisabled();
        }
    }

    decPause() {
        this._pauseRefCnt--;
        if (this._pauseRefCnt < 0) {
            throw new Error("decPause < 0");
        } else if (this._pauseRefCnt === 0) {
            try {
                this._fullUpdateAsNeeded();
            } finally {
                this._mapTransition.decDisabled();
            }
        }
    }

    isPaused() {
        return this._pauseRefCnt > 0;
    }

    setCourse = common.asyncSerialize(async function(courseId, {portalRoad}={}) {
        const isPortal = portalRoad != null;
        if (isPortal) {
            if (courseId === this.courseId && this.portal && portalRoad === this.roadId) {
                return;
            }
        } else if (courseId === this.courseId && !this.portal) {
            return;
        }
        this.incPause();
        try {
            this.courseId = courseId;
            this.portal = isPortal;
            this.worldMeta = this.worldList.find(x => x.courseId === courseId);
            if (isPortal) {
                this.rotateCoordinates = false;
                await this._applyPortal(portalRoad);
            } else {
                this.rotateCoordinates = !!this.worldMeta.rotateRouteSelect;
                await this._applyCourse();
            }
        } finally {
            this.decPause();
        }
    });

    async _applyCourse() {
        const m = this.worldMeta;
        this._anchorXY[0] = -(m.minX + m.anchorX);
        this._anchorXY[1] = -(m.minY + m.anchorY);
        this._resetElements([
            m.minX + m.anchorX,
            m.minY + m.anchorY,
            m.maxX - m.minX,
            m.maxY - m.minY
        ]);
        const [roads] = await Promise.all([
            common.getRoads(this.courseId),
            this._updateMapBackground(),
        ]);
        this._renderRoads(roads);
    }

    async _applyPortal(roadId) {
        const m = this.worldMeta;
        const road = await common.getRoad('portal', roadId);
        this._anchorXY[0] = -(m.minX + m.anchorX);
        this._anchorXY[1] = -(m.minY + m.anchorY);
        this._resetElements([
            m.minX + m.anchorX + road.path[0][0],
            m.minY + m.anchorY + road.path[0][1],
            m.maxX - m.minX,
            m.maxY - m.minY
        ]);
        await this._updateMapBackground();
        this._renderRoads([road]);
        this.setActiveRoad(roadId);
    }

    _resetElements(viewBox) {
        Object.values(this._elements.roadLayers).forEach(x => x.replaceChildren());
        for (const ent of Array.from(this._ents.values()).filter(x => x.gc)) {
            this.removeEntity(ent);
        }
        this._elements.roadDefs.replaceChildren();
        this._elements.pins.replaceChildren();
        this._elements.paths.setAttribute('viewBox', viewBox.join(' '));
        this._elements.pathLayersGroup.classList.toggle('rotated-coordinates', !!this.rotateCoordinates);
        this._setHeading(0);
        this._pendingEntityUpdates.clear();
    }

    setWatching(id) {
        if (this.watchingId != null && this._ents.has(this.watchingId)) {
            const ent = this._ents.get(this.watchingId);
            ent.el.classList.remove('watching');
        }
        this.watchingId = id;
        if (id != null && this._ents.has(id)) {
            const ent = this._ents.get(id);
            ent.el.classList.add('watching');
        }
        this.setDragOffset([0, 0]);
    }

    setAthlete(id) {
        if (this.athleteId != null && this._ents.has(this.athleteId)) {
            const ent = this._ents.get(this.athleteId);
            ent.el.classList.remove('self');
        }
        this.athleteId = id;
        if (id != null && this._ents.has(id)) {
            const ent = this._ents.get(id);
            ent.el.classList.add('self');
        }
    }

    _rotateWorldPos(pos) {
        // Use sparingly;  If working with large groups of entities rotate the group instead.
        return this.rotateCoordinates ? [pos[1], -pos[0], pos[2]] : pos;
    }

    _unrotateWorldPos(pos) {
        // Use sparingly;  If working with large groups of entities rotate the group instead.
        return this.rotateCoordinates ? [-pos[1], pos[0], pos[2]] : pos;
    }

    _createCurvePath(points, loop, type='CatmullRom') {
        const curveFunc = {
            CatmullRom: curves.catmullRomPath,
            Bezier: curves.cubicBezierPath,
        }[type];
        return curveFunc(points, {loop});
    }

    _renderRoads(roads) {
        const {surfacesLow, gutters} = this._elements.roadLayers;
        // Because roads overlap and we want to style some of them differently this
        // make multi-sport roads higher so we don't randomly style overlapping sections.
        roads = Array.from(roads);
        roads.sort((a, b) => a.sports.length - b.sports.length);
        for (const road of roads) {
            if ((!road.sports.includes('cycling') && !road.sports.includes('running')) || !road.isAvailable) {
                continue;
            }
            this._elements.roadDefs.append(createElementSVG('path', {
                id: `road-path-${road.id}`,
                d: road.curvePath.toSVGPath()
            }));
            for (const g of [gutters, surfacesLow]) {
                g.append(createElementSVG('use', {
                    "class": 'road ' + road.sports.map(x => `sport-${x}`).join(' '),
                    "data-id": road.id,
                    "href": `#road-path-${road.id}`,
                }));
            }
        }
        if (this.roadId != null) {
            this.setActiveRoad(this.roadId);
        }
    }

    latlngToPosition([lat, lon]) {
        return this.worldMeta.flippedHack ? [
            (lat - this.worldMeta.latOffset) * this.worldMeta.latDegDist * 100,
            (lon - this.worldMeta.lonOffset) * this.worldMeta.lonDegDist * 100
        ] : [
            (lon - this.worldMeta.lonOffset) * this.worldMeta.lonDegDist * 100,
            -(lat - this.worldMeta.latOffset) * this.worldMeta.latDegDist * 100
        ];
    }

    setRoad(id) {
        console.warn("DEPRECATED: use setActiveRoad");
        return this.setActiveRoad(id);
    }

    setActiveRoad(id) {
        this.roadId = id;
        this.routeId = null;
        this.route = null;
        if (this._routeHighlight) {
            this._routeHighlight.elements.forEach(x => x.remove());
            this._routeHighlight = null;
        }
        const surface = this._elements.roadLayers.surfacesMid;
        let r = surface.querySelector('.road.active');
        if (!r) {
            r = createElementSVG('use', {class: 'road active'});
            surface.append(r);
        }
        r.setAttribute('href', `#road-path-${id}`);
    }

    setActiveRoute = common.asyncSerialize(async function(id, laps=1) {
        this.roadId = null;
        this.routeId = id;
        const activeRoad = this._elements.roadLayers.surfacesMid.querySelector('.road.active');
        if (activeRoad) {
            activeRoad.remove();
        }
        const route = await common.getRoute(id);
        if (this._routeHighlight) {
            this._routeHighlight.elements.forEach(x => x.remove());
            this._routeHighlight = null;
        }
        if (route) {
            this._routeHighlight = this.addHighlightPath(route.curvePath, 'route-' + id, {layer: 'mid'});
        } else {
            console.warn("Route not found:", id);
        }
        this.route = route;
        return route;
    });

    _addShape(shape, attrs, options={}) {
        const layer = this._elements.userLayers[{
            high: 'surfacesHigh',
            mid: 'surfacesMid',
            low: 'surfacesLow',
        }[options.layer || 'high']];
        const el = createElementSVG(shape, attrs);
        layer.append(el);
        return el;
    }

    drawLine(p0, p1, {color="#000a", size=2, layer='high', ...attrs}={}) {
        return this._addShape('line', {
            x1: p0[0],
            y1: p0[1],
            x2: p1[0],
            y2: p1[1],
            "stroke-width": `${size}em`,
            stroke: color,
            ...attrs,
        });
    }

    drawCircle(c, {color="#000a", size=10, borderColor="gold", borderSize=0.5, layer='high', ...attrs}={}) {
        return this._addShape('circle', {
            cx: c[0],
            cy: c[1],
            r: `${size}em`,
            fill: color,
            "stroke-width": `${borderSize}em`,
            stroke: borderColor,
            ...attrs,
        });
    }

    addHighlightPath(path, id, {debug, includeEdges=true, extraClass='', width, color, layer='mid'}={}) {
        const elements = [];
        if (debug) {
            const nodes = path.nodes;
            for (let i = 0; i < nodes.length; i++) {
                elements.push(this.drawCircle(nodes[i].end, {
                    color: '#40ba',
                    borderColor: 'black',
                    size: 4,
                    title: i
                }));
                if (nodes[i].cp1) {
                    if (i) {
                        const title = `cp1-${i}`;
                        elements.push(this.drawLine(nodes[i].cp1, nodes[i - 1].end, {layer, title}));
                        elements.push(this.drawCircle(nodes[i].cp1, {color: '#000b', size: 3, title}));
                    }
                    const title = `cp2-${i}`;
                    elements.push(this.drawLine(nodes[i].cp2, nodes[i].end, {layer, title}));
                    elements.push(this.drawCircle(nodes[i].cp2, {color: '#fffb', size: 3, title}));
                }
            }
            if (nodes.length) {
                elements.push(this.drawCircle(nodes[0].end, {color: '#0f09', size: 8, title: 'start'}));
                elements.push(this.drawCircle(nodes.at(-1).end, {color: '#f009', size: 8, title: 'end'}));
            }
        }
        const node = createElementSVG('path', {
            class: `highlight ${extraClass}`,
            "data-id": id,
            d: path.toSVGPath({includeEdges}),
        });
        if (width) {
            node.style.setProperty('--width', width);
        }
        if (color) {
            node.style.setProperty('stroke', color);
        }
        const surfaceEl = this._elements.userLayers[{
            high: 'surfacesHigh',
            mid: 'surfacesMid',
            low: 'surfacesLow',
        }[layer]];
        surfaceEl.append(node);
        elements.push(node);
        return {id, path, elements};
    }

    addHighlightLine(points, id, options={}) {
        return this.addHighlightPath(this._createCurvePath(points, options.loop), id, options);
    }

    addPoint(point, extraClass) {
        const ent = new MapEntity(`${point[0]}-${point[1]}-${Date.now()}`, 'point');
        ent.transition.setDuration(0);
        ent.setPosition(point);
        if (extraClass) {
            ent.el.classList.add(extraClass);
        }
        this.addEntity(ent);
        return ent;
    }

    addEntity(ent) {
        if (!(ent instanceof MapEntity)) {
            throw new TypeError("MapEntity argument required");
        }
        if (this._ents.has(ent.id)) {
            throw new Error("id already in use");
        }
        ent.setMap(this);
        this._ents.set(ent.id, ent);
        this._pendingEntityUpdates.add(ent);
        ent.addEventListener('position', () => this._pendingEntityUpdates.add(ent));
    }

    removeEntity(ent) {
        this._ents.delete(ent.id);
        this._pinned.delete(ent);
        this._pendingEntityUpdates.delete(ent);
        ent.togglePin(false);
        ent.el.remove();
    }

    _addAthleteEntity(state) {
        const ent = new MapEntity(state.athleteId, 'athlete');
        ent.lastSeen = 0;
        ent.gc = true;
        ent.delayEst = common.expWeightedAvg(6, 2000);
        ent.el.classList.toggle('self', state.athleteId === this.athleteId);
        ent.el.classList.toggle('watching', state.athleteId === this.watchingId);
        ent.setPinHTML('<ms>hourglass_empty</ms>...');
        ent.setMap(this);
        ent.addEventListener('pinned', ev => {
            if (ev.visible) {
                this._pinned.add(ent);
                this._elements.pins.append(ent.pin);
                this._pendingEntityUpdates.add(ent);
            } else {
                this._pinned.delete(ent);
            }
        });
        this._ents.set(ent.id, ent);
    }

    _onEntsClick(ev) {
        const entEl = ev.target.closest('.entity');
        if (!entEl) {
            return;
        }
        const id = entEl.dataset.idType === 'number' ? Number(entEl.dataset.id) : entEl.dataset.id;
        const ent = this._ents.get(id);
        if (!ent) {
            return;
        }
        ent.togglePin();
    }

    renderAthleteStates = common.asyncSerialize(async states => {
        if (this.watchingId == null || !common.isVisible()) {
            return;
        }
        const watching = states.find(x => x.athleteId === this.watchingId);
        if (!watching && this.courseId == null) {
            return;
        } else if (watching) {
            if (watching.portal) {
                if (!this.portal || watching.roadId !== this.roadId || watching.courseId !== this.courseId) {
                    await this.setCourse(watching.courseId, {portalRoad: watching.roadId});
                }
            } else if (this.portal || watching.courseId !== this.courseId) {
                await this.setCourse(watching.courseId);
            }
            if (this.preferRoute) {
                if (watching.routeId) {
                    if (this.routeId !== watching.routeId) {
                        let sg;
                        if (watching.eventSubgroupId) {
                            sg = await common.rpc.getEventSubgroup(watching.eventSubgroupId);
                        }
                        // Note sg.routeId is sometimes out of sync with state.routeId; avoid thrash
                        if (sg && sg.routeId === watching.routeId) {
                            await this.setActiveRoute(sg.routeId, sg.laps);
                        } else {
                            await this.setActiveRoute(watching.routeId);
                        }
                    }
                } else {
                    this.route = null;
                    this.routeId = null;
                }
            }
            if (!this.routeId && watching.roadId !== this.roadId) {
                this.setActiveRoad(watching.roadId);
            }
        }
        const now = Date.now();
        for (const state of states) {
            if (!this._ents.has(state.athleteId)) {
                this._addAthleteEntity(state);
            }
            let powerLevel;
            if (state.power < 200) {
                powerLevel = 'z1';
            } else if (state.power < 250) {
                powerLevel = 'z2';
            } else if (state.power < 300) {
                powerLevel = 'z3';
            } else if (state.power < 450) {
                powerLevel = 'z4';
            } else if (state.power < 600) {
                powerLevel = 'z5';
            } else {
                powerLevel = 'z6';
            }
            const ent = this._ents.get(state.athleteId);
            const age = now - ent.lastSeen;
            if (age) {
                if (age < 2500) {
                    // Try to animate close to the update rate without going under.
                    // If we miss (transition is not playing) prefer lag over jank.
                    // Note the lag is calibrated to reducing jumping at 200ms rates (i.e. watching).
                    const influence = ent.transition.playing ? age + 100 : age * 8;
                    const duration = ent.delayEst(influence);
                    ent.transition.setDuration(duration);
                } else {
                    ent.transition.setDuration(0);
                }
            }
            ent.setPosition([state.x, state.y]);
            ent.el.dataset.powerLevel = powerLevel;
            ent.lastSeen = now;
            if (ent.pin) {
                const ad = common.getAthleteDataCacheEntry(state.athleteId);
                const athlete = ad?.athlete;
                const name = athlete ? `${athlete.fLast}` : `ID: ${state.athleteId}`;
                const avatar = athlete?.avatar ?
                    `<avatar-pad></avatar-pad><img class="avatar" src="${athlete.avatar}"/>` : '';
                ent.setPinHTML(`
                    <a href="/pages/profile.html?id=${state.athleteId}&windowType=profile"
                       target="profile_popup_${state.athleteId}">${common.sanitize(name)}${avatar}</a><br/>
                    Power: ${H.power(state.power, {suffix: true, html: true})}<br/>
                    Speed: ${H.pace(state.speed, {suffix: true, html: true, sport: state.sport})}
                `);
            }
            if (state.athleteId === this.watchingId && !this.trackingPaused) {
                this._autoHeadingSaved = state.heading;
                if (this.autoHeading) {
                    this._setHeading(this._autoHeadingSaved);
                }
                this._autoCenterSaved = [state.x, state.y];
                if (this.autoCenter) {
                    this._setCenter(this._autoCenterSaved);
                }
                if (this.autoCenter || this.autoHeading) {
                    this._updateGlobalTransform();
                }
            }
            this._pendingEntityUpdates.add(ent);
        }
        common.idle().then(() => this._updateAthleteDetails(states.map(x => x.athleteId)));
    });

    setHeadingOffset(heading) {
        this.headingOffset = heading;
        this.setHeading(this.heading);
    }

    setHeading(heading) {
        this._setHeading(heading);
        this._fullUpdateAsNeeded();
    }

    _setHeading(heading) {
        if (Math.abs(this.heading - heading) > 180) {
            this._headingRotations += Math.sign(this.heading - heading);
        }
        const mapAdj = this.rotateCoordinates ? 0 : -90;
        this._adjHeading = heading + this.headingOffset + this._headingRotations * 360 + mapAdj;
        this.heading = heading;
    }

    setCenter(pos) {
        this._setCenter(pos);
        this._fullUpdateAsNeeded();
    }

    _setCenter(pos) {
        this.center = pos;
        this._centerXY = this._rotateWorldPos(pos);
    }

    async _gcLoop() {
        await common.idle({timeout: 1000});
        setTimeout(() => this._gcLoop(), 10000);
        const now = Date.now();
        for (const ent of this._ents.values()) {
            if (ent.gc && now - ent.lastSeen > 15000) {
                this.removeEntity(ent);
            }
        }
    }

    _adjustLayerScale({force}={}) {
        // This is a solution for 3 problems:
        //  1. Blink will convert compositing layers to bitmaps using suboptimal
        //     resolutions during transitions, which we are always doing.  This
        //     makes all scaled elements look fuzzy and very low resolution.
        //  2. The GPU memory budget can explode when zooming out on large worlds
        //     like Watopia.  Mobile devices only have about 256MB (maybe less) of
        //     GPU memory to work with.  On Watopia, fully zoomed out, with the layer
        //     size being 8192x4096 will use about 1GB of memory if unscaled.  This
        //     causes the render pipeline to fail spectacularly and the page is broken.
        //  3. Performance because of #2 is pretty bad for large worlds when zoomed
        //     out.
        if (this.zoom > this.zoomMax || this.zoom < this.zoomMin) {
            debugger;
        }
        let quality = this.quality;
        if (this.tiltShift) {
            // When zoomed in tiltShift can exploded the GPU budget if a lot of
            // landscape is visible.  We need an additional scale factor to prevent
            // users from having to constantly adjust quality.
            const tiltFactor = this._zoomPrioTilt ? Math.min(1, (1 / this.zoomMax * (this.zoom + 1))) : 1;
            this._tiltShiftAngle = this.tiltShift * this.maxTiltShiftAngle * tiltFactor;
            quality *= Math.min(1, 20 / Math.max(0, this._tiltShiftAngle - 30));
        } else {
            this._tiltShiftAngle = 0;
        }
        const scale = Math.max(0.05, Math.round(this.zoom * quality / this._canvasScale / 0.25) * 0.25);
        this._tiltHeight = this.tiltShift ? this._perspective * this._canvasScale / (this.zoom / scale) : 0;
        if (force || this._layerScale !== scale) {
            this.incPause();
            this._layerScale = scale;
            const {mapCanvas, ents, map} = this._elements;
            mapCanvas.style.setProperty('width', `${mapCanvas.width * scale}px`);
            mapCanvas.style.setProperty('height', `${mapCanvas.height * scale}px`);
            mapCanvas.classList.toggle('hidden', !!this.portal);
            ents.style.setProperty('left', `${this._anchorXY[0] * scale * this._mapScale}px`);
            ents.style.setProperty('top', `${this._anchorXY[1] * scale * this._mapScale}px`);
            map.style.setProperty('--layer-scale', scale * this._canvasScale);
            for (const x of this._ents.values()) {
                // force refresh of _all_ ents.
                this._pendingEntityUpdates.add(x);
            }
            this.decPause();
            return true;
        }
        return false;
    }

    _updateGlobalTransform() {
        if (this._layerScale == null) {
            return;
        }
        const scale = this.zoom / this._layerScale;
        const relX = (this._anchorXY[0] + this._centerXY[0] - this._dragXY[0]) * this._mapScale;
        const relY = (this._anchorXY[1] + this._centerXY[1] - this._dragXY[1]) * this._mapScale;
        const tX = -(relX) * this._layerScale;
        const tY = -(relY) * this._layerScale;
        const originX = relX * this._layerScale;
        const originY = relY * this._layerScale;
        let vertOffset = 0;
        if (this.verticalOffset) {
            const height = this._elRect.height * this._layerScale / this.zoom * this._canvasScale;
            vertOffset = this.verticalOffset * height;
        }
        this._mapTransition.setValues([
            originX, originY,
            tX, tY,
            scale,
            this._tiltHeight, this._tiltShiftAngle,
            vertOffset,
            this._adjHeading,
        ]);
    }

    _transformAnimationLoop(frameTime) {
        requestAnimationFrame(this._transformAnimationLoopBound);
        if (frameTime - this._lastFrameTime < this._msPerFrame) {
            return;
        }
        this._lastFrameTime = frameTime;
        this._renderFrame();
    }

    _renderFrame() {
        let affectedPins;
        const transform = (this._mapTransition.disabled || this._mapTransition.playing) &&
            this._mapTransition.getStep();
        if (transform) {
            const [oX, oY, tX, tY, scale, tiltHeight, tiltAngle, vertOffset, rotate] = transform;
            this._rotate = rotate;
            this._elements.map.style.setProperty('transform-origin', `${oX}px ${oY}px`);
            this._elements.map.style.setProperty('transform', `
                translate(${tX}px, ${tY}px)
                scale(${scale / this._canvasScale})
                ${tiltHeight ? `perspective(${tiltHeight}px) rotateX(${tiltAngle}deg)` : ''}
                ${vertOffset ? `translate(0, ${vertOffset}px)` : ''}
                rotate(${rotate}deg)
            `);
            affectedPins = this._pinned.size ? Array.from(this._pinned).map(ent => ({ent})) : [];
        } else {
            affectedPins = [];
        }
        const scale = this._mapScale * this._layerScale;
        for (const ent of this._pendingEntityUpdates) {
            const pos = ent.transition.getStep();
            if (pos) {
                ent.el.style.setProperty('transform', `translate(${pos[0] * scale}px, ${pos[1] * scale}px)`);
                if (!transform && ent.pin) {
                    affectedPins.push({ent});
                }
            }
            if (ent.new) {
                this._elements.ents.append(ent.el);
                ent.new = false;
            }
            if (!ent.transition.playing) {
                this._pendingEntityUpdates.delete(ent);
            }
        }
        if (affectedPins.length) {
            // Avoid spurious reflow with batched reads followed by writes.
            const xOfft = -this._elRect.left;
            const yOfft = -this._elRect.top;
            for (let i = 0; i < affectedPins.length; i++) {
                const x = affectedPins[i];
                x.rect = x.ent.el.getBoundingClientRect();
            }
            for (let i = 0; i < affectedPins.length; i++) {
                const {rect, ent} = affectedPins[i];
                ent.pin.style.setProperty(
                    'transform', `translate(${rect.x + rect.width / 2 + xOfft}px, ${rect.y + yOfft}px)`);
            }
        }
    }

    _updateEntityAthleteData(ent, ad) {
        const leader = !!ad.eventLeader;
        const sweeper = !!ad.eventSweeper;
        const marked = !!ad.athlete?.marked;
        const following = !!ad.athlete?.following;
        const bot = ad.athlete?.type === 'PACER_BOT';
        if (bot !== ent.bot) {
            ent.el.classList.toggle('bot', bot);
            ent.bot = bot;
        }
        if (leader !== ent.leader) {
            ent.el.classList.toggle('leader', leader);
            ent.leader = leader;
        }
        if (sweeper !== ent.sweeper) {
            ent.el.classList.toggle('sweeper', sweeper);
            ent.sweeper = sweeper;
        }
        if (marked !== ent.marked) {
            ent.el.classList.toggle('marked', marked);
            ent.marked = marked;
        }
        if (following !== ent.following) {
            ent.el.classList.toggle('following', following);
            ent.following = following;
        }
    }

    async _updateAthleteDetails(ids) {
        const ads = await common.getAthletesDataCached(ids);
        for (const ad of ads) {
            const ent = this._ents.get(ad?.athleteId);
            if (ent && ad) {
                this._updateEntityAthleteData(ent, ad);
            }
        }
    }
}
