import { corsHeaders } from '@supabase/supabase-js/cors'

const JUDIT_API_KEY = Deno.env.get('JUDIT_API_KEY') || ''

function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) throw new Error('CPF deve ter 11 dígitos')
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { cpf } = await req.json()
    if (!cpf) {
      return new Response(JSON.stringify({ error: 'CPF é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const cpfFormatado = formatCPF(cpf)
    console.log(`Buscando processos para CPF: ${cpfFormatado}`)

    // 1. Criar request na Judit
    const createRes = await fetch('https://requests.prod.judit.io/requests', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JUDIT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        search: {
          search_type: 'cpf',
          search_key: cpfFormatado,
        },
      }),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      console.error('Erro ao criar request:', errText)
      return new Response(JSON.stringify({ error: `Erro Judit: ${createRes.status}`, details: errText }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const createData = await createRes.json()
    const requestId = createData.request_id || createData.id
    console.log('Request criado:', requestId)

    // 2. Polling para obter resposta
    const maxAttempts = 30
    const pollInterval = 3000

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(pollInterval)

      const pollRes = await fetch(
        `https://requests.prod.judit.io/responses?request_id=${requestId}&page=1&page_size=100`,
        {
          headers: {
            'Authorization': `Bearer ${JUDIT_API_KEY}`,
          },
        }
      )

      if (!pollRes.ok) {
        console.log(`Polling attempt ${attempt + 1}: status ${pollRes.status}`)
        continue
      }

      const pollData = await pollRes.json()
      
      // Check if we have responses
      const responses = pollData.responses || pollData.data || pollData
      
      if (Array.isArray(responses) && responses.length > 0) {
        console.log(`Encontrados ${responses.length} resultados`)
        return new Response(JSON.stringify({ 
          request_id: requestId,
          total: responses.length,
          processos: responses 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Check status field
      if (pollData.status === 'completed' || pollData.status === 'done') {
        return new Response(JSON.stringify({ 
          request_id: requestId,
          total: 0,
          processos: [] 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`Polling attempt ${attempt + 1}: aguardando...`)
    }

    return new Response(JSON.stringify({ 
      error: 'Timeout: a busca demorou demais. Tente novamente.',
      request_id: requestId 
    }), {
      status: 408,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Erro:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
