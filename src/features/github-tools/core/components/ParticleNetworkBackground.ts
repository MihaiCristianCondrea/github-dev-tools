type Particle = {
	x: number;
	y: number;
	vx: number;
	vy: number;
};

const MAX_PARTICLES = 42;
const MIN_PARTICLES = 18;
const CONNECTION_DISTANCE = 150;
const PARTICLE_RADIUS = 1.4;
const MOTION_SPEED = 0.22;

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
	private visible = document.visibilityState !== "hidden";
	private reducedMotion = this.reducedMotionQuery.matches;

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
		this.resize();
		this.updateAnimationState();
	}

	disconnectedCallback(): void {
		this.stopAnimation();
		this.resizeObserver.disconnect();
		this.reducedMotionQuery.removeEventListener("change", this.handleReducedMotionChange);
		document.removeEventListener("visibilitychange", this.handleVisibilityChange);
	}

	private readonly handleReducedMotionChange = (event: MediaQueryListEvent): void => {
		this.reducedMotion = event.matches;
		this.updateAnimationState();
	};

	private readonly handleVisibilityChange = (): void => {
		this.visible = document.visibilityState !== "hidden";
		this.updateAnimationState();
	};

	private resize(): void {
		const rect = this.getBoundingClientRect();
		const width = Math.max(0, Math.floor(rect.width));
		const height = Math.max(0, Math.floor(rect.height));
		const pixelRatio = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

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

		const densityCount = Math.round((this.width * this.height) / 42000);
		const particleCount = Math.max(MIN_PARTICLES, Math.min(MAX_PARTICLES, densityCount));
		this.particles = Array.from({ length: particleCount }, () => ({
			x: Math.random() * this.width,
			y: Math.random() * this.height,
			vx: (Math.random() - 0.5) * MOTION_SPEED,
			vy: (Math.random() - 0.5) * MOTION_SPEED,
		}));
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

			if (particle.x < 0 || particle.x > this.width) particle.vx *= -1;
			if (particle.y < 0 || particle.y > this.height) particle.vy *= -1;

			particle.x = Math.max(0, Math.min(this.width, particle.x));
			particle.y = Math.max(0, Math.min(this.height, particle.y));
		});
	}

	private draw(): void {
		const { context } = this;
		context.clearRect(0, 0, this.width, this.height);
		if (this.width === 0 || this.height === 0) return;

		const computedStyle = getComputedStyle(this);
		const primaryColor = computedStyle.getPropertyValue("--primary").trim() || "#0a0a0a";
		const mutedColor = computedStyle.getPropertyValue("--muted-text").trim() || primaryColor;
		const connectionOpacity = this.reducedMotion ? 0.07 : 0.09;
		const particleOpacity = this.reducedMotion ? 0.14 : 0.18;

		context.lineWidth = 1;
		context.strokeStyle = mutedColor;
		for (let firstIndex = 0; firstIndex < this.particles.length; firstIndex += 1) {
			const first = this.particles[firstIndex];
			for (let secondIndex = firstIndex + 1; secondIndex < this.particles.length; secondIndex += 1) {
				const second = this.particles[secondIndex];
				const distance = Math.hypot(first.x - second.x, first.y - second.y);
				if (distance > CONNECTION_DISTANCE) continue;

				context.globalAlpha = connectionOpacity * (1 - distance / CONNECTION_DISTANCE);
				context.beginPath();
				context.moveTo(first.x, first.y);
				context.lineTo(second.x, second.y);
				context.stroke();
			}
		}

		context.fillStyle = primaryColor;
		context.globalAlpha = particleOpacity;
		this.particles.forEach((particle) => {
			context.beginPath();
			context.arc(particle.x, particle.y, PARTICLE_RADIUS, 0, Math.PI * 2);
			context.fill();
		});
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
