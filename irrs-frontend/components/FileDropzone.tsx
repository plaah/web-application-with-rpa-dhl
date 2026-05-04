"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { apiFetch } from "@/lib/api";

type State = "idle" | "drag-over" | "uploading" | "extracted" | "error";

interface ExtractResponse {
  success: boolean;
  data: {
    extracted_text: string;
    file_type: string;
  };
}

interface Props {
  onExtracted: (text: string, filename: string, file: File) => void;
}

export default function FileDropzone({ onExtracted }: Props) {
  const [state, setState] = useState<State>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function processFile(file: File) {
    setState("uploading");
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await apiFetch<ExtractResponse>("/files/extract", {
        method: "POST",
        body: formData,
      });
      setState("extracted");
      onExtracted(res.data.extracted_text, file.name, file);
    } catch {
      setState("error");
      setErrorMsg(
        "File extraction failed. Check that the file is a valid PDF, DOCX, or TXT and try again."
      );
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const borderClass =
    state === "drag-over"
      ? "border-red-500 bg-red-50"
      : "border-gray-300 bg-white";

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${borderClass}`}
      onDragOver={(e) => {
        e.preventDefault();
        setState("drag-over");
      }}
      onDragLeave={() => setState("idle")}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.pdf,.docx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleChange}
      />

      {state === "uploading" && (
        <p className="text-sm text-gray-500">Extracting text…</p>
      )}

      {state === "extracted" && (
        <p className="text-sm text-green-600 font-medium">
          Text extracted successfully. See preview below.
        </p>
      )}

      {state === "error" && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}

      {(state === "idle" || state === "drag-over") && (
        <p className="text-sm text-gray-500">
          Drag a file here or click to browse — accepts TXT, PDF, DOCX, PNG,
          JPG
        </p>
      )}
    </div>
  );
}
