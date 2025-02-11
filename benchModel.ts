import axios from 'axios'

let data = JSON.stringify({
  messages: [
    {
      role: 'user',
      content: 'Hi'
    }
  ],
  model: 'claude-3.5-sonnet',
  temperature: 0,
  stream: false
})

let config = {
  method: 'post',
  maxBodyLength: Infinity,
  url: 'https://litellm.cmcts1.studio.ai.vn/v1/chat/completions',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer sk-CMC'
  },
  data: data
}

async function main() {
  let totalTime = 0
  for (let i = 0; i < 30; i++) {
    const t = performance.now()
    await axios.request(config)
    totalTime += performance.now() - t
  }

  console.log('avg:', totalTime / 30)
}

void main()
