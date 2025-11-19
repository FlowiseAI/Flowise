// packages/brief-api/src/types/pdf-parse.d.ts

declare module 'pdf-parse/lib/pdf-parse.js' {
  /// <reference types="node" />

  interface PdfParseResult {
    numpages?: number;
    numrender?: number;
    info?: any;
    metadata?: any;
    version?: string;
    text: string;
  }

  function pdfParse(dataBuffer: Buffer | Uint8Array): Promise<PdfParseResult>;

  export = pdfParse;
}