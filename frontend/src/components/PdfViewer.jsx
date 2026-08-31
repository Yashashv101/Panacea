import { useEffect, useState } from "react";
import apiClient from "../api/client";

export default function PdfViewer({
  url,
  title = "PDF Document",
  height = "calc(100vh - 180px)",
  minHeight = "750px",
}) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    let createdUrl = null;

    setLoading(true);
    setError(null);

    apiClient
      .get(url, { responseType: "blob" })
      .then((res) => {
        if (!active) return;
        const blob = new Blob([res.data], { type: "application/pdf" });
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      })
      .catch((err) => {
        if (!active) return;
        if (err.response?.status === 404) {
          setError("PDF document not found.");
        } else if (err.response?.status === 403) {
          setError("You do not have permission to view this document.");
        } else {
          setError("Could not load PDF document.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [url]);

  if (loading) {
    return (
      <div
        style={{ height, minHeight }}
        className="flex w-full items-center justify-center border border-brass/20 bg-card/40 rounded-[3px]"
      >
        <p className="text-sm text-slate">Loading document viewer…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-brass/20 bg-card/40 rounded-[3px]">
        <p className="text-sm text-oxblood">{error}</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="overflow-hidden border border-brass/20 rounded-[3px] bg-card">
        <iframe
          src={blobUrl}
          title={title}
          style={{ height, minHeight }}
          className="w-full border-0 block"
        />
      </div>
    </div>
  );
}
