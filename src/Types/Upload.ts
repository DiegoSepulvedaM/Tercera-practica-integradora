export interface UploadRequest {
  objectPath: string;
  forcePuppeteer: string;
  filename: string;
  bucket: string;
  imageURL: string;
}

export interface Upload64Request {
  objectPath: string;
  filename: string;
  bucket: string;
  image: string;
}
