'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Eye, Pencil } from 'lucide-react';

interface PolicyEditorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function PolicyEditor({ value, onChange, disabled, placeholder }: PolicyEditorProps) {
  const [preview, setPreview] = useState(false);
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="rounded-md border">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs text-muted-foreground">{wordCount} words</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setPreview((v) => !v)}
          disabled={disabled}
        >
          {preview ? (
            <><Pencil className="mr-1 h-3 w-3" />Edit</>
          ) : (
            <><Eye className="mr-1 h-3 w-3" />Preview</>
          )}
        </Button>
      </div>

      {preview ? (
        <div
          className={cn(
            'min-h-[320px] p-4 prose prose-sm max-w-none dark:prose-invert',
            !value && 'text-muted-foreground italic',
          )}
          // Markdown rendered as plain text — replace with react-markdown if richer rendering is needed
        >
          {value
            ? value.split('\n').map((line, i) => (
                <p key={i} className="mb-1 last:mb-0">
                  {line || <br />}
                </p>
              ))
            : 'Nothing to preview yet.'}
        </div>
      ) : (
        <Textarea
          className="min-h-[320px] resize-y rounded-none border-0 font-mono text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder ?? 'Write your policy content in Markdown…'}
        />
      )}
    </div>
  );
}
