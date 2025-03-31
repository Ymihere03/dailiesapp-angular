'use server';

import { type SignInWithOAuthCredentials } from '@supabase/supabase-js';
import { createClient } from "@/utils/supabase/server";
// import { redirect } from 'next/dist/server/api-utils';
import { redirect } from "next/navigation";

// import { useMutation } from '@tanstack/react-query';

// import { useSupabase } from './use-supabase';

// export function useSignInWithProvider() {
//   const client = useSupabase();
//   const mutationKey = ['auth', 'sign-in-with-provider'];

//   const mutationFn = async (credentials: SignInWithOAuthCredentials) => {
//     const response = await client.auth.signInWithOAuth(credentials);

//     if (response.error) {
//       throw response.error.message;
//     }

//     return response.data;
//   };

//   return useMutation({
//     mutationFn,
//     mutationKey,
//   });
// }

const getURL = () => {
  let url =
    process?.env?.NEXT_PUBLIC_OAUTH_SITE_URL ?? // Set this to your site URL in production env.
    process?.env?.NEXT_PUBLIC_OAUTH_VERCEL_URL ?? // Automatically set by Vercel.
    'http://localhost:3000/auth/callback'
  // Make sure to include `https://` when not localhost.
  url = url.startsWith('http') ? url : `https://${url}`
  // Make sure to include a trailing `/`.
  url = url.endsWith('/') ? url : `${url}/`
  return url
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: getURL()
    }
  })

  if (error) {
    throw error.message;
  }

  if(data.url) {
    redirect(data.url);
  }
  return data;
}