import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'text-encoding';

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:8080';

// Mock fetch globally
global.fetch = jest.fn();

// Polyfill TextEncoder for tests
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder; 