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
      client_history: {
        Row: {
          action_type: string
          client_name: string
          created_at: string
          description: string | null
          id: string
          project_id: string
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
        ]
      }
      cliente_pagamento_comentarios: {
        Row: {
          comentario: string
          created_at: string | null
          id: string
          parcela_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comentario: string
          created_at?: string | null
          id?: string
          parcela_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comentario?: string
          created_at?: string | null
          id?: string
          parcela_id?: string
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
        ]
      }
      cliente_parcelas: {
        Row: {
          cliente_id: string
          comprovante_url: string | null
          created_at: string | null
          data_pagamento: string | null
          data_vencimento: string
          id: string
          metodo_pagamento: string | null
          numero_parcela: number
          observacoes: string | null
          status: string
          updated_at: string | null
          valor_parcela: number
        }
        Insert: {
          cliente_id: string
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento: string
          id?: string
          metodo_pagamento?: string | null
          numero_parcela: number
          observacoes?: string | null
          status?: string
          updated_at?: string | null
          valor_parcela: number
        }
        Update: {
          cliente_id?: string
          comprovante_url?: string | null
          created_at?: string | null
          data_pagamento?: string | null
          data_vencimento?: string
          id?: string
          metodo_pagamento?: string | null
          numero_parcela?: number
          observacoes?: string | null
          status?: string
          updated_at?: string | null
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
        ]
      }
      clientes: {
        Row: {
          classificacao: string | null
          created_at: string | null
          data_cadastro: string | null
          data_fechamento: string
          data_nascimento: string | null
          data_vencimento_final: string | null
          data_vencimento_inicial: string | null
          email: string | null
          endereco: string | null
          forma_pagamento: string
          id: string
          nome_pessoa_fisica: string | null
          nome_pessoa_juridica: string | null
          numero_parcelas: number | null
          observacoes: string | null
          origem_rede_social: string | null
          origem_tipo: string | null
          pessoas_adicionais: Json | null
          telefone: string | null
          updated_at: string | null
          user_id: string
          valor_contrato: number
          valor_entrada: number | null
          valor_parcela: number | null
          vendedor: string | null
        }
        Insert: {
          classificacao?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          data_fechamento: string
          data_nascimento?: string | null
          data_vencimento_final?: string | null
          data_vencimento_inicial?: string | null
          email?: string | null
          endereco?: string | null
          forma_pagamento: string
          id?: string
          nome_pessoa_fisica?: string | null
          nome_pessoa_juridica?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          origem_rede_social?: string | null
          origem_tipo?: string | null
          pessoas_adicionais?: Json | null
          telefone?: string | null
          updated_at?: string | null
          user_id: string
          valor_contrato: number
          valor_entrada?: number | null
          valor_parcela?: number | null
          vendedor?: string | null
        }
        Update: {
          classificacao?: string | null
          created_at?: string | null
          data_cadastro?: string | null
          data_fechamento?: string
          data_nascimento?: string | null
          data_vencimento_final?: string | null
          data_vencimento_inicial?: string | null
          email?: string | null
          endereco?: string | null
          forma_pagamento?: string
          id?: string
          nome_pessoa_fisica?: string | null
          nome_pessoa_juridica?: string | null
          numero_parcelas?: number | null
          observacoes?: string | null
          origem_rede_social?: string | null
          origem_tipo?: string | null
          pessoas_adicionais?: Json | null
          telefone?: string | null
          updated_at?: string | null
          user_id?: string
          valor_contrato?: number
          valor_entrada?: number | null
          valor_parcela?: number | null
          vendedor?: string | null
        }
        Relationships: []
      }
      comarcas: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          tribunal_id: string | null
          uf: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          tribunal_id?: string | null
          uf: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          tribunal_id?: string | null
          uf?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comarcas_tribunal_id_fkey"
            columns: ["tribunal_id"]
            isOneToOne: false
            referencedRelation: "tribunais"
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
          tribunal?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      deadline_tags: {
        Row: {
          created_at: string | null
          deadline_id: string
          id: string
          tagged_user_id: string
        }
        Insert: {
          created_at?: string | null
          deadline_id: string
          id?: string
          tagged_user_id: string
        }
        Update: {
          created_at?: string | null
          deadline_id?: string
          id?: string
          tagged_user_id?: string
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
        ]
      }
      deadlines: {
        Row: {
          advogado_responsavel_id: string | null
          completed: boolean
          created_at: string
          date: string
          description: string | null
          id: string
          project_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          advogado_responsavel_id?: string | null
          completed?: boolean
          created_at?: string
          date: string
          description?: string | null
          id?: string
          project_id: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          advogado_responsavel_id?: string | null
          completed?: boolean
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          project_id?: string
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
            foreignKeyName: "deadlines_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          user_id: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome: string
          user_id?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          id?: string
          nome?: string
          user_id?: string | null
        }
        Relationships: []
      }
      grupos_acoes: {
        Row: {
          cor: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          cor?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
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
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          lead_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          lead_id?: string
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
          tipo?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
          validado?: string | null
        }
        Relationships: []
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
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
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
          sender_id: string
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
          sender_id: string
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
          sender_id?: string
          updated_at?: string
        }
        Relationships: []
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
          title?: string
          triggered_by_user_id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
        ]
      }
      processo_etiquetas: {
        Row: {
          created_at: string | null
          etiqueta_id: string
          id: string
          processo_id: string
        }
        Insert: {
          created_at?: string | null
          etiqueta_id: string
          id?: string
          processo_id: string
        }
        Update: {
          created_at?: string | null
          etiqueta_id?: string
          id?: string
          processo_id?: string
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
          grupo_acao_id: string | null
          id: string
          is_draft: boolean | null
          numero_processo: string
          observacoes: string | null
          parte_ativa: string
          parte_passiva: string
          prazo_proximo: string | null
          prioridade: Database["public"]["Enums"]["processo_prioridade"] | null
          representantes: Json | null
          status: Database["public"]["Enums"]["processo_status"] | null
          tipo_acao_id: string | null
          tipo_acao_nome: string | null
          tribunal_id: string | null
          tribunal_nome: string | null
          updated_at: string | null
          valor_causa: number | null
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
          grupo_acao_id?: string | null
          id?: string
          is_draft?: boolean | null
          numero_processo: string
          observacoes?: string | null
          parte_ativa: string
          parte_passiva: string
          prazo_proximo?: string | null
          prioridade?: Database["public"]["Enums"]["processo_prioridade"] | null
          representantes?: Json | null
          status?: Database["public"]["Enums"]["processo_status"] | null
          tipo_acao_id?: string | null
          tipo_acao_nome?: string | null
          tribunal_id?: string | null
          tribunal_nome?: string | null
          updated_at?: string | null
          valor_causa?: number | null
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
          grupo_acao_id?: string | null
          id?: string
          is_draft?: boolean | null
          numero_processo?: string
          observacoes?: string | null
          parte_ativa?: string
          parte_passiva?: string
          prazo_proximo?: string | null
          prioridade?: Database["public"]["Enums"]["processo_prioridade"] | null
          representantes?: Json | null
          status?: Database["public"]["Enums"]["processo_status"] | null
          tipo_acao_id?: string | null
          tipo_acao_nome?: string | null
          tribunal_id?: string | null
          tribunal_nome?: string | null
          updated_at?: string | null
          valor_causa?: number | null
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role_type"] | null
          theme_preference: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role_type"] | null
          theme_preference?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role_type"] | null
          theme_preference?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          added_at: string
          id: string
          project_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          project_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          project_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
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
          updated_at: string
        }
        Insert: {
          color?: string
          column_order: number
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          project_id: string
          updated_at?: string
        }
        Update: {
          color?: string
          column_order?: number
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_columns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          client: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          client: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          client?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      projudi_credentials: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_validated: string | null
          login_encrypted: string
          password_encrypted: string
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
          totp_secret_encrypted?: string
          tribunal?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          card_color: string | null
          column_id: string | null
          created_at: string
          description: string | null
          id: string
          project_id: string
          status: string
          task_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          card_color?: string | null
          column_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id: string
          status?: string
          task_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          card_color?: string | null
          column_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          project_id?: string
          status?: string
          task_type?: string | null
          title?: string
          updated_at?: string
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
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          grupo_acao_id?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          grupo_acao_id?: string | null
          id?: string
          nome?: string
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
        ]
      }
      tribunais: {
        Row: {
          created_at: string | null
          id: string
          nome: string
          sigla: string
          tipo: string
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          nome: string
          sigla: string
          tipo: string
          uf?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          nome?: string
          sigla?: string
          tipo?: string
          uf?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
          token_expires_at?: string | null
          tribunal_code?: string
          tribunal_name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
          trigger_keyword?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          connection_status: string | null
          created_at: string | null
          id: string
          instance_name: string
          last_update: string | null
          qr_code: string | null
          user_id: string
          zapi_token: string | null
          zapi_url: string | null
        }
        Insert: {
          connection_status?: string | null
          created_at?: string | null
          id?: string
          instance_name: string
          last_update?: string | null
          qr_code?: string | null
          user_id?: string
          zapi_token?: string | null
          zapi_url?: string | null
        }
        Update: {
          connection_status?: string | null
          created_at?: string | null
          id?: string
          instance_name?: string
          last_update?: string | null
          qr_code?: string | null
          user_id?: string
          zapi_token?: string | null
          zapi_url?: string | null
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
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
          timestamp: string | null
          to_number: string | null
          user_id: string
        }
        Insert: {
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
          timestamp?: string | null
          to_number?: string | null
          user_id: string
        }
        Update: {
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
          timestamp?: string | null
          to_number?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atualizar_status_parcelas: { Args: never; Returns: undefined }
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
      decrypt_credential: {
        Args: { encrypted_text: string; key: string }
        Returns: string
      }
      encrypt_credential: {
        Args: { key: string; text_to_encrypt: string }
        Returns: string
      }
      has_dental_role: {
        Args: {
          _role: Database["public"]["Enums"]["dental_role"]
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
      is_tagged_in_deadline: {
        Args: { _deadline_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "advogado" | "comercial" | "financeiro" | "controller"
      dental_role: "admin" | "dentista" | "recepcionista" | "paciente"
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
      app_role: ["admin", "advogado", "comercial", "financeiro", "controller"],
      dental_role: ["admin", "dentista", "recepcionista", "paciente"],
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
    },
  },
} as const
