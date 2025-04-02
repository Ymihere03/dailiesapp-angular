//import { storeOrUpdateToken } from "../supabase/integration-accounts-table/integration-accounts";

const DROPBOX_AUTH_URL = 'https://www.dropbox.com/oauth2/authorize';
const DROPBOX_TOKEN_URL = 'https://api.dropboxapi.com/oauth2/token';

export async function initiateDropboxAuthAction(data: { clientId: any;
                                                        redirectUri: any;
                                                        state: any; }): Promise<string> {
  const ctx = { name: 'dropbox-auth-initiate' };
  
  try {
    // const params = new URLSearchParams({
    //   client_id: process.env['PUBLIC_DROPBOX_CLIENT_ID']!,
    //   response_type: 'code',
    //   redirect_uri: `${process.env['PUBLIC_APP_URL']}/api/dropbox/oauth2`,
    //   state: /* data.state ??  */crypto.randomUUID(),
    //   token_access_type: 'online',
    // });
    const params = new URLSearchParams({
      client_id: data.clientId,
      response_type: 'code',
      redirect_uri: data.redirectUri,
      state: data.state ?? crypto.randomUUID(),
      token_access_type: 'online',
    });

    const authUrl = `${DROPBOX_AUTH_URL}?${params.toString()}`;
    console.info(ctx, 'Dropbox OAuth flow initiated');
    
    return authUrl;
  } catch (error) {
    console.error(ctx, 'Failed to initiate Dropbox OAuth', { error });
    throw error;
  }
}

export async function exchangeDropboxCodeAction(data: { clientId: any;
                                                        redirectUri: any;
                                                        state: any;
                                                        code: any;
                                                        clientSecret: any;
                                                        grantCode: any;}) {
  const ctx = { name: 'dropbox-token-exchange' };

  console.info(ctx, 'Exchanging code for token');
  console.info(ctx, `code: ${data.code}`);
  console.info(ctx, `clientID: ${data.clientId}`);
  console.info(ctx, `secret: ${data.clientSecret}`);
  console.info(ctx, `redirect: ${data.redirectUri}`);
  console.info(ctx, `grantCode: ${data.grantCode}`);

  if (data.clientId == undefined || data.clientSecret == undefined) {
    console.warn('no data for oauth2');
    return '';
  }
  
  const response = await fetch(DROPBOX_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code: data.code,
      grant_type: data.grantCode,
      client_id: data.clientId,
      client_secret: data.clientSecret,
      redirect_uri: data.redirectUri,
    }),
  });

  if (!response.ok) {
    const responseBody = await response.text();
    return responseBody;
  }

  const token = await response.json();
  console.info(ctx, 'Token exchange successful');
  
  return token;
}

export async function completeTokenExchange(token: any) {
  //storeOrUpdateToken(token, 'dropbox');
}