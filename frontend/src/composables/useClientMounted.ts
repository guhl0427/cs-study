import { onMounted, ref } from 'vue'

/** 客户端已挂载标记：SSG 预渲染 HTML 与水合首帧一致后再渲染依赖本地数据的 UI */
export function useClientMounted() {
  const mounted = ref(false)
  onMounted(() => {
    mounted.value = true
  })
  return mounted
}
