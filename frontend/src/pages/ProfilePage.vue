<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PageHeader from '@/components/ui/PageHeader.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ContinueCard from '@/components/home/ContinueCard.vue'
import ProgressTier from '@/components/progress/ProgressTier.vue'
import HeatCalendar from '@/components/progress/HeatCalendar.vue'
import StreakBadge from '@/components/progress/StreakBadge.vue'
import { contentApi } from '@/api'
import { useUserDataStore } from '@/stores/userData'
import { useUiStore } from '@/stores/ui'
import { useClientMounted } from '@/composables/useClientMounted'
import { usePageTitle } from '@/composables/usePageTitle'
import { domainProgress } from '@/lib/progress'

usePageTitle('个人中心')

const ud = useUserDataStore()
const ui = useUiStore()
const mounted = useClientMounted()

/* ---- 继续学习 ---- */
const continueView = computed(() => {
  if (!mounted.value || !ud.lastVisit) return null
  const course = contentApi.getCourse(ud.lastVisit.courseSlug)
  if (!course) return null
  const visit = ud.lastVisit
  for (const ch of course.chapters) {
    const lesson = ch.lessons.find((l) => l.id === visit.lessonId)
    if (lesson) return { course, lesson }
  }
  return null
})

/* ---- 各领域进度（F4.5） ---- */
const domainRows = computed(() =>
  contentApi
    .listDomains()
    .filter((d) => d.hasContent)
    .map((d) => {
      const courses = contentApi.listCoursesOfDomain(d.slug)
      const p = domainProgress(courses, ud.progress)
      return { name: d.name, ...p }
    }),
)

/* ---- 收藏（F7.3） ---- */
const favTab = ref<'course' | 'lesson'>('course')
const favCourses = computed(() =>
  mounted.value
    ? Object.values(ud.favorites)
        .filter((f) => f.targetType === 'course')
        .map((f) => ({ entry: f, course: contentApi.getCourse(f.targetId) }))
        .filter((x) => x.course)
    : [],
)
const favLessons = computed(() =>
  mounted.value
    ? Object.values(ud.favorites)
        .filter((f) => f.targetType === 'lesson')
        .map((f) => ({ entry: f, lesson: contentApi.getLessonById(f.targetId)?.meta }))
        .filter((x) => x.lesson)
    : [],
)

/* ---- 本地档案（F7.1，可选） ---- */
const AVATARS = ['🙂', '😎', '🧭', '⚙️', '💾', '🐙', '🦉', '🌱']
const editing = ref(false)
const nickname = ref('')
const avatarId = ref('')
const startDate = ref('')

onMounted(() => {
  nickname.value = ud.profile.nickname
  avatarId.value = ud.profile.avatarId
  startDate.value = ud.profile.startDate
})

function saveProfile() {
  ud.setProfile({ nickname: nickname.value.trim(), avatarId: avatarId.value, startDate: startDate.value })
  editing.value = false
  ui.toast('ok', '档案已保存（仅存本机）')
}

/* ---- 当前路线 ---- */
const activePath = computed(() => {
  const slug = ud.profile.activePathId
  return slug ? contentApi.getPath(slug) : undefined
})
</script>

<template>
  <div class="container-wide pt-8">
    <!-- ① 仅存本设备常驻提示（F4.7，原则 5） -->
    <div class="rounded-card border-l-4 border-warn bg-warn-subtle px-4 py-3" role="status">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p class="text-[13px] text-warn">
          你的进度仅保存在本设备浏览器中<span v-if="mounted && ud.learningDays >= 7">——已学习 {{ ud.learningDays }} 天，建议导出一份备份</span>。
        </p>
        <RouterLink to="/settings" class="btn btn-ghost btn-sm ml-auto">导出备份</RouterLink>
      </div>
    </div>

    <div class="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <!-- ② 左列 -->
      <div class="min-w-0 space-y-10">
        <PageHeader title="个人中心" subtitle="这里的一切都来自你自己的浏览器——没有账号，没有云端。" />

        <section>
          <h2 class="text-section mb-3 font-bold text-ink">继续学习</h2>
          <ContinueCard v-if="continueView" :course="continueView.course" :lesson="continueView.lesson" />
          <EmptyState v-else emoji="🧭" title="还没有学习记录" desc="从找方向开始，或直接浏览全部领域。">
            <RouterLink to="/guide" class="btn btn-primary btn-sm">3 分钟找方向</RouterLink>
            <RouterLink to="/explore" class="btn btn-ghost btn-sm">浏览领域</RouterLink>
          </EmptyState>
        </section>

        <section>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="text-section font-bold text-ink">学习统计</h2>
            <StreakBadge v-if="mounted" :streak="ud.streakDays" />
          </div>
          <div class="grid-zone rounded-card border border-line-strong p-5">
            <div class="grid grid-cols-3 gap-px border border-line bg-line">
              <div class="bg-surface px-3 py-3 text-center">
                <b class="block text-2xl font-extrabold text-ink">{{ mounted ? ud.totalDone : 0 }}</b>
                <span class="text-[12px] text-ink-2">完成知识点</span>
              </div>
              <div class="bg-surface px-3 py-3 text-center">
                <b class="block text-2xl font-extrabold text-ink">{{ mounted ? ud.learningDays : 0 }}</b>
                <span class="text-[12px] text-ink-2">学习天数</span>
              </div>
              <div class="bg-surface px-3 py-3 text-center">
                <b class="block text-2xl font-extrabold text-ink">{{ mounted ? ud.streakDays : 0 }}</b>
                <span class="text-[12px] text-ink-2">连续天数</span>
              </div>
            </div>

            <!-- 各领域进度条形列表 -->
            <div v-if="mounted" class="mt-5 space-y-3">
              <div v-for="row in domainRows" :key="row.name" class="flex items-center gap-3">
                <span class="w-24 shrink-0 text-[13px] text-ink-2">{{ row.name }}</span>
                <ProgressTier :percent="row.percent" variant="hatch" :label="`${row.name} 领域进度`" class="flex-1" />
                <span class="meta-mono w-24 shrink-0 text-right">{{ row.done }}/{{ row.total }} · {{ row.percent }}%</span>
              </div>
            </div>
            <p v-else class="mt-5 text-caption text-ink-2">统计在页面加载后从本机进度推导。</p>
          </div>
        </section>

        <section>
          <h2 class="text-section mb-3 font-bold text-ink">学习日历</h2>
          <div class="grid-zone rounded-card border border-line-strong p-5">
            <HeatCalendar :counts="ud.doneByDate" :weeks="40" />
          </div>
        </section>

        <section>
          <h2 class="text-section mb-3 font-bold text-ink">收藏</h2>
          <div class="mb-3 flex items-center gap-1 rounded-card border border-line bg-surface p-0.5 w-fit" role="group" aria-label="收藏类型">
            <button
              v-for="t in ['course', 'lesson'] as const"
              :key="t"
              class="rounded-node px-3 py-1 text-[12px] font-medium"
              :class="favTab === t ? 'bg-accent-subtle text-accent' : 'text-ink-2'"
              type="button"
              @click="favTab = t"
            >
              {{ t === 'course' ? '课程' : '知识点' }}
            </button>
          </div>

          <template v-if="favTab === 'course'">
            <div v-if="favCourses.length" class="space-y-2">
              <div v-for="x in favCourses" :key="x.entry.targetId" class="card-plate flex items-center gap-3 px-4 py-3">
                <RouterLink :to="`/course/${x.course!.slug}`" class="flex-1 text-card font-bold text-ink hover:text-accent">
                  {{ x.course!.title }}
                </RouterLink>
                <button class="btn btn-text btn-sm" type="button" @click="ud.toggleFavorite('course', x.entry.targetId, x.course!.title)">
                  取消收藏
                </button>
              </div>
            </div>
            <EmptyState v-else title="还没有收藏课程" desc="遇到想反复看的课程，点右上角「收藏」。">
              <RouterLink to="/explore" class="btn btn-ghost btn-sm">去浏览</RouterLink>
            </EmptyState>
          </template>

          <template v-else>
            <div v-if="favLessons.length" class="space-y-2">
              <div v-for="x in favLessons" :key="x.entry.targetId" class="card-plate flex items-center gap-3 px-4 py-3">
                <RouterLink
                  :to="{ name: 'lesson', params: { courseSlug: x.lesson!.courseSlug!, lessonSlug: x.lesson!.slug } }"
                  class="flex-1 text-card font-bold text-ink hover:text-accent"
                >
                  {{ x.lesson!.title }}
                </RouterLink>
                <button class="btn btn-text btn-sm" type="button" @click="ud.toggleFavorite('lesson', x.entry.targetId, x.lesson!.title)">
                  取消收藏
                </button>
              </div>
            </div>
            <EmptyState v-else title="还没有收藏知识点" desc="在知识点页点「收藏」，随时回来复习。">
              <RouterLink to="/explore" class="btn btn-ghost btn-sm">去浏览</RouterLink>
            </EmptyState>
          </template>
        </section>
      </div>

      <!-- ③ 右列 -->
      <div class="space-y-4">
        <div class="card-plate p-4">
          <p class="meta-mono mb-2">本地档案 · 完全可选</p>
          <template v-if="!editing">
            <p class="text-2xl" aria-hidden="true">{{ ud.profile.avatarId || '🙂' }}</p>
            <p class="mt-1 text-card font-bold text-ink">{{ mounted ? ud.profile.nickname || '同学' : '同学' }}</p>
            <p v-if="mounted && ud.profile.startDate" class="meta-mono mt-1">学习起始日 {{ ud.profile.startDate }}</p>
            <button class="btn btn-ghost btn-sm mt-3 w-full" type="button" @click="editing = true">编辑档案</button>
          </template>
          <template v-else>
            <p class="meta-mono mb-2">头像（点选）</p>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="a in AVATARS"
                :key="a"
                class="h-9 w-9 rounded-card border text-lg"
                :class="avatarId === a ? 'border-accent bg-accent-subtle' : 'border-line'"
                type="button"
                @click="avatarId = a"
              >
                {{ a }}
              </button>
            </div>
            <label class="meta-mono mt-3 block" for="pf-nick">昵称</label>
            <input
              id="pf-nick"
              v-model="nickname"
              class="mt-1 w-full rounded-card border border-line-strong bg-inset px-3 py-2 text-[14px]"
              placeholder="怎么称呼你？"
              maxlength="16"
            />
            <label class="meta-mono mt-3 block" for="pf-start">学习起始日</label>
            <input
              id="pf-start"
              v-model="startDate"
              type="date"
              class="mt-1 w-full rounded-card border border-line-strong bg-inset px-3 py-2 text-[14px]"
            />
            <div class="mt-3 flex gap-2">
              <button class="btn btn-primary btn-sm flex-1" type="button" @click="saveProfile">保存</button>
              <button class="btn btn-ghost btn-sm" type="button" @click="editing = false">取消</button>
            </div>
          </template>
        </div>

        <div class="card-plate p-4">
          <p class="meta-mono mb-2">当前路线</p>
          <template v-if="activePath">
            <p class="text-card font-bold text-ink">{{ activePath.name }}</p>
            <p class="meta-mono mt-1">{{ activePath.stages.length }} 个阶段 · {{ activePath.nodeCount }} 个节点</p>
            <RouterLink :to="`/path/${activePath.slug}`" class="btn btn-ghost btn-sm mt-3 w-full">查看路线图</RouterLink>
          </template>
          <template v-else>
            <p class="text-[13px] text-ink-2">尚未选定路线</p>
            <RouterLink to="/guide" class="btn btn-ghost btn-sm mt-3 w-full">去 找方向</RouterLink>
          </template>
        </div>

        <div class="card-plate p-4">
          <p class="meta-mono mb-2">快捷入口</p>
          <div class="flex flex-col gap-1.5">
            <RouterLink to="/settings" class="btn btn-ghost btn-sm w-full">数据管理（导出 / 导入 / 清空）</RouterLink>
            <RouterLink to="/explore" class="btn btn-ghost btn-sm w-full">全部领域</RouterLink>
          </div>
        </div>
      </div>
    </div>

    <div class="h-6"></div>
  </div>
</template>
