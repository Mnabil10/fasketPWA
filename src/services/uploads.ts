import { api } from "../api/client";

type SignedUploadTarget = {
  uploadUrl: string | null;
  publicUrl: string;
  driver?: "s3" | "local" | "inline";
  warnings?: string[];
};

export type DirectUploadResult = {
  url: string;
  warnings?: string[];
};

export async function requestSignedUpload(file: File | Blob): Promise<DirectUploadResult> {
  const contentType = (file as File).type || "application/octet-stream";
  const filename = (file as File).name || "upload";
  const { data } = await api.get<SignedUploadTarget>("/uploads/signed-url", {
    params: { filename, contentType },
  });

  if (data.uploadUrl) {
    await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    return { url: data.publicUrl, warnings: data.warnings };
  }

  if (data.driver === "inline") {
    return { url: data.publicUrl, warnings: data.warnings };
  }

  throw new Error("Uploads not available for this environment");
}
