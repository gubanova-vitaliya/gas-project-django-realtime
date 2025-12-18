export const ROUTES = {
  HOME: "/",
  GASES: "/gases",
  LOGIN: "/login",
  REGISTER: "/register",
  CALCULATION: "/calculation",
  MY_CALCULATIONS: "/my-calculations",
  PROFILE: "/profile",
  JOURNAL: "/journal",
};

export type RouteKeyType = keyof typeof ROUTES;

export const ROUTE_LABELS: { [key in RouteKeyType]: string } = {
  HOME: "Главная",
  GASES: "Газы",
  LOGIN: "Авторизация",
  REGISTER: "Регистрация",
  CALCULATION: "Заявка",
  MY_CALCULATIONS: "Мои заявки",
  PROFILE: "Профиль",
  JOURNAL: "Журнал расчетов",
};


