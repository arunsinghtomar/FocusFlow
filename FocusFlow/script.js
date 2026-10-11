const STORAGE_KEY = "focusflow-tasks-v1";

const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const priorityInput = document.querySelector("#task-priority");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const searchInput = document.querySelector("#search-input");
const filterButtons = document.querySelectorAll(".filter-button");
const clearCompletedButton = document.querySelector("#clear-completed");

let currentFilter = "all";
let searchTerm = "";
let tasks = loadTasks();

function loadTasks() {
  try {
    const savedTasks = localStorage.getItem(STORAGE_KEY);
    const parsed = savedTasks ? JSON.parse(savedTasks) : [];
    return Array.isArray(parsed) ? parsed.filter(isValidTask) : [];
  } catch (error) {
    console.warn("Could not load saved tasks:", error);
    return [];
  }
}

function isValidTask(task) {
  return task &&
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.completed === "boolean" &&
    ["Low", "Medium", "High"].includes(task.priority);
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    alert("Your browser could not save tasks. Check your browser storage settings.");
    console.error("Could not save tasks:", error);
  }
}

function makeId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addTask(title, priority) {
  const task = {
    id: makeId(),
    title: title.trim(),
    priority,
    completed: false,
    createdAt: new Date().toISOString()
  };

  if (!task.title) return;
  tasks.unshift(task);
  saveTasks();
  render();
}

function toggleTask(taskId) {
  tasks = tasks.map(task =>
    task.id === taskId ? { ...task, completed: !task.completed } : task
  );
  saveTasks();
  render();
}

function deleteTask(taskId) {
  tasks = tasks.filter(task => task.id !== taskId);
  saveTasks();
  render();
}

function clearCompleted() {
  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  render();
}

function getVisibleTasks() {
  return tasks.filter(task => {
    const matchesFilter =
      currentFilter === "all" ||
      (currentFilter === "pending" && !task.completed) ||
      (currentFilter === "completed" && task.completed);
    const matchesSearch = task.title.toLowerCase().includes(searchTerm);
    return matchesFilter && matchesSearch;
  });
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime())
    ? "Added recently"
    : `Added ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function createTaskElement(task) {
  const item = document.createElement("article");
  item.className = `task-item${task.completed ? " completed" : ""}`;

  const checkButton = document.createElement("button");
  checkButton.type = "button";
  checkButton.className = "task-check";
  checkButton.setAttribute("aria-label", task.completed ? `Mark ${task.title} as pending` : `Complete ${task.title}`);
  checkButton.setAttribute("aria-pressed", String(task.completed));
  checkButton.textContent = task.completed ? "✓" : "";
  checkButton.addEventListener("click", () => toggleTask(task.id));

  const main = document.createElement("div");
  main.className = "task-main";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const meta = document.createElement("div");
  meta.className = "task-meta";

  const priority = document.createElement("span");
  priority.className = `priority ${task.priority}`;
  priority.textContent = `${task.priority} priority`;

  const created = document.createElement("span");
  created.textContent = formatDate(task.createdAt);

  meta.append(priority, created);
  main.append(title, meta);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.setAttribute("aria-label", `Delete ${task.title}`);
  deleteButton.title = "Delete task";
  deleteButton.textContent = "×";
  deleteButton.addEventListener("click", () => deleteTask(task.id));

  item.append(checkButton, main, deleteButton);
  return item;
}

function renderTasks() {
  const visibleTasks = getVisibleTasks();
  taskList.replaceChildren(...visibleTasks.map(createTaskElement));

  const shouldShowEmpty = visibleTasks.length === 0;
  emptyState.hidden = !shouldShowEmpty;

  if (shouldShowEmpty) {
    const message = searchTerm
      ? "Try a different search term."
      : currentFilter === "completed"
        ? "Completed tasks will appear here."
        : currentFilter === "pending"
          ? "You're all caught up. No pending tasks!"
          : "Add a task above and make it happen.";
    emptyState.querySelector("p").textContent = message;
  }
}

function renderStats() {
  const total = tasks.length;
  const completed = tasks.filter(task => task.completed).length;
  const pending = total - completed;
  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);

  document.querySelector("#total-count").textContent = total;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#pending-count").textContent = pending;
  document.querySelector("#list-count").textContent = total;
  document.querySelector("#progress-percent").textContent = `${percentage}%`;
  document.querySelector("#progress-fill").style.width = `${percentage}%`;

  const progressTrack = document.querySelector("#progress-track");
  progressTrack.setAttribute("aria-valuenow", String(percentage));

  const message = total === 0
    ? "Add a task to get your day moving."
    : percentage === 100
      ? "Amazing work — you've completed every task!"
      : `${completed} of ${total} tasks completed. Keep your momentum going!`;
  document.querySelector("#progress-message").textContent = message;

  document.querySelector("#footer-count").textContent =
    `${total} ${total === 1 ? "task" : "tasks"} · ${pending} pending`;
}

function render() {
  renderStats();
  renderTasks();
}

function setDate() {
  const now = new Date();
  document.querySelector("#date-heading").textContent =
    now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  document.querySelector("#date-subheading").textContent =
    now.toLocaleDateString(undefined, { year: "numeric" });
  document.querySelector("#today-label").textContent =
    now.toLocaleDateString(undefined, { weekday: "long" }).toUpperCase() + " OVERVIEW";
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    taskInput.focus();
    return;
  }
  addTask(title, priorityInput.value);
  taskForm.reset();
  priorityInput.value = "Medium";
  taskInput.focus();
});

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    filterButtons.forEach(filterButton => {
      const active = filterButton === button;
      filterButton.classList.toggle("active", active);
      filterButton.setAttribute("aria-pressed", String(active));
    });
    renderTasks();
  });
});

searchInput.addEventListener("input", () => {
  searchTerm = searchInput.value.trim().toLowerCase();
  renderTasks();
});

clearCompletedButton.addEventListener("click", () => {
  const completedCount = tasks.filter(task => task.completed).length;
  if (completedCount === 0) return;
  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  render();
});

setDate();
render();
