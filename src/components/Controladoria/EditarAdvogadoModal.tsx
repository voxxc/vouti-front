import { useState, useRef } from 'react';
import { Pencil, Upload, X, Loader2, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { OABCadastrada } from '@/hooks/useOABs';

interface EditarAdvogadoModalProps {
  oab: OABCadastrada;
  onUpdate: () => Promise<void>;
}

export const EditarAdvogadoModal = ({ oab, onUpdate }: EditarAdvogadoModalProps) => {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state - cast to access extended fields
  const oabExtended = oab as OABCadastrada & {
    email_advogado?: string;
    telefone_advogado?: string;
    endereco_advogado?: string;
    cidade_advogado?: string;
    cep_advogado?: string;
    logo_url?: string;
  };

  const [nomeAdvogado, setNomeAdvogado] = useState(oab.nome_advogado || '');
  const [email, setEmail] = useState(oabExtended.email_advogado || '');
  const [telefone, setTelefone] = useState(oabExtended.telefone_advogado || '');
  const [endereco, setEndereco] = useState(oabExtended.endereco_advogado || '');
  const [cidade, setCidade] = useState(oabExtended.cidade_advogado || '');
  const [cep, setCep] = useState(oabExtended.cep_advogado || '');
  const [logoUrl, setLogoUrl] = useState(oabExtended.logo_url || '');

  const formatTelefone = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
  };

  const formatCep = (value: string) => {
    const nums = value.replace(/\D/g, '').slice(0, 8);
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Arquivo invalido', description: 'Selecione uma imagem', variant: 'destructive' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Arquivo muito grande', description: 'Maximo 2MB', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario nao autenticado');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${oab.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('advogado-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('advogado-logos')
        .getPublicUrl(fileName);

      setLogoUrl(publicUrl);
      toast({ title: 'Logo enviado' });
    } catch (error: any) {
      console.error('Erro ao enviar logo:', error);
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!logoUrl) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Extract file path from URL
      const urlParts = logoUrl.split('/advogado-logos/');
      if (urlParts[1]) {
        await supabase.storage.from('advogado-logos').remove([urlParts[1]]);
      }

      setLogoUrl('');
    } catch (error) {
      console.error('Erro ao remover logo:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('oabs_cadastradas')
        .update({
          nome_advogado: nomeAdvogado || null,
          email_advogado: email || null,
          telefone_advogado: telefone || null,
          endereco_advogado: endereco || null,
          cidade_advogado: cidade || null,
          cep_advogado: cep || null,
          logo_url: logoUrl || null,
        })
        .eq('id', oab.id);

      if (error) throw error;

      toast({ title: 'Dados salvos' });
      await onUpdate();
      setOpen(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" title="Editar dados do advogado">
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dados do Advogado</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Logo/Foto Upload */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar className="w-24 h-24 border-2 border-border">
                <AvatarImage src={logoUrl} alt="Logo" />
                <AvatarFallback className="bg-muted">
                  {uploading ? <Loader2 className="w-6 h-6 animate-spin" /> : <User className="w-8 h-8" />}
                </AvatarFallback>
              </Avatar>
              {logoUrl && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-1 -right-1 h-6 w-6 rounded-full"
                  onClick={handleRemoveLogo}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUploadLogo}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Enviando...' : 'Enviar Logo'}
            </Button>
          </div>

          {/* Dados Pessoais */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome Completo</Label>
              <Input
                id="nome"
                placeholder="Dr. Joao Silva"
                value={nomeAdvogado}
                onChange={(e) => setNomeAdvogado(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={telefone}
                  onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="endereco">Endereco</Label>
              <Input
                id="endereco"
                placeholder="Rua, Numero, Bairro"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cidade">Cidade/UF</Label>
                <Input
                  id="cidade"
                  placeholder="Curitiba/PR"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(formatCep(e.target.value))}
                />
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
