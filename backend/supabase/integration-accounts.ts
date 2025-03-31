'use server'

import { createClient } from "../../utils/supabase/server"
import { encrypt, decrypt } from '../../utils/encryption'
import { SupabaseClient, User, createClient as createAdminClient } from "@supabase/supabase-js";

export type Integration_account = {
  auth_id: string,
  expires_at: Date,
  account_id: string,
  access_token: string
};

export async function storeOrUpdateToken(
  token: any,
  provider: string
): Promise<void> {
  try {
    const ctx = {name: "storeOrUpdateToken"}
    const supabase = await createClient();
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) throw new Error('No user found');

    // Check if the token in the db exists and is expired
    const isExpired = await isTokenExpired(supabase, user.data.user, provider);

    if(isExpired == null) {
      console.log("Token not present...storing");
      // Insert new token
      await storeEncryptedToken(token, provider);
      return;
    }
    
    console.log("Token is already present...updating");
    // Update existing token
    const data = await getRowAndUserID(supabase, user.data.user, provider);
    if(data != null) {
      await updatedEncryptedToken(supabase, user.data.user, data.row_id, token, provider);
    }

  } catch (error) {
    console.error('Error in storeOrUpdateToken:', error);
    throw error;
  }
}

async function storeEncryptedToken(
  token: any,
  provider: string
): Promise<void> {
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();
    
    // Encrypt the token using server-side encryption
    const { encrypted, iv } = await encrypt(token.access_token);

    // Store in Supabase
    const { data, error } = await supabase
      .from('Integration_accounts')
      .insert({
        access_token: encrypted,
        iv: iv,
        expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        scope: token.scope,
        account_id: token.account_id,
        user_id: user.data.user?.id,
        provider: provider,
        last_updated: new Date().toISOString()
      }).select();

      console.log(error)
    if (error) throw error
    else {
      console.log('Token stored successfully');
    }
  } catch (error) {
    console.error('Error storing encrypted token:', error)
    throw error
  }
}

async function updatedEncryptedToken(
  supabase: SupabaseClient,
  user: User,
  id: string,
  token: any,
  provider: string
): Promise<void> {
  const ctx = { name: "updateEncryptedToken" };
  try {
    
    // Encrypt the token using server-side encryption
    const { encrypted, iv } = await encrypt(token.access_token);

    console.log(ctx, "attempting to update row id ", id);

    // Update in Supabase
    const { data, error } = await supabase
      .from('Integration_accounts')
      .upsert({
        id: id,
        access_token: encrypted,
        iv: iv,
        expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        scope: token.scope,
        last_updated: new Date().toISOString(),
        user_id: user.id,
        account_id: token.account_id,
        provider: provider
      }, { onConflict: 'id' })
      .eq('user_id', user.id)
      .eq('provider', provider);

    if (error) throw error;
    console.log('Token updated successfully');
  } catch (error) {
    console.error('Error updating encrypted token:', error);
    throw error;
  }
}

async function isTokenExpired(
  supabase: SupabaseClient,
  user: User,
  provider: string
): Promise<boolean | null> {
  const ctx = { name: "isTokenExpired" };
  try {
    
    console.debug(ctx, "check user ", user.id);

    // Retrieve from Supabase
    const { data, error } = await supabase
      .from('Integration_accounts')
      .select('expires_at, provider')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle()
    
    if (error) throw error;

    console.debug(ctx, "is expired data", data);
    console.debug(ctx, new Date(data?.expires_at).getTime(), " < ", Date.now());

    return data ? new Date(data.expires_at).getTime() < Date.now() : null;
  } catch (error) {
    console.error('Error checking expired status on token:', error)
    throw error
  }
}

async function getRowAndUserID(
  supabase: SupabaseClient,
  user: User,
  provider: string
): Promise<{row_id: string, user_id: string} | null> {
  const ctx = { name: "integration-accounts-getRowAndUserID" };
  try {

    // Retrieve from Supabase
    const { data, error } = await supabase
      .from('Integration_accounts')
      .select('id, user_id')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle()
    
    if (error) throw error;
    if (!data?.id) {
      console.debug(ctx, "id not found");
      return null;
    }

    return {row_id: data.id, user_id: data.user_id};
  } catch (error) {
    console.error('Error checking expired status on token:', error)
    throw error
  }
}

export async function retrieveAndDecryptToken(
  provider: string
): Promise<Integration_account | null> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('User not authenticated');
      return null;
    }
    
    // Retrieve from Supabase
    const { data, error } = await supabase
      .from('Integration_accounts')
      .select('access_token, iv, expires_at, scope, account_id, created_at, provider')
      .eq('user_id', user.id)
      .eq('provider', provider)
      .maybeSingle()

    if (error) throw error
    if (!data) return null

    // Decrypt the token using server-side encryption
    const decryptedToken = await decrypt(data.access_token, data.iv)

    
    return {
      auth_id: user.id,
      expires_at: data.expires_at,
      account_id: data.account_id,
      access_token: decryptedToken
    }
  } catch (error) {
    console.error('Error retrieving/decrypting token:', error)
    throw error
  }
}

export async function retrieveAndDecryptTokenByUserID(
  dbx_account_id: string, 
  provider: string
): Promise<Integration_account | null> {
  try {
    // Create admin client using service_role key
    const supabase = createAdminClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!
    );

    const { data , error } = await supabase
      .from('Integration_accounts')
      .select('user_id, expires_at, account_id, access_token, iv')
      .eq('account_id', dbx_account_id)
      .eq('provider', provider)
      .single();

    if (error || !data) {
      console.error('No account found for Dropbox ID:', dbx_account_id);
      return null;
    }

    // Check if user is active in auth.users
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(data.user_id);

    if (userError || !userData.user) {
      console.error('User not found or inactive:', data.user_id);
      return null;
    }

    return {
      auth_id: userData.user.id,
      access_token: await decrypt(data.access_token, data.iv),
      expires_at: data.expires_at,
      account_id: data.account_id
    }
  } catch (error) {
    console.error('Error retrieving/decrypting token by user id:', error)
    throw error
  }
}