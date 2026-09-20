import type { TaskDetailResult } from '@xunlei-open/miniapp-types'

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'ogv', 'm4v', 'mov'])

export function videoFiles(task: TaskDetailResult) {
  const children = task.type === 'group' ? task.children : [task]
  return children.flatMap((child) =>
    child.meta.res.files.flatMap((file, fileIndex) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      // File access always needs the owning single task and its original file index.
      return extension && VIDEO_EXTENSIONS.has(extension) ? [{ task: child, file, fileIndex }] : []
    }),
  )
}
