// frontend/src/components/DeleteModal.jsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Props:
 * - show: boolean
 * - onCancel: () => void
 * - onConfirm: () => void
 * - communityName?: string
 */
function DeleteModal({ show, onCancel, onConfirm, communityName }) {
  // When the dialog is closed by clicking outside or pressing ESC,
  // shadcn's Dialog calls onOpenChange(false). We map that to onCancel().
  const handleOpenChange = (open) => {
    if (!open) onCancel?.();
  };

  return (
    <Dialog open={show} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Community</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete{" "}
          <span className="font-semibold">
            {communityName || "this community"}
          </span>
          ?
        </p>

        <DialogFooter className="gap-2 sm:gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            autoFocus
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DeleteModal;