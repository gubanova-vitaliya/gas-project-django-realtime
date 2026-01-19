<script lang="ts">
  import type { NavigateFunction } from "react-router-dom";
  import "./CartIcon.css";
  import { onMount, onDestroy } from "svelte";
  import { getDestApi } from "../../target_config";

  export let navigate: NavigateFunction;

  let draftId: number | null = null;
  let count: number = 0;

  const loadCartData = async () => {
    const isAuthenticated = localStorage.getItem('auth_token') !== null;
    
    if (!isAuthenticated) {
      count = 0;
      draftId = null;
      return;
    }

    try {
      const apiBase = getDestApi();
      const token = localStorage.getItem('auth_token');
      
      if (!apiBase || !token) {
        count = 0;
        draftId = null;
        return;
      }

      const response = await fetch(`${apiBase}/api/cart`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        count = 0;
        draftId = null;
        return;
      }

      const data = await response.json();
      count = data.count || 0;
      draftId = data.draft_id || null;
    } catch (error) {
      console.warn("Error loading cart data:", error);
      count = 0;
      draftId = null;
    }
  };

  let interval: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    loadCartData();
    // Обновляем данные каждые 5 секунд
    interval = setInterval(loadCartData, 5000);
  });

  onDestroy(() => {
    if (interval) {
      clearInterval(interval);
    }
  });

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('CartIcon: Button clicked!', {
      navigate: typeof navigate,
      currentPath: window.location.pathname,
      count: count
    });
    
    // Используем window.location для надежного перехода
    const currentPath = window.location.pathname;
    
    // Если уже на /journal, не переходим
    if (currentPath === '/journal') {
      console.log('CartIcon: Already on /journal, skipping');
      return;
    }
    
    // Всегда используем window.location для надежности
    console.log('CartIcon: Navigating to /journal using window.location');
    window.location.href = '/journal';
  };
</script>

<button
  class="cart-icon"
  class:cart-icon_disabled={count === 0}
  on:click={handleClick}
  type="button"
  title={count > 0 ? `В журнале ${count} ${count === 1 ? 'газ' : count < 5 ? 'газа' : 'газов'}` : 'Журнал пуст - нажмите для перехода'}
>
  <!-- Иконка давления в сосуде (сосуд с газом и манометром) -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="cart-icon__svg"
  >
    <!-- Сосуд (цилиндр) -->
    <rect x="6" y="6" width="8" height="14" rx="1.5" fill="none" stroke="currentColor"></rect>
    <!-- Горловина сосуда -->
    <rect x="7" y="4" width="6" height="2" rx="0.5" fill="none" stroke="currentColor"></rect>
    <!-- Клапан/крышка -->
    <circle cx="10" cy="5" r="0.8" fill="currentColor"></circle>
    <!-- Манометр (справа от сосуда) -->
    <circle cx="17" cy="10" r="3" fill="none" stroke="currentColor"></circle>
    <line x1="17" y1="10" x2="17" y2="7" stroke="currentColor"></line>
    <line x1="17" y1="10" x2="19.5" y2="11.5" stroke="currentColor"></line>
    <!-- Газы внутри сосуда (волны) -->
    <path d="M8 10 Q10 8, 12 10" stroke="currentColor" fill="none" stroke-width="1"></path>
    <path d="M8 14 Q10 12, 12 14" stroke="currentColor" fill="none" stroke-width="1"></path>
    <path d="M8 18 Q10 16, 12 18" stroke="currentColor" fill="none" stroke-width="1"></path>
  </svg>
  {#if count > 0}
    <span class="cart-icon__badge">{count}</span>
  {/if}
</button>

<style>
  .cart-icon {
    position: relative;
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: #4680C2;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.2s ease;
    font-size: 0.9rem;
    font-weight: 500;
    margin-left: 0.5rem;
    z-index: 1000;
  }

  .cart-icon:hover {
    background-color: #3a6cb0;
    box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }

  .cart-icon:active {
    transform: translateY(0);
  }

  .cart-icon_disabled {
    opacity: 0.6;
    background-color: #6c757d;
    cursor: pointer;
    pointer-events: auto; /* Разрешаем клики даже когда журнал пуст */
  }
  
  .cart-icon_disabled:hover {
    background-color: #5a6268;
  }

  .cart-icon__badge {
    background: #ff3347;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.875rem;
    font-weight: 600;
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .cart-icon__svg {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
  }
</style>

