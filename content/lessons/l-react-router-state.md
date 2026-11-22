---
id: l-react-router-state
slug: react-router-state
title: React Router 与状态管理：多页面与全局数据
difficulty: 3
estMinutes: 45
tags: [React, Router, 状态管理]
summary: Router 把 URL 和组件绑定、状态库把跨组件数据收敛——React 世界里路由靠声明式 <Route>，全局状态按「服务端缓存/客户端状态」分类存放。
updated: 2026-11-22
resources:
  - id: r-react-router
    title: React Router 官方文档
    url: https://reactrouter.com/home
    type: doc
    difficulty: 2
    note: v7 的声明式路由与数据加载文档。
  - id: r-zustand
    title: Zustand 官方文档
    url: https://zustand.docs.pmnd.rs/
    type: doc
    difficulty: 2
    note: 轻量状态库的代表，本课用它演示（Redux Toolkit 思路相同）。
---

> 一句话定义：React Router 用**声明式 `<Route>` 把 URL 映射到组件**（`useParams` 取参数），全局状态先分类再选库——服务端数据交给请求缓存，纯客户端状态才进 Zustand/Redux。

## 概念讲解

**Router 的 React 味道**：路由不是配置文件里的一次性注册，而是**组件树的一部分**——`<Routes>` 里写 `<Route path="/course/:courseSlug" element={<CoursePage/>} />`，嵌套路由就是 JSX 嵌套，`<Outlet>` 是子路由的显示窗口。取参数用 `useParams()`，主动跳转用 `useNavigate()`：

```text
/course/:courseSlug  →  useParams().courseSlug  →  CoursePage
导航守卫：包装一个 <RequireAuth> 组件（条件渲染 Outlet），而不是拦截回调
```

**状态管理先分类再动手**——React 生态最容易被问懵的就是「用不用 Redux」。先问两个问题：

1. 这个状态是**服务端数据的镜像**吗（课程列表、用户信息）？→ 优先用请求库（TanStack Query 等）管缓存：自动 loading/重试/失效重取，不必进 store；
2. 是**纯客户端状态**吗（主题偏好、购物车、抽屉开关）？→ 小项目 Context 够用；跨页面、高频更新、多处读写就上 Zustand（样板代码少）或 Redux Toolkit（大团队规范强）。

```text
服务端数据 → TanStack Query（缓存与失效）
客户端共享 → Zustand / Redux Toolkit（可预测更新）
组件私有   → useState（默认选择，别升格）
```

## 代码示例

路由骨架 + Zustand store + 组件消费：

```jsx
// main.jsx —— 声明式路由
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom';

const router = createBrowserRouter([
  {
    path: '/course/:courseSlug',
    element: <CourseLayout />,                 // 外层布局
    children: [
      { path: ':lessonSlug', element: <LessonPage /> },   // 嵌套路由
    ],
  },
]);

function CourseLayout() {
  const { courseSlug } = useParams();          // 取路径参数
  return <div><h2>{courseSlug}</h2><Outlet /></div>;
}
```

```js
// stores/cart.js —— Zustand：一行创建全局状态
import { create } from 'zustand';

export const useCart = create((set, get) => ({
  items: [],                                          // 全局状态
  add: (item) => set({ items: [...get().items, item] }),  // 不可变更新
  total: () => get().items.reduce((s, i) => s + i.price, 0),
}));
```

```jsx
// 任意组件消费
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/stores/cart';

function AddButton({ item }) {
  const add = useCart((s) => s.add);           // 选择器订阅，只关心 add
  const navigate = useNavigate();
  return (
    <button onClick={() => { add(item); navigate('/cart'); }}>
      加入购物车
    </button>
  );
}
```

## 常见坑

1. **坑 1：路径参数变了组件不重置**。`/course/a/1` → `/course/a/2` 复用组件实例，state 保留旧值——把「跟参数走的数据」放进 useEffect 依赖（呼应 Hooks 课的请求骨架），或给组件加 `key={courseSlug}` 强制重建。
2. **坑 2：Context 放高频变化的状态**。Context 值一变所有消费组件全重渲染——购物车这种高频读写用 Zustand（按选择器精准订阅），Context 留给主题、语言这类低频全局。
3. **坑 3：store 里放服务端数据的副本**。接口数据手动塞进 Redux 再到处同步，迟早和服务器不一致——「服务端数据的真相在服务端」，缓存交给请求库。
4. **坑 4：set 里直接改原数组**。`items.push()` 修改的是同一引用，订阅组件不刷新——永远创建新数组/新对象（呼应 Hooks 课纪律 2）。

## 小练习

1. 用 createBrowserRouter 搭两级路由（列表页 + 详情页），详情页从 useParams 取 id 并渲染假数据。
2. 用 Zustand 实现一个计数器 store，两个组件分别读写，观察选择器订阅的效果。
3. 思考题：对照 Vue 课的「URL 能表达的不进任何状态」——React Router 下课程 id 放路由参数而不是 store，交换式场景各损失什么？
