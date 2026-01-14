import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Upload, Trash2, User, Save } from 'lucide-react';
import { useProjectAdvogado, ProjectAdvogadoData } from '@/hooks/useProjectAdvogado';

interface EditarAdvogadoProjectModalProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditarAdvogadoProjectModal({
  projectId,
  open,
  onOpenChange,
}: EditarAdvogadoProjectModalProps) {
  const { advogado, loading, updateAdvogado, uploadLogo, removeLogo, refetch } = useProjectAdvogado(projectId);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<ProjectAdvogadoData>({
    nomeAdvogado: '',
    emailAdvogado: '',
    telefoneAdvogado: '',
    enderecoAdvogado: '',
    cidadeAdvogado: '',
    cepAdvogado: '',
    logoUrl: null,
  });

  useEffect(() => {
    if (advogado) {
      setFormData({
        nomeAdvogado: advogado.nomeAdvogado || '',
        emailAdvogado: advogado.emailAdvogado || '',
        telefoneAdvogado: advogado.telefoneAdvogado || '',
        enderecoAdvogado: advogado.enderecoAdvogado || '',
        cidadeAdvogado: advogado.cidadeAdvogado || '',
        cepAdvogado: advogado.cepAdvogado || '',
        logoUrl: advogado.logoUrl,
      });
    }
  }, [advogado]);

  useEffect(() => {
    if (open) {
      refetch();
    }
  }, [open, refetch]);

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadLogo(file);
      if (url) {
        setFormData((prev) => ({ ...prev, logoUrl: url }));
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setFormData((prev) => ({ ...prev, logoUrl: null }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAdvogado(formData);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Perfil do Advogado
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Logo Section */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                {formData.logoUrl ? (
                  <AvatarImage src={formData.logoUrl} alt="Logo" />
                ) : (
                  <AvatarFallback>
                    <User className="w-12 h-12 text-muted-foreground" />
                  </AvatarFallback>
                )}
              </Avatar>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.getElementById('logo-upload')?.click()}
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {formData.logoUrl ? 'Alterar' : 'Adicionar'} Logo
                </Button>

                {formData.logoUrl && (
                  <Button variant="outline" size="sm" onClick={handleRemoveLogo}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}

                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadLogo}
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Advogado</Label>
                <Input
                  id="nome"
                  placeholder="Dr. João Silva"
                  value={formData.nomeAdvogado || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nomeAdvogado: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@escritorio.com"
                    value={formData.emailAdvogado || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, emailAdvogado: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input
                    id="telefone"
                    placeholder="(41) 99999-9999"
                    value={formData.telefoneAdvogado || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, telefoneAdvogado: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  placeholder="Rua Exemplo, 123 - Centro"
                  value={formData.enderecoAdvogado || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, enderecoAdvogado: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade/UF</Label>
                  <Input
                    id="cidade"
                    placeholder="Curitiba/PR"
                    value={formData.cidadeAdvogado || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cidadeAdvogado: e.target.value }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    placeholder="80000-000"
                    value={formData.cepAdvogado || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, cepAdvogado: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Perfil
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
