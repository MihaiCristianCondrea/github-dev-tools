export type LocatedCountry = { name: string; slug: string };

type ReverseGeocodeDto = { countryName?: unknown };

const countrySlug = (name: string): string => name
	.normalize("NFD")
	.replace(/[\u0300-\u036f]/g, "")
	.toLowerCase()
	.replace(/&/g, "and")
	.replace(/[^a-z0-9]+/g, "_")
	.replace(/^_|_$/g, "");

export class BrowserCountryLocator {
	async locate(): Promise<LocatedCountry> {
		if (!navigator.geolocation) throw new Error("Location is not supported by this browser.");
		const position = await new Promise<GeolocationPosition>((resolve, reject) =>
			navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 3_600_000 })
		);
		const query = new URLSearchParams({
			latitude: String(position.coords.latitude),
			longitude: String(position.coords.longitude),
			localityLanguage: "en",
		});
		const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`);
		if (!response.ok) throw new Error("We could not identify your country.");
		const data = await response.json() as ReverseGeocodeDto;
		if (typeof data.countryName !== "string" || !data.countryName.trim()) throw new Error("We could not identify your country.");
		const name = data.countryName.trim();
		return { name, slug: countrySlug(name) };
	}
}
