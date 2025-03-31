'use server'

import { createClient } from "@/utils/supabase/server"
import { SupabaseClient, User, createClient as createAdminClient } from "@supabase/supabase-js";
import { Integration_account } from "../integration-accounts";
import { dbxFolderObject, getFolder } from "../folders-table/folders";

export async function initFeed(
  project_id: string,
  name: string,
  provider: string,
  description: string = '',
) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
    
  if (!user.data.user) throw new Error('No user found');

  const feedId = await createFeed(project_id, name, provider, description);
}

async function createFeed(
  project_id: string,
  name: string,
  provider: string,
  description: string = ''
): Promise<string | null> {
  const ctx = { name: "createFeed" };
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();
    
    const user2 = user.data.user;
    if (!user2) {
      throw new Error('User not authenticated');
    }

    const feedData = await getMyFeeds(project_id);
    if (feedData.length === 1) {
      console.log("Already have one feed. Can not create another");
      return null;
    }

    if (await feedExists(name)) {
      console.error(`Feed ${name} already exists.`);
      return null;
    }

    const { data, error } = await supabase
      .from('Feeds')
      .insert({
        name: name,
        description: description,
        owner_id: user2.id,
        project_id: project_id,
        provider: provider,
        last_updated: new Date().toISOString()
      }).select().single();

    if (error) throw error;
    console.log('Feed created successfully', data);
    return data.id;
  } catch (error) {
    console.error('Error creating feed:', error);
    throw error;
  }
}

export async function feedExists(
  name: string
): Promise<boolean> {
  try {
    const ctx = { name: "feedExists" };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if org exists in Supabase
    const { data, error } = await supabase
      .from('Feeds')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    
    if (error) {
      console.debug(ctx, "feed already exists check for name", name, "result:", data !== null);
      throw error;
    }

    return data !== null;
  } catch (error) {
    console.error('Error checking if feed exists:', error);
    throw error;
  }
}

export async function getMyFeeds(
  project_id: string
): Promise<{id: string, name: string, description: string}[]> {
  try {
    const ctx = { name: "getMyFeeds" };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if org exists in Supabase
    const { data, error } = await supabase
      .from('Feeds')
      .select('id, name, description')
      .eq('project_id', project_id)
    
    if (error) {
      console.debug(ctx, "get my projects error", error);
      throw error;
    }

    if (data) {
      return data;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error checking if project exists:', error);
    throw error;
  }
}

export async function getFeedsByUserID(
  user_id: string,
  project_id: string
): Promise<{id: string, name: string, description: string}[]> {
  try {
    const ctx = { name: "getMyFeeds" };
    // Create admin client using service_role key
    const supabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user is active in auth.users
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(user_id);

    if (userError || !userData.user) {
      console.error('User not found or inactive:', user_id);
      return [];
    }

    // Check if org exists in Supabase
    const { data, error } = await supabase
      .from('Feeds')
      .select('id, name, description')
      .eq('project_id', project_id)
    
    if (error) {
      console.debug(ctx, "get my projects error", error);
      throw error;
    }

    if (data) {
      return data;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error checking if project exists:', error);
    throw error;
  }
}

// export async function storeRootFolder(
//   user: Integration_account,
//   feed_id: string,
//   root_folder_id: string, 
//   provider: string
// ): Promise<void> {
//   const ctx = { name: "feeds-storeRootFolder" };
//   try {
//     // Create admin client using service_role key
//     const supabase = createAdminClient(
//       process.env.NEXT_PUBLIC_SUPABASE_URL!,
//       process.env.SUPABASE_SERVICE_ROLE_KEY!
//     );

//     // Check if user is active in auth.users
//     const { data: userData, error: userError } = await supabase
//       .auth.admin.getUserById(user.auth_id);

//     if (userError || !userData.user) {
//       console.error('User not found or inactive:', userData.user?.id);
//       return;
//     }

//     // Store in Supabase
//     const { data, error } = await supabase
//       .from('Feeds')
//       .update({
//         root_folder_id: root_folder_id,
//         provider: provider,
//         last_updated: new Date().toISOString()
//       })
//       .eq('id', feed_id)
//       .select();

//       console.log(error)
//     if (error) throw error
//     else {
//       console.log(ctx, 'Root folder stored successfully');
//     }
//   } catch (error) {
//     console.error('Error linking root folder id:', error)
//     throw error
//   }
// }