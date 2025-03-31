'use server'

import { getRootFolder } from "./folders";
import { dbxFolderObject, deleteFolder } from "./folders";

export async function deleteRootFolder(
  feed_id: string,
): Promise<boolean> {
  const ctx = {name: "deleteRootFolder"};

  const rootFolder = await getRootFolder(feed_id);

  if(rootFolder) {
    const result = await deleteFolder(rootFolder);
    return result;
  }
  return false;
}