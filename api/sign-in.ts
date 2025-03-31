import { signInWithoutRedirectAction } from "../backend/actions";


export async function POST(request: Request) {
  // Handle any webhook events sent from dropbox here
  const body = await request.json();

  console.log("New API Sign-In");

  if (typeof body !== 'object' || body === null) {
    return new Response('Invalid request body', { status: 400 });
  }

  if (!('email' in body)) {
    return new Response('Email is required', { status: 400 });
  }

  if (!('password' in body)) {
    return new Response('Password is required', { status: 400 });
  }

  const formData = new FormData();
  formData.append('email', (body as {email: string}).email);
  formData.append('password', (body as {password: string}).password);

  // Initiate the update check in an async call
  const data = await signInWithoutRedirectAction(formData);

  console.log("returning data ", data.session);
  
  return new Response(
    JSON.stringify(data.session),
    { headers: { "Content-Type": "application/json" } },
  )
}