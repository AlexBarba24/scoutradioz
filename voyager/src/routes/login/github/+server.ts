// routes/login/github/+server.ts
import { github } from "$lib/server/auth";
import { generateState } from "arctic";
import { redirect } from "@sveltejs/kit";

import type { RequestEvent } from "@sveltejs/kit";

export async function GET(event: RequestEvent): Promise<Response> {
	const state = generateState();
	const url = await github.createAuthorizationURL(state);

	event.cookies.set("github_oauth_state", state, {
		path: "/",
		secure: import.meta.env.PROD,
		httpOnly: true,
		maxAge: 60 * 10,
		sameSite: "lax"
	});

	redirect(302, url.toString());
}