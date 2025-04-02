import { initiateDropboxAuthAction } from "./auth-token-requests";

export async function checkForRetry(error: any, attempts: number) {
  const errorTag = error[".tag"];

  if (attempts < 5) {
    switch(errorTag) {
      case "expired_access_token":
          console.log('Dropbox Auth Token Expired. Refreshing token Attempt #', attempts);
          
          const previousHRef = window.location.href;
          
          const { url } = await initiateDropboxAuthAction({
            clientId: process.env["PUBLIC_DROPBOX_CLIENT_ID"]!,
            redirectUri: `${process.env["PUBLIC_APP_URL"]}/api/dropbox-oauth2`,
            state: null
          });
  
          window.location.href = url;
        break;
    }
  }

  attempts++;
}