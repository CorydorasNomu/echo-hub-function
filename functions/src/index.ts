import admin = require("firebase-admin");
import * as functions from "firebase-functions";
admin.initializeApp();

import path = require("path");
import os = require("os");
import fs = require("fs");
const spawn = require("child-process-promise").spawn;

// export const searchFriend = functions.region("asia-northeast1").https.onCall(async (data, context) => {
//   // res.set("Access-Control-Allow-Origin", "http://localhost:5173");
//   // res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
//   // res.set("Access-Control-Allow-Headers", "Content-Type");
//   // const response = new functions.https.HttpsResponse();
//   // const headers = {
//   //     "Access-Control-Allow-Origin": "http://localhost:5173",
//   //     "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
//   //     "Access-Control-Allow-Headers": "Content-Type",
//   // };
//   //   functions.logger.log("onCall argument data: ", data);
//   //   const queryKey = data.query.key as string;
//   //   functions.logger.log("search friend called.", queryKey);
//   const snapshot = await admin.firestore()
//     .collection("user")
//     .where("email", "==", data.email)
//     .get();
//   const ret = snapshot.docs.map((doc) => doc.data());
//   return ret;
// });

export const generateThumbnail = functions.storage
  .bucket("echo-hub-88492.appspot.com")
  .object()
  .onFinalize(async (obj: any) => {
    // イベントトリガー処理のループ防止
    if (path.dirname(obj.name).split("/").some(e => e === "thumb")) {
      return functions.logger.log("Already a thumb folder exists.");
    }
    // 非画像データ
    if (!obj.contentType?.startsWith("image/")) {
      return functions.logger.log("This file is not an image.");
    }
    // Cloud Storage の画像からサムネイルを生成するため Functions インスタンスに
    // ファイルを一時ダウンロードしてキャッシュ
    const fileName = path.basename(obj.name);
    const bucket = admin.storage().bucket(obj.bucket);
    const tempFilePath = path.join(os.tmpdir(), fileName);
    await bucket.file(obj.name).download({destination: tempFilePath});
    // サムネイル生成
    await spawn("convert", [tempFilePath, "-thumbnail", "240x240>", tempFilePath]);
    const thumbFilePath = path.join(path.dirname(obj.name), `/thumb/${fileName}`);
    functions.logger.log("thumbFilePath", thumbFilePath);
    // Storage にアップロード
    await bucket.upload(tempFilePath, {
      destination: thumbFilePath,
      metadata: {contentType: obj.contentType},
    });
    // Functions インスタンス内の画像処理メモリを解放
    return fs.unlinkSync(tempFilePath);
  });