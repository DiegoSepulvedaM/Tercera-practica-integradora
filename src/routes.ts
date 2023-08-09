import { ServerRoute } from "@hapi/hapi";
import Discord from "./Services/Discord";
import Exchange from "./Services/Exchange";
import Update from "./Services/updateRates";
import UpdateUF from "./Services/updateRateUF";
import Upload from "./Services/Upload";
// import Upload64 from "./Services/uploadFromBase64";

const routes: ServerRoute[] = [
  {
    method: "POST",
    path: "/sentry",
    handler: Discord.sentry,
  },
  {
    method: "POST",
    path: "/exchange",
    handler: Exchange.exchange,
  },
  {
    method: "POST",
    path: "/updateRates",
    handler: Update.update,
  },
  {
    method: "POST",
    path: "/updateRateUF",
    handler: UpdateUF.updateUF,
  },

  {
    method: "POST",
    path: "/upload",
    handler: Upload.upload,
  },

  // {
  //   method: "POST",
  //   path: "/uploadFromBase64",
  //   handler: Upload64.upload64,
  // },
];

export default routes;
