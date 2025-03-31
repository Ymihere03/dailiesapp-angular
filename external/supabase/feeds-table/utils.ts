'use server'

import { dbxFileObject, getFilesByFolderIDs } from "../files-table/files";
import { dbxFolderObject, getFolders } from "../folders-table/folders";
import { retrieveAndDecryptToken } from "../integration-accounts";
import { getRootFolder } from "../folders-table/folders";
import { dbxListFolder } from "@/components/dropbox-server/list-folder";

// Compare the contents of the database with the contents of Dropbox
// This is a sanity test to make sure the consumption of dropbox updates is working correctly
// but this function does not affect the process of consuming updates from the dropbox webhook
// or the contents of the database
export async function compareDBFeedTree(feed_id: string): Promise<boolean> {
  const acct = await retrieveAndDecryptToken('dropbox');

  if (acct) {
    const rootFolder = await getRootFolder(feed_id);
    let errors: string[] = [];
    if (rootFolder) {
      const folderListDB = await getFolders(acct.auth_id);
      let dbxFolderList: dbxFolderObject[] = [];
      let dbxFileList: dbxFileObject[] = [];
      if (folderListDB) {
        const fileListDB = await getFilesByFolderIDs(acct, folderListDB.map(folder => folder.id))

        // Recursively get all the folder/file contents from dropbox
        const getDBXFolderContents = async (folder: dbxFolderObject) => {
          const ctx = { name: "getDBXFolderContents" };
          const { entries, cursor } = await dbxListFolder(acct, folder.path);
          
          for (const entry of entries){
          //entries.forEach(async (entry: {'.tag': string, name: string, path_display: string, id: string}) => {
            
            switch(entry['.tag']) {
              case 'folder':
                const newDBXFolder: dbxFolderObject = {
                  id: '',
                  parent_folder_id: folder.id,
                  feed_id: feed_id,
                  name: entry.name,
                  path: entry.path_display,
                  dbx_id: entry.id,
                  cursor: ''
                }
        
                dbxFolderList.push(newDBXFolder);
                await getDBXFolderContents(newDBXFolder);
                break;
              case 'file':
                const newDBXFile: dbxFileObject = {
                  id: '',
                  parent_folder_id: folder.id,
                  name: entry.name,
                  path: entry.path_display,
                  dbx_id: entry.id
                }
        
                // Recursive loop terminates
                dbxFileList.push(newDBXFile);
                break;
              case 'deleted':
                // This shouldn't be needed here
                break;
            }
          }
        }

        if (fileListDB) {
          await getDBXFolderContents(rootFolder);

          // We now have a copy of the DB objects and the dropbox objects
          // Now we can compare them all
          errors = errors.concat(compareFolders(folderListDB, dbxFolderList));
          errors = errors.concat(compareFiles(fileListDB, dbxFileList));
          

          if (errors.length > 0) {
            console.error("DB sync errors detected! - ", errors.length);
            errors.forEach(error => {
              console.log('---',error);
            });
            
            return false;
          } else {
            return true;
          }
        }


      }
        
    }
  }
  return false;
}

function compareFolders(dbFolders: dbxFolderObject[], dbxFolders: dbxFolderObject[]): string[] {
  let errors = [];
  // Check that every object from the DB has a copy from dropbox
  for(let i = 0; i < dbFolders.length; i++) {
    let copyFound = false;
    for(let d = 0; d < dbxFolders.length; d++) {
      if(dbFolders[i].dbx_id == '') {
        // Root folder from DB does not need to be checked
        copyFound = true;
        break;
      }

      console.log('#1 Comparing ',dbxFolders[d].name, ' and ', dbFolders[i].name);
      if(dbFolders[i].name !== dbxFolders[d].name)
        continue;

      console.log('#1 Comparing ',dbxFolders[d].path, ' and ', dbFolders[i].path);
      if(dbFolders[i].path !== dbxFolders[d].path)
        continue;

      console.log('#1 Comparing ',dbxFolders[d].dbx_id, ' and ', dbFolders[i].dbx_id);
      if(dbFolders[i].dbx_id !== dbxFolders[d].dbx_id)
        continue;

      copyFound = true;
      break;
    }

    if(!copyFound){
      errors.push(`Object ${dbFolders[i].path} did not have a matching copy from dropbox`)
    }
  }
  
  // Check that every object from dropbox has a copy from the DB
  for(let d = 0; d < dbxFolders.length; d++) {
    let copyFound = false;
    for(let i = 0; i < dbFolders.length; i++) {
      if(dbFolders[i].dbx_id == '') {
        // Root folder from DB does not need to be checked
        copyFound = true;
        break;
      }

      console.log('#2 Comparing ',dbxFolders[d].name, ' and ', dbFolders[i].name);
      if(dbxFolders[d].name !== dbFolders[i].name)
        continue;

      console.log('#2 Comparing ',dbxFolders[d].path, ' and ', dbFolders[i].path);
      if(dbxFolders[d].path !== dbFolders[i].path)
        continue;

      console.log('#2 Comparing ',dbxFolders[d].dbx_id, ' and ', dbFolders[i].dbx_id);
      if(dbxFolders[d].dbx_id !== dbFolders[i].dbx_id)
        continue;

      copyFound = true;
      break;
    }

    if(!copyFound){
      errors.push(`Object ${dbxFolders[d].path} did not have a matching copy from the database`)
    }
  }
  return errors;
}

function compareFiles(dbFiles: dbxFileObject[], dbxFiles: dbxFileObject[]): string[] {
  let errors = [];
  // Check that every object from the DB has a copy from dropbox
  for(let i = 0; i < dbFiles.length; i++) {
    let copyFound = false;
    for(let d = 0; d < dbxFiles.length; d++) {
      if(dbFiles[i].dbx_id == '') {
        // Root folder from DB does not need to be checked
        copyFound = true;
        break;
      }

      console.log('#3 Comparing ',dbxFiles[d].name, ' and ', dbFiles[i].name);
      if(dbFiles[i].name !== dbxFiles[d].name)
        continue;

      console.log('#3 Comparing ',dbxFiles[d].path, ' and ', dbFiles[i].path);
      if(dbFiles[i].path !== dbxFiles[d].path)
        continue;

      console.log('#3 Comparing ',dbxFiles[d].dbx_id, ' and ', dbFiles[i].dbx_id);
      if(dbFiles[i].dbx_id !== dbxFiles[d].dbx_id)
        continue;

      copyFound = true;
      break;
    }

    if(!copyFound){
      errors.push(`Object ${dbFiles[i].path} did not have a matching copy from dropbox`)
    }
  }
  
  // Check that every object from dropbox has a copy from the DB
  for(let d = 0; d < dbxFiles.length; d++) {
    let copyFound = false;
    for(let i = 0; i < dbFiles.length; i++) {
      if(dbFiles[i].dbx_id == '') {
        // Root folder from DB does not need to be checked
        copyFound = true;
        break;
      }

      console.log('#4 Comparing ',dbxFiles[d].name, ' and ', dbFiles[i].name);
      if(dbxFiles[d].name !== dbFiles[i].name)
        continue;

      console.log('#4 Comparing ',dbxFiles[d].path, ' and ', dbFiles[i].path);
      if(dbxFiles[d].path !== dbFiles[i].path)
        continue;

      console.log('#4 Comparing ',dbxFiles[d].dbx_id, ' and ', dbFiles[i].dbx_id);
      if(dbxFiles[d].dbx_id !== dbFiles[i].dbx_id)
        continue;

      copyFound = true;
      break;
    }

    if(!copyFound){
      errors.push(`Object ${dbxFiles[d].path} did not have a matching copy from the database`)
    }
  }
  return errors;
}