import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query, body } = req
  const segments = Array.isArray(query.path) ? query.path : []
  const target = `https://flowise-ai-cqlx.onrender.com/api/v1/${segments.join('/')}`

  const init: RequestInit = {
    method,
    headers: { ...(req.headers as any), host: undefined } as any,
    body: ['GET', 'HEAD'].includes(method!) ? undefined : body,
  }

  try {
    const upstream = await fetch(target, init)
    const buffer = await upstream.arrayBuffer()
    upstream.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') return
      res.setHeader(key, value)
    })
    res.status(upstream.status).send(Buffer.from(buffer))
  } catch (err) {
    console.error('[proxy] error:', err)
    res.status(502).json({ error: 'Bad gateway to Flowise' })
  }
}
