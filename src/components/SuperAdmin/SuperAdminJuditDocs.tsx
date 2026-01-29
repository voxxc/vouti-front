import { useState } from 'react';
import { Search, BookOpen, ExternalLink, FileCode, Loader2, FileText, Code } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DocSearchResult {
  title?: string;
  content?: string;
  url?: string;
  type?: 'guide' | 'api' | 'code' | string;
}

export function SuperAdminJuditDocs() {
  const [query, setQuery] = useState('');
  const [apiReferenceOnly, setApiReferenceOnly] = useState(false);
  const [codeOnly, setCodeOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DocSearchResult[]>([]);
  const [rawResult, setRawResult] = useState<any>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!query.trim()) {
      toast({
        title: 'Busca vazia',
        description: 'Digite algo para buscar na documentação',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      const { data, error } = await supabase.functions.invoke('judit-docs-search', {
        body: {
          query: query.trim(),
          apiReferenceOnly,
          codeOnly
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      console.log('Resultado da busca:', data);
      setRawResult(data?.results);

      // Tentar extrair resultados estruturados
      const extractedResults = extractResults(data?.results);
      setResults(extractedResults);

      if (extractedResults.length === 0 && data?.results) {
        toast({
          title: 'Resultados encontrados',
          description: 'Veja os resultados abaixo (formato raw)'
        });
      }

    } catch (error: any) {
      console.error('Erro na busca:', error);
      toast({
        title: 'Erro na busca',
        description: error.message || 'Não foi possível buscar na documentação',
        variant: 'destructive'
      });
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Função para extrair resultados de diferentes formatos de resposta
  const extractResults = (data: any): DocSearchResult[] => {
    if (!data) return [];

    // Se tiver propriedade content com array (formato MCP Mintlify)
    if (data.content && Array.isArray(data.content)) {
      return data.content.map((item: any) => {
        if (item.type === 'text' && typeof item.text === 'string') {
          // Parse format: "Title: ...\nLink: ...\nContent: ..."
          const text = item.text;
          const titleMatch = text.match(/^Title:\s*(.+?)(?:\n|$)/);
          const linkMatch = text.match(/Link:\s*(https?:\/\/[^\s\n]+)/);
          const contentMatch = text.match(/Content:\s*([\s\S]*)/);
          
          return {
            title: titleMatch ? titleMatch[1].trim() : 'Resultado',
            content: contentMatch ? contentMatch[1].trim().slice(0, 300) : text.slice(0, 300),
            url: linkMatch ? linkMatch[1].trim() : '',
            type: linkMatch?.[1]?.includes('api-reference') ? 'api' : 'guide'
          };
        }
        return {
          title: item.title || 'Resultado',
          content: item.text || item.content || '',
          url: item.url || '',
          type: item.type || 'guide'
        };
      });
    }

    // Se for array direto
    if (Array.isArray(data)) {
      return data.map(item => ({
        title: item.title || item.name || 'Sem título',
        content: item.content || item.description || item.snippet || item.text || '',
        url: item.url || item.link || item.href || '',
        type: item.type || 'guide'
      }));
    }

    // Se for objeto com resultados
    if (data.results) {
      return extractResults(data.results);
    }

    // Se for texto simples
    if (typeof data === 'string') {
      return [{
        title: 'Resultado',
        content: data,
        url: '',
        type: 'text'
      }];
    }

    return [];
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case 'api':
        return <FileCode className="h-4 w-4 text-primary" />;
      case 'code':
        return <Code className="h-4 w-4 text-accent-foreground" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2 flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          Documentação Judit API
        </h2>
        <p className="text-muted-foreground">
          Consulte a documentação oficial da API Judit diretamente do painel
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Buscar na Documentação</CardTitle>
          <CardDescription>
            Pesquise endpoints, exemplos de código, guias e referências da API
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: como monitorar processos, endpoint tracking, webhook..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !query.trim()}>
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-2 hidden sm:inline">Buscar</span>
              </Button>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="apiOnly"
                  checked={apiReferenceOnly}
                  onCheckedChange={(checked) => setApiReferenceOnly(checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="apiOnly" className="text-sm cursor-pointer">
                  Apenas referência de API
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="codeOnly"
                  checked={codeOnly}
                  onCheckedChange={(checked) => setCodeOnly(checked === true)}
                  disabled={loading}
                />
                <Label htmlFor="codeOnly" className="text-sm cursor-pointer">
                  Apenas código
                </Label>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-5 w-1/3 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && !rawResult && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum resultado encontrado para "{query}"</p>
            <p className="text-sm mt-2">Tente buscar com termos diferentes</p>
          </CardContent>
        </Card>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {results.length} resultado(s) encontrado(s)
          </p>
          {results.map((result, index) => (
            <Card key={index} className="hover:bg-muted/50 transition-colors">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {getTypeIcon(result.type)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground mb-1">
                      {result.title || 'Resultado'}
                    </h3>
                    {result.content && (
                      <p className="text-sm text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                        {result.content}
                      </p>
                    )}
                    {result.url && (
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Abrir documentação
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Raw result fallback */}
      {!loading && hasSearched && results.length === 0 && rawResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resultado (formato raw)</CardTitle>
            <CardDescription>
              O resultado não pôde ser estruturado, exibindo conteúdo bruto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs max-h-96">
              {typeof rawResult === 'string' 
                ? rawResult 
                : JSON.stringify(rawResult, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && !hasSearched && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-center text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Digite uma busca para consultar a documentação da API Judit</p>
            <p className="text-sm mt-2">
              Exemplos: "tracking", "webhook", "processos", "credenciais"
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
