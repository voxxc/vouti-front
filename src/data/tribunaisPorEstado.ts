export interface EstadoTribunais {
  estado: string;
  uf: string;
  siglas: string[];
}

export const tribunaisPorEstado: EstadoTribunais[] = [
  { estado: 'Acre', uf: 'AC', siglas: ['TJAC','TRAC','TEAC','TRACADM','DOAC','JFACDJN','TEACME','TCAC','TRACDJN','TJACDJN','TEACDJN'] },
  { estado: 'Alagoas', uf: 'AL', siglas: ['JFAL','TEAL','TJAL','TRAL','EXAL','DMAL','MPAL','EFAL','DPAL','TCAL','DOMAL','LEAL','JFALPJE','TRALADM','AMAAL','JFALADM','TEALME','JFALDJN','TRALDJN','TJALDJN','TEALDJN'] },
  { estado: 'Amazonas', uf: 'AM', siglas: ['TEAM','TJAM','TRAMN','DOMAM','SEFAZAM','DMAM','DOAM','TRAMADM','TCAM','JFAMDJN','TEAMME','MPAM','TJAMDJN','TRAMNDJN','TEAMDJN'] },
  { estado: 'Amapá', uf: 'AP', siglas: ['TEAP','TJAP','TRAP','DOAP','TRAPADM','TCAP','MPAP','JFAPDJN','TEAPME','TJAPDJN','TRAPDJN','TEAPDJN'] },
  { estado: 'Bahia', uf: 'BA', siglas: ['TEBA','TJBA','TRBA','TCBA','TCMBA','DMBA','EXBA','LICBA','DIBA','DOMBA','EXFSBA','LEFSBA','DOEBA','DPBA','LEBA','TRBAADMN','JFBADJN','TEBAME','DMCBA','TJBADJN','TRBADJN','TEBADJN'] },
  { estado: 'Ceará', uf: 'CE', siglas: ['JFCE','TECE','TRCE','JFCEPJE','DMCE','DOCE','TCCE','MPCE','JFCEADM','TRCEADM','DOMCE','TECEME','JFCEDJN','TJCEDJN','TJCEADM','TRCEDJN','TECEDJN'] },
  { estado: 'Distrito Federal', uf: 'DF', siglas: ['DODF','TEDF','TRDF','MPDF','TRDFADM','JFDFDJN','TJDFDJN','TEDFME','TRDFDJN','TEDFDJN','TJDFADM'] },
  { estado: 'Espírito Santo', uf: 'ES', siglas: ['TEES','TJES','TRES','JFESADM','TCES','DOES','TRESADM','LEES','MPES','TEESME','JFESDJN','TJESPJEN','DMSES','TRESDJN','TJESDJN','TEESDJN'] },
  { estado: 'Goiás', uf: 'GO', siglas: ['TEGO','TJGO','TRGO','TCGO','TJGOIMG','DOGO','TCEGO','TRGOADM','DOMGO','DOMFGO','JFGODJN','TEGOME','TRGODJN','TJGODJN','TEGODJN'] },
  { estado: 'Maranhão', uf: 'MA', siglas: ['TEMA','TJMA','TRMA','EXMA','PTMA','TCMA','MPMA','LEMA','TRMAADM','DOMMA','JFMADJN','TJMADJN','TEMAME','TRMADJN','TEMADJN'] },
  { estado: 'Minas Gerais', uf: 'MG', siglas: ['PTMG','TCMG','TEMG','TJMG','TJMGA','TMMG','TRMG','EXMG','MPMG','LEMG','DMMG','TJMGE','DOMMG','CCMG','TRMGADM','JFMGDJN','TEMGME','DOMMGN','TJMGDJN','JFMGDJN6','TRMGDJN','TJMMGDJN','TEMGDJN'] },
  { estado: 'Mato Grosso do Sul', uf: 'MS', siglas: ['JFMS','TEMS','TJMS','TRMS','MPMS','DOMMS','DMDMS','DMNAMS','DMFSMS','DOMS','TRMSADM','DMMS','JFMSDJN','TEMSME','TJMSDJN','TRMSDJN','TEMSDJN'] },
  { estado: 'Mato Grosso', uf: 'MT', siglas: ['TEMT','TJMT','TRMT','TCMT','DOMT','TRMTADM','MPMT','JFMTDJN','TEMTME','TJMTDJN','TJMTADM','TRMTDJN','TEMTDJN'] },
  { estado: 'Pará', uf: 'PA', siglas: ['TEPA','TJPA','TRPA','DOPA','TRPAADM','TCMPA','DOMPA','JFPADJN','TJPADJN','TEPAME','TRPADJN','TEPADJN'] },
  { estado: 'Paraíba', uf: 'PB', siglas: ['JFPB','TEPB','TJPB','TRPB','DOPB','TCPB','JFPBPJE','MPPB','JFPBADM','TEPBME','SEFAZPB','JFPBDJN','TJPBDJN','TRPBADM','TRPBDJN'] },
  { estado: 'Pernambuco', uf: 'PE', siglas: ['JFPE','TEPE','TJPE','TRPE','EXPE','TCPE','MPPE','TJPEPJE','LEPE','JFPEPJE','TRPEADM','DOMPE','DMPE','JFPEADM','TEPEME','TJPEDJN','JFPEDJN','TRPEDJN','TEPEDJN'] },
  { estado: 'Piauí', uf: 'PI', siglas: ['TEPI','TJPI','TRPI','DOPI','TCPI','MPPI','TRPIADM','DMPI','JFPIDJN','TEPIME','TJPIDJN','TRPIDJN','TEPIDJN'] },
  { estado: 'Paraná', uf: 'PR', siglas: ['JFPR','TEPR','TJPR','TRPR','TCPR','EXPR','CISPR','DOMPR','TRPRADM','LEPR','JFPRDJN','TJPRDJN','TEPRME','MPPR','TRPRDJN','TEPRDJN'] },
  { estado: 'Rio de Janeiro', uf: 'RJ', siglas: ['TERJ','TJRJ','MRJRJ','LERJ','PPRJ','TCRJ','EXRJ','TRRJN','MCRJ','JCRJ','TRRJADM','MPRJ','DPRJ','DOMRJ','TERJME','JFRJDJN','JFRJADM','TRRJNDJN','TJRJDJN','TERJDJN'] },
  { estado: 'Rio Grande do Norte', uf: 'RN', siglas: ['JFRN','TERN','TRRN','TJRN','TCRN','JFRNPJE','DORN','JFRNADM','TRRNADM','TERNME','JFRNDJN','TJRNDJN','TRRNDJN','TERNDJN'] },
  { estado: 'Rondônia', uf: 'RO', siglas: ['TERO','TRRO','TJRO','TRROADM','TCRO','DORO','DOMRO','JFRODJN','TJRODJN','TEROME','MPRO','TRRODJN','TERODJN'] },
  { estado: 'Roraima', uf: 'RR', siglas: ['TERR','TJRR','TRRRN','DORR','TRRRADM','LERR','DOMRR','TCRR','JFRRDJN','TERRME','TRRRNDJN','TJRRDJN'] },
  { estado: 'Rio Grande do Sul', uf: 'RS', siglas: ['TERS','TJRS','TRRS','JFRS','TCRS','DOMRS','DORS','DICRS','MPRS','TRRSADM','JFRSDJN','TERSME','LERS','TJRSDJN','TRRSDJN','TJMRSDJN','TERSDJN'] },
  { estado: 'Santa Catarina', uf: 'SC', siglas: ['JFSC','TESC','TJSC','TRSCN','SEFAZSC','TCSC','DOSC','TRSCADM','MPSC','JFSCDJN','TESCME','TJSCDJN','DOMSC','TRSCNDJN','TESCDJN'] },
  { estado: 'Sergipe', uf: 'SE', siglas: ['JFSE','TESE','TRSE','TJSE','JFSEPJE','DOSE','TCSE','MPSE','JFSEADM','TRSEADM','TJSEDJN','TESEME','JFSEDJN','TRSEDJN','TESEDJN'] },
  { estado: 'São Paulo', uf: 'SP', siglas: ['JFSP','TESP','TJSP','TRSP','LESP','EMSP','EXSP','TRSPN','CISP','JUCESP','OABSP','TMSP','DOMSP','TITSP','DMCSP','TITPAUTA','DMMSP','JFSPDJN','TESPME','TMSPDJN','DMGSP','TCSP','MPSP','TRSPNADM','TRSPADM','TCESP','DOMSP2','TJSPDJN','TRSPNDJN','TRSPDJN','TESPDJN','TJSP2'] },
  { estado: 'Tocantins', uf: 'TO', siglas: ['TETO','TJTO','TRTO','DOTO','TRTOADM','TCTO','LETO','MPTO','JFTODJN','TETOME','TRTODJN','TJTODJN','TETODJN'] },
  { estado: 'Tribunal Superior', uf: 'SUPERIOR', siglas: ['STJ','STM','TRF3','TRF4','TRF5','TSE','TST','CNJ','CSJT','CMP','TCU','DOU','TRF2ADM','CSJTADM','TRF5PJE','TRF5ADM','TRF1PJE','OAB','DTM','INPI','ENAMAT','CMPADM','TSTADM','CVM','BCB','TRF3PAUTA','TRF1DJN','TRF4DJN','TRF3DJN','TSEME','TRF5DJN','CJFDJN','CORDJN','SEEUDJN','TRF2DJN','STFDJE','DMPF','TRF6DJN','TRF6ADM','TRF1ATA','TRF1PAUTAS','TRF1ATAS','TSTDJN','STJDJN','STMDJN','TSEDJN','CNJDJN'] },
];

// Helper: get all siglas flat
export const getAllTribunaisSiglas = (): string[] => {
  return tribunaisPorEstado.flatMap(e => e.siglas);
};

// Helper: get siglas by selected states
export const getTribunaisByEstados = (estados: string[]): string[] => {
  return tribunaisPorEstado
    .filter(e => estados.includes(e.uf) || estados.includes(e.estado))
    .flatMap(e => e.siglas);
};
