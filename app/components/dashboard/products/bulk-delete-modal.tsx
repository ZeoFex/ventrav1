import { DeleteConfirmModal } from "../ui/delete-confirm-modal";

interface BulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  count: number;
  isDeleting: boolean;
}

export function BulkDeleteModal({ isOpen, onClose, onConfirm, count, isDeleting }: BulkDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <DeleteConfirmModal
      title={`Delete ${count} product${count !== 1 ? "s" : ""}?`}
      description={
        <>
          This cannot be undone. The selected {count} product{count !== 1 ? "s" : ""} will be permanently
          removed from the catalog.
        </>
      }
      confirmLabel={count === 1 ? "Delete product" : "Delete products"}
      isDeleting={isDeleting}
      onCancel={onClose}
      onConfirm={onConfirm}
    />
  );
}
