import useConfirm from '@/hooks/useConfirm'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const ConfirmDialog = () => {
    const { onConfirm, onCancel, confirmState } = useConfirm()

    return (
        <Dialog open={confirmState.show} onClose={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{confirmState.title}</DialogTitle>
                    <DialogDescription>{confirmState.description}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={onCancel} size='sm' variant='ghost'>
                        {confirmState.cancelButtonName}
                    </Button>
                    <Button onClick={onConfirm} size='sm' variant={confirmState.confirmButtonName === 'Delete' ? 'destructive' : 'default'}>
                        {confirmState.confirmButtonName}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default ConfirmDialog
