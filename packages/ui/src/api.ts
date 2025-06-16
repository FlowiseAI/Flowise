export const API_ROOT = import.meta.env.VITE_API_BASE_URL as string;
if (!API_ROOT) {
  console.error('❌ Missing VITE_API_BASE_URL! Check your .env or Vercel settings.');
}
