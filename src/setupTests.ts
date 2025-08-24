import '@testing-library/jest-dom/vitest';
// Mock CSS imports that might confuse coverage in some environments
vi.mock('@mysten/dapp-kit/dist/index.css', () => ({}), { virtual: true });
