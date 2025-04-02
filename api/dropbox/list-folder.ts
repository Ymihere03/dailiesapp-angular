'use server';

import { Integration_account, retrieveAndDecryptToken, retrieveAndDecryptTokenByUserID } from "../supabase/integration-accounts-table/integration-accounts";
import { dbxCallAPI } from "./fetch-api";
import { storeOrUpdateFolderByUserID, getFolders, dbxFolderObject, deleteFolderByUserID} from "../supabase/folders-table/folders";
import { getMyFeeds } from "../supabase/feeds-table/feeds";
import { dbxFileObject, deleteFile, storeOrUpdateFileByUserID } from "../supabase/files-table/files";

const DROPBOX_PATH = '/Dailies/241209'; //TODO: This will eventually be user-supplied
//const DROPBOX_URL = 'https://api.dropboxapi.com/2/files';

export async function initializeDBXFolder(project_id: string, feed_id: string, selected_folder_name: string) {
  const ctx = { name: "initializeDBXFolder" };

  const acct = await retrieveAndDecryptToken('dropbox');
  
  const feedList = await getMyFeeds(project_id);

  // Begin the recursive sequence by loading the root dropbox folder
  if (acct != null && feedList.length > 0) {
     // TODO: this would need to change if we introduce the possiblility of multiple feeds
    const db_feed_id = feedList[0].id;

    if (db_feed_id == feed_id) {
      const dbxFolder: dbxFolderObject = {
        id: '',
        parent_folder_id: null,
        feed_id: feed_id,
        name: selected_folder_name.substring(1),
        path: selected_folder_name,
        dbx_id: '',
        cursor: ''
      }
  
      storeFolderContents(acct, db_feed_id, dbxFolder);
    }
  } else {
    console.log(ctx, "dropbox update ignored because no user account available (user is not active)")
  }
}

export async function initiateCheckDropboxUpdates(body: any) {
  const ctx = { name: "initiateCheckDropboxUpdates" };

  body["list_folder"]["accounts"].forEach(async (user_dbx_account_id: any) => {
    const acct = await retrieveAndDecryptTokenByUserID(user_dbx_account_id, 'dropbox');

    if (acct != null) {
      const folderData = await getFolders(acct.auth_id);
      if (folderData) {
        folderData.forEach(async folder => {
          const { entries, cursor } = await dbxListFolderContinue(acct, folder.cursor);
          folder.cursor = cursor;
          entries.forEach(async (entry: any) => {
            console.log(ctx, "updates required for ", folder.path);
            await handleDBXEntryUpdate(acct, folder, '', entry, folder.id);
            
            // Update folder cursor because there was a change
            storeOrUpdateFolderByUserID(acct, folder);
          });
          if (entries.length == 0) {
            // no updates
            console.log(ctx, "no change needed for ", folder.path);
          }
        });
      }
    } else {
      console.log(ctx, "dropbox update ignored because no user account available (user is not active)")
    }
  });
}

export async function storeFolderContents(dbx_account: Integration_account, feed_id: string, dbxFolder: dbxFolderObject) {
  const ctx = { name: "getFolderContents", path: dbxFolder.path };
  
  if (dbx_account != null) {
    // Retrieve the folder from dropbox and store it in the database
    const { entries, cursor } = await dbxListFolder(dbx_account, dbxFolder.path);
    dbxFolder.cursor = cursor;
    const newParentFolderID = await storeOrUpdateFolderByUserID(dbx_account, dbxFolder);

    // Iterate through all the children of the current folder and perform an action based on each child's tag
    console.log(ctx, "dropbox list folder contents ", entries);
    if (entries) {
      entries.forEach(async (entry: any) => {
        handleDBXEntryUpdate(dbx_account, dbxFolder, feed_id, entry, newParentFolderID);
      })
    }
  } else {
    console.log(ctx, "dropbox update ignored because no user account available (user is not active)")
  }
}

async function handleDBXEntryUpdate(
  dbx_account: Integration_account, 
  dbxFolder: dbxFolderObject,
  feed_id: string,
  entry: any,
  parent_folder_id: string,
): Promise<void> {
  switch(entry['.tag']) {
    case 'folder':
      const newDBXFolder: dbxFolderObject = {
        id: '',
        parent_folder_id: parent_folder_id,
        feed_id: dbxFolder.feed_id,
        name: entry.name,
        path: entry.path_display,
        dbx_id: entry.id,
        cursor: ''
      }

      // Recursive call
      storeFolderContents(dbx_account, feed_id, newDBXFolder);
      break;
    case 'file':
      const newDBXFile: dbxFileObject = {
        id: '',
        parent_folder_id: parent_folder_id,
        name: entry.name,
        path: entry.path_display,
        dbx_id: entry.id
      }

      // Recursive loop terminates
      storeOrUpdateFileByUserID(dbx_account, newDBXFile);
      break;
    case 'deleted':
      // Must be able to handle deleting both Files and Folders
      const folderRemove: dbxFolderObject = {
        id: '',
        parent_folder_id: parent_folder_id,
        feed_id: dbxFolder.feed_id,
        name: entry.name,
        path: entry.path_display,
        dbx_id: entry.id,
        cursor: ''
      }
      const deletedFolder = await deleteFolderByUserID(dbx_account, folderRemove);

      console.log('was a folder was deleted?: ', deletedFolder);
      if (!deletedFolder) {
        const fileRemove: dbxFileObject = {
          id: '',
          parent_folder_id: parent_folder_id,
          name: entry.name,
          path: entry.path_display,
          dbx_id: entry.id
        };
        const deletedFile = await deleteFile(dbx_account, fileRemove);
      }

      break;
  }
}

// https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder
export async function dbxListFolder(
  user_account: Integration_account,
  path: string
): Promise<any> {
  const ctx = { name: 'dropbox-list-folder-api' };
  
  try {
    const requestData = {
      path: path,
      recursive: false
    };

    console.log(ctx, "Calling list folder with data", requestData);
    const data = await dbxCallAPI('/list_folder', requestData, user_account.access_token);
    console.log(ctx, "dbx folder after receiving update ");

    return {entries: data.entries, cursor: data.cursor};
  } catch (error) {
    console.error(ctx, 'Failed to list Dropbox folder', { error });
    throw error;
  }
}

// https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-continue
async function dbxListFolderContinue(user_account: Integration_account, cursor: string) {
  const ctx = { name: 'dropbox-list-folder-api' };
  
  try {
    const requestData = {
      cursor: cursor
    };
    const data = await dbxCallAPI('/list_folder/continue', requestData, user_account.access_token);
    console.log(ctx, "dbx folder after receiving update ");

    return data;
  } catch (error) {
    console.error(ctx, 'Failed to list continue Dropbox folder', { error });
    throw error;
  }
}

// https://www.dropbox.com/developers/documentation/http/documentation#files-list_folder-get_latest_cursor
async function dbxGetLatestCursor(user_account: Integration_account) {
  const ctx = { name: 'dropbox-get-latest-cursor-api' };
  console.log(ctx, "start dbxGetLatestCursor()");
  
  try {
    const requestData = {
      path: DROPBOX_PATH,
      recursive: false
    };
    const data = await dbxCallAPI('/list_folder/get_latest_cursor', requestData, user_account.access_token);
    console.log(ctx, "response data: ", data);

    if (!data || !data["cursor"]) {
      console.error("No Dropbox cursor returned");
      return;
    }
    
    return data.cursor;
  } catch (error) {
    console.error(ctx, 'Failed to list Dropbox folder', { error });
    throw error;
  }
}

