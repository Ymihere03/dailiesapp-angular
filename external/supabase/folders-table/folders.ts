'use server'

import { createClient } from "@/utils/supabase/server"
import { createClient as createAdminClient, SupabaseClient, User  } from "@supabase/supabase-js";
import { Integration_account, retrieveAndDecryptToken } from "../integration-accounts";

export type dbxFolderObject = {
  id: string,
  parent_folder_id: string | null,
  feed_id: string,
  name: string,
  path: string,
  dbx_id: string,
  cursor: string
}

export async function storeOrUpdateFolderByUserID(
  user: Integration_account,
  dbxObject: dbxFolderObject
): Promise<string> {
  try {
    const ctx = {name: "storeOrUpdateFolderByUserID"}
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
      return '';
    }

    // Check if the token in the db exists and is expired
    const exists = await folderExists(userData.user.id, dbxObject.path);

    let folderID = '';
    if(exists) {
      folderID = await updateFolder(supabase, userData.user, dbxObject);
    } else {
      console.log("attempting to insert folder ", dbxObject.name, " path: ", dbxObject.path);
      folderID = await storeFolder(supabase, userData.user, dbxObject)
    }
    return folderID;
  } catch (error) {
    console.error('Error in storeOrUpdateFolder:', error);
    throw error;
  }
}

export async function getFoldersByFeed(
  user: Integration_account,
  feed_id: string
): Promise<dbxFolderObject[] | null> {
  try {
    const ctx = {name: "getFolder"}
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
      .from('Folders')
      .select('id, created_at, feed_id, owner_id, dbx_id, dbx_cursor, name, path, last_updated, parent_folder_id')
      .eq('owner_id', userData.user?.id)
      .eq('feed_id', feed_id)
      .select();
    
    if (error) throw error;

    let returnObj: dbxFolderObject[] = [];

    // Push root folder first
    data.forEach(folder => {
      if (!folder.parent_folder_id) {
        returnObj.push({
          id: folder.id,
          parent_folder_id: folder.parent_folder_id,
          feed_id: folder.feed_id,
          name: folder.name,
          path: folder.path,
          dbx_id: folder.dbx_id,
          cursor: folder.dbx_cursor
        });
      }
    });

    // Push all non-root folders
    data.forEach(folder => {
      if (folder.parent_folder_id) {
        returnObj.push({
          id: folder.id,
          parent_folder_id: folder.parent_folder_id,
          feed_id: folder.feed_id,
          name: folder.name,
          path: folder.path,
          dbx_id: folder.dbx_id,
          cursor: folder.dbx_cursor
        });
      }
    });
    
    if (returnObj.length > 0)
      return returnObj;
    else
      return null;
  } catch (error) {
    console.error('Error in getFolder:', error);
    throw error;
  }
}

export async function getFolders(
  user_id: string
): Promise<dbxFolderObject[] | null> {
  try {
    const ctx = {name: "getFolder"}
    // Create admin client using service_role key
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user is active in auth.users
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(user_id);

    if (userError || !userData.user) {
      console.error('User not found or inactive:', userData.user?.id);
      return null;
    }

    // Check if folder exists in Supabase
    const { data, error } = await supabase
      .from('Folders')
      .select('id, created_at, feed_id, owner_id, dbx_id, dbx_cursor, name, path, last_updated, parent_folder_id')
      .eq('owner_id', userData.user?.id)
      .select();
    
    if (error) throw error;

    let returnObj: dbxFolderObject[] = [];

    // Push root folder first
    data.forEach(folder => {
      if (!folder.parent_folder_id) {
        returnObj.push({
          id: folder.id,
          parent_folder_id: folder.parent_folder_id,
          feed_id: folder.feed_id,
          name: folder.name,
          path: folder.path,
          dbx_id: folder.dbx_id,
          cursor: folder.dbx_cursor
        });
      }
    });

    // Push all non-root folders
    data.forEach(folder => {
      if (folder.parent_folder_id) {
        returnObj.push({
          id: folder.id,
          parent_folder_id: folder.parent_folder_id,
          feed_id: folder.feed_id,
          name: folder.name,
          path: folder.path,
          dbx_id: folder.dbx_id,
          cursor: folder.dbx_cursor
        });
      }
    }); 
    
    if (returnObj.length > 0)
      return returnObj;
    else
      return null;
  } catch (error) {
    console.error('Error in getFolder:', error);
    throw error;
  }
}

export async function getFolder(
  path: string
): Promise<dbxFolderObject | null> {
  try {
    const ctx = {name: "getFolder"}
    const supabase = await createClient();
    const user = await supabase.auth.getUser();

    // Check if folder exists in Supabase
    const { data, error } = await supabase
      .from('Folders')
      .select('id, created_at, owner_id, feed_id, dbx_id, dbx_cursor, name, path, last_updated, parent_folder_id')
      .eq('owner_id', user.data.user?.id)
      .eq('path', path)
      .maybeSingle();
    
    if (error) throw error;

    if (data)
      return {
        id: data.id,
        parent_folder_id: data.parent_folder_id,
        feed_id: data.feed_id,
        name: data.name,
        path: data.path,
        dbx_id: data.dbx_id,
        cursor: data.dbx_cursor
    };
    else
      return null;
  } catch (error) {
    console.error('Error in getFolder:', error);
    throw error;
  }
}

async function folderExists(
  user_id: string,
  path: string
): Promise<boolean> {
  try {
    const ctx = { name: "folderExists" };
    const supabase = await createClient();

    // Check if folder exists in Supabase
    const { data, error } = await supabase
      .from('Folders')
      .select('owner_id, path')
      .eq('owner_id', user_id)
      .eq('path', path)
      .maybeSingle();
    
    if (error) throw error;
    console.debug(ctx, "folder exists check for path", path, "result:", data !== null);

    return data !== null;
  } catch (error) {
    console.error('Error checking if folder exists:', error);
    throw error;
  }
}

async function storeFolder(
  supabase: SupabaseClient,
  user: User,
  dbxObject: dbxFolderObject
): Promise<string> {
  try {

    // Store in Supabase
    const { data, error } = await supabase
      .from('Folders')
      .insert({
        feed_id: dbxObject.feed_id,
        parent_folder_id: dbxObject.parent_folder_id,
        name: dbxObject.name,
        path: dbxObject.path,
        dbx_cursor: dbxObject.cursor,
        owner_id: user.id,
        dbx_id: dbxObject.dbx_id,
        last_updated: new Date().toISOString()
      }).select().single();

      console.log(error)
    if (error) throw error
    else {
      console.log('Folder stored successfully');
      return data.id;
    }
  } catch (error) {
    console.error('Error storing folder:', error)
    throw error
  }
}

async function updateFolder(
  supabase: SupabaseClient,
  user: User,
  dbxObject: dbxFolderObject
): Promise<string> {
  try {

    // Store in Supabase
    const { data, error } = await supabase
      .from('Folders')
      .update({
        name: dbxObject.name,
        path: dbxObject.path,
        dbx_cursor: dbxObject.cursor,
        last_updated: new Date().toISOString()
      })
      .eq('owner_id', user.id)
      .eq('path', dbxObject.path)
      .select().single();

    if (error) throw error
    else {
      console.log('Folder ', dbxObject.path, 'updated successfully');
      return data.id;
    }
  } catch (error) {
    console.error('Error updating folder:', error)
    throw error
  }
}

export async function deleteFolderByUserID(
  user: Integration_account,
  dbxObject: dbxFolderObject
): Promise<boolean> {
  try {
    const ctx = { name: "deleteFolderByUserID" };
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
      .from('Folders')
      .delete()
      .eq('parent_folder_id', dbxObject.parent_folder_id)
      .eq('name', dbxObject.name)
      .eq('owner_id', userData.user.id)
      .select().maybeSingle();
    
    if (error) {
      console.error(ctx, 'Error deleting folder:', error);
      throw error;
    }

    console.log(ctx, 'Delete folder result, path:', data);
    if (!data) {
      console.log(ctx, 'Delete record not found in folders, path:', dbxObject.path);
      return false;
    }

    console.log(ctx, 'Folder successfully deleted, path:', dbxObject.path);
    return true;
  } catch (error) {
    console.error('Error in deleteFolder:', error);
    throw error;
  }
}

export async function deleteFolder(
  dbxObject: dbxFolderObject
): Promise<boolean> {
  try {
    const ctx = { name: "deleteFolder" };
    const supabase = await createClient();
    //const user = await supabase.auth.getUser();

    // Delete folder from Supabase
    const { data, error } = await supabase
      .from('Folders')
      .delete()
      .eq('id', dbxObject.id)
      .select().maybeSingle();
    
    if (error) {
      console.error(ctx, 'Error deleting folder:', error);
      throw error;
    }

    console.log(ctx, 'Delete folder result, path:', data);
    if (!data) {
      console.log(ctx, 'Delete record not found in folders, path:', dbxObject.path);
      return false;
    }

    console.log(ctx, 'Folder successfully deleted, path:', dbxObject.path);
    return true;
  } catch (error) {
    console.error('Error in deleteFolder:', error);
    throw error;
  }
}

export async function getRootFolder(
  feed_id: string
): Promise<dbxFolderObject | null> {
  const ctx = { name: "feeds-getRootFolder" };
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("getting root for feed ", feed_id);
    const { data, error } = await supabase
      .from('Folders')
      .select(`
        id,
        parent_folder_id, 
        feed_id, 
        name, 
        path, 
        dbx_cursor
      `)
      .eq('feed_id', feed_id)
      .is('parent_folder_id', null)
      .select().single();

    if (error) {
      console.error(ctx, 'Error retrieving root folder:', error);
      throw error
    }

    if (!data) {
      console.log(ctx, 'Root folder not found for feed:', feed_id);
      return null;
    }

    console.log(ctx, 'Root folder retrieved successfully', data);

    return {
      id: data.id,
      parent_folder_id: data.parent_folder_id,
      feed_id: data.feed_id,
      name: data.name,
      path: data.path,
      dbx_id: data.dbx_id,
      cursor: data.dbx_cursor
    }
  } catch (error) {
    console.error('Error retrieving root folder id:', error)
    throw error
  }
}

export async function getRootFolderByUserID(
  user: Integration_account,
  feed_id: string
): Promise<dbxFolderObject | null> {
  const ctx = { name: "feeds-getRootFolderByUserID" };
  try {
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
      return null;
    }

      // Store in Supabase
      const { data, error } = await supabase
        .from('Folders')
        .select(`
          id,
          parent_folder_id, 
          feed_id, 
          name, 
          path, 
          dbx_cursor
        `)
        .eq('user_id', userData.user.id)
        .eq('feed_id', feed_id)
        .is('parent_folder_id', null)
        .select().single();

      if (error) {
        console.error(ctx, 'Error retrieving root folder:', error);
        throw error
      }
  
      if (!data) {
        console.log(ctx, 'Root folder not found for feed:', feed_id);
        return null;
      }
  
      console.log(ctx, 'Root folder retrieved successfully', data);
  
      return {
        id: data.id,
        parent_folder_id: data.parent_folder_id,
        feed_id: data.feed_id,
        name: data.name,
        path: data.path,
        dbx_id: data.dbx_id,
        cursor: data.dbx_cursor
      }
  } catch (error) {
    console.error('Error retrieving root folder id:', error)
    throw error
  }
}