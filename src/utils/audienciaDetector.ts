 /**
  * Detector de Audiências
  * Identifica audiências e extrai data/hora/local
  */
 
 export interface AudienciaDetectada {
   tipo: string;
   tipoLabel: string;
   dataHora: Date | null;
   dataFim: Date | null; // Para sessões virtuais com período
   local: string | null;
   modalidade: 'presencial' | 'virtual' | 'hibrida' | null;
   linkVideoconferencia: string | null;
   confianca: 'alta' | 'media' | 'baixa';
 }
 
 interface PadraoAudiencia {
   tipo: string;
   tipoLabel: string;
   padroes: RegExp[];
   modalidadePadrao: 'presencial' | 'virtual' | null;
 }
 
 const PADROES_AUDIENCIAS: PadraoAudiencia[] = [
   {
     tipo: 'conciliacao',
     tipoLabel: 'Audiência de Conciliação',
     padroes: [
       /audiência\s+de\s+conciliação/i,
       /aud[iê]ncia\s+conciliat[óo]ria/i,
     ],
     modalidadePadrao: null,
   },
   {
     tipo: 'mediacao',
     tipoLabel: 'Audiência de Mediação',
     padroes: [
       /audiência\s+de\s+mediação/i,
       /sessão\s+de\s+mediação/i,
     ],
     modalidadePadrao: null,
   },
   {
     tipo: 'instrucao_julgamento',
     tipoLabel: 'Audiência de Instrução e Julgamento',
     padroes: [
       /audiência\s+de\s+instrução\s+e\s+julgamento/i,
       /aud[iê]ncia\s+instrutória/i,
     ],
     modalidadePadrao: 'presencial',
   },
   {
     tipo: 'instrucao',
     tipoLabel: 'Audiência de Instrução',
     padroes: [
       /audiência\s+de\s+instrução/i,
     ],
     modalidadePadrao: 'presencial',
   },
   {
     tipo: 'sessao_virtual',
     tipoLabel: 'Sessão Virtual de Julgamento',
     padroes: [
       /sessão\s+virtual/i,
       /incluído\s+em\s+pauta/i,
       /pauta\s+virtual/i,
       /julgamento\s+virtual/i,
     ],
     modalidadePadrao: 'virtual',
   },
   {
     tipo: 'una',
     tipoLabel: 'Audiência Una',
     padroes: [
       /audiência\s+una/i,
     ],
     modalidadePadrao: 'presencial',
   },
   {
     tipo: 'justificacao',
     tipoLabel: 'Audiência de Justificação',
     padroes: [
       /audiência\s+de\s+justificação/i,
     ],
     modalidadePadrao: 'presencial',
   },
   {
     tipo: 'generica',
     tipoLabel: 'Audiência',
     padroes: [
       /audiência\s+designada/i,
       /audiência\s+agendada/i,
     ],
     modalidadePadrao: null,
   },
 ];
 
 const MESES_PT: Record<string, number> = {
   'janeiro': 0, 'fevereiro': 1, 'março': 2, 'marco': 2, 'abril': 3,
   'maio': 4, 'junho': 5, 'julho': 6, 'agosto': 7,
   'setembro': 8, 'outubro': 9, 'novembro': 10, 'dezembro': 11,
 };
 
 /**
  * Extrai data e hora de diferentes formatos encontrados nas descrições
  */
 function extrairDataHora(descricao: string): { dataHora: Date | null; dataFim: Date | null } {
   // Padrão 1: "Agendada para: 01 de abril de 2026 às 14:01"
   const padrao1 = descricao.match(
     /(?:agendada?\s+para|designada?\s+para|marcada?\s+para)[:\s]+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})(?:\s+[àa]s?\s+(\d{1,2})[:\.](\d{2}))?/i
   );
   if (padrao1) {
     const [, dia, mesStr, ano, hora, minuto] = padrao1;
     const mes = MESES_PT[mesStr.toLowerCase()];
     if (mes !== undefined) {
       const date = new Date(
         parseInt(ano),
         mes,
         parseInt(dia),
         hora ? parseInt(hora) : 0,
         minuto ? parseInt(minuto) : 0
       );
       return { dataHora: date, dataFim: null };
     }
   }
 
   // Padrão 2: "SESSÃO VIRTUAL DE 02/03/2026 00:00 ATÉ 06/03/2026 23:59"
   const padrao2 = descricao.match(
     /(?:sessão\s+virtual\s+de|pauta\s+de)\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})\s+at[ée]\s+(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/i
   );
   if (padrao2) {
     const [, diaIni, mesIni, anoIni, horaIni, minIni, diaFim, mesFim, anoFim, horaFim, minFim] = padrao2;
     const dataHora = new Date(
       parseInt(anoIni), parseInt(mesIni) - 1, parseInt(diaIni),
       parseInt(horaIni), parseInt(minIni)
     );
     const dataFim = new Date(
       parseInt(anoFim), parseInt(mesFim) - 1, parseInt(diaFim),
       parseInt(horaFim), parseInt(minFim)
     );
     return { dataHora, dataFim };
   }
 
   // Padrão 3: "Data: 23/01/2026 Hora: 14:00" ou "(23/01/2026)"
   const padrao3 = descricao.match(
     /(?:data[:\s]+)?(\d{2})\/(\d{2})\/(\d{4})(?:\s+(?:hora[:\s]+)?(\d{2})[:\.](\d{2}))?/i
   );
   if (padrao3) {
     const [, dia, mes, ano, hora, minuto] = padrao3;
     const date = new Date(
       parseInt(ano),
       parseInt(mes) - 1,
       parseInt(dia),
       hora ? parseInt(hora) : 0,
       minuto ? parseInt(minuto) : 0
     );
     return { dataHora: date, dataFim: null };
   }
 
   // Padrão 4: "dia 15/03/2026, às 09h30"
   const padrao4 = descricao.match(
     /dia\s+(\d{2})\/(\d{2})\/(\d{4})(?:[,\s]+[àa]s?\s+(\d{1,2})h(\d{2})?)?/i
   );
   if (padrao4) {
     const [, dia, mes, ano, hora, minuto] = padrao4;
     const date = new Date(
       parseInt(ano),
       parseInt(mes) - 1,
       parseInt(dia),
       hora ? parseInt(hora) : 0,
       minuto ? parseInt(minuto) : 0
     );
     return { dataHora: date, dataFim: null };
   }
 
   return { dataHora: null, dataFim: null };
 }
 
 /**
  * Extrai local da audiência
  */
 function extrairLocal(descricao: string): string | null {
   // Padrão: "Local: Sala 5, Fórum X" ou "na sala 3"
   const padraoLocal = descricao.match(
     /(?:local[:\s]+|na\s+)(sala\s+\d+[^,.\n]*|fórum[^,.\n]*|tribunal[^,.\n]*)/i
   );
   if (padraoLocal) {
     return padraoLocal[1].trim();
   }
   return null;
 }
 
 /**
  * Detecta modalidade da audiência
  */
 function extrairModalidade(descricao: string, modalidadePadrao: 'presencial' | 'virtual' | null): 'presencial' | 'virtual' | 'hibrida' | null {
   const descLower = descricao.toLowerCase();
   
   if (descLower.includes('virtual') || descLower.includes('videoconferência') || descLower.includes('online')) {
     if (descLower.includes('presencial') || descLower.includes('híbrida')) {
       return 'hibrida';
     }
     return 'virtual';
   }
   
   if (descLower.includes('presencial')) {
     return 'presencial';
   }
   
   return modalidadePadrao;
 }
 
 /**
  * Extrai link de videoconferência
  */
 function extrairLink(descricao: string): string | null {
   // Padrões comuns de links de videoconferência
   const padraoLink = descricao.match(
     /(https?:\/\/[^\s<>"{}|\\^`\[\]]+(?:zoom|meet|teams|webex|whereby|jitsi)[^\s<>"{}|\\^`\[\]]*)/i
   );
   if (padraoLink) {
     return padraoLink[1];
   }
   return null;
 }
 
 /**
  * Detecta audiência a partir da descrição do andamento
  */
 export function detectarAudiencia(descricao: string | null | undefined): AudienciaDetectada | null {
   if (!descricao) return null;
 
   const descLower = descricao.toLowerCase();
 
  // Verificar se menciona audiência ou sessão
  if (!descLower.includes('audiência') && !descLower.includes('audiencia') && 
      !descLower.includes('sessão') && !descLower.includes('sessao') &&
      !descLower.includes('pauta')) {
    return null;
  }

  // Descartar confirmações de intimação que apenas referenciam audiências existentes
  if (/confirmad[oa]\s+(a\s+)?intima[çc][ãa]o/i.test(descricao) || 
      /referente ao evento/i.test(descricao)) {
    return null;
  }
 
   // Encontrar tipo de audiência
   let tipoEncontrado: PadraoAudiencia | null = null;
   
   for (const padrao of PADROES_AUDIENCIAS) {
     for (const regex of padrao.padroes) {
       if (regex.test(descricao)) {
         tipoEncontrado = padrao;
         break;
       }
     }
     if (tipoEncontrado) break;
   }
 
   if (!tipoEncontrado) return null;
 
   // Extrair informações
   const { dataHora, dataFim } = extrairDataHora(descricao);
   const local = extrairLocal(descricao);
   const modalidade = extrairModalidade(descricao, tipoEncontrado.modalidadePadrao);
   const linkVideoconferencia = extrairLink(descricao);
 
   // Determinar confiança
   let confianca: 'alta' | 'media' | 'baixa' = 'media';
   if (dataHora && tipoEncontrado.tipo !== 'generica') {
     confianca = 'alta';
   } else if (!dataHora) {
     confianca = 'baixa';
   }
 
   return {
     tipo: tipoEncontrado.tipo,
     tipoLabel: tipoEncontrado.tipoLabel,
     dataHora,
     dataFim,
     local,
     modalidade,
     linkVideoconferencia,
     confianca,
   };
 }
 
 /**
  * Retorna cor do badge baseado no tipo de audiência
  */
 export function getAudienciaBadgeClasses(tipo: string): string {
   switch (tipo) {
     case 'conciliacao':
       return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800';
     case 'mediacao':
       return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800';
     case 'instrucao':
     case 'instrucao_julgamento':
       return 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800';
     case 'sessao_virtual':
       return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
     case 'una':
       return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800';
     default:
       return 'bg-muted text-muted-foreground';
   }
 }