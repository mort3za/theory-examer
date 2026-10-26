import { createRouter, createWebHashHistory } from "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    /** Full-screen study pages: no app navigation. */
    focus?: boolean;
    title?: string;
  }
}

// Hash history works on GitHub Pages without server rewrites.
export const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: "/", component: () => import("./views/DashboardView.vue"), meta: { title: "Today" } },
    { path: "/review", component: () => import("./views/ReviewView.vue"), meta: { focus: true, title: "Review" } },
    { path: "/practice", component: () => import("./views/PracticeView.vue"), meta: { title: "Practice" } },
    {
      path: "/practice/run",
      component: () => import("./views/PracticeRunView.vue"),
      meta: { focus: true, title: "Practice" },
    },
    { path: "/exam", component: () => import("./views/ExamView.vue"), meta: { title: "Exam" } },
    { path: "/exam/run", component: () => import("./views/ExamRunView.vue"), meta: { focus: true, title: "Exam" } },
    { path: "/exam/:id", component: () => import("./views/ExamResultView.vue"), meta: { title: "Exam result" } },
    { path: "/catalog", component: () => import("./views/CatalogView.vue"), meta: { title: "Questions" } },
    { path: "/q/:id", component: () => import("./views/QuestionView.vue"), meta: { title: "Question" } },
    { path: "/settings", component: () => import("./views/SettingsView.vue"), meta: { title: "Settings" } },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} · Theory Examer` : "Theory Examer";
});

// After a new deploy the old route chunks are gone: reload once to get the new version.
router.onError((err, to) => {
  const stale = /dynamically imported module|Importing a module script failed|error loading dynamically/i;
  if (!stale.test(String(err?.message ?? err))) return;
  const key = "reloaded-for-chunk";
  if (sessionStorage.getItem(key) === to.fullPath) return;
  sessionStorage.setItem(key, to.fullPath);
  location.hash = to.fullPath;
  location.reload();
});
