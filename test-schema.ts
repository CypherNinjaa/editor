import { apiGraphSchema } from './apps/editor/lib/graph-schema'
import fs from 'fs'

const data = JSON.parse(fs.readFileSync('./apps/editor/public/demos/demo_1.json', 'utf-8'))
const result = apiGraphSchema.safeParse(data)
if (!result.success) {
  console.error(JSON.stringify(result.error.issues, null, 2))
} else {
  console.log('Success!')
}
