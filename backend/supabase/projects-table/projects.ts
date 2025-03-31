'use server'

import { createClient } from "@/utils/supabase/server"
import { createProjectMembership, getMyProjectMemberships, getProjectMembershipsByUserID } from "../project-memerships-table/project-memberships";
import { getOrgIdByUser } from "../org-memberships-table/org-memberships";
import { SupabaseClient, User, createClient as createAdminClient } from "@supabase/supabase-js";

export async function initProject(
  name: string,
  description: string = ''
) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
    
  if (!user.data.user) throw new Error('No user found');

  const orgId = await getOrgIdByUser(user.data.user.id);
  if (orgId) {
    const projectId = await createProject(orgId, name, description);
    if (projectId) {
      await createProjectMembership(projectId, user.data.user.id, 'Owner');
    }
  }
}

async function createProject(
  org_id: string,
  name: string,
  description: string = ''
): Promise<string | null> {
  const ctx = { name: "createProject" };
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();
    
    const user2 = user.data.user;
    if (!user2) {
      throw new Error('User not authenticated');
    }


    if (await projectExists(name)) {
      console.error(`Project ${name} already exists.`);
      return null;
    }

    const { data, error } = await supabase
      .from('Projects')
      .insert({
        name: name,
        description: description,
        owner_id: user2.id,
        org_id: org_id,
        last_updated: new Date().toISOString()
      }).select().single();

    if (error) throw error;
    console.log('Project created successfully', data);
    return data.id;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
}

export async function projectExists(
  name: string
): Promise<boolean> {
  try {
    const ctx = { name: "projectExists" };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if org exists in Supabase
    const { data, error } = await supabase
      .from('Projects')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    
    if (error) {
      console.debug(ctx, "project already exists check for name", name, "result:", data !== null);
      throw error;
    }

    return data !== null;
  } catch (error) {
    console.error('Error checking if project exists:', error);
    throw error;
  }
}

export async function getMyProjects(
): Promise<{id: string, name: string, description: string}[]> {
  try {
    const ctx = { name: "getMyProjects" };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const projectIDs = await getMyProjectMemberships();

    // Check if org exists in Supabase
    const { data, error } = await supabase
      .from('Projects')
      .select('id, name, description')
      .in('id', projectIDs)
    
    if (error) {
      console.debug(ctx, "get my projects error", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error checking if project exists:', error);
    throw error;
  }
}

export async function getProjectsByUserID(
  user_id: string
): Promise<{id: string, name: string, description: string}[]> {
  try {
    const ctx = { name: "getProjectsByUserID" };
    // Create admin client using service_role key
    const supabase = createAdminClient(
      process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!
    );

    // Check if user is active in auth.users
    const { data: userData, error: userError } = await supabase
      .auth.admin.getUserById(user_id);

    if (userError || !userData.user) {
      console.error('User not found or inactive:', user_id);
      return [];
    }

    const projectIDs = await getProjectMembershipsByUserID(userData.user.id);

    // Check if org exists in Supabase
    const { data, error } = await supabase
      .from('Projects')
      .select('id, name, description')
      .in('id', projectIDs)
    
    if (error) {
      console.debug(ctx, "get projects by error", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error checking if project exists:', error);
    throw error;
  }
}