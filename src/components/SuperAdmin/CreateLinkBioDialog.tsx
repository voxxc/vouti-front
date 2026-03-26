import { useState } from 'react';
import { Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateLinkBioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    username: string;
    full_name: string;
    email: string;
    password: string;
    bio?: string;
  }) => Promise<boolean>;
}

export function CreateLinkBioDialog({ open, onOpenChange, onSubmit }: CreateLinkBioDialogProps) {
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [bio, setBio] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await onSubmit({
      username: username.toLowerCase().replace(/[^a-z0-9_-]/g, ''),
      full_name: fullName,
      email,
      password,
      bio: bio || undefined,
    });

    setLoading(false);
    if (success) {
      setUsername('');
      setFullName('');
      setEmail('');
      setPassword('');
      setBio('');
      onOpenChange(false);
    }
  };

  const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Perfil Link-in-Bio</DialogTitle>
          <DialogDescription>
            Crie um novo perfil de links para um cliente
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              placeholder="amsadvocacia"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
            />
            {sanitizedUsername && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                URL pública: <span className="font-medium text-primary">vouti.co/{sanitizedUsername}</span>
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo</Label>
            <Input
              id="full_name"
              placeholder="AMS Advocacia"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio (opcional)</Label>
            <Textarea
              id="bio"
              placeholder="Escritório especializado em..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              disabled={loading}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email de acesso</Label>
            <Input
              id="email"
              type="email"
              placeholder="contato@amsadvocacia.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !username || !fullName || !email || !password}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Criar Perfil
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
