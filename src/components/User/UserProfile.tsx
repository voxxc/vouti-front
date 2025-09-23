import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Edit3, Camera } from "lucide-react";
import { User as UserType } from "@/types/user";

interface UserProfileProps {
  user: UserType;
  onUpdateProfile: (userData: Partial<UserType>) => void;
}

const UserProfile = ({ user, onUpdateProfile }: UserProfileProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: user.name,
    phone: user.personalInfo?.phone || '',
    department: user.personalInfo?.department || '',
    bio: user.personalInfo?.bio || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile({
      name: formData.name,
      personalInfo: {
        ...user.personalInfo,
        phone: formData.phone,
        department: formData.department,
        bio: formData.bio
      }
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <User size={16} />
          PERFIL
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meu Perfil</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="text-lg">
                  {user.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button 
                size="sm" 
                variant="ghost" 
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full p-0"
              >
                <Camera size={14} />
              </Button>
            </div>
            <div className="text-center">
              <h3 className="font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="mt-1">
                {user.role === 'admin' ? 'Administrador' : 'Usuário'}
              </Badge>
            </div>
          </div>

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>
            
            <div>
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="Ex: Jurídico, Financeiro"
              />
            </div>
            
            <div>
              <Label htmlFor="bio">Sobre</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Informações adicionais..."
                rows={3}
              />
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 gap-2">
                <Edit3 size={16} />
                Salvar
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfile;