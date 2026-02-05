 /**
  * Detector de Tipo de Ato Processual
  * Identifica o tipo de intimação e retorna prazo padrão CPC
  */
 
 export interface TipoAtoDetectado {
   tipoAto: string;
   tipoAtoLabel: string;
   prazoDias: number;
   diasUteis: boolean;
   fundamentoLegal: string;
   categoria: 'resposta' | 'recurso' | 'manifestacao';
   confianca: 'alta' | 'media' | 'baixa';
 }
 
 interface PadraoDeteccao {
   tipoAto: string;
   tipoAtoLabel: string;
   prazoDias: number;
   diasUteis: boolean;
   fundamentoLegal: string;
   categoria: 'resposta' | 'recurso' | 'manifestacao';
   padroes: RegExp[];
 }
 
 const PADROES_ATOS: PadraoDeteccao[] = [
   {
     tipoAto: 'contestacao',
     tipoAtoLabel: 'Contestação',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 335, CPC',
     categoria: 'resposta',
     padroes: [
       /apresentar\s+contestação/i,
       /para\s+contestar/i,
       /contestação\s+no\s+prazo/i,
       /prazo\s+para\s+contestar/i,
       /defesa\s+no\s+prazo/i,
     ],
   },
   {
     tipoAto: 'replica',
     tipoAtoLabel: 'Réplica',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 351, CPC',
     categoria: 'resposta',
     padroes: [
       /réplica/i,
       /impugnação\s+à\s+contestação/i,
       /manifestar\s+sobre\s+contestação/i,
     ],
   },
   {
     tipoAto: 'embargos_declaracao',
     tipoAtoLabel: 'Embargos de Declaração',
     prazoDias: 5,
     diasUteis: true,
     fundamentoLegal: 'Art. 1.023, CPC',
     categoria: 'recurso',
     padroes: [
       /embargos\s+de\s+declaração/i,
       /embargos\s+declaratórios/i,
     ],
   },
   {
     tipoAto: 'agravo_instrumento',
     tipoAtoLabel: 'Agravo de Instrumento',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 1.016, CPC',
     categoria: 'recurso',
     padroes: [
       /agravo\s+de\s+instrumento/i,
     ],
   },
   {
     tipoAto: 'agravo_interno',
     tipoAtoLabel: 'Agravo Interno',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 1.021, CPC',
     categoria: 'recurso',
     padroes: [
       /agravo\s+interno/i,
       /agravo\s+regimental/i,
     ],
   },
   {
     tipoAto: 'apelacao',
     tipoAtoLabel: 'Apelação',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 1.003, CPC',
     categoria: 'recurso',
     padroes: [
       /apelação/i,
       /apelar/i,
       /recurso\s+de\s+apelação/i,
     ],
   },
   {
     tipoAto: 'recurso_especial',
     tipoAtoLabel: 'Recurso Especial',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 1.029, CPC',
     categoria: 'recurso',
     padroes: [
       /recurso\s+especial/i,
       /\bresp\b/i,
     ],
   },
   {
     tipoAto: 'recurso_extraordinario',
     tipoAtoLabel: 'Recurso Extraordinário',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 1.029, CPC',
     categoria: 'recurso',
     padroes: [
       /recurso\s+extraordinário/i,
       /\brex\b/i,
     ],
   },
   {
     tipoAto: 'impugnacao_cumprimento',
     tipoAtoLabel: 'Impugnação ao Cumprimento',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 525, CPC',
     categoria: 'resposta',
     padroes: [
       /impugnação\s+ao\s+cumprimento/i,
       /impugnar\s+cumprimento/i,
     ],
   },
   {
     tipoAto: 'embargos_execucao',
     tipoAtoLabel: 'Embargos à Execução',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 915, CPC',
     categoria: 'resposta',
     padroes: [
       /embargos\s+à\s+execução/i,
       /embargos\s+do\s+devedor/i,
     ],
   },
   {
     tipoAto: 'emenda_inicial',
     tipoAtoLabel: 'Emenda à Inicial',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 321, CPC',
     categoria: 'manifestacao',
     padroes: [
       /emenda/i,
       /emendar/i,
       /emenda\s+à\s+inicial/i,
       /regularizar\s+inicial/i,
     ],
   },
   {
     tipoAto: 'pagamento_voluntario',
     tipoAtoLabel: 'Pagamento Voluntário',
     prazoDias: 3,
     diasUteis: true,
     fundamentoLegal: 'Art. 523, CPC',
     categoria: 'manifestacao',
     padroes: [
       /pagamento\s+voluntário/i,
       /pagar\s+voluntariamente/i,
       /efetuar\s+pagamento/i,
     ],
   },
   {
     tipoAto: 'alegacoes_finais',
     tipoAtoLabel: 'Alegações Finais',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 364, CPC',
     categoria: 'manifestacao',
     padroes: [
       /alegações\s+finais/i,
       /razões\s+finais/i,
       /memoriais/i,
     ],
   },
   {
     tipoAto: 'contrarrazoes',
     tipoAtoLabel: 'Contrarrazões',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 1.010, CPC',
     categoria: 'resposta',
     padroes: [
       /contrarrazões/i,
       /contra-razões/i,
     ],
   },
   // Manifestação genérica deve ser o último (fallback)
   {
     tipoAto: 'manifestacao_generica',
     tipoAtoLabel: 'Manifestação',
     prazoDias: 15,
     diasUteis: true,
     fundamentoLegal: 'Art. 218, CPC',
     categoria: 'manifestacao',
     padroes: [
       /manifestar/i,
       /manifestação/i,
       /ciência/i,
     ],
   },
 ];
 
 /**
  * Detecta o tipo de ato processual a partir da descrição da intimação
  */
 export function detectarTipoAto(descricao: string | null | undefined): TipoAtoDetectado | null {
   if (!descricao) return null;
 
   const descLower = descricao.toLowerCase();
 
   // Verificar se é uma intimação
   if (!descLower.includes('intimação') && !descLower.includes('intimacao')) {
     return null;
   }
 
   // Tentar match com padrões específicos primeiro
   for (const padrao of PADROES_ATOS) {
     for (const regex of padrao.padroes) {
       if (regex.test(descricao)) {
         // Determinar confiança baseada em quão específico é o match
         let confianca: 'alta' | 'media' | 'baixa' = 'media';
         
         // Alta confiança para termos muito específicos
         if (padrao.tipoAto !== 'manifestacao_generica') {
           const termoEspecifico = padrao.padroes[0].test(descricao);
           confianca = termoEspecifico ? 'alta' : 'media';
         } else {
           confianca = 'baixa';
         }
 
         return {
           tipoAto: padrao.tipoAto,
           tipoAtoLabel: padrao.tipoAtoLabel,
           prazoDias: padrao.prazoDias,
           diasUteis: padrao.diasUteis,
           fundamentoLegal: padrao.fundamentoLegal,
           categoria: padrao.categoria,
           confianca,
         };
       }
     }
   }
 
   return null;
 }
 
 /**
  * Retorna cor do badge baseado na categoria do ato
  */
 export function getTipoAtoBadgeClasses(categoria: TipoAtoDetectado['categoria']): string {
   switch (categoria) {
     case 'resposta':
       return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
     case 'recurso':
       return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
     case 'manifestacao':
       return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
     default:
       return 'bg-muted text-muted-foreground';
   }
 }