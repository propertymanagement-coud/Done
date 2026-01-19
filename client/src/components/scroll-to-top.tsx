import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * ScrollToTop Component
 * --------------------
 * This component listens for route changes and automatically scrolls
 * the window to the top. It ensures that every new page navigation
 * starts at the top of the viewport.
 */
export default function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant", // Use instant to avoid weird smooth scrolling on navigation
    });
  }, [location]);

  return null;
}
