import { createServerClient } from "@supabase/ssr";

export const updateSession = async (request: Request) => {
  // This `try/catch` block is only here for the interactive tutorial.
  // Feel free to remove once you have Supabase connected.
  try {
    // Create a base response
    let response = new Response(null, {
      headers: request.headers,
    });

    const supabase = createServerClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]!,
      {
        cookies: {
          getAll() {
            return request.headers.get('cookie')?.split(';').map(cookie => {
              const [name, value] = cookie.trim().split('=');
              return { name, value };
            }) || [];
          },
          setAll(cookiesToSet: any[]) {
            cookiesToSet.forEach(({ name, value, options }) => {
              const cookieString = `${name}=${value}${options ? `; ${Object.entries(options).map(([key, val]) => `${key}=${val}`).join('; ')}` : ''}`;
              response.headers.append('Set-Cookie', cookieString);
            });
          },
        },
      },
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const user = await supabase.auth.getUser();

    // protected routes
    const url = new URL(request.url);
    if (url.pathname.startsWith("/protected") && user.error) {
      return Response.redirect(new URL("/sign-in", request.url));
    }

    if (url.pathname === "/" && !user.error) {
      return Response.redirect(new URL("/protected", request.url));
    }

    return response;
  } catch (e) {
    // If you are here, a Supabase client could not be created!
    // This is likely because you have not set up environment variables.
    // Check out http://localhost:3000 for Next Steps.
    return new Response(null, {
      headers: request.headers,
    });
  }
};
