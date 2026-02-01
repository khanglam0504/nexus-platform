'use client';

import { FileText, Download } from 'lucide-react';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface Props {
  attachments: Attachment[];
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MessageAttachments({ attachments }: Props) {
  if (attachments.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {attachments.map((att) => (
        <div key={att.id}>
          {att.type.startsWith('image/') ? (
            <a
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={att.url}
                alt={att.name}
                className="max-h-48 max-w-xs rounded-lg border hover:opacity-90 transition-opacity"
              />
            </a>
          ) : (
            <a
              href={att.url}
              download={att.name}
              className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
            >
              <FileText className="h-4 w-4" />
              <div className="text-sm">
                <p className="font-medium truncate max-w-[150px]">{att.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(att.size)}
                </p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground" />
            </a>
          )}
        </div>
      ))}
    </div>
  );
}
