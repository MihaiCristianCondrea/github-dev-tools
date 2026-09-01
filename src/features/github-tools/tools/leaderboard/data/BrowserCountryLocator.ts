import { activeLocale, strings } from "../../../../../core/localization/Localization";

export type LocatedCountry = { name: string; slug: string };

type ReverseGeocodeDto = { countryName?: unknown };

const countrySlug = (name: string): string => name
	.normalize("NFD")
	.replace(/[\u0300-\u036f]/g, "")
	.toLowerCase()
	.replace(/&/g, "and")
	.replace(/[^a-z0-9]+/g, "_")
	.replace(/^_|_$/g, "");

// Geolocation rejects with a GeolocationPositionError, which is not an Error and
// carries a browser-authored message. Map its code to localized copy instead.
const locationErrorMessage = (error: unknown): string => {
	const code = (error as GeolocationPositionError | undefined)?.code;
	if (code === 1) return strings.leaderboard.location.permissionDenied;
	if (code === 3) return strings.leaderboard.location.timedOut;
	if (code === 2) return strings.leaderboard.location.unavailable;
	return error instanceof Error ? error.message : strings.leaderboard.location.unavailable;
};

export class BrowserCountryLocator {
	async locate(): Promise<LocatedCountry> {
		if (!navigator.geolocation) throw new Error(strings.leaderboard.location.notSupported);

		let position: GeolocationPosition;
		try {
			position = await new Promise<GeolocationPosition>((resolve, reject) =>
				navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000, maximumAge: 3_600_000 })
			);
		} catch (error) {
			throw new Error(locationErrorMessage(error));
		}

		const query = new URLSearchParams({
			latitude: String(position.coords.latitude),
			longitude: String(position.coords.longitude),
			localityLanguage: activeLocale,
		});
		const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${query}`)
			.catch(() => { throw new Error(strings.leaderboard.location.countryUnknown); });
		if (!response.ok) throw new Error(strings.leaderboard.location.countryUnknown);
		const data = await response.json() as ReverseGeocodeDto;
		if (typeof data.countryName !== "string" || !data.countryName.trim()) throw new Error(strings.leaderboard.location.countryUnknown);
		const name = data.countryName.trim();
		return { name, slug: countrySlug(name) };
	}
}
