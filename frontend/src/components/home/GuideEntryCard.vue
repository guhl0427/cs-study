<script setup lang="ts">
import { RouterLink } from 'vue-router'

/** 无学习记录时 Hero 右侧的找方向引导卡（F1.5 新访客形态） */
</script>

<template>
  <div class="card-plate flex flex-col gap-2 p-4">
    <span class="text-caption text-ink-2">从哪里开始</span>
    <span class="text-card font-bold text-ink">不确定学什么？3 道题找到你的方向</span>
    <span class="text-[13px] leading-relaxed text-ink-2">
      选兴趣方向 → 说当前基础 → 填每周时间，输出推荐领域、路线与起步知识点。
    </span>
    <div class="mt-2 flex items-center gap-3">
      <RouterLink to="/guide" class="btn btn-primary btn-sm">开始找方向</RouterLink>
      <RouterLink to="/explore" class="btn btn-text btn-sm">先随便看看</RouterLink>
    </div>
  </div>
</template>
