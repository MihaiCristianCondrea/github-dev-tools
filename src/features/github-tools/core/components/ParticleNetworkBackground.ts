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
	active: boolean;
};

const MAX_PARTICLES = 160;
const MIN_PARTICLES = 70;
const PARTICLE_AREA = 14000;
const CONNECTION_DISTANCE = 190;
const CONNECTION_DISTANCE_SQUARED = CONNECTION_DISTANCE * CONNECTION_DISTANCE;
const PARTICLE_RADIUS_MIN = 1.6;
const PARTICLE_RADIUS_MAX = 2.7;
const MOTION_SPEED = 0.26;
const POINTER_RADIUS = 150;
const POINTER_RADIUS_SQUARED = POINTER_RADIUS * POINTER_RADIUS;
const POINTER_REPEL_STRENGTH = 0.34;
const POINTER_LINE_BOOST = 0.07;

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
	private readonly resizeObserver: ResizeObserver;
	private readonly reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
	private animationFrameId: number | null = null;
	private particles: Particle[] = [];
	private width = 0;
	private height = 0;
	private hostLeft = 0;
	private hostTop = 0;
	private visible = document.visibilityState !== "hidden";
	private reducedMotion = this.reducedMotionQuery.matches;
	private readonly pointer: PointerState = { x: 0, y: 0, active: false };

	constructor() {
		super();
		const shadowRoot = this.attachShadow({ mode: "open" });
		const style = document.createElement("style");
		style.textContent = componentStyles;
		this.canvas = document.createElement("canvas");
		const context = this.canvas.getContext("2d");
		if (!context) throw new Error("Particle network canvas context is unavailable");
		this.context = context;
		this.resizeObserver = new ResizeObserver(() => this.resize());
		shadowRoot.append(style, this.canvas);
	}

	connectedCallback(): void {
		this.visible = document.visibilityState !== "hidden";
		this.reducedMotion = this.reducedMotionQuery.matches;
		this.resizeObserver.observe(this);
		this.reducedMotionQuery.addEventListener("change", this.handleReducedMotionChange);
		document.addEventListener("visibilitychange", this.handleVisibilityChange);
		window.addEventListener("pointermove", this.handlePointerMove, { passive: true });
		window.addEventListener("pointerleave", this.handlePointerLeave);
		window.addEventListener("blur", this.handlePointerLeave);
		this.resize();
		this.updateAnimationState();
	}

	disconnectedCallback(): void {
		this.stopAnimation();
		this.resizeObserver.disconnect();
		this.reducedMotionQuery.removeEventListener("change", this.handleReducedMotionChange);
		document.removeEventListener("visibilitychange", this.handleVisibilityChange);
		window.removeEventListener("pointermove", this.handlePointerMove);
		window.removeEventListener("pointerleave", this.handlePointerLeave);
		window.removeEventListener("blur", this.handlePointerLeave);
	}

	private readonly handleReducedMotionChange = (event: MediaQueryListEvent): void => {
		this.reducedMotion = event.matches;
		this.updateAnimationState();
	};

	private readonly handleVisibilityChange = (): void => {
		this.visible = document.visibilityState !== "hidden";
		this.updateAnimationState();
	};

	private readonly handlePointerMove = (event: PointerEvent): void => {
		const x = event.clientX - this.hostLeft;
		const y = event.clientY - this.hostTop;
		this.pointer.x = x;
		this.pointer.y = y;
		this.pointer.active = x >= 0 && x <= this.width && y >= 0 && y <= this.height;
	};

	private readonly handlePointerLeave = (): void => {
		this.pointer.active = false;
	};

	private resize(): void {
		const rect = this.getBoundingClientRect();
		const width = Math.max(0, Math.floor(rect.width));
		const height = Math.max(0, Math.floor(rect.height));
		const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

		this.hostLeft = rect.left;
		this.hostTop = rect.top;
		this.width = width;
		this.height = height;
		this.canvas.width = Math.floor(width * pixelRatio);
		this.canvas.height = Math.floor(height * pixelRatio);
		this.context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
		this.seedParticles();
		this.draw();
	}

	private seedParticles(): void {
		if (this.width === 0 || this.height === 0) {
			this.particles = [];
			return;
		}

		const densityCount = Math.floor((this.width * this.height) / PARTICLE_AREA);
		const particleCount = Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, densityCount));
		this.particles = Array.from({ length: particleCount }, () => this.createParticle());
	}

	private createParticle(): Particle {
		const radius = PARTICLE_RADIUS_MIN + Math.random() * (PARTICLE_RADIUS_MAX - PARTICLE_RADIUS_MIN);
		const radiusRatio = (radius - PARTICLE_RADIUS_MIN) / (PARTICLE_RADIUS_MAX - PARTICLE_RADIUS_MIN);
		const speedScale = 1 - radiusRatio * 0.38;

		return {
			x: Math.random() * this.width,
			y: Math.random() * this.height,
			vx: (Math.random() - 0.5) * MOTION_SPEED * speedScale,
			vy: (Math.random() - 0.5) * MOTION_SPEED * speedScale,
			radius,
			alpha: 0.72 + Math.random() * 0.28,
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

	private readonly tick = (): void => {
		this.animationFrameId = null;
		this.stepParticles();
		this.draw();
		this.updateAnimationState();
	};

	private stepParticles(): void {
		this.particles.forEach((particle) => {
			particle.x += particle.vx;
			particle.y += particle.vy;

			if (this.pointer.active) {
				this.applyPointerInfluence(particle);
			}

			if (particle.x < 0 || particle.x > this.width) particle.vx *= -1;
			if (particle.y < 0 || particle.y > this.height) particle.vy *= -1;

			particle.x = Math.max(0, Math.min(this.width, particle.x));
			particle.y = Math.max(0, Math.min(this.height, particle.y));
		});
	}

	private applyPointerInfluence(particle: Particle): void {
		const dx = particle.x - this.pointer.x;
		const dy = particle.y - this.pointer.y;
		const distanceSquared = dx * dx + dy * dy;
		if (distanceSquared > POINTER_RADIUS_SQUARED || distanceSquared === 0) return;

		const distance = Math.sqrt(distanceSquared);
		const influence = (1 - distanceSquared / POINTER_RADIUS_SQUARED) * POINTER_REPEL_STRENGTH;
		particle.x += (dx / distance) * influence;
		particle.y += (dy / distance) * influence;
	}

	private draw(): void {
		const { context } = this;
		context.clearRect(0, 0, this.width, this.height);
		if (this.width === 0 || this.height === 0) return;

		const computedStyle = getComputedStyle(this);
		const primaryColor = computedStyle.getPropertyValue("--primary").trim() || "#0a0a0a";
		const mutedColor = computedStyle.getPropertyValue("--muted-text").trim() || primaryColor;
		const connectionOpacity = this.reducedMotion ? 0.06 : 0.085;
		const particleOpacity = this.reducedMotion ? 0.12 : 0.18;

		context.lineWidth = 1;
		context.strokeStyle = mutedColor;
		for (let firstIndex = 0; firstIndex < this.particles.length; firstIndex += 1) {
			const first = this.particles[firstIndex];
			for (let secondIndex = firstIndex + 1; secondIndex < this.particles.length; secondIndex += 1) {
				const second = this.particles[secondIndex];
				const dx = first.x - second.x;
				const dy = first.y - second.y;
				const distanceSquared = dx * dx + dy * dy;
				if (distanceSquared > CONNECTION_DISTANCE_SQUARED) continue;

				const distanceFade = 1 - distanceSquared / CONNECTION_DISTANCE_SQUARED;
				const pointerBoost = this.getLinePointerBoost(first, second);
				context.globalAlpha = connectionOpacity * distanceFade + pointerBoost;
				context.beginPath();
				context.moveTo(first.x, first.y);
				context.lineTo(second.x, second.y);
				context.stroke();
			}
		}

		context.fillStyle = primaryColor;
		this.particles.forEach((particle) => {
			context.globalAlpha = particleOpacity * particle.alpha;
			context.beginPath();
			context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
			context.fill();
		});
		context.globalAlpha = 1;
	}

	private getLinePointerBoost(first: Particle, second: Particle): number {
		if (!this.pointer.active || this.reducedMotion) return 0;

		const firstDistanceSquared = this.getPointerDistanceSquared(first);
		const secondDistanceSquared = this.getPointerDistanceSquared(second);
		const nearestDistanceSquared = Math.min(firstDistanceSquared, secondDistanceSquared);
		if (nearestDistanceSquared > POINTER_RADIUS_SQUARED) return 0;

		return POINTER_LINE_BOOST * (1 - nearestDistanceSquared / POINTER_RADIUS_SQUARED);
	}

	private getPointerDistanceSquared(particle: Particle): number {
		const dx = particle.x - this.pointer.x;
		const dy = particle.y - this.pointer.y;
		return dx * dx + dy * dy;
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
