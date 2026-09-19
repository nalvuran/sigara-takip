import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { auth } from "./firebase";

export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signIn(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string) {
  await createUserWithEmailAndPassword(auth, email, password);
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function logOut() {
  await signOut(auth);
}

/** Firebase hata kodlarını kullanıcıya anlaşılır Türkçe mesaja çevirir. */
export function friendlyAuthError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? "";
  switch (code) {
    case "auth/invalid-email":
      return "Geçersiz e-posta adresi.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-posta veya şifre hatalı.";
    case "auth/email-already-in-use":
      return "Bu e-posta ile zaten bir hesap var.";
    case "auth/weak-password":
      return "Şifre en az 6 karakter olmalı.";
    case "auth/network-request-failed":
      return "İnternet bağlantısı yok, lütfen tekrar deneyin.";
    default:
      return "Bir şeyler ters gitti, lütfen tekrar deneyin.";
  }
}
