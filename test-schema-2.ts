import { apiGraphSchema } from './apps/editor/lib/graph-schema'
import fs from 'fs'

const data = JSON.parse(fs.readFileSync('C:/Users/Vikash/Downloads/layout_2026-05-04.json', 'utf-8'))
const result = apiGraphSchema.safeParse(data)
if (!result.success) {
  console.error(JSON.stringify(result.error.issues, null, 2))
} else {
  console.log('Success!')
}
