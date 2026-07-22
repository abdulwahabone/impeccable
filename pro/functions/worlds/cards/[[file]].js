// Serves world hero cards to impeccable.pro from the same R2 bucket the main
// site uses (binding WORLD_CARDS, see pro/wrangler.toml).
//
// This route exists so the card is same-origin for this page. The torn paper
// shader uploads it as a WebGL texture, and a cross-origin image without CORS
// headers would taint the canvas and break the draw. Mirrors
// functions/worlds/cards/[[file]].js on the main site.

const FILE_PATTERN = /^[a-z0-9-]+\.webp$/;

export async function onRequestGet(context) {
	const parts = context.params.file;
	const file = Array.isArray(parts) ? parts.join('/') : parts;

	if (!file || !FILE_PATTERN.test(file)) {
		return new Response('Not found', { status: 404 });
	}

	if (!context.env.WORLD_CARDS) {
		return new Response('Not found', { status: 404 });
	}

	const object = await context.env.WORLD_CARDS.get(file);
	if (!object) {
		return new Response('Not found', { status: 404 });
	}

	const headers = new Headers();
	headers.set('Content-Type', 'image/webp');
	headers.set('ETag', object.httpEtag);
	// Card URLs carry a ?v= content hash, so a regenerated card gets a new URL.
	headers.set('Cache-Control', 'public, max-age=31536000, immutable');

	return new Response(object.body, { headers });
}
