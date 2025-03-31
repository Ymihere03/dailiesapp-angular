'use server'

import { checkForRetry } from "./dropbox-token-retry";

const DROPBOX_URL = 'https://api.dropboxapi.com/2/files';

export async function dbxCallAPI(
  api_url_suffix: string,
  params: any,
  token: string,
): Promise<any> {
  const ctx = { name: 'dbx-call-api' };

  console.log("Making Dropbox api call to ", api_url_suffix);
  try {
    const response = await fetch(`${DROPBOX_URL}${api_url_suffix}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      if (typeof response == 'object') {
        const error = await response.json();
        console.error("dbx error: ", error.error);
        console.error("dbx summary: ", error.error_summary);
        //checkForRetry(error, 1);
        throw new Error(`Dropbox API error: ${error.error}`);
      } else if (typeof response == 'string'){
        console.error(ctx, 'Failed on DBX API call: ', { response });
        console.error(ctx, 'API_URL: ', `${DROPBOX_URL}${api_url_suffix}`);
        console.error(ctx, 'Params: ', { params });
        throw new Error(`Dropbox API error: ${response}`);
      }
    }

    const data = await response.json();
    console.log(ctx, "response data: ", data);
    return data;
  } catch (error) {
    throw error;
  }
}