
import * as pdfjsLib from 'pdfjs-dist';

// Handle ESM/CJS interop for pdfjs-dist
const pdfjs = (pdfjsLib as any).default || pdfjsLib;

// Initialize Worker with matching version (5.4.624) to avoid version mismatch errors
if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.624/build/pdf.worker.min.mjs`;
}

export interface PdfRange {
    start: number;
    end: number;
}

/**
 * Loads the PDF document from a File object.
 * Returns the PDFDocumentProxy which contains metadata (numPages).
 */
export const loadPdfDocument = async (file: File): Promise<any> => {
    try {
        const arrayBuffer = await file.arrayBuffer();

        // Pass params to optimize loading and reduce reliance on advanced worker features
        const loadingTask = pdfjs.getDocument({
            data: arrayBuffer,
            disableRange: true,
            disableStream: true,
            disableAutoFetch: true,
        });

        return await loadingTask.promise;
    } catch (error: any) {
        console.error("PDF Load Error:", error);

        if (error.name === 'MissingPDFException') {
            throw new Error("The file is missing or invalid.");
        } else if (error.name === 'InvalidPDFException') {
            throw new Error("The file is corrupted or not a valid PDF.");
        }

        throw new Error(error.message || "Failed to load PDF document");
    }
};

/**
 * Extracts text from a specific range of pages.
 */
export const extractTextFromRange = async (
    pdfDoc: any,
    range: PdfRange,
    onProgress?: (current: number, total: number) => void
): Promise<string> => {
    const { start, end } = range;
    let fullText = '';

    // Validate range
    const startPage = Math.max(1, start);
    const endPage = Math.min(pdfDoc.numPages, end);

    for (let i = startPage; i <= endPage; i++) {
        if (onProgress) {
            onProgress(i, endPage);
        }

        try {
            const page = await pdfDoc.getPage(i);
            const textContent = await page.getTextContent();

            // Basic text joining strategy
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');

            fullText += `\n--- Page ${i} ---\n${pageText}`;
        } catch (e) {
            console.warn(`Error extracting text from page ${i}`, e);
            fullText += `\n--- Page ${i} ---\n[Error extracting text from this page]`;
        }
    }

    return fullText.trim();
};
