"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import FileDropzone from "@/components/FileDropzone";
import IncidentForm from "@/components/IncidentForm";

export default function UploadPage() {
  const router = useRouter();
  const [extractedText, setExtractedText] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <h1 className="text-xl font-semibold mb-6">New Incident</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column — dropzone + preview */}
          <div className="lg:col-span-3 space-y-4">
            <FileDropzone
              onExtracted={(text, _name, file) => {
                setExtractedText(text);
                setAttachedFile(file);
              }}
            />

            {extractedText && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Extracted Text Preview
                  </span>
                  <button
                    onClick={() => setDescription(extractedText)}
                    className="text-xs font-semibold text-red-600 hover:text-red-700 transition"
                  >
                    Use extracted text
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={8}
                  value={extractedText}
                  className="w-full text-sm text-gray-600 resize-none outline-none bg-transparent"
                />
              </div>
            )}
          </div>

          {/* Right column — form */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-6">
            <IncidentForm
              initialDescription={description}
              attachedFile={attachedFile}
              onSaved={(id) => router.push("/incidents/" + id)}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
