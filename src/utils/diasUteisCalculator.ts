 /**
  * Calculador de Dias Úteis
  * Calcula prazos em dias úteis considerando feriados forenses
  */
 
 import { addDays, isWeekend, format } from 'date-fns';
 
 export interface Feriado {
   data: Date;
   descricao: string;
   tipo: 'nacional' | 'estadual' | 'municipal' | 'forense';
 }
 
 /**
  * Verifica se uma data é feriado
  */
 export function isFeriado(date: Date, feriados: Feriado[]): boolean {
   const dateStr = format(date, 'yyyy-MM-dd');
   return feriados.some(f => format(f.data, 'yyyy-MM-dd') === dateStr);
 }
 
 /**
  * Verifica se uma data é dia útil (não é fim de semana nem feriado)
  */
 export function isDiaUtil(date: Date, feriados: Feriado[]): boolean {
   return !isWeekend(date) && !isFeriado(date, feriados);
 }
 
 /**
  * Calcula a data final somando dias úteis
  * @param dataInicio Data de início do prazo
  * @param prazoEmDias Quantidade de dias úteis
  * @param feriados Lista de feriados a considerar
  * @returns Data final do prazo
  */
 export function calcularPrazoDiasUteis(
   dataInicio: Date,
   prazoEmDias: number,
   feriados: Feriado[]
 ): Date {
   let dataAtual = new Date(dataInicio);
   let diasContados = 0;
 
   while (diasContados < prazoEmDias) {
     dataAtual = addDays(dataAtual, 1);
     
     if (isDiaUtil(dataAtual, feriados)) {
       diasContados++;
     }
   }
 
   return dataAtual;
 }
 
 /**
  * Conta quantos dias úteis existem entre duas datas
  */
 export function contarDiasUteis(
   dataInicio: Date,
   dataFim: Date,
   feriados: Feriado[]
 ): number {
   let count = 0;
   let dataAtual = new Date(dataInicio);
 
   while (dataAtual < dataFim) {
     dataAtual = addDays(dataAtual, 1);
     if (isDiaUtil(dataAtual, feriados)) {
       count++;
     }
   }
 
   return count;
 }
 
 /**
  * Retorna o próximo dia útil a partir de uma data
  */
 export function proximoDiaUtil(date: Date, feriados: Feriado[]): Date {
   let dataAtual = new Date(date);
   
   while (!isDiaUtil(dataAtual, feriados)) {
     dataAtual = addDays(dataAtual, 1);
   }
   
   return dataAtual;
 }
 
 /**
  * Gera lista de feriados do recesso forense (20/dez a 06/jan)
  */
 export function gerarRecessoForense(ano: number): Feriado[] {
   const feriados: Feriado[] = [];
   
   // 20/dez do ano até 31/dez
   for (let dia = 20; dia <= 31; dia++) {
     feriados.push({
       data: new Date(ano, 11, dia), // Dezembro = 11
       descricao: 'Recesso Forense',
       tipo: 'forense',
     });
   }
   
   // 01/jan até 06/jan do próximo ano
   for (let dia = 1; dia <= 6; dia++) {
     feriados.push({
       data: new Date(ano + 1, 0, dia), // Janeiro = 0
       descricao: 'Recesso Forense',
       tipo: 'forense',
     });
   }
   
   return feriados;
 }
 
 /**
  * Lista de feriados nacionais fixos
  */
 export function getFeriadosNacionaisFixos(ano: number): Feriado[] {
   return [
     { data: new Date(ano, 0, 1), descricao: 'Confraternização Universal', tipo: 'nacional' },
     { data: new Date(ano, 3, 21), descricao: 'Tiradentes', tipo: 'nacional' },
     { data: new Date(ano, 4, 1), descricao: 'Dia do Trabalho', tipo: 'nacional' },
     { data: new Date(ano, 8, 7), descricao: 'Independência do Brasil', tipo: 'nacional' },
     { data: new Date(ano, 9, 12), descricao: 'Nossa Senhora Aparecida', tipo: 'nacional' },
     { data: new Date(ano, 10, 2), descricao: 'Finados', tipo: 'nacional' },
     { data: new Date(ano, 10, 15), descricao: 'Proclamação da República', tipo: 'nacional' },
     { data: new Date(ano, 11, 25), descricao: 'Natal', tipo: 'nacional' },
   ];
 }