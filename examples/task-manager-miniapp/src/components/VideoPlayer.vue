<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

defineProps<{ name: string; url: string }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement>()
const video = ref<HTMLVideoElement>()
let previousOverflow = ''

function backdropClick(event: MouseEvent) {
  if (event.target !== dialog.value) return
  const bounds = dialog.value.getBoundingClientRect()
  if (
    event.clientX < bounds.left ||
    event.clientX > bounds.right ||
    event.clientY < bounds.top ||
    event.clientY > bounds.bottom
  )
    emit('close')
}

onMounted(() => {
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
})

onBeforeUnmount(() => {
  video.value?.pause()
  dialog.value?.close()
  document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="video-dialog"
      :aria-label="name"
      @cancel.prevent="emit('close')"
      @close="emit('close')"
      @click="backdropClick"
    >
      <video ref="video" :key="url" :src="url" controls autoplay playsinline>当前环境不支持 video 标签。</video>
    </dialog>
  </Teleport>
</template>

<style scoped>
.video-dialog {
  width: min(960px, calc(100vw - 32px));
  max-width: 100vw;
  max-height: calc(100dvh - 32px);
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: #000;
  box-shadow: 0 24px 80px #0008;
}
.video-dialog::backdrop {
  background: #020617b8;
}
video {
  display: block;
  width: 100%;
  min-height: 0;
  max-height: calc(100dvh - 32px);
  aspect-ratio: 16 / 9;
  object-fit: contain;
  background: #000;
}
video:fullscreen {
  width: 100%;
  height: 100%;
  max-height: none;
}
</style>
