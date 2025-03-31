'use server'

import { createClient } from "@/utils/supabase/server";
import { createOrgMembership } from "../org-memberships-table/org-memberships";

export async function initOrg(
  name: string,
  email: string = ''
) {
  const supabase = await createClient();
  const user = await supabase.auth.getUser();
    
  if (!user.data.user) throw new Error('No user found');

  const orgId = await createOrg(name, email);
  if (orgId == '') {
    return;
  }
  await createOrgMembership(orgId, user.data.user.id, 'Owner');
}

async function createOrg(
  name: string,
  email: string = ''
): Promise<string> {
  const ctx = { name: "createOrg" };
  try {
    const supabase = await createClient();
    const user = await supabase.auth.getUser();
    
    const user2 = user.data.user;
    if (!user2) {
      throw new Error('User not authenticated');
    }


    if (await orgExists(name)) {
      console.error(`Org ${name} already exists.`);
      return '';
    }

    const { data, error } = await supabase
      .from('Orgs')
      .insert({
        name: name,
        email: email || user2.email,
        created_by: user2.id,
        owner_id: user2.id,
        updated_by: user2.id,
        last_updated: new Date().toISOString()
      }).select().single();

    if (error) throw error;
    console.log('Organization created successfully', data);
    return data.id;
  } catch (error) {
    console.error('Error creating organization:', error);
    throw error;
  }
}

export async function orgExists(
  name: string
): Promise<boolean> {
  try {
    const ctx = { name: "orgExists" };
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Check if org exists in Supabase
    const { data, error } = await supabase
      .from('Orgs')
      .select('id')
      .eq('name', name)
      .maybeSingle();
    
    if (error) throw error;
    console.debug(ctx, "org exists check for name", name, "result:", data !== null);

    return data !== null;
  } catch (error) {
    console.error('Error checking if org exists:', error);
    throw error;
  }
}