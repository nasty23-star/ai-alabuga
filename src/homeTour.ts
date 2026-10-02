export const HOME_TOUR_KEY = "arena-home-tour";

export function requestHomeTour() {
  sessionStorage.setItem(HOME_TOUR_KEY, "1");
}

export function homeTourPending() {
  return sessionStorage.getItem(HOME_TOUR_KEY) === "1";
}

export function finishHomeTour() {
  sessionStorage.removeItem(HOME_TOUR_KEY);
}
