'use server'

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient, SupabaseClient, User  } from "@supabase/supabase-js";
import { Integration_account, retrieveAndDecryptToken } from "../integration-accounts";

export type dbxFileObject = {
  id: string,
  name: string,
  path: string,
  dbx_id: string,
  parent_folder_id: string
}

export async function storeOrUpdateFile(
  dbxFile: dbxFileObject
): Promise<string> {
  try {
    const ctx = {name: "storeOrUpdateFile"}
    const supabase = await createClient();
    const user = await supabase.auth.getUser();
    
    if (!user.data.user) throw new Error('No user found');
    //const data = await getRowAndUserID(supabase, user.data.user, provider);
    console.log(ctx, "regular access with ", user.data.user.id);
    return await handleFileUpdate(supabase, user.data.user, ctx, dbxFile);
  } catch (error) {
    console.error('Error in storeOrUpdateFile:', error);
    throw error;
  }
}

export async function storeOrUpdateFileByUserID(
  user: Integration_account,
  dbxFile: dbxFileObject
): Promise<string> {
  try {
    const ctx = {name: "storeOrUpdateFileByUserID"}
    // Create admin client using service_role key
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user is active in auth.users
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(user.auth_id);

    if (userError || !userData.user) {
      console.error('User not found or inactive:', user.auth_id);
      return '';
    }
    
    return await handleFileUpdate(supabase, userData.user, ctx, dbxFile);
  } catch (error) {
    console.error('Error in storeOrUpdateFileByUserID:', error);
    throw error;
  }
}

async function handleFileUpdate(
  supabase: SupabaseClient,
  user: User,
  ctx: {name: string},
  dbxFile: dbxFileObject
): Promise<string> {
  //const userAcct = await retrieveAndDecryptToken('dropbox');

  // Check if the token in the db exists and is expired
  const exists = await fileExists(user.id, dbxFile.path);

  if(exists) {
    console.log(ctx, "attempting to update file ", dbxFile.name, " path: ", dbxFile.path);
    await updateFile(supabase, user, dbxFile);
  } else {
    console.log(ctx, "attempting to insert file ", dbxFile.name, " path: ", dbxFile.path);
    await storeFile(supabase, user, dbxFile)
  }
  return '';
}

async function fileExists(
  user_id: string,
  path: string
): Promise<boolean> {
  try {
    const ctx = { name: "fileExists" };
    const supabase = await createClient();

    // Check if file exists in Supabase
    const { data, error } = await supabase
      .from('Files')
      .select('id')
      .eq('owner_id', user_id)
      .eq('path', path)
      .maybeSingle();
    
    if (error) throw error;
    console.debug(ctx, "file exists check for path", path, "result:", data !== null);

    return data !== null;
  } catch (error) {
    console.error('Error checking if file exists:', error);
    throw error;
  }
}

async function updateFile(
  supabase: SupabaseClient,
  user: User,
  dbxFile: dbxFileObject
): Promise<void> {
  try {

    // Update in Supabase
    const { data, error } = await supabase
      .from('Files')
      .update({
        name: dbxFile.name,
        path: dbxFile.path,
        last_updated: new Date().toISOString()
      })
      .eq('owner_id', user.id)
      .eq('path', dbxFile.path)
      .select();

    if (error) throw error;
    console.log('File updated successfully');
    //return data[0].id;
  } catch (error) {
    console.error('Error updating file:', error);
    throw error;
  }
}

async function storeFile(
  supabase: SupabaseClient,
  user: User,
  dbxFile: dbxFileObject
): Promise<void> {
  try {

    // Store in Supabase
    const { data, error } = await supabase
      .from('Files')
      .insert({
        owner_id: user.id,
        parent_folder_id: dbxFile.parent_folder_id,
        name: dbxFile.name,
        path: dbxFile.path,
        dbx_id: dbxFile.dbx_id,
        last_updated: new Date().toISOString()
      })
      .select();

    if (error) throw error;
    console.log('File stored successfully');
    //return data[0].id;
  } catch (error) {
    console.error('Error storing file:', error);
    throw error;
  }
}

export async function deleteFile(
  user: Integration_account,
  dbxFile: dbxFileObject
): Promise<boolean> {
  try{
    const ctx = { name: "deleteFolder" };
    // Create admin client for secure operations
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user is active in auth.users
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(user.auth_id);

    if (userError || !userData.user) {
      console.error('User not found or inactive:', user.auth_id);
      return false;
    }

    // Delete folder from Supabase
    const { data, error } = await supabase
      .from('Files')
      .delete()
      .eq('path', dbxFile.path)
      .eq('parent_folder_id', dbxFile.parent_folder_id)
      .select().maybeSingle();
    
    if (error) {
      console.error(ctx, 'Error deleting file:', error);
      throw error;
    }

    console.log(ctx, 'Delete file result, path:', data);
    if (!data) {
      console.log(ctx, 'Delete record not found in files, path:', dbxFile.path);
      return false;
    }

    console.log(ctx, 'Folder successfully deleted, path:', dbxFile.path);
    return true;
  } catch (error) {
    console.error('Error in deleteFolder:', error);
    throw error;
  }
}

export async function getFilesByFolderIDs(
  user: Integration_account,
  folder_ids: string[]
): Promise<dbxFileObject[] | null> {
  const ctx = { name: "getFilesByFolderIDs" };
  try{
    // Create admin client using service_role key
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user is active in auth.users
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(user.auth_id);

    if (userError || !userData.user) {
      console.error('User not found or inactive:', userData.user?.id);
      return null;
    }

    // Check if folder exists in Supabase
    const { data, error } = await supabase
      .from('Files')
      .select('owner_id, dbx_id, name, path, parent_folder_id')
      .eq('owner_id', userData.user.id)
      .in('parent_folder_id', folder_ids)
      .select();

    let returnObj: dbxFileObject[] = [];

    if (data) {
      data.forEach(file => {
        returnObj.push({
          id: '',
          parent_folder_id: file.parent_folder_id,
          name: file.name,
          path: file.path,
          dbx_id: file.dbx_id
        });
      });
    }
    
    if (returnObj.length > 0)
      return returnObj;
    else
      return null;
  } catch (error) {
    console.error('Error in getFilesByFolderIDs:', error);
    throw error;
  }
}