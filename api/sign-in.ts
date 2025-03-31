import { signInWithoutRedirectAction } from "@/app/actions";


export async function POST(request: Request) {
  // Handle any webhook events sent from dropbox here
  const body = await request.json();

  console.log("New API Sign-In");

  const formData = new FormData();
  formData.append('email', body.email);
  formData.append('password', body.password);

  // Initiate the update check in an async call
  const data = await signInWithoutRedirectAction(formData);

  console.log("returning data ", data.session);
  
  return new Response(
    JSON.stringify(data.session),
    { headers: { "Content-Type": "application/json" } },
  )
}