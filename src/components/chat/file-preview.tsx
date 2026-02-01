'use client';

import { X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FileItem {
  file: File;
  preview?: string;
}

interface Props {
  files: FileItem[];
  onRemove: (index: number) => void;
}

export function FilePreview({ files, onRemove }: Props) {
  if (files.length === 0) return null;

  return (
    <div className="flex gap-2 px-4 py-2 overflow-x-auto border-t border-border">
      {files.map((item, index) => (
        <div
          key={index}
          className="relative flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg shrink-0"
        >
          {item.file.type.startsWith('image/') && item.preview ? (
            <img
              src={item.preview}
              alt={item.file.name}
              className="h-10 w-10 object-cover rounded"
            />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="text-sm max-w-[120px] truncate">{item.file.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/80"
            onClick={() => onRemove(index)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
