export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      avisos_ciencia: {
        Row: {
          aviso_id: string
          confirmado_em: string | null
          id: string
          user_id: string
        }
        Insert: {
          aviso_id: string
          confirmado_em?: string | null
          id?: string
          user_id: string
        }
        Update: {
          aviso_id?: string
          confirmado_em?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_ciencia_aviso_id_fkey"
            columns: ["aviso_id"]
            isOneToOne: false
            referencedRelation: "avisos_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      avisos_sistema: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          imagem_url: string
          system_type_id: string | null
          titulo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          imagem_url: string
          system_type_id?: string | null
          titulo: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          imagem_url?: string
          system_type_id?: string | null
          titulo?: string
        }
        Relationships: [
          {
            foreignKeyName: "avisos_sistema_system_type_id_fkey"
            columns: ["system_type_id"]
            isOneToOne: false
            referencedRelation: "system_types"
            referencedColumns: ["id"]
          },
        ]
      }
      batink_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          user_id?: string
        }
        Relationships: []
      }
      batink_profiles: {
        Row: {
          apelido: string | null
          cargo: string | null
          created_at: string | null
          empresa: string | null
          id: string
          nome_completo: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          apelido?: string | null
          cargo?: string | null
          created_at?: string | null
          empresa?: string | null
          id?: string
          nome_completo?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          apelido?: string | null
          cargo?: string | null
          created_at?: string | null
          empresa?: string | null
          id?: string
          nome_completo?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      batink_time_entries: {
        Row: {
          created_at: string | null
          entry_date: string | null
          entry_time: string | null
          entry_type: string
          id: string
          notes: string | null
          registered_at: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_date?: string | null
          entry_time?: string | null
          entry_type: string
          id?: string
          notes?: string | null
          registered_at?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_date?: string | null
          entry_time?: string | null
          entry_type?: string
          id?: string
          notes?: string | null
          registered_at?: string
          user_id?: string
        }
        Relationships: []
      }
      batink_user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["batink_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["batink_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["batink_role"]
          user_id?: string
        }
        Relationships: []
      }
      busca_processos_oab: {
        Row: {
          created_at: string
          data_busca: string
          id: string
          oab_numero: string
          oab_uf: string
          resultado_completo: Json | null
          tenant_id: string | null
          total_processos_encontrados: number
          user_id: string
        }
        Insert: {
          created_at?: string
          data_busca?: string
          id?: string
          oab_numero: string
          oab_uf: string
          resultado_completo?: Json | null
          tenant_id?: string | null
          total_processos_encontrados?: number
          user_id: string
        }
        Update: {
          created_at?: string
          data_busca?: string
          id?: string
          oab_numero?: string
          oab_uf?: string
          resultado_completo?: Json | null
          tenant_id?: string | null
          total_processos_encontrados?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "busca_processos_oab_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      client_history: {
        Row: {
          action_type: string
          client_name: string
          created_at: string
          description: string | null
          id: string
          project_id: string
          tenant_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_type: string
          client_name: string
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          tenant_id?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_type?: string
          client_name?: string
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          tenant_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_dividas: {
        Row: {
          cliente_id: string
          created_at: string | null
          data_inicio: string
          data_vencimento_final: string | null
          descricao: string | null
          id: string
          numero_parcelas: number
          status: string
          tenant_id: string | null
          titulo: string
          updated_at: string | null
          valor_parcela: number
          valor_total: number
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          data_inicio: string
          data_vencimento_final?: string | null
          descricao?: string | null
          id?: string
          numero_parcelas?: number
          status?: string
          tenant_id?: string | null
          titulo: string
          updated_at?: string | null
          valor_parcela: number
          valor_total: number
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          data_inicio?: string
          data_vencimento_final?: string | null
          descricao?: string | null
          id?: string
          numero_parcelas?: number
          status?: string
          tenant_id?: string | null
          titulo?: string
          updated_at?: string | null
          valor_parcela?: number
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "cliente_dividas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_dividas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_documentos: {
        Row: {
          cliente_id: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          tenant_id: string | null
          uploaded_by: string
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tenant_id?: string | null
          uploaded_by: string
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tenant_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_documentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_etiquetas: {
        Row: {
          cliente_id: string
          created_at: string | null
          etiqueta_id: string
          id: string
          tenant_id: string | null
        }
        Insert: {
          cliente_id: string
          created_at?: string | null
          etiqueta_id: string
          id?: string
          tenant_id?: string | null
        }
        Update: {
          cliente_id?: string
          created_at?: string | null
          etiqueta_id?: string
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_etiquetas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_etiquetas_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_etiquetas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_pagamento_comentarios: {
        Row: {
          comentario: string
          created_at: string | null
          id: string
          parcela_id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comentario: string
          created_at?: string | null
          id?: string
          parcela_id: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comentario?: string
          created_at?: string | null
          id?: string
          parcela_id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cliente_pagamento_comentarios_parcela_id_fkey"
            columns: ["parcela_id"]
            isOneToOne: false
            referencedRelation: "cliente_parcelas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_pagamento_comentarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_parcelas: {
        Row: {
          cliente_id: string
          comprovante_url: string | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string
          divida_id: string | null
          grupo_descricao: string | null
          id: string
          metodo_pagamento: string | null
          numero_parcela: number
          observacoes: string | null
          saldo_restante: number | null
          status: string
          tenant_id: string | null
          updated_at: string | null
          valor_pago: number | null
          valor_parcela: number
        }
        Insert: {
          cliente_id: string
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          divida_id?: string | null
          grupo_descricao?: string | null
          id?: string
          metodo_pagamento?: string | null
          numero_parcela: number
          observacoes?: string | null
          saldo_restante?: number | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          valor_pago?: number | null
          valor_parcela: number
        }
        Update: {
          cliente_id?: string
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          divida_id?: string | null
          grupo_descricao?: string | null
          id?: string
          metodo_pagamento?: string | null
          numero_parcela?: number
          observacoes?: string | null
          saldo_restante?: number | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
          valor_pago?: number | null
          valor_parcela?: number
        }
        Relationships: [
          {
            foreignKeyName: "cliente_parcelas_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_parcelas_divida_id_fkey"
            columns: ["divida_id"]
            isOneToOne: false
            referencedRelation: "cliente_dividas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_parcelas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clientes: {
        Row: {
          aplicar_juros: boolean | null
          aplicar_multa: boolean | null
          classificacao: string | null
          cnh: string | null
          cnh_validade: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string | null
          dados_veiculares: Json | null
          data_cadastro: string | null
          data_fechamento: string | null
          data_nascimento: string | null
          data_vencimento_final: string | null
          data_vencimento_inicial: string | null
          email: string | null
          endereco: string | null
          forma_pagamento: string | null
          grupos_parcelas: Json | null
          id: string
          nome_pessoa_fisica: string | null
          nome_pessoa_juridica: string | null
          numero_parcelas: number | null
          observacoes: string | null
          origem_rede_social: string | null
          origem_tipo: string | null
          pessoas_adicionais: Json | null
          profissao: string | null
          proveito_economico: number | null
          status_cliente: string
          taxa_juros_mensal: number | null
          taxa_multa: number | null
          telefone: string | null
          tenant_id: string | null
          uf: string | null
          updated_at: string | null
          user_id: string
          valor_contrato: number | null
          valor_entrada: number | null
          valor_parcela: number | null
          vendedor: string | null
        }
        Insert: {
          aplicar_juros?: boolean | null
          aplicar_multa?: boolean | null
          classificacao?: string | null
          cnh?: string | null
          cnh_validade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          dados_veiculares?: Json | null
          data_cadastro?: string | null
          data_fechamento?: string | null
          data_nascimento?: string | null
          data_vencimento_final?: string | null
          data_vencimento_inicial?: string | null
          email?: string | null
          endereco?: string | null
          forma_pagamento?: string | null
          grupos_parcelas?: Json | null
          id?: string
          nome_pessoa_fisica?: string | null
          nome_pessoa_juridica?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          origem_rede_social?: string | null
          origem_tipo?: string | null
          pessoas_adicionais?: Json | null
          profissao?: string | null
          proveito_economico?: number | null
          status_cliente?: string
          taxa_juros_mensal?: number | null
          taxa_multa?: number | null
          telefone?: string | null
          tenant_id?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id: string
          valor_contrato?: number | null
          valor_entrada?: number | null
          valor_parcela?: number | null
          vendedor?: string | null
        }
        Update: {
          aplicar_juros?: boolean | null
          aplicar_multa?: boolean | null
          classificacao?: string | null
          cnh?: string | null
          cnh_validade?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string | null
          dados_veiculares?: Json | null
          data_cadastro?: string | null
          data_fechamento?: string | null
          data_nascimento?: string | null
          data_vencimento_final?: string | null
          data_vencimento_inicial?: string | null
          email?: string | null
          endereco?: string | null
          forma_pagamento?: string | null
          grupos_parcelas?: Json | null
          id?: string
          nome_pessoa_fisica?: string | null
          nome_pessoa_juridica?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          origem_rede_social?: string | null
          origem_tipo?: string | null
          pessoas_adicionais?: Json | null
          profissao?: string | null
          proveito_economico?: number | null
          status_cliente?: string
          taxa_juros_mensal?: number | null
          taxa_multa?: number | null
          telefone?: string | null
          tenant_id?: string | null
          uf?: string | null
          updated_at?: string | null
          user_id?: string
          valor_contrato?: number | null
          valor_entrada?: number | null
          valor_parcela?: number | null
          vendedor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cnpjs_cadastrados: {
        Row: {
          cnpj: string
          created_at: string | null
          id: string
          monitoramento_ativo: boolean | null
          nome_fantasia: string | null
          ordem: number | null
          razao_social: string | null
          request_id_data: string | null
          tenant_id: string | null
          total_processos: number | null
          tracking_id: string | null
          ultima_sincronizacao: string | null
          ultimo_request_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cnpj: string
          created_at?: string | null
          id?: string
          monitoramento_ativo?: boolean | null
          nome_fantasia?: string | null
          ordem?: number | null
          razao_social?: string | null
          request_id_data?: string | null
          tenant_id?: string | null
          total_processos?: number | null
          tracking_id?: string | null
          ultima_sincronizacao?: string | null
          ultimo_request_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cnpj?: string
          created_at?: string | null
          id?: string
          monitoramento_ativo?: boolean | null
          nome_fantasia?: string | null
          ordem?: number | null
          razao_social?: string | null
          request_id_data?: string | null
          tenant_id?: string | null
          total_processos?: number | null
          tracking_id?: string | null
          ultima_sincronizacao?: string | null
          ultimo_request_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cnpjs_cadastrados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_comentarios: {
        Row: {
          colaborador_id: string
          comentario: string
          created_at: string | null
          id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          colaborador_id: string
          comentario: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          colaborador_id?: string
          comentario?: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_comentarios_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_comentarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_documentos: {
        Row: {
          colaborador_id: string
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          tenant_id: string | null
          tipo_documento: string | null
          uploaded_by: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tenant_id?: string | null
          tipo_documento?: string | null
          uploaded_by: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tenant_id?: string | null
          tipo_documento?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_documentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_documentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_pagamentos: {
        Row: {
          acrescimos: number | null
          colaborador_id: string
          comprovante_url: string | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string
          descontos: number | null
          id: string
          mes_referencia: string
          metodo_pagamento: string | null
          observacoes: string | null
          salario_base: number
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
          valor_liquido: number
        }
        Insert: {
          acrescimos?: number | null
          colaborador_id: string
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          descontos?: number | null
          id?: string
          mes_referencia: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          salario_base: number
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor_liquido: number
        }
        Update: {
          acrescimos?: number | null
          colaborador_id?: string
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          descontos?: number | null
          id?: string
          mes_referencia?: string
          metodo_pagamento?: string | null
          observacoes?: string | null
          salario_base?: number
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
          valor_liquido?: number
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_pagamentos_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_pagamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_reajustes: {
        Row: {
          colaborador_id: string
          created_at: string | null
          data_reajuste: string
          id: string
          motivo: string | null
          tenant_id: string | null
          user_id: string
          valor_anterior: number
          valor_novo: number
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          data_reajuste: string
          id?: string
          motivo?: string | null
          tenant_id?: string | null
          user_id: string
          valor_anterior: number
          valor_novo: number
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          data_reajuste?: string
          id?: string
          motivo?: string | null
          tenant_id?: string | null
          user_id?: string
          valor_anterior?: number
          valor_novo?: number
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_reajustes_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_reajustes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colaborador_vales: {
        Row: {
          colaborador_id: string
          created_at: string | null
          data: string
          descricao: string | null
          id: string
          status: string | null
          tenant_id: string | null
          tipo: string
          user_id: string
          valor: number
          vincular_salario: boolean | null
        }
        Insert: {
          colaborador_id: string
          created_at?: string | null
          data: string
          descricao?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          tipo: string
          user_id: string
          valor: number
          vincular_salario?: boolean | null
        }
        Update: {
          colaborador_id?: string
          created_at?: string | null
          data?: string
          descricao?: string | null
          id?: string
          status?: string | null
          tenant_id?: string | null
          tipo?: string
          user_id?: string
          valor?: number
          vincular_salario?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "colaborador_vales_colaborador_id_fkey"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "colaborador_vales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores: {
        Row: {
          cargo: string | null
          cpf_cnpj: string | null
          created_at: string | null
          data_contratacao: string | null
          data_nascimento: string | null
          data_primeiro_pagamento: string | null
          dia_pagamento: number | null
          dias_trabalhados_primeiro_mes: number | null
          email: string | null
          endereco: string | null
          forma_pagamento: string | null
          id: string
          nome_completo: string
          observacoes: string | null
          primeiro_mes_proporcional: boolean | null
          salario_base: number
          status: string | null
          telefone: string | null
          tenant_id: string | null
          tipo_pessoa: string
          tipo_vinculo: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cargo?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_contratacao?: string | null
          data_nascimento?: string | null
          data_primeiro_pagamento?: string | null
          dia_pagamento?: number | null
          dias_trabalhados_primeiro_mes?: number | null
          email?: string | null
          endereco?: string | null
          forma_pagamento?: string | null
          id?: string
          nome_completo: string
          observacoes?: string | null
          primeiro_mes_proporcional?: boolean | null
          salario_base?: number
          status?: string | null
          telefone?: string | null
          tenant_id?: string | null
          tipo_pessoa: string
          tipo_vinculo?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cargo?: string | null
          cpf_cnpj?: string | null
          created_at?: string | null
          data_contratacao?: string | null
          data_nascimento?: string | null
          data_primeiro_pagamento?: string | null
          dia_pagamento?: number | null
          dias_trabalhados_primeiro_mes?: number | null
          email?: string | null
          endereco?: string | null
          forma_pagamento?: string | null
          id?: string
          nome_completo?: string
          observacoes?: string | null
          primeiro_mes_proporcional?: boolean | null
          salario_base?: number
          status?: string | null
          telefone?: string | null
          tenant_id?: string | null
          tipo_pessoa?: string
          tipo_vinculo?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "colaboradores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      comarcas: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          tenant_id: string | null
          tribunal_id: string | null
          uf: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          tenant_id?: string | null
          tribunal_id?: string | null
          uf: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          tenant_id?: string | null
          tribunal_id?: string | null
          uf?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comarcas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comarcas_tribunal_id_fkey"
            columns: ["tribunal_id"]
            isOneToOne: false
            referencedRelation: "tribunais"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          comment_type: string
          created_at: string | null
          id: string
          mentioned_by_user_id: string
          mentioned_user_id: string
          tenant_id: string | null
        }
        Insert: {
          comment_id: string
          comment_type: string
          created_at?: string | null
          id?: string
          mentioned_by_user_id: string
          mentioned_user_id: string
          tenant_id?: string | null
        }
        Update: {
          comment_id?: string
          comment_type?: string
          created_at?: string | null
          id?: string
          mentioned_by_user_id?: string
          mentioned_user_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      controladoria_processos: {
        Row: {
          assunto: string
          cliente: string
          created_at: string
          id: string
          numero_processo: string
          observacoes: string | null
          status: string
          tenant_id: string | null
          tribunal: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assunto: string
          cliente: string
          created_at?: string
          id?: string
          numero_processo: string
          observacoes?: string | null
          status?: string
          tenant_id?: string | null
          tribunal: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assunto?: string
          cliente?: string
          created_at?: string
          id?: string
          numero_processo?: string
          observacoes?: string | null
          status?: string
          tenant_id?: string | null
          tribunal?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "controladoria_processos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      controle_clientes: {
        Row: {
          cliente: string | null
          cnh: string | null
          cpf_cnpj: string | null
          created_at: string
          id: string
          obs: string | null
          placa: string | null
          proximo_prazo: string | null
          renavam: string | null
          tenant_id: string
          ultima_consulta: string | null
          updated_at: string
          validade_cnh: string | null
        }
        Insert: {
          cliente?: string | null
          cnh?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          id?: string
          obs?: string | null
          placa?: string | null
          proximo_prazo?: string | null
          renavam?: string | null
          tenant_id: string
          ultima_consulta?: string | null
          updated_at?: string
          validade_cnh?: string | null
        }
        Update: {
          cliente?: string | null
          cnh?: string | null
          cpf_cnpj?: string | null
          created_at?: string
          id?: string
          obs?: string | null
          placa?: string | null
          proximo_prazo?: string | null
          renavam?: string | null
          tenant_id?: string
          ultima_consulta?: string | null
          updated_at?: string
          validade_cnh?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "controle_clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credenciais_cliente: {
        Row: {
          cpf: string
          created_at: string | null
          documento_nome: string | null
          documento_url: string | null
          enviado_judit_em: string | null
          enviado_por: string | null
          erro_mensagem: string | null
          id: string
          oab_id: string | null
          secret: string | null
          senha: string
          status: string | null
          system_name: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          cpf: string
          created_at?: string | null
          documento_nome?: string | null
          documento_url?: string | null
          enviado_judit_em?: string | null
          enviado_por?: string | null
          erro_mensagem?: string | null
          id?: string
          oab_id?: string | null
          secret?: string | null
          senha: string
          status?: string | null
          system_name?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          cpf?: string
          created_at?: string | null
          documento_nome?: string | null
          documento_url?: string | null
          enviado_judit_em?: string | null
          enviado_por?: string | null
          erro_mensagem?: string | null
          id?: string
          oab_id?: string | null
          secret?: string | null
          senha?: string
          status?: string | null
          system_name?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credenciais_cliente_oab_id_fkey"
            columns: ["oab_id"]
            isOneToOne: false
            referencedRelation: "oabs_cadastradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciais_cliente_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      credenciais_judit: {
        Row: {
          created_at: string | null
          credencial_cliente_id: string | null
          customer_key: string
          enviado_por: string | null
          id: string
          oab_id: string | null
          status: string | null
          system_name: string
          tenant_id: string
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          credencial_cliente_id?: string | null
          customer_key: string
          enviado_por?: string | null
          id?: string
          oab_id?: string | null
          status?: string | null
          system_name?: string
          tenant_id: string
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          credencial_cliente_id?: string | null
          customer_key?: string
          enviado_por?: string | null
          id?: string
          oab_id?: string | null
          status?: string | null
          system_name?: string
          tenant_id?: string
          updated_at?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "credenciais_judit_credencial_cliente_id_fkey"
            columns: ["credencial_cliente_id"]
            isOneToOne: false
            referencedRelation: "credenciais_cliente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciais_judit_oab_id_fkey"
            columns: ["oab_id"]
            isOneToOne: false
            referencedRelation: "oabs_cadastradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credenciais_judit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custo_categorias: {
        Row: {
          cor: string | null
          created_at: string | null
          id: string
          nome: string
          padrao: boolean | null
          tenant_id: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome: string
          padrao?: boolean | null
          tenant_id?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          padrao?: boolean | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custo_categorias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custo_comprovantes: {
        Row: {
          created_at: string | null
          custo_id: string
          file_name: string
          file_path: string
          file_size: number | null
          id: string
          mime_type: string | null
          tenant_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          custo_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tenant_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          custo_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          tenant_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "custo_comprovantes_custo_id_fkey"
            columns: ["custo_id"]
            isOneToOne: false
            referencedRelation: "custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custo_comprovantes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custo_parcelas: {
        Row: {
          created_at: string | null
          custo_id: string
          data_pagamento: string | null
          data_vencimento: string
          id: string
          numero_parcela: number
          status: string | null
          tenant_id: string | null
          valor: number
        }
        Insert: {
          created_at?: string | null
          custo_id: string
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          numero_parcela: number
          status?: string | null
          tenant_id?: string | null
          valor: number
        }
        Update: {
          created_at?: string | null
          custo_id?: string
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          numero_parcela?: number
          status?: string | null
          tenant_id?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custo_parcelas_custo_id_fkey"
            columns: ["custo_id"]
            isOneToOne: false
            referencedRelation: "custos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custo_parcelas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      custos: {
        Row: {
          categoria_id: string | null
          created_at: string | null
          data: string
          data_final: string | null
          data_inicial: string | null
          descricao: string
          forma_pagamento: string | null
          id: string
          numero_parcelas: number | null
          observacoes: string | null
          parcelado: boolean | null
          periodicidade: string | null
          recorrente: boolean | null
          status: string | null
          tenant_id: string | null
          tipo: string | null
          updated_at: string | null
          user_id: string
          valor: number
        }
        Insert: {
          categoria_id?: string | null
          created_at?: string | null
          data: string
          data_final?: string | null
          data_inicial?: string | null
          descricao: string
          forma_pagamento?: string | null
          id?: string
          numero_parcelas?: number | null
          observacoes?: string | null
          parcelado?: boolean | null
          periodicidade?: string | null
          recorrente?: boolean | null
          status?: string | null
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id: string
          valor: number
        }
        Update: {
          categoria_id?: string | null
          created_at?: string | null
          data?: string
          data_final?: string | null
          data_inicial?: string | null
          descricao?: string
          forma_pagamento?: string | null
          id?: string
          numero_parcelas?: number | null
          observacoes?: string | null
          parcelado?: boolean | null
          periodicidade?: string | null
          recorrente?: boolean | null
          status?: string | null
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string | null
          user_id?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "custos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "custo_categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deadline_comentarios: {
        Row: {
          comentario: string
          created_at: string | null
          deadline_id: string
          id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comentario: string
          created_at?: string | null
          deadline_id: string
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comentario?: string
          created_at?: string | null
          deadline_id?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadline_comentarios_deadline_id_fkey"
            columns: ["deadline_id"]
            isOneToOne: false
            referencedRelation: "deadlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadline_comentarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deadline_tags: {
        Row: {
          created_at: string | null
          deadline_id: string
          id: string
          tagged_user_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          deadline_id: string
          id?: string
          tagged_user_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          deadline_id?: string
          id?: string
          tagged_user_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deadline_tags_deadline_id_fkey"
            columns: ["deadline_id"]
            isOneToOne: false
            referencedRelation: "deadlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadline_tags_tagged_user_id_fkey"
            columns: ["tagged_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deadline_tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deadlines: {
        Row: {
          advogado_responsavel_id: string | null
          comentario_conclusao: string | null
          completed: boolean
          concluido_em: string | null
          concluido_por: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          processo_oab_id: string | null
          project_id: string | null
          protocolo_etapa_id: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advogado_responsavel_id?: string | null
          comentario_conclusao?: string | null
          completed?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          date: string
          description?: string | null
          id?: string
          processo_oab_id?: string | null
          project_id?: string | null
          protocolo_etapa_id?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advogado_responsavel_id?: string | null
          comentario_conclusao?: string | null
          completed?: boolean
          concluido_em?: string | null
          concluido_por?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          processo_oab_id?: string | null
          project_id?: string | null
          protocolo_etapa_id?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deadlines_advogado_responsavel_id_fkey"
            columns: ["advogado_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deadlines_concluido_por_fkey"
            columns: ["concluido_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "deadlines_processo_oab_id_fkey"
            columns: ["processo_oab_id"]
            isOneToOne: false
            referencedRelation: "processos_oab"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_protocolo_etapa_id_fkey"
            columns: ["protocolo_etapa_id"]
            isOneToOne: false
            referencedRelation: "project_protocolo_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deadlines_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos: {
        Row: {
          cliente_id: string | null
          conteudo_html: string | null
          created_at: string | null
          descricao: string | null
          id: string
          projeto_id: string | null
          responsavel_id: string | null
          tenant_id: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          cliente_id?: string | null
          conteudo_html?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          projeto_id?: string | null
          responsavel_id?: string | null
          tenant_id: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          cliente_id?: string | null
          conteudo_html?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          projeto_id?: string | null
          responsavel_id?: string | null
          tenant_id?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      etiquetas: {
        Row: {
          cor: string | null
          created_at: string | null
          id: string
          nome: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "etiquetas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      feriados_forenses: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data: string
          descricao: string
          id: string
          recorrente: boolean | null
          tenant_id: string | null
          tipo: string
          tribunal_sigla: string | null
          uf: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data: string
          descricao: string
          id?: string
          recorrente?: boolean | null
          tenant_id?: string | null
          tipo: string
          tribunal_sigla?: string | null
          uf?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data?: string
          descricao?: string
          id?: string
          recorrente?: boolean | null
          tenant_id?: string | null
          tipo?: string
          tribunal_sigla?: string | null
          uf?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feriados_forenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      grupos_acoes: {
        Row: {
          cor: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grupos_acoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      judit_api_logs: {
        Row: {
          created_at: string | null
          custo_estimado: number | null
          endpoint: string
          erro_mensagem: string | null
          id: string
          metodo: string
          oab_id: string | null
          request_id: string | null
          request_payload: Json | null
          resposta_status: number | null
          sucesso: boolean | null
          tenant_id: string | null
          tipo_chamada: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          custo_estimado?: number | null
          endpoint: string
          erro_mensagem?: string | null
          id?: string
          metodo?: string
          oab_id?: string | null
          request_id?: string | null
          request_payload?: Json | null
          resposta_status?: number | null
          sucesso?: boolean | null
          tenant_id?: string | null
          tipo_chamada: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          custo_estimado?: number | null
          endpoint?: string
          erro_mensagem?: string | null
          id?: string
          metodo?: string
          oab_id?: string | null
          request_id?: string | null
          request_payload?: Json | null
          resposta_status?: number | null
          sucesso?: boolean | null
          tenant_id?: string | null
          tipo_chamada?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "judit_api_logs_oab_id_fkey"
            columns: ["oab_id"]
            isOneToOne: false
            referencedRelation: "oabs_cadastradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "judit_api_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_leads: {
        Row: {
          atendido_por: string | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          notas: string | null
          origem: string | null
          status: string | null
          tamanho_escritorio: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          atendido_por?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          notas?: string | null
          origem?: string | null
          status?: string | null
          tamanho_escritorio?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          atendido_por?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          notas?: string | null
          origem?: string | null
          status?: string | null
          tamanho_escritorio?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      lead_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          lead_id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads_captacao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leads_captacao: {
        Row: {
          comentario: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          origem: string | null
          prioridade: string | null
          responsavel_id: string | null
          status: string | null
          telefone: string | null
          tenant_id: string | null
          tipo: string | null
          uf: string | null
          updated_at: string
          user_id: string | null
          validado: string | null
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          origem?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          telefone?: string | null
          tenant_id?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          validado?: string | null
        }
        Update: {
          comentario?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          origem?: string | null
          prioridade?: string | null
          responsavel_id?: string | null
          status?: string | null
          telefone?: string | null
          tenant_id?: string | null
          tipo?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          validado?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_captacao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      link_collections: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          position: number | null
          profile_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          profile_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          profile_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_collections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "link_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      link_items: {
        Row: {
          clicks: number | null
          collection_id: string | null
          created_at: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          position: number | null
          profile_id: string
          title: string
          url: string
        }
        Insert: {
          clicks?: number | null
          collection_id?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          profile_id: string
          title: string
          url: string
        }
        Update: {
          clicks?: number | null
          collection_id?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          position?: number | null
          profile_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "link_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "link_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "link_items_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "link_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      link_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          full_name: string | null
          id: string
          theme_color: string | null
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          theme_color?: string | null
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      link_user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["link_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["link_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["link_role"]
          user_id?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          message_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          message_type: string | null
          receiver_id: string
          related_project_id: string | null
          reply_to_id: string | null
          sender_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string | null
          receiver_id: string
          related_project_id?: string | null
          reply_to_id?: string | null
          sender_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message_type?: string | null
          receiver_id?: string
          related_project_id?: string | null
          reply_to_id?: string | null
          sender_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      metal_op_history: {
        Row: {
          acao: string
          created_at: string
          detalhes: string | null
          id: string
          op_id: string
          user_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: string | null
          id?: string
          op_id: string
          user_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: string | null
          id?: string
          op_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "metal_op_history_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "metal_ops"
            referencedColumns: ["id"]
          },
        ]
      }
      metal_ops: {
        Row: {
          acabamento: string | null
          aco: string[] | null
          cliente: string
          created_at: string
          created_by: string
          data_entrada: string
          data_prevista_saida: string | null
          desenhista: string | null
          dimensoes: string | null
          espessura: string[] | null
          ficha_tecnica_rotation: number
          ficha_tecnica_url: string | null
          id: string
          item: string | null
          material: string | null
          numero_op: string
          observacoes: string | null
          pedido: string | null
          produto: string
          quantidade: number
          quantidade_material: number | null
          setor_atual: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acabamento?: string | null
          aco?: string[] | null
          cliente: string
          created_at?: string
          created_by: string
          data_entrada?: string
          data_prevista_saida?: string | null
          desenhista?: string | null
          dimensoes?: string | null
          espessura?: string[] | null
          ficha_tecnica_rotation?: number
          ficha_tecnica_url?: string | null
          id?: string
          item?: string | null
          material?: string | null
          numero_op: string
          observacoes?: string | null
          pedido?: string | null
          produto: string
          quantidade: number
          quantidade_material?: number | null
          setor_atual?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acabamento?: string | null
          aco?: string[] | null
          cliente?: string
          created_at?: string
          created_by?: string
          data_entrada?: string
          data_prevista_saida?: string | null
          desenhista?: string | null
          dimensoes?: string | null
          espessura?: string[] | null
          ficha_tecnica_rotation?: number
          ficha_tecnica_url?: string | null
          id?: string
          item?: string | null
          material?: string | null
          numero_op?: string
          observacoes?: string | null
          pedido?: string | null
          produto?: string
          quantidade?: number
          quantidade_material?: number | null
          setor_atual?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      metal_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          setor: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          setor?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          setor?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      metal_setor_flow: {
        Row: {
          created_at: string
          entrada: string | null
          id: string
          observacoes: string | null
          op_id: string
          operador_entrada_id: string | null
          operador_saida_id: string | null
          saida: string | null
          setor: string
        }
        Insert: {
          created_at?: string
          entrada?: string | null
          id?: string
          observacoes?: string | null
          op_id: string
          operador_entrada_id?: string | null
          operador_saida_id?: string | null
          saida?: string | null
          setor: string
        }
        Update: {
          created_at?: string
          entrada?: string | null
          id?: string
          observacoes?: string | null
          op_id?: string
          operador_entrada_id?: string | null
          operador_saida_id?: string | null
          saida?: string | null
          setor?: string
        }
        Relationships: [
          {
            foreignKeyName: "metal_setor_flow_op_id_fkey"
            columns: ["op_id"]
            isOneToOne: false
            referencedRelation: "metal_ops"
            referencedColumns: ["id"]
          },
        ]
      }
      metal_user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["metal_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["metal_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["metal_role"]
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          related_project_id: string | null
          related_task_id: string | null
          tenant_id: string | null
          title: string
          triggered_by_user_id: string
          type: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_project_id?: string | null
          related_task_id?: string | null
          tenant_id?: string | null
          title: string
          triggered_by_user_id: string
          type: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          related_project_id?: string | null
          related_task_id?: string | null
          tenant_id?: string | null
          title?: string
          triggered_by_user_id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      oab_request_historico: {
        Row: {
          completed_at: string | null
          created_at: string | null
          erro_mensagem: string | null
          id: string
          oab_id: string
          on_demand: boolean | null
          processos_atualizados: number | null
          processos_encontrados: number | null
          processos_novos: number | null
          request_id: string
          status: string | null
          tenant_id: string | null
          tipo_busca: string
          user_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          erro_mensagem?: string | null
          id?: string
          oab_id: string
          on_demand?: boolean | null
          processos_atualizados?: number | null
          processos_encontrados?: number | null
          processos_novos?: number | null
          request_id: string
          status?: string | null
          tenant_id?: string | null
          tipo_busca?: string
          user_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          erro_mensagem?: string | null
          id?: string
          oab_id?: string
          on_demand?: boolean | null
          processos_atualizados?: number | null
          processos_encontrados?: number | null
          processos_novos?: number | null
          request_id?: string
          status?: string | null
          tenant_id?: string | null
          tipo_busca?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "oab_request_historico_oab_id_fkey"
            columns: ["oab_id"]
            isOneToOne: false
            referencedRelation: "oabs_cadastradas"
            referencedColumns: ["id"]
          },
        ]
      }
      oabs_cadastradas: {
        Row: {
          cep_advogado: string | null
          cidade_advogado: string | null
          created_at: string | null
          email_advogado: string | null
          endereco_advogado: string | null
          id: string
          logo_url: string | null
          nome_advogado: string | null
          oab_numero: string
          oab_uf: string
          ordem: number | null
          request_id_data: string | null
          telefone_advogado: string | null
          tenant_id: string | null
          total_processos: number | null
          ultima_sincronizacao: string | null
          ultimo_request_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cep_advogado?: string | null
          cidade_advogado?: string | null
          created_at?: string | null
          email_advogado?: string | null
          endereco_advogado?: string | null
          id?: string
          logo_url?: string | null
          nome_advogado?: string | null
          oab_numero: string
          oab_uf: string
          ordem?: number | null
          request_id_data?: string | null
          telefone_advogado?: string | null
          tenant_id?: string | null
          total_processos?: number | null
          ultima_sincronizacao?: string | null
          ultimo_request_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cep_advogado?: string | null
          cidade_advogado?: string | null
          created_at?: string | null
          email_advogado?: string | null
          endereco_advogado?: string | null
          id?: string
          logo_url?: string | null
          nome_advogado?: string | null
          oab_numero?: string
          oab_uf?: string
          ordem?: number | null
          request_id_data?: string | null
          telefone_advogado?: string | null
          tenant_id?: string | null
          total_processos?: number | null
          ultima_sincronizacao?: string | null
          ultimo_request_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oabs_cadastradas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_codes: {
        Row: {
          code: string
          created_at: string | null
          email: string
          expires_at: string
          id: string
          tenant_id: string | null
          tenant_slug: string | null
          used_at: string | null
        }
        Insert: {
          code: string
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          tenant_id?: string | null
          tenant_slug?: string | null
          used_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          tenant_id?: string | null
          tenant_slug?: string | null
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_config: {
        Row: {
          codigo: string
          created_at: string | null
          id: string
          limite_oabs: number | null
          limite_processos_cadastrados: number | null
          limite_processos_monitorados: number | null
          limite_usuarios: number | null
          nome: string
          valor_mensal: number
        }
        Insert: {
          codigo: string
          created_at?: string | null
          id?: string
          limite_oabs?: number | null
          limite_processos_cadastrados?: number | null
          limite_processos_monitorados?: number | null
          limite_usuarios?: number | null
          nome: string
          valor_mensal?: number
        }
        Update: {
          codigo?: string
          created_at?: string | null
          id?: string
          limite_oabs?: number | null
          limite_processos_cadastrados?: number | null
          limite_processos_monitorados?: number | null
          limite_usuarios?: number | null
          nome?: string
          valor_mensal?: number
        }
        Relationships: []
      }
      platform_pix_config: {
        Row: {
          ativo: boolean | null
          chave_pix: string
          created_at: string | null
          id: string
          nome_beneficiario: string
          qr_code_url: string | null
          tipo_chave: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          chave_pix: string
          created_at?: string | null
          id?: string
          nome_beneficiario: string
          qr_code_url?: string | null
          tipo_chave: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          chave_pix?: string
          created_at?: string | null
          id?: string
          nome_beneficiario?: string
          qr_code_url?: string | null
          tipo_chave?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      prazos_automaticos_log: {
        Row: {
          andamento_id: string | null
          created_at: string | null
          data_fim: string | null
          data_inicio: string | null
          deadline_id: string | null
          id: string
          prazo_dias: number | null
          processo_oab_id: string | null
          tenant_id: string | null
          tipo_ato_detectado: string | null
          tipo_evento: string
        }
        Insert: {
          andamento_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          deadline_id?: string | null
          id?: string
          prazo_dias?: number | null
          processo_oab_id?: string | null
          tenant_id?: string | null
          tipo_ato_detectado?: string | null
          tipo_evento: string
        }
        Update: {
          andamento_id?: string | null
          created_at?: string | null
          data_fim?: string | null
          data_inicio?: string | null
          deadline_id?: string | null
          id?: string
          prazo_dias?: number | null
          processo_oab_id?: string | null
          tenant_id?: string | null
          tipo_ato_detectado?: string | null
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "prazos_automaticos_log_andamento_id_fkey"
            columns: ["andamento_id"]
            isOneToOne: false
            referencedRelation: "processos_oab_andamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_automaticos_log_deadline_id_fkey"
            columns: ["deadline_id"]
            isOneToOne: false
            referencedRelation: "deadlines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_automaticos_log_processo_oab_id_fkey"
            columns: ["processo_oab_id"]
            isOneToOne: false
            referencedRelation: "processos_oab"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prazos_automaticos_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      prazos_processuais_cpc: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          dias_uteis: boolean | null
          fundamento_legal: string | null
          id: string
          padroes_deteccao: string[] | null
          prazo_dias: number
          tipo_ato: string
          tipo_ato_label: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          dias_uteis?: boolean | null
          fundamento_legal?: string | null
          id?: string
          padroes_deteccao?: string[] | null
          prazo_dias: number
          tipo_ato: string
          tipo_ato_label: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          dias_uteis?: boolean | null
          fundamento_legal?: string | null
          id?: string
          padroes_deteccao?: string[] | null
          prazo_dias?: number
          tipo_ato?: string
          tipo_ato_label?: string
        }
        Relationships: []
      }
      processo_andamentos_judit: {
        Row: {
          created_at: string | null
          dados_completos: Json | null
          data_movimentacao: string | null
          descricao: string
          id: string
          lida: boolean | null
          monitoramento_id: string | null
          processo_id: string
          tenant_id: string | null
          tipo_movimentacao: string | null
        }
        Insert: {
          created_at?: string | null
          dados_completos?: Json | null
          data_movimentacao?: string | null
          descricao: string
          id?: string
          lida?: boolean | null
          monitoramento_id?: string | null
          processo_id: string
          tenant_id?: string | null
          tipo_movimentacao?: string | null
        }
        Update: {
          created_at?: string | null
          dados_completos?: Json | null
          data_movimentacao?: string | null
          descricao?: string
          id?: string
          lida?: boolean | null
          monitoramento_id?: string | null
          processo_id?: string
          tenant_id?: string | null
          tipo_movimentacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_andamentos_judit_monitoramento_id_fkey"
            columns: ["monitoramento_id"]
            isOneToOne: false
            referencedRelation: "processo_monitoramento_judit"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_andamentos_judit_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_andamentos_judit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_atualizacoes_escavador: {
        Row: {
          created_at: string | null
          dados_completos: Json | null
          data_evento: string | null
          descricao: string | null
          id: string
          lida: boolean | null
          monitoramento_id: string | null
          notificacao_enviada: boolean | null
          processo_id: string
          tenant_id: string | null
          tipo_atualizacao: string | null
        }
        Insert: {
          created_at?: string | null
          dados_completos?: Json | null
          data_evento?: string | null
          descricao?: string | null
          id?: string
          lida?: boolean | null
          monitoramento_id?: string | null
          notificacao_enviada?: boolean | null
          processo_id: string
          tenant_id?: string | null
          tipo_atualizacao?: string | null
        }
        Update: {
          created_at?: string | null
          dados_completos?: Json | null
          data_evento?: string | null
          descricao?: string | null
          id?: string
          lida?: boolean | null
          monitoramento_id?: string | null
          notificacao_enviada?: boolean | null
          processo_id?: string
          tenant_id?: string | null
          tipo_atualizacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_atualizacoes_escavador_monitoramento_id_fkey"
            columns: ["monitoramento_id"]
            isOneToOne: false
            referencedRelation: "processo_monitoramento_escavador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_atualizacoes_escavador_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_atualizacoes_escavador_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_documentos: {
        Row: {
          created_at: string | null
          documento_pai_id: string | null
          file_path: string
          file_size: number | null
          id: string
          is_public: boolean | null
          mime_type: string | null
          nome: string
          ocr_text: string | null
          processo_id: string
          tags: string[] | null
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["documento_tipo"]
          updated_at: string | null
          uploaded_by: string
          versao: number | null
        }
        Insert: {
          created_at?: string | null
          documento_pai_id?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          nome: string
          ocr_text?: string | null
          processo_id: string
          tags?: string[] | null
          tenant_id?: string | null
          tipo: Database["public"]["Enums"]["documento_tipo"]
          updated_at?: string | null
          uploaded_by: string
          versao?: number | null
        }
        Update: {
          created_at?: string | null
          documento_pai_id?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          is_public?: boolean | null
          mime_type?: string | null
          nome?: string
          ocr_text?: string | null
          processo_id?: string
          tags?: string[] | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["documento_tipo"]
          updated_at?: string | null
          uploaded_by?: string
          versao?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_documentos_documento_pai_id_fkey"
            columns: ["documento_pai_id"]
            isOneToOne: false
            referencedRelation: "processo_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_documentos_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_documentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_etiquetas: {
        Row: {
          created_at: string | null
          etiqueta_id: string
          id: string
          processo_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          etiqueta_id: string
          id?: string
          processo_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          etiqueta_id?: string
          id?: string
          processo_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_etiquetas_etiqueta_id_fkey"
            columns: ["etiqueta_id"]
            isOneToOne: false
            referencedRelation: "etiquetas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_etiquetas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_etiquetas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_historico: {
        Row: {
          acao: string
          campo_alterado: string | null
          created_at: string | null
          id: string
          ip_address: unknown
          processo_id: string
          tenant_id: string | null
          user_agent: string | null
          user_id: string | null
          valor_anterior: Json | null
          valor_novo: Json | null
        }
        Insert: {
          acao: string
          campo_alterado?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          processo_id: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Update: {
          acao?: string
          campo_alterado?: string | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          processo_id?: string
          tenant_id?: string | null
          user_agent?: string | null
          user_id?: string | null
          valor_anterior?: Json | null
          valor_novo?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_historico_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_historico_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_monitoramento_escavador: {
        Row: {
          area: string | null
          assunto: string | null
          callback_id: string | null
          classe: string | null
          created_at: string | null
          data_distribuicao: string | null
          escavador_data: Json | null
          escavador_id: string | null
          id: string
          monitoramento_ativo: boolean | null
          processo_id: string
          tenant_id: string | null
          total_atualizacoes: number | null
          tribunal: string | null
          ultima_atualizacao: string | null
          ultima_consulta: string | null
          updated_at: string | null
          valor_causa: number | null
        }
        Insert: {
          area?: string | null
          assunto?: string | null
          callback_id?: string | null
          classe?: string | null
          created_at?: string | null
          data_distribuicao?: string | null
          escavador_data?: Json | null
          escavador_id?: string | null
          id?: string
          monitoramento_ativo?: boolean | null
          processo_id: string
          tenant_id?: string | null
          total_atualizacoes?: number | null
          tribunal?: string | null
          ultima_atualizacao?: string | null
          ultima_consulta?: string | null
          updated_at?: string | null
          valor_causa?: number | null
        }
        Update: {
          area?: string | null
          assunto?: string | null
          callback_id?: string | null
          classe?: string | null
          created_at?: string | null
          data_distribuicao?: string | null
          escavador_data?: Json | null
          escavador_id?: string | null
          id?: string
          monitoramento_ativo?: boolean | null
          processo_id?: string
          tenant_id?: string | null
          total_atualizacoes?: number | null
          tribunal?: string | null
          ultima_atualizacao?: string | null
          ultima_consulta?: string | null
          updated_at?: string | null
          valor_causa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_monitoramento_escavador_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: true
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_monitoramento_escavador_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_monitoramento_judit: {
        Row: {
          created_at: string | null
          id: string
          judit_data: Json | null
          monitoramento_ativo: boolean | null
          processo_id: string
          recurrence: number | null
          tenant_id: string | null
          total_movimentacoes: number | null
          tracking_id: string | null
          ultima_atualizacao: string | null
          ultimo_request_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          judit_data?: Json | null
          monitoramento_ativo?: boolean | null
          processo_id: string
          recurrence?: number | null
          tenant_id?: string | null
          total_movimentacoes?: number | null
          tracking_id?: string | null
          ultima_atualizacao?: string | null
          ultimo_request_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          judit_data?: Json | null
          monitoramento_ativo?: boolean | null
          processo_id?: string
          recurrence?: number | null
          tenant_id?: string | null
          total_movimentacoes?: number | null
          tracking_id?: string | null
          ultima_atualizacao?: string | null
          ultimo_request_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_monitoramento_judit_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: true
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_monitoramento_judit_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_movimentacao_conferencia: {
        Row: {
          conferido: boolean
          conferido_em: string | null
          conferido_por: string | null
          created_at: string | null
          id: string
          movimentacao_id: string
          observacoes_conferencia: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          conferido?: boolean
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string | null
          id?: string
          movimentacao_id: string
          observacoes_conferencia?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          conferido?: boolean
          conferido_em?: string | null
          conferido_por?: string | null
          created_at?: string | null
          id?: string
          movimentacao_id?: string
          observacoes_conferencia?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processo_movimentacao_conferencia_movimentacao_id_fkey"
            columns: ["movimentacao_id"]
            isOneToOne: true
            referencedRelation: "processo_movimentacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_movimentacao_conferencia_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processo_movimentacoes: {
        Row: {
          autor_id: string | null
          created_at: string | null
          data_movimentacao: string
          descricao: string
          documento_id: string | null
          id: string
          is_automated: boolean | null
          metadata: Json | null
          processo_id: string
          status_conferencia: string | null
          tenant_id: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          updated_at: string | null
        }
        Insert: {
          autor_id?: string | null
          created_at?: string | null
          data_movimentacao: string
          descricao: string
          documento_id?: string | null
          id?: string
          is_automated?: boolean | null
          metadata?: Json | null
          processo_id: string
          status_conferencia?: string | null
          tenant_id?: string | null
          tipo: Database["public"]["Enums"]["movimentacao_tipo"]
          updated_at?: string | null
        }
        Update: {
          autor_id?: string | null
          created_at?: string | null
          data_movimentacao?: string
          descricao?: string
          documento_id?: string | null
          id?: string
          is_automated?: boolean | null
          metadata?: Json | null
          processo_id?: string
          status_conferencia?: string | null
          tenant_id?: string | null
          tipo?: Database["public"]["Enums"]["movimentacao_tipo"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_movimentacao_documento"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "processo_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_movimentacoes_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processo_movimentacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processos: {
        Row: {
          advogado_responsavel_id: string | null
          advogados_partes: Json | null
          comarca_id: string | null
          comarca_nome: string | null
          cpf_cnpj_partes: Json | null
          created_at: string | null
          created_by: string
          data_distribuicao: string | null
          deleted_at: string | null
          fase_processual: string | null
          grupo_acao_id: string | null
          id: string
          is_draft: boolean | null
          juizo: string | null
          link_tribunal: string | null
          numero_processo: string
          observacoes: string | null
          parte_ativa: string
          parte_passiva: string
          prazo_proximo: string | null
          prioridade: Database["public"]["Enums"]["processo_prioridade"] | null
          representantes: Json | null
          status: Database["public"]["Enums"]["processo_status"] | null
          tenant_id: string | null
          tipo_acao_id: string | null
          tipo_acao_nome: string | null
          tipo_parte_oab: string | null
          tribunal_id: string | null
          tribunal_nome: string | null
          updated_at: string | null
          valor_causa: number | null
          valor_condenacao: number | null
          valor_custas: number | null
        }
        Insert: {
          advogado_responsavel_id?: string | null
          advogados_partes?: Json | null
          comarca_id?: string | null
          comarca_nome?: string | null
          cpf_cnpj_partes?: Json | null
          created_at?: string | null
          created_by: string
          data_distribuicao?: string | null
          deleted_at?: string | null
          fase_processual?: string | null
          grupo_acao_id?: string | null
          id?: string
          is_draft?: boolean | null
          juizo?: string | null
          link_tribunal?: string | null
          numero_processo: string
          observacoes?: string | null
          parte_ativa: string
          parte_passiva: string
          prazo_proximo?: string | null
          prioridade?: Database["public"]["Enums"]["processo_prioridade"] | null
          representantes?: Json | null
          status?: Database["public"]["Enums"]["processo_status"] | null
          tenant_id?: string | null
          tipo_acao_id?: string | null
          tipo_acao_nome?: string | null
          tipo_parte_oab?: string | null
          tribunal_id?: string | null
          tribunal_nome?: string | null
          updated_at?: string | null
          valor_causa?: number | null
          valor_condenacao?: number | null
          valor_custas?: number | null
        }
        Update: {
          advogado_responsavel_id?: string | null
          advogados_partes?: Json | null
          comarca_id?: string | null
          comarca_nome?: string | null
          cpf_cnpj_partes?: Json | null
          created_at?: string | null
          created_by?: string
          data_distribuicao?: string | null
          deleted_at?: string | null
          fase_processual?: string | null
          grupo_acao_id?: string | null
          id?: string
          is_draft?: boolean | null
          juizo?: string | null
          link_tribunal?: string | null
          numero_processo?: string
          observacoes?: string | null
          parte_ativa?: string
          parte_passiva?: string
          prazo_proximo?: string | null
          prioridade?: Database["public"]["Enums"]["processo_prioridade"] | null
          representantes?: Json | null
          status?: Database["public"]["Enums"]["processo_status"] | null
          tenant_id?: string | null
          tipo_acao_id?: string | null
          tipo_acao_nome?: string | null
          tipo_parte_oab?: string | null
          tribunal_id?: string | null
          tribunal_nome?: string | null
          updated_at?: string | null
          valor_causa?: number | null
          valor_condenacao?: number | null
          valor_custas?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_comarca_id_fkey"
            columns: ["comarca_id"]
            isOneToOne: false
            referencedRelation: "comarcas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_grupo_acao_id_fkey"
            columns: ["grupo_acao_id"]
            isOneToOne: false
            referencedRelation: "grupos_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tipo_acao_id_fkey"
            columns: ["tipo_acao_id"]
            isOneToOne: false
            referencedRelation: "tipos_acao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_tribunal_id_fkey"
            columns: ["tribunal_id"]
            isOneToOne: false
            referencedRelation: "tribunais"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_cnpj: {
        Row: {
          area_direito: string | null
          assunto: string | null
          capa_completa: Json | null
          cidade: string | null
          classificacao: string | null
          cnpj_id: string
          created_at: string | null
          data_distribuicao: string | null
          detalhes_request_data: string | null
          detalhes_request_id: string | null
          estado: string | null
          fase_processual: string | null
          id: string
          importado_manualmente: boolean | null
          instancia: string | null
          juizo: string | null
          link_tribunal: string | null
          monitoramento_ativo: boolean | null
          numero_cnj: string
          ordem: number | null
          parte_ativa: string | null
          parte_passiva: string | null
          parte_tipo: string | null
          partes_completas: Json | null
          status_processual: string | null
          tenant_id: string | null
          tracking_id: string | null
          tribunal: string | null
          tribunal_sigla: string | null
          ultimo_andamento: string | null
          ultimo_andamento_data: string | null
          updated_at: string | null
          user_id: string
          valor_causa: number | null
        }
        Insert: {
          area_direito?: string | null
          assunto?: string | null
          capa_completa?: Json | null
          cidade?: string | null
          classificacao?: string | null
          cnpj_id: string
          created_at?: string | null
          data_distribuicao?: string | null
          detalhes_request_data?: string | null
          detalhes_request_id?: string | null
          estado?: string | null
          fase_processual?: string | null
          id?: string
          importado_manualmente?: boolean | null
          instancia?: string | null
          juizo?: string | null
          link_tribunal?: string | null
          monitoramento_ativo?: boolean | null
          numero_cnj: string
          ordem?: number | null
          parte_ativa?: string | null
          parte_passiva?: string | null
          parte_tipo?: string | null
          partes_completas?: Json | null
          status_processual?: string | null
          tenant_id?: string | null
          tracking_id?: string | null
          tribunal?: string | null
          tribunal_sigla?: string | null
          ultimo_andamento?: string | null
          ultimo_andamento_data?: string | null
          updated_at?: string | null
          user_id: string
          valor_causa?: number | null
        }
        Update: {
          area_direito?: string | null
          assunto?: string | null
          capa_completa?: Json | null
          cidade?: string | null
          classificacao?: string | null
          cnpj_id?: string
          created_at?: string | null
          data_distribuicao?: string | null
          detalhes_request_data?: string | null
          detalhes_request_id?: string | null
          estado?: string | null
          fase_processual?: string | null
          id?: string
          importado_manualmente?: boolean | null
          instancia?: string | null
          juizo?: string | null
          link_tribunal?: string | null
          monitoramento_ativo?: boolean | null
          numero_cnj?: string
          ordem?: number | null
          parte_ativa?: string | null
          parte_passiva?: string | null
          parte_tipo?: string | null
          partes_completas?: Json | null
          status_processual?: string | null
          tenant_id?: string | null
          tracking_id?: string | null
          tribunal?: string | null
          tribunal_sigla?: string | null
          ultimo_andamento?: string | null
          ultimo_andamento_data?: string | null
          updated_at?: string | null
          user_id?: string
          valor_causa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_cnpj_cnpj_id_fkey"
            columns: ["cnpj_id"]
            isOneToOne: false
            referencedRelation: "cnpjs_cadastrados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_cnpj_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_cnpj_andamentos: {
        Row: {
          created_at: string | null
          dados_completos: Json | null
          data_movimentacao: string | null
          descricao: string
          id: string
          lida: boolean | null
          processo_cnpj_id: string
          tenant_id: string | null
          tipo_movimentacao: string | null
        }
        Insert: {
          created_at?: string | null
          dados_completos?: Json | null
          data_movimentacao?: string | null
          descricao: string
          id?: string
          lida?: boolean | null
          processo_cnpj_id: string
          tenant_id?: string | null
          tipo_movimentacao?: string | null
        }
        Update: {
          created_at?: string | null
          dados_completos?: Json | null
          data_movimentacao?: string | null
          descricao?: string
          id?: string
          lida?: boolean | null
          processo_cnpj_id?: string
          tenant_id?: string | null
          tipo_movimentacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_cnpj_andamentos_processo_cnpj_id_fkey"
            columns: ["processo_cnpj_id"]
            isOneToOne: false
            referencedRelation: "processos_cnpj"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_cnpj_andamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_oab: {
        Row: {
          ai_enabled: boolean | null
          ai_summary: string | null
          ai_summary_data: Json | null
          capa_completa: Json | null
          created_at: string | null
          data_distribuicao: string | null
          detalhes_carregados: boolean | null
          detalhes_completos: Json | null
          detalhes_request_data: string | null
          detalhes_request_id: string | null
          fase_processual: string | null
          id: string
          importado_manualmente: boolean | null
          juizo: string | null
          link_tribunal: string | null
          monitoramento_ativo: boolean | null
          numero_cnj: string
          oab_id: string
          ordem_lista: number | null
          parte_ativa: string | null
          parte_passiva: string | null
          partes_completas: Json | null
          prazo_advogado_responsavel_id: string | null
          prazo_automatico_ativo: boolean | null
          prazo_usuarios_marcados: string[] | null
          status_processual: string | null
          tenant_id: string | null
          tracking_id: string | null
          tracking_request_data: string | null
          tracking_request_id: string | null
          tribunal: string | null
          tribunal_sigla: string | null
          ultima_atualizacao_detalhes: string | null
          updated_at: string | null
          valor_causa: number | null
        }
        Insert: {
          ai_enabled?: boolean | null
          ai_summary?: string | null
          ai_summary_data?: Json | null
          capa_completa?: Json | null
          created_at?: string | null
          data_distribuicao?: string | null
          detalhes_carregados?: boolean | null
          detalhes_completos?: Json | null
          detalhes_request_data?: string | null
          detalhes_request_id?: string | null
          fase_processual?: string | null
          id?: string
          importado_manualmente?: boolean | null
          juizo?: string | null
          link_tribunal?: string | null
          monitoramento_ativo?: boolean | null
          numero_cnj: string
          oab_id: string
          ordem_lista?: number | null
          parte_ativa?: string | null
          parte_passiva?: string | null
          partes_completas?: Json | null
          prazo_advogado_responsavel_id?: string | null
          prazo_automatico_ativo?: boolean | null
          prazo_usuarios_marcados?: string[] | null
          status_processual?: string | null
          tenant_id?: string | null
          tracking_id?: string | null
          tracking_request_data?: string | null
          tracking_request_id?: string | null
          tribunal?: string | null
          tribunal_sigla?: string | null
          ultima_atualizacao_detalhes?: string | null
          updated_at?: string | null
          valor_causa?: number | null
        }
        Update: {
          ai_enabled?: boolean | null
          ai_summary?: string | null
          ai_summary_data?: Json | null
          capa_completa?: Json | null
          created_at?: string | null
          data_distribuicao?: string | null
          detalhes_carregados?: boolean | null
          detalhes_completos?: Json | null
          detalhes_request_data?: string | null
          detalhes_request_id?: string | null
          fase_processual?: string | null
          id?: string
          importado_manualmente?: boolean | null
          juizo?: string | null
          link_tribunal?: string | null
          monitoramento_ativo?: boolean | null
          numero_cnj?: string
          oab_id?: string
          ordem_lista?: number | null
          parte_ativa?: string | null
          parte_passiva?: string | null
          partes_completas?: Json | null
          prazo_advogado_responsavel_id?: string | null
          prazo_automatico_ativo?: boolean | null
          prazo_usuarios_marcados?: string[] | null
          status_processual?: string | null
          tenant_id?: string | null
          tracking_id?: string | null
          tracking_request_data?: string | null
          tracking_request_id?: string | null
          tribunal?: string | null
          tribunal_sigla?: string | null
          ultima_atualizacao_detalhes?: string | null
          updated_at?: string | null
          valor_causa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_oab_oab_id_fkey"
            columns: ["oab_id"]
            isOneToOne: false
            referencedRelation: "oabs_cadastradas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_oab_prazo_advogado_responsavel_id_fkey"
            columns: ["prazo_advogado_responsavel_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "processos_oab_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_oab_andamentos: {
        Row: {
          created_at: string | null
          dados_completos: Json | null
          data_movimentacao: string | null
          descricao: string
          id: string
          lida: boolean | null
          processo_oab_id: string
          tenant_id: string
          tipo_movimentacao: string | null
        }
        Insert: {
          created_at?: string | null
          dados_completos?: Json | null
          data_movimentacao?: string | null
          descricao: string
          id?: string
          lida?: boolean | null
          processo_oab_id: string
          tenant_id: string
          tipo_movimentacao?: string | null
        }
        Update: {
          created_at?: string | null
          dados_completos?: Json | null
          data_movimentacao?: string | null
          descricao?: string
          id?: string
          lida?: boolean | null
          processo_oab_id?: string
          tenant_id?: string
          tipo_movimentacao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_oab_andamentos_processo_oab_id_fkey"
            columns: ["processo_oab_id"]
            isOneToOne: false
            referencedRelation: "processos_oab"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_oab_andamentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_oab_anexos: {
        Row: {
          attachment_id: string
          attachment_name: string
          content_description: string | null
          created_at: string | null
          extension: string | null
          id: string
          is_private: boolean | null
          processo_oab_id: string
          status: string | null
          step_id: string | null
          tenant_id: string | null
        }
        Insert: {
          attachment_id: string
          attachment_name: string
          content_description?: string | null
          created_at?: string | null
          extension?: string | null
          id?: string
          is_private?: boolean | null
          processo_oab_id: string
          status?: string | null
          step_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          attachment_id?: string
          attachment_name?: string
          content_description?: string | null
          created_at?: string | null
          extension?: string | null
          id?: string
          is_private?: boolean | null
          processo_oab_id?: string
          status?: string | null
          step_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "processos_oab_anexos_processo_oab_id_fkey"
            columns: ["processo_oab_id"]
            isOneToOne: false
            referencedRelation: "processos_oab"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_oab_anexos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_oab_tarefas: {
        Row: {
          created_at: string | null
          data_execucao: string
          descricao: string | null
          fase: string | null
          id: string
          observacoes: string | null
          processo_oab_id: string
          tenant_id: string | null
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_execucao?: string
          descricao?: string | null
          fase?: string | null
          id?: string
          observacoes?: string | null
          processo_oab_id: string
          tenant_id?: string | null
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_execucao?: string
          descricao?: string | null
          fase?: string | null
          id?: string
          observacoes?: string | null
          processo_oab_id?: string
          tenant_id?: string | null
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_oab_tarefas_processo_oab_id_fkey"
            columns: ["processo_oab_id"]
            isOneToOne: false
            referencedRelation: "processos_oab"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_oab_tarefas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_relacao: string | null
          contato_emergencia_telefone: string | null
          created_at: string
          data_nascimento: string | null
          email: string
          email_pessoal: string | null
          endereco: string | null
          full_name: string | null
          id: string
          telefone: string | null
          tenant_id: string | null
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_relacao?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string
          data_nascimento?: string | null
          email: string
          email_pessoal?: string | null
          endereco?: string | null
          full_name?: string | null
          id?: string
          telefone?: string | null
          tenant_id?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_relacao?: string | null
          contato_emergencia_telefone?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string
          email_pessoal?: string | null
          endereco?: string | null
          full_name?: string | null
          id?: string
          telefone?: string | null
          tenant_id?: string | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_advogados: {
        Row: {
          cep_advogado: string | null
          cidade_advogado: string | null
          created_at: string | null
          email_advogado: string | null
          endereco_advogado: string | null
          id: string
          logo_url: string | null
          nome_advogado: string | null
          project_id: string
          telefone_advogado: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          cep_advogado?: string | null
          cidade_advogado?: string | null
          created_at?: string | null
          email_advogado?: string | null
          endereco_advogado?: string | null
          id?: string
          logo_url?: string | null
          nome_advogado?: string | null
          project_id: string
          telefone_advogado?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          cep_advogado?: string | null
          cidade_advogado?: string | null
          created_at?: string | null
          email_advogado?: string | null
          endereco_advogado?: string | null
          id?: string
          logo_url?: string | null
          nome_advogado?: string | null
          project_id?: string
          telefone_advogado?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_advogados_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_advogados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_collaborators: {
        Row: {
          added_at: string
          id: string
          project_id: string
          role: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          project_id: string
          role?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          project_id?: string
          role?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_columns: {
        Row: {
          color: string
          column_order: number
          created_at: string
          id: string
          is_default: boolean
          name: string
          project_id: string
          sector_id: string | null
          tenant_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          color?: string
          column_order: number
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          project_id: string
          sector_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          color?: string
          column_order?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          project_id?: string
          sector_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_columns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_columns_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "project_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_columns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_columns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "project_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_etapa_comment_mentions: {
        Row: {
          comment_id: string
          created_at: string | null
          id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_etapa_comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "project_etapa_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_etapa_comment_mentions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_etapa_comments: {
        Row: {
          comment_text: string
          created_at: string | null
          etapa_id: string
          id: string
          parent_comment_id: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string | null
          etapa_id: string
          id?: string
          parent_comment_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string | null
          etapa_id?: string
          id?: string
          parent_comment_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_etapa_comments_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "project_protocolo_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_etapa_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "project_etapa_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_etapa_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_etapa_files: {
        Row: {
          created_at: string | null
          description: string | null
          etapa_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          tenant_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          etapa_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          tenant_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          etapa_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          tenant_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_etapa_files_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "project_protocolo_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_etapa_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_etapa_history: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          etapa_id: string
          id: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          etapa_id: string
          id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          etapa_id?: string
          id?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_etapa_history_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "project_protocolo_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_etapa_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_processos: {
        Row: {
          created_at: string
          id: string
          ordem: number | null
          processo_oab_id: string
          projeto_id: string
          tenant_id: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          ordem?: number | null
          processo_oab_id: string
          projeto_id: string
          tenant_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          ordem?: number | null
          processo_oab_id?: string
          projeto_id?: string
          tenant_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_processos_processo_oab_id_fkey"
            columns: ["processo_oab_id"]
            isOneToOne: false
            referencedRelation: "processos_oab"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_processos_projeto_id_fkey"
            columns: ["projeto_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_processos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_processos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "project_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_protocolo_etapas: {
        Row: {
          comentario_conclusao: string | null
          created_at: string | null
          data_conclusao: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          protocolo_id: string
          responsavel_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          comentario_conclusao?: string | null
          created_at?: string | null
          data_conclusao?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          protocolo_id: string
          responsavel_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          comentario_conclusao?: string | null
          created_at?: string | null
          data_conclusao?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          protocolo_id?: string
          responsavel_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_protocolo_etapas_protocolo_id_fkey"
            columns: ["protocolo_id"]
            isOneToOne: false
            referencedRelation: "project_protocolos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_protocolo_etapas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_protocolos: {
        Row: {
          created_at: string | null
          created_by: string
          data_conclusao: string | null
          data_inicio: string | null
          data_previsao: string | null
          descricao: string | null
          id: string
          nome: string
          observacoes: string | null
          ordem: number | null
          processo_oab_id: string | null
          project_id: string
          responsavel_id: string | null
          status: string | null
          tenant_id: string | null
          updated_at: string | null
          workspace_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          data_conclusao?: string | null
          data_inicio?: string | null
          data_previsao?: string | null
          descricao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          ordem?: number | null
          processo_oab_id?: string | null
          project_id: string
          responsavel_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          data_conclusao?: string | null
          data_inicio?: string | null
          data_previsao?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          ordem?: number | null
          processo_oab_id?: string | null
          project_id?: string
          responsavel_id?: string | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_protocolos_processo_oab_id_fkey"
            columns: ["processo_oab_id"]
            isOneToOne: false
            referencedRelation: "processos_oab"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_protocolos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_protocolos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_protocolos_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "project_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sectors: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          is_default: boolean | null
          name: string
          project_id: string
          sector_order: number
          template_id: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          project_id: string
          sector_order?: number
          template_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          project_id?: string
          sector_order?: number
          template_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_sectors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sectors_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "sector_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sectors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_workspaces: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          is_default: boolean
          nome: string
          ordem: number
          project_id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          is_default?: boolean
          nome: string
          ordem?: number
          project_id: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          is_default?: boolean
          nome?: string
          ordem?: number
          project_id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_workspaces_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_workspaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string | null
          cliente_id: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          module: string
          name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          client?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          module?: string
          name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          client?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          module?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projudi_credentials: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_validated: string | null
          login_encrypted: string
          password_encrypted: string
          tenant_id: string | null
          totp_secret_encrypted: string
          tribunal: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_validated?: string | null
          login_encrypted: string
          password_encrypted: string
          tenant_id?: string | null
          totp_secret_encrypted: string
          tribunal?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_validated?: string | null
          login_encrypted?: string
          password_encrypted?: string
          tenant_id?: string | null
          totp_secret_encrypted?: string
          tribunal?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projudi_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes: {
        Row: {
          comarca: string | null
          conteudo_completo: string | null
          created_at: string
          data_disponibilizacao: string | null
          data_publicacao: string | null
          diario_nome: string | null
          diario_sigla: string | null
          id: string
          link_acesso: string | null
          monitoramento_id: string | null
          nome_pesquisado: string | null
          numero_processo: string | null
          orgao: string | null
          partes: string | null
          responsavel: string | null
          status: string
          tenant_id: string | null
          tipo: string | null
          updated_at: string
        }
        Insert: {
          comarca?: string | null
          conteudo_completo?: string | null
          created_at?: string
          data_disponibilizacao?: string | null
          data_publicacao?: string | null
          diario_nome?: string | null
          diario_sigla?: string | null
          id?: string
          link_acesso?: string | null
          monitoramento_id?: string | null
          nome_pesquisado?: string | null
          numero_processo?: string | null
          orgao?: string | null
          partes?: string | null
          responsavel?: string | null
          status?: string
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          comarca?: string | null
          conteudo_completo?: string | null
          created_at?: string
          data_disponibilizacao?: string | null
          data_publicacao?: string | null
          diario_nome?: string | null
          diario_sigla?: string | null
          id?: string
          link_acesso?: string | null
          monitoramento_id?: string | null
          nome_pesquisado?: string | null
          numero_processo?: string | null
          orgao?: string | null
          partes?: string | null
          responsavel?: string | null
          status?: string
          tenant_id?: string | null
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_monitoramento_id_fkey"
            columns: ["monitoramento_id"]
            isOneToOne: false
            referencedRelation: "publicacoes_monitoramentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publicacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      publicacoes_monitoramentos: {
        Row: {
          abrangencia: string
          cpf: string | null
          created_at: string
          data_inicio_monitoramento: string
          estados_selecionados: Json | null
          id: string
          nome: string
          oab_numero: string | null
          oab_uf: string | null
          quem_recebe_user_id: string | null
          status: string
          tenant_id: string | null
          tipo: string
          tribunais_monitorados: Json | null
          updated_at: string
        }
        Insert: {
          abrangencia?: string
          cpf?: string | null
          created_at?: string
          data_inicio_monitoramento?: string
          estados_selecionados?: Json | null
          id?: string
          nome: string
          oab_numero?: string | null
          oab_uf?: string | null
          quem_recebe_user_id?: string | null
          status?: string
          tenant_id?: string | null
          tipo?: string
          tribunais_monitorados?: Json | null
          updated_at?: string
        }
        Update: {
          abrangencia?: string
          cpf?: string | null
          created_at?: string
          data_inicio_monitoramento?: string
          estados_selecionados?: Json | null
          id?: string
          nome?: string
          oab_numero?: string | null
          oab_uf?: string | null
          quem_recebe_user_id?: string | null
          status?: string
          tenant_id?: string | null
          tipo?: string
          tribunais_monitorados?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publicacoes_monitoramentos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_docs_cadastrados: {
        Row: {
          created_at: string | null
          created_by: string | null
          descricao: string | null
          documento: string
          id: string
          notification_emails: string[] | null
          recurrence: number | null
          tenant_id: string
          tipo_documento: string
          total_processos_recebidos: number | null
          tracking_id: string | null
          tracking_status: string | null
          ultima_notificacao: string | null
          ultimo_request_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          documento: string
          id?: string
          notification_emails?: string[] | null
          recurrence?: number | null
          tenant_id: string
          tipo_documento: string
          total_processos_recebidos?: number | null
          tracking_id?: string | null
          tracking_status?: string | null
          ultima_notificacao?: string | null
          ultimo_request_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          documento?: string
          id?: string
          notification_emails?: string[] | null
          recurrence?: number | null
          tenant_id?: string
          tipo_documento?: string
          total_processos_recebidos?: number | null
          tracking_id?: string | null
          tracking_status?: string | null
          ultima_notificacao?: string | null
          ultimo_request_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_docs_cadastrados_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      push_docs_processos: {
        Row: {
          created_at: string | null
          data_distribuicao: string | null
          id: string
          lido: boolean | null
          numero_cnj: string
          parte_ativa: string | null
          parte_passiva: string | null
          payload_completo: Json | null
          push_doc_id: string
          request_id: string | null
          status_processual: string | null
          tenant_id: string
          tracking_id: string | null
          tribunal: string | null
          tribunal_sigla: string | null
          valor_causa: number | null
        }
        Insert: {
          created_at?: string | null
          data_distribuicao?: string | null
          id?: string
          lido?: boolean | null
          numero_cnj: string
          parte_ativa?: string | null
          parte_passiva?: string | null
          payload_completo?: Json | null
          push_doc_id: string
          request_id?: string | null
          status_processual?: string | null
          tenant_id: string
          tracking_id?: string | null
          tribunal?: string | null
          tribunal_sigla?: string | null
          valor_causa?: number | null
        }
        Update: {
          created_at?: string | null
          data_distribuicao?: string | null
          id?: string
          lido?: boolean | null
          numero_cnj?: string
          parte_ativa?: string | null
          parte_passiva?: string | null
          payload_completo?: Json | null
          push_doc_id?: string
          request_id?: string | null
          status_processual?: string | null
          tenant_id?: string
          tracking_id?: string | null
          tribunal?: string | null
          tribunal_sigla?: string | null
          valor_causa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "push_docs_processos_push_doc_id_fkey"
            columns: ["push_doc_id"]
            isOneToOne: false
            referencedRelation: "push_docs_cadastrados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_docs_processos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reuniao_arquivos: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          reuniao_id: string
          tenant_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          reuniao_id: string
          tenant_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          reuniao_id?: string
          tenant_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "reuniao_arquivos_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reuniao_arquivos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reuniao_cliente_arquivos: {
        Row: {
          cliente_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          id: string
          tenant_id: string | null
          uploaded_by: string
        }
        Insert: {
          cliente_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type?: string | null
          id?: string
          tenant_id?: string | null
          uploaded_by: string
        }
        Update: {
          cliente_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          id?: string
          tenant_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "reuniao_cliente_arquivos_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "reuniao_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reuniao_cliente_arquivos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reuniao_cliente_comentarios: {
        Row: {
          cliente_id: string
          comentario: string
          created_at: string
          id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cliente_id: string
          comentario: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cliente_id?: string
          comentario?: string
          created_at?: string
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reuniao_cliente_comentarios_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "reuniao_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reuniao_cliente_comentarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reuniao_clientes: {
        Row: {
          created_at: string
          created_by: string
          email: string | null
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          telefone: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          telefone?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reuniao_clientes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reuniao_comentarios: {
        Row: {
          comentario: string
          created_at: string | null
          id: string
          reuniao_id: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comentario: string
          created_at?: string | null
          id?: string
          reuniao_id: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comentario?: string
          created_at?: string | null
          id?: string
          reuniao_id?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reuniao_comentarios_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reuniao_comentarios_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reuniao_status: {
        Row: {
          ativo: boolean | null
          cor: string
          created_at: string | null
          id: string
          is_default: boolean | null
          nome: string
          ordem: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          nome: string
          ordem?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          nome?: string
          ordem?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reuniao_status_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          cliente_email: string | null
          cliente_id: string | null
          cliente_nome: string | null
          cliente_telefone: string | null
          created_at: string | null
          data: string
          data_alteracao_situacao: string | null
          descricao: string | null
          duracao_minutos: number | null
          horario: string
          id: string
          motivo_alteracao: string | null
          observacoes: string | null
          situacao_agenda: string | null
          status: string
          status_id: string | null
          tenant_id: string | null
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string | null
          data: string
          data_alteracao_situacao?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          horario: string
          id?: string
          motivo_alteracao?: string | null
          observacoes?: string | null
          situacao_agenda?: string | null
          status?: string
          status_id?: string | null
          tenant_id?: string | null
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cliente_email?: string | null
          cliente_id?: string | null
          cliente_nome?: string | null
          cliente_telefone?: string | null
          created_at?: string | null
          data?: string
          data_alteracao_situacao?: string | null
          descricao?: string | null
          duracao_minutos?: number | null
          horario?: string
          id?: string
          motivo_alteracao?: string | null
          observacoes?: string | null
          situacao_agenda?: string | null
          status?: string
          status_id?: string | null
          tenant_id?: string | null
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reunioes_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "reuniao_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "reuniao_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reunioes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      sector_templates: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          id: string
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          id?: string
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sector_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          created_at: string | null
          id: string
          last_message_at: string | null
          status: string | null
          subject: string
          tenant_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
          subject: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_message_at?: string | null
          status?: string | null
          subject?: string
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_types: {
        Row: {
          code: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      task_comments: {
        Row: {
          comment_text: string
          created_at: string
          id: string
          reply_to_author: string | null
          reply_to_id: string | null
          reply_to_text: string | null
          task_id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_text: string
          created_at?: string
          id?: string
          reply_to_author?: string | null
          reply_to_id?: string | null
          reply_to_text?: string | null
          task_id: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_text?: string
          created_at?: string
          id?: string
          reply_to_author?: string | null
          reply_to_id?: string | null
          reply_to_text?: string | null
          task_id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_files: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string | null
          id: string
          task_id: string
          tenant_id: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          file_type?: string | null
          id?: string
          task_id: string
          tenant_id?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string | null
          id?: string
          task_id?: string
          tenant_id?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_files_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_files_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_history: {
        Row: {
          action: string
          created_at: string
          details: string
          id: string
          project_id: string | null
          task_id: string | null
          task_title: string | null
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details: string
          id?: string
          project_id?: string | null
          task_id?: string | null
          task_title?: string | null
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: string
          id?: string
          project_id?: string | null
          task_id?: string | null
          task_title?: string | null
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_history_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      task_tarefas: {
        Row: {
          created_at: string | null
          data_execucao: string
          descricao: string | null
          fase: string | null
          id: string
          observacoes: string | null
          task_id: string
          tenant_id: string | null
          titulo: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data_execucao: string
          descricao?: string | null
          fase?: string | null
          id?: string
          observacoes?: string | null
          task_id: string
          tenant_id?: string | null
          titulo: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data_execucao?: string
          descricao?: string | null
          fase?: string | null
          id?: string
          observacoes?: string | null
          task_id?: string
          tenant_id?: string | null
          titulo?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_tarefas_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_tarefas_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          acordo_details: Json | null
          card_color: string | null
          column_id: string | null
          created_at: string
          description: string | null
          id: string
          processo_oab_id: string | null
          project_id: string
          sector_id: string | null
          status: string
          task_type: string | null
          tenant_id: string | null
          title: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          acordo_details?: Json | null
          card_color?: string | null
          column_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          processo_oab_id?: string | null
          project_id: string
          sector_id?: string | null
          status?: string
          task_type?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          acordo_details?: Json | null
          card_color?: string | null
          column_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          processo_oab_id?: string | null
          project_id?: string
          sector_id?: string | null
          status?: string
          task_type?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "project_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_processo_oab_id_fkey"
            columns: ["processo_oab_id"]
            isOneToOne: false
            referencedRelation: "processos_oab"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "project_sectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "project_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_ai_settings: {
        Row: {
          ai_enabled: boolean
          created_at: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ai_enabled?: boolean
          created_at?: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          ai_enabled?: boolean
          created_at?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_ai_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_assinatura_perfil: {
        Row: {
          cep: string | null
          cidade: string | null
          cpf: string
          created_at: string | null
          email: string
          endereco: string | null
          estado: string | null
          id: string
          nome_responsavel: string
          telefone: string | null
          tenant_id: string
          termos_aceitos: boolean | null
          termos_aceitos_em: string | null
          updated_at: string | null
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cpf: string
          created_at?: string | null
          email: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_responsavel: string
          telefone?: string | null
          tenant_id: string
          termos_aceitos?: boolean | null
          termos_aceitos_em?: string | null
          updated_at?: string | null
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cpf?: string
          created_at?: string | null
          email?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome_responsavel?: string
          telefone?: string | null
          tenant_id?: string
          termos_aceitos?: boolean | null
          termos_aceitos_em?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_assinatura_perfil_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_banco_ids: {
        Row: {
          created_at: string
          descricao: string
          external_id: string | null
          id: string
          metadata: Json | null
          referencia_id: string | null
          tenant_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          descricao: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          referencia_id?: string | null
          tenant_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          descricao?: string
          external_id?: string | null
          id?: string
          metadata?: Json | null
          referencia_id?: string | null
          tenant_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_banco_ids_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_boletos: {
        Row: {
          codigo_barras: string | null
          created_at: string | null
          created_by: string | null
          data_vencimento: string
          id: string
          link_cartao: string | null
          mes_referencia: string
          metodos_disponiveis: string[] | null
          observacao: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
          url_boleto: string | null
          valor: number
        }
        Insert: {
          codigo_barras?: string | null
          created_at?: string | null
          created_by?: string | null
          data_vencimento: string
          id?: string
          link_cartao?: string | null
          mes_referencia: string
          metodos_disponiveis?: string[] | null
          observacao?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
          url_boleto?: string | null
          valor: number
        }
        Update: {
          codigo_barras?: string | null
          created_at?: string | null
          created_by?: string | null
          data_vencimento?: string
          id?: string
          link_cartao?: string | null
          mes_referencia?: string
          metodos_disponiveis?: string[] | null
          observacao?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
          url_boleto?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "tenant_boletos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_pagamento_confirmacoes: {
        Row: {
          boleto_id: string
          comprovante_path: string | null
          created_at: string | null
          data_confirmacao: string | null
          id: string
          metodo: string
          observacao_admin: string | null
          status: string | null
          tenant_id: string
          updated_at: string | null
        }
        Insert: {
          boleto_id: string
          comprovante_path?: string | null
          created_at?: string | null
          data_confirmacao?: string | null
          id?: string
          metodo: string
          observacao_admin?: string | null
          status?: string | null
          tenant_id: string
          updated_at?: string | null
        }
        Update: {
          boleto_id?: string
          comprovante_path?: string | null
          created_at?: string | null
          data_confirmacao?: string | null
          id?: string
          metodo?: string
          observacao_admin?: string | null
          status?: string | null
          tenant_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_pagamento_confirmacoes_boleto_id_fkey"
            columns: ["boleto_id"]
            isOneToOne: false
            referencedRelation: "tenant_boletos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_pagamento_confirmacoes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          cnpj: string | null
          created_at: string | null
          email_contato: string | null
          email_domain: string | null
          endereco: string | null
          id: string
          is_active: boolean | null
          limite_oabs_personalizado: number | null
          logo_url: string | null
          name: string
          plano: string
          responsavel_financeiro: string | null
          settings: Json | null
          slug: string
          system_type_id: string | null
          telefone: string | null
          updated_at: string | null
        }
        Insert: {
          cnpj?: string | null
          created_at?: string | null
          email_contato?: string | null
          email_domain?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean | null
          limite_oabs_personalizado?: number | null
          logo_url?: string | null
          name: string
          plano?: string
          responsavel_financeiro?: string | null
          settings?: Json | null
          slug: string
          system_type_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Update: {
          cnpj?: string | null
          created_at?: string | null
          email_contato?: string | null
          email_domain?: string | null
          endereco?: string | null
          id?: string
          is_active?: boolean | null
          limite_oabs_personalizado?: number | null
          logo_url?: string | null
          name?: string
          plano?: string
          responsavel_financeiro?: string | null
          settings?: Json | null
          slug?: string
          system_type_id?: string | null
          telefone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_system_type_id_fkey"
            columns: ["system_type_id"]
            isOneToOne: false
            referencedRelation: "system_types"
            referencedColumns: ["id"]
          },
        ]
      }
      tipos_acao: {
        Row: {
          created_at: string | null
          descricao: string | null
          grupo_acao_id: string | null
          id: string
          nome: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          grupo_acao_id?: string | null
          id?: string
          nome: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          grupo_acao_id?: string | null
          id?: string
          nome?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tipos_acao_grupo_acao_id_fkey"
            columns: ["grupo_acao_id"]
            isOneToOne: false
            referencedRelation: "grupos_acoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tipos_acao_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      totp_tokens: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          secret: string
          tenant_id: string
          wallet_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          secret: string
          tenant_id: string
          wallet_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          secret?: string
          tenant_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "totp_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "totp_tokens_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "totp_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      totp_wallet_viewers: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          tenant_id: string | null
          user_id: string
          wallet_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          tenant_id?: string | null
          user_id: string
          wallet_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          tenant_id?: string | null
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "totp_wallet_viewers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "totp_wallet_viewers_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "totp_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      totp_wallets: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          name: string
          oab_numero: string | null
          oab_uf: string | null
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name: string
          oab_numero?: string | null
          oab_uf?: string | null
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string
          oab_numero?: string | null
          oab_uf?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "totp_wallets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tribunais: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          sigla: string
          tenant_id: string | null
          tipo: string
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          sigla: string
          tenant_id?: string | null
          tipo: string
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          sigla?: string
          tenant_id?: string | null
          tipo?: string
          uf?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tribunais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tribunal_credentials: {
        Row: {
          certificate_password_encrypted: string | null
          certificate_path: string | null
          config_metadata: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          last_sync_error: string | null
          last_sync_status: string | null
          login: string | null
          oauth_refresh_token: string | null
          oauth_token: string | null
          password_encrypted: string | null
          tenant_id: string | null
          token_expires_at: string | null
          tribunal_code: string
          tribunal_name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          certificate_password_encrypted?: string | null
          certificate_path?: string | null
          config_metadata?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          login?: string | null
          oauth_refresh_token?: string | null
          oauth_token?: string | null
          password_encrypted?: string | null
          tenant_id?: string | null
          token_expires_at?: string | null
          tribunal_code: string
          tribunal_name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          certificate_password_encrypted?: string | null
          certificate_path?: string | null
          config_metadata?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          last_sync_error?: string | null
          last_sync_status?: string | null
          login?: string | null
          oauth_refresh_token?: string | null
          oauth_token?: string | null
          password_encrypted?: string | null
          tenant_id?: string | null
          token_expires_at?: string | null
          tribunal_code?: string
          tribunal_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribunal_credentials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tribunal_sync_logs: {
        Row: {
          created_at: string | null
          documentos_found: number | null
          duration_ms: number | null
          error_message: string | null
          id: string
          movimentacoes_imported: number | null
          processo_id: string | null
          response_metadata: Json | null
          status: string
          sync_type: string
          tribunal_code: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          documentos_found?: number | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          movimentacoes_imported?: number | null
          processo_id?: string | null
          response_metadata?: Json | null
          status: string
          sync_type: string
          tribunal_code: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          documentos_found?: number | null
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          movimentacoes_imported?: number | null
          processo_id?: string | null
          response_metadata?: Json | null
          status?: string
          sync_type?: string
          tribunal_code?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tribunal_sync_logs_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_agent_roles: {
        Row: {
          agent_id: string
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["whatsapp_agent_role"]
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["whatsapp_agent_role"]
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["whatsapp_agent_role"]
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agent_roles_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_agents: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          is_landing_agent: boolean | null
          landing_page_source: string | null
          name: string
          role: string
          team_id: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_landing_agent?: boolean | null
          landing_page_source?: string | null
          name: string
          role?: string
          team_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          is_landing_agent?: boolean | null
          landing_page_source?: string | null
          name?: string
          role?: string
          team_id?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_agents_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_agents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_ai_config: {
        Row: {
          agent_id: string | null
          agent_name: string | null
          created_at: string | null
          id: string
          instance_name: string | null
          is_enabled: boolean | null
          max_history: number | null
          model_name: string | null
          response_delay_seconds: number
          system_prompt: string | null
          temperature: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          agent_name?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string | null
          is_enabled?: boolean | null
          max_history?: number | null
          model_name?: string | null
          response_delay_seconds?: number
          system_prompt?: string | null
          temperature?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          agent_name?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string | null
          is_enabled?: boolean | null
          max_history?: number | null
          model_name?: string | null
          response_delay_seconds?: number
          system_prompt?: string | null
          temperature?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_ai_config_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_ai_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_ai_disabled_contacts: {
        Row: {
          disabled_at: string | null
          disabled_by: string | null
          id: string
          phone_number: string
          reason: string | null
          tenant_id: string | null
        }
        Insert: {
          disabled_at?: string | null
          disabled_by?: string | null
          id?: string
          phone_number: string
          reason?: string | null
          tenant_id?: string | null
        }
        Update: {
          disabled_at?: string | null
          disabled_by?: string | null
          id?: string
          phone_number?: string
          reason?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_ai_disabled_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_ai_pending_responses: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          instance_id: string
          phone: string
          scheduled_at: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          instance_id: string
          phone: string
          scheduled_at: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          instance_id?: string
          phone?: string
          scheduled_at?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: []
      }
      whatsapp_automations: {
        Row: {
          created_at: string | null
          id: string
          instance_name: string
          is_active: boolean | null
          response_message: string
          tenant_id: string | null
          trigger_keyword: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          instance_name: string
          is_active?: boolean | null
          response_message: string
          tenant_id?: string | null
          trigger_keyword: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          instance_name?: string
          is_active?: boolean | null
          response_message?: string
          tenant_id?: string | null
          trigger_keyword?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaign_messages: {
        Row: {
          campaign_id: string | null
          contact_name: string | null
          created_at: string | null
          error_message: string | null
          id: string
          message: string
          phone: string
          scheduled_at: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          campaign_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message: string
          phone: string
          scheduled_at: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          campaign_id?: string | null
          contact_name?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          message?: string
          phone?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaign_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_campaigns: {
        Row: {
          agent_id: string | null
          batch_size: number | null
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          id: string
          interval_minutes: number | null
          message_template: string
          name: string
          sent_count: number | null
          status: string | null
          target_column_id: string | null
          tenant_id: string | null
          total_contacts: number | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          batch_size?: number | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          interval_minutes?: number | null
          message_template: string
          name: string
          sent_count?: number | null
          status?: string | null
          target_column_id?: string | null
          tenant_id?: string | null
          total_contacts?: number | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          batch_size?: number | null
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          interval_minutes?: number | null
          message_template?: string
          name?: string
          sent_count?: number | null
          status?: string | null
          target_column_id?: string | null
          tenant_id?: string | null
          total_contacts?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_campaigns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_target_column_id_fkey"
            columns: ["target_column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_campaigns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contact_labels: {
        Row: {
          contact_id: string
          created_at: string | null
          id: string
          label_id: string
          tenant_id: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          id?: string
          label_id: string
          tenant_id?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          id?: string
          label_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_labels_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contact_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_labels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_contact_labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contact_notes: {
        Row: {
          author_id: string
          author_name: string | null
          contact_phone: string
          content: string
          created_at: string | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          author_id: string
          author_name?: string | null
          contact_phone: string
          content: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          author_id?: string
          author_name?: string | null
          contact_phone?: string
          content?: string
          created_at?: string | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contact_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts: {
        Row: {
          avatar_url: string | null
          city: string | null
          country: string | null
          created_at: string | null
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
          state: string | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
          state?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
          state?: string | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_access: {
        Row: {
          agent_id: string
          created_at: string
          granted_by_agent_id: string | null
          id: string
          phone: string
          tenant_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          granted_by_agent_id?: string | null
          id?: string
          phone: string
          tenant_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          granted_by_agent_id?: string | null
          id?: string
          phone?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_access_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversation_kanban: {
        Row: {
          agent_id: string | null
          card_order: number
          column_id: string | null
          created_at: string | null
          id: string
          phone: string
          tenant_id: string | null
          transferred_from_agent_id: string | null
          transferred_from_agent_name: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id?: string | null
          card_order?: number
          column_id?: string | null
          created_at?: string | null
          id?: string
          phone: string
          tenant_id?: string | null
          transferred_from_agent_id?: string | null
          transferred_from_agent_name?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string | null
          card_order?: number
          column_id?: string | null
          created_at?: string | null
          id?: string
          phone?: string
          tenant_id?: string | null
          transferred_from_agent_id?: string | null
          transferred_from_agent_name?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversation_kanban_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_kanban_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_kanban_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_kanban_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversation_kanban_transferred_from_agent_id_fkey"
            columns: ["transferred_from_agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          agent_id: string | null
          connection_status: string | null
          created_at: string | null
          id: string
          instance_name: string
          last_update: string | null
          meta_access_token: string | null
          meta_business_id: string | null
          meta_phone_number_id: string | null
          meta_verify_token: string | null
          meta_waba_id: string | null
          provider: string
          qr_code: string | null
          tenant_id: string | null
          updated_at: string | null
          user_id: string
          zapi_client_token: string | null
          zapi_instance_id: string | null
          zapi_instance_token: string | null
          zapi_token: string | null
          zapi_url: string | null
        }
        Insert: {
          agent_id?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          instance_name: string
          last_update?: string | null
          meta_access_token?: string | null
          meta_business_id?: string | null
          meta_phone_number_id?: string | null
          meta_verify_token?: string | null
          meta_waba_id?: string | null
          provider?: string
          qr_code?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
          zapi_client_token?: string | null
          zapi_instance_id?: string | null
          zapi_instance_token?: string | null
          zapi_token?: string | null
          zapi_url?: string | null
        }
        Update: {
          agent_id?: string | null
          connection_status?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string
          last_update?: string | null
          meta_access_token?: string | null
          meta_business_id?: string | null
          meta_phone_number_id?: string | null
          meta_verify_token?: string | null
          meta_waba_id?: string | null
          provider?: string
          qr_code?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          user_id?: string
          zapi_client_token?: string | null
          zapi_instance_id?: string | null
          zapi_instance_token?: string | null
          zapi_token?: string | null
          zapi_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_instances_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_instances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_kanban_columns: {
        Row: {
          agent_id: string | null
          color: string
          column_order: number
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          tenant_id: string | null
        }
        Insert: {
          agent_id?: string | null
          color?: string
          column_order?: number
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          tenant_id?: string | null
        }
        Update: {
          agent_id?: string | null
          color?: string
          column_order?: number
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_kanban_columns_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_kanban_columns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_labels: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_labels_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_lead_triggers: {
        Row: {
          created_at: string | null
          followup_delay_hours: number | null
          followup_enabled: boolean | null
          followup_message: string | null
          id: string
          is_active: boolean | null
          lead_source: string
          tenant_id: string | null
          updated_at: string | null
          welcome_delay_minutes: number | null
          welcome_message: string
        }
        Insert: {
          created_at?: string | null
          followup_delay_hours?: number | null
          followup_enabled?: boolean | null
          followup_message?: string | null
          id?: string
          is_active?: boolean | null
          lead_source: string
          tenant_id?: string | null
          updated_at?: string | null
          welcome_delay_minutes?: number | null
          welcome_message: string
        }
        Update: {
          created_at?: string | null
          followup_delay_hours?: number | null
          followup_enabled?: boolean | null
          followup_message?: string | null
          id?: string
          is_active?: boolean | null
          lead_source?: string
          tenant_id?: string | null
          updated_at?: string | null
          welcome_delay_minutes?: number | null
          welcome_message?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_lead_triggers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          agent_id: string | null
          created_at: string | null
          direction: string | null
          from_number: string
          id: string
          instance_name: string
          is_read: boolean | null
          message_id: string
          message_text: string | null
          message_type: string | null
          raw_data: Json | null
          tenant_id: string | null
          timestamp: string | null
          to_number: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          direction?: string | null
          from_number: string
          id?: string
          instance_name: string
          is_read?: boolean | null
          message_id: string
          message_text?: string | null
          message_type?: string | null
          raw_data?: Json | null
          tenant_id?: string | null
          timestamp?: string | null
          to_number?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          direction?: string | null
          from_number?: string
          id?: string
          instance_name?: string
          is_read?: boolean | null
          message_id?: string
          message_text?: string | null
          message_type?: string | null
          raw_data?: Json | null
          tenant_id?: string | null
          timestamp?: string | null
          to_number?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_pending_messages: {
        Row: {
          attempts: number | null
          created_at: string | null
          error_message: string | null
          id: string
          lead_id: string
          lead_source: string
          message: string
          phone: string
          scheduled_at: string
          sent_at: string | null
          status: string | null
          tenant_id: string | null
          trigger_id: string | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id: string
          lead_source: string
          message: string
          phone: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trigger_id?: string | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          lead_id?: string
          lead_source?: string
          message?: string
          phone?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string | null
          tenant_id?: string | null
          trigger_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_pending_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_pending_messages_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_lead_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_teams: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_status_parcelas: { Args: never; Returns: undefined }
      calcular_prazo_dias_uteis: {
        Args: {
          p_data_inicio: string
          p_prazo_dias: number
          p_tenant_id?: string
          p_tribunal_sigla?: string
        }
        Returns: string
      }
      create_default_kanban_columns: {
        Args: { p_agent_id: string; p_tenant_id?: string }
        Returns: undefined
      }
      create_project_notification: {
        Args: {
          notification_content: string
          notification_title: string
          notification_type: string
          project_id_param: string
          task_id_param?: string
          triggered_by?: string
        }
        Returns: undefined
      }
      criar_categorias_custos_padrao: {
        Args: { p_tenant_id: string }
        Returns: undefined
      }
      decrypt_credential: {
        Args: { encrypted_text: string; key: string }
        Returns: string
      }
      encrypt_credential: {
        Args: { key: string; text_to_encrypt: string }
        Returns: string
      }
      get_dashboard_processos_count: { Args: never; Returns: number }
      get_user_tenant_id: { Args: never; Returns: string }
      get_users_with_roles: {
        Args: never
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          highest_role: string
          primary_role: string
          updated_at: string
          user_id: string
        }[]
      }
      get_users_with_roles_by_tenant: {
        Args: { target_tenant_id: string }
        Returns: {
          avatar_url: string
          created_at: string
          email: string
          full_name: string
          highest_role: string
          primary_role: string
          updated_at: string
          user_id: string
        }[]
      }
      has_batink_role: {
        Args: {
          _role: Database["public"]["Enums"]["batink_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_link_role: {
        Args: {
          _role: Database["public"]["Enums"]["link_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_metal_role: {
        Args: {
          _role: Database["public"]["Enums"]["metal_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_tenant: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _tenant_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_whatsapp_bot_access: {
        Args: { _tenant_id: string; _user_email: string }
        Returns: {
          access_type: string
          agent_id: string
          agent_name: string
          agent_role: Database["public"]["Enums"]["whatsapp_agent_role"]
          has_access: boolean
        }[]
      }
      is_admin_in_same_tenant: {
        Args: { _target_user_id: string }
        Returns: boolean
      }
      is_admin_or_controller_in_tenant: { Args: never; Returns: boolean }
      is_current_user_admin_in_tenant: {
        Args: { _target_tenant_id: string }
        Returns: boolean
      }
      is_deadline_owner: {
        Args: { _deadline_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { project_id: string; uid?: string }
        Returns: boolean
      }
      is_project_owner: {
        Args: { project_id: string; uid?: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tagged_in_deadline: {
        Args: { _deadline_id: string; _user_id: string }
        Returns: boolean
      }
      normalize_descricao: { Args: { txt: string }; Returns: string }
      truncate_minute: { Args: { ts: string }; Returns: string }
      user_belongs_to_tenant: { Args: { _tenant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "advogado"
        | "comercial"
        | "financeiro"
        | "controller"
        | "agenda"
        | "reunioes"
      batink_entry_type_v2:
        | "entrada"
        | "pausa"
        | "almoco"
        | "retorno_almoco"
        | "saida"
      batink_role: "admin" | "gestor" | "funcionario"
      documento_tipo:
        | "peticao"
        | "contrato"
        | "procuracao"
        | "certidao"
        | "sentenca"
        | "acordao"
        | "outros"
      link_role: "admin" | "user"
      metal_role: "admin" | "operador"
      movimentacao_tipo:
        | "peticionamento"
        | "audiencia"
        | "despacho"
        | "sentenca"
        | "recurso"
        | "juntada"
        | "intimacao"
        | "publicacao"
        | "outros"
      processo_prioridade: "baixa" | "normal" | "alta" | "urgente"
      processo_status:
        | "em_andamento"
        | "arquivado"
        | "suspenso"
        | "conciliacao"
        | "sentenca"
        | "transito_julgado"
      user_role_type: "admin" | "advogado" | "comercial" | "financeiro"
      whatsapp_agent_role: "admin" | "atendente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "advogado",
        "comercial",
        "financeiro",
        "controller",
        "agenda",
        "reunioes",
      ],
      batink_entry_type_v2: [
        "entrada",
        "pausa",
        "almoco",
        "retorno_almoco",
        "saida",
      ],
      batink_role: ["admin", "gestor", "funcionario"],
      documento_tipo: [
        "peticao",
        "contrato",
        "procuracao",
        "certidao",
        "sentenca",
        "acordao",
        "outros",
      ],
      link_role: ["admin", "user"],
      metal_role: ["admin", "operador"],
      movimentacao_tipo: [
        "peticionamento",
        "audiencia",
        "despacho",
        "sentenca",
        "recurso",
        "juntada",
        "intimacao",
        "publicacao",
        "outros",
      ],
      processo_prioridade: ["baixa", "normal", "alta", "urgente"],
      processo_status: [
        "em_andamento",
        "arquivado",
        "suspenso",
        "conciliacao",
        "sentenca",
        "transito_julgado",
      ],
      user_role_type: ["admin", "advogado", "comercial", "financeiro"],
      whatsapp_agent_role: ["admin", "atendente"],
    },
  },
} as const
