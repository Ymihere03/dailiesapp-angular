'use server'

import { createClient } from "@/utils/supabase/server"

export async function createOrgMembership(
  org_id: string,
  user_id: string,
  role: string = 'Member',
  status: string = 'Active'
): Promise<boolean> {
  try {
    const ctx = { name: "createOrgMembership" };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    console.debug(ctx, 'owner id: ', user.id);
    console.debug(ctx, 'orgid: ', org_id);
    console.debug(ctx, 'role: ', role);
    console.debug(ctx, 'status: ', status);

    const { data, error } = await supabase
      .from('Org_memberships')
      .insert({
        org_id: org_id,
        user_id: user.id,
        role: role,
        status: status,
        last_updated: new Date().toISOString()
      });

    if (error) {
      console.log(ctx, 'Organization membership failed to create', error);
      return false;
    }

    console.log(ctx, 'Organization membership created successfully');
    return true;
  } catch (error) {
    console.error('Error creating organization membership:', error);
    throw error;
  }
}

export async function getOrgIdByUser(
  user_id: string
): Promise<string | null> {
  try {
    const ctx = { name: "getOrgIdByUser" };
    const supabase = await createClient();
    
    // Query Org_memberships table for the org_id
    const { data, error } = await supabase
      .from('Org_memberships')
      .select('org_id')
      .eq('user_id', user_id)
      .eq('status', 'Active')
      .maybeSingle();

    if (error) {
      console.error(ctx, 'Error fetching org_id:', error);
      throw error;
    }

    if (!data) {
      console.debug(ctx, 'No active organization found for user:', user_id);
      return null;
    }

    console.debug(ctx, 'Found org_id:', data.org_id, 'for user:', user_id);
    return data.org_id;
  } catch (error) {
    console.error('Error in getOrgIdByUser:', error);
    throw error;
  }
}

