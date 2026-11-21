<script setup lang="ts">
// 全局警示条：localStorage 不可用（隐私模式/被禁用）→ 游客试用（需求 §5 兼容性红线）
</script>

<template>
  <div class="border-b border-danger bg-danger-subtle" role="alert">
    <p class="container-wide py-2 text-[13px] text-danger-text">
      当前为游客试用：浏览器不允许本地存储，你的进度在刷新后会丢失。浏览与学习不受影响。
    </p>
  </div>
</template>
