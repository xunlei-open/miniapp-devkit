<script setup lang="ts">
import type { FileInfo, TaskDetailResult } from '@xunlei-open/miniapp-types'
import { onMounted, onUnmounted, ref } from 'vue'

const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogg', 'ogv', 'm4v', 'mov'])
const POLL_INTERVAL_MS = 1_000

const url = ref('https://www.xunlei.com/main/banner-loop.mp4')
const tasks = ref<TaskDetailResult[]>([])
const total = ref(0)
const loading = ref(false)
const creating = ref(false)
const deletingId = ref<string>()
const accessingFile = ref<string>()
const message = ref('')
const player = ref<{
  taskId: string
  fileIndex: number
  name: string
  url: string
}>()

let pollTimer: ReturnType<typeof setInterval> | undefined

function hasXunleiRuntime(): boolean {
  return typeof xunlei !== 'undefined'
}

async function loadTasks(options: { silent?: boolean } = {}) {
  if (!hasXunleiRuntime()) {
    message.value = '当前是普通浏览器预览，请在迅雷微应用宿主中查看任务。'
    return
  }

  if (loading.value) return
  loading.value = true
  if (!options.silent) message.value = ''

  try {
    const list = await xunlei.tasks.list({
      offset: 0,
      limit: 20,
      sort: 'createdAtDesc',
    })
    const details = await Promise.allSettled(
      list.ids.map((id) => xunlei.tasks.detail({ id })),
    )

    tasks.value = details.flatMap((detail) =>
      detail.status === 'fulfilled' ? [detail.value] : [],
    )
    total.value = list.total
  } catch (error) {
    message.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

async function createTask() {
  if (!hasXunleiRuntime()) {
    message.value = '当前是普通浏览器预览，请在迅雷微应用宿主中创建任务。'
    return
  }

  creating.value = true
  message.value = '正在创建任务…'

  try {
    const task = await xunlei.tasks.create({
      req: { url: url.value.trim() },
    })
    message.value = `任务已创建：${task.id}`
    await loadTasks({ silent: true })
  } catch (error) {
    message.value = getErrorMessage(error)
  } finally {
    creating.value = false
  }
}

async function deleteTask(task: TaskDetailResult) {
  if (!hasXunleiRuntime()) return
  if (!window.confirm(`确定从任务列表删除“${task.name}”吗？已下载文件会保留。`)) {
    return
  }

  deletingId.value = task.id
  message.value = ''

  try {
    const result = await xunlei.tasks.delete({
      id: task.id,
      deleteFiles: false,
    })
    message.value = result.deleted ? '任务已删除，下载文件已保留。' : '任务不存在或已经删除。'
    if (player.value?.taskId === task.id) player.value = undefined
    await loadTasks({ silent: true })
  } catch (error) {
    message.value = getErrorMessage(error)
  } finally {
    deletingId.value = undefined
  }
}

async function playVideo(task: TaskDetailResult, file: FileInfo, fileIndex: number) {
  if (!hasXunleiRuntime() || task.status !== 'done') return

  const accessKey = `${task.id}:${fileIndex}`
  accessingFile.value = accessKey
  message.value = ''

  try {
    const access = await xunlei.tasks.file.access({
      taskId: task.id,
      fileIndex,
    })
    player.value = {
      taskId: task.id,
      fileIndex,
      name: file.name,
      url: access.url,
    }
  } catch (error) {
    message.value = getErrorMessage(error)
  } finally {
    accessingFile.value = undefined
  }
}

function videoFiles(task: TaskDetailResult) {
  return task.meta.res.files.flatMap((file, fileIndex) =>
    isVideo(file) ? [{ file, fileIndex }] : [],
  )
}

function isVideo(file: FileInfo): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension ? VIDEO_EXTENSIONS.has(extension) : false
}

function taskProgress(task: TaskDetailResult): number {
  if (task.status === 'done') return 100
  if (task.size <= 0) return 0
  return Math.min(100, Math.round((task.progress.downloaded / task.size) * 100))
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** unitIndex
  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function refreshWhenVisible() {
  if (!document.hidden) void loadTasks({ silent: true })
}

onMounted(() => {
  void loadTasks()
  pollTimer = setInterval(refreshWhenVisible, POLL_INTERVAL_MS)
  document.addEventListener('visibilitychange', refreshWhenVisible)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
})
</script>

<template>
  <div class="app-shell">
    <header class="hero">
      <div>
        <p class="eyebrow">Xunlei Miniapp Example</p>
        <h1>轻量任务管理</h1>
        <p class="intro">创建和管理迅雷下载任务，并直接预览已完成的视频文件。</p>
      </div>
      <button class="secondary-button" type="button" :disabled="loading" @click="loadTasks()">
        {{ loading ? '刷新中…' : '刷新任务' }}
      </button>
    </header>

    <section class="panel create-panel">
      <form @submit.prevent="createTask">
        <label for="task-url">下载地址</label>
        <div class="form-row">
          <input
            id="task-url"
            v-model="url"
            type="text"
            placeholder="https://example.com/video.mp4 或 magnet:?xt=…"
            required
          />
          <button class="primary-button" type="submit" :disabled="creating">
            {{ creating ? '创建中…' : '创建任务' }}
          </button>
        </div>
      </form>
      <p v-if="message" class="message" role="status">{{ message }}</p>
    </section>

    <section v-if="player" class="panel player-panel">
      <div class="section-heading">
        <div>
          <p class="section-kicker">视频预览</p>
          <h2>{{ player.name }}</h2>
        </div>
        <button class="text-button" type="button" @click="player = undefined">关闭</button>
      </div>
      <video :key="player.url" :src="player.url" controls autoplay playsinline>
        当前环境不支持 video 标签。
      </video>
      <p class="hint">播放地址由 <code>tasks.file.access</code> 临时生成，刷新页面后需重新获取。</p>
    </section>

    <section class="panel task-panel">
      <div class="section-heading">
        <div>
          <p class="section-kicker">最近任务</p>
          <h2>{{ total }} 个任务</h2>
        </div>
        <span class="hint">最多显示最近 20 个</span>
      </div>

      <div v-if="loading && tasks.length === 0" class="empty-state">正在读取任务…</div>
      <div v-else-if="tasks.length === 0" class="empty-state">暂无任务，先创建一个下载任务吧。</div>

      <ul v-else class="task-list">
        <li v-for="task in tasks" :key="task.id" class="task-card">
          <div class="task-heading">
            <div class="task-title">
              <strong>{{ task.name || task.meta.res.name || task.id }}</strong>
              <span :class="['status', `status-${task.status}`]">{{ task.status }}</span>
            </div>
            <button
              class="danger-button"
              type="button"
              :disabled="deletingId === task.id"
              @click="deleteTask(task)"
            >
              {{ deletingId === task.id ? '删除中…' : '删除任务' }}
            </button>
          </div>

          <div class="progress-track" aria-hidden="true">
            <span :style="{ width: `${taskProgress(task)}%` }"></span>
          </div>
          <div class="task-meta">
            <span>{{ taskProgress(task) }}%</span>
            <span>{{ formatBytes(task.progress.downloaded) }} / {{ formatBytes(task.size) }}</span>
            <span v-if="task.status === 'running'">{{ formatBytes(task.progress.speed) }}/s</span>
          </div>

          <div v-if="videoFiles(task).length" class="file-actions">
            <button
              v-for="video in videoFiles(task)"
              :key="`${task.id}:${video.fileIndex}`"
              class="video-button"
              type="button"
              :disabled="task.status !== 'done' || accessingFile === `${task.id}:${video.fileIndex}`"
              :title="task.status === 'done' ? '获取临时地址并播放' : '任务完成后可播放'"
              @click="playVideo(task, video.file, video.fileIndex)"
            >
              {{ accessingFile === `${task.id}:${video.fileIndex}` ? '获取地址中…' : `播放 ${video.file.name}` }}
            </button>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>
