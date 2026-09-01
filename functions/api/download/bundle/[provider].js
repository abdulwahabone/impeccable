import { BUNDLE_DOWNLOAD_PROVIDERS } from "../../../../cli/lib/download-providers.js";

export async function onRequestGet(context) {
	const { provider } = context.params;

	if (!provider || !BUNDLE_DOWNLOAD_PROVIDERS.includes(provider)) {
		return Response.json({ error: "Invalid provider" }, { status: 400 });
	}

	const versionUrl = new URL('/_data/api/version.json', context.request.url);
	const versionResponse = await context.env.ASSETS.fetch(versionUrl);

	if (!versionResponse.ok) {
		return Response.json({ error: "Bundle release metadata not found" }, { status: 502 });
	}

	const { skills: version } = await versionResponse.json();
	if (typeof version !== 'string' || !/^[0-9A-Za-z.+-]+$/.test(version)) {
		return Response.json({ error: "Invalid bundle release metadata" }, { status: 502 });
	}

	const releaseUrl = `https://github.com/pbakaus/impeccable/releases/download/skill-v${version}/${provider}.zip`;

	return new Response(null, {
		status: 302,
		headers: {
			'Location': releaseUrl,
			'Cache-Control': 'public, max-age=300, s-maxage=3600',
		}
	});
}
