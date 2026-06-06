import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';

export default function AccountDeletion() {
  const [showDialog, setShowDialog] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteClick = () => {
    setShowDialog(true);
    setError('');
    setConfirmEmail('');
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      const user = await base44.auth.me();
      
      if (confirmEmail !== user.email) {
        setError('Email tidak sesuai. Silakan cek kembali.');
        return;
      }

      // Call delete account function or backend
      await base44.functions.invoke('deleteUserAccount', { userEmail: user.email });
      
      // Logout after deletion
      await base44.auth.logout();
      window.location.href = '/login';
    } catch (err) {
      setError(err.message || 'Gagal menghapus akun. Silakan coba lagi.');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-sm text-destructive flex items-center gap-2">
            <Trash2 className="w-4 h-4" />
            Hapus Akun
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Tindakan ini tidak dapat dibatalkan. Semua data Anda akan dihapus secara permanen.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDeleteClick}
          className="w-full md:w-auto"
        >
          Hapus Akun Saya
        </Button>
      </div>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Penghapusan Akun</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Anda akan menghapus akun Anda secara permanen. Tindakan ini <strong>tidak dapat dibatalkan</strong>.
              </p>
              <ul className="list-disc list-inside text-sm text-foreground space-y-1">
                <li>Semua data pribadi akan dihapus</li>
                <li>Anda tidak akan bisa login lagi</li>
                <li>Backup data tidak tersimpan</li>
              </ul>
              <p>
                Ketik email Anda untuk konfirmasi:
              </p>
              <Input
                type="email"
                placeholder="Masukkan email Anda"
                value={confirmEmail}
                onChange={(e) => {
                  setConfirmEmail(e.target.value);
                  setError('');
                }}
                disabled={isDeleting}
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!confirmEmail || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Menghapus...' : 'Ya, Hapus Akun'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}