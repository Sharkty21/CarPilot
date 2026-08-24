import type { DocumentKind } from "@/src/types/vehicle";

export const DOCUMENT_NOT_FOUND_MESSAGE = "Couldn't find that file.";

export function canPreviewInline(kind: DocumentKind): boolean {
  return kind === "image" || kind === "pdf";
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

/** Returns false when the file is clearly missing; true when a download was started. */
export async function downloadDocument(
  url: string,
  filename: string
): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (response.status === 404) return false;
    if (response.ok) {
      triggerBlobDownload(await response.blob(), filename);
      return true;
    }
  } catch {
    // CORS or network — fall through to a direct navigation download.
  }

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener noreferrer";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch {
    return false;
  }
}
