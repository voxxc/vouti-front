import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenantId } from "@/hooks/useTenantId";

export interface Aniversario {
  id: string;
  nome: string;
  dia: number;
  mes: number;
  tipo: "usuarios" | "clientes" | "colaboradores";
  contato?: string;
}

export const useAniversarios = () => {
  const { tenantId } = useTenantId();
  const [aniversarios, setAniversarios] = useState<Aniversario[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAniversarios = async () => {
    if (!tenantId) return;

    setLoading(true);
    const allAniversarios: Aniversario[] = [];

    try {
      // 1. Buscar usuários (profiles) com data_nascimento
      const { data: usuarios, error: usuariosError } = await supabase
        .from("profiles")
        .select("user_id, full_name, data_nascimento, email")
        .eq("tenant_id", tenantId)
        .not("data_nascimento", "is", null);

      if (!usuariosError && usuarios) {
        usuarios.forEach(u => {
          if (u.data_nascimento) {
            const date = new Date(u.data_nascimento);
            allAniversarios.push({
              id: u.user_id,
              nome: u.full_name || u.email || "Usuário",
              dia: date.getDate(),
              mes: date.getMonth() + 1,
              tipo: "usuarios",
              contato: u.email,
            });
          }
        });
      }

      // 2. Buscar clientes com data_nascimento
      const { data: clientes, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nome_pessoa_fisica, nome_pessoa_juridica, data_nascimento, telefone, email")
        .eq("tenant_id", tenantId)
        .not("data_nascimento", "is", null);

      if (!clientesError && clientes) {
        clientes.forEach(c => {
          if (c.data_nascimento) {
            const date = new Date(c.data_nascimento);
            allAniversarios.push({
              id: c.id,
              nome: c.nome_pessoa_fisica || c.nome_pessoa_juridica || "Cliente",
              dia: date.getDate(),
              mes: date.getMonth() + 1,
              tipo: "clientes",
              contato: c.telefone || c.email,
            });
          }
        });
      }

      // 3. Buscar colaboradores com data_nascimento
      const { data: colaboradores, error: colaboradoresError } = await supabase
        .from("colaboradores")
        .select("id, nome_completo, data_nascimento, telefone, email")
        .eq("tenant_id", tenantId)
        .not("data_nascimento", "is", null);

      if (!colaboradoresError && colaboradores) {
        colaboradores.forEach(c => {
          if (c.data_nascimento) {
            const date = new Date(c.data_nascimento);
            allAniversarios.push({
              id: c.id,
              nome: c.nome_completo,
              dia: date.getDate(),
              mes: date.getMonth() + 1,
              tipo: "colaboradores",
              contato: c.telefone || c.email,
            });
          }
        });
      }

      // Ordenar por proximidade da data (mais próximos primeiro)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      allAniversarios.sort((a, b) => {
        const getNextBirthday = (dia: number, mes: number) => {
          const birthday = new Date(today.getFullYear(), mes - 1, dia);
          if (birthday < today) {
            birthday.setFullYear(birthday.getFullYear() + 1);
          }
          return birthday.getTime();
        };

        return getNextBirthday(a.dia, a.mes) - getNextBirthday(b.dia, b.mes);
      });

      setAniversarios(allAniversarios);
    } catch (error) {
      console.error("Erro ao buscar aniversários:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAniversarios();
  }, [tenantId]);

  return {
    aniversarios,
    loading,
    refetch: fetchAniversarios,
  };
};
