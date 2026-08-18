/*
  Project Name: Teva Data Integrity
  Business Owner, Team: Keerthi Pusuloori
  Script Author, Team: Radhe Raman Tiwari
  Date: 10 November 2025

  Purpose of the script:
    This script defines a Zustand store for managing the authentication state of the user.
    - The store holds the user information (e.g., provider, userId, email) and provides actions to set or clear the user data.
    - It enables the application to track the current authenticated user and manage the user session state.
    - This store is essential for implementing authentication-related features across the application.

  Usage examples (how other parts of the app interact with this store):
    - Read current user: const user = useUserStore(state => state.user)
    - Set user after login: useUserStore.getState().setUser(userObject)
    - Clear user on logout: useUserStore.getState().clearUser()
*/

//---------------------- Imports -------------------------//
/*  zustand
    - What it is: A small, fast state-management library for React applications.
    - Why used: Provides a simple API to create global stores (like this user store) without the boilerplate of Redux.
*/
import { create } from "zustand"; // Zustand for state management

/*  zustand/middleware (devtools)
    - What it is: Optional middleware to integrate the store with browser devtools.
    - Why used: Makes it easier to inspect and debug store changes during development.
*/
import { devtools } from "zustand/middleware"; // Zustand middleware for enabling devtools

//---------------------- Types -------------------------//

/**
 * `AuthUser` defines the structure of the authenticated user's data.
 * This data will be used to manage user sessions and authentication states in the application.
 */
interface AuthUser {
  provider: string; // The authentication provider (e.g., "google", "facebook")
  userId: string; // The unique identifier for the user (e.g., "example@tevapharm.com")
  email: string; // The user's email address (e.g., "example@tevapharm.com")
  name: string; // The user's full name (e.g., "John Doe", "example@tevapharm.com")
  oid: string; // Object identifier (a unique identifier for the user in the system) (e.g., "cb4da94f-f146-47c6-934e-edc883ce9228")
  accessToken?: string; // Optional OAuth access token (for API authentication) (e.g., "eyJ0eXAiOiJKV1QiLCJub25jZSI6Ik50Q0R6MmN0SmlGZWd5Qm...")
  idToken?: string; // Optional OAuth ID token (for user identity verification) (e.g., "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6...")
  expiresOn?: string; // Optional expiration timestamp for the session token(e.g., "2026-01-22T05:50:56.7226415Z")
}

/**
 * `UserState` defines the structure of the user-related state in the store.
 * It includes the current user information and actions to modify the user data.
 */
interface UserState {
  user: AuthUser | null; // Holds the current user data or null if no user is logged in
  setUser: (user: AuthUser | null) => void; // Action to set the current user
  clearUser: () => void; // Action to clear the current user (i.e., log out the user)
}

//---------------------- Store Creation -------------------------//

/**
 * `useUserStore` creates a Zustand store to manage user authentication state.
 * This store holds the current user data and provides actions for setting and clearing the user session.
 * 
 * Example Usage:
 * - `useUserStore().setUser(user)` will set the user data in the store.
 * - `useUserStore().clearUser()` will clear the user data, effectively logging out the user.
 */
export const useUserStore = create<UserState>()(
  /*
    create<UserState>(): Initializes a typed Zustand store for the UserState interface.
    devtools(...): Wraps the store initializer so state changes are visible in Redux/React devtools.
  */
  devtools((set, get) => ({
    /* initial state: no authenticated user */
    user: null,
    /**
     * `setUser` sets the user data in the store.
     * It is called when a user successfully logs in or when updating the user data.
     *
     * @param user - The user data (either a new user object or null for logging out).
     * Example Input: { provider: "google", userId: "123", email: "user@example.com", name: "John Doe", oid: "abc123" }
     * Example Output: Sets the user data in the state.
     */
    setUser: (user) => set({ user }),

    /**
     * `clearUser` convenience action to remove/clear the current user data from the store
     * effectively logging out the user.
     * It sets the `user` state to null.
     *
     * Example Input: None (clears the existing user data).
     * Example Output: Sets the `user` state to null.
     */
    clearUser: () => set({ user: null }),
  }))
);
