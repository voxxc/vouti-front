import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  Search, 
  Phone, 
  Mail, 
  Loader2,
  MoreVertical,
  Trash2,
  Edit,
  UserPlus,
  Send,
  FileText
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { SaveContactDialog } from "../components/SaveContactDialog";
import { ContactNotesPanel } from "../components/ContactNotesPanel";

interface WhatsAppContact {
  id: string;
  phone: string;
  name: string;
  email?: string;
  notes?: string;
  created_at: string;
  labels: { id: string; name: string; color: string }[];
}

interface WhatsAppLabel {
  id: string;
  name: string;
  color: string;
}

interface WhatsAppContactsProps {
  onStartConversation?: (phone: string, contactName: string) => void;
}

export const WhatsAppContacts = ({ onStartConversation }: WhatsAppContactsProps = {}) => {
  const { tenantId } = useTenantId();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [labels, setLabels] = useState<WhatsAppLabel[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [editingContact, setEditingContact] = useState<WhatsAppContact | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [detailsContact, setDetailsContact] = useState<WhatsAppContact | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    const checkSuperAdmin = async () => {
      if (!currentUserId) return;
      const { data } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", currentUserId)
        .maybeSingle();
      setIsSuperAdmin(!!data);
    };
    checkSuperAdmin();
  }, [currentUserId]);

  const loadContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("whatsapp_contacts")
        .select(`
          *,
          whatsapp_contact_labels(
            whatsapp_labels(id, name, color)
          )
        `)
        .order("name");

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else if (isSuperAdmin) {
        query = query.is("tenant_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedContacts: WhatsAppContact[] = (data || []).map((contact: any) => ({
        id: contact.id,
        phone: contact.phone,
        name: contact.name,
        email: contact.email,
        notes: contact.notes,
        created_at: contact.created_at,
        labels: (contact.whatsapp_contact_labels || [])
          .map((cl: any) => cl.whatsapp_labels)
          .filter(Boolean),
      }));

      setContacts(formattedContacts);
    } catch (error) {
      console.error("Erro ao carregar contatos:", error);
      toast.error("Erro ao carregar contatos");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, isSuperAdmin]);

  const loadLabels = useCallback(async () => {
    try {
      let query = supabase
        .from("whatsapp_labels")
        .select("*")
        .order("name");

      if (tenantId) {
        query = query.eq("tenant_id", tenantId);
      } else if (isSuperAdmin) {
        query = query.is("tenant_id", null);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLabels(data || []);
    } catch (error) {
      console.error("Erro ao carregar etiquetas:", error);
    }
  }, [tenantId, isSuperAdmin]);

  useEffect(() => {
    if (tenantId || isSuperAdmin) {
      loadContacts();
      loadLabels();
    }
  }, [loadContacts, loadLabels, tenantId, isSuperAdmin]);

  const filteredContacts = contacts.filter((contact) => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.phone.includes(searchQuery) ||
      (contact.email?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);

    if (selectedLabel === "all") return matchesSearch;
    return matchesSearch && contact.labels.some((label) => label.id === selectedLabel);
  });

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm("Tem certeza que deseja excluir este contato?")) return;
    try {
      const { error } = await supabase.from("whatsapp_contacts").delete().eq("id", contactId);
      if (error) throw error;
      toast.success("Contato excluído");
      loadContacts();
    } catch (error) {
      console.error("Erro ao excluir contato:", error);
      toast.error("Erro ao excluir contato");
    }
  };

  const handleEditContact = (contact: WhatsAppContact) => {
    setEditingContact(contact);
    setShowEditDialog(true);
  };

  const handleDetailsContact = (contact: WhatsAppContact) => {
    setDetailsContact(contact);
    setShowDetailsDialog(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Contatos
        </h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setShowNewContactDialog(true)}>
            <UserPlus className="h-4 w-4 mr-1" />
            Novo Contato
          </Button>
          <Badge variant="secondary">{filteredContacts.length} contatos</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedLabel} onValueChange={setSelectedLabel}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por etiqueta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as etiquetas</SelectItem>
            {labels.map((label) => (
              <SelectItem key={label.id} value={label.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: label.color }} />
                  {label.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contacts List */}
      <ScrollArea className="flex-1">
        {filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Users className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">
              {searchQuery || selectedLabel !== "all" ? "Nenhum contato encontrado" : "Nenhum contato salvo ainda"}
            </p>
            <p className="text-xs mt-1">Salve contatos através do painel de conversa</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="p-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-green-500/20 text-green-600">
                      {contact.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{contact.name}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {contact.phone}
                      </span>
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {contact.email}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {contact.labels.slice(0, 3).map((label) => (
                      <Badge key={label.id} style={{ backgroundColor: label.color }} className="text-white text-xs">
                        {label.name}
                      </Badge>
                    ))}
                    {contact.labels.length > 3 && (
                      <Badge variant="secondary" className="text-xs">+{contact.labels.length - 3}</Badge>
                    )}
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setTimeout(() => handleDetailsContact(contact), 100);
                        }}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Detalhes
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditContact(contact)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      {onStartConversation && (
                        <DropdownMenuItem onClick={() => onStartConversation(contact.phone, contact.name)}>
                          <Send className="h-4 w-4 mr-2" />
                          Enviar Mensagem
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => handleDeleteContact(contact.id)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {contact.notes && (
                  <p className="text-sm text-muted-foreground mt-2 pl-14">{contact.notes}</p>
                )}
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Detalhes - {detailsContact?.name}
            </DialogTitle>
          </DialogHeader>
          {detailsContact && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Telefone:</span> {detailsContact.phone}</p>
                {detailsContact.email && <p><span className="text-muted-foreground">Email:</span> {detailsContact.email}</p>}
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Notas</h4>
                <ContactNotesPanel contactPhone={detailsContact.phone} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingContact && (
        <SaveContactDialog
          open={showEditDialog}
          onOpenChange={(open) => {
            setShowEditDialog(open);
            if (!open) { setEditingContact(null); loadContacts(); }
          }}
          phone={editingContact.phone}
          initialName={editingContact.name}
        />
      )}

      {/* New Contact Dialog */}
      <SaveContactDialog
        open={showNewContactDialog}
        onOpenChange={setShowNewContactDialog}
        phone=""
        allowPhoneEdit
        onContactSaved={() => { loadContacts(); setShowNewContactDialog(false); }}
      />
    </div>
  );
};
