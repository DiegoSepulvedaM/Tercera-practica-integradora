import * as Sentry from "@sentry/node";
import axios from "axios";
import { PredefinedAcl, Storage } from "@google-cloud/storage";
import fileType from "file-type";
import { join } from "path";
import { readFileSync } from "fs";
import { Readable } from "stream";
import puppeteer from "puppeteer";
import LengthStream from "length-stream";
import { HapiHandler } from "../Types/Hapi";
import { UploadRequest } from "../Types/Upload";
import config from "../config/config";

/// <reference path="./length-stream.d.ts" />

const whitelist = [
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

async function downloadWithPuppeteer(url: string): Promise<Readable> {
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-infobars",
    "--window-position=0,0",
    "--ignore-certifcate-errors",
    "--ignore-certifcate-errors-spki-list",
    '--accept="text/html,application/xhtml+xml,application/xml;q=0.9,/;q=0.8"',
    '--accept-language="en,en-US;q=0,5"',
  ];

  const options = {
    args,
    defaultViewport: {
      width: 1280,
      height: 720,
    },
    headless: true,
    userDataDir: "./tmp",
  };

  const browser = await puppeteer.launch(options);
  const page = await browser.newPage();

  page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"
  );

  page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.169 Safari/537.36"
  );

  const preloadFile = readFileSync("./preload.js", "utf8");

  await page.evaluateOnNewDocument(preloadFile);

  let buffer: Buffer;

  const puppeteerResponse = await Promise.all([
    page.waitForResponse((response) => response.url().includes(url)),
    page.goto(url),
  ]);

  if (puppeteerResponse) {
    buffer = await puppeteerResponse[0].buffer();
  } else {
    throw new Error("Puppeteer response is null");
  }

  await browser.close();

  const responseStream = new Readable();

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  responseStream._read = () => {};
  responseStream.push(buffer);
  responseStream.push(null);

  return responseStream;
}

function downloadWithAxios(url: string) {
  return axios.get(url, {
    responseType: "stream",
  });
}

Sentry.init({
  dsn: config.app.sentry_dns,
  // We recommend adjusting this value in production, or using tracesSampler
  // for finer control
  tracesSampleRate: 1.0,
});

let dataSize: number;

function lengthListener(length: number) {
  dataSize = length;
}
const lstream = new LengthStream(lengthListener);

function next(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _arg0: Error
):
  | import("@hapi/hapi").Lifecycle.ReturnValueTypes<
      import("@hapi/hapi").ReqRefDefaults
    >
  | PromiseLike<
      import("@hapi/hapi").Lifecycle.ReturnValueTypes<
        import("@hapi/hapi").ReqRefDefaults
      >
    > {
  throw new Error("Function not implemented.");
}

export default class Upload {
  static upload: HapiHandler = async (request, h) => {
    try {
      const uploadRequest: UploadRequest = JSON.parse(
        JSON.stringify(request.payload)
      );

      if (!uploadRequest.bucket || !uploadRequest.imageURL) {
        return h
          .response({
            message: "Unable to process entity: missing parameters",
          })
          .code(422);
      }
      const storage = new Storage({
        keyFilename: join(__dirname, "serviceAccount-storage.json"),
      });

      const bucket = storage.bucket(uploadRequest.bucket);

      // filenameRegex gets the filename from imageURL
      const filenameRegex = /[^/\\&?]+\.\w{3,4}(?=([?&].*$|$))/;

      // filenameNoExtRegex gets the filename without the extension
      const filenameNoExtRegex = /(.+?)(\.[^.]*$|$)/;

      let filename = "";

      if (uploadRequest.filename) {
        filename = uploadRequest.filename;
      } else if (filenameRegex.test(uploadRequest.imageURL)) {
        const [filenameMatch] =
          filenameRegex.exec(uploadRequest.imageURL) || [];

        if (filenameMatch) {
          filename = filenameMatch;
          const [filenameNoExtMatch] = filenameNoExtRegex.exec(filename) || [];

          if (filenameNoExtMatch) {
            filename = filenameNoExtMatch;
          } else {
            filename = `${Date.now()}_${Math.round(Math.random() * 1000000)}`;
          }
        }
      }

      let response: Readable;

      if (uploadRequest.forcePuppeteer) {
        console.log("Download with puppeteer");
        try {
          response = await downloadWithPuppeteer(uploadRequest.imageURL);
        } catch (error) {
          console.log(error);

          return h
            .response({
              success: "false",
              message: "Puppeteer navigation error",
            })
            .code(404);
        }
      } else {
        try {
          console.log("Download with axios");
          const { data } = await downloadWithAxios(uploadRequest.imageURL);

          response = data;
        } catch (error) {
          if (error instanceof Error) {
            console.log(error);

            return h
              .response({
                success: false,
                message: "Puppeteer navigation error",
              })
              .code(404);
          }

          return next(new Error("Puppeteer error"));
        }
      }

      if (response !== undefined) {
        // At this point, whether the request is made with axios
        // puppeteer, the variable response is a stream

        // We will get the fileType from the stream
        const typeStream = await fileType.fileTypeStream(response);

        // Get the fileType from the typeStream
        const type = typeStream.fileType;

        // Check if the fileType returned from the stream is on the whitelist
        const validType = !!whitelist.find((v) => v === type?.mime);

        if (!validType) {
          h.response({
            success: false,
            message:
              "unable to process Entity: the file type is not on the whitelist",
          }).code(422);
        }

        // Set the file options for the upload
        const fileOptions: Object = {
          resumable: false,
          contentType: type?.mime,
          predefinedAcl: "publicRead",
        };

        // If there's an objectPath, format the prepend it to the filename
        if (uploadRequest.objectPath) {
          filename = `${uploadRequest.objectPath}/${filename}`;
        }

        // Add the extension returned from the fileType stream
        filename = `${filename}.${type?.ext}`;

        // Create the bucket file object
        const file = bucket.file(filename);

        // And finally pipe the streams to get the size and create a writeStream to upload
        // The file to the bucket
        typeStream
          .pipe(lstream)
          .pipe(file.createWriteStream(fileOptions))
          .on("error", function errorHandler(err: Error) {
            return h.response(err).code(500);
          })
          .on("finish", function finishHandler() {
            const uploadResponse = {
              path: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
              size: dataSize,
              contentType: type?.mime,
              name: filename,
            };

            h.response(uploadResponse).code(200);
          });
      }

      return h.response({ success: true });
    } catch (err) {
      Sentry.captureException(err);

      throw err;
    }
  };
}
