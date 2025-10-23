import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { GripVertical, LayoutGrid, MoreVertical } from "lucide-react";
import { LinkCollection, LinkItem } from "@/types/link";
import { LinkCard } from "./LinkCard";

interface CollectionCardProps {
  collection: LinkCollection;
  links: LinkItem[];
  onUpdateCollection: (id: string, updates: Partial<LinkCollection>) => Promise<void>;
  onDeleteCollection: (id: string) => Promise<void>;
  onEditLink: (link: LinkItem) => void;
  onDeleteLink: (id: string) => Promise<void>;
  onToggleLink: (id: string) => Promise<void>;
}

export const CollectionCard = ({
  collection,
  links,
  onUpdateCollection,
  onDeleteCollection,
  onEditLink,
  onDeleteLink,
  onToggleLink,
}: CollectionCardProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(collection.title);

  const handleSaveTitle = async () => {
    if (title !== collection.title && title.trim()) {
      await onUpdateCollection(collection.id, { title });
    }
    setIsEditingTitle(false);
  };

  const handleToggleActive = async () => {
    await onUpdateCollection(collection.id, { is_active: !collection.is_active });
  };

  const collectionLinks = links
    .filter(link => link.collection_id === collection.id)
    .sort((a, b) => a.position - b.position);

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
            
            {isEditingTitle ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                className="h-8 text-sm"
              />
            ) : (
              <h3
                onClick={() => setIsEditingTitle(true)}
                className="font-semibold cursor-pointer hover:text-primary"
              >
                {collection.title}
              </h3>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {collectionLinks.length} {collectionLinks.length === 1 ? 'link' : 'links'}
            </span>
            <Switch
              checked={collection.is_active}
              onCheckedChange={handleToggleActive}
            />
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {collectionLinks.map((link) => (
          <LinkCard
            key={link.id}
            link={link}
            onEdit={() => onEditLink(link)}
            onDelete={() => onDeleteLink(link.id)}
            onToggleActive={() => onToggleLink(link.id)}
          />
        ))}
        
        {collectionLinks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum link nesta coleção
          </p>
        )}
      </CardContent>
    </Card>
  );
};
