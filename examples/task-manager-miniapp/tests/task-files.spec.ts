import type { Task, TaskGroup } from '@xunlei-open/miniapp-types'
import { expect, test } from 'vitest'
import { videoFiles } from '../src/task-files'

function task(id: string, status: Task['status'], names: string[]): Task {
  return {
    type: 'single',
    id,
    name: id,
    status,
    protocol: 'http',
    size: 0,
    createdAt: '',
    updatedAt: '',
    progress: { used: 0, speed: 0, downloaded: 0 },
    meta: {
      req: { url: 'https://example.com' },
      opts: {},
      res: {
        name: id,
        size: 0,
        files: names.map((name) => ({ name, path: '', size: 0 })),
      },
    },
  }
}

test('single task keeps original file indices when filtering videos', () => {
  const single = task('single', 'done', ['readme.txt', 'movie.MP4'])
  expect(videoFiles(single)).toEqual([{ task: single, file: single.meta.res.files[1], fileIndex: 1 }])
})

test('group videos retain each child identity, index and completion state', () => {
  const first = task('first', 'done', ['movie.mp4'])
  const second = task('second', 'running', ['movie.mp4', 'notes.txt', 'other.webm'])
  const { meta: _meta, protocol: _protocol, ...common } = first
  const group: TaskGroup = {
    ...common,
    type: 'group',
    id: 'group',
    status: 'running',
    opts: { path: '', name: 'group' },
    children: [first, second],
  }
  expect(videoFiles(group).map(({ task, fileIndex }) => [task.id, task.status, fileIndex])).toEqual([
    ['first', 'done', 0],
    ['second', 'running', 0],
    ['second', 'running', 2],
  ])
  expect(videoFiles({ ...group, children: [] })).toEqual([])
})
