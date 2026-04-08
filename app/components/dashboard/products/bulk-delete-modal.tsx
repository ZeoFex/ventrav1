import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  isDeleting: boolean;
}

export function BulkDeleteModal({ isOpen, onClose, onConfirm, count, isDeleting }: BulkDeleteModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete {count} product{count !== 1 ? "s" : ""}?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Are you sure you want to permanently delete the selected {count} product{count !== 1 ? "s" : ""}?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-end gap-2">
          <DialogClose asChild>
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-xl font-semibold">
              Cancel
            </button>
          </DialogClose>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all hover:bg-red-700"
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
