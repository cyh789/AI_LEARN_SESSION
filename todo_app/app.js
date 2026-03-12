const STORAGE_KEY = "todo-app-items";

// 앱 전반에서 공유하는 상태값을 한곳에서 관리한다.
const state = {
  todos: [],
  filter: "all",
  sortBy: "dueDate",
  editingId: null,
};

const form = document.getElementById("todo-form");
const formTitle = document.getElementById("form-title");
const submitButton = document.getElementById("submit-button");
const resetButton = document.getElementById("reset-button");
const formError = document.getElementById("form-error");
const statusMessage = document.getElementById("status-message");
const emptyState = document.getElementById("empty-state");
const todoList = document.getElementById("todo-list");
const filterButtons = Array.from(document.querySelectorAll(".filter-button"));
const sortSelect = document.getElementById("sort");
const template = document.getElementById("todo-item-template");

const countAll = document.getElementById("count-all");
const countActive = document.getElementById("count-active");
const countCompleted = document.getElementById("count-completed");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const dueDateInput = document.getElementById("due-date");
const tagsInput = document.getElementById("tags");

const priorityMap = {
  high: { label: "High priority", rank: 0, className: "priority-high" },
  medium: { label: "Medium priority", rank: 1, className: "priority-medium" },
  low: { label: "Low priority", rank: 2, className: "priority-low" },
};

// 초기 진입 시 저장 데이터 로드, 이벤트 연결, 첫 화면 렌더링을 수행한다.
document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
  loadTodos();
  bindEvents();
  render();
}

// 폼 제출, 초기화, 필터, 정렬 등 주요 UI 이벤트를 연결한다.
function bindEvents() {
  form.addEventListener("submit", handleSubmit);
  resetButton.addEventListener("click", resetForm);
  sortSelect.addEventListener("change", handleSortChange);

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.filter;
      updateFilterButtons();
      render();
    });
  });
}

// 새 Todo를 추가하거나 기존 Todo를 수정한 뒤 저장하고 다시 그린다.
function handleSubmit(event) {
  event.preventDefault();

  const formData = new FormData(form);
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const priority = String(formData.get("priority") || "medium");
  const dueDate = String(formData.get("dueDate") || "");
  const tags = parseTags(String(formData.get("tags") || ""));

  if (!title) {
    formError.textContent = "Title is required.";
    return;
  }

  formError.textContent = "";

  if (state.editingId) {
    state.todos = state.todos.map((todo) => {
      if (todo.id !== state.editingId) {
        return todo;
      }

      return {
        ...todo,
        title,
        description,
        priority,
        dueDate,
        tags,
      };
    });
    statusMessage.textContent = "Todo updated.";
  } else {
    state.todos.unshift({
      id: crypto.randomUUID(),
      title,
      description,
      priority,
      dueDate,
      tags,
      completed: false,
      createdAt: new Date().toISOString(),
    });
    statusMessage.textContent = "Todo added.";
  }

  persistTodos();
  resetForm();
  render();
}

// 정렬 기준 변경 시 현재 목록을 다시 렌더링한다.
function handleSortChange(event) {
  state.sortBy = event.target.value;
  render();
}

// localStorage에 저장된 Todo 목록을 앱 상태로 복원한다.
function loadTodos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    state.todos = saved ? JSON.parse(saved) : [];
  } catch (error) {
    state.todos = [];
    statusMessage.textContent = "Failed to load saved todos.";
  }
}

// 현재 Todo 상태를 localStorage에 영속화한다.
function persistTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.todos));
}

// 쉼표로 입력된 태그 문자열을 배열 형태로 정리한다.
function parseTags(input) {
  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

// 입력 폼을 기본 상태로 되돌리고 수정 모드를 종료한다.
function resetForm() {
  form.reset();
  priorityInput.value = "medium";
  state.editingId = null;
  formTitle.textContent = "New Todo";
  submitButton.textContent = "Add Todo";
  formError.textContent = "";
}

// 현재 선택된 필터 버튼에만 활성 스타일을 적용한다.
function updateFilterButtons() {
  filterButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.filter === state.filter);
  });
}

// 필터링/정렬된 Todo 목록과 요약 수치를 화면에 반영한다.
function render() {
  const items = getVisibleTodos();
  updateSummary();

  todoList.innerHTML = "";
  emptyState.classList.toggle("hidden", items.length > 0);

  items.forEach((todo) => {
    const fragment = template.content.cloneNode(true);
    const item = fragment.querySelector(".todo-item");
    const toggle = fragment.querySelector(".toggle-complete");
    const title = fragment.querySelector(".todo-title");
    const description = fragment.querySelector(".todo-description");
    const priority = fragment.querySelector(".priority-badge");
    const dueDate = fragment.querySelector(".due-badge");
    const createdAt = fragment.querySelector(".created-badge");
    const tagList = fragment.querySelector(".tag-list");
    const editButton = fragment.querySelector(".edit-button");
    const deleteButton = fragment.querySelector(".delete-button");

    item.classList.toggle("completed", todo.completed);
    toggle.checked = todo.completed;
    title.textContent = todo.title;
    description.textContent = todo.description || "No description";

    priority.textContent = priorityMap[todo.priority].label;
    priority.classList.add(priorityMap[todo.priority].className);
    dueDate.textContent = todo.dueDate ? `Due ${formatDate(todo.dueDate)}` : "No due date";
    createdAt.textContent = `Created ${formatDate(todo.createdAt)}`;

    tagList.innerHTML = "";
    if (todo.tags.length > 0) {
      todo.tags.forEach((tag) => {
        const node = document.createElement("span");
        node.className = "tag";
        node.textContent = `#${tag}`;
        tagList.appendChild(node);
      });
    }

    toggle.addEventListener("change", () => toggleTodo(todo.id));
    editButton.addEventListener("click", () => startEditing(todo.id));
    deleteButton.addEventListener("click", () => deleteTodo(todo.id));

    todoList.appendChild(fragment);
  });
}

// 현재 필터와 정렬 기준에 맞는 Todo 목록만 계산해 반환한다.
function getVisibleTodos() {
  return state.todos
    .filter((todo) => {
      if (state.filter === "active") {
        return !todo.completed;
      }

      if (state.filter === "completed") {
        return todo.completed;
      }

      return true;
    })
    .sort((left, right) => compareTodos(left, right, state.sortBy));
}

// 선택된 기준에 따라 두 Todo의 표시 순서를 비교한다.
function compareTodos(left, right, sortBy) {
  if (sortBy === "priority") {
    return priorityMap[left.priority].rank - priorityMap[right.priority].rank;
  }

  if (sortBy === "createdAt") {
    return new Date(right.createdAt) - new Date(left.createdAt);
  }

  const leftValue = left.dueDate ? new Date(left.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  const rightValue = right.dueDate ? new Date(right.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  return leftValue - rightValue;
}

// 전체, 진행 중, 완료 개수를 상단 요약 카드에 반영한다.
function updateSummary() {
  const completed = state.todos.filter((todo) => todo.completed).length;
  countAll.textContent = String(state.todos.length);
  countActive.textContent = String(state.todos.length - completed);
  countCompleted.textContent = String(completed);
}

// 완료 여부를 토글한 뒤 저장하고 목록을 갱신한다.
function toggleTodo(id) {
  state.todos = state.todos.map((todo) => {
    if (todo.id !== id) {
      return todo;
    }

    return { ...todo, completed: !todo.completed };
  });

  persistTodos();
  render();
}

// 선택한 Todo 데이터를 폼에 채워 수정 가능한 상태로 전환한다.
function startEditing(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) {
    return;
  }

  state.editingId = id;
  titleInput.value = todo.title;
  descriptionInput.value = todo.description;
  priorityInput.value = todo.priority;
  dueDateInput.value = todo.dueDate;
  tagsInput.value = todo.tags.join(", ");
  formTitle.textContent = "Edit Todo";
  submitButton.textContent = "Save Changes";
  statusMessage.textContent = "Loaded todo for editing.";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Todo를 삭제하고, 삭제 대상이 수정 중이었다면 폼도 초기화한다.
function deleteTodo(id) {
  state.todos = state.todos.filter((todo) => todo.id !== id);

  if (state.editingId === id) {
    resetForm();
  }

  statusMessage.textContent = "Todo deleted.";
  persistTodos();
  render();
}

// 날짜 문자열을 한국 로케일 기준 표시용 문자열로 변환한다.
function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
