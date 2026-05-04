import fs from 'fs'

async function run() {
  const data = JSON.parse(fs.readFileSync('./apps/editor/public/demos/demo_1.json', 'utf-8'))
  const res = await fetch('http://localhost:3002/api/scenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'test', graph: data })
  })
  if (!res.ok) {
    console.log(await res.text())
  } else {
    console.log('POST Success!')
    const meta = await res.json()
    const res2 = await fetch(`http://localhost:3002/api/scenes/${meta.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'test', graph: data })
    })
    if (!res2.ok) {
      console.log(await res2.text())
    } else {
      console.log('PUT Success!')
    }
  }
}
run()
