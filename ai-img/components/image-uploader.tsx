"use client";

import { useAppContext } from "@/context/app-context";
import { IKUpload, ImageKitProvider } from "imagekitio-next";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import React, { useRef, useState } from "react";

export default function ImageUploader() {
  const ikUploadRef = useRef<HTMLInputElement>(null);
  const {
    setUploadedImageUrl,
    setSelectedTransformation,
    setTransformationParams,
  } = useAppContext();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadStats, setUploadStats] = useState({ loaded: 0, total: 0 });

  const urlEndpoint = process.env.NEXT_PUBLIC_URL_ENDPOINT;
  const publicKey = process.env.NEXT_PUBLIC_PUBLIC_KEY;
  const authenticator = async () => {
    try {
      const response = await fetch("/api/auth");

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Request failed with status ${response.status}: ${errorText}`
        );
      }

      const data = await response.json();
      const { signature, expire, token } = data;
      return { signature, expire, token };
    } catch (error) {
      throw new Error(`Authentication request failed: ${error}`);
    }
  };

  const onError = (err: unknown) => {
    console.log("Error", err);
  };

  const onSuccess = (res: { url: string }) => {
    setUploadStatus("success");
    setUploadProgress(100);
    if (res.url) {
      setUploadedImageUrl(res.url);
      setSelectedTransformation(null);
      setTransformationParams("");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    return `${(bytes / k).toFixed(1)} KB`;
  };

  const resetUpload = () => {
    setUploadProgress(0);
    setUploadStatus("idle");
  };

  // This function triggers the IKUpload component programmatically
  const uploadViaIkSdk = (files: FileList) => {
    if (ikUploadRef?.current) {
      const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "files"
      );
      const nativeInputValueSetter = descriptor?.set;
      if (!nativeInputValueSetter) {
        console.error("Unable to find the 'files' property descriptor.");
        return;
      }
      nativeInputValueSetter.call(ikUploadRef.current, files);
      const changeEvent = new Event("change", { bubbles: true });
      ikUploadRef.current.dispatchEvent(changeEvent);
    }
  };

  const onProgress = (e: {
    lengthComputable: boolean;
    loaded: number;
    total: number;
  }) => {
    if (e.lengthComputable) {
      setUploadStatus("uploading");
      const progress = (e.loaded / e.total) * 100;
      setUploadProgress(progress);
      setUploadStats({
        loaded: e.loaded,
        total: e.total,
      });
    }
  };

  return (
    <ImageKitProvider
      publicKey={publicKey}
      urlEndpoint={urlEndpoint}
      authenticator={authenticator}
    >
      <IKUpload
        ref={ikUploadRef}
        onError={onError}
        onSuccess={onSuccess}
        onUploadProgress={onProgress}
        style={{ visibility: "hidden", height: 0, width: 0 }}
      />
      {/* custom upload image */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center aspect-video flex flex-col items-center justify-center
          ${uploadStatus === "uploading" ? "opacity-50" : ""}
        `}
      >
        {uploadStatus === "idle" && (
          <div>
            <p className="mb-2 text-sm text-gray-500">Click to upload</p>
            <p className="text-sm text-gray-500">PNG, JPG up to 5MB</p>
            <input
              type="file"
              className="hidden"
              accept="image/*"
              id="file-input"
              onChange={(e) => {
                e.preventDefault();
                uploadViaIkSdk(e.target.files as FileList);
              }}
            />
            <button
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              onClick={() => {
                document.getElementById("file-input")?.click();
              }}
            >
              Select File
            </button>
          </div>
        )}

        {uploadStatus === "uploading" && (
          <div className="space-y-3 w-[70%]">
            <div className="flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-500 h-5 w-5 mr-3" />
              <span>Uploading file...</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-500">
              {Math.round(uploadProgress)}% ({formatBytes(uploadStats.loaded)} /{" "}
              {formatBytes(uploadStats.total)})
            </div>
          </div>
        )}

        {uploadStatus === "success" && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
              <CheckCircle className="text-green-500 h-5 w-5" />
            </div>
            <p className="mb-2 text-green-600 font-medium">
              Upload successful!
            </p>
            <button
              onClick={resetUpload}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Upload Another File
            </button>
          </div>
        )}

        {uploadStatus === "error" && (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
              <XCircle className="text-red-500 h-5 w-5" />
            </div>
            <p className="mb-2 text-red-600 font-medium">Upload failed!</p>
            <p className="text-sm text-gray-500 mb-4">Please try again</p>
            <button
              onClick={resetUpload}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </ImageKitProvider>
  );
}