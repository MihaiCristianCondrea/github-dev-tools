/**
 * Decorative animated particle network used as a non-interactive page background.
 *
 * The component owns its canvas inside shadow DOM, tracks theme color changes
 * through CSS custom properties, and pauses animation when the document is hidden
 * or when reduced motion is requested.
 *
 * CSS variables:
 * - `--muted-text`: particle and connection color.
 */

type RGB = { r: number; g: number; b: number };

type Particle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
	radius: number;
	alpha: number;
};

type PointerState = {
	x: number;
	y: number;
	normalizedX: number;
	normalizedY: number;
	worldX: number;
	worldY: number;
	active: boolean;
};

// Physics and Connection Settings
const MAX_DISTANCE = 90;
const MAX_DISTANCE_SQUARED = MAX_DISTANCE * MAX_DISTANCE;
const MAX_CONNECTIONS = 6;
const MOUSE_CONNECTION_DIST = MAX_DISTANCE * 1.4;
const MOUSE_CONNECTION_DIST_SQUARED = MOUSE_CONNECTION_DIST * MOUSE_CONNECTION_DIST;

const POINTER_REPEL_RADIUS = 48;
const POINTER_ATTRACT_RADIUS = 140;
const POINTER_REPEL_FORCE = 0.035;
const POINTER_ATTRACT_FORCE = 0.008;
const POINTER_MAX_FORCE = 0.06;

const VELOCITY_DAMPING = 0.992;
const MAX_PARTICLE_SPEED = 0.7;

// Density & Camera Boundaries
const PARTICLE_AREA = 12000;
const MIN_PARTICLES = 256;
const MAX_PARTICLES = 512;
const MOBILE_MIN_PARTICLES = 128;
const MOBILE_MAX_PARTICLES = 320;
const SMALL_VIEWPORT_WIDTH = 720;
const WORLD_MARGIN = 150;
const COLOR_LERP_RATE = 0.08;
const PARALLAX_SCROLL_STRENGTH = 0.15;

const componentStyles = `
	:host {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		contain: strict;
		pointer-events: none;
		overflow: hidden;
	}
	canvas {
		display: block;
		inline-size: 100%;
		block-size: 100%;
		pointer-events: none;
	}
`;

class ParticleNetworkBackground extends HTMLElement {
	private readonly canvas: HTMLCanvasElement;
	private readonly context: CanvasRenderingContext2D;
	private readonly colorParserCanvas: HTMLCanvasElement;
	private readonly colorParserContext: CanvasRenderingContext2D;
	private readonly resizeObserver: ResizeObserver;
	private themeObserver: MutationObserver | null = null;

	private animationFrameId: number | null = null;
	private rectUpdateFrameId: number | null = null;
	private particles: Particle[] = [];
	private connectionCounts = new Uint8Array(0);
	private readonly connectionGrid = new Map<string, number[]>();

	private width = 0;
	private height = 0;
	private simulatedWidth = 0;
	private simulatedHeight = 0;
	private hostLeft = 0;
	private hostTop = 0;
	private pixelRatio = 1;

	private visible = document.visibilityState !== "hidden";
	private readonly reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
	private readonly coarsePointerQuery = window.matchMedia("(pointer: coarse)");
	private reducedMotion = this.reducedMotionQuery.matches;
	private coarsePointer = this.coarsePointerQuery.matches;

	private readonly pointer: PointerState = {
		x: 0, y: 0, normalizedX: 0, normalizedY: 0, worldX: 0, worldY: 0, active: false
	};

	// Camera Dynamics
	private currentZoom = 1.0;
	private targetScrollY = 0;
	private currentScrollY = 0;
	private currentPanX = 0;
	private currentPanY = 0;

	private lastFrameTime = 0;

	// Smooth Color Blending State
	private targetMuted: RGB = { r: 150, g: 150, b: 150 };
	private currentMuted: RGB = { r: 150, g: 150, b: 150 };

	constructor() {
		super();
		const shadowRoot = this.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = componentStyles;

		this.canvas = document.createElement("canvas");
		const context = this.canvas.getContext("2d");
		if (!context) throw new Error("ParticleNetworkBackground requires a 2D canvas context.");
		this.context = context;

		this.colorParserCanvas = document.createElement("canvas");
		this.colorParserCanvas.width = 1;
		this.colorParserCanvas.height = 1;
		const parserContext = this.colorParserCanvas.getContext("2d", { willReadFrequently: true });
		if (!parserContext) throw new Error("ParticleNetworkBackground requires a color parser context.");
		this.colorParserContext = parserContext;

		this.resizeObserver = new ResizeObserver(() => this.resize());
		shadowRoot.append(style, this.canvas);
	}

	connectedCallback(): void {
		this.visible = document.visibilityState !== "hidden";
		this.reducedMotion = this.reducedMotionQuery.matches;
		this.coarsePointer = this.coarsePointerQuery.matches;

		this.themeObserver = new MutationObserver(() => this.extractCssColors());
		this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
		this.themeObserver.observe(this, { attributes: true, attributeFilter: ["class", "style"] });

		this.resizeObserver.observe(this);
		this.reducedMotionQuery.addEventListener("change", this.handleReducedMotionChange);
		this.coarsePointerQuery.addEventListener("change", this.handleCoarsePointerChange);
		document.addEventListener("visibilitychange", this.handleVisibilityChange);
		window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
		window.addEventListener("pointerleave", this.handlePointerLeave);
		window.addEventListener("scroll", this.handleScroll, { passive: true });

		this.extractCssColors(true);
		this.targetScrollY = window.scrollY;
		this.currentScrollY = window.scrollY;
		this.resize();
		this.updateAnimationState();
	}

	disconnectedCallback(): void {
		this.stopAnimation();
		this.resizeObserver.disconnect();
		this.themeObserver?.disconnect();
		this.reducedMotionQuery.removeEventListener("change", this.handleReducedMotionChange);
		this.coarsePointerQuery.removeEventListener("change", this.handleCoarsePointerChange);
		document.removeEventListener("visibilitychange", this.handleVisibilityChange);
		window.removeEventListener("pointermove", this.handlePointerMove);
		window.removeEventListener("pointerleave", this.handlePointerLeave);
		window.removeEventListener("scroll", this.handleScroll);
	}

	private extractCssColors(instant = false): void {
		const computedStyle = getComputedStyle(this);
		const rawMuted = computedStyle.getPropertyValue("--muted-text").trim() || "#888888";

		this.targetMuted = this.parseColorToRgb(rawMuted);

		if (instant) {
			this.currentMuted = { ...this.targetMuted };
		}
	}

	private parseColorToRgb(cssColor: string): RGB {
		this.colorParserContext.clearRect(0, 0, 1, 1);
		this.colorParserContext.fillStyle = cssColor;
		this.colorParserContext.fillRect(0, 0, 1, 1);
		const data = this.colorParserContext.getImageData(0, 0, 1, 1).data;
		return { r: data[0], g: data[1], b: data[2] };
	}

	private readonly handleVisibilityChange = (): void => {
		this.visible = document.visibilityState !== "hidden";
		this.updateAnimationState();
	};

	private readonly handleReducedMotionChange = (): void => {
		this.reducedMotion = this.reducedMotionQuery.matches;
		this.updateAnimationState();
	};

	private readonly handleCoarsePointerChange = (): void => {
		this.coarsePointer = this.coarsePointerQuery.matches;
		this.syncParticleCount();
	};

	private readonly handleScroll = (): void => {
		this.targetScrollY = window.scrollY;

		if (this.rectUpdateFrameId !== null) return;
		this.rectUpdateFrameId = requestAnimationFrame(() => {
			this.rectUpdateFrameId = null;
			const rect = this.getBoundingClientRect();
			this.hostLeft = rect.left;
			this.hostTop = rect.top;
		});
	};

	private readonly handlePointerMove = (event: PointerEvent): void => {
		const x = event.clientX - this.hostLeft;
		const y = event.clientY - this.hostTop;
		this.pointer.x = x;
		this.pointer.y = y;

		this.pointer.normalizedX = (x / this.width) * 2 - 1;
		this.pointer.normalizedY = (y / this.height) * 2 - 1;

		this.pointer.active = x >= 0 && x <= this.width && y >= 0 && y <= this.height;
	};

	private readonly handlePointerLeave = (): void => {
		this.pointer.active = false;
		this.pointer.normalizedX = 0;
		this.pointer.normalizedY = 0;
	};

	private clamp(n: number, min: number, max: number): number {
		if (n < min) return min;
		if (n > max) return max;
		return n;
	}

	private resize(): void {
		const rect = this.getBoundingClientRect();
		const nextPixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
		const nextWidth = Math.max(0, Math.floor(rect.width));
		const nextHeight = Math.max(0, Math.floor(rect.height));

		this.hostLeft = rect.left;
		this.hostTop = rect.top;

		if (nextWidth === this.width && nextHeight === this.height && nextPixelRatio === this.pixelRatio) {
			return;
		}

		this.width = nextWidth;
		this.height = nextHeight;
		this.pixelRatio = nextPixelRatio;

		this.canvas.width = Math.floor(this.width * this.pixelRatio);
		this.canvas.height = Math.floor(this.height * this.pixelRatio);
		this.context.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);

		this.updateSimulationBounds();
		this.syncParticleCount();
	}

	private updateSimulationBounds(): void {
		this.simulatedWidth = this.width + (WORLD_MARGIN * 2);
		const scrollHeight = document.documentElement.scrollHeight || this.height;
		this.simulatedHeight = this.height + (scrollHeight * PARALLAX_SCROLL_STRENGTH) + (WORLD_MARGIN * 2);
	}

	private getTargetParticleCount(): number {
		const rawCount = Math.floor((this.simulatedWidth * this.simulatedHeight) / PARTICLE_AREA);
		const constrainedViewport = this.coarsePointer || this.width <= SMALL_VIEWPORT_WIDTH;
		const minParticles = constrainedViewport ? MOBILE_MIN_PARTICLES : MIN_PARTICLES;
		const maxParticles = constrainedViewport ? MOBILE_MAX_PARTICLES : MAX_PARTICLES;
		return this.clamp(rawCount, minParticles, maxParticles);
	}

	private syncParticleCount(): void {
		if (this.width === 0 || this.height === 0) return;

		const targetCount = this.getTargetParticleCount();

		while (this.particles.length < targetCount) {
			this.particles.push(this.createParticle());
		}

		if (this.particles.length > targetCount) {
			this.particles.length = targetCount;
		}
	}

	private createParticle(): Particle {
		const angle = Math.random() * Math.PI * 2;
		const speed = 0.08 + Math.random() * 0.22;

		return {
			x: -WORLD_MARGIN + Math.random() * this.simulatedWidth,
			y: -WORLD_MARGIN + Math.random() * this.simulatedHeight,
			vx: Math.cos(angle) * speed,
			vy: Math.sin(angle) * speed,
			radius: 1.2 + Math.random() * 0.8,
			alpha: 0.35 + Math.random() * 0.25
		};
	}

	private updateAnimationState(): void {
		if (!this.visible || this.reducedMotion) {
			this.stopAnimation();
			this.draw();
			return;
		}
		if (this.animationFrameId === null) {
			this.animationFrameId = requestAnimationFrame(this.tick);
		}
	}

	private lerpColors(deltaScale: number): void {
		const rate = 1 - Math.pow(1 - COLOR_LERP_RATE, deltaScale);

		this.currentMuted.r += (this.targetMuted.r - this.currentMuted.r) * rate;
		this.currentMuted.g += (this.targetMuted.g - this.currentMuted.g) * rate;
		this.currentMuted.b += (this.targetMuted.b - this.currentMuted.b) * rate;
	}

	private readonly tick = (timeMs: number): void => {
		this.animationFrameId = null;

		const deltaMs = this.lastFrameTime === 0 ? 16.67 : timeMs - this.lastFrameTime;
		this.lastFrameTime = timeMs;
		const deltaScale = this.clamp(deltaMs / 16.67, 0.5, 2);

		// 3D Camera Dynamics
		this.currentScrollY += (this.targetScrollY - this.currentScrollY) * 0.08 * deltaScale;

		const targetX = 0;
		const targetY = -(this.currentScrollY * PARALLAX_SCROLL_STRENGTH);

		this.currentPanX += (targetX - this.currentPanX) * 0.06 * deltaScale;
		this.currentPanY += (targetY - this.currentPanY) * 0.06 * deltaScale;

		// Inverse Transform Mapping: Convert screen pointer to world coordinates
		const cx = this.width / 2;
		const cy = this.height / 2;
		this.pointer.worldX = (this.pointer.x - cx) / this.currentZoom - this.currentPanX + cx;
		this.pointer.worldY = (this.pointer.y - cy) / this.currentZoom - this.currentPanY + cy;

		this.lerpColors(deltaScale);
		this.stepParticles(deltaScale);
		this.draw();
		this.updateAnimationState();
	};

	private stepParticles(deltaScale: number): void {
		const maxW = this.simulatedWidth - WORLD_MARGIN;
		const maxH = this.simulatedHeight - WORLD_MARGIN;

		for (let i = 0; i < this.particles.length; i++) {
			const p = this.particles[i];

			p.x += p.vx * deltaScale;
			p.y += p.vy * deltaScale;

			// World Boundaries
			if (p.x < -WORLD_MARGIN) { p.x = -WORLD_MARGIN; p.vx *= -1; }
			else if (p.x > maxW) { p.x = maxW; p.vx *= -1; }

			if (p.y < -WORLD_MARGIN) { p.y = -WORLD_MARGIN; p.vy *= -1; }
			else if (p.y > maxH) { p.y = maxH; p.vy *= -1; }

			this.applyPointerForce(p, deltaScale);
			this.limitParticleVelocity(p);
		}
	}

	private applyPointerForce(particle: Particle, deltaScale: number): void {
		if (!this.pointer.active) return;

		const dx = this.pointer.worldX - particle.x;
		const dy = this.pointer.worldY - particle.y;
		const distanceSquared = dx * dx + dy * dy;

		const repelRadiusSquared = POINTER_REPEL_RADIUS * POINTER_REPEL_RADIUS;
		const attractRadiusSquared = POINTER_ATTRACT_RADIUS * POINTER_ATTRACT_RADIUS;

		if (distanceSquared > attractRadiusSquared || distanceSquared === 0) return;

		const distance = Math.sqrt(distanceSquared);
		const nx = dx / distance;
		const ny = dy / distance;

		if (distanceSquared < repelRadiusSquared) {
			const strength = this.clamp((1 - distance / POINTER_REPEL_RADIUS) * POINTER_REPEL_FORCE, 0, POINTER_MAX_FORCE);
			particle.vx -= nx * strength * deltaScale;
			particle.vy -= ny * strength * deltaScale;
			return;
		}

		const strength = this.clamp((1 - distance / POINTER_ATTRACT_RADIUS) * POINTER_ATTRACT_FORCE, 0, POINTER_MAX_FORCE);
		particle.vx += nx * strength * deltaScale;
		particle.vy += ny * strength * deltaScale;
	}

	private limitParticleVelocity(particle: Particle): void {
		particle.vx *= VELOCITY_DAMPING;
		particle.vy *= VELOCITY_DAMPING;

		const speedSquared = particle.vx * particle.vx + particle.vy * particle.vy;
		const maxSpeedSquared = MAX_PARTICLE_SPEED * MAX_PARTICLE_SPEED;

		if (speedSquared <= maxSpeedSquared) return;

		const scale = MAX_PARTICLE_SPEED / Math.sqrt(speedSquared);
		particle.vx *= scale;
		particle.vy *= scale;
	}

	private ensureConnectionBuffer(length: number): Uint8Array {
		if (this.connectionCounts.length < length) {
			this.connectionCounts = new Uint8Array(length);
		}
		this.connectionCounts.fill(0, 0, length);
		return this.connectionCounts;
	}

	private prepareConnectionGrid(length: number): void {
		this.connectionGrid.clear();

		for (let i = 0; i < length; i++) {
			const particle = this.particles[i];
			const key = this.connectionGridKey(
				Math.floor(particle.x / MAX_DISTANCE),
				Math.floor(particle.y / MAX_DISTANCE)
			);
			const cell = this.connectionGrid.get(key);
			if (cell) cell.push(i);
			else this.connectionGrid.set(key, [i]);
		}
	}

	private connectionGridKey(cellX: number, cellY: number): string {
		return `${cellX}:${cellY}`;
	}

	private drawNearbyParticleConnections(index: number, connectionCounts: Uint8Array): void {
		const source = this.particles[index];
		const sourceCellX = Math.floor(source.x / MAX_DISTANCE);
		const sourceCellY = Math.floor(source.y / MAX_DISTANCE);

		for (let offsetY = -1; offsetY <= 1; offsetY++) {
			for (let offsetX = -1; offsetX <= 1; offsetX++) {
				if (connectionCounts[index] >= MAX_CONNECTIONS) return;

				const cell = this.connectionGrid.get(this.connectionGridKey(sourceCellX + offsetX, sourceCellY + offsetY));
				if (!cell) continue;

				for (let i = 0; i < cell.length; i++) {
					const targetIndex = cell[i];
					if (targetIndex <= index) continue;
					if (connectionCounts[index] >= MAX_CONNECTIONS) return;
					if (connectionCounts[targetIndex] >= MAX_CONNECTIONS) continue;

					this.drawParticleConnection(index, targetIndex, connectionCounts);
				}
			}
		}
	}

	private drawParticleConnection(sourceIndex: number, targetIndex: number, connectionCounts: Uint8Array): void {
		const source = this.particles[sourceIndex];
		const target = this.particles[targetIndex];
		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const distSq = dx * dx + dy * dy;

		if (distSq >= MAX_DISTANCE_SQUARED) return;

		const distance = Math.sqrt(distSq);
		this.context.globalAlpha = this.clamp(1 - (distance / MAX_DISTANCE), 0.02, 0.25);
		this.context.beginPath();
		this.context.moveTo(source.x, source.y);
		this.context.lineTo(target.x, target.y);
		this.context.stroke();

		connectionCounts[sourceIndex]++;
		connectionCounts[targetIndex]++;
	}

	private draw(): void {
		const { context } = this;

		context.clearRect(0, 0, this.width, this.height);
		if (this.width === 0 || this.height === 0) return;

		const cx = this.width / 2;
		const cy = this.height / 2;

		context.save();
		context.translate(cx, cy);
		context.scale(this.currentZoom, this.currentZoom);
		context.translate(this.currentPanX, this.currentPanY);
		context.translate(-cx, -cy);

		const length = this.particles.length;
		const connectionCounts = this.ensureConnectionBuffer(length);
		this.prepareConnectionGrid(length);

		const { r, g, b } = this.currentMuted;
		const strokeRgb = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
		context.strokeStyle = strokeRgb;
		context.fillStyle = strokeRgb;

		for (let i = 0; i < length; i++) {
			const p = this.particles[i];

			// 1. Pointer connections
			if (this.pointer.active) {
				const dx = this.pointer.worldX - p.x;
				const dy = this.pointer.worldY - p.y;
				const distSq = dx * dx + dy * dy;

				if (distSq < MOUSE_CONNECTION_DIST_SQUARED) {
					const distance = Math.sqrt(distSq);
					context.globalAlpha = this.clamp(1 - (distance / MOUSE_CONNECTION_DIST), 0.02, 0.3);
					context.beginPath();
					context.moveTo(this.pointer.worldX, this.pointer.worldY);
					context.lineTo(p.x, p.y);
					context.stroke();
				}
			}

			// 2. Particle-to-particle connections
			this.drawNearbyParticleConnections(i, connectionCounts);

			// Draw Dots
			context.globalAlpha = p.alpha * 0.5;
			context.beginPath();
			context.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
			context.fill();
		}

		context.restore();
		context.globalAlpha = 1;
	}

	private stopAnimation(): void {
		if (this.animationFrameId === null) return;
		cancelAnimationFrame(this.animationFrameId);
		this.animationFrameId = null;
	}
}

if (!customElements.get("particle-network-background")) {
	customElements.define("particle-network-background", ParticleNetworkBackground);
}

export default ParticleNetworkBackground;
