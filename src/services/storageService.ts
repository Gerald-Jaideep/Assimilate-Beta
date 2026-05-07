import { ref, uploadString, getDownloadURL, StringFormat } from 'firebase/storage';
import { storage } from '../lib/firebase';

export async function uploadBase64Image(base64Data: string, path: string): Promise<string> {
  try {
    // If it's already a URL, return it
    if (base64Data.startsWith('http')) return base64Data;
    
    const storageRef = ref(storage, path);
    
    // Check if the data is just base64 or includes the data URI prefix
    let dataToUpload = base64Data;
    
    if (base64Data.includes('base64,')) {
      dataToUpload = base64Data.split('base64,')[1];
    }

    await uploadString(storageRef, dataToUpload, StringFormat.BASE64);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image to storage:', error);
    throw error;
  }
}

export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    const { uploadBytes } = await import('firebase/storage');
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  } catch (error) {
    console.error('Error uploading file to storage:', error);
    throw error;
  }
}
