'use server'

import { completeTokenExchange, exchangeDropboxCodeAction } from '../backend/dropbox-server/auth-token-requests';
import { redirect } from 'next/navigation';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = await searchParams.get('code');
  const state = await searchParams.get('state');

  console.info("dropbox-oauth2 api called");
  
  if (!code) {
    return new Response('No code provided', { status: 400 });
  }

  const token = await exchangeDropboxCodeAction({
    code: code,
    clientId: process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID!,
    clientSecret: process.env.NEXT_DROPBOX_CLIENT_SECRET!,
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/dropbox-oauth2`,
    state: state,
    grantCode: 'authorization_code'
  });

  // Handle the token (store it securely, etc.)
  // Redirect user to appropriate page
  if (token) {
    console.info("token received...storing...");
    completeTokenExchange(token);
    return redirect("/protected");
    // return new Response('', {
    //   headers: { 'Content-Type': 'text/plain'},
    //   status: 200
    // })
  } else {
    return new Response('token exchange failed', { status: 400 });
  }
}