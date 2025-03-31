'use server'

import { createClient } from "@/utils/supabase/server"
import { SupabaseClient, User, createClient as createAdminClient } from "@supabase/supabase-js";

export async function createProjectMembership(
  project_id: string,
  user_id: string,
  role: string = 'Member',
  status: string = 'Active'
): Promise<boolean> {
  try {
    const ctx = { name: "createProjectMembership" };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    console.debug(ctx, 'owner id: ', user.id);
    console.debug(ctx, 'role: ', role);
    console.debug(ctx, 'status: ', status);

    const { data, error } = await supabase
      .from('Project_memberships')
      .insert({
        project_id: project_id,
        user_id: user.id,
        role: role,
        status: status,
        last_updated: new Date().toISOString()
      });

    if (error) {
      console.log(ctx, 'Project membership failed to create', error);
      return false;
    }

    console.log(ctx, 'Project membership created successfully');
    return true;
  } catch (error) {
    console.error('Error creating Project membership:', error);
    throw error;
  }
}

export async function getMyProjectMemberships(): Promise<string[]> {
  try {
    const ctx = { name: "getMyProjects" };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Get all active project memberships for the user
    const { data, error } = await supabase
      .from('Project_memberships')
      .select('project_id')
      .eq('user_id', user.id)
      .eq('status', 'Active');

    if (error) {
      console.error(ctx, 'Error fetching project memberships:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.debug(ctx, 'No projects found for user:', user.id);
      return [];
    }

    // Extract project IDs from the results
    const projectIds = data.map(membership => membership.project_id);
    console.debug(ctx, 'Found projects:', projectIds, 'for user:', user.id);
    
    return projectIds;
  } catch (error) {
    console.error('Error in getMyProjects:', error);
    throw error;
  }
}

export async function getProjectMembershipsByUserID(
  user_id: string
): Promise<string[]> {
  try {
    const ctx = { name: "getProjectMembershipsByUserID" };
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

    // Get all active project memberships for the user
    const { data, error } = await supabase
      .from('Project_memberships')
      .select('project_id')
      .eq('user_id', userData.user.id)
      .eq('status', 'Active');

    if (error) {
      console.error(ctx, 'Error fetching project memberships:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.debug(ctx, 'No projects found for user:', userData.user.id);
      return [];
    }

    // Extract project IDs from the results
    const projectIds = data.map(membership => membership.project_id);
    console.debug(ctx, 'Found projects:', projectIds, 'for user:', userData.user.id);
    
    return projectIds;
  } catch (error) {
    console.error('Error in getMyProjects:', error);
    throw error;
  }
}