import type { RequestHandler } from './$types';
import { error } from '@sveltejs/kit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const GET: RequestHandler = async ({ params }) => {
	const name = params.id;
	if (!name || name.includes('/') || name.includes('..')) {
		throw error(400, 'Invalid upload name');
	}

	const dataDir = path.join(process.cwd(), 'data');
	const fullPath = path.join(dataDir, name);

	try {
		const content = await readFile(fullPath, 'utf-8');
		return new Response(content, {
			headers: {
				'Content-Type': 'text/csv; charset=utf-8',
				'Content-Disposition': `attachment; filename="${name}"`,
			},
		});
	} catch (e) {
		throw error(404, 'Upload not found');
	}
};
