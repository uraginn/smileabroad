import { Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlannerAssetUrl } from "@/features/dentalplan/adapters/plannerAssetStorage";

export interface AttachmentItem {
  id: string;
  name: string;
  dataUrl?: string;
  storageKey?: string;
}

function AttachmentPreview({ item }: { item: AttachmentItem }) {
  const url = usePlannerAssetUrl(item.storageKey, item.dataUrl);
  return url ? (
    <img src={url} alt={item.name} className="aspect-video w-full rounded object-cover" />
  ) : null;
}

export function Attachment({
  items,
  onAdd,
  onRemove,
  onMove,
  maxFiles = 4,
  accept = "image/jpeg,image/png,image/webp",
}: {
  items: AttachmentItem[];
  onAdd: (file: File) => void | Promise<void>;
  onRemove: (id: string) => void;
  onMove?: (from: number, to: number) => void;
  maxFiles?: number;
  accept?: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-medium">
          <Paperclip className="size-4" />
          Attachments
        </span>
        <span className="text-muted-foreground">
          {items.length}/{maxFiles}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {items.map((item, index) => (
          <div key={item.id} className="min-w-0 rounded-md border p-2">
            <AttachmentPreview item={item} />
            <p className="mt-1 truncate text-xs" title={item.name}>
              {item.name}
            </p>
            <div className="mt-1 flex justify-between">
              {onMove && (
                <div className="flex">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={index === 0}
                    onClick={() => onMove(index, index - 1)}
                  >
                    ←
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={index === items.length - 1}
                    onClick={() => onMove(index, index + 1)}
                  >
                    →
                  </Button>
                </div>
              )}
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label={`Remove ${item.name}`}
                onClick={() => onRemove(item.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
        {items.length < maxFiles && (
          <Button asChild type="button" variant="outline" className="aspect-video h-auto">
            <label>
              <Upload className="size-4" />
              Add photo
              <input
                className="hidden"
                type="file"
                accept={accept}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onAdd(file);
                  event.target.value = "";
                }}
              />
            </label>
          </Button>
        )}
      </div>
    </div>
  );
}
