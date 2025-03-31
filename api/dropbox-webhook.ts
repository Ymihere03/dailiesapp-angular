import { initiateCheckDropboxUpdates } from "../backend/dropbox-server/list-folder";

export const maxDuration = 30;

export function GET(request: Request) {
  // Handle the dropbox challenge
  // This is only for endpoint verification and doesn't impact anything else
  const url = new URL(request.url)
  const challenge = url.searchParams.get('challenge')
  
  if (challenge) {
    return new Response(challenge, {
      headers: { 'Content-Type': 'text/plain' , 'X-Content-Type-Options': 'nosniff'},
      status: 200
    })
  }
}

export async function POST(request: Request) {
  // Handle any webhook events sent from dropbox here
  const body = await request.json();

  console.log("Dropbox update received!!", JSON.stringify(body, null, 2));

  // Initiate the update check in an async call
  void initiateCheckDropboxUpdates(body);
  
  return new Response(
    JSON.stringify({status: 'ok'}),
    { headers: { "Content-Type": "application/json" } },
  )
}