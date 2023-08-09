import { HapiHandler } from '../Types/Hapi';
import { Bucket, Storage } from '@google-cloud/storage';
import { join } from 'path';
import { Upload64Request } from '../Types/Upload';
import { Readable } from 'stream';
import fileType from 'file-type';
import * as Sentry from "@sentry/node";

/**
 * @typedef {import('fs').ReadStream} ReadStream
 */

const whitelist: string[] = [
    "image/gif",
    "image/png",
    "image/jpeg",
    "image/webp",
    "image/tiff",
    "application/pdf",
    "application/zip",
    "application/msword",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export default class UploadImagesFromBase64 {
    static uploadFromBase64: HapiHandler = async (request, h) => {
        try {
            const payload: Upload64Request = JSON.parse(
                JSON.stringify(request.payload)
            );

            if (!payload.bucket || !payload.image) {
                h.response({ success: false, message: "Unable to process entity: missing parameters" }).code(422);
            }

            const storage = new Storage({ keyFilename: join(__dirname, 'serviceAccount-storage.json') });
            const bucket = storage.bucket(payload.bucket);

            const image = payload.image;
            const imgBuffer = Buffer.from(image, 'base64');

            const imageStream = new Readable();
            const dataSize = Buffer.byteLength(imgBuffer);

            imageStream.push(imgBuffer);
            imageStream.push(null);

            const typeStream = await fileType.fileTypeStream(imageStream);
            const type = typeStream.fileType;
            const validType = !!whitelist.find(v => v === type?.mime);

            if (!validType) {
                h.response({ success: false, message: `unable to process Entity: the file type ${type?.mime} is not on the whitelist` }).code(422);
            }
            let filename: string = payload.filename
                ? payload.filename
                : `${Date.now()}_${Math.round(Math.random() * 1000000)}`;

            const fileOptions: Object = {
                resumable: false,
                contentType: type?.mime,
                predefinedAcl: "publicRead"
            };

            if (payload.objectPath) {
                filename = `${payload.objectPath}/${filename}`;
            }

            filename = `${filename}.${type?.ext}`;

            const file = bucket.file(filename);

            typeStream
                .pipe(file.createWriteStream(fileOptions))
                .on('error', function (err) {
                    console.error(err);
                    h.response({ success: false, message: err.message }).code(422);
                })
                .on('finish', function () {
                    h.response({
                        path: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
                        size: dataSize,
                        contentType: type?.mime,
                        name: filename,
                        bucket: payload.bucket,
                    }).code(200);
                });
        } catch (error) {
            Sentry.captureException(error);
            throw error;
        }
    };
}
